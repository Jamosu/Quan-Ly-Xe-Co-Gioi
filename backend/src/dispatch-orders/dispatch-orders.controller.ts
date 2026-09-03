import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { TransitionDto } from '../common/dto/transition.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { OperationalActor } from '../common/utils/operational-access';
import { DispatchOrdersService } from './dispatch-orders.service';
import { AssignDispatchDto } from './dto/assign-dispatch.dto';
import { AvailableResourcesDto } from './dto/available-resources.dto';
import { CreateDispatchOrderDto } from './dto/create-dispatch-order.dto';
import { DispatchFilterDto } from './dto/dispatch-filter.dto';
import { UpdateDispatchOrderDto } from './dto/update-dispatch-order.dto';

@ApiTags('Dispatch Orders - Lệnh điều xe')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('dispatch-orders')
export class DispatchOrdersController {
  constructor(private readonly service: DispatchOrdersService) {}
  @Post() @Roles(Role.SUPER_ADMIN, Role.DISPATCHER, Role.FARM_MANAGER)
  create(@Body() dto: CreateDispatchOrderDto, @CurrentUser() actor: OperationalActor) { return this.service.create(dto, actor); }
  @Get() findAll(@Query() filter: DispatchFilterDto, @CurrentUser() actor: OperationalActor) { return this.service.findAll(filter, actor); }
  @Get('available-resources') available(@Query() query: AvailableResourcesDto, @CurrentUser() actor: OperationalActor) { return this.service.availableResources(query, actor); }
  @Get('check-delayed') @Roles(Role.SUPER_ADMIN, Role.DISPATCHER)
  delayed() { return this.service.checkDelayedOrders(); }
  @Get(':id') findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() actor: OperationalActor) { return this.service.findOne(id, actor); }
  @Patch(':id') @Roles(Role.SUPER_ADMIN, Role.DISPATCHER, Role.FARM_MANAGER)
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateDispatchOrderDto, @CurrentUser() actor: OperationalActor) { return this.service.update(id, dto, actor); }
  @Post(':id/submit') @Roles(Role.SUPER_ADMIN, Role.DISPATCHER, Role.FARM_MANAGER)
  submit(@Param('id', ParseIntPipe) id: number, @CurrentUser() actor: OperationalActor) { return this.service.submit(id, actor); }
  @Post(':id/approve') @Roles(Role.SUPER_ADMIN, Role.DISPATCHER, Role.FARM_MANAGER)
  approve(@Param('id', ParseIntPipe) id: number, @CurrentUser() actor: OperationalActor) { return this.service.approve(id, actor); }
  @Post(':id/reject') @Roles(Role.SUPER_ADMIN, Role.DISPATCHER, Role.FARM_MANAGER)
  reject(@Param('id', ParseIntPipe) id: number, @Body() dto: TransitionDto, @CurrentUser() actor: OperationalActor) { return this.service.reject(id, actor, dto.reason); }
  @Post(':id/assign') @Roles(Role.SUPER_ADMIN, Role.DISPATCHER, Role.FARM_MANAGER)
  assign(@Param('id', ParseIntPipe) id: number, @Body() dto: AssignDispatchDto, @CurrentUser() actor: OperationalActor) { return this.service.assign(id, dto, actor); }
  @Post(':id/driver-accept')
  driverAccept(@Param('id', ParseIntPipe) id: number, @CurrentUser() actor: OperationalActor) { return this.service.driverAccept(id, actor); }
  @Post(':id/depart') depart(@Param('id', ParseIntPipe) id: number, @CurrentUser() actor: OperationalActor) { return this.service.depart(id, actor); }
  @Post(':id/start') start(@Param('id', ParseIntPipe) id: number, @CurrentUser() actor: OperationalActor) { return this.service.start(id, actor); }
  @Post(':id/complete') complete(@Param('id', ParseIntPipe) id: number, @CurrentUser() actor: OperationalActor) { return this.service.complete(id, actor); }
  @Post(':id/accept') @Roles(Role.SUPER_ADMIN, Role.DISPATCHER, Role.FARM_MANAGER)
  accept(@Param('id', ParseIntPipe) id: number, @CurrentUser() actor: OperationalActor) { return this.service.accept(id, actor); }
  @Post(':id/close') @Roles(Role.SUPER_ADMIN, Role.DISPATCHER, Role.FARM_MANAGER)
  close(@Param('id', ParseIntPipe) id: number, @CurrentUser() actor: OperationalActor) { return this.service.close(id, actor); }
  @Post(':id/cancel') @Roles(Role.SUPER_ADMIN, Role.DISPATCHER, Role.FARM_MANAGER)
  cancel(@Param('id', ParseIntPipe) id: number, @Body() dto: TransitionDto, @CurrentUser() actor: OperationalActor) { return this.service.cancel(id, actor, dto.reason); }
  @Delete(':id') @Roles(Role.SUPER_ADMIN)
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() actor: OperationalActor) { return this.service.remove(id, actor); }
}
