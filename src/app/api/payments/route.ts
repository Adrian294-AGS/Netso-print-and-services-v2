import { randomBytes } from 'node:crypto';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { isStaffRole, requireSession } from '@/lib/server/auth';
import { apiErrorResponse, ApiError, assertSameOrigin, readJson } from '@/lib/server/http';
import { mysqlPool, queryRows } from '@/lib/server/mysql';
import { publishRealtimeEvent } from '@/lib/server/realtime';
import { recordAuditEvent } from '@/lib/server/audit';

export const runtime = 'nodejs';

const paymentSchema = z.object({
  requestId: z.string().trim().min(1).max(32),
  amount: z.number().positive().max(100_000_000),
  paymentType: z.enum(['Full Payment', '50% Down Payment', 'Balance Settlement']).default('Full Payment'),
  method: z.enum(['GCash', 'GCash QR', 'Cash on Pickup']).default('GCash'),
  gcashRefNo: z.string().trim().max(100).optional(),
});

const paymentStatus = (status: string, provider: string | null) => {
  switch (status) {
    case 'verified':
      return 'Verified';
    case 'flagged':
      return 'Flagged';
    case 'failed':
      return 'Failed';
    case 'refunded':
      return 'Refunded';
    default:
      return provider === 'paymongo' ? 'Pending' : 'Pending Review';
  }
};

