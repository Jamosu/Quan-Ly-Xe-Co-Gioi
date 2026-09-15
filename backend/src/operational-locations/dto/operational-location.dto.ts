import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { OperationalLocationType, Unit } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateOperationalLocationDto {
  @ApiProperty() @IsString() code: string;
  @ApiProperty() @IsString() name: string;
  @ApiProperty({ enum: OperationalLocationType }) @IsEnum(OperationalLocationType) type: OperationalLocationType;
  @ApiPropertyOptional({ enum: Unit }) @IsOptional() @IsEnum(Unit) unit?: Unit;
  @ApiPropertyOptional() @IsOptional() @IsString() complexCode?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() enterpriseCode?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() farmCode?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() regionName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() address?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() @Min(-90) @Max(90) lat?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() @Min(-180) @Max(180) lng?: number;
  @ApiPropertyOptional({ default: 300 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) geofenceRadiusM?: number;
  @ApiPropertyOptional({ default: true }) @IsOptional() @IsBoolean() active?: boolean;
}

export class UpdateOperationalLocationDto extends PartialType(CreateOperationalLocationDto) {}
