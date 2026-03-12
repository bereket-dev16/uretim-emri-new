# Proje Özeti
- LAN ortamında çalışan, depo/stok/üretim emri yönetimi odaklı Next.js fullstack uygulaması.
- Temel akışlar: giriş (username/şifre), dashboard, stok kayıt/liste, admin kullanıcı yönetimi, canlı audit akışı.
- Üretim emri akışı kalıcıdır: oluşturma (preview + yazdır + DB kayıt), kart bazlı listeleme, depo gelen emirleri yönetimi, birim görev ekranı, süreç takip paneli.

# Teknoloji Yığını
- Dil: TypeScript (strict)
- Framework: Next.js 15 (App Router, Route Handlers), React 19
- Veritabanı: PostgreSQL (Supabase Cloud üzerinde çalışacak şekilde yapılandırılmış)
- DB erişimi: `pg` (server-side pool + transaction helper)
- Doğrulama: Zod
- Güvenlik: Argon2 parola hash, custom session token (HttpOnly cookie)
- UI: Tailwind CSS + Radix UI + custom UI components
- Test: Vitest (unit/integration/concurrency + smoke e2e)
- Operasyon scriptleri: migration/seed/benchmark/quality scriptleri (`scripts/`)

# Mimari
- Yaklaşım: modüler katmanlı mimari + service pattern.
- Route handlers (`src/app/api/*`) sadece:
  - auth/permission guard,
  - request parse/validation,
  - service çağrısı,
  - standart response.
- İş kuralları `src/modules/*/service.ts` içinde.
- Ortak altyapı `src/shared/*` altında (db, security, validation, logging, errors, http).
- App Router protected/auth route grupları:
  - `(auth)`: login
  - `(protected)`: dashboard, stocks, admin, production-orders (create/list/warehouse/monitor/tasks)

# Önemli Klasörler
- `src/app/`: sayfalar + API route handler dosyaları.
- `src/modules/`: domain bazlı servisler (`auth`, `stocks`, `users`, `dashboard`, `audit`, `rbac`, `production-orders`).
- `src/shared/`: ortak teknik katmanlar:
  - `db/`: pool + transaction
  - `security/`: session/password/guard
  - `validation/`: zod şemaları
  - `http/`: `withApiHandler`, hata zarfı
  - `logging/`: requestId + log
- `src/components/`: UI bileşenleri (auth/admin/stocks/live/production-orders/ui).
- `db/migrations/`: şema ve seed SQL dosyaları (`007_production_orders_workflow.sql`, `008_seed_tablet1_user.sql` dahil).
- `db/bootstrap/`: ilk admin SQL şablonu.
- `tasks/`: süreç hafızası (`todo.md`, `lessons.md`).
- `.agents/skills/`: proje workflow/domain skill dosyaları.

# Kodlama Kuralları
- API tarafında `withApiHandler` kullanılmalı; hata zarfı ve `x-request-id` korunmalı.
- Korumalı endpointlerde `requireApiSession` + gerekli permission kontrolü zorunlu.
- Sayfa tarafında protected route için `requirePageSession` kullanılmalı.
- Rol bazlı varsayılan iniş sayfası `getDefaultHomePathForRole` ile belirlenmeli (`hat` -> `/production-orders/tasks`, `tablet1` legacy uyumlulukta tutulur).
- Input doğrulama Zod ile yapılmalı (`src/shared/validation/*`).
- DB erişimi doğrudan route içinde değil, modül servislerinden yürütülmeli.
- Tip dönüşümleri servis katmanında normalize edilmeli (özellikle `Date` -> ISO string).
- Listeleme server-side yapılmalı (stocks pageSize sabit 10).
- Stok silme politikası hard delete; eski soft-delete varsayımı kaldırıldı.
- Canlı akış bileşenleri mount sonrası render edilir (`isMounted` gate) ve polling görünmez sekmede durur.
- Polling performansı için client tarafında jitter'lı interval kullanılmalı (varsayılan `NEXT_PUBLIC_CLIENT_POLL_INTERVAL_MS=15000`).
- Sık okunan endpointlerde kısa TTL memory cache kullanılmalı (`API_READ_CACHE_TTL_MS`) ve polling log gürültüsü varsayılan azaltılmalı.

# Kritik Bileşenler
- Auth:
  - `src/modules/auth/service.ts`
  - Session cache + sliding expiration (idle timeout hedefi 8 saat).
- RBAC:
  - `src/modules/rbac/constants.ts`, `src/modules/rbac/service.ts`
  - Roller: `admin`, `production_manager`, `warehouse_manager`, `hat` (legacy: `tablet1`).
- Stocks:
  - `src/modules/stocks/service.ts`
  - Barkod server-side sequence (`B` + 10 hane), filtreli/paginated listeleme.
- Production Orders:
  - `src/modules/production-orders/service.ts`
  - API: `src/app/api/production-orders/*`
  - Paneller: `create`, `list`, `warehouse`, `monitor`, `tasks`
  - Silme endpointi: `DELETE /api/production-orders/:id` (hard-delete + audit)
  - Tüm production-order panellerinde visibility-aware polling ile cross-client anlık senkronizasyon kullanılır.
  - Durum akışı: `pending -> in_progress -> completed`
- Admin Users:
  - kullanıcı CRUD, rol/aktiflik/şifre reset endpointleri.
- Audit:
  - `audit_logs` yazımı + `GET /api/audit/stream` canlı akış.
- Dashboard:
  - özet KPI endpointi ve UI kartları.

# Geliştirme Kuralları
- İşe başlamadan `tasks/todo.md` planı güncellenmeli; bitince Review yazılmalı.
- Kullanıcı düzeltmesi sonrası `tasks/lessons.md` güncellenmeli.
- İş kuralı değişiminde RBAC + schema + API kontratı birlikte kontrol edilmeli.
- Yeni endpointlerde:
  - permission matrisi,
  - validation,
  - audit etkisi,
  - error envelope uyumu
  birlikte ele alınmalı.
- Büyük değişikliklerde `typecheck` + `test` çalıştırılmalı; mümkünse `build` ile doğrulama yapılmalı.

# AI Çalışma Rehberi
- Önce görevin etkilediği modülü ve sözleşmeyi belirle (`modules`, `shared/validation`, `api route`).
- Domain kuralı varsa `.agents/skills/depo-stok-domain` referanslarını kontrol et.
- Süreç disiplini için `.agents/skills/depo-stok-workflow` + `tasks/*` dosyalarını güncel tut.
- Kod değişikliğinde minimum etki alanı ile ilerle; mevcut davranışı bozma.
- Güvenlik/izin/doğrulama zincirini kırma:
  - guard -> validation -> service -> error envelope.
- Uzun konuşmalarda önce bu dosyayı okuyup devam et; yeni kritik kararları buraya işle.

## Perfect Prompt Template
Context:
(ai-context.md dosyasından kısa proje özeti)

Goal:
(geliştiricinin yapmak istediği görev)

Constraints:
(bozulmaması gereken kurallar)

Relevant Code:
(görevle ilgili kod parçaları)

Expected Output:
(cevabın nasıl formatlanması gerektiği)
