import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { MobileDriverService } from './mobile-driver.service';
import { SyncPushDto } from './dto/sync.dto';

@ApiTags('Mobile Driver App - Đồng Bộ Dữ Liệu Ngoại Tuyến (Offline-First Sync)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('mobile/sync')
export class MobileSyncController {
  constructor(private readonly mobileDriverService: MobileDriverService) {}

  @Get('pull')
  @ApiOperation({ summary: 'Tải dữ liệu mới nhất từ máy chủ (lệnh, xe, kpi, cảnh báo)' })
  async pull(@CurrentUser('id') driverId: number, @Query('since') since?: string) {
    return this.mobileDriverService.syncPull(driverId, since);
  }

  @Post('push')
  @ApiOperation({ summary: 'Đẩy danh sách sự kiện offline lên máy chủ' })
  async push(@CurrentUser('id') driverId: number, @Body() dto: SyncPushDto) {
    return this.mobileDriverService.syncPush(driverId, dto);
  }

  @Post('attachments')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 15 * 1024 * 1024 } }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Tải ảnh hiện trường / bằng chứng công việc' })
  async uploadAttachment(
    @CurrentUser('id') driverId: number,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: any,
  ) {
    return this.mobileDriverService.uploadAttachment(driverId, file, body);
  }
}
