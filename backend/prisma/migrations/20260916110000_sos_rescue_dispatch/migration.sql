-- Extend the unified work-order categories with emergency rescue work.
ALTER TABLE `operational_work_orders`
  MODIFY `category` ENUM('AGRICULTURE', 'CONSTRUCTION', 'TRANSPORT', 'RESCUE') NOT NULL;

-- Rescue capability is explicit master data; names/categories are not used as business rules.
ALTER TABLE `vehicles`
  ADD COLUMN `isRescueCapable` BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX `vehicles_isRescueCapable_status_idx`
  ON `vehicles`(`isRescueCapable`, `status`);

UPDATE `vehicles`
SET `isRescueCapable` = true
WHERE `code` = 'XBT-FOR-08';

-- A SOS incident can own at most one formal rescue dispatch order.
ALTER TABLE `dispatch_orders`
  ADD COLUMN `sosAlertId` INTEGER NULL;

CREATE UNIQUE INDEX `dispatch_orders_sosAlertId_key`
  ON `dispatch_orders`(`sosAlertId`);

ALTER TABLE `dispatch_orders`
  ADD CONSTRAINT `dispatch_orders_sosAlertId_fkey`
  FOREIGN KEY (`sosAlertId`) REFERENCES `driver_sos_alerts`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;
