ALTER TABLE production_order_dispatches
  ADD COLUMN IF NOT EXISTS box_count BIGINT,
  ADD COLUMN IF NOT EXISTS carton_count BIGINT,
  ADD COLUMN IF NOT EXISTS pallet_count BIGINT;

ALTER TABLE production_order_dispatches
  DROP CONSTRAINT IF EXISTS production_order_dispatches_box_count_check,
  DROP CONSTRAINT IF EXISTS production_order_dispatches_carton_count_check,
  DROP CONSTRAINT IF EXISTS production_order_dispatches_pallet_count_check;

ALTER TABLE production_order_dispatches
  ADD CONSTRAINT production_order_dispatches_box_count_check
    CHECK (box_count IS NULL OR box_count > 0),
  ADD CONSTRAINT production_order_dispatches_carton_count_check
    CHECK (carton_count IS NULL OR carton_count > 0),
  ADD CONSTRAINT production_order_dispatches_pallet_count_check
    CHECK (pallet_count IS NULL OR pallet_count > 0);
