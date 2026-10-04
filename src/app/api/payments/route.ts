import { randomBytes } from 'node:crypto';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { isStaffRole, requireSession } from '@/lib/server/auth';
import { apiErrorResponse, ApiError, assertSameOrigin, readJson } from '@/lib/server/http';
import { mysqlPool, queryRows } from '@/lib/server/mysql';
import { publishRealtimeEvent } from '@/lib/server/realtime';

export const runtime = 'nodejs';

const paymentSchema = z.object({
  requestId: z.string().trim().min(1).max(32),
  amount: z.number().positive().max(100_000_000),
  paymentType: z.enum(['Full Payment', '50% Down Payment', 'Balance Settlement']).default('Full Payment'),
  method: z.enum(['GCash', 'GCash QR', 'Cash on Pickup']).default('GCash'),
  gcashRefNo: z.string().trim().max(100).optional(),
});

const paymentStatus = (status: string) =>
  status === 'verified' ? 'Verified' : status === 'flagged' ? 'Flagged' : 'Pending Review';

export async function GET(request: NextRequest) {
  try {
    const user = await requireSession(request, ['lead_admin', 'front_desk_cashier']);
    const where = isStaffRole(user.role) ? '' : 'AND o.user_id = ?';
    const values = isStaffRole(user.role) ? [] : [user.id];
    const rows = await queryRows<
      {
        transaction_number: string | null;
        order_number: string;
        customer_name: string;
        customer_phone: string | null;
        amount: string | number;
        payment_type: string;
        method: string;
        external_reference: string | null;
        provider_payment_id: string | null;
        paid_at: Date | null;
        created_at: Date;
        status: string;
      } & import('mysql2/promise').RowDataPacket
    >(
      mysqlPool,
      `SELECT p.transaction_number, o.order_number, o.customer_name, o.customer_phone,
              p.amount, p.payment_type, p.method, p.external_reference,
              p.provider_payment_id, p.paid_at, p.created_at, p.status
       FROM tbl_payments p
       JOIN tbl_print_order o ON o.ID = p.print_order_id
       WHERE 1 = 1 ${where}
       ORDER BY p.created_at DESC LIMIT 500`,
      values,
    );
    const payments = rows.map((row) => ({
      id: row.transaction_number ?? `PAY-${row.order_number}`,
      requestId: row.order_number,
      customerName: row.customer_name,
      customerPhone: row.customer_phone ?? '',
      amount: Number(row.amount),
      paymentType:
        row.payment_type === 'deposit'
          ? '50% Down Payment'
          : row.payment_type === 'balance_settlement'
            ? 'Balance Settlement'
            : 'Full Payment',
      method: row.method,
      gcashRefNo: row.external_reference ?? '',
      paymongoId: row.provider_payment_id ?? '',
      date: new Date(row.paid_at ?? row.created_at).toISOString().slice(0, 10),
      time: new Date(row.paid_at ?? row.created_at).toLocaleTimeString('en-PH', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      status: paymentStatus(row.status),
    }));
    return NextResponse.json({ ok: true, payments, total: payments.length });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  const connection = await mysqlPool.getConnection();
  try {
    assertSameOrigin(request);
    const user = await requireSession(request);
    const parsed = paymentSchema.safeParse(await readJson(request));
    if (!parsed.success) throw new ApiError(400, 'Payment details are invalid.');
    const payment = parsed.data;
    if (isStaffRole(user.role) && !['lead_admin', 'front_desk_cashier'].includes(user.role)) {
      throw new ApiError(403, 'You are not allowed to record payments.');
    }

    await connection.beginTransaction();
    const orders = await queryRows<
      { ID: number; order_number: string; user_id: string | null; total_amount: string | number } & import('mysql2/promise').RowDataPacket
    >(
      connection,
      `SELECT ID, order_number, user_id, total_amount FROM tbl_print_order
       WHERE order_number = ? FOR UPDATE`,
      [payment.requestId],
    );
    const order = orders[0];
    if (!order || (!isStaffRole(user.role) && order.user_id !== user.id)) {
      throw new ApiError(404, 'Order not found.');
    }
    const paidRows = await queryRows<
      { paid: string | number } & import('mysql2/promise').RowDataPacket
    >(
      connection,
      `SELECT COALESCE(SUM(amount), 0) AS paid FROM tbl_payments
       WHERE print_order_id = ? AND status = 'verified'`,
      [order.ID],
    );
    const balance = Number(order.total_amount) - Number(paidRows[0]?.paid ?? 0);
    const pendingRows = await queryRows<
      { pending: string | number } & import('mysql2/promise').RowDataPacket
    >(
      connection,
      `SELECT COALESCE(SUM(amount), 0) AS pending FROM tbl_payments
       WHERE print_order_id = ? AND status = 'pending'`,
      [order.ID],
    );
    const availableToSubmit = balance - Number(pendingRows[0]?.pending ?? 0);
    if (payment.amount > availableToSubmit) {
      throw new ApiError(400, 'Payment exceeds the balance not already submitted for review.');
    }

    const paymentType =
      payment.paymentType === '50% Down Payment'
        ? 'deposit'
        : payment.paymentType === 'Balance Settlement'
          ? 'balance_settlement'
          : 'full_payment';
    const transactionNumber = `TXN-${Date.now().toString(36).toUpperCase()}-${randomBytes(3).toString('hex').toUpperCase()}`;
    await connection.execute(
      `INSERT INTO tbl_payments
        (transaction_number, print_order_id, payment_type, method, amount,
         external_reference, status, verified_by)
       VALUES (?, ?, ?, ?, ?, ?, 'pending', NULL)`,
      [
        transactionNumber,
        order.ID,
        paymentType,
        payment.method,
        payment.amount,
        payment.gcashRefNo || null,
      ],
    );
    await connection.commit();
    publishRealtimeEvent({
      topic: 'payments',
      orderId: order.order_number,
      targetUserIds: order.user_id ? [order.user_id] : [],
      targetRoles: ['lead_admin', 'front_desk_cashier'],
      notification: { category: 'Payment', text: `A payment was submitted for request ${order.order_number}.` },
    });

    return NextResponse.json(
      {
        ok: true,
        payment: {
          id: transactionNumber,
          requestId: order.order_number,
          amount: payment.amount,
          paymentType: payment.paymentType,
          method: payment.method,
          gcashRefNo: payment.gcashRefNo ?? '',
          date: new Date().toISOString().slice(0, 10),
          time: 'Just now',
          status: 'Pending Review',
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
    const user = await requireSession(request, ['lead_admin', 'front_desk_cashier']);
    const body = await readJson(request);
    const orderNumber = typeof body.orderId === 'string' ? body.orderId.trim() : '';
    const result = z.enum(['verified', 'flagged']).safeParse(body.status);
    if (!orderNumber || !result.success) throw new ApiError(400, 'Payment review request is invalid.');

    await connection.beginTransaction();
    const orders = await queryRows<{ ID: number; user_id: string | null } & import('mysql2/promise').RowDataPacket>(
      connection,
      'SELECT ID, user_id FROM tbl_print_order WHERE order_number = ? FOR UPDATE',
      [orderNumber],
    );
    if (!orders[0]) throw new ApiError(404, 'Order not found.');
    const payments = await queryRows<
      { ID: number; amount: string | number } & import('mysql2/promise').RowDataPacket
    >(
      connection,
      `SELECT ID, amount FROM tbl_payments
       WHERE print_order_id = ? AND status = 'pending' ORDER BY created_at FOR UPDATE`,
      [orders[0].ID],
    );
    if (!payments.length) throw new ApiError(404, 'No pending payments were found for this order.');

    if (result.data === 'verified') {
      const totalRows = await queryRows<{ total: string | number } & import('mysql2/promise').RowDataPacket>(
        connection,
        'SELECT total_amount AS total FROM tbl_print_order WHERE ID = ?',
        [orders[0].ID],
      );
      const paidRows = await queryRows<{ paid: string | number } & import('mysql2/promise').RowDataPacket>(
        connection,
        `SELECT COALESCE(SUM(amount), 0) AS paid FROM tbl_payments
         WHERE print_order_id = ? AND status = 'verified'`,
        [orders[0].ID],
      );
      const due = Number(totalRows[0]?.total ?? 0) - Number(paidRows[0]?.paid ?? 0);
      const toVerify: number[] = [];
      let remaining = due;
      for (const payment of payments) {
        if (Number(payment.amount) > remaining) continue;
        toVerify.push(payment.ID);
        remaining -= Number(payment.amount);
      }
      if (!toVerify.length) throw new ApiError(409, 'Pending payments exceed the remaining balance.');
      const marks = toVerify.map(() => '?').join(', ');
      await connection.execute(
        `UPDATE tbl_payments SET status = 'verified', verified_by = ?, paid_at = CURRENT_TIMESTAMP(3)
         WHERE ID IN (${marks})`,
        [user.id, ...toVerify],
      );
      const verifiedTotal = Number(paidRows[0]?.paid ?? 0) +
        toVerify.reduce((sum, paymentId) => {
          const payment = payments.find((candidate) => candidate.ID === paymentId);
          return sum + Number(payment?.amount ?? 0);
        }, 0);
      if (verifiedTotal > 0) {
        const currentRows = await queryRows<
          { status: string; progress_stage: number } & import('mysql2/promise').RowDataPacket
        >(
          connection,
          'SELECT status, progress_stage FROM tbl_print_order WHERE ID = ? FOR UPDATE',
          [orders[0].ID],
        );
        const current = currentRows[0];
        if (current?.status === 'Unpaid Balance') {
          await connection.execute(
            'UPDATE tbl_print_order SET status = ?, progress_stage = ? WHERE ID = ?',
            ['In Pre-Press', Math.max(2, current.progress_stage), orders[0].ID],
          );
          await connection.execute(
            `INSERT INTO tbl_print_order_status_history
               (print_order_id, previous_status, new_status, note, changed_by)
             VALUES (?, ?, ?, ?, ?)`,
            [
              orders[0].ID,
              current.status,
              'In Pre-Press',
              'Payment verified by staff.',
              user.id,
            ],
          );
        }
      }
    } else {
      await connection.execute(
        `UPDATE tbl_payments SET status = 'flagged', verified_by = ?
         WHERE print_order_id = ? AND status = 'pending'`,
        [user.id, orders[0].ID],
      );
    }

    await connection.commit();
    publishRealtimeEvent({
      topic: 'payments',
      orderId: orderNumber,
      targetUserIds: orders[0].user_id ? [orders[0].user_id] : [],
      targetRoles: ['lead_admin', 'front_desk_cashier'],
      notification: {
        category: 'Payment',
        text: result.data === 'verified'
          ? `Payment for request ${orderNumber} was verified.`
          : `Payment for request ${orderNumber} needs review.`,
      },
    });
    return NextResponse.json({ ok: true, orderId: orderNumber, status: result.data });
  } catch (error) {
    await connection.rollback();
    return apiErrorResponse(error);
  } finally {
    connection.release();
  }
}
