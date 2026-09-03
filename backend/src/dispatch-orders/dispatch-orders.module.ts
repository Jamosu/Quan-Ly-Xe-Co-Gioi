import { Module } from '@nestjs/common';
import { DispatchOrdersController } from './dispatch-orders.controller';
import { DispatchOrdersService } from './dispatch-orders.service';

@Module({
  controllers: [DispatchOrdersController],
  providers: [DispatchOrdersService],
  exports: [DispatchOrdersService],
})
export class DispatchOrdersModule {}
