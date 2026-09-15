import { Module } from '@nestjs/common';
import { DispatchOrdersModule } from '../dispatch-orders/dispatch-orders.module';
import { TransportController } from './transport.controller';
import { TransportService } from './transport.service';
import { WorkOrdersModule } from '../work-orders/work-orders.module';
import { AlertsModule } from '../alerts/alerts.module';

@Module({
  imports: [DispatchOrdersModule, WorkOrdersModule, AlertsModule],
  controllers: [TransportController],
  providers: [TransportService],
  exports: [TransportService],
})
export class TransportModule {}
