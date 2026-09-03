import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class StartTripDto {
  @ApiProperty({ example: 1, description: 'ID Lệnh điều xe hoặc Vận đơn' })
  @IsNotEmpty()
  @IsNumber()
  orderId: number;

  @ApiProperty({ example: 'DISPATCH', enum: ['DISPATCH', 'TRANSPORT', 'FEED'], description: 'Loại lệnh' })
  @IsNotEmpty()
  @IsString()
  orderType: 'DISPATCH' | 'TRANSPORT' | 'FEED';

  @ApiProperty({ example: 18500.0, description: 'Số km ODO / Giờ máy khi bắt đầu ca' })
  @IsNotEmpty()
  @IsNumber()
  startOdoKm: number;

  @ApiPropertyOptional({ example: 'https://cdn.thacoagri.vn/uploads/odo-start-70C8899.jpg', description: 'Ảnh chụp công-tơ-mét' })
  @IsOptional()
  @IsString()
  startPhotoUrl?: string;
}
