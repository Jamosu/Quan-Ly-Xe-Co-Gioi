import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { Unit, WorkAssignmentMode, WorkOrderCategory, WorkPriority } from '@prisma/client';

export enum WorkOrderPreparationAction {
  SAVE_DRAFT = 'SAVE_DRAFT',
  ISSUE = 'ISSUE',
}

export class PrepareWorkOrderDto {
  @ApiProperty({ enum: WorkOrderCategory })
  @IsEnum(WorkOrderCategory)
  category: WorkOrderCategory;

  @ApiProperty({ enum: Unit })
  @IsEnum(Unit)
  unit: Unit;

  @ApiProperty() @IsString() @IsNotEmpty() complexCode: string;
  @ApiPropertyOptional() @IsOptional() @IsString() complexName?: string;
  @ApiProperty() @IsString() @IsNotEmpty() enterpriseCode: string;
  @ApiPropertyOptional() @IsOptional() @IsString() enterpriseName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() farmCode?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() farmName?: string;

  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() workLocationId?: number;
  @ApiProperty() @IsString() @IsNotEmpty() workLocationText: string;
  @ApiPropertyOptional() @IsOptional() @IsString() workLocationNotes?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() @Min(-90) @Max(90) workLat?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() @Min(-180) @Max(180) workLng?: number;

  @ApiPropertyOptional() @IsOptional() @IsString() jobCode?: string;
  @ApiProperty() @IsString() @IsNotEmpty() jobName: string;
  @ApiProperty() @IsString() @IsNotEmpty() jobDescription: string;
  @ApiProperty({ type: String, format: 'date-time' }) @Type(() => Date) @IsDate() plannedStartAt: Date;
  @ApiProperty({ type: String, format: 'date-time' }) @Type(() => Date) @IsDate() plannedEndAt: Date;
  @ApiProperty() @IsString() @IsNotEmpty() shift: string;
  @ApiPropertyOptional({ enum: WorkPriority, default: WorkPriority.NORMAL }) @IsOptional() @IsEnum(WorkPriority) priority?: WorkPriority;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() @Min(0) targetQuantity?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() targetUnit?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() requestedVehicleTypeId?: number;
  @ApiPropertyOptional({ default: 1 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) requestedVehicleCount?: number;
  @ApiPropertyOptional() @IsOptional() @IsObject() categoryDetails?: Record<string, unknown>;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;

  @ApiProperty() @IsString() @IsNotEmpty() origin: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() originLocationId?: number;
  @ApiProperty() @IsString() @IsNotEmpty() destination: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() destinationLocationId?: number;

  @ApiProperty({ enum: WorkAssignmentMode })
  @IsEnum(WorkAssignmentMode)
  assignmentMode: WorkAssignmentMode;

  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() vehicleId?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() driverId?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() implementId?: number;

  @ApiProperty({ enum: WorkOrderPreparationAction })
  @IsEnum(WorkOrderPreparationAction)
  action: WorkOrderPreparationAction;
}
