import { ApiPropertyOptional } from '@nestjs/swagger';
import { ReturnDriverStatus, RouteType, TransportStatus, Unit } from '@prisma/client';
import { IsBoolean, IsEnum, IsOptional } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class TransportFilterDto extends PaginationDto {
  @ApiPropertyOptional({ enum: Unit })
  @IsOptional()
  @IsEnum(Unit)
  unit?: Unit;
  @ApiPropertyOptional({ enum: RouteType, description: 'Loại tuyến (1 Chiều / Đối Lưu 2 Chiều)' })
  @IsOptional()
  @IsEnum(RouteType)
  routeType?: RouteType;

  @ApiPropertyOptional({ enum: TransportStatus, description: 'Trạng thái vận chuyển' })
  @IsOptional()
  @IsEnum(TransportStatus)
  status?: TransportStatus;

  @ApiPropertyOptional({ enum: ReturnDriverStatus, description: 'Trạng thái chiều về' })
  @IsOptional()
  @IsEnum(ReturnDriverStatus)
  returnDriverStatus?: ReturnDriverStatus;

  @ApiPropertyOptional({ description: 'Chỉ lọc xe bị lệch lộ trình / vượt tốc độ' })
  @IsOptional()
  @IsBoolean()
  isRouteDeviated?: boolean;
}
