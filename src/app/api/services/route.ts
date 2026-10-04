import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireSession } from '@/lib/server/auth';
import { apiErrorResponse, ApiError, assertSameOrigin, readJson } from '@/lib/server/http';
import { mysqlPool, queryRows } from '@/lib/server/mysql';
import { publishRealtimeEvent } from '@/lib/server/realtime';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const rows = await queryRows<
      { service_code: string; service_name: string; category_name: string; icon_name: string | null; base_price: string | number; price_unit: string; description: string; popular_for: string | null; turnaround: string; is_active: number } & import('mysql2/promise').RowDataPacket
    >(
      mysqlPool,
      `SELECT s.service_code, s.service_name, c.category_name, s.icon_name,
              s.base_price, s.price_unit, s.description, s.popular_for, s.turnaround, s.is_active
       FROM tbl_services s JOIN tbl_service_category c ON c.ID = s.category_id
       ORDER BY s.service_name`,
    );
    return NextResponse.json({
      ok: true,
      services: rows.map((row) => ({
        id: row.service_code,
        name: row.service_name,
        category: row.category_name,
        iconName: row.icon_name,
        basePrice: Number(row.base_price),
        unit: row.price_unit,
        description: row.description,
        popularFor: row.popular_for ?? '',
        turnaround: row.turnaround,
        available: Boolean(row.is_active),
      })),
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    assertSameOrigin(request);
    await requireSession(request, ['lead_admin']);
    const body = await readJson(request);
    const parsed = z.object({
      id: z.string().trim().min(1).max(50),
      basePrice: z.number().finite().min(0).max(1_000_000).optional(),
      available: z.boolean().optional(),
    }).safeParse(body);
    if (!parsed.success || (parsed.data.basePrice === undefined && parsed.data.available === undefined)) {
      throw new ApiError(400, 'Service update is invalid.');
    }
    const { id, basePrice, available } = parsed.data;
    const [result] = await mysqlPool.execute(
      `UPDATE tbl_services
       SET base_price = COALESCE(?, base_price), is_active = COALESCE(?, is_active)
       WHERE service_code = ?`,
      [basePrice ?? null, available === undefined ? null : Number(available), id],
    );
    if ((result as { affectedRows: number }).affectedRows === 0) {
      const rows = await queryRows<{ service_code: string } & import('mysql2/promise').RowDataPacket>(
        mysqlPool,
        'SELECT service_code FROM tbl_services WHERE service_code = ?',
        [id],
      );
      if (!rows.length) throw new ApiError(404, 'Service not found.');
    }
    publishRealtimeEvent({ topic: 'services', targetRoles: ['customer'] });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
