CREATE TABLE `activityLogs` (
    `id` VARCHAR(36) NOT NULL,
    `ownerId` VARCHAR(36) NULL,
    `storeId` VARCHAR(36) NULL,
    `userId` VARCHAR(36) NULL,
    `userLevel` VARCHAR(50) NULL,
    `actorName` VARCHAR(255) NULL,
    `action` VARCHAR(30) NOT NULL,
    `module` VARCHAR(80) NOT NULL,
    `entityId` VARCHAR(36) NULL,
    `entityLabel` VARCHAR(255) NULL,
    `method` VARCHAR(10) NULL,
    `path` VARCHAR(255) NULL,
    `ipAddress` VARCHAR(45) NULL,
    `userAgent` TEXT NULL,
    `beforeData` JSON NULL,
    `afterData` JSON NULL,
    `changes` JSON NULL,
    `metadata` JSON NULL,
    `createdAt` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `activityLogs_ownerId_createdAt_idx`(`ownerId`, `createdAt`),
    INDEX `activityLogs_storeId_createdAt_idx`(`storeId`, `createdAt`),
    INDEX `activityLogs_userId_createdAt_idx`(`userId`, `createdAt`),
    INDEX `activityLogs_module_createdAt_idx`(`module`, `createdAt`),
    INDEX `activityLogs_action_createdAt_idx`(`action`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `activityLogs` ADD CONSTRAINT `activityLogs_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `activityLogs` ADD CONSTRAINT `activityLogs_storeId_fkey` FOREIGN KEY (`storeId`) REFERENCES `stores`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
