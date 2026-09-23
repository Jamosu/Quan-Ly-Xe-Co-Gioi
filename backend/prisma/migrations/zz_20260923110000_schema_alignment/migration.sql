-- Align legacy demo data with the current canonical enums and schema.

-- Expand Unit enums temporarily so existing rows can be mapped without truncation.
ALTER TABLE `users` MODIFY `unit` ENUM('NT1','NT2','XN_BO','TT_BTSC','BAN_CO_GIOI','KOUN_MOM','SNOUL','NAM_LAO','TOAN_KLH') NOT NULL DEFAULT 'NT1';
ALTER TABLE `vehicles` MODIFY `unit` ENUM('NT1','NT2','XN_BO','TT_BTSC','BAN_CO_GIOI','KOUN_MOM','SNOUL','NAM_LAO','TOAN_KLH') NOT NULL DEFAULT 'BAN_CO_GIOI';
ALTER TABLE `agricultural_implements` MODIFY `unit` ENUM('NT1','NT2','XN_BO','TT_BTSC','BAN_CO_GIOI','KOUN_MOM','SNOUL','NAM_LAO','TOAN_KLH') NOT NULL;
ALTER TABLE `production_plans` MODIFY `unit` ENUM('NT1','NT2','XN_BO','TT_BTSC','BAN_CO_GIOI','KOUN_MOM','SNOUL','NAM_LAO','TOAN_KLH') NOT NULL DEFAULT 'NT1';
ALTER TABLE `production_orders` MODIFY `unit` ENUM('NT1','NT2','XN_BO','TT_BTSC','BAN_CO_GIOI','KOUN_MOM','SNOUL','NAM_LAO','TOAN_KLH') NOT NULL;
ALTER TABLE `dispatch_orders` MODIFY `unit` ENUM('NT1','NT2','XN_BO','TT_BTSC','BAN_CO_GIOI','KOUN_MOM','SNOUL','NAM_LAO','TOAN_KLH') NOT NULL;
ALTER TABLE `transport_orders` MODIFY `unit` ENUM('NT1','NT2','XN_BO','TT_BTSC','BAN_CO_GIOI','KOUN_MOM','SNOUL','NAM_LAO','TOAN_KLH') NOT NULL DEFAULT 'BAN_CO_GIOI';
ALTER TABLE `fuel_warehouses` MODIFY `unit` ENUM('NT1','NT2','XN_BO','TT_BTSC','BAN_CO_GIOI','KOUN_MOM','SNOUL','NAM_LAO','TOAN_KLH') NOT NULL DEFAULT 'BAN_CO_GIOI';
ALTER TABLE `operational_work_orders` MODIFY `unit` ENUM('NT1','NT2','XN_BO','TT_BTSC','BAN_CO_GIOI','KOUN_MOM','SNOUL','NAM_LAO','TOAN_KLH') NOT NULL;
ALTER TABLE `alert_events` MODIFY `unit` ENUM('NT1','NT2','XN_BO','TT_BTSC','BAN_CO_GIOI','KOUN_MOM','SNOUL','NAM_LAO','TOAN_KLH') NULL;
ALTER TABLE `operational_locations` MODIFY `unit` ENUM('NT1','NT2','XN_BO','TT_BTSC','BAN_CO_GIOI','KOUN_MOM','SNOUL','NAM_LAO','TOAN_KLH') NULL;
ALTER TABLE `scheduling_policies` MODIFY `unit` ENUM('NT1','NT2','XN_BO','TT_BTSC','BAN_CO_GIOI','KOUN_MOM','SNOUL','NAM_LAO','TOAN_KLH') NOT NULL;

UPDATE `users`
SET `unit` = 'KOUN_MOM'
WHERE `unit` IN ('NT1','NT2','XN_BO','TT_BTSC','BAN_CO_GIOI');

UPDATE `vehicles`
SET `unit` = CASE
  WHEN `complexCode` = 'SNOUL' THEN 'SNOUL'
  WHEN `complexCode` = 'NAM_LAO' THEN 'NAM_LAO'
  ELSE 'KOUN_MOM'
