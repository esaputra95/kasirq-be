# PRD API - Feature Entitlement Berdasarkan Paket Subscription

## Ringkasan

Feature entitlement adalah sistem untuk membuka atau menutup akses fitur toko berdasarkan paket subscription yang dibeli. API menjadi sumber kebenaran utama untuk menentukan fitur apa saja yang aktif pada sebuah toko.

Sistem ini tidak menggantikan RBAC yang sudah ada. RBAC tetap mengatur akses user/role, sedangkan entitlement mengatur akses fitur di level toko.

Aturan final:

```text
User boleh mengakses fitur jika:
1. toko memiliki fitur tersebut dari paket aktif
2. user memiliki permission RBAC untuk aksi/menu tersebut
3. subscription toko masih aktif
```

## Tujuan

- Menyediakan struktur data paket dan fitur yang bisa dikelola dari panel.
- Mengembalikan daftar fitur aktif toko untuk dipakai mobile.
- Menjaga pengguna lama tetap tidak terganggu saat fitur ini dirilis.
- Menyediakan guard API agar endpoint premium tidak hanya disembunyikan di mobile, tapi juga ditolak dari backend.
- Mendukung paket berbeda seperti `TRIAL`, `BASIC`, `PRO`, `BUSINESS`, dan `LEGACY_FULL`.

## Non-Tujuan

- Tidak mengubah total sistem RBAC.
- Tidak mengubah alur login secara besar.
- Tidak membuat billing/payment gateway baru.
- Tidak langsung memblokir pengguna lama pada fase awal rollout.

## Kondisi Saat Ini

API sudah memiliki:

- `store_subscriptions` sebagai riwayat subscription toko.
- `stores.expiredDate` untuk masa aktif toko.
- `assertStoreCanTransact` untuk menjaga transaksi saat subscription toko habis.
- RBAC permission melalui `permissions`, `roles`, `role_permissions`, dan `user_roles`.

Kekurangan saat ini:

- Paket belum punya daftar fitur.
- Toko belum punya entitlement fitur yang bisa dibaca mobile.
- API belum punya guard per fitur seperti `finance`, `reports`, `attendance`, dll.

## Pengguna

- **Superadmin**: mengatur paket, fitur, dan subscription toko.
- **Owner toko**: membeli/memperpanjang paket.
- **Staff/kasir**: menggunakan fitur yang tersedia sesuai paket toko dan role user.
- **Mobile app**: membaca daftar fitur aktif untuk menampilkan/menyembunyikan menu.
- **Panel app**: mengelola master paket dan fitur.

## Definisi

### Feature

Unit fitur yang bisa dibuka/tutup oleh paket.

Contoh:

```text
sales
sale_pending
products
purchases
members
stock_opname
finance
reports
attendance
settings
suppliers
sales_people
rbac
```

### Plan / Paket

Produk subscription yang berisi sekumpulan fitur.

Contoh:

```text
TRIAL
BASIC
PRO
BUSINESS
LEGACY_FULL
```

### Entitlement

Hasil akhir fitur aktif toko berdasarkan subscription aktif dan mapping paket-fitur.

## Requirement Fungsional

### FR-1 Master Feature

API harus menyediakan data master fitur.

Field minimum:

- `id`
- `key`
- `name`
- `description`
- `group`
- `status`
- `createdAt`
- `updatedAt`

Ketentuan:

- `key` harus unique.
- `key` menjadi identifier lintas API, mobile, dan panel.
- Fitur inactive tidak dikembalikan sebagai entitlement aktif.

### FR-2 Master Plan

API harus menyediakan data master paket subscription.

Field minimum:

- `id`
- `code`
- `name`
- `description`
- `price`
- `durationMonth`
- `status`
- `createdAt`
- `updatedAt`

Ketentuan:

- `code` harus unique.
- Paket inactive tidak boleh dipakai untuk subscription baru.
- Paket `LEGACY_FULL` tersedia untuk pengguna lama dan tidak ditampilkan sebagai paket jual publik.

### FR-3 Mapping Plan Feature

API harus menyimpan relasi fitur mana saja yang aktif pada sebuah paket.

Ketentuan:

- Satu paket dapat memiliki banyak fitur.
- Satu fitur dapat dipakai di banyak paket.
- Kombinasi `planId + featureId` harus unique.

### FR-4 Store Subscription Mengacu ke Plan

Tabel `store_subscriptions` perlu memiliki `planId`.

Ketentuan:

- Subscription baru wajib memiliki `planId`.
- Data lama yang belum punya `planId` harus dimigrasi ke `LEGACY_FULL`.
- Tanggal dan status subscription lama tidak boleh diubah saat migration legacy.

