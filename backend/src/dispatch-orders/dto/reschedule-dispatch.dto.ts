import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class RescheduleDispatchDto {
  @ApiProperty({ description: 'Thời gian xuất phát mới' })
  @Type(() => Date)
  @IsDate()
  newDepartureTime: Date;

  @ApiProperty({ description: 'Thời gian kết thúc dự kiến mới' })
  @Type(() => Date)
  @IsDate()
  newPlannedEndTime: Date;

  @ApiPropertyOptional({ description: 'Lý do dời lịch' })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class BatchRescheduleDispatchDto {
  @ApiProperty({ description: 'Danh sách ID lệnh điều xe cần dời lịch', type: [Number] })
  ids: number[];

  @ApiProperty({ description: 'Thời gian xuất phát mới' })
  @Type(() => Date)
  @IsDate()
  newDepartureTime: Date;

  @ApiProperty({ description: 'Thời gian kết thúc dự kiến mới' })
  @Type(() => Date)
  @IsDate()
  newPlannedEndTime: Date;

  @ApiPropertyOptional({ description: 'Lý do dời lịch' })
  @IsOptional()
  @IsString()
  reason?: string;
}
