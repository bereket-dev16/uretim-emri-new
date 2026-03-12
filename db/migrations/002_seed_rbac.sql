INSERT INTO rbac_permissions (code, description)
VALUES
  ('dashboard:view', 'Dashboard ekranini gorme yetkisi'),
  ('stocks:view', 'Stok kayitlarini listeleme yetkisi'),
  ('stocks:create', 'Stok kaydi olusturma yetkisi'),
  ('production-orders:view', 'Uretim emri ekranini gorme yetkisi'),
  ('production-orders:create', 'Uretim emri olusturma yetkisi'),
  ('production-orders:warehouse', 'Depo gelen uretim emri yonetimi yetkisi'),
  ('production-orders:monitor', 'Uretim emri surec takip ekrani yetkisi'),
  ('production-orders:unit-task', 'Birim uretim gorev ekranina erisim yetkisi'),
  ('admin:users:view', 'Admin kullanici listesi goruntuleme yetkisi'),
  ('admin:users:create', 'Admin kullanici olusturma yetkisi'),
  ('admin:users:update', 'Admin kullanici guncelleme yetkisi'),
  ('admin:users:reset-password', 'Admin kullanici sifre reset yetkisi'),
  ('admin:users:delete', 'Admin kullanici silme yetkisi')
ON CONFLICT (code) DO NOTHING;

INSERT INTO rbac_role_permissions (role, permission_code)
VALUES
  ('admin', 'dashboard:view'),
  ('admin', 'stocks:view'),
  ('admin', 'stocks:create'),
  ('admin', 'production-orders:view'),
  ('admin', 'production-orders:create'),
  ('admin', 'production-orders:warehouse'),
  ('admin', 'production-orders:monitor'),
  ('admin', 'production-orders:unit-task'),
  ('admin', 'admin:users:view'),
  ('admin', 'admin:users:create'),
  ('admin', 'admin:users:update'),
  ('admin', 'admin:users:reset-password'),
  ('admin', 'admin:users:delete'),
  ('production_manager', 'dashboard:view'),
  ('production_manager', 'stocks:view'),
  ('production_manager', 'stocks:create'),
  ('production_manager', 'production-orders:view'),
  ('production_manager', 'production-orders:create'),
  ('production_manager', 'production-orders:monitor'),
  ('warehouse_manager', 'dashboard:view'),
  ('warehouse_manager', 'stocks:view'),
  ('warehouse_manager', 'stocks:create'),
  ('warehouse_manager', 'production-orders:view'),
  ('warehouse_manager', 'production-orders:create'),
  ('warehouse_manager', 'production-orders:warehouse'),
  ('tablet1', 'production-orders:unit-task')
ON CONFLICT (role, permission_code) DO NOTHING;
