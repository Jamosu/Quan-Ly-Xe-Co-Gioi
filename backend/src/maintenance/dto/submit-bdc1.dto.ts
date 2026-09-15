import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsInt, IsNumber, IsObject, IsOptional, IsString } from 'class-validator';

export class SubmitBdc1Dto {
  @ApiProperty()
  @IsInt()
  vehicleId: number;

  @ApiProperty({ type: Object })
  @IsObject()
  checklistJson: Record<string, boolean>;

  @ApiPropertyOptional({ description: 'Giờ máy đầu ca theo đồng hồ thiết bị' })
  @IsOptional()
  @IsNumber()
  openingMachineHours?: number;

  @ApiPropertyOptional({ description: 'ODO đầu ca theo đồng hồ thiết bị' })
  @IsOptional()
  @IsNumber()
  openingOdoKm?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  photoUrls?: string[];
}
