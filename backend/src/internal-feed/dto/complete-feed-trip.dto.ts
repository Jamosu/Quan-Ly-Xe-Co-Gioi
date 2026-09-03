import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CompleteFeedTripDto {
  @ApiProperty({ example: 8.42, description: 'Khối lượng thực nhận tại chuồng bò (Tấn)' })
  @IsNotEmpty()
  @IsNumber()
  receiveWeightTons: number;

  @ApiPropertyOptional({ example: '2026-08-17T07:45:00.000Z', description: 'Thời điểm hoàn thành rải cám' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  completedFeedTime?: Date;

  @ApiProperty({ example: 'Nguyễn Văn Tâm - Trưởng cụm chuồng 04', description: 'Ký nhận người tiếp nhận' })
  @IsNotEmpty()
  @IsString()
  receiverSignature: string;

  @ApiPropertyOptional({ example: 'Đường trơn mưa nhỏ chậm 10 phút' })
  @IsOptional()
  @IsString()
  delayReason?: string;
}
