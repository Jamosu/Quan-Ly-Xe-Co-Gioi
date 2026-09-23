import { ApiPropertyOptional } from '@nestjs/swagger';
import { DispatchStatus, PlanType, Unit } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class DispatchFilterDto extends PaginationDto {
  @ApiPropertyOptional({ enum: Unit, description: 'Đơn vị' })
  @IsOptional()
  @IsEnum(Unit)
  unit?: Unit;

  @ApiPropertyOptional({ enum: DispatchStatus, description: 'Trạng thái lệnh' })
  @IsOptional()
  @IsEnum(DispatchStatus)
  status?: DispatchStatus;

  @ApiPropertyOptional({ description: 'Bao gồm cả lệnh đã hủy' })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  includeCancelled?: boolean;

  @ApiPropertyOptional({ description: 'Chỉ lọc lệnh bị trễ' })
  @IsOptional()
  @IsBoolean()
  isDelayed?: boolean;

  @ApiPropertyOptional({ description: 'ID kế hoạch nguồn' })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  planId?: number;

  @ApiPropertyOptional({ enum: PlanType })
  @IsOptional() @IsEnum(PlanType)
  planType?: PlanType;

  @ApiPropertyOptional({ minimum: 2000, maximum: 2100 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(2000) @Max(2100)
  year?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 53 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(53)
  weekNumber?: number;
}
