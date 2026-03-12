# Depo/Stok v1

LAN ortamı için tasarlanmış, Next.js fullstack mimaride çalışan depo/stok uygulaması.

## Özellikler
- Username/password tabanlı custom auth + HTTPOnly session cookie
- RBAC: admin, production_manager, warehouse_manager
- Dashboard özet metrikleri
- Barkod üretimli stok kayıt (server-side sequence)
- Stok listeleme (server pagination + arama + filtre)
- Admin paneli kullanıcı yönetimi (CRUD + rol + aktif/pasif + şifre reset)
- Audit log + standard API error envelope + requestId

## Kurulum
1. `.env.example` dosyasını `.env` olarak kopyala ve değerleri doldur.
2. Bağımlılıkları kur (`pnpm` önerilir):
   - `pnpm install`
3. Migration çalıştır:
   - `DATABASE_URL=... ./scripts/run-migrations.sh`
4. İlk admin hesabı için hash üret:
   - `node scripts/hash-password.mjs <şifre>`
5. `db/bootstrap/01_first_admin_template.sql` içindeki placeholder değerleri doldurup çalıştır.
6. Uygulamayı başlat:
   - `pnpm dev`

## API uçları
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/session`
- `GET /api/dashboard/summary`
- `GET /api/stocks`
- `POST /api/stocks`
- `GET /api/admin/users`
- `POST /api/admin/users`
- `PATCH /api/admin/users/:id`
- `POST /api/admin/users/:id/reset-password`
- `DELETE /api/admin/users/:id`

## Skill/Rules
- `.agents/skills/depo-stok-workflow`
- `.agents/skills/depo-stok-domain`
- Proje tetikleyici kuralları: `AGENTS.md`

## Test
- `pnpm test`

## Quality
- Frontend/Next odaklı analiz:
  - `pnpm codehealth`
  - `pnpm codehealth:ai`
- Backend kalite kapıları:
  - `pnpm quality:backend` (API guard, migration güvenliği, SQL hijyen kontrolleri)
  - `pnpm quality:backend:strict` (typecheck + backend quality)
  - `pnpm lint:backend` (ESLint ile server dizinlerini lint eder)

## Performance Tuning (Polling)
- `NEXT_PUBLIC_CLIENT_POLL_INTERVAL_MS`: client polling temel aralığı (ms). Varsayılan `15000`.
- `API_READ_CACHE_TTL_MS`: `/api/audit/stream` ve `/api/stocks/recent` için server memory cache TTL (ms). Varsayılan `2000`.
- `LOG_NOISY_POLLING_ENDPOINTS`: `true` ise yüksek frekanslı polling endpoint info logları tekrar görünür.
