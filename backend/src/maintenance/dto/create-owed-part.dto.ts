import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateOwedPartDto {
  @ApiPropertyOptional({ example: 1, description: 'ID phiếu bảo dưỡng cũ (tương thích)' })
  @IsOptional()
  @IsNumber()
  maintenanceRecordId?: number;

  @ApiPropertyOptional({ example: 1, description: 'ID yêu cầu xưởng thống nhất' })
  @IsOptional()
  @IsNumber()
  workshopRequestId?: number;

  @ApiPropertyOptional({ example: 1, description: 'ID xe' })
  @IsOptional()
  @IsNumber()
  vehicleId?: number;

  @ApiPropertyOptional({ example: 1, description: 'ID thiết bị' })
  @IsOptional()
  @IsNumber()
  implementId?: number;

  @ApiProperty({ example: 'Lọc tách nước Donaldson P550881', description: 'Tên phụ tùng còn thiếu nợ lại' })
  @IsNotEmpty()
  @IsString()
  missingPartName: string;

  @ApiPropertyOptional({ example: 'DL-P550881' })
  @IsOptional()
  @IsString()
  partCode?: string;

  @ApiPropertyOptional({ example: '2026-08-22T00:00:00.000Z', description: 'Dự kiến kho cấp bù' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  scheduledRestockDate?: Date;

  @ApiPropertyOptional({ example: 'Kho phụ tùng hết hàng Donaldson, dự kiến hàng về đợt 2 tuần sau' })
  @IsOptional()
  @IsString()
  technicianNotes?: string;
}
