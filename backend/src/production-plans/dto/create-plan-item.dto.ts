import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FuelQuotaUnit, ProductionStage } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsDate, IsEnum, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreatePlanItemDto {
  @ApiProperty() @Type(() => Date) @IsDate() workDate: Date;
  @ApiProperty() @IsString() shift: string;
  @ApiProperty() @IsString() plotName: string;
  @ApiProperty({ enum: ProductionStage }) @IsEnum(ProductionStage) stage: ProductionStage;
  @ApiProperty() @IsString() jobName: string;
  @ApiProperty() @IsNumber() @Min(0) targetQuantity: number;
  @ApiProperty({ example: 'ha' }) @IsString() targetUnit: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() vehicleTypeId?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) plannedVehicleCount?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) plannedMachineHours?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) quotaValue?: number;
  @ApiPropertyOptional({ enum: FuelQuotaUnit }) @IsOptional() @IsEnum(FuelQuotaUnit) quotaUnit?: FuelQuotaUnit;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}
