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
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import 'multer';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Role, Unit } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { AttachImplementDto } from './dto/attach-implement.dto';
import { CreateImplementDto } from './dto/create-implement.dto';
import { DetachImplementDto } from './dto/detach-implement.dto';
import { ImplementFilterDto } from './dto/implement-filter.dto';
import { UpdateImplementDto } from './dto/update-implement.dto';
import { ImplementsService } from './implements.service';
import { OperationalActor } from '../common/utils/operational-access';

@ApiTags('Agricultural Implements - Quản Lý 142 Nông Cụ Phụ Trợ')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('implements')
export class ImplementsController {
  constructor(private readonly implementsService: ImplementsService) {}

  @Post()
  @Roles(Role.SUPER_ADMIN, Role.DISPATCHER, Role.FARM_MANAGER)
  @ApiOperation({ summary: 'Khai báo nông cụ mới (Dàn cày, Dàn bừa, Dàn rải phân...)' })
  async create(@Body() dto: CreateImplementDto) {
    return this.implementsService.create(dto);
  }

  @Post('import')
  @Roles(Role.SUPER_ADMIN, Role.DISPATCHER, Role.FARM_MANAGER)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Import thiết bị từ file Excel — tự động map NHOM_TB → usageMode (Nông cụ/Công trình/Vận hành)' })
  @ApiResponse({ status: 200, description: 'Số dòng created/updated/skipped và danh sách lỗi.' })
  async importWorkbook(
    @UploadedFile() file: Express.Multer.File,
    @Query('unit') unit?: Unit,
  ) {
    if (!file?.buffer) throw new Error('Không tìm thấy file. Gửi multipart/form-data với trường "file".');
    return this.implementsService.importFromWorkbook(file.buffer, unit);
  }

  @Get()
  @ApiOperation({ summary: 'Danh mục 694 nông cụ & thiết bị đính kèm (Lọc theo chủng loại, trạng thái, độ mòn)' })
  async findAll(@Query() filter: ImplementFilterDto, @CurrentUser() actor: OperationalActor) {
    return this.implementsService.findAll(filter, actor);
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Thống kê tổng quan nông cụ (Đang gắn, Tồn kho, Cần mài/thay chảo)' })
  async getStatistics(@Query() filter: ImplementFilterDto, @CurrentUser() actor: OperationalActor) {
    return this.implementsService.getStatistics(filter, actor);
  }

  @Get('filter-options')
  @ApiOperation({ summary: 'Danh mục bộ lọc chuẩn cho thiết bị và nông cụ' })
  async getFilterOptions(@Query() filter: ImplementFilterDto, @CurrentUser() actor: OperationalActor) {
    return this.implementsService.getFilterOptions(filter, actor);
  }

  @Get(':id/compatible-vehicles')
  @ApiOperation({ summary: 'Danh sách xe đúng chủng loại có thể nhận thiết bị' })
  async compatibleVehicles(@Param('id', ParseIntPipe) id: number, @Query('unit') unit: Unit | undefined, @CurrentUser() actor: OperationalActor) {
    return this.implementsService.compatibleVehicles(id, unit, actor);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Xem chi tiết nông cụ và lịch sử tháo/lắp vào máy kéo' })
  async findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() actor: OperationalActor) {
    return this.implementsService.findOne(id, actor);
  }

  @Patch(':id')
  @Roles(Role.SUPER_ADMIN, Role.DISPATCHER, Role.FARM_MANAGER)
  @ApiOperation({ summary: 'Cập nhật thông tin nông cụ' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateImplementDto,
    @CurrentUser() actor: OperationalActor,
  ) {
    return this.implementsService.update(id, dto, actor);
  }

  @Post(':id/attach')
  @Roles(Role.SUPER_ADMIN, Role.DISPATCHER, Role.FARM_MANAGER)
  @ApiOperation({ summary: 'Gắn nông cụ vào máy kéo (Ghi nhận độ mòn startWearMm)' })
  async attachToVehicle(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AttachImplementDto,
    @CurrentUser() actor: OperationalActor,
  ) {
    return this.implementsService.attachToVehicle(id, dto, actor);
  }

  @Post(':id/detach')
  @Roles(Role.SUPER_ADMIN, Role.DISPATCHER, Role.FARM_MANAGER)
  @ApiOperation({ summary: 'Tháo nông cụ về kho (Ghi nhận độ mòn endWearMm & đánh giá hao mòn)' })
  async detachFromVehicle(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: DetachImplementDto,
    @CurrentUser() actor: OperationalActor,
  ) {
    return this.implementsService.detachFromVehicle(id, dto, actor);
  }

  @Delete(':id')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Xóa nông cụ' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.implementsService.remove(id);
  }
}
