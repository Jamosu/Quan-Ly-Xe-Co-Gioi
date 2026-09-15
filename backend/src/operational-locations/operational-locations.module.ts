import { Module } from '@nestjs/common';
import { OperationalLocationsController } from './operational-locations.controller';
import { OperationalLocationsService } from './operational-locations.service';

@Module({
  controllers: [OperationalLocationsController],
  providers: [OperationalLocationsService],
  exports: [OperationalLocationsService],
})
export class OperationalLocationsModule {}
