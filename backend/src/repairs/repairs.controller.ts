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
import { CreateRepairDto } from './dto/create-repair.dto';
import { RepairFilterDto } from './dto/repair-filter.dto';
import { UpdateRepairDto } from './dto/update-repair.dto';
import { RepairsService } from './repairs.service';

@ApiTags('Repairs & Workshop - Xưởng Sửa Chữa TT BTSC & Cứu Hộ Hiện Trường')
@Controller('repairs')
export class RepairsController {
  constructor(private readonly repairsService: RepairsService) {}

  @Public()
  @Post()
  @ApiOperation({ summary: 'Tiếp nhận phiếu sửa chữa mới (Tiểu tu, Trung tu, Đại tu, Cứu hộ SOS)' })
  async create(@Body() dto: CreateRepairDto) {
    return this.repairsService.create(dto);
  }

  @Public()
  @Get()
  @ApiOperation({ summary: 'Danh sách phiếu sửa chữa tại xưởng TT BTSC' })
  async findAll(@Query() filter: RepairFilterDto) {
    return this.repairsService.findAll(filter);
  }

  @Public()
  @Get('cost-report')
  @ApiOperation({ summary: 'Thống kê tổng chi phí dự toán & thực tế sửa chữa' })
  async getCostReport() {
    return this.repairsService.getCostReport();
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Xem chi tiết phiếu sửa chữa' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.repairsService.findOne(id);
  }

  @Public()
  @Patch(':id')
  @ApiOperation({ summary: 'Cập nhật tiến độ sửa chữa, phụ tùng và chi phí thực tế' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRepairDto,
  ) {
    return this.repairsService.update(id, dto);
  }

  @Public()
  @Delete(':id')
  @ApiOperation({ summary: 'Hủy phiếu sửa chữa' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.repairsService.remove(id);
  }
}
