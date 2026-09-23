-- Make the database the single source of truth for plan-derived work.
ALTER TABLE `production_plans`
  ADD COLUMN `planType` ENUM('AGRICULTURE','CONSTRUCTION','INTERNAL_TRANSPORT') NOT NULL DEFAULT 'AGRICULTURE',
  ADD COLUMN `categoryCode` VARCHAR(191) NULL,
  ADD COLUMN `categoryName` VARCHAR(191) NULL;

CREATE INDEX `production_plans_planType_idx` ON `production_plans`(`planType`);

ALTER TABLE `production_plan_items`
  ADD COLUMN `location` VARCHAR(191) NULL,
  ADD COLUMN `origin` VARCHAR(191) NULL,
  ADD COLUMN `destination` VARCHAR(191) NULL,
  ADD COLUMN `machineType` VARCHAR(191) NULL,
  ADD COLUMN `durationHours` DOUBLE NOT NULL DEFAULT 0;

ALTER TABLE `dispatch_orders`
  MODIFY `sourceType` ENUM('MANUAL','MANUAL_EXCEPTION','PRODUCTION_ORDER','IMPORT') NOT NULL DEFAULT 'MANUAL_EXCEPTION',
  ADD COLUMN `generationKey` VARCHAR(191) NULL;

CREATE UNIQUE INDEX `dispatch_orders_generationKey_key` ON `dispatch_orders`(`generationKey`);

ALTER TABLE `transport_orders`
  ADD COLUMN `sourceType` ENUM('MANUAL','MANUAL_EXCEPTION','PRODUCTION_ORDER','IMPORT') NOT NULL DEFAULT 'MANUAL_EXCEPTION',
  ADD COLUMN `productionOrderId` INTEGER NULL,
  ADD COLUMN `generationKey` VARCHAR(191) NULL;

CREATE UNIQUE INDEX `transport_orders_generationKey_key` ON `transport_orders`(`generationKey`);
CREATE INDEX `transport_orders_productionOrderId_idx` ON `transport_orders`(`productionOrderId`);
ALTER TABLE `transport_orders`
  ADD CONSTRAINT `transport_orders_productionOrderId_fkey`
  FOREIGN KEY (`productionOrderId`) REFERENCES `production_orders`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- Preserve, but retire, plan-labelled dispatch rows that cannot be traced to a plan.
INSERT INTO `operational_audit_logs`
  (`entityType`, `entityId`, `actorId`, `action`, `oldValue`, `newValue`, `reason`, `createdAt`)
SELECT
  'DISPATCH_ORDER', d.`id`, d.`requesterId`, 'MIGRATION_CANCEL_ORPHAN',
  JSON_OBJECT('status', d.`status`, 'sourceType', d.`sourceType`, 'productionOrderId', d.`productionOrderId`),
  JSON_OBJECT('status', 'CANCELLED'),
  'Hủy lệnh nháp không có liên kết kế hoạch khi đồng bộ quy trình kế hoạch - điều xe', NOW(3)
FROM `dispatch_orders` d
WHERE d.`sourceType` = 'PRODUCTION_ORDER'
  AND d.`productionOrderId` IS NULL
  AND d.`status` = 'DRAFT';

UPDATE `dispatch_orders`
SET `status` = 'CANCELLED',
    `cancelledAt` = NOW(3),
    `rejectionReason` = 'Hủy lệnh nháp không có liên kết kế hoạch khi đồng bộ quy trình kế hoạch - điều xe'
WHERE `sourceType` = 'PRODUCTION_ORDER'
  AND `productionOrderId` IS NULL
  AND `status` = 'DRAFT';
