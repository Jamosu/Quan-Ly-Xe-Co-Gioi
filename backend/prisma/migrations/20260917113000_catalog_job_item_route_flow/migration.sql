-- Route behavior belongs to transport JOB_ITEM, not to an individual order.
ALTER TABLE `catalogs`
  ADD COLUMN `routeFlowType` ENUM('ONE_WAY', 'TWO_WAY') NULL;
