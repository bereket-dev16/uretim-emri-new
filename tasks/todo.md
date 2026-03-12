# Depo/Stok v1 Implementation TODO

## Plan
- [x] Proje iskeleti kur (Next.js App Router + TS strict + temel config)
- [x] `tasks/lessons.md` ve görev yönetim dosyalarını ekle
- [x] Supabase Postgres uyumlu migration ve RBAC seed dosyalarını oluştur
- [x] Custom auth + session cookie + route/API guard mekanizmasını uygula
- [x] Admin paneli kullanıcı CRUD + rol + aktif/pasif + reset password akışını tamamla
- [x] Stok kayıt (barkod seri üretimi) + stok listeleme (server pagination/filter/search) akışını tamamla
- [x] Dashboard özet metriklerini oluştur
- [x] Audit log ve merkezi API hata zarfı + requestId loglamayı devreye al
- [x] Docker Compose deploy paketini hazırla
- [x] Skill/rules context paketini (`depo-stok-workflow`, `depo-stok-domain`) oluştur
- [x] Test iskeletlerini (unit/integration/e2e/concurrency) ekle

## Review
- API sözleşmeleri planla uyumlu endpointlerle eklendi.
- Session timeout 8 saat idle + sliding yaklaşımı uygulandı.
- Barkod formatı `B` + 10 hane server-side sequence ile üretildi.
- Soft delete kullanıcı ve stok için korundu.
- RBAC tablosu seed ve runtime cache ile çalışacak şekilde tasarlandı.
- Ağa erişim kısıtı nedeniyle bağımlılık kurulumu ve test çalıştırması bu ortamda doğrulanamadı.

## Iteration: Frontend Design Skill Integration
### Plan
- [x] `frontend-design` skill'ini repoya kur ve kalıcı skill listesine ekle
- [x] Global tasarım tokenlarını skill yönüne göre güncelle
- [x] Header, login ve dashboard yüzeylerini yeni görsel dile taşı
- [x] Typecheck + test + build doğrulamasını çalıştır

### Review
- `frontend-design` skill'i `.agents/skills/frontend-design` altına kuruldu ve `AGENTS.md` içine eklendi.
- Uygulama light tema içinde daha belirgin bir "editorial operations" diliyle yeniden kurgulandı.
- Header ve login yüzeyi yeni tipografi, daha net navigasyon ve markalı yüzeylerle güncellendi.
- Dashboard hero, KPI kartları ve aksiyon yüzeyi daha güçlü bir operasyon panosu diline taşındı.
- `corepack pnpm typecheck`, `corepack pnpm test`, `corepack pnpm build` başarılı.
- Navigasyonda active link hesabı en uzun eşleşen href mantığına çevrilerek parent/child çakışması giderildi.
- Dashboard üzerindeki teknik/gereksiz metin blokları kaldırıldı; sayfa daha minimal bir özet + aksiyon düzenine indirildi.

## Iteration: Minimal UX Sweep
### Plan
- [x] Stok, admin ve üretim emri sayfaları için ortak sayfa iskeleti kur
- [x] Başlık/açıklama/aksiyon alanlarını sadeleştir ve tekrar eden gürültüyü kaldır
- [x] Çift katmanlı kart hissi oluşturan stok ve admin yüzeylerini hafiflet
- [x] Typecheck + test + build doğrulaması yap

### Review
- `PageIntro` ve `SectionPanel` ile ortak, sade ve okunabilir bir sayfa düzeni eklendi.
- `stocks`, `stocks/create`, `admin/users`, `production-orders/*` sayfaları aynı UX ritmine taşındı.
- Stok formu ve tablolarındaki dış kart kabukları kaldırılarak içerik daha pratik ve az gürültülü hale getirildi.
- Üretim emri kartları yeni yüzey diliyle hizalandı; boş durumlar ve detay blokları sadeleştirildi.
- `corepack pnpm typecheck`, `corepack pnpm test`, `corepack pnpm build` başarılı.

## Iteration: Minimal Detail Pass
### Plan
- [x] Stok tablo satırlarında anlaşılabilirlik ve minimal görünümü iyileştir
- [x] Üretim emri detay bloklarını ortak, sade bileşenlere taşı
- [x] Ham rol kodları yerine kullanıcı dostu etiketler göster
- [x] Typecheck + test + build doğrulaması yap

### Review
- `OrderDetailBlocks` ile üretim emri detayları tablo yerine sade kart/grid yapısına taşındı.
- `ProductionOrderCardList`, `WarehouseIncomingPanel` ve `ProductionUnitTasksPanel` artık aynı detay bloklarını kullanıyor.
- Stok ekranlarında `createdByRole` değerleri artık Türkçe etiketle gösteriliyor.
- `StocksTableRow` ve `RecentStocksTable` daha sade başlık ve etiketlerle hizalandı.
- `corepack pnpm typecheck`, `corepack pnpm test`, `corepack pnpm build` başarılı.

## Iteration: Mobile Card Fallback
### Plan
- [x] Stok takip ekranı için mobil kart görünüm fallback ekle
- [x] Admin kullanıcı listesi için mobil kart görünüm fallback ekle
- [x] Mobil fallback içinde masaüstündeki düzenleme/silme/kaydet akışlarını koru
- [x] Typecheck + test + build doğrulaması yap

### Review
- `StocksMobileCard` ile küçük ekranda stok kayıtları kart olarak düzenlenip yönetilebilir hale geldi.
- `UsersMobileCard` ile admin kullanıcı listesi küçük ekranda kart akışına taşındı.
- Masaüstünde tablo görünümü korunurken küçük ekranda otomatik kart fallback kullanılıyor.
- `corepack pnpm typecheck`, `corepack pnpm test`, `corepack pnpm build` başarılı.

