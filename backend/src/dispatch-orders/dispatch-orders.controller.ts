import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
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
@Controller('dispatch-orders')
export class DispatchOrdersController {
  constructor(private readonly service: DispatchOrdersService) {}

  @Public()
  @Post()
  create(@Body() dto: CreateDispatchOrderDto, @CurrentUser() actor?: OperationalActor) { return this.service.create(dto, actor); }

  @Public()
  @Get()
  findAll(@Query() filter: DispatchFilterDto, @CurrentUser() actor?: OperationalActor) { return this.service.findAll(filter, actor); }

  @Public()
  @Get('available-resources')
  available(@Query() query: AvailableResourcesDto, @CurrentUser() actor?: OperationalActor) { return this.service.availableResources(query, actor); }

  @Public()
  @Get('check-delayed')
  delayed() { return this.service.checkDelayedOrders(); }

  @Public()
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() actor?: OperationalActor) { return this.service.findOne(id, actor); }

  @Public()
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateDispatchOrderDto, @CurrentUser() actor?: OperationalActor) { return this.service.update(id, dto, actor); }

  @Public()
  @Post(':id/submit')
  submit(@Param('id', ParseIntPipe) id: number, @CurrentUser() actor?: OperationalActor) { return this.service.submit(id, actor); }

  @Public()
  @Post(':id/approve')
  approve(@Param('id', ParseIntPipe) id: number, @CurrentUser() actor?: OperationalActor) { return this.service.approve(id, actor); }

  @Public()
  @Post(':id/reject')
  reject(@Param('id', ParseIntPipe) id: number, @Body() dto: TransitionDto, @CurrentUser() actor?: OperationalActor) { return this.service.reject(id, actor, dto.reason); }

  @Public()
  @Post(':id/assign')
  assign(@Param('id', ParseIntPipe) id: number, @Body() dto: AssignDispatchDto, @CurrentUser() actor?: OperationalActor) { return this.service.assign(id, dto, actor); }

  @Public()
  @Post(':id/driver-accept')
  driverAccept(@Param('id', ParseIntPipe) id: number, @CurrentUser() actor?: OperationalActor) { return this.service.driverAccept(id, actor); }

  @Public()
  @Post(':id/depart')
  depart(@Param('id', ParseIntPipe) id: number, @CurrentUser() actor?: OperationalActor) { return this.service.depart(id, actor); }

  @Public()
  @Post(':id/start')
  start(@Param('id', ParseIntPipe) id: number, @CurrentUser() actor?: OperationalActor) { return this.service.start(id, actor); }

  @Public()
  @Post(':id/complete')
  complete(@Param('id', ParseIntPipe) id: number, @CurrentUser() actor?: OperationalActor) { return this.service.complete(id, actor); }

  @Public()
  @Post(':id/accept')
  accept(@Param('id', ParseIntPipe) id: number, @CurrentUser() actor?: OperationalActor) { return this.service.accept(id, actor); }

  @Public()
  @Post(':id/close')
  close(@Param('id', ParseIntPipe) id: number, @CurrentUser() actor?: OperationalActor) { return this.service.close(id, actor); }

  @Public()
  @Post(':id/cancel')
  cancel(@Param('id', ParseIntPipe) id: number, @Body() dto: TransitionDto, @CurrentUser() actor?: OperationalActor) { return this.service.cancel(id, actor, dto.reason); }

  @Public()
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() actor?: OperationalActor) { return this.service.remove(id, actor); }
}
