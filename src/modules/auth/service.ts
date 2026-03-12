import { AppError } from '@/shared/errors/app-error';
import { queryDb } from '@/shared/db/client';
import {
  generateSessionToken,
  hashSessionToken,
  sessionExpiresAt,
  shouldSlideSession
} from '@/shared/security/session';
import { verifyPassword } from '@/shared/security/password';
import type { Role, SessionDTO } from '@/shared/types/domain';

import { createAuditLog } from '@/modules/audit/service';

export interface SessionRecord extends SessionDTO {
  sessionId: string;
}

interface SessionCacheEntry {
  session: SessionRecord | null;
  cachedAt: number;
}

function getSessionCacheTtlMs(): number {
  const rawValue = Number(process.env.SESSION_CACHE_TTL_MS ?? 10000);
  return Number.isFinite(rawValue) && rawValue > 0 ? rawValue : 10000;
}

const sessionCache = new Map<string, SessionCacheEntry>();

function readSessionCache(tokenHash: string): SessionRecord | null | undefined {
  const entry = sessionCache.get(tokenHash);

  if (!entry) {
    return undefined;
  }

  if (Date.now() - entry.cachedAt > getSessionCacheTtlMs()) {
    sessionCache.delete(tokenHash);
    return undefined;
  }

  if (entry.session && new Date(entry.session.expiresAt).getTime() <= Date.now()) {
    sessionCache.delete(tokenHash);
    return null;
  }

  return entry.session;
}

function writeSessionCache(tokenHash: string, session: SessionRecord | null): void {
  sessionCache.set(tokenHash, {
    session,
    cachedAt: Date.now()
  });
}

interface LoginParams {
  username: string;
  password: string;
  ip: string | null;
  userAgent: string | null;
  requestId: string;
}

export async function login(params: LoginParams): Promise<{
  sessionToken: string;
  session: SessionDTO;
}> {
  const userResult = await queryDb<{
    id: string;
    username: string;
    password_hash: string;
    role: Role;
    hat_unit_code: string | null;
    is_active: boolean;
  }>(
    `
      SELECT id, username, password_hash, role, hat_unit_code, is_active
      FROM users
      WHERE username = $1
      LIMIT 1
    `,
    [params.username]
  );

  const user = userResult.rows[0];

  if (!user || !user.is_active) {
    await createAuditLog({
      actorUserId: null,
      actionType: 'LOGIN_FAILED',
      entityType: 'auth',
      entityId: null,
      payload: {
        username: params.username,
        reason: 'user_not_found_or_inactive',
        ip: params.ip
      },
      requestId: params.requestId
    });

    throw new AppError({
      status: 401,
      code: 'INVALID_CREDENTIALS',
      publicMessage: 'Kullanıcı adı veya şifre hatalı.'
    });
  }

  const passwordValid = await verifyPassword(user.password_hash, params.password);

  if (!passwordValid) {
    await createAuditLog({
      actorUserId: user.id,
      actionType: 'LOGIN_FAILED',
      entityType: 'auth',
      entityId: user.id,
      payload: {
        username: params.username,
        reason: 'invalid_password',
        ip: params.ip
      },
      requestId: params.requestId
    });

    throw new AppError({
      status: 401,
      code: 'INVALID_CREDENTIALS',
      publicMessage: 'Kullanıcı adı veya şifre hatalı.'
    });
  }

  const sessionToken = generateSessionToken();
  const sessionTokenHash = hashSessionToken(sessionToken);
  const expiresAt = sessionExpiresAt();

  const sessionInsertResult = await queryDb<{ id: string }>(
    `
      INSERT INTO sessions (
        user_id,
        token_hash,
        last_seen_at,
        expires_at,
        ip,
        user_agent
      )
      VALUES ($1, $2, NOW(), $3, $4, $5)
      RETURNING id
    `,
    [user.id, sessionTokenHash, expiresAt, params.ip, params.userAgent]
  );

  await queryDb(
    `
      UPDATE users
      SET last_login_at = NOW(), updated_at = NOW()
      WHERE id = $1
    `,
    [user.id]
  );

  await createAuditLog({
    actorUserId: user.id,
    actionType: 'LOGIN_SUCCESS',
    entityType: 'auth',
    entityId: user.id,
    payload: {
      username: user.username,
      role: user.role,
      hatUnitCode: user.hat_unit_code,
      ip: params.ip
    },
    requestId: params.requestId
  });

  const sessionRecord: SessionRecord = {
    sessionId: sessionInsertResult.rows[0]?.id ?? '',
    userId: user.id,
    username: user.username,
    role: user.role,
    hatUnitCode: user.hat_unit_code,
    expiresAt: expiresAt.toISOString()
  };
  writeSessionCache(sessionTokenHash, sessionRecord);

  return {
    sessionToken,
    session: sessionRecord
  };
}

interface SessionLookupOptions {
  requestId: string;
  touch?: boolean;
}

export async function getSessionByToken(
  sessionToken: string,
  options: SessionLookupOptions
): Promise<SessionRecord | null> {
  const tokenHash = hashSessionToken(sessionToken);
  const cachedSession = readSessionCache(tokenHash);

  if (cachedSession !== undefined) {
    return cachedSession;
  }

  const sessionResult = await queryDb<{
    session_id: string;
    user_id: string;
    username: string;
    role: Role;
    hat_unit_code: string | null;
    expires_at: Date;
    last_seen_at: Date;
  }>(
    `
      SELECT
        s.id AS session_id,
        s.user_id,
        u.username,
        u.role,
        u.hat_unit_code,
        s.expires_at,
        s.last_seen_at
      FROM sessions s
      JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = $1
        AND s.revoked_at IS NULL
        AND s.expires_at > NOW()
        AND u.is_active = TRUE
      LIMIT 1
    `,
    [tokenHash]
  );

  const row = sessionResult.rows[0];

  if (!row) {
    writeSessionCache(tokenHash, null);
    return null;
  }

  let expiresAt = new Date(row.expires_at);

  if (options.touch !== false && shouldSlideSession(new Date(row.last_seen_at))) {
    expiresAt = sessionExpiresAt();

    await queryDb(
      `
        UPDATE sessions
        SET last_seen_at = NOW(),
            expires_at = $2
        WHERE id = $1
      `,
      [row.session_id, expiresAt]
    );
  }

  const sessionRecord: SessionRecord = {
    sessionId: row.session_id,
    userId: row.user_id,
    username: row.username,
    role: row.role,
    hatUnitCode: row.hat_unit_code,
    expiresAt: expiresAt.toISOString()
  };

  writeSessionCache(tokenHash, sessionRecord);
  return sessionRecord;
}

export async function logoutByToken(sessionToken: string, requestId: string): Promise<void> {
  const tokenHash = hashSessionToken(sessionToken);
  sessionCache.delete(tokenHash);

  const result = await queryDb<{ id: string; user_id: string }>(
    `
      UPDATE sessions
      SET revoked_at = NOW()
      WHERE token_hash = $1
        AND revoked_at IS NULL
      RETURNING id, user_id
    `,
    [tokenHash]
  );

  if (result.rowCount && result.rows[0]) {
    await createAuditLog({
      actorUserId: result.rows[0].user_id,
      actionType: 'LOGOUT',
      entityType: 'auth',
      entityId: result.rows[0].id,
      payload: {},
      requestId
    });
  }
}