END
WHERE `unit` IN ('NT1','NT2','XN_BO','TT_BTSC','BAN_CO_GIOI');

UPDATE `agricultural_implements` SET `unit` = 'KOUN_MOM' WHERE `unit` IN ('NT1','NT2','XN_BO','TT_BTSC','BAN_CO_GIOI');
UPDATE `production_plans` SET `unit` = 'KOUN_MOM' WHERE `unit` IN ('NT1','NT2','XN_BO','TT_BTSC','BAN_CO_GIOI');
UPDATE `production_orders` SET `unit` = 'KOUN_MOM' WHERE `unit` IN ('NT1','NT2','XN_BO','TT_BTSC','BAN_CO_GIOI');
UPDATE `dispatch_orders` SET `unit` = 'KOUN_MOM' WHERE `unit` IN ('NT1','NT2','XN_BO','TT_BTSC','BAN_CO_GIOI');
UPDATE `transport_orders` SET `unit` = 'KOUN_MOM' WHERE `unit` IN ('NT1','NT2','XN_BO','TT_BTSC','BAN_CO_GIOI');
UPDATE `fuel_warehouses` SET `unit` = 'KOUN_MOM' WHERE `unit` IN ('NT1','NT2','XN_BO','TT_BTSC','BAN_CO_GIOI');

UPDATE `operational_work_orders`
SET `unit` = CASE
  WHEN `complexCode` = 'SNOUL' THEN 'SNOUL'
  WHEN `complexCode` = 'NAM_LAO' THEN 'NAM_LAO'
  ELSE 'KOUN_MOM'
END
WHERE `unit` IN ('NT1','NT2','XN_BO','TT_BTSC','BAN_CO_GIOI');

UPDATE `alert_events`
SET `unit` = CASE
  WHEN `complexCode` = 'SNOUL' THEN 'SNOUL'
  WHEN `complexCode` = 'NAM_LAO' THEN 'NAM_LAO'
  ELSE 'KOUN_MOM'
END
WHERE `unit` IN ('NT1','NT2','XN_BO','TT_BTSC','BAN_CO_GIOI');

UPDATE `operational_locations`
SET `unit` = CASE
  WHEN `complexCode` = 'SNOUL' THEN 'SNOUL'
  WHEN `complexCode` = 'NAM_LAO' THEN 'NAM_LAO'
  ELSE 'KOUN_MOM'
END
WHERE `unit` IN ('NT1','NT2','XN_BO','TT_BTSC','BAN_CO_GIOI');

INSERT IGNORE INTO `scheduling_policies`
  (`unit`,`vehicleBufferMinutes`,`driverBufferMinutes`,`timezone`,`completionPhotoCount`,`acceptGraceMinutes`,`reportOpenBeforeMinutes`,`reportGraceMinutes`,`createdAt`,`updatedAt`)
SELECT 'KOUN_MOM',`vehicleBufferMinutes`,`driverBufferMinutes`,`timezone`,`completionPhotoCount`,`acceptGraceMinutes`,`reportOpenBeforeMinutes`,`reportGraceMinutes`,CURRENT_TIMESTAMP(3),CURRENT_TIMESTAMP(3)
FROM `scheduling_policies`
ORDER BY CASE WHEN `unit` = 'BAN_CO_GIOI' THEN 0 ELSE 1 END
LIMIT 1;

INSERT IGNORE INTO `scheduling_policies`
  (`unit`,`vehicleBufferMinutes`,`driverBufferMinutes`,`timezone`,`completionPhotoCount`,`acceptGraceMinutes`,`reportOpenBeforeMinutes`,`reportGraceMinutes`,`createdAt`,`updatedAt`)
