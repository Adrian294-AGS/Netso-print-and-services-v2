import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createSessionToken, displayUser, setSessionCookie, type SessionUser } from '@/lib/server/auth';
import { assertSameOrigin, apiErrorResponse, ApiError, readJson } from '@/lib/server/http';
import { mysqlPool, queryRows } from '@/lib/server/mysql';
import { enforceRateLimit } from '@/lib/server/rate-limit';

export const runtime = 'nodejs';

const schema = z.object({
  fullName: z.string().trim().min(2).max(150),
  email: z.email().trim().max(254).transform((email) => email.toLowerCase()),
  phone: z.string().trim().min(7).max(32),
  password: z.string().min(12).max(128),
});

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    await enforceRateLimit(request, 'auth-register', 5);
    const parsed = schema.safeParse(await readJson(request));
    if (!parsed.success) throw new ApiError(400, 'Enter a valid name, email, phone number, and password of at least 12 characters.');

    const { fullName, email, phone, password } = parsed.data;
    const existing = await queryRows<{ UID: string } & import('mysql2/promise').RowDataPacket>(
      mysqlPool,
      'SELECT UID FROM tbl_user WHERE email = ? LIMIT 1',
      [email],
    );
    if (existing.length) throw new ApiError(409, 'An account with this email already exists.');

    const parts = fullName.split(/\s+/);
    const firstName = parts.shift() ?? fullName;
    const lastName = parts.length ? parts.pop() ?? null : null;
    const middleName = parts.length ? parts.join(' ') : null;
    const uid = randomUUID();
    const passwordHash = await bcrypt.hash(password, 12);

    await mysqlPool.execute(
      `INSERT INTO tbl_user
        (UID, username, email, password_hash, role, first_name, middle_name, last_name, mobile_number)
       VALUES (?, NULL, ?, ?, 'customer', ?, ?, ?, ?)`,
      [uid, email, passwordHash, firstName, middleName, lastName, phone],
    );

    const user: SessionUser = {
      id: uid,
      email,
      username: null,
      name: fullName,
      role: 'customer',
    };
    const response = NextResponse.json({ ok: true, user: displayUser(user) }, { status: 201 });
    setSessionCookie(response, await createSessionToken(user));
    return response;
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ER_DUP_ENTRY') {
      return NextResponse.json({ ok: false, error: 'An account with this email already exists.' }, { status: 409 });
    }
    return apiErrorResponse(error);
  }
}
