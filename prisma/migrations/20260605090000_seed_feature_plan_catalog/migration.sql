-- Seed feature catalog and plan mappings from docs/FEATURE_PLAN_CATALOG.md.
-- This migration is idempotent and corrects mappings seeded by 20260603090000_add_feature_entitlements.

CREATE TABLE IF NOT EXISTS `features` (
    `id` VARCHAR(36) NOT NULL,
    `key` VARCHAR(100) NOT NULL,
    `name` VARCHAR(150) NOT NULL,
    `description` TEXT NULL,
    `group` VARCHAR(100) NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'active',
    `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updatedAt` DATETIME NOT NULL,

    UNIQUE INDEX `features_key_key`(`key`),
    INDEX `features_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `subscription_plans` (
    `id` VARCHAR(36) NOT NULL,
    `code` VARCHAR(50) NOT NULL,
    `name` VARCHAR(150) NOT NULL,
    `description` TEXT NULL,
    `price` DECIMAL(12, 2) NULL,
    `durationMonth` INTEGER NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'active',
    `isPublic` BOOLEAN NOT NULL DEFAULT TRUE,
    `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updatedAt` DATETIME NOT NULL,

    UNIQUE INDEX `subscription_plans_code_key`(`code`),
    INDEX `subscription_plans_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `subscription_plan_features` (
    `id` VARCHAR(36) NOT NULL,
    `planId` VARCHAR(36) NOT NULL,
    `featureId` VARCHAR(36) NOT NULL,
    `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE INDEX `subscription_plan_features_planId_featureId_key`(`planId`, `featureId`),
    INDEX `subscription_plan_features_planId_idx`(`planId`),
    INDEX `subscription_plan_features_featureId_idx`(`featureId`),
    PRIMARY KEY (`id`),
    CONSTRAINT `subscription_plan_features_planId_fkey` FOREIGN KEY (`planId`) REFERENCES `subscription_plans`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `subscription_plan_features_featureId_fkey` FOREIGN KEY (`featureId`) REFERENCES `features`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `features` (`id`, `key`, `name`, `description`, `group`, `status`, `createdAt`, `updatedAt`) VALUES
(UUID(), 'dashboard_analytics', 'Dashboard Analytics', 'Ringkasan performa toko seperti penjualan, pembelian, dan metrik operasional.', 'dashboard', 'active', NOW(), NOW()),
(UUID(), 'sales', 'Penjualan', 'Modul POS/kasir untuk membuat transaksi penjualan.', 'transactions', 'active', NOW(), NOW()),
(UUID(), 'sale_pending', 'Transaksi Pending', 'Menyimpan transaksi sementara untuk dilanjutkan nanti.', 'transactions', 'active', NOW(), NOW()),
(UUID(), 'purchases', 'Pembelian', 'Mencatat pembelian barang dari supplier dan penambahan stok.', 'transactions', 'active', NOW(), NOW()),
(UUID(), 'products', 'Produk', 'Mengelola produk, satuan, harga, kategori, dan stok dasar.', 'masters', 'active', NOW(), NOW()),
(UUID(), 'members', 'Pelanggan / Member', 'Mengelola data pelanggan/member toko.', 'masters', 'active', NOW(), NOW()),
(UUID(), 'member_levels', 'Level Member', 'Mengelola level pelanggan untuk harga atau segmentasi member.', 'masters', 'active', NOW(), NOW()),
(UUID(), 'suppliers', 'Supplier', 'Mengelola data pemasok.', 'masters', 'active', NOW(), NOW()),
(UUID(), 'sales_people', 'Sales People', 'Mengelola sales/marketing yang dikaitkan ke transaksi.', 'masters', 'active', NOW(), NOW()),
(UUID(), 'stock_opname', 'Stok Opname', 'Mencatat penyesuaian stok fisik dengan stok sistem.', 'inventory', 'active', NOW(), NOW()),
(UUID(), 'finance', 'Keuangan', 'Mengelola kas masuk, kas keluar, transfer kas, dan pengeluaran.', 'finance', 'active', NOW(), NOW()),
(UUID(), 'reports', 'Laporan', 'Akses menu laporan umum.', 'reports', 'active', NOW(), NOW()),
(UUID(), 'attendance', 'Absensi', 'Check-in/check-out karyawan dan daftar absensi.', 'operations', 'active', NOW(), NOW()),
(UUID(), 'attendance_list', 'List Absensi', 'Check-in/check-out karyawan dan daftar absensi.', 'operations', 'active', NOW(), NOW()),
(UUID(), 'settings', 'Pengaturan Toko', 'Konfigurasi toko dasar seperti profil toko, printer, dan pengaturan terkait.', 'settings', 'active', NOW(), NOW()),
(UUID(), 'rbac', 'Hak Akses User', 'Mengelola role dan permission pengguna per toko.', 'settings', 'active', NOW(), NOW()),
(UUID(), 'users', 'Hak Akses User', 'Mengelola pengguna toko.', 'settings', 'active', NOW(), NOW()),
(UUID(), 'multi_payment', 'Multi Payment', 'Satu transaksi dapat dibayar dengan beberapa metode pembayaran.', 'sales', 'active', NOW(), NOW()),
(UUID(), 'split_bill', 'Split Bill', 'Memisahkan tagihan atau item transaksi menjadi beberapa pembayaran.', 'sales', 'active', NOW(), NOW()),
(UUID(), 'receipt_printing', 'Cetak Struk', 'Cetak struk transaksi dari printer kasir.', 'sales', 'active', NOW(), NOW()),
(UUID(), 'kitchen_printing', 'Printer Dapur', 'Cetak order ke printer dapur untuk kebutuhan F&B.', 'sales', 'active', NOW(), NOW()),
(UUID(), 'cash_drawer', 'Cash Drawer', 'Membuka laci kas dari printer/perangkat kasir.', 'sales', 'active', NOW(), NOW()),
(UUID(), 'product_packages', 'Produk Paket', 'Membuat produk bundle/paket dari beberapa item.', 'products', 'active', NOW(), NOW()),
(UUID(), 'product_formula', 'Produk Formula / Racikan', 'Produk dengan komposisi bahan atau formula.', 'products', 'active', NOW(), NOW()),
(UUID(), 'member_pricing', 'Harga Khusus Member', 'Harga jual berbeda berdasarkan level member.', 'members', 'active', NOW(), NOW()),
(UUID(), 'purchase_order', 'Purchase Order', 'Mengelola purchase order sebelum pembelian.', 'transactions', 'active', NOW(), NOW()),
(UUID(), 'master_finance', 'Kas / Metode Pembayaran', 'Mengelola master pembayaran.', 'finance', 'active', NOW(), NOW()),
(UUID(), 'expense_management', 'Pengelolaan Pengeluaran', 'Mengelola kategori dan transaksi pengeluaran kas.', 'finance', 'active', NOW(), NOW()),
(UUID(), 'expense_category', 'Kategori Pengeluaran', 'Kategori pengeluaran kas.', 'finance', 'active', NOW(), NOW()),
(UUID(), 'expense', 'Kas Pengeluaran', 'Mengelola pengeluaran kas.', 'finance', 'active', NOW(), NOW()),
(UUID(), 'cash_in', 'Kas Masuk', 'Mengelola kas masuk.', 'finance', 'active', NOW(), NOW()),
(UUID(), 'cash_out', 'Kas Keluar', 'Mengelola kas keluar.', 'finance', 'active', NOW(), NOW()),
(UUID(), 'cash_transfer', 'Transfer Kas', 'Memindahkan saldo antar akun kas.', 'finance', 'active', NOW(), NOW()),
(UUID(), 'purchase_report', 'Laporan Pembelian', 'Laporan pembelian.', 'reports', 'active', NOW(), NOW()),
(UUID(), 'sale_report', 'Laporan Penjualan', 'Laporan penjualan.', 'reports', 'active', NOW(), NOW()),
(UUID(), 'margin_report', 'Laporan Margin', 'Laporan margin penjualan.', 'reports', 'active', NOW(), NOW()),
(UUID(), 'best_seller_report', 'Laporan Penjualan Terbaik', 'Laporan penjualan terbaik.', 'reports', 'active', NOW(), NOW()),
(UUID(), 'best_selling_report', 'Laporan Penjualan Terbaik', 'Laporan penjualan terbaik.', 'reports', 'active', NOW(), NOW()),
(UUID(), 'stock_report', 'Laporan Stok', 'Laporan stok barang.', 'reports', 'active', NOW(), NOW()),
(UUID(), 'stock_opname_report', 'Laporan Stok Opname', 'Laporan stok opname.', 'reports', 'active', NOW(), NOW()),
(UUID(), 'cashflow_report', 'Laporan Arus Kas', 'Laporan arus kas dari transaksi finance.', 'reports', 'active', NOW(), NOW()),
(UUID(), 'cash_in_report', 'Laporan Kas Masuk', 'Laporan kas masuk.', 'reports', 'active', NOW(), NOW()),
(UUID(), 'cash_out_report', 'Laporan Kas Keluar', 'Laporan kas keluar.', 'reports', 'active', NOW(), NOW()),
(UUID(), 'cash_transfer_report', 'Laporan Kas Transfer', 'Laporan transfer kas.', 'reports', 'active', NOW(), NOW()),
(UUID(), 'expense_report', 'Laporan Kas Flow', 'Laporan pengeluaran kas.', 'reports', 'active', NOW(), NOW()),
(UUID(), 'attendance_report', 'Laporan Absensi', 'Rekap absensi karyawan.', 'reports', 'active', NOW(), NOW()),
(UUID(), 'location_attendance', 'Absensi Dengan Lokasi', 'Validasi lokasi saat check-in/check-out.', 'attendance', 'active', NOW(), NOW()),
(UUID(), 'reset_transactions', 'Reset Transaksi', 'Reset data transaksi toko. Fitur sensitif untuk paket tinggi atau support internal.', 'maintenance', 'active', NOW(), NOW()),
(UUID(), 'store_branding', 'Branding Struk / Logo', 'Mengatur logo/branding toko pada struk atau tampilan terkait.', 'settings', 'active', NOW(), NOW()),
(UUID(), 'feature_management', 'Kelola Feature', 'Mengelola master feature entitlement.', 'internal', 'active', NOW(), NOW()),
(UUID(), 'plan_management', 'Kelola Paket Plan', 'Mengelola subscription plan dan mapping feature.', 'internal', 'active', NOW(), NOW()),
(UUID(), 'subscription_management', 'Kelola Subscription Store', 'Mengelola subscription aktif setiap store.', 'internal', 'active', NOW(), NOW()),
(UUID(), 'store_management', 'Kelola Store', 'Mengelola data toko dari panel superadmin.', 'internal', 'active', NOW(), NOW()),
(UUID(), 'admin_user_management', 'Kelola Admin Panel', 'Mengelola user/admin panel.', 'internal', 'active', NOW(), NOW()),
(UUID(), 'notification_broadcast', 'Broadcast Notification', 'Mengirim notifikasi ke user/store.', 'internal', 'active', NOW(), NOW()),
(UUID(), 'affiliate_management', 'Affiliate Management', 'Mengelola affiliator dan kode affiliate.', 'internal', 'active', NOW(), NOW()),
(UUID(), 'store_usage_report', 'Store Usage Report', 'Laporan penggunaan store.', 'internal', 'active', NOW(), NOW()),
(UUID(), 'subscription_report', 'Subscription Report', 'Laporan subscription toko.', 'internal', 'active', NOW(), NOW())
ON DUPLICATE KEY UPDATE
    `name` = VALUES(`name`),
    `description` = VALUES(`description`),
    `group` = VALUES(`group`),
    `status` = VALUES(`status`),
    `updatedAt` = NOW();

INSERT INTO `subscription_plans` (`id`, `code`, `name`, `description`, `price`, `durationMonth`, `status`, `isPublic`, `createdAt`, `updatedAt`) VALUES
(UUID(), 'TRIAL', 'Trial', 'Paket percobaan untuk toko baru.', 0, 1, 'active', TRUE, NOW(), NOW()),
(UUID(), 'BASIC', 'Basic', 'Paket dasar untuk operasional kasir sederhana.', NULL, 1, 'active', TRUE, NOW(), NOW()),
(UUID(), 'PRO', 'Pro', 'Paket lanjutan untuk operasional toko yang lebih lengkap.', NULL, 1, 'active', TRUE, NOW(), NOW()),
(UUID(), 'BUSINESS', 'Business', 'Paket lengkap untuk toko dengan kebutuhan manajemen lanjutan.', NULL, 1, 'active', TRUE, NOW(), NOW()),
(UUID(), 'LEGACY_FULL', 'Legacy Full Access', 'Paket internal untuk menjaga akses pengguna lama tetap sama.', 0, NULL, 'active', FALSE, NOW(), NOW())
ON DUPLICATE KEY UPDATE
    `name` = VALUES(`name`),
    `description` = VALUES(`description`),
    `price` = VALUES(`price`),
    `durationMonth` = VALUES(`durationMonth`),
    `status` = VALUES(`status`),
    `isPublic` = VALUES(`isPublic`),
    `updatedAt` = NOW();

-- Remove stale catalog mappings for public store plans, then reinsert the catalog recommendation.
DELETE spf
FROM `subscription_plan_features` spf
JOIN `subscription_plans` p ON p.`id` = spf.`planId`
JOIN `features` f ON f.`id` = spf.`featureId`
WHERE p.`code` IN ('TRIAL', 'BASIC', 'PRO', 'BUSINESS')
AND f.`key` IN (
    'dashboard_analytics', 'sales', 'sale_pending', 'purchases', 'products',
    'members', 'member_levels', 'suppliers', 'sales_people', 'stock_opname',
    'finance', 'reports', 'attendance', 'attendance_list', 'settings', 'rbac',
    'users', 'multi_payment', 'split_bill', 'receipt_printing', 'kitchen_printing',
    'cash_drawer', 'product_packages', 'product_formula', 'member_pricing',
    'purchase_order', 'master_finance', 'expense_management',
    'expense_category', 'expense', 'cash_in', 'cash_out',
    'cash_transfer', 'purchase_report', 'sale_report', 'margin_report',
    'best_seller_report', 'best_selling_report', 'stock_report',
    'stock_opname_report', 'cashflow_report',
    'cash_in_report', 'cash_out_report', 'cash_transfer_report', 'expense_report',
    'attendance_report', 'location_attendance', 'reset_transactions', 'store_branding'
);

INSERT IGNORE INTO `subscription_plan_features` (`id`, `planId`, `featureId`, `createdAt`)
SELECT UUID(), p.`id`, f.`id`, NOW()
FROM `subscription_plans` p
JOIN `features` f ON f.`key` IN ('sales', 'products', 'settings')
WHERE p.`code` = 'TRIAL';

INSERT IGNORE INTO `subscription_plan_features` (`id`, `planId`, `featureId`, `createdAt`)
SELECT UUID(), p.`id`, f.`id`, NOW()
FROM `subscription_plans` p
JOIN `features` f ON f.`key` IN (
    'dashboard_analytics', 'sales', 'products', 'members', 'suppliers',
    'sales_people', 'settings', 'reports', 'purchase_report', 'sale_report',
    'margin_report', 'best_selling_report', 'stock_opname_report'
)
WHERE p.`code` = 'BASIC';

INSERT IGNORE INTO `subscription_plan_features` (`id`, `planId`, `featureId`, `createdAt`)
SELECT UUID(), p.`id`, f.`id`, NOW()
FROM `subscription_plans` p
JOIN `features` f ON f.`key` IN (
    'dashboard_analytics', 'sales', 'sale_pending', 'products', 'members',
    'member_levels', 'suppliers', 'sales_people', 'purchases', 'stock_opname',
    'finance', 'reports', 'settings', 'multi_payment', 'receipt_printing',
    'product_packages', 'member_pricing', 'master_finance', 'expense_management',
    'expense_category',
    'expense', 'cash_in', 'cash_out', 'cash_transfer', 'purchase_report',
    'sale_report', 'margin_report', 'best_seller_report', 'best_selling_report',
    'stock_report', 'stock_opname_report',
    'cash_in_report', 'cash_out_report', 'cash_transfer_report', 'expense_report',
    'store_branding'
)
WHERE p.`code` = 'PRO';

INSERT IGNORE INTO `subscription_plan_features` (`id`, `planId`, `featureId`, `createdAt`)
SELECT UUID(), p.`id`, f.`id`, NOW()
FROM `subscription_plans` p
JOIN `features` f ON f.`key` IN (
    'dashboard_analytics', 'sales', 'sale_pending', 'products', 'members',
    'member_levels', 'suppliers', 'sales_people', 'purchases', 'stock_opname',
    'finance', 'reports', 'attendance', 'attendance_list', 'settings', 'rbac',
    'users', 'multi_payment', 'split_bill', 'receipt_printing', 'kitchen_printing',
    'cash_drawer', 'product_packages', 'product_formula', 'member_pricing',
    'purchase_order', 'master_finance', 'expense_management',
    'expense_category', 'expense', 'cash_in', 'cash_out',
    'cash_transfer', 'purchase_report', 'sale_report', 'margin_report',
    'best_seller_report', 'best_selling_report', 'stock_report',
    'stock_opname_report', 'cashflow_report',
    'cash_in_report', 'cash_out_report', 'cash_transfer_report', 'expense_report',
    'attendance_report', 'location_attendance', 'reset_transactions', 'store_branding'
)
WHERE p.`code` = 'BUSINESS';

-- Legacy Full gets every non-internal store feature so existing stores keep access.
INSERT IGNORE INTO `subscription_plan_features` (`id`, `planId`, `featureId`, `createdAt`)
SELECT UUID(), p.`id`, f.`id`, NOW()
FROM `subscription_plans` p
JOIN `features` f ON (f.`group` IS NULL OR f.`group` <> 'internal')
WHERE p.`code` = 'LEGACY_FULL';
