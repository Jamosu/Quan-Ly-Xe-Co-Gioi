import { ApiPropertyOptional } from '@nestjs/swagger';
import { DriverEmploymentStatus, DriverShiftStatus, Unit } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { DriverComplianceStatus } from '../driver-compliance';

export class DriverProfileFilterDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'ID đơn vị chủ quản hồ sơ tài xế' })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  managementUnitId?: number;

  @ApiPropertyOptional({ description: 'ID Đội/Tổ trực thuộc' })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  teamUnitId?: number;

  @ApiPropertyOptional({ description: 'ID Đội trưởng cơ giới đang quản lý' })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  managerUserId?: number;

  @ApiPropertyOptional({ enum: Unit })
  @IsOptional()
  @IsEnum(Unit)
  unit?: Unit;

  @ApiPropertyOptional({ description: 'Xí nghiệp/đơn vị trong hồ sơ nhân sự' })
  @IsOptional()
  @IsString()
  enterprise?: string;

  @ApiPropertyOptional({ description: 'Đội, tổ hoặc nông trường' })
  @IsOptional()
  @IsString()
  team?: string;

  @ApiPropertyOptional({ description: 'Chức danh' })
  @IsOptional()
  @IsString()
  position?: string;

  @ApiPropertyOptional({ description: 'Khu liên hợp' })
  @IsOptional()
  @IsString()
  complex?: string;

  @ApiPropertyOptional({ description: 'Mã Khu liên hợp' })
  @IsOptional()
  @IsString()
  complexCode?: string;

  @ApiPropertyOptional({ enum: DriverEmploymentStatus })
  @IsOptional()
  @IsEnum(DriverEmploymentStatus)
  employmentStatus?: DriverEmploymentStatus;

  @ApiPropertyOptional({ enum: DriverShiftStatus })
  @IsOptional()
  @IsEnum(DriverShiftStatus)
  shiftStatus?: DriverShiftStatus;

  @ApiPropertyOptional({ enum: DriverComplianceStatus })
  @IsOptional()
  @IsEnum(DriverComplianceStatus)
  complianceStatus?: DriverComplianceStatus;
}
