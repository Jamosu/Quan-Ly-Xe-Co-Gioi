import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { OperationalActor } from '../common/utils/operational-access';
import { DriverManagementService } from './driver-management.service';
import { AssignDriverManagementDto, CreateDriverManagementScopeDto, CreateDriverManagementUnitDto, CreateManagerAssignmentDto, DriverManagementUnitFilterDto, EndManagerAssignmentDto, ManagerAssignmentFilterDto, UpdateDriverManagementUnitDto } from './dto/driver-management.dto';

@ApiTags('Driver Management - Danh mục hồ sơ tài xế')
@ApiBearerAuth()
@Controller('driver-management')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN, Role.FARM_MANAGER, Role.DISPATCHER, Role.WORKSHOP_MANAGER, Role.FUEL_STOREKEEPER)
export class DriverManagementController {
  constructor(private readonly service: DriverManagementService) {}

  @Get('units')
  @ApiOperation({ summary: 'Danh sách đơn vị chủ quản và Đội/Tổ tài xế' })
  units(@Query() query: DriverManagementUnitFilterDto, @CurrentUser() actor: OperationalActor) { return this.service.findUnits(query, actor); }

  @Post('units')
  @Roles(Role.SUPER_ADMIN, Role.FARM_MANAGER)
  createUnit(@Body() dto: CreateDriverManagementUnitDto, @CurrentUser() actor: OperationalActor) { return this.service.createUnit(dto, actor); }

  @Patch('units/:id')
  @Roles(Role.SUPER_ADMIN, Role.FARM_MANAGER)
  updateUnit(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateDriverManagementUnitDto, @CurrentUser() actor: OperationalActor) { return this.service.updateUnit(id, dto, actor); }

  @Delete('units/:id')
  @Roles(Role.SUPER_ADMIN)
  deleteUnit(@Param('id', ParseIntPipe) id: number, @CurrentUser() actor: OperationalActor) { return this.service.deleteUnit(id, actor); }

  @Post('units/:id/deactivate')
  @Roles(Role.SUPER_ADMIN, Role.FARM_MANAGER)
  deactivate(@Param('id', ParseIntPipe) id: number, @CurrentUser() actor: OperationalActor) { return this.service.deactivateUnit(id, actor); }

  @Get('scopes')
  scopes(@CurrentUser() actor: OperationalActor) { return this.service.listScopes(actor); }

  @Get('managers')
  managers(@Query() query: ManagerAssignmentFilterDto, @CurrentUser() actor: OperationalActor) { return this.service.managerAssignments(query, actor); }

  @Get('managers/unresolved')
  unresolvedManagers(@CurrentUser() actor: OperationalActor) { return this.service.unresolvedManagers(actor); }

  @Post('managers')
  @Roles(Role.SUPER_ADMIN)
  createManager(@Body() dto: CreateManagerAssignmentDto, @CurrentUser() actor: OperationalActor) { return this.service.createManagerAssignment(dto, actor); }

  @Post('managers/:id/end')
  @Roles(Role.SUPER_ADMIN)
  endManager(@Param('id', ParseIntPipe) id: number, @Body() dto: EndManagerAssignmentDto, @CurrentUser() actor: OperationalActor) { return this.service.endManagerAssignment(id, dto, actor); }

  @Post('managers/:id/replace')
  @Roles(Role.SUPER_ADMIN)
  replaceManager(@Param('id', ParseIntPipe) id: number, @Body() dto: CreateManagerAssignmentDto, @CurrentUser() actor: OperationalActor) { return this.service.replaceManagerAssignment(id, dto, actor); }

  @Post('scopes')
  @Roles(Role.SUPER_ADMIN)
  createScope(@Body() dto: CreateDriverManagementScopeDto, @CurrentUser() actor: OperationalActor) { return this.service.createScope(dto, actor); }

  @Get('reconciliation')
  reconciliation(@CurrentUser() actor: OperationalActor) { return this.service.reconciliation(actor); }

  @Post('assignments')
  @Roles(Role.SUPER_ADMIN, Role.FARM_MANAGER)
  assign(@Body() dto: AssignDriverManagementDto, @CurrentUser() actor: OperationalActor) { return this.service.assignDriver(dto, actor); }

  @Get('drivers/:id/assignments')
  history(@Param('id', ParseIntPipe) id: number, @CurrentUser() actor: OperationalActor) { return this.service.assignmentHistory(id, actor); }
}
