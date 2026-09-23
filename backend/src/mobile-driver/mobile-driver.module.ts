import { Module } from '@nestjs/common';
import { MobileDriverController } from './mobile-driver.controller';
import { MobileSyncController } from './mobile-sync.controller';
import { MobileDriverService } from './mobile-driver.service';
import { MobileSyncService } from './mobile-sync.service';
import { MaintenanceModule } from '../maintenance/maintenance.module';
import { AlertsModule } from '../alerts/alerts.module';
import { WorkshopModule } from '../workshop/workshop.module';
import { OperationalRealtimeModule } from '../operational-realtime/operational-realtime.module';
import { WorkOrdersModule } from '../work-orders/work-orders.module';

@Module({
  imports: [MaintenanceModule, AlertsModule, WorkshopModule, WorkOrdersModule, OperationalRealtimeModule],
  controllers: [MobileDriverController, MobileSyncController],
  providers: [MobileDriverService, MobileSyncService],
  exports: [MobileDriverService],
})
export class MobileDriverModule {}
