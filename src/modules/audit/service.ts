import { queryDb } from '@/shared/db/client';

interface AuditParams {
  actorUserId: string | null;
  actionType: string;
  entityType: string;
  entityId: string | null;
  payload: Record<string, unknown>;
  requestId: string;
}

export async function createAuditLog(params: AuditParams): Promise<void> {
  await queryDb(
    `
      INSERT INTO audit_logs (
        actor_user_id,
        action_type,
        entity_type,
        entity_id,
        payload_json,
        request_id
      )
      VALUES ($1, $2, $3, $4, $5::jsonb, $6)
    `,
    [
      params.actorUserId,
      params.actionType,
      params.entityType,
      params.entityId,
      JSON.stringify(params.payload),
      params.requestId
    ]
  );
}

export interface AuditStreamItem {
  id: string;
  actionType: string;
  entityType: string;
  actorUsername: string | null;
  createdAt: string;
  summary: string;
}

export interface AuditTempoSummary {
  totalToday: number;
  lastHour: number;
  topActionType: string | null;
  topActionCount: number;
  pace: 'sakin' | 'orta' | 'yogun';
}

function mapActionLabel(actionType: string): string {
  switch (actionType) {
    case 'LOGIN_SUCCESS':
      return 'Giris basarili';
    case 'LOGIN_FAILED':
      return 'Giris basarisiz';
    case 'LOGOUT':
      return 'Cikis yapildi';
    case 'STOCK_CREATED':
      return 'Stok kaydi olusturuldu';
    case 'STOCK_UPDATED':
      return 'Stok kaydi guncellendi';
    case 'STOCK_DELETED':
      return 'Stok kaydi silindi';
    case 'USER_CREATED':
      return 'Kullanici olusturuldu';
    case 'USER_UPDATED':
      return 'Kullanici guncellendi';
    case 'USER_DELETED':
      return 'Kullanici silindi';
    case 'USER_PASSWORD_RESET':
      return 'Kullanici sifresi sifirlandi';
    default:
      return actionType;
  }
}

function mapPace(totalToday: number, lastHour: number): AuditTempoSummary['pace'] {
  if (lastHour >= 20 || totalToday >= 160) {
    return 'yogun';
  }

  if (lastHour >= 8 || totalToday >= 70) {
    return 'orta';
  }

  return 'sakin';
}

export async function listRecentAuditStream(limit: number): Promise<AuditStreamItem[]> {
  const safeLimit = Math.min(Math.max(limit, 1), 30);

  const result = await queryDb<{
    id: string;
    action_type: string;
    entity_type: string;
    actor_username: string | null;
    created_at: Date | string;
  }>(
    `
      SELECT
        a.id,
        a.action_type,
        a.entity_type,
        u.username AS actor_username,
        a.created_at
      FROM audit_logs a
      LEFT JOIN users u ON u.id = a.actor_user_id
      ORDER BY a.created_at DESC
      LIMIT $1::int
    `,
    [safeLimit]
  );

  return result.rows.map((row) => ({
    id: row.id,
    actionType: row.action_type,
    entityType: row.entity_type,
    actorUsername: row.actor_username,
    createdAt: new Date(row.created_at).toISOString(),
    summary: mapActionLabel(row.action_type)
  }));
}

export async function getAuditTempoSummary(): Promise<AuditTempoSummary> {
  const result = await queryDb<{
    total_today: number;
    last_hour: number;
    top_action_type: string | null;
    top_action_count: number;
  }>(
    `
      WITH today_logs AS (
        SELECT action_type, created_at
        FROM audit_logs
        WHERE created_at >= DATE_TRUNC('day', NOW())
      ),
      top_action AS (
        SELECT action_type, COUNT(*)::int AS count
        FROM today_logs
        GROUP BY action_type
        ORDER BY count DESC, action_type ASC
        LIMIT 1
      )
      SELECT
        (SELECT COUNT(*)::int FROM today_logs) AS total_today,
        (
          SELECT COUNT(*)::int
          FROM today_logs
          WHERE created_at >= NOW() - INTERVAL '1 hour'
        ) AS last_hour,
        (SELECT action_type FROM top_action) AS top_action_type,
        COALESCE((SELECT count FROM top_action), 0)::int AS top_action_count
    `
  );

  const row = result.rows[0];
  const totalToday = row?.total_today ?? 0;
  const lastHour = row?.last_hour ?? 0;
  const topActionType = row?.top_action_type ?? null;
  const topActionCount = row?.top_action_count ?? 0;

  return {
    totalToday,
    lastHour,
    topActionType,
    topActionCount,
    pace: mapPace(totalToday, lastHour)
  };
}
