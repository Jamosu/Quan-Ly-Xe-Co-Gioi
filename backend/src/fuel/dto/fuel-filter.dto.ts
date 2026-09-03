import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNumber, IsOptional } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class FuelFilterDto extends PaginationDto {
  @ApiPropertyOptional({ example: 1, description: 'ID kho bồn' })
  @IsOptional()
  @IsNumber()
  warehouseId?: number;

  @ApiPropertyOptional({ example: 1, description: 'ID xe' })
  @IsOptional()
  @IsNumber()
  vehicleId?: number;

  @ApiPropertyOptional({ description: 'Chỉ lọc phiếu vượt định mức (isExcess = true)' })
  @IsOptional()
  @IsBoolean()
  isExcess?: boolean;
}
