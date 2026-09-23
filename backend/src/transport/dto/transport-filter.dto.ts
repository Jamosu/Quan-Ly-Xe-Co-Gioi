import { ApiPropertyOptional } from '@nestjs/swagger';
import { PlanType, ReturnDriverStatus, RouteType, TransportStatus, Unit } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class TransportFilterDto extends PaginationDto {
  @ApiPropertyOptional({ enum: Unit })
  @IsOptional()
  @IsEnum(Unit)
  unit?: Unit;
  @ApiPropertyOptional({ enum: RouteType, description: 'Loại tuyến (1 Chiều / Đối Lưu 2 Chiều)' })
  @IsOptional()
  @IsEnum(RouteType)
  routeType?: RouteType;

  @ApiPropertyOptional({ enum: TransportStatus, description: 'Trạng thái vận chuyển' })
  @IsOptional()
  @IsEnum(TransportStatus)
  status?: TransportStatus;

  @ApiPropertyOptional({ description: 'Bao gồm cả lệnh đã hủy' })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  includeCancelled?: boolean;

  @ApiPropertyOptional({ enum: ReturnDriverStatus, description: 'Trạng thái chiều về' })
  @IsOptional()
  @IsEnum(ReturnDriverStatus)
  returnDriverStatus?: ReturnDriverStatus;

  @ApiPropertyOptional({ description: 'Chỉ lọc xe bị lệch lộ trình / vượt tốc độ' })
  @IsOptional()
  @IsBoolean()
  isRouteDeviated?: boolean;

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
