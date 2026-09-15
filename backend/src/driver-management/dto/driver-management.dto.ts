import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsDateString, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';
import { DriverManagementLevel, DriverManagementUnitStatus, DriverManagementUnitType } from '@prisma/client';

export class DriverManagementUnitFilterDto {
  @ApiPropertyOptional() @IsOptional() @IsString() complexCode?: string;
  @ApiPropertyOptional({ enum: DriverManagementLevel }) @IsOptional() @IsEnum(DriverManagementLevel) level?: DriverManagementLevel;
  @ApiPropertyOptional({ enum: DriverManagementUnitStatus }) @IsOptional() @IsEnum(DriverManagementUnitStatus) status?: DriverManagementUnitStatus;
  @ApiPropertyOptional() @IsOptional() @IsString() search?: string;
}

export class CreateDriverManagementUnitDto {
  @ApiProperty() @IsString() @IsNotEmpty() complexCode: string;
  @ApiProperty() @IsString() @IsNotEmpty() code: string;
  @ApiProperty() @IsString() @IsNotEmpty() name: string;
  @ApiProperty({ enum: DriverManagementLevel }) @IsEnum(DriverManagementLevel) level: DriverManagementLevel;
  @ApiProperty({ enum: DriverManagementUnitType }) @IsEnum(DriverManagementUnitType) unitType: DriverManagementUnitType;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) parentId?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
}

export class UpdateDriverManagementUnitDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @IsNotEmpty() name?: string;
  @ApiPropertyOptional({ enum: DriverManagementUnitType }) @IsOptional() @IsEnum(DriverManagementUnitType) unitType?: DriverManagementUnitType;
  @ApiPropertyOptional({ enum: DriverManagementUnitStatus }) @IsOptional() @IsEnum(DriverManagementUnitStatus) status?: DriverManagementUnitStatus;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
}

export class AssignDriverManagementDto {
  @ApiProperty() @Type(() => Number) @IsInt() @Min(1) driverId: number;
  @ApiProperty() @Type(() => Number) @IsInt() @Min(1) managementUnitId: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) teamUnitId?: number;
  @ApiPropertyOptional() @IsOptional() @IsDateString() effectiveFrom?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() reason?: string;
}

export class CreateDriverManagementScopeDto {
  @ApiProperty() @Type(() => Number) @IsInt() @Min(1) userId: number;
  @ApiProperty() @IsString() @IsNotEmpty() complexCode: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) managementUnitId?: number;
  @ApiPropertyOptional({ default: true }) @IsOptional() @IsBoolean() canManageCatalog?: boolean;
  @ApiPropertyOptional({ default: true }) @IsOptional() @IsBoolean() canAssignDrivers?: boolean;
}

