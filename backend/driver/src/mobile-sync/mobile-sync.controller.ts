import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { FastifyRequest } from 'fastify';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { MobileSyncPullQueryDto, MobileSyncPushDto } from './dto/mobile-sync.dto';
import { MobileSyncService } from './mobile-sync.service';

@ApiTags('Mobile Sync - Đồng bộ Offline First')
@ApiBearerAuth()
@Roles(Role.DRIVER)
@Controller('mobile/sync')
export class MobileSyncController {
  constructor(private readonly service: MobileSyncService) {}

  @Post('push')
  @ApiOperation({ summary: 'Đẩy hàng đợi offline theo thứ tự và bảo đảm idempotency' })
  push(@CurrentUser('id') driverId: number, @Body() dto: MobileSyncPushDto) {
    return this.service.push(driverId, dto);
  }

  @Get('pull')
  @ApiOperation({ summary: 'Tải hồ sơ, xe và lệnh thay đổi từ lần đồng bộ cuối' })
  pull(@CurrentUser('id') driverId: number, @Query() query: MobileSyncPullQueryDto) {
    return this.service.pull(driverId, query.since);
  }

  @Post('attachments')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload ảnh đã lưu offline trước khi đẩy sự kiện phụ thuộc' })
  async upload(@CurrentUser('id') driverId: number, @Req() request: FastifyRequest) {
    const file = await request.file();
    if (!file) throw new BadRequestException('Thiếu tệp ảnh.');
    return this.service.saveAttachment(
      driverId,
      {
        mimetype: file.mimetype,
        originalname: file.filename,
        buffer: await file.toBuffer(),
      },
      request,
    );
  }
}
