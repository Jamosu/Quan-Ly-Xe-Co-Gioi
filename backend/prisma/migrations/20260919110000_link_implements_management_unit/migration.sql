ALTER TABLE `agricultural_implements`
  ADD COLUMN `assignedUnitCode` VARCHAR(191) NULL,
  ADD COLUMN `managementUnitId` INTEGER NULL,
  ADD INDEX `agricultural_implements_assignedUnitCode_idx` (`assignedUnitCode`),
  ADD INDEX `agricultural_implements_managementUnitId_idx` (`managementUnitId`),
  ADD CONSTRAINT `agricultural_implements_managementUnitId_fkey`
    FOREIGN KEY (`managementUnitId`) REFERENCES `driver_management_units` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;
