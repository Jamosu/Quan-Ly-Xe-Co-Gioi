-- Unified vehicle/driver scheduling foundation. Additive by design: legacy
-- columns remain available until API/UI cutover has been reconciled.

ALTER TABLE `operational_audit_logs`
  MODIFY `entityType` ENUM('VEHICLE','VEHICLE_DRIVER_ASSIGNMENT','DRIVER_UNAVAILABILITY','VEHICLE_UNAVAILABILITY','MAINTENANCE','REPAIR','WORK_ORDER','PRODUCTION_PLAN','PRODUCTION_ORDER','DISPATCH_ORDER','TRANSPORT_ORDER','OPERATION_CONFIRMATION') NOT NULL;

ALTER TABLE `transport_orders`
  MODIFY `status` ENUM('DRAFT','PENDING_APPROVAL','APPROVED','ASSIGNED','DRIVER_ACCEPTED','AT_PICKUP','LOADING','DEPARTED','IN_TRANSIT','AT_DELIVERY','UNLOADING','DELIVERED','ACCEPTED','COMPLETED','CANCELLED') NOT NULL DEFAULT 'DRAFT',
  ADD COLUMN `cancelledAt` DATETIME(3) NULL,
  ADD COLUMN `cancellationReason` TEXT NULL;

ALTER TABLE `maintenance_records`
  ADD COLUMN `plannedStartAt` DATETIME(3) NULL,
  ADD COLUMN `plannedEndAt` DATETIME(3) NULL,
  ADD COLUMN `startedAt` DATETIME(3) NULL,
  ADD COLUMN `endedAt` DATETIME(3) NULL,
  ADD COLUMN `cancelledAt` DATETIME(3) NULL,
  ADD COLUMN `cancellationReason` TEXT NULL,
  ADD INDEX `maintenance_records_vehicleId_plannedStartAt_plannedEndAt_idx` (`vehicleId`,`plannedStartAt`,`plannedEndAt`);

UPDATE `maintenance_records`
SET `plannedStartAt`=`createdAt`,
    `startedAt`=CASE WHEN `status`='IN_SERVICE' THEN `createdAt` ELSE NULL END,
    `endedAt`=CASE WHEN `status`='COMPLETED' THEN COALESCE(`completedAt`,`updatedAt`) ELSE NULL END
WHERE `plannedStartAt` IS NULL;

ALTER TABLE `repair_tickets`
  ADD COLUMN `plannedStartAt` DATETIME(3) NULL,
  ADD COLUMN `plannedEndAt` DATETIME(3) NULL,
  ADD COLUMN `startedAt` DATETIME(3) NULL,
  ADD COLUMN `endedAt` DATETIME(3) NULL,
  ADD COLUMN `cancelledAt` DATETIME(3) NULL,
  ADD COLUMN `cancellationReason` TEXT NULL,
  ADD INDEX `repair_tickets_vehicleId_plannedStartAt_plannedEndAt_idx` (`vehicleId`,`plannedStartAt`,`plannedEndAt`);

UPDATE `repair_tickets`
SET `plannedStartAt`=`receivedDate`,
    `startedAt`=CASE WHEN `status` IN ('IN_REPAIR','WAITING_PARTS','COMPLETED') THEN `receivedDate` ELSE NULL END,
    `endedAt`=CASE WHEN `status`='COMPLETED' THEN COALESCE(`completedDate`,`updatedAt`) ELSE NULL END
WHERE `plannedStartAt` IS NULL;

