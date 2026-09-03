import { ApiPropertyOptional } from '@nestjs/swagger';
import { PlotStatus } from '@prisma/client';
import { IsBoolean, IsEnum, IsNumber, IsOptional } from 'class-validator';

export class UpdatePlotProgressDto {
  @ApiPropertyOptional({ enum: PlotStatus })
  @IsOptional()
  @IsEnum(PlotStatus)
  status?: PlotStatus;

  @ApiPropertyOptional({ example: 8.5, description: 'Giờ máy thực tế tiêu hao' })
  @IsOptional()
  @IsNumber()
  actualMachineHours?: number;

  @ApiPropertyOptional({ example: 106.25, description: 'Lượng dầu DO thực tế tiêu hao' })
  @IsOptional()
  @IsNumber()
  actualFuelLiters?: number;

  @ApiPropertyOptional({ example: 1, description: 'ID tài xế' })
  @IsOptional()
  @IsNumber()
  driverId?: number;

  @ApiPropertyOptional({ example: 1, description: 'ID xe máy kéo' })
  @IsOptional()
  @IsNumber()
  vehicleId?: number;

  @ApiPropertyOptional({ example: true, description: 'Đã quyết toán tài chính' })
  @IsOptional()
  @IsBoolean()
  isSettledFinance?: boolean;
}
