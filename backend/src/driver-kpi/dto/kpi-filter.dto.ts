import { ApiPropertyOptional } from '@nestjs/swagger';
import { KpiGrade, Unit } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class KpiFilterDto extends PaginationDto {
  @ApiPropertyOptional({ example: '08/2026', description: 'Tháng/Năm đánh giá' })
  @IsOptional()
  @IsString()
  monthYear?: string;

  @ApiPropertyOptional({ enum: Unit, description: 'Đơn vị' })
  @IsOptional()
  @IsEnum(Unit)
  unit?: Unit;

  @ApiPropertyOptional({ enum: KpiGrade, description: 'Xếp loại thi đua (Hạng A/B/C/D)' })
  @IsOptional()
  @IsEnum(KpiGrade)
  rankGrade?: KpiGrade;
}
