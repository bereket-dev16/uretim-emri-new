ALTER TABLE users
  ALTER COLUMN role TYPE TEXT USING role::text;

ALTER TABLE rbac_role_permissions
  ALTER COLUMN role TYPE TEXT USING role::text;

DELETE FROM rbac_role_permissions;

UPDATE users AS u
SET role = CASE
  WHEN pu.unit_group = 'HAMMADDE' THEN 'raw_preparation'
  WHEN pu.unit_group = 'MAKINE' THEN 'machine_operator'
  ELSE 'machine_operator'
END
FROM production_units AS pu
WHERE u.role = 'hat'
  AND pu.code = u.hat_unit_code;

UPDATE users
SET role = 'machine_operator'
WHERE role = 'hat';

DROP TYPE IF EXISTS role_type;
CREATE TYPE role_type AS ENUM ('admin', 'production_manager', 'raw_preparation', 'machine_operator');

ALTER TABLE users
  ALTER COLUMN role TYPE role_type USING role::role_type;

ALTER TABLE rbac_role_permissions
  ALTER COLUMN role TYPE role_type USING role::role_type;

ALTER TABLE production_orders
  ADD COLUMN IF NOT EXISTS note_text TEXT;

ALTER TABLE production_order_dispatches
  ADD COLUMN IF NOT EXISTS unit_group VARCHAR(16);

CREATE OR REPLACE FUNCTION sync_production_order_dispatch_unit_group()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  SELECT unit_group
  INTO NEW.unit_group
  FROM production_units
  WHERE code = NEW.unit_code;

  IF NEW.unit_group IS NULL THEN
    RAISE EXCEPTION 'Production unit not found for dispatch: %', NEW.unit_code
      USING ERRCODE = '23503';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_production_order_dispatches_unit_group ON production_order_dispatches;
CREATE TRIGGER trg_production_order_dispatches_unit_group
BEFORE INSERT OR UPDATE OF unit_code ON production_order_dispatches
FOR EACH ROW
EXECUTE FUNCTION sync_production_order_dispatch_unit_group();

UPDATE production_order_dispatches AS d
SET unit_group = pu.unit_group
FROM production_units AS pu
WHERE pu.code = d.unit_code
  AND d.unit_group IS DISTINCT FROM pu.unit_group;

ALTER TABLE production_order_dispatches
  ALTER COLUMN unit_group SET NOT NULL;

ALTER TABLE production_order_dispatches
  DROP CONSTRAINT IF EXISTS production_order_dispatches_unit_group_check;

ALTER TABLE production_order_dispatches
  ADD CONSTRAINT production_order_dispatches_unit_group_check
  CHECK (unit_group IN ('HAMMADDE', 'MAKINE'));

DROP INDEX IF EXISTS idx_production_order_dispatches_open_group_unique;
CREATE UNIQUE INDEX idx_production_order_dispatches_open_group_unique
ON production_order_dispatches (production_order_id, unit_group)
WHERE status IN ('pending', 'in_progress');

CREATE INDEX IF NOT EXISTS idx_production_order_dispatches_order_group_status
ON production_order_dispatches (production_order_id, unit_group, status, dispatched_at DESC);

INSERT INTO rbac_permissions (code, description)
VALUES
  ('production-orders:attachments:view', 'Uretim emri ek dosyalarini gorme ve acma yetkisi')
ON CONFLICT (code) DO UPDATE
SET description = EXCLUDED.description;

INSERT INTO rbac_role_permissions (role, permission_code)
VALUES
  ('admin', 'dashboard:view'),
  ('admin', 'production-orders:view'),
  ('admin', 'production-orders:create'),
  ('admin', 'production-orders:manage'),
  ('admin', 'production-orders:attachments:view'),
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
  ('production_manager', 'production-orders:attachments:view'),
  ('raw_preparation', 'production-orders:attachments:view'),
  ('raw_preparation', 'production-orders:incoming'),
  ('raw_preparation', 'production-orders:unit-task'),
  ('machine_operator', 'production-orders:incoming'),
  ('machine_operator', 'production-orders:unit-task')
ON CONFLICT (role, permission_code) DO NOTHING;
