import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ImplementCategory, ImplementStatus, TechnicalCondition, Unit } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateImplementDto {
  @ApiProperty({ example: 'TB-DC-04', description: 'Mã nông cụ' })
  @IsNotEmpty()
  @IsString()
  code: string;

  @ApiProperty({ example: 'Dàn cày 4 chảo Kubota 26 inch', description: 'Tên nông cụ' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ enum: ImplementCategory, default: ImplementCategory.DAN_CAY })
  @IsEnum(ImplementCategory)
  category: ImplementCategory;

  @ApiPropertyOptional({ enum: Unit, default: Unit.BAN_CO_GIOI })
  @IsOptional()
  @IsEnum(Unit)
  unit?: Unit;

  @ApiPropertyOptional({ enum: ImplementStatus, default: ImplementStatus.IN_DEPOT })
  @IsOptional()
  @IsEnum(ImplementStatus)
  status?: ImplementStatus;

  @ApiPropertyOptional({ enum: TechnicalCondition, default: TechnicalCondition.GOOD })
  @IsOptional()
  @IsEnum(TechnicalCondition)
  technicalCondition?: TechnicalCondition;

  @ApiPropertyOptional({ example: 'Cày lật đất tầng sâu 30-35cm trước khi lên luống chuối' })
  @IsOptional()
  @IsString()
  standardPurpose?: string;

  @ApiPropertyOptional({ example: 'Nguyễn Tấn Triều' })
  @IsOptional()
  @IsString()
  managerName?: string;

  @ApiPropertyOptional({ example: 'Lô 85 DP4' })
  @IsOptional()
  @IsString()
  gatheringLocation?: string;

  @ApiPropertyOptional({ example: '05974160290' })
  @IsOptional()
  @IsString()
  managerPhone?: string;
}
