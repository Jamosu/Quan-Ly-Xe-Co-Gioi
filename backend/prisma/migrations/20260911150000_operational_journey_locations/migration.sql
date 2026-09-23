-- Operational locations and journey milestones for proximity dispatching.
ALTER TABLE `dispatch_orders`
  MODIFY `status` ENUM('DRAFT','PENDING_APPROVAL','APPROVED','ASSIGNED','DRIVER_ACCEPTED','DEPARTED','AT_WORKSITE','WORKING','RETURNING_TO_DEPOT','COMPLETED','ACCEPTED','CLOSED','REJECTED','CANCELLED') NOT NULL DEFAULT 'DRAFT',
  ADD COLUMN `originLocationId` INTEGER NULL,
  ADD COLUMN `destinationLocationId` INTEGER NULL;

ALTER TABLE `transport_orders`
  MODIFY `status` ENUM('DRAFT','PENDING_APPROVAL','APPROVED','ASSIGNED','DRIVER_ACCEPTED','AT_PICKUP','LOADING','DEPARTED','IN_TRANSIT','AT_DELIVERY','UNLOADING','DELIVERED','RETURNING_TO_DEPOT','AT_DEPOT','ACCEPTED','COMPLETED','CANCELLED') NOT NULL DEFAULT 'DRAFT',
  ADD COLUMN `originLocationId` INTEGER NULL,
  ADD COLUMN `destinationLocationId` INTEGER NULL,
  ADD COLUMN `returnOrigin` VARCHAR(191) NULL,
  ADD COLUMN `returnOriginLocationId` INTEGER NULL,
  ADD COLUMN `returnDestinationLocationId` INTEGER NULL;

