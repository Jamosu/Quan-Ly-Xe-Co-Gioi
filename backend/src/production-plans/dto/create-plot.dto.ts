import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PlotStatus } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreatePlotDto {
  @ApiProperty({ example: 'Lô A01', description: 'Tên lô thửa' })
  @IsNotEmpty()
  @IsString()
  plotName: string;

  @ApiProperty({ example: 10.5, description: 'Diện tích thửa (ha)' })
  @IsNotEmpty()
  @IsNumber()
  areaHa: number;

  @ApiPropertyOptional({ enum: PlotStatus, default: PlotStatus.CHUA_THUC_HIEN })
  @IsOptional()
  @IsEnum(PlotStatus)
  status?: PlotStatus;

  @ApiPropertyOptional({ example: 1, description: 'ID tài xế thực hiện' })
  @IsOptional()
  @IsNumber()
  driverId?: number;

  @ApiPropertyOptional({ example: 1, description: 'ID xe máy kéo thực hiện' })
  @IsOptional()
  @IsNumber()
  vehicleId?: number;
}
