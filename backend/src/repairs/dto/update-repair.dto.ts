import { ApiPropertyOptional } from '@nestjs/swagger';
import { RepairStatus, RepairTier } from '@prisma/client';
import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';

export class UpdateRepairDto {
  @ApiPropertyOptional({ enum: RepairTier })
  @IsOptional()
  @IsEnum(RepairTier)
  repairTier?: RepairTier;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  issueDescription?: string;

  @ApiPropertyOptional({ example: 3 })
  @IsOptional()
  @IsNumber()
  assignedTechnicianId?: number;

  @ApiPropertyOptional({ enum: RepairStatus })
  @IsOptional()
  @IsEnum(RepairStatus)
  status?: RepairStatus;

  @ApiPropertyOptional({ example: 2800000 })
  @IsOptional()
  @IsNumber()
  actualCostVnd?: number;

  @ApiPropertyOptional()
  @IsOptional()
  replacedPartsJson?: any;
}
