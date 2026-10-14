import 'server-only';

import type { Pool, PoolConnection, RowDataPacket } from 'mysql2/promise';
import { mysqlPool, queryRows } from './mysql';

export async function isGCashPaymentEnabled(
  executor: Pool | PoolConnection = mysqlPool,
): Promise<boolean> {
  const rows = await queryRows<
    { setting_value: string } & RowDataPacket
  >(
    executor,
    `SELECT setting_value FROM tbl_app_setting
     WHERE setting_key = 'gcash_enabled' LIMIT 1`,
  );
  return rows[0]?.setting_value === '1';
}
