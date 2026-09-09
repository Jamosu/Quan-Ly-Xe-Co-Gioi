import { Body, Controller, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { OperationalActor } from '../common/utils/operational-access';
import { AvailabilityService } from './availability.service';
import { CreateDriverUnavailabilityDto, CreateVehicleUnavailabilityDto } from './dto/unavailability.dto';

@ApiTags('Resource Unavailability - Nghỉ phép và khóa xe')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('availability')
export class ResourceUnavailabilityController {
  constructor(private readonly service: AvailabilityService) {}

  @Post('driver-unavailability')
  createDriver(@Body() dto: CreateDriverUnavailabilityDto, @CurrentUser() actor: OperationalActor) { return this.service.createDriverUnavailability(dto, actor); }

  @Post('driver-unavailability/:id/approve')
  @Roles(Role.SUPER_ADMIN, Role.DISPATCHER, Role.FARM_MANAGER)
  approveDriver(@Param('id', ParseIntPipe) id: number, @CurrentUser() actor: OperationalActor) { return this.service.approveDriverUnavailability(id, actor); }

  @Post('vehicle-unavailability')
  @Roles(Role.SUPER_ADMIN, Role.DISPATCHER, Role.FARM_MANAGER, Role.WORKSHOP_MANAGER)
  createVehicle(@Body() dto: CreateVehicleUnavailabilityDto, @CurrentUser() actor: OperationalActor) { return this.service.createVehicleUnavailability(dto, actor); }
}
