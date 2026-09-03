import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CalculateKpiDto {
  @ApiProperty({ example: 2, description: 'ID tài xế' })
  @IsNotEmpty()
  @IsNumber()
  driverId: number;

  @ApiProperty({ example: '08/2026', description: 'Tháng/Năm đánh giá' })
  @IsNotEmpty()
  @IsString()
  monthYear: string;

  @ApiPropertyOptional({ example: 45, description: 'Số chuyến thực hiện trong tháng' })
  @IsOptional()
  @IsNumber()
  tripsCount?: number;

  @ApiPropertyOptional({ example: 1250.0, description: 'Số km vận hành GPS' })
  @IsOptional()
  @IsNumber()
  distanceKm?: number;

  @ApiPropertyOptional({ example: 168.5, description: 'Số giờ máy hoạt động' })
  @IsOptional()
  @IsNumber()
  machineHours?: number;

  @ApiPropertyOptional({ example: 85.0, description: 'Số lít dầu tiết kiệm được so với định mức' })
  @IsOptional()
  @IsNumber()
  fuelSavedLiters?: number;
}
