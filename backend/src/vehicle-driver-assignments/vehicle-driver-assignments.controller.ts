import { Body, Controller, Get, Param, ParseIntPipe, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { OperationalActor } from '../common/utils/operational-access';
import { CreateVehicleDriverAssignmentDto, EndVehicleDriverAssignmentDto } from './dto/create-vehicle-driver-assignment.dto';
import { VehicleDriverAssignmentsService } from './vehicle-driver-assignments.service';

@ApiTags('Vehicle Driver Assignments - Tài xế phụ trách xe')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('vehicle-driver-assignments')
export class VehicleDriverAssignmentsController {
  constructor(private readonly service: VehicleDriverAssignmentsService) {}

  @Get()
  findAll(@Query('vehicleId') vehicleId?: string, @Query('driverId') driverId?: string, @CurrentUser() actor?: OperationalActor) {
    return this.service.findAll(vehicleId ? Number(vehicleId) : undefined, driverId ? Number(driverId) : undefined, actor!);
  }

  @Post()
  @Roles(Role.SUPER_ADMIN, Role.DISPATCHER, Role.FARM_MANAGER)
  create(@Body() dto: CreateVehicleDriverAssignmentDto, @CurrentUser() actor: OperationalActor) { return this.service.create(dto, actor); }

  @Post(':id/end')
  @Roles(Role.SUPER_ADMIN, Role.DISPATCHER, Role.FARM_MANAGER)
  end(@Param('id', ParseIntPipe) id: number, @Body() dto: EndVehicleDriverAssignmentDto, @CurrentUser() actor: OperationalActor) { return this.service.end(id, dto, actor); }
}
