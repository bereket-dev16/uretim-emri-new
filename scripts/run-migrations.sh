#!/usr/bin/env bash
set -euo pipefail

if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL is required"
  exit 1
fi

if command -v psql >/dev/null 2>&1; then
  psql "$DATABASE_URL" -f db/migrations/001_init_schema.sql
  psql "$DATABASE_URL" -f db/migrations/002_seed_rbac.sql
  psql "$DATABASE_URL" -f db/migrations/003_add_created_by_role_to_stocks.sql
  psql "$DATABASE_URL" -f db/migrations/004_add_stock_category_and_entry_date.sql
  psql "$DATABASE_URL" -f db/migrations/005_add_production_order_permissions.sql
  psql "$DATABASE_URL" -f db/migrations/006_remove_soft_delete_policy.sql
  psql "$DATABASE_URL" -f db/migrations/007_production_orders_workflow.sql
  psql "$DATABASE_URL" -f db/migrations/008_seed_tablet1_user.sql
  psql "$DATABASE_URL" -f db/migrations/009_hat_role_and_production_units.sql
  psql "$DATABASE_URL" -f db/migrations/010_seed_hat_role_permissions.sql
  psql "$DATABASE_URL" -f db/migrations/011_add_production_order_delete_permission.sql
  psql "$DATABASE_URL" -f db/migrations/012_production_orders_reset.sql
  psql "$DATABASE_URL" -f db/migrations/013_make_machine_unit_optional.sql
  psql "$DATABASE_URL" -f db/migrations/014_parallel_dispatch_roles_and_notes.sql
  psql "$DATABASE_URL" -f db/migrations/015_allow_multi_batch_dispatches.sql
  psql "$DATABASE_URL" -f db/migrations/016_remove_pdf_converter_tool.sql
  psql "$DATABASE_URL" -f db/migrations/017_add_dispatch_completion_counts.sql
else
  node scripts/run-migrations.mjs
fi

echo "Migrations completed."
