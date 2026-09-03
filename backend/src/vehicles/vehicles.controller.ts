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
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateTelemetryDto } from './dto/update-telemetry.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { VehicleFilterDto } from './dto/vehicle-filter.dto';
import { VehicleFilterOptionsDto } from './dto/vehicle-filter-options.dto';
import { VehiclesService } from './vehicles.service';

@ApiTags('Vehicles - Quản lý Xe Cơ Giới & PTVC')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('vehicles')
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  @Public()
  @Post()
  @Roles(Role.SUPER_ADMIN, Role.DISPATCHER)
  @ApiOperation({ summary: 'Thêm phương tiện / xe cơ giới mới vào hệ thống' })
  async create(@Body() dto: CreateVehicleDto) {
    return this.vehiclesService.create(dto);
  }

  @Public()
  @Get()
  @ApiOperation({ summary: 'Lấy danh sách xe với phân trang và bộ lọc chạy tại MySQL' })
  async findAll(@Query() filter: VehicleFilterDto) {
    return this.vehiclesService.findAll(filter);
  }

  @Public()
  @Get('assignments')
  @ApiOperation({ summary: 'Lấy danh sách xe rút gọn phục vụ phân bổ theo đơn vị' })
  async findAssignments(@Query() filter: VehicleFilterDto) {
    return this.vehiclesService.findAssignments(filter);
  }

  @Public()
  @Get('filter-options')
  @ApiOperation({ summary: 'Lấy metadata bộ lọc xe từ database (hỗ trợ lọc ngữ cảnh dynamic)' })
  @ApiResponse({ status: 200, type: VehicleFilterOptionsDto })
  async getFilterOptions(@Query() filter: VehicleFilterDto) {
    return this.vehiclesService.getFilterOptions(filter);
  }

  @Public()
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

  @Public()
  @Get('statistics')
  @ApiOperation({ summary: 'Thống kê tổng quan tình trạng đội xe (Sẵn sàng, Đang chạy, 250h)' })
  async getStatistics(@Query() filter?: VehicleFilterDto) {
    return this.vehiclesService.getStatistics(filter);
  }

  // --------------------------------------------------------------------------
  // MASTER DATA: MANUFACTURERS & MODELS
  // --------------------------------------------------------------------------
  @Public()
  @Get('manufacturers/list')
  @ApiOperation({ summary: 'Lấy danh sách tất cả hãng sản xuất MMTB' })
  async findAllManufacturers() {
    return this.vehiclesService.findAllManufacturers();
  }

  @Public()
  @Post('manufacturers')
  @Roles(Role.SUPER_ADMIN, Role.DISPATCHER)
  @ApiOperation({ summary: 'Tạo hãng sản xuất mới' })
  async createManufacturer(@Body() body: { name: string; countryName?: string; countryCode?: string }) {
    return this.vehiclesService.createManufacturer(body);
  }

  @Public()
  @Patch('manufacturers/:id')
  @Roles(Role.SUPER_ADMIN, Role.DISPATCHER)
  @ApiOperation({ summary: 'Cập nhật hãng sản xuất' })
  async updateManufacturer(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { name?: string; countryName?: string; countryCode?: string; active?: boolean },
  ) {
    return this.vehiclesService.updateManufacturer(id, body);
  }

  @Public()
  @Delete('manufacturers/:id')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Xóa hãng sản xuất' })
  async deleteManufacturer(@Param('id', ParseIntPipe) id: number) {
    return this.vehiclesService.deleteManufacturer(id);
  }

  @Public()
  @Get('models/list')
  @ApiOperation({ summary: 'Lấy danh sách tất cả model MMTB' })
  async findAllModels(@Query('manufacturerId') manufacturerId?: string) {
    return this.vehiclesService.findAllModels(manufacturerId ? Number(manufacturerId) : undefined);
  }

  @Public()
  @Post('models')
  @Roles(Role.SUPER_ADMIN, Role.DISPATCHER)
  @ApiOperation({ summary: 'Tạo model xe mới' })
  async createModel(@Body() body: { name: string; manufacturerId: number; categoryHint?: any }) {
    return this.vehiclesService.createModel(body);
  }

  @Public()
  @Patch('models/:id')
  @Roles(Role.SUPER_ADMIN, Role.DISPATCHER)
  @ApiOperation({ summary: 'Cập nhật model xe' })
  async updateModel(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { name?: string; manufacturerId?: number; categoryHint?: any; active?: boolean },
  ) {
    return this.vehiclesService.updateModel(id, body);
  }

  @Public()
  @Delete('models/:id')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Xóa model xe' })
  async deleteModel(@Param('id', ParseIntPipe) id: number) {
    return this.vehiclesService.deleteModel(id);
  }

  @Public()
  @Post('catalogs/merge')
  @Roles(Role.SUPER_ADMIN, Role.DISPATCHER)
  @ApiOperation({ summary: 'Gộp các danh mục trùng lặp và chuyển đổi toàn bộ hồ sơ xe liên quan' })
  async mergeCatalogItems(
    @Body() body: { catalogType: string; sourceNames: string[]; targetName: string },
  ) {
    return this.vehiclesService.mergeCatalogItems(body);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Xem chi tiết lý lịch hồ sơ xe và lịch sử bảo dưỡng' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.vehiclesService.findOne(id);
  }

  @Public()
  @Patch(':id')
  @Roles(Role.SUPER_ADMIN, Role.DISPATCHER, Role.WORKSHOP_MANAGER)
  @ApiOperation({ summary: 'Cập nhật thông tin xe cơ giới' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateVehicleDto,
  ) {
    return this.vehiclesService.update(id, dto);
  }

  @Public()
  @Patch(':id/telemetry')
  @ApiOperation({ summary: 'Cập nhật dữ liệu GPS telemetry, ODO, giờ máy (Tự động tính mốc 250h)' })
  async updateTelemetry(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTelemetryDto,
  ) {
    return this.vehiclesService.updateTelemetry(id, dto);
  }

  @Public()
  @Delete(':id')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Xóa phương tiện khỏi hệ thống' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.vehiclesService.remove(id);
  }
}
