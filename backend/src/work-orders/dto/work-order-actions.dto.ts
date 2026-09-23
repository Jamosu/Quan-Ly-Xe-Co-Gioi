import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsDate, IsEnum, IsInt, IsNumber, IsOptional, IsString, IsUrl, Max, Min, ValidateNested } from 'class-validator';
import { WorkAssignmentMode, WorkBreakType, WorkDelayReason, WorkEvidenceType, WorkPauseReason } from '@prisma/client';

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

export class ClaimWorkOrderDto {
  @ApiPropertyOptional({ description: 'Xe tài xế chọn: xe đang phụ trách hoặc xe đang giữ cho chuyến.' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  vehicleId?: number;
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

export class StartBreakDto {
  @ApiPropertyOptional({ enum: WorkBreakType, default: WorkBreakType.OTHER })
  @IsOptional()
  @IsEnum(WorkBreakType)
  type?: WorkBreakType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;
}

export class PauseWorkDto {
  @ApiProperty({ enum: WorkPauseReason })
  @IsEnum(WorkPauseReason)
  reason: WorkPauseReason;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;
}

export class DailyProgressDto {
  @ApiPropertyOptional({ type: String, format: 'date-time' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  progressDate?: Date;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  quantityToday?: number;

  @ApiPropertyOptional({ minimum: 0, maximum: 100 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  overallProgressPercent?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsUrl({ require_protocol: true }, { each: true })
  evidenceUrls?: string[];
}

export class EndWorkSessionDto extends FinishExecutionDto {
  @ApiPropertyOptional({ description: 'Xác nhận ngày không phát sinh khối lượng nếu chưa có báo cáo tiến độ.' })
  @IsOptional()
  @IsBoolean()
  confirmNoProgress?: boolean;
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

export class DailyReportDto {
  @ApiProperty() @Type(() => Number) @IsInt() @Min(1) dispatchOrderId: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) quantityToday?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() unit?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) startMachineHours?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) endMachineHours?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) startOdoKm?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) endOdoKm?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) fuelLiters?: number;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @IsUrl({ require_protocol: true }, { each: true }) evidenceUrls?: string[];
  @ApiPropertyOptional() @IsOptional() @IsString() note?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() workCompleted?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() managerReason?: string;
}

export class ContinueNextDayDto {
  @ApiProperty() @Type(() => Number) @IsInt() @Min(1) previousDispatchOrderId: number;
  @ApiProperty({ type: String, format: 'date-time' }) @Type(() => Date) @IsDate() scheduledStartAt: Date;
  @ApiPropertyOptional({ default: 480 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) workDurationMinutes?: number;
  @ApiPropertyOptional({ default: 0 }) @IsOptional() @Type(() => Number) @IsInt() @Min(0) breakDurationMinutes?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) vehicleId?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) driverId?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) implementId?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class DailyReportReviewDto {
  @ApiPropertyOptional() @IsOptional() @IsString() reason?: string;
  @ApiPropertyOptional({ enum: WorkDelayReason }) @IsOptional() @IsEnum(WorkDelayReason) delayReason?: WorkDelayReason;
  @ApiPropertyOptional() @IsOptional() @IsString() delayReasonNote?: string;
}

export enum JourneyAction {
  DEPART_TO_WORK = 'DEPART_TO_WORK',
  ARRIVE_WORKSITE = 'ARRIVE_WORKSITE',
  START_WORK = 'START_WORK',
  FINISH_WORK = 'FINISH_WORK',
  ARRIVE_PICKUP = 'ARRIVE_PICKUP',
  START_LOADING = 'START_LOADING',
  DEPART_PICKUP = 'DEPART_PICKUP',
  ARRIVE_DELIVERY = 'ARRIVE_DELIVERY',
  START_UNLOADING = 'START_UNLOADING',
  COMPLETE_DELIVERY = 'COMPLETE_DELIVERY',
  RETURN_TO_DEPOT = 'RETURN_TO_DEPOT',
  ARRIVE_DEPOT = 'ARRIVE_DEPOT',
}

export class JourneyActionDto {
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() evidenceId?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() @Min(-90) @Max(90) lat?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() @Min(-180) @Max(180) lng?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() @Min(0) odoKm?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() @Min(0) machineHours?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}
