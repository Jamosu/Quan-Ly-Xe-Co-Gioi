import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AlertStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateAlertStatusDto {
  @ApiProperty({ enum: AlertStatus })
  @IsEnum(AlertStatus)
  status: AlertStatus;

  @ApiPropertyOptional({ description: 'Bắt buộc khi đóng hoặc bỏ qua cảnh báo.' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  reason?: string;
}
