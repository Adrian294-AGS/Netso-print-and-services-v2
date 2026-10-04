import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/server/auth';
import { apiErrorResponse } from '@/lib/server/http';
import { mysqlPool, queryRows } from '@/lib/server/mysql';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    await requireSession(request, ['lead_admin']);
    const rows = await queryRows<
      {
        UID: string;
        first_name: string | null;
        middle_name: string | null;
        last_name: string | null;
        username: string | null;
        email: string | null;
        mobile_number: string | null;
        street: string | null;
        barangay: string | null;
        municipality: string | null;
        province: string | null;
        zip_code: string | null;
        total_requests: number;
        total_spent: string | number;
        outstanding: string | number;
        joined_at: Date;
        last_active: Date;
      } & import('mysql2/promise').RowDataPacket
    >(
      mysqlPool,
      `SELECT u.UID, u.first_name, u.middle_name, u.last_name, u.username, u.email, u.mobile_number,
              a.street, a.barangay, a.municipality, a.province, a.zip_code,
              (SELECT COUNT(*) FROM tbl_print_order o WHERE o.user_id = u.UID) AS total_requests,
              (SELECT COALESCE(SUM(p.amount), 0)
               FROM tbl_payments p JOIN tbl_print_order o ON o.ID = p.print_order_id
               WHERE o.user_id = u.UID AND p.status = 'verified') AS total_spent,
              (SELECT COALESCE(SUM(o.total_amount - COALESCE(p.paid_amount, 0)), 0)
               FROM tbl_print_order o
               LEFT JOIN (
                 SELECT print_order_id, SUM(amount) AS paid_amount
                 FROM tbl_payments WHERE status = 'verified' GROUP BY print_order_id
               ) p ON p.print_order_id = o.ID
               WHERE o.user_id = u.UID) AS outstanding,
              u.created_at AS joined_at, u.updated_at AS last_active
       FROM tbl_user u
       LEFT JOIN tbl_user_address a ON a.user_id = u.UID AND a.is_primary = 1
       WHERE u.role = 'customer'
       ORDER BY u.created_at DESC LIMIT 500`,
    );
    return NextResponse.json({
      ok: true,
      customers: rows.map((row) => ({
        id: row.UID,
        firstName: row.first_name ?? '',
        middleName: row.middle_name ?? '',
        lastName: row.last_name ?? '',
        username: row.username ?? row.email?.split('@')[0] ?? '',
        email: row.email ?? '',
        mobileNumber: row.mobile_number ?? '',
        street: row.street ?? '',
        barangay: row.barangay ?? '',
        municipality: row.municipality ?? '',
        province: row.province ?? '',
        zipCode: row.zip_code ?? '',
        totalRequests: Number(row.total_requests),
        totalSpent: Number(row.total_spent),
        outstandingBalance: Math.max(0, Number(row.outstanding)),
        status: 'Active',
        joinedDate: new Date(row.joined_at).toISOString().slice(0, 10),
        lastActive: new Date(row.last_active).toISOString(),
      })),
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
