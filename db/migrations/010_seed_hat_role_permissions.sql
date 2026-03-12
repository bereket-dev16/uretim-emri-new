UPDATE users
SET role = 'hat',
    hat_unit_code = COALESCE(hat_unit_code, 'TABLET1'),
    updated_at = NOW()
WHERE role = 'tablet1';

INSERT INTO rbac_permissions (code, description)
VALUES
  ('production-orders:unit-task', 'Birim uretim gorev ekranina erisim yetkisi')
ON CONFLICT (code) DO NOTHING;

INSERT INTO rbac_role_permissions (role, permission_code)
VALUES
  ('hat', 'production-orders:unit-task')
ON CONFLICT (role, permission_code) DO NOTHING;
