import { ApiPropertyOptional } from '@nestjs/swagger';
import { FeedGroupType, SlaStatus } from '@prisma/client';
import { IsBoolean, IsEnum, IsOptional } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class FeedFilterDto extends PaginationDto {
  @ApiPropertyOptional({ enum: FeedGroupType, description: 'Nhóm nguyên liệu' })
  @IsOptional()
  @IsEnum(FeedGroupType)
  groupType?: FeedGroupType;

  @ApiPropertyOptional({ enum: SlaStatus, description: 'Chuẩn SLA 3 Đúng (Đúng giờ/Trễ giờ)' })
  @IsOptional()
  @IsEnum(SlaStatus)
  slaStatus?: SlaStatus;

  @ApiPropertyOptional({ description: 'Trạng thái quyết toán' })
  @IsOptional()
  @IsBoolean()
  isSettled?: boolean;
}
