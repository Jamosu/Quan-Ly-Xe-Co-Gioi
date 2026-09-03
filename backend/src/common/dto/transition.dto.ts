import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class TransitionDto {
  @ApiPropertyOptional({ description: 'Lý do hoặc ghi chú cho thao tác nghiệp vụ' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  reason?: string;
}
