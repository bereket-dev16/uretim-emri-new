-- Remove legacy soft-deleted stock rows before hard-delete policy.
DELETE FROM stocks
WHERE deleted_at IS NOT NULL;

-- Keep previously soft-deleted users inactive after dropping deleted_at.
UPDATE users
SET is_active = FALSE,
    updated_at = NOW()
WHERE deleted_at IS NOT NULL;

DROP INDEX IF EXISTS idx_stocks_deleted_at;
DROP INDEX IF EXISTS idx_users_deleted_at;

ALTER TABLE stocks
DROP COLUMN IF EXISTS deleted_at;

ALTER TABLE users
DROP COLUMN IF EXISTS deleted_at;
