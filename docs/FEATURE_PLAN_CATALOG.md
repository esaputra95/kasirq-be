# Feature Plan Catalog

Dokumen ini menjadi acuan master feature untuk menu **Features** di panel admin dan mapping fitur ke paket subscription. Feature di sini adalah entitlement level toko, bukan permission level user.

Aturan akses final:

```text
User boleh memakai fitur jika:
1. toko memiliki feature dari paket aktif
2. user memiliki permission RBAC untuk aksi/menu tersebut
3. subscription toko masih aktif
```

## Prinsip Penamaan

- Gunakan `snake_case` untuk `key`.
- `key` harus stabil karena dipakai API, mobile, dan panel.
- Jangan membuat feature terlalu granular seperti `sales:create`, karena itu area RBAC.
- Feature plan cukup mewakili kemampuan produk, misalnya `sales`, `split_bill`, `multi_payment`, `rbac`.
- Feature baru boleh ditambahkan dari panel admin, lalu mobile/API perlu diberi gate jika fitur tersebut harus benar-benar dibatasi.

## Feature Utama Untuk Paket Store

| Key                   | Nama Admin          | Group        | Deskripsi                                                                     | Rekomendasi Paket |
| --------------------- | ------------------- | ------------ | ----------------------------------------------------------------------------- | ----------------- |
| `dashboard_analytics` | Dashboard Analytics | dashboard    | Ringkasan performa toko seperti penjualan, pembelian, dan metrik operasional. | Basic+            |
| `sales`               | Penjualan           | transactions | Modul POS/kasir untuk membuat transaksi penjualan.                            | Trial+            |
| `sale_pending`        | Transaksi Pending   | transactions | Menyimpan transaksi sementara untuk dilanjutkan nanti.                        | Pro+              |
| `purchases`           | Pembelian           | transactions | Mencatat pembelian barang dari supplier dan penambahan stok.                  | Pro+              |
| `products`            | Produk              | masters      | Mengelola produk, satuan, harga, kategori, dan stok dasar.                    | Trial+            |
| `members`             | Pelanggan / Member  | masters      | Mengelola data pelanggan/member toko.                                         | Basic+            |
| `member_levels`       | Level Member        | masters      | Mengelola level pelanggan untuk harga atau segmentasi member.                 | Pro+              |
| `suppliers`           | Supplier            | masters      | Mengelola data pemasok.                                                       | Basic+            |
| `sales_people`        | Sales People        | masters      | Mengelola sales/marketing yang dikaitkan ke transaksi.                        | Basic+            |
| `stock_opname`        | Stok Opname         | inventory    | Mencatat penyesuaian stok fisik dengan stok sistem.                           | Pro+              |
| `finance`             | Keuangan            | finance      | Mengelola kas masuk, kas keluar, transfer kas, dan pengeluaran.               | Pro+              |
| `reports`             | Laporan             | reports      | Akses menu laporan umum.                                                      | Basic+            |
| `attendance`          | Absensi             | operations   | Check-in/check-out karyawan dan daftar absensi.                               | Business+         |
| `attendance_list`     | List Absensi        | operations   | Check-in/check-out karyawan dan daftar absensi.                               | Business+         |
| `settings`            | Pengaturan Toko     | settings     | Konfigurasi toko dasar seperti profil toko, printer, dan pengaturan terkait.  | Trial+            |
| `rbac`                | Hak Akses User      | settings     | Mengelola role dan permission pengguna per toko.                              | Business+         |
| `users`               | Hak Akses User      | settings     | Mengelola role dan permission pengguna per toko.                              | Business+         |

## Feature Premium / Add-on

| Key                | Nama Admin               | Group    | Deskripsi                                                           | Rekomendasi Paket |
| ------------------ | ------------------------ | -------- | ------------------------------------------------------------------- | ----------------- |
| `multi_payment`    | Multi Payment            | sales    | Satu transaksi dapat dibayar dengan beberapa metode pembayaran.     | Pro+              |
| `split_bill`       | Split Bill               | sales    | Memisahkan tagihan atau item transaksi menjadi beberapa pembayaran. | Business+         |
| `receipt_printing` | Cetak Struk              | sales    | Cetak struk transaksi dari printer kasir.                           | Pro+              |
| `kitchen_printing` | Printer Dapur            | sales    | Cetak order ke printer dapur untuk kebutuhan F&B.                   | Business+         |
| `cash_drawer`      | Cash Drawer              | sales    | Membuka laci kas dari printer/perangkat kasir.                      | Business+         |
| `product_packages` | Produk Paket             | products | Membuat produk bundle/paket dari beberapa item.                     | Pro+              |
| `product_formula`  | Produk Formula / Racikan | products | Produk dengan komposisi bahan atau formula.                         | Business+         |
| `member_pricing`   | Harga Khusus Member      | members  | Harga jual berbeda berdasarkan level member.                        | Pro+              |

| `master_finance` | Kas / Metode Pemayaran | finance | Mengelola Master Pembayaran | Pro+ |
| `expense_category` | KAtegori Pengeluaran | finance | Kategori Pengeluaran Kas | Pro+ |
| `expense` | Kas Pengeluaran | finance | Mengelola Pengeluaran Kas | Pro+ |
| `cash_in` | Kas Masuk | finance | Mengelola Kas Masuk | Pro+ |
| `cash_out` | Kas Keluar | finance | Mengelola Kas Keluar | Pro+ |
| `cash_transfer` | Transfer Kas | finance | Memindahkan saldo antar akun kas. | Pro+ |

