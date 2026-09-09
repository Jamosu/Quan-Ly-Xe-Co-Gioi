import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
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

@ApiTags('Transport & Logistics')
@Controller('transport-orders')
export class TransportController {
  constructor(private readonly service: TransportService) {}

  @Public()
  @Post()
  @Roles(Role.SUPER_ADMIN, Role.DISPATCHER)
  create(@Body() dto: CreateTransportOrderDto, @CurrentUser() actor?: OperationalActor) { return this.service.create(dto, actor); }

  @Public()
  @Get()
  findAll(@Query() filter: TransportFilterDto, @CurrentUser() actor?: OperationalActor) { return this.service.findAll(filter, actor); }

  @Public()
  @Get('statistics')
  statistics(@CurrentUser() actor?: OperationalActor) { return this.service.getStatistics(actor); }

  @Public()
  @Get('scheduler')
  scheduler(@Query() query: SchedulerFilterDto, @CurrentUser() actor?: OperationalActor) { return this.service.scheduler(query, actor); }

  @Public()
  @Get('available-resources')
  available(@Query() query: AvailableResourcesDto, @CurrentUser() actor?: OperationalActor) { return this.service.availableResources(query, actor); }

  @Public()
  @Post('import/preview')
  preview(@Body() dto: ImportWorkbookDto, @CurrentUser() actor?: OperationalActor) { return this.service.previewImport(dto, actor); }

  @Public()
  @Post('import/commit')
  commit(@Body() dto: ImportWorkbookDto, @CurrentUser() actor?: OperationalActor) { return this.service.commitImport(dto, actor); }

  @Public()
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() actor?: OperationalActor) { return this.service.findOne(id, actor); }

  @Public()
  @Patch(':id')
  @Roles(Role.SUPER_ADMIN, Role.DISPATCHER)
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateTransportOrderDto, @CurrentUser() actor?: OperationalActor) { return this.service.update(id, dto, actor); }

  @Public()
  @Post(':id/items')
  createItem(@Param('id', ParseIntPipe) id: number, @Body() dto: CreateTransportItemDto, @CurrentUser() actor?: OperationalActor) { return this.service.createItem(id, dto, actor); }

  @Public()
  @Patch(':id/items/:itemId')
  updateItem(@Param('id', ParseIntPipe) id: number, @Param('itemId', ParseIntPipe) itemId: number, @Body() dto: UpdateTransportItemDto, @CurrentUser() actor?: OperationalActor) { return this.service.updateItem(id, itemId, dto, actor); }

  @Public()
  @Delete(':id/items/:itemId')
  removeItem(@Param('id', ParseIntPipe) id: number, @Param('itemId', ParseIntPipe) itemId: number, @CurrentUser() actor?: OperationalActor) { return this.service.removeItem(id, itemId, actor); }

  @Public()
  @Post(':id/submit')
  @Roles(Role.SUPER_ADMIN, Role.DISPATCHER)
  submit(@Param('id', ParseIntPipe) id: number, @CurrentUser() actor?: OperationalActor) { return this.service.submit(id, actor); }

  @Public()
  @Post(':id/approve')
  @Roles(Role.SUPER_ADMIN, Role.DISPATCHER)
  approve(@Param('id', ParseIntPipe) id: number, @CurrentUser() actor?: OperationalActor) { return this.service.approve(id, actor); }

  @Public()
  @Post(':id/assign')
  @Roles(Role.SUPER_ADMIN, Role.DISPATCHER)
  assign(@Param('id', ParseIntPipe) id: number, @Body() dto: AssignTransportDto, @CurrentUser() actor?: OperationalActor) { return this.service.assign(id, dto, actor); }

  @Public()
  @Post(':id/driver-accept')
  @Roles(Role.DRIVER)
  driverAccept(@Param('id', ParseIntPipe) id: number, @CurrentUser() actor?: OperationalActor) { return this.service.driverAccept(id, actor); }

  @Public()
  @Post(':id/at-pickup')
  @Roles(Role.DRIVER)
  atPickup(@Param('id', ParseIntPipe) id: number, @CurrentUser() actor?: OperationalActor) { return this.service.atPickup(id, actor); }

  @Public()
  @Post(':id/loading')
  @Roles(Role.DRIVER)
  loading(@Param('id', ParseIntPipe) id: number, @CurrentUser() actor?: OperationalActor) { return this.service.loading(id, actor); }

  @Public()
  @Post(':id/depart')
  @Roles(Role.DRIVER)
  depart(@Param('id', ParseIntPipe) id: number, @CurrentUser() actor?: OperationalActor) { return this.service.depart(id, actor); }

  @Public()
  @Post(':id/in-transit')
  @Roles(Role.DRIVER)
  inTransit(@Param('id', ParseIntPipe) id: number, @CurrentUser() actor?: OperationalActor) { return this.service.inTransit(id, actor); }

  @Public()
  @Post(':id/at-delivery')
  @Roles(Role.DRIVER)
  atDelivery(@Param('id', ParseIntPipe) id: number, @CurrentUser() actor?: OperationalActor) { return this.service.atDelivery(id, actor); }

  @Public()
  @Post(':id/unloading')
  @Roles(Role.DRIVER)
  unloading(@Param('id', ParseIntPipe) id: number, @CurrentUser() actor?: OperationalActor) { return this.service.unloading(id, actor); }

  @Public()
  @Post(':id/deliver')
  @Roles(Role.DRIVER)
  deliver(@Param('id', ParseIntPipe) id: number, @CurrentUser() actor?: OperationalActor) { return this.service.deliver(id, actor); }

  @Public()
  @Post(':id/accept')
  @Roles(Role.SUPER_ADMIN, Role.DISPATCHER)
  accept(@Param('id', ParseIntPipe) id: number, @CurrentUser() actor?: OperationalActor) { return this.service.accept(id, actor); }

  @Public()
  @Post(':id/complete')
  @Roles(Role.SUPER_ADMIN, Role.DISPATCHER)
  complete(@Param('id', ParseIntPipe) id: number, @CurrentUser() actor?: OperationalActor) { return this.service.complete(id, actor); }

  @Public()
  @Patch(':id/return-cargo')
  updateReturn(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateReturnCargoDto, @CurrentUser() actor?: OperationalActor) { return this.service.updateReturnCargo(id, dto, actor); }

  @Public()
  @Patch(':id/telemetry')
  telemetry(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateTransportTelemetryDto, @CurrentUser() actor?: OperationalActor) { return this.service.updateTelemetry(id, dto, actor); }

  @Public()
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() actor?: OperationalActor) { return this.service.remove(id, actor); }
}
