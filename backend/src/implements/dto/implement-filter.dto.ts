import { ApiPropertyOptional } from '@nestjs/swagger';
import { EquipmentUsageMode, ImplementCategory, ImplementStatus, TechnicalCondition, Unit } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class ImplementFilterDto extends PaginationDto {
  @ApiPropertyOptional({ default: 50, description: 'Số lượng mục trên một trang' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000)
  limit?: number = 50;

  @ApiPropertyOptional({ enum: ImplementCategory, description: 'Loại nông cụ' })
  @IsOptional()
  @IsEnum(ImplementCategory)
  category?: ImplementCategory;

  @ApiPropertyOptional({ enum: Unit, description: 'Đơn vị quản lý' })
  @IsOptional()
  @IsEnum(Unit)
  unit?: Unit;

  @ApiPropertyOptional({ enum: ImplementStatus, description: 'Trạng thái (Đang gắn/Trong kho/Bảo trì)' })
  @IsOptional()
  @IsEnum(ImplementStatus)
  status?: ImplementStatus;

  @ApiPropertyOptional({ enum: TechnicalCondition, description: 'Tình trạng kỹ thuật (Tốt/Hao mòn/Cần sửa)' })
  @IsOptional()
  @IsEnum(TechnicalCondition)
  technicalCondition?: TechnicalCondition;

  @ApiPropertyOptional({ description: 'ID xe đang gắn thiết bị' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  vehicleId?: number;

  @ApiPropertyOptional({ enum: EquipmentUsageMode })
  @IsOptional()
  @IsEnum(EquipmentUsageMode)
  usageMode?: EquipmentUsageMode;

  @ApiPropertyOptional({ enum: ['ALL', 'VEHICLE_RELATED', 'OTHER'] })
  @IsOptional()
  @IsIn(['ALL', 'VEHICLE_RELATED', 'OTHER'])
  assetScope?: 'ALL' | 'VEHICLE_RELATED' | 'OTHER';

  @ApiPropertyOptional({ description: 'ID nhân sự quản lý cơ giới đang được phân công' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  managerUserId?: number;

  @ApiPropertyOptional({ description: 'ID đơn vị sử dụng trong danh mục quản lý cơ giới' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  managementUnitId?: number;
}
