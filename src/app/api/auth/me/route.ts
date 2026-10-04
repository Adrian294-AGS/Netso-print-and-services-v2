import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { displayUser, getSession, requireSession } from '@/lib/server/auth';
import { apiErrorResponse } from '@/lib/server/http';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const user = await getSession(request);
    if (!user) return NextResponse.json({ ok: true, user: null });
    const current = await requireSession(request);
    return NextResponse.json({ ok: true, user: displayUser(current) });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
