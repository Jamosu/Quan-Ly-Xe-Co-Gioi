CREATE TABLE `driver_management_units` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `complexCode` VARCHAR(191) NOT NULL,
  `code` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `level` ENUM('OWNER', 'TEAM') NOT NULL,
  `unitType` ENUM('BAN', 'PHONG', 'TRUNG_TAM', 'XI_NGHIEP', 'NONG_TRUONG', 'DOI', 'TO', 'KHAC') NOT NULL,
  `parentId` INTEGER NULL,
  `status` ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  `description` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `driver_management_units_complexCode_code_key`(`complexCode`, `code`),
  INDEX `driver_management_units_complexCode_level_status_idx`(`complexCode`, `level`, `status`),
  INDEX `driver_management_units_parentId_idx`(`parentId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `driver_management_assignments` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `driverId` INTEGER NOT NULL,
  `managementUnitId` INTEGER NOT NULL,
  `teamUnitId` INTEGER NULL,
  `effectiveFrom` DATETIME(3) NOT NULL,
  `effectiveTo` DATETIME(3) NULL,
  `reason` TEXT NULL,
  `assignedById` INTEGER NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    INDEX `driver_mgmt_assign_driver_eff_idx`(`driverId`, `effectiveFrom`, `effectiveTo`),
  INDEX `driver_management_assignments_managementUnitId_effectiveTo_idx`(`managementUnitId`, `effectiveTo`),
  INDEX `driver_management_assignments_teamUnitId_effectiveTo_idx`(`teamUnitId`, `effectiveTo`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `driver_management_access_scopes` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `userId` INTEGER NOT NULL,
  `complexCode` VARCHAR(191) NOT NULL,
  `managementUnitId` INTEGER NULL,
  `canManageCatalog` BOOLEAN NOT NULL DEFAULT false,
  `canAssignDrivers` BOOLEAN NOT NULL DEFAULT false,
  `grantedById` INTEGER NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `driver_mgmt_scope_user_comp_unit_key`(`userId`, `complexCode`, `managementUnitId`),
  INDEX `driver_mgmt_scope_comp_unit_idx`(`complexCode`, `managementUnitId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `driver_management_units` ADD CONSTRAINT `driver_management_units_parentId_fkey` FOREIGN KEY (`parentId`) REFERENCES `driver_management_units`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `driver_management_assignments` ADD CONSTRAINT `driver_management_assignments_driverId_fkey` FOREIGN KEY (`driverId`) REFERENCES `driver_profiles`(`userId`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `driver_management_assignments` ADD CONSTRAINT `driver_management_assignments_managementUnitId_fkey` FOREIGN KEY (`managementUnitId`) REFERENCES `driver_management_units`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `driver_management_assignments` ADD CONSTRAINT `driver_management_assignments_teamUnitId_fkey` FOREIGN KEY (`teamUnitId`) REFERENCES `driver_management_units`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `driver_management_assignments` ADD CONSTRAINT `driver_management_assignments_assignedById_fkey` FOREIGN KEY (`assignedById`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `driver_management_access_scopes` ADD CONSTRAINT `driver_management_access_scopes_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `driver_management_access_scopes` ADD CONSTRAINT `driver_management_access_scopes_managementUnitId_fkey` FOREIGN KEY (`managementUnitId`) REFERENCES `driver_management_units`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `driver_management_access_scopes` ADD CONSTRAINT `driver_management_access_scopes_grantedById_fkey` FOREIGN KEY (`grantedById`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
