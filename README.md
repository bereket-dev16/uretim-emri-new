# Üretim Emri Sistemi

LAN ortamında çalışan, yalnız üretim emri akışına odaklı Next.js fullstack uygulaması.

## Kapsam
- Custom auth + HttpOnly session cookie
- RBAC: `admin`, `production_manager`, `raw_preparation`, `machine_operator`
- Üretim emri oluşturma
- Aktif emir yönetimi
- Operatör kullanıcıları için gelen emir / devam eden emir ekranları
- Admin kullanıcı yönetimi
- Supabase Storage üzerinden PDF ve görsel ek dosya yükleme
- Word/Excel için ayrı PDF dönüştürme aracı

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
8. Word/Excel -> PDF aracı kullanacaksanız ayrı converter servisini de başlatın:
   - `pnpm converter:dev`

## Roller
- `admin`: tüm ekranlar ve admin paneli
- `production_manager`: dashboard, create, PDF aracı, aktif emirler, biten emirler
- `raw_preparation`: gelen emirler, devam eden emirler, PDF attachment görüntüleme
- `machine_operator`: gelen emirler, devam eden emirler

## Ana Route'lar
- `/dashboard`
- `/production-orders/create`
- `/production-orders`
- `/production-orders/completed`
- `/production-orders/incoming`
- `/production-orders/tasks`
- `/tools/pdf-convert`
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
- `POST /api/tools/pdf-convert`
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
  - `docker compose logs converter --tail 50`

## Gercekci Benchmark
Amac, paralel spam yerine rol-bazli ve kuyruklu oturumlarla cekirdek uretim emri akisina yuk bindirmektir.

### 1. Benchmark kullanicilarini ve backlog verisini hazirlayin
- `corepack pnpm bench:prepare -- --prefix BENCH --totalUsers 30 --backlogOrders 24`
- Cikti dosyasi varsayilan olarak `scripts/benchmark-user-sessions.sample.json` olur.
- Script tum birimler icin benchmark kullanicilarini idempotent sekilde olusturur/gunceller ve uzun bekleyen backlog emirleri ekler.

### 2. Windows Docker ortaminda benchmark'i kosun
- `corepack pnpm bench:flow -- --usersFile scripts/benchmark-user-sessions.sample.json --sessions 30 --durationSec 300 --rampUpSec 20 --baseUrl http://192.168.X.X:3000`
- `baseUrl` olarak Windows Docker uygulamasinin LAN adresini verin.
- Runner su metrikleri raporlar:
  - toplam istek / hata sayisi
  - endpoint bazli `P50 / P95 / P99`
  - `create`, `dispatch`, `accept`, `complete`, `finish` basari oranlari
  - backlog altinda ilk kabul ve is adimi gecikmeleri

### 3. Test verisini temizleyin
- `corepack pnpm bench:cleanup -- --prefix BENCH`
- veya
- `corepack pnpm bench:cleanup -- --usersFile scripts/benchmark-user-sessions.sample.json`

### Senaryo modeli
- `production_manager` kullanicilari belli araliklarla yeni emir acar, uygun oldugunda sonraki sevki yapar ve tum gruplar kapaninca emri bitirir.
- `raw_preparation` ve `machine_operator` kullanicilari kendi ekranlarini poll eder, kimi emri hemen kabul eder, kimi kontrollu bekletir ve is bitince `complete` aksiyonunu yollar.
- Backlog verisi bilerek beklemede birakildigi icin liste buyumesi altinda sorgu davranisi da olculur.

## Doğrulama
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`

## Proje Kuralları
- Workflow ve teslim disiplini için: `.agents/skills/depo-stok-workflow`
- Domain kararları için: `.agents/skills/depo-stok-domain`
- UI yönü için: `.agents/skills/frontend-design`
