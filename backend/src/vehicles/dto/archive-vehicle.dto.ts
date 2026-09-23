import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class ArchiveVehicleDto {
  @ApiProperty({ example: 'Xe đã thanh lý theo biên bản số 12/2026' })
  @IsString()
  @MinLength(3)
  reason: string;
}
