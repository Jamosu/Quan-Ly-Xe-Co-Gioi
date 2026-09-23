-- Additive foundation for a single offline-first mobile API.
-- IF NOT EXISTS keeps this safe when the former Backend_Driver migration has
-- already created these shared tables in the same MySQL database.
CREATE TABLE IF NOT EXISTS `mobile_sessions` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `driverId` INTEGER NOT NULL,
  `deviceId` VARCHAR(191) NOT NULL,
  `refreshTokenHash` VARCHAR(191) NOT NULL,
  `expiresAt` DATETIME(3) NOT NULL,
  `revokedAt` DATETIME(3) NULL,
  `lastUsedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `mobile_sessions_refreshTokenHash_key`(`refreshTokenHash`),
  INDEX `mobile_sessions_driverId_deviceId_idx`(`driverId`, `deviceId`),
  INDEX `mobile_sessions_expiresAt_idx`(`expiresAt`),
  PRIMARY KEY (`id`),
  CONSTRAINT `mobile_sessions_driverId_fkey`
    FOREIGN KEY (`driverId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `mobile_sync_events` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `eventId` VARCHAR(36) NOT NULL,
  `deviceId` VARCHAR(191) NOT NULL,
  `driverId` INTEGER NOT NULL,
  `orderType` VARCHAR(191) NULL,
  `orderId` INTEGER NULL,
  `eventType` VARCHAR(191) NOT NULL,
  `sequenceNumber` INTEGER NOT NULL,
  `occurredAt` DATETIME(3) NOT NULL,
  `baseVersion` INTEGER NULL,
  `payload` JSON NOT NULL,
  `result` JSON NULL,
  `status` ENUM('PROCESSED', 'CONFLICT') NOT NULL DEFAULT 'PROCESSED',
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `mobile_sync_events_eventId_key`(`eventId`),
  INDEX `mobile_sync_events_driverId_occurredAt_idx`(`driverId`, `occurredAt`),
  INDEX `mobile_sync_events_deviceId_sequenceNumber_idx`(`deviceId`, `sequenceNumber`),
  INDEX `mobile_sync_events_orderType_orderId_idx`(`orderType`, `orderId`),
  PRIMARY KEY (`id`),
  CONSTRAINT `mobile_sync_events_driverId_fkey`
    FOREIGN KEY (`driverId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
