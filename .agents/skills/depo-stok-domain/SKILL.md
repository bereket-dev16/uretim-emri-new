---
name: depo-stok-domain
description: Depo/Stok uygulamasının iş kuralları, rol matrisi, barkod üretim standardı, form alanları ve API kontratlarıyla uyumlu geliştirme yapmak için kullan. Domain davranışı, tablo şeması, RBAC veya endpoint sözleşmesi değişikliklerinde kullan.
---

# Depo/Stok Domain

1. İş kuralı değişikliğinde önce RBAC, schema ve API kontratını birlikte değerlendir.
2. Barkod üretimini her zaman server-side sequence + format standardı ile sürdür.
3. Kritik akışlarda audit log ve güvenli hata mesajı kurallarını koru; silme işlemleri kalıcı (hard delete) varsayımıyla tasarla.
4. Yeni özellik eklerken tablo/sözleşme etkisini ilgili referans dosyasında güncelle.

Referanslar:
- `references/rbac.md`
- `references/schema.md`
- `references/api-contracts.md`
- `references/production-orders.md`
