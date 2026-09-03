import { Module } from '@nestjs/common';
import { DriverKpiController } from './driver-kpi.controller';
import { DriverKpiService } from './driver-kpi.service';

@Module({
  controllers: [DriverKpiController],
  providers: [DriverKpiService],
  exports: [DriverKpiService],
})
export class DriverKpiModule {}
