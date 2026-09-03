import { ApiPropertyOptional } from '@nestjs/swagger';
import { DispatchStatus, Unit } from '@prisma/client';
import { IsBoolean, IsEnum, IsOptional } from 'class-validator';
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

  @ApiPropertyOptional({ description: 'Chỉ lọc lệnh bị trễ' })
  @IsOptional()
  @IsBoolean()
  isDelayed?: boolean;
}
