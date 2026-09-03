import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SosEmergencyType } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateSosAlertDto {
  @ApiProperty({ example: 1, description: 'ID xe đang điều khiển' })
  @IsNotEmpty()
  @IsNumber()
  vehicleId: number;

  @ApiProperty({ example: 13.5678, description: 'Vĩ độ GPS hiện tại' })
  @IsNotEmpty()
  @IsNumber()
  lat: number;

  @ApiProperty({ example: 106.8901, description: 'Kinh độ GPS hiện tại' })
  @IsNotEmpty()
  @IsNumber()
  lng: number;

  @ApiProperty({ example: 'Lô C14 - Nông trường 1', description: 'Địa điểm / Lô thửa' })
  @IsNotEmpty()
  @IsString()
  lotLocation: string;

  @ApiProperty({ enum: SosEmergencyType, default: SosEmergencyType.HONG_MAY })
  @IsEnum(SosEmergencyType)
  emergencyType: SosEmergencyType;

  @ApiPropertyOptional({ example: 'https://cdn.thacoagri.vn/uploads/sos-engine-leak.jpg' })
  @IsOptional()
  @IsString()
  photoUrl?: string;

  @ApiProperty({ example: 'Bể ống dẫn dầu thủy lực tay lái, xe bị kẹt lún bùn không di chuyển được' })
  @IsNotEmpty()
  @IsString()
  description: string;
}
