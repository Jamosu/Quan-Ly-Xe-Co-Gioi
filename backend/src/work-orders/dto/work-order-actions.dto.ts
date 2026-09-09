import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsDate, IsEnum, IsInt, IsNumber, IsOptional, IsString, IsUrl, Min, ValidateNested } from 'class-validator';
import { WorkAssignmentMode, WorkEvidenceType } from '@prisma/client';

export class AssignWorkOrderDto {
  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  vehicleId: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  driverId?: number;

  @ApiProperty({ enum: WorkAssignmentMode })
  @IsEnum(WorkAssignmentMode)
  assignmentMode: WorkAssignmentMode;

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

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  expectedVersion?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}

export class ReassignWorkOrderDto {
  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  driverId: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  vehicleId?: number;

  @ApiProperty()
  @IsString()
  reason: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  expectedVersion?: number;
}

export class WorkReasonDto {
  @ApiProperty()
  @IsString()
  reasonCode: string;

  @ApiProperty()
  @IsString()
  reason: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl({ require_protocol: true })
  evidenceUrl?: string;
}

export class EvidenceDto {
  @ApiProperty({ enum: WorkEvidenceType })
  @IsEnum(WorkEvidenceType)
  type: WorkEvidenceType;

  @ApiProperty()
  @IsUrl({ require_protocol: true })
  url: string;

  @ApiProperty({ type: String, format: 'date-time' })
  @Type(() => Date)
  @IsDate()
  capturedAt: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  lat?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  lng?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  checksum?: string;
}

export class StartExecutionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  startOdoKm?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  startMachineHours?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  lat?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  lng?: number;

  @ApiPropertyOptional({ type: [EvidenceDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EvidenceDto)
  evidence?: EvidenceDto[];
}

export class FinishExecutionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  endOdoKm?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  endMachineHours?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  quantity?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  lat?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  lng?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ type: [EvidenceDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EvidenceDto)
  evidence?: EvidenceDto[];
}

export class HandoverExecutionDto extends FinishExecutionDto {
  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  nextDriverId: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  nextVehicleId?: number;

  @ApiProperty()
  @IsString()
  reason: string;
}

export class AcceptanceReviewDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}
