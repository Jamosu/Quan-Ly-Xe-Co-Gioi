import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsDateString, IsIn, IsInt, IsNotEmpty, IsNumber, IsObject, IsOptional, IsString, IsUUID, Min, ValidateNested } from 'class-validator';

const MOBILE_EVENT_TYPES = [
  'ORDER_ACCEPTED', 'VEHICLE_RECEIVED', 'JOB_STARTED', 'JOB_PAUSED', 'JOB_RESUMED',
  'PROGRESS_UPDATED', 'INCIDENT_REPORTED', 'PHOTO_ADDED', 'ACCEPTANCE_SUBMITTED',
  'JOB_COMPLETED', 'BREAK_STARTED', 'BREAK_ENDED', 'WORK_PAUSED', 'WORK_RESUMED',
  'WORK_SESSION_ENDED', 'ORDER_COMPLETION_REQUESTED',
  'DAILY_REPORT_DRAFT_SAVED', 'DAILY_REPORT_SUBMITTED',
  'SCHEDULE_CHANGE_REQUESTED', 'TRANSFER_REQUESTED', 'SOS_CREATED',
] as const;

export class SyncEventDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  @IsUUID()
  eventId: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  @IsIn(MOBILE_EVENT_TYPES)
  eventType: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsIn(['DISPATCH', 'TRANSPORT', 'FEED'])
  orderType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  orderId?: number;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  sequenceNumber: number;

  @ApiProperty()
  @IsNotEmpty()
  @IsDateString()
  occurredAt: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  baseVersion?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
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
  @ArrayMaxSize(50, { message: 'Mỗi lần đồng bộ tối đa 50 sự kiện.' })
  @ValidateNested({ each: true })
  @Type(() => SyncEventDto)
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
