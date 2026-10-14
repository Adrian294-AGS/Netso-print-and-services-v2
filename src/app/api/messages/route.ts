import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { isStaffRole, requireSession } from '@/lib/server/auth';
import { apiErrorResponse, ApiError, assertSameOrigin, readJson } from '@/lib/server/http';
import { MessageThreadModel } from '@/lib/server/mongo-models';
import { connectMongoDB } from '@/lib/server/mongodb';
import { mysqlPool, queryRows } from '@/lib/server/mysql';
import { enforceRateLimit } from '@/lib/server/rate-limit';
import { publishRealtimeEvent } from '@/lib/server/realtime';
import { recordAuditEvent } from '@/lib/server/audit';

export const runtime = 'nodejs';

const messageSchema = z.object({
  orderId: z.string().trim().min(1).max(32),
  text: z.string().trim().min(1).max(5000),
});

async function verifyOrderAccess(orderNumber: string, userId: string, staff: boolean) {
  const rows = await queryRows<
    { customer_name: string; username: string | null; user_id: string | null; service_name_snapshot: string } & import('mysql2/promise').RowDataPacket
  >(
    mysqlPool,
    `SELECT o.customer_name, u.username, o.user_id, o.service_name_snapshot
     FROM tbl_print_order o LEFT JOIN tbl_user u ON u.UID = o.user_id
     WHERE o.order_number = ? LIMIT 1`,
    [orderNumber],
  );
  const order = rows[0];
  if (!order || (!staff && order.user_id !== userId)) throw new ApiError(404, 'Order not found.');
  return order;
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireSession(request);
    const orderId = request.nextUrl.searchParams.get('orderId')?.trim();
    await connectMongoDB();
    if (orderId) {
      await verifyOrderAccess(orderId, user.id, isStaffRole(user.role));
      const thread = await MessageThreadModel.findOne({ orderNumber: orderId }).lean();
      const order = await verifyOrderAccess(orderId, user.id, isStaffRole(user.role));
      return NextResponse.json({ ok: true, thread: thread ? serializeThread(thread, order) : null });
    }

    if (!isStaffRole(user.role)) throw new ApiError(400, 'orderId is required.');
    const threads = await MessageThreadModel.find().sort({ updatedAt: -1 }).limit(200).lean();
    const numbers = threads.map((thread) => thread.orderNumber);
    const orders = numbers.length
      ? await queryRows<
          { order_number: string; customer_name: string; username: string | null; service_name_snapshot: string } & import('mysql2/promise').RowDataPacket
        >(
          mysqlPool,
          `SELECT o.order_number, o.customer_name, u.username, o.service_name_snapshot
           FROM tbl_print_order o LEFT JOIN tbl_user u ON u.UID = o.user_id
           WHERE o.order_number IN (${numbers.map(() => '?').join(',')})`,
          numbers,
        )
      : [];
    const orderByNumber = new Map(orders.map((order) => [order.order_number, order]));
    return NextResponse.json({
      ok: true,
      threads: threads.map((thread) => serializeThread(thread, orderByNumber.get(thread.orderNumber))),
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const user = await requireSession(request);
    await enforceRateLimit(request, `message:${user.id}`, 60, 60_000);
    const parsed = messageSchema.safeParse(await readJson(request));
    if (!parsed.success) throw new ApiError(400, 'Message details are invalid.');
    const { orderId, text } = parsed.data;
    const order = await verifyOrderAccess(orderId, user.id, isStaffRole(user.role));
    await connectMongoDB();
    const thread = await MessageThreadModel.findOneAndUpdate(
      { orderNumber: orderId },
      {
        $setOnInsert: { orderNumber: orderId, customerId: order.user_id ?? user.id },
        $set: { status: isStaffRole(user.role) ? 'Replied' : 'UNREAD' },
        $push: { messages: { senderId: user.id, senderName: user.name, senderRole: user.role, text } },
      },
      { upsert: true, returnDocument: 'after', runValidators: true, setDefaultsOnInsert: true },
    ).lean();
    await recordAuditEvent(request, user, {
      category: 'Staff Chat',
      action: isStaffRole(user.role) ? 'Replied to order conversation' : 'Sent message to staff',
      targetId: orderId,
    });
    publishRealtimeEvent({
      topic: 'messages',
      orderId,
      ...(isStaffRole(user.role)
        ? { targetUserIds: order.user_id ? [order.user_id] : [] }
        : { targetRoles: ['lead_admin', 'print_operator', 'pre_press_artist', 'front_desk_cashier'] }),
      notification: {
        category: 'Message',
        text: isStaffRole(user.role)
          ? `A staff member replied to request ${orderId}.`
          : `A customer sent a message about request ${orderId}.`,
      },
    });
    return NextResponse.json({ ok: true, thread: serializeThread(thread, order) }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

function serializeThread(
  thread: {
  _id: unknown;
  orderNumber: string;
  customerId: string;
  status: string;
  updatedAt: Date;
  messages: Array<{ _id: unknown; senderId: string; senderName: string; senderRole: string; text: string; createdAt: Date }>;
  },
  order?: { customer_name: string; username?: string | null; service_name_snapshot: string },
) {
  return {
    id: String(thread._id),
    requestId: thread.orderNumber,
    customerId: thread.customerId,
    customerName: order?.customer_name ?? 'Customer',
    customerUsername: order?.username ?? '',
    serviceName: order?.service_name_snapshot ?? '',
    status: thread.status,
    lastUpdated: new Date(thread.updatedAt).toISOString(),
    messages: thread.messages.map((message) => ({
      id: String(message._id),
      senderId: message.senderId,
      sender: message.senderName,
      isStaff: message.senderRole !== 'customer',
      text: message.text,
      time: new Date(message.createdAt).toISOString(),
    })),
  };
}
