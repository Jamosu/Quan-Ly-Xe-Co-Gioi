-- Add the reusable return-leg profile to catalog ROUTE records.
ALTER TABLE `catalogs`
  ADD COLUMN `returnOrigin` VARCHAR(191) NULL,
  ADD COLUMN `returnDestination` VARCHAR(191) NULL,
  ADD COLUMN `returnCargoName` VARCHAR(191) NULL,
  ADD COLUMN `returnTonnage` DOUBLE NULL;
