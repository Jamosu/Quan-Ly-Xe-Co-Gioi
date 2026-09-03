import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
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
@Controller('production-plans')
export class ProductionPlansController {
  constructor(private readonly service: ProductionPlansService) {}

  @Public()
  @Post()
  create(@Body() dto: CreatePlanDto, @CurrentUser() actor?: OperationalActor) { return this.service.create(dto, actor); }

  @Public()
  @Get()
  findAll(@Query() filter: PlanFilterDto, @CurrentUser() actor?: OperationalActor) { return this.service.findAll(filter, actor); }

  @Public()
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() actor?: OperationalActor) { return this.service.findOne(id, actor); }

  @Public()
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdatePlanDto, @CurrentUser() actor?: OperationalActor) { return this.service.update(id, dto, actor); }

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
  @Post(':id/start')
  start(@Param('id', ParseIntPipe) id: number, @CurrentUser() actor?: OperationalActor) { return this.service.start(id, actor); }

  @Public()
  @Post(':id/complete')
  complete(@Param('id', ParseIntPipe) id: number, @CurrentUser() actor?: OperationalActor) { return this.service.complete(id, actor); }

  @Public()
  @Post(':id/adjust')
  adjust(@Param('id', ParseIntPipe) id: number, @Body() dto: AdjustPlanDto, @CurrentUser() actor?: OperationalActor) { return this.service.adjust(id, dto, actor); }

  @Public()
  @Post(':id/cancel')
  cancel(@Param('id', ParseIntPipe) id: number, @Body() dto: TransitionDto, @CurrentUser() actor?: OperationalActor) { return this.service.cancel(id, actor, dto.reason); }

  @Public()
  @Post(':id/items')
  createItem(@Param('id', ParseIntPipe) id: number, @Body() dto: CreatePlanItemDto, @CurrentUser() actor?: OperationalActor) { return this.service.createItem(id, dto, actor); }

  @Public()
  @Patch(':id/items/:itemId')
  updateItem(@Param('id', ParseIntPipe) id: number, @Param('itemId', ParseIntPipe) itemId: number, @Body() dto: UpdatePlanItemDto, @CurrentUser() actor?: OperationalActor) { return this.service.updateItem(id, itemId, dto, actor); }

  @Public()
  @Delete(':id/items/:itemId')
  removeItem(@Param('id', ParseIntPipe) id: number, @Param('itemId', ParseIntPipe) itemId: number, @CurrentUser() actor?: OperationalActor) { return this.service.removeItem(id, itemId, actor); }

  @Public()
  @Post(':id/production-orders')
  createProductionOrder(@Param('id', ParseIntPipe) id: number, @Body() dto: CreateProductionOrderDto, @CurrentUser() actor?: OperationalActor) { return this.service.createProductionOrder(id, dto, actor); }

  @Public()
  @Get(':id/production-orders')
  listProductionOrders(@Param('id', ParseIntPipe) id: number, @CurrentUser() actor?: OperationalActor) { return this.service.listProductionOrders(id, actor); }

  @Public()
  @Patch(':id/production-orders/:orderId')
  updateProductionOrder(@Param('id', ParseIntPipe) id: number, @Param('orderId', ParseIntPipe) orderId: number, @Body() dto: UpdateProductionOrderDto, @CurrentUser() actor?: OperationalActor) { return this.service.updateProductionOrder(id, orderId, dto, actor); }

  @Public()
  @Delete(':id/production-orders/:orderId')
  removeProductionOrder(@Param('id', ParseIntPipe) id: number, @Param('orderId', ParseIntPipe) orderId: number, @CurrentUser() actor?: OperationalActor) { return this.service.removeProductionOrder(id, orderId, actor); }

  @Public()
  @Post(':id/plots')
  addPlot(@Param('id', ParseIntPipe) id: number, @Body() dto: CreatePlotDto, @CurrentUser() actor?: OperationalActor) { return this.service.addPlot(id, dto, actor); }

  @Public()
  @Patch(':id/plots/:plotId')
  updatePlot(@Param('id', ParseIntPipe) id: number, @Param('plotId', ParseIntPipe) plotId: number, @Body() dto: UpdatePlotProgressDto, @CurrentUser() actor?: OperationalActor) { return this.service.updatePlotProgress(id, plotId, dto, actor); }

  @Public()
  @Post(':id/audit-change')
  audit(@Param('id', ParseIntPipe) id: number, @Body() dto: AuditChangeDto, @CurrentUser() actor?: OperationalActor) { return this.service.logAuditChange(id, dto, actor); }

  @Public()
  @Post(':id/settle')
  settle(@Param('id', ParseIntPipe) id: number, @CurrentUser() actor?: OperationalActor) { return this.service.settleFinance(id, actor); }

  @Public()
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() actor?: OperationalActor) { return this.service.remove(id, actor); }
}
