import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { TransitionDto } from '../common/dto/transition.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { OperationalActor } from '../common/utils/operational-access';
import { AdjustPlanDto } from './dto/adjust-plan.dto';
import { AuditChangeDto } from './dto/audit-change.dto';
import { CreatePlanItemDto } from './dto/create-plan-item.dto';
import { CreatePlanDto } from './dto/create-plan.dto';
import { CreatePlotDto } from './dto/create-plot.dto';
import { CreateProductionOrderDto } from './dto/create-production-order.dto';
import { PlanFilterDto } from './dto/plan-filter.dto';
import { UpdatePlanItemDto } from './dto/update-plan-item.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { UpdatePlotProgressDto } from './dto/update-plot-progress.dto';
import { UpdateProductionOrderDto } from './dto/update-production-order.dto';
import { ProductionPlansService } from './production-plans.service';

@ApiTags('Production Plans - Kế hoạch tác nghiệp')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('production-plans')
export class ProductionPlansController {
  constructor(private readonly service: ProductionPlansService) {}

  @Post() @Roles(Role.SUPER_ADMIN, Role.DISPATCHER, Role.FARM_MANAGER)
  create(@Body() dto: CreatePlanDto, @CurrentUser() actor: OperationalActor) { return this.service.create(dto, actor); }
  @Get() findAll(@Query() filter: PlanFilterDto, @CurrentUser() actor: OperationalActor) { return this.service.findAll(filter, actor); }
  @Get(':id') findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() actor: OperationalActor) { return this.service.findOne(id, actor); }
  @Patch(':id') @Roles(Role.SUPER_ADMIN, Role.DISPATCHER, Role.FARM_MANAGER)
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdatePlanDto, @CurrentUser() actor: OperationalActor) { return this.service.update(id, dto, actor); }

  @Post(':id/submit') @Roles(Role.SUPER_ADMIN, Role.DISPATCHER, Role.FARM_MANAGER)
  submit(@Param('id', ParseIntPipe) id: number, @CurrentUser() actor: OperationalActor) { return this.service.submit(id, actor); }
  @Post(':id/approve') @Roles(Role.SUPER_ADMIN, Role.DISPATCHER, Role.FARM_MANAGER)
  approve(@Param('id', ParseIntPipe) id: number, @CurrentUser() actor: OperationalActor) { return this.service.approve(id, actor); }
  @Post(':id/reject') @Roles(Role.SUPER_ADMIN, Role.DISPATCHER, Role.FARM_MANAGER)
  reject(@Param('id', ParseIntPipe) id: number, @Body() dto: TransitionDto, @CurrentUser() actor: OperationalActor) { return this.service.reject(id, actor, dto.reason); }
  @Post(':id/start') @Roles(Role.SUPER_ADMIN, Role.DISPATCHER, Role.FARM_MANAGER)
  start(@Param('id', ParseIntPipe) id: number, @CurrentUser() actor: OperationalActor) { return this.service.start(id, actor); }
  @Post(':id/complete') @Roles(Role.SUPER_ADMIN, Role.DISPATCHER, Role.FARM_MANAGER)
  complete(@Param('id', ParseIntPipe) id: number, @CurrentUser() actor: OperationalActor) { return this.service.complete(id, actor); }
  @Post(':id/adjust') @Roles(Role.SUPER_ADMIN, Role.DISPATCHER, Role.FARM_MANAGER)
  adjust(@Param('id', ParseIntPipe) id: number, @Body() dto: AdjustPlanDto, @CurrentUser() actor: OperationalActor) { return this.service.adjust(id, dto, actor); }
  @Post(':id/cancel') @Roles(Role.SUPER_ADMIN, Role.DISPATCHER, Role.FARM_MANAGER)
  cancel(@Param('id', ParseIntPipe) id: number, @Body() dto: TransitionDto, @CurrentUser() actor: OperationalActor) { return this.service.cancel(id, actor, dto.reason); }

  @Post(':id/items') @Roles(Role.SUPER_ADMIN, Role.DISPATCHER, Role.FARM_MANAGER)
  createItem(@Param('id', ParseIntPipe) id: number, @Body() dto: CreatePlanItemDto, @CurrentUser() actor: OperationalActor) { return this.service.createItem(id, dto, actor); }
  @Patch(':id/items/:itemId') @Roles(Role.SUPER_ADMIN, Role.DISPATCHER, Role.FARM_MANAGER)
  updateItem(@Param('id', ParseIntPipe) id: number, @Param('itemId', ParseIntPipe) itemId: number, @Body() dto: UpdatePlanItemDto, @CurrentUser() actor: OperationalActor) { return this.service.updateItem(id, itemId, dto, actor); }
  @Delete(':id/items/:itemId') @Roles(Role.SUPER_ADMIN, Role.DISPATCHER, Role.FARM_MANAGER)
  removeItem(@Param('id', ParseIntPipe) id: number, @Param('itemId', ParseIntPipe) itemId: number, @CurrentUser() actor: OperationalActor) { return this.service.removeItem(id, itemId, actor); }
  @Post(':id/production-orders') @Roles(Role.SUPER_ADMIN, Role.DISPATCHER, Role.FARM_MANAGER)
  createProductionOrder(@Param('id', ParseIntPipe) id: number, @Body() dto: CreateProductionOrderDto, @CurrentUser() actor: OperationalActor) { return this.service.createProductionOrder(id, dto, actor); }
  @Get(':id/production-orders')
  listProductionOrders(@Param('id', ParseIntPipe) id: number, @CurrentUser() actor: OperationalActor) { return this.service.listProductionOrders(id, actor); }
  @Patch(':id/production-orders/:orderId') @Roles(Role.SUPER_ADMIN, Role.DISPATCHER, Role.FARM_MANAGER)
  updateProductionOrder(@Param('id', ParseIntPipe) id: number, @Param('orderId', ParseIntPipe) orderId: number, @Body() dto: UpdateProductionOrderDto, @CurrentUser() actor: OperationalActor) { return this.service.updateProductionOrder(id, orderId, dto, actor); }
  @Delete(':id/production-orders/:orderId') @Roles(Role.SUPER_ADMIN, Role.DISPATCHER, Role.FARM_MANAGER)
  removeProductionOrder(@Param('id', ParseIntPipe) id: number, @Param('orderId', ParseIntPipe) orderId: number, @CurrentUser() actor: OperationalActor) { return this.service.removeProductionOrder(id, orderId, actor); }

  @Post(':id/plots') @Roles(Role.SUPER_ADMIN, Role.DISPATCHER, Role.FARM_MANAGER)
  addPlot(@Param('id', ParseIntPipe) id: number, @Body() dto: CreatePlotDto, @CurrentUser() actor: OperationalActor) { return this.service.addPlot(id, dto, actor); }
  @Patch(':id/plots/:plotId')
  updatePlot(@Param('id', ParseIntPipe) id: number, @Param('plotId', ParseIntPipe) plotId: number, @Body() dto: UpdatePlotProgressDto, @CurrentUser() actor: OperationalActor) { return this.service.updatePlotProgress(id, plotId, dto, actor); }
  @Post(':id/audit-change') @Roles(Role.SUPER_ADMIN, Role.DISPATCHER, Role.FARM_MANAGER)
  audit(@Param('id', ParseIntPipe) id: number, @Body() dto: AuditChangeDto, @CurrentUser() actor: OperationalActor) { return this.service.logAuditChange(id, dto, actor); }
  @Post(':id/settle') @Roles(Role.SUPER_ADMIN, Role.FARM_MANAGER)
  settle(@Param('id', ParseIntPipe) id: number, @CurrentUser() actor: OperationalActor) { return this.service.settleFinance(id, actor); }
  @Delete(':id') @Roles(Role.SUPER_ADMIN)
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() actor: OperationalActor) { return this.service.remove(id, actor); }
}
