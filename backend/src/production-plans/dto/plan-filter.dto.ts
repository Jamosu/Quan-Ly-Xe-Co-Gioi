import { ApiPropertyOptional } from '@nestjs/swagger';
import { PlanStatus, ProductionStage, Unit } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class PlanFilterDto extends PaginationDto {
  @ApiPropertyOptional({ enum: ProductionStage, description: 'Giai đoạn (Làm đất/Trồng mới/Thu hoạch)' })
  @IsOptional()
  @IsEnum(ProductionStage)
  stage?: ProductionStage;

  @ApiPropertyOptional({ enum: Unit, description: 'Đơn vị nông trường' })
  @IsOptional()
  @IsEnum(Unit)
  unit?: Unit;

  @ApiPropertyOptional({ enum: PlanStatus, description: 'Trạng thái kế hoạch' })
  @IsOptional()
  @IsEnum(PlanStatus)
  status?: PlanStatus;
}
