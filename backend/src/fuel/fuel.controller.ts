import {
  Body,
  Controller,
  Get,
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
import { CreateWarehouseDto } from './dto/create-warehouse.dto';
import { DispenseFuelDto } from './dto/dispense-fuel.dto';
import { FuelFilterDto } from './dto/fuel-filter.dto';
import { FuelService } from './fuel.service';

@ApiTags('Fuel Management - Quản Lý Kho Bồn Dầu DO & Cấp Phát QR')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('fuel')
export class FuelController {
  constructor(private readonly fuelService: FuelService) {}

  @Post('warehouses')
  @Roles(Role.SUPER_ADMIN, Role.FUEL_STOREKEEPER)
  @ApiOperation({ summary: 'Khai báo kho bồn dầu tĩnh 45.000L hoặc xe bồn lưu động 5.000L' })
  async createWarehouse(@Body() dto: CreateWarehouseDto) {
    return this.fuelService.createWarehouse(dto);
  }

  @Get('warehouses')
  @ApiOperation({ summary: 'Xem danh sách các bồn chứa dầu và tồn kho thực tế' })
  async findAllWarehouses() {
    return this.fuelService.findAllWarehouses();
  }

  @Post('dispense')
  @Roles(Role.SUPER_ADMIN, Role.FUEL_STOREKEEPER)
  @ApiOperation({ summary: 'Cấp phát dầu DO qua mã QR (Tự động đối soát hao hụt & cảnh báo vượt định mức)' })
  async dispenseFuel(
    @Body() dto: DispenseFuelDto,
    @CurrentUser('id') operatorId: number,
  ) {
    return this.fuelService.dispenseFuel(dto, operatorId);
  }

  @Get('tickets')
  @ApiOperation({ summary: 'Danh sách phiếu xuất kho cấp dầu DO' })
  async findAllTickets(@Query() filter: FuelFilterDto) {
    return this.fuelService.findAllTickets(filter);
  }

  @Get('variance-report')
  @ApiOperation({ summary: 'Báo cáo tổng hợp tiêu hao nhiên liệu, đối soát chênh lệch & tỷ lệ tồn kho' })
  async getVarianceReport() {
    return this.fuelService.getVarianceReport();
  }
}
