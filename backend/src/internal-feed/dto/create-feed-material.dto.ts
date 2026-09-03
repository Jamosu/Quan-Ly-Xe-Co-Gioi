import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FeedGroupType } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateFeedMaterialDto {
  @ApiProperty({ example: 'Cỏ voi ủ chua lên men vi sinh', description: 'Tên nguyên liệu thức ăn' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ enum: FeedGroupType, default: FeedGroupType.CO_VOI })
  @IsEnum(FeedGroupType)
  groupType: FeedGroupType;

  @ApiPropertyOptional({ example: 68.5, description: 'Độ ẩm tiêu chuẩn (%)' })
  @IsOptional()
  @IsNumber()
  moisturePercent?: number;
}
