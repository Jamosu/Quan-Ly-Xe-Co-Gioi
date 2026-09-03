import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { DriverKpiService } from './driver-kpi.service';
import { CalculateKpiDto } from './dto/calculate-kpi.dto';
import { KpiFilterDto } from './dto/kpi-filter.dto';

@ApiTags('Driver KPI - Đánh Giá Năng Suất & Thi Đua Tài Xế')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('driver-kpi')
export class DriverKpiController {
  constructor(private readonly driverKpiService: DriverKpiService) {}

  @Public()
  @Post('calculate')
  @Roles(Role.SUPER_ADMIN, Role.DISPATCHER)
  @ApiOperation({
    summary:
      'Chấm điểm KPI tài xế tự động (Số chuyến 25% + Km 25% + Giờ máy 25% + Tiết kiệm dầu 25%)',
  })
  async calculateKpi(@Body() dto: CalculateKpiDto) {
    return this.driverKpiService.calculateKpi(dto);
  }

  @Public()
  @Get()
  @ApiOperation({ summary: 'Bảng xếp hạng thi đua tài xế theo tháng' })
  async findAll(@Query() filter: KpiFilterDto) {
    return this.driverKpiService.findAll(filter);
  }

  @Public()
  @Get('leaderboard-summary')
  @ApiOperation({ summary: 'Báo cáo tổng kết thi đua, phân bổ Hạng A/B/C/D & Top 5 tài xế tiêu biểu' })
  async getLeaderboardSummary(@Query('monthYear') monthYear?: string) {
    return this.driverKpiService.getLeaderboardSummary(monthYear);
  }

  @Public()
  @Get('driver/:driverId')
  @ApiOperation({ summary: 'Xem lịch sử điểm KPI & thưởng thi đua của từng tài xế' })
  async findByDriverId(@Param('driverId', ParseIntPipe) driverId: number) {
    return this.driverKpiService.findByDriverId(driverId);
  }
}
