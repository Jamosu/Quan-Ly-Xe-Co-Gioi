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
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { AttachImplementDto } from './dto/attach-implement.dto';
import { CreateImplementDto } from './dto/create-implement.dto';
import { DetachImplementDto } from './dto/detach-implement.dto';
import { ImplementFilterDto } from './dto/implement-filter.dto';
import { UpdateImplementDto } from './dto/update-implement.dto';
import { ImplementsService } from './implements.service';

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

  @Public()
  @Get()
  @ApiOperation({ summary: 'Danh mục 694 nông cụ & thiết bị đính kèm (Lọc theo chủng loại, trạng thái, độ mòn)' })
  async findAll(@Query() filter: ImplementFilterDto) {
    return this.implementsService.findAll(filter);
  }

  @Public()
  @Get('statistics')
  @ApiOperation({ summary: 'Thống kê tổng quan nông cụ (Đang gắn, Tồn kho, Cần mài/thay chảo)' })
  async getStatistics() {
    return this.implementsService.getStatistics();
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Xem chi tiết nông cụ và lịch sử tháo/lắp vào máy kéo' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.implementsService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.SUPER_ADMIN, Role.DISPATCHER, Role.FARM_MANAGER)
  @ApiOperation({ summary: 'Cập nhật thông tin nông cụ' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateImplementDto,
  ) {
    return this.implementsService.update(id, dto);
  }

  @Post(':id/attach')
  @ApiOperation({ summary: 'Gắn nông cụ vào máy kéo (Ghi nhận độ mòn startWearMm)' })
  async attachToVehicle(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AttachImplementDto,
    @CurrentUser('id') actorId: number,
  ) {
    return this.implementsService.attachToVehicle(id, dto, actorId);
  }

  @Post(':id/detach')
  @ApiOperation({ summary: 'Tháo nông cụ về kho (Ghi nhận độ mòn endWearMm & đánh giá hao mòn)' })
  async detachFromVehicle(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: DetachImplementDto,
    @CurrentUser('id') actorId: number,
  ) {
    return this.implementsService.detachFromVehicle(id, dto, actorId);
  }

  @Delete(':id')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Xóa nông cụ' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.implementsService.remove(id);
  }
}
