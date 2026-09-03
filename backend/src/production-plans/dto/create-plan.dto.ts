import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PlanStatus, ProductionStage, Unit } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsDate, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreatePlanDto {
  @ApiProperty({ example: 'KH-2026-NT1-008', description: 'Mã kế hoạch tác nghiệp' })
  @IsNotEmpty()
  @IsString()
  code: string;

  @ApiProperty({ example: 'Kế hoạch làm đất vụ Chuối 2026 - NT1', description: 'Tiêu đề' })
  @IsNotEmpty()
  @IsString()
  title: string;

  @ApiProperty({ enum: ProductionStage, default: ProductionStage.LAM_DAT })
  @IsEnum(ProductionStage)
  stage: ProductionStage;

  @ApiProperty({ enum: Unit, default: Unit.NT1 })
  @IsEnum(Unit)
  unit: Unit;

  @ApiProperty({ example: 'Lô A1 - A12, Khoảnh 4', description: 'Lô thửa phụ trách' })
  @IsNotEmpty()
  @IsString()
  lotPlot: string;

  @ApiProperty({ example: 120.5, description: 'Chỉ tiêu diện tích (ha)' })
  @IsNotEmpty()
  @IsNumber()
  targetAreaHa: number;

  @ApiPropertyOptional({ example: 6, description: 'Số lượng xe phân bổ' })
  @IsOptional()
  @IsNumber()
  assignedVehiclesCount?: number;

  @ApiPropertyOptional({ example: 3800.0, description: 'Định mức dầu DO cấp (Lít)' })
  @IsOptional()
  @IsNumber()
  fuelQuotaLiters?: number;

  @ApiPropertyOptional({ example: 1, description: 'ID Giám sát / Quản đốc phụ trách' })
  @IsOptional()
  @IsNumber()
  supervisorId?: number;

  @ApiProperty({ example: '2026-08-15T00:00:00.000Z' })
  @Type(() => Date)
  @IsDate()
  startDate: Date;

  @ApiProperty({ example: '2026-08-30T00:00:00.000Z' })
  @Type(() => Date)
  @IsDate()
  endDate: Date;

  @ApiPropertyOptional({ enum: PlanStatus, default: PlanStatus.DRAFT })
  @IsOptional()
  @IsEnum(PlanStatus)
  status?: PlanStatus;

  @ApiPropertyOptional({ example: '2026-08-17T00:00:00.000Z' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  weekStart?: Date;

  @ApiPropertyOptional({ example: 'KOUN_MOM' })
  @IsOptional()
  @IsString()
  complexCode?: string;
}
