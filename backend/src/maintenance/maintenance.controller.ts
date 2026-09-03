import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CompleteMaintenanceDto } from './dto/complete-maintenance.dto';
import { CreateMaintenanceDto } from './dto/create-maintenance.dto';
import { CreateOwedPartDto } from './dto/create-owed-part.dto';
import { MaintenanceFilterDto } from './dto/maintenance-filter.dto';
import { MaintenanceService } from './maintenance.service';

@ApiTags('Maintenance 250h - Bảo Dưỡng Định Kỳ, 12 Checklist & Nợ Phụ Tùng')
@Controller('maintenance')
export class MaintenanceController {
  constructor(private readonly maintenanceService: MaintenanceService) {}

  @Public()
  @Post('records')
  @ApiOperation({ summary: 'Tạo phiếu bảo dưỡng định kỳ 250h' })
  async createRecord(
    @Body() dto: CreateMaintenanceDto,
    @CurrentUser('id') technicianId?: number,
  ) {
    return this.maintenanceService.createRecord(dto, technicianId || 1);
  }

  @Public()
  @Get('records')
  @ApiOperation({ summary: 'Danh sách phiếu bảo dưỡng định kỳ' })
  async findAllRecords(@Query() filter: MaintenanceFilterDto) {
    return this.maintenanceService.findAllRecords(filter);
  }

  @Public()
  @Get('upcoming-schedule')
  @ApiOperation({ summary: 'Lịch nhắc bảo dưỡng theo 3 mốc Xanh / Vàng (50-30h) / Đỏ (<20h)' })
  async getUpcomingSchedule() {
    return this.maintenanceService.getUpcomingSchedule();
  }

  @Public()
  @Get('records/:id')
  @ApiOperation({ summary: 'Chi tiết phiếu bảo dưỡng và 12 checklist' })
  async findOneRecord(@Param('id', ParseIntPipe) id: number) {
    return this.maintenanceService.findOneRecord(id);
  }

  @Public()
  @Post('records/:id/complete')
  @ApiOperation({
    summary: 'Hoàn tất 12 checklist (Tự động liên thông tạo Phiếu Sửa Chữa #SC nếu phát hiện hư hỏng)',
  })
  async completeMaintenance(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CompleteMaintenanceDto,
    @CurrentUser('id') technicianId?: number,
  ) {
    return this.maintenanceService.completeMaintenance(id, dto, technicianId || 1);
  }

  @Public()
  @Post('owed-parts')
  @ApiOperation({ summary: 'Ghi chú nợ vật tư phụ tùng lọc tinh/dầu đợt sau' })
  async createOwedPartNote(@Body() dto: CreateOwedPartDto) {
    return this.maintenanceService.createOwedPartNote(dto);
  }

  @Public()
  @Get('owed-parts')
  @ApiOperation({ summary: 'Danh sách nợ vật tư đợt sau của các xe' })
  async findAllOwedParts(@Query('isResolved') isResolved?: boolean) {
    return this.maintenanceService.findAllOwedParts(isResolved);
  }

  @Public()
  @Patch('owed-parts/:id/resolve')
  @ApiOperation({ summary: 'Xác nhận đã bù xong phụ tùng nợ' })
  async resolveOwedPart(@Param('id', ParseIntPipe) id: number) {
    return this.maintenanceService.resolveOwedPart(id);
  }
}
