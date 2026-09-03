import { ApiPropertyOptional } from '@nestjs/swagger';
import { DriverEmploymentStatus, Unit } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class DriverProfileFilterDto extends PaginationDto {
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
}
