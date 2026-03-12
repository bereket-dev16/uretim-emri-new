-- Tablet1 default user bootstrap (manual SQL)
-- Username: tablet1
-- Password: 123456

INSERT INTO users (username, password_hash, role, is_active)
VALUES (
  'tablet1',
  '$argon2id$v=19$m=19456,t=2,p=1$O7qCSrnY5Avsuu/36BQl/g$umr2HlBOVC9MqfNvGi1YYxwNSnFJIHAhzrfDrm/M+8s',
  'tablet1',
  TRUE
)
ON CONFLICT (username) DO NOTHING;
