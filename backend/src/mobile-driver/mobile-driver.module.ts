import { Module } from '@nestjs/common';
import { MobileDriverController } from './mobile-driver.controller';
import { MobileSyncController } from './mobile-sync.controller';
import { MobileDriverService } from './mobile-driver.service';
import { MaintenanceModule } from '../maintenance/maintenance.module';
import { AlertsModule } from '../alerts/alerts.module';
import { WorkshopModule } from '../workshop/workshop.module';

@Module({
  imports: [MaintenanceModule, AlertsModule, WorkshopModule],
  controllers: [MobileDriverController, MobileSyncController],
  providers: [MobileDriverService],
  exports: [MobileDriverService],
})
export class MobileDriverModule {}