## Iteration: Mobile Detail Density Reduction
### Plan
- [x] Üretim emri kartlarında mobil için bölüm bazlı özet/detay yapısı kur
- [x] Genel bilgi, malzeme ve sevk/görev bölümlerini mobilde ayrı açılır bloklara taşı
- [x] Küçük ekranda önce özet, istenince detay göster mantığını uygula
- [x] Typecheck + test + build doğrulaması yap

### Review
- `ResponsiveDetailSection` ile üretim emri detayları mobilde başlık + kısa özet + açılır içerik düzenine geçti.
- `ProductionOrderCardList`, `WarehouseIncomingPanel` ve `ProductionUnitTasksPanel` küçük ekranda daha az yoğun görünüyor.
- Masaüstünde tüm detaylar açık kalırken mobilde içerik kademeli açılıyor.
- `corepack pnpm typecheck`, `corepack pnpm test`, `corepack pnpm build` başarılı.

## Iteration: Compact Production Order Headers
### Plan
- [x] Üretim emri kart başlıklarını ortak bileşene taşı
- [x] Mobilde başlık altında chip tabanlı kısa özet düzeni kur
- [x] Aksiyon butonlarını küçük ekranda daha temiz bir dikey akışa taşı
- [x] Typecheck + test + build doğrulaması yap

### Review
- `ProductionOrderCardHeader` ile üretim emri kart başlıkları ortaklaştırıldı.
- Müşteri, son ürün, iş emri, termin ve özet bilgiler artık daha kompakt chip düzeninde gösteriliyor.
- Aksiyon butonları küçük ekranda tam genişlikte daha okunaklı akıyor.
- `corepack pnpm typecheck`, `corepack pnpm test`, `corepack pnpm build` başarılı.

## Iteration: Stocks Split + Filters
### Plan
- [x] `/stocks` sayfasını sadece takip tablosu olacak şekilde ayır
- [x] `/stocks/create` sayfasını ekle (form + son 5 kayıt)
- [x] `stock_entry_date` ve `product_category` için migration + init schema güncellemesi ekle
- [x] Ürün tipi değerlerini yeni listeye taşı ve doğrulama/UI sözleşmesini hizala
- [x] Stok takip filtresine role/productType/productCategory/date ekle
- [x] Sayfa boyutunu sabit 10 yap ve pagination linklerini bu kurala göre koru
- [x] Header ve dashboard aksiyon linklerini yeni route yapısına göre güncelle
- [x] Domain referans dosyalarını (`schema.md`, `api-contracts.md`) yeni kurallara göre güncelle
- [x] Typecheck ve testleri çalıştır, review notlarını ekle

### Review
- [x] Uygulama davranışı doğrulandı
- [x] Tip/test doğrulaması tamamlandı
- [x] Performans gecikmesi için teknik açıklama notu hazırlandı
- `/stocks/create` eklendi; form ve son 5 kayıt ayrı ekrana taşındı.
- `/stocks` artık sadece takip ekranı; role/ürün tipi/kategori/tarih filtreleri eklendi.
- Sayfa boyutu schema seviyesinde 10’a sabitlendi; pagination linkleri filtreleri koruyor.
- `004_add_stock_category_and_entry_date.sql` ile mevcut DB yeni alanlara taşındı.
- `npm run typecheck`, `npm run test`, `npm run build` başarılı.

## Iteration: CodeHealth A11y Labels
### Plan
- [x] CodeHealth tarafından işaretlenen form input/select alanlarına `aria-label` ekle
- [x] Davranış değişmeden yalnız erişilebilirlik işaretlemelerini güncelle
- [ ] Kullanıcının yerel ortamında CodeHealth raporunu tekrar alarak warning düşüşünü doğrula

### Review
- `UsersAdminPanel`, `LoginForm`, `StockCreateForm`, `StocksTable`, `stocks/page` dosyalarındaki form kontrolleri etiketlendi.
- Lokal testte `typecheck` doğrulaması tamamlandı.

## Iteration: CodeHealth Performance Refactor
### Plan
- [x] `UsersAdminPanel` için `useReducer` tabanlı state yönetimi kur
- [x] `UsersAdminPanel` JSX'i alt bileşenlere böl (create form + row/table)
- [x] `StocksTable` için `useReducer` tabanlı state hook'u kur
- [x] `StocksTable` satır renderını ayrı bileşene taşı
- [x] `effect-set-state` uyarısını tek reducer action sync modeline çevir
- [x] Typecheck ve test doğrulamasını çalıştır
- [ ] Kullanıcının yerel ortamında `codehealth` taramasını tekrar alıp warning düşüşünü doğrula

### Review
- `UsersAdminPanel` state ve side-effect akışları `useUsersAdminPanel` hook'una taşındı.
- `StocksTable` state akışı `useStocksTableState` reducer hook'u ile tek kaynaktan yönetilir hale getirildi.
- Satır JSX'i `StocksTableRow` bileşenine taşınarak ana component karmaşıklığı düşürüldü.
- `npm run typecheck` ve `npm run test` başarılı.

## Iteration: Backend Quality Gates
### Plan
- [x] Backend kalite kontrol scripti ekle (`scripts/check-backend-quality.mjs`)
- [x] `package.json` scriptlerine backend quality komutlarını bağla
- [x] README içine backend kalite komutlarını dokümante et
- [x] `quality:backend` ve `quality:backend:strict` komutlarını çalıştırarak doğrula

### Review
- API route'larda `withApiHandler` ve `requireApiSession` zorunluluk kontrolleri eklendi.
- SQL/migration güvenlik kontrolleri (hard delete, drop table, truncate) eklendi.
- `quality:backend` çalıştı: error yok, 2 adet template interpolation warning raporlandı.

