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
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Role, Unit } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CreateUserDto } from './dto/create-user.dto';
import { CreateDriverProfileDto } from './dto/create-driver-profile.dto';
import { DriverProfileFilterDto } from './dto/driver-profile-filter.dto';
import { UpdateDriverProfileDto } from './dto/update-driver-profile.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';
import { AvailabilityService } from '../availability/availability.service';
import { TimelineQueryDto } from '../availability/dto/timeline-query.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { OperationalActor } from '../common/utils/operational-access';

@ApiTags('Users - Quản Lý Nhân Sự & Phân Quyền')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService, private readonly availabilityService: AvailabilityService) {}

  @Post()
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Tạo người dùng / tài xế mới' })
  async create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Danh sách nhân sự (lọc theo Role, Unit, Search)' })
  @ApiQuery({ name: 'role', enum: Role, required: false })
  @ApiQuery({ name: 'unit', enum: Unit, required: false })
  @ApiQuery({ name: 'search', type: String, required: false })
  async findAll(
    @Query('role') role?: Role,
    @Query('unit') unit?: Unit,
    @Query('search') search?: string,
    @CurrentUser() actor?: OperationalActor,
  ) {
    return this.usersService.findAll(role, unit, search, actor);
  }

  @Get('drivers')
  @ApiOperation({ summary: 'Lấy danh sách tất cả tài xế' })
  @ApiQuery({ name: 'unit', enum: Unit, required: false })
  async findDrivers(@Query('unit') unit?: Unit, @CurrentUser() actor?: OperationalActor) {
    return this.usersService.findDrivers(unit, actor);
  }

  @Get('drivers/profiles')
  @Roles(Role.SUPER_ADMIN, Role.FARM_MANAGER, Role.DISPATCHER, Role.WORKSHOP_MANAGER, Role.FUEL_STOREKEEPER, Role.DRIVER)
  @ApiOperation({ summary: 'Danh sách hồ sơ lái xe/thợ vận hành đã hợp nhất với hồ sơ nhân sự' })
  async findDriverProfiles(@Query() filter: DriverProfileFilterDto, @CurrentUser() actor: OperationalActor) {
    return this.usersService.findDriverProfiles(filter, actor);
  }

  @Get('drivers/profile-options')
  @Roles(Role.SUPER_ADMIN, Role.FARM_MANAGER, Role.DISPATCHER, Role.WORKSHOP_MANAGER, Role.FUEL_STOREKEEPER)
  @ApiOperation({ summary: 'Dữ liệu lọc và phương tiện dùng cho hồ sơ lái xe' })
  async getDriverProfileOptions(@CurrentUser() actor: OperationalActor) {
    return this.usersService.getDriverProfileOptions(actor);
  }

  @Get('drivers/:id/timeline')
  @ApiOperation({ summary: 'Timeline bận/rảnh và khung giờ phù hợp của tài xế' })
  timeline(@Param('id', ParseIntPipe) id: number, @Query() query: TimelineQueryDto, @CurrentUser() actor: OperationalActor) {
    return this.availabilityService.driverTimeline(id, query.from, query.to, actor, query.excludeWorkOrderId, query.requiredDurationMinutes);
  }

  @Get('drivers/:id/profile')
  @Roles(Role.SUPER_ADMIN, Role.FARM_MANAGER, Role.DISPATCHER, Role.WORKSHOP_MANAGER, Role.FUEL_STOREKEEPER)
  @ApiOperation({ summary: 'Hồ sơ 360 độ của lái xe/thợ vận hành' })
  async findDriverProfile(@Param('id', ParseIntPipe) id: number, @CurrentUser() actor: OperationalActor) {
    return this.usersService.findDriverProfile(id, actor);
  }

  @Post('drivers/profiles')
  @Roles(Role.SUPER_ADMIN, Role.FARM_MANAGER)
  @ApiOperation({ summary: 'Tiếp nhận lái xe/thợ vận hành mới' })
  async createDriverProfile(@Body() dto: CreateDriverProfileDto, @CurrentUser() actor: OperationalActor) {
    return this.usersService.createDriverProfile(dto, actor);
  }

  @Patch('drivers/:id/profile')
  @Roles(Role.SUPER_ADMIN, Role.FARM_MANAGER)
  @ApiOperation({ summary: 'Cập nhật hồ sơ lái xe/thợ vận hành' })
  async updateDriverProfile(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateDriverProfileDto,
    @CurrentUser() actor: OperationalActor,
  ) {
    return this.usersService.updateDriverProfile(id, dto, actor);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Xem chi tiết thông tin nhân sự' })
  async findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() actor: OperationalActor) {
    return this.usersService.findOne(id, actor);
  }

  @Patch(':id')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Cập nhật thông tin nhân sự' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserDto,
  ) {
    return this.usersService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Vô hiệu hóa tài khoản' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.remove(id);
  }
}
