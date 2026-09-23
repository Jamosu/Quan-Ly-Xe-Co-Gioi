import { Module } from '@nestjs/common';
import { OperationalRealtimeController } from './operational-realtime.controller';
import { OperationalRealtimeService } from './operational-realtime.service';

@Module({
  controllers: [OperationalRealtimeController],
  providers: [OperationalRealtimeService],
  exports: [OperationalRealtimeService],
})
export class OperationalRealtimeModule {}
