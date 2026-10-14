import { randomBytes } from 'node:crypto';
import { DeleteObjectsCommand } from '@aws-sdk/client-s3';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getB2 } from '@/lib/server/b2';
import { publishRealtimeEvent } from '@/lib/server/realtime';
import { isStaffRole, requireSession, type SessionUser } from '@/lib/server/auth';
import { apiErrorResponse, ApiError, assertSameOrigin, readJson } from '@/lib/server/http';
import { mysqlPool, queryRows } from '@/lib/server/mysql';
import { isGCashPaymentEnabled } from '@/lib/server/payment-settings';

export const runtime = 'nodejs';

const orderSchema = z.object({
  service: z.string().trim().min(1).max(150),
  quantity: z.number().int().min(1).max(10000).default(1),
  pages: z.number().int().min(1).max(10000).optional(),
  paperSize: z.string().trim().max(100).optional(),
  colorMode: z.enum(['Black & White', 'Colored']).optional(),
  finish: z.string().trim().max(255).optional(),
  notes: z.string().trim().max(5000).default(''),
  paymentMethod: z.enum(['GCash', 'Cash on Pickup']).default('Cash on Pickup'),
  walkIn: z.boolean().optional(),
  customerName: z.string().trim().min(2).max(225).optional(),
  customerPhone: z.string().trim().min(7).max(32).optional(),
  customerEmail: z.email().max(254).optional(),
  amount: z.number().positive().max(100_000_000).optional(),
  paidAmount: z.number().min(0).max(100_000_000).optional(),
});

const statusSchema = z.enum([
  'Unpaid Balance',
  'In Pre-Press',
  'In Production',
  'Ready for Pickup',
  'Completed',
  'Cancelled',
]);

type OrderRow = {
  ID: number;
  order_number: string;
  user_id: string | null;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string | null;
  service_name_snapshot: string;
  category_name: string;
  total_amount: string | number;
  paid_amount: string | number;
  status: string;
  progress_stage: number;
  notes: string | null;
  created_at: Date;
  payment_method: 'GCash' | 'Cash on Pickup' | null;
  paper_size: string | null;
  page_count: number | null;
  quantity: number;
  color_mode: string | null;
  finish: string | null;
};

