# API Contracts (v1)

## Error envelope
```json
{
  "error": {
    "code": "STRING_CODE",
    "message": "Kullanıcıya güvenli mesaj",
    "requestId": "uuid"
  }
}
```

## Auth
- POST /api/auth/login
- POST /api/auth/logout
- GET /api/auth/session

## Dashboard
- GET /api/dashboard/summary

## Admin Users
- GET /api/admin/users
- POST /api/admin/users
- PATCH /api/admin/users/:id
- POST /api/admin/users/:id/reset-password
- DELETE /api/admin/users/:id

## Production Orders
- UI Routes:
  - `/production-orders/create`
  - `/production-orders`
  - `/production-orders/completed`
  - `/production-orders/incoming`
  - `/production-orders/tasks`
- API:
  - `GET /api/production-orders?scope=active|completed|incoming|unit`
  - `POST /api/production-orders`
  - `GET /api/production-orders/:id`
  - `DELETE /api/production-orders/:id`
  - `POST /api/production-orders/:id/dispatch`
  - `POST /api/production-orders/:id/finish`
  - `POST /api/production-orders/dispatches/:dispatchId/accept`
  - `POST /api/production-orders/dispatches/:dispatchId/complete`
    - Body: `{ reportedOutputQuantity, boxCount?, cartonCount?, palletCount? }`
  - `POST /api/production-orders/:id/attachments`
  - `GET /api/production-orders/:id/attachments/:attachmentId`
- Davranış:
  - Create form: popup preview + DB persist.
  - Ekler: yalnız görsel dosyaları kabul edilir; üretim emri oluşturma ekranında dosya seçme butonu yoktur, görseller sürükle-bırak veya kopyala-yapıştır ile eklenir.
  - Aktif emir paneli: açık görev yoksa müdür bir veya daha fazla birime yeni batch sevk açabilir.
  - Birim panelleri: `Görevi Kabul Et` -> `Çalışıyor` -> `Bitti`.
  - Tüm birimler bitirirken `reportedOutputQuantity` girer.
  - `PAKET` bitirirken ayrıca `boxCount` ve `cartonCount` zorunludur.
  - `DEPO` bitirirken ayrıca `boxCount`, `cartonCount` ve `palletCount` zorunludur.
  - Aynı emir aynı birime ikinci kez gönderilemez.
