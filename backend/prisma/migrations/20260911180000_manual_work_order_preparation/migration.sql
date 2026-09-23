-- Shared preparation data for both plan-generated and manually-created work orders.
ALTER TABLE `operational_locations`
  ADD COLUMN `enterpriseCode` VARCHAR(191) NULL,
  ADD COLUMN `farmCode` VARCHAR(191) NULL;

CREATE INDEX `operational_locations_enterpriseCode_idx` ON `operational_locations`(`enterpriseCode`);
CREATE INDEX `operational_locations_farmCode_idx` ON `operational_locations`(`farmCode`);

ALTER TABLE `operational_work_orders`
  ADD COLUMN `category` ENUM('AGRICULTURE', 'CONSTRUCTION', 'TRANSPORT') NOT NULL DEFAULT 'AGRICULTURE',
  ADD COLUMN `sourceType` ENUM('MANUAL', 'MANUAL_EXCEPTION', 'PRODUCTION_ORDER', 'IMPORT') NOT NULL DEFAULT 'MANUAL',
  ADD COLUMN `complexCode` VARCHAR(191) NULL,
  ADD COLUMN `complexName` VARCHAR(191) NULL,
  ADD COLUMN `enterpriseCode` VARCHAR(191) NULL,
  ADD COLUMN `enterpriseName` VARCHAR(191) NULL,
  ADD COLUMN `farmCode` VARCHAR(191) NULL,
  ADD COLUMN `farmName` VARCHAR(191) NULL,
  ADD COLUMN `workLocationId` INTEGER NULL,
  ADD COLUMN `workLocationText` VARCHAR(191) NULL,
  ADD COLUMN `workLocationNotes` TEXT NULL,
  ADD COLUMN `workLat` DOUBLE NULL,
  ADD COLUMN `workLng` DOUBLE NULL,
  ADD COLUMN `jobCode` VARCHAR(191) NULL,
  ADD COLUMN `jobName` VARCHAR(191) NULL,
  ADD COLUMN `jobDescription` TEXT NULL,
  ADD COLUMN `shift` VARCHAR(191) NOT NULL DEFAULT 'CA_NGAY',
  ADD COLUMN `priority` ENUM('NORMAL', 'HIGH', 'URGENT') NOT NULL DEFAULT 'NORMAL',
  ADD COLUMN `targetQuantity` DOUBLE NOT NULL DEFAULT 0,
  ADD COLUMN `targetUnit` VARCHAR(191) NULL,
  ADD COLUMN `requestedVehicleTypeId` INTEGER NULL,
  ADD COLUMN `requestedVehicleCount` INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN `categoryDetails` JSON NULL,
  ADD COLUMN `notes` TEXT NULL;

UPDATE `operational_work_orders` owo
LEFT JOIN `dispatch_orders` d ON d.id = owo.dispatchOrderId
LEFT JOIN `transport_orders` t ON t.id = owo.transportOrderId
LEFT JOIN `production_orders` po ON po.id = COALESCE(d.productionOrderId, t.productionOrderId)
LEFT JOIN `production_plans` p ON p.id = po.planId
LEFT JOIN `production_plan_items` pi ON pi.id = po.planItemId
SET
  owo.category = CASE
    WHEN owo.type = 'TRANSPORT' THEN 'TRANSPORT'
    WHEN d.operationDomain = 'CONSTRUCTION' THEN 'CONSTRUCTION'
    ELSE 'AGRICULTURE'
  END,
  owo.sourceType = COALESCE(d.sourceType, t.sourceType, 'MANUAL'),
  owo.complexCode = p.complexCode,
  owo.complexName = p.complexName,
  owo.enterpriseCode = p.enterpriseCode,
  owo.enterpriseName = p.enterpriseName,
  owo.farmCode = p.farmCode,
  owo.farmName = p.farmName,
  owo.jobCode = pi.jobCode,
  owo.jobName = COALESCE(d.purpose, t.cargoType, po.title, 'Công việc điều xe'),
  owo.workLocationId = COALESCE(d.destinationLocationId, t.destinationLocationId),
  owo.workLocationText = COALESCE(d.destination, t.destination, po.location),
  owo.targetQuantity = COALESCE(pi.targetQuantity, t.tonnage, 0),
  owo.targetUnit = COALESCE(pi.targetUnit, CASE WHEN t.id IS NOT NULL THEN 'Tấn' ELSE NULL END),
  owo.requestedVehicleTypeId = pi.vehicleTypeId,
  owo.requestedVehicleCount = COALESCE(pi.plannedVehicleCount, 1),
  owo.shift = COALESCE(pi.shift, 'CA_NGAY'),
  owo.notes = COALESCE(d.notes, t.notes, po.notes);