### FR-5 Endpoint Entitlement Toko

API harus menyediakan endpoint untuk mengambil fitur aktif toko.

Endpoint rekomendasi:

```text
GET /stores/:storeId/entitlements
```

Alternatif untuk efisiensi mobile:

```text
GET /stores/select-subscription
```

Response `select-subscription` dapat ditambahkan field `featureKeys` per toko.

Response entitlement:

```json
{
  "success": true,
  "message": "successfully get store entitlements",
  "data": {
    "storeId": "store-id",
    "subscription": {
      "id": "subscription-id",
      "planId": "plan-id",
      "planCode": "PRO",
      "planName": "Pro",
      "status": "ACTIVE",
      "startDate": "2026-06-01T00:00:00.000Z",
      "endDate": "2026-07-01T00:00:00.000Z"
    },
    "featureKeys": [
      "sales",
      "products",
      "members",
      "finance",
      "reports"
    ],
    "isExpired": false
  }
}
```

### FR-6 API Guard Per Feature

API harus menyediakan helper guard:

```ts
assertStoreHasFeature(prisma, storeId, featureKey)
assertStoreCanUseFeature(prisma, storeId, featureKey)
```

Perbedaan:

- `assertStoreHasFeature`: hanya cek fitur tersedia di paket aktif.
- `assertStoreCanUseFeature`: cek toko ada, subscription aktif, dan fitur tersedia.

Error saat fitur tidak tersedia:

```json
{
  "success": false,
  "message": "Fitur ini tidak tersedia pada paket subscription toko.",
  "field": "feature",
  "code": "FEATURE_NOT_INCLUDED"
}
```

HTTP status:

```text
403 Forbidden
```

### FR-7 Mode Rollout Guard

API harus mendukung rollout bertahap agar pengguna lama aman.

Mode:

```text
OFF         = guard tidak aktif
DETECT_ONLY = guard mencatat log potensi blokir, tapi request tetap jalan
ENFORCE     = guard benar-benar memblokir
```

Konfigurasi dari env:

```text
FEATURE_ENTITLEMENT_MODE=OFF|DETECT_ONLY|ENFORCE
```

Default awal:

```text
DETECT_ONLY
```

### FR-8 Legacy Protection

Semua toko existing sebelum rilis harus tetap memiliki akses seperti sebelumnya.

Ketentuan:

- Buat paket `LEGACY_FULL`.
- Paket `LEGACY_FULL` berisi semua fitur existing.
- Semua toko lama yang belum punya `planId` dimapping ke `LEGACY_FULL`.
- Jika entitlement belum tersedia pada fase transisi, API tidak langsung memblokir.

### FR-9 Register Owner Baru

Saat owner baru register, subscription trial harus memakai `planId` dari paket `TRIAL`.

Ketentuan:

- Paket `TRIAL` wajib ada sebelum register owner.
- Jika paket `TRIAL` tidak ditemukan, API harus gagal dengan error internal yang jelas, bukan membuat subscription tanpa plan.

## Requirement Non-Fungsional

- Query entitlement harus cepat dan bisa dipanggil saat mobile memilih toko.
- Feature key harus stabil dan tidak mudah berubah.
- Guard harus reusable di controller mobile, stores, dan admin jika diperlukan.
- Migration harus idempotent.
- Perubahan tidak boleh menghapus data subscription lama.
- Response API harus backward-compatible sebisa mungkin.

## Desain Database

### Model Baru

```prisma
model features {
  id          String   @id @default(uuid()) @db.VarChar(36)
  key         String   @unique @db.VarChar(100)
  name        String   @db.VarChar(150)
  description String?  @db.Text
  group       String?  @db.VarChar(100)
  status      String   @default("active") @db.VarChar(20)
  createdAt   DateTime @default(now()) @db.DateTime
  updatedAt   DateTime @updatedAt @db.DateTime
}

model subscription_plans {
  id            String   @id @default(uuid()) @db.VarChar(36)
  code          String   @unique @db.VarChar(50)
  name          String   @db.VarChar(150)
  description   String?  @db.Text
  price         Decimal? @db.Decimal(12, 2)
  durationMonth Int?
  status        String   @default("active") @db.VarChar(20)
  isPublic      Boolean  @default(true)
  createdAt     DateTime @default(now()) @db.DateTime
  updatedAt     DateTime @updatedAt @db.DateTime
}

model subscription_plan_features {
  id        String @id @default(uuid()) @db.VarChar(36)
  planId    String @db.VarChar(36)
  featureId String @db.VarChar(36)
  createdAt DateTime @default(now()) @db.DateTime

  @@unique([planId, featureId])
  @@index([planId])
  @@index([featureId])
}
```

