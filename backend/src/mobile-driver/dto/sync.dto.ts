import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class SyncEventDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  eventId: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  eventType: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  orderType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  orderId?: number;

  @ApiProperty()
  @IsNumber()
  sequenceNumber: number;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  occurredAt: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  baseVersion?: number;

  @ApiPropertyOptional()
  @IsOptional()
  payload?: any;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;
}


export class SyncPushDto {
  @ApiProperty({ description: 'ID thiết bị di động' })
  @IsNotEmpty()
  @IsString()
  deviceId: string;

  @ApiPropertyOptional({ description: 'Thời điểm đồng bộ lần cuối' })
  @IsOptional()
  @IsString()
  lastSyncAt?: string;

  @ApiProperty({ type: [SyncEventDto], description: 'Danh sách các sự kiện offline theo thứ tự' })
  @IsArray()
  events: SyncEventDto[];
}

export class ScheduleChangeDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  orderId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  orderType?: string;

  @ApiProperty({ description: 'Thời gian bắt đầu đề xuất mới' })
  @IsOptional()
  @IsString()
  proposedStart?: string;

  @ApiProperty({ description: 'Thời gian kết thúc đề xuất mới' })
  @IsOptional()
  @IsString()
  proposedEnd?: string;

  @ApiProperty({ description: 'Lý do xin điều chỉnh lịch' })
  @IsNotEmpty()
  @IsString()
  reason: string;
}

export class TransferRequestDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  orderId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  orderType?: string;

  @ApiProperty({ description: 'Lý do xin chuyển nhiệm vụ' })
  @IsNotEmpty()
  @IsString()
  reason: string;

  @ApiPropertyOptional({ description: 'Tài xế hoặc đội đề xuất nhận thay' })
  @IsOptional()
  @IsString()
  targetDriverOrTeam?: string;
}

export class UpdateProgressDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  orderId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  orderType?: string;

  @ApiProperty({ description: 'Khối lượng / diện tích hoàn thành mới' })
  @IsNumber()
  progress: number;

  @ApiPropertyOptional({ description: 'Đơn vị tính (ha, tấn, bao, chuyến...)' })
  @IsOptional()
  @IsString()
  unit?: string;

  @ApiPropertyOptional({ description: 'Ghi chú hiện trường' })
  @IsOptional()
  @IsString()
  note?: string;
}
