import { Module } from '@nestjs/common';
import { MobileSyncController } from './mobile-sync.controller';
import { MobileSyncService } from './mobile-sync.service';

@Module({
  controllers: [MobileSyncController],
  providers: [MobileSyncService],
  exports: [MobileSyncService],
})
export class MobileSyncModule {}
