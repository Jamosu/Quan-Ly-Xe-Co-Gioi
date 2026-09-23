ALTER TABLE `work_execution_segments`
  ADD COLUMN `workDate` DATE NULL,
  ADD COLUMN `status` ENUM('ACTIVE', 'ON_BREAK', 'PAUSED', 'ENDED') NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN `grossMinutes` INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN `breakMinutes` INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN `pauseMinutes` INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN `workingMinutes` INTEGER NOT NULL DEFAULT 0;

UPDATE `work_execution_segments`
SET
  `workDate` = DATE(`startedAt`),
  `status` = CASE WHEN `endedAt` IS NULL THEN 'ACTIVE' ELSE 'ENDED' END,
  `grossMinutes` = CASE WHEN `endedAt` IS NULL THEN 0 ELSE GREATEST(0, TIMESTAMPDIFF(MINUTE, `startedAt`, `endedAt`)) END,
  `workingMinutes` = CASE WHEN `endedAt` IS NULL THEN 0 ELSE GREATEST(0, TIMESTAMPDIFF(MINUTE, `startedAt`, `endedAt`)) END;

ALTER TABLE `work_execution_segments`
  MODIFY COLUMN `workDate` DATE NOT NULL DEFAULT (CURRENT_DATE),
  ADD INDEX `work_execution_segments_driverId_status_idx` (`driverId`, `status`),
  ADD INDEX `work_execution_segments_driverId_workDate_idx` (`driverId`, `workDate`),
  ADD INDEX `work_execution_segments_workOrderId_workDate_idx` (`workOrderId`, `workDate`);

CREATE TABLE `work_break_sessions` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `workSessionId` INTEGER NOT NULL,
  `type` ENUM('LUNCH', 'PERSONAL', 'SCHEDULED_BREAK', 'OTHER') NOT NULL DEFAULT 'OTHER',
  `startedAt` DATETIME(3) NOT NULL,
  `endedAt` DATETIME(3) NULL,
  `durationMinutes` INTEGER NOT NULL DEFAULT 0,
  `note` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  INDEX `work_break_sessions_workSessionId_startedAt_idx` (`workSessionId`, `startedAt`),
  INDEX `work_break_sessions_workSessionId_endedAt_idx` (`workSessionId`, `endedAt`),
  PRIMARY KEY (`id`),
  CONSTRAINT `work_break_sessions_workSessionId_fkey` FOREIGN KEY (`workSessionId`) REFERENCES `work_execution_segments` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `work_pause_sessions` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `workSessionId` INTEGER NOT NULL,
  `reason` ENUM('WAITING_MATERIAL', 'WAITING_CARGO', 'WEATHER', 'WAITING_DISPATCH', 'VEHICLE_ISSUE', 'WORKSITE_NOT_READY', 'OTHER') NOT NULL,
  `startedAt` DATETIME(3) NOT NULL,
  `endedAt` DATETIME(3) NULL,
  `durationMinutes` INTEGER NOT NULL DEFAULT 0,
  `note` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  INDEX `work_pause_sessions_workSessionId_startedAt_idx` (`workSessionId`, `startedAt`),
  INDEX `work_pause_sessions_workSessionId_endedAt_idx` (`workSessionId`, `endedAt`),
  PRIMARY KEY (`id`),
  CONSTRAINT `work_pause_sessions_workSessionId_fkey` FOREIGN KEY (`workSessionId`) REFERENCES `work_execution_segments` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `work_daily_progress` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `workOrderId` INTEGER NOT NULL,
  `progressDate` DATE NOT NULL,
  `quantityToday` DOUBLE NOT NULL DEFAULT 0,
  `accumulatedQuantity` DOUBLE NOT NULL DEFAULT 0,
  `overallProgressPercent` DOUBLE NOT NULL DEFAULT 0,
  `description` TEXT NULL,
  `note` TEXT NULL,
  `evidenceUrls` JSON NULL,
  `reportedById` INTEGER NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `work_daily_progress_workOrderId_progressDate_key` (`workOrderId`, `progressDate`),
  INDEX `work_daily_progress_reportedById_progressDate_idx` (`reportedById`, `progressDate`),
  PRIMARY KEY (`id`),
  CONSTRAINT `work_daily_progress_workOrderId_fkey` FOREIGN KEY (`workOrderId`) REFERENCES `operational_work_orders` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `work_daily_progress_reportedById_fkey` FOREIGN KEY (`reportedById`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `driver_sos_alerts`
  ADD COLUMN `workOrderId` INTEGER NULL,
  ADD COLUMN `workSessionId` INTEGER NULL,
  ADD INDEX `driver_sos_alerts_workOrderId_idx` (`workOrderId`),
  ADD INDEX `driver_sos_alerts_workSessionId_idx` (`workSessionId`),
  ADD CONSTRAINT `driver_sos_alerts_workOrderId_fkey` FOREIGN KEY (`workOrderId`) REFERENCES `operational_work_orders` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `driver_sos_alerts_workSessionId_fkey` FOREIGN KEY (`workSessionId`) REFERENCES `work_execution_segments` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;
