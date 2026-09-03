import { ApiPropertyOptional } from '@nestjs/swagger';
import { VehicleStatus } from '@prisma/client';
import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';

export class UpdateTelemetryDto {
  @ApiPropertyOptional({ example: 13.5678, description: 'Vĩ độ GPS' })
  @IsOptional()
  @IsNumber()
  currentLat?: number;

  @ApiPropertyOptional({ example: 106.8901, description: 'Kinh độ GPS' })
  @IsOptional()
  @IsNumber()
  currentLng?: number;

  @ApiPropertyOptional({ example: 'Nông trường 1 - Lô A04', description: 'Địa danh vị trí' })
  @IsOptional()
  @IsString()
  currentLocationName?: string;

  @ApiPropertyOptional({ example: 2.5, description: 'Số giờ máy tăng thêm trong ca' })
  @IsOptional()
  @IsNumber()
  addedMachineHours?: number;

  @ApiPropertyOptional({ example: 35.0, description: 'Số km di chuyển tăng thêm' })
  @IsOptional()
  @IsNumber()
  addedOdoKm?: number;

  @ApiPropertyOptional({ enum: VehicleStatus })
  @IsOptional()
  @IsEnum(VehicleStatus)
  status?: VehicleStatus;
}
