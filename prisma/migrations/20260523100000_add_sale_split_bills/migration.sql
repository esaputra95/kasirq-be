-- AlterTable
ALTER TABLE `salePayments` ADD COLUMN `splitBillId` VARCHAR(36) NULL;

-- CreateTable
CREATE TABLE `saleSplitBills` (
    `id` VARCHAR(36) NOT NULL,
    `saleId` VARCHAR(36) NULL,
    `salePendingId` VARCHAR(36) NULL,
    `storeId` VARCHAR(36) NOT NULL,
    `name` VARCHAR(100) NULL,
    `mode` VARCHAR(20) NOT NULL,
    `subTotal` DECIMAL(14, 4) NULL,
    `discount` DECIMAL(14, 4) NULL DEFAULT 0,
    `total` DECIMAL(14, 4) NOT NULL,
    `paidAmount` DECIMAL(14, 4) NULL DEFAULT 0,
    `changeAmount` DECIMAL(14, 4) NULL DEFAULT 0,
    `status` VARCHAR(20) NOT NULL DEFAULT 'OPEN',
    `userCreate` VARCHAR(36) NULL,
    `createdAt` DATETIME(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `deletedAt` DATETIME(0) NULL,

    INDEX `saleSplitBills_saleId_idx`(`saleId`),
    INDEX `saleSplitBills_salePendingId_idx`(`salePendingId`),
    INDEX `saleSplitBills_storeId_idx`(`storeId`),
    PRIMARY KEY (`id`)
);

-- CreateIndex
CREATE INDEX `salePayments_splitBillId_idx` ON `salePayments`(`splitBillId`);

-- AddForeignKey
ALTER TABLE `saleSplitBills` ADD CONSTRAINT `saleSplitBills_saleId_fkey` FOREIGN KEY (`saleId`) REFERENCES `sales`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `saleSplitBills` ADD CONSTRAINT `saleSplitBills_salePendingId_fkey` FOREIGN KEY (`salePendingId`) REFERENCES `salePending`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `saleSplitBills` ADD CONSTRAINT `saleSplitBills_storeId_fkey` FOREIGN KEY (`storeId`) REFERENCES `stores`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `salePayments` ADD CONSTRAINT `salePayments_splitBillId_fkey` FOREIGN KEY (`splitBillId`) REFERENCES `saleSplitBills`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