function toClientOrder(row: OrderRow, files: Array<{ ID: number; original_file_name: string; file_size_bytes: string | number | null; file_extension: string | null }>) {
  const amount = Number(row.total_amount);
  const paidAmount = Number(row.paid_amount);
  const unpaidAmount = Math.max(
    0,
    Math.round(amount * 100) - Math.round(paidAmount * 100),
  ) / 100;
  return {
    id: row.order_number,
    customerId: row.user_id ?? 'walk-in',
    customerName: row.customer_name,
    customerUsername: row.customer_email?.split('@')[0] ?? 'walk_in',
    customerPhone: row.customer_phone ?? '',
    customerEmail: row.customer_email ?? '',
    service: row.service_name_snapshot,
    category: row.category_name,
    specs: {
      paperSize: row.paper_size ?? undefined,
      pages: row.page_count ?? undefined,
      copies: row.quantity,
      colorMode: row.color_mode as 'Black & White' | 'Colored' | undefined,
      finish: row.finish ?? undefined,
    },
    date: new Date(row.created_at).toISOString().slice(0, 10),
    amount,
    paidAmount,
    unpaidAmount,
    status: row.status,
    progressStage: row.progress_stage,
    notes: row.notes ?? '',
    paymentMethod: row.payment_method ?? undefined,
    paymentVerified: paidAmount > 0,
    files: files.map((file) => ({
      id: String(file.ID),
      name: file.original_file_name,
      size: Number(file.file_size_bytes ?? 0),
      ext: file.file_extension ?? '',
    })),
  };
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireSession(request);
    const orders = await loadClientOrders(user);
    return NextResponse.json({ ok: true, orders, total: orders.length });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function DELETE(request: NextRequest) {
  const connection = await mysqlPool.getConnection();
  try {
    assertSameOrigin(request);
    const user = await requireSession(request, ['customer']);
    const parsed = z.object({ orderId: z.string().trim().min(1).max(32) }).safeParse(await readJson(request));
    if (!parsed.success) throw new ApiError(400, 'Request details are invalid.');

    await connection.beginTransaction();
    const orders = await queryRows<
      { ID: number; status: string; progress_stage: number } & import('mysql2/promise').RowDataPacket
    >(
      connection,
      'SELECT ID, status, progress_stage FROM tbl_print_order WHERE order_number = ? AND user_id = ? FOR UPDATE',
      [parsed.data.orderId, user.id],
    );
    const order = orders[0];
    if (!order) throw new ApiError(404, 'Request not found.');
    if (order.status !== 'Unpaid Balance' || order.progress_stage !== 1) {
      throw new ApiError(409, 'Only unpaid requests that have not entered production can be deleted.');
    }

    const payments = await queryRows<{ status: string } & import('mysql2/promise').RowDataPacket>(
      connection,
      'SELECT status FROM tbl_payments WHERE print_order_id = ? FOR UPDATE',
      [order.ID],
    );
    const checkouts = await queryRows<{ status: string } & import('mysql2/promise').RowDataPacket>(
      connection,
      'SELECT status FROM tbl_checkout_session WHERE print_order_id = ? FOR UPDATE',
      [order.ID],
    );
    const hasNonPendingPayment = payments.some((payment) => payment.status !== 'pending');
    const hasCompletedOrUnknownCheckout = checkouts.some(
      (checkout) => !['pending', 'expired', 'failed', 'cancelled'].includes(checkout.status),
    );
    if (hasNonPendingPayment || hasCompletedOrUnknownCheckout) {
      throw new ApiError(409, 'This request has verified or completed payment activity and cannot be deleted.');
    }

    await connection.execute(
      `DELETE FROM tbl_payments
       WHERE print_order_id = ? AND status = 'pending'`,
      [order.ID],
    );
    await connection.execute(
      `DELETE FROM tbl_checkout_session
       WHERE print_order_id = ? AND status IN ('pending', 'expired', 'failed', 'cancelled')`,
      [order.ID],
    );
    const files = await queryRows<{ storage_key: string | null } & import('mysql2/promise').RowDataPacket>(
      connection,
      'SELECT storage_key FROM tbl_print_order_file WHERE print_order_id = ?',
      [order.ID],
    );
    await connection.execute(
      'DELETE FROM tbl_print_order_status_history WHERE print_order_id = ?',
      [order.ID],
    );
    await connection.execute(
      'DELETE FROM tbl_print_order WHERE ID = ?',
      [order.ID],
    );
    await connection.commit();
    publishRealtimeEvent({
      topic: 'orders',
      orderId: parsed.data.orderId,
      targetUserIds: user.id ? [user.id] : [],
      targetRoles: ['lead_admin', 'print_operator', 'pre_press_artist', 'front_desk_cashier'],
    });

    const keys = files.flatMap((file) => (file.storage_key ? [{ Key: file.storage_key }] : []));
    if (keys.length) {
      try {
        const { bucket, client } = getB2();
        const result = await client.send(
          new DeleteObjectsCommand({
            Bucket: bucket,
            Delete: { Objects: keys, Quiet: true },
          }),
        );
        if (result.Errors?.length) {
          console.error('B2 cleanup failed after request deletion:', result.Errors);
          return NextResponse.json(
            { ok: true, storageCleanupWarning: true, error: 'The request was deleted, but some stored files could not be removed.' },
            { status: 200 },
          );
        }
      } catch (error) {
        console.error('B2 cleanup failed after request deletion:', error);
        return NextResponse.json(
          { ok: true, storageCleanupWarning: true, error: 'The request was deleted, but its stored files could not be removed.' },
          { status: 200 },
        );
      }
    }

    return NextResponse.json({ ok: true, orderId: parsed.data.orderId });
  } catch (error) {
    await connection.rollback();
    return apiErrorResponse(error);
  } finally {
    connection.release();
  }
}

async function loadClientOrders(user: SessionUser) {
  const where = isStaffRole(user.role) ? '' : 'WHERE o.user_id = ?';
  const values = isStaffRole(user.role) ? [] : [user.id];
  const rows = await queryRows<OrderRow & import('mysql2/promise').RowDataPacket>(
    mysqlPool,
    `SELECT o.ID, o.order_number, o.user_id, o.customer_name, o.customer_email, o.customer_phone,
            o.service_name_snapshot, c.category_name, o.total_amount,
            COALESCE(p.paid_amount, 0) AS paid_amount, o.status, o.progress_stage, o.notes,
            o.created_at, o.payment_method, o.paper_size, o.page_count, o.quantity, o.color_mode, o.finish
     FROM tbl_print_order o
     JOIN tbl_services s ON s.ID = o.service_id
     JOIN tbl_service_category c ON c.ID = s.category_id
     LEFT JOIN (
       SELECT print_order_id, SUM(amount) AS paid_amount
       FROM tbl_payments WHERE status = 'verified' GROUP BY print_order_id
     ) p ON p.print_order_id = o.ID
     ${where}
     ORDER BY o.created_at DESC LIMIT 500`,
    values,
  );
  const idRows = rows;
  if (!idRows.length) return [];
  const ids = idRows.map((row) => row.ID);
  const placeholders = ids.map(() => '?').join(', ');
  const files = await queryRows<
    { ID: number; print_order_id: number; original_file_name: string; file_size_bytes: string | number | null; file_extension: string | null } & import('mysql2/promise').RowDataPacket
  >(
    mysqlPool,
    `SELECT ID, print_order_id, original_file_name, file_size_bytes, file_extension
     FROM tbl_print_order_file WHERE print_order_id IN (${placeholders}) ORDER BY ID`,
    ids,
  );
  const filesByOrder = new Map<number, typeof files>();
  for (const file of files) {
    const orderFiles = filesByOrder.get(file.print_order_id) ?? [];
    orderFiles.push(file);
    filesByOrder.set(file.print_order_id, orderFiles);
  }
  return idRows.map((row) => toClientOrder(row, filesByOrder.get(row.ID) ?? []));
}

export async function POST(request: NextRequest) {
  const connection = await mysqlPool.getConnection();
  try {
    assertSameOrigin(request);
    const user = await requireSession(request);
    const parsed = orderSchema.safeParse(await readJson(request));
    if (!parsed.success) throw new ApiError(400, 'Order details are invalid.');
    const input = parsed.data;
    if (input.walkIn && !isStaffRole(user.role)) throw new ApiError(403, 'Staff access is required for walk-in orders.');
    if (!input.walkIn && user.role !== 'customer') throw new ApiError(403, 'Customer access is required to place this order.');
    if (input.paymentMethod === 'GCash' && !(await isGCashPaymentEnabled(connection))) {
      throw new ApiError(409, 'GCash payments are not currently available. Please choose Cash on Pickup.');
    }

    const services = await queryRows<
      { ID: number; service_name: string; category_name: string; base_price: string | number; is_active: number } & import('mysql2/promise').RowDataPacket
    >(
      connection,
      `SELECT s.ID, s.service_name, c.category_name, s.base_price, s.is_active
       FROM tbl_services s JOIN tbl_service_category c ON c.ID = s.category_id
       WHERE (s.service_code = ? OR s.service_name = ?) LIMIT 1`,
      [input.service, input.service],
    );
    const service = services[0];
    if (!service || !service.is_active) throw new ApiError(400, 'Selected service is unavailable.');

    const users = input.walkIn
      ? []
      : await queryRows<
          { first_name: string | null; middle_name: string | null; last_name: string | null; email: string | null; mobile_number: string | null } & import('mysql2/promise').RowDataPacket
        >(connection, 'SELECT first_name, middle_name, last_name, email, mobile_number FROM tbl_user WHERE UID = ? AND account_status = ? LIMIT 1', [user.id, 'active']);
    const account = users[0];
    if (!input.walkIn && !account) throw new ApiError(401, 'Your account is no longer active.');
    const customerName =
      input.walkIn
        ? input.customerName!
        : [account?.first_name, account?.middle_name, account?.last_name].filter(Boolean).join(' ') || user.email || 'Customer';
    const total = input.walkIn ? input.amount ?? 0 : Number(service.base_price) * input.quantity;
    const walkInPaid = input.walkIn ? input.paidAmount ?? 0 : 0;
    if (!total || walkInPaid > total) throw new ApiError(400, 'Order amount or initial payment is invalid.');
    const orderNumber = `NETSO-${Date.now().toString(36).toUpperCase()}-${randomBytes(3).toString('hex').toUpperCase()}`;

    await connection.beginTransaction();
    const [result] = await connection.execute(
      `INSERT INTO tbl_print_order
        (order_number, user_id, service_id, customer_name, customer_email, customer_phone,
         service_name_snapshot, unit_price, quantity, page_count, paper_size, color_mode,
         finish, notes, total_amount, payment_method, status, progress_stage)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Unpaid Balance', 1)`,
      [
        orderNumber,
        input.walkIn ? null : user.id,
        service.ID,
        customerName,
        input.walkIn ? input.customerEmail ?? null : account?.email,
        input.walkIn ? input.customerPhone ?? null : account?.mobile_number,
        service.service_name,
        service.base_price,
        input.quantity,
        input.pages ?? null,
        input.paperSize ?? null,
        input.colorMode ?? null,
        input.finish ?? null,
        input.notes,
        total,
        input.paymentMethod,
      ],
    );
    const insertId = (result as { insertId: number }).insertId;
    if (walkInPaid > 0) {
      await connection.execute(
        `INSERT INTO tbl_payments
          (transaction_number, print_order_id, payment_type, method, amount, status)
         VALUES (?, ?, ?, 'Cash on Pickup', ?, 'pending')`,
        [
          `TXN-${Date.now().toString(36).toUpperCase()}-${randomBytes(3).toString('hex').toUpperCase()}`,
          insertId,
          walkInPaid >= total ? 'full_payment' : 'deposit',
          walkInPaid,
        ],
      );
    }
    await connection.execute(
      `INSERT INTO tbl_print_order_status_history (print_order_id, previous_status, new_status, changed_by)
       VALUES (?, NULL, 'Unpaid Balance', ?)`,
      [insertId, user.id],
    );
    await connection.commit();
    publishRealtimeEvent({
      topic: 'orders',
      orderId: orderNumber,
      targetUserIds: user.id ? [user.id] : [],
      targetRoles: ['lead_admin', 'print_operator', 'pre_press_artist', 'front_desk_cashier'],
      notification: { category: 'Order', text: `New print request ${orderNumber} was submitted.` },
    });

    return NextResponse.json(
      {
        ok: true,
        order: {
          id: orderNumber,
          customerId: input.walkIn ? 'walk-in' : user.id,
          customerName,
          customerUsername: user.username ?? user.email?.split('@')[0] ?? '',
          customerPhone: input.walkIn ? input.customerPhone ?? '' : account?.mobile_number ?? '',
          customerEmail: input.walkIn ? input.customerEmail ?? '' : account?.email ?? '',
          service: service.service_name,
          category: service.category_name,
          specs: { paperSize: input.paperSize, pages: input.pages, copies: input.quantity, colorMode: input.colorMode, finish: input.finish },
          date: new Date().toISOString().slice(0, 10),
          amount: total,
          paidAmount: 0,
          unpaidAmount: total,
          status: 'Unpaid Balance',
          progressStage: 1,
          notes: input.notes,
          paymentMethod: input.paymentMethod,
          paymentVerified: false,
          files: [],
        },
      },
      { status: 201 },
    );
  } catch (error) {
    await connection.rollback();
    return apiErrorResponse(error);
  } finally {
    connection.release();
  }
}

export async function PATCH(request: NextRequest) {
  const connection = await mysqlPool.getConnection();
  try {
    assertSameOrigin(request);
    const user = await requireSession(request, ['lead_admin', 'print_operator', 'pre_press_artist', 'front_desk_cashier']);
    const body = await readJson(request);
    const orderNumber = typeof body.orderId === 'string' ? body.orderId.trim() : '';
    const statusResult = statusSchema.safeParse(body.status);
    const progressStage = Number(body.progressStage);
    const note = typeof body.adminNote === 'string' ? body.adminNote.trim().slice(0, 2000) : '';
    if (!orderNumber || !statusResult.success || !Number.isInteger(progressStage) || progressStage < 1 || progressStage > 4) {
      throw new ApiError(400, 'Order status update is invalid.');
    }

    await connection.beginTransaction();
    const rows = await queryRows<
      { ID: number; status: string; progress_stage: number; user_id: string | null; total_amount: string | number; payment_method: string | null } & import('mysql2/promise').RowDataPacket
    >(
      connection,
      'SELECT ID, status, progress_stage, user_id, total_amount, payment_method FROM tbl_print_order WHERE order_number = ? FOR UPDATE',
      [orderNumber],
    );
    const order = rows[0];
    if (!order) throw new ApiError(404, 'Order not found.');
    const isConfirmingOrder =
      statusResult.data !== 'Unpaid Balance' &&
      statusResult.data !== 'Cancelled' &&
      (order.status === 'Unpaid Balance' ||
        order.status === 'Cancelled' ||
        order.progress_stage < 2);
    if (isConfirmingOrder && order.payment_method !== 'Cash on Pickup') {
      const paymentRows = await queryRows<
        { paid: string | number } & import('mysql2/promise').RowDataPacket
      >(
        connection,
        `SELECT COALESCE(SUM(amount), 0) AS paid FROM tbl_payments
         WHERE print_order_id = ? AND status = 'verified'`,
        [order.ID],
      );
      if (
        Math.round(Number(paymentRows[0]?.paid ?? 0) * 100) <
        Math.round(Number(order.total_amount) * 100)
      ) {
        throw new ApiError(409, 'GCash orders can only be confirmed after the full payment is verified.');
      }
    }
    await connection.execute(
      'UPDATE tbl_print_order SET status = ?, progress_stage = ?, notes = CONCAT(COALESCE(notes, ?), ?) WHERE ID = ?',
      [statusResult.data, progressStage, '', note ? ` [Staff note: ${note}]` : '', order.ID],
    );
    await connection.execute(
      `INSERT INTO tbl_print_order_status_history
        (print_order_id, previous_status, new_status, note, changed_by)
       VALUES (?, ?, ?, ?, ?)`,
      [order.ID, order.status, statusResult.data, note || null, user.id],
    );
    await connection.commit();
    publishRealtimeEvent({
      topic: 'orders',
      orderId: orderNumber,
      targetUserIds: order.user_id ? [order.user_id] : [],
      targetRoles: ['lead_admin', 'print_operator', 'pre_press_artist', 'front_desk_cashier'],
      notification: { category: 'Order', text: `Request ${orderNumber} is now ${statusResult.data}.` },
    });
    return NextResponse.json({ ok: true, orderId: orderNumber, status: statusResult.data, progressStage });
  } catch (error) {
    await connection.rollback();
    return apiErrorResponse(error);
  } finally {
    connection.release();
  }
}
