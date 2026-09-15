import { Module } from '@nestjs/common';
import { MaintenanceController } from './maintenance.controller';
import { MaintenanceService } from './maintenance.service';
import { AlertsModule } from '../alerts/alerts.module';
import { WorkshopModule } from '../workshop/workshop.module';

@Module({
  imports: [AlertsModule, WorkshopModule],
  controllers: [MaintenanceController],
  providers: [MaintenanceService],
  exports: [MaintenanceService],
})
export class MaintenanceModule {}
