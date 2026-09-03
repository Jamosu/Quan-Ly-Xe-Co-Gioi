import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class AuditChangeDto {
  @ApiProperty({ example: 'DIEU_CHINH_DIEN_TICH_LO', description: 'Hành động điều chỉnh' })
  @IsNotEmpty()
  @IsString()
  action: string;

  @ApiProperty({
    example: 'Thời tiết mưa lớn làm đất trũng nước, chuyển đổi thứ tự cày sang Lô A08 trước',
    description: 'Lý do & minh chứng điều chỉnh',
  })
  @IsNotEmpty()
  @IsString()
  reason: string;

  @ApiPropertyOptional({ example: 'Đào Văn Im (Giám đốc Nông trường 1)', description: 'Người phê duyệt' })
  @IsOptional()
  @IsString()
  approvedBy?: string;
}
