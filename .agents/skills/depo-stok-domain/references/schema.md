# Data Schema Snapshot

## users
- id (uuid, pk)
- username (unique)
- password_hash
- role (admin | production_manager | raw_preparation | machine_operator)
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
- total_packaging_quantity (bigint)
- color (varchar)
- mold_text (varchar)
- has_prospectus (boolean)
- note_text (text, nullable)
- planned_raw_unit_code (TOZ_KARISIM | SIVI_KARISIM | SOFTJEL)
- planned_machine_unit_code (DEPO | TABLET1 | TABLET2 | BOYA | KAPSUL | BLISTER1 | BLISTER2 | PAKET, nullable)
- created_by (fk -> users)
- status (active | completed)
- created_at
- updated_at

## production_order_attachments
- id (uuid, pk)
- production_order_id (fk -> production_orders, cascade)
- storage_path (unique)
- original_filename
- mime_type (image/png | image/jpeg | image/jpg | image/webp | image/gif | image/bmp)
- size_bytes
- uploaded_by (fk -> users)
- created_at

## production_order_dispatches
- id (uuid, pk)
- production_order_id (fk -> production_orders)
- unit_code (TOZ_KARISIM | SIVI_KARISIM | SOFTJEL | DEPO | TABLET1 | TABLET2 | BOYA | KAPSUL | BLISTER1 | BLISTER2 | PAKET)
- unit_group (HAMMADDE | MAKINE)
- status (pending | in_progress | completed)
- dispatched_by (fk -> users)
- dispatched_at (timestamptz)
- accepted_by (nullable fk -> users)
- accepted_at (nullable timestamptz)
- completed_by (nullable fk -> users)
- completed_at (nullable timestamptz)
- reported_output_quantity (bigint, nullable)
- box_count (bigint, nullable; PAKET ve DEPO tamamlamada zorunlu)
- carton_count (bigint, nullable; PAKET ve DEPO tamamlamada zorunlu)
- pallet_count (bigint, nullable; DEPO tamamlamada zorunlu)
- created_at
- updated_at
- unique (production_order_id, unit_code)
