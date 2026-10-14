import { PutObjectCommand } from '@aws-sdk/client-s3';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireSession } from '@/lib/server/auth';
import { apiErrorResponse, ApiError, assertSameOrigin } from '@/lib/server/http';
import { getB2 } from '@/lib/server/b2';
import { mysqlPool, queryRows } from '@/lib/server/mysql';
import { enforceRateLimit } from '@/lib/server/rate-limit';

export const runtime = 'nodejs';

const MAX_FILE_BYTES = 100 * 1024 * 1024;

const querySchema = z.object({
  orderId: z.string().trim().min(1).max(32),
  key: z.string().trim().min(1).max(512),
});

export async function PUT(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const user = await requireSession(request);
    await enforceRateLimit(request, `upload-put:${user.id}`, 60, 60_000);

    const parsed = querySchema.safeParse({
      orderId: request.nextUrl.searchParams.get('orderId'),
      key: request.nextUrl.searchParams.get('key'),
    });
    if (!parsed.success) throw new ApiError(400, 'Upload details are invalid.');
    const { orderId, key } = parsed.data;
    if (!key.startsWith(`orders/${orderId}/`) || key.split('/').some((segment) => segment === '..')) {
      throw new ApiError(400, 'Upload key is invalid.');
    }

    const orders = await queryRows<{ ID: number; order_number: string; user_id: string | null } & import('mysql2/promise').RowDataPacket>(
      mysqlPool,
      'SELECT ID, order_number, user_id FROM tbl_print_order WHERE order_number = ? LIMIT 1',
      [orderId],
    );
    const order = orders[0];
    if (!order || (user.role === 'customer' && order.user_id !== user.id)) {
      throw new ApiError(404, 'Order not found.');
    }

    const declaredLength = Number(request.headers.get('content-length') || 0);
    if (declaredLength > MAX_FILE_BYTES) throw new ApiError(400, 'File exceeds 100 MB.');
    const body = Buffer.from(await request.arrayBuffer());
    if (body.byteLength === 0) throw new ApiError(400, 'File is empty.');
    if (body.byteLength > MAX_FILE_BYTES) throw new ApiError(400, 'File exceeds 100 MB.');

    const { bucket, client } = getB2();
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: body,
        ContentType: request.headers.get('content-type') ?? 'application/octet-stream',
        ContentLength: body.byteLength,
        Metadata: { 'order-number': order.order_number },
      }),
    );

    return NextResponse.json({ ok: true, key }, { status: 200 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
