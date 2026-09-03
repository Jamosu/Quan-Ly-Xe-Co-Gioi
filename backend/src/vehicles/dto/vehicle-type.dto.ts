import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { FuelQuotaUnit, VehicleCategory } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateVehicleTypeDto {
  @ApiProperty({ example: 'MAY_DAO' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({ example: 'Máy đào' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 'MAY_CONG_TRINH' })
  @IsOptional()
  @IsString()
  assetGroup?: string;

  @ApiPropertyOptional({ enum: VehicleCategory })
  @IsOptional()
  @IsEnum(VehicleCategory)
  category?: VehicleCategory;

  @ApiPropertyOptional({ example: 250, default: 250 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  defaultMaintenanceHours?: number;

  @ApiPropertyOptional({ example: 12.5 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  defaultFuelQuotaRate?: number;

  @ApiPropertyOptional({ enum: FuelQuotaUnit })
  @IsOptional()
  @IsEnum(FuelQuotaUnit)
  defaultFuelQuotaUnit?: FuelQuotaUnit;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateVehicleTypeDto extends PartialType(CreateVehicleTypeDto) {}

export class VehicleTypeFilterDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  active?: boolean;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  parentId?: number;
}
