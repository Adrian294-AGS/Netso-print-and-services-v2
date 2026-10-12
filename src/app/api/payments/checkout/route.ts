import { randomBytes } from 'node:crypto';
import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireSession } from '@/lib/server/auth';
import { apiErrorResponse, ApiError, assertSameOrigin, readJson } from '@/lib/server/http';
import { getPayMongoEnv } from '@/lib/server/env';
import { mysqlPool, queryRows } from '@/lib/server/mysql';

export const runtime = 'nodejs';

const checkoutRequestSchema = z.object({
  requestId: z.string().trim().min(1).max(32),
  paymentType: z.enum(['Full Payment', '50% Down Payment']).default('Full Payment'),
});

const checkoutResponseSchema = z.object({
  data: z.object({
    id: z.string().min(1),
    attributes: z.object({
      checkout_url: z.url(),
      expires_at: z.number().optional(),
    }),
  }),
});

async function markCheckoutFailed(checkoutId: number): Promise<void> {
  const connection = await mysqlPool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.execute(
      `UPDATE tbl_checkout_session SET status = 'failed'
       WHERE ID = ? AND status = 'pending'`,
      [checkoutId],
    );
    await connection.execute(
      `UPDATE tbl_payments SET status = 'failed'
       WHERE checkout_session_id = ? AND status = 'pending'`,
      [checkoutId],
    );
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const user = await requireSession(request, ['customer']);
    const parsed = checkoutRequestSchema.safeParse(await readJson(request));
    if (!parsed.success) throw new ApiError(400, 'Payment details are invalid.');
    const { secretKey, appUrl } = getPayMongoEnv();

    const connection = await mysqlPool.getConnection();
    let checkoutId: number;
    let transactionNumber: string;
    let orderNumber: string;
    let paymentType: 'full_payment' | 'deposit';
    let amountCentavos: number;

    try {
      await connection.beginTransaction();
      const orders = await queryRows<
        {
          ID: number;
          order_number: string;
          user_id: string | null;
          service_name_snapshot: string;
          total_amount: string | number;
        } & RowDataPacket
      >(
        connection,
        `SELECT ID, order_number, user_id, service_name_snapshot, total_amount
         FROM tbl_print_order WHERE order_number = ? FOR UPDATE`,
        [parsed.data.requestId],
      );
      const order = orders[0];
      if (!order || order.user_id !== user.id) throw new ApiError(404, 'Order not found.');

      const paidRows = await queryRows<{ paid: string | number } & RowDataPacket>(
        connection,
        `SELECT COALESCE(SUM(amount), 0) AS paid FROM tbl_payments
         WHERE print_order_id = ? AND status = 'verified'`,
        [order.ID],
      );
      const pendingRows = await queryRows<{ pending: string | number } & RowDataPacket>(
        connection,
        `SELECT COALESCE(SUM(amount), 0) AS pending FROM tbl_payments
         WHERE print_order_id = ? AND status = 'pending'`,
        [order.ID],
      );
      if (Number(pendingRows[0]?.pending ?? 0) > 0) {
        const existingRows = await queryRows<
          {
            checkout_id: number;
            checkout_url: string | null;
            expires_at: Date | string | null;
            transaction_number: string;
            payment_type: string;
            amount: string | number;
          } & RowDataPacket
        >(
          connection,
          `SELECT c.ID AS checkout_id, c.checkout_url, c.expires_at,
                  p.transaction_number, p.payment_type, p.amount
           FROM tbl_checkout_session c
           JOIN tbl_payments p ON p.checkout_session_id = c.ID
           WHERE c.print_order_id = ? AND c.provider = 'paymongo'
             AND c.status = 'pending' AND p.status = 'pending'
           ORDER BY c.created_at DESC LIMIT 1 FOR UPDATE`,
          [order.ID],
        );
        const existing = existingRows[0];
        const expired =
          existing?.expires_at !== null &&
          existing?.expires_at !== undefined &&
          new Date(existing.expires_at).getTime() <= Date.now();

        if (existing && expired) {
          await connection.execute(
            `UPDATE tbl_checkout_session SET status = 'expired'
             WHERE ID = ? AND status = 'pending'`,
            [existing.checkout_id],
          );
          await connection.execute(
            `UPDATE tbl_payments SET status = 'failed'
             WHERE checkout_session_id = ? AND status = 'pending'`,
            [existing.checkout_id],
          );
        } else if (existing?.checkout_url) {
          const resumedPaymentType =
            existing.payment_type === 'deposit' ? '50% Down Payment' : 'Full Payment';
          await connection.commit();
          return NextResponse.json({
            ok: true,
            reused: true,
            checkoutUrl: existing.checkout_url,
            payment: {
              id: existing.transaction_number,
              requestId: order.order_number,
              amount: Number(existing.amount),
              paymentType: resumedPaymentType,
              method: 'GCash',
              status: 'Pending',
            },
          });
        } else {
          throw new ApiError(409, 'A payment for this order is already being prepared.');
        }

        const activePendingRows = await queryRows<{ pending: string | number } & RowDataPacket>(
          connection,
          `SELECT COALESCE(SUM(amount), 0) AS pending FROM tbl_payments
           WHERE print_order_id = ? AND status = 'pending'`,
          [order.ID],
        );
        if (Number(activePendingRows[0]?.pending ?? 0) > 0) {
          throw new ApiError(409, 'A payment for this order is already pending.');
        }
      }

      const toCentavos = (value: string | number) => Math.round(Number(value) * 100);
      const balanceCentavos =
        toCentavos(order.total_amount) - toCentavos(paidRows[0]?.paid ?? 0);
      if (!Number.isSafeInteger(balanceCentavos) || balanceCentavos <= 0) {
        throw new ApiError(409, 'This order has no outstanding balance.');
      }

      paymentType =
        parsed.data.paymentType === '50% Down Payment' ? 'deposit' : 'full_payment';
      amountCentavos =
        paymentType === 'deposit'
          ? Math.ceil(balanceCentavos / 200) * 100
          : balanceCentavos;
      if (amountCentavos <= 0 || amountCentavos > balanceCentavos) {
        throw new ApiError(409, 'The selected payment amount is not available.');
      }

      transactionNumber = `TXN-${Date.now().toString(36).toUpperCase()}-${randomBytes(3).toString('hex').toUpperCase()}`;
      orderNumber = order.order_number;

      const [checkoutResult] = await connection.execute<ResultSetHeader>(
        `INSERT INTO tbl_checkout_session
          (print_order_id, provider, amount, currency, status)
         VALUES (?, 'paymongo', ?, 'PHP', 'pending')`,
        [order.ID, amountCentavos / 100],
      );
      checkoutId = checkoutResult.insertId;
      await connection.execute(
        `INSERT INTO tbl_payments
          (transaction_number, print_order_id, checkout_session_id, provider,
           payment_type, method, amount, currency, status)
         VALUES (?, ?, ?, 'paymongo', ?, 'GCash', ?, 'PHP', 'pending')`,
        [transactionNumber, order.ID, checkoutId, paymentType, amountCentavos / 100],
      );
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    const returnUrl = new URL('/customer/payments', appUrl);
    returnUrl.searchParams.set('order', orderNumber);
    const successUrl = new URL(returnUrl);
    successUrl.searchParams.set('payment', 'success');
    const cancelUrl = new URL(returnUrl);
    cancelUrl.searchParams.set('payment', 'cancelled');

    let sessionCreated = false;
    try {
      const providerResponse = await fetch('https://api.paymongo.com/v2/checkout_sessions', {
        method: 'POST',
        headers: {
          Authorization: `Basic ${Buffer.from(`${secretKey}:`).toString('base64')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: {
            attributes: {
              line_items: [
                {
                  name: `Print order ${orderNumber}`,
                  amount: amountCentavos,
                  currency: 'PHP',
                  quantity: 1,
                },
              ],
              payment_method_types: ['gcash'],
              success_url: successUrl.toString(),
              cancel_url: cancelUrl.toString(),
              reference_number: transactionNumber,
              description: `Payment for print order ${orderNumber}`,
              metadata: { order_number: orderNumber, transaction_number: transactionNumber },
            },
          },
        }),
        signal: AbortSignal.timeout(15_000),
      });
      const providerPayload: unknown = await providerResponse.json().catch(() => null);
      if (!providerResponse.ok) {
        console.error('PayMongo checkout request failed with status:', providerResponse.status);
        throw new ApiError(502, 'Unable to start PayMongo checkout. Please try again.');
      }

      const checkout = checkoutResponseSchema.safeParse(providerPayload);
      if (!checkout.success) {
        console.error('PayMongo returned an invalid checkout session response.');
        throw new ApiError(502, 'PayMongo returned an invalid checkout response.');
      }

      const checkoutUrl = new URL(checkout.data.data.attributes.checkout_url);
      if (
        checkoutUrl.protocol !== 'https:' ||
        (checkoutUrl.hostname !== 'paymongo.com' &&
          !checkoutUrl.hostname.endsWith('.paymongo.com'))
      ) {
        throw new ApiError(502, 'PayMongo returned an invalid checkout link.');
      }
      sessionCreated = true;

      await mysqlPool.execute(
        `UPDATE tbl_checkout_session
         SET provider_session_id = ?, checkout_url = ?, expires_at = ?
         WHERE ID = ? AND provider = 'paymongo'`,
        [
          checkout.data.data.id,
          checkoutUrl.toString(),
          checkout.data.data.attributes.expires_at
            ? new Date(checkout.data.data.attributes.expires_at * 1000)
            : null,
          checkoutId,
        ],
      );

      return NextResponse.json({
        ok: true,
        checkoutUrl: checkoutUrl.toString(),
        payment: {
          id: transactionNumber,
          requestId: orderNumber,
          amount: amountCentavos / 100,
          paymentType,
          method: 'GCash',
          status: 'Pending',
        },
      });
    } catch (error) {
      if (!sessionCreated) {
        try {
          await markCheckoutFailed(checkoutId);
        } catch (markError) {
          console.error('Unable to mark failed PayMongo checkout in MySQL:', markError);
        }
      }
      if (error instanceof ApiError) throw error;
      console.error('PayMongo checkout creation failed:', error);
      throw new ApiError(502, 'Unable to start PayMongo checkout. Please try again.');
    }
  } catch (error) {
    return apiErrorResponse(error);
  }
}
