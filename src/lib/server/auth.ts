import 'server-only';

import { jwtVerify, SignJWT } from 'jose';
import type { NextRequest, NextResponse } from 'next/server';
import { mysqlPool, queryRows } from './mysql';
import { ApiError } from './http';
import { getJwtSecret } from './env';

export type UserRole =
  | 'customer'
  | 'lead_admin'
  | 'print_operator'
  | 'pre_press_artist'
  | 'front_desk_cashier';

export interface SessionUser {
  id: string;
  email: string | null;
  username: string | null;
  name: string;
  role: UserRole;
}

const COOKIE_NAME = 'netso_session';
const SESSION_DURATION_SECONDS = 60 * 60 * 8;

function signingKey(): Uint8Array {
  return new TextEncoder().encode(getJwtSecret());
}

export async function createSessionToken(user: SessionUser): Promise<string> {
  return new SignJWT({
    email: user.email,
    username: user.username,
    name: user.name,
    role: user.role,
  })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setSubject(user.id)
    .setIssuer('netso-prints')
    .setAudience('netso-web')
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
    .sign(signingKey());
}

export async function getSession(request: NextRequest): Promise<SessionUser | null> {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const key = signingKey();
  try {
    const { payload } = await jwtVerify(token, key, {
      algorithms: ['HS256'],
      issuer: 'netso-prints',
      audience: 'netso-web',
    });
    if (
      typeof payload.sub !== 'string' ||
      typeof payload.name !== 'string' ||
      !isUserRole(payload.role) ||
      (payload.email !== null && typeof payload.email !== 'string') ||
      (payload.username !== null && typeof payload.username !== 'string')
    ) {
      return null;
    }

    return {
      id: payload.sub,
      email: payload.email,
      username: payload.username,
      name: payload.name,
      role: payload.role,
    };
  } catch {
    return null;
  }
}

export function setSessionCookie(response: NextResponse, token: string): void {
  response.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_DURATION_SECONDS,
  });
}

export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set(COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}

export async function requireSession(
  request: NextRequest,
  roles?: UserRole[],
): Promise<SessionUser> {
  const user = await getSession(request);
  if (!user) throw new ApiError(401, 'Sign in to continue.');
  const rows = await queryRows<
    { role: UserRole; account_status: string } & import('mysql2/promise').RowDataPacket
  >(mysqlPool, 'SELECT role, account_status FROM tbl_user WHERE UID = ? LIMIT 1', [user.id]);
  const current = rows[0];
  if (!current || current.account_status !== 'active' || current.role !== user.role) {
    throw new ApiError(401, 'This account is not active. Sign in again or contact an administrator.');
  }
  const freshUser = { ...user, role: current.role };
  if (roles && !roles.includes(freshUser.role)) {
    throw new ApiError(403, 'You are not allowed to do this.');
  }
  return freshUser;
}

export function isStaffRole(role: UserRole): boolean {
  return role !== 'customer';
}

function isUserRole(value: unknown): value is UserRole {
  return (
    value === 'customer' ||
    value === 'lead_admin' ||
    value === 'print_operator' ||
    value === 'pre_press_artist' ||
    value === 'front_desk_cashier'
  );
}

export function displayUser(user: SessionUser) {
  return {
    id: user.id,
    name: user.name,
    identifier: user.email ?? user.username ?? user.id,
    email: user.email,
    username: user.username,
    staffRole: user.role === 'customer' ? null : user.role,
    role: user.role === 'customer' ? 'customer' : user.role === 'lead_admin' ? 'admin' : 'staff',
  };
}
