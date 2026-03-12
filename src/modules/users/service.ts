import type { QueryResultRow } from 'pg';

import { createAuditLog } from '@/modules/audit/service';
import { AppError } from '@/shared/errors/app-error';
import { queryDb, withTransaction } from '@/shared/db/client';
import { hashPassword } from '@/shared/security/password';
import type { Role, UserDTO } from '@/shared/types/domain';

interface UserRow extends QueryResultRow {
  id: string;
  username: string;
  role: Role;
  hat_unit_code: string | null;
  is_active: boolean;
  last_login_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

function mapUser(row: UserRow): UserDTO {
  return {
    id: row.id,
    username: row.username,
    role: row.role,
    hatUnitCode: row.hat_unit_code,
    isActive: row.is_active,
    lastLoginAt: row.last_login_at ? new Date(row.last_login_at).toISOString() : null,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString()
  };
}

export async function listUsers(): Promise<UserDTO[]> {
  const result = await queryDb<UserRow>(
    `
      SELECT id, username, role, hat_unit_code, is_active, last_login_at, created_at, updated_at
      FROM users
      ORDER BY created_at DESC
    `
  );

  return result.rows.map(mapUser);
}

interface CreateUserParams {
  username: string;
  password: string;
  role: Role;
  hatUnitCode?: string | null;
  actorUserId: string;
  requestId: string;
}

export async function createUser(params: CreateUserParams): Promise<UserDTO> {
  const passwordHash = await hashPassword(params.password);

  try {
    const result = await queryDb<UserRow>(
      `
        INSERT INTO users (
          username,
          password_hash,
          role,
          hat_unit_code,
          is_active
        )
        VALUES ($1, $2, $3, $4, TRUE)
        RETURNING id, username, role, hat_unit_code, is_active, last_login_at, created_at, updated_at
      `,
      [params.username, passwordHash, params.role, params.hatUnitCode ?? null]
    );

    const created = result.rows[0];

    await createAuditLog({
      actorUserId: params.actorUserId,
      actionType: 'USER_CREATED',
      entityType: 'user',
      entityId: created.id,
      payload: {
        username: created.username,
        role: created.role,
        hatUnitCode: created.hat_unit_code
      },
      requestId: params.requestId
    });

    return mapUser(created);
  } catch (error) {
    const pgError = error as { code?: string };

    if (pgError.code === '23505') {
      throw new AppError({
        status: 409,
        code: 'USERNAME_EXISTS',
        publicMessage: 'Bu kullanıcı adı zaten kullanımda.'
      });
    }

    throw error;
  }
}

interface UpdateUserParams {
  id: string;
  username?: string;
  role?: Role;
  hatUnitCode?: string | null;
  isActive?: boolean;
  actorUserId: string;
  requestId: string;
}

export async function updateUser(params: UpdateUserParams): Promise<UserDTO> {
  const updates: string[] = [];
  const values: unknown[] = [];

  if (params.username !== undefined) {
    updates.push(`username = $${updates.length + 1}`);
    values.push(params.username);
  }

  if (params.role !== undefined) {
    updates.push(`role = $${updates.length + 1}`);
    values.push(params.role);
  }

  if (params.hatUnitCode !== undefined) {
    updates.push(`hat_unit_code = $${updates.length + 1}`);
    values.push(params.hatUnitCode);
  }

  if (params.isActive !== undefined) {
    updates.push(`is_active = $${updates.length + 1}`);
    values.push(params.isActive);
  }

  if (updates.length === 0) {
    throw new AppError({
      status: 400,
      code: 'EMPTY_UPDATE',
      publicMessage: 'Güncellenecek alan bulunamadı.'
    });
  }

  updates.push(`updated_at = NOW()`);
  values.push(params.id);

  try {
    const result = await queryDb<UserRow>(
      `
        UPDATE users
        SET ${updates.join(', ')}
        WHERE id = $${values.length}
        RETURNING id, username, role, hat_unit_code, is_active, last_login_at, created_at, updated_at
      `,
      values
    );

    const updated = result.rows[0];

    if (!updated) {
      throw new AppError({
        status: 404,
        code: 'USER_NOT_FOUND',
        publicMessage: 'Kullanıcı bulunamadı.'
      });
    }

    await createAuditLog({
      actorUserId: params.actorUserId,
      actionType: 'USER_UPDATED',
      entityType: 'user',
      entityId: updated.id,
      payload: {
        username: updated.username,
        role: updated.role,
        hatUnitCode: updated.hat_unit_code,
        isActive: updated.is_active
      },
      requestId: params.requestId
    });

    return mapUser(updated);
  } catch (error) {
    const pgError = error as { code?: string };

    if (pgError.code === '23505') {
      throw new AppError({
        status: 409,
        code: 'USERNAME_EXISTS',
        publicMessage: 'Bu kullanıcı adı zaten kullanımda.'
      });
    }

    throw error;
  }
}

interface ResetUserPasswordParams {
  id: string;
  password: string;
  actorUserId: string;
  requestId: string;
}

export async function resetUserPassword(params: ResetUserPasswordParams): Promise<void> {
  const passwordHash = await hashPassword(params.password);

  const result = await queryDb<{ id: string }>(
    `
      UPDATE users
      SET password_hash = $1,
          updated_at = NOW()
      WHERE id = $2
      RETURNING id
    `,
    [passwordHash, params.id]
  );

  if (!result.rows[0]) {
    throw new AppError({
      status: 404,
      code: 'USER_NOT_FOUND',
      publicMessage: 'Kullanıcı bulunamadı.'
    });
  }

  await createAuditLog({
    actorUserId: params.actorUserId,
    actionType: 'USER_PASSWORD_RESET',
    entityType: 'user',
    entityId: params.id,
    payload: {},
    requestId: params.requestId
  });
}

interface DeleteUserParams {
  id: string;
  actorUserId: string;
  requestId: string;
}

export async function deleteUser(params: DeleteUserParams): Promise<void> {
  if (params.id === params.actorUserId) {
    throw new AppError({
      status: 400,
      code: 'SELF_DELETE_NOT_ALLOWED',
      publicMessage: 'Kendi kullanıcınızı silemezsiniz.'
    });
  }

  try {
    const deletedUserId = await withTransaction(async (client) => {
      await client.query(
        `
          UPDATE audit_logs
          SET actor_user_id = NULL
          WHERE actor_user_id = $1::uuid
        `,
        [params.id]
      );

      await client.query(
        `
          DELETE FROM sessions
          WHERE user_id = $1::uuid
        `,
        [params.id]
      );

      const result = await client.query<{ id: string }>(
        `
          DELETE FROM users
          WHERE id = $1::uuid
          RETURNING id
        `,
        [params.id]
      );

      const deletedUser = result.rows[0];

      if (!deletedUser) {
        throw new AppError({
          status: 404,
          code: 'USER_NOT_FOUND',
          publicMessage: 'Kullanıcı bulunamadı.'
        });
      }

      return deletedUser.id;
    });

    await createAuditLog({
      actorUserId: params.actorUserId,
      actionType: 'USER_DELETED',
      entityType: 'user',
      entityId: deletedUserId,
      payload: {},
      requestId: params.requestId
    });
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    const pgError = error as { code?: string; constraint?: string };

    if (pgError.code === '23503') {
      throw new AppError({
        status: 409,
        code: 'USER_DELETE_BLOCKED',
        publicMessage:
          'Bu kullanıcıya bağlı kayıtlar bulunduğu için kalıcı silme yapılamadı. Önce ilişkili kayıtları temizleyin.'
      });
    }

    throw error;
  }
}
