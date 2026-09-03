-- Additive migration for normalized vehicle master data and multi-sheet Excel import.
-- No existing Vehicle columns are renamed or dropped.

CREATE TABLE `vehicle_types` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `assetGroup` VARCHAR(191) NULL,
    `category` ENUM('MAY_DAO', 'MAY_UI', 'MAY_SAN', 'MAY_LU', 'MAY_XUC_LAT', 'XE_XUC', 'MAY_CAY', 'MAY_KEO', 'MAY_GAT_DAP', 'XE_TAI', 'XE_BEN', 'XE_BON', 'XE_CONTAINER', 'XE_BAN_TAI', 'XE_CHUYEN_DUNG', 'XE_CONG_VU', 'XE_CHO_NGUOI', 'XE_NANG', 'MAY_PHAT_DIEN', 'MAY_PHAT_CO', 'MAY_CUA', 'MAY_BOM', 'XE_MAY_2_BANH', 'THIET_BI_NONG_CU') NULL,
    `parentId` INTEGER NULL,
    `defaultMaintenanceHours` DOUBLE NOT NULL DEFAULT 250,
    `defaultFuelQuotaRate` DOUBLE NULL,
    `defaultFuelQuotaUnit` ENUM('L_PER_HOUR', 'L_PER_KM', 'L_PER_HA') NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `description` TEXT NULL,
    `sourceLabels` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `vehicle_types_code_key`(`code`),
    INDEX `vehicle_types_assetGroup_idx`(`assetGroup`),
    INDEX `vehicle_types_category_idx`(`category`),
    INDEX `vehicle_types_parentId_idx`(`parentId`),
    INDEX `vehicle_types_active_idx`(`active`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `vehicles`
    ADD COLUMN `vehicleTypeId` INTEGER NULL,
    ADD COLUMN `assetGroup` VARCHAR(191) NULL,
    ADD COLUMN `vehicleSubtype` VARCHAR(191) NULL,
    ADD COLUMN `complexCode` VARCHAR(191) NOT NULL DEFAULT 'KOUN_MOM',
    ADD COLUMN `technicalSpecs` TEXT NULL,
    ADD COLUMN `dimensions` VARCHAR(191) NULL,
    ADD COLUMN `productivity` VARCHAR(191) NULL,
    ADD COLUMN `inspectionDate` DATETIME(3) NULL,
    ADD COLUMN `nextInspectionDate` DATETIME(3) NULL,
    ADD COLUMN `roadFeeDate` DATETIME(3) NULL,
    ADD COLUMN `roadFeeExpiryDate` DATETIME(3) NULL,
    ADD COLUMN `nextRoadFeeDate` DATETIME(3) NULL,
    ADD COLUMN `sourceSheets` JSON NULL,
    ADD COLUMN `importMetadata` JSON NULL;

CREATE INDEX `vehicles_vehicleTypeId_idx` ON `vehicles`(`vehicleTypeId`);
CREATE INDEX `vehicles_assetGroup_idx` ON `vehicles`(`assetGroup`);
CREATE INDEX `vehicles_complexCode_idx` ON `vehicles`(`complexCode`);
CREATE INDEX `vehicles_manufacturer_idx` ON `vehicles`(`manufacturer`);
CREATE INDEX `vehicles_modelName_idx` ON `vehicles`(`modelName`);
CREATE INDEX `vehicles_manufactureYear_idx` ON `vehicles`(`manufactureYear`);

ALTER TABLE `vehicle_types`
    ADD CONSTRAINT `vehicle_types_parentId_fkey`
    FOREIGN KEY (`parentId`) REFERENCES `vehicle_types`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `vehicles`
    ADD CONSTRAINT `vehicles_vehicleTypeId_fkey`
    FOREIGN KEY (`vehicleTypeId`) REFERENCES `vehicle_types`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;