| `purchase_report` | Laporan Pembelian | reports | Laporan Pembelian | Basic |
| `sale_report` | Laporan Penjualan | reports | Laporan Penjualan | Basic |
| `margin_report` | Laporan Margin | reports | Laporan Penjualan | Basic |
| `best_selling_report` | Laporan Penjualan Terbaik | reports | Laporan Penjualan Terbaik | Basic |
| `stock_opname_report` | Laporan Stok Opname | reports | Laporan Stok Opname | Basic |

| `cashflow_report` | Laporan Arus Kas | reports | Laporan arus kas dari transaksi finance. | Business+ |
| `cash_in_report` | Laporan Kas Masuk | reports | Laporan Kas masuk | Pro+ |
| `cash_out_report` | Laporan Kas Keluar | reports | Laporan Kas keluar | Pro+ |
| `cash_transfer_report` | Laporan Kas Transfer | reports | Laporan Kas keluar | Pro+ |
| `expense_report` | Laporan Kas Flow | reports | Laporan Kas keluar | Pro+ |
| `attendance_report` | Laporan Absensi | reports | Rekap absensi karyawan. | Business+ |
| `location_attendance` | Absensi Dengan Lokasi | attendance | Validasi lokasi saat check-in/check-out. | Business+ |

| `reset_transactions` | Reset Transaksi | maintenance | Reset data transaksi toko. Fitur sensitif, hanya untuk paket tinggi atau support internal. | Business+ |
| `store_branding` | Branding Struk / Logo | settings | Mengatur logo/branding toko pada struk atau tampilan terkait. | Pro+ |

## Feature Internal Superadmin

Feature berikut dipakai untuk akses panel internal dan sebaiknya tidak dijual sebagai paket store.

| Key                       | Nama Admin                | Group    | Deskripsi                                        |
| ------------------------- | ------------------------- | -------- | ------------------------------------------------ |
| `feature_management`      | Kelola Feature            | internal | Mengelola master feature entitlement.            |
| `plan_management`         | Kelola Paket Plan         | internal | Mengelola subscription plan dan mapping feature. |
| `subscription_management` | Kelola Subscription Store | internal | Mengelola subscription aktif setiap store.       |
| `store_management`        | Kelola Store              | internal | Mengelola data toko dari panel superadmin.       |
| `admin_user_management`   | Kelola Admin Panel        | internal | Mengelola user/admin panel.                      |
| `notification_broadcast`  | Broadcast Notification    | internal | Mengirim notifikasi ke user/store.               |
| `affiliate_management`    | Affiliate Management      | internal | Mengelola affiliator dan kode affiliate.         |
| `store_usage_report`      | Store Usage Report        | internal | Laporan penggunaan store.                        |
| `subscription_report`     | Subscription Report       | internal | Laporan subscription toko.                       |

## Rekomendasi Paket Awal

### Trial

Fokus untuk mencoba transaksi dasar.

```text
sales
products
settings
```

### Basic

Untuk toko kecil yang butuh operasional dasar dan laporan sederhana.

```text
dashboard_analytics
sales
products
members
suppliers
sales_people
settings
reports
```

### Pro

Untuk toko yang mulai butuh pembelian, stok, finance, dan fitur kasir lebih lengkap.

```text
dashboard_analytics
sales
sale_pending
products
members
member_levels
suppliers
sales_people
purchases
stock_opname
finance
reports
settings
multi_payment
receipt_printing
product_packages
member_pricing
expense_management
cash_transfer
best_seller_report
stock_report
store_branding
```

### Business

Untuk toko yang butuh kontrol user, absensi, split bill, printer dapur, dan laporan lanjutan.

```text
dashboard_analytics
sales
sale_pending
products
members
member_levels
suppliers
sales_people
purchases
stock_opname
finance
reports
attendance
settings
rbac
multi_payment
split_bill
receipt_printing
kitchen_printing
cash_drawer
product_packages
product_formula
member_pricing
purchase_order
expense_management
cash_transfer
cashflow_report
margin_report
best_seller_report
stock_report
attendance_report
location_attendance
reset_transactions
store_branding
```

### Legacy Full

Untuk menjaga pengguna lama tidak terganggu saat sistem entitlement dirilis.

```text
Semua feature aktif yang tersedia untuk store.
```

## Status Implementasi Gate

Feature yang sudah dipakai sebagai gate menu mobile saat ini:

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

Feature premium granular seperti `multi_payment`, `split_bill`, `kitchen_printing`, dan report detail sudah bisa didaftarkan di admin, tetapi perlu dipasang gate spesifik di mobile/API jika ingin benar-benar membatasi perilakunya.

## Catatan Untuk Penambahan Feature Baru

Saat admin menambahkan feature baru:

1. Tambahkan master feature dari panel admin.
2. Masukkan feature ke subscription plan yang sesuai.
3. Jika feature hanya untuk menampilkan/menyembunyikan menu, tambahkan `featureKey` di menu mobile/panel terkait.
4. Jika feature membatasi aksi penting, tambahkan guard API dengan `assertStoreHasFeature` atau `assertStoreCanUseFeature`.
5. Pastikan user lama tetap aman dengan paket `LEGACY_FULL` atau mode rollout `DETECT_ONLY` sebelum `ENFORCE`.
