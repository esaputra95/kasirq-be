-- Add PPN/tax configuration to stores.
ALTER TABLE `stores`
  ADD COLUMN `taxEnabled` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `taxRate` DECIMAL(5, 2) NULL DEFAULT 11,
  ADD COLUMN `taxLabel` VARCHAR(50) NULL DEFAULT 'PPN',
  ADD COLUMN `salesTaxType` VARCHAR(20) NULL DEFAULT 'exclude',
  ADD COLUMN `purchaseTaxType` VARCHAR(20) NULL DEFAULT 'include',
  ADD COLUMN `taxScope` VARCHAR(30) NULL DEFAULT 'all_products';

-- Add product-level tax eligibility for selected-products tax mode.
ALTER TABLE `products`
  ADD COLUMN `isTaxable` BOOLEAN NOT NULL DEFAULT true;

-- Keep a tax snapshot on sales so historical transactions remain auditable.
ALTER TABLE `sales`
  ADD COLUMN `taxBase` DECIMAL(14, 4) NULL AFTER `tax`,
  ADD COLUMN `taxRate` DECIMAL(5, 2) NULL AFTER `taxBase`,
  ADD COLUMN `taxType` VARCHAR(20) NULL AFTER `taxRate`,
  ADD COLUMN `taxLabel` VARCHAR(50) NULL AFTER `taxType`;

-- Keep the same snapshot on pending sales/orders.
ALTER TABLE `salePending`
  ADD COLUMN `taxBase` DECIMAL(14, 4) NULL AFTER `tax`,
  ADD COLUMN `taxRate` DECIMAL(5, 2) NULL AFTER `taxBase`,
  ADD COLUMN `taxType` VARCHAR(20) NULL AFTER `taxRate`,
  ADD COLUMN `taxLabel` VARCHAR(50) NULL AFTER `taxType`;

-- Keep a tax snapshot on purchases for PPN masukan reporting.
ALTER TABLE `purchases`
  ADD COLUMN `taxBase` DECIMAL(14, 4) NULL AFTER `tax`,
  ADD COLUMN `taxRate` DECIMAL(5, 2) NULL AFTER `taxBase`,
  ADD COLUMN `taxType` VARCHAR(20) NULL AFTER `taxRate`,
  ADD COLUMN `taxLabel` VARCHAR(50) NULL AFTER `taxType`;
