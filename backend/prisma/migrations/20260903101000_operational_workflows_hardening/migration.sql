-- Phase 2: remove legacy enum members and add relational guarantees/indexes.

-- Preflight guards: each INSERT must keep this NOT NULL table empty. Any legacy
-- workflow value or orphan aborts the migration before final constraints run.
CREATE TEMPORARY TABLE `_operational_migration_guard` (`ok` TINYINT NOT NULL);
INSERT INTO `_operational_migration_guard` (`ok`) SELECT NULL FROM DUAL
WHERE EXISTS (SELECT 1 FROM `production_plans` WHERE `status` IN ('PENDING','PAUSED'));
INSERT INTO `_operational_migration_guard` (`ok`) SELECT NULL FROM DUAL
WHERE EXISTS (SELECT 1 FROM `dispatch_orders` WHERE `status` IN ('PENDING','RUNNING'));
INSERT INTO `_operational_migration_guard` (`ok`) SELECT NULL FROM DUAL
WHERE EXISTS (SELECT 1 FROM `transport_orders` WHERE `status` IN ('PENDING','DEVIATED') OR `routeType`='ROUND_TRIP');
INSERT INTO `_operational_migration_guard` (`ok`) SELECT NULL FROM DUAL
WHERE EXISTS (SELECT 1 FROM `production_plan_items` i LEFT JOIN `production_plans` p ON p.`id`=i.`planId` WHERE p.`id` IS NULL);
INSERT INTO `_operational_migration_guard` (`ok`) SELECT NULL FROM DUAL
WHERE EXISTS (SELECT 1 FROM `transport_items` i LEFT JOIN `transport_orders` o ON o.`id`=i.`transportOrderId` WHERE o.`id` IS NULL);
INSERT INTO `_operational_migration_guard` (`ok`) SELECT NULL FROM DUAL
WHERE EXISTS (SELECT 1 FROM `operation_confirmations` WHERE ((`dispatchOrderId` IS NOT NULL) + (`transportOrderId` IS NOT NULL)) <> 1);
DROP TEMPORARY TABLE `_operational_migration_guard`;

ALTER TABLE `production_plans`
  MODIFY `status` ENUM('DRAFT','PENDING_APPROVAL','APPROVED','IN_PROGRESS','COMPLETED','REJECTED','ADJUSTED','CANCELLED') NOT NULL DEFAULT 'DRAFT';
ALTER TABLE `dispatch_orders`
  MODIFY `status` ENUM('DRAFT','PENDING_APPROVAL','APPROVED','ASSIGNED','DRIVER_ACCEPTED','DEPARTED','WORKING','COMPLETED','ACCEPTED','CLOSED','REJECTED','CANCELLED') NOT NULL DEFAULT 'DRAFT';
ALTER TABLE `transport_orders`
  MODIFY `routeType` ENUM('ONE_WAY','TWO_WAY') NOT NULL DEFAULT 'ONE_WAY',
  MODIFY `status` ENUM('DRAFT','PENDING_APPROVAL','APPROVED','ASSIGNED','DRIVER_ACCEPTED','AT_PICKUP','LOADING','DEPARTED','IN_TRANSIT','AT_DELIVERY','UNLOADING','DELIVERED','ACCEPTED','COMPLETED') NOT NULL DEFAULT 'DRAFT';

