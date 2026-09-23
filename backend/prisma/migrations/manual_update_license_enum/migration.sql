-- Step 1: Expand enum to include BOTH old and new values temporarily
ALTER TABLE `users` MODIFY COLUMN `licenseClass` ENUM('HANG_A','HANG_B1','HANG_B2','HANG_C','HANG_CE','HANG_FC','HANG_D','HANG_D1','HANG_D2','BANG_MAY_NONG_NGHIEP') NULL DEFAULT 'BANG_MAY_NONG_NGHIEP';
ALTER TABLE `vehicle_types` MODIFY COLUMN `requiredLicenseClass` ENUM('HANG_A','HANG_B1','HANG_B2','HANG_C','HANG_CE','HANG_FC','HANG_D','HANG_D1','HANG_D2','BANG_MAY_NONG_NGHIEP') NULL;

-- Step 2: Migrate old data
UPDATE `users` SET `licenseClass` = 'HANG_CE' WHERE `licenseClass` = 'HANG_FC';
UPDATE `users` SET `licenseClass` = 'HANG_D1' WHERE `licenseClass` = 'HANG_D';
UPDATE `vehicle_types` SET `requiredLicenseClass` = 'HANG_CE' WHERE `requiredLicenseClass` = 'HANG_FC';
UPDATE `vehicle_types` SET `requiredLicenseClass` = 'HANG_D1' WHERE `requiredLicenseClass` = 'HANG_D';

-- Step 3: Finalize enum by removing old values
ALTER TABLE `users` MODIFY COLUMN `licenseClass` ENUM('HANG_A','HANG_B1','HANG_B2','HANG_C','HANG_CE','HANG_D1','HANG_D2','BANG_MAY_NONG_NGHIEP') NULL DEFAULT 'BANG_MAY_NONG_NGHIEP';
ALTER TABLE `vehicle_types` MODIFY COLUMN `requiredLicenseClass` ENUM('HANG_A','HANG_B1','HANG_B2','HANG_C','HANG_CE','HANG_D1','HANG_D2','BANG_MAY_NONG_NGHIEP') NULL;
