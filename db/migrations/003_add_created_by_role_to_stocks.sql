ALTER TABLE stocks
ADD COLUMN IF NOT EXISTS created_by_role role_type;

UPDATE stocks s
SET created_by_role = u.role
FROM users u
WHERE s.created_by = u.id
  AND s.created_by_role IS NULL;

ALTER TABLE stocks
ALTER COLUMN created_by_role SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_stocks_created_by_role ON stocks(created_by_role);