CREATE INDEX `production_plans_complexCode_idx` ON `production_plans`(`complexCode`);
CREATE INDEX `production_plans_weekStart_idx` ON `production_plans`(`weekStart`);
CREATE INDEX `production_plan_items_planId_workDate_idx` ON `production_plan_items`(`planId`,`workDate`);
CREATE INDEX `production_plan_items_vehicleTypeId_idx` ON `production_plan_items`(`vehicleTypeId`);
CREATE INDEX `production_orders_planId_idx` ON `production_orders`(`planId`);
CREATE INDEX `production_orders_planItemId_idx` ON `production_orders`(`planItemId`);
CREATE INDEX `production_orders_unit_idx` ON `production_orders`(`unit`);
CREATE INDEX `dispatch_orders_productionOrderId_idx` ON `dispatch_orders`(`productionOrderId`);
CREATE INDEX `dispatch_orders_implementId_idx` ON `dispatch_orders`(`implementId`);
CREATE INDEX `dispatch_orders_departureTime_plannedEndTime_idx` ON `dispatch_orders`(`departureTime`,`plannedEndTime`);
CREATE INDEX `transport_orders_unit_idx` ON `transport_orders`(`unit`);
CREATE INDEX `transport_orders_executionDate_idx` ON `transport_orders`(`executionDate`);
CREATE INDEX `transport_orders_departureTime_plannedEndTime_idx` ON `transport_orders`(`departureTime`,`plannedEndTime`);
CREATE INDEX `transport_items_transportOrderId_idx` ON `transport_items`(`transportOrderId`);
CREATE INDEX `transport_items_materialCode_idx` ON `transport_items`(`materialCode`);
CREATE INDEX `operational_audit_logs_entityType_entityId_idx` ON `operational_audit_logs`(`entityType`,`entityId`);
CREATE INDEX `operational_audit_logs_actorId_createdAt_idx` ON `operational_audit_logs`(`actorId`,`createdAt`);
CREATE INDEX `operation_confirmations_dispatchOrderId_idx` ON `operation_confirmations`(`dispatchOrderId`);
CREATE INDEX `operation_confirmations_transportOrderId_idx` ON `operation_confirmations`(`transportOrderId`);
CREATE INDEX `operation_confirmations_status_idx` ON `operation_confirmations`(`status`);
CREATE INDEX `transport_import_batches_importedById_createdAt_idx` ON `transport_import_batches`(`importedById`,`createdAt`);

ALTER TABLE `production_plans`
  ADD CONSTRAINT `production_plans_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `production_plans_approvedById_fkey` FOREIGN KEY (`approvedById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `production_plan_items`
  ADD CONSTRAINT `production_plan_items_planId_fkey` FOREIGN KEY (`planId`) REFERENCES `production_plans`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `production_plan_items_vehicleTypeId_fkey` FOREIGN KEY (`vehicleTypeId`) REFERENCES `vehicle_types`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `production_orders`
  ADD CONSTRAINT `production_orders_planId_fkey` FOREIGN KEY (`planId`) REFERENCES `production_plans`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `production_orders_planItemId_fkey` FOREIGN KEY (`planItemId`) REFERENCES `production_plan_items`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `production_orders_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `dispatch_orders`
  ADD CONSTRAINT `dispatch_orders_productionOrderId_fkey` FOREIGN KEY (`productionOrderId`) REFERENCES `production_orders`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `dispatch_orders_implementId_fkey` FOREIGN KEY (`implementId`) REFERENCES `agricultural_implements`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `dispatch_orders_approvedById_fkey` FOREIGN KEY (`approvedById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `dispatch_orders_assignedById_fkey` FOREIGN KEY (`assignedById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `dispatch_orders_acceptedById_fkey` FOREIGN KEY (`acceptedById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `transport_orders`
  ADD CONSTRAINT `transport_orders_trailerId_fkey` FOREIGN KEY (`trailerId`) REFERENCES `agricultural_implements`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `transport_orders_approvedById_fkey` FOREIGN KEY (`approvedById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `transport_items`
  ADD CONSTRAINT `transport_items_transportOrderId_fkey` FOREIGN KEY (`transportOrderId`) REFERENCES `transport_orders`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `operational_audit_logs`
  ADD CONSTRAINT `operational_audit_logs_actorId_fkey` FOREIGN KEY (`actorId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `operation_confirmations`
  ADD CONSTRAINT `operation_confirmations_dispatchOrderId_fkey` FOREIGN KEY (`dispatchOrderId`) REFERENCES `dispatch_orders`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `operation_confirmations_transportOrderId_fkey` FOREIGN KEY (`transportOrderId`) REFERENCES `transport_orders`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `operation_confirmations_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `operation_confirmations_confirmedById_fkey` FOREIGN KEY (`confirmedById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
-- MySQL 8 rejects CHECK constraints that reference FK columns. The same exact-one
-- invariant is validated by CreateConfirmationDto/OperationConfirmationsService,
-- while RESTRICT prevents either linked business order from being hard-deleted.
ALTER TABLE `transport_import_batches`
  ADD CONSTRAINT `transport_import_batches_importedById_fkey` FOREIGN KEY (`importedById`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
