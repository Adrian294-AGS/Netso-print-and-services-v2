import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { isStaffRole, requireSession } from '@/lib/server/auth';
import { apiErrorResponse, ApiError } from '@/lib/server/http';
import { getB2 } from '@/lib/server/b2';
import { mysqlPool, queryRows } from '@/lib/server/mysql';

export const runtime = 'nodejs';

function encodeRfc5987(value: string): string {
  return encodeURIComponent(value).replace(
    /['()*!]/g,
    (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> },
) {
  try {
    const user = await requireSession(request);
    const { fileId } = await params;
    if (!/^\d+$/.test(fileId)) throw new ApiError(400, 'File ID is invalid.');
    const rows = await queryRows<
      {
        storage_key: string;
        original_file_name: string;
        mime_type: string | null;
        file_extension: string | null;
        user_id: string | null;
      } & import('mysql2/promise').RowDataPacket
    >(
      mysqlPool,
      `SELECT f.storage_key, f.original_file_name, f.mime_type, f.file_extension, o.user_id
       FROM tbl_print_order_file f
       JOIN tbl_print_order o ON o.ID = f.print_order_id
       WHERE f.ID = ? LIMIT 1`,
      [fileId],
    );
    const file = rows[0];
    if (!file || (!isStaffRole(user.role) && file.user_id !== user.id)) {
      throw new ApiError(404, 'File not found.');
    }
    const { bucket, client } = getB2();
    const fallbackMimeTypes: Record<string, string> = {
      pdf: 'application/pdf',
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
    };
    const mimeType =
      file.mime_type?.toLowerCase() ??
      fallbackMimeTypes[file.file_extension?.toLowerCase() ?? ''] ??
      'application/octet-stream';
    const canViewInline =
      mimeType === 'application/pdf' || mimeType === 'image/png' || mimeType === 'image/jpeg';
    const viewInline = request.nextUrl.searchParams.get('view') === '1' && canViewInline;
    const url = await getSignedUrl(
      client,
      new GetObjectCommand({
        Bucket: bucket,
        Key: file.storage_key,
        ResponseContentDisposition: `${viewInline ? 'inline' : 'attachment'}; filename*=UTF-8''${encodeRfc5987(file.original_file_name)}`,
        ResponseContentType: mimeType,
      }),
      { expiresIn: 120 },
    );
    return NextResponse.redirect(url, { status: 302, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
