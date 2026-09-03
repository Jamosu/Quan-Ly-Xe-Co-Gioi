import { ApiPropertyOptional } from '@nestjs/swagger';
import { TransportStatus } from '@prisma/client';
import { IsBoolean, IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';

export class UpdateTransportTelemetryDto {
  @ApiPropertyOptional({ example: 68.5, description: 'Tốc độ hiện tại (km/h)' })
  @IsOptional()
  @IsNumber()
  speedKmH?: number;

  @ApiPropertyOptional({ example: false, description: 'Có bị lệch lộ trình' })
  @IsOptional()
  @IsBoolean()
  isRouteDeviated?: boolean;

  @ApiPropertyOptional({ example: 'Đường Quốc lộ 4 đang sửa cầu, rẽ tránh qua tỉnh lộ' })
  @IsOptional()
  @IsString()
  deviationReason?: string;

  @ApiPropertyOptional({ enum: TransportStatus })
  @IsOptional()
  @IsEnum(TransportStatus)
  status?: TransportStatus;
}
