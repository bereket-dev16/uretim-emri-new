import { AppError } from '@/shared/errors/app-error';
import type { Role } from '@/shared/types/domain';
import { queryDb } from '@/shared/db/client';

import { ROLE_DEFAULT_PERMISSIONS, type PermissionCode } from './constants';

type PermissionCache = {
  map: Map<Role, Set<string>>;
  expiresAt: number;
};

const CACHE_TTL_MS = 60 * 1000;
let permissionCache: PermissionCache | null = null;

async function loadPermissions(): Promise<Map<Role, Set<string>>> {
  const result = await queryDb<{ role: Role; permission_code: string }>(
    `
      SELECT role, permission_code
      FROM rbac_role_permissions
    `
  );

  if (result.rows.length === 0) {
    return new Map(
      (Object.entries(ROLE_DEFAULT_PERMISSIONS) as Array<[Role, PermissionCode[]]>).map(
        ([role, permissions]) => [role, new Set(permissions)]
      )
    );
  }

  const map = new Map<Role, Set<string>>();

  for (const row of result.rows) {
    if (!map.has(row.role)) {
      map.set(row.role, new Set());
    }

    map.get(row.role)?.add(row.permission_code);
  }

  return map;
}

async function getPermissionMap(): Promise<Map<Role, Set<string>>> {
  if (permissionCache && permissionCache.expiresAt > Date.now()) {
    return permissionCache.map;
  }

  const map = await loadPermissions();
  permissionCache = {
    map,
    expiresAt: Date.now() + CACHE_TTL_MS
  };
  return map;
}

export async function hasPermission(role: Role, permission: string): Promise<boolean> {
  const map = await getPermissionMap();
  const rolePermissions = map.get(role);

  if (rolePermissions?.has(permission)) {
    return true;
  }

  const permissionKnownInDb = Array.from(map.values()).some((permissions) =>
    permissions.has(permission)
  );

  if (permissionKnownInDb) {
    return false;
  }

  // Fallback for newly introduced permissions not seeded yet in DB.
  return ROLE_DEFAULT_PERMISSIONS[role].includes(permission as PermissionCode);
}

export async function ensurePermission(role: Role, permission: string): Promise<void> {
  const allowed = await hasPermission(role, permission);

  if (!allowed) {
    throw new AppError({
      status: 403,
      code: 'FORBIDDEN',
      publicMessage: 'Bu işlem için yetkiniz bulunmuyor.'
    });
  }
}

export function resetPermissionCache(): void {
  permissionCache = null;
}
