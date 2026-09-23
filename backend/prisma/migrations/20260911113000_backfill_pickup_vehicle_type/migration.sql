-- The legacy demo pickup is the only vehicle whose category had no matching master type.
INSERT INTO `vehicle_types` (
  `code`, `name`, `assetGroup`, `category`, `defaultMaintenanceHours`,
  `operationalDomain`, `implementRequirement`, `isAssignable`, `active`, `createdAt`, `updatedAt`
)
SELECT
  'XE_BAN_TAI', 'Xe bán tải', 'XE_VAN_TAI_CONG_VU', 'XE_BAN_TAI', 250,
  'TRANSPORT', 'NONE', true, true, NOW(3), NOW(3)
WHERE NOT EXISTS (SELECT 1 FROM `vehicle_types` WHERE `code` = 'XE_BAN_TAI');

UPDATE `vehicles` v
JOIN `vehicle_types` vt ON vt.`category` = v.`category`
SET v.`vehicleTypeId` = vt.`id`, v.`assetGroup` = COALESCE(v.`assetGroup`, vt.`assetGroup`)
WHERE v.`vehicleTypeId` IS NULL AND v.`category` = 'XE_BAN_TAI';
