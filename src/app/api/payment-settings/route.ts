import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireSession } from '@/lib/server/auth';
import { apiErrorResponse, ApiError, assertSameOrigin, readJson } from '@/lib/server/http';
import { mysqlPool } from '@/lib/server/mysql';
import { isGCashPaymentEnabled } from '@/lib/server/payment-settings';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const gcashEnabled = await isGCashPaymentEnabled();
    return NextResponse.json({ ok: true, gcashEnabled });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    assertSameOrigin(request);
    await requireSession(request, ['lead_admin']);
    const parsed = z.object({ gcashEnabled: z.boolean() }).safeParse(await readJson(request));
    if (!parsed.success) throw new ApiError(400, 'Payment settings are invalid.');

    await mysqlPool.execute(
      `INSERT INTO tbl_app_setting (setting_key, setting_value)
       VALUES ('gcash_enabled', ?)
       ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
      [parsed.data.gcashEnabled ? '1' : '0'],
    );
    return NextResponse.json({ ok: true, gcashEnabled: parsed.data.gcashEnabled });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
