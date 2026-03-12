# Production Orders (v1 Workflow)

## Sayfa Kapsamı
- Sayfalar:
  - `/production-orders/create`
  - `/production-orders`
  - `/production-orders/warehouse`
  - `/production-orders/monitor`
  - `/production-orders/tasks`
- Form iki bloktan oluşur:
  - Üst blok: iş emri ana bilgileri
  - Alt blok: malzeme satırları
- `Oluştur` aksiyonu popup/modal içinde tablo önizleme açar.
- Popup içinde `Yazdır (PDF)` ve `Kaydet ve Oluştur` aksiyonları bulunur.

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

## Alt Form Alanları (Satır Bazlı)
- Her satır şu kolonlardan oluşur:
- `Malzeme Adı` (`material_name`)
- `Miktar` (`material_quantity_text`)
- `Ürün Tipi` (`material_product_type`): dropdown ile tek seçim

## Sevk Bilgisi
- `Sevkedilecek Birimler` (`dispatch_units`): ayrı component/card, dropdown içinde çoklu seçim.
- Bu alan malzeme satırından bağımsızdır ve `Oluştur` butonunun üstünde konumlanır.

## Sevkedilecek Birim Listesi
- Seçenekler `production_units` tablosundaki aktif kayıtlar üzerinden gelir.
- `DEPO` hedef sevk birimi olarak seçilebilir.

## Popup Çıktı Davranışı
- `Oluştur` tıklandığında modal açılır.
- Modal içinde iki tablo/blok gösterilir:
- Ana iş emri alanlarının özet tablosu
- Alt formdaki malzeme satırlarının tablo görünümü
- Tek seçimli alanlarda birden fazla değer kabul edilmez.
- Sevk birimi alanı çoklu seçimdir.
- Modal içinde `Yazdır (PDF)` butonu bulunur.
- PDF/print şablonunda üst bölümde şirket logosu gösterilir.
- Modal içinde `Kaydet ve Oluştur` ile DB’ye persist edilir.

## Depo Gelen Emirleri
- `warehouse_manager` (ve admin) bu paneli görür.
- Bu panel sadece dispatch listesinde `DEPO` birimi bulunan emirleri listeler.
- Malzemeler için `is_available` depo tarafından checkbox ile işaretlenir.
- Tüm malzemeler hazır olmadan sevk yapılamaz.
- Sevk birimi seçimi çoklu checkbox ile yapılır (`DEPO` hariç).

## Birim Görevleri
- `hat` rolü sadece bu ekranı görür (`users.hat_unit_code` ile bağlı birim görevleri listelenir).
- Durum akışı:
  - `pending`: Görev bekliyor
  - `in_progress`: Görevi kabul etti/çalışıyor
  - `completed`: Bitti
- Hat operatörü kabul ve bitiş aksiyonlarını yönetir.

## Canlı Güncelleme
- Liste (`/production-orders`), süreç takibi (`/production-orders/monitor`), depo (`/production-orders/warehouse`) ve hat görevleri (`/production-orders/tasks`) ekranları polling ile anlık senkronize edilir.
- Görünmez sekmede polling durur, sekme görünür olunca hemen senkronizasyon tetiklenir.

## Silme
- Test/operasyon ihtiyacı için üretim emri hard-delete olarak silinebilir.
- Silme kart üstünden modal onay ile yapılır; `PRODUCTION_ORDER_DELETED` audit kaydı zorunludur.

## Süreç Takibi
- `production_manager` (ve admin) için ayrı salt okunur paneldir.
- Kart detaylarında malzeme uygunluğu ve tüm sevk birimi durumları izlenir.
