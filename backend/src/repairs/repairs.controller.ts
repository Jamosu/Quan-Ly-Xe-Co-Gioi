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
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CreateRepairDto } from './dto/create-repair.dto';
import { RepairFilterDto } from './dto/repair-filter.dto';
import { UpdateRepairDto } from './dto/update-repair.dto';
import { RepairsService } from './repairs.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { OperationalActor } from '../common/utils/operational-access';

@ApiTags('Repairs & Workshop - Xưởng Sửa Chữa TT BTSC & Cứu Hộ Hiện Trường')
@Controller('repairs')
export class RepairsController {
  constructor(private readonly repairsService: RepairsService) {}

  @Post()
  @ApiOperation({ summary: 'Tiếp nhận phiếu sửa chữa mới (Tiểu tu, Trung tu, Đại tu, Cứu hộ SOS)' })
  async create(@Body() dto: CreateRepairDto, @CurrentUser() actor: OperationalActor) {
    return this.repairsService.create(dto, actor);
  }

  @Get()
  @ApiOperation({ summary: 'Danh sách phiếu sửa chữa tại xưởng TT BTSC' })
  async findAll(@Query() filter: RepairFilterDto, @CurrentUser() actor: OperationalActor) {
    return this.repairsService.findAll(filter, actor);
  }

  @Get('cost-report')
  @ApiOperation({ summary: 'Thống kê tổng chi phí dự toán & thực tế sửa chữa' })
  async getCostReport(@CurrentUser() actor: OperationalActor) {
    return this.repairsService.getCostReport(actor);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Xem chi tiết phiếu sửa chữa' })
  async findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() actor: OperationalActor) {
    return this.repairsService.findOne(id, actor);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Cập nhật tiến độ sửa chữa, phụ tùng và chi phí thực tế' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRepairDto,
    @CurrentUser() actor: OperationalActor,
  ) {
    return this.repairsService.update(id, dto, actor);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Hủy phiếu sửa chữa' })
  async remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() actor: OperationalActor) {
    return this.repairsService.remove(id, actor);
  }
}
