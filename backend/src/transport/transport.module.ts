import { Module } from '@nestjs/common';
import { DispatchOrdersModule } from '../dispatch-orders/dispatch-orders.module';
import { TransportController } from './transport.controller';
import { TransportService } from './transport.service';

@Module({
  imports: [DispatchOrdersModule],
  controllers: [TransportController],
  providers: [TransportService],
  exports: [TransportService],
})
export class TransportModule {}
