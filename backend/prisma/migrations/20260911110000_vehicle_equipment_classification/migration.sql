-- Vehicle/equipment classification used by dispatch and attachment validation.
ALTER TABLE `vehicle_types`
  ADD COLUMN `operationalDomain` ENUM('AGRICULTURE', 'CONSTRUCTION', 'TRANSPORT', 'SUPPORT', 'EQUIPMENT') NULL,
  ADD COLUMN `implementRequirement` ENUM('NONE', 'OPTIONAL', 'REQUIRED') NOT NULL DEFAULT 'NONE',
  ADD COLUMN `isAssignable` BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE `agricultural_implements`
  ADD COLUMN `usageMode` ENUM('ATTACHABLE', 'STANDALONE', 'UNCLASSIFIED') NOT NULL DEFAULT 'UNCLASSIFIED',
  ADD COLUMN `sourceGroup` VARCHAR(191) NULL;

ALTER TABLE `dispatch_orders`
  ADD COLUMN `operationDomain` ENUM('AGRICULTURE', 'CONSTRUCTION', 'TRANSPORT', 'SUPPORT', 'EQUIPMENT') NULL;

CREATE TABLE `implement_vehicle_type_compatibilities` (
  `implementId` INTEGER NOT NULL,
  `vehicleTypeId` INTEGER NOT NULL,
  `source` VARCHAR(191) NULL DEFAULT 'WORKBOOK',
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`implementId`, `vehicleTypeId`),
  INDEX `ivtc_vehicle_type_idx` (`vehicleTypeId`),
  CONSTRAINT `ivtc_implement_fk` FOREIGN KEY (`implementId`) REFERENCES `agricultural_implements` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ivtc_vehicle_type_fk` FOREIGN KEY (`vehicleTypeId`) REFERENCES `vehicle_types` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE INDEX `vehicle_types_domain_assignable_idx` ON `vehicle_types` (`operationalDomain`, `isAssignable`);
CREATE INDEX `agricultural_implements_usage_mode_idx` ON `agricultural_implements` (`usageMode`);
CREATE INDEX `dispatch_orders_operation_domain_idx` ON `dispatch_orders` (`operationDomain`);

UPDATE `vehicle_types`
SET
  `operationalDomain` = CASE
    WHEN `category` IN ('MAY_DAO', 'MAY_UI', 'MAY_SAN', 'MAY_LU', 'MAY_XUC_LAT', 'XE_XUC') THEN 'CONSTRUCTION'
    WHEN `category` IN ('MAY_CAY', 'MAY_KEO', 'MAY_GAT_DAP') THEN 'AGRICULTURE'
    WHEN `category` IN ('XE_TAI', 'XE_BEN', 'XE_BON', 'XE_CONTAINER', 'XE_BAN_TAI', 'XE_CHUYEN_DUNG', 'XE_CONG_VU', 'XE_CHO_NGUOI') THEN 'TRANSPORT'
    WHEN `category` = 'THIET_BI_NONG_CU' THEN 'EQUIPMENT'
    ELSE 'SUPPORT'
  END,
  `implementRequirement` = CASE
    WHEN `category` IN ('MAY_KEO', 'XE_CONTAINER') THEN 'REQUIRED'
    WHEN `category` IN ('MAY_CAY', 'MAY_DAO', 'MAY_UI', 'MAY_SAN', 'MAY_XUC_LAT', 'XE_XUC') THEN 'OPTIONAL'
    ELSE 'NONE'
  END,
  `isAssignable` = CASE WHEN `assetGroup` = 'THIET_BI_PHU_TRO' THEN false ELSE true END;

-- Backfill the seven legacy/demo vehicles that only had a category.
UPDATE `vehicles` v
JOIN `vehicle_types` vt ON vt.`category` = v.`category`
SET v.`vehicleTypeId` = vt.`id`, v.`assetGroup` = COALESCE(v.`assetGroup`, vt.`assetGroup`)
WHERE v.`vehicleTypeId` IS NULL;

-- A dispatch generated from a production plan inherits the plan domain.
UPDATE `dispatch_orders` d
JOIN `production_orders` po ON po.`id` = d.`productionOrderId`
JOIN `production_plans` pp ON pp.`id` = po.`planId`
SET d.`operationDomain` = CASE
  WHEN pp.`planType` = 'CONSTRUCTION' THEN 'CONSTRUCTION'
  WHEN pp.`planType` = 'INTERNAL_TRANSPORT' THEN 'TRANSPORT'
  ELSE 'AGRICULTURE'
END
WHERE d.`operationDomain` IS NULL;

-- Only high-confidence physical attachments are enabled automatically.
UPDATE `agricultural_implements`
SET `usageMode` = CASE
  WHEN `code` LIKE 'CHT-CNA-%' OR `code` LIKE 'CHT-BDU-%' OR `code` LIKE 'CHT-GĐH-%' OR `code` LIKE 'CHT-ĐTL-%' THEN 'ATTACHABLE'
  WHEN `name` LIKE '%gắn sau%' OR `name` LIKE 'Dàn %' OR `name` LIKE 'Giàn %' OR `name` LIKE 'Thiết bị %' OR `name` LIKE 'Rơ mooc%' OR `name` LIKE 'Rơ-moóc%' OR `name` LIKE 'SMRM%' OR `name` LIKE 'Gầu %' OR `name` LIKE 'Búa %' OR `name` LIKE 'Đầm %' OR `name` LIKE 'Bộ bánh%' THEN 'ATTACHABLE'
  WHEN `name` LIKE 'Máy kéo chuối%' OR `name` LIKE 'Máy cao áp%' OR `name` LIKE 'Máy nổ%' OR `name` LIKE 'Máy băm% cố định%' OR `name` LIKE 'Cối trộn%' OR `name` LIKE 'Súng phun%' OR `name` LIKE 'Máy tời%' THEN 'STANDALONE'
  ELSE 'UNCLASSIFIED'
END,
`sourceGroup` = CASE
  WHEN `standardPurpose` LIKE '%Nhóm:%' THEN TRIM(SUBSTRING_INDEX(SUBSTRING_INDEX(SUBSTRING_INDEX(`standardPurpose`, 'Nhóm:', -1), ' · ', 1), '|', 1))
  ELSE NULL
END;

-- Agriculture attachments: exclude construction and semi-trailer code families.
INSERT IGNORE INTO `implement_vehicle_type_compatibilities` (`implementId`, `vehicleTypeId`, `source`)
SELECT ai.`id`, vt.`id`, 'WORKBOOK_RULE'
FROM `agricultural_implements` ai
JOIN `vehicle_types` vt ON vt.`category` IN ('MAY_KEO', 'MAY_CAY')
WHERE ai.`usageMode` = 'ATTACHABLE'
  AND ai.`code` NOT LIKE 'CHT-%'
  AND ai.`code` NOT LIKE 'TND-%';

INSERT IGNORE INTO `implement_vehicle_type_compatibilities` (`implementId`, `vehicleTypeId`, `source`)
SELECT ai.`id`, vt.`id`, 'WORKBOOK_RULE'
FROM `agricultural_implements` ai
JOIN `vehicle_types` vt ON vt.`category` = 'MAY_UI'
WHERE ai.`code` LIKE 'CHT-CNA-%';

INSERT IGNORE INTO `implement_vehicle_type_compatibilities` (`implementId`, `vehicleTypeId`, `source`)
SELECT ai.`id`, vt.`id`, 'WORKBOOK_RULE'
FROM `agricultural_implements` ai
JOIN `vehicle_types` vt ON vt.`category` = 'MAY_DAO'
WHERE ai.`code` LIKE 'CHT-BDU-%' OR ai.`code` LIKE 'CHT-GĐH-%' OR ai.`code` LIKE 'CHT-ĐTL-%';

INSERT IGNORE INTO `implement_vehicle_type_compatibilities` (`implementId`, `vehicleTypeId`, `source`)
SELECT ai.`id`, vt.`id`, 'WORKBOOK_RULE'
FROM `agricultural_implements` ai
JOIN `vehicle_types` vt ON vt.`category` = 'XE_CONTAINER'
WHERE ai.`usageMode` = 'ATTACHABLE' AND (ai.`code` LIKE 'TND-%' OR ai.`name` LIKE 'SMRM%');

-- Remove the 40 generated links with no attachment audit record, preserving every equipment record.
UPDATE `agricultural_implements` ai
LEFT JOIN `implement_attachment_logs` al ON al.`implementId` = ai.`id`
SET ai.`status` = 'IN_DEPOT', ai.`currentVehicleId` = NULL, ai.`attachedAt` = NULL
WHERE ai.`status` = 'ATTACHED' AND ai.`currentVehicleId` IS NOT NULL AND al.`id` IS NULL;
