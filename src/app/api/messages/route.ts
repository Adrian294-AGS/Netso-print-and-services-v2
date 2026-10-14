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
  orderId: z.string().trim().min(1).max(32).optional(),
  threadId: z.string().regex(/^[a-f\d]{24}$/i).optional(),
  customerId: z.string().trim().min(1).max(64).optional(),
  text: z.string().trim().min(1).max(5000),
}).refine((message) => Boolean(message.orderId || message.threadId || message.customerId), {
  message: 'A conversation is required.',
});

const GENERAL_THREAD_PREFIX = 'general:';

function generalThreadKey(userId: string): string {
  return `${GENERAL_THREAD_PREFIX}${userId}`;
}

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

    if (!isStaffRole(user.role)) {
      const thread = await MessageThreadModel.findOne({
        orderNumber: generalThreadKey(user.id),
        customerId: user.id,
      }).lean();
      return NextResponse.json({ ok: true, thread: thread ? serializeThread(thread) : null });
    }
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
    const { orderId, threadId, customerId, text } = parsed.data;
    const staff = isStaffRole(user.role);
    await connectMongoDB();
    let thread;
    let order: Awaited<ReturnType<typeof verifyOrderAccess>> | undefined;

    if (staff && threadId) {
      const existingThread = await MessageThreadModel.findById(threadId).lean();
      if (!existingThread) throw new ApiError(404, 'Conversation not found.');
      order = existingThread.orderNumber.startsWith(GENERAL_THREAD_PREFIX)
        ? undefined
        : await verifyOrderAccess(existingThread.orderNumber, user.id, true);
      thread = await MessageThreadModel.findOneAndUpdate(
        { _id: existingThread._id },
        {
          $set: { status: 'Replied' },
          $push: { messages: { senderId: user.id, senderName: user.name, senderRole: user.role, text } },
        },
        { returnDocument: 'after', runValidators: true },
      ).lean();
    } else if (staff && customerId) {
      const customers = await queryRows<
        { UID: string; name: string; username: string | null } & import('mysql2/promise').RowDataPacket
      >(
        mysqlPool,
        `SELECT UID, CONCAT_WS(' ', first_name, middle_name, last_name) AS name, username
         FROM tbl_user
         WHERE UID = ? AND role = 'customer' AND account_status = 'active'
         LIMIT 1`,
        [customerId],
      );
      const customer = customers[0];
      if (!customer) throw new ApiError(404, 'Customer not found.');
      const key = generalThreadKey(customer.UID);
      thread = await MessageThreadModel.findOneAndUpdate(
        { orderNumber: key, customerId: customer.UID },
        {
          $setOnInsert: {
            orderNumber: key,
            customerId: customer.UID,
            customerName: customer.name || 'Customer',
            customerUsername: customer.username ?? '',
          },
          $set: { status: 'Replied' },
          $push: { messages: { senderId: user.id, senderName: user.name, senderRole: user.role, text } },
        },
        { upsert: true, returnDocument: 'after', runValidators: true, setDefaultsOnInsert: true },
      ).lean();
    } else if (orderId) {
      order = await verifyOrderAccess(orderId, user.id, staff);
      thread = await MessageThreadModel.findOneAndUpdate(
        { orderNumber: orderId },
        {
          $setOnInsert: {
            orderNumber: orderId,
            customerId: order.user_id ?? user.id,
            customerName: order.customer_name,
            customerUsername: order.username ?? '',
          },
          $set: { status: staff ? 'Replied' : 'UNREAD' },
          $push: { messages: { senderId: user.id, senderName: user.name, senderRole: user.role, text } },
        },
        { upsert: true, returnDocument: 'after', runValidators: true, setDefaultsOnInsert: true },
      ).lean();
    } else {
      if (staff) throw new ApiError(400, 'Select a conversation to reply to.');
      const key = generalThreadKey(user.id);
      thread = await MessageThreadModel.findOneAndUpdate(
        { orderNumber: key, customerId: user.id },
        {
          $setOnInsert: {
            orderNumber: key,
            customerId: user.id,
            customerName: user.name,
            customerUsername: user.username ?? '',
          },
          $set: { status: 'UNREAD' },
          $push: { messages: { senderId: user.id, senderName: user.name, senderRole: user.role, text } },
        },
        { upsert: true, returnDocument: 'after', runValidators: true, setDefaultsOnInsert: true },
      ).lean();
    }
    if (!thread) throw new Error('Conversation could not be saved.');
    const isGeneral = thread.orderNumber.startsWith(GENERAL_THREAD_PREFIX);
    const conversationTarget = isGeneral ? 'General inquiry' : thread.orderNumber;
    await recordAuditEvent(request, user, {
      category: 'Staff Chat',
      action: staff ? 'Sent message to customer' : 'Sent message to staff',
      targetId: conversationTarget,
    });
    publishRealtimeEvent({
      topic: 'messages',
      ...(isGeneral ? {} : { orderId: thread.orderNumber }),
      ...(staff
        ? { targetUserIds: [thread.customerId] }
        : { targetRoles: ['lead_admin', 'print_operator', 'pre_press_artist', 'front_desk_cashier'] }),
      notification: {
        category: 'Message',
        text: staff
          ? isGeneral
            ? `NETSO staff sent a message to ${thread.customerName ?? 'a customer'}.`
            : `A staff member replied to request ${thread.orderNumber}.`
          : isGeneral
            ? `A customer sent a general message to staff.`
            : `A customer sent a message about request ${thread.orderNumber}.`,
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
  customerName?: string;
  customerUsername?: string;
  status: string;
  updatedAt: Date;
  messages: Array<{ _id: unknown; senderId: string; senderName: string; senderRole: string; text: string; createdAt: Date }>;
  },
  order?: { customer_name: string; username?: string | null; service_name_snapshot: string },
) {
  const isGeneral = thread.orderNumber.startsWith(GENERAL_THREAD_PREFIX);
  return {
    id: String(thread._id),
    requestId: isGeneral ? 'General Inquiry' : thread.orderNumber,
    conversationType: isGeneral ? 'general' : 'order',
    customerId: thread.customerId,
    customerName: order?.customer_name ?? thread.customerName ?? 'Customer',
    customerUsername: order?.username ?? thread.customerUsername ?? '',
    serviceName: isGeneral ? 'General Inquiry' : order?.service_name_snapshot ?? '',
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
