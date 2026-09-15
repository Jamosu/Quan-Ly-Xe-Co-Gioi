import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CreateSosAlertDto } from './dto/create-sos-alert.dto';
import { AcceptTaskDto } from './dto/accept-task.dto';
import { FinishTripDto } from './dto/finish-trip.dto';
import { StartTripDto } from './dto/start-trip.dto';
import { MobileDriverService } from './mobile-driver.service';
import { ReportIncidentDto } from './dto/report-incident.dto';

@ApiTags('Mobile Driver App - API Ứng Dụng Di Động Dành Cho Tài Xế')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('mobile/driver')
export class MobileDriverController {
  constructor(private readonly mobileDriverService: MobileDriverService) {}

  @Get('assigned-tasks')
  @ApiOperation({
    summary: 'Lấy danh sách các lệnh điều xe, vận đơn, chuyến TMR được phân công cho tài xế',
  })
  async getAssignedTasks(@CurrentUser('id') driverId: number) {
    return this.mobileDriverService.getAssignedTasks(driverId);
  }

  @Post('start-trip')
  @ApiOperation({ summary: 'Bắt đầu chuyến đi: Nhập ODO bắt đầu ca & kích hoạt GPS' })
  async startTrip(
    @CurrentUser('id') driverId: number,
    @Body() dto: StartTripDto,
  ) {
    return this.mobileDriverService.startTrip(driverId, dto);
  }

  @Post('accept-task')
  @ApiOperation({ summary: 'Tài xế xác nhận nhận lệnh được phân công' })
  async acceptTask(@CurrentUser('id') driverId: number, @Body() dto: AcceptTaskDto) {
    return this.mobileDriverService.acceptTask(driverId, dto);
  }

  @Post('finish-trip')
  @ApiOperation({ summary: 'Kết thúc chuyến đi: Nhập ODO kết thúc & báo cáo khối lượng hoàn thành' })
  async finishTrip(
    @CurrentUser('id') driverId: number,
    @Body() dto: FinishTripDto,
  ) {
    return this.mobileDriverService.finishTrip(driverId, dto);
  }

  @Post('sos-alert')
  @ApiOperation({ summary: 'Báo sự cố khẩn cấp 1 chạm SOS kèm vị trí GPS và hình ảnh hiện trường' })
  async createSosAlert(
    @CurrentUser('id') driverId: number,
    @Body() dto: CreateSosAlertDto,
  ) {
    return this.mobileDriverService.createSosAlert(driverId, dto);
  }

  @Post('incidents')
  @ApiOperation({ summary: 'Báo hỏng xe hoặc thiết bị phụ trợ đang được phân công' })
  async reportIncident(
    @CurrentUser('id') driverId: number,
    @Body() dto: ReportIncidentDto,
  ) {
    return this.mobileDriverService.reportIncident(driverId, dto);
  }

  @Get('my-kpi')
  @ApiOperation({ summary: 'Tra cứu điểm số KPI & xếp hạng thi đua cá nhân' })
  async getMyKpi(
    @CurrentUser('id') driverId: number,
    @Query('monthYear') monthYear?: string,
  ) {
    return this.mobileDriverService.getMyKpi(driverId, monthYear);
  }

  @Get('alerts')
  @ApiOperation({ summary: 'Lấy danh sách thông báo và cảnh báo cho tài xế' })
  async getAlerts(@CurrentUser('id') driverId: number) {
    return this.mobileDriverService.getDriverAlerts(driverId);
  }

  @Post('schedule-change')
  @ApiOperation({ summary: 'Gửi yêu cầu xin điều chỉnh lịch thực hiện nhiệm vụ' })
  async scheduleChange(
    @CurrentUser('id') driverId: number,
    @Body() dto: any,
  ) {
    return this.mobileDriverService.requestScheduleChange(driverId, dto);
  }

  @Post('transfer-request')
  @ApiOperation({ summary: 'Gửi yêu cầu bàn giao / chuyển nhiệm vụ cho người khác' })
  async transferRequest(
    @CurrentUser('id') driverId: number,
    @Body() dto: any,
  ) {
    return this.mobileDriverService.requestTransfer(driverId, dto);
  }

  @Post('progress')
  @ApiOperation({ summary: 'Cập nhật tiến độ hoàn thành công việc hiện trường' })
  async updateProgress(
    @CurrentUser('id') driverId: number,
    @Body() dto: any,
  ) {
    return this.mobileDriverService.updateProgress(driverId, dto);
  }
}
