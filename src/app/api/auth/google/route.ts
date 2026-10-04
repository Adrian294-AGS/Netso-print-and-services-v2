import { randomBytes } from 'node:crypto';
import { CodeChallengeMethod, OAuth2Client } from 'google-auth-library';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getGoogleOAuthEnv } from '@/lib/server/env';
import { assertSameOrigin, apiErrorResponse } from '@/lib/server/http';
import { enforceRateLimit } from '@/lib/server/rate-limit';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    assertSameOrigin(request);
    await enforceRateLimit(request, 'auth-google', 10);
    const config = getGoogleOAuthEnv();
    const state = randomBytes(32).toString('base64url');
    const client = new OAuth2Client(
      config.googleClientId,
      config.googleClientSecret,
      `${config.appUrl}/api/auth/google/callback`,
    );
    const { codeVerifier: verifier, codeChallenge } = await client.generateCodeVerifierAsync();
    const response = NextResponse.redirect(
      client.generateAuthUrl({
        access_type: 'online',
        prompt: 'select_account',
        scope: ['openid', 'email', 'profile'],
        state,
        code_challenge: codeChallenge,
        code_challenge_method: CodeChallengeMethod.S256,
      }),
    );
    response.cookies.set('netso_oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/api/auth/google/callback',
      maxAge: 600,
    });
    response.cookies.set('netso_oauth_verifier', verifier, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/api/auth/google/callback',
      maxAge: 600,
    });
    return response;
  } catch (error) {
    return apiErrorResponse(error);
  }
}