### Perubahan Model Existing

Tambahkan ke `store_subscriptions`:

```prisma
planId String? @db.VarChar(36)
```

Tambahkan index:

```prisma
@@index([planId])
```

Catatan:

- `planId` nullable dulu untuk migration aman.
- Setelah semua data valid, bisa dipertimbangkan menjadi required.

## Seed Data Awal

### Features

```text
sales
sale_pending
products
purchases
members
stock_opname
finance
reports
attendance
settings
suppliers
sales_people
rbac
```

### Plans

```text
TRIAL
BASIC
PRO
BUSINESS
LEGACY_FULL
```

### Mapping Awal

```text
TRIAL:
- sales
- products
- members

BASIC:
- sales
- products
- members
- purchases
- suppliers

PRO:
- sales
- sale_pending
- products
- purchases
- members
- stock_opname
- finance
- reports
- suppliers
- sales_people

BUSINESS:
- semua fitur PRO
- attendance
- settings
- rbac

LEGACY_FULL:
- semua fitur existing
```

## Endpoint API

### Mobile / Store Entitlement

```text
GET /stores/:storeId/entitlements
```

Auth:

```text
AccessToken
```

Rules:

- User harus login.
- User harus punya akses ke toko tersebut.
- Jika subscription aktif tidak ditemukan, response tetap jelas dengan `featureKeys: []` dan `isExpired: true`.

### Admin / Plan CRUD

```text
GET    /admin/subscription-plans
POST   /admin/subscription-plans
GET    /admin/subscription-plans/:id
PUT    /admin/subscription-plans/:id
DELETE /admin/subscription-plans/:id
```

### Admin / Feature CRUD

```text
GET    /admin/features
POST   /admin/features
GET    /admin/features/:id
PUT    /admin/features/:id
DELETE /admin/features/:id
```

### Admin / Plan Feature Update

```text
PUT /admin/subscription-plans/:id/features
```

Request:

```json
{
  "featureIds": [
    "feature-id-1",
    "feature-id-2"
  ]
}
```

Response:

```json
{
  "success": true,
  "message": "successfully update subscription plan features"
}
```

## Guard Mapping Rekomendasi

Controller atau route yang perlu guard:

```text
sales                  -> sales
sale pending/split bill -> sale_pending atau sales, sesuai keputusan produk
products               -> products
purchases              -> purchases
members                -> members
stock opname           -> stock_opname
finance/accountancy    -> finance
reports                -> reports
attendance             -> attendance
suppliers              -> suppliers
sales people           -> sales_people
rbac                   -> rbac
```

Catatan:

- Endpoint dasar seperti login, register, pilih toko, dan cek subscription tidak boleh diblokir entitlement.
- Endpoint perpanjangan subscription tidak boleh diblokir oleh subscription expired.

## Migration Plan

### Step 1 - Schema

- Tambah tabel `features`.
- Tambah tabel `subscription_plans`.
- Tambah tabel `subscription_plan_features`.
- Tambah `planId` nullable di `store_subscriptions`.

### Step 2 - Seed

- Insert semua feature key default.
- Insert paket `TRIAL`, `BASIC`, `PRO`, `BUSINESS`, `LEGACY_FULL`.
- Insert mapping fitur per paket.

### Step 3 - Legacy Assignment

- Cari semua `store_subscriptions` aktif yang `planId` null.
- Set `planId` ke `LEGACY_FULL`.
- Jangan mengubah `startDate`, `endDate`, `status`, atau `price`.

### Step 4 - Register Owner

- Update create trial subscription agar memakai `planId` `TRIAL`.

### Step 5 - Entitlement Endpoint

- Tambahkan service untuk membaca subscription aktif toko.
- Tambahkan endpoint entitlement.
- Tambahkan `featureKeys` ke response `select-subscription` jika diperlukan mobile.

### Step 6 - Guard Detect Only

- Implement helper guard.
- Pasang pada endpoint premium dalam mode `DETECT_ONLY`.
- Log request yang seharusnya diblokir.

### Step 7 - Enforce Bertahap

- Aktifkan `ENFORCE` untuk toko baru.
- Setelah validasi data legacy aman, aktifkan untuk semua toko.

## Backward Compatibility

Untuk menghindari gangguan:

- Toko lama diberi `LEGACY_FULL`.
- `planId` dibuat nullable di fase awal.
- Jika `featureKeys` belum tersedia di response lama, mobile masih boleh fallback ke RBAC lama.
- Guard diawali dari `DETECT_ONLY`.
- Tidak ada perubahan breaking pada response existing kecuali penambahan field baru.

## Logging dan Monitoring

