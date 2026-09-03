import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Unit } from '@prisma/client';
import { Public } from '../common/decorators/public.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { DashboardService } from './dashboard.service';

@ApiTags('Dashboard - Báo Cáo Hợp Nhất Ban Lãnh Đạo')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Public()
  @Get('overview')
  @ApiOperation({
    summary:
      'Tổng quan điều hành toàn KLH (5 Thẻ KPI: Đội xe, Năng suất làm đất, Nhiên liệu, Nông cụ & Cảnh báo khẩn)',
  })
  @ApiQuery({ name: 'unit', enum: Unit, required: false })
  @ApiQuery({ name: 'complexCode', type: String, required: false })
  async getOverview(@Query('unit') unit?: Unit, @Query('complexCode') complexCode?: string) {
    return this.dashboardService.getExecutiveOverview(unit, complexCode);
  }

  @Public()
  @Get('live-fleet')
  @ApiOperation({ summary: 'Vị trí trực tuyến toàn bộ 168 thiết bị trên không ảnh vệ tinh GPS' })
  @ApiQuery({ name: 'unit', enum: Unit, required: false })
  async getLiveFleet(@Query('unit') unit?: Unit) {
    return this.dashboardService.getLiveFleetMap(unit);
  }
}
