import {
  Body,
  Controller,
  Delete,
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
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { ArchiveVehicleDto } from './dto/archive-vehicle.dto';
import { UpdateTelemetryDto } from './dto/update-telemetry.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { VehicleFilterDto } from './dto/vehicle-filter.dto';
import { VehicleFilterOptionsDto } from './dto/vehicle-filter-options.dto';
import { FleetHistoryFilterDto } from './dto/fleet-history-filter.dto';
import { VehiclesService } from './vehicles.service';
import { AvailabilityService } from '../availability/availability.service';
import { TimelineQueryDto } from '../availability/dto/timeline-query.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { OperationalActor } from '../common/utils/operational-access';

@ApiTags('Vehicles - Quản lý Xe Cơ Giới & PTVC')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('vehicles')
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService, private readonly availabilityService: AvailabilityService) {}

  @Get(':id/timeline')
  @ApiOperation({ summary: 'Timeline bận/rảnh và khung giờ phù hợp của xe' })
  timeline(@Param('id', ParseIntPipe) id: number, @Query() query: TimelineQueryDto, @CurrentUser() actor: OperationalActor) {
    return this.availabilityService.vehicleTimeline(id, query.from, query.to, actor, query.excludeWorkOrderId, query.requiredDurationMinutes);
  }

  @Post()
  @Roles(Role.SUPER_ADMIN, Role.DISPATCHER, Role.FARM_MANAGER)
  @ApiOperation({ summary: 'Thêm phương tiện / xe cơ giới mới vào hệ thống' })
  async create(@Body() dto: CreateVehicleDto, @CurrentUser() actor: OperationalActor) {
    return this.vehiclesService.create(dto, actor);
  }

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách xe với phân trang và bộ lọc chạy tại MySQL' })
  async findAll(@Query() filter: VehicleFilterDto, @CurrentUser() actor: OperationalActor) {
    return this.vehiclesService.findAll(filter, actor);
  }

  @Get('assignments')
  @ApiOperation({ summary: 'Lấy danh sách xe rút gọn phục vụ phân bổ theo đơn vị' })
  async findAssignments(@Query() filter: VehicleFilterDto, @CurrentUser() actor: OperationalActor) {
    return this.vehiclesService.findAssignments(filter, actor);
  }

  @Get('filter-options')
  @ApiOperation({ summary: 'Lấy metadata bộ lọc xe từ database (hỗ trợ lọc ngữ cảnh dynamic)' })
  @ApiResponse({ status: 200, type: VehicleFilterOptionsDto })
  async getFilterOptions(@Query() filter: VehicleFilterDto, @CurrentUser() actor: OperationalActor) {
    return this.vehiclesService.getFilterOptions(filter, actor);
  }

  @Get('next-code')
  @ApiOperation({ summary: 'Tự động tạo mã phương tiện tiếp theo tăng dần theo chủng loại xe' })
  async getNextCode(
    @Query('category') category?: string,
    @Query('vehicleTypeId') vehicleTypeId?: string,
    @Query('unit') unit?: string,
  ) {
    return this.vehiclesService.generateNextCode(
      category,
      vehicleTypeId ? Number(vehicleTypeId) : undefined,
      unit,
    );
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Thống kê tổng quan tình trạng đội xe (Sẵn sàng, Đang chạy, 250h)' })
  async getStatistics(@Query() filter: VehicleFilterDto, @CurrentUser() actor: OperationalActor) {
    return this.vehiclesService.getStatistics(filter, actor);
  }

  @Get('sos-alerts')
  @ApiOperation({ summary: 'Lấy danh sách các cảnh báo cứu hộ SOS từ cơ sở dữ liệu' })
  async getSosAlerts() {
    return this.vehiclesService.getSosAlerts();
  }

  @Get('history/events')
  @ApiOperation({ summary: 'Lấy danh sách lịch sử biến động thực tế của phương tiện từ CSDL' })
  async getFleetHistoryEvents(@Query() filter: FleetHistoryFilterDto) {
    return this.vehiclesService.getFleetHistoryEvents(filter);
  }

  // --------------------------------------------------------------------------
  // MASTER DATA: MANUFACTURERS & MODELS
  // --------------------------------------------------------------------------
  @Get('manufacturers/list')
  @ApiOperation({ summary: 'Lấy danh sách tất cả hãng sản xuất MMTB' })
  async findAllManufacturers() {
    return this.vehiclesService.findAllManufacturers();
  }

  @Post('manufacturers')
  @Roles(Role.SUPER_ADMIN, Role.DISPATCHER)
  @ApiOperation({ summary: 'Tạo hãng sản xuất mới' })
  async createManufacturer(@Body() body: { name: string; countryName?: string; countryCode?: string }) {
    return this.vehiclesService.createManufacturer(body);
  }

  @Patch('manufacturers/:id')
  @Roles(Role.SUPER_ADMIN, Role.DISPATCHER)
  @ApiOperation({ summary: 'Cập nhật hãng sản xuất' })
  async updateManufacturer(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { name?: string; countryName?: string; countryCode?: string; active?: boolean },
  ) {
    return this.vehiclesService.updateManufacturer(id, body);
  }

  @Delete('manufacturers/:id')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Xóa hãng sản xuất' })
  async deleteManufacturer(@Param('id', ParseIntPipe) id: number) {
    return this.vehiclesService.deleteManufacturer(id);
  }

  @Get('models/list')
  @ApiOperation({ summary: 'Lấy danh sách tất cả model MMTB' })
  async findAllModels(@Query('manufacturerId') manufacturerId?: string) {
    return this.vehiclesService.findAllModels(manufacturerId ? Number(manufacturerId) : undefined);
  }

  @Post('models')
  @Roles(Role.SUPER_ADMIN, Role.DISPATCHER)
  @ApiOperation({ summary: 'Tạo model xe mới' })
  async createModel(@Body() body: { name: string; manufacturerId: number; categoryHint?: any }) {
    return this.vehiclesService.createModel(body);
  }

  @Patch('models/:id')
  @Roles(Role.SUPER_ADMIN, Role.DISPATCHER)
  @ApiOperation({ summary: 'Cập nhật model xe' })
  async updateModel(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { name?: string; manufacturerId?: number; categoryHint?: any; active?: boolean },
  ) {
    return this.vehiclesService.updateModel(id, body);
  }

  @Delete('models/:id')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Xóa model xe' })
  async deleteModel(@Param('id', ParseIntPipe) id: number) {
    return this.vehiclesService.deleteModel(id);
  }

  @Post('catalogs/merge')
  @Roles(Role.SUPER_ADMIN, Role.DISPATCHER)
  @ApiOperation({ summary: 'Gộp các danh mục trùng lặp và chuyển đổi toàn bộ hồ sơ xe liên quan' })
  async mergeCatalogItems(
    @Body() body: { catalogType: string; sourceNames: string[]; targetName: string },
  ) {
    return this.vehiclesService.mergeCatalogItems(body);
  }

  @Get('lookup')
  @ApiOperation({ summary: 'Tra cứu xe, lệnh hiện tại và Đội trưởng phụ trách theo phạm vi' })
  lookup(
    @Query('query') query: string,
    @Query('managementUnitId') managementUnitId: string | undefined,
    @CurrentUser() actor: OperationalActor,
  ) {
    return this.vehiclesService.lookup(query || '', managementUnitId ? Number(managementUnitId) : undefined, actor);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Xem chi tiết lý lịch hồ sơ xe và lịch sử bảo dưỡng' })
  async findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() actor: OperationalActor) {
    return this.vehiclesService.findOne(id, actor);
  }

  @Patch(':id')
  @Roles(Role.SUPER_ADMIN, Role.DISPATCHER, Role.FARM_MANAGER, Role.WORKSHOP_MANAGER)
  @ApiOperation({ summary: 'Cập nhật thông tin xe cơ giới' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateVehicleDto,
    @CurrentUser() actor: OperationalActor,
  ) {
    return this.vehiclesService.update(id, dto, actor);
  }

  @Patch(':id/telemetry')
  @ApiOperation({ summary: 'Cập nhật GPS, ODO, giờ máy và tính lại các mốc BDC2 theo loại xe' })
  async updateTelemetry(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTelemetryDto,
  ) {
    return this.vehiclesService.updateTelemetry(id, dto);
  }

  @Delete(':id')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Lưu trữ hồ sơ phương tiện; không xóa dữ liệu và lịch sử' })
  async archive(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ArchiveVehicleDto,
    @CurrentUser() actor: OperationalActor,
  ) {
    return this.vehiclesService.archive(id, dto.reason, actor);
  }
}
