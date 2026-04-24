# Production Orders (v1 Workflow)

## Sayfa Kapsamı
- Sayfalar:
  - `/production-orders/create`
  - `/production-orders`
  - `/production-orders/completed`
  - `/production-orders/incoming`
  - `/production-orders/tasks`
- Form iki bloktan oluşur:
  - Üst blok: iş emri ana bilgileri
  - Alt blok: sevk birimi ve görsel ek alanı
- `Oluştur` aksiyonu popup/modal içinde tablo önizleme açar.
- Popup içinde `Kaydet ve Oluştur` aksiyonu bulunur.

## Üst Form Alanları
- `İş Emri Tarihi` (`order_date`)
- `İş Emri No` (`order_no`)
- `Müşteri Adı` (`customer_name`)
- `İhracat / İç Piyasa` (`market_scope`): tek seçim (checkbox görseli olabilir, davranışta tek seçim zorunlu)
- `Numune / Müşteri Talebi / Stok` (`demand_source`): tek seçim (checkbox görseli olabilir, davranışta tek seçim zorunlu)
- `Sipariş Miktarı` (`order_quantity`)
- `Termin` (`deadline_date`)
- `Son Ürün Adı` (`final_product_name`)
- `Ambalaj Türü` (`packaging_type`): tek seçim
- Seçenekler: `kapsul | tablet | sivi | sase | softjel`
- `Toplam Ambalaj Miktarı` (`total_amount_text`): metin alanı

## Sevk Bilgisi
- `Hammadde Hazırlama` (`planned_raw_unit_code`): zorunlu tek seçim.
- `Makine Birimi` (`planned_machine_unit_code`): opsiyonel tek seçim.
- Emir oluşurken hammadde için ilk `pending` dispatch açılır; makine seçildiyse aynı anda ilk makine dispatch'i de açılır.

## Sevkedilecek Birim Listesi
- Seçenekler `production_units` tablosundaki aktif kayıtlar üzerinden gelir.
- `DEPO` hedef sevk birimi olarak seçilebilir.

## Popup Çıktı Davranışı
- `Oluştur` tıklandığında modal açılır.
- Modal içinde bloklar gösterilir:
- Ana iş emri alanlarının özet tablosu
- Tek seçimli alanlarda birden fazla değer kabul edilmez.
- Ek dosyalar yalnız görsel olabilir; create formda dosya seçme butonu bulunmaz.
- Görseller sürükle-bırak veya kopyala-yapıştır ile eklenir.
- Modal içinde `Kaydet ve Oluştur` ile DB’ye persist edilir.

## Birim Görevleri
- `raw_preparation` ve `machine_operator` rolleri kendi `users.hat_unit_code` birimine bağlı görevleri listeler.
- Durum akışı:
  - `pending`: Görev bekliyor
  - `in_progress`: Görevi kabul etti/çalışıyor
  - `completed`: Bitti
- Birim kullanıcısı kabul ve bitiş aksiyonlarını yönetir.
- Tüm birimler bitirirken `Son Sipariş Miktarı` girer.
- `PAKET` birimi bitirirken ayrıca `Kutu Sayısı` ve `Koli Sayısı` girer.
- `DEPO` birimi bitirirken ayrıca `Kutu Sayısı`, `Koli Sayısı` ve `Palet Sayısı` girer.
- Müdür aktif/biten emir detayındaki sevk geçmişinde bu değerleri görür.

## Canlı Güncelleme
- Aktif liste (`/production-orders`), gelen emirler (`/production-orders/incoming`) ve devam eden birim görevleri (`/production-orders/tasks`) polling ile senkronize edilir.
- Görünmez sekmede polling durur, sekme görünür olunca hemen senkronizasyon tetiklenir.

## Silme
- Test/operasyon ihtiyacı için üretim emri hard-delete olarak silinebilir.
- Silme kart üstünden iş emri numarası + `SIL` metni ile iki aşamalı modal onayla yapılır.
