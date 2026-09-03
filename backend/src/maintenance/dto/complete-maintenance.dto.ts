import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';

export class CompleteMaintenanceDto {
  @ApiProperty({
    example: {
      check1_engine_oil: true,
      check2_oil_filter: true,
      check3_fuel_filter: true,
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
    description: '12 hạng mục checklist sau khi KTV hoàn thành thao tác',
  })
  @IsNotEmpty()
  @IsObject()
  checklistJson: Record<string, boolean>;

  @ApiPropertyOptional({
    example: false,
    description: 'Nếu phát hiện hư hỏng phát sinh ngoài phạm vi 250h -> Hệ thống tự động sinh Phiếu Sửa Chữa #SC',
  })
  @IsOptional()
  @IsBoolean()
  hasMajorDefect?: boolean;

  @ApiPropertyOptional({
    example: 'Phát hiện xì phốt thước lái và nứt dây curoa máy phát',
    description: 'Mô tả hư hỏng phát sinh chuyển sang sửa chữa',
  })
  @IsOptional()
  @IsString()
  defectDescription?: string;
}
