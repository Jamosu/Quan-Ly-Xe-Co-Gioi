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
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import {
  CreateVehicleTypeDto,
  UpdateVehicleTypeDto,
  VehicleTypeFilterDto,
} from './dto/vehicle-type.dto';
import { VehicleTypesService } from './vehicle-types.service';

@ApiTags('Vehicle Types - Danh mục chủng loại MMTB')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('vehicle-types')
export class VehicleTypesController {
  constructor(private readonly service: VehicleTypesService) {}

  @Get()
  @ApiOperation({ summary: 'Danh mục chủng loại xe lấy từ MySQL kèm số lượng thực tế' })
  findAll(@Query() filter: VehicleTypeFilterDto) {
    return this.service.findAll(filter);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết một chủng loại xe' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Post()
  @Roles(Role.SUPER_ADMIN, Role.DISPATCHER)
  @ApiOperation({ summary: 'Tạo chủng loại xe mới' })
  create(@Body() dto: CreateVehicleTypeDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @Roles(Role.SUPER_ADMIN, Role.DISPATCHER)
  @ApiOperation({ summary: 'Cập nhật chủng loại xe' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateVehicleTypeDto,
  ) {
    return this.service.update(id, dto);
  }
}