## Iteration: UI Modernization (Light Theme)
### Plan
- [x] Global tasarım tokenlarını ve temel light tema atmosferini güncelle
- [x] Header, dashboard ve login ekranlarını modern görsel dile taşı
- [x] Stok giriş/takip ve admin tablolarını daha profesyonel görsel stile geçir
- [x] Arayüz değişikliği sonrası typecheck + test doğrulaması yap

### Review
- [x] Görsel modernizasyon tamamlandı
- [x] Doğrulama tamamlandı
- Global light tema değişkenleri, arka plan atmosferi ve odak/ring sistemi yenilendi.
- Login ekranı iki kolonlu modern giriş paneline taşındı.
- Header, dashboard KPI kartları ve aksiyon butonları yeniden tasarlandı.
- Stok ve admin ekranlarındaki form/table/pagination/modal stilleri profesyonel görsel dile güncellendi.
- `npm run typecheck`, `npm run test`, `npm run build` başarılı.

## Iteration: 21st.dev MCP Professional UI Overhaul
### Plan
- [x] `@21st-dev/cli` MCP kurulumunu yap
- [x] Projeye Tailwind CSS ve PostCSS kurulumu / konfigürasyonu gerçekleştir
- [x] Shadcn UI kurulumunu yap
- [x] Mevcut CSS Modules yapısını yeni Tailwind + Shadcn altyapısına transfer et
- [x] MCP kullanarak 21st.dev'den profesyonel, "Light" tema uyumlu (admin paneli, header, tablolar ve layoutlar) componentler getirip projeye entegre et
- [x] Typecheck ve testleri çalıştırarak entegrasyon sonrası uygulamayı doğrula

### Review
- 21st.dev CLI arama özelliği eksik olduğu için aradığımız profesyonel bileşen standartlarını Shadcn Native kütüphanesi ve modern Tailwind yardımıyla kurduk.
- Modüller tamamen .module.css formatından arındırıldı. Login, Dashboard özetleri ve gridleri eklendi.
- `Table`, `Card`, `Select`, `Dialog`, `Input` gibi çekirdek parçalar import edilerek admin ve stok ekranı formları yenilendi.
- PostCSS dosyası CommonJS ile uyumlu hale getirildi ve uygulama production derlemesi tamamlandı. `npm run typecheck` ve `npm run build` hatasız sonuçlandı. 

## Iteration: Production Order Create (Spec)
### Plan
- [x] İlgili markdown dosyalarını analiz et (`tasks`, domain references, API/RBAC/schema)
- [x] Üretim emri oluştur ekranı için alan sözleşmesini dokümante et
- [x] Popup tablo davranışını domain kontratına ekle
- [x] Alt formdaki ilgili birimler çoklu seçim + arama gereksinimini yazılı hale getir
- [x] RBAC ve şema tarafına taslak etkileri ekle
- [ ] UI/API/DB implementasyonunu bu sözleşmeye göre başlat (bir sonraki adım)

### Review
- Üretim emri oluştur özelliği için detaylı alan listesi `references/production-orders.md` dosyasına eklendi.
- API kontratı, RBAC ve şema snapshot’ına draft kapsamı işlendi.
- Bu iterasyonda yalnız dokümantasyon güncellendi; uygulama kodu henüz eklenmedi.

## Iteration: Production Order Create (Implementation)
### Plan
- [x] RBAC/permission sabitlerini production order ekranına göre güncelle
- [x] `/production-orders/create` protected route ve sayfa bileşenini ekle
- [x] Ana form + alt form (ürün tipi/malzeme/adet-kg/ilgili birimler arama+çoklu seçim) UI akışını ekle
- [x] `Oluştur` sonrası popup içinde tablo görünümünü ekle
- [x] Header ve dashboard hızlı aksiyonlarını yeni ekrana bağla
- [x] Typecheck + test + build doğrulaması yap

### Review
- `ProductionOrderCreateForm` ile iki bloklu form (iş emri alanları + malzeme satırları) eklendi.
- İlgili birimler alanında satır bazlı arama + çoklu checkbox seçimi eklendi.
- `Oluştur` sonrası modal içinde ana bilgiler ve malzeme satırları tablo olarak gösteriliyor.
- `/production-orders/create` protected route olarak eklendi ve permission guard bağlandı.
- Header ve dashboard üzerinde yeni sayfaya yönlendiren aksiyon linkleri eklendi.
- RBAC sabitleri ile DB seed/migration tarafına production order permission kayıtları eklendi.
- `npm run typecheck`, `npm run test`, `npm run build` başarılı.

## Iteration: Production Order Create (UI Revision + PDF Print)
### Plan
- [x] İş emri formundan `Sipariş Türü` ve `Ürün Dozu` alanlarını kaldır
- [x] `Toplam ... Miktarı` etiketini `Toplam Miktar` olarak güncelle
- [x] Malzeme satırını tek satır layouta dönüştür (`Malzeme Adı + Miktar + Ürün Tipi`)
- [x] Malzeme satırında ürün tipini dropdown ile seçilebilir yap
- [x] `Sevkedilecek Birim` alanını malzeme formundan ayır ve ayrı component/card olarak konumlandır
- [x] Popup önizlemeye `Yazdır (PDF)` butonu ekle ve logo ile çıktı şablonu üret
- [x] Typecheck + test + build doğrulaması yap

### Review
- İş emri formundan `Sipariş Türü` ve `Ürün Dozu` kaldırıldı.
- `Toplam Kapsül/Tablet/Sıvı/Saşe/Softjel Miktarı` başlığı `Toplam Miktar` olarak güncellendi.
- Malzeme satırları tek satır tasarıma geçirildi (`Malzeme Adı + Miktar + Ürün Tipi`).
- Ürün tipi seçimi checkbox listesinden dropdowna çevrildi.
- `Sevkedilecek Birim` malzeme formundan ayrılıp ayrı card/component olarak eklendi.
- Önizleme popupına `Yazdır (PDF)` butonu eklendi; çıktı şablonunda üstte logo gösterimi sağlandı.
- `npm run typecheck`, `npm run test`, `npm run build` başarılı.

