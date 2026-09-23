import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { MaintenanceAlertTier, Unit, VehicleCategory, VehicleOperationalDomain, VehicleStatus } from '@prisma/client';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class VehicleFilterDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'ID xí nghiệp/khu vực quản lý chính thức' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  managementUnitId?: number;

  @ApiPropertyOptional({ description: 'ID nhân sự quản lý cơ giới đang được phân công (-1 để lọc xe chưa phân quản lý)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(-1)
  managerUserId?: number;

  @ApiPropertyOptional({ example: 'KOUN_MOM', description: 'Mã khu liên hợp' })
  @IsOptional()
  @IsString()
  complexCode?: string;

  @ApiPropertyOptional({ example: 'MAY_CONG_TRINH', description: 'Nhóm MMTB chuẩn' })
  @IsOptional()
  @IsString()
  assetGroup?: string;

  @ApiPropertyOptional({ example: 1, description: 'ID danh mục chủng loại xe' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  vehicleTypeId?: number;

  @ApiPropertyOptional({ example: 'MAY_DAO', description: 'Mã danh mục chủng loại xe' })
  @IsOptional()
  @IsString()
  vehicleTypeCode?: string;

  @ApiPropertyOptional({ enum: VehicleCategory, description: 'Chủng loại xe' })
  @IsOptional()
  @IsEnum(VehicleCategory)
  category?: VehicleCategory;

  @ApiPropertyOptional({ enum: Unit, description: 'Đơn vị quản lý enum' })
  @IsOptional()
  @IsEnum(Unit)
  unit?: Unit;

  @ApiPropertyOptional({ example: 'DP', description: 'Mã khu vực (DP, LP, AD)' })
  @IsOptional()
  @IsString()
  regionCode?: string;

  @ApiPropertyOptional({ example: 'CGTC DP', description: 'Mã đơn vị sử dụng chi tiết' })
  @IsOptional()
  @IsString()
  assignedUnitCode?: string;

  @ApiPropertyOptional({ example: 'Lô 85 DP4', description: 'Nơi tập kết / Bãi xe tập kết' })
  @IsOptional()
  @IsString()
  currentLocationName?: string;

  @ApiPropertyOptional({ example: 'ATT-A23-0025', description: 'Mã Bravo ERP' })
  @IsOptional()
  @IsString()
  bravoCode?: string;

  @ApiPropertyOptional({ example: 'KOMATSU', description: 'Hãng / nhãn hiệu' })
  @IsOptional()
  @IsString()
  manufacturer?: string;

  @ApiPropertyOptional({ example: 1, description: 'ID hãng sản xuất chuẩn' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  manufacturerRefId?: number;

  @ApiPropertyOptional({ example: 'PC40MR-3', description: 'Model phương tiện' })
  @IsOptional()
  @IsString()
  modelName?: string;

  @ApiPropertyOptional({ example: 1, description: 'ID model xe chuẩn' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  modelRefId?: number;

  @ApiPropertyOptional({ example: 'NHẬT BẢN', description: 'Xuất xứ' })
  @IsOptional()
  @IsString()
  origin?: string;

  @ApiPropertyOptional({ example: 2024, description: 'Năm sản xuất (-1 để lọc xe chưa rõ năm sản xuất)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(-1)
  @Max(2100)
  manufactureYear?: number;

  @ApiPropertyOptional({ description: 'Trạng thái hoạt động' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ enum: MaintenanceAlertTier, description: 'Cảnh báo 250h (Xanh/Vàng/Đỏ)' })
  @IsOptional()
  @IsEnum(MaintenanceAlertTier)
  alertTier?: MaintenanceAlertTier;

  @ApiPropertyOptional({ enum: VehicleOperationalDomain })
  @IsOptional()
  @IsEnum(VehicleOperationalDomain)
  operationalDomain?: VehicleOperationalDomain;

  @ApiPropertyOptional({ description: 'Chỉ lấy chủng loại được phép dùng làm xe chủ lực' })
  @IsOptional()
  @Transform(({ obj, key }) => {
    const raw = obj ? obj[key] : undefined;
    if (raw === 'true' || raw === true || raw === 1 || raw === '1') return true;
    if (raw === 'false' || raw === false || raw === 0 || raw === '0') return false;
    return undefined;
  })
  isAssignable?: boolean;

  @ApiPropertyOptional({ description: 'true: đã gắn GPS; false: chưa gắn GPS' })
  @IsOptional()
  @Transform(({ obj, key }) => {
    const raw = obj ? obj[key] : undefined;
    if (raw === 'true' || raw === true || raw === 1 || raw === '1') return true;
    if (raw === 'false' || raw === false || raw === 0 || raw === '0') return false;
    return undefined;
  })
  hasGps?: boolean;

  @ApiPropertyOptional({ description: 'true: đã có tài xế/quản lý; false: chưa phân tài xế/quản lý' })
  @IsOptional()
  @Transform(({ obj, key }) => {
    const raw = obj ? obj[key] : undefined;
    if (raw === 'true' || raw === true || raw === 1 || raw === '1') return true;
    if (raw === 'false' || raw === false || raw === 0 || raw === '0') return false;
    return undefined;
  })
  hasDriver?: boolean;
}
