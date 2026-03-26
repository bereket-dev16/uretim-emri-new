# Üretim Emri Sistemi

LAN ortamında çalışan, yalnız üretim emri akışına odaklı Next.js fullstack uygulaması.

## Kapsam
- Custom auth + HttpOnly session cookie
- RBAC: `admin`, `production_manager`, `hat`
- Üretim emri oluşturma
- Aktif emir yönetimi
- Hat kullanıcıları için gelen emir / devam eden emir ekranları
- Admin kullanıcı yönetimi
- Supabase Storage üzerinden ek dosya yükleme

## Kurulum
1. `.env.example` dosyasını `.env` olarak kopyalayın.
2. Gerekli değişkenleri doldurun.
3. Bağımlılıkları kurun:
   - `pnpm install`
4. Migration çalıştırın:
   - `DATABASE_URL=... ./scripts/run-migrations.sh`
5. İlk admin hesabı için hash üretin:
   - `node scripts/hash-password.mjs <sifre>`
6. `db/bootstrap/01_first_admin_template.sql` içindeki placeholder alanları doldurup çalıştırın.
7. Uygulamayı başlatın:
   - `pnpm dev`

## Roller
- `admin`: tüm ekranlar ve admin paneli
- `production_manager`: dashboard, create, aktif emirler, biten emirler
- `hat`: gelen emirler, devam eden emirler

## Ana Route'lar
- `/dashboard`
- `/production-orders/create`
- `/production-orders`
- `/production-orders/completed`
- `/production-orders/incoming`
- `/production-orders/tasks`
- `/admin/users`

## API
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/session`
- `GET /api/dashboard/summary`
- `GET /api/production-orders`
- `POST /api/production-orders`
- `GET /api/production-orders/:id`
- `POST /api/production-orders/:id/dispatch`
- `POST /api/production-orders/:id/finish`
- `POST /api/production-orders/dispatches/:dispatchId/accept`
- `POST /api/production-orders/dispatches/:dispatchId/complete`
- `POST /api/production-orders/:id/attachments`
- `GET /api/production-orders/:id/attachments/:attachmentId`
- `GET /api/admin/users`
- `POST /api/admin/users`
- `PATCH /api/admin/users/:id`
- `POST /api/admin/users/:id/reset-password`
- `DELETE /api/admin/users/:id`

## Windows Docker Deploy
- Windows makinede repo klasörüne girin.
- Güncelleme sonrası:
  - `git pull`
  - `docker compose build --progress=plain`
  - `docker compose up -d`
- Kontrol:
  - `docker compose ps`
  - `docker compose logs web --tail 50`

## Doğrulama
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`

## Proje Kuralları
- Workflow ve teslim disiplini için: `.agents/skills/depo-stok-workflow`
- Domain kararları için: `.agents/skills/depo-stok-domain`
- UI yönü için: `.agents/skills/frontend-design`
