import 'server-only';

import mongoose from 'mongoose';
import { serverEnv } from './env';

type MongooseCache = {
  connection: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

const globalForMongoose = globalThis as typeof globalThis & {
  mongooseCache?: MongooseCache;
};

const cache =
  globalForMongoose.mongooseCache ??
  (globalForMongoose.mongooseCache = {
    connection: null,
    promise: null,
  });

let indexesPromise: Promise<void> | null = null;

async function ensureMongoIndexes(): Promise<void> {
  if (!indexesPromise) {
    indexesPromise = Promise.all([
      mongoose.connection.collection('message_threads').createIndex(
        { orderNumber: 1 },
        { unique: true, name: 'orderNumber_1' },
      ),
      mongoose.connection.collection('message_threads').createIndex(
        { customerId: 1, updatedAt: -1 },
        { name: 'customerId_1_updatedAt_-1' },
      ),
      mongoose.connection.collection('audit_logs').createIndex(
        { createdAt: -1 },
        { name: 'createdAt_-1' },
      ),
      mongoose.connection.collection('audit_logs').createIndex(
        { category: 1, createdAt: -1 },
        { name: 'category_1_createdAt_-1' },
      ),
      mongoose.connection.collection('auth_rate_limits').createIndex(
        { expiresAt: 1 },
        { expireAfterSeconds: 0, name: 'auth_rate_limit_expiry' },
      ),
    ]).then(() => undefined).catch((error: unknown) => {
      indexesPromise = null;
      throw error;
    });
  }
  await indexesPromise;
}

export async function connectMongoDB(): Promise<typeof mongoose> {
  if (cache.connection) return cache.connection;

  if (!cache.promise) {
    cache.promise = mongoose
      .connect(serverEnv.mongodb.uri, {
        bufferCommands: false,
        autoIndex: process.env.NODE_ENV !== 'production',
        maxPoolSize: serverEnv.mongodb.maxPoolSize,
        serverSelectionTimeoutMS: serverEnv.mongodb.serverSelectionTimeoutMS,
        socketTimeoutMS: serverEnv.mongodb.socketTimeoutMS,
        tls: serverEnv.mongodb.tls,
        tlsAllowInvalidCertificates: false,
      })
      .then(async (connection) => {
        await ensureMongoIndexes();
        return connection;
      })
      .catch((error: unknown) => {
        cache.promise = null;
        cache.connection = null;
        throw error;
      });
  }

  cache.connection = await cache.promise;
  return cache.connection;
}
