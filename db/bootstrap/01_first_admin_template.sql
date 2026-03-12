-- First admin bootstrap template (manual SQL)
-- 1) Generate Argon2id hash outside DB (app-side), then replace {{PASSWORD_HASH}}
-- 2) Replace {{USERNAME}}

INSERT INTO users (username, password_hash, role, is_active)
VALUES ('admin', '$argon2id$v=19$m=19456,t=2,p=1$CZve++bIodhXSMXeBEs5fA$erQ8O1FxeXQS/xjGDYuKTs+kTpx7rn0h9Frqp/7yOWo', 'admin', TRUE)
ON CONFLICT (username) DO NOTHING;