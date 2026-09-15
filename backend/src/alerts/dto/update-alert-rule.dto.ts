import { ApiPropertyOptional } from '@nestjs/swagger';
import { AlertRuleStatus, AlertSeverity } from '@prisma/client';
import { IsEnum, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateAlertRuleDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(191)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({ enum: AlertSeverity })
  @IsOptional()
  @IsEnum(AlertSeverity)
  severity?: AlertSeverity;

  @ApiPropertyOptional({ enum: AlertRuleStatus })
  @IsOptional()
  @IsEnum(AlertRuleStatus)
  status?: AlertRuleStatus;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  configJson?: Record<string, unknown>;
}
