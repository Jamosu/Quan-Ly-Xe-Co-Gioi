import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ReturnDriverStatus } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class UpdateReturnCargoDto {
  @ApiProperty({ example: '22T Phân bón NPK 16-16-8' })
  @IsNotEmpty()
  @IsString()
  returnCargoName: string;

  @ApiProperty({ example: 22.0 })
  @IsNotEmpty()
  @IsNumber()
  returnTonnage: number;

  @ApiProperty({ example: 'Kho vật tư Nông trường 1' })
  @IsNotEmpty()
  @IsString()
  returnDestination: string;

  @ApiProperty({ enum: ReturnDriverStatus, default: ReturnDriverStatus.RETURN_LOADED })
  @IsEnum(ReturnDriverStatus)
  returnDriverStatus: ReturnDriverStatus;

  @ApiPropertyOptional({ example: 1250000 })
  @IsOptional()
  @IsNumber()
  costSavedVnd?: number;
}
