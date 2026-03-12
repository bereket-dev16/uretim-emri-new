INSERT INTO rbac_permissions (code, description)
VALUES
  ('production-orders:view', 'Uretim emri ekranini gorme yetkisi'),
  ('production-orders:create', 'Uretim emri olusturma yetkisi')
ON CONFLICT (code) DO NOTHING;

INSERT INTO rbac_role_permissions (role, permission_code)
VALUES
  ('admin', 'production-orders:view'),
  ('admin', 'production-orders:create'),
  ('production_manager', 'production-orders:view'),
  ('production_manager', 'production-orders:create'),
  ('warehouse_manager', 'production-orders:view'),
  ('warehouse_manager', 'production-orders:create')
ON CONFLICT (role, permission_code) DO NOTHING;
