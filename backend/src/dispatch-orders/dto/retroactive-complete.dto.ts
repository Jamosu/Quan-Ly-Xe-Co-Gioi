import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';

export class RetroactiveCompleteDto {
  @ApiProperty({ description: 'Thời gian thực tế bắt đầu công việc' })
  @Type(() => Date)
  @IsDate()
  actualStartTime: Date;

  @ApiProperty({ description: 'Thời gian thực tế hoàn thành công việc' })
  @Type(() => Date)
  @IsDate()
  actualCompletedTime: Date;

  @ApiPropertyOptional({ description: 'Số giờ máy thực tế (dành cho thiết bị nông nghiệp)' })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  actualMachineHours?: number;

  @ApiPropertyOptional({ description: 'Khối lượng thực tế hoàn thành (tấn/ha/m³)' })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  actualQuantity?: number;

  @ApiPropertyOptional({ description: 'Lý do / ghi chú nghiệm thu hồi tố' })
  @IsOptional()
  @IsString()
  notes?: string;
}
