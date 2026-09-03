import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { OperationalActor } from '../common/utils/operational-access';
import { ConfirmationFilterDto } from './dto/confirmation-filter.dto';
import { CreateConfirmationDto } from './dto/create-confirmation.dto';
import { OperationConfirmationsService } from './operation-confirmations.service';

@ApiTags('Operation Confirmations')
@Controller('operation-confirmations')
export class OperationConfirmationsController {
  constructor(private service: OperationConfirmationsService) {}

  @Public()
  @Get()
  findAll(@Query() filter: ConfirmationFilterDto, @CurrentUser() actor?: OperationalActor) { return this.service.findAll(filter, actor); }

  @Public()
  @Post()
  create(@Body() dto: CreateConfirmationDto, @CurrentUser() actor?: OperationalActor) { return this.service.create(dto, actor); }

  @Public()
  @Patch(':id/confirm')
  confirm(@Param('id', ParseIntPipe) id: number, @CurrentUser() actor?: OperationalActor) { return this.service.confirm(id, actor); }
}
