import { NextResponse, type NextRequest } from 'next/server';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export function apiErrorResponse(error: unknown): NextResponse {
  if (error instanceof ApiError) {
    return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
  }

  console.error('Unhandled API error:', error);
  return NextResponse.json(
    { ok: false, error: 'An unexpected server error occurred.' },
    { status: 500 },
  );
}

export async function readJson(request: Request): Promise<Record<string, unknown>> {
  const contentLength = Number(request.headers.get('content-length') || 0);
  if (contentLength > 64 * 1024) throw new ApiError(413, 'Request body is too large.');

  let value: unknown;
  try {
    value = await request.json();
  } catch {
    throw new ApiError(400, 'Request body must be valid JSON.');
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new ApiError(400, 'Request body must be a JSON object.');
  }
  return value as Record<string, unknown>;
}

export function assertSameOrigin(request: NextRequest): void {
  const origin = request.headers.get('origin');
  if (!origin) return;

  try {
    const parsedOrigin = new URL(origin);
    if (!['http:', 'https:'].includes(parsedOrigin.protocol)) {
      throw new ApiError(403, 'Invalid request origin.');
    }

    const forwardedHost = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim();
    const host = forwardedHost || request.headers.get('host') || request.nextUrl.host;
    const forwardedProtocol = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim();
    const protocol = forwardedProtocol
      ? `${forwardedProtocol.replace(/:$/, '')}:`
      : request.nextUrl.protocol;
    const requestOrigin = new URL(`${protocol}//${host}`).origin;

    if (parsedOrigin.origin !== requestOrigin) {
      throw new ApiError(403, 'Cross-origin request denied.');
    }
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(403, 'Invalid request origin.');
  }
}

export function requiredString(
  value: unknown,
  label: string,
  maxLength: number,
  minLength = 1,
): string {
  if (typeof value !== 'string') throw new ApiError(400, `${label} is required.`);
  const normalized = value.trim();
  if (normalized.length < minLength || normalized.length > maxLength) {
    throw new ApiError(400, `${label} must be between ${minLength} and ${maxLength} characters.`);
  }
  return normalized;
}
