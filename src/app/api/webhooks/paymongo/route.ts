import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import type { PoolConnection, RowDataPacket } from 'mysql2/promise';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getPayMongoWebhookSecret } from '@/lib/server/env';
import { ApiError, apiErrorResponse } from '@/lib/server/http';
import { mysqlPool, queryRows } from '@/lib/server/mysql';
import { publishRealtimeEvent } from '@/lib/server/realtime';

export const runtime = 'nodejs';

const webhookEnvelopeSchema = z.object({
  data: z.object({
    id: z.string().optional(),
    type: z.string().optional(),
    attributes: z
      .object({
        type: z.string().optional(),
        data: z.unknown().optional(),
      })
      .passthrough()
      .optional(),
    data: z.unknown().optional(),
  }).passthrough(),
}).passthrough();

const checkoutSessionSchema = z.object({
  id: z.string(),
  attributes: z.object({
    reference_number: z.string().nullish(),
    payments: z.array(
      z.object({
        id: z.string(),
        attributes: z.object({
          amount: z.number(),
          currency: z.string(),
          status: z.string(),
        }),
      }).passthrough(),
    ).optional(),
  }).passthrough(),
}).passthrough();

function signaturesFromHeader(header: string): Map<string, string> {
  return new Map(
    header.split(',').flatMap((part) => {
      const separator = part.indexOf('=');
      if (separator < 1) return [];
      return [[part.slice(0, separator).trim(), part.slice(separator + 1).trim()]];
    }),
  );
}

function signatureMatches(expected: string, actual: string | undefined): boolean {
  if (!actual || !/^[a-f0-9]{64}$/i.test(actual)) return false;
  return timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(actual, 'hex'));
}

function isValidPayMongoSignature(rawBody: string, header: string, secret: string): boolean {
  const parts = signaturesFromHeader(header);
  const timestamp = parts.get('t');
  if (!timestamp || !/^\d+$/.test(timestamp)) return false;

  const expected = createHmac('sha256', secret)
    .update(`${timestamp}.${rawBody}`)
    .digest('hex');
  return signatureMatches(expected, parts.get('te')) || signatureMatches(expected, parts.get('li'));
}

