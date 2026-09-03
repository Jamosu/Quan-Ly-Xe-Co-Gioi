import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class FinishTripDto {
  @ApiProperty({ example: 1, description: 'ID Lệnh' })
  @IsNotEmpty()
  @IsNumber()
  orderId: number;

  @ApiProperty({ example: 'DISPATCH', enum: ['DISPATCH', 'TRANSPORT', 'FEED'] })
  @IsNotEmpty()
  @IsString()
  orderType: 'DISPATCH' | 'TRANSPORT' | 'FEED';

  @ApiProperty({ example: 18585.0, description: 'Số km ODO / Giờ máy khi kết thúc ca' })
  @IsNotEmpty()
  @IsNumber()
  finishOdoKm: number;

  @ApiPropertyOptional({ example: 'https://cdn.thacoagri.vn/uploads/odo-finish-70C8899.jpg' })
  @IsOptional()
  @IsString()
  finishPhotoUrl?: string;

  @ApiPropertyOptional({ example: 'Đã hoàn thành 100% san gạt mặt bằng lô B04' })
  @IsOptional()
  @IsString()
  completionNotes?: string;
}
