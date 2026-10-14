import { randomUUID } from 'node:crypto';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireSession } from '@/lib/server/auth';
import { apiErrorResponse, ApiError, assertSameOrigin, readJson } from '@/lib/server/http';
import { mysqlPool, queryRows } from '@/lib/server/mysql';
import { enforceRateLimit } from '@/lib/server/rate-limit';

export const runtime = 'nodejs';

const MAX_FILE_BYTES = 100 * 1024 * 1024;
const contentTypes: Record<string, string> = {
  pdf: 'application/pdf',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  ai: 'application/postscript',
  psd: 'image/vnd.adobe.photoshop',
};

const schema = z.object({
  orderId: z.string().trim().min(1).max(32),
  fileName: z.string().trim().min(1).max(255),
  contentType: z.string().trim().min(1).max(127),
  size: z.number().int().positive().max(MAX_FILE_BYTES),
});

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const user = await requireSession(request);
    await enforceRateLimit(request, `upload-sign:${user.id}`, 30, 60_000);
    const parsed = schema.safeParse(await readJson(request));
    if (!parsed.success) throw new ApiError(400, 'File details are invalid or the file exceeds 100 MB.');
    const { orderId, fileName, contentType, size } = parsed.data;
    const extension = fileName.split('.').pop()?.toLowerCase() ?? '';
    if (!contentTypes[extension] || contentTypes[extension] !== contentType.toLowerCase()) {
      throw new ApiError(400, 'Only PDF, PNG, JPG, AI, and PSD files are accepted.');
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
    const counts = await queryRows<{ count: number } & import('mysql2/promise').RowDataPacket>(
      mysqlPool,
      'SELECT COUNT(*) AS count FROM tbl_print_order_file WHERE print_order_id = ?',
      [order.ID],
    );
    if (Number(counts[0]?.count ?? 0) >= 10) throw new ApiError(400, 'An order can have at most 10 files.');

    const key = `orders/${order.order_number}/${randomUUID()}.${extension}`;
    const uploadUrl = `/api/uploads/object?orderId=${encodeURIComponent(order.order_number)}&key=${encodeURIComponent(key)}`;
    return NextResponse.json({
      ok: true,
      uploadUrl,
      key,
      requiredHeaders: {
        'Content-Type': contentType,
      },
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
