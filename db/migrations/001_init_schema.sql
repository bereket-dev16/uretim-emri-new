CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'role_type') THEN
    CREATE TYPE role_type AS ENUM ('admin', 'production_manager', 'warehouse_manager', 'tablet1');
  END IF;
END $$;

CREATE SEQUENCE IF NOT EXISTS barcode_serial_seq START 1 INCREMENT 1;

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(64) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role role_type NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_login_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  token_hash CHAR(64) NOT NULL UNIQUE,
  last_seen_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  ip INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  irsaliye_no VARCHAR(64) NOT NULL,
  product_name VARCHAR(120) NOT NULL,
  quantity_numeric NUMERIC(14, 3) NOT NULL CHECK (quantity_numeric > 0),
  quantity_unit VARCHAR(16) NOT NULL CHECK (quantity_unit IN ('gr', 'adet')),
  product_type VARCHAR(32) NOT NULL CHECK (product_type IN ('kutu', 'blister_folyo', 'sase_folyo', 'prospektus', 'sise', 'etiket', 'kapak', 'sleeve')),
  product_category VARCHAR(16) NOT NULL CHECK (product_category IN ('sarf', 'hammadde')),
  stock_entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  pvc_unlimited BOOLEAN NOT NULL DEFAULT FALSE,
  barcode_serial BIGINT NOT NULL UNIQUE,
  barcode_no VARCHAR(16) NOT NULL UNIQUE,
  combined_code VARCHAR(96) NOT NULL,
  created_by UUID NOT NULL REFERENCES users(id),
  created_by_role role_type NOT NULL,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id UUID REFERENCES users(id),
  action_type VARCHAR(100) NOT NULL,
  entity_type VARCHAR(100) NOT NULL,
  entity_id UUID,
  payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  request_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rbac_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(100) NOT NULL UNIQUE,
  description TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS rbac_role_permissions (
  role role_type NOT NULL,
  permission_code VARCHAR(100) NOT NULL REFERENCES rbac_permissions(code) ON DELETE CASCADE,
  PRIMARY KEY (role, permission_code)
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON users(deleted_at);

CREATE INDEX IF NOT EXISTS idx_sessions_token_hash ON sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

CREATE INDEX IF NOT EXISTS idx_stocks_created_at_desc ON stocks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stocks_irsaliye_no ON stocks(irsaliye_no);
CREATE INDEX IF NOT EXISTS idx_stocks_product_name ON stocks(product_name);
CREATE INDEX IF NOT EXISTS idx_stocks_product_type ON stocks(product_type);
CREATE INDEX IF NOT EXISTS idx_stocks_product_category ON stocks(product_category);
CREATE INDEX IF NOT EXISTS idx_stocks_stock_entry_date ON stocks(stock_entry_date);
CREATE INDEX IF NOT EXISTS idx_stocks_barcode_serial ON stocks(barcode_serial);
CREATE INDEX IF NOT EXISTS idx_stocks_created_by_role ON stocks(created_by_role);
CREATE INDEX IF NOT EXISTS idx_stocks_deleted_at ON stocks(deleted_at);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at_desc ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_user_id ON audit_logs(actor_user_id);

CREATE OR REPLACE FUNCTION set_updated_at_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION set_updated_at_timestamp();
