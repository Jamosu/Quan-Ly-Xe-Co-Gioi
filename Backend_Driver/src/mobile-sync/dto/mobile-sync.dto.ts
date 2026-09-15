import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

export const MOBILE_EVENT_TYPES = [
  'ORDER_ACCEPTED',
  'VEHICLE_RECEIVED',
  'JOB_STARTED',
  'JOB_PAUSED',
  'JOB_RESUMED',
  'PROGRESS_UPDATED',
  'INCIDENT_REPORTED',
  'PHOTO_ADDED',
  'ACCEPTANCE_SUBMITTED',
  'JOB_COMPLETED',
  'SCHEDULE_CHANGE_REQUESTED',
  'TRANSFER_REQUESTED',
  'SOS_CREATED',
] as const;

export class MobileSyncEventDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  eventId: string;

  @ApiProperty({ enum: MOBILE_EVENT_TYPES })
  @IsIn(MOBILE_EVENT_TYPES)
  eventType: (typeof MOBILE_EVENT_TYPES)[number];

  @ApiPropertyOptional({ enum: ['DISPATCH', 'TRANSPORT', 'FEED'] })
  @IsOptional()
  @IsIn(['DISPATCH', 'TRANSPORT', 'FEED'])
  orderType?: 'DISPATCH' | 'TRANSPORT' | 'FEED';

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  orderId?: number;

  @ApiProperty()
  @IsInt()
  @Min(1)
  sequenceNumber: number;

  @ApiProperty({ format: 'date-time' })
  @IsDateString()
  occurredAt: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  baseVersion?: number;

  @ApiProperty({ type: Object })
  @IsObject()
  payload: Record<string, unknown>;
}

export class MobileSyncPushDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  deviceId: string;

  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsDateString()
  lastSyncAt?: string;

  @ApiProperty({ type: [MobileSyncEventDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MobileSyncEventDto)
  events: MobileSyncEventDto[];
}

export class MobileSyncPullQueryDto {
  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsDateString()
  since?: string;
}