SELECT 'SNOUL',`vehicleBufferMinutes`,`driverBufferMinutes`,`timezone`,`completionPhotoCount`,`acceptGraceMinutes`,`reportOpenBeforeMinutes`,`reportGraceMinutes`,CURRENT_TIMESTAMP(3),CURRENT_TIMESTAMP(3)
FROM `scheduling_policies` WHERE `unit` = 'KOUN_MOM';

INSERT IGNORE INTO `scheduling_policies`
  (`unit`,`vehicleBufferMinutes`,`driverBufferMinutes`,`timezone`,`completionPhotoCount`,`acceptGraceMinutes`,`reportOpenBeforeMinutes`,`reportGraceMinutes`,`createdAt`,`updatedAt`)
SELECT 'NAM_LAO',`vehicleBufferMinutes`,`driverBufferMinutes`,`timezone`,`completionPhotoCount`,`acceptGraceMinutes`,`reportOpenBeforeMinutes`,`reportGraceMinutes`,CURRENT_TIMESTAMP(3),CURRENT_TIMESTAMP(3)
FROM `scheduling_policies` WHERE `unit` = 'KOUN_MOM';

DELETE FROM `scheduling_policies` WHERE `unit` IN ('NT1','NT2','XN_BO','TT_BTSC','BAN_CO_GIOI');

-- Remove legacy Unit values after every row has a canonical value.
ALTER TABLE `users` MODIFY `unit` ENUM('KOUN_MOM','SNOUL','NAM_LAO','TOAN_KLH') NOT NULL DEFAULT 'KOUN_MOM';
ALTER TABLE `vehicles` MODIFY `unit` ENUM('KOUN_MOM','SNOUL','NAM_LAO','TOAN_KLH') NOT NULL DEFAULT 'KOUN_MOM';
ALTER TABLE `agricultural_implements` MODIFY `unit` ENUM('KOUN_MOM','SNOUL','NAM_LAO','TOAN_KLH') NOT NULL;
ALTER TABLE `production_plans` MODIFY `unit` ENUM('KOUN_MOM','SNOUL','NAM_LAO','TOAN_KLH') NOT NULL DEFAULT 'KOUN_MOM';
ALTER TABLE `production_orders` MODIFY `unit` ENUM('KOUN_MOM','SNOUL','NAM_LAO','TOAN_KLH') NOT NULL;
ALTER TABLE `dispatch_orders` MODIFY `unit` ENUM('KOUN_MOM','SNOUL','NAM_LAO','TOAN_KLH') NOT NULL;
ALTER TABLE `transport_orders` MODIFY `unit` ENUM('KOUN_MOM','SNOUL','NAM_LAO','TOAN_KLH') NOT NULL DEFAULT 'KOUN_MOM';
ALTER TABLE `fuel_warehouses` MODIFY `unit` ENUM('KOUN_MOM','SNOUL','NAM_LAO','TOAN_KLH') NOT NULL DEFAULT 'KOUN_MOM';
ALTER TABLE `operational_work_orders` MODIFY `unit` ENUM('KOUN_MOM','SNOUL','NAM_LAO','TOAN_KLH') NOT NULL;
ALTER TABLE `alert_events` MODIFY `unit` ENUM('KOUN_MOM','SNOUL','NAM_LAO','TOAN_KLH') NULL;
ALTER TABLE `operational_locations` MODIFY `unit` ENUM('KOUN_MOM','SNOUL','NAM_LAO','TOAN_KLH') NULL;
ALTER TABLE `scheduling_policies` MODIFY `unit` ENUM('KOUN_MOM','SNOUL','NAM_LAO','TOAN_KLH') NOT NULL;