CREATE TABLE `operational_locations` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `code` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `type` ENUM('DEPOT','WORKSITE','PICKUP','DELIVERY','OTHER') NOT NULL,
  `unit` ENUM('NT1','NT2','XN_BO','TT_BTSC','BAN_CO_GIOI','TOAN_KLH') NULL,
  `complexCode` VARCHAR(191) NULL,
  `regionName` VARCHAR(191) NULL,
  `address` VARCHAR(191) NULL,
  `lat` DOUBLE NULL,
  `lng` DOUBLE NULL,
  `geofenceRadiusM` INTEGER NOT NULL DEFAULT 300,
  `active` BOOLEAN NOT NULL DEFAULT true,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `operational_locations_code_key` (`code`),
  UNIQUE INDEX `operational_locations_name_complexCode_key` (`name`, `complexCode`),
  INDEX `operational_locations_type_active_idx` (`type`, `active`),
  INDEX `operational_locations_unit_idx` (`unit`),
  INDEX `operational_locations_complexCode_idx` (`complexCode`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `vehicles` ADD COLUMN `homeDepotId` INTEGER NULL;

CREATE TABLE `work_journey_legs` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `workOrderId` INTEGER NOT NULL,
  `sequence` INTEGER NOT NULL,
  `type` ENUM('OUTBOUND','RETURN','REPOSITION') NOT NULL,
  `status` ENUM('PLANNED','EN_ROUTE_TO_PICKUP','AT_PICKUP','LOADING','WORKING','IN_TRANSIT','AT_DELIVERY','UNLOADING','COMPLETED','RETURNING_TO_DEPOT','AT_DEPOT') NOT NULL DEFAULT 'PLANNED',
  `originLocationId` INTEGER NULL,
  `destinationLocationId` INTEGER NULL,
  `originName` VARCHAR(191) NOT NULL,
  `destinationName` VARCHAR(191) NOT NULL,
  `cargoName` VARCHAR(191) NULL,
  `tonnage` DOUBLE NULL,
  `isEmpty` BOOLEAN NOT NULL DEFAULT false,
  `startedAt` DATETIME(3) NULL,
  `pickupAt` DATETIME(3) NULL,
  `loadingAt` DATETIME(3) NULL,
  `departedAt` DATETIME(3) NULL,
  `deliveryAt` DATETIME(3) NULL,
  `unloadingAt` DATETIME(3) NULL,
  `completedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `work_journey_legs_workOrderId_sequence_key` (`workOrderId`, `sequence`),
  INDEX `work_journey_legs_workOrderId_status_idx` (`workOrderId`, `status`),
  INDEX `work_journey_legs_originLocationId_idx` (`originLocationId`),
  INDEX `work_journey_legs_destinationLocationId_idx` (`destinationLocationId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `work_evidence`
  MODIFY `type` ENUM('START_PHOTO','ARRIVAL_PHOTO','LOADING_PHOTO','DELIVERY_PHOTO','WORK_COMPLETION_PHOTO','DEPOT_RETURN_PHOTO','COMPLETION_PHOTO','ACCEPTANCE_PHOTO','CANNOT_ACCEPT_EVIDENCE','OTHER') NOT NULL,
  ADD COLUMN `locationStatus` ENUM('GPS_RECORDED','EXIF_RECORDED','LOCATION_UNKNOWN') NOT NULL DEFAULT 'LOCATION_UNKNOWN';

CREATE INDEX `vehicles_homeDepotId_idx` ON `vehicles` (`homeDepotId`);
CREATE INDEX `dispatch_orders_originLocationId_idx` ON `dispatch_orders` (`originLocationId`);
CREATE INDEX `dispatch_orders_destinationLocationId_idx` ON `dispatch_orders` (`destinationLocationId`);
CREATE INDEX `transport_orders_originLocationId_idx` ON `transport_orders` (`originLocationId`);
CREATE INDEX `transport_orders_destinationLocationId_idx` ON `transport_orders` (`destinationLocationId`);
CREATE INDEX `transport_orders_returnOriginLocationId_idx` ON `transport_orders` (`returnOriginLocationId`);
CREATE INDEX `transport_orders_returnDestinationLocationId_idx` ON `transport_orders` (`returnDestinationLocationId`);

ALTER TABLE `vehicles` ADD CONSTRAINT `vehicles_homeDepotId_fkey` FOREIGN KEY (`homeDepotId`) REFERENCES `operational_locations` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `dispatch_orders` ADD CONSTRAINT `dispatch_orders_originLocationId_fkey` FOREIGN KEY (`originLocationId`) REFERENCES `operational_locations` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `dispatch_orders` ADD CONSTRAINT `dispatch_orders_destinationLocationId_fkey` FOREIGN KEY (`destinationLocationId`) REFERENCES `operational_locations` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `transport_orders` ADD CONSTRAINT `transport_orders_originLocationId_fkey` FOREIGN KEY (`originLocationId`) REFERENCES `operational_locations` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `transport_orders` ADD CONSTRAINT `transport_orders_destinationLocationId_fkey` FOREIGN KEY (`destinationLocationId`) REFERENCES `operational_locations` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `transport_orders` ADD CONSTRAINT `transport_orders_returnOriginLocationId_fkey` FOREIGN KEY (`returnOriginLocationId`) REFERENCES `operational_locations` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `transport_orders` ADD CONSTRAINT `transport_orders_returnDestinationLocationId_fkey` FOREIGN KEY (`returnDestinationLocationId`) REFERENCES `operational_locations` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `work_journey_legs` ADD CONSTRAINT `work_journey_legs_workOrderId_fkey` FOREIGN KEY (`workOrderId`) REFERENCES `operational_work_orders` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `work_journey_legs` ADD CONSTRAINT `work_journey_legs_originLocationId_fkey` FOREIGN KEY (`originLocationId`) REFERENCES `operational_locations` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `work_journey_legs` ADD CONSTRAINT `work_journey_legs_destinationLocationId_fkey` FOREIGN KEY (`destinationLocationId`) REFERENCES `operational_locations` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- Seed the existing frontend depot catalog. Exact coordinates are intentionally left null until verified.
INSERT IGNORE INTO `operational_locations` (`code`, `name`, `type`, `complexCode`, `regionName`, `address`, `updatedAt`) VALUES
  ('LOC-KM-01','Lô 21 DP1','DEPOT','KOUN_MOM','Khu vực Daun Penh (DP)','XN Chuối Daun Penh 1, Ratanakiri',NOW(3)),
  ('LOC-KM-02','Lô 15.6 DP2','DEPOT','KOUN_MOM','Khu vực Daun Penh (DP)','XN Chuối Daun Penh 2, Ratanakiri',NOW(3)),
  ('LOC-KM-03','Lô 28 DP3','DEPOT','KOUN_MOM','Khu vực Daun Penh (DP)','XN Chuối Daun Penh 3, Ratanakiri',NOW(3)),
  ('LOC-KM-04','Lô 85 DP4','DEPOT','KOUN_MOM','Khu vực Daun Penh (DP)','XN Chuối Daun Penh 4 & Đội Cơ giới',NOW(3)),
  ('LOC-KM-05','Lô 7 LP1','DEPOT','KOUN_MOM','Khu vực Lumphat (LP)','XN Chuối Lumphat 1',NOW(3)),
  ('LOC-KM-06','Lô 2 LP3','DEPOT','KOUN_MOM','Khu vực Lumphat (LP)','XN Chuối Lumphat 3',NOW(3)),
  ('LOC-KM-07','LP3.5-LP3','DEPOT','KOUN_MOM','Khu vực Lumphat (LP)','Cụm sản xuất Lumphat 3.5',NOW(3)),
  ('LOC-KM-08','NOCN L.4-LP3','DEPOT','KOUN_MOM','Khu vực Lumphat (LP)','Khu cơ giới thi công LP3',NOW(3)),
  ('LOC-KM-09','Lô 28 XN Bò','DEPOT','KOUN_MOM','Khu vực Andong Meas (AD)','Khu chuồng trại Xí nghiệp Bò AD',NOW(3)),
  ('LOC-KM-10','Lô 73 ADM','DEPOT','KOUN_MOM','Khu vực Andong Meas (AD)','Cụm cơ giới thi công Andong Meas',NOW(3)),
  ('LOC-KM-11','Tổng kho KLH','DEPOT','KOUN_MOM','Văn phòng KLH','Tổng kho vật tư & phụ tùng trung tâm',NOW(3)),
  ('LOC-KM-12','Bãi xe Trung tâm','DEPOT','KOUN_MOM','Toàn KLH','Bãi tập kết & điều động xe trung tâm KLH Koun Mom',NOW(3)),
  ('LOC-SN-01','Bãi xe XN Cao su Snoul 1','DEPOT','SNOUL','Xí nghiệp Cao su Snoul','Nông trường Cao su 1, Huyện Snoul, Tỉnh Kratie',NOW(3)),
  ('LOC-SN-02','Bãi xe NT Cao su Snoul 2','DEPOT','SNOUL','Xí nghiệp Cao su Snoul','Nông trường Cao su 2, Huyện Snoul, Tỉnh Kratie',NOW(3)),
  ('LOC-SN-03','Bãi tập kết XN Bò Thịt Snoul','DEPOT','SNOUL','Xí nghiệp Bò Snoul','Khu chuồng trại nuôi bò thịt Snoul',NOW(3)),
  ('LOC-NL-01','Bãi xe XN Trồng trọt Attapeu','DEPOT','NAM_LAO','Xí nghiệp Trồng trọt Attapeu','Cụm cơ giới trồng ngô & đậu nành Attapeu',NOW(3)),
  ('LOC-NL-02','Bãi tập kết Nông trường 1 Attapeu','DEPOT','NAM_LAO','Xí nghiệp Cơ giới Hóa Attapeu','Nông trường Nông nghiệp 1 Attapeu, Lào',NOW(3));

-- Preserve every legacy free-text origin/destination as a location record.
INSERT IGNORE INTO `operational_locations` (`code`, `name`, `type`, `complexCode`, `address`, `updatedAt`)
SELECT CONCAT('LEGACY-', LPAD(ROW_NUMBER() OVER (ORDER BY `name`), 5, '0')), `name`, 'OTHER', 'KOUN_MOM', `name`, NOW(3)
FROM (
  SELECT DISTINCT TRIM(`origin`) AS `name` FROM `dispatch_orders` WHERE `origin` IS NOT NULL AND TRIM(`origin`) <> ''
  UNION
  SELECT DISTINCT TRIM(`destination`) AS `name` FROM `dispatch_orders` WHERE `destination` IS NOT NULL AND TRIM(`destination`) <> ''
  UNION
  SELECT DISTINCT TRIM(`origin`) AS `name` FROM `transport_orders` WHERE `origin` IS NOT NULL AND TRIM(`origin`) <> ''
  UNION
  SELECT DISTINCT TRIM(`destination`) AS `name` FROM `transport_orders` WHERE `destination` IS NOT NULL AND TRIM(`destination`) <> ''
  UNION
  SELECT DISTINCT TRIM(`returnOrigin`) AS `name` FROM `transport_orders` WHERE `returnOrigin` IS NOT NULL AND TRIM(`returnOrigin`) <> ''
  UNION
  SELECT DISTINCT TRIM(`returnDestination`) AS `name` FROM `transport_orders` WHERE `returnDestination` IS NOT NULL AND TRIM(`returnDestination`) <> ''
) legacy_locations;

UPDATE `dispatch_orders` d JOIN `operational_locations` l ON l.`name` = TRIM(d.`origin`) SET d.`originLocationId` = l.`id` WHERE d.`originLocationId` IS NULL;
UPDATE `dispatch_orders` d JOIN `operational_locations` l ON l.`name` = TRIM(d.`destination`) SET d.`destinationLocationId` = l.`id` WHERE d.`destinationLocationId` IS NULL;
UPDATE `transport_orders` t JOIN `operational_locations` l ON l.`name` = TRIM(t.`origin`) SET t.`originLocationId` = l.`id` WHERE t.`originLocationId` IS NULL;
UPDATE `transport_orders` t JOIN `operational_locations` l ON l.`name` = TRIM(t.`destination`) SET t.`destinationLocationId` = l.`id` WHERE t.`destinationLocationId` IS NULL;
UPDATE `transport_orders` t JOIN `operational_locations` l ON l.`name` = TRIM(t.`returnOrigin`) SET t.`returnOriginLocationId` = l.`id` WHERE t.`returnOriginLocationId` IS NULL;
UPDATE `transport_orders` t JOIN `operational_locations` l ON l.`name` = TRIM(t.`returnDestination`) SET t.`returnDestinationLocationId` = l.`id` WHERE t.`returnDestinationLocationId` IS NULL;
UPDATE `vehicles` v JOIN `operational_locations` l ON l.`name` = TRIM(v.`currentLocationName`) SET v.`homeDepotId` = l.`id` WHERE v.`homeDepotId` IS NULL;
