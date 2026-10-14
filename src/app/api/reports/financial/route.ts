import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/server/auth';
import { apiErrorResponse, ApiError } from '@/lib/server/http';
import { mysqlPool, queryRows } from '@/lib/server/mysql';

export const runtime = 'nodejs';

type ReportRow = import('mysql2/promise').RowDataPacket;

export async function GET(request: NextRequest) {
  try {
    await requireSession(request, ['lead_admin']);
    const month = request.nextUrl.searchParams.get('month');
    if (!month || !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
      throw new ApiError(400, 'Report month must use YYYY-MM format.');
    }

    const [year, monthNumber] = month.split('-').map(Number);
    const monthStart = `${month}-01 00:00:00`;
    const nextMonthDate = new Date(Date.UTC(year, monthNumber, 1));
    const nextMonthStart = `${nextMonthDate.toISOString().slice(0, 7)}-01 00:00:00`;
    const range = [monthStart, nextMonthStart];

    const [orderRows, paymentRows, categoryRows, methodRows, completionRows] = await Promise.all([
      queryRows<
        {
          order_count: number;
          cancelled_count: number;
          booked_value: string | number;
          receivables: string | number;
        } & ReportRow
      >(
        mysqlPool,
        `SELECT COUNT(*) AS order_count,
                COALESCE(SUM(o.status = 'Cancelled'), 0) AS cancelled_count,
                COALESCE(SUM(CASE WHEN o.status <> 'Cancelled' THEN o.total_amount ELSE 0 END), 0) AS booked_value,
                COALESCE(SUM(CASE WHEN o.status <> 'Cancelled'
                  THEN GREATEST(o.total_amount - COALESCE(paid.verified_total, 0), 0)
                  ELSE 0 END), 0) AS receivables
         FROM tbl_print_order o
         LEFT JOIN (
           SELECT print_order_id, SUM(amount) AS verified_total
           FROM tbl_payments
           WHERE status = 'verified'
           GROUP BY print_order_id
         ) paid ON paid.print_order_id = o.ID
         WHERE o.created_at >= ? AND o.created_at < ?`,
        range,
      ),
      queryRows<
        { collected: string | number; payment_count: number } & ReportRow
      >(
        mysqlPool,
        `SELECT COALESCE(SUM(amount), 0) AS collected, COUNT(*) AS payment_count
         FROM tbl_payments
         WHERE status = 'verified'
           AND COALESCE(paid_at, created_at) >= ?
           AND COALESCE(paid_at, created_at) < ?`,
        range,
      ),
      queryRows<
        {
          category: string;
          order_count: number;
          booked_value: string | number;
        } & ReportRow
      >(
        mysqlPool,
        `SELECT COALESCE(c.category_name, 'Uncategorized') AS category,
                COUNT(*) AS order_count,
                COALESCE(SUM(CASE WHEN o.status <> 'Cancelled' THEN o.total_amount ELSE 0 END), 0) AS booked_value
         FROM tbl_print_order o
         LEFT JOIN tbl_services s ON s.ID = o.service_id
         LEFT JOIN tbl_service_category c ON c.ID = s.category_id
         WHERE o.created_at >= ? AND o.created_at < ?
           AND o.status <> 'Cancelled'
         GROUP BY c.category_name
         ORDER BY booked_value DESC, category ASC`,
        range,
      ),
      queryRows<
        { method: string; collected: string | number; payment_count: number } & ReportRow
      >(
        mysqlPool,
        `SELECT method, COALESCE(SUM(amount), 0) AS collected, COUNT(*) AS payment_count
         FROM tbl_payments
         WHERE status = 'verified'
           AND COALESCE(paid_at, created_at) >= ?
           AND COALESCE(paid_at, created_at) < ?
         GROUP BY method
         ORDER BY collected DESC`,
        range,
      ),
      queryRows<{ completed_count: number } & ReportRow>(
        mysqlPool,
        `SELECT COUNT(DISTINCT h.print_order_id) AS completed_count
         FROM tbl_print_order_status_history h
         WHERE h.new_status = 'Completed'
           AND h.changed_at >= ? AND h.changed_at < ?`,
        range,
      ),
    ]);

    const payment = paymentRows[0];
    const orders = orderRows[0];
    const collected = Number(payment?.collected ?? 0);
    const gcashCollected = methodRows.reduce(
      (sum, row) => sum + (row.method === 'GCash' || row.method === 'GCash QR' ? Number(row.collected) : 0),
      0,
    );

    return NextResponse.json({
      ok: true,
      report: {
        month,
        orderCount: Number(orders?.order_count ?? 0),
        cancelledOrderCount: Number(orders?.cancelled_count ?? 0),
        bookedValue: Number(orders?.booked_value ?? 0),
        receivables: Number(orders?.receivables ?? 0),
        collected,
        paymentCount: Number(payment?.payment_count ?? 0),
        gcashCollected,
        gcashCollectionShare: collected > 0 ? (gcashCollected / collected) * 100 : 0,
        completedCount: Number(completionRows[0]?.completed_count ?? 0),
        categories: categoryRows.map((row) => ({
          category: row.category,
          orderCount: Number(row.order_count),
          bookedValue: Number(row.booked_value),
        })),
        paymentMethods: methodRows.map((row) => ({
          method: row.method,
          collected: Number(row.collected),
          paymentCount: Number(row.payment_count),
        })),
      },
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
