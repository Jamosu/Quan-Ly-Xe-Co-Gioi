import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class DispenseFuelDto {
  @ApiProperty({ example: 'PXK-DO-2026-0921', description: 'Mã phiếu xuất kho cấp dầu' })
  @IsNotEmpty()
  @IsString()
  ticketCode: string;

  @ApiProperty({ example: 1, description: 'ID kho bồn / xe bồn cấp dầu' })
  @IsNotEmpty()
  @IsNumber()
  warehouseId: number;

  @ApiProperty({ example: 1, description: 'ID xe cơ giới nhận dầu' })
  @IsNotEmpty()
  @IsNumber()
  vehicleId: number;

  @ApiProperty({ example: 2, description: 'ID tài xế nhận' })
  @IsNotEmpty()
  @IsNumber()
  driverId: number;

  @ApiProperty({ example: 65.0, description: 'Số lít dầu thực cấp (Lít)' })
  @IsNotEmpty()
  @IsNumber()
  dispensedLiters: number;

  @ApiProperty({ example: 1450.0, description: 'Giờ máy hoặc số km ODO tại thời điểm đổ dầu' })
  @IsNotEmpty()
  @IsNumber()
  engineOdoHours: number;

  @ApiProperty({ example: 60.0, description: 'Định mức tiêu chuẩn tính toán theo ca' })
  @IsNotEmpty()
  @IsNumber()
  quotaLiters: number;

  @ApiPropertyOptional({ example: 'QR-VEHICLE-MK-JD-01-FUEL-TOKEN-XYZ' })
  @IsOptional()
  @IsString()
  qrCodePayload?: string;
}
