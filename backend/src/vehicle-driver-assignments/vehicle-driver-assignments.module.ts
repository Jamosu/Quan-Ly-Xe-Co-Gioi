import { Module } from '@nestjs/common';
import { VehicleDriverAssignmentsController } from './vehicle-driver-assignments.controller';
import { VehicleDriverAssignmentsService } from './vehicle-driver-assignments.service';

@Module({ controllers: [VehicleDriverAssignmentsController], providers: [VehicleDriverAssignmentsService], exports: [VehicleDriverAssignmentsService] })
export class VehicleDriverAssignmentsModule {}
