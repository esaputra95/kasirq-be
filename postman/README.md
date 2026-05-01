# Postman

File yang bisa langsung di-import:

- `api-kasirq.postman_collection.json`
- `api-kasirq.postman_environment.json`

## Cara import

1. Postman → **Import** → pilih `api-kasirq.postman_collection.json`
2. (Opsional) Import juga environment `api-kasirq.postman_environment.json`
3. Pilih environment **api-kasirq (local)**
4. Isi variable:
   - `baseUrl` (default: `http://127.0.0.1:3001`)
   - `accessToken` (JWT tanpa prefix; request sudah pakai `Bearer {{accessToken}}`)

## Regenerate (kalau route berubah)

Jalankan:

```bash
node postman/generate-postman-collection.js
```

