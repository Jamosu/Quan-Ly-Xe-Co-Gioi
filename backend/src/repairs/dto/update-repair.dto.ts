import { ApiPropertyOptional } from '@nestjs/swagger';
import { RepairStatus, RepairTier } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsDate, IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';

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

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  plannedStartAt?: Date;

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  plannedEndAt?: Date;
}
