-- Phase 1: additive operational workflow migration.
-- Keep legacy enum members until every existing row has been backfilled.

ALTER TABLE `vehicle_types`
  ADD COLUMN `requiredLicenseClass` ENUM('BANG_MAY_NONG_NGHIEP','HANG_C','HANG_FC','HANG_B2','HANG_D') NULL;

ALTER TABLE `production_plans`
  MODIFY `status` ENUM('PENDING','PAUSED','DRAFT','PENDING_APPROVAL','APPROVED','IN_PROGRESS','COMPLETED','REJECTED','ADJUSTED','CANCELLED') NOT NULL DEFAULT 'DRAFT',
  ADD COLUMN `weekStart` DATETIME(3) NULL,
  ADD COLUMN `complexCode` VARCHAR(191) NOT NULL DEFAULT 'KOUN_MOM',
  ADD COLUMN `createdById` INTEGER NULL,
  ADD COLUMN `approvedById` INTEGER NULL,
  ADD COLUMN `submittedAt` DATETIME(3) NULL,
  ADD COLUMN `approvedAt` DATETIME(3) NULL,
  ADD COLUMN `rejectedAt` DATETIME(3) NULL,
  ADD COLUMN `completedAt` DATETIME(3) NULL,
  ADD COLUMN `cancelledAt` DATETIME(3) NULL;

UPDATE `production_plans` SET `status`='PENDING_APPROVAL' WHERE `status`='PENDING';
UPDATE `production_plans` SET `status`='ADJUSTED' WHERE `status`='PAUSED';

