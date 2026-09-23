ALTER TABLE `driver_management_units`
  ADD COLUMN `mainDepotId` INTEGER NULL,
  ADD INDEX `driver_management_units_mainDepotId_idx`(`mainDepotId`),
  ADD CONSTRAINT `driver_management_units_mainDepotId_fkey`
    FOREIGN KEY (`mainDepotId`) REFERENCES `operational_locations`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
