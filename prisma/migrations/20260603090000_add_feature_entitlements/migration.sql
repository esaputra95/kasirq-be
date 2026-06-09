-- CreateTable
CREATE TABLE `features` (
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

-- CreateTable
CREATE TABLE `subscription_plans` (
    `id` VARCHAR(36) NOT NULL,
    `code` VARCHAR(50) NOT NULL,
    `name` VARCHAR(150) NOT NULL,
    `description` TEXT NULL,
    `price` DECIMAL(12, 2) NULL,
    `durationMonth` INTEGER NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'active',
    `isPublic` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updatedAt` DATETIME NOT NULL,

    UNIQUE INDEX `subscription_plans_code_key`(`code`),
    INDEX `subscription_plans_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `subscription_plan_features` (
    `id` VARCHAR(36) NOT NULL,
    `planId` VARCHAR(36) NOT NULL,
    `featureId` VARCHAR(36) NOT NULL,
    `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE INDEX `subscription_plan_features_planId_featureId_key`(`planId`, `featureId`),
    INDEX `subscription_plan_features_planId_idx`(`planId`),
    INDEX `subscription_plan_features_featureId_idx`(`featureId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AlterTable
ALTER TABLE `store_subscriptions` ADD COLUMN `planId` VARCHAR(36) NULL;

-- CreateIndex
CREATE INDEX `store_subscriptions_planId_idx` ON `store_subscriptions`(`planId`);

-- AddForeignKey
ALTER TABLE `subscription_plan_features` ADD CONSTRAINT `subscription_plan_features_planId_fkey` FOREIGN KEY (`planId`) REFERENCES `subscription_plans`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `subscription_plan_features` ADD CONSTRAINT `subscription_plan_features_featureId_fkey` FOREIGN KEY (`featureId`) REFERENCES `features`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `store_subscriptions` ADD CONSTRAINT `store_subscriptions_planId_fkey` FOREIGN KEY (`planId`) REFERENCES `subscription_plans`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- Seed features
INSERT IGNORE INTO `features` (`id`, `key`, `name`, `description`, `group`, `status`, `createdAt`, `updatedAt`) VALUES
(UUID(), 'sales', 'Penjualan', 'Transaksi penjualan utama.', 'transactions', 'active', NOW(), NOW()),
(UUID(), 'sale_pending', 'Pending Penjualan', 'Simpan dan lanjutkan transaksi pending.', 'transactions', 'active', NOW(), NOW()),
(UUID(), 'products', 'Produk', 'Kelola produk, kategori, brand, unit, dan varian.', 'masters', 'active', NOW(), NOW()),
(UUID(), 'purchases', 'Pembelian', 'Kelola pembelian dan stok masuk.', 'transactions', 'active', NOW(), NOW()),
(UUID(), 'members', 'Pelanggan', 'Kelola pelanggan dan level member.', 'masters', 'active', NOW(), NOW()),
(UUID(), 'stock_opname', 'Stok Opname', 'Kelola stok opname.', 'inventory', 'active', NOW(), NOW()),
(UUID(), 'finance', 'Akuntansi', 'Kelola kas, biaya, cash in, cash out, dan transfer kas.', 'finance', 'active', NOW(), NOW()),
(UUID(), 'reports', 'Laporan', 'Akses laporan operasional toko.', 'reports', 'active', NOW(), NOW()),
(UUID(), 'attendance', 'Absensi', 'Kelola absensi staff.', 'attendance', 'active', NOW(), NOW()),
(UUID(), 'settings', 'Pengaturan', 'Kelola pengaturan toko.', 'settings', 'active', NOW(), NOW()),
(UUID(), 'suppliers', 'Supplier', 'Kelola supplier.', 'masters', 'active', NOW(), NOW()),
(UUID(), 'sales_people', 'Sales', 'Kelola data sales.', 'masters', 'active', NOW(), NOW()),
(UUID(), 'rbac', 'Role dan Permission', 'Kelola role dan permission pengguna.', 'settings', 'active', NOW(), NOW());

-- Seed plans
INSERT IGNORE INTO `subscription_plans` (`id`, `code`, `name`, `description`, `price`, `durationMonth`, `status`, `isPublic`, `createdAt`, `updatedAt`) VALUES
(UUID(), 'TRIAL', 'Trial', 'Paket percobaan untuk toko baru.', 0, 1, 'active', true, NOW(), NOW()),
(UUID(), 'BASIC', 'Basic', 'Paket dasar untuk operasional kasir sederhana.', NULL, 1, 'active', true, NOW(), NOW()),
(UUID(), 'PRO', 'Pro', 'Paket lanjutan untuk operasional toko yang lebih lengkap.', NULL, 1, 'active', true, NOW(), NOW()),
(UUID(), 'BUSINESS', 'Business', 'Paket lengkap untuk toko dengan kebutuhan manajemen lanjutan.', NULL, 1, 'active', true, NOW(), NOW()),
(UUID(), 'LEGACY_FULL', 'Legacy Full Access', 'Paket internal untuk menjaga akses pengguna lama tetap sama.', 0, NULL, 'active', false, NOW(), NOW());

-- Seed TRIAL mapping
INSERT IGNORE INTO `subscription_plan_features` (`id`, `planId`, `featureId`, `createdAt`)
SELECT UUID(), p.id, f.id, NOW()
FROM `subscription_plans` p
JOIN `features` f ON f.`key` IN ('sales', 'products', 'members')
WHERE p.`code` = 'TRIAL';

-- Seed BASIC mapping
INSERT IGNORE INTO `subscription_plan_features` (`id`, `planId`, `featureId`, `createdAt`)
SELECT UUID(), p.id, f.id, NOW()
FROM `subscription_plans` p
JOIN `features` f ON f.`key` IN ('sales', 'products', 'members', 'purchases', 'suppliers')
WHERE p.`code` = 'BASIC';

-- Seed PRO mapping
INSERT IGNORE INTO `subscription_plan_features` (`id`, `planId`, `featureId`, `createdAt`)
SELECT UUID(), p.id, f.id, NOW()
FROM `subscription_plans` p
JOIN `features` f ON f.`key` IN ('sales', 'sale_pending', 'products', 'purchases', 'members', 'stock_opname', 'finance', 'reports', 'suppliers', 'sales_people')
WHERE p.`code` = 'PRO';

-- Seed BUSINESS mapping
INSERT IGNORE INTO `subscription_plan_features` (`id`, `planId`, `featureId`, `createdAt`)
SELECT UUID(), p.id, f.id, NOW()
FROM `subscription_plans` p
JOIN `features` f ON f.`key` IN ('sales', 'sale_pending', 'products', 'purchases', 'members', 'stock_opname', 'finance', 'reports', 'attendance', 'settings', 'suppliers', 'sales_people', 'rbac')
WHERE p.`code` = 'BUSINESS';

-- Seed LEGACY_FULL mapping
INSERT IGNORE INTO `subscription_plan_features` (`id`, `planId`, `featureId`, `createdAt`)
SELECT UUID(), p.id, f.id, NOW()
FROM `subscription_plans` p
JOIN `features` f
WHERE p.`code` = 'LEGACY_FULL';

-- Create legacy subscriptions for old stores that only have stores.expiredDate.
INSERT INTO `store_subscriptions` (
    `id`,
    `storeId`,
    `planId`,
    `type`,
    `startDate`,
    `endDate`,
    `durationMonth`,
    `price`,
    `status`,
    `createdAt`,
    `updatedAt`,
    `userCreate`
)
SELECT
    UUID(),
    s.`id`,
    p.`id`,
    'PAID',
    COALESCE(s.`createdAt`, NOW()),
    s.`expiredDate`,
    0,
    0,
    CASE WHEN s.`expiredDate` >= NOW() THEN 'ACTIVE' ELSE 'EXPIRED' END,
    COALESCE(s.`createdAt`, NOW()),
    NOW(),
    s.`userCreate`
FROM `stores` s
JOIN `subscription_plans` p ON p.`code` = 'LEGACY_FULL'
WHERE s.`expiredDate` IS NOT NULL
AND NOT EXISTS (
    SELECT 1
    FROM `store_subscriptions` ss
    WHERE ss.`storeId` = s.`id`
);

-- Protect existing stores by assigning current subscriptions to LEGACY_FULL.
UPDATE `store_subscriptions`
SET `planId` = (SELECT `id` FROM `subscription_plans` WHERE `code` = 'LEGACY_FULL' LIMIT 1)
WHERE `planId` IS NULL;
