import { ApiPropertyOptional } from '@nestjs/swagger';
import { RepairStatus, RepairTier } from '@prisma/client';
import { IsBoolean, IsEnum, IsNumber, IsOptional } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class RepairFilterDto extends PaginationDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsNumber()
  vehicleId?: number;

  @ApiPropertyOptional({ enum: RepairTier })
  @IsOptional()
  @IsEnum(RepairTier)
  repairTier?: RepairTier;

  @ApiPropertyOptional({ enum: RepairStatus })
  @IsOptional()
  @IsEnum(RepairStatus)
  status?: RepairStatus;

  @ApiPropertyOptional({ description: 'Chỉ lọc các phiếu phát sinh từ bảo dưỡng 250h' })
  @IsOptional()
  @IsBoolean()
  isGeneratedFromMaintenance?: boolean;
}