CREATE TABLE `production_plan_items` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `planId` INTEGER NOT NULL,
  `workDate` DATETIME(3) NOT NULL,
  `shift` VARCHAR(191) NOT NULL,
  `plotName` VARCHAR(191) NOT NULL,
  `stage` ENUM('LAM_DAT','TRONG_MOI','THU_HOACH') NOT NULL,
  `jobName` VARCHAR(191) NOT NULL,
  `targetQuantity` DOUBLE NOT NULL DEFAULT 0,
  `targetUnit` VARCHAR(191) NOT NULL DEFAULT 'ha',
  `vehicleTypeId` INTEGER NULL,
  `plannedVehicleCount` INTEGER NOT NULL DEFAULT 0,
  `plannedMachineHours` DOUBLE NOT NULL DEFAULT 0,
  `quotaValue` DOUBLE NULL,
  `quotaUnit` ENUM('L_PER_HOUR','L_PER_KM','L_PER_HA') NULL,
  `notes` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `production_orders` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `code` VARCHAR(191) NOT NULL,
  `planId` INTEGER NOT NULL,
  `planItemId` INTEGER NULL,
  `unit` ENUM('NT1','NT2','XN_BO','TT_BTSC','BAN_CO_GIOI','TOAN_KLH') NOT NULL,
  `title` VARCHAR(191) NOT NULL,
  `location` VARCHAR(191) NOT NULL,
  `plannedStart` DATETIME(3) NULL,
  `plannedEnd` DATETIME(3) NULL,
  `createdById` INTEGER NULL,
  `notes` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `production_orders_code_key`(`code`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `dispatch_orders`
  MODIFY `status` ENUM('PENDING','RUNNING','DRAFT','PENDING_APPROVAL','APPROVED','ASSIGNED','DRIVER_ACCEPTED','DEPARTED','WORKING','COMPLETED','ACCEPTED','CLOSED','REJECTED','CANCELLED') NOT NULL DEFAULT 'DRAFT',
  MODIFY `vehicleId` INTEGER NULL,
  MODIFY `driverId` INTEGER NULL,
  MODIFY `departureTime` DATETIME(3) NULL,
  ADD COLUMN `sourceType` ENUM('MANUAL','PRODUCTION_ORDER','IMPORT') NOT NULL DEFAULT 'MANUAL',
  ADD COLUMN `productionOrderId` INTEGER NULL,
  ADD COLUMN `implementId` INTEGER NULL,
  ADD COLUMN `plannedEndTime` DATETIME(3) NULL,
  ADD COLUMN `actualDepartureTime` DATETIME(3) NULL,
  ADD COLUMN `actualStartTime` DATETIME(3) NULL,
  ADD COLUMN `actualCompletedTime` DATETIME(3) NULL,
  ADD COLUMN `approvedById` INTEGER NULL,
  ADD COLUMN `assignedById` INTEGER NULL,
  ADD COLUMN `acceptedById` INTEGER NULL,
  ADD COLUMN `submittedAt` DATETIME(3) NULL,
  ADD COLUMN `approvedAt` DATETIME(3) NULL,
  ADD COLUMN `assignedAt` DATETIME(3) NULL,
  ADD COLUMN `driverAcceptedAt` DATETIME(3) NULL,
  ADD COLUMN `acceptedAt` DATETIME(3) NULL,
  ADD COLUMN `closedAt` DATETIME(3) NULL,
  ADD COLUMN `cancelledAt` DATETIME(3) NULL,
  ADD COLUMN `rejectionReason` TEXT NULL,
  ADD COLUMN `legacyVehicle` VARCHAR(191) NULL,
  ADD COLUMN `legacyDriver` VARCHAR(191) NULL,
  ADD COLUMN `legacyImplement` VARCHAR(191) NULL;

UPDATE `dispatch_orders` SET `status`='PENDING_APPROVAL' WHERE `status`='PENDING';
UPDATE `dispatch_orders` SET `status`='ASSIGNED', `assignedAt`=`updatedAt` WHERE `status`='APPROVED';
UPDATE `dispatch_orders` SET `status`='WORKING', `actualStartTime`=`updatedAt` WHERE `status`='RUNNING';

ALTER TABLE `transport_orders`
  MODIFY `routeType` ENUM('ONE_WAY','ROUND_TRIP','TWO_WAY') NOT NULL DEFAULT 'ONE_WAY',
  MODIFY `status` ENUM('PENDING','DEVIATED','DRAFT','PENDING_APPROVAL','APPROVED','ASSIGNED','DRIVER_ACCEPTED','AT_PICKUP','LOADING','DEPARTED','IN_TRANSIT','AT_DELIVERY','UNLOADING','DELIVERED','ACCEPTED','COMPLETED') NOT NULL DEFAULT 'DRAFT',
  MODIFY `cargoType` VARCHAR(191) NULL,
  MODIFY `tonnage` DOUBLE NOT NULL DEFAULT 0,
  MODIFY `origin` VARCHAR(191) NULL,
  MODIFY `destination` VARCHAR(191) NULL,
  MODIFY `vehicleId` INTEGER NULL,
  MODIFY `driverId` INTEGER NULL,
  MODIFY `departureTime` DATETIME(3) NULL,
  ADD COLUMN `flowType` ENUM('STANDARD','LIVESTOCK_FEED_3_LEG') NOT NULL DEFAULT 'STANDARD',
  ADD COLUMN `requestDate` DATETIME(3) NULL,
  ADD COLUMN `executionDate` DATETIME(3) NULL,
  ADD COLUMN `unit` ENUM('NT1','NT2','XN_BO','TT_BTSC','BAN_CO_GIOI','TOAN_KLH') NOT NULL DEFAULT 'BAN_CO_GIOI',
  ADD COLUMN `trailerId` INTEGER NULL,
  ADD COLUMN `containerNumber` VARCHAR(191) NULL,
  ADD COLUMN `transportMode` VARCHAR(191) NULL,
  ADD COLUMN `plannedEndTime` DATETIME(3) NULL,
  ADD COLUMN `distanceKm` DOUBLE NOT NULL DEFAULT 0,
  ADD COLUMN `plannedFuelLiters` DOUBLE NULL,
  ADD COLUMN `actualFuelLiters` DOUBLE NULL,
  ADD COLUMN `palletCount` INTEGER NULL,
  ADD COLUMN `trailerNote` VARCHAR(191) NULL,
  ADD COLUMN `notes` TEXT NULL,
  ADD COLUMN `legacyVehicle` VARCHAR(191) NULL,
  ADD COLUMN `legacyDriver` VARCHAR(191) NULL,
  ADD COLUMN `legacyTrailer` VARCHAR(191) NULL,
  ADD COLUMN `approvedById` INTEGER NULL,
  ADD COLUMN `submittedAt` DATETIME(3) NULL,
  ADD COLUMN `approvedAt` DATETIME(3) NULL,
  ADD COLUMN `assignedAt` DATETIME(3) NULL,
  ADD COLUMN `driverAcceptedAt` DATETIME(3) NULL,
  ADD COLUMN `pickupAt` DATETIME(3) NULL,
  ADD COLUMN `loadingAt` DATETIME(3) NULL,
  ADD COLUMN `departedAt` DATETIME(3) NULL,
  ADD COLUMN `deliveryAt` DATETIME(3) NULL,
  ADD COLUMN `unloadingAt` DATETIME(3) NULL,
  ADD COLUMN `deliveredAt` DATETIME(3) NULL,
  ADD COLUMN `acceptedAt` DATETIME(3) NULL,
  ADD COLUMN `completedAt` DATETIME(3) NULL;

UPDATE `transport_orders` SET `routeType`='TWO_WAY' WHERE `routeType`='ROUND_TRIP';
UPDATE `transport_orders` SET `status`='PENDING_APPROVAL' WHERE `status`='PENDING';
UPDATE `transport_orders` SET `status`='IN_TRANSIT', `isRouteDeviated`=TRUE WHERE `status`='DEVIATED';

CREATE TABLE `transport_items` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `transportOrderId` INTEGER NOT NULL,
  `materialCode` VARCHAR(191) NULL,
  `cargoName` VARCHAR(191) NOT NULL,
  `unitOfMeasure` VARCHAR(191) NOT NULL,
  `plannedQuantity` DOUBLE NOT NULL DEFAULT 0,
  `actualQuantity` DOUBLE NULL,
  `pickupLocation` VARCHAR(191) NULL,
  `deliveryLocation` VARCHAR(191) NULL,
  `notes` TEXT NULL,
  `sourceRowNumber` INTEGER NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `operational_audit_logs` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `entityType` ENUM('PRODUCTION_PLAN','PRODUCTION_ORDER','DISPATCH_ORDER','TRANSPORT_ORDER','OPERATION_CONFIRMATION') NOT NULL,
  `entityId` INTEGER NOT NULL,
  `actorId` INTEGER NOT NULL,
  `action` VARCHAR(191) NOT NULL,
  `oldValue` JSON NULL,
  `newValue` JSON NULL,
  `reason` TEXT NULL,
  `legacyProductionAuditTrailId` INTEGER NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `operational_audit_logs_legacyProductionAuditTrailId_key`(`legacyProductionAuditTrailId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT IGNORE INTO `operational_audit_logs`
  (`entityType`,`entityId`,`actorId`,`action`,`reason`,`legacyProductionAuditTrailId`,`createdAt`)
SELECT 'PRODUCTION_PLAN', `planId`, `actorId`, `action`, `reason`, `id`, `timestamp`
FROM `production_audit_trails`;

CREATE TABLE `operation_confirmations` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `code` VARCHAR(191) NOT NULL,
  `type` ENUM('WEIGHT','GPS') NOT NULL,
  `status` ENUM('PENDING','CONFIRMED','REJECTED') NOT NULL DEFAULT 'PENDING',
  `dispatchOrderId` INTEGER NULL,
  `transportOrderId` INTEGER NULL,
  `grossWeightTons` DOUBLE NULL,
  `tareWeightTons` DOUBLE NULL,
  `netWeightTons` DOUBLE NULL,
  `measuredAreaHa` DOUBLE NULL,
  `machineHours` DOUBLE NULL,
  `routeLocation` VARCHAR(191) NULL,
  `createdById` INTEGER NOT NULL,
  `confirmedById` INTEGER NULL,
  `confirmedAt` DATETIME(3) NULL,
  `notes` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `operation_confirmations_code_key`(`code`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `transport_import_batches` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `checksum` VARCHAR(191) NOT NULL,
  `fileName` VARCHAR(191) NOT NULL,
  `sheetName` VARCHAR(191) NULL,
  `importedById` INTEGER NOT NULL,
  `status` ENUM('COMMITTED','FAILED') NOT NULL DEFAULT 'COMMITTED',
  `tripCount` INTEGER NOT NULL DEFAULT 0,
  `itemCount` INTEGER NOT NULL DEFAULT 0,
  `warningCount` INTEGER NOT NULL DEFAULT 0,
  `errorSummary` JSON NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `transport_import_batches_checksum_key`(`checksum`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
