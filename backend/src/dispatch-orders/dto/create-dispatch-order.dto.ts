import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DispatchSourceType, Unit } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsDate, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateDispatchOrderDto {
  @ApiProperty({ example: 'LC-2026-0512', description: 'Mã lệnh điều xe' })
  @IsNotEmpty()
  @IsString()
  code: string;

  @ApiProperty({ enum: Unit, default: Unit.NT1 })
  @IsEnum(Unit)
  unit: Unit;

  @ApiProperty({ example: 'San gạt mặt bằng đường giao thông nội đồng Lô B' })
  @IsNotEmpty()
  @IsString()
  purpose: string;

  @ApiProperty({ example: 'Kho cơ giới Trung tâm' })
  @IsNotEmpty()
  @IsString()
  origin: string;

  @ApiProperty({ example: 'Lô B04 - NT2' })
  @IsNotEmpty()
  @IsString()
  destination: string;

  @ApiPropertyOptional({ example: 1, description: 'ID phương tiện cơ giới' })
  @IsOptional()
  @IsNumber()
  vehicleId?: number;

  @ApiPropertyOptional({ example: 2, description: 'ID tài xế vận hành' })
  @IsOptional()
  @IsNumber()
  driverId?: number;

  @ApiPropertyOptional({ example: '2026-08-17T06:30:00.000Z' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  departureTime?: Date;

  @ApiPropertyOptional({ example: '2026-08-17T17:00:00.000Z' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  returnTime?: Date;

  @ApiPropertyOptional({ enum: DispatchSourceType, default: DispatchSourceType.MANUAL })
  @IsOptional()
  @IsEnum(DispatchSourceType)
  sourceType?: DispatchSourceType;

  @ApiPropertyOptional() @IsOptional() @IsNumber() productionOrderId?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() implementId?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Date) @IsDate() plannedEndTime?: Date;
  @ApiPropertyOptional() @IsOptional() @IsString() legacyVehicle?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() legacyDriver?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() legacyImplement?: string;

  @ApiPropertyOptional({ example: 'Yêu cầu kiểm tra dầu nhớt trước khi xuất bãi' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ example: 'Kế hoạch dự thảo chuẩn bị mặt bằng mở rộng' })
  @IsOptional()
  @IsString()
  planNotes?: string;

  @ApiPropertyOptional({ example: 'Cày lật sâu 30-35cm khử chua tầng đáy' })
  @IsOptional()
  @IsString()
  taskNotes?: string;
}
