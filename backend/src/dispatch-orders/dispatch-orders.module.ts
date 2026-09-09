import { Module } from '@nestjs/common';
import { DispatchOrdersController } from './dispatch-orders.controller';
import { DispatchOrdersService } from './dispatch-orders.service';
import { WorkOrdersModule } from '../work-orders/work-orders.module';

@Module({
  imports: [WorkOrdersModule],
  controllers: [DispatchOrdersController],
  providers: [DispatchOrdersService],
  exports: [DispatchOrdersService],
})
export class DispatchOrdersModule {}