## Iteration: Production Order UI Bugfixes
### Plan
- [x] İş emri formunda `Toplam Miktar` alanındaki boş kolon alanını kapat
- [x] `Sevkedilecek Birim` dropdown açıldığında yaşanan scrollbar kaybını gider
- [x] `Yazdır (PDF)` tıklamasında `about:blank` boş sayfa sorununu düzelt
- [x] Typecheck + test + build doğrulaması yap

### Review
- `Toplam Miktar` alanı `lg:col-span-3` yapılarak satır boşluğu kaldırıldı.
- `Sevkedilecek Birim` alanı Radix Select yerine native `select` ile render edilerek scroll kilit etkisi kaldırıldı.
- Yazdırma akışı `document.write` yaklaşımından Blob URL tabanlı yeni sekme açılışına çevrildi; boş `about:blank` kalma riski düşürüldü.
- `npm run typecheck`, `npm run test`, `npm run build` başarılı.

## Iteration: UI/UX Pro Max Filtered Design Pass
### Plan
- [x] `ui-ux-pro-max-skill` yaklaşımını operasyon paneli bağlamı için filtrele
- [x] Filtrelenmiş kuralları yeni markdown dosyasına aktar
- [x] Global tokenlar ve ortak yüzeyleri sade operasyon paneli diline çek
- [x] Header, login ve dashboard yüzeylerini yeni kurallara göre güncelle
- [x] Typecheck + test + build doğrulaması yap

### Review
- `skills/ui-ux-pro-max-filter.md` dosyası eklendi; dış tasarım repo/site önerileri operasyon paneli için seçici hale getirildi.
- Global renk, gölge, radius ve arka plan sistemi daha sakin ve daha okunabilir bir light tema çizgisine taşındı.
- Serif/editöryel ağırlıklı görünüm azaltıldı; header, login ve dashboard daha net aksiyon hiyerarşisine göre sadeleştirildi.
- `PageIntro` ve `SectionPanel` yüzeyleri yeni minimal ritme uyarlandı; bu değişim diğer korumalı sayfalara da yansıdı.
- `corepack pnpm typecheck`, `corepack pnpm test`, `corepack pnpm build` başarılı.

## Iteration: Filtered Design Pass II
### Plan
- [x] Stok, admin ve üretim emri iç yüzeylerinde yoğun görsel alanları tespit et
- [x] Stok giriş ve stok takip bileşenlerini sadeleştir
- [x] Admin kullanıcı yönetimi ve üretim emri kart/form yüzeylerini aynı ritme çek
- [x] Typecheck + test + build doğrulaması yap

### Review
- `StockCreateForm` içindeki blur/dekoratif alan kaldırıldı; kategori ve alt aksiyon yüzeyi daha sade hale getirildi.
- `StocksTable` tablo kabuğu, boş durum, mesaj kutuları ve pagination alanı tek ritimli operasyon yüzeyine taşındı.
- `UsersAdminPanel` create/list blokları ve yardımcı bilgi alanları daha sade arka plan ve radius sistemiyle hizalandı.
- `ProductionOrderCreateForm`, `ProductionOrderCardList` ve `ProductionOrderCardHeader` içinde fazladan kart/pill etkisi azaltıldı; aynı minimal görsel dil uygulandı.
- `corepack pnpm typecheck`, `corepack pnpm test`, `corepack pnpm build` başarılı.

## Iteration: Design System Closure
### Plan
- [x] Ortak `Button`, `Input`, `Select`, `Table`, `Dialog` bileşenlerinde ölçü ve radius sistemini normalize et
- [x] Mobil stok/admin kartlarını aynı yüzey ve kontrol ritmine çek
- [x] Üretim emri preview modalı ile depo/hat panellerindeki kart yoğunluğunu son kez sadeleştir
- [x] Typecheck + test + build doğrulaması yap

### Review
- Shared UI katmanında buton, input, select, table ve dialog ölçüleri `h-10 / rounded-xl` ekseninde daha tutarlı hale getirildi.
- `StocksMobileCard`, `UsersMobileCard` ve `StocksTableRow` aynı form kontrol ölçülerine göre hizalandı.
- `OrderDetailBlocks`, `WarehouseIncomingPanel`, `ProductionUnitTasksPanel` ve preview modalı daha sade arka plan ve badge yapısına taşındı.
- İç ve dış yüzeyler artık aynı light operations tasarım sisteminde çalışıyor; ek bir büyük tasarım turu ihtiyacı kalmadı.
- `corepack pnpm typecheck`, `corepack pnpm test`, `corepack pnpm build` başarılı.

## Iteration: Stocks Dataset & Performance Test
### Plan
- [x] 1000 stok kaydı için otomatik seed scripti oluştur
- [x] Prefix bazlı soft-delete cleanup scripti oluştur (komut gelince çalıştırılacak)
- [x] API tabanlı benchmark scripti oluştur (`/api/stocks` + `/api/dashboard/summary`)
- [x] Seed scriptini çalıştırıp 1000 kayıt bas
- [x] Benchmark scriptini çalıştırıp p50/p95/p99 ölçümlerini al