export async function POST(request: Request) {
  let connection: PoolConnection | undefined;
  let transactionStarted = false;
  try {
    const contentLength = Number(request.headers.get('content-length') || 0);
    if (contentLength > 1024 * 1024) throw new ApiError(413, 'Webhook payload is too large.');

    const rawBody = await request.text();
    if (Buffer.byteLength(rawBody, 'utf8') > 1024 * 1024) {
      throw new ApiError(413, 'Webhook payload is too large.');
    }

    const webhookSecret = getPayMongoWebhookSecret();
    const signatureHeader = request.headers.get('paymongo-signature') ?? '';
    if (!isValidPayMongoSignature(rawBody, signatureHeader, webhookSecret)) {
      throw new ApiError(401, 'Invalid PayMongo webhook signature.');
    }

    let payload: unknown;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      throw new ApiError(400, 'Webhook payload must be valid JSON.');
    }
    const parsed = webhookEnvelopeSchema.safeParse(payload);
    if (!parsed.success) throw new ApiError(400, 'PayMongo webhook payload is invalid.');

    const envelope = parsed.data.data;
    const eventType = envelope.attributes?.type ?? envelope.type;
    if (eventType !== 'checkout_session.payment.paid') {
      return NextResponse.json({ ok: true, ignored: true });
    }

    const checkoutSessionPayload = envelope.attributes?.data ?? envelope.data;
    const parsedCheckoutSession = checkoutSessionSchema.safeParse(checkoutSessionPayload);
    if (!parsedCheckoutSession.success) {
      throw new ApiError(400, 'PayMongo checkout session payload is invalid.');
    }
    const checkoutSession = parsedCheckoutSession.data;
    const paidPayment = checkoutSession.attributes.payments?.find(
      (payment) => payment.attributes.status === 'paid',
    );
    if (!paidPayment) {
      console.error('PayMongo reported a paid checkout session without an embedded paid payment.', {
        checkoutSessionId: checkoutSession.id,
      });
      throw new ApiError(400, 'PayMongo webhook contains no paid payment.');
    }

    const eventId = createHash('sha256').update(rawBody).digest('hex');
    const loggedPayload = JSON.stringify({
      eventType,
      checkoutSessionId: checkoutSession.id,
      referenceNumber: checkoutSession.attributes.reference_number ?? null,
      paymentId: paidPayment.id,
      amount: paidPayment.attributes.amount,
      currency: paidPayment.attributes.currency,
    });

    connection = await mysqlPool.getConnection();
    const dbConnection = connection;
    await dbConnection.beginTransaction();
    transactionStarted = true;
    await dbConnection.execute(
      `INSERT INTO tbl_webhook_event_log
        (provider, provider_event_id, event_type, payload, processing_status)
       VALUES ('paymongo', ?, ?, ?, 'pending')
       ON DUPLICATE KEY UPDATE provider_event_id = VALUES(provider_event_id)`,
      [eventId, eventType, loggedPayload],
    );
    const logRows = await queryRows<
      { ID: number; processing_status: string } & RowDataPacket
    >(
      dbConnection,
      `SELECT ID, processing_status FROM tbl_webhook_event_log
       WHERE provider = 'paymongo' AND provider_event_id = ? FOR UPDATE`,
      [eventId],
    );
    const eventLog = logRows[0];
    if (!eventLog) throw new Error('PayMongo webhook event log could not be loaded.');
    if (eventLog.processing_status === 'processed') {
      await dbConnection.commit();
      transactionStarted = false;
      return NextResponse.json({ ok: true, duplicate: true });
    }

    const checkoutRows = await queryRows<
      {
        checkout_id: number;
        provider_session_id: string | null;
        checkout_amount: string | number;
        print_order_id: number;
        payment_id: number;
        payment_amount: string | number;
        payment_status: string;
        transaction_number: string;
        total_amount: string | number;
        order_number: string;
        user_id: string | null;
      } & RowDataPacket
    >(
      dbConnection,
      `SELECT c.ID AS checkout_id, c.provider_session_id, c.amount AS checkout_amount,
              p.print_order_id, p.ID AS payment_id, p.amount AS payment_amount,
              p.status AS payment_status, p.transaction_number, o.total_amount,
              o.order_number, o.user_id
       FROM tbl_checkout_session c
       JOIN tbl_payments p ON p.checkout_session_id = c.ID
       JOIN tbl_print_order o ON o.ID = c.print_order_id
       WHERE c.provider = 'paymongo'
         AND (c.provider_session_id = ? OR p.transaction_number = ?)
       LIMIT 1 FOR UPDATE`,
      [checkoutSession.id, checkoutSession.attributes.reference_number ?? null],
    );
    const checkout = checkoutRows[0];
    if (!checkout) {
      await dbConnection.execute(
        `UPDATE tbl_webhook_event_log
         SET processing_status = 'failed', processing_error = 'Checkout session not found',
             processed_at = CURRENT_TIMESTAMP(3)
         WHERE ID = ?`,
        [eventLog.ID],
      );
      await dbConnection.commit();
      transactionStarted = false;
      return NextResponse.json({ ok: true, unmatched: true });
    }

    const paidAmount = Math.round(Number(checkout.payment_amount) * 100);
    const checkoutAmount = Math.round(Number(checkout.checkout_amount) * 100);
    const providerAmount = paidPayment.attributes.amount;
    if (checkout.payment_status === 'verified') {
      await dbConnection.execute(
        `UPDATE tbl_webhook_event_log
         SET payment_id = ?, processing_status = 'processed',
             processed_at = CURRENT_TIMESTAMP(3)
         WHERE ID = ?`,
        [checkout.payment_id, eventLog.ID],
      );
      await dbConnection.commit();
      transactionStarted = false;
      return NextResponse.json({ ok: true, duplicate: true });
    }

    const validAmount =
      paidPayment.attributes.currency.toUpperCase() === 'PHP' &&
      providerAmount === checkoutAmount &&
      checkoutAmount === paidAmount;
    if (!validAmount) {
      await dbConnection.execute(
        `UPDATE tbl_checkout_session
         SET provider_session_id = COALESCE(provider_session_id, ?), status = 'completed'
         WHERE ID = ?`,
        [checkoutSession.id, checkout.checkout_id],
      );
      await dbConnection.execute(
        `UPDATE tbl_payments
         SET status = 'flagged', provider = 'paymongo', provider_payment_id = ?,
             paid_at = CURRENT_TIMESTAMP(3)
         WHERE ID = ? AND status IN ('pending', 'failed', 'flagged')`,
        [paidPayment.id, checkout.payment_id],
      );
      await dbConnection.execute(
        `UPDATE tbl_webhook_event_log
         SET payment_id = ?, processing_status = 'processed',
             processing_error = 'Payment amount or currency mismatch',
             processed_at = CURRENT_TIMESTAMP(3)
         WHERE ID = ?`,
        [checkout.payment_id, eventLog.ID],
      );
      await dbConnection.commit();
      transactionStarted = false;
      publishRealtimeEvent({
        topic: 'payments',
        orderId: checkout.order_number,
        targetUserIds: checkout.user_id ? [checkout.user_id] : [],
        targetRoles: ['lead_admin', 'front_desk_cashier', 'print_operator', 'pre_press_artist'],
        notification: {
          category: 'Payment',
          text: `PayMongo received a payment requiring review for request ${checkout.order_number}.`,
        },
      });
      return NextResponse.json({ ok: true, status: 'flagged' });
    }

    const verifiedRows = await queryRows<{ paid: string | number } & RowDataPacket>(
      dbConnection,
      `SELECT COALESCE(SUM(amount), 0) AS paid FROM tbl_payments
       WHERE print_order_id = ? AND status = 'verified'`,
      [checkout.print_order_id],
    );
    const dueCentavos =
      Math.round(Number(checkout.total_amount) * 100) -
      Math.round(Number(verifiedRows[0]?.paid ?? 0) * 100);
    const paymentStatus = paidAmount <= dueCentavos ? 'verified' : 'flagged';
    const fullyPaid =
      paymentStatus === 'verified' &&
      Math.round(Number(verifiedRows[0]?.paid ?? 0) * 100) + paidAmount >=
        Math.round(Number(checkout.total_amount) * 100);

    await dbConnection.execute(
      `UPDATE tbl_checkout_session
       SET provider_session_id = COALESCE(provider_session_id, ?), status = 'completed'
       WHERE ID = ?`,
      [checkoutSession.id, checkout.checkout_id],
    );
    await dbConnection.execute(
      `UPDATE tbl_payments
       SET status = ?, provider = 'paymongo', provider_payment_id = ?,
           paid_at = CURRENT_TIMESTAMP(3)
       WHERE ID = ? AND status IN ('pending', 'failed', 'flagged')`,
      [paymentStatus, paidPayment.id, checkout.payment_id],
    );
    await dbConnection.execute(
      `UPDATE tbl_webhook_event_log
       SET payment_id = ?, processing_status = 'processed', processing_error = NULL,
           processed_at = CURRENT_TIMESTAMP(3)
       WHERE ID = ?`,
      [checkout.payment_id, eventLog.ID],
    );
    await dbConnection.commit();
    transactionStarted = false;

    publishRealtimeEvent({
      topic: 'payments',
      orderId: checkout.order_number,
      targetUserIds: checkout.user_id ? [checkout.user_id] : [],
      targetRoles: ['lead_admin', 'front_desk_cashier', 'print_operator', 'pre_press_artist'],
      notification: {
        category: 'Payment',
        text:
          paymentStatus === 'verified' && fullyPaid
            ? `Request ${checkout.order_number} is fully paid and ready for staff confirmation.`
            : paymentStatus === 'verified'
              ? `PayMongo confirmed a GCash payment for request ${checkout.order_number}; the remaining balance is still due.`
            : `PayMongo received an amount requiring review for request ${checkout.order_number}.`,
      },
    });
    return NextResponse.json({ ok: true, status: paymentStatus });
  } catch (error) {
    if (connection && transactionStarted) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error('Unable to roll back PayMongo webhook transaction:', rollbackError);
      }
    }
    return apiErrorResponse(error);
  } finally {
    connection?.release();
  }
}