CREATE TABLE `driver_profiles` (
  `userId` INTEGER NOT NULL,
  `employmentStatus` ENUM('DANG_LAM_VIEC','DA_NGHI_VIEC') NOT NULL DEFAULT 'DANG_LAM_VIEC',
  `joinedDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `resignedDate` DATETIME(3) NULL,
  `resignedReason` TEXT NULL,
  `licenseClass` ENUM('BANG_MAY_NONG_NGHIEP','HANG_C','HANG_FC','HANG_B2','HANG_D') NULL,
  `licenseNumber` VARCHAR(191) NULL,
  `licenseExpiryDate` DATETIME(3) NULL,
  `healthCheckExpiryDate` DATETIME(3) NULL,
  `currentShiftStatus` ENUM('DANG_VAN_HANH','SAN_SANG','NGHI_PHEP_CA') NOT NULL DEFAULT 'SAN_SANG',
  `currentLocation` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  INDEX `driver_profiles_employmentStatus_idx` (`employmentStatus`),
  INDEX `driver_profiles_currentShiftStatus_idx` (`currentShiftStatus`),
  PRIMARY KEY (`userId`),
  CONSTRAINT `driver_profiles_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `driver_profiles` (`userId`,`employmentStatus`,`joinedDate`,`resignedDate`,`resignedReason`,`licenseClass`,`licenseNumber`,`licenseExpiryDate`,`healthCheckExpiryDate`,`currentShiftStatus`,`currentLocation`,`createdAt`,`updatedAt`)
SELECT `id`,`employmentStatus`,`joinedDate`,`resignedDate`,`resignedReason`,`licenseClass`,`licenseNumber`,`licenseExpiryDate`,`healthCheckExpiryDate`,COALESCE(`currentShiftStatus`,'SAN_SANG'),`currentLocation`,CURRENT_TIMESTAMP(3),CURRENT_TIMESTAMP(3)
FROM `users` WHERE `role`='DRIVER';

CREATE TABLE `scheduling_policies` (
  `unit` ENUM('NT1','NT2','XN_BO','TT_BTSC','BAN_CO_GIOI','TOAN_KLH') NOT NULL,
  `vehicleBufferMinutes` INTEGER NOT NULL DEFAULT 0,
  `driverBufferMinutes` INTEGER NOT NULL DEFAULT 0,
  `timezone` VARCHAR(191) NOT NULL DEFAULT 'Asia/Phnom_Penh',
  `completionPhotoCount` INTEGER NOT NULL DEFAULT 1,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`unit`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `scheduling_policies` (`unit`,`updatedAt`) VALUES
('NT1',CURRENT_TIMESTAMP(3)),('NT2',CURRENT_TIMESTAMP(3)),('XN_BO',CURRENT_TIMESTAMP(3)),
('TT_BTSC',CURRENT_TIMESTAMP(3)),('BAN_CO_GIOI',CURRENT_TIMESTAMP(3)),('TOAN_KLH',CURRENT_TIMESTAMP(3));

CREATE TABLE `vehicle_driver_assignments` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `vehicleId` INTEGER NOT NULL,
  `driverId` INTEGER NOT NULL,
  `type` ENUM('PRIMARY','SECONDARY','TEMPORARY') NOT NULL,
  `status` ENUM('SCHEDULED','ACTIVE','ENDED','CANCELLED') NOT NULL DEFAULT 'ACTIVE',
  `effectiveFrom` DATETIME(3) NOT NULL,
  `effectiveTo` DATETIME(3) NULL,
  `assignedById` INTEGER NOT NULL,
  `reason` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `vda_vehicle_type_effective_idx` (`vehicleId`,`type`,`effectiveFrom`,`effectiveTo`),
  INDEX `vda_driver_type_effective_idx` (`driverId`,`type`,`effectiveFrom`,`effectiveTo`),
  INDEX `vehicle_driver_assignments_status_idx` (`status`),
  PRIMARY KEY (`id`),
  CONSTRAINT `vehicle_driver_assignments_vehicleId_fkey` FOREIGN KEY (`vehicleId`) REFERENCES `vehicles`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `vehicle_driver_assignments_driverId_fkey` FOREIGN KEY (`driverId`) REFERENCES `driver_profiles`(`userId`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `vehicle_driver_assignments_assignedById_fkey` FOREIGN KEY (`assignedById`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `vehicle_driver_assignments` (`vehicleId`,`driverId`,`type`,`status`,`effectiveFrom`,`assignedById`,`reason`)
SELECT v.`id`,v.`defaultDriverId`,'PRIMARY','ACTIVE',COALESCE(v.`allocationDate`,v.`createdAt`),COALESCE((SELECT MIN(u.`id`) FROM `users` u WHERE u.`role`='SUPER_ADMIN'),v.`defaultDriverId`),'Backfill từ Vehicle.defaultDriverId'
FROM `vehicles` v WHERE v.`defaultDriverId` IS NOT NULL;

INSERT INTO `vehicle_driver_assignments` (`vehicleId`,`driverId`,`type`,`status`,`effectiveFrom`,`assignedById`,`reason`)
SELECT v.`id`,v.`secondaryDriverId`,'SECONDARY','ACTIVE',COALESCE(v.`allocationDate`,v.`createdAt`),COALESCE((SELECT MIN(u.`id`) FROM `users` u WHERE u.`role`='SUPER_ADMIN'),v.`secondaryDriverId`),'Backfill từ Vehicle.secondaryDriverId'
FROM `vehicles` v WHERE v.`secondaryDriverId` IS NOT NULL;

INSERT INTO `vehicle_driver_assignments` (`vehicleId`,`driverId`,`type`,`status`,`effectiveFrom`,`assignedById`,`reason`)
SELECT u.`assignedVehicleId`,u.`id`,'TEMPORARY','ACTIVE',u.`updatedAt`,COALESCE((SELECT MIN(a.`id`) FROM `users` a WHERE a.`role`='SUPER_ADMIN'),u.`id`),'Backfill từ User.assignedVehicleId'
FROM `users` u
WHERE u.`role`='DRIVER' AND u.`assignedVehicleId` IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM `vehicle_driver_assignments` a WHERE a.`vehicleId`=u.`assignedVehicleId` AND a.`driverId`=u.`id` AND a.`status`='ACTIVE');

CREATE TABLE `driver_unavailability` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `driverId` INTEGER NOT NULL,
  `type` ENUM('LEAVE','SHIFT_REST','MEDICAL','EMERGENCY','OTHER') NOT NULL,
  `status` ENUM('PENDING','APPROVED','REJECTED','CANCELLED') NOT NULL DEFAULT 'PENDING',
  `startAt` DATETIME(3) NOT NULL,
  `endAt` DATETIME(3) NULL,
  `reason` TEXT NULL,
  `evidenceUrl` TEXT NULL,
  `approvedById` INTEGER NULL,
  `approvedAt` DATETIME(3) NULL,
  `cancelledAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  INDEX `driver_unavailability_driverId_status_startAt_endAt_idx` (`driverId`,`status`,`startAt`,`endAt`),
  PRIMARY KEY (`id`),
  CONSTRAINT `driver_unavailability_driverId_fkey` FOREIGN KEY (`driverId`) REFERENCES `driver_profiles`(`userId`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `driver_unavailability_approvedById_fkey` FOREIGN KEY (`approvedById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `vehicle_unavailability` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `vehicleId` INTEGER NOT NULL,
  `type` ENUM('BREAKDOWN','MANUAL_HOLD','INSPECTION','OTHER') NOT NULL,
  `status` ENUM('PENDING','APPROVED','REJECTED','CANCELLED') NOT NULL DEFAULT 'APPROVED',
  `startAt` DATETIME(3) NOT NULL,
  `endAt` DATETIME(3) NULL,
  `reason` TEXT NULL,
  `createdById` INTEGER NOT NULL,
  `cancelledAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  INDEX `vehicle_unavailability_vehicleId_status_startAt_endAt_idx` (`vehicleId`,`status`,`startAt`,`endAt`),
  PRIMARY KEY (`id`),
  CONSTRAINT `vehicle_unavailability_vehicleId_fkey` FOREIGN KEY (`vehicleId`) REFERENCES `vehicles`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `vehicle_unavailability_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `operational_work_orders` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `type` ENUM('DISPATCH','TRANSPORT','INTERNAL_FEED') NOT NULL,
  `unit` ENUM('NT1','NT2','XN_BO','TT_BTSC','BAN_CO_GIOI','TOAN_KLH') NOT NULL,
  `assignmentMode` ENUM('FIXED_ASSIGNMENT','OPEN_ASSIGNMENT') NOT NULL DEFAULT 'FIXED_ASSIGNMENT',
  `status` ENUM('DRAFT','PENDING_APPROVAL','APPROVED','OPEN_FOR_CLAIM','ASSIGNED','DRIVER_ACCEPTED','IN_PROGRESS','SUBMITTED_FOR_ACCEPTANCE','REWORK_REQUIRED','ACCEPTED','CLOSED','REJECTED','CANCELLED') NOT NULL DEFAULT 'DRAFT',
  `plannedStartAt` DATETIME(3) NOT NULL,
  `plannedEndAt` DATETIME(3) NOT NULL,
  `version` INTEGER NOT NULL DEFAULT 1,
  `dispatchOrderId` INTEGER NULL,
  `transportOrderId` INTEGER NULL,
  `internalFeedTripId` INTEGER NULL,
  `createdById` INTEGER NOT NULL,
  `approvedById` INTEGER NULL,
  `submittedAt` DATETIME(3) NULL,
  `approvedAt` DATETIME(3) NULL,
  `closedAt` DATETIME(3) NULL,
  `cancelledAt` DATETIME(3) NULL,
  `cancellationReason` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `operational_work_orders_dispatchOrderId_key` (`dispatchOrderId`),
  UNIQUE INDEX `operational_work_orders_transportOrderId_key` (`transportOrderId`),
  UNIQUE INDEX `operational_work_orders_internalFeedTripId_key` (`internalFeedTripId`),
  INDEX `owo_unit_status_planned_window_idx` (`unit`,`status`,`plannedStartAt`,`plannedEndAt`),
  INDEX `operational_work_orders_type_status_idx` (`type`,`status`),
  PRIMARY KEY (`id`),
  CONSTRAINT `operational_work_orders_dispatchOrderId_fkey` FOREIGN KEY (`dispatchOrderId`) REFERENCES `dispatch_orders`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `operational_work_orders_transportOrderId_fkey` FOREIGN KEY (`transportOrderId`) REFERENCES `transport_orders`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `operational_work_orders_internalFeedTripId_fkey` FOREIGN KEY (`internalFeedTripId`) REFERENCES `internal_feed_trips`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `operational_work_orders_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `operational_work_orders_approvedById_fkey` FOREIGN KEY (`approvedById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `operational_work_orders` (`type`,`unit`,`status`,`plannedStartAt`,`plannedEndAt`,`dispatchOrderId`,`createdById`,`approvedById`,`submittedAt`,`approvedAt`,`closedAt`,`cancelledAt`,`cancellationReason`,`createdAt`,`updatedAt`)
SELECT 'DISPATCH',d.`unit`,
  CASE d.`status` WHEN 'PENDING_APPROVAL' THEN 'PENDING_APPROVAL' WHEN 'APPROVED' THEN 'APPROVED' WHEN 'ASSIGNED' THEN 'ASSIGNED' WHEN 'DRIVER_ACCEPTED' THEN 'DRIVER_ACCEPTED' WHEN 'DEPARTED' THEN 'IN_PROGRESS' WHEN 'WORKING' THEN 'IN_PROGRESS' WHEN 'COMPLETED' THEN 'SUBMITTED_FOR_ACCEPTANCE' WHEN 'ACCEPTED' THEN 'ACCEPTED' WHEN 'CLOSED' THEN 'CLOSED' WHEN 'REJECTED' THEN 'REJECTED' WHEN 'CANCELLED' THEN 'CANCELLED' ELSE 'DRAFT' END,
  d.`departureTime`,d.`plannedEndTime`,d.`id`,d.`requesterId`,d.`approvedById`,d.`submittedAt`,d.`approvedAt`,d.`closedAt`,d.`cancelledAt`,d.`rejectionReason`,d.`createdAt`,d.`updatedAt`
FROM `dispatch_orders` d WHERE d.`departureTime` IS NOT NULL AND d.`plannedEndTime` IS NOT NULL;

INSERT INTO `operational_work_orders` (`type`,`unit`,`status`,`plannedStartAt`,`plannedEndAt`,`transportOrderId`,`createdById`,`approvedById`,`submittedAt`,`approvedAt`,`createdAt`,`updatedAt`)
SELECT 'TRANSPORT',t.`unit`,
  CASE t.`status` WHEN 'PENDING_APPROVAL' THEN 'PENDING_APPROVAL' WHEN 'APPROVED' THEN 'APPROVED' WHEN 'ASSIGNED' THEN 'ASSIGNED' WHEN 'DRIVER_ACCEPTED' THEN 'DRIVER_ACCEPTED' WHEN 'AT_PICKUP' THEN 'IN_PROGRESS' WHEN 'LOADING' THEN 'IN_PROGRESS' WHEN 'DEPARTED' THEN 'IN_PROGRESS' WHEN 'IN_TRANSIT' THEN 'IN_PROGRESS' WHEN 'AT_DELIVERY' THEN 'IN_PROGRESS' WHEN 'UNLOADING' THEN 'IN_PROGRESS' WHEN 'DELIVERED' THEN 'SUBMITTED_FOR_ACCEPTANCE' WHEN 'ACCEPTED' THEN 'ACCEPTED' WHEN 'COMPLETED' THEN 'CLOSED' WHEN 'CANCELLED' THEN 'CANCELLED' ELSE 'DRAFT' END,
  t.`departureTime`,t.`plannedEndTime`,t.`id`,COALESCE(t.`approvedById`,t.`driverId`,(SELECT MIN(u.`id`) FROM `users` u)),t.`approvedById`,t.`submittedAt`,t.`approvedAt`,t.`createdAt`,t.`updatedAt`
FROM `transport_orders` t WHERE t.`departureTime` IS NOT NULL AND t.`plannedEndTime` IS NOT NULL;

INSERT INTO `operational_work_orders` (`type`,`unit`,`status`,`plannedStartAt`,`plannedEndAt`,`internalFeedTripId`,`createdById`,`createdAt`,`updatedAt`)
SELECT 'INTERNAL_FEED',v.`unit`,CASE WHEN f.`completedFeedTime` IS NULL THEN 'ASSIGNED' ELSE 'ACCEPTED' END,f.`slaWindowStart`,f.`slaWindowEnd`,f.`id`,f.`driverId`,f.`createdAt`,f.`updatedAt`
FROM `internal_feed_trips` f JOIN `vehicles` v ON v.`id`=f.`vehicleId`;

CREATE TABLE `work_vehicle_assignments` (
  `id` INTEGER NOT NULL AUTO_INCREMENT, `workOrderId` INTEGER NOT NULL, `vehicleId` INTEGER NOT NULL,
  `status` ENUM('ASSIGNED','ACCEPTED','CANNOT_ACCEPT','REASSIGNED','COMPLETED','CANCELLED') NOT NULL DEFAULT 'ASSIGNED',
  `startAt` DATETIME(3) NOT NULL, `endAt` DATETIME(3) NULL, `assignedById` INTEGER NOT NULL,
  `reason` TEXT NULL, `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `work_vehicle_assignments_workOrderId_status_idx` (`workOrderId`,`status`),
  INDEX `work_vehicle_assignments_vehicleId_status_startAt_endAt_idx` (`vehicleId`,`status`,`startAt`,`endAt`), PRIMARY KEY (`id`),
  CONSTRAINT `work_vehicle_assignments_workOrderId_fkey` FOREIGN KEY (`workOrderId`) REFERENCES `operational_work_orders`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `work_vehicle_assignments_vehicleId_fkey` FOREIGN KEY (`vehicleId`) REFERENCES `vehicles`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `work_vehicle_assignments_assignedById_fkey` FOREIGN KEY (`assignedById`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `work_driver_assignments` (
  `id` INTEGER NOT NULL AUTO_INCREMENT, `workOrderId` INTEGER NOT NULL, `driverId` INTEGER NOT NULL,
  `status` ENUM('ASSIGNED','ACCEPTED','CANNOT_ACCEPT','REASSIGNED','COMPLETED','CANCELLED') NOT NULL DEFAULT 'ASSIGNED',
  `startAt` DATETIME(3) NOT NULL, `endAt` DATETIME(3) NULL, `assignedById` INTEGER NOT NULL,
  `acceptedAt` DATETIME(3) NULL, `reportedAt` DATETIME(3) NULL, `reasonCode` VARCHAR(191) NULL,
  `reason` TEXT NULL, `evidenceUrl` TEXT NULL, `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `work_driver_assignments_workOrderId_status_idx` (`workOrderId`,`status`),
  INDEX `work_driver_assignments_driverId_status_startAt_endAt_idx` (`driverId`,`status`,`startAt`,`endAt`), PRIMARY KEY (`id`),
  CONSTRAINT `work_driver_assignments_workOrderId_fkey` FOREIGN KEY (`workOrderId`) REFERENCES `operational_work_orders`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `work_driver_assignments_driverId_fkey` FOREIGN KEY (`driverId`) REFERENCES `driver_profiles`(`userId`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `work_driver_assignments_assignedById_fkey` FOREIGN KEY (`assignedById`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `work_vehicle_assignments` (`workOrderId`,`vehicleId`,`status`,`startAt`,`endAt`,`assignedById`,`reason`)
SELECT w.`id`,COALESCE(d.`vehicleId`,t.`vehicleId`,f.`vehicleId`),'ASSIGNED',w.`plannedStartAt`,w.`plannedEndAt`,w.`createdById`,'Backfill từ lệnh legacy'
FROM `operational_work_orders` w
LEFT JOIN `dispatch_orders` d ON d.`id`=w.`dispatchOrderId`
LEFT JOIN `transport_orders` t ON t.`id`=w.`transportOrderId`
LEFT JOIN `internal_feed_trips` f ON f.`id`=w.`internalFeedTripId`
WHERE COALESCE(d.`vehicleId`,t.`vehicleId`,f.`vehicleId`) IS NOT NULL;

INSERT INTO `work_driver_assignments` (`workOrderId`,`driverId`,`status`,`startAt`,`endAt`,`assignedById`,`reason`)
SELECT w.`id`,COALESCE(d.`driverId`,t.`driverId`,f.`driverId`),
  CASE WHEN w.`status` IN ('DRIVER_ACCEPTED','IN_PROGRESS','SUBMITTED_FOR_ACCEPTANCE','ACCEPTED','CLOSED') THEN 'ACCEPTED' ELSE 'ASSIGNED' END,
  w.`plannedStartAt`,w.`plannedEndAt`,w.`createdById`,'Backfill từ lệnh legacy'
FROM `operational_work_orders` w
LEFT JOIN `dispatch_orders` d ON d.`id`=w.`dispatchOrderId`
LEFT JOIN `transport_orders` t ON t.`id`=w.`transportOrderId`
LEFT JOIN `internal_feed_trips` f ON f.`id`=w.`internalFeedTripId`
WHERE COALESCE(d.`driverId`,t.`driverId`,f.`driverId`) IS NOT NULL;

CREATE TABLE `work_execution_segments` (
  `id` INTEGER NOT NULL AUTO_INCREMENT, `workOrderId` INTEGER NOT NULL, `vehicleAssignmentId` INTEGER NULL, `driverAssignmentId` INTEGER NULL,
  `vehicleId` INTEGER NOT NULL, `driverId` INTEGER NOT NULL, `startedAt` DATETIME(3) NOT NULL, `endedAt` DATETIME(3) NULL,
  `startOdoKm` DOUBLE NULL, `endOdoKm` DOUBLE NULL, `startMachineHours` DOUBLE NULL, `endMachineHours` DOUBLE NULL,
  `startLat` DOUBLE NULL, `startLng` DOUBLE NULL, `endLat` DOUBLE NULL, `endLng` DOUBLE NULL, `quantity` DOUBLE NULL, `notes` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), `updatedAt` DATETIME(3) NOT NULL,
  INDEX `work_execution_segments_workOrderId_startedAt_endedAt_idx` (`workOrderId`,`startedAt`,`endedAt`),
  INDEX `work_execution_segments_vehicleId_startedAt_endedAt_idx` (`vehicleId`,`startedAt`,`endedAt`),
  INDEX `work_execution_segments_driverId_startedAt_endedAt_idx` (`driverId`,`startedAt`,`endedAt`), PRIMARY KEY (`id`),
  CONSTRAINT `work_execution_segments_workOrderId_fkey` FOREIGN KEY (`workOrderId`) REFERENCES `operational_work_orders`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `work_execution_segments_vehicleAssignmentId_fkey` FOREIGN KEY (`vehicleAssignmentId`) REFERENCES `work_vehicle_assignments`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `work_execution_segments_driverAssignmentId_fkey` FOREIGN KEY (`driverAssignmentId`) REFERENCES `work_driver_assignments`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `work_execution_segments_vehicleId_fkey` FOREIGN KEY (`vehicleId`) REFERENCES `vehicles`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `work_execution_segments_driverId_fkey` FOREIGN KEY (`driverId`) REFERENCES `driver_profiles`(`userId`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `work_evidence` (
  `id` INTEGER NOT NULL AUTO_INCREMENT, `workOrderId` INTEGER NOT NULL,
  `type` ENUM('START_PHOTO','COMPLETION_PHOTO','ACCEPTANCE_PHOTO','CANNOT_ACCEPT_EVIDENCE','OTHER') NOT NULL,
  `url` TEXT NOT NULL, `capturedAt` DATETIME(3) NOT NULL, `lat` DOUBLE NULL, `lng` DOUBLE NULL, `checksum` VARCHAR(191) NULL,
  `createdById` INTEGER NOT NULL, `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `work_evidence_workOrderId_type_capturedAt_idx` (`workOrderId`,`type`,`capturedAt`), PRIMARY KEY (`id`),
  CONSTRAINT `work_evidence_workOrderId_fkey` FOREIGN KEY (`workOrderId`) REFERENCES `operational_work_orders`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `work_evidence_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `work_acceptances` (
  `id` INTEGER NOT NULL AUTO_INCREMENT, `workOrderId` INTEGER NOT NULL,
  `status` ENUM('PENDING','APPROVED','REWORK_REQUIRED') NOT NULL DEFAULT 'PENDING', `submittedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `reviewedById` INTEGER NULL, `reviewedAt` DATETIME(3) NULL, `reason` TEXT NULL, `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `work_acceptances_workOrderId_status_idx` (`workOrderId`,`status`), PRIMARY KEY (`id`),
  CONSTRAINT `work_acceptances_workOrderId_fkey` FOREIGN KEY (`workOrderId`) REFERENCES `operational_work_orders`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `work_acceptances_reviewedById_fkey` FOREIGN KEY (`reviewedById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `work_order_events` (
  `id` INTEGER NOT NULL AUTO_INCREMENT, `workOrderId` INTEGER NOT NULL, `actorId` INTEGER NOT NULL, `action` VARCHAR(191) NOT NULL,
  `oldStatus` ENUM('DRAFT','PENDING_APPROVAL','APPROVED','OPEN_FOR_CLAIM','ASSIGNED','DRIVER_ACCEPTED','IN_PROGRESS','SUBMITTED_FOR_ACCEPTANCE','REWORK_REQUIRED','ACCEPTED','CLOSED','REJECTED','CANCELLED') NULL,
  `newStatus` ENUM('DRAFT','PENDING_APPROVAL','APPROVED','OPEN_FOR_CLAIM','ASSIGNED','DRIVER_ACCEPTED','IN_PROGRESS','SUBMITTED_FOR_ACCEPTANCE','REWORK_REQUIRED','ACCEPTED','CLOSED','REJECTED','CANCELLED') NULL,
  `payload` JSON NULL, `reason` TEXT NULL, `occurredAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `work_order_events_workOrderId_occurredAt_idx` (`workOrderId`,`occurredAt`), INDEX `work_order_events_actorId_occurredAt_idx` (`actorId`,`occurredAt`), PRIMARY KEY (`id`),
  CONSTRAINT `work_order_events_workOrderId_fkey` FOREIGN KEY (`workOrderId`) REFERENCES `operational_work_orders`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `work_order_events_actorId_fkey` FOREIGN KEY (`actorId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `driver_kpi_events` (
  `id` INTEGER NOT NULL AUTO_INCREMENT, `driverId` INTEGER NOT NULL, `workOrderId` INTEGER NOT NULL, `executionSegmentId` INTEGER NULL,
  `type` ENUM('ASSIGNED','ACCEPTED','CANNOT_ACCEPT','EXECUTION_COMPLETED','REASSIGNED','ACCEPTANCE_APPROVED') NOT NULL,
  `decision` ENUM('UNDECIDED','EXEMPT','COUNTED') NOT NULL DEFAULT 'UNDECIDED',
  `distanceKm` DOUBLE NOT NULL DEFAULT 0, `machineHours` DOUBLE NOT NULL DEFAULT 0, `quantity` DOUBLE NOT NULL DEFAULT 0,
  `fuelLiters` DOUBLE NULL, `reasonCode` VARCHAR(191) NULL, `payload` JSON NULL, `occurredAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `driver_kpi_events_driverId_occurredAt_idx` (`driverId`,`occurredAt`), INDEX `driver_kpi_events_workOrderId_type_idx` (`workOrderId`,`type`), PRIMARY KEY (`id`),
  CONSTRAINT `driver_kpi_events_driverId_fkey` FOREIGN KEY (`driverId`) REFERENCES `driver_profiles`(`userId`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `driver_kpi_events_workOrderId_fkey` FOREIGN KEY (`workOrderId`) REFERENCES `operational_work_orders`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `driver_kpi_events_executionSegmentId_fkey` FOREIGN KEY (`executionSegmentId`) REFERENCES `work_execution_segments`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
