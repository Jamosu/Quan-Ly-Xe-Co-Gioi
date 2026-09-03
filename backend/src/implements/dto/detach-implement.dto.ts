import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString } from 'class-validator';

export class DetachImplementDto {
  @ApiPropertyOptional({ example: 4.8, description: 'Độ mòn chảo cày sau khi tháo (mm)' })
  @IsOptional()
  @IsNumber()
  endWearMm?: number;

  @ApiPropertyOptional({ example: 'Đã hoàn thành cày 15ha Lô C12, chảo cày mòn nhẹ' })
  @IsOptional()
  @IsString()
  notes?: string;
}
