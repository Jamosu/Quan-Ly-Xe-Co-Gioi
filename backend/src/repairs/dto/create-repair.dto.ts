import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RepairStatus, RepairTier } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsDate, IsEnum, IsNotEmpty, IsNumber, IsObject, IsOptional, IsString } from 'class-validator';

export class CreateRepairDto {
  @ApiProperty({ example: 'SC-2026-0042', description: 'Mã phiếu sửa chữa' })
  @IsNotEmpty()
  @IsString()
  code: string;

  @ApiProperty({ example: 1, description: 'ID phương tiện sửa chữa' })
  @IsNotEmpty()
  @IsNumber()
  vehicleId: number;

  @ApiPropertyOptional({ example: 2, description: 'ID tài xế báo hỏng' })
  @IsOptional()
  @IsNumber()
  reportedByDriverId?: number;

  @ApiPropertyOptional({ example: 3, description: 'ID Kỹ thuật viên phụ trách' })
  @IsOptional()
  @IsNumber()
  assignedTechnicianId?: number;

  @ApiProperty({ enum: RepairTier, default: RepairTier.TIEU_TU })
  @IsEnum(RepairTier)
  repairTier: RepairTier;

  @ApiProperty({ example: 'Đứt dây curoa máy phát điện, hỏng rotuyn lái ngoài bên phụ' })
  @IsNotEmpty()
  @IsString()
  issueDescription: string;

  @ApiPropertyOptional({ example: 2500000, description: 'Chi phí dự toán sửa chữa (VNĐ)' })
  @IsOptional()
  @IsNumber()
  estimatedCostVnd?: number;

  @ApiPropertyOptional({
    example: [
      { partName: 'Dây curoa Gates 9PK', quantity: 1, unitPrice: 450000 },
      { partName: 'Rotuyn lái ngoài CTR', quantity: 2, unitPrice: 650000 },
      { partName: 'Công thợ sửa chữa', quantity: 1, unitPrice: 750000 },
    ],
  })
  @IsOptional()
  replacedPartsJson?: any;

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  plannedStartAt?: Date;

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  plannedEndAt?: Date;
}
