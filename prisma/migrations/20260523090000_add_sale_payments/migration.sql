-- CreateTable
CREATE TABLE `salePayments` (
    `id` VARCHAR(36) NOT NULL,
    `saleId` VARCHAR(36) NULL,
    `salePendingId` VARCHAR(36) NULL,
    `storeId` VARCHAR(36) NOT NULL,
    `accountId` VARCHAR(36) NOT NULL,
    `amount` DECIMAL(14, 4) NOT NULL,
    `changeAmount` DECIMAL(14, 4) NULL DEFAULT 0,
    `paymentRef` VARCHAR(100) NULL,
    `note` VARCHAR(255) NULL,
    `userCreate` VARCHAR(36) NULL,
    `createdAt` DATETIME(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `deletedAt` DATETIME(0) NULL,

    INDEX `salePayments_saleId_idx`(`saleId`),
    INDEX `salePayments_salePendingId_idx`(`salePendingId`),
    INDEX `salePayments_accountId_idx`(`accountId`),
    INDEX `salePayments_storeId_idx`(`storeId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;

-- AddForeignKey
ALTER TABLE `salePayments` ADD CONSTRAINT `salePayments_saleId_fkey` FOREIGN KEY (`saleId`) REFERENCES `sales`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `salePayments` ADD CONSTRAINT `salePayments_salePendingId_fkey` FOREIGN KEY (`salePendingId`) REFERENCES `salePending`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `salePayments` ADD CONSTRAINT `salePayments_accountId_fkey` FOREIGN KEY (`accountId`) REFERENCES `account`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `salePayments` ADD CONSTRAINT `salePayments_storeId_fkey` FOREIGN KEY (`storeId`) REFERENCES `stores`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- Backfill existing sales so reports and invoice can use the new payment detail source.
INSERT INTO `salePayments` (
    `id`,
    `saleId`,
    `storeId`,
    `accountId`,
    `amount`,
    `changeAmount`,
    `note`,
    `userCreate`,
    `createdAt`
)
SELECT
    UUID(),
    s.`id`,
    s.`storeId`,
    COALESCE(s.`payMetodeId`, s.`accountCashId`, st.`defaultCashId`),
    COALESCE(s.`payCash`, s.`total`, 0),
    GREATEST(COALESCE(s.`payCash`, s.`total`, 0) - COALESCE(s.`total`, 0), 0),
    'Migrasi pembayaran lama',
    s.`userCreate`,
    s.`createdAt`
FROM `sales` s
LEFT JOIN `stores` st ON st.`id` = s.`storeId`
WHERE s.`storeId` IS NOT NULL
  AND COALESCE(s.`payMetodeId`, s.`accountCashId`, st.`defaultCashId`) IS NOT NULL;
