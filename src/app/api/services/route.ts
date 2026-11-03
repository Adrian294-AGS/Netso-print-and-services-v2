import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import type { RowDataPacket } from 'mysql2/promise';
import { requireSession } from '@/lib/server/auth';
import { apiErrorResponse, ApiError, assertSameOrigin, readJson } from '@/lib/server/http';
import { mysqlPool, queryRows } from '@/lib/server/mysql';
import { publishRealtimeEvent } from '@/lib/server/realtime';
import { recordAuditEvent } from '@/lib/server/audit';
import {
  ensureServiceCatalog,
  loadOptionsByService,
  replaceServiceOptions,
} from '@/lib/server/service-options';
import { startingFrom, type ServiceOption } from '@/lib/pricing';

export const runtime = 'nodejs';

const optionSchema = z.object({
  id: z.string().trim().max(60).optional(),
  label: z.string().trim().min(1).max(150),
  note: z.string().trim().max(255).optional(),
  pricingMode: z.enum(['tier', 'area']),
  unit: z.string().trim().min(1).max(40),
  minQty: z.number().int().min(1).max(100000),
  tiers: z
    .array(
      z.object({
        minQty: z.number().int().min(1).max(100000),
        price: z.number().finite().min(0).max(1_000_000),
      }),
    )
    .min(1)
    .max(12),
  available: z.boolean().optional(),
});

const serviceFields = {
  name: z.string().trim().min(2).max(150),
  category: z.string().trim().min(1).max(60),
  description: z.string().trim().min(1).max(1000),
  popularFor: z.string().trim().max(100).optional(),
  turnaround: z.string().trim().min(1).max(40),
  iconName: z.string().trim().max(50).optional(),
  options: z.array(optionSchema).min(1).max(40),
};

function toServiceOptions(options: z.infer<typeof optionSchema>[]): ServiceOption[] {
  return options.map((option) => ({
    id: option.id ?? '',
    label: option.label,
    note: option.note ?? '',
    pricingMode: option.pricingMode,
    unit: option.unit,
    minQty: option.minQty,
    tiers: option.tiers,
    available: option.available !== false,
  }));
}

