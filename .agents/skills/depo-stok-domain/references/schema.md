# Data Schema Snapshot

## users
- id (uuid, pk)
- username (unique)
- password_hash
- role (admin | production_manager | warehouse_manager | tablet1)
- is_active
- last_login_at
- created_at
- updated_at

## sessions
- id (uuid, pk)
- user_id (fk -> users)
- token_hash (unique)
- last_seen_at
- expires_at
- revoked_at
- ip
- user_agent
- created_at

## stocks
- id (uuid, pk)
- irsaliye_no
- product_name
- quantity_numeric
- quantity_unit (gr | adet)
- product_type (kutu | blister_folyo | sase_folyo | prospektus | sise | etiket | kapak | sleeve)
- product_category (sarf | hammadde)
- stock_entry_date (date)
- pvc_unlimited
- barcode_serial (unique)
- barcode_no (format: B + 10 hane)
- combined_code (irsaliye_no + '-' + barcode_no)
- created_by (fk -> users)
- created_by_role (role_type)
- created_at

## audit_logs
- id (uuid, pk)
- actor_user_id (nullable fk -> users)
- action_type
- entity_type
- entity_id
- payload_json
- request_id
- created_at

## production_orders
- id (uuid, pk)
- order_date (date)
- order_no (varchar, unique)
- customer_name (varchar)
- market_scope (ihracat | ic_piyasa)
- demand_source (numune | musteri_talebi | stok)
- order_quantity (varchar)
- deadline_date (date)
- final_product_name (varchar)
- packaging_type (kapsul | tablet | sivi | sase | softjel)
- total_amount_text (varchar)
- dispatch_unit_code (DEPO | TABLET1 | TABLET2 | BOYA | KAPSUL | BLISTER1 | BLISTER2 | PAKET)
- created_by (fk -> users)
- created_by_role (role_type)
- created_at
- updated_at

## production_order_materials
- id (uuid, pk)
- production_order_id (fk -> production_orders)
- material_product_type (varchar)
- material_name (varchar)
- material_quantity_text (varchar)
- is_available (boolean)
- checked_by (nullable fk -> users)
- checked_at (nullable timestamptz)
- created_at
- updated_at

## production_order_dispatches
- id (uuid, pk)
- production_order_id (fk -> production_orders)
- unit_code (DEPO | TABLET1 | TABLET2 | BOYA | KAPSUL | BLISTER1 | BLISTER2 | PAKET)
- status (pending | in_progress | completed)
- dispatched_by (fk -> users)
- dispatched_at (timestamptz)
- accepted_by (nullable fk -> users)
- accepted_at (nullable timestamptz)
- completed_by (nullable fk -> users)
- completed_at (nullable timestamptz)
- created_at
- updated_at
- unique (production_order_id, unit_code)
