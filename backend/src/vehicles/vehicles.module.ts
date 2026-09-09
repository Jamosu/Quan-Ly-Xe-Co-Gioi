import { Module } from '@nestjs/common';
import { VehiclesController } from './vehicles.controller';
import { VehiclesService } from './vehicles.service';
import { VehicleTypesController } from './vehicle-types.controller';
import { VehicleTypesService } from './vehicle-types.service';
import { AvailabilityModule } from '../availability/availability.module';

@Module({
  imports: [AvailabilityModule],
  controllers: [VehiclesController, VehicleTypesController],
  providers: [VehiclesService, VehicleTypesService],
  exports: [VehiclesService, VehicleTypesService],
})
export class VehiclesModule {}
