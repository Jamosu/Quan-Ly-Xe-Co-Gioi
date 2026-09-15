import { Body, Controller, Get, Param, ParseEnumPipe, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { WorkshopDocumentType } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { OperationalActor } from '../common/utils/operational-access';
import {
  ConfirmWorkshopCandidatesDto,
  CreateWorkshopRequestDto,
  UpdateWorkshopDocumentDto,
  UpdateWorkshopRequestDto,
  WorkshopCandidateFilterDto,
  WorkshopRequestFilterDto,
} from './dto/workshop.dto';
import { WorkshopService } from './workshop.service';

@ApiTags('Workshop - Yêu cầu bảo dưỡng và sửa chữa thống nhất')
@Controller('workshop')
export class WorkshopController {
  constructor(private readonly workshop: WorkshopService) {}

  @Get('requests')
  findAll(@Query() filter: WorkshopRequestFilterDto, @CurrentUser() actor: OperationalActor) {
    return this.workshop.findAll(filter, actor);
  }

  @Get('requests/summary')
  summary(@CurrentUser() actor: OperationalActor) { return this.workshop.summary(actor); }

  @Get('candidates')
  candidates(@Query() filter: WorkshopCandidateFilterDto, @CurrentUser() actor: OperationalActor) {
    return this.workshop.findCandidates(filter, actor);
  }

  @Post('candidates/confirm')
  @ApiOperation({ summary: 'Xác nhận một hoặc nhiều tài sản trong hàng chờ thành yêu cầu xưởng' })
  confirm(@Body() dto: ConfirmWorkshopCandidatesDto, @CurrentUser() actor: OperationalActor) {
    return this.workshop.confirmCandidates(dto, actor);
  }

  @Post('requests')
  create(@Body() dto: CreateWorkshopRequestDto, @CurrentUser() actor: OperationalActor) {
    return this.workshop.create(dto, actor);
  }

  @Get('requests/:id')
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() actor: OperationalActor) {
    return this.workshop.findOne(id, actor);
  }

  @Patch('requests/:id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateWorkshopRequestDto, @CurrentUser() actor: OperationalActor) {
    return this.workshop.update(id, dto, actor);
  }

  @Patch('requests/:id/documents/:type')
  updateDocument(
    @Param('id', ParseIntPipe) id: number,
    @Param('type', new ParseEnumPipe(WorkshopDocumentType)) type: WorkshopDocumentType,
    @Body() dto: UpdateWorkshopDocumentDto,
    @CurrentUser() actor: OperationalActor,
  ) {
    return this.workshop.updateDocument(id, type, dto, actor);
  }
}