ALTER TABLE `operational_work_orders`
  MODIFY `jobName` VARCHAR(191) NOT NULL,
  MODIFY `category` ENUM('AGRICULTURE', 'CONSTRUCTION', 'TRANSPORT') NOT NULL;

-- Approved plans created legacy child orders before OperationalWorkOrder became
-- the shared workflow aggregate. Backfill only plan-generated orders and keep
-- their original business identifiers/statuses.
INSERT INTO `operational_work_orders` (
  `type`, `unit`, `category`, `sourceType`, `assignmentMode`, `status`,
  `plannedStartAt`, `plannedEndAt`, `complexCode`, `complexName`,
  `enterpriseCode`, `enterpriseName`, `farmCode`, `farmName`, `workLocationId`,
  `workLocationText`, `jobCode`, `jobName`, `jobDescription`, `shift`,
  `targetQuantity`, `targetUnit`, `requestedVehicleTypeId`, `requestedVehicleCount`,
  `notes`, `version`, `dispatchOrderId`, `createdById`, `createdAt`, `updatedAt`
)
SELECT
  'DISPATCH', d.unit,
  CASE WHEN d.operationDomain = 'CONSTRUCTION' THEN 'CONSTRUCTION' ELSE 'AGRICULTURE' END,
  d.sourceType, 'FIXED_ASSIGNMENT',
  CASE
    WHEN d.status = 'DRAFT' THEN 'DRAFT'
    WHEN d.status = 'PENDING_APPROVAL' THEN 'PENDING_APPROVAL'
    WHEN d.status = 'APPROVED' THEN 'APPROVED'
    WHEN d.status = 'ASSIGNED' THEN 'ASSIGNED'
    WHEN d.status = 'DRIVER_ACCEPTED' THEN 'DRIVER_ACCEPTED'
    WHEN d.status IN ('DEPARTED', 'AT_WORKSITE', 'WORKING', 'RETURNING_TO_DEPOT') THEN 'IN_PROGRESS'
    WHEN d.status = 'COMPLETED' THEN 'SUBMITTED_FOR_ACCEPTANCE'
    WHEN d.status = 'ACCEPTED' THEN 'ACCEPTED'
    WHEN d.status = 'CLOSED' THEN 'CLOSED'
    WHEN d.status = 'REJECTED' THEN 'REJECTED'
    ELSE 'CANCELLED'
  END,
  d.departureTime, d.plannedEndTime, p.complexCode, p.complexName,
  p.enterpriseCode, p.enterpriseName, p.farmCode, p.farmName,
  d.destinationLocationId, d.destination, pi.jobCode, d.purpose, pi.notes,
  COALESCE(pi.shift, 'CA_NGAY'), COALESCE(pi.targetQuantity, 0), pi.targetUnit,
  pi.vehicleTypeId, 1, d.notes, 1, d.id, d.requesterId, d.createdAt, d.updatedAt
FROM `dispatch_orders` d
JOIN `production_orders` po ON po.id = d.productionOrderId
JOIN `production_plans` p ON p.id = po.planId
LEFT JOIN `production_plan_items` pi ON pi.id = po.planItemId
LEFT JOIN `operational_work_orders` owo ON owo.dispatchOrderId = d.id
WHERE owo.id IS NULL AND d.departureTime IS NOT NULL AND d.plannedEndTime IS NOT NULL;