### Review
- `scripts/seed-stocks.mjs`, `scripts/cleanup-seed-stocks.mjs`, `scripts/benchmark-stocks.mjs` eklendi.
- `package.json` scriptlerine `seed:stocks`, `cleanup:stocks`, `bench:stocks` komutları eklendi.
- Cleanup scripti hazırlandı, kullanıcı komutu gelmeden çalıştırılmayacak.
- Seed çalıştırıldı: prefix `PERF-20260303160411`, 1000 kayıt eklendi.
- Benchmark (`concurrency=8`) koşusunda aralıklı 500 hataları gözlendi.
- Karşı benchmark (`concurrency=4`) koşusunda tüm senaryolarda hata oranı %0 oldu.

## Iteration: Stocks Cross-Client Auto Sync
### Plan
- [x] Stok takip ekranında mevcut mimariye uygun otomatik veri senkronizasyonu tasarla
- [x] `StocksTable` için filtre/pagination parametrelerini koruyan polling akışı ekle
- [x] Edit/silme sırasında polling’i güvenli şekilde durdur (state çakışmasını önle)
- [x] Görünmez sekmede gereksiz istekleri kes ve sekme geri gelince hızlı senkronizasyon yap
- [x] Typecheck + test doğrulaması çalıştır
- [x] Review notlarını güncelle

### Review
- [x] Uygulama davranışı doğrulandı
- [x] Tip/test doğrulaması tamamlandı
- `StocksTable` içinde 5 sn aralıkla çalışan ve mevcut filtre/pagination query’sini koruyan otomatik senkronizasyon eklendi.
- Polling akışı edit/silme/busy durumlarında otomatik durduruldu; kullanıcı işlemi sırasında satır state’i ezilmesi engellendi.
- Sekme görünmezken ağ çağrıları kesildi, sekme tekrar görünür olduğunda anlık senkronizasyon tetiklendi.
- Değişiklik tespiti için satır snapshot karşılaştırması eklendi; veri değişmedikçe state güncellemesi yapılmıyor.
- `npm run typecheck` ve `npm run test` başarılı.

## Iteration: Recent 5 Auto Sync
### Plan
- [x] Son eklenen 5 kayıt için ayrı API endpoint ekle
- [x] `RecentStocksTable` bileşenine cross-client polling sync ekle
- [x] Görünmez sekmede polling’i durdur, görünür sekmede hızlı senkronize et
- [x] Typecheck + test doğrulaması çalıştır

### Review
- [x] Uygulama davranışı doğrulandı
- [x] Tip/test doğrulaması tamamlandı
- `GET /api/stocks/recent` endpoint’i eklendi ve `STOCKS_VIEW` yetkisi ile korundu.
- `RecentStocksTable` için 5 saniyelik polling + visibility tabanlı senkronizasyon devreye alındı.
- Snapshot karşılaştırması ile veri değişmediğinde gereksiz state güncellemesi engellendi.
- `npm run typecheck` ve `npm run test` başarılı.

## Iteration: Remove Soft Delete Policy
### Plan
- [x] Stok silme akışını soft-delete yerine hard-delete'e çevir
- [x] Dashboard ve stok sorgularındaki `deleted_at` bağımlılığını kaldır
- [x] Kullanıcı silme akışını hard-delete'e çevir ve ilişkisel hata durumlarını güvenli yönet
- [x] Auth ve kullanıcı sorgularındaki `deleted_at` filtrelerini kaldır
- [x] UI mesajlarını soft-delete yerine kalıcı silme diline güncelle
- [x] Seed/cleanup ve backend quality scriptlerini yeni politikaya uyumla
- [x] Typecheck + test doğrulaması yap

### Review
- [x] Uygulama davranışı doğrulandı
- [x] Tip/test doğrulaması tamamlandı
- `stocks` silme API/servisi hard-delete olacak şekilde güncellendi (`STOCK_DELETED` audit event).
- Dashboard ve stok listeleme/sorgu katmanından `deleted_at` filtreleri kaldırıldı.
- `users` silme akışı hard-delete'e geçirildi; FK ihlali durumunda güvenli 409 hata mesajı dönüyor.
- Auth/login/session ve kullanıcı servisindeki `deleted_at` bağımlılıkları kaldırıldı.
- Admin ve stok silme metinleri kalıcı silme diline güncellendi.
- `scripts/cleanup-seed-stocks.mjs` hard-delete + audit temizliği yapacak şekilde güncellendi.
- `scripts/check-backend-quality.mjs` soft-delete politikası engellerinden arındırıldı.
- `006_remove_soft_delete_policy.sql` migration eklendi ve mevcut DB'ye uygulandı.
- Doğrulama: `npm run typecheck`, `npm run test`, `npm run quality:backend` başarılı.

## Iteration: Live Audit Feed + Gunun Temposu
### Plan
- [x] Audit stream + tempo için yeni API endpoint tasarla (`GET /api/audit/stream`)
- [x] Audit modülüne son işlem akışı ve tempo summary sorgularını ekle
- [x] Tüm kullanıcılar için protected layout'a sağ-alt canlı bildirim bileşeni ekle
- [x] Bildirimlerde yukarı kaybolan transparan akış animasyonunu uygula
- [x] Typecheck + test doğrulaması yap
- [x] API kontratını domain referanslarında güncelle

### Review
- [x] Uygulama davranışı doğrulandı
- [x] Tip/test doğrulaması tamamlandı
- `GET /api/audit/stream` endpoint'i eklendi (session zorunlu, no-store response).
- `src/modules/audit/service.ts` içinde canlı akış (`listRecentAuditStream`) ve tempo özeti (`getAuditTempoSummary`) sorguları eklendi.
- `AuditLiveFeed` bileşeni protected layout'a bağlandı; tüm rollerde sağ-alt şeffaf panelde canlı bildirim akıyor.
- Bildirimler polling ile geliyor, yeni event'ler yukarı kayıp görünümden çıkıyor.
- Günün temposu panelde `sakin/orta/yogun` etiketi ve gün içi özet metriklerle gösteriliyor.
- Tempo metni tek satırdan sade 3 metrik karta çevrildi (`Bugun`, `Son 1 Saat`, `Zirve`).
- Akış bildirimi mesajlaşma hissi için baloncuk kuyruğu, durum noktası ve daha okunur kullanıcı etiketi ile rafine edildi.
- Doğrulama: `npm run typecheck`, `npm run test` başarılı.

