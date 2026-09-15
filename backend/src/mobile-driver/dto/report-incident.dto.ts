import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, MaxLength } from 'class-validator';

export enum IncidentAssetType {
  VEHICLE = 'VEHICLE',
  IMPLEMENT = 'IMPLEMENT',
}

export class ReportIncidentDto {
  @ApiProperty({ enum: IncidentAssetType })
  @IsEnum(IncidentAssetType)
  assetType: IncidentAssetType;

  @ApiProperty({ description: 'ID xe hoặc thiết bị phụ trợ' })
  @IsInt()
  assetId: number;

  @ApiProperty({ description: 'Mô tả tình trạng hư hỏng' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  description: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  photoUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({ enum: ['DISPATCH', 'TRANSPORT', 'FEED'] })
  @IsOptional()
  @IsString()
  orderType?: 'DISPATCH' | 'TRANSPORT' | 'FEED';

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  orderId?: number;
}