INSERT INTO `operational_work_orders` (
  `type`, `unit`, `category`, `sourceType`, `assignmentMode`, `status`,
  `plannedStartAt`, `plannedEndAt`, `complexCode`, `complexName`,
  `enterpriseCode`, `enterpriseName`, `farmCode`, `farmName`, `workLocationId`,
  `workLocationText`, `jobCode`, `jobName`, `jobDescription`, `shift`,
  `targetQuantity`, `targetUnit`, `requestedVehicleTypeId`, `requestedVehicleCount`,
  `notes`, `version`, `transportOrderId`, `createdById`, `createdAt`, `updatedAt`
)
SELECT
  'TRANSPORT', t.unit, 'TRANSPORT', t.sourceType, 'FIXED_ASSIGNMENT',
  CASE
    WHEN t.status = 'DRAFT' THEN 'DRAFT'
    WHEN t.status = 'PENDING_APPROVAL' THEN 'PENDING_APPROVAL'
    WHEN t.status = 'APPROVED' THEN 'APPROVED'
    WHEN t.status = 'ASSIGNED' THEN 'ASSIGNED'
    WHEN t.status = 'DRIVER_ACCEPTED' THEN 'DRIVER_ACCEPTED'
    WHEN t.status IN ('AT_PICKUP', 'LOADING', 'DEPARTED', 'IN_TRANSIT', 'AT_DELIVERY', 'UNLOADING', 'RETURNING_TO_DEPOT', 'AT_DEPOT') THEN 'IN_PROGRESS'
    WHEN t.status = 'DELIVERED' THEN 'SUBMITTED_FOR_ACCEPTANCE'
    WHEN t.status = 'ACCEPTED' THEN 'ACCEPTED'
    WHEN t.status = 'COMPLETED' THEN 'CLOSED'
    ELSE 'CANCELLED'
  END,
  t.departureTime, t.plannedEndTime, p.complexCode, p.complexName,
  p.enterpriseCode, p.enterpriseName, p.farmCode, p.farmName,
  t.destinationLocationId, t.destination, pi.jobCode, COALESCE(t.cargoType, po.title), pi.notes,
  COALESCE(pi.shift, 'CA_NGAY'), COALESCE(pi.targetQuantity, t.tonnage, 0),
  COALESCE(pi.targetUnit, 'Tấn'), pi.vehicleTypeId, 1, t.notes, 1, t.id,
  COALESCE(po.createdById, p.createdById, p.approvedById), t.createdAt, t.updatedAt
FROM `transport_orders` t
JOIN `production_orders` po ON po.id = t.productionOrderId
JOIN `production_plans` p ON p.id = po.planId
LEFT JOIN `production_plan_items` pi ON pi.id = po.planItemId
LEFT JOIN `operational_work_orders` owo ON owo.transportOrderId = t.id
WHERE owo.id IS NULL
  AND t.departureTime IS NOT NULL AND t.plannedEndTime IS NOT NULL
  AND COALESCE(po.createdById, p.createdById, p.approvedById) IS NOT NULL;

CREATE INDEX `operational_work_orders_category_sourceType_idx` ON `operational_work_orders`(`category`, `sourceType`);
CREATE INDEX `operational_work_orders_complexCode_enterpriseCode_farmCode_idx` ON `operational_work_orders`(`complexCode`, `enterpriseCode`, `farmCode`);
CREATE INDEX `operational_work_orders_workLocationId_idx` ON `operational_work_orders`(`workLocationId`);
CREATE INDEX `operational_work_orders_requestedVehicleTypeId_idx` ON `operational_work_orders`(`requestedVehicleTypeId`);

ALTER TABLE `operational_work_orders`
  ADD CONSTRAINT `operational_work_orders_workLocationId_fkey`
    FOREIGN KEY (`workLocationId`) REFERENCES `operational_locations`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `operational_work_orders_requestedVehicleTypeId_fkey`
    FOREIGN KEY (`requestedVehicleTypeId`) REFERENCES `vehicle_types`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
