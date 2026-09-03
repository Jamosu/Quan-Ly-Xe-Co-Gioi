import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { OperationalActor } from '../common/utils/operational-access';
import { AvailableResourcesDto } from '../dispatch-orders/dto/available-resources.dto';
import { AssignTransportDto } from './dto/assign-transport.dto';
import { CreateTransportItemDto, CreateTransportOrderDto } from './dto/create-transport-order.dto';
import { ImportWorkbookDto } from './dto/import-workbook.dto';
import { SchedulerFilterDto } from './dto/scheduler-filter.dto';
import { TransportFilterDto } from './dto/transport-filter.dto';
import { UpdateReturnCargoDto } from './dto/update-return-cargo.dto';
import { UpdateTransportItemDto } from './dto/update-transport-item.dto';
import { UpdateTransportOrderDto } from './dto/update-transport-order.dto';
import { UpdateTransportTelemetryDto } from './dto/update-transport-telemetry.dto';
import { TransportService } from './transport.service';

@ApiTags('Transport & Logistics') @ApiBearerAuth() @UseGuards(JwtAuthGuard, RolesGuard) @Controller('transport-orders')
export class TransportController {
  constructor(private readonly service: TransportService) {}
  @Post() @Roles(Role.SUPER_ADMIN, Role.DISPATCHER) create(@Body() dto: CreateTransportOrderDto, @CurrentUser() actor: OperationalActor) { return this.service.create(dto, actor); }
  @Get() findAll(@Query() filter: TransportFilterDto, @CurrentUser() actor: OperationalActor) { return this.service.findAll(filter, actor); }
  @Get('statistics') statistics(@CurrentUser() actor: OperationalActor) { return this.service.getStatistics(actor); }
  @Get('scheduler') scheduler(@Query() query: SchedulerFilterDto, @CurrentUser() actor: OperationalActor) { return this.service.scheduler(query, actor); }
  @Get('available-resources') available(@Query() query: AvailableResourcesDto, @CurrentUser() actor: OperationalActor) { return this.service.availableResources(query, actor); }
  @Post('import/preview') @Roles(Role.SUPER_ADMIN, Role.DISPATCHER) preview(@Body() dto: ImportWorkbookDto, @CurrentUser() actor: OperationalActor) { return this.service.previewImport(dto, actor); }
  @Post('import/commit') @Roles(Role.SUPER_ADMIN, Role.DISPATCHER) commit(@Body() dto: ImportWorkbookDto, @CurrentUser() actor: OperationalActor) { return this.service.commitImport(dto, actor); }
  @Get(':id') findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() actor: OperationalActor) { return this.service.findOne(id, actor); }
  @Patch(':id') @Roles(Role.SUPER_ADMIN, Role.DISPATCHER) update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateTransportOrderDto, @CurrentUser() actor: OperationalActor) { return this.service.update(id, dto, actor); }
  @Post(':id/items') @Roles(Role.SUPER_ADMIN, Role.DISPATCHER) createItem(@Param('id', ParseIntPipe) id: number, @Body() dto: CreateTransportItemDto, @CurrentUser() actor: OperationalActor) { return this.service.createItem(id, dto, actor); }
  @Patch(':id/items/:itemId') @Roles(Role.SUPER_ADMIN, Role.DISPATCHER) updateItem(@Param('id', ParseIntPipe) id: number, @Param('itemId', ParseIntPipe) itemId: number, @Body() dto: UpdateTransportItemDto, @CurrentUser() actor: OperationalActor) { return this.service.updateItem(id, itemId, dto, actor); }
  @Delete(':id/items/:itemId') @Roles(Role.SUPER_ADMIN, Role.DISPATCHER) removeItem(@Param('id', ParseIntPipe) id: number, @Param('itemId', ParseIntPipe) itemId: number, @CurrentUser() actor: OperationalActor) { return this.service.removeItem(id, itemId, actor); }
  @Post(':id/submit') @Roles(Role.SUPER_ADMIN, Role.DISPATCHER) submit(@Param('id', ParseIntPipe) id: number, @CurrentUser() actor: OperationalActor) { return this.service.submit(id, actor); }
  @Post(':id/approve') @Roles(Role.SUPER_ADMIN, Role.DISPATCHER) approve(@Param('id', ParseIntPipe) id: number, @CurrentUser() actor: OperationalActor) { return this.service.approve(id, actor); }
  @Post(':id/assign') @Roles(Role.SUPER_ADMIN, Role.DISPATCHER) assign(@Param('id', ParseIntPipe) id: number, @Body() dto: AssignTransportDto, @CurrentUser() actor: OperationalActor) { return this.service.assign(id, dto, actor); }
  @Post(':id/driver-accept') driverAccept(@Param('id', ParseIntPipe) id: number, @CurrentUser() actor: OperationalActor) { return this.service.driverAccept(id, actor); }
  @Post(':id/at-pickup') atPickup(@Param('id', ParseIntPipe) id: number, @CurrentUser() actor: OperationalActor) { return this.service.atPickup(id, actor); }
  @Post(':id/loading') loading(@Param('id', ParseIntPipe) id: number, @CurrentUser() actor: OperationalActor) { return this.service.loading(id, actor); }
  @Post(':id/depart') depart(@Param('id', ParseIntPipe) id: number, @CurrentUser() actor: OperationalActor) { return this.service.depart(id, actor); }
  @Post(':id/in-transit') inTransit(@Param('id', ParseIntPipe) id: number, @CurrentUser() actor: OperationalActor) { return this.service.inTransit(id, actor); }
  @Post(':id/at-delivery') atDelivery(@Param('id', ParseIntPipe) id: number, @CurrentUser() actor: OperationalActor) { return this.service.atDelivery(id, actor); }
  @Post(':id/unloading') unloading(@Param('id', ParseIntPipe) id: number, @CurrentUser() actor: OperationalActor) { return this.service.unloading(id, actor); }
  @Post(':id/deliver') deliver(@Param('id', ParseIntPipe) id: number, @CurrentUser() actor: OperationalActor) { return this.service.deliver(id, actor); }
  @Post(':id/accept') @Roles(Role.SUPER_ADMIN, Role.DISPATCHER) accept(@Param('id', ParseIntPipe) id: number, @CurrentUser() actor: OperationalActor) { return this.service.accept(id, actor); }
  @Post(':id/complete') @Roles(Role.SUPER_ADMIN, Role.DISPATCHER) complete(@Param('id', ParseIntPipe) id: number, @CurrentUser() actor: OperationalActor) { return this.service.complete(id, actor); }
  @Patch(':id/return-cargo') updateReturn(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateReturnCargoDto, @CurrentUser() actor: OperationalActor) { return this.service.updateReturnCargo(id, dto, actor); }
  @Patch(':id/telemetry') telemetry(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateTransportTelemetryDto, @CurrentUser() actor: OperationalActor) { return this.service.updateTelemetry(id, dto, actor); }
  @Delete(':id') @Roles(Role.SUPER_ADMIN) remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() actor: OperationalActor) { return this.service.remove(id, actor); }
}
