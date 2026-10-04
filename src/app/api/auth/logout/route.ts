import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { assertSameOrigin, apiErrorResponse } from '@/lib/server/http';
import { clearSessionCookie } from '@/lib/server/auth';

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const response = NextResponse.json({ ok: true });
    clearSessionCookie(response);
    return response;
  } catch (error) {
    return apiErrorResponse(error);
  }
}
