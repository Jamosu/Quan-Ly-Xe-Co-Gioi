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
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CompleteMaintenanceDto } from './dto/complete-maintenance.dto';
import { CreateMaintenanceDto } from './dto/create-maintenance.dto';
import { CreateOwedPartDto } from './dto/create-owed-part.dto';
import { MaintenanceFilterDto } from './dto/maintenance-filter.dto';
import { MaintenanceService } from './maintenance.service';

@ApiTags('Maintenance 250h - Bảo Dưỡng Định Kỳ, 12 Checklist & Nợ Phụ Tùng')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('maintenance')
export class MaintenanceController {
  constructor(private readonly maintenanceService: MaintenanceService) {}

  @Post('records')
  @Roles(Role.SUPER_ADMIN, Role.WORKSHOP_MANAGER)
  @ApiOperation({ summary: 'Tạo phiếu bảo dưỡng định kỳ 250h' })
  async createRecord(
    @Body() dto: CreateMaintenanceDto,
    @CurrentUser('id') technicianId: number,
  ) {
    return this.maintenanceService.createRecord(dto, technicianId);
  }

  @Get('records')
  @ApiOperation({ summary: 'Danh sách phiếu bảo dưỡng định kỳ' })
  async findAllRecords(@Query() filter: MaintenanceFilterDto) {
    return this.maintenanceService.findAllRecords(filter);
  }

  @Get('upcoming-schedule')
  @ApiOperation({ summary: 'Lịch nhắc bảo dưỡng theo 3 mốc Xanh / Vàng (50-30h) / Đỏ (<20h)' })
  async getUpcomingSchedule() {
    return this.maintenanceService.getUpcomingSchedule();
  }

  @Get('records/:id')
  @ApiOperation({ summary: 'Chi tiết phiếu bảo dưỡng và 12 checklist' })
  async findOneRecord(@Param('id', ParseIntPipe) id: number) {
    return this.maintenanceService.findOneRecord(id);
  }

  @Post('records/:id/complete')
  @Roles(Role.SUPER_ADMIN, Role.WORKSHOP_MANAGER)
  @ApiOperation({
    summary: 'Hoàn tất 12 checklist (Tự động liên thông tạo Phiếu Sửa Chữa #SC nếu phát hiện hư hỏng)',
  })
  async completeMaintenance(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CompleteMaintenanceDto,
    @CurrentUser('id') technicianId: number,
  ) {
    return this.maintenanceService.completeMaintenance(id, dto, technicianId);
  }

  // Nợ phụ tùng
  @Post('owed-parts')
  @Roles(Role.SUPER_ADMIN, Role.WORKSHOP_MANAGER)
  @ApiOperation({ summary: 'Ghi chú nợ vật tư phụ tùng lọc tinh/dầu đợt sau' })
  async createOwedPartNote(@Body() dto: CreateOwedPartDto) {
    return this.maintenanceService.createOwedPartNote(dto);
  }

  @Get('owed-parts')
  @ApiOperation({ summary: 'Danh sách nợ vật tư đợt sau của các xe' })
  async findAllOwedParts(@Query('isResolved') isResolved?: boolean) {
    return this.maintenanceService.findAllOwedParts(isResolved);
  }

  @Patch('owed-parts/:id/resolve')
  @Roles(Role.SUPER_ADMIN, Role.WORKSHOP_MANAGER)
  @ApiOperation({ summary: 'Xác nhận đã bù xong phụ tùng nợ' })
  async resolveOwedPart(@Param('id', ParseIntPipe) id: number) {
    return this.maintenanceService.resolveOwedPart(id);
  }
}
