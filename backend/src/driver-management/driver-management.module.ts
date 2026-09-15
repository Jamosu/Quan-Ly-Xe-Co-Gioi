import { Module } from '@nestjs/common';
import { DriverManagementController } from './driver-management.controller';
import { DriverManagementService } from './driver-management.service';

@Module({
  controllers: [DriverManagementController],
  providers: [DriverManagementService],
  exports: [DriverManagementService],
})
export class DriverManagementModule {}
