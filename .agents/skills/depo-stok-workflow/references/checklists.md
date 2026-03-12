# Workflow Checklists

## Plan Checklist
- Hedef ve başarı kriteri net mi?
- Etkilenen modüller ve API uçları listelendi mi?
- Güvenlik/performans etkisi değerlendirildi mi?

## Implementation Checklist
- Değişiklik sadece gerekli dosyaları mı etkiliyor?
- UI guard yanında API guard da var mı?
- Validation + error envelope + requestId zinciri korunuyor mu?

## Verification Checklist
- Login/logout/session akışı çalışıyor mu?
- RBAC kuralları endpoint bazında doğrulandı mı?
- Pagination/filter arayüzü beklenen gibi mi?
- Audit log kritik işlemlere yazıyor mu?

## Review Checklist
- `tasks/todo.md` review kısmı güncellendi mi?
- Yeni bir hata paterni öğrenildiyse `tasks/lessons.md` güncellendi mi?