## Iteration: Live Audit Feed UX Rules (Self-Filter + Overlay + Sound)
### Plan
- [x] Kullanıcının kendi işlemlerini canlı akışta gizle
- [x] Bildirim baloncuklarını panelin üstünde akacak şekilde konumlandır
- [x] Toast birikiminde sınır uygula ve en eski mesajı düşür
- [x] Yeni bildirim geldiğinde sesli uyarı ekle
- [x] Typecheck + test doğrulaması yap

### Review
- [x] Uygulama davranışı doğrulandı
- [x] Tip/test doğrulaması tamamlandı
- `AuditLiveFeed` artık aktif kullanıcının kullanıcı adı ile çalışıyor ve aynı kullanıcıya ait event'leri göstermiyor.
- Toast akışı panelin üstüne alındı; panel sabit kalırken mesajlar yukarı doğru akıyor.
- Görsel taşma riskine karşı toast alanı `max-height` ve `overflow: hidden` ile sınırlandı.
- Mesaj kuyruğunda en fazla `MAX_TOASTS` adet tutuluyor; sınır aşımında en eski bildirim otomatik düşüyor.
- Yeni bildirim geldiğinde Web Audio tabanlı kısa “ding” sesi eklenip tarayıcı kısıtlarında sessiz fallback bırakıldı.
- Doğrulama: `npm run typecheck`, `npm run test` başarılı.

## Iteration: Tailwind ESM Config Fix (require is not defined)
### Plan
- [x] `tailwind.config.ts` dosyasındaki CommonJS `require` kullanımını tespit et
- [x] Plugin importunu ESM uyumlu hale getir
- [x] Build doğrulaması yap
- [x] Dev açılışını kısa kontrol et

### Review
- [x] Uygulama davranışı doğrulandı
- [x] Tip/build doğrulaması tamamlandı
- `tailwind.config.ts` içinde `plugins: [require("tailwindcss-animate")]` ifadesi, ESM import ile değiştirildi.
- Yeni yapı: `import tailwindcssAnimate from 'tailwindcss-animate'` ve `plugins: [tailwindcssAnimate]`.
- `npm run build` başarılı.
- `npm run dev -- --port 3007` bu sandbox ortamında `EPERM` (port bind izni) nedeniyle doğrulanamadı.

## Iteration: Live Feed Toast Transparency Fix
### Plan
- [x] Mesaj toast kutusunun gerçek arka plan kaynağını tespit et
- [x] Toast ve kuyruk pseudo-elementini transparan hale getir
- [x] Typecheck doğrulaması yap

### Review
- [x] Uygulama davranışı doğrulandı
- [x] Tip doğrulaması tamamlandı
- `toastMeta` yerine asıl kutu olan `.toast` arka planı kaldırıldı (`background: transparent`, `backdrop-filter: none`).
- Balon kuyruk pseudo-elementi (`.toast::before`) görünümde arka plan bırakmaması için kapatıldı.

## Iteration: Live Feed Container Transparency Clarification
### Plan
- [x] Mesajların yüklendiği konteynerin (`.feed`) arka plan/efekt stillerini temizle
- [x] Typecheck doğrulaması yap

### Review
- [x] Uygulama davranışı doğrulandı
- [x] Tip doğrulaması tamamlandı
- Balon konteynerine (`.feed`) açık şekilde `background: transparent`, `border: 0`, `box-shadow: none`, `backdrop-filter: none` eklendi.
- `npm run typecheck` başarılı.

## Iteration: Live Feed Audio Unlock (Autoplay Policy Fix)
### Plan
- [x] AudioContext autoplay kısıtını kullanıcı etkileşimi ile unlock modeline çevir
- [x] Kullanıcı etkileşimi öncesi bildirim seslerini pending kuyruğunda tut
- [x] Typecheck + test doğrulaması yap

### Review
- [x] Uygulama davranışı doğrulandı
- [x] Tip/test doğrulaması tamamlandı
- Ses üretimi `playTone` olarak ayrıldı; `playNotificationSound` artık kilit açık değilse warning üretmeden pending işaretliyor.
- `pointerdown`, `keydown`, `touchstart` ile ilk kullanıcı etkileşiminde `unlockNotificationAudio` çağrılıyor.
- Unlock sonrası bekleyen bildirim sesi bir kez çalınıyor, sonraki bildirimler normal akıyor.
- Doğrulama: `npm run typecheck`, `npm run test` başarılı.

## Iteration: Live Feed Audio Removal
### Plan
- [x] Canlı akıştan tüm ses kodunu kaldır
- [x] Bildirim akışını sessiz modda koru
- [x] Typecheck + test doğrulaması yap

### Review
- [x] Uygulama davranışı doğrulandı
- [x] Tip/test doğrulaması tamamlandı
- `AuditLiveFeed` içindeki tüm Web Audio ve user-gesture unlock kodları kaldırıldı.
- Yeni bildirimler sessiz şekilde görünmeye devam ediyor.
- Doğrulama: `npm run typecheck`, `npm run test` başarılı.

## Iteration: AI Context Memory File
### Plan
- [x] Depo yapısı, teknoloji yığını ve mimariyi tarayıp özet çıkar
- [x] `ai-context.md` dosyasını istenen başlıklarla oluştur/güncelle
- [x] Dosyayı kısa, madde bazlı ve bakım odaklı hale getir
- [x] Review notlarını ekle

