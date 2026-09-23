CREATE TABLE `management_unit_manager_assignments` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `managementUnitId` INTEGER NOT NULL,
  `managerUserId` INTEGER NOT NULL,
  `managerType` ENUM('PRIMARY', 'DEPUTY') NOT NULL DEFAULT 'PRIMARY',
  `effectiveFrom` DATETIME(3) NOT NULL,
  `effectiveTo` DATETIME(3) NULL,
  `assignedById` INTEGER NOT NULL,
  `legacyCatalogId` VARCHAR(191) NULL,
  `reason` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  INDEX `manager_assignment_unit_effective_idx`(`managementUnitId`, `managerType`, `effectiveFrom`, `effectiveTo`),
  INDEX `manager_assignment_user_effective_idx`(`managerUserId`, `effectiveFrom`, `effectiveTo`),
  INDEX `management_unit_manager_assignments_legacyCatalogId_idx`(`legacyCatalogId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `operational_audit_logs`
  MODIFY `entityType` ENUM('VEHICLE','VEHICLE_DRIVER_ASSIGNMENT','MANAGEMENT_UNIT_MANAGER_ASSIGNMENT','DRIVER_UNAVAILABILITY','VEHICLE_UNAVAILABILITY','MAINTENANCE','REPAIR','WORK_ORDER','PRODUCTION_PLAN','PRODUCTION_ORDER','DISPATCH_ORDER','TRANSPORT_ORDER','OPERATION_CONFIRMATION') NOT NULL;

ALTER TABLE `vehicles`
  ADD COLUMN `managementUnitId` INTEGER NULL,
  ADD COLUMN `currentSpeedKmH` DOUBLE NULL,
  ADD COLUMN `movingSince` DATETIME(3) NULL,
  ADD INDEX `vehicles_managementUnitId_idx`(`managementUnitId`);

ALTER TABLE `driver_management_access_scopes`
  ADD COLUMN `isManagerProjection` BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE `operational_work_orders`
  ADD COLUMN `managementUnitId` INTEGER NULL,
  ADD INDEX `operational_work_orders_managementUnitId_idx`(`managementUnitId`);

ALTER TABLE `alert_events`
  ADD COLUMN `managementUnitId` INTEGER NULL,
  ADD INDEX `alert_events_managementUnitId_status_idx`(`managementUnitId`, `status`);

ALTER TABLE `management_unit_manager_assignments`
  ADD CONSTRAINT `management_unit_manager_assignments_managementUnitId_fkey`
  FOREIGN KEY (`managementUnitId`) REFERENCES `driver_management_units`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `management_unit_manager_assignments_managerUserId_fkey`
  FOREIGN KEY (`managerUserId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `management_unit_manager_assignments_assignedById_fkey`
  FOREIGN KEY (`assignedById`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `vehicles`
  ADD CONSTRAINT `vehicles_managementUnitId_fkey`
  FOREIGN KEY (`managementUnitId`) REFERENCES `driver_management_units`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `operational_work_orders`
  ADD CONSTRAINT `operational_work_orders_managementUnitId_fkey`
  FOREIGN KEY (`managementUnitId`) REFERENCES `driver_management_units`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `alert_events`
  ADD CONSTRAINT `alert_events_managementUnitId_fkey`
  FOREIGN KEY (`managementUnitId`) REFERENCES `driver_management_units`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill only exact, unique catalog mappings. Ambiguous rows remain NULL for reconciliation.
INSERT IGNORE INTO `driver_management_units`
  (`complexCode`, `code`, `name`, `level`, `unitType`, `status`, `createdAt`, `updatedAt`)
SELECT
  COALESCE(NULLIF(TRIM(c.`parentCode`), ''), 'KOUN_MOM'),
  c.`code`,
  c.`name`,
  'OWNER',
  'XI_NGHIEP',
  'ACTIVE',
  CURRENT_TIMESTAMP(3),
  CURRENT_TIMESTAMP(3)
FROM `catalogs` c
LEFT JOIN `driver_management_units` u
  ON u.`complexCode` = COALESCE(NULLIF(TRIM(c.`parentCode`), ''), 'KOUN_MOM')
 AND (LOWER(TRIM(u.`code`)) = LOWER(TRIM(c.`code`)) OR LOWER(TRIM(u.`name`)) = LOWER(TRIM(c.`name`)))
WHERE c.`type` = 'ENTERPRISE' AND u.`id` IS NULL;

UPDATE `vehicles` v
JOIN (
  SELECT LOWER(TRIM(`name`)) AS normalizedName, MIN(`id`) AS unitId
  FROM `driver_management_units`
  WHERE `level` = 'OWNER'
  GROUP BY LOWER(TRIM(`name`))
  HAVING COUNT(*) = 1
) u ON LOWER(TRIM(v.`assignedUnitCode`)) = u.normalizedName
SET v.`managementUnitId` = u.unitId
WHERE v.`managementUnitId` IS NULL AND NULLIF(TRIM(v.`assignedUnitCode`), '') IS NOT NULL;

UPDATE `vehicles` v
JOIN (
  SELECT LOWER(TRIM(`code`)) AS normalizedCode, MIN(`id`) AS unitId
  FROM `driver_management_units`
  WHERE `level` = 'OWNER'
  GROUP BY LOWER(TRIM(`code`))
  HAVING COUNT(*) = 1
) u ON LOWER(TRIM(v.`assignedUnitCode`)) = u.normalizedCode
SET v.`managementUnitId` = u.unitId
WHERE v.`managementUnitId` IS NULL AND NULLIF(TRIM(v.`assignedUnitCode`), '') IS NOT NULL;

UPDATE `operational_work_orders` w
JOIN (
  SELECT LOWER(TRIM(`name`)) AS normalizedName, MIN(`id`) AS unitId
  FROM `driver_management_units`
  WHERE `level` = 'OWNER'
  GROUP BY LOWER(TRIM(`name`))
  HAVING COUNT(*) = 1
) u ON LOWER(TRIM(w.`enterpriseName`)) = u.normalizedName
SET w.`managementUnitId` = u.unitId
WHERE w.`managementUnitId` IS NULL AND NULLIF(TRIM(w.`enterpriseName`), '') IS NOT NULL;

UPDATE `operational_work_orders` w
JOIN (
  SELECT LOWER(TRIM(`code`)) AS normalizedCode, MIN(`id`) AS unitId
  FROM `driver_management_units`
  WHERE `level` = 'OWNER'
  GROUP BY LOWER(TRIM(`code`))
  HAVING COUNT(*) = 1
) u ON LOWER(TRIM(w.`enterpriseCode`)) = u.normalizedCode
SET w.`managementUnitId` = u.unitId
WHERE w.`managementUnitId` IS NULL AND NULLIF(TRIM(w.`enterpriseCode`), '') IS NOT NULL;

-- If both currently assigned vehicle and driver independently resolve to the same OWNER,
-- that shared value is safe to use. Cross-unit or ambiguous rows intentionally remain NULL.
UPDATE `operational_work_orders` w
JOIN (
  SELECT wva.`workOrderId`, MIN(v.`managementUnitId`) AS unitId
  FROM `work_vehicle_assignments` wva
  JOIN `vehicles` v ON v.`id` = wva.`vehicleId` AND v.`managementUnitId` IS NOT NULL
  WHERE wva.`status` IN ('ASSIGNED', 'ACCEPTED')
  GROUP BY wva.`workOrderId`
  HAVING COUNT(DISTINCT v.`managementUnitId`) = 1
) vm ON vm.`workOrderId` = w.`id`
JOIN (
  SELECT wda.`workOrderId`, MIN(dma.`managementUnitId`) AS unitId
  FROM `work_driver_assignments` wda
  JOIN `driver_management_assignments` dma ON dma.`driverId` = wda.`driverId`
    AND dma.`effectiveFrom` <= CURRENT_TIMESTAMP(3)
    AND (dma.`effectiveTo` IS NULL OR dma.`effectiveTo` > CURRENT_TIMESTAMP(3))
  WHERE wda.`status` IN ('ASSIGNED', 'ACCEPTED')
  GROUP BY wda.`workOrderId`
  HAVING COUNT(DISTINCT dma.`managementUnitId`) = 1
) dm ON dm.`workOrderId` = w.`id` AND dm.unitId = vm.unitId
SET w.`managementUnitId` = vm.unitId
WHERE w.`managementUnitId` IS NULL;
