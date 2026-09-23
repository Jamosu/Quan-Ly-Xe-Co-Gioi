-- Multi-cycle BDC1/BDC2 maintenance standards and persisted alert center.

CREATE TABLE `maintenance_standards` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `code` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `vehicleTypeId` INTEGER NOT NULL,
  `metric` ENUM('ENGINE_HOUR', 'ODOMETER_KM') NOT NULL,
  `version` INTEGER NOT NULL DEFAULT 1,
  `status` ENUM('DRAFT', 'ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'DRAFT',
  `warningPercent` DOUBLE NOT NULL DEFAULT 80,
  `explanationPercent` DOUBLE NOT NULL DEFAULT 110,
  `repeatAfterMax` BOOLEAN NOT NULL DEFAULT true,
  `bdc1ChecklistJson` JSON NULL,
  `createdById` INTEGER NULL,
  `updatedById` INTEGER NULL,
  `activatedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `maintenance_standards_code_key`(`code`),
  UNIQUE INDEX `maintenance_standards_vehicleTypeId_version_key`(`vehicleTypeId`, `version`),
  INDEX `maintenance_standards_vehicleTypeId_status_idx`(`vehicleTypeId`, `status`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `maintenance_milestones` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `standardId` INTEGER NOT NULL,
  `sequence` INTEGER NOT NULL,
  `meterValue` DOUBLE NOT NULL,
  `label` VARCHAR(191) NULL,
  `checklistTemplateJson` JSON NULL,
  `active` BOOLEAN NOT NULL DEFAULT true,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `maintenance_milestones_standardId_sequence_key`(`standardId`, `sequence`),
  UNIQUE INDEX `maintenance_milestones_standardId_meterValue_key`(`standardId`, `meterValue`),
  INDEX `maintenance_milestones_standardId_active_idx`(`standardId`, `active`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `maintenance_occurrences` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `vehicleId` INTEGER NOT NULL,
  `standardId` INTEGER NOT NULL,
  `milestoneId` INTEGER NOT NULL,
  `cycleIndex` INTEGER NOT NULL DEFAULT 0,
  `previousDueMeter` DOUBLE NOT NULL,
  `dueMeter` DOUBLE NOT NULL,
  `status` ENUM('UPCOMING', 'DUE', 'OVERDUE', 'SCHEDULED', 'IN_SERVICE', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'UPCOMING',
  `alertTier` ENUM('GREEN', 'AMBER', 'RED') NOT NULL DEFAULT 'GREEN',
  `progressPercent` DOUBLE NOT NULL DEFAULT 0,
  `explanationRequired` BOOLEAN NOT NULL DEFAULT false,
  `completedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `maintenance_occurrences_vehicleId_milestoneId_cycleIndex_key`(`vehicleId`, `milestoneId`, `cycleIndex`),
  INDEX `maintenance_occurrences_vehicleId_status_idx`(`vehicleId`, `status`),
  INDEX `maintenance_occurrences_alertTier_status_idx`(`alertTier`, `status`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `bdc1_logs` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `vehicleId` INTEGER NOT NULL,
  `performerId` INTEGER NULL,
  `operatingDate` DATE NOT NULL,
  `openingMachineHours` DOUBLE NOT NULL,
  `openingOdoKm` DOUBLE NOT NULL,
  `checklistJson` JSON NOT NULL,
  `notes` TEXT NULL,
  `photoUrlsJson` JSON NULL,
  `submittedAt` DATETIME(3) NULL,
  `skippedAt` DATETIME(3) NULL,
  `skipReason` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `bdc1_logs_vehicleId_operatingDate_key`(`vehicleId`, `operatingDate`),
  INDEX `bdc1_logs_operatingDate_submittedAt_idx`(`operatingDate`, `submittedAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `alert_rules` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `code` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `description` TEXT NULL,
  `category` ENUM('SOS', 'MAINTENANCE', 'EQUIPMENT', 'DISPATCH', 'FUEL', 'GPS', 'COMPLIANCE', 'SYSTEM') NOT NULL,
  `severity` ENUM('CRITICAL', 'WARNING', 'INFO') NOT NULL,
  `status` ENUM('DRAFT', 'ACTIVE', 'DISABLED') NOT NULL DEFAULT 'DRAFT',
  `configJson` JSON NULL,
  `updatedById` INTEGER NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `alert_rules_code_key`(`code`),
  INDEX `alert_rules_category_status_idx`(`category`, `status`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `alert_events` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `ruleId` INTEGER NULL,
  `dedupeKey` VARCHAR(191) NULL,
  `sourceType` VARCHAR(191) NOT NULL,
  `sourceId` VARCHAR(191) NULL,
  `category` ENUM('SOS', 'MAINTENANCE', 'EQUIPMENT', 'DISPATCH', 'FUEL', 'GPS', 'COMPLIANCE', 'SYSTEM') NOT NULL,
  `alertType` VARCHAR(191) NOT NULL,
  `severity` ENUM('CRITICAL', 'WARNING', 'INFO') NOT NULL,
  `status` ENUM('OPEN', 'IN_PROGRESS', 'RESOLVED', 'DISMISSED') NOT NULL DEFAULT 'OPEN',
  `title` VARCHAR(191) NOT NULL,
  `message` TEXT NOT NULL,
  `location` VARCHAR(191) NULL,
  `metricValue` DOUBLE NULL,
  `thresholdValue` DOUBLE NULL,
  `metricUnit` VARCHAR(191) NULL,
  `targetUrl` VARCHAR(191) NULL,
  `metadataJson` JSON NULL,
  `complexCode` VARCHAR(191) NULL,
  `unit` ENUM('NT1', 'NT2', 'XN_BO', 'TT_BTSC', 'BAN_CO_GIOI', 'TOAN_KLH') NULL,
  `vehicleId` INTEGER NULL,
  `implementId` INTEGER NULL,
  `driverId` INTEGER NULL,
  `handledById` INTEGER NULL,
  `handlingReason` TEXT NULL,
  `occurredAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `handledAt` DATETIME(3) NULL,
  `resolvedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `alert_events_dedupeKey_key`(`dedupeKey`),
  INDEX `alert_events_status_severity_occurredAt_idx`(`status`, `severity`, `occurredAt`),
  INDEX `alert_events_category_status_idx`(`category`, `status`),
  INDEX `alert_events_complexCode_status_idx`(`complexCode`, `status`),
  INDEX `alert_events_unit_status_idx`(`unit`, `status`),
  INDEX `alert_events_vehicleId_idx`(`vehicleId`),
  INDEX `alert_events_implementId_idx`(`implementId`),
  INDEX `alert_events_driverId_idx`(`driverId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `alert_read_receipts` (
  `alertId` INTEGER NOT NULL,
  `userId` INTEGER NOT NULL,
  `readAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `alert_read_receipts_userId_readAt_idx`(`userId`, `readAt`),
  PRIMARY KEY (`alertId`, `userId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `maintenance_records`
  ADD COLUMN `occurrenceId` INTEGER NULL,
  ADD COLUMN `level` ENUM('BDC1', 'BDC2') NOT NULL DEFAULT 'BDC2',
  ADD COLUMN `metric` ENUM('ENGINE_HOUR', 'ODOMETER_KM') NOT NULL DEFAULT 'ENGINE_HOUR',
  ADD COLUMN `currentKm` DOUBLE NULL,
  ADD COLUMN `completionHours` DOUBLE NULL,
  ADD COLUMN `completionKm` DOUBLE NULL,
  ADD COLUMN `photoUrlsJson` JSON NULL,
  ADD COLUMN `conclusion` TEXT NULL,
  ADD COLUMN `explanationReason` TEXT NULL,
  ADD COLUMN `explanationUrl` TEXT NULL,
  ADD INDEX `maintenance_records_occurrenceId_idx`(`occurrenceId`);

ALTER TABLE `repair_tickets`
  DROP FOREIGN KEY `repair_tickets_vehicleId_fkey`,
  MODIFY `vehicleId` INTEGER NULL,
  ADD COLUMN `implementId` INTEGER NULL,
  ADD COLUMN `incidentPhotoUrl` TEXT NULL,
  ADD COLUMN `incidentLocation` VARCHAR(191) NULL,
  ADD INDEX `repair_tickets_implementId_idx`(`implementId`),
  ADD CONSTRAINT `repair_tickets_vehicleId_fkey` FOREIGN KEY (`vehicleId`) REFERENCES `vehicles`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `repair_tickets_implementId_fkey` FOREIGN KEY (`implementId`) REFERENCES `agricultural_implements`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `repair_tickets_exactly_one_asset_chk` CHECK ((`vehicleId` IS NULL) <> (`implementId` IS NULL));

ALTER TABLE `maintenance_standards`
  ADD CONSTRAINT `maintenance_standards_vehicleTypeId_fkey` FOREIGN KEY (`vehicleTypeId`) REFERENCES `vehicle_types`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `maintenance_standards_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `maintenance_standards_updatedById_fkey` FOREIGN KEY (`updatedById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `maintenance_milestones`
  ADD CONSTRAINT `maintenance_milestones_standardId_fkey` FOREIGN KEY (`standardId`) REFERENCES `maintenance_standards`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `maintenance_occurrences`
  ADD CONSTRAINT `maintenance_occurrences_vehicleId_fkey` FOREIGN KEY (`vehicleId`) REFERENCES `vehicles`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `maintenance_occurrences_standardId_fkey` FOREIGN KEY (`standardId`) REFERENCES `maintenance_standards`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `maintenance_occurrences_milestoneId_fkey` FOREIGN KEY (`milestoneId`) REFERENCES `maintenance_milestones`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `bdc1_logs`
  ADD CONSTRAINT `bdc1_logs_vehicleId_fkey` FOREIGN KEY (`vehicleId`) REFERENCES `vehicles`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `bdc1_logs_performerId_fkey` FOREIGN KEY (`performerId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `maintenance_records`
  ADD CONSTRAINT `maintenance_records_occurrenceId_fkey` FOREIGN KEY (`occurrenceId`) REFERENCES `maintenance_occurrences`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `alert_rules`
  ADD CONSTRAINT `alert_rules_updatedById_fkey` FOREIGN KEY (`updatedById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `alert_events`
  ADD CONSTRAINT `alert_events_ruleId_fkey` FOREIGN KEY (`ruleId`) REFERENCES `alert_rules`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `alert_events_vehicleId_fkey` FOREIGN KEY (`vehicleId`) REFERENCES `vehicles`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `alert_events_implementId_fkey` FOREIGN KEY (`implementId`) REFERENCES `agricultural_implements`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `alert_events_driverId_fkey` FOREIGN KEY (`driverId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `alert_events_handledById_fkey` FOREIGN KEY (`handledById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `alert_read_receipts`
  ADD CONSTRAINT `alert_read_receipts_alertId_fkey` FOREIGN KEY (`alertId`) REFERENCES `alert_events`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `alert_read_receipts_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Rules backed by current domain data are active. Rules without approved inputs stay draft.
INSERT INTO `alert_rules` (`code`, `name`, `description`, `category`, `severity`, `status`, `configJson`, `createdAt`, `updatedAt`) VALUES
  ('SOS_EMERGENCY', 'Cứu hộ SOS', 'Sự cố khẩn cấp do tài xế gửi từ hiện trường.', 'SOS', 'CRITICAL', 'ACTIVE', JSON_OBJECT(), NOW(3), NOW(3)),
  ('MAINTENANCE_BDC1_MISSING', 'Chưa thực hiện BDC1', 'Xe có vận hành trong ngày nhưng chưa nộp checklist BDC1.', 'MAINTENANCE', 'WARNING', 'ACTIVE', JSON_OBJECT(), NOW(3), NOW(3)),
  ('MAINTENANCE_BDC2_DUE', 'Đến hạn BDC2', 'Cảnh báo theo định mức bảo dưỡng của loại xe.', 'MAINTENANCE', 'WARNING', 'ACTIVE', JSON_OBJECT('warningPercent', 80, 'explanationPercent', 110), NOW(3), NOW(3)),
  ('EQUIPMENT_BREAKDOWN', 'Thiết bị phụ trợ báo hỏng', 'Thiết bị đang sử dụng được tài xế báo hỏng.', 'EQUIPMENT', 'CRITICAL', 'ACTIVE', JSON_OBJECT(), NOW(3), NOW(3)),
  ('DISPATCH_DELAYED', 'Lệnh điều xe trễ xuất phát', 'Lệnh quá 30 phút chưa xuất phát.', 'DISPATCH', 'WARNING', 'ACTIVE', JSON_OBJECT('delayMinutes', 30), NOW(3), NOW(3)),
  ('FUEL_OVER_QUOTA', 'Vượt định mức nhiên liệu', 'Phiếu cấp phát vượt định mức đang áp dụng.', 'FUEL', 'WARNING', 'ACTIVE', JSON_OBJECT('variancePercent', 5), NOW(3), NOW(3)),
  ('GPS_OVERSPEED', 'Quá tốc độ', 'Tốc độ vượt giới hạn trên vận đơn.', 'GPS', 'WARNING', 'ACTIVE', JSON_OBJECT(), NOW(3), NOW(3)),
  ('GPS_ROUTE_DEVIATION', 'Lệch tuyến', 'Vận đơn được telemetry xác định lệch tuyến.', 'GPS', 'WARNING', 'ACTIVE', JSON_OBJECT(), NOW(3), NOW(3)),
  ('GPS_GEOFENCE', 'Vượt geofence thực', 'Chưa có vùng geofence thực và ngưỡng được phê duyệt.', 'GPS', 'WARNING', 'DRAFT', JSON_OBJECT(), NOW(3), NOW(3)),
  ('GPS_OFFLINE', 'GPS mất kết nối', 'Chưa có ngưỡng mất kết nối được phê duyệt.', 'GPS', 'WARNING', 'DRAFT', JSON_OBJECT(), NOW(3), NOW(3)),
  ('FUEL_SUDDEN_DROP', 'Sụt dầu hoặc hút trộm', 'Chưa có nguồn đo và ngưỡng được phê duyệt.', 'FUEL', 'CRITICAL', 'DRAFT', JSON_OBJECT(), NOW(3), NOW(3)),
  ('FUEL_LOW_STOCK', 'Mức bồn thấp', 'Chưa có ngưỡng an toàn theo từng kho.', 'FUEL', 'WARNING', 'DRAFT', JSON_OBJECT(), NOW(3), NOW(3)),
  ('ENGINE_HIGH_TEMPERATURE', 'Nhiệt độ động cơ cao', 'Chưa có nguồn nhiệt độ và ngưỡng được phê duyệt.', 'GPS', 'CRITICAL', 'DRAFT', JSON_OBJECT(), NOW(3), NOW(3)),
  ('ENGINE_LONG_IDLE', 'Nổ máy tại chỗ quá lâu', 'Chưa có nguồn trạng thái động cơ và ngưỡng được phê duyệt.', 'GPS', 'INFO', 'DRAFT', JSON_OBJECT(), NOW(3), NOW(3));