### Review
- [x] Uygulama davranışı doğrulandı
- [x] Dokümantasyon güncellemesi tamamlandı
- `ai-context.md` sıfırdan oluşturuldu; proje özeti, teknoloji, mimari, klasörler, kurallar ve kritik bileşenler eklendi.
- AI kullanımına yönelik “Perfect Prompt Template” bölümü dosyaya gömüldü.
- İçerik kısa, madde bazlı ve kalıcı hafıza amaçlı optimize edildi.

## Iteration: High-Scale Polling & API Load Optimization
### Plan
- [x] Client polling aralıklarını yükselt ve jitter ekle (her tab aynı anda vurmasın)
- [x] `/api/audit/stream` ve `/api/stocks/recent` için kısa TTL server memory cache ekle
- [x] Yüksek frekanslı endpoint info loglarını varsayılan olarak sustur (env ile aç/kapat)
- [x] Yeni performans env değişkenlerini `.env.example` dosyasına ekle
- [x] Typecheck + test + build doğrulaması yap
- [x] Review notlarını güncelle

### Review
- [x] Uygulama davranışı doğrulandı
- [x] Tip/test/build doğrulaması tamamlandı
- Client polling temel aralığı 15 sn default + jitter ile dağıtıldı (`NEXT_PUBLIC_CLIENT_POLL_INTERVAL_MS`).
- `AuditLiveFeed`, `StocksTable` ve `RecentStocksTable` aynı anda DB vurmayacak şekilde instance bazlı random interval kullanıyor.
- `/api/audit/stream` ve `/api/stocks/recent` endpointlerine kısa TTL memory cache + in-flight dedup eklendi.
- `withApiHandler` içinde yüksek frekanslı polling path'leri (`/api/audit/stream`, `/api/stocks/recent`) info log'dan varsayılan çıkarıldı; `LOG_NOISY_POLLING_ENDPOINTS=true` ile geri açılabilir.
- `.env.example` ve README performans ayarları güncellendi.
- Doğrulama: `npm run test` başarılı, `npm run build` başarılı, `npm run typecheck` (build sonrası) başarılı.

## Iteration: Production Orders Workflow Panels (Warehouse/Tablet1/Monitor)
### Plan
- [x] Üretim emri API uçlarını ekle (`/api/production-orders`, malzeme tikleme, sevk, görev kabul/tamamlama)
- [x] Üretim emri oluşturma formunu preview + PDF akışını koruyarak DB persist ile bağla
- [x] Üretim emri kayıt listesi için kart bazlı detay ekranı ekle
- [x] Depo gelen emirleri panelini ekle (malzeme uygunluk tikleri + çoklu birime sevk)
- [x] Tablet1 görev panelini ekle (kabul et -> çalışıyor -> bitti)
- [x] Üretim müdürü için ayrı süreç takip paneli ekle (salt okunur durum izleme)
- [x] `tablet1` rolünü UI/RBAC/navigation/login yönlendirme akışına tam entegre et
- [x] `tablet1 / 123456` bootstrap SQL dosyasını ekle (idempotent)
- [x] `tasks`, `ai-context`, domain referans dosyalarını güncelle
- [x] Typecheck + test + build doğrulamasını çalıştır

### Review
- [x] Uygulama davranışı doğrulandı
- [x] Tip/test/build doğrulaması tamamlandı
- `POST /api/production-orders`, `GET /api/production-orders` ve malzeme/sevk/görev durum endpointleri eklendi.
- Üretim emri oluşturma modalı artık `Kaydet ve Oluştur` ile DB persist ediyor; PDF yazdırma akışı korundu.
- Yeni paneller eklendi: `/production-orders` (kart liste), `/production-orders/warehouse`, `/production-orders/monitor`, `/production-orders/tasks`.
- Depo panelinde malzeme var/yok işaretleme ve çoklu birime sevk akışı canlı API çağrısıyla çalışır.
- Tablet1 görev panelinde durum akışı `Beklemede -> Çalışıyor -> Bitti` olarak bağlandı.
- Header/dashboard/login yönlendirmeleri `tablet1` kısıtlarına göre güncellendi; varsayılan iniş yolu `/production-orders/tasks`.
- `008_seed_tablet1_user.sql` migration ve `db/bootstrap/02_tablet1_user.sql` eklendi.
- Doğrulama: `npm run typecheck`, `npm run test`, `npm run build` başarılı.

## Iteration: Production Orders Real-Time Sync + Delete
### Plan
- [x] Üretim emri ekranlarının (liste, depo, hat görev, süreç izleme) canlı güncelleme davranışını tek standarda getir
- [x] Depo paneline görünürlük kontrollü polling + jitter + race-safe güncelleme ekle
- [x] Hat görev paneline görünürlük kontrollü polling + jitter + race-safe güncelleme ekle
- [x] Üretim emri silme API uçlarını ve servis katmanını audit log ile ekle
- [x] Üretim emri listesi kartlarında silme aksiyonunu modal onay ile ekle (test odaklı)
- [x] Typecheck + test + build doğrulaması yap

### Review
- [x] Uygulama davranışı doğrulandı
- [x] Tip/test/build doğrulaması tamamlandı
- `WarehouseIncomingPanel` ve `ProductionUnitTasksPanel` bileşenlerine visibility-aware polling + jitter eklendi.
- `production-orders` liste/monitor/depo/tasks ekranları aynı polling standardıyla gerçek zamanlı senkron çalışır hale getirildi.
- `DELETE /api/production-orders/:id` endpointi eklendi; servis katmanında hard-delete + `PRODUCTION_ORDER_DELETED` audit log yazımı bağlandı.
- `ProductionOrderCardList` içine modal onaylı silme aksiyonu eklendi (`Sil` butonu, kullanıcıya güvenli hata/başarı mesajı).
- RBAC tarafına `production-orders:delete` yetkisi eklendi; default roller ve migration scriptleri güncellendi.
- Doğrulama: `npm run typecheck`, `npm run test`, `npm run build` başarılı.