export async function GET(request: NextRequest) {
  try {
    const user = await requireSession(request, ['lead_admin', 'front_desk_cashier']);
    const where = isStaffRole(user.role) ? '' : 'AND o.user_id = ?';
    const values = isStaffRole(user.role) ? [] : [user.id];
    const rows = await queryRows<
      {
        payment_id: string | number;
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
        provider: string | null;
      } & import('mysql2/promise').RowDataPacket
    >(
      mysqlPool,
      `SELECT p.ID AS payment_id, p.transaction_number,
              o.order_number, o.customer_name, o.customer_phone,
              p.amount, p.payment_type, p.method, p.external_reference,
              p.provider, p.provider_payment_id, p.paid_at, p.created_at, p.status
       FROM tbl_payments p
       JOIN tbl_print_order o ON o.ID = p.print_order_id
       WHERE 1 = 1 ${where}
       ORDER BY p.created_at DESC LIMIT 500`,
      values,
    );
    const payments = rows.map((row) => ({
      paymentId: String(row.payment_id),
      id: row.transaction_number ?? `PAY-${row.payment_id}`,
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
      provider: row.provider,
      date: new Date(row.paid_at ?? row.created_at).toISOString().slice(0, 10),
      time: new Date(row.paid_at ?? row.created_at).toLocaleTimeString('en-PH', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      status: paymentStatus(row.status, row.provider),
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
    const balanceCentavos =
      Math.round(Number(order.total_amount) * 100) -
      Math.round(Number(paidRows[0]?.paid ?? 0) * 100);
    const pendingRows = await queryRows<
      { pending: string | number } & import('mysql2/promise').RowDataPacket
    >(
      connection,
      `SELECT COALESCE(SUM(amount), 0) AS pending FROM tbl_payments
       WHERE print_order_id = ? AND status = 'pending'`,
      [order.ID],
    );
    const pendingCentavos = Math.round(Number(pendingRows[0]?.pending ?? 0) * 100);
    const availableToSubmitCentavos = Math.max(0, balanceCentavos - pendingCentavos);
    const requestedCentavos = Math.round(payment.amount * 100);
    if (requestedCentavos > availableToSubmitCentavos) {
      const pendingAmount = (pendingCentavos / 100).toLocaleString('en-PH', {
        style: 'currency',
        currency: 'PHP',
      });
      throw new ApiError(
        409,
        pendingCentavos > 0
          ? `This order already has ${pendingAmount} in payments pending verification. Review or wait for those payments before recording another.`
          : 'The payment amount exceeds the order balance.',
      );
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
    await recordAuditEvent(request, user, {
      category: 'GCash Payment',
      action: 'Submitted payment for review',
      details: `${payment.method}; ₱${payment.amount.toFixed(2)}.`,
      targetId: order.order_number,
    });
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
    const paymentId = typeof body.paymentId === 'string' ? body.paymentId.trim() : '';
    const result = z.enum(['verified', 'flagged']).safeParse(body.status);
    if (!/^\d+$/.test(paymentId) || !result.success) {
      throw new ApiError(400, 'Payment review request is invalid.');
    }

    await connection.beginTransaction();
    const paymentRows = await queryRows<
      {
        payment_id: string | number;
        print_order_id: number;
        order_number: string;
        user_id: string | null;
        total_amount: string | number;
        amount: string | number;
        status: string;
        provider: string | null;
      } & import('mysql2/promise').RowDataPacket
    >(
      connection,
      `SELECT p.ID AS payment_id, p.print_order_id, p.amount, p.status, p.provider,
              o.order_number, o.user_id, o.total_amount
       FROM tbl_payments p
       JOIN tbl_print_order o ON o.ID = p.print_order_id
       WHERE p.ID = ? FOR UPDATE`,
      [paymentId],
    );
    const payment = paymentRows[0];
    if (!payment) throw new ApiError(404, 'Payment transaction not found.');
    if (payment.status === 'verified') {
      if (result.data !== 'verified') {
        throw new ApiError(409, 'A verified payment cannot be flagged.');
      }
      await connection.commit();
      return NextResponse.json({
        ok: true,
        paymentId,
        orderId: payment.order_number,
        status: 'verified',
        alreadyReviewed: true,
      });
    }
    if (payment.status !== 'pending') {
      throw new ApiError(409, 'Only pending payment transactions can be reviewed.');
    }
    if (payment.provider === 'paymongo') {
      throw new ApiError(409, 'PayMongo payments are confirmed automatically by the payment provider.');
    }

    let fullyPaid = false;
    if (result.data === 'verified') {
      const verifiedRows = await queryRows<
        { paid: string | number } & import('mysql2/promise').RowDataPacket
      >(
        connection,
        `SELECT COALESCE(SUM(amount), 0) AS paid FROM tbl_payments
         WHERE print_order_id = ? AND status = 'verified'`,
        [payment.print_order_id],
      );
      const otherPendingRows = await queryRows<
        { pending: string | number } & import('mysql2/promise').RowDataPacket
      >(
        connection,
        `SELECT COALESCE(SUM(amount), 0) AS pending FROM tbl_payments
         WHERE print_order_id = ? AND status = 'pending'
           AND provider = 'paymongo'`,
        [payment.print_order_id],
      );
      const remainingCentavos =
        Math.round(Number(payment.total_amount) * 100) -
        Math.round(Number(verifiedRows[0]?.paid ?? 0) * 100) -
        Math.round(Number(otherPendingRows[0]?.pending ?? 0) * 100);
      const amountCentavos = Math.round(Number(payment.amount) * 100);
      if (amountCentavos > remainingCentavos) {
        throw new ApiError(409, 'This payment exceeds the remaining order balance and cannot be verified.');
      }
      await connection.execute(
        `UPDATE tbl_payments
         SET status = 'verified', verified_by = ?, paid_at = CURRENT_TIMESTAMP(3)
         WHERE ID = ? AND status = 'pending' AND provider IS NULL`,
        [user.id, payment.payment_id],
      );
      fullyPaid =
        Math.round(Number(verifiedRows[0]?.paid ?? 0) * 100) + amountCentavos >=
        Math.round(Number(payment.total_amount) * 100);
    } else {
      await connection.execute(
        `UPDATE tbl_payments SET status = 'flagged', verified_by = ?
         WHERE ID = ? AND status = 'pending' AND provider IS NULL`,
        [user.id, payment.payment_id],
      );
    }

    await connection.commit();
    await recordAuditEvent(request, user, {
      category: 'GCash Payment',
      action: result.data === 'verified' ? 'Verified payment' : 'Flagged payment',
      details: `Payment ${paymentId}; ₱${Number(payment.amount).toFixed(2)}.`,
      targetId: payment.order_number,
      status: result.data === 'verified' ? 'Verified' : 'Warning',
    });
    publishRealtimeEvent({
      topic: 'payments',
      orderId: payment.order_number,
      targetUserIds: payment.user_id ? [payment.user_id] : [],
      targetRoles: ['lead_admin', 'front_desk_cashier', 'print_operator', 'pre_press_artist'],
      notification: {
        category: 'Payment',
        text:
          result.data === 'verified' && fullyPaid
            ? `Request ${payment.order_number} is fully paid and ready for staff confirmation.`
            : result.data === 'verified'
              ? `A payment for request ${payment.order_number} was verified; the remaining balance is still due.`
              : `A payment for request ${payment.order_number} was flagged for review.`,
      },
    });
    return NextResponse.json({
      ok: true,
      paymentId,
      orderId: payment.order_number,
      status: result.data,
    });
  } catch (error) {
    await connection.rollback();
    return apiErrorResponse(error);
  } finally {
    connection.release();
  }
}
