import { HeadObjectCommand } from '@aws-sdk/client-s3';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireSession } from '@/lib/server/auth';
import { apiErrorResponse, ApiError, assertSameOrigin, readJson } from '@/lib/server/http';
import { getB2 } from '@/lib/server/b2';
import { mysqlPool, queryRows } from '@/lib/server/mysql';
import { publishRealtimeEvent } from '@/lib/server/realtime';

export const runtime = 'nodejs';

const schema = z.object({
  orderId: z.string().trim().min(1).max(32),
  key: z.string().trim().min(1).max(512),
});

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const user = await requireSession(request);
    const parsed = schema.safeParse(await readJson(request));
    if (!parsed.success) throw new ApiError(400, 'Upload confirmation is invalid.');
    const { orderId, key } = parsed.data;
    if (!key.startsWith(`orders/${orderId}/`)) throw new ApiError(400, 'File key does not match this order.');

    const orders = await queryRows<{ ID: number; user_id: string | null } & import('mysql2/promise').RowDataPacket>(
      mysqlPool,
      'SELECT ID, user_id FROM tbl_print_order WHERE order_number = ? LIMIT 1',
      [orderId],
    );
    const order = orders[0];
    if (!order || (user.role === 'customer' && order.user_id !== user.id)) {
      throw new ApiError(404, 'Order not found.');
    }

    const counts = await queryRows<{ count: number } & import('mysql2/promise').RowDataPacket>(
      mysqlPool,
      'SELECT COUNT(*) AS count FROM tbl_print_order_file WHERE print_order_id = ?',
      [order.ID],
    );
    if (Number(counts[0]?.count ?? 0) >= 10) throw new ApiError(400, 'An order can have at most 10 files.');
    const { bucket, client } = getB2();
    const object = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    if (object.Metadata?.['order-number'] !== orderId) {
      throw new ApiError(403, 'Uploaded file metadata does not match this order.');
    }
    if (!object.ContentLength || object.ContentLength > 100 * 1024 * 1024) {
      throw new ApiError(400, 'Uploaded file size is invalid.');
    }
    const fileName = key.split('/').pop() ?? 'upload';
    const extension = fileName.split('.').pop()?.toLowerCase() ?? '';
    const [result] = await mysqlPool.execute(
      `INSERT INTO tbl_print_order_file
        (print_order_id, original_file_name, file_extension, mime_type, file_size_bytes, storage_key)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [order.ID, request.headers.get('x-file-name')?.slice(0, 255) || fileName, extension, object.ContentType ?? null, object.ContentLength, key],
    );
    publishRealtimeEvent({
      topic: 'orders',
      orderId,
      targetUserIds: order.user_id ? [order.user_id] : [],
      targetRoles: ['lead_admin', 'print_operator', 'pre_press_artist', 'front_desk_cashier'],
    });
    return NextResponse.json(
      {
        ok: true,
        file: {
          id: String((result as { insertId: number }).insertId),
          name: request.headers.get('x-file-name')?.slice(0, 255) || fileName,
          size: object.ContentLength,
          ext: extension,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    return apiErrorResponse(error);
  }
}
