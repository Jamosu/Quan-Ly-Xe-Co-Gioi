import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MaintenanceAlertTier, MaintenanceStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsDate, IsEnum, IsNotEmpty, IsNumber, IsObject, IsOptional } from 'class-validator';

export class CreateMaintenanceDto {
  @ApiProperty({ example: 1, description: 'ID phương tiện cần bảo dưỡng' })
  @IsNotEmpty()
  @IsNumber()
  vehicleId: number;

  @ApiProperty({ example: 252.5, description: 'Số giờ máy thực tế lúc đưa vào bảo dưỡng' })
  @IsNotEmpty()
  @IsNumber()
  currentHours: number;

  @ApiPropertyOptional({
    example: {
      check1_engine_oil: true,
      check2_oil_filter: true,
      check3_fuel_filter: false,
      check4_air_cleaner: true,
      check5_hydraulic_oil: true,
      check6_transmission_oil: true,
      check7_cooling_system: true,
      check8_fan_belt_tension: true,
      check9_greasing_points: true,
      check10_battery_terminals: true,
      check11_brakes_steering: true,
      check12_tire_pressure_tighten: true,
    },
    description: '12 Hạng mục kiểm tra kỹ thuật (Checklist JSON)',
  })
  @IsOptional()
  @IsObject()
  checklistJson?: Record<string, boolean>;

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  plannedStartAt?: Date;

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  plannedEndAt?: Date;
}
