import { Module } from '@nestjs/common';
import { DispatchOrdersModule } from '../dispatch-orders/dispatch-orders.module';
import { TransportController } from './transport.controller';
import { TransportService } from './transport.service';
import { WorkOrdersModule } from '../work-orders/work-orders.module';

@Module({
  imports: [DispatchOrdersModule, WorkOrdersModule],
  controllers: [TransportController],
  providers: [TransportService],
  exports: [TransportService],
})
export class TransportModule {}
