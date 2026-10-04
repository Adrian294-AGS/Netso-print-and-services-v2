import 'server-only';

import { S3Client } from '@aws-sdk/client-s3';
import { getB2Env } from './env';

let cached: { client: S3Client; bucket: string } | null = null;

export function getB2() {
  if (cached) return cached;
  const config = getB2Env();
  cached = {
    bucket: config.bucket,
    client: new S3Client({
      region: config.region,
      endpoint: `https://s3.${config.region}.backblazeb2.com`,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      forcePathStyle: true,
      maxAttempts: 3,
    }),
  };
  return cached;
}
