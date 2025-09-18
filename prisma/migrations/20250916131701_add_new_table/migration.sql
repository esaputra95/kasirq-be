/*
  Warnings:

  - You are about to drop the column `storeId` on the `brands` table. All the data in the column will be lost.
  - You are about to drop the column `storeId` on the `categories` table. All the data in the column will be lost.
  - You are about to drop the column `storeId` on the `memberLevels` table. All the data in the column will be lost.
  - You are about to drop the column `memberLevelId` on the `members` table. All the data in the column will be lost.
  - You are about to drop the column `storeId` on the `members` table. All the data in the column will be lost.
  - You are about to drop the column `categoriId` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `storeId` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `variantId` on the `purchaseDetails` table. All the data in the column will be lost.
  - You are about to drop the column `addtionalCost` on the `purchases` table. All the data in the column will be lost.
  - You are about to drop the column `variantId` on the `saleDetails` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `stores` table. All the data in the column will be lost.
  - You are about to drop the column `storeId` on the `suppliers` table. All the data in the column will be lost.
  - You are about to drop the column `storeId` on the `units` table. All the data in the column will be lost.
  - Added the required column `ownerId` to the `stores` table without a default value. This is not possible if the table is not empty.
  - Added the required column `ownerId` to the `units` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `brands` DROP FOREIGN KEY `brandStore`;

-- DropForeignKey
ALTER TABLE `categories` DROP FOREIGN KEY `categoriStore`;

-- DropForeignKey
ALTER TABLE `memberLevels` DROP FOREIGN KEY `memberLevelStore`;

-- DropForeignKey
ALTER TABLE `members` DROP FOREIGN KEY `memberLevel`;

-- DropForeignKey
ALTER TABLE `members` DROP FOREIGN KEY `memberStore`;

-- DropForeignKey
ALTER TABLE `productConversions` DROP FOREIGN KEY `productConversionProduct`;

-- DropForeignKey
ALTER TABLE `productConversions` DROP FOREIGN KEY `productConversionUnit`;

-- DropForeignKey
ALTER TABLE `productConversions` DROP FOREIGN KEY `productConversionUser`;

-- DropForeignKey
ALTER TABLE `products` DROP FOREIGN KEY `productBrand`;

-- DropForeignKey
ALTER TABLE `products` DROP FOREIGN KEY `productCategori`;

-- DropForeignKey
ALTER TABLE `products` DROP FOREIGN KEY `productStore`;

-- DropForeignKey
ALTER TABLE `products` DROP FOREIGN KEY `productUser`;

-- DropForeignKey
ALTER TABLE `purchaseDetails` DROP FOREIGN KEY `purchaseDetailVariant`;

-- DropForeignKey
ALTER TABLE `saleDetails` DROP FOREIGN KEY `saleDetailVariant`;

-- DropForeignKey
ALTER TABLE `stores` DROP FOREIGN KEY `storeUser`;

-- DropForeignKey
ALTER TABLE `suppliers` DROP FOREIGN KEY `supplierStore`;

-- DropForeignKey
ALTER TABLE `units` DROP FOREIGN KEY `unitStore`;

-- AlterTable
ALTER TABLE `brands` DROP COLUMN `storeId`,
    ADD COLUMN `ownerId` VARCHAR(36) NULL;

-- AlterTable
ALTER TABLE `categories` DROP COLUMN `storeId`,
    ADD COLUMN `ownerId` VARCHAR(36) NULL;

-- AlterTable
ALTER TABLE `memberLevels` DROP COLUMN `storeId`,
    ADD COLUMN `ownerId` VARCHAR(36) NULL;

-- AlterTable
ALTER TABLE `members` DROP COLUMN `memberLevelId`,
    DROP COLUMN `storeId`,
    ADD COLUMN `level` INTEGER NULL,
    ADD COLUMN `ownerId` VARCHAR(36) NULL;

-- AlterTable
ALTER TABLE `products` DROP COLUMN `categoriId`,
    DROP COLUMN `storeId`,
    ADD COLUMN `barcode` VARCHAR(100) NULL,
    ADD COLUMN `categoryId` VARCHAR(36) NULL,
    ADD COLUMN `isStock` INTEGER NULL,
    ADD COLUMN `ownerId` VARCHAR(36) NULL,
    ADD COLUMN `priceType` INTEGER NULL,
    ADD COLUMN `sku` VARCHAR(255) NULL,
    MODIFY `brandId` VARCHAR(36) NULL;

-- AlterTable
ALTER TABLE `purchaseDetails` DROP COLUMN `variantId`,
    ADD COLUMN `productConversionId` VARCHAR(36) NULL;

-- AlterTable
ALTER TABLE `purchases` DROP COLUMN `addtionalCost`,
    ADD COLUMN `additionalCost` DECIMAL(14, 4) NULL;

-- AlterTable
ALTER TABLE `saleDetails` DROP COLUMN `variantId`,
    ADD COLUMN `productConversionId` VARCHAR(36) NULL;

-- AlterTable
ALTER TABLE `sales` ADD COLUMN `description` TEXT NULL,
    ADD COLUMN `shippingCost` DECIMAL(14, 4) NULL,
    ADD COLUMN `transactionNumber` INTEGER NULL;

-- AlterTable
ALTER TABLE `stores` DROP COLUMN `userId`,
    ADD COLUMN `ownerId` VARCHAR(36) NOT NULL;

-- AlterTable
ALTER TABLE `suppliers` DROP COLUMN `storeId`,
    ADD COLUMN `ownerId` VARCHAR(36) NULL;

-- AlterTable
ALTER TABLE `units` DROP COLUMN `storeId`,
    ADD COLUMN `ownerId` VARCHAR(36) NOT NULL;

-- AlterTable
ALTER TABLE `users` ADD COLUMN `level` ENUM('superadmin', 'admin', 'owner', 'cashier', 'supervisor') NULL,
    ADD COLUMN `storeId` VARCHAR(36) NULL,
    ADD COLUMN `token` TEXT NULL,
    ADD COLUMN `verified` ENUM('active', 'non_active', 'email_verification') NOT NULL DEFAULT 'non_active';

-- CreateTable
CREATE TABLE `subscriptionStore` (
    `id` VARCHAR(36) NOT NULL,
    `storeId` VARCHAR(36) NULL,
    `startDate` DATE NULL,
    `endDate` DATE NULL,
    `userCreate` VARCHAR(36) NULL,
    `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `deletedAt` DATETIME NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `salePendingDetails` (
    `id` VARCHAR(36) NOT NULL,
    `saleId` VARCHAR(36) NOT NULL,
    `productId` VARCHAR(36) NOT NULL,
    `productConversionId` VARCHAR(36) NULL,
    `quantityOrder` DECIMAL(14, 4) NULL,
    `quantity` DECIMAL(14, 4) NULL,
    `price` DECIMAL(14, 4) NULL,
    `discount` DECIMAL(14, 4) NULL,
    `total` DECIMAL(14, 4) NULL,
    `expiredDate` DATE NULL,
    `status` ENUM('ordered', 'cooking', 'cancle', 'served', 'finish') NULL DEFAULT 'ordered',
    `userCreate` VARCHAR(36) NULL,
    `createdAt` DATETIME(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `deletedAt` DATETIME(0) NULL,

    INDEX `saleDetailProduct`(`productId`),
    INDEX `saleDetailSale`(`saleId`),
    INDEX `saleDetailUser`(`userCreate`),
    INDEX `saleDetailVariant`(`productConversionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `salePending` (
    `id` VARCHAR(36) NOT NULL,
    `storeId` VARCHAR(36) NULL,
    `memberId` VARCHAR(36) NULL,
    `saleOrderId` VARCHAR(36) NULL,
    `date` DATE NULL,
    `invoice` VARCHAR(100) NULL,
    `subTotal` DECIMAL(14, 4) NULL,
    `tax` DECIMAL(14, 4) NULL,
    `discount` DECIMAL(14, 4) NULL,
    `addtionalCost` DECIMAL(14, 4) NULL,
    `shippingCost` DECIMAL(14, 4) NULL,
    `total` DECIMAL(14, 4) NULL,
    `downPayment` DECIMAL(14, 4) NULL,
    `payCash` DECIMAL(14, 4) NULL,
    `payCredit` DECIMAL(14, 4) NULL,
    `payMetodeId` VARCHAR(36) NULL,
    `status` ENUM('ordered', 'finish') NULL DEFAULT 'ordered',
    `accountCashId` VARCHAR(36) NULL,
    `accountDebitId` VARCHAR(36) NULL,
    `accountCreditId` VARCHAR(36) NULL,
    `accountDownPaymentId` VARCHAR(36) NULL,
    `description` TEXT NULL,
    `userCreate` VARCHAR(36) NULL,
    `createdAt` DATETIME(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `deletedAt` DATETIME(0) NULL,
    `transactionNumber` INTEGER NULL,

    INDEX `saleMember`(`memberId`),
    INDEX `saleStore`(`storeId`),
    INDEX `saleUser`(`userCreate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `stocks` (
    `id` VARCHAR(36) NOT NULL,
    `storeId` VARCHAR(36) NOT NULL,
    `productId` VARCHAR(36) NOT NULL,
    `quantity` INTEGER NOT NULL,
    `userCreate` VARCHAR(36) NULL,
    `createdAt` DATETIME(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `deletedAt` DATETIME(0) NULL,

    UNIQUE INDEX `stocks_productId_key`(`productId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `productPurchasePrices` (
    `id` VARCHAR(36) NOT NULL,
    `conversionId` VARCHAR(36) NULL,
    `storeId` VARCHAR(36) NULL,
    `price` FLOAT NULL,
    `userCreate` VARCHAR(36) NULL,
    `createdAt` DATETIME(0) NULL,
    `updatedAt` DATETIME(0) NULL,
    `deletedAt` DATETIME(0) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `productSellPrices` (
    `id` VARCHAR(36) NOT NULL,
    `conversionId` VARCHAR(36) NULL,
    `storeId` VARCHAR(36) NULL,
    `price` FLOAT NULL,
    `level` SMALLINT NULL DEFAULT 1,
    `userCreate` VARCHAR(36) NULL,
    `createdAt` DATETIME(0) NULL,
    `updatedAt` DATETIME(0) NULL,
    `deletedAt` DATETIME(0) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cogs` (
    `id` VARCHAR(36) NOT NULL,
    `hppHistoryId` VARCHAR(36) NULL,
    `price` DECIMAL(14, 2) NULL,
    `quantity` DECIMAL(14, 2) NULL,
    `saleDetailId` VARCHAR(36) NOT NULL,
    `userCreate` VARCHAR(36) NULL,
    `createdAt` DATETIME(0) NULL,
    `updatedAt` DATETIME(0) NULL,
    `deletedAt` DATETIME(0) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `hppHistory` (
    `id` VARCHAR(36) NOT NULL,
    `storeId` VARCHAR(36) NULL,
    `transactionDetailId` VARCHAR(36) NULL,
    `date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `productId` VARCHAR(36) NOT NULL,
    `price` FLOAT NULL,
    `type` VARCHAR(191) NULL,
    `quantity` INTEGER NULL DEFAULT 1,
    `quantityUsed` INTEGER NULL,
    `status` ENUM('available', 'not_available') NULL DEFAULT 'available',

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `account` (
    `id` VARCHAR(36) NOT NULL,
    `ownerId` VARCHAR(36) NOT NULL,
    `name` VARCHAR(255) NULL,
    `balance` DECIMAL(13, 4) NULL,
    `type` VARCHAR(10) NULL,
    `image` TEXT NULL,
    `createdAt` DATETIME(0) NULL,
    `updatedAt` DATETIME(0) NULL,
    `deletedAt` DATETIME(0) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `debts` (
    `id` VARCHAR(36) NOT NULL,
    `transactionId` VARCHAR(36) NULL,
    `total` DECIMAL(14, 4) NULL,
    `paid` DECIMAL(14, 4) NULL,
    `remainder` DECIMAL(14, 4) NULL,
    `userCreate` VARCHAR(36) NULL,
    `createdAt` DATETIME(0) NULL,
    `updatedAt` DATETIME(0) NULL,
    `deletedAt` DATETIME(0) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `itemInDetails` (
    `id` VARCHAR(36) NOT NULL,
    `itemInId` VARCHAR(36) NOT NULL,
    `productId` VARCHAR(36) NOT NULL,
    `productConversionId` VARCHAR(36) NULL,
    `quantity` DECIMAL(14, 4) NULL,
    `price` DECIMAL(14, 4) NULL,
    `total` DECIMAL(14, 4) NULL,
    `expiredDate` DATE NULL,
    `description` TEXT NULL,
    `userCreate` VARCHAR(36) NULL,
    `createdAt` DATETIME(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `deletedAt` DATETIME(0) NULL,

    INDEX `purchaseDetailProduct`(`productId`),
    INDEX `purchaseDetailPurchase`(`itemInId`),
    INDEX `purchaseDetailUser`(`userCreate`),
    INDEX `purchaseDetailVariant`(`productConversionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `itemIns` (
    `id` VARCHAR(36) NOT NULL,
    `storeId` VARCHAR(36) NULL,
    `date` DATE NOT NULL,
    `invoice` VARCHAR(100) NOT NULL,
    `subTotal` DECIMAL(14, 4) NULL,
    `total` DECIMAL(14, 4) NULL,
    `description` TEXT NULL,
    `userCreate` VARCHAR(36) NULL,
    `createdAt` DATETIME(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `deletedAt` DATETIME(0) NULL,

    INDEX `purchaseStore`(`storeId`),
    INDEX `purchaseUser`(`userCreate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `itemOutDetails` (
    `id` VARCHAR(36) NOT NULL,
    `purchaseId` VARCHAR(36) NOT NULL,
    `productId` VARCHAR(36) NOT NULL,
    `productConversionId` VARCHAR(36) NULL,
    `quantity` DECIMAL(14, 4) NULL,
    `price` DECIMAL(14, 4) NULL,
    `total` DECIMAL(14, 4) NULL,
    `expiredDate` DATE NULL,
    `description` TEXT NULL,
    `userCreate` VARCHAR(36) NULL,
    `createdAt` DATETIME(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `deletedAt` DATETIME(0) NULL,

    INDEX `purchaseDetailProduct`(`productId`),
    INDEX `purchaseDetailPurchase`(`purchaseId`),
    INDEX `purchaseDetailUser`(`userCreate`),
    INDEX `purchaseDetailVariant`(`productConversionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `itemOuts` (
    `id` VARCHAR(36) NOT NULL,
    `storeId` VARCHAR(36) NULL,
    `date` DATE NOT NULL,
    `invoice` VARCHAR(100) NOT NULL,
    `subTotal` DECIMAL(14, 4) NULL,
    `total` DECIMAL(14, 4) NULL,
    `description` TEXT NULL,
    `userCreate` VARCHAR(36) NULL,
    `createdAt` DATETIME(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `deletedAt` DATETIME(0) NULL,

    INDEX `purchaseStore`(`storeId`),
    INDEX `purchaseUser`(`userCreate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `purchaseOrderDetails` (
    `id` VARCHAR(36) NOT NULL,
    `purchaseId` VARCHAR(36) NOT NULL,
    `productId` VARCHAR(36) NOT NULL,
    `productConversionId` VARCHAR(36) NULL,
    `quantity` DECIMAL(14, 4) NULL,
    `quantityReceived` INTEGER NULL,
    `price` DECIMAL(14, 4) NULL,
    `discount` DECIMAL(14, 4) NULL,
    `total` DECIMAL(14, 4) NULL,
    `expiredDate` DATE NULL,
    `userCreate` VARCHAR(36) NULL,
    `createdAt` DATETIME(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `deletedAt` DATETIME(0) NULL,

    INDEX `purchaseDetailProduct`(`productId`),
    INDEX `purchaseDetailPurchase`(`purchaseId`),
    INDEX `purchaseDetailUser`(`userCreate`),
    INDEX `purchaseDetailVariant`(`productConversionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `purchaseOrders` (
    `id` VARCHAR(36) NOT NULL,
    `storeId` VARCHAR(36) NULL,
    `supplierId` VARCHAR(36) NOT NULL,
    `date` DATE NOT NULL,
    `sendDate` DATE NULL,
    `invoice` VARCHAR(100) NOT NULL,
    `subTotal` DECIMAL(14, 4) NULL,
    `tax` DECIMAL(14, 4) NULL,
    `discount` DECIMAL(14, 4) NULL,
    `addtionalCost` DECIMAL(14, 4) NULL,
    `total` DECIMAL(14, 4) NULL,
    `downPayment` DECIMAL(14, 4) NULL,
    `payCash` DECIMAL(14, 4) NULL,
    `payCredit` DECIMAL(14, 4) NULL,
    `payMetodeId` VARCHAR(36) NULL,
    `accountCashId` VARCHAR(36) NULL,
    `accountDebitId` VARCHAR(36) NULL,
    `accountCreditId` VARCHAR(36) NULL,
    `accountDownPaymentId` VARCHAR(36) NULL,
    `userCreate` VARCHAR(36) NULL,
    `createdAt` DATETIME(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `deletedAt` DATETIME(0) NULL,

    INDEX `purchaseStore`(`storeId`),
    INDEX `purchaseSupplier`(`supplierId`),
    INDEX `purchaseUser`(`userCreate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `ownerId` ON `categories`(`ownerId`);

-- CreateIndex
CREATE INDEX `memberLevelStore` ON `memberLevels`(`ownerId`);

-- CreateIndex
CREATE INDEX `productStore` ON `products`(`ownerId`);

-- CreateIndex
CREATE INDEX `categoryId` ON `products`(`categoryId`);

-- CreateIndex
CREATE INDEX `purchaseDetailVariant` ON `purchaseDetails`(`productConversionId`);

-- CreateIndex
CREATE INDEX `saleDetailVariant` ON `saleDetails`(`productConversionId`);

-- CreateIndex
CREATE INDEX `storeUser` ON `stores`(`ownerId`);

-- CreateIndex
CREATE INDEX `supplierStore` ON `suppliers`(`ownerId`);

-- CreateIndex
CREATE INDEX `unitStore` ON `units`(`ownerId`);

-- AddForeignKey
ALTER TABLE `subscriptionStore` ADD CONSTRAINT `subscriptionStore_storeId_fkey` FOREIGN KEY (`storeId`) REFERENCES `stores`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `subscriptionStore` ADD CONSTRAINT `subscriptionStore_userCreate_fkey` FOREIGN KEY (`userCreate`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `categories` ADD CONSTRAINT `categories_ibfk_1` FOREIGN KEY (`ownerId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `memberLevels` ADD CONSTRAINT `memberlevels_ibfk_1` FOREIGN KEY (`ownerId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `members` ADD CONSTRAINT `members_ibfk_1` FOREIGN KEY (`ownerId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `productConversions` ADD CONSTRAINT `productConversions_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `productConversions` ADD CONSTRAINT `productConversions_unitId_fkey` FOREIGN KEY (`unitId`) REFERENCES `units`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `products` ADD CONSTRAINT `products_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `categories`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `products` ADD CONSTRAINT `products_brandId_fkey` FOREIGN KEY (`brandId`) REFERENCES `brands`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `purchaseDetails` ADD CONSTRAINT `purchasedetails_ibfk_1` FOREIGN KEY (`productConversionId`) REFERENCES `productConversions`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `saleDetails` ADD CONSTRAINT `saledetails_ibfk_1` FOREIGN KEY (`productConversionId`) REFERENCES `productConversions`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `salePendingDetails` ADD CONSTRAINT `saleDetailPendingProduct` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `salePendingDetails` ADD CONSTRAINT `saleDetailPendingSale` FOREIGN KEY (`saleId`) REFERENCES `salePending`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `salePendingDetails` ADD CONSTRAINT `saleDetailPendingUser` FOREIGN KEY (`userCreate`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `salePendingDetails` ADD CONSTRAINT `salependingdetail_ibfk_1` FOREIGN KEY (`productConversionId`) REFERENCES `productConversions`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `sales` ADD CONSTRAINT `salePaymentMethod` FOREIGN KEY (`payMetodeId`) REFERENCES `account`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `salePending` ADD CONSTRAINT `salePendingMember` FOREIGN KEY (`memberId`) REFERENCES `members`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `salePending` ADD CONSTRAINT `salePendingStore` FOREIGN KEY (`storeId`) REFERENCES `stores`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `salePending` ADD CONSTRAINT `salePendingUser` FOREIGN KEY (`userCreate`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `stores` ADD CONSTRAINT `storeUser` FOREIGN KEY (`ownerId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `suppliers` ADD CONSTRAINT `suppliers_ibfk_1` FOREIGN KEY (`ownerId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `units` ADD CONSTRAINT `units_ibfk_1` FOREIGN KEY (`ownerId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stocks` ADD CONSTRAINT `stocks_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `productPurchasePrices` ADD CONSTRAINT `productPurchasePrices_conversionId_fkey` FOREIGN KEY (`conversionId`) REFERENCES `productConversions`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `productSellPrices` ADD CONSTRAINT `productSellPrices_conversionId_fkey` FOREIGN KEY (`conversionId`) REFERENCES `productConversions`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cogs` ADD CONSTRAINT `cogs_saleDetailId_fkey` FOREIGN KEY (`saleDetailId`) REFERENCES `saleDetails`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `itemInDetails` ADD CONSTRAINT `itemindetails_ibfk_1` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `itemInDetails` ADD CONSTRAINT `itemindetails_ibfk_2` FOREIGN KEY (`itemInId`) REFERENCES `itemIns`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `itemInDetails` ADD CONSTRAINT `itemindetails_ibfk_3` FOREIGN KEY (`productConversionId`) REFERENCES `productConversions`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `itemInDetails` ADD CONSTRAINT `itemindetails_ibfk_4` FOREIGN KEY (`userCreate`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `itemIns` ADD CONSTRAINT `itemins_ibfk_1` FOREIGN KEY (`storeId`) REFERENCES `stores`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `itemIns` ADD CONSTRAINT `itemins_ibfk_3` FOREIGN KEY (`userCreate`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `itemOutDetails` ADD CONSTRAINT `itemoutdetails_ibfk_1` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `itemOutDetails` ADD CONSTRAINT `itemoutdetails_ibfk_2` FOREIGN KEY (`purchaseId`) REFERENCES `purchases`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `itemOutDetails` ADD CONSTRAINT `itemoutdetails_ibfk_3` FOREIGN KEY (`productConversionId`) REFERENCES `productConversions`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `itemOutDetails` ADD CONSTRAINT `itemoutdetails_ibfk_4` FOREIGN KEY (`userCreate`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `itemOuts` ADD CONSTRAINT `itemouts_ibfk_1` FOREIGN KEY (`storeId`) REFERENCES `stores`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `itemOuts` ADD CONSTRAINT `itemouts_ibfk_2` FOREIGN KEY (`userCreate`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `purchaseOrderDetails` ADD CONSTRAINT `purchaseorderdetails_ibfk_1` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `purchaseOrderDetails` ADD CONSTRAINT `purchaseorderdetails_ibfk_2` FOREIGN KEY (`purchaseId`) REFERENCES `purchases`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `purchaseOrderDetails` ADD CONSTRAINT `purchaseorderdetails_ibfk_3` FOREIGN KEY (`productConversionId`) REFERENCES `productConversions`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `purchaseOrderDetails` ADD CONSTRAINT `purchaseorderdetails_ibfk_4` FOREIGN KEY (`userCreate`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `purchaseOrders` ADD CONSTRAINT `purchaseorders_ibfk_1` FOREIGN KEY (`storeId`) REFERENCES `stores`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `purchaseOrders` ADD CONSTRAINT `purchaseorders_ibfk_2` FOREIGN KEY (`supplierId`) REFERENCES `suppliers`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `purchaseOrders` ADD CONSTRAINT `purchaseorders_ibfk_3` FOREIGN KEY (`userCreate`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
