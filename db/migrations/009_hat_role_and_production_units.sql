CREATE TABLE IF NOT EXISTS production_units (
  code VARCHAR(32) PRIMARY KEY,
  name VARCHAR(64) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO production_units (code, name, is_active)
VALUES
  ('DEPO', 'Depo', TRUE),
  ('TABLET1', 'Tablet1', TRUE),
  ('TABLET2', 'Tablet2', TRUE),
  ('BOYA', 'Boya', TRUE),
  ('KAPSUL', 'Kapsül', TRUE),
  ('BLISTER1', 'Blister1', TRUE),
  ('BLISTER2', 'Blister2', TRUE),
  ('PAKET', 'Paket', TRUE),
  ('HMMD_KARISIM', 'HMMD/Karışım', TRUE)
ON CONFLICT (code) DO NOTHING;

DO $$
BEGIN
  ALTER TYPE role_type ADD VALUE IF NOT EXISTS 'hat';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE users
ADD COLUMN IF NOT EXISTS hat_unit_code VARCHAR(32);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'users_hat_unit_code_fkey'
      AND conrelid = 'users'::regclass
  ) THEN
    ALTER TABLE users
    ADD CONSTRAINT users_hat_unit_code_fkey
      FOREIGN KEY (hat_unit_code) REFERENCES production_units(code);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_users_hat_unit_code ON users(hat_unit_code);

INSERT INTO production_units (code, name, is_active)
SELECT DISTINCT o.dispatch_unit_code, o.dispatch_unit_code, TRUE
FROM production_orders o
LEFT JOIN production_units pu ON pu.code = o.dispatch_unit_code
WHERE pu.code IS NULL;

INSERT INTO production_units (code, name, is_active)
SELECT DISTINCT d.unit_code, d.unit_code, TRUE
FROM production_order_dispatches d
LEFT JOIN production_units pu ON pu.code = d.unit_code
WHERE pu.code IS NULL;

ALTER TABLE production_orders
DROP CONSTRAINT IF EXISTS production_orders_dispatch_unit_code_check;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'production_orders_dispatch_unit_code_fkey'
      AND conrelid = 'production_orders'::regclass
  ) THEN
    ALTER TABLE production_orders
    ADD CONSTRAINT production_orders_dispatch_unit_code_fkey
      FOREIGN KEY (dispatch_unit_code) REFERENCES production_units(code);
  END IF;
END $$;

ALTER TABLE production_order_dispatches
DROP CONSTRAINT IF EXISTS production_order_dispatches_unit_code_check;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'production_order_dispatches_unit_code_fkey'
      AND conrelid = 'production_order_dispatches'::regclass
  ) THEN
    ALTER TABLE production_order_dispatches
    ADD CONSTRAINT production_order_dispatches_unit_code_fkey
      FOREIGN KEY (unit_code) REFERENCES production_units(code);
  END IF;
END $$;

DROP TRIGGER IF EXISTS trg_production_units_updated_at ON production_units;
CREATE TRIGGER trg_production_units_updated_at
BEFORE UPDATE ON production_units
FOR EACH ROW
EXECUTE FUNCTION set_updated_at_timestamp();
