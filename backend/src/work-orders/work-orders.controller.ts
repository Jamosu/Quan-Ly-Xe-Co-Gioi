import { Body, Controller, Get, Param, ParseEnumPipe, ParseIntPipe, Patch, Post, Query, Res, StreamableFile, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { OperationalActor } from '../common/utils/operational-access';
import { Role, WorkOrderStatus } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import {
  AcceptanceReviewDto,
  AssignWorkOrderDto,
  ClaimWorkOrderDto,
  FinishExecutionDto,
  HandoverExecutionDto,
  JourneyAction,
  JourneyActionDto,
  ReassignWorkOrderDto,
  StartExecutionDto,
  WorkReasonDto,
} from './dto/work-order-actions.dto';
import { PrepareWorkOrderDto } from './dto/prepare-work-order.dto';
import { PreparationContextDto } from './dto/preparation-context.dto';
import { WorkOrdersService } from './work-orders.service';

@ApiTags('Operational Work Orders - Vòng đời công việc')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('work-orders')
export class WorkOrdersController {
  constructor(private readonly service: WorkOrdersService) {}

  @Post('manual')
  @Roles(Role.SUPER_ADMIN, Role.DISPATCHER, Role.FARM_MANAGER)
  createManual(@Body() dto: PrepareWorkOrderDto, @CurrentUser() actor: OperationalActor) { return this.service.createManual(dto, actor); }

  @Get('preparation-context')
  @Roles(Role.SUPER_ADMIN, Role.DISPATCHER, Role.FARM_MANAGER)
  preparationContext(@Query() dto: PreparationContextDto, @CurrentUser() actor: OperationalActor) {
    return this.service.preparationContext(dto, actor);
  }

  @Patch(':id/preparation')
  @Roles(Role.SUPER_ADMIN, Role.DISPATCHER, Role.FARM_MANAGER)
  prepare(@Param('id', ParseIntPipe) id: number, @Body() dto: PrepareWorkOrderDto, @CurrentUser() actor: OperationalActor) { return this.service.prepare(id, dto, actor); }

  @Get()
  findAll(@Query('status') status: string | undefined, @Query('type') type: string | undefined, @CurrentUser() actor: OperationalActor) { return this.service.findAll(status, type, actor); }

  @Get('evidence/files/:filename')
  async evidenceFile(@Param('filename') filename: string, @Res({ passthrough: true }) response: Response) {
    const file = await this.service.readEvidenceFile(filename);
    response.setHeader('Content-Type', file.mimeType);
    response.setHeader('Cache-Control', 'private, max-age=86400');
    return new StreamableFile(file.buffer);
  }

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
  claim(@Param('id', ParseIntPipe) id: number, @Body() dto: ClaimWorkOrderDto, @CurrentUser() actor: OperationalActor) { return this.service.claim(id, dto, actor); }

  @Get(':id/claim-options')
  claimOptions(@Param('id', ParseIntPipe) id: number, @CurrentUser() actor: OperationalActor) { return this.service.claimOptions(id, actor); }

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

  @Post(':id/evidence/upload')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  uploadEvidence(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
    @Body('type') type: string,
    @Body('capturedAt') capturedAt: string | undefined,
    @CurrentUser() actor: OperationalActor,
  ) { return this.service.uploadEvidence(id, file, type, capturedAt, actor); }

  @Post(':id/journey/:action')
  journeyAction(
    @Param('id', ParseIntPipe) id: number,
    @Param('action', new ParseEnumPipe(JourneyAction)) action: JourneyAction,
    @Body() dto: JourneyActionDto,
    @CurrentUser() actor: OperationalActor,
  ) { return this.service.journeyAction(id, action, dto, actor); }

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
