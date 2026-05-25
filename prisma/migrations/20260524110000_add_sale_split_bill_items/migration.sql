-- CreateTable
CREATE TABLE `saleSplitBillItems` (
    `id` VARCHAR(36) NOT NULL,
    `splitBillId` VARCHAR(36) NOT NULL,
    `productId` VARCHAR(36) NOT NULL,
    `productConversionId` VARCHAR(36) NULL,
    `quantity` DECIMAL(14, 4) NOT NULL,
    `price` DECIMAL(14, 4) NOT NULL,
    `total` DECIMAL(14, 4) NOT NULL,
    `createdAt` DATETIME(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `deletedAt` DATETIME(0) NULL,

    INDEX `saleSplitBillItems_splitBillId_idx`(`splitBillId`),
    INDEX `saleSplitBillItems_productId_idx`(`productId`),
    INDEX `saleSplitBillItems_productConversionId_idx`(`productConversionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;

-- AddForeignKey
ALTER TABLE `saleSplitBillItems` ADD CONSTRAINT `saleSplitBillItems_splitBillId_fkey` FOREIGN KEY (`splitBillId`) REFERENCES `saleSplitBills`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `saleSplitBillItems` ADD CONSTRAINT `saleSplitBillItems_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `saleSplitBillItems` ADD CONSTRAINT `saleSplitBillItems_productConversionId_fkey` FOREIGN KEY (`productConversionId`) REFERENCES `productConversions`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
