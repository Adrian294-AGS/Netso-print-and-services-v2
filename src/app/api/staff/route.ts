import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireSession } from '@/lib/server/auth';
import { ApiError, apiErrorResponse, assertSameOrigin, readJson } from '@/lib/server/http';
import { mysqlPool, queryRows } from '@/lib/server/mysql';

export const runtime = 'nodejs';

const roleMap = {
  'Lead Admin': 'lead_admin',
  'Print Operator': 'print_operator',
  'Pre-Press Artist': 'pre_press_artist',
  'Front Desk & Cashier': 'front_desk_cashier',
} as const;

const reverseRoleMap = Object.fromEntries(
  Object.entries(roleMap).map(([label, role]) => [role, label]),
) as Record<string, keyof typeof roleMap>;

const staffSchema = z.object({
  name: z.string().trim().min(2).max(150),
  username: z.string().trim().min(3).max(25).regex(/^[a-zA-Z0-9._-]+$/),
  email: z.email().trim().max(254).transform((email) => email.toLowerCase()),
  phone: z.string().trim().min(7).max(32),
  password: z.string().min(12).max(128),
  role: z.enum(['Lead Admin', 'Print Operator', 'Pre-Press Artist', 'Front Desk & Cashier']),
  shiftStart: z.string().regex(/^\d{2}:\d{2}$/),
  shiftEnd: z.string().regex(/^\d{2}:\d{2}$/),
});

const timeToDatabase = (value: string) => `${value}:00`;

export async function GET(request: NextRequest) {
  try {
    await requireSession(request, ['lead_admin']);
    const rows = await queryRows<
      {
        UID: string;
        username: string | null;
        email: string | null;
        role: string;
        first_name: string | null;
        middle_name: string | null;
        last_name: string | null;
        mobile_number: string | null;
        staff_code: string;
        shift_start: string | null;
        shift_end: string | null;
        work_status: string;
      } & import('mysql2/promise').RowDataPacket
    >(
      mysqlPool,
      `SELECT u.UID, u.username, u.email, u.role, u.first_name, u.middle_name,
              u.last_name, u.mobile_number, s.staff_code, s.shift_start,
              s.shift_end, s.work_status
       FROM tbl_staff_profile s
       JOIN tbl_user u ON u.UID = s.user_id
       WHERE u.account_status = 'active'
       ORDER BY u.created_at DESC`,
    );
    return NextResponse.json({
      ok: true,
      staff: rows.map((row) => ({
        id: row.staff_code,
        userId: row.UID,
        name: [row.first_name, row.middle_name, row.last_name].filter(Boolean).join(' '),
        username: row.username ?? '',
        email: row.email ?? '',
        phone: row.mobile_number ?? '',
        role: reverseRoleMap[row.role],
        shift: row.shift_start && row.shift_end
          ? `${row.shift_start.slice(0, 5)} - ${row.shift_end.slice(0, 5)}`
          : 'Not scheduled',
        status: row.work_status === 'online'
          ? 'Online'
          : row.work_status === 'in_production'
            ? 'In Production'
            : 'Off Duty',
        assignedJobs: 0,
        completedToday: 0,
      })),
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  const connection = await mysqlPool.getConnection();
  try {
    assertSameOrigin(request);
    await requireSession(request, ['lead_admin']);
    const parsed = staffSchema.safeParse(await readJson(request));
    if (!parsed.success) throw new ApiError(400, 'Staff account details are invalid.');
    const input = parsed.data;
    const staffCode = input.username.toUpperCase();
    const parts = input.name.split(/\s+/);
    const firstName = parts.shift() ?? input.name;
    const lastName = parts.pop() ?? null;
    const middleName = parts.length ? parts.join(' ') : null;
    const userId = randomUUID();
    const passwordHash = await bcrypt.hash(input.password, 12);

    await connection.beginTransaction();
    await connection.execute(
      `INSERT INTO tbl_user
         (UID, username, email, password_hash, role, first_name, middle_name,
          last_name, mobile_number, account_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
      [
        userId,
        input.username.toLowerCase(),
        input.email,
        passwordHash,
        roleMap[input.role],
        firstName,
        middleName,
        lastName,
        input.phone,
      ],
    );
    await connection.execute(
      `INSERT INTO tbl_staff_profile
         (user_id, staff_code, shift_start, shift_end, work_status)
       VALUES (?, ?, ?, ?, 'off_duty')`,
      [userId, staffCode, timeToDatabase(input.shiftStart), timeToDatabase(input.shiftEnd)],
    );
    await connection.commit();

    return NextResponse.json(
      {
        ok: true,
        staff: {
          id: staffCode,
          userId,
          name: input.name,
          username: input.username.toLowerCase(),
          email: input.email,
          phone: input.phone,
          role: input.role,
          shift: `${input.shiftStart} - ${input.shiftEnd}`,
          status: 'Off Duty',
          assignedJobs: 0,
          completedToday: 0,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    await connection.rollback();
    if (error instanceof Error && 'code' in error && error.code === 'ER_DUP_ENTRY') {
      return NextResponse.json(
        { ok: false, error: 'That username, email, or staff code is already in use.' },
        { status: 409 },
      );
    }
    return apiErrorResponse(error);
  } finally {
    connection.release();
  }
}

export async function PATCH(request: NextRequest) {
  try {
    assertSameOrigin(request);
    await requireSession(request, ['lead_admin']);
    const parsed = z.object({
      id: z.string().trim().min(1).max(32),
      status: z.enum(['Online', 'In Production', 'Off Duty']),
    }).safeParse(await readJson(request));
    if (!parsed.success) throw new ApiError(400, 'Staff status update is invalid.');
    const statuses = {
      Online: 'online',
      'In Production': 'in_production',
      'Off Duty': 'off_duty',
    } as const;
    const [result] = await mysqlPool.execute(
      `UPDATE tbl_staff_profile SET work_status = ?
       WHERE staff_code = ? AND user_id IN
         (SELECT UID FROM tbl_user WHERE account_status = 'active')`,
      [statuses[parsed.data.status], parsed.data.id],
    );
    if ((result as { affectedRows: number }).affectedRows === 0) {
      const rows = await queryRows<{ ID: number } & import('mysql2/promise').RowDataPacket>(
        mysqlPool,
        'SELECT ID FROM tbl_staff_profile WHERE staff_code = ?',
        [parsed.data.id],
      );
      if (!rows.length) throw new ApiError(404, 'Staff account not found.');
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
