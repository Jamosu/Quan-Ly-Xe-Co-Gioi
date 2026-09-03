import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateFeedTripDto {
  @ApiProperty({ example: 'TMR-2026-0314', description: 'Mã chuyến giao thức ăn' })
  @IsNotEmpty()
  @IsString()
  code: string;

  @ApiProperty({ example: 1, description: 'ID loại nguyên liệu' })
  @IsNotEmpty()
  @IsNumber()
  materialId: number;

  @ApiProperty({ example: 2, description: 'ID Xe chuyên dụng TMR / Xe ben' })
  @IsNotEmpty()
  @IsNumber()
  vehicleId: number;

  @ApiProperty({ example: 3, description: 'ID tài xế' })
  @IsNotEmpty()
  @IsNumber()
  driverId: number;

  @ApiProperty({ example: 'Trung tâm Chế biến Thức ăn TMR' })
  @IsNotEmpty()
  @IsString()
  sourceLocation: string;

  @ApiPropertyOptional({ example: 'Trạm cân phụ phẩm NT1' })
  @IsOptional()
  @IsString()
  transferPoint?: string;

  @ApiProperty({ example: 'Cụm chuồng Bò thịt 04 (XN Bò - 12.000 con)' })
  @IsNotEmpty()
  @IsString()
  destinationLocation: string;

  @ApiProperty({ example: 8.5, description: 'Khối lượng xuất xưởng (Tấn)' })
  @IsNotEmpty()
  @IsNumber()
  dispatchWeightTons: number;

  @ApiProperty({ example: '2026-08-17T06:30:00.000Z', description: 'Khung giờ SLA bắt đầu' })
  @Type(() => Date)
  @IsDate()
  slaWindowStart: Date;

  @ApiProperty({ example: '2026-08-17T08:00:00.000Z', description: 'Khung giờ SLA kết thúc' })
  @Type(() => Date)
  @IsDate()
  slaWindowEnd: Date;
}
