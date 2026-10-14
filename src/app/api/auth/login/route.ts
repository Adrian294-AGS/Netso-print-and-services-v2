import bcrypt from 'bcryptjs';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createSessionToken, displayUser, setSessionCookie, type SessionUser, type UserRole } from '@/lib/server/auth';
import { assertSameOrigin, apiErrorResponse, ApiError, readJson } from '@/lib/server/http';
import { mysqlPool, queryRows } from '@/lib/server/mysql';
import { enforceRateLimit } from '@/lib/server/rate-limit';
import { recordAuditEvent } from '@/lib/server/audit';

export const runtime = 'nodejs';

const schema = z.object({
  email: z.email().trim().max(254),
  password: z.string().min(1).max(128),
});

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    await enforceRateLimit(request, 'auth-login', 10);
    const parsed = schema.safeParse(await readJson(request));
    if (!parsed.success) throw new ApiError(400, 'Enter a valid email address and password.');

    const { password } = parsed.data;
    const identifier = parsed.data.email.toLowerCase();
    const rows = await queryRows<
      {
        UID: string;
        email: string | null;
        username: string | null;
        password_hash: string | null;
        role: UserRole;
        first_name: string | null;
        middle_name: string | null;
        last_name: string | null;
        account_status: string;
      } & import('mysql2/promise').RowDataPacket
    >(
      mysqlPool,
      `SELECT u.UID, u.email, u.username, u.password_hash, u.role,
              u.first_name, u.middle_name, u.last_name, u.account_status
       FROM tbl_user u
       WHERE LOWER(u.email) = ?
       LIMIT 1`,
      [identifier],
    );
    const record = rows[0];
    const validPassword =
      record?.password_hash ? await bcrypt.compare(password, record.password_hash) : false;
    if (
      !record ||
      !validPassword ||
      record.account_status !== 'active'
    ) {
      throw new ApiError(401, 'Invalid email or password.');
    }

    const name = [record.first_name, record.middle_name, record.last_name].filter(Boolean).join(' ') || record.email || identifier;
    const user: SessionUser = {
      id: record.UID,
      email: record.email,
      username: record.username,
      name,
      role: record.role,
    };
    const response = NextResponse.json({ ok: true, user: displayUser(user) });
    setSessionCookie(response, await createSessionToken(user));
    await recordAuditEvent(request, user, {
      category: 'Authentication',
      action: 'Signed in with email and password',
    });
    return response;
  } catch (error) {
    return apiErrorResponse(error);
  }
}
