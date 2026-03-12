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

## Audit
- GET /api/audit/stream?limit=

## Stocks
- GET /api/stocks?query=&role=&productType=&productCategory=&stockEntryDate=&page=&pageSize=10&sort=
- POST /api/stocks

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
  - `/production-orders/warehouse`
  - `/production-orders/monitor`
  - `/production-orders/tasks`
- API:
  - `GET /api/production-orders?scope=all|warehouse|monitor|unit`
  - `POST /api/production-orders`
  - `DELETE /api/production-orders/:id`
  - `PATCH /api/production-orders/:id/materials/:materialId`
  - `POST /api/production-orders/:id/dispatch`
  - `POST /api/production-orders/dispatches/:dispatchId/accept`
  - `POST /api/production-orders/dispatches/:dispatchId/complete`
- Davranış:
  - Create form: popup preview + PDF yazdırma + DB persist.
  - Depo paneli: malzeme var/yok tikleme + çoklu birime sevk.
  - Birim paneli: `Görevi Kabul Et` -> `Çalışıyor` -> `Bitti`.
  - Süreç takip paneli: salt okunur kart/detay görünümü.
