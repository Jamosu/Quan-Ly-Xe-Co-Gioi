import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { OperationalActor } from '../common/utils/operational-access';
import { CompleteMaintenanceDto } from './dto/complete-maintenance.dto';
import { CreateMaintenanceDto } from './dto/create-maintenance.dto';
import { CreateMaintenanceStandardDto, UpdateMaintenanceStandardDto } from './dto/maintenance-standard.dto';
import { CreateOwedPartDto } from './dto/create-owed-part.dto';
import { MaintenanceFilterDto } from './dto/maintenance-filter.dto';
import { SubmitBdc1Dto } from './dto/submit-bdc1.dto';
import { MaintenanceService } from './maintenance.service';

@ApiTags('Maintenance - BDC1, BDC2 đa chu kỳ và nợ phụ tùng')
@Controller('maintenance')
export class MaintenanceController {
  constructor(private readonly maintenanceService: MaintenanceService) {}

  @Get('standard-templates')
  @ApiOperation({ summary: 'Bộ mốc giờ máy/km chuẩn để cấu hình theo loại xe' })
  templates() { return this.maintenanceService.getStandardTemplates(); }

  @Get('standards')
  @ApiOperation({ summary: 'Danh sách phiên bản định mức bảo dưỡng theo loại xe' })
  standards(@Query('vehicleTypeId') vehicleTypeId?: string) {
    return this.maintenanceService.listStandards(vehicleTypeId ? Number(vehicleTypeId) : undefined);
  }

  @Post('standards')
  @ApiOperation({ summary: 'Tạo phiên bản định mức bảo dưỡng mới' })
  createStandard(@Body() dto: CreateMaintenanceStandardDto, @CurrentUser() actor: OperationalActor) {
    return this.maintenanceService.createStandard(dto, actor);
  }

  @Patch('standards/:id')
  @ApiOperation({ summary: 'Cập nhật phiên bản định mức chưa kích hoạt' })
  updateStandard(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateMaintenanceStandardDto, @CurrentUser() actor: OperationalActor) {
    return this.maintenanceService.updateStandard(id, dto, actor);
  }

  @Post('standards/:id/activate')
  @ApiOperation({ summary: 'Kích hoạt định mức cho loại xe và giữ lịch sử phiên bản cũ' })
  activateStandard(@Param('id', ParseIntPipe) id: number, @CurrentUser() actor: OperationalActor) {
    return this.maintenanceService.activateStandard(id, actor);
  }

  @Post('bdc1')
  @ApiOperation({ summary: 'Tài xế nộp checklist BDC1 cho ngày vận hành' })
  submitBdc1(@Body() dto: SubmitBdc1Dto, @CurrentUser('id') driverId: number) {
    return this.maintenanceService.submitBdc1(dto, driverId);
  }

  @Get('vehicles/:id/profile')
  @ApiOperation({ summary: 'Định mức, tiến độ và nhật ký bảo dưỡng trong hồ sơ xe' })
  vehicleProfile(@Param('id', ParseIntPipe) id: number) {
    return this.maintenanceService.getVehicleMaintenanceSummary(id);
  }

  @Post('records')
  @ApiOperation({ summary: 'Tạo phiếu BDC2 từ kỳ bảo dưỡng hoặc fallback 250 giờ' })
  createRecord(@Body() dto: CreateMaintenanceDto, @CurrentUser() actor: OperationalActor) {
    return this.maintenanceService.createRecord(dto, actor);
  }

  @Get('records')
  @ApiOperation({ summary: 'Danh sách phiếu bảo dưỡng định kỳ' })
  findAllRecords(@Query() filter: MaintenanceFilterDto, @CurrentUser() actor: OperationalActor) {
    return this.maintenanceService.findAllRecords(filter, actor);
  }

  @Get('upcoming-schedule')
  @ApiOperation({ summary: 'Lịch nhắc BDC2 đa mốc theo Xanh / Vàng / Đỏ' })
  getUpcomingSchedule() { return this.maintenanceService.getUpcomingSchedule(); }

  @Get('records/:id')
  @ApiOperation({ summary: 'Chi tiết phiếu bảo dưỡng và checklist' })
  findOneRecord(@Param('id', ParseIntPipe) id: number) { return this.maintenanceService.findOneRecord(id); }

  @Post('records/:id/complete')
  @ApiOperation({ summary: 'Hoàn tất BDC2 và liên thông sửa chữa khi phát hiện hư hỏng' })
  completeMaintenance(@Param('id', ParseIntPipe) id: number, @Body() dto: CompleteMaintenanceDto, @CurrentUser() actor: OperationalActor) {
    return this.maintenanceService.completeMaintenance(id, dto, actor);
  }

  @Post('owed-parts')
  createOwedPartNote(@Body() dto: CreateOwedPartDto) { return this.maintenanceService.createOwedPartNote(dto); }

  @Get('owed-parts')
  findAllOwedParts(@Query('isResolved') isResolved?: boolean) { return this.maintenanceService.findAllOwedParts(isResolved); }

  @Patch('owed-parts/:id/resolve')
  resolveOwedPart(@Param('id', ParseIntPipe) id: number) { return this.maintenanceService.resolveOwedPart(id); }
}
