ALTER TABLE `dispatch_orders`
  MODIFY COLUMN `status` ENUM('DRAFT','PENDING_APPROVAL','APPROVED','ASSIGNED','DRIVER_ACCEPTED','DEPARTED','AT_WORKSITE','WORKING','SHIFT_FINISHED','WAITING_REPORT','WAITING_REVIEW','RETURNING_TO_DEPOT','COMPLETED','ACCEPTED','CLOSED','REJECTED','CANCELLED') NOT NULL DEFAULT 'DRAFT',
  ADD COLUMN `workOrderId` INTEGER NULL,
  ADD COLUMN `previousDispatchOrderId` INTEGER NULL,
  ADD COLUMN `scheduledStartAt` DATETIME(3) NULL,
  ADD COLUMN `scheduledEndAt` DATETIME(3) NULL,
  ADD COLUMN `workDurationMinutes` INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN `breakDurationMinutes` INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN `acceptGraceMinutes` INTEGER NOT NULL DEFAULT 15,
  ADD COLUMN `acceptDelayMinutes` INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN `acceptStatus` ENUM('NOT_ACCEPTED','ON_TIME','WITHIN_GRACE','LATE') NOT NULL DEFAULT 'NOT_ACCEPTED',
  ADD COLUMN `reportOpenAt` DATETIME(3) NULL,
  ADD COLUMN `reportDeadlineAt` DATETIME(3) NULL;

UPDATE `dispatch_orders` d
JOIN `operational_work_orders` w ON w.`dispatchOrderId` = d.`id`
SET d.`workOrderId` = w.`id`,
    d.`scheduledStartAt` = COALESCE(d.`departureTime`, w.`plannedStartAt`),
    d.`scheduledEndAt` = COALESCE(d.`plannedEndTime`, w.`plannedEndAt`),
    d.`workDurationMinutes` = GREATEST(0, TIMESTAMPDIFF(MINUTE, COALESCE(d.`departureTime`, w.`plannedStartAt`), COALESCE(d.`plannedEndTime`, w.`plannedEndAt`))),
    d.`reportOpenAt` = DATE_SUB(COALESCE(d.`plannedEndTime`, w.`plannedEndAt`), INTERVAL 60 MINUTE),
    d.`reportDeadlineAt` = DATE_ADD(COALESCE(d.`plannedEndTime`, w.`plannedEndAt`), INTERVAL 15 MINUTE);

ALTER TABLE `dispatch_orders`
  ADD INDEX `dispatch_orders_workOrderId_scheduledStartAt_idx` (`workOrderId`, `scheduledStartAt`),
  ADD UNIQUE INDEX `dispatch_orders_previousDispatchOrderId_key` (`previousDispatchOrderId`),
  ADD INDEX `dispatch_orders_reportDeadlineAt_status_idx` (`reportDeadlineAt`, `status`),
  ADD CONSTRAINT `dispatch_orders_workOrderId_fkey` FOREIGN KEY (`workOrderId`) REFERENCES `operational_work_orders` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `dispatch_orders_previousDispatchOrderId_fkey` FOREIGN KEY (`previousDispatchOrderId`) REFERENCES `dispatch_orders` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `scheduling_policies`
  ADD COLUMN `acceptGraceMinutes` INTEGER NOT NULL DEFAULT 15,
  ADD COLUMN `reportOpenBeforeMinutes` INTEGER NOT NULL DEFAULT 60,
  ADD COLUMN `reportGraceMinutes` INTEGER NOT NULL DEFAULT 15;

ALTER TABLE `operational_work_orders`
  ADD COLUMN `completedQuantity` DOUBLE NOT NULL DEFAULT 0,
  ADD COLUMN `expectedCompletedAt` DATETIME(3) NULL,
  ADD COLUMN `actualCompletedAt` DATETIME(3) NULL,
  ADD COLUMN `completionReportedById` INTEGER NULL,
  ADD COLUMN `completionApprovedById` INTEGER NULL,
  ADD COLUMN `completionApprovedAt` DATETIME(3) NULL,
  ADD COLUMN `delayReason` ENUM('DRIVER_RESPONSIBILITY','VEHICLE_BREAKDOWN','WEATHER','WAITING_FUEL','WAITING_MATERIAL','PLAN_CHANGED','REASSIGNED_TO_OTHER_JOB','OTHER') NULL,
  ADD COLUMN `delayReasonNote` TEXT NULL,
  ADD INDEX `operational_work_orders_expectedCompletedAt_status_idx` (`expectedCompletedAt`, `status`),
  ADD CONSTRAINT `operational_work_orders_completionReportedById_fkey` FOREIGN KEY (`completionReportedById`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `operational_work_orders_completionApprovedById_fkey` FOREIGN KEY (`completionApprovedById`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `driver_kpi_events`
  MODIFY COLUMN `type` ENUM('ASSIGNED','ACCEPTED','CANNOT_ACCEPT','EXECUTION_COMPLETED','REASSIGNED','ACCEPTANCE_APPROVED','SHIFT_ACCEPTANCE','DAILY_REPORT','WORK_PROGRESS') NOT NULL;

CREATE TABLE `daily_reports` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `dispatchOrderId` INTEGER NOT NULL,
  `workOrderId` INTEGER NOT NULL,
  `originalDriverId` INTEGER NOT NULL,
  `reportDate` DATE NOT NULL,
  `status` ENUM('NOT_OPEN','DRAFT','SUBMITTED_ON_TIME','LATE','MISSING','SUBMITTED_BY_MANAGER','REVISION_REQUESTED','ACCEPTED') NOT NULL DEFAULT 'NOT_OPEN',
  `quantityToday` DOUBLE NOT NULL DEFAULT 0,
  `unit` VARCHAR(191) NULL,
  `startMachineHours` DOUBLE NULL,
  `endMachineHours` DOUBLE NULL,
  `startOdoKm` DOUBLE NULL,
  `endOdoKm` DOUBLE NULL,
  `fuelLiters` DOUBLE NULL,
  `evidenceUrls` JSON NULL,
  `note` TEXT NULL,
  `workCompleted` BOOLEAN NOT NULL DEFAULT false,
  `reportStartedAt` DATETIME(3) NULL,
  `reportSubmittedAt` DATETIME(3) NULL,
  `reportDelayMinutes` INTEGER NOT NULL DEFAULT 0,
  `submittedByType` ENUM('DRIVER','MANAGER') NULL,
  `submittedByUserId` INTEGER NULL,
  `managerReason` TEXT NULL,
  `revisionReason` TEXT NULL,
  `reviewedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `daily_reports_dispatchOrderId_key` (`dispatchOrderId`),
  INDEX `daily_reports_workOrderId_reportDate_idx` (`workOrderId`, `reportDate`),
  INDEX `daily_reports_originalDriverId_status_reportDate_idx` (`originalDriverId`, `status`, `reportDate`),
  INDEX `daily_reports_status_reportDate_idx` (`status`, `reportDate`),
  PRIMARY KEY (`id`),
  CONSTRAINT `daily_reports_dispatchOrderId_fkey` FOREIGN KEY (`dispatchOrderId`) REFERENCES `dispatch_orders` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `daily_reports_workOrderId_fkey` FOREIGN KEY (`workOrderId`) REFERENCES `operational_work_orders` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `daily_reports_originalDriverId_fkey` FOREIGN KEY (`originalDriverId`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `daily_reports_submittedByUserId_fkey` FOREIGN KEY (`submittedByUserId`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
