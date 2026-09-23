-- Speed up server-side damaged asset candidate filters.
CREATE INDEX `vehicles_conditionStatus_idx` ON `vehicles`(`conditionStatus`);
CREATE INDEX `agricultural_implements_technicalCondition_idx` ON `agricultural_implements`(`technicalCondition`);
