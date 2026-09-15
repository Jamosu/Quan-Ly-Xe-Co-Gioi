import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  WorkshopDocumentStatus,
  WorkshopDocumentType,
  RepairTier,
  WorkshopPriority,
  WorkshopRepairRoute,
  WorkshopRequestSource,
  WorkshopRequestStatus,
  WorkshopRequestType,
  Unit,
} from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDate,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';

export enum WorkshopAssetType {
  VEHICLE = 'VEHICLE',
  IMPLEMENT = 'IMPLEMENT',
}

export class WorkshopRequestFilterDto extends PaginationDto {
  @ApiPropertyOptional({ enum: WorkshopRequestType })
  @IsOptional() @IsEnum(WorkshopRequestType)
  type?: WorkshopRequestType;

  @ApiPropertyOptional({ enum: WorkshopRequestStatus })
  @IsOptional() @IsEnum(WorkshopRequestStatus)
  status?: WorkshopRequestStatus;

  @ApiPropertyOptional({ enum: WorkshopAssetType })
  @IsOptional() @IsEnum(WorkshopAssetType)
  assetType?: WorkshopAssetType;

  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt()
  vehicleId?: number;

  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt()
  implementId?: number;
}

export class WorkshopCandidateFilterDto extends PaginationDto {
  @ApiPropertyOptional({ enum: WorkshopRequestType, default: WorkshopRequestType.REPAIR })
  @IsOptional() @IsEnum(WorkshopRequestType)
  type?: WorkshopRequestType = WorkshopRequestType.REPAIR;

  @ApiPropertyOptional({ enum: WorkshopAssetType })
  @IsOptional() @IsEnum(WorkshopAssetType)
  assetType?: WorkshopAssetType;

  @ApiPropertyOptional({ enum: Unit })
  @IsOptional() @IsEnum(Unit)
  unit?: Unit;
}

export class CreateWorkshopRequestDto {
  @ApiPropertyOptional() @IsOptional() @IsString()
  code?: string;

  @ApiProperty({ enum: WorkshopRequestType }) @IsEnum(WorkshopRequestType)
  type: WorkshopRequestType;

  @ApiPropertyOptional({ enum: WorkshopRequestSource, default: WorkshopRequestSource.MANUAL })
  @IsOptional() @IsEnum(WorkshopRequestSource)
  source?: WorkshopRequestSource;

  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt()
  vehicleId?: number;

  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt()
  implementId?: number;

  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt()
  maintenanceOccurrenceId?: number;

  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt()
  sosAlertId?: number;

  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt()
  reportedById?: number;

  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt()
  assignedTechnicianId?: number;

  @ApiProperty() @IsString() @IsNotEmpty()
  issueDescription: string;

  @ApiPropertyOptional({ enum: WorkshopPriority })
  @IsOptional() @IsEnum(WorkshopPriority)
  priority?: WorkshopPriority;

  @ApiPropertyOptional({ enum: WorkshopRepairRoute })
  @IsOptional() @IsEnum(WorkshopRepairRoute)
  repairRoute?: WorkshopRepairRoute;

  @ApiPropertyOptional({ enum: RepairTier })
  @IsOptional() @IsEnum(RepairTier)
  repairTier?: RepairTier;

  @ApiPropertyOptional() @IsOptional() @IsString()
  incidentLocation?: string;

  @ApiPropertyOptional() @IsOptional() @IsObject()
  checklistJson?: Record<string, unknown>;

  @ApiPropertyOptional() @IsOptional() @IsArray()
  photoUrlsJson?: unknown[];

  @ApiPropertyOptional() @IsOptional()
  partsJson?: Record<string, unknown> | unknown[];

  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() @Min(0)
  currentHours?: number;

  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() @Min(0)
  currentKm?: number;

  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() @Min(0)
  estimatedCostVnd?: number;

  @ApiPropertyOptional() @IsOptional() @IsString()
  vendorName?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  vendorContact?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  vendorNotes?: string;

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  @IsOptional() @Type(() => Date) @IsDate()
  vendorSentAt?: Date;

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  @IsOptional() @Type(() => Date) @IsDate()
  vendorExpectedReturnAt?: Date;

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  @IsOptional() @Type(() => Date) @IsDate()
  plannedStartAt?: Date;

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  @IsOptional() @Type(() => Date) @IsDate()
  plannedEndAt?: Date;
}

export class UpdateWorkshopRequestDto {
  @ApiPropertyOptional({ enum: WorkshopRequestStatus })
  @IsOptional() @IsEnum(WorkshopRequestStatus)
  status?: WorkshopRequestStatus;

  @ApiPropertyOptional({ enum: WorkshopRepairRoute })
  @IsOptional() @IsEnum(WorkshopRepairRoute)
  repairRoute?: WorkshopRepairRoute;

  @ApiPropertyOptional({ enum: RepairTier })
  @IsOptional() @IsEnum(RepairTier)
  repairTier?: RepairTier;

  @ApiPropertyOptional({ enum: WorkshopPriority })
  @IsOptional() @IsEnum(WorkshopPriority)
  priority?: WorkshopPriority;

  @ApiPropertyOptional() @IsOptional() @IsString()
  issueDescription?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  rootCause?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  resolution?: string;

  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt()
  assignedTechnicianId?: number;

  @ApiPropertyOptional() @IsOptional() @IsObject()
  checklistJson?: Record<string, unknown>;

  @ApiPropertyOptional() @IsOptional()
  partsJson?: Record<string, unknown> | unknown[];

  @ApiPropertyOptional() @IsOptional() @IsString()
  vendorName?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  vendorContact?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  vendorNotes?: string;

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  @IsOptional() @Type(() => Date) @IsDate()
  vendorSentAt?: Date;

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  @IsOptional() @Type(() => Date) @IsDate()
  vendorExpectedReturnAt?: Date;

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  @IsOptional() @Type(() => Date) @IsDate()
  vendorReturnedAt?: Date;

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  @IsOptional() @Type(() => Date) @IsDate()
  plannedStartAt?: Date;

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  @IsOptional() @Type(() => Date) @IsDate()
  plannedEndAt?: Date;

  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() @Min(0)
  estimatedCostVnd?: number;

  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() @Min(0)
  actualCostVnd?: number;

  @ApiPropertyOptional() @IsOptional() @IsString()
  explanationReason?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  cancellationReason?: string;
}

export class UpdateWorkshopDocumentDto {
  @ApiProperty({ enum: WorkshopDocumentStatus }) @IsEnum(WorkshopDocumentStatus)
  status: WorkshopDocumentStatus;

  @ApiPropertyOptional() @IsOptional() @IsString()
  documentNo?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  fileUrl?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  notes?: string;
}

export class WorkshopCandidateDto {
  @ApiProperty({ enum: WorkshopAssetType }) @IsEnum(WorkshopAssetType)
  assetType: WorkshopAssetType;

  @ApiProperty() @Type(() => Number) @IsInt()
  assetId: number;

  @ApiProperty({ enum: WorkshopRequestType }) @IsEnum(WorkshopRequestType)
  type: WorkshopRequestType;

  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt()
  occurrenceId?: number;
}

export class ConfirmWorkshopCandidatesDto {
  @ApiProperty({ type: [WorkshopCandidateDto] })
  @IsArray() @ValidateNested({ each: true }) @Type(() => WorkshopCandidateDto)
  candidates: WorkshopCandidateDto[];
}

export { WorkshopDocumentType };
