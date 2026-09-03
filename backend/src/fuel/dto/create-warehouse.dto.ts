import { ApiProperty } from '@nestjs/swagger';
import { Unit, WarehouseType } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class CreateWarehouseDto {
  @ApiProperty({ example: 'Kho bồn Trung tâm 45.000L' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ enum: WarehouseType, default: WarehouseType.STATIONARY_TANK_45000L })
  @IsEnum(WarehouseType)
  type: WarehouseType;

  @ApiProperty({ example: 45000.0, description: 'Dung tích chứa tối đa (Lít)' })
  @IsNotEmpty()
  @IsNumber()
  capacityLiters: number;

  @ApiProperty({ example: 38500.0, description: 'Lượng tồn kho hiện tại (Lít)' })
  @IsNotEmpty()
  @IsNumber()
  currentStockLiters: number;

  @ApiProperty({ enum: Unit, default: Unit.BAN_CO_GIOI })
  @IsEnum(Unit)
  unit: Unit;
}
