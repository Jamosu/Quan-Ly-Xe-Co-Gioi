import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayUnique, IsArray, IsDate, IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Unit, WorkOrderCategory } from '@prisma/client';

export class AvailabilitySearchDto {
  @ApiPropertyOptional({ description: 'Khu vực OWNER dùng để lọc trực tiếp xe và tài xế' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  managementUnitId?: number;

  @ApiProperty({ type: String, format: 'date-time' })
  @Type(() => Date)
  @IsDate()
  startAt: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  @Type(() => Date)
  @IsDate()
  endAt: Date;

  @ApiPropertyOptional({ enum: Unit })
  @IsOptional()
  @IsEnum(Unit)
  unit?: Unit;

  @ApiPropertyOptional({ enum: WorkOrderCategory })
  @IsOptional()
  @IsEnum(WorkOrderCategory)
  category?: WorkOrderCategory;

  @ApiPropertyOptional({ description: 'Mã khu liên hợp (mặc định KOUN_MOM)' })
  @IsOptional()
  @IsString()
  complexCode?: string;

  @ApiPropertyOptional({ type: [Number] })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsInt({ each: true })
  vehicleIds?: number[];

  @ApiPropertyOptional({ type: [Number] })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsInt({ each: true })
  driverIds?: number[];

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  excludeWorkOrderId?: number;

  @ApiPropertyOptional({ description: 'Loại trừ lệnh điều xe hiện tại khi kiểm tra lại lịch' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  excludeDispatchOrderId?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  requiredDurationMinutes?: number;
}
