import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class FleetHistoryFilterDto {
  @ApiPropertyOptional({ description: 'Mã khu liên hợp (KOUN_MOM, SNOUL, NAM_LAO, ALL)' })
  @IsOptional()
  @IsString()
  complexCode?: string;

  @ApiPropertyOptional({ description: 'Đơn vị trực thuộc' })
  @IsOptional()
  @IsString()
  unit?: string;

  @ApiPropertyOptional({ description: 'Từ khóa tìm kiếm (mã xe, tên xe, biển số, mã sự kiện)' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Phân loại biến động (ALL, bts, driver, fuel, delivery)' })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional({ description: 'ID phương tiện cụ thể' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  vehicleId?: number;

  @ApiPropertyOptional({ description: 'Số trang' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Số dòng mỗi trang' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number = 30;
}
