import { ApiPropertyOptional } from '@nestjs/swagger';
import { AlertCategory, AlertSeverity, AlertStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsDate, IsEnum, IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class AlertFilterDto {
  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page = 1;

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 20 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit = 20;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  complexCode?: string;

  @ApiPropertyOptional({ enum: AlertCategory })
  @IsEnum(AlertCategory)
  @IsOptional()
  category?: AlertCategory;

  @ApiPropertyOptional({ enum: AlertSeverity })
  @IsEnum(AlertSeverity)
  @IsOptional()
  severity?: AlertSeverity;

  @ApiPropertyOptional({ enum: AlertStatus })
  @IsEnum(AlertStatus)
  @IsOptional()
  status?: AlertStatus;

  @ApiPropertyOptional({ enum: ['ALL', 'UNREAD', 'READ'], default: 'ALL' })
  @IsIn(['ALL', 'UNREAD', 'READ'])
  @IsOptional()
  readState: 'ALL' | 'UNREAD' | 'READ' = 'ALL';

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  @Type(() => Date)
  @IsDate()
  @IsOptional()
  from?: Date;

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  @Type(() => Date)
  @IsDate()
  @IsOptional()
  to?: Date;
}
