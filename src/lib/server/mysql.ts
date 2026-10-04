import 'server-only';

import mysql, { type Pool, type PoolConnection, type RowDataPacket } from 'mysql2/promise';
import type { ExecuteValues } from 'mysql2';
import { serverEnv } from './env';

const globalForMysql = globalThis as typeof globalThis & {
  mysqlPool?: Pool;
};

export const mysqlPool =
  globalForMysql.mysqlPool ??
  mysql.createPool({
    host: serverEnv.mysql.host,
    port: serverEnv.mysql.port,
    database: serverEnv.mysql.database,
    user: serverEnv.mysql.user,
    password: serverEnv.mysql.password,
    waitForConnections: true,
    connectionLimit: serverEnv.mysql.connectionLimit,
    queueLimit: 0,
    connectTimeout: serverEnv.mysql.connectTimeout,
    enableKeepAlive: true,
    timezone: 'Z',
    supportBigNumbers: true,
    bigNumberStrings: true,
    ssl: serverEnv.mysql.ssl ? { rejectUnauthorized: true } : undefined,
  });

if (process.env.NODE_ENV !== 'production') {
  globalForMysql.mysqlPool = mysqlPool;
}

export async function checkMysqlConnection(): Promise<void> {
  const connection = await mysqlPool.getConnection();
  try {
    await connection.ping();
  } finally {
    connection.release();
  }
}

export async function queryRows<T extends RowDataPacket>(
  executor: Pool | PoolConnection,
  sql: string,
  values: ExecuteValues[] = [],
): Promise<T[]> {
  const [rows] = await executor.execute<T[]>(sql, values);
  return rows;
}