Saat mode `DETECT_ONLY`, API mencatat:

- `storeId`
- `userId`
- `featureKey`
- endpoint
- method
- timestamp
- plan aktif
- status subscription

Contoh log:

```json
{
  "type": "FEATURE_ENTITLEMENT_DETECTED_BLOCK",
  "storeId": "store-id",
  "userId": "user-id",
  "featureKey": "finance",
  "method": "POST",
  "path": "/accountancy/cash-out",
  "planCode": "BASIC",
  "timestamp": "2026-06-02T10:00:00.000Z"
}
```

## Error Handling

### Store tidak ditemukan

```text
404 Not Found
```

### Subscription habis

```text
403 Forbidden
```

Message:

```text
Masa aktif toko sudah habis. Silakan perpanjang subscription untuk melanjutkan transaksi.
```

### Fitur tidak termasuk paket

```text
403 Forbidden
```

Message:

```text
Fitur ini tidak tersedia pada paket subscription toko.
```

### Paket trial tidak tersedia saat register

```text
500 Internal Server Error
```

Message:

```text
Paket trial belum dikonfigurasi.
```

## Acceptance Criteria

- Semua feature key default berhasil dibuat melalui seed/migration.
- Semua paket default berhasil dibuat melalui seed/migration.
- Semua toko lama memiliki subscription aktif dengan `planId` `LEGACY_FULL` atau plan valid lain.
- Register owner baru membuat subscription trial dengan `planId` `TRIAL`.
- Endpoint entitlement mengembalikan `featureKeys` sesuai paket aktif toko.
- Mobile dapat membaca feature key tanpa mengubah logic RBAC existing.
- Guard API dapat berjalan dalam mode `OFF`, `DETECT_ONLY`, dan `ENFORCE`.
- Dalam mode `DETECT_ONLY`, request tidak diblokir tetapi log tercatat.
- Dalam mode `ENFORCE`, request fitur yang tidak termasuk paket dikembalikan sebagai `403`.
- Subscription expired tetap ditolak seperti behavior existing.
- Tidak ada perubahan yang menghapus atau memendekkan masa aktif subscription toko lama.

## Risiko dan Mitigasi

### Risiko: user lama kehilangan akses fitur

Mitigasi:

- Assign semua toko lama ke `LEGACY_FULL`.
- Guard mulai dari `DETECT_ONLY`.
- Fallback allow untuk data entitlement yang belum tersedia pada fase awal.

### Risiko: mobile dan API berbeda daftar feature key

Mitigasi:

- Feature key didefinisikan di API.
- Mobile hanya memakai key dari API.
- Buat dokumen daftar feature key yang stabil.

### Risiko: endpoint premium lupa diberi guard

Mitigasi:

- Buat helper guard reusable.
- Buat mapping route/controller ke feature key.
- Tambahkan checklist endpoint saat implementasi.

### Risiko: paket trial belum ada saat register

Mitigasi:

- Seed wajib dijalankan sebelum deploy.
- Register owner validasi keberadaan paket `TRIAL`.

## Rekomendasi Urutan Implementasi

1. Tambah schema dan migration.
2. Tambah seed feature dan plan.
3. Tambah migration legacy ke `LEGACY_FULL`.
4. Update register owner agar pakai `TRIAL`.
5. Buat service entitlement.
6. Buat endpoint entitlement.
7. Tambah field entitlement ke `select-subscription`.
8. Buat helper guard.
9. Pasang guard mode `DETECT_ONLY`.
10. Setelah mobile siap, aktifkan `ENFORCE` bertahap.

## Catatan Integrasi Mobile

Mobile cukup menerima:

```json
{
  "featureKeys": [
    "sales",
    "products",
    "finance"
  ]
}
```

Mobile tetap memakai `permissionKeys` untuk RBAC.

Rumus menu:

```text
menu tampil = featureKeys mengandung menu.featureKey + permissionKeys mengandung salah satu menu.permissions
```

## Catatan Integrasi Panel

Panel membutuhkan:

- CRUD master feature.
- CRUD subscription plan.
- Form checklist fitur per plan.
- Form subscription toko memilih plan.
- Report toko berdasarkan plan aktif.

Panel tidak perlu menentukan entitlement manual per toko, kecuali nanti dibutuhkan fitur override/custom enterprise.

## Future Enhancement

- Feature override per toko.
- Limit kuota per paket, misalnya jumlah user, jumlah produk, jumlah outlet.
- Public pricing endpoint untuk landing page.
- Audit log perubahan paket dan fitur.
- Cache entitlement per store untuk mengurangi query.
- Webhook/payment integration untuk aktivasi paket otomatis.
