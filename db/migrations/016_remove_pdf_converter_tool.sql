DELETE FROM rbac_role_permissions
WHERE permission_code = 'tools:pdf-convert';

DELETE FROM rbac_permissions
WHERE code = 'tools:pdf-convert';
