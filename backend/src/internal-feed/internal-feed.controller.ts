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
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CompleteFeedTripDto } from './dto/complete-feed-trip.dto';
import { CreateFeedMaterialDto } from './dto/create-feed-material.dto';
import { CreateFeedTripDto } from './dto/create-feed-trip.dto';
import { FeedFilterDto } from './dto/feed-filter.dto';
import { InternalFeedService } from './internal-feed.service';

@ApiTags('Internal Feed - Vận Chuyển Thức Ăn Bò & Kiểm Soát SLA 3 Đúng')
@Controller('internal-feed')
export class InternalFeedController {
  constructor(private readonly internalFeedService: InternalFeedService) {}

  // Nguyên liệu
  @Public()
  @Post('materials')
  @ApiOperation({ summary: 'Khai báo nhanh nguyên liệu thức ăn & phụ phẩm mới' })
  async createMaterial(
    @Body() dto: CreateFeedMaterialDto,
    @CurrentUser('id') creatorId?: number,
  ) {
    return this.internalFeedService.createMaterial(dto, creatorId || 1);
  }

  @Public()
  @Get('materials')
  @ApiOperation({ summary: 'Danh mục tất cả nguyên liệu thức ăn (Cỏ voi, Bã chuối, TMR, Cám...)' })
  async findAllMaterials() {
    return this.internalFeedService.findAllMaterials();
  }

  // Chuyến vận chuyển
  @Public()
  @Post('trips')
  @ApiOperation({ summary: 'Tạo chuyến vận chuyển thức ăn giao đến cụm chuồng bò' })
  async createTrip(@Body() dto: CreateFeedTripDto) {
    return this.internalFeedService.createTrip(dto);
  }

  @Public()
  @Get('trips')
  @ApiOperation({ summary: 'Danh sách chuyến vận chuyển thức ăn & theo dõi SLA' })
  async findAllTrips(@Query() filter: FeedFilterDto) {
    return this.internalFeedService.findAllTrips(filter);
  }

  @Public()
  @Get('statistics')
  @ApiOperation({ summary: 'Thống kê tổng sản lượng TMR & Tỷ lệ tuân thủ SLA 3 Đúng' })
  async getStatistics() {
    return this.internalFeedService.getStatistics();
  }

  @Public()
  @Get('trips/:id')
  @ApiOperation({ summary: 'Xem chi tiết chuyến thức ăn' })
  async findOneTrip(@Param('id', ParseIntPipe) id: number) {
    return this.internalFeedService.findOneTrip(id);
  }

  @Public()
  @Patch('trips/:id/complete')
  @ApiOperation({ summary: 'Xác nhận giao nhận thực tế (Kiểm soát SLA 3 Đúng, chênh lệch %, ký nhận)' })
  async completeTrip(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CompleteFeedTripDto,
  ) {
    return this.internalFeedService.completeTrip(id, dto);
  }

  @Public()
  @Post('trips/settle')
  @ApiOperation({ summary: 'Quyết toán các chuyến vận chuyển thức ăn' })
  async settleTrips(@Body('tripIds') tripIds: number[]) {
    return this.internalFeedService.settleTrips(tripIds);
  }
}
