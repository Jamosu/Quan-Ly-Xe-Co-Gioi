import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FuelQuotaUnit, ProductionStage } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsDate, IsEnum, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreatePlanItemDto {
  @ApiPropertyOptional() @IsOptional() @Type(() => Date) @IsDate() workDate?: Date;
  @ApiPropertyOptional({ default: 'CA_NGAY' }) @IsOptional() @IsString() shift?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() plotName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() lotPlot?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() plotCode?: string;
  @ApiProperty({ enum: ProductionStage }) @IsEnum(ProductionStage) stage: ProductionStage;
  @ApiPropertyOptional() @IsOptional() @IsString() stageName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() jobCode?: string;
  @ApiProperty() @IsString() jobName: string;
  @ApiPropertyOptional() @IsOptional() @IsString() implementGroup?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() recommendedVehicle?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() scheduledDays?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) targetQuantity?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) targetAreaHa?: number;
  @ApiPropertyOptional({ example: 'ha', default: 'ha' }) @IsOptional() @IsString() targetUnit?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() vehicleTypeId?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) plannedVehicleCount?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) assignedVehiclesCount?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) plannedMachineHours?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) quotaValue?: number;
  @ApiPropertyOptional({ enum: FuelQuotaUnit }) @IsOptional() @IsEnum(FuelQuotaUnit) quotaUnit?: FuelQuotaUnit;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() taskStatus?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
}
