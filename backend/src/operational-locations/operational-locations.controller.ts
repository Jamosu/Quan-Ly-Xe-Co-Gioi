import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { OperationalLocationType, Role, Unit } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { OperationalActor } from '../common/utils/operational-access';
import { CreateOperationalLocationDto, UpdateOperationalLocationDto } from './dto/operational-location.dto';
import { OperationalLocationsService } from './operational-locations.service';

@ApiTags('Operational Locations - Bãi và điểm tác nghiệp')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('operational-locations')
export class OperationalLocationsController {
  constructor(private readonly service: OperationalLocationsService) {}

  @Get()
  findAll(@Query('type') type: OperationalLocationType | undefined, @Query('unit') unit: Unit | undefined, @Query('complexCode') complexCode: string | undefined, @Query('enterpriseCode') enterpriseCode: string | undefined, @Query('farmCode') farmCode: string | undefined, @Query('search') search: string | undefined, @Query('active') active: string | undefined, @CurrentUser() actor: OperationalActor) {
    return this.service.findAll({ type, unit, complexCode, enterpriseCode, farmCode, search, active: active === undefined ? undefined : active === 'true' }, actor);
  }

  @Post()
  @Roles(Role.SUPER_ADMIN, Role.DISPATCHER, Role.FARM_MANAGER)
  create(@Body() dto: CreateOperationalLocationDto, @CurrentUser() actor: OperationalActor) { return this.service.create(dto, actor); }

  @Patch(':id')
  @Roles(Role.SUPER_ADMIN, Role.DISPATCHER, Role.FARM_MANAGER)
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateOperationalLocationDto, @CurrentUser() actor: OperationalActor) { return this.service.update(id, dto, actor); }

  @Delete(':id')
  @Roles(Role.SUPER_ADMIN)
  deactivate(@Param('id', ParseIntPipe) id: number) { return this.service.deactivate(id); }
}
