import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { MaintenanceMetric } from '@prisma/client';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsBoolean, IsEnum, IsInt, IsNumber, IsObject, IsOptional, IsString, Max, Min, ValidateNested } from 'class-validator';

export class MaintenanceMilestoneInputDto {
  @ApiProperty({ example: 250 })
  @IsNumber()
  @Min(0.01)
  meterValue: number;

  @ApiPropertyOptional({ example: 'BDC2 250 giờ' })
  @IsOptional()
  @IsString()
  label?: string;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  checklistTemplateJson?: Record<string, unknown>;
}

export class CreateMaintenanceStandardDto {
  @ApiProperty()
  @IsString()
  code: string;

  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  vehicleTypeId: number;

  @ApiProperty({ enum: MaintenanceMetric })
  @IsEnum(MaintenanceMetric)
  metric: MaintenanceMetric;

  @ApiPropertyOptional({ default: 80 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(99.99)
  warningPercent?: number;

  @ApiPropertyOptional({ default: 110 })
  @IsOptional()
  @IsNumber()
  @Min(100)
  explanationPercent?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  repeatAfterMax?: boolean;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  bdc1ChecklistJson?: Record<string, unknown>;

  @ApiProperty({ type: [MaintenanceMilestoneInputDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => MaintenanceMilestoneInputDto)
  milestones: MaintenanceMilestoneInputDto[];
}

export class UpdateMaintenanceStandardDto extends PartialType(CreateMaintenanceStandardDto) {}
