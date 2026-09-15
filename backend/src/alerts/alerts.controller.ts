import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { OperationalActor } from '../common/utils/operational-access';
import { AlertsService } from './alerts.service';
import { AlertFilterDto } from './dto/alert-filter.dto';
import { UpdateAlertRuleDto } from './dto/update-alert-rule.dto';
import { UpdateAlertStatusDto } from './dto/update-alert-status.dto';

@ApiTags('Alerts - Trung tâm cảnh báo điều hành')
@ApiBearerAuth()
@Controller('alerts')
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách cảnh báo theo quyền, chưa xem trước và theo mức độ' })
  findAll(@Query() filter: AlertFilterDto, @CurrentUser() actor: OperationalActor) {
    return this.alertsService.findAll(filter, actor);
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Thống kê cảnh báo theo nhóm và thời gian xử lý' })
  statistics(@Query() filter: AlertFilterDto, @CurrentUser() actor: OperationalActor) {
    return this.alertsService.getStatistics(filter, actor);
  }

  @Get('rules')
  @ApiOperation({ summary: 'Danh sách quy tắc cảnh báo đang hoạt động, nháp hoặc tắt' })
  rules() {
    return this.alertsService.getRules();
  }

  @Patch('rules/:id')
  @ApiOperation({ summary: 'Cập nhật quy tắc cảnh báo (chỉ SUPER_ADMIN)' })
  updateRule(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAlertRuleDto,
    @CurrentUser() actor: OperationalActor,
  ) {
    return this.alertsService.updateRule(id, dto, actor);
  }

  @Post('read-all')
  @ApiOperation({ summary: 'Đánh dấu đã xem tất cả cảnh báo thuộc bộ lọc hiện tại' })
  markAllRead(@Query() filter: AlertFilterDto, @CurrentUser() actor: OperationalActor) {
    return this.alertsService.markAllRead(filter, actor);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Đánh dấu một cảnh báo đã xem cho người dùng hiện tại' })
  markRead(@Param('id', ParseIntPipe) id: number, @CurrentUser() actor: OperationalActor) {
    return this.alertsService.markRead(id, actor);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Bắt đầu xử lý, đóng hoặc bỏ qua cảnh báo' })
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAlertStatusDto,
    @CurrentUser() actor: OperationalActor,
  ) {
    return this.alertsService.updateStatus(id, dto, actor);
  }
}
