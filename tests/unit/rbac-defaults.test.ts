import { describe, expect, it } from 'vitest';

import { PERMISSIONS, ROLE_DEFAULT_PERMISSIONS } from '@/modules/rbac/constants';

describe('rbac defaults', () => {
  it('admin has production, dashboard and user management permissions', () => {
    const adminPermissions = ROLE_DEFAULT_PERMISSIONS.admin;

    expect(adminPermissions).toContain(PERMISSIONS.DASHBOARD_VIEW);
    expect(adminPermissions).toContain(PERMISSIONS.PRODUCTION_ORDERS_VIEW);
    expect(adminPermissions).toContain(PERMISSIONS.PRODUCTION_ORDERS_CREATE);
    expect(adminPermissions).toContain(PERMISSIONS.PRODUCTION_ORDERS_MANAGE);
    expect(adminPermissions).toContain(PERMISSIONS.PRODUCTION_ORDER_ATTACHMENTS_VIEW);
    expect(adminPermissions).toContain(PERMISSIONS.PRODUCTION_ORDERS_INCOMING);
    expect(adminPermissions).toContain(PERMISSIONS.PRODUCTION_ORDERS_UNIT_TASK);
    expect(adminPermissions).toContain(PERMISSIONS.ADMIN_USERS_UPDATE);
    expect(adminPermissions).toContain(PERMISSIONS.ADMIN_USERS_DELETE);
  });

  it('production manager can manage production orders', () => {
    expect(ROLE_DEFAULT_PERMISSIONS.production_manager).toEqual(
      expect.arrayContaining([
        PERMISSIONS.DASHBOARD_VIEW,
        PERMISSIONS.PRODUCTION_ORDERS_VIEW,
        PERMISSIONS.PRODUCTION_ORDERS_CREATE,
        PERMISSIONS.PRODUCTION_ORDERS_MANAGE,
        PERMISSIONS.PRODUCTION_ORDER_ATTACHMENTS_VIEW
      ])
    );
  });

  it('raw preparation can access attachments and unit task flow', () => {
    expect(ROLE_DEFAULT_PERMISSIONS.raw_preparation).toEqual([
      PERMISSIONS.PRODUCTION_ORDER_ATTACHMENTS_VIEW,
      PERMISSIONS.PRODUCTION_ORDERS_INCOMING,
      PERMISSIONS.PRODUCTION_ORDERS_UNIT_TASK
    ]);
  });

  it('machine operator only sees incoming and own task permissions', () => {
    expect(ROLE_DEFAULT_PERMISSIONS.machine_operator).toEqual([
      PERMISSIONS.PRODUCTION_ORDERS_INCOMING,
      PERMISSIONS.PRODUCTION_ORDERS_UNIT_TASK
    ]);
  });
});
