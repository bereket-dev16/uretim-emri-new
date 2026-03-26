import type { DashboardSummary } from '@/shared/types/domain';
import { queryDb } from '@/shared/db/client';

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const result = await queryDb<{
    orders_created_today: number;
    completed_orders: number;
    active_orders: number;
  }>(
    `
      SELECT
        (
          SELECT COUNT(*)::int
          FROM production_orders
          WHERE created_at >= DATE_TRUNC('day', NOW())
        ) AS orders_created_today,
        (
          SELECT COUNT(*)::int
          FROM production_orders
          WHERE status = 'completed'
        ) AS completed_orders,
        (
          SELECT COUNT(*)::int
          FROM production_orders
          WHERE status = 'active'
        ) AS active_orders
    `
  );

  const row = result.rows[0];

  return {
    ordersCreatedToday: row?.orders_created_today ?? 0,
    completedOrders: row?.completed_orders ?? 0,
    activeOrders: row?.active_orders ?? 0
  };
}
