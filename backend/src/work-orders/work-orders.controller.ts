import { Body, Controller, Get, Param, ParseIntPipe, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { OperationalActor } from '../common/utils/operational-access';
import { WorkOrderStatus } from '@prisma/client';
import {
  AcceptanceReviewDto,
  AssignWorkOrderDto,
  FinishExecutionDto,
  HandoverExecutionDto,
  ReassignWorkOrderDto,
  StartExecutionDto,
  WorkReasonDto,
} from './dto/work-order-actions.dto';
import { WorkOrdersService } from './work-orders.service';

@ApiTags('Operational Work Orders - Vòng đời công việc')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('work-orders')
export class WorkOrdersController {
  constructor(private readonly service: WorkOrdersService) {}

  @Get()
  findAll(@Query('status') status: string | undefined, @Query('type') type: string | undefined, @CurrentUser() actor: OperationalActor) { return this.service.findAll(status, type, actor); }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() actor: OperationalActor) { return this.service.findOne(id, actor); }

  @Post(':id/assign')
  assign(@Param('id', ParseIntPipe) id: number, @Body() dto: AssignWorkOrderDto, @CurrentUser() actor: OperationalActor) { return this.service.assign(id, dto, actor); }

  @Post(':id/submit')
  submit(@Param('id', ParseIntPipe) id: number, @CurrentUser() actor: OperationalActor) { return this.service.transitionApproval(id, WorkOrderStatus.PENDING_APPROVAL, undefined, actor); }

  @Post(':id/approve')
  approve(@Param('id', ParseIntPipe) id: number, @CurrentUser() actor: OperationalActor) { return this.service.transitionApproval(id, WorkOrderStatus.APPROVED, undefined, actor); }

  @Post(':id/reject')
  reject(@Param('id', ParseIntPipe) id: number, @Body() dto: AcceptanceReviewDto, @CurrentUser() actor: OperationalActor) { return this.service.transitionApproval(id, WorkOrderStatus.REJECTED, dto.reason, actor); }

  @Post(':id/claim')
  claim(@Param('id', ParseIntPipe) id: number, @CurrentUser() actor: OperationalActor) { return this.service.claim(id, actor); }

  @Post(':id/driver-accept')
  driverAccept(@Param('id', ParseIntPipe) id: number, @CurrentUser() actor: OperationalActor) { return this.service.driverAccept(id, actor); }

  @Post(':id/cannot-accept')
  cannotAccept(@Param('id', ParseIntPipe) id: number, @Body() dto: WorkReasonDto, @CurrentUser() actor: OperationalActor) { return this.service.cannotAccept(id, dto, actor); }

  @Post(':id/reassign')
  reassign(@Param('id', ParseIntPipe) id: number, @Body() dto: ReassignWorkOrderDto, @CurrentUser() actor: OperationalActor) { return this.service.reassign(id, dto, actor); }

  @Post(':id/execution/start')
  start(@Param('id', ParseIntPipe) id: number, @Body() dto: StartExecutionDto, @CurrentUser() actor: OperationalActor) { return this.service.startExecution(id, dto, actor); }

  @Post(':id/execution/handover')
  handover(@Param('id', ParseIntPipe) id: number, @Body() dto: HandoverExecutionDto, @CurrentUser() actor: OperationalActor) { return this.service.handoverExecution(id, dto, actor); }

  @Post(':id/execution/finish')
  finish(@Param('id', ParseIntPipe) id: number, @Body() dto: FinishExecutionDto, @CurrentUser() actor: OperationalActor) { return this.service.finishExecution(id, dto, actor); }

  @Post(':id/submit-acceptance')
  submitAcceptance(@Param('id', ParseIntPipe) id: number, @CurrentUser() actor: OperationalActor) { return this.service.submitAcceptance(id, actor); }

  @Post(':id/acceptance/approve')
  approveAcceptance(@Param('id', ParseIntPipe) id: number, @Body() dto: AcceptanceReviewDto, @CurrentUser() actor: OperationalActor) { return this.service.reviewAcceptance(id, true, dto.reason, actor); }

  @Post(':id/acceptance/reject')
  rejectAcceptance(@Param('id', ParseIntPipe) id: number, @Body() dto: AcceptanceReviewDto, @CurrentUser() actor: OperationalActor) { return this.service.reviewAcceptance(id, false, dto.reason, actor); }

  @Post(':id/cancel')
  cancel(@Param('id', ParseIntPipe) id: number, @Body() dto: AcceptanceReviewDto, @CurrentUser() actor: OperationalActor) { return this.service.cancel(id, dto.reason, actor); }

  @Post(':id/close')
  close(@Param('id', ParseIntPipe) id: number, @CurrentUser() actor: OperationalActor) { return this.service.close(id, actor); }
}
