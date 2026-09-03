import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { FuelQuotaUnit, MaintenanceAlertTier, Unit, VehicleCategory, VehicleStatus } from '@prisma/client';
import { IsDate, IsEnum, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateVehicleDto {
  @ApiProperty({ example: 'CHT-MĐA-001', description: 'Mã định danh MMTB mới' })
  @IsNotEmpty()
  @IsString()
  code: string;

  @ApiPropertyOptional({ example: '70C-8899', description: 'Biển kiểm soát (nếu có)' })
  @IsOptional()
  @IsString()
  plate?: string;

  @ApiProperty({ example: 'Máy đào KOBELCO bánh xích gàu 1.2m3', description: 'Tên xe & model' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ enum: VehicleCategory, default: VehicleCategory.MAY_DAO })
  @IsEnum(VehicleCategory)
  category: VehicleCategory;

  @ApiPropertyOptional({ example: 1, description: 'ID danh mục chủng loại chuẩn' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  vehicleTypeId?: number;

  @ApiPropertyOptional({ example: 'MAY_CONG_TRINH' })
  @IsOptional()
  @IsString()
  assetGroup?: string;

  @ApiPropertyOptional({ example: 'Máy đào bánh xích gàu 0.7m3' })
  @IsOptional()
  @IsString()
  vehicleSubtype?: string;

  @ApiPropertyOptional({ enum: Unit, default: Unit.BAN_CO_GIOI })
  @IsOptional()
  @IsEnum(Unit, {
    message: 'Đơn vị quản lý (unit) phải thuộc một trong các giá trị hợp lệ: NT1, NT2, XN_BO, TT_BTSC, BAN_CO_GIOI, TOAN_KLH',
  })
  unit?: Unit;

  @ApiPropertyOptional({ example: 'KOUN_MOM', default: 'KOUN_MOM' })
  @IsOptional()
  @IsString()
  complexCode?: string;

  @ApiPropertyOptional({ example: 'ATT-A23-0025', description: 'Mã Bravo ERP' })
  @IsOptional()
  @IsString()
  bravoCode?: string;

  @ApiPropertyOptional({ example: 'ATT-A23-0025', description: 'Mã tài sản Kế toán' })
  @IsOptional()
  @IsString()
  assetCode?: string;

  @ApiPropertyOptional({ example: 'SK200-08', description: 'Model máy' })
  @IsOptional()
  @IsString()
  modelName?: string;

  @ApiPropertyOptional({ example: 'KOBELCO', description: 'Nhãn hiệu' })
  @IsOptional()
  @IsString()
  manufacturer?: string;

  @ApiPropertyOptional({ example: 1, description: 'ID danh mục hãng sản xuất' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  manufacturerRefId?: number;

  @ApiPropertyOptional({ example: 1, description: 'ID danh mục model' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  modelRefId?: number;

  @ApiPropertyOptional({ example: 'NHẬT BẢN', description: 'Xuất xứ' })
  @IsOptional()
  @IsString()
  origin?: string;

  @ApiPropertyOptional({ example: 2019, description: 'Năm sản xuất' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1900)
  @Max(2100)
  manufactureYear?: number;

  @ApiPropertyOptional({ example: 'R0033333', description: 'Số máy' })
  @IsOptional()
  @IsString()
  engineNumber?: string;

  @ApiPropertyOptional({ example: 'LQ16-10073', description: 'Số khung' })
  @IsOptional()
  @IsString()
  frameNumber?: string;

  @ApiPropertyOptional({ example: '170HP', description: 'Công suất' })
  @IsOptional()
  @IsString()
  powerHp?: string;

  @ApiPropertyOptional({ example: 17.0, description: 'Định mức nhiên liệu' })
  @IsOptional()
  @IsNumber()
  fuelQuotaRate?: number;

  @ApiPropertyOptional({ enum: FuelQuotaUnit, default: FuelQuotaUnit.L_PER_HOUR })
  @IsOptional()
  @IsEnum(FuelQuotaUnit)
  fuelQuotaUnit?: FuelQuotaUnit;

  @ApiPropertyOptional({ example: 'KLH', description: 'Tình trạng hợp đồng / sở hữu' })
  @IsOptional()
  @IsString()
  contractStatus?: string;

  @ApiPropertyOptional({ example: 'THACO AGRI', description: 'Công ty sở hữu' })
  @IsOptional()
  @IsString()
  companyOwner?: string;

  @ApiPropertyOptional({ example: 'CGTC DP', description: 'Đơn vị sử dụng chi tiết' })
  @IsOptional()
  @IsString()
  assignedUnitCode?: string;

  @ApiPropertyOptional({ example: 'DP', description: 'Mã khu vực (DP, LP, AD)' })
  @IsOptional()
  @IsString()
  regionCode?: string;

  @ApiPropertyOptional({ example: 1, description: 'ID tài xế mặc định phụ trách' })
  @IsOptional()
  @IsNumber()
  defaultDriverId?: number;

  @ApiPropertyOptional({ enum: VehicleStatus, default: VehicleStatus.CHO_PHAN_CONG })
  @IsOptional()
  @IsEnum(VehicleStatus)
  status?: VehicleStatus;

  @ApiPropertyOptional({ example: 1250.5, description: 'Tổng số giờ máy lũy kế' })
  @IsOptional()
  @IsNumber()
  totalMachineHours?: number;

  @ApiPropertyOptional({ example: 145.0, description: 'Số giờ máy kể từ lần bảo dưỡng gần nhất (0-250h)' })
  @IsOptional()
  @IsNumber()
  hoursSinceLastService?: number;

  @ApiPropertyOptional({ enum: MaintenanceAlertTier, default: MaintenanceAlertTier.GREEN })
  @IsOptional()
  @IsEnum(MaintenanceAlertTier)
  alertTier?: MaintenanceAlertTier;

  @ApiPropertyOptional({ example: 18500, description: 'Số km ODO' })
  @IsOptional()
  @IsNumber()
  odoKm?: number;

  @ApiPropertyOptional({ example: 12.5, description: 'Định mức tiêu hao dầu tiêu chuẩn (L/h hoặc L/100km)' })
  @IsOptional()
  @IsNumber()
  fuelRateStandard?: number;

  @ApiPropertyOptional({ example: 13.5678 })
  @IsOptional()
  @IsNumber()
  currentLat?: number;

  @ApiPropertyOptional({ example: 106.8901 })
  @IsOptional()
  @IsNumber()
  currentLng?: number;

  @ApiPropertyOptional({ example: 'ĐQSD', description: 'Mã MMTB cũ' })
  @IsOptional()
  @IsString()
  oldCode?: string;

  @ApiPropertyOptional({ example: 'ĐQSD', description: 'Tình trạng mua (Mua mới / ĐQSD)' })
  @IsOptional()
  @IsString()
  purchaseCondition?: string;

  @ApiPropertyOptional({ example: '2020-01-05', description: 'Ngày phân bổ' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  allocationDate?: Date;

  @ApiPropertyOptional({ example: 'Bình thường', description: 'Tình trạng chi tiết (Bình thường / Hỏng)' })
  @IsOptional()
  @IsString()
  conditionStatus?: string;

  @ApiPropertyOptional({ example: 'Điều chuyển từ KLH Snoul về Koun Mom', description: 'Lịch sử điều chuyển' })
  @IsOptional()
  @IsString()
  transferHistory?: string;

  @ApiPropertyOptional({ example: 340.0, description: 'Dung tích thùng nhiên liệu (lít)' })
  @IsOptional()
  @IsNumber()
  fuelTankCapacity?: number;

  @ApiPropertyOptional({ example: 'Công ty CP Ô tô Trường Hải', description: 'Nhà cung cấp' })
  @IsOptional()
  @IsString()
  supplier?: string;

  @ApiPropertyOptional({ example: 'Ghi chú hiện trạng', description: 'Ghi chú' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ example: 'https://...', description: 'Hình ảnh MMTB' })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiPropertyOptional({ example: 'Kích thước, tải trọng và cấu hình kỹ thuật từ Excel' })
  @IsOptional()
  @IsString()
  technicalSpecs?: string;

  @ApiPropertyOptional({ example: '7235 x 2496 x 3351' })
  @IsOptional()
  @IsString()
  dimensions?: string;

  @ApiPropertyOptional({ example: '4.1 ha/8h' })
  @IsOptional()
  @IsString()
  productivity?: string;

  @ApiPropertyOptional({ example: '2026-03-19' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  inspectionDate?: Date;

  @ApiPropertyOptional({ example: '2027-03-19' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  inspectionExpiryDate?: Date;

  @ApiPropertyOptional({ example: '2027-02-19' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  nextInspectionDate?: Date;

  @ApiPropertyOptional({ example: '2026-06-20' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  roadFeeDate?: Date;

  @ApiPropertyOptional({ example: '2027-06-20' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  roadFeeExpiryDate?: Date;

  @ApiPropertyOptional({ example: '2027-05-20' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  nextRoadFeeDate?: Date;

  @ApiPropertyOptional({ example: 'Bãi xe Daun Penh' })
  @IsOptional()
  @IsString()
  currentLocationName?: string;

  @ApiPropertyOptional({ example: 'Phạm Ngọc Hải', description: 'Nhân sự quản lý' })
  @IsOptional()
  @IsString()
  managerName?: string;

  @ApiPropertyOptional({ example: '0825456565', description: 'Số liên lạc / Zalo' })
  @IsOptional()
  @IsString()
  managerPhone?: string;
}
