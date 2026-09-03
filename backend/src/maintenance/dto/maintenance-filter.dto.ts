import { ApiPropertyOptional } from '@nestjs/swagger';
import { MaintenanceAlertTier, MaintenanceStatus } from '@prisma/client';
import { IsEnum, IsNumber, IsOptional } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class MaintenanceFilterDto extends PaginationDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsNumber()
  vehicleId?: number;

  @ApiPropertyOptional({ enum: MaintenanceStatus })
  @IsOptional()
  @IsEnum(MaintenanceStatus)
  status?: MaintenanceStatus;

  @ApiPropertyOptional({ enum: MaintenanceAlertTier })
  @IsOptional()
  @IsEnum(MaintenanceAlertTier)
  alertTier?: MaintenanceAlertTier;
}
