import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { assertSameOrigin, apiErrorResponse } from '@/lib/server/http';
import { clearSessionCookie, getSession } from '@/lib/server/auth';
import { recordAuditEvent } from '@/lib/server/audit';

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const user = await getSession(request);
    if (user) {
      await recordAuditEvent(request, user, {
        category: 'Authentication',
        action: 'Signed out',
      });
    }
    const response = NextResponse.json({ ok: true });
    clearSessionCookie(response);
    return response;
  } catch (error) {
    return apiErrorResponse(error);
  }
}
