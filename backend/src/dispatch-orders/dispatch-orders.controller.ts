import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
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
import { BatchRescheduleDispatchDto, RescheduleDispatchDto } from './dto/reschedule-dispatch.dto';
import { RetroactiveCompleteDto } from './dto/retroactive-complete.dto';

@ApiTags('Dispatch Orders - Lệnh điều xe')
@Controller('dispatch-orders')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DispatchOrdersController {
  constructor(private readonly service: DispatchOrdersService) {}

  @Post()
  @Roles(Role.SUPER_ADMIN, Role.DISPATCHER, Role.FARM_MANAGER)
  create(@Body() dto: CreateDispatchOrderDto, @CurrentUser() actor?: OperationalActor) { return this.service.create(dto, actor); }

  @Get()
  findAll(@Query() filter: DispatchFilterDto, @CurrentUser() actor?: OperationalActor) { return this.service.findAll(filter, actor); }

  @Get('available-resources')
  available(@Query() query: AvailableResourcesDto, @CurrentUser() actor?: OperationalActor) { return this.service.availableResources(query, actor); }

  @Get('check-delayed')
  delayed() { return this.service.checkDelayedOrders(); }

  @Get('overdue-summary')
  overdueSummary(@CurrentUser() actor?: OperationalActor) { return this.service.overdueSummary(actor); }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() actor?: OperationalActor) { return this.service.findOne(id, actor); }

  @Patch(':id')
  @Roles(Role.SUPER_ADMIN, Role.DISPATCHER, Role.FARM_MANAGER)
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateDispatchOrderDto, @CurrentUser() actor?: OperationalActor) { return this.service.update(id, dto, actor); }

  @Post(':id/submit')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.SUPER_ADMIN, Role.DISPATCHER, Role.FARM_MANAGER)
  submit(@Param('id', ParseIntPipe) id: number, @CurrentUser() actor?: OperationalActor) { return this.service.submit(id, actor); }

  @Post(':id/approve')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.SUPER_ADMIN, Role.DISPATCHER, Role.FARM_MANAGER)
  approve(@Param('id', ParseIntPipe) id: number, @CurrentUser() actor?: OperationalActor) { return this.service.approve(id, actor); }

  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.SUPER_ADMIN, Role.DISPATCHER, Role.FARM_MANAGER)
  reject(@Param('id', ParseIntPipe) id: number, @Body() dto: TransitionDto, @CurrentUser() actor?: OperationalActor) { return this.service.reject(id, actor, dto.reason); }

  @Post(':id/assign')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.SUPER_ADMIN, Role.DISPATCHER, Role.FARM_MANAGER)
  assign(@Param('id', ParseIntPipe) id: number, @Body() dto: AssignDispatchDto, @CurrentUser() actor?: OperationalActor) { return this.service.assign(id, dto, actor); }

  @Post(':id/driver-accept')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.DRIVER)
  driverAccept(@Param('id', ParseIntPipe) id: number, @CurrentUser() actor?: OperationalActor) { return this.service.driverAccept(id, actor); }

  @Post(':id/depart')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.DRIVER)
  depart(@Param('id', ParseIntPipe) id: number, @CurrentUser() actor?: OperationalActor) { return this.service.depart(id, actor); }

  @Post(':id/start')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.DRIVER)
  start(@Param('id', ParseIntPipe) id: number, @CurrentUser() actor?: OperationalActor) { return this.service.start(id, actor); }

  @Post(':id/complete')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.DRIVER)
  complete(@Param('id', ParseIntPipe) id: number, @CurrentUser() actor?: OperationalActor) { return this.service.complete(id, actor); }

  @Post(':id/accept')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.SUPER_ADMIN, Role.FARM_MANAGER)
  accept(@Param('id', ParseIntPipe) id: number, @CurrentUser() actor?: OperationalActor) { return this.service.accept(id, actor); }

  @Post(':id/close')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.SUPER_ADMIN, Role.DISPATCHER, Role.FARM_MANAGER)
  close(@Param('id', ParseIntPipe) id: number, @CurrentUser() actor?: OperationalActor) { return this.service.close(id, actor); }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.SUPER_ADMIN, Role.DISPATCHER, Role.FARM_MANAGER)
  cancel(@Param('id', ParseIntPipe) id: number, @Body() dto: TransitionDto, @CurrentUser() actor?: OperationalActor) { return this.service.cancel(id, actor, dto.reason); }

  @Post(':id/reschedule')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.SUPER_ADMIN, Role.DISPATCHER, Role.FARM_MANAGER)
  reschedule(@Param('id', ParseIntPipe) id: number, @Body() dto: RescheduleDispatchDto, @CurrentUser() actor?: OperationalActor) { return this.service.reschedule(id, dto, actor); }

  @Post('batch-reschedule')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.SUPER_ADMIN, Role.DISPATCHER, Role.FARM_MANAGER)
  batchReschedule(@Body() dto: BatchRescheduleDispatchDto, @CurrentUser() actor?: OperationalActor) { return this.service.batchReschedule(dto, actor); }

  @Post(':id/retroactive-complete')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.SUPER_ADMIN, Role.DISPATCHER, Role.FARM_MANAGER)
  retroactiveComplete(@Param('id', ParseIntPipe) id: number, @Body() dto: RetroactiveCompleteDto, @CurrentUser() actor?: OperationalActor) { return this.service.retroactiveComplete(id, dto, actor); }

  @Delete(':id')
  @Roles(Role.SUPER_ADMIN)
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() actor?: OperationalActor) { return this.service.remove(id, actor); }
}
