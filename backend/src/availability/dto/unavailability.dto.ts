import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsEnum, IsInt, IsOptional, IsString, IsUrl } from 'class-validator';
import { DriverUnavailabilityType, VehicleUnavailabilityType } from '@prisma/client';

export class CreateDriverUnavailabilityDto {
  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  driverId: number;

  @ApiProperty({ enum: DriverUnavailabilityType })
  @IsEnum(DriverUnavailabilityType)
  type: DriverUnavailabilityType;

  @ApiProperty({ type: String, format: 'date-time' })
  @Type(() => Date)
  @IsDate()
  startAt: Date;

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  endAt?: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl({ require_protocol: true })
  evidenceUrl?: string;
}

export class CreateVehicleUnavailabilityDto {
  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  vehicleId: number;

  @ApiProperty({ enum: VehicleUnavailabilityType })
  @IsEnum(VehicleUnavailabilityType)
  type: VehicleUnavailabilityType;

  @ApiProperty({ type: String, format: 'date-time' })
  @Type(() => Date)
  @IsDate()
  startAt: Date;

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  endAt?: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}
