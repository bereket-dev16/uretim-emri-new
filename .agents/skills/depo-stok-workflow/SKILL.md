---
name: depo-stok-workflow
description: Depo/Stok projesinde plan-first geliştirme, task yönetimi (`tasks/todo.md`), lesson yakalama (`tasks/lessons.md`) ve verification-before-done akışını uygula. Mimari karar, çok adımlı geliştirme, kalite kontrol veya teslim öncesi doğrulama gerektiğinde kullan.
---

# Depo/Stok Workflow

1. Başlamadan önce `tasks/todo.md` içinde ilgili adımı kontrol et ve gerekiyorsa güncelle.
2. Değişikliği en küçük güvenli adımlara böl.
3. Implementasyon boyunca checklist durumunu güncel tut.
4. Dosya güncellemesi bittiğinde davranışı doğrula:
- Tip/söz dizimi kontrolü
- Kritik akışların manuel veya test ile kanıtı
- Beklenen API sözleşmesine uyum
5. İş bitiminde `tasks/todo.md` içindeki Review bölümünü güncelle.
6. Kullanıcı düzeltmesi aldıysan deseni `tasks/lessons.md` içine ekle.

Detaylı checklist için: `references/checklists.md` dosyasını aç.
