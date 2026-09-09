import { Module } from '@nestjs/common';
import { AvailabilityController } from './availability.controller';
import { AvailabilityService } from './availability.service';
import { ResourceUnavailabilityController } from './resource-unavailability.controller';

@Module({
  controllers: [AvailabilityController, ResourceUnavailabilityController],
  providers: [AvailabilityService],
  exports: [AvailabilityService],
})
export class AvailabilityModule {}
