## Skills
A skill is a set of local instructions stored in a `SKILL.md` file.

### Available skills
- depo-stok-workflow: Uygulama geliştirme ve doğrulama sürecinde plan-first, task/lesson disiplini, verification-before-done yaklaşımını uygular. Planlama, implementasyon adımlama, review/checklist gerektiğinde bu skill'i kullan.
  (file: /Users/bereketilac/Desktop/depo-stok-new/.agents/skills/depo-stok-workflow/SKILL.md)
- depo-stok-domain: Depo/Stok iş kuralları, RBAC matrisi, barkod standardı, form alanları ve API kontratlarına göre karar vermeyi sağlar. İş kuralı veya domain davranışı değişikliklerinde bu skill'i kullan.
  (file: /Users/bereketilac/Desktop/depo-stok-new/.agents/skills/depo-stok-domain/SKILL.md)
- frontend-design: Güçlü görsel yönü olan, jenerik görünmeyen arayüzler tasarlamak için kullan. Yeni sayfa tasarımı, görsel yenileme, bileşen düzeni, tipografi, renk sistemi ve etkileşim dili değişikliklerinde bu skill'i kullan.
  (file: /Users/bereketilac/Desktop/depo-stok-new/.agents/skills/frontend-design/SKILL.md)
- find-skills: Kullanıcı bir özelliğin skill olarak olup olmadığını sorarsa skill keşfi için kullan.
  (file: /Users/bereketilac/.agents/skills/find-skills/SKILL.md)
- skill-creator: Yeni skill oluşturma/güncelleme gerektiğinde kullan.
  (file: /Users/bereketilac/.codex/skills/.system/skill-creator/SKILL.md)
- skill-installer: Dış kaynaktan veya curated listeden skill kurulumunda kullan.
  (file: /Users/bereketilac/.codex/skills/.system/skill-installer/SKILL.md)

### Trigger rules
- Kullanıcı skill adını doğrudan yazarsa o skill kullanılmalı.
- İstek içerik olarak skill tanımına açıkça uyuyorsa skill otomatik tetiklenmeli.
- Görsel yenileme, layout modernizasyonu veya yeni sayfa tasarımı istendiğinde `frontend-design` skill'i devreye alınmalı.
- Çoklu skill gerekiyorsa en az set seçilmeli ve sıra belirtilmeli.

### Context hygiene
- SKILL.md kısa tutulmalı, detaylar `references/` altında tutulmalı.
- Gereksiz dosya yüklemelerinden kaçınılmalı, sadece ihtiyaç duyulan referanslar açılmalı.