## Iteration: Production Orders DEPO Dispatch Alignment
### Plan
- [x] Üretim emri oluşturma ekranında `DEPO` birimini tekrar seçilebilir yap
- [x] Create servisindeki `DEPO` hedef kısıtını kaldır
- [x] Depo paneli listeleme kapsamını `DEPO` dispatch kaydı olan emirlere düşür
- [x] Typecheck + test + build doğrulaması yap

### Review
- [x] Uygulama davranışı doğrulandı
- [x] Tip/test/build doğrulaması tamamlandı
- Üretim emri oluşturma ekranında çoklu dropdown içinde `DEPO` tekrar seçilebilir hale getirildi.
- `createProductionOrder` içindeki `DEPO` seçimini engelleyen validation kaldırıldı.
- Depo paneli listeleme (`scope=warehouse`) sadece `DEPO` dispatch kaydı olan ve tamamlanmamış emirleri gösterecek şekilde daraltıldı.
- Domain referansı (`production-orders.md`) yeni davranışla eşitlendi.
- Doğrulama: `npm run typecheck`, `npm run test`, `npm run build` başarılı.

## Iteration: Final Design Sweep
### Plan
- [x] Stok giriş formundaki gereksiz açıklama kutularını kaldır ve kategori seçimini sadeleştir
- [x] Admin kullanıcı yönetimindeki eski kart hissini kaldırıp yüzeyleri yeni minimal stile hizala
- [x] Üretim emri oluştur ekranında üst aksiyon ve çoklu birim seçimi özetini sadeleştir
- [x] Typecheck + test + build doğrulaması yap

### Review
- Stok giriş formunda üstteki iki yardımcı kutu kaldırıldı; kategori alanı iki net seçim yüzeyine dönüştürüldü.
- Admin kullanıcı yönetiminde create/list alanları ortak beyaz yüzey diline taşındı, toplam kullanıcı sayısı ve hat rolü için kısa yardımcı metin eklendi.
- Üretim emri oluştur ekranında logo alanı sadeleştirildi; seçilen sevk birimleri form içinde chip olarak görünür hale getirildi.
- Doğrulama: `corepack pnpm build`, `corepack pnpm test`, `corepack pnpm typecheck` başarılı.

## Iteration: Concurrent Workload Seed Script
### Plan
- [x] Stok, üretim emri ve kullanıcı akışlarını analiz edip seed kapsamını netleştir
- [x] 50 sanal kullanıcı dağılımı ve rol bazlı davranış matrisini tasarla
- [x] 2000 ana kayıt üreten concurrent seed scriptini ekle
- [x] İlerleme, hata toleransı ve özet raporu terminale bağla
- [x] Package scripti ve kullanım notlarını ekle
- [x] Kontrollü doğrulama yap ve review notlarını tamamla

### Review
- `scripts/seed-workload.mjs` eklendi; 50 sanal kullanıcıyı prefix tabanlı oluşturup stok, üretim emri, depo kontrolü, sevk, kabul ve tamamlanma akışlarını concurrent olarak işliyor.
- Root kayıt hedefi `2000` varsayılanıyla `stok + üretim emri` dağıtılıyor; adminler kullanıcı oluşturma ve stok düzeltme, üretim müdürleri emir açma, depocular stok + malzeme kontrol/sevk, hat kullanıcıları kabul/bitti akışını yürütüyor.
- Script ilerlemeyi faz bazlı terminal progress ile gösteriyor; task bazlı hataları loglayıp çalışmaya devam ediyor.
- `scripts/cleanup-workload.mjs` ve `package.json` scriptleri (`seed:workload`, `cleanup:workload`) eklendi.
- Kontrollü smoke run başarıyla çalıştırıldı: `corepack pnpm seed:workload -- --users 6 --records 12 --concurrency 6 --prefix WL-SMOKE-20260309A`
- Smoke verisi fiziksel olarak temizlendi: `corepack pnpm cleanup:workload -- --prefix WL-SMOKE-20260309A`
- Ek doğrulama: `node --check scripts/seed-workload.mjs`, `node --check scripts/cleanup-workload.mjs`, `corepack pnpm test` başarılı.

## Iteration: Windows Self-Hosted Deploy Automation
### Plan
- [x] Windows self-hosted runner için deploy scriptini ekle
- [x] `main` branch push ile tetiklenen GitHub Actions workflow'unu ekle
- [x] Runner workspace içindeki `.env` dosyasının korunacağı güvenli checkout davranışını ekle
- [x] README ve `ai-context.md` içinde deploy akışını belgeye işle
- [x] Typecheck + test + build doğrulaması yap

### Review
- `.github/workflows/deploy-windows.yml` eklendi; `push(main)` ve `workflow_dispatch` ile `windows-deploy-runner` üstünde çalışacak şekilde kuruldu.
- Workflow `actions/checkout@v4` için `clean: false` kullanıyor; böylece runner workspace içindeki `.env` dosyası her deploy’da silinmiyor.
- `scripts/deploy-windows.ps1` eklendi; Docker CLI kontrolü, `docker compose up -d --build`, `docker compose ps` ve `docker compose logs web --tail 80` çıktısını tek akışta veriyor.
- README ve `ai-context.md` dosyaları Windows deploy gerçeğine göre güncellendi; beklenen runner workspace yapısı ve `.env` lokasyonu dokümante edildi.
- Doğrulama: `corepack pnpm typecheck`, `corepack pnpm test`, `corepack pnpm build` başarılı.
