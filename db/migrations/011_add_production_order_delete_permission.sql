INSERT INTO rbac_permissions (code, description)
VALUES ('production-orders:delete', 'Uretim emri kaydini silme yetkisi')
ON CONFLICT (code) DO NOTHING;

INSERT INTO rbac_role_permissions (role, permission_code)
VALUES
  ('admin', 'production-orders:delete'),
  ('production_manager', 'production-orders:delete'),
  ('warehouse_manager', 'production-orders:delete')
ON CONFLICT (role, permission_code) DO NOTHING;
