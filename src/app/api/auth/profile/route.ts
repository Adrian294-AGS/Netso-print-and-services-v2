import bcrypt from 'bcryptjs';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  createSessionToken,
  displayUser,
  requireSession,
  setSessionCookie,
  type SessionUser,
} from '@/lib/server/auth';
import { apiErrorResponse, ApiError, assertSameOrigin, readJson } from '@/lib/server/http';
import { enforceRateLimit } from '@/lib/server/rate-limit';
import { mysqlPool, queryRows } from '@/lib/server/mysql';
import { recordAuditEvent } from '@/lib/server/audit';

export const runtime = 'nodejs';

const schema = z.object({
  username: z.string().trim().min(3).max(50).regex(/^[A-Za-z0-9._-]+$/),
  currentPassword: z.string().max(128).optional(),
  newPassword: z.string().min(12).max(128).optional(),
}).superRefine((value, context) => {
  if (value.currentPassword && !value.newPassword) {
    context.addIssue({
      code: 'custom',
      path: ['newPassword'],
      message: 'Enter a new password to use your current password.',
    });
  }
});

export async function PATCH(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const user = await requireSession(request, ['customer']);
    await enforceRateLimit(request, `profile:${user.id}`, 10, 60_000);
    const parsed = schema.safeParse(await readJson(request));
    if (!parsed.success) {
      throw new ApiError(
        400,
        'Use a 3–50 character username (letters, numbers, dot, underscore, or hyphen) and a new password of at least 12 characters.',
      );
    }

    const { username, currentPassword, newPassword } = parsed.data;
    const rows = await queryRows<
      {
        username: string | null;
        email: string | null;
        password_hash: string | null;
        first_name: string | null;
        middle_name: string | null;
        last_name: string | null;
      } & import('mysql2/promise').RowDataPacket
    >(
      mysqlPool,
      `SELECT username, email, password_hash, first_name, middle_name, last_name
       FROM tbl_user WHERE UID = ? AND role = 'customer' AND account_status = 'active' LIMIT 1`,
      [user.id],
    );
    const account = rows[0];
    if (!account) throw new ApiError(401, 'This customer account is no longer active.');

    if (newPassword && account.password_hash) {
      if (!currentPassword || !(await bcrypt.compare(currentPassword, account.password_hash))) {
        throw new ApiError(400, 'Your current password is incorrect.');
      }
    } else if (currentPassword && !account.password_hash) {
      throw new ApiError(400, 'This account does not have a password to verify.');
    }

    const existing = await queryRows<{ UID: string } & import('mysql2/promise').RowDataPacket>(
      mysqlPool,
      'SELECT UID FROM tbl_user WHERE username = ? AND UID <> ? LIMIT 1',
      [username, user.id],
    );
    if (existing.length) throw new ApiError(409, 'That username is already in use.');

    const passwordHash = newPassword ? await bcrypt.hash(newPassword, 12) : null;
    await mysqlPool.execute(
      'UPDATE tbl_user SET username = ?, password_hash = COALESCE(?, password_hash) WHERE UID = ?',
      [username, passwordHash, user.id],
    );

    const name =
      [account.first_name, account.middle_name, account.last_name].filter(Boolean).join(' ') ||
      account.email ||
      username;
    const updatedUser: SessionUser = {
      id: user.id,
      email: account.email,
      username,
      name,
      role: 'customer',
    };
    const response = NextResponse.json({ ok: true, user: displayUser(updatedUser) });
    setSessionCookie(response, await createSessionToken(updatedUser));

    const changes = [
      account.username !== username ? 'username updated' : '',
      newPassword ? 'password updated' : '',
    ].filter(Boolean);
    if (changes.length) {
      await recordAuditEvent(request, updatedUser, {
        category: 'Account / System',
        action: 'Updated customer account settings',
        details: changes.join('; '),
      });
    }
    return response;
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ER_DUP_ENTRY') {
      return NextResponse.json({ ok: false, error: 'That username is already in use.' }, { status: 409 });
    }
    return apiErrorResponse(error);
  }
}
