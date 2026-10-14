import { randomUUID } from 'node:crypto';
import { OAuth2Client } from 'google-auth-library';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { createSessionToken, setSessionCookie, type SessionUser } from '@/lib/server/auth';
import { getGoogleOAuthEnv } from '@/lib/server/env';
import { ApiError } from '@/lib/server/http';
import { mysqlPool, queryRows } from '@/lib/server/mysql';
import { recordAuditEvent } from '@/lib/server/audit';

export const runtime = 'nodejs';

type GoogleAccount = {
  UID: string;
  username: string | null;
  email: string | null;
  role: SessionUser['role'];
  first_name: string | null;
  middle_name: string | null;
  last_name: string | null;
  account_status: string;
};
type GoogleUserRow = GoogleAccount & import('mysql2/promise').RowDataPacket;

export async function GET(request: NextRequest) {
  const config = getGoogleOAuthEnv();
  const stateCookie = request.cookies.get('netso_oauth_state')?.value;
  const verifier = request.cookies.get('netso_oauth_verifier')?.value;
  const state = request.nextUrl.searchParams.get('state');
  const code = request.nextUrl.searchParams.get('code');

  const clearOAuthCookies = (response: NextResponse) => {
    response.cookies.set('netso_oauth_state', '', { path: '/api/auth/google/callback', maxAge: 0 });
    response.cookies.set('netso_oauth_verifier', '', { path: '/api/auth/google/callback', maxAge: 0 });
  };

  try {
    if (!stateCookie || !verifier || !state || state !== stateCookie || !code) {
      throw new ApiError(400, 'Google sign-in could not be verified. Please try again.');
    }

    const client = new OAuth2Client(
      config.googleClientId,
      config.googleClientSecret,
      `${config.appUrl}/api/auth/google/callback`,
    );
    const { tokens } = await client.getToken({
      code,
      codeVerifier: verifier,
      redirect_uri: `${config.appUrl}/api/auth/google/callback`,
    });
    if (!tokens.id_token) throw new ApiError(401, 'Google did not provide an identity token.');
    const ticket = await client.verifyIdToken({
      idToken: tokens.id_token,
      audience: config.googleClientId,
    });
    const profile = ticket.getPayload();
    if (!profile?.sub || !profile.email || !profile.email_verified) {
      throw new ApiError(401, 'Google account must provide a verified email address.');
    }

    const connection = await mysqlPool.getConnection();
    let user: SessionUser;
    try {
      await connection.beginTransaction();
      const linkedRows = await queryRows<GoogleUserRow>(
        connection,
        `SELECT u.UID, u.username, u.email, u.role, u.first_name, u.middle_name, u.last_name, u.account_status
         FROM tbl_oauth_account oa
         JOIN tbl_user u ON u.UID = oa.user_id
         WHERE oa.provider = 'google' AND oa.provider_user_id = ?
         LIMIT 1 FOR UPDATE`,
        [profile.sub],
      );
      let account: GoogleAccount | undefined = linkedRows[0];
      if (!account) {
        const emailRows = await queryRows<GoogleUserRow>(
          connection,
          `SELECT UID, username, email, role, first_name, middle_name, last_name, account_status
           FROM tbl_user WHERE email = ? LIMIT 1 FOR UPDATE`,
          [profile.email.toLowerCase()],
        );
        account = emailRows[0];

        if (account) {
          if (account.role !== 'customer') {
            throw new ApiError(403, 'Google sign-in is available for customer accounts only.');
          }
          await connection.execute(
            `INSERT INTO tbl_oauth_account (user_id, provider, provider_user_id)
             VALUES (?, 'google', ?)`,
            [account.UID, profile.sub],
          );
        } else {
          const fullName = profile.name?.trim() || profile.email.split('@')[0];
          const nameParts = fullName.split(/\s+/);
          const firstName = nameParts.shift() || fullName;
          const lastName = nameParts.pop() || null;
          const middleName = nameParts.length ? nameParts.join(' ') : null;
          const uid = randomUUID();
          await connection.execute(
            `INSERT INTO tbl_user (UID, email, role, first_name, middle_name, last_name)
             VALUES (?, ?, 'customer', ?, ?, ?)`,
            [uid, profile.email.toLowerCase(), firstName, middleName, lastName],
          );
          await connection.execute(
            `INSERT INTO tbl_oauth_account (user_id, provider, provider_user_id)
             VALUES (?, 'google', ?)`,
            [uid, profile.sub],
          );
          account = {
            UID: uid,
            username: null,
            email: profile.email.toLowerCase(),
            role: 'customer',
            first_name: firstName,
            middle_name: middleName,
            last_name: lastName,
            account_status: 'active',
          };
        }
      }

      if (account.account_status !== 'active') {
        throw new ApiError(403, 'This account is not active. Contact an administrator.');
      }
      await connection.commit();
      user = {
        id: account.UID,
        email: account.email,
        username: account.username,
        name: [account.first_name, account.middle_name, account.last_name]
          .filter(Boolean)
          .join(' ') || profile.email,
        role: account.role,
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    const response = NextResponse.redirect(new URL('/customer', config.appUrl));
    setSessionCookie(response, await createSessionToken(user));
    clearOAuthCookies(response);
    await recordAuditEvent(request, user, {
      category: 'Authentication',
      action: 'Signed in with Google OAuth',
    });
    return response;
  } catch (error) {
    const response = NextResponse.redirect(
      new URL(`/login?authError=${encodeURIComponent(error instanceof ApiError ? error.message : 'Google sign-in failed. Please try again.')}`, config.appUrl),
    );
    clearOAuthCookies(response);
    if (!(error instanceof ApiError)) console.error('Google OAuth callback failed:', error);
    return response;
  }
}
