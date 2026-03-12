import type { DashboardSummary } from '@/shared/types/domain';
import { queryDb } from '@/shared/db/client';

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const result = await queryDb<{
    total_stock_records: number;
    stock_records_today: number;
    active_user_count: number;
  }>(
    `
      SELECT
        (
          SELECT COUNT(*)::int
          FROM stocks
        ) AS total_stock_records,
        (
          SELECT COUNT(*)::int
          FROM stocks
          WHERE created_at >= DATE_TRUNC('day', NOW())
        ) AS stock_records_today,
        (
          SELECT COUNT(*)::int
          FROM users
          WHERE is_active = TRUE
        ) AS active_user_count
    `
  );

  const row = result.rows[0];

  return {
    totalStockRecords: row?.total_stock_records ?? 0,
    stockRecordsToday: row?.stock_records_today ?? 0,
    activeUserCount: row?.active_user_count ?? 0
  };
}
