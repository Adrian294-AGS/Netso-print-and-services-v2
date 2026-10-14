import 'server-only';

import { createHash } from 'node:crypto';
import { getJwtSecret } from './env';
import { AuthLimitModel } from './mongo-models';
import { connectMongoDB } from './mongodb';
import { ApiError } from './http';

export async function enforceRateLimit(
  request: Request,
  scope: string,
  maxAttempts: number,
  windowMs = 15 * 60 * 1000,
): Promise<void> {
  await connectMongoDB();

  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const address = request.headers.get('x-real-ip')?.trim() || forwarded || 'unknown';
  const now = Date.now();
  const windowStart = Math.floor(now / windowMs) * windowMs;
  const key = createHash('sha256')
    .update(`${getJwtSecret()}:${scope}:${address}:${windowStart}`)
    .digest('hex');
  const document = await AuthLimitModel.findOneAndUpdate(
    { _id: key },
    {
      $inc: { count: 1 },
      $setOnInsert: { expiresAt: new Date(windowStart + windowMs * 2) },
    },
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true },
  ).lean();

  if ((document?.count ?? maxAttempts + 1) > maxAttempts) {
    throw new ApiError(429, 'Too many requests. Please wait and try again.');
  }
}
