-- destructive-reset-approved
-- Production-order-only clean reset.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DELETE FROM sessions;

DROP TABLE IF EXISTS production_order_attachments CASCADE;
DROP TABLE IF EXISTS production_order_dispatches CASCADE;
DROP TABLE IF EXISTS production_order_materials CASCADE;
DROP TABLE IF EXISTS production_orders CASCADE;
DROP TABLE IF EXISTS production_units CASCADE;
DROP TABLE IF EXISTS stocks CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS rbac_role_permissions CASCADE;
DROP TABLE IF EXISTS rbac_permissions CASCADE;

DELETE FROM users WHERE role::text <> 'admin';

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS hat_unit_code VARCHAR(32);

ALTER TABLE users
  ALTER COLUMN role TYPE TEXT USING role::text;

DROP TYPE IF EXISTS role_type;
CREATE TYPE role_type AS ENUM ('admin', 'production_manager', 'hat');

ALTER TABLE users
  ALTER COLUMN role TYPE role_type USING role::role_type;

UPDATE users
SET hat_unit_code = NULL,
    updated_at = NOW();

CREATE TABLE production_units (
  code VARCHAR(32) PRIMARY KEY,
  name VARCHAR(64) NOT NULL,
  unit_group VARCHAR(16) NOT NULL CHECK (unit_group IN ('HAMMADDE', 'MAKINE')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO production_units (code, name, unit_group, is_active)
VALUES
  ('TOZ_KARISIM', 'Toz Karışım', 'HAMMADDE', TRUE),
  ('SIVI_KARISIM', 'Sıvı Karışım', 'HAMMADDE', TRUE),
  ('SOFTJEL', 'Softjel', 'HAMMADDE', TRUE),
  ('DEPO', 'Depo', 'MAKINE', TRUE),
  ('TABLET1', 'Tablet 1', 'MAKINE', TRUE),
  ('TABLET2', 'Tablet 2', 'MAKINE', TRUE),
  ('BOYA', 'Boya', 'MAKINE', TRUE),
  ('KAPSUL', 'Kapsül', 'MAKINE', TRUE),
  ('BLISTER1', 'Blister 1', 'MAKINE', TRUE),
  ('BLISTER2', 'Blister 2', 'MAKINE', TRUE),
  ('PAKET', 'Paket', 'MAKINE', TRUE)
ON CONFLICT (code) DO NOTHING;

ALTER TABLE users
  DROP CONSTRAINT IF EXISTS users_hat_unit_code_fkey;

ALTER TABLE users
  ADD CONSTRAINT users_hat_unit_code_fkey
  FOREIGN KEY (hat_unit_code) REFERENCES production_units(code);

CREATE INDEX IF NOT EXISTS idx_users_hat_unit_code ON users(hat_unit_code);

CREATE TABLE production_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_date DATE NOT NULL,
  order_no BIGINT NOT NULL UNIQUE,
  customer_name VARCHAR(120) NOT NULL,
  order_quantity BIGINT NOT NULL CHECK (order_quantity > 0),
  deadline_date DATE NOT NULL,
  final_product_name VARCHAR(160) NOT NULL,
  total_packaging_quantity BIGINT NOT NULL CHECK (total_packaging_quantity > 0),
  color VARCHAR(64) NOT NULL,
  mold_text VARCHAR(120) NOT NULL,
  has_prospectus BOOLEAN NOT NULL DEFAULT FALSE,
  market_scope VARCHAR(16) NOT NULL CHECK (market_scope IN ('ihracat', 'ic_piyasa')),
  demand_source VARCHAR(24) NOT NULL CHECK (demand_source IN ('numune', 'musteri_talebi', 'stok')),
  packaging_type VARCHAR(16) NOT NULL CHECK (packaging_type IN ('kapsul', 'tablet', 'sivi', 'sase', 'softjel')),
  planned_raw_unit_code VARCHAR(32) NOT NULL REFERENCES production_units(code),
  planned_machine_unit_code VARCHAR(32) NOT NULL REFERENCES production_units(code),
  status VARCHAR(16) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed')),
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE production_order_dispatches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  production_order_id UUID NOT NULL REFERENCES production_orders(id) ON DELETE CASCADE,
  unit_code VARCHAR(32) NOT NULL REFERENCES production_units(code),
  status VARCHAR(16) NOT NULL CHECK (status IN ('pending', 'in_progress', 'completed')),
  dispatched_by UUID REFERENCES users(id),
  accepted_by UUID REFERENCES users(id),
  completed_by UUID REFERENCES users(id),
  dispatched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  reported_output_quantity BIGINT CHECK (reported_output_quantity IS NULL OR reported_output_quantity > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (production_order_id, unit_code)
);

CREATE TABLE production_order_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  production_order_id UUID NOT NULL REFERENCES production_orders(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL UNIQUE,
  original_filename VARCHAR(255) NOT NULL,
  mime_type VARCHAR(128) NOT NULL,
  size_bytes BIGINT NOT NULL CHECK (size_bytes >= 0),
  uploaded_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_production_units_group ON production_units(unit_group, is_active);
CREATE INDEX idx_production_orders_status_created_at ON production_orders(status, created_at DESC);
CREATE INDEX idx_production_orders_deadline_date ON production_orders(deadline_date);
CREATE INDEX idx_production_orders_created_by ON production_orders(created_by);
CREATE INDEX idx_production_order_dispatches_scope ON production_order_dispatches(unit_code, status, dispatched_at DESC);
CREATE INDEX idx_production_order_dispatches_order_id ON production_order_dispatches(production_order_id, dispatched_at ASC);
CREATE INDEX idx_production_order_attachments_order_id ON production_order_attachments(production_order_id, created_at ASC);

DROP TRIGGER IF EXISTS trg_production_units_updated_at ON production_units;
CREATE TRIGGER trg_production_units_updated_at
BEFORE UPDATE ON production_units
FOR EACH ROW
EXECUTE FUNCTION set_updated_at_timestamp();

DROP TRIGGER IF EXISTS trg_production_orders_updated_at ON production_orders;
CREATE TRIGGER trg_production_orders_updated_at
BEFORE UPDATE ON production_orders
FOR EACH ROW
EXECUTE FUNCTION set_updated_at_timestamp();

DROP TRIGGER IF EXISTS trg_production_order_dispatches_updated_at ON production_order_dispatches;
CREATE TRIGGER trg_production_order_dispatches_updated_at
BEFORE UPDATE ON production_order_dispatches
FOR EACH ROW
EXECUTE FUNCTION set_updated_at_timestamp();

CREATE TABLE rbac_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(100) NOT NULL UNIQUE,
  description TEXT NOT NULL
);

CREATE TABLE rbac_role_permissions (
  role role_type NOT NULL,
  permission_code VARCHAR(100) NOT NULL REFERENCES rbac_permissions(code) ON DELETE CASCADE,
  PRIMARY KEY (role, permission_code)
);

INSERT INTO rbac_permissions (code, description)
VALUES
  ('dashboard:view', 'Dashboard ekranini gorme yetkisi'),
  ('production-orders:view', 'Uretim emirlerini listeleme yetkisi'),
  ('production-orders:create', 'Uretim emri olusturma yetkisi'),
  ('production-orders:manage', 'Uretim emri sevk ve bitirme yetkisi'),
  ('production-orders:incoming', 'Birime gelen emirleri gorme yetkisi'),
  ('production-orders:unit-task', 'Birim gorevlerini kabul etme ve bitirme yetkisi'),
  ('admin:users:view', 'Admin kullanici listesi yetkisi'),
  ('admin:users:create', 'Admin kullanici olusturma yetkisi'),
  ('admin:users:update', 'Admin kullanici guncelleme yetkisi'),
  ('admin:users:reset-password', 'Admin sifre sifirlama yetkisi'),
  ('admin:users:delete', 'Admin kullanici silme yetkisi')
ON CONFLICT (code) DO NOTHING;

INSERT INTO rbac_role_permissions (role, permission_code)
VALUES
  ('admin', 'dashboard:view'),
  ('admin', 'production-orders:view'),
  ('admin', 'production-orders:create'),
  ('admin', 'production-orders:manage'),
  ('admin', 'production-orders:incoming'),
  ('admin', 'production-orders:unit-task'),
  ('admin', 'admin:users:view'),
  ('admin', 'admin:users:create'),
  ('admin', 'admin:users:update'),
  ('admin', 'admin:users:reset-password'),
  ('admin', 'admin:users:delete'),
  ('production_manager', 'dashboard:view'),
  ('production_manager', 'production-orders:view'),
  ('production_manager', 'production-orders:create'),
  ('production_manager', 'production-orders:manage'),
  ('hat', 'production-orders:incoming'),
  ('hat', 'production-orders:unit-task')
ON CONFLICT (role, permission_code) DO NOTHING;
