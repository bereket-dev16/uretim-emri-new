# RBAC Matrix (v2)

## Roles
- admin
- production_manager
- warehouse_manager
- hat

## Permissions
- dashboard:view
- stocks:view
- stocks:create
- production-orders:view
- production-orders:create
- production-orders:delete
- production-orders:warehouse
- production-orders:monitor
- production-orders:unit-task
- admin:users:view
- admin:users:create
- admin:users:update
- admin:users:reset-password
- admin:users:delete

## Role to Permission Mapping
- admin: all permissions
- production_manager: dashboard:view, stocks:view, stocks:create, production-orders:view, production-orders:create, production-orders:delete, production-orders:monitor
- warehouse_manager: dashboard:view, stocks:view, stocks:create, production-orders:view, production-orders:create, production-orders:delete, production-orders:warehouse
- hat: production-orders:unit-task

## UI visibility rules
- Header içindeki "Admin Paneli" butonu sadece `admin` rolüne görünür.
- `hat` rolü stok ekranlarını görmez, varsayılan iniş sayfası `/production-orders/tasks` olur.
