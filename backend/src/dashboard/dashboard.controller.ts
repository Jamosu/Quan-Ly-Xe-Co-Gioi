import { Controller, Get, ParseIntPipe, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Unit } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { OperationalActor } from '../common/utils/operational-access';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { DashboardService } from './dashboard.service';

@ApiTags('Dashboard - Báo Cáo Hợp Nhất Ban Lãnh Đạo')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('overview')
  @ApiOperation({
    summary:
      'Tổng quan điều hành toàn KLH (5 Thẻ KPI: Đội xe, Năng suất làm đất, Nhiên liệu, Nông cụ & Cảnh báo khẩn)',
  })
  @ApiQuery({ name: 'unit', enum: Unit, required: false })
  @ApiQuery({ name: 'complexCode', type: String, required: false })
  async getOverview(@Query('unit') unit: Unit | undefined, @Query('complexCode') complexCode: string | undefined, @Query('managementUnitId') managementUnitId: string | undefined, @CurrentUser() actor: OperationalActor) {
    return this.dashboardService.getExecutiveOverview(unit, complexCode, managementUnitId ? Number(managementUnitId) : undefined, actor);
  }

  @Get('live-fleet')
  @ApiOperation({ summary: 'Vị trí trực tuyến toàn bộ thiết bị trên không ảnh vệ tinh GPS' })
  @ApiQuery({ name: 'unit', enum: Unit, required: false })
  @ApiQuery({ name: 'complexCode', type: String, required: false })
  async getLiveFleet(@Query('unit') unit: Unit | undefined, @Query('complexCode') complexCode: string | undefined, @Query('managementUnitId') managementUnitId: string | undefined, @CurrentUser() actor: OperationalActor) {
    return this.dashboardService.getLiveFleetMap(unit, complexCode, managementUnitId ? Number(managementUnitId) : undefined, actor);
  }

  @Get('manager')
  @ApiOperation({ summary: 'Dashboard đội trưởng cơ giới theo đúng một khu vực quản lý' })
  async getManagerDashboard(
    @Query('managementUnitId', ParseIntPipe) managementUnitId: number,
    @Query('date') date: string | undefined,
    @CurrentUser() actor: OperationalActor,
  ) {
    return this.dashboardService.getManagerDashboard(managementUnitId, date, actor);
  }
}
