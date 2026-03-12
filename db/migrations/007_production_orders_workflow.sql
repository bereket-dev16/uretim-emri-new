CREATE TABLE IF NOT EXISTS production_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_date DATE NOT NULL,
  order_no VARCHAR(64) NOT NULL UNIQUE,
  customer_name VARCHAR(120) NOT NULL,
  market_scope VARCHAR(16) NOT NULL CHECK (market_scope IN ('ihracat', 'ic_piyasa')),
  demand_source VARCHAR(32) NOT NULL CHECK (demand_source IN ('numune', 'musteri_talebi', 'stok')),
  order_quantity VARCHAR(64) NOT NULL,
  deadline_date DATE NOT NULL,
  final_product_name VARCHAR(120) NOT NULL,
  packaging_type VARCHAR(16) NOT NULL CHECK (packaging_type IN ('kapsul', 'tablet', 'sivi', 'sase', 'softjel')),
  total_amount_text VARCHAR(120) NOT NULL,
  dispatch_unit_code VARCHAR(16) NOT NULL CHECK (dispatch_unit_code IN ('DEPO', 'TABLET1', 'TABLET2', 'BOYA', 'KAPSUL', 'BLISTER1', 'BLISTER2', 'PAKET')),
  created_by UUID NOT NULL REFERENCES users(id),
  created_by_role role_type NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS production_order_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  production_order_id UUID NOT NULL REFERENCES production_orders(id) ON DELETE CASCADE,
  material_product_type VARCHAR(32) NOT NULL CHECK (material_product_type IN ('kutu', 'blister_folyo', 'sase_folyo', 'prospektus', 'sise', 'etiket', 'kapak', 'sleeve')),
  material_name VARCHAR(120) NOT NULL,
  material_quantity_text VARCHAR(120) NOT NULL,
  is_available BOOLEAN NOT NULL DEFAULT FALSE,
  checked_by UUID REFERENCES users(id),
  checked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS production_order_dispatches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  production_order_id UUID NOT NULL REFERENCES production_orders(id) ON DELETE CASCADE,
  unit_code VARCHAR(16) NOT NULL CHECK (unit_code IN ('DEPO', 'TABLET1', 'TABLET2', 'BOYA', 'KAPSUL', 'BLISTER1', 'BLISTER2', 'PAKET')),
  status VARCHAR(24) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  dispatched_by UUID NOT NULL REFERENCES users(id),
  dispatched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  accepted_by UUID REFERENCES users(id),
  accepted_at TIMESTAMPTZ,
  completed_by UUID REFERENCES users(id),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (production_order_id, unit_code)
);

CREATE INDEX IF NOT EXISTS idx_production_orders_created_at_desc ON production_orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_production_orders_dispatch_unit_code ON production_orders(dispatch_unit_code);
CREATE INDEX IF NOT EXISTS idx_production_orders_created_by_role ON production_orders(created_by_role);
CREATE INDEX IF NOT EXISTS idx_production_order_materials_order_id ON production_order_materials(production_order_id);
CREATE INDEX IF NOT EXISTS idx_production_order_dispatches_order_id ON production_order_dispatches(production_order_id);
CREATE INDEX IF NOT EXISTS idx_production_order_dispatches_unit_code_status ON production_order_dispatches(unit_code, status);

DROP TRIGGER IF EXISTS trg_production_orders_updated_at ON production_orders;
CREATE TRIGGER trg_production_orders_updated_at
BEFORE UPDATE ON production_orders
FOR EACH ROW
EXECUTE FUNCTION set_updated_at_timestamp();

DROP TRIGGER IF EXISTS trg_production_order_materials_updated_at ON production_order_materials;
CREATE TRIGGER trg_production_order_materials_updated_at
BEFORE UPDATE ON production_order_materials
FOR EACH ROW
EXECUTE FUNCTION set_updated_at_timestamp();

DROP TRIGGER IF EXISTS trg_production_order_dispatches_updated_at ON production_order_dispatches;
CREATE TRIGGER trg_production_order_dispatches_updated_at
BEFORE UPDATE ON production_order_dispatches
FOR EACH ROW
EXECUTE FUNCTION set_updated_at_timestamp();

INSERT INTO rbac_permissions (code, description)
VALUES
  ('production-orders:warehouse', 'Depo gelen uretim emri yonetimi yetkisi'),
  ('production-orders:monitor', 'Uretim emri surec takip ekrani yetkisi'),
  ('production-orders:unit-task', 'Birim uretim gorev ekranina erisim yetkisi')
ON CONFLICT (code) DO NOTHING;

INSERT INTO rbac_role_permissions (role, permission_code)
VALUES
  ('admin', 'production-orders:warehouse'),
  ('admin', 'production-orders:monitor'),
  ('admin', 'production-orders:unit-task'),
  ('production_manager', 'production-orders:monitor'),
  ('warehouse_manager', 'production-orders:warehouse')
ON CONFLICT (role, permission_code) DO NOTHING;
