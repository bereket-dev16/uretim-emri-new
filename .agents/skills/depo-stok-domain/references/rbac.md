# RBAC Matrix (v2)

## Roles
- admin
- production_manager
- raw_preparation
- machine_operator

## Permissions
- dashboard:view
- production-orders:view
- production-orders:create
- production-orders:manage
- production-orders:attachments:view
- production-orders:incoming
- production-orders:unit-task
- admin:users:view
- admin:users:create
- admin:users:update
- admin:users:reset-password
- admin:users:delete

## Role to Permission Mapping
- admin: all permissions
- production_manager: dashboard:view, production-orders:view, production-orders:create, production-orders:manage, production-orders:attachments:view
- raw_preparation: production-orders:attachments:view, production-orders:incoming, production-orders:unit-task
- machine_operator: production-orders:incoming, production-orders:unit-task

## UI visibility rules
- Header içindeki "Admin Paneli" butonu sadece `admin` rolüne görünür.
- `raw_preparation` ve `machine_operator` rolleri yönetim ekranlarını görmez, varsayılan iniş sayfası `/production-orders/incoming` olur.
