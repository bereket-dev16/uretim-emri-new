import { describe, expect, it } from 'vitest';

import { PERMISSIONS, ROLE_DEFAULT_PERMISSIONS } from '@/modules/rbac/constants';

describe('rbac defaults', () => {
  it('admin has all stock and user management permissions', () => {
    const adminPermissions = ROLE_DEFAULT_PERMISSIONS.admin;

    expect(adminPermissions).toContain(PERMISSIONS.STOCKS_CREATE);
    expect(adminPermissions).toContain(PERMISSIONS.ADMIN_USERS_UPDATE);
    expect(adminPermissions).toContain(PERMISSIONS.ADMIN_USERS_DELETE);
    expect(adminPermissions).toContain(PERMISSIONS.PRODUCTION_ORDERS_WAREHOUSE);
    expect(adminPermissions).toContain(PERMISSIONS.PRODUCTION_ORDERS_MONITOR);
    expect(adminPermissions).toContain(PERMISSIONS.PRODUCTION_ORDERS_UNIT_TASK);
    expect(adminPermissions).toContain(PERMISSIONS.PRODUCTION_ORDERS_DELETE);
  });

  it('non-admin roles can create and view stock', () => {
    expect(ROLE_DEFAULT_PERMISSIONS.production_manager).toEqual(
      expect.arrayContaining([
        PERMISSIONS.STOCKS_VIEW,
        PERMISSIONS.STOCKS_CREATE,
        PERMISSIONS.PRODUCTION_ORDERS_VIEW,
        PERMISSIONS.PRODUCTION_ORDERS_CREATE,
        PERMISSIONS.PRODUCTION_ORDERS_DELETE
      ])
    );

    expect(ROLE_DEFAULT_PERMISSIONS.warehouse_manager).toEqual(
      expect.arrayContaining([
        PERMISSIONS.STOCKS_VIEW,
        PERMISSIONS.STOCKS_CREATE,
        PERMISSIONS.PRODUCTION_ORDERS_VIEW,
        PERMISSIONS.PRODUCTION_ORDERS_CREATE,
        PERMISSIONS.PRODUCTION_ORDERS_DELETE,
        PERMISSIONS.PRODUCTION_ORDERS_WAREHOUSE
      ])
    );
  });

  it('hat role only has unit task permission by default', () => {
    expect(ROLE_DEFAULT_PERMISSIONS.hat).toEqual([
      PERMISSIONS.PRODUCTION_ORDERS_UNIT_TASK
    ]);
  });

  it('tablet1 legacy role still resolves to unit task permission', () => {
    expect(ROLE_DEFAULT_PERMISSIONS.tablet1).toEqual([
      PERMISSIONS.PRODUCTION_ORDERS_UNIT_TASK
    ]);
  });
});