-- Normalize legacy license classes before shrinking the enum.
ALTER TABLE `driver_profiles` MODIFY `licenseClass` ENUM('HANG_A','HANG_B1','HANG_B2','HANG_C','HANG_CE','HANG_FC','HANG_D','HANG_D1','HANG_D2','BANG_MAY_NONG_NGHIEP') NULL;
UPDATE `users` SET `licenseClass` = 'HANG_B2' WHERE `licenseClass` = 'BANG_MAY_NONG_NGHIEP';
UPDATE `users` SET `licenseClass` = 'HANG_CE' WHERE `licenseClass` = 'HANG_FC';
UPDATE `users` SET `licenseClass` = 'HANG_D1' WHERE `licenseClass` = 'HANG_D';
UPDATE `driver_profiles` SET `licenseClass` = 'HANG_B2' WHERE `licenseClass` = 'BANG_MAY_NONG_NGHIEP';
UPDATE `driver_profiles` SET `licenseClass` = 'HANG_CE' WHERE `licenseClass` = 'HANG_FC';
UPDATE `driver_profiles` SET `licenseClass` = 'HANG_D1' WHERE `licenseClass` = 'HANG_D';
UPDATE `vehicle_types` SET `requiredLicenseClass` = 'HANG_B2' WHERE `requiredLicenseClass` = 'BANG_MAY_NONG_NGHIEP';
UPDATE `vehicle_types` SET `requiredLicenseClass` = 'HANG_CE' WHERE `requiredLicenseClass` = 'HANG_FC';
UPDATE `vehicle_types` SET `requiredLicenseClass` = 'HANG_D1' WHERE `requiredLicenseClass` = 'HANG_D';
ALTER TABLE `users` MODIFY `licenseClass` ENUM('HANG_A','HANG_B1','HANG_B2','HANG_C','HANG_CE','HANG_D1','HANG_D2') NULL DEFAULT 'HANG_B2';
ALTER TABLE `driver_profiles` MODIFY `licenseClass` ENUM('HANG_A','HANG_B1','HANG_B2','HANG_C','HANG_CE','HANG_D1','HANG_D2') NULL;
ALTER TABLE `vehicle_types` MODIFY `requiredLicenseClass` ENUM('HANG_A','HANG_B1','HANG_B2','HANG_C','HANG_CE','HANG_D1','HANG_D2') NULL;

ALTER TABLE `driver_management_units`
  ADD COLUMN `managerName` VARCHAR(191) NULL,
  ADD COLUMN `managerPhone` VARCHAR(191) NULL;

ALTER TABLE `driver_profiles` ADD COLUMN `licensesJson` JSON NULL;
ALTER TABLE `driver_sos_alerts` MODIFY `status` ENUM('PENDING','DISPATCHED','RESOLVED') NOT NULL DEFAULT 'PENDING';
ALTER TABLE `work_execution_segments` MODIFY `workDate` DATE NULL;

CREATE INDEX `dispatch_orders_previousDispatchOrderId_idx` ON `dispatch_orders`(`previousDispatchOrderId`);

ALTER TABLE `implement_vehicle_type_compatibilities` DROP FOREIGN KEY `ivtc_implement_fk`;
ALTER TABLE `implement_vehicle_type_compatibilities` DROP FOREIGN KEY `ivtc_vehicle_type_fk`;
ALTER TABLE `implement_vehicle_type_compatibilities`
  ADD CONSTRAINT `implement_vehicle_type_compatibilities_implementId_fkey` FOREIGN KEY (`implementId`) REFERENCES `agricultural_implements`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `implement_vehicle_type_compatibilities_vehicleTypeId_fkey` FOREIGN KEY (`vehicleTypeId`) REFERENCES `vehicle_types`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `agricultural_implements` RENAME INDEX `agricultural_implements_usage_mode_idx` TO `agricultural_implements_usageMode_idx`;
ALTER TABLE `dispatch_orders` RENAME INDEX `dispatch_orders_operation_domain_idx` TO `dispatch_orders_operationDomain_idx`;
ALTER TABLE `implement_vehicle_type_compatibilities` RENAME INDEX `ivtc_vehicle_type_idx` TO `implement_vehicle_type_compatibilities_vehicleTypeId_idx`;
ALTER TABLE `vehicle_types` RENAME INDEX `vehicle_types_domain_assignable_idx` TO `vehicle_types_operationalDomain_isAssignable_idx`;
