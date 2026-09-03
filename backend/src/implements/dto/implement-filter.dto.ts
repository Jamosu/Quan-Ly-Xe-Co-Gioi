import { ApiPropertyOptional } from '@nestjs/swagger';
import { ImplementCategory, ImplementStatus, TechnicalCondition, Unit } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
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
}