export async function GET() {
  try {
    await ensureServiceCatalog();
    const rows = await queryRows<
      { ID: number; service_code: string; service_name: string; category_name: string; icon_name: string | null; base_price: string | number; price_unit: string; description: string; popular_for: string | null; turnaround: string; is_active: number } & RowDataPacket
    >(
      mysqlPool,
      `SELECT s.ID, s.service_code, s.service_name, c.category_name, s.icon_name,
              s.base_price, s.price_unit, s.description, s.popular_for, s.turnaround, s.is_active
       FROM tbl_services s JOIN tbl_service_category c ON c.ID = s.category_id
       ORDER BY s.is_active DESC, s.ID`,
    );
    const optionsByService = await loadOptionsByService();
    return NextResponse.json({
      ok: true,
      services: rows.map((row) => {
        const options = optionsByService.get(Number(row.ID)) ?? [];
        const start = options.length ? startingFrom(options) : null;
        return {
          id: row.service_code,
          name: row.service_name,
          category: row.category_name,
          iconName: row.icon_name,
          basePrice: start ? start.price : Number(row.base_price),
          unit: start ? start.unit : row.price_unit,
          description: row.description,
          popularFor: row.popular_for ?? '',
          turnaround: row.turnaround,
          available: Boolean(row.is_active),
          options,
        };
      }),
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  const connection = await mysqlPool.getConnection();
  try {
    assertSameOrigin(request);
    const user = await requireSession(request, ['lead_admin']);
    const body = await readJson(request);
    const parsed = z.object(serviceFields).safeParse(body);
    if (!parsed.success) throw new ApiError(400, 'Service details are invalid.');
    const data = parsed.data;
    const code = data.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 50);
    if (!code) throw new ApiError(400, 'Service name must contain letters or numbers.');
    const categories = await queryRows<{ ID: number } & RowDataPacket>(
      connection,
      'SELECT ID FROM tbl_service_category WHERE category_name = ?',
      [data.category],
    );
    if (!categories.length) throw new ApiError(400, 'Service category is invalid.');
    const existing = await queryRows<{ service_code: string } & RowDataPacket>(
      connection,
      'SELECT service_code FROM tbl_services WHERE service_code = ? OR service_name = ?',
      [code, data.name],
    );
    if (existing.length) throw new ApiError(409, 'A service with this name already exists.');
    await ensureServiceCatalog();
    const start = startingFrom(toServiceOptions(data.options));
    await connection.beginTransaction();
    const [result] = await connection.execute(
      `INSERT INTO tbl_services
         (service_code, category_id, service_name, description, icon_name,
          base_price, price_unit, popular_for, turnaround)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        code,
        categories[0].ID,
        data.name,
        data.description,
        data.iconName || null,
        start.price,
        start.unit,
        data.popularFor || null,
        data.turnaround,
      ],
    );
    const insertId = (result as { insertId: number }).insertId;
    await replaceServiceOptions(connection, insertId, data.options);
    await connection.commit();
    await recordAuditEvent(request, user, {
      category: 'Account / System',
      action: 'Added service to catalog',
      details: `${code}; ${data.options.length} option(s); from ₱${start.price.toFixed(2)} ${start.unit}.`,
      targetId: code,
    });
    publishRealtimeEvent({ topic: 'services', targetRoles: ['customer'] });
    return NextResponse.json({ ok: true, id: code }, { status: 201 });
  } catch (error) {
    await connection.rollback().catch(() => undefined);
    return apiErrorResponse(error);
  } finally {
    connection.release();
  }
}

export async function PUT(request: NextRequest) {
  const connection = await mysqlPool.getConnection();
  try {
    assertSameOrigin(request);
    const user = await requireSession(request, ['lead_admin']);
    const body = await readJson(request);
    const parsed = z
      .object({ id: z.string().trim().min(1).max(50), ...serviceFields })
      .safeParse(body);
    if (!parsed.success) throw new ApiError(400, 'Service details are invalid.');
    const data = parsed.data;
    const current = await queryRows<{ ID: number } & RowDataPacket>(
      connection,
      'SELECT ID FROM tbl_services WHERE service_code = ?',
      [data.id],
    );
    if (!current.length) throw new ApiError(404, 'Service not found.');
    const categories = await queryRows<{ ID: number } & RowDataPacket>(
      connection,
      'SELECT ID FROM tbl_service_category WHERE category_name = ?',
      [data.category],
    );
    if (!categories.length) throw new ApiError(400, 'Service category is invalid.');
    const duplicate = await queryRows<{ service_code: string } & RowDataPacket>(
      connection,
      'SELECT service_code FROM tbl_services WHERE service_name = ? AND service_code <> ?',
      [data.name, data.id],
    );
    if (duplicate.length) throw new ApiError(409, 'Another service already uses this name.');
    await ensureServiceCatalog();
    const start = startingFrom(toServiceOptions(data.options));
    await connection.beginTransaction();
    await connection.execute(
      `UPDATE tbl_services
       SET category_id = ?, service_name = ?, description = ?, icon_name = COALESCE(?, icon_name),
           base_price = ?, price_unit = ?, popular_for = ?, turnaround = ?
       WHERE service_code = ?`,
      [
        categories[0].ID,
        data.name,
        data.description,
        data.iconName || null,
        start.price,
        start.unit,
        data.popularFor || null,
        data.turnaround,
        data.id,
      ],
    );
    await replaceServiceOptions(connection, Number(current[0].ID), data.options);
    await connection.commit();
    await recordAuditEvent(request, user, {
      category: 'Account / System',
      action: 'Edited service details',
      details: `${data.id}; ${data.name}; ${data.options.length} option(s); from ₱${start.price.toFixed(2)} ${start.unit}.`,
      targetId: data.id,
    });
    publishRealtimeEvent({ topic: 'services', targetRoles: ['customer'] });
    return NextResponse.json({ ok: true });
  } catch (error) {
    await connection.rollback().catch(() => undefined);
    return apiErrorResponse(error);
  } finally {
    connection.release();
  }
}

export async function DELETE(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const user = await requireSession(request, ['lead_admin']);
    const parsedId = z.string().trim().min(1).max(50).safeParse(
      request.nextUrl.searchParams.get('id'),
    );
    if (!parsedId.success) throw new ApiError(400, 'Service id is invalid.');
    const id = parsedId.data;
    const found = await queryRows<
      { ID: string | number; service_name: string } & RowDataPacket
    >(
      mysqlPool,
      'SELECT ID, service_name FROM tbl_services WHERE service_code = ?',
      [id],
    );
    if (!found.length) throw new ApiError(404, 'Service not found.');
    const orderCount = await queryRows<
      { total: number | string } & RowDataPacket
    >(
      mysqlPool,
      'SELECT COUNT(*) AS total FROM tbl_print_order WHERE service_id = ?',
      [found[0].ID],
    );
    const hasOrders = Number(orderCount[0]?.total ?? 0) > 0;
    const inUseMessage =
      'This service already has orders, so it cannot be deleted. Pause it instead so customers can no longer order it.';
    if (hasOrders) throw new ApiError(409, inUseMessage);
    try {
      await mysqlPool.execute('DELETE FROM tbl_services WHERE service_code = ?', [id]);
    } catch (deleteError) {
      if ((deleteError as { code?: string }).code === 'ER_ROW_IS_REFERENCED_2') {
        throw new ApiError(409, inUseMessage);
      }
      throw deleteError;
    }
    await recordAuditEvent(request, user, {
      category: 'Account / System',
      action: 'Deleted service from catalog',
      details: `${id}; ${found[0].service_name}.`,
      targetId: id,
    });
    publishRealtimeEvent({ topic: 'services', targetRoles: ['customer'] });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const user = await requireSession(request, ['lead_admin']);
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
      const rows = await queryRows<{ service_code: string } & RowDataPacket>(
        mysqlPool,
        'SELECT service_code FROM tbl_services WHERE service_code = ?',
        [id],
      );
      if (!rows.length) throw new ApiError(404, 'Service not found.');
    }
    await recordAuditEvent(request, user, {
      category: 'Account / System',
      action: 'Updated service catalog',
      details: `${id}${basePrice === undefined ? '' : `; price ₱${basePrice.toFixed(2)}`}${available === undefined ? '' : `; ${available ? 'available' : 'unavailable'}`}.`,
      targetId: id,
    });
    publishRealtimeEvent({ topic: 'services', targetRoles: ['customer'] });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}