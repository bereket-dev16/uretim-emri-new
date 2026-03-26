# Proje Özeti
- Uygulama artık yalnız üretim emri yönetimine odaklıdır.
- Akış: giriş -> dashboard -> üretim emri oluşturma -> aktif emir yönetimi -> hat kabul/tamamlama -> biten emir arşivi.
- Stok, audit canlı akışı ve depo özel modülleri kaldırılmıştır.

# Teknoloji Yığını
- TypeScript (strict)
- Next.js 15 App Router
- React 19
- PostgreSQL / Supabase
- `pg`
- Zod
- Argon2
- Tailwind CSS + Radix UI
- Vitest

# Mimari
- Modüler service pattern:
  - `src/app/api/*`: guard + validation + response
  - `src/modules/*`: iş kuralları
  - `src/shared/*`: db, security, validation, http, logging
- Protected sayfalar `requirePageSession` ile korunur.
- API route'ları `withApiHandler` kullanır.
- Polling tabanlı güncelleme korunur; realtime/websocket yoktur.

# Önemli Klasörler
- `src/app/(auth)`: login
- `src/app/(protected)`: dashboard, admin, production-orders
- `src/app/api`: auth, dashboard, users, production-orders
- `src/modules/auth`: giriş, oturum
- `src/modules/users`: kullanıcı yönetimi
- `src/modules/dashboard`: emir özet metrikleri
- `src/modules/production-orders`: üretim emri akışı
- `src/shared/storage`: Supabase Storage yardımcıları
- `db/migrations`: şema migration'ları
- `tasks`: proje hafızası

# Kodlama Kuralları
- Route handler içinde doğrudan iş kuralı yazılmaz; servis çağrılır.
- Yeni endpointlerde sıra:
  - `requireApiSession`
  - Zod validation
  - service call
  - standard JSON/error envelope
- `Role` yalnız:
  - `admin`
  - `production_manager`
  - `hat`
- Hat kullanıcılarında `hatUnitCode` zorunludur.
- Üretim emri aynı anda tek açık dispatch ile ilerler.
- `production_order_dispatches` içinde aynı birime ikinci kez gönderim yapılamaz.

# Kritik Bileşenler
- Auth:
  - `src/modules/auth/service.ts`
- RBAC:
  - `src/modules/rbac/constants.ts`
  - `src/modules/rbac/service.ts`
- Production Orders:
  - `src/modules/production-orders/service.ts`
  - `src/components/production-orders/*`
- Dashboard:
  - `src/modules/dashboard/service.ts`
- Admin Users:
  - `src/modules/users/service.ts`

# Geliştirme Kuralları
- Büyük değişiklikte önce `tasks/todo.md` güncellenir.
- İş bitince review notu eklenir.
- Yeni kritik kararlar `tasks/lessons.md` ve gerekirse bu dosyada tutulur.
- Teslim öncesi:
  - `pnpm typecheck`
  - `pnpm test`
  - `pnpm build`

# AI Çalışma Rehberi
- Önce bu dosyayı ve ilgili task notlarını oku.
- Sonra etkilenen modülü belirle.
- UI değişiminde `frontend-design`, akış değişiminde `depo-stok-workflow`, domain kararında `depo-stok-domain` kullan.
- Eski stok/audit/depo varsayımlarını geri getirme.
- Hat kullanıcıları için yalnız kendi birim ekranlarını açık tut.

## Perfect Prompt Template
Context:
(ai-context.md içinden kısa özet)

Goal:
(istenen görev)

Constraints:
(bozulmaması gereken kurallar)

Relevant Code:
(ilgili dosyalar/modüller)

Expected Output:
(istenen teslim biçimi)
