import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { AllowAnonymous } from '../common/decorators/public.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AlertsService } from './alerts.service';

@ApiTags('Alerts - Trung Tâm Cảnh Báo Điều Hành')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('alerts')
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

  @AllowAnonymous()
  @Get()
  @ApiOperation({ summary: 'Lấy danh sách cảnh báo điều hành (SOS, quá hạn bảo dưỡng, vi phạm)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Số lượng bản ghi' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Số trang' })
  @ApiQuery({ name: 'complexCode', required: false, type: String, description: 'Mã khu liên hợp' })
  async findAll(
    @Query('limit') limit?: number,
    @Query('page') page?: number,
    @Query('complexCode') complexCode?: string,
  ) {
    return this.alertsService.findAll({ limit, page, complexCode });
  }
}
