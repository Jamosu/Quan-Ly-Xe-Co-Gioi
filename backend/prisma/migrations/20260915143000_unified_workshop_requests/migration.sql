-- Unified workshop workflow for maintenance, repair, SOS and external vendors.

ALTER TABLE `workshop_owed_part_notes`
  MODIFY `maintenanceRecordId` INTEGER NULL,
  MODIFY `vehicleId` INTEGER NULL,
  ADD COLUMN `workshopRequestId` INTEGER NULL,
  ADD COLUMN `implementId` INTEGER NULL,
  ADD INDEX `workshop_owed_part_notes_workshopRequestId_idx`(`workshopRequestId`),
  ADD INDEX `workshop_owed_part_notes_implementId_idx`(`implementId`);

CREATE TABLE `workshop_requests` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `code` VARCHAR(191) NOT NULL,
  `type` ENUM('MAINTENANCE', 'REPAIR') NOT NULL,
  `source` ENUM('MANUAL', 'ASSET_PROFILE', 'MAINTENANCE_PLAN', 'SOS', 'ASSET_CONDITION') NOT NULL DEFAULT 'MANUAL',
  `status` ENUM('RECEIVED', 'ASSESSED', 'PLANNED', 'IN_PROGRESS', 'WAITING_PARTS', 'WAITING_VENDOR', 'READY_FOR_ACCEPTANCE', 'REWORK_REQUIRED', 'HANDED_OVER', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'RECEIVED',
  `repairRoute` ENUM('INTERNAL', 'WARRANTY_VENDOR', 'OUTSOURCED_VENDOR') NOT NULL DEFAULT 'INTERNAL',
  `priority` ENUM('PRODUCTION', 'SAFETY', 'QUALITY', 'EQUIPMENT') NOT NULL DEFAULT 'EQUIPMENT',
  `repairTier` ENUM('TIEU_TU', 'TRUNG_TU', 'DAI_TU', 'SOS_CUU_HO') NULL,
  `vehicleId` INTEGER NULL,
  `implementId` INTEGER NULL,
  `maintenanceOccurrenceId` INTEGER NULL,
  `sosAlertId` INTEGER NULL,
  `reportedById` INTEGER NULL,
  `assignedTechnicianId` INTEGER NULL,
  `issueDescription` TEXT NOT NULL,
  `rootCause` TEXT NULL,
  `resolution` TEXT NULL,
  `checklistJson` JSON NULL,
  `photoUrlsJson` JSON NULL,
  `partsJson` JSON NULL,
  `currentHours` DOUBLE NULL,
  `currentKm` DOUBLE NULL,
  `completionHours` DOUBLE NULL,
  `completionKm` DOUBLE NULL,
  `explanationReason` TEXT NULL,
  `explanationUrl` TEXT NULL,
  `incidentLocation` VARCHAR(191) NULL,
  `vendorName` VARCHAR(191) NULL,
  `vendorContact` VARCHAR(191) NULL,
  `vendorSentAt` DATETIME(3) NULL,
  `vendorExpectedReturnAt` DATETIME(3) NULL,
  `vendorReturnedAt` DATETIME(3) NULL,
  `vendorNotes` TEXT NULL,
  `estimatedCostVnd` DOUBLE NOT NULL DEFAULT 0,
  `actualCostVnd` DOUBLE NOT NULL DEFAULT 0,
  `plannedStartAt` DATETIME(3) NULL,
  `plannedEndAt` DATETIME(3) NULL,
  `startedAt` DATETIME(3) NULL,
  `readyForAcceptanceAt` DATETIME(3) NULL,
  `handedOverAt` DATETIME(3) NULL,
  `completedAt` DATETIME(3) NULL,
  `cancelledAt` DATETIME(3) NULL,
  `cancellationReason` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `workshop_requests_code_key`(`code`),
  UNIQUE INDEX `workshop_requests_sosAlertId_key`(`sosAlertId`),
  INDEX `workshop_requests_type_status_idx`(`type`, `status`),
  INDEX `workshop_requests_vehicleId_status_idx`(`vehicleId`, `status`),
  INDEX `workshop_requests_implementId_status_idx`(`implementId`, `status`),
  INDEX `workshop_requests_maintenanceOccurrenceId_idx`(`maintenanceOccurrenceId`),
  INDEX `workshop_requests_plannedStartAt_plannedEndAt_idx`(`plannedStartAt`, `plannedEndAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `workshop_request_documents` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `requestId` INTEGER NOT NULL,
  `type` ENUM('BM09_REQUEST', 'BM01_INCIDENT', 'BM02_REPAIR', 'BM03_VENDOR_FEEDBACK', 'BM10_REPAIR_HISTORY', 'BM11_TECHNICAL_REPORT', 'BM12_ACCEPTANCE') NOT NULL,
  `status` ENUM('NOT_STARTED', 'IN_PROGRESS', 'WAITING_APPROVAL', 'COMPLETED') NOT NULL DEFAULT 'NOT_STARTED',
  `documentNo` VARCHAR(191) NULL,
  `fileUrl` TEXT NULL,
  `notes` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `workshop_request_documents_requestId_type_key`(`requestId`, `type`),
  INDEX `workshop_request_documents_status_idx`(`status`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `workshop_requests`
  ADD CONSTRAINT `workshop_requests_vehicleId_fkey` FOREIGN KEY (`vehicleId`) REFERENCES `vehicles`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `workshop_requests_implementId_fkey` FOREIGN KEY (`implementId`) REFERENCES `agricultural_implements`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `workshop_requests_maintenanceOccurrenceId_fkey` FOREIGN KEY (`maintenanceOccurrenceId`) REFERENCES `maintenance_occurrences`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `workshop_requests_sosAlertId_fkey` FOREIGN KEY (`sosAlertId`) REFERENCES `driver_sos_alerts`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `workshop_requests_reportedById_fkey` FOREIGN KEY (`reportedById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `workshop_requests_assignedTechnicianId_fkey` FOREIGN KEY (`assignedTechnicianId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `workshop_request_documents`
  ADD CONSTRAINT `workshop_request_documents_requestId_fkey` FOREIGN KEY (`requestId`) REFERENCES `workshop_requests`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `workshop_owed_part_notes`
  ADD CONSTRAINT `workshop_owed_part_notes_workshopRequestId_fkey` FOREIGN KEY (`workshopRequestId`) REFERENCES `workshop_requests`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `workshop_owed_part_notes_implementId_fkey` FOREIGN KEY (`implementId`) REFERENCES `agricultural_implements`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TRIGGER `workshop_requests_exactly_one_asset_insert`
BEFORE INSERT ON `workshop_requests` FOR EACH ROW
BEGIN
  IF (NEW.`vehicleId` IS NULL) = (NEW.`implementId` IS NULL) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Workshop request must reference exactly one asset';
  END IF;
END;

CREATE TRIGGER `workshop_requests_exactly_one_asset_update`
BEFORE UPDATE ON `workshop_requests` FOR EACH ROW
BEGIN
  IF (NEW.`vehicleId` IS NULL) = (NEW.`implementId` IS NULL) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Workshop request must reference exactly one asset';
  END IF;
END;
