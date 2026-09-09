import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsEnum, IsInt, IsOptional, IsString } from 'class-validator';
import { VehicleDriverAssignmentType } from '@prisma/client';

export class CreateVehicleDriverAssignmentDto {
  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  vehicleId: number;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  driverId: number;

  @ApiProperty({ enum: VehicleDriverAssignmentType })
  @IsEnum(VehicleDriverAssignmentType)
  type: VehicleDriverAssignmentType;

  @ApiProperty({ type: String, format: 'date-time' })
  @Type(() => Date)
  @IsDate()
  effectiveFrom: Date;

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  effectiveTo?: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}

export class EndVehicleDriverAssignmentDto {
  @ApiPropertyOptional({ type: String, format: 'date-time' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  effectiveTo?: Date;

  @ApiProperty()
  @IsString()
  reason: string;
}
