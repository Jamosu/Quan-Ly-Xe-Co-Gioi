import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsEnum, IsInt, IsOptional, IsString } from 'class-validator';
import { Unit, WorkOrderCategory } from '@prisma/client';

export class PreparationContextDto {
  @ApiProperty({ enum: WorkOrderCategory })
  @IsEnum(WorkOrderCategory)
  category: WorkOrderCategory;

  @ApiProperty({ enum: Unit })
  @IsEnum(Unit)
  unit: Unit;

  @ApiPropertyOptional({ description: 'Mã khu liên hợp (mặc định KOUN_MOM)' })
  @IsOptional()
  @IsString()
  complexCode?: string;

  @ApiProperty({ type: String, format: 'date-time' })
  @Type(() => Date)
  @IsDate()
  startAt: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  @Type(() => Date)
  @IsDate()
  endAt: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  excludeWorkOrderId?: number;
}
