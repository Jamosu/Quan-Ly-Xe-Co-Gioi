import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class AttachImplementDto {
  @ApiProperty({ example: 1, description: 'ID xe máy kéo cần gắn nông cụ' })
  @IsNotEmpty()
  @IsNumber()
  vehicleId: number;

  @ApiPropertyOptional({ example: 2.5, description: 'Độ mòn chảo cày lúc bắt đầu gắn (mm)' })
  @IsOptional()
  @IsNumber()
  startWearMm?: number;

  @ApiPropertyOptional({ example: 'Gắn dàn cày 4 chảo để làm đất Lô C12 vụ chuối 2026' })
  @IsOptional()
  @IsString()
  notes?: string;
}
