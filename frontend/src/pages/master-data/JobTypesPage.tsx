import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Briefcase,
  Building2,
  Download,
  Edit2,
  FileCheck,
  Fuel,
  Layers,
  MapPin,
  Navigation,
  Plus,
  RefreshCw,
  HardHat,
  Search,
  Settings2,
  Tractor,
  Trash2,
  Truck,
  Wrench,
  CheckCircle2,
  Filter,
  SlidersHorizontal,
  RotateCcw,
} from 'lucide-react';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { Column, DataTable } from '../../components/data-display/DataTable';
import { useAppStore } from '../../store/useAppStore';
import {
  JobPlanType,
  MASTER_JOBS,
  getNextJobCode,
  getStoredStages,
} from '../../data/jobCatalogData';
import {
  AgriculturalPlotItem,
  AgriculturalTeamItem,
  ConstructionSiteItem,
  ConstructionTeamItem,
  getStoredPlots,
  getStoredAgriTeams,
  getStoredConstructionSites,
  getStoredConstructionTeams,
  getNextPlotCode,
  getNextAgriTeamCode,
  getNextSiteCode,
  getNextTeamCode,
} from '../../data/locationCatalogData';
import { SearchableSelect, SelectOption } from '../../components/common/SearchableSelect';

// Các Tabs chuẩn xác theo nghiệp vụ quản lý danh mục kế hoạch & điều xe
export type JobCatalogTab =
  | 'jobs'        // 1. Hạng mục công việc cơ giới & định mức
  | 'stages'      // 2. Giai đoạn & Phân loại hạng mục thi công/vận chuyển
  | 'implements'  // 3. Danh mục Nhóm Nông cụ & Thiết bị phụ trợ
  | 'orderTypes'  // 4. Loại lệnh điều động cơ giới
  | 'routes'      // 5. Tuyến đường vận chuyển nội bộ (theo KLH - Vận chuyển)
  | 'sites'       // 5. Khu vực thi công (theo KLH - Ban Xây dựng quản lý)
  | 'plots'       // 5. Lô / Thửa canh tác Nông nghiệp (theo KLH - Xí nghiệp - Nông trường)
  | 'teams';      // 6. Đội cơ giới (Nông nghiệp hoặc Ban Xây dựng)

export interface JobItem {
  id: string;
  code: string;
  name: string;
  planType: JobPlanType;
  stageCode: string;
  stageName: string;
  implementGroup: string; // Nhóm nông cụ tương thích (tham chiếu danh mục nông cụ)
  hasImplement: boolean;
  recommendedVehicle: string;
  defaultUnit: string;
  quotaPerShift: string;
  fuelQuota: number;
  fuelUnit: string;
  complexCode: string; // Thuộc KLH
  description?: string;
}

export interface StageItem {
  id: string;
  code: string;
  name: string;
  planType: JobPlanType;
  description: string;
  sequence: number;
  status: 'active' | 'inactive';
}

export interface ImplementGroupItem {
  id: string;
  code: string;
  name: string;
  planType: JobPlanType;
  category: string;
  compatibleVehicles: string;
  description: string;
  status: 'active' | 'inactive';
}

export interface OrderTypeItem {
  id: string;
  code: string;
  name: string;
  category: string;
  orderGroup: 'NONG_NGHIEP' | 'CONG_TRINH' | 'VAN_TAI' | 'CUU_HO';
  measuringMethod: string;
  fuelQuotaType: string;
  isEmergency: boolean;
  requiresImplement: boolean;
  requiresLotPlot: boolean;
  requiresRoute: boolean;
  targetScope: string;
  description: string;
  status: 'active' | 'inactive';
}

export interface TransportRouteItem {
  id: string;
  code: string;
  name: string;
  complexCode: string;
  complexName: string;
  origin: string; // Điểm đi
  destination: string; // Điểm đến
  distanceKm: number; // Cự ly km
  cargoType: string; // Loại phụ phẩm / hàng hóa
  speedLimitKmH: number; // Giới hạn tốc độ
  status: 'active' | 'inactive';
  notes?: string;
}

const KLH_OPTIONS = [
  { code: 'ALL', name: 'Tất cả Khu liên hợp' },
  { code: 'KOUN_MOM', name: 'Khu liên hợp Koun Mom' },
  { code: 'SNOUL', name: 'Khu liên hợp Snoul' },
  { code: 'NAM_LAO', name: 'Khu liên hợp Nam Lào' },
];

export const STAGES_BY_PLAN_TYPE: Record<JobPlanType, { code: string; name: string }[]> = {
  NONG_NGHIEP: [
    { code: 'LAM_DAT', name: '1. Làm đất' },
    { code: 'TRONG_MOI', name: '2. Trồng mới & Chăm sóc' },
    { code: 'THU_HOACH', name: '3. Thu hoạch' },
  ],
  CONG_TRINH: [
    { code: 'DAO_DAP', name: '1. Đào đắp mương máng & hồ đập' },
    { code: 'SAN_LAP', name: '2. San lấp mặt bằng & tạo cos nền' },
    { code: 'GIAO_THONG', name: '3. Mở đường & Lu lèn giao thông nội bộ' },
    { code: 'BAO_DUONG', name: '4. Nạo vét & Duy tu hạ tầng công trình' },
  ],
  VAN_CHUYEN: [
    { code: 'CHUYEN_CHUOI', name: '1. Vận chuyển chuối xuất khẩu' },
    { code: 'CHUYEN_THUC_AN', name: '2. Vận chuyển thức ăn gia súc (Bò)' },
    { code: 'CHUYEN_VAT_TU', name: '3. Vận chuyển phân bón & vật tư' },
    { code: 'CHUYEN_NOI_BO', name: '4. Tiếp liệu & Điều chuyển cơ giới' },
  ],
};

// DỮ LIỆU KHỞI TẠO CHO CÁC GIAI ĐOẠN / PHÂN LOẠI CÔNG VIỆC CẢ 3 LOẠI KẾ HOẠCH
const INITIAL_STAGES: StageItem[] = [
  // Nông nghiệp
  { id: 'STG-NN-01', code: 'LAM_DAT', name: '1. Làm đất', planType: 'NONG_NGHIEP', description: 'Cày sâu 30cm, bừa đĩa tơi xốp, phay xới tạo luống', sequence: 1, status: 'active' },
  { id: 'STG-NN-02', code: 'TRONG_MOI', name: '2. Trồng mới & Chăm sóc', planType: 'NONG_NGHIEP', description: 'Khoan hố đặt bầu, rải vôi khử trùng, bón lót hữu cơ, phun thuốc BVTV', sequence: 2, status: 'active' },
  { id: 'STG-NN-03', code: 'THU_HOACH', name: '3. Thu hoạch', planType: 'NONG_NGHIEP', description: 'Cắt buồng chuối, gom kéo mooc về trạm đóng gói, băm nghiền thân cây', sequence: 3, status: 'active' },

  // Công trình
  { id: 'STG-CT-01', code: 'DAO_DAP', name: '1. Đào đắp mương máng & hồ đập', planType: 'CONG_TRINH', description: 'Đào mương trục chính, nạo vét bùn lắng, đào hố móng hồ lắng sinh học', sequence: 1, status: 'active' },
  { id: 'STG-CT-02', code: 'SAN_LAP', name: '2. San lấp mặt bằng & tạo cos nền', planType: 'CONG_TRINH', description: 'Ủi gạt tạo mặt bằng sân bãi, đắp bờ bao ngăn lũ và kè chống sạt lở', sequence: 2, status: 'active' },
  { id: 'STG-CT-03', code: 'GIAO_THONG', name: '3. Mở đường & Lu lèn giao thông nội bộ', planType: 'CONG_TRINH', description: 'Bù vê tạo mặt đường, rải cấp phối đá dăm và lu rung đạt K95', sequence: 3, status: 'active' },
  { id: 'STG-CT-04', code: 'BAO_DUONG', name: '4. Nạo vét & Duy tu hạ tầng công trình', planType: 'CONG_TRINH', description: 'Duy tu định kỳ đường trục nội bộ và hệ thống mương máng mùa mưa lũ', sequence: 4, status: 'active' },

  // Vận chuyển
  { id: 'STG-VC-01', code: 'CHUYEN_CHUOI', name: '1. Vận chuyển chuối xuất khẩu', planType: 'VAN_CHUYEN', description: 'Chở buồng tươi về xưởng đóng gói và chở cont lạnh 40ft về kho trung tâm', sequence: 1, status: 'active' },
  { id: 'STG-VC-02', code: 'CHUYEN_THUC_AN', name: '2. Vận chuyển thức ăn gia súc (Bò)', planType: 'VAN_CHUYEN', description: 'Chở thân lá chuối tươi, bắp sinh khối về hầm ủ chua và trại bò thịt', sequence: 2, status: 'active' },
  { id: 'STG-VC-03', code: 'CHUYEN_VAT_TU', name: '3. Vận chuyển phân bón & vật tư', planType: 'VAN_CHUYEN', description: 'Vận chuyển phân bón, vôi, ống tưới, bao buồng từ kho tổng về chòi tập kết', sequence: 3, status: 'active' },
  { id: 'STG-VC-04', code: 'CHUYEN_NOI_BO', name: '4. Tiếp liệu & Điều chuyển cơ giới', planType: 'VAN_CHUYEN', description: 'Tiếp ứng dầu Diesel, nước sinh hoạt và điều chuyển máy móc nông cụ', sequence: 4, status: 'active' },
];

// DỮ LIỆU KHỞI TẠO CHO DANH MỤC NÔNG CỤ & THIẾT BỊ PHỤ TRỢ (3 LOẠI KẾ HOẠCH)
const INITIAL_IMPLEMENTS: ImplementGroupItem[] = [
  // Nông nghiệp
  { id: 'IMP-NN-01', code: 'NC-CAY-01', name: 'Dàn cày 3 - 4 chảo', planType: 'NONG_NGHIEP', category: 'Cày xới đất', compatibleVehicles: 'Máy kéo 70 - 90HP', description: 'Cày phá lâm, khử chua tầng đáy', status: 'active' },
  { id: 'IMP-NN-02', code: 'NC-BUA-01', name: 'Dàn bừa đĩa 24 chảo', planType: 'NONG_NGHIEP', category: 'Làm mịn đất', compatibleVehicles: 'Máy kéo 70 - 90HP', description: 'Bừa tơi xốp mặt đất sau cày lật', status: 'active' },
  { id: 'IMP-NN-03', code: 'NC-XOI-01', name: 'Dàn xới đất phay', planType: 'NONG_NGHIEP', category: 'Làm mịn đất', compatibleVehicles: 'Máy kéo 50 - 70HP', description: 'Phay xới mặt luống đặt bầu chuối', status: 'active' },
  { id: 'IMP-NN-04', code: 'NC-LUONG-01', name: 'Dàn lên luống 2 tim', planType: 'NONG_NGHIEP', category: 'Tạo luống', compatibleVehicles: 'Máy kéo 70 - 90HP', description: 'Lên luống cao 35cm chuẩn thoát nước', status: 'active' },
  { id: 'IMP-NN-05', code: 'NC-KHOAN-01', name: 'Dàn khoan hố tự hành', planType: 'NONG_NGHIEP', category: 'Trồng mới', compatibleVehicles: 'Máy kéo nhỏ 40 - 50HP', description: 'Khoan hố đặt bầu chuối cấy mô', status: 'active' },
  { id: 'IMP-NN-06', code: 'NC-RAIPHAN-01', name: 'Dàn rải phân / vôi đĩa quay', planType: 'NONG_NGHIEP', category: 'Chăm sóc', compatibleVehicles: 'Máy kéo 40 - 50HP', description: 'Rải vôi bột và phân hữu cơ vi sinh', status: 'active' },
  { id: 'IMP-NN-07', code: 'NC-PHUN-01', name: 'Dàn phun thuốc boom 12m', planType: 'NONG_NGHIEP', category: 'BVTV', compatibleVehicles: 'Máy kéo bánh cao 50 - 60HP', description: 'Phun phòng trừ nấm bệnh Sigatoka', status: 'active' },
  { id: 'IMP-NN-08', code: 'NC-MOOC-01', name: 'Rơ-moóc chuyên dụng treo chuối', planType: 'NONG_NGHIEP', category: 'Thu hoạch', compatibleVehicles: 'Máy kéo 50 - 70HP', description: 'Đệm mút giảm chấn chống trầy xước buồng chuối', status: 'active' },
  { id: 'IMP-NN-09', code: 'NC-BAM-01', name: 'Dàn băm thân cây PTO', planType: 'NONG_NGHIEP', category: 'Thu hoạch', compatibleVehicles: 'Máy kéo 70 - 90HP', description: 'Băm mịn thân cây rải đều mặt ruộng', status: 'active' },
  { id: 'IMP-NN-10', code: 'NC-NONE-01', name: 'Không gắn nông cụ (Xe tự hành)', planType: 'NONG_NGHIEP', category: 'Khác', compatibleVehicles: 'Mọi dòng máy kéo', description: 'Xe di chuyển không mang theo nông cụ', status: 'active' },

  // Công trình
  { id: 'IMP-CT-01', code: 'TB-NONE-CT', name: 'Không gắn nông cụ (Xe cơ giới thi công độc lập)', planType: 'CONG_TRINH', category: 'Thi công', compatibleVehicles: 'Máy ủi, máy đào, máy san', description: 'Thi công với trang bị nguyên bản của xe', status: 'active' },
  { id: 'IMP-CT-02', code: 'TB-GAU-01', name: 'Gầu đào 0.5 - 0.8m³', planType: 'CONG_TRINH', category: 'Đào đắp', compatibleVehicles: 'Máy đào bánh xích PC200', description: 'Đào mương máng thoát nước, vét bùn', status: 'active' },
  { id: 'IMP-CT-03', code: 'TB-LUI-01', name: 'Lưỡi ủi san phẳng đất', planType: 'CONG_TRINH', category: 'San gạt', compatibleVehicles: 'Máy ủi D6R, D6', description: 'San lấp mặt bằng, đắp bờ bao ngăn lũ', status: 'active' },
  { id: 'IMP-CT-04', code: 'TB-BUA-01', name: 'Búa đập đá thủy lực', planType: 'CONG_TRINH', category: 'Phá vỡ', compatibleVehicles: 'Máy đào PC200', description: 'Phá đá móng công trình, san lấp nền', status: 'active' },
  { id: 'IMP-CT-05', code: 'TB-LU-01', name: 'Trống lu rung thép', planType: 'CONG_TRINH', category: 'Đầm nén', compatibleVehicles: 'Xe lu rung 14T', description: 'Đầm nén nền đường nội bộ K95', status: 'active' },

  // Vận chuyển
  { id: 'IMP-VC-01', code: 'MOOC-CH-01', name: 'Rơ-moóc chuyên dụng chở chuối', planType: 'VAN_CHUYEN', category: 'Nông sản', compatibleVehicles: 'Xe đầu kéo, máy kéo', description: 'Chở chuối tươi từ lô về xưởng sơ chế', status: 'active' },
  { id: 'IMP-VC-02', code: 'MOOC-SAN-01', name: 'Sơ-mi rơ-moóc sàn 40ft', planType: 'VAN_CHUYEN', category: 'Vật tư', compatibleVehicles: 'Đầu kéo container', description: 'Chở vật tư cồng kềnh, cuộn ống tưới, phân bón', status: 'active' },
  { id: 'IMP-VC-03', code: 'MOOC-CONT-01', name: 'Sơ-mi rơ-moóc xương chở cont', planType: 'VAN_CHUYEN', category: 'Container', compatibleVehicles: 'Đầu kéo container', description: 'Kéo container 40ft chuối lạnh xuất khẩu', status: 'active' },
  { id: 'IMP-VC-04', code: 'THUNG-BEN-01', name: 'Thùng ben tự đổ 8 - 15 tấn', planType: 'VAN_CHUYEN', category: 'Ben tự đổ', compatibleVehicles: 'Xe ben 10 - 15T', description: 'Chở phân bón, đất đá san lấp, phế phẩm', status: 'active' },
  { id: 'IMP-VC-05', code: 'XITEC-BON-01', name: 'Bồn xitec chuyên dụng bơm xả lưu động', planType: 'VAN_CHUYEN', category: 'Nhiên liệu & Nước', compatibleVehicles: 'Xe bồn xitec 5 khối', description: 'Tiếp dầu diesel và nước cho máy ngoài đồng', status: 'active' },
];

// DỮ LIỆU KHỞI TẠO CHUẨN XÁC TỪ MASTER_JOBS
const INITIAL_JOBS: JobItem[] = MASTER_JOBS.map((j) => ({
  id: j.id,
  code: j.code,
  name: j.name,
  planType: j.planType,
  stageCode: j.categoryCode,
  stageName: j.categoryName,
  hasImplement: !j.implementGroup.includes('Không gắn'),
  implementGroup: j.implementGroup,
  recommendedVehicle: j.recommendedVehicle,
  defaultUnit: j.defaultUnit,
  quotaPerShift: j.quotaPerShift,
  fuelQuota: j.fuelQuota,
  fuelUnit: j.fuelUnit,
  complexCode: j.complexCode,
  description: j.description,
}));

const INITIAL_ORDER_TYPES: OrderTypeItem[] = [
  {
    id: 'ORD-01',
    code: 'LL-LSX',
    name: 'Lệnh Sản Xuất Nông Nghiệp',
    orderGroup: 'NONG_NGHIEP',
    category: 'Lệnh sản xuất nông nghiệp (Làm đất → Trồng mới → Thu hoạch)',
    measuringMethod: 'Theo ca máy (8 - 12h) / Héc-ta (ha)',
    fuelQuotaType: '18.5 L/ha cày ải (hoặc Lít/h)',
    isEmergency: false,
    requiresImplement: true,
    requiresLotPlot: true,
    requiresRoute: false,
    targetScope: 'Máy kéo bánh hơi / bánh xích (40 - 90HP) + Nông cụ',
    description: 'Điều động máy móc làm đất, trồng mới, thu hoạch theo kế hoạch tuần gắn Lô/Thửa.',
    status: 'active',
  },
  {
    id: 'ORD-02',
    code: 'LL-LCT',
    name: 'Lệnh Điều Xe Công Trình & Ca Máy',
    orderGroup: 'CONG_TRINH',
    category: 'Lệnh thi công công trình & hạ tầng',
    measuringMethod: 'Theo giờ máy (8h/ca) / Khối lượng đào đắp',
    fuelQuotaType: 'Lít/giờ máy (14.5 L/h)',
    isEmergency: false,
    requiresImplement: false,
    requiresLotPlot: false,
    requiresRoute: false,
    targetScope: 'Máy ủi, Máy xúc đào, Máy san gạt, Máy lu',
    description: 'Quản lý ca máy san gạt đường nội đồng, nạo vét kênh mương, làm mặt bằng theo giờ máy.',
    status: 'active',
  },
  {
    id: 'ORD-03',
    code: 'LL-LVC',
    name: 'Lệnh Vận Chuyển Nội Bộ',
    orderGroup: 'VAN_TAI',
    category: 'Lệnh vận chuyển nội bộ (Luồng 3 chặng phụ phẩm & chuối)',
    measuringMethod: 'Theo chuyến (Km & Tấn) / Cont',
    fuelQuotaType: '30.0 L/100km Howo (hoặc Lít/chuyến)',
    isEmergency: false,
    requiresImplement: false,
    requiresLotPlot: false,
    requiresRoute: true,
    targetScope: 'Xe tải thùng, Xe ben, Đầu kéo Container, Xe bồn, Sơ-mi rơ-moóc',
    description: 'Vận chuyển vật tư kho, phân bón, dầu diesel, bao bì, chuối xuất khẩu, luồng 3 chặng TĂCN bò.',
    status: 'active',
  },
  {
    id: 'ORD-04',
    code: 'LL-LĐX',
    name: 'Lệnh Điều Xe Công Tác & Cứu Hộ',
    orderGroup: 'CUU_HO',
    category: 'Lệnh điều động công tác & ứng cứu khẩn cấp',
    measuringMethod: 'Theo đợt công tác / Giờ kéo cứu hộ',
    fuelQuotaType: 'Theo cự ly GPS thực tế / Khoán sự vụ',
    isEmergency: true,
    requiresImplement: true,
    requiresLotPlot: true,
    requiresRoute: false,
    targetScope: 'Xe bán tải, Xe chỉ huy, Máy kéo công suất lớn (90 - 110HP) + Cáp cứu hộ',
    description: 'Điều xe công tác liên nông trường và kéo cứu hộ máy móc sự cố ngoài đồng; kích hoạt tức thì.',
    status: 'active',
  },
];

const INITIAL_ROUTES: TransportRouteItem[] = [
  {
    id: 'RTE-KM-01',
    code: 'TD-KM-01',
    name: 'Nông trường 1 ➔ Xí nghiệp Bò Koun Mom',
    complexCode: 'KOUN_MOM',
    complexName: 'Khu liên hợp Koun Mom',
    origin: 'Kho phụ phẩm Nông trường 1 (Lô A/B)',
    destination: 'Trại Bò thịt - Xí nghiệp Chăn nuôi Bò',
    distanceKm: 12.5,
    cargoType: 'Thân & lá chuối tươi (thức ăn thô xanh)',
    speedLimitKmH: 35,
    status: 'active',
    notes: 'Tuyến đường đất cấp phối, chạy cẩn thận khi trời mưa.',
  },
  {
    id: 'RTE-KM-02',
    code: 'TD-KM-02',
    name: 'Nông trường 2 ➔ Trung tâm Chế biến Thức ăn (TĂCN)',
    complexCode: 'KOUN_MOM',
    complexName: 'Khu liên hợp Koun Mom',
    origin: 'Cánh đồng bắp sinh khối NT2 (Lô C)',
    destination: 'Hầm ủ chua - TT Chế biến TĂCN',
    distanceKm: 18.0,
    cargoType: 'Bắp sinh khối sau thu hoạch',
    speedLimitKmH: 40,
    status: 'active',
    notes: 'Yêu cầu phủ bạt kín tránh rơi vãi dọc trục đường chính.',
  },
  {
    id: 'RTE-KM-03',
    code: 'TD-KM-03',
    name: 'Lô thu hoạch ➔ Trạm sơ chế đóng gói chuối',
    complexCode: 'KOUN_MOM',
    complexName: 'Khu liên hợp Koun Mom',
    origin: 'Cụm Lô thu hoạch (Lô D01 - D03)',
    destination: 'Xưởng đóng gói Chuối xuất khẩu',
    distanceKm: 4.5,
    cargoType: 'Đoàn rơ-moóc buồng chuối tươi',
    speedLimitKmH: 15,
    status: 'active',
    notes: 'Tốc độ tối đa 15 km/h để chống trầy xước buồng chuối.',
  },
  {
    id: 'RTE-KM-04',
    code: 'TD-KM-04',
    name: 'Kho Tổng KLH ➔ Chòi tập kết Nông trường',
    complexCode: 'KOUN_MOM',
    complexName: 'Khu liên hợp Koun Mom',
    origin: 'Kho Tổng Vật tư KLH Koun Mom',
    destination: 'Kho đệm Đội cơ giới NT1 & NT2',
    distanceKm: 8.0,
    cargoType: 'Phân bón vô cơ, vôi bột, bao buồng',
    speedLimitKmH: 35,
    status: 'active',
    notes: 'Vận chuyển kèm phiếu xuất kho vật tư.',
  },
  {
    id: 'RTE-SN-01',
    code: 'TD-SN-01',
    name: 'Nông trường Cao su Snoul ➔ Xưởng chế biến mủ',
    complexCode: 'SNOUL',
    complexName: 'Khu liên hợp Snoul',
    origin: 'Trạm mủ NT Cao su Snoul',
    destination: 'Nhà máy chế biến mủ Snoul',
    distanceKm: 14.2,
    cargoType: 'Mủ cao su đông đặc',
    speedLimitKmH: 40,
    status: 'active',
    notes: 'Kiểm tra bồn chứa kín trước khi xuất phát.',
  },
  {
    id: 'RTE-NL-01',
    code: 'TD-NL-01',
    name: 'Khu nông nghiệp Paksong ➔ Trại bò Nam Lào',
    complexCode: 'NAM_LAO',
    complexName: 'Khu liên hợp Nam Lào',
    origin: 'Vùng đệm cỏ voi Paksong',
    destination: 'Trại Bò giống Nam Lào',
    distanceKm: 22.0,
    cargoType: 'Cỏ voi ủ chua & phụ phẩm bắp',
    speedLimitKmH: 45,
    status: 'active',
    notes: 'Tuyến đường đèo dốc nhẹ, chú ý hệ thống phanh xe ben.',
  },
];

// DANH MỤC LỰA CHỌN GỢI Ý CHO CÁC FIELD KHÔNG THUỘC DIỆN TAB (LƯU KẾT QUẢ VÀO LOCALSTORAGE)
const DEFAULT_RECOMMENDED_VEHICLES = [
  'Máy kéo bánh hơi 70 - 90HP',
  'Máy kéo bánh hơi 50 - 70HP',
  'Máy kéo nhỏ 40 - 50HP',
  'Máy kéo bánh cao 50 - 60HP',
  'Máy đào bánh xích 0.5 - 0.8m³',
  'Máy đào bánh xích gầu 1.2m³',
  'Máy ủi D6R & Máy san gạt GD555',
  'Xe lu rung 14T & Máy san gạt',
  'Đầu kéo Container lạnh 40ft',
  'Xe tải ben 10 - 15T',
  'Xe tải thùng mui bạt 5T',
  'Xe bồn xitec 5 khối (92C-112.34)',
];

const DEFAULT_VOLUME_UNITS = [
  'ha',
  'hố',
  'km',
  'm²',
  'm³',
  'Tấn',
  'Lít',
  'Thùng',
  'Chuyến',
];

const DEFAULT_FUEL_UNITS = [
  'Lít/ha',
  'Lít/h',
  'Lít/100km',
  'Lít/chuyến',
  'Lít/ca',
];

export interface JobTypesPageProps {
  defaultDomain?: JobPlanType;
}

export const JobTypesPage: React.FC<JobTypesPageProps> = ({ defaultDomain }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();

  // Xác định Lĩnh vực hoạt động chuyên biệt dựa trên URL pathname, defaultDomain hoặc searchParams
  const selectedJobPlanType: JobPlanType = useMemo(() => {
    if (location.pathname.endsWith('/nong-nghiep')) return 'NONG_NGHIEP';
    if (location.pathname.endsWith('/cong-trinh')) return 'CONG_TRINH';
    if (location.pathname.endsWith('/van-chuyen')) return 'VAN_CHUYEN';
    if (defaultDomain) return defaultDomain;
    const domParam = searchParams.get('domain') as JobPlanType;
    if (domParam && ['NONG_NGHIEP', 'CONG_TRINH', 'VAN_CHUYEN'].includes(domParam)) {
      return domParam;
    }
    return 'NONG_NGHIEP';
  }, [location.pathname, defaultDomain, searchParams]);

  const initialTab = (searchParams.get('tab') as JobCatalogTab) || 'jobs';
  const [activeTab, setActiveTab] = useState<JobCatalogTab>(() => {
    if (selectedJobPlanType === 'NONG_NGHIEP' && ['routes', 'sites'].includes(initialTab)) {
      return 'jobs';
    }
    if (selectedJobPlanType === 'CONG_TRINH' && ['routes', 'plots'].includes(initialTab)) {
      return 'jobs';
    }
    if (selectedJobPlanType === 'VAN_CHUYEN' && ['sites', 'plots', 'teams'].includes(initialTab)) {
      return 'jobs';
    }
    return initialTab;
  });

  // Tự động chuyển về tab jobs nếu không đúng lĩnh vực chuyên biệt
  useEffect(() => {
    if (selectedJobPlanType === 'NONG_NGHIEP' && ['routes', 'sites'].includes(activeTab)) {
      setActiveTab('jobs');
      setSearchParams({ tab: 'jobs' });
    } else if (selectedJobPlanType === 'CONG_TRINH' && ['routes', 'plots'].includes(activeTab)) {
      setActiveTab('jobs');
      setSearchParams({ tab: 'jobs' });
    } else if (selectedJobPlanType === 'VAN_CHUYEN' && ['sites', 'plots', 'teams'].includes(activeTab)) {
      setActiveTab('jobs');
      setSearchParams({ tab: 'jobs' });
    }
  }, [selectedJobPlanType, activeTab, setSearchParams]);

  // Bộ lọc Khu liên hợp (Đồng bộ trực tiếp với chọn KLH trên Topbar hệ thống)
  const selectedKLH = useAppStore((state) => state.selectedKLH) || 'ALL';

  // States lưu danh mục vào LocalStorage
  const [jobs, setJobs] = useState<JobItem[]>(() => {
    try {
      const saved = localStorage.getItem('thaco_job_items_v5');
      if (saved) return JSON.parse(saved);
    } catch {}
    return INITIAL_JOBS;
  });

  // Tải danh mục Giai đoạn chuẩn từ helper đã khử trùng lặp tuyệt đối
  const [stages, setStages] = useState<StageItem[]>(() => {
    return getStoredStages();
  });

  const [implementsList, setImplementsList] = useState<ImplementGroupItem[]>(() => {
    try {
      const saved = localStorage.getItem('thaco_job_implements_v5');
      if (saved) return JSON.parse(saved);
    } catch {}
    return INITIAL_IMPLEMENTS;
  });

  const [orderTypes, setOrderTypes] = useState<OrderTypeItem[]>(() => {
    try {
      const saved = localStorage.getItem('thaco_job_order_types_v5');
      if (saved) return JSON.parse(saved);
    } catch {}
    return INITIAL_ORDER_TYPES;
  });

  const [routes, setRoutes] = useState<TransportRouteItem[]>(() => {
    try {
      const saved = localStorage.getItem('thaco_job_routes_v4');
      if (saved) return JSON.parse(saved);
    } catch {}
    return INITIAL_ROUTES;
  });

  const [sites, setSites] = useState<ConstructionSiteItem[]>(() => {
    return getStoredConstructionSites();
  });

  const [teams, setTeams] = useState<ConstructionTeamItem[]>(() => {
    return getStoredConstructionTeams();
  });

  const [plots, setPlots] = useState<AgriculturalPlotItem[]>(() => {
    return getStoredPlots();
  });

  const [agriTeams, setAgriTeams] = useState<AgriculturalTeamItem[]>(() => {
    return getStoredAgriTeams();
  });

  useEffect(() => {
    localStorage.setItem('thaco_job_items_v5', JSON.stringify(jobs));
  }, [jobs]);

  // Luôn làm sạch và khử trùng lặp tuyệt đối trước khi ghi vào localStorage
  useEffect(() => {
    const unique = new Map<string, StageItem>();
    stages.forEach((s) => {
      const codeKey = s.code?.trim().toUpperCase();
      if (codeKey && !unique.has(codeKey)) {
        unique.set(codeKey, s);
      }
    });
    const cleanList = Array.from(unique.values());
    localStorage.setItem('thaco_job_stages_v5', JSON.stringify(cleanList));
    // Bắn sự kiện storage để các form kế hoạch khác cập nhật ngay lập tức
    try {
      window.dispatchEvent(new Event('storage'));
    } catch {}
  }, [stages]);

  useEffect(() => {
    localStorage.setItem('thaco_job_implements_v5', JSON.stringify(implementsList));
  }, [implementsList]);
  useEffect(() => {
    localStorage.setItem('thaco_job_order_types_v5', JSON.stringify(orderTypes));
  }, [orderTypes]);
  useEffect(() => {
    localStorage.setItem('thaco_job_routes_v4', JSON.stringify(routes));
  }, [routes]);
  useEffect(() => {
    localStorage.setItem('thaco_construction_sites_catalog_v1', JSON.stringify(sites));
  }, [sites]);
  useEffect(() => {
    localStorage.setItem('thaco_construction_teams_catalog_v1', JSON.stringify(teams));
  }, [teams]);
  useEffect(() => {
    localStorage.setItem('thaco_plots_catalog_v1', JSON.stringify(plots));
  }, [plots]);
  useEffect(() => {
    localStorage.setItem('thaco_agri_teams_catalog_v1', JSON.stringify(agriTeams));
  }, [agriTeams]);

  // Đồng bộ searchParams URL với tab
  useEffect(() => {
    const tabParam = searchParams.get('tab') as JobCatalogTab;
    if (tabParam && ['jobs', 'stages', 'implements', 'orderTypes', 'routes', 'sites', 'plots', 'teams'].includes(tabParam)) {
      if (selectedJobPlanType === 'NONG_NGHIEP' && ['routes', 'sites'].includes(tabParam)) {
        setActiveTab('jobs');
      } else if (selectedJobPlanType === 'CONG_TRINH' && ['routes', 'plots'].includes(tabParam)) {
        setActiveTab('jobs');
      } else if (selectedJobPlanType === 'VAN_CHUYEN' && ['sites', 'plots', 'teams'].includes(tabParam)) {
        setActiveTab('jobs');
      } else {
        setActiveTab(tabParam);
      }
    }
  }, [searchParams, selectedJobPlanType]);

  // Bộ chọn & tìm kiếm
  const [search, setSearch] = useState('');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  // Searchable Filter Criteria Toolbar (Giống hình 3 mẫu của người dùng)
  const [filterCode, setFilterCode] = useState('');
  const [filterName, setFilterName] = useState('');
  const [filterStage, setFilterStage] = useState('');

  // Bộ lọc cho Lô / Thửa canh tác nông nghiệp (Theo KLH, Xí nghiệp, Nông trường)
  const [plotFilterKLH, setPlotFilterKLH] = useState('');
  const [plotFilterEnterprise, setPlotFilterEnterprise] = useState('');
  const [plotFilterFarm, setPlotFilterFarm] = useState('');
  const [plotFilterCode, setPlotFilterCode] = useState('');

  // Bộ lọc cho Đội xe cơ giới nông nghiệp (Theo KLH, Xí nghiệp, Nông trường)
  const [agriTeamFilterKLH, setAgriTeamFilterKLH] = useState('');
  const [agriTeamFilterEnterprise, setAgriTeamFilterEnterprise] = useState('');
  const [agriTeamFilterFarm, setAgriTeamFilterFarm] = useState('');
  const [agriTeamFilterCode, setAgriTeamFilterCode] = useState('');

  // Bộ lọc cho Khu vực thi công công trình (Theo KLH, Hạng mục, Đơn vị)
  const [siteFilterKLH, setSiteFilterKLH] = useState('');
  const [siteFilterCategory, setSiteFilterCategory] = useState('');
  const [siteFilterUnitOwner, setSiteFilterUnitOwner] = useState('');
  const [siteFilterCode, setSiteFilterCode] = useState('');

  // Bộ lọc cho Đội thi công Ban Xây dựng (Theo KLH, Đơn vị, Trạng thái)
  const [teamFilterKLH, setTeamFilterKLH] = useState('');
  const [teamFilterManagingUnit, setTeamFilterManagingUnit] = useState('');
  const [teamFilterStatus, setTeamFilterStatus] = useState('');
  const [teamFilterCode, setTeamFilterCode] = useState('');

  // Modals & Selected details
  const [showJobModal, setShowJobModal] = useState(false);
  const [editingJob, setEditingJob] = useState<JobItem | null>(null);
  const [selectedJobDetail, setSelectedJobDetail] = useState<JobItem | null>(null);

  // CONTROLLED FORM STATES FOR JOB MODAL
  const [formCode, setFormCode] = useState('');
  const [formName, setFormName] = useState('');
  const [formPlanType, setFormPlanType] = useState<JobPlanType>('NONG_NGHIEP');
  const [formStageCode, setFormStageCode] = useState('');
  const [formComplexCode, setFormComplexCode] = useState('KOUN_MOM');
  const [formRecommendedVehicle, setFormRecommendedVehicle] = useState('');
  const [formHasImplement, setFormHasImplement] = useState(true);
  const [formImplementGroup, setFormImplementGroup] = useState('');
  const [formQuotaPerShift, setFormQuotaPerShift] = useState('');
  const [formDefaultUnit, setFormDefaultUnit] = useState('ha');
  const [formFuelQuota, setFormFuelQuota] = useState<number>(12.0);
  const [formFuelUnit, setFormFuelUnit] = useState('Lít/ha');
  const [formDescription, setFormDescription] = useState('');

  // PERSISTENT STATE FOR NON-TAB SELECT OPTIONS (LƯU VÀO LOCALSTORAGE)
  const [recommendedVehiclesOptions, setRecommendedVehiclesOptions] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('thaco_custom_recommended_vehicles_v2');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return DEFAULT_RECOMMENDED_VEHICLES;
  });

  const [volumeUnitsOptions, setVolumeUnitsOptions] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('thaco_custom_volume_units_v2');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return DEFAULT_VOLUME_UNITS;
  });

  const [fuelUnitsOptions, setFuelUnitsOptions] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('thaco_custom_fuel_units_v2');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return DEFAULT_FUEL_UNITS;
  });

  // Handlers auto-add / delete options for non-tab fields
  const handleAddRecommendedVehicle = (val: string) => {
    const trimmed = val.trim();
    if (!trimmed) return;
    setRecommendedVehiclesOptions((prev) => {
      if (prev.includes(trimmed)) return prev;
      const next = [...prev, trimmed];
      localStorage.setItem('thaco_custom_recommended_vehicles_v2', JSON.stringify(next));
      return next;
    });
  };

  const handleDeleteRecommendedVehicle = (val: string, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setRecommendedVehiclesOptions((prev) => {
      const next = prev.filter((item) => item !== val);
      localStorage.setItem('thaco_custom_recommended_vehicles_v2', JSON.stringify(next));
      return next;
    });
    if (formRecommendedVehicle === val) {
      setFormRecommendedVehicle('');
    }
  };

  const handleAddVolumeUnit = (val: string) => {
    const trimmed = val.trim();
    if (!trimmed) return;
    setVolumeUnitsOptions((prev) => {
      if (prev.includes(trimmed)) return prev;
      const next = [...prev, trimmed];
      localStorage.setItem('thaco_custom_volume_units_v2', JSON.stringify(next));
      return next;
    });
  };

  const handleDeleteVolumeUnit = (val: string, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setVolumeUnitsOptions((prev) => {
      const next = prev.filter((item) => item !== val);
      localStorage.setItem('thaco_custom_volume_units_v2', JSON.stringify(next));
      return next;
    });
    if (formDefaultUnit === val) {
      setFormDefaultUnit('');
    }
  };

  const handleAddFuelUnit = (val: string) => {
    const trimmed = val.trim();
    if (!trimmed) return;
    setFuelUnitsOptions((prev) => {
      if (prev.includes(trimmed)) return prev;
      const next = [...prev, trimmed];
      localStorage.setItem('thaco_custom_fuel_units_v2', JSON.stringify(next));
      return next;
    });
  };

  const handleDeleteFuelUnit = (val: string, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setFuelUnitsOptions((prev) => {
      const next = prev.filter((item) => item !== val);
      localStorage.setItem('thaco_custom_fuel_units_v2', JSON.stringify(next));
      return next;
    });
    if (formFuelUnit === val) {
      setFormFuelUnit('');
    }
  };

  // Modals for other tabs
  const [showRouteModal, setShowRouteModal] = useState(false);
  const [editingRoute, setEditingRoute] = useState<TransportRouteItem | null>(null);

  const [showStageModal, setShowStageModal] = useState(false);
  const [editingStage, setEditingStage] = useState<StageItem | null>(null);

  const [showImplementModal, setShowImplementModal] = useState(false);
  const [editingImplement, setEditingImplement] = useState<ImplementGroupItem | null>(null);

  const [showOrderTypeModal, setShowOrderTypeModal] = useState(false);
  const [editingOrderType, setEditingOrderType] = useState<OrderTypeItem | null>(null);

  const [showSiteModal, setShowSiteModal] = useState(false);
  const [editingSite, setEditingSite] = useState<ConstructionSiteItem | null>(null);

  const [showTeamModal, setShowTeamModal] = useState(false);
  const [editingTeam, setEditingTeam] = useState<ConstructionTeamItem | null>(null);

  const [showPlotModal, setShowPlotModal] = useState(false);
  const [editingPlot, setEditingPlot] = useState<AgriculturalPlotItem | null>(null);

  const [showAgriTeamModal, setShowAgriTeamModal] = useState(false);
  const [editingAgriTeam, setEditingAgriTeam] = useState<AgriculturalTeamItem | null>(null);

  const handleTabChange = (tab: JobCatalogTab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
    setSearch('');
    setSelectedItems([]);
  };

  const toggleSelectItem = (id: string) => {
    setSelectedItems((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  // Mở modal thêm công việc mới: TỰ ĐỘNG TÍNH TOÁN MÃ TĂNG DẦN VÀ DEFAULT CHUẨN XÁC
  const handleOpenCreateJob = (targetPlanType?: JobPlanType) => {
    const planType = targetPlanType || selectedJobPlanType;
    const validStages = stages.filter((s) => s.planType === planType && s.status === 'active');
    const firstStage = validStages[0]?.code || (planType === 'CONG_TRINH' ? 'DAO_DAP' : planType === 'VAN_CHUYEN' ? 'CHUYEN_CHUOI' : 'LAM_DAT');
    const nextCode = getNextJobCode(planType, firstStage, jobs);

    const validImplements = implementsList.filter((i) => i.planType === planType && i.status === 'active');
    const firstImplement = validImplements[0]?.name || (
      planType === 'CONG_TRINH'
        ? 'Không gắn nông cụ (Xe cơ giới thi công độc lập)'
        : planType === 'VAN_CHUYEN'
        ? 'Rơ-moóc chuyên dụng chở chuối'
        : 'Dàn cày 3 - 4 chảo'
    );

    setEditingJob(null);
    setFormCode(nextCode);
    setFormName('');
    setFormPlanType(planType);
    setFormStageCode(firstStage);
    setFormComplexCode(selectedKLH !== 'ALL' ? selectedKLH : 'KOUN_MOM');
    setFormDescription('');

    if (planType === 'NONG_NGHIEP') {
      setFormRecommendedVehicle('Máy kéo bánh hơi 70 - 90HP');
      setFormHasImplement(true);
      setFormImplementGroup(firstImplement);
      setFormQuotaPerShift('4.5 ha/ca 8h');
      setFormDefaultUnit('ha');
      setFormFuelQuota(12.0);
      setFormFuelUnit('Lít/ha');
    } else if (planType === 'CONG_TRINH') {
      setFormRecommendedVehicle('Máy đào bánh xích 0.5 - 0.8m³');
      setFormHasImplement(false);
      setFormImplementGroup(firstImplement);
      setFormQuotaPerShift('1 ca 8 giờ máy');
      setFormDefaultUnit('m³');
      setFormFuelQuota(14.5);
      setFormFuelUnit('Lít/h');
    } else {
      setFormRecommendedVehicle('Xe đầu kéo Container 40ft / Xe tải ben');
      setFormHasImplement(true);
      setFormImplementGroup(firstImplement);
      setFormQuotaPerShift('4 chuyến/ca 8h');
      setFormDefaultUnit('Tấn');
      setFormFuelQuota(28.0);
      setFormFuelUnit('Lít/100km');
    }

    setShowJobModal(true);
  };

  // Mở modal sửa công việc
  const handleOpenEditJob = (job: JobItem) => {
    setEditingJob(job);
    setFormCode(job.code);
    setFormName(job.name);
    setFormPlanType(job.planType);
    setFormStageCode(job.stageCode);
    setFormComplexCode(job.complexCode);
    setFormRecommendedVehicle(job.recommendedVehicle);
    setFormHasImplement(job.hasImplement);
    setFormImplementGroup(job.implementGroup);
    setFormQuotaPerShift(job.quotaPerShift);
    setFormDefaultUnit(job.defaultUnit || (job.planType === 'NONG_NGHIEP' ? 'ha' : job.planType === 'CONG_TRINH' ? 'm³' : 'Tấn'));
    setFormFuelQuota(job.fuelQuota);
    setFormFuelUnit(job.fuelUnit);
    setFormDescription(job.description || '');
    setShowJobModal(true);
  };

  // KHI THAY ĐỔI LOẠI KẾ HOẠCH TRONG MODAL: TỰ ĐỘNG ĐỔI CẢ MÃ TĂNG DẦN VÀ CÁC THÔNG SỐ ĐỊNH MỨC
  const handlePlanTypeChangeInModal = (newType: JobPlanType) => {
    setFormPlanType(newType);

    const validStages = stages.filter((s) => s.planType === newType && s.status === 'active');
    const firstStage = validStages[0]?.code || (newType === 'CONG_TRINH' ? 'DAO_DAP' : newType === 'VAN_CHUYEN' ? 'CHUYEN_CHUOI' : 'LAM_DAT');
    setFormStageCode(firstStage);

    const validImplements = implementsList.filter((i) => i.planType === newType && i.status === 'active');
    const firstImplement = validImplements[0]?.name || (
      newType === 'CONG_TRINH'
        ? 'Không gắn nông cụ (Xe cơ giới thi công độc lập)'
        : newType === 'VAN_CHUYEN'
        ? 'Rơ-moóc chuyên dụng chở chuối'
        : 'Dàn cày 3 - 4 chảo'
    );
    setFormImplementGroup(firstImplement);

    // Nếu đang thêm mới, tính lại Mã quy trình tăng dần và cập nhật các thông số định mức
    if (!editingJob) {
      const nextCode = getNextJobCode(newType, firstStage, jobs);
      setFormCode(nextCode);

      if (newType === 'NONG_NGHIEP') {
        setFormRecommendedVehicle('Máy kéo bánh hơi 70 - 90HP');
        setFormHasImplement(true);
        setFormQuotaPerShift('4.5 ha/ca 8h');
        setFormDefaultUnit('ha');
        setFormFuelQuota(12.0);
        setFormFuelUnit('Lít/ha');
      } else if (newType === 'CONG_TRINH') {
        setFormRecommendedVehicle('Máy đào bánh xích 0.5 - 0.8m³');
        setFormHasImplement(false);
        setFormQuotaPerShift('1 ca 8 giờ máy');
        setFormDefaultUnit('m³');
        setFormFuelQuota(14.5);
        setFormFuelUnit('Lít/h');
      } else {
        setFormRecommendedVehicle('Xe đầu kéo Container 40ft / Xe tải ben');
        setFormHasImplement(true);
        setFormQuotaPerShift('4 chuyến/ca 8h');
        setFormDefaultUnit('Tấn');
        setFormFuelQuota(28.0);
        setFormFuelUnit('Lít/100km');
      }
    }
  };

  // Lọc dữ liệu theo Search, KLH và Lĩnh vực hoạt động - SẮP XẾP MÃ CÔNG VIỆC TĂNG DẦN
  const filteredJobs = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = jobs.filter((j) => {
      const matchKlh = selectedKLH === 'ALL' || j.complexCode === selectedKLH;
      const matchPlanType = j.planType === selectedJobPlanType;
      const matchCriteriaCode = !filterCode || j.code.toLowerCase().includes(filterCode.toLowerCase());
      const matchCriteriaName = !filterName || j.name.toLowerCase().includes(filterName.toLowerCase());
      const matchCriteriaStage = !filterStage || j.stageCode === filterStage || j.stageName.toLowerCase().includes(filterStage.toLowerCase());
      const matchSearch =
        !q ||
        j.code.toLowerCase().includes(q) ||
        j.name.toLowerCase().includes(q) ||
        (j.description && j.description.toLowerCase().includes(q)) ||
        j.implementGroup.toLowerCase().includes(q) ||
        j.recommendedVehicle.toLowerCase().includes(q);
      return matchKlh && matchPlanType && matchCriteriaCode && matchCriteriaName && matchCriteriaStage && matchSearch;
    });

    // Sắp xếp mã công việc tăng dần (Strictly Ascending Sorting by Job Code)
    list.sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true, sensitivity: 'base' }));

    return list;
  }, [jobs, search, selectedKLH, selectedJobPlanType, filterCode, filterName, filterStage]);

  const filteredRoutes = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = routes.filter((r) => {
      const matchKlh = selectedKLH === 'ALL' || r.complexCode === selectedKLH;
      const matchSearch =
        !q ||
        r.code.toLowerCase().includes(q) ||
        r.name.toLowerCase().includes(q) ||
        r.origin.toLowerCase().includes(q) ||
        r.destination.toLowerCase().includes(q) ||
        r.cargoType.toLowerCase().includes(q);
      return matchKlh && matchSearch;
    });
    list.sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true, sensitivity: 'base' }));
    return list;
  }, [routes, search, selectedKLH]);

  const filteredSites = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = sites.filter((s) => {
      const matchKlh = selectedKLH === 'ALL' || s.complexCode === selectedKLH;
      const matchFilterKLH = !siteFilterKLH || s.complexCode === siteFilterKLH;
      const matchFilterCategory = !siteFilterCategory || s.category === siteFilterCategory;
      const matchFilterUnitOwner = !siteFilterUnitOwner || s.unitOwner.toLowerCase().includes(siteFilterUnitOwner.toLowerCase());
      const matchFilterCode =
        !siteFilterCode ||
        s.code.toLowerCase().includes(siteFilterCode.toLowerCase()) ||
        s.name.toLowerCase().includes(siteFilterCode.toLowerCase());
      const matchSearch =
        !q ||
        s.code.toLowerCase().includes(q) ||
        s.name.toLowerCase().includes(q) ||
        s.unitOwner.toLowerCase().includes(q) ||
        s.categoryName.toLowerCase().includes(q) ||
        s.targetScope.toLowerCase().includes(q) ||
        s.recommendedMachines.toLowerCase().includes(q);
      return matchKlh && matchFilterKLH && matchFilterCategory && matchFilterUnitOwner && matchFilterCode && matchSearch;
    });
    list.sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true, sensitivity: 'base' }));
    return list;
  }, [sites, search, selectedKLH, siteFilterKLH, siteFilterCategory, siteFilterUnitOwner, siteFilterCode]);

  const filteredTeams = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = teams.filter((t) => {
      const matchKlh = selectedKLH === 'ALL' || t.complexCode === selectedKLH;
      const matchFilterKLH = !teamFilterKLH || t.complexCode === teamFilterKLH;
      const matchFilterManagingUnit = !teamFilterManagingUnit || t.managingUnit.toLowerCase().includes(teamFilterManagingUnit.toLowerCase());
      const matchFilterStatus = !teamFilterStatus || t.status === teamFilterStatus;
      const matchFilterCode =
        !teamFilterCode ||
        t.code.toLowerCase().includes(teamFilterCode.toLowerCase()) ||
        t.name.toLowerCase().includes(teamFilterCode.toLowerCase());
      const matchSearch =
        !q ||
        t.code.toLowerCase().includes(q) ||
        t.name.toLowerCase().includes(q) ||
        t.managingUnit.toLowerCase().includes(q) ||
        t.leaderName.toLowerCase().includes(q) ||
        t.machineCount.toLowerCase().includes(q) ||
        t.assignedAreas.toLowerCase().includes(q);
      return matchKlh && matchFilterKLH && matchFilterManagingUnit && matchFilterStatus && matchFilterCode && matchSearch;
    });
    list.sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true, sensitivity: 'base' }));
    return list;
  }, [teams, search, selectedKLH, teamFilterKLH, teamFilterManagingUnit, teamFilterStatus, teamFilterCode]);

  const filteredPlots = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = plots.filter((p) => {
      const matchKlh = selectedKLH === 'ALL' || p.complexCode === selectedKLH;
      const matchFilterKLH = !plotFilterKLH || p.complexCode === plotFilterKLH;
      const matchFilterEnterprise = !plotFilterEnterprise || p.enterpriseName === plotFilterEnterprise;
      const matchFilterFarm = !plotFilterFarm || p.farmName === plotFilterFarm;
      const matchFilterCode =
        !plotFilterCode ||
        p.code.toLowerCase().includes(plotFilterCode.toLowerCase()) ||
        p.name.toLowerCase().includes(plotFilterCode.toLowerCase());
      const matchSearch =
        !q ||
        p.code.toLowerCase().includes(q) ||
        p.name.toLowerCase().includes(q) ||
        p.enterpriseName.toLowerCase().includes(q) ||
        p.farmName.toLowerCase().includes(q) ||
        p.cropType.toLowerCase().includes(q) ||
        (p.notes && p.notes.toLowerCase().includes(q));
      return matchKlh && matchFilterKLH && matchFilterEnterprise && matchFilterFarm && matchFilterCode && matchSearch;
    });
    list.sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true, sensitivity: 'base' }));
    return list;
  }, [plots, search, selectedKLH, plotFilterKLH, plotFilterEnterprise, plotFilterFarm, plotFilterCode]);

  const filteredAgriTeams = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = agriTeams.filter((t) => {
      const matchKlh = selectedKLH === 'ALL' || t.complexCode === selectedKLH;
      const matchFilterKLH = !agriTeamFilterKLH || t.complexCode === agriTeamFilterKLH;
      const matchFilterEnterprise = !agriTeamFilterEnterprise || t.enterpriseName === agriTeamFilterEnterprise;
      const matchFilterFarm = !agriTeamFilterFarm || t.farmName === agriTeamFilterFarm;
      const matchFilterCode =
        !agriTeamFilterCode ||
        t.code.toLowerCase().includes(agriTeamFilterCode.toLowerCase()) ||
        t.name.toLowerCase().includes(agriTeamFilterCode.toLowerCase());
      const matchSearch =
        !q ||
        t.code.toLowerCase().includes(q) ||
        t.name.toLowerCase().includes(q) ||
        t.enterpriseName.toLowerCase().includes(q) ||
        t.farmName.toLowerCase().includes(q) ||
        t.leaderName.toLowerCase().includes(q) ||
        t.machineCount.toLowerCase().includes(q) ||
        t.assignedPlots.toLowerCase().includes(q) ||
        (t.notes && t.notes.toLowerCase().includes(q));
      return matchKlh && matchFilterKLH && matchFilterEnterprise && matchFilterFarm && matchFilterCode && matchSearch;
    });
    list.sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true, sensitivity: 'base' }));
    return list;
  }, [agriTeams, search, selectedKLH, agriTeamFilterKLH, agriTeamFilterEnterprise, agriTeamFilterFarm, agriTeamFilterCode]);

  const filteredStages = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = stages.filter((s) => {
      const matchPlanType = s.planType === selectedJobPlanType;
      const matchSearch =
        !q ||
        s.code.toLowerCase().includes(q) ||
        s.name.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q);
      return matchPlanType && matchSearch;
    });

    // Khử trùng lặp tuyệt đối theo mã code
    const unique = new Map<string, StageItem>();
    list.forEach((s) => {
      const codeKey = s.code?.trim().toUpperCase();
      if (codeKey && !unique.has(codeKey)) {
        unique.set(codeKey, s);
      }
    });

    const clean = Array.from(unique.values());
    clean.sort((a, b) => a.sequence - b.sequence);
    return clean;
  }, [stages, search, selectedJobPlanType]);

  const filteredImplements = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = implementsList.filter((i) => {
      const matchPlanType = i.planType === selectedJobPlanType;
      const matchSearch =
        !q ||
        i.code.toLowerCase().includes(q) ||
        i.name.toLowerCase().includes(q) ||
        i.category.toLowerCase().includes(q) ||
        i.compatibleVehicles.toLowerCase().includes(q);
      return matchPlanType && matchSearch;
    });
    list.sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true, sensitivity: 'base' }));
    return list;
  }, [implementsList, search, selectedJobPlanType]);

  const filteredOrderTypes = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = orderTypes.filter((o) => {
      const matchDomain =
        selectedJobPlanType === 'NONG_NGHIEP'
          ? o.orderGroup === 'NONG_NGHIEP' || o.orderGroup === 'CUU_HO'
          : selectedJobPlanType === 'CONG_TRINH'
          ? o.orderGroup === 'CONG_TRINH' || o.orderGroup === 'CUU_HO'
          : o.orderGroup === 'VAN_TAI' || o.orderGroup === 'CUU_HO';
      const matchSearch =
        !q ||
        o.code.toLowerCase().includes(q) ||
        o.name.toLowerCase().includes(q) ||
        o.category.toLowerCase().includes(q);
      return matchDomain && matchSearch;
    });
    list.sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true, sensitivity: 'base' }));
    return list;
  }, [orderTypes, search, selectedJobPlanType]);

  // Options for filter dropdowns (Lọc theo lĩnh vực đang chọn)
  const jobCodeFilterOptions: SelectOption[] = useMemo(() => {
    const scopedJobs = jobs.filter((j) => j.planType === selectedJobPlanType);
    const unique = Array.from(new Set(scopedJobs.map((j) => j.code)));
    return unique.map((c) => ({ value: c, label: c }));
  }, [jobs, selectedJobPlanType]);

  const jobNameFilterOptions: SelectOption[] = useMemo(() => {
    const scopedJobs = jobs.filter((j) => j.planType === selectedJobPlanType);
    const unique = Array.from(new Set(scopedJobs.map((j) => j.name)));
    return unique.map((n) => ({ value: n, label: n }));
  }, [jobs, selectedJobPlanType]);

  const stageFilterOptions: SelectOption[] = useMemo(() => {
    const unique = new Map<string, SelectOption>();
    stages
      .filter((s) => s.planType === selectedJobPlanType && s.status !== 'inactive')
      .forEach((s) => {
        const codeKey = s.code?.trim().toUpperCase();
        if (codeKey && !unique.has(codeKey)) {
          unique.set(codeKey, { value: s.code, label: s.name, subLabel: s.description });
        }
      });
    return Array.from(unique.values());
  }, [stages, selectedJobPlanType]);

  // Options lọc cho Lô / Thửa canh tác nông nghiệp
  const plotKlhFilterOptions: SelectOption[] = useMemo(() => {
    return KLH_OPTIONS.filter((k) => k.code !== 'ALL').map((k) => ({ value: k.code, label: k.name }));
  }, []);

  const plotEnterpriseFilterOptions: SelectOption[] = useMemo(() => {
    let list = plots;
    if (selectedKLH !== 'ALL') list = list.filter((p) => p.complexCode === selectedKLH);
    if (plotFilterKLH) list = list.filter((p) => p.complexCode === plotFilterKLH);
    const unique = Array.from(new Set(list.map((p) => p.enterpriseName).filter(Boolean)));
    return unique.map((e) => ({ value: e, label: e }));
  }, [plots, selectedKLH, plotFilterKLH]);

  const plotFarmFilterOptions: SelectOption[] = useMemo(() => {
    let list = plots;
    if (selectedKLH !== 'ALL') list = list.filter((p) => p.complexCode === selectedKLH);
    if (plotFilterKLH) list = list.filter((p) => p.complexCode === plotFilterKLH);
    if (plotFilterEnterprise) list = list.filter((p) => p.enterpriseName === plotFilterEnterprise);
    const unique = Array.from(new Set(list.map((p) => p.farmName).filter(Boolean)));
    return unique.map((f) => ({ value: f, label: f }));
  }, [plots, selectedKLH, plotFilterKLH, plotFilterEnterprise]);

  const plotCodeFilterOptions: SelectOption[] = useMemo(() => {
    let list = plots;
    if (selectedKLH !== 'ALL') list = list.filter((p) => p.complexCode === selectedKLH);
    if (plotFilterKLH) list = list.filter((p) => p.complexCode === plotFilterKLH);
    if (plotFilterEnterprise) list = list.filter((p) => p.enterpriseName === plotFilterEnterprise);
    if (plotFilterFarm) list = list.filter((p) => p.farmName === plotFilterFarm);
    return list.map((p) => ({ value: p.code, label: `${p.code} - ${p.name}` }));
  }, [plots, selectedKLH, plotFilterKLH, plotFilterEnterprise, plotFilterFarm]);

  // Options lọc cho Đội xe cơ giới nông nghiệp
  const agriTeamKlhFilterOptions: SelectOption[] = useMemo(() => {
    return KLH_OPTIONS.filter((k) => k.code !== 'ALL').map((k) => ({ value: k.code, label: k.name }));
  }, []);

  const agriTeamEnterpriseFilterOptions: SelectOption[] = useMemo(() => {
    let list = agriTeams;
    if (selectedKLH !== 'ALL') list = list.filter((t) => t.complexCode === selectedKLH);
    if (agriTeamFilterKLH) list = list.filter((t) => t.complexCode === agriTeamFilterKLH);
    const unique = Array.from(new Set(list.map((t) => t.enterpriseName).filter(Boolean)));
    return unique.map((e) => ({ value: e, label: e }));
  }, [agriTeams, selectedKLH, agriTeamFilterKLH]);

  const agriTeamFarmFilterOptions: SelectOption[] = useMemo(() => {
    let list = agriTeams;
    if (selectedKLH !== 'ALL') list = list.filter((t) => t.complexCode === selectedKLH);
    if (agriTeamFilterKLH) list = list.filter((t) => t.complexCode === agriTeamFilterKLH);
    if (agriTeamFilterEnterprise) list = list.filter((t) => t.enterpriseName === agriTeamFilterEnterprise);
    const unique = Array.from(new Set(list.map((t) => t.farmName).filter(Boolean)));
    return unique.map((f) => ({ value: f, label: f }));
  }, [agriTeams, selectedKLH, agriTeamFilterKLH, agriTeamFilterEnterprise]);

  const agriTeamCodeFilterOptions: SelectOption[] = useMemo(() => {
    let list = agriTeams;
    if (selectedKLH !== 'ALL') list = list.filter((t) => t.complexCode === selectedKLH);
    if (agriTeamFilterKLH) list = list.filter((t) => t.complexCode === agriTeamFilterKLH);
    if (agriTeamFilterEnterprise) list = list.filter((t) => t.enterpriseName === agriTeamFilterEnterprise);
    if (agriTeamFilterFarm) list = list.filter((t) => t.farmName === agriTeamFilterFarm);
    return list.map((t) => ({ value: t.code, label: `${t.code} - ${t.name}` }));
  }, [agriTeams, selectedKLH, agriTeamFilterKLH, agriTeamFilterEnterprise, agriTeamFilterFarm]);

  // Options lọc cho Khu vực thi công công trình
  const siteKlhFilterOptions: SelectOption[] = useMemo(() => {
    return KLH_OPTIONS.filter((k) => k.code !== 'ALL').map((k) => ({ value: k.code, label: k.name }));
  }, []);

  const siteCategoryFilterOptions: SelectOption[] = useMemo(() => {
    return [
      { value: 'DAO_DAP', label: 'Đào đắp mương máng' },
      { value: 'SAN_LAP', label: 'San lấp mặt bằng' },
      { value: 'GIAO_THONG', label: 'Làm đường giao thông nội bộ' },
      { value: 'HO_DAP', label: 'Hồ đập chứa nước & Trạm bơm' },
      { value: 'HA_TANG', label: 'Hạ tầng kỹ thuật phụ trợ' },
    ];
  }, []);

  const siteUnitOwnerFilterOptions: SelectOption[] = useMemo(() => {
    let list = sites;
    if (selectedKLH !== 'ALL') list = list.filter((s) => s.complexCode === selectedKLH);
    if (siteFilterKLH) list = list.filter((s) => s.complexCode === siteFilterKLH);
    const unique = Array.from(new Set(list.map((s) => s.unitOwner).filter(Boolean)));
    return unique.map((u) => ({ value: u, label: u }));
  }, [sites, selectedKLH, siteFilterKLH]);

  const siteCodeFilterOptions: SelectOption[] = useMemo(() => {
    let list = sites;
    if (selectedKLH !== 'ALL') list = list.filter((s) => s.complexCode === selectedKLH);
    if (siteFilterKLH) list = list.filter((s) => s.complexCode === siteFilterKLH);
    if (siteFilterCategory) list = list.filter((s) => s.category === siteFilterCategory);
    return list.map((s) => ({ value: s.code, label: `${s.code} - ${s.name}` }));
  }, [sites, selectedKLH, siteFilterKLH, siteFilterCategory]);

  // Options lọc cho Đội thi công Ban Xây dựng
  const teamKlhFilterOptions: SelectOption[] = useMemo(() => {
    return KLH_OPTIONS.filter((k) => k.code !== 'ALL').map((k) => ({ value: k.code, label: k.name }));
  }, []);

  const teamManagingUnitFilterOptions: SelectOption[] = useMemo(() => {
    let list = teams;
    if (selectedKLH !== 'ALL') list = list.filter((t) => t.complexCode === selectedKLH);
    if (teamFilterKLH) list = list.filter((t) => t.complexCode === teamFilterKLH);
    const unique = Array.from(new Set(list.map((t) => t.managingUnit).filter(Boolean)));
    return unique.map((u) => ({ value: u, label: u }));
  }, [teams, selectedKLH, teamFilterKLH]);

  const teamStatusFilterOptions: SelectOption[] = useMemo(() => {
    return [
      { value: 'active', label: 'Đang thi công' },
      { value: 'busy', label: 'Đang bận dự án khác' },
      { value: 'maintenance', label: 'Bảo dưỡng / Sửa chữa' },
    ];
  }, []);

  const teamCodeFilterOptions: SelectOption[] = useMemo(() => {
    let list = teams;
    if (selectedKLH !== 'ALL') list = list.filter((t) => t.complexCode === selectedKLH);
    if (teamFilterKLH) list = list.filter((t) => t.complexCode === teamFilterKLH);
    if (teamFilterManagingUnit) list = list.filter((t) => t.managingUnit === teamFilterManagingUnit);
    return list.map((t) => ({ value: t.code, label: `${t.code} - ${t.name}` }));
  }, [teams, selectedKLH, teamFilterKLH, teamFilterManagingUnit]);

  // Lưu Job
  const handleSaveJob = (e: React.FormEvent) => {
    e.preventDefault();
    const code = formCode.trim().toUpperCase();
    const name = formName.trim();
    if (!code || !name) {
      alert('Vui lòng nhập đầy đủ Mã quy trình và Tên hạng mục!');
      return;
    }

    const stageObj = stages.find((s) => s.code === formStageCode) || STAGES_BY_PLAN_TYPE[formPlanType]?.find((s) => s.code === formStageCode);
    const stageName = stageObj?.name || formStageCode || 'Chung';

    const implementGroup = formHasImplement
      ? formImplementGroup.trim()
      : formPlanType === 'CONG_TRINH'
      ? 'Không gắn nông cụ (Xe cơ giới thi công độc lập)'
      : 'Không gắn nông cụ (Xe tự hành)';

    // Tự động lưu các lựa chọn gõ mới vào danh mục options (không thuộc diện tab)
    if (formRecommendedVehicle && formRecommendedVehicle.trim()) {
      handleAddRecommendedVehicle(formRecommendedVehicle.trim());
    }
    if (formDefaultUnit && formDefaultUnit.trim()) {
      handleAddVolumeUnit(formDefaultUnit.trim());
    }
    if (formFuelUnit && formFuelUnit.trim()) {
      handleAddFuelUnit(formFuelUnit.trim());
    }

    if (editingJob) {
      setJobs((prev) =>
        prev.map((j) =>
          j.id === editingJob.id
            ? {
                ...j,
                code,
                name,
                planType: formPlanType,
                stageCode: formStageCode,
                stageName,
                hasImplement: formHasImplement,
                implementGroup,
                recommendedVehicle: formRecommendedVehicle,
                defaultUnit: formDefaultUnit,
                quotaPerShift: formQuotaPerShift,
                fuelQuota: Number(formFuelQuota),
                fuelUnit: formFuelUnit,
                complexCode: formComplexCode,
                description: formDescription,
              }
            : j
        )
      );
    } else {
      const newJob: JobItem = {
        id: `JOB-${Date.now().toString().slice(-4)}`,
        code,
        name,
        planType: formPlanType,
        stageCode: formStageCode,
        stageName,
        hasImplement: formHasImplement,
        implementGroup,
        recommendedVehicle: formRecommendedVehicle,
        defaultUnit: formDefaultUnit,
        quotaPerShift: formQuotaPerShift,
        fuelQuota: Number(formFuelQuota),
        fuelUnit: formFuelUnit,
        complexCode: formComplexCode,
        description: formDescription,
      };
      setJobs((prev) => [...prev, newJob]);
    }

    setShowJobModal(false);
    setEditingJob(null);
  };

  // Lưu Giai đoạn / Phân loại
  const handleSaveStage = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const code = String(form.get('code')).trim().toUpperCase();
    const name = String(form.get('name')).trim();
    const planType = (form.get('planType') as JobPlanType) || selectedJobPlanType;
    const description = String(form.get('description')).trim();
    const sequence = Number(form.get('sequence') || stages.length + 1);

    if (!code || !name) {
      alert('Vui lòng nhập đầy đủ Mã phân loại và Tên giai đoạn!');
      return;
    }

    if (!editingStage && stages.some((s) => s.code?.trim().toUpperCase() === code)) {
      alert(`Mã giai đoạn "${code}" đã tồn tại trong danh mục! Vui lòng dùng mã khác.`);
      return;
    }

    if (editingStage) {
      setStages((prev) =>
        prev.map((s) => (s.id === editingStage.id ? { ...s, code, name, planType, description, sequence } : s))
      );
    } else {
      const newStage: StageItem = {
        id: `STG-${Date.now().toString().slice(-4)}`,
        code,
        name,
        planType,
        description,
        sequence,
        status: 'active',
      };
      setStages((prev) => [...prev, newStage]);
    }

    setShowStageModal(false);
    setEditingStage(null);
  };

  // Lưu Nhóm Nông cụ / Thiết bị
  const handleSaveImplement = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const code = String(form.get('code')).trim().toUpperCase();
    const name = String(form.get('name')).trim();
    const planType = (form.get('planType') as JobPlanType) || editingImplement?.planType || selectedJobPlanType;
    const category = String(form.get('category') || '').trim();
    const compatibleVehicles = String(form.get('compatibleVehicles') || '').trim();
    const description = String(form.get('description') || '').trim();

    if (editingImplement) {
      setImplementsList((prev) =>
        prev.map((i) =>
          i.id === editingImplement.id ? { ...i, code, name, planType, category, compatibleVehicles, description } : i
        )
      );
    } else {
      const newImp: ImplementGroupItem = {
        id: `IMP-${Date.now().toString().slice(-4)}`,
        code,
        name,
        planType,
        category,
        compatibleVehicles,
        description,
        status: 'active',
      };
      setImplementsList((prev) => [...prev, newImp]);
    }

    setShowImplementModal(false);
    setEditingImplement(null);
  };

  // Lưu Loại lệnh điều xe
  const handleSaveOrderType = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const code = String(form.get('code')).trim().toUpperCase();
    const name = String(form.get('name')).trim();
    const category = String(form.get('category')).trim();
    const orderGroup = (form.get('orderGroup') as OrderTypeItem['orderGroup']) || 'NONG_NGHIEP';
    const measuringMethod = String(form.get('measuringMethod') || '').trim();
    const fuelQuotaType = String(form.get('fuelQuotaType') || '').trim();
    const isEmergency = form.get('isEmergency') === 'on' || form.get('isEmergency') === 'true';
    const requiresImplement = form.get('requiresImplement') === 'on' || form.get('requiresImplement') === 'true';
    const requiresLotPlot = form.get('requiresLotPlot') === 'on' || form.get('requiresLotPlot') === 'true';
    const requiresRoute = form.get('requiresRoute') === 'on' || form.get('requiresRoute') === 'true';
    const targetScope = String(form.get('targetScope')).trim();
    const description = String(form.get('description') || '').trim();
    const status = (form.get('status') as 'active' | 'inactive') || 'active';

    if (editingOrderType) {
      setOrderTypes((prev) =>
        prev.map((o) =>
          o.id === editingOrderType.id
            ? {
                ...o,
                code,
                name,
                category,
                orderGroup,
                measuringMethod,
                fuelQuotaType,
                isEmergency,
                requiresImplement,
                requiresLotPlot,
                requiresRoute,
                targetScope,
                description,
                status,
              }
            : o
        )
      );
    } else {
      const newOrderType: OrderTypeItem = {
        id: `ORD-${Date.now().toString().slice(-4)}`,
        code,
        name,
        category,
        orderGroup,
        measuringMethod,
        fuelQuotaType,
        isEmergency,
        requiresImplement,
        requiresLotPlot,
        requiresRoute,
        targetScope,
        description,
        status,
      };
      setOrderTypes((prev) => [...prev, newOrderType]);
    }

    setShowOrderTypeModal(false);
    setEditingOrderType(null);
  };

  // Lưu Tuyến đường
  const handleSaveRoute = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const code = String(form.get('code')).trim().toUpperCase();
    const name = String(form.get('name')).trim();
    const complexCode = String(form.get('complexCode') || 'KOUN_MOM');
    const complexName = KLH_OPTIONS.find((k) => k.code === complexCode)?.name || complexCode;
    const origin = String(form.get('origin') || '').trim();
    const destination = String(form.get('destination') || '').trim();
    const distanceKm = Number(form.get('distanceKm') || 0);
    const cargoType = String(form.get('cargoType') || '').trim();
    const speedLimitKmH = Number(form.get('speedLimitKmH') || 35);
    const notes = String(form.get('notes') || '').trim();

    if (editingRoute) {
      setRoutes((prev) =>
        prev.map((r) =>
          r.id === editingRoute.id
            ? { ...r, code, name, complexCode, complexName, origin, destination, distanceKm, cargoType, speedLimitKmH, notes }
            : r
        )
      );
    } else {
      const newRoute: TransportRouteItem = {
        id: `RTE-${Date.now().toString().slice(-4)}`,
        code,
        name,
        complexCode,
        complexName,
        origin,
        destination,
        distanceKm,
        cargoType,
        speedLimitKmH,
        status: 'active',
        notes,
      };
      setRoutes((prev) => [...prev, newRoute]);
    }

    setShowRouteModal(false);
    setEditingRoute(null);
  };

  const handleSaveSite = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    const code = (formData.get('code') as string)?.trim().toUpperCase();
    const name = (formData.get('name') as string)?.trim();
    const category = (formData.get('category') as any) || 'DAO_DAP';
    const complexCode = (formData.get('complexCode') as any) || 'KOUN_MOM';
    const unitOwner = (formData.get('unitOwner') as string)?.trim() || 'Ban Quản lý Dự án & Hạ tầng';
    const targetScope = (formData.get('targetScope') as string)?.trim() || '';
    const targetUnit = (formData.get('targetUnit') as string)?.trim() || 'm³';
    const recommendedMachines = (formData.get('recommendedMachines') as string)?.trim() || '';
    const estimatedDays = Number(formData.get('estimatedDays')) || 30;
    const status = (formData.get('status') as any) || 'in_progress';
    const notes = (formData.get('notes') as string)?.trim() || '';

    const catNameMap: Record<string, string> = {
      DAO_DAP: 'Đào đắp mương máng',
      SAN_LAP: 'San lấp mặt bằng',
      GIAO_THONG: 'Làm đường giao thông nội bộ',
      HO_DAP: 'Hồ đập chứa nước & Trạm bơm',
      HA_TANG: 'Hạ tầng kỹ thuật phụ trợ',
    };

    const statusMap: Record<string, string> = {
      in_progress: 'Đang thi công',
      preparing: 'Chuẩn bị thi công',
      completed: 'Đã nghiệm thu',
    };

    const complexName = KLH_OPTIONS.find((k) => k.code === complexCode)?.name || 'Khu liên hợp Koun Mom';

    if (!code || !name) {
      alert('Vui lòng nhập Mã khu vực và Tên khu vực thi công!');
      return;
    }

    if (editingSite) {
      setSites((prev) =>
        prev.map((s) =>
          s.id === editingSite.id
            ? {
                ...s,
                code,
                name,
                category,
                categoryName: catNameMap[category] || category,
                complexCode,
                complexName,
                unitOwner,
                targetScope,
                targetUnit,
                recommendedMachines,
                estimatedDays,
                status,
                statusLabel: statusMap[status] || status,
                notes,
              }
            : s
        )
      );
    } else {
      const newSite: ConstructionSiteItem = {
        id: `SITE-USR-${Date.now()}`,
        code,
        name,
        category,
        categoryName: catNameMap[category] || category,
        complexCode,
        complexName,
        unitOwner,
        targetScope,
        targetUnit,
        recommendedMachines,
        estimatedDays,
        status,
        statusLabel: statusMap[status] || status,
        notes,
      };
      setSites((prev) => [...prev, newSite]);
    }

    setShowSiteModal(false);
    setEditingSite(null);
  };

  const handleSaveTeam = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    const code = (formData.get('code') as string)?.trim().toUpperCase();
    const name = (formData.get('name') as string)?.trim();
    const complexCode = (formData.get('complexCode') as any) || 'KOUN_MOM';
    const managingUnit = (formData.get('managingUnit') as string)?.trim() || 'Ban Quản lý Xây dựng & Hạ tầng';
    const leaderName = (formData.get('leaderName') as string)?.trim() || '';
    const leaderPhone = (formData.get('leaderPhone') as string)?.trim() || '';
    const machineCount = (formData.get('machineCount') as string)?.trim() || '';
    const personnelCount = (formData.get('personnelCount') as string)?.trim() || '';
    const assignedAreas = (formData.get('assignedAreas') as string)?.trim() || '';
    const status = (formData.get('status') as any) || 'active';
    const notes = (formData.get('notes') as string)?.trim() || '';

    const statusMap: Record<string, string> = {
      active: 'Đang thi công',
      busy: 'Đang bận dự án khác',
      maintenance: 'Bảo dưỡng / Sửa chữa',
    };

    const complexName = KLH_OPTIONS.find((k) => k.code === complexCode)?.name || 'Khu liên hợp Koun Mom';

    if (!code || !name) {
      alert('Vui lòng nhập Mã đội và Tên đội thi công!');
      return;
    }

    if (editingTeam) {
      setTeams((prev) =>
        prev.map((t) =>
          t.id === editingTeam.id
            ? {
                ...t,
                code,
                name,
                complexCode,
                complexName,
                managingUnit,
                leaderName,
                leaderPhone,
                machineCount,
                personnelCount,
                assignedAreas,
                status,
                statusLabel: statusMap[status] || status,
                notes,
              }
            : t
        )
      );
    } else {
      const newTeam: ConstructionTeamItem = {
        id: `TEAM-USR-${Date.now()}`,
        code,
        name,
        complexCode,
        complexName,
        managingUnit,
        leaderName,
        leaderPhone,
        machineCount,
        personnelCount,
        assignedAreas,
        status,
        statusLabel: statusMap[status] || status,
        notes,
      };
      setTeams((prev) => [...prev, newTeam]);
    }

    setShowTeamModal(false);
    setEditingTeam(null);
  };

  const handleSavePlot = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    const code = (formData.get('code') as string)?.trim().toUpperCase();
    const name = (formData.get('name') as string)?.trim();
    const complexCode = (formData.get('complexCode') as any) || 'KOUN_MOM';
    const enterpriseName = (formData.get('enterpriseName') as string)?.trim() || 'Xí nghiệp Trồng trọt Chuối Koun Mom';
    const farmName = (formData.get('farmName') as string)?.trim() || 'Nông trường Chuối 1';
    const areaHa = Number(formData.get('areaHa')) || 0;
    const cropType = (formData.get('cropType') as string)?.trim() || 'Chuối Nam Mỹ Foc TR4';
    const irrigationSystem = (formData.get('irrigationSystem') as string)?.trim() || 'Tưới nhỏ giọt bù áp tự động Netafim';
    const soilCondition = (formData.get('soilCondition') as string)?.trim() || 'Đất đỏ bazan giàu hữu cơ';
    const status = (formData.get('status') as any) || 'active';
    const notes = (formData.get('notes') as string)?.trim() || '';

    const statusMap: Record<string, string> = {
      active: 'Đang canh tác',
      preparing: 'Đang làm đất',
      replanting: 'Tái canh',
    };

    const complexName = KLH_OPTIONS.find((k) => k.code === complexCode)?.name || 'Khu liên hợp Koun Mom';

    if (!code || !name) {
      alert('Vui lòng nhập Mã Lô/Thửa và Tên Lô/Thửa!');
      return;
    }

    if (editingPlot) {
      setPlots((prev) =>
        prev.map((p) =>
          p.id === editingPlot.id
            ? {
                ...p,
                code,
                name,
                complexCode,
                complexName,
                enterpriseName,
                farmName,
                areaHa,
                cropType,
                irrigationSystem,
                soilCondition,
                status,
                statusLabel: statusMap[status] || status,
                notes,
              }
            : p
        )
      );
    } else {
      const newPlot: AgriculturalPlotItem = {
        id: `PLOT-USR-${Date.now()}`,
        code,
        name,
        complexCode,
        complexName,
        enterpriseName,
        farmName,
        areaHa,
        cropType,
        irrigationSystem,
        soilCondition,
        status,
        statusLabel: statusMap[status] || status,
        notes,
      };
      setPlots((prev) => [...prev, newPlot]);
    }

    setShowPlotModal(false);
    setEditingPlot(null);
  };

  const handleDeletePlot = (id: string, name: string) => {
    if (window.confirm(`Xác nhận xóa Lô/Thửa nông nghiệp "${name}"?`)) {
      setPlots((prev) => prev.filter((p) => p.id !== id));
      setSelectedItems((prev) => prev.filter((i) => i !== id));
    }
  };

  const handleSaveAgriTeam = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    const code = (formData.get('code') as string)?.trim().toUpperCase();
    const name = (formData.get('name') as string)?.trim();
    const complexCode = (formData.get('complexCode') as any) || 'KOUN_MOM';
    const enterpriseName = (formData.get('enterpriseName') as string)?.trim() || 'Xí nghiệp Trồng trọt Chuối Koun Mom';
    const farmName = (formData.get('farmName') as string)?.trim() || 'Nông trường Chuối 1';
    const leaderName = (formData.get('leaderName') as string)?.trim() || '';
    const leaderPhone = (formData.get('leaderPhone') as string)?.trim() || '';
    const machineCount = (formData.get('machineCount') as string)?.trim() || '';
    const personnelCount = (formData.get('personnelCount') as string)?.trim() || '';
    const assignedPlots = (formData.get('assignedPlots') as string)?.trim() || '';
    const status = (formData.get('status') as any) || 'active';
    const notes = (formData.get('notes') as string)?.trim() || '';

    const statusMap: Record<string, string> = {
      active: 'Sẵn sàng',
      busy: 'Đang bận',
      maintenance: 'Bảo dưỡng',
    };

    const complexName = KLH_OPTIONS.find((k) => k.code === complexCode)?.name || 'Khu liên hợp Koun Mom';

    if (!code || !name) {
      alert('Vui lòng nhập Mã đội và Tên đội xe cơ giới nông nghiệp!');
      return;
    }

    if (editingAgriTeam) {
      setAgriTeams((prev) =>
        prev.map((t) =>
          t.id === editingAgriTeam.id
            ? {
                ...t,
                code,
                name,
                complexCode,
                complexName,
                enterpriseName,
                farmName,
                leaderName,
                leaderPhone,
                machineCount,
                personnelCount,
                assignedPlots,
                status,
                statusLabel: statusMap[status] || status,
                notes,
              }
            : t
        )
      );
    } else {
      const newTeam: AgriculturalTeamItem = {
        id: `TEAM-AGRI-USR-${Date.now()}`,
        code,
        name,
        complexCode,
        complexName,
        enterpriseName,
        farmName,
        leaderName,
        leaderPhone,
        machineCount,
        personnelCount,
        assignedPlots,
        status,
        statusLabel: statusMap[status] || status,
        notes,
      };
      setAgriTeams((prev) => [...prev, newTeam]);
    }

    setShowAgriTeamModal(false);
    setEditingAgriTeam(null);
  };

  const handleDeleteAgriTeam = (id: string, name: string) => {
    if (window.confirm(`Xác nhận xóa Đội xe cơ giới nông nghiệp "${name}"?`)) {
      setAgriTeams((prev) => prev.filter((t) => t.id !== id));
      setSelectedItems((prev) => prev.filter((i) => i !== id));
    }
  };

  // Xóa các mục
  const handleDeleteJob = (id: string, name: string) => {
    if (window.confirm(`Xác nhận xóa quy trình công việc "${name}"?`)) {
      setJobs((prev) => prev.filter((j) => j.id !== id));
      setSelectedItems((prev) => prev.filter((i) => i !== id));
    }
  };

  const handleDeleteStage = (id: string, name: string) => {
    if (window.confirm(`Xác nhận xóa phân nhóm / giai đoạn "${name}"?`)) {
      setStages((prev) => prev.filter((s) => s.id !== id));
    }
  };

  const handleDeleteImplement = (id: string, name: string) => {
    if (window.confirm(`Xác nhận xóa nhóm nông cụ/thiết bị "${name}"?`)) {
      setImplementsList((prev) => prev.filter((i) => i.id !== id));
    }
  };

  const handleDeleteOrderType = (id: string, name: string) => {
    if (window.confirm(`Xác nhận xóa loại lệnh điều động "${name}"?`)) {
      setOrderTypes((prev) => prev.filter((o) => o.id !== id));
      setSelectedItems((prev) => prev.filter((i) => i !== id));
    }
  };

  const handleDeleteRoute = (id: string, name: string) => {
    if (window.confirm(`Xác nhận xóa tuyến đường "${name}"?`)) {
      setRoutes((prev) => prev.filter((r) => r.id !== id));
      setSelectedItems((prev) => prev.filter((i) => i !== id));
    }
  };

  const handleDeleteSite = (id: string, name: string) => {
    if (window.confirm(`Xác nhận xóa khu vực thi công "${name}"?`)) {
      setSites((prev) => prev.filter((s) => s.id !== id));
      setSelectedItems((prev) => prev.filter((i) => i !== id));
    }
  };

  const handleDeleteTeam = (id: string, name: string) => {
    if (window.confirm(`Xác nhận xóa đội thi công "${name}"?`)) {
      setTeams((prev) => prev.filter((t) => t.id !== id));
      setSelectedItems((prev) => prev.filter((i) => i !== id));
    }
  };

  // Xóa hàng loạt các mục đã chọn
  const handleBatchDelete = () => {
    if (selectedItems.length === 0) return;
    if (!window.confirm(`Bạn có chắc chắn muốn xóa ${selectedItems.length} mục đã chọn?`)) return;

    if (activeTab === 'jobs') {
      setJobs((prev) => prev.filter((j) => !selectedItems.includes(j.id)));
    } else if (activeTab === 'stages') {
      setStages((prev) => prev.filter((s) => !selectedItems.includes(s.id)));
    } else if (activeTab === 'implements') {
      setImplementsList((prev) => prev.filter((i) => !selectedItems.includes(i.id)));
    } else if (activeTab === 'orderTypes') {
      setOrderTypes((prev) => prev.filter((o) => !selectedItems.includes(o.id)));
    } else if (activeTab === 'routes') {
      setRoutes((prev) => prev.filter((r) => !selectedItems.includes(r.id)));
    } else if (activeTab === 'sites') {
      setSites((prev) => prev.filter((s) => !selectedItems.includes(s.id)));
    } else if (activeTab === 'plots') {
      setPlots((prev) => prev.filter((p) => !selectedItems.includes(p.id)));
    } else if (activeTab === 'teams') {
      if (selectedJobPlanType === 'NONG_NGHIEP') {
        setAgriTeams((prev) => prev.filter((t) => !selectedItems.includes(t.id)));
      } else {
        setTeams((prev) => prev.filter((t) => !selectedItems.includes(t.id)));
      }
    }
    setSelectedItems([]);
  };

  // Reset tiêu chí tìm kiếm
  const handleResetFilters = () => {
    setSearch('');
    setFilterCode('');
    setFilterName('');
    setFilterStage('');
    setSelectedItems([]);
  };

  // Xuất file CSV cho tab hiện tại
  const handleExportCSV = () => {
    let headers: string[] = [];
    let rows: (string | number)[][] = [];
    let filename = '';

    if (activeTab === 'jobs') {
      filename = `danh-muc-cong-viec-co-gioi-${new Date().toISOString().slice(0, 10)}.csv`;
      headers = [
        'STT',
        'Mã quy trình',
        'Tên hạng mục công việc',
        'Loại kế hoạch',
        'Giai đoạn / Phân nhóm',
        'Nông cụ kèm theo',
        'Đầu máy phù hợp',
        'Định mức ca máy',
        'Định mức dầu khoán',
        'Đơn vị dầu',
        'Khu liên hợp',
        'Mô tả kỹ thuật',
      ];
      rows = filteredJobs.map((j, idx) => [
        idx + 1,
        j.code,
        j.name,
        j.planType,
        j.stageName,
        j.hasImplement ? j.implementGroup : 'Không gắn (Xe tự hành)',
        j.recommendedVehicle,
        j.quotaPerShift,
        j.fuelQuota,
        j.fuelUnit,
        j.complexCode,
        j.description || '',
      ]);
    } else if (activeTab === 'stages') {
      filename = `danh-muc-giai-doan-phan-nhom-${new Date().toISOString().slice(0, 10)}.csv`;
      headers = ['STT', 'Thứ tự', 'Mã phân nhóm', 'Tên phân loại / Giai đoạn', 'Loại kế hoạch', 'Mô tả trọng tâm'];
      rows = filteredStages.map((s, idx) => [idx + 1, s.sequence, s.code, s.name, s.planType, s.description]);
    } else if (activeTab === 'implements') {
      filename = `danh-muc-nong-cu-thiet-bi-${new Date().toISOString().slice(0, 10)}.csv`;
      headers = ['STT', 'Mã nông cụ/thiết bị', 'Tên nhóm nông cụ/thiết bị', 'Loại kế hoạch', 'Phân nhóm', 'Đầu máy phù hợp', 'Mô tả kỹ thuật'];
      rows = filteredImplements.map((i, idx) => [idx + 1, i.code, i.name, i.planType, i.category, i.compatibleVehicles, i.description]);
    } else if (activeTab === 'orderTypes') {
      filename = `danh-muc-loai-lenh-dieu-dong-${new Date().toISOString().slice(0, 10)}.csv`;
      headers = ['STT', 'Mã loại lệnh', 'Tên loại lệnh', 'Phân nhóm nghiệp vụ', 'Đối tượng điều động', 'Mô tả'];
      rows = filteredOrderTypes.map((o, idx) => [idx + 1, o.code, o.name, o.category, o.targetScope, o.description || '']);
    } else if (activeTab === 'routes') {
      filename = `danh-muc-tuyen-duong-van-chuyen-${new Date().toISOString().slice(0, 10)}.csv`;
      headers = ['STT', 'Mã tuyến', 'Tên tuyến đường', 'Khu liên hợp', 'Điểm đi', 'Điểm đến', 'Cự ly chuẩn (km)', 'Mặt hàng', 'Tốc độ GPS (km/h)'];
      rows = filteredRoutes.map((r, idx) => [
        idx + 1,
        r.code,
        r.name,
        r.complexName,
        r.origin,
        r.destination,
        r.distanceKm,
        r.cargoType,
        r.speedLimitKmH,
      ]);
    } else if (activeTab === 'sites') {
      filename = `danh-muc-khu-vuc-thi-cong-${new Date().toISOString().slice(0, 10)}.csv`;
      headers = [
        'STT',
        'Mã khu vực',
        'Tên khu vực thi công',
        'Phân loại hạng mục',
        'Khu liên hợp',
        'Đơn vị quản lý bên Ban XD',
        'Quy mô thiết kế',
        'Máy móc khuyến nghị',
        'Thời gian ước tính (ngày)',
        'Trạng thái',
      ];
      rows = filteredSites.map((s, idx) => [
        idx + 1,
        s.code,
        s.name,
        s.categoryName,
        s.complexName,
        s.unitOwner,
        s.targetScope,
        s.recommendedMachines,
        s.estimatedDays,
        s.statusLabel,
      ]);
    } else if (activeTab === 'plots') {
      filename = `danh-muc-lo-thua-nong-nghiep-${new Date().toISOString().slice(0, 10)}.csv`;
      headers = ['STT', 'Mã Lô/Thửa', 'Tên Lô/Thửa', 'Khu liên hợp', 'Xí nghiệp', 'Nông trường', 'Diện tích (ha)', 'Cây trồng', 'Hệ thống tưới', 'Trạng thái'];
      rows = filteredPlots.map((p, idx) => [
        idx + 1,
        p.code,
        p.name,
        p.complexName,
        p.enterpriseName,
        p.farmName,
        p.areaHa,
        p.cropType,
        p.irrigationSystem,
        p.statusLabel,
      ]);
    } else if (activeTab === 'teams') {
      if (selectedJobPlanType === 'NONG_NGHIEP') {
        filename = `danh-muc-doi-xe-co-gioi-nong-nghiep-${new Date().toISOString().slice(0, 10)}.csv`;
        headers = [
          'STT',
          'Mã đội',
          'Tên Đội xe cơ giới',
          'Khu liên hợp',
          'Xí nghiệp',
          'Nông trường',
          'Đội trưởng',
          'Số điện thoại',
          'Cơ cấu máy móc',
          'Nhân lực',
          'Địa bàn phụ trách',
          'Trạng thái',
        ];
        rows = filteredAgriTeams.map((t, idx) => [
          idx + 1,
          t.code,
          t.name,
          t.complexName,
          t.enterpriseName,
          t.farmName,
          t.leaderName,
          t.leaderPhone,
          t.machineCount,
          t.personnelCount,
          t.assignedPlots,
          t.statusLabel,
        ]);
      } else {
        filename = `danh-muc-doi-thi-cong-co-gioi-${new Date().toISOString().slice(0, 10)}.csv`;
        headers = [
          'STT',
          'Mã đội',
          'Tên đội thi công',
          'Khu liên hợp',
          'Đơn vị quản lý bên Ban XD',
          'Đội trưởng',
          'Số điện thoại',
          'Quy mô máy móc',
          'Nhân sự',
          'Địa bàn phụ trách',
          'Trạng thái',
        ];
        rows = filteredTeams.map((t, idx) => [
          idx + 1,
          t.code,
          t.name,
          t.complexName,
          t.managingUnit,
          t.leaderName,
          t.leaderPhone,
          t.machineCount,
          t.personnelCount,
          t.assignedAreas,
          t.statusLabel,
        ]);
      }
    }

    if (rows.length === 0) return;

    const csvRows = [
      headers.map((h) => `"${h.replace(/"/g, '""')}"`).join(','),
      ...rows.map((r) => r.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')),
    ];
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + csvRows.join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --------------------------------------------------------------------------
  // COLUMNS CONFIGURATION
  // --------------------------------------------------------------------------
  const jobColumns: Column<JobItem>[] = [
    {
      key: 'select',
      title: (
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary cursor-pointer"
          checked={filteredJobs.length > 0 && filteredJobs.every((r) => selectedItems.includes(r.id))}
          onChange={(e) => {
            if (e.target.checked) setSelectedItems(filteredJobs.map((r) => r.id));
            else setSelectedItems([]);
          }}
        />
      ),
      width: '40px',
      align: 'center',
      render: (item) => (
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary cursor-pointer"
          checked={selectedItems.includes(item.id)}
          onChange={() => toggleSelectItem(item.id)}
        />
      ),
    },
    {
      key: 'code',
      title: 'Mã CV / Quy trình (Tăng dần)',
      sortable: true,
      width: '135px',
      render: (item) => (
        <span className="font-mono font-extrabold text-primary text-xs bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
          {item.code}
        </span>
      ),
    },
    {
      key: 'name',
      title: 'Tên hạng mục công việc cơ giới',
      sortable: true,
      render: (item) => (
        <div className="min-w-[240px] max-w-[360px]">
          <strong className="text-slate-900 block text-xs font-bold leading-snug">{item.name}</strong>
          {item.description && (
            <span className="text-[11px] text-slate-500 line-clamp-2 mt-0.5 leading-relaxed">{item.description}</span>
          )}
        </div>
      ),
    },
    {
      key: 'stageName',
      title: 'Giai đoạn / Phân nhóm',
      sortable: true,
      render: (item) => (
        <span className="inline-flex items-center rounded-lg bg-blue-50 border border-blue-200 px-2 py-0.5 text-[11px] font-bold text-blue-700">
          {item.stageName}
        </span>
      ),
    },
    {
      key: 'implementGroup',
      title: 'Nông cụ / Thiết bị phụ trợ',
      render: (item) => (
        <div>
          {item.hasImplement ? (
            <span className="text-xs text-amber-800 font-semibold truncate block max-w-[190px]" title={item.implementGroup}>
              {item.implementGroup}
            </span>
          ) : (
            <span className="text-[11px] text-slate-400 font-medium">
              Không gắn (Xe tự hành)
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'recommendedVehicle',
      title: 'Đầu máy phù hợp',
      render: (item) => (
        <span className="text-xs text-slate-700 font-medium truncate block max-w-[160px]" title={item.recommendedVehicle}>
          {item.recommendedVehicle}
        </span>
      ),
    },
    {
      key: 'quotaPerShift',
      title: 'Định mức ca máy',
      render: (item) => <span className="text-xs text-slate-800 font-bold">{item.quotaPerShift}</span>,
    },
    {
      key: 'fuelQuota',
      title: 'Định mức dầu khoán',
      render: (item) => (
        <div className="inline-flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
          <strong className="text-emerald-700 font-extrabold text-xs">{item.fuelQuota}</strong>
          <span className="text-[10px] text-emerald-600 font-medium">{item.fuelUnit}</span>
        </div>
      ),
    },
    {
      key: 'actions',
      title: 'Thao tác',
      align: 'center',
      width: '160px',
      render: (item) => (
        <div className="flex items-center justify-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            className="inline-flex items-center gap-0.5 px-2 py-1 text-[11px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors cursor-pointer"
            title="Xem chi tiết quy trình"
            onClick={() => setSelectedJobDetail(item)}
          >
            <Settings2 className="h-3 w-3 text-slate-500" />
            <span>Xem</span>
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-0.5 px-2 py-1 text-[11px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md border border-blue-200 transition-colors cursor-pointer"
            title="Chỉnh sửa quy trình"
            onClick={() => handleOpenEditJob(item)}
          >
            <Edit2 className="h-3 w-3 text-blue-600" />
            <span>Sửa</span>
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-0.5 px-2 py-1 text-[11px] font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-md border border-rose-200 transition-colors cursor-pointer"
            title="Xóa quy trình"
            onClick={() => handleDeleteJob(item.id, item.name)}
          >
            <Trash2 className="h-3 w-3 text-rose-600" />
            <span>Xóa</span>
          </button>
        </div>
      ),
    },
  ];

  const stageColumns: Column<StageItem>[] = [
    {
      key: 'select',
      title: (
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary cursor-pointer"
          checked={filteredStages.length > 0 && filteredStages.every((r) => selectedItems.includes(r.id))}
          onChange={(e) => {
            if (e.target.checked) setSelectedItems(filteredStages.map((r) => r.id));
            else setSelectedItems([]);
          }}
        />
      ),
      width: '40px',
      align: 'center',
      render: (item) => (
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary cursor-pointer"
          checked={selectedItems.includes(item.id)}
          onChange={() => toggleSelectItem(item.id)}
        />
      ),
    },
    {
      key: 'sequence',
      title: 'Thứ tự',
      width: '80px',
      align: 'center',
      render: (item) => (
        <span className="h-6 w-6 rounded-full bg-blue-100 text-blue-800 font-bold text-xs inline-flex items-center justify-center">
          {item.sequence}
        </span>
      ),
    },
    {
      key: 'code',
      title: 'Mã giai đoạn / phân nhóm',
      render: (item) => <span className="font-mono font-bold text-slate-700 text-xs bg-slate-100 px-2 py-0.5 rounded">{item.code}</span>,
    },
    {
      key: 'name',
      title: 'Tên giai đoạn / Hạng mục thi công',
      render: (item) => <strong className="text-slate-900 text-xs">{item.name}</strong>,
    },
    {
      key: 'description',
      title: 'Quy trình công việc trọng tâm',
      render: (item) => <span className="text-xs text-slate-600">{item.description}</span>,
    },
    {
      key: 'actions',
      title: 'Thao tác',
      align: 'center',
      width: '130px',
      render: (item) => (
        <div className="flex items-center justify-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            className="inline-flex items-center gap-0.5 px-2 py-1 text-[11px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md border border-blue-200 transition-colors cursor-pointer"
            title="Chỉnh sửa"
            onClick={() => {
              setEditingStage(item);
              setShowStageModal(true);
            }}
          >
            <Edit2 className="h-3 w-3 text-blue-600" />
            <span>Sửa</span>
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-0.5 px-2 py-1 text-[11px] font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-md border border-rose-200 transition-colors cursor-pointer"
            title="Xóa"
            onClick={() => handleDeleteStage(item.id, item.name)}
          >
            <Trash2 className="h-3 w-3 text-rose-600" />
            <span>Xóa</span>
          </button>
        </div>
      ),
    },
  ];

  const implementColumns: Column<ImplementGroupItem>[] = [
    {
      key: 'select',
      title: (
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary cursor-pointer"
          checked={filteredImplements.length > 0 && filteredImplements.every((r) => selectedItems.includes(r.id))}
          onChange={(e) => {
            if (e.target.checked) setSelectedItems(filteredImplements.map((r) => r.id));
            else setSelectedItems([]);
          }}
        />
      ),
      width: '40px',
      align: 'center',
      render: (item) => (
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary cursor-pointer"
          checked={selectedItems.includes(item.id)}
          onChange={() => toggleSelectItem(item.id)}
        />
      ),
    },
    {
      key: 'code',
      title: 'Mã thiết bị / nông cụ',
      width: '150px',
      render: (item) => <span className="font-mono font-bold text-amber-900 text-xs bg-amber-50 px-2 py-0.5 rounded border border-amber-200">{item.code}</span>,
    },
    {
      key: 'name',
      title: 'Tên nhóm nông cụ / Thiết bị phụ trợ',
      render: (item) => <strong className="text-slate-900 text-xs">{item.name}</strong>,
    },
    {
      key: 'category',
      title: 'Phân nhóm công năng',
      render: (item) => <span className="text-xs text-slate-700 font-semibold">{item.category}</span>,
    },
    {
      key: 'compatibleVehicles',
      title: 'Đầu máy / Xe phù hợp',
      render: (item) => <span className="text-xs text-slate-600">{item.compatibleVehicles}</span>,
    },
    {
      key: 'actions',
      title: 'Thao tác',
      align: 'center',
      width: '130px',
      render: (item) => (
        <div className="flex items-center justify-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            className="inline-flex items-center gap-0.5 px-2 py-1 text-[11px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md border border-blue-200 transition-colors cursor-pointer"
            title="Chỉnh sửa"
            onClick={() => {
              setEditingImplement(item);
              setShowImplementModal(true);
            }}
          >
            <Edit2 className="h-3 w-3 text-blue-600" />
            <span>Sửa</span>
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-0.5 px-2 py-1 text-[11px] font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-md border border-rose-200 transition-colors cursor-pointer"
            title="Xóa"
            onClick={() => handleDeleteImplement(item.id, item.name)}
          >
            <Trash2 className="h-3 w-3 text-rose-600" />
            <span>Xóa</span>
          </button>
        </div>
      ),
    },
  ];

  const orderTypeColumns: Column<OrderTypeItem>[] = [
    {
      key: 'select',
      title: (
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary cursor-pointer"
          checked={filteredOrderTypes.length > 0 && filteredOrderTypes.every((r) => selectedItems.includes(r.id))}
          onChange={(e) => {
            if (e.target.checked) setSelectedItems(filteredOrderTypes.map((r) => r.id));
            else setSelectedItems([]);
          }}
        />
      ),
      width: '40px',
      align: 'center',
      render: (item) => (
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary cursor-pointer"
          checked={selectedItems.includes(item.id)}
          onChange={() => toggleSelectItem(item.id)}
        />
      ),
    },
    {
      key: 'code',
      title: 'Mã loại lệnh',
      width: '140px',
      render: (item) => (
        <div className="flex flex-col gap-1">
          <span className="font-mono font-bold text-purple-700 text-xs bg-purple-50 px-2 py-0.5 rounded border border-purple-200 w-fit">
            {item.code}
          </span>
          {item.isEmergency && (
            <span className="inline-flex items-center text-[10px] font-extrabold text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded border border-rose-300 w-fit">
              CỨU HỘ KHẨN
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'name',
      title: 'Tên loại lệnh điều động',
      render: (item) => (
        <div>
          <strong className="text-slate-900 text-xs block">{item.name}</strong>
          <span className="text-[11px] text-slate-500 line-clamp-1">{item.description}</span>
        </div>
      ),
    },
    {
      key: 'orderGroup',
      title: 'Nhóm lệnh cốt lõi',
      width: '150px',
      render: (item) => {
        switch (item.orderGroup) {
          case 'NONG_NGHIEP':
            return <span className="inline-flex items-center text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200">Xe Nông nghiệp</span>;
          case 'CONG_TRINH':
            return <span className="inline-flex items-center text-[11px] font-bold text-amber-800 bg-amber-50 px-2 py-1 rounded-lg border border-amber-200">Xe Công trình</span>;
          case 'VAN_TAI':
            return <span className="inline-flex items-center text-[11px] font-bold text-blue-800 bg-blue-50 px-2 py-1 rounded-lg border border-blue-200">Xe Vận tải</span>;
          case 'CUU_HO':
            return <span className="inline-flex items-center text-[11px] font-bold text-rose-800 bg-rose-50 px-2 py-1 rounded-lg border border-rose-200">Xe Cứu hộ (SOS)</span>;
          default:
            return <span className="text-xs text-slate-600">{item.category}</span>;
        }
      },
    },
    {
      key: 'measuringMethod',
      title: 'Nghiệm thu & Định mức dầu',
      width: '180px',
      render: (item) => (
        <div className="space-y-0.5 text-xs">
          <div className="font-semibold text-slate-800">{item.measuringMethod || 'Chưa định nghĩa'}</div>
          <div className="text-[11px] font-medium text-amber-700">Định mức: {item.fuelQuotaType || 'Tiêu chuẩn'}</div>
        </div>
      ),
    },
    {
      key: 'targetScope',
      title: 'Đối tượng điều động',
      render: (item) => <span className="text-xs text-slate-600">{item.targetScope}</span>,
    },
    {
      key: 'actions',
      title: 'Thao tác',
      align: 'center',
      width: '130px',
      render: (item) => (
        <div className="flex items-center justify-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            className="inline-flex items-center gap-0.5 px-2 py-1 text-[11px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md border border-blue-200 transition-colors cursor-pointer"
            title="Chỉnh sửa"
            onClick={() => {
              setEditingOrderType(item);
              setShowOrderTypeModal(true);
            }}
          >
            <Edit2 className="h-3 w-3 text-blue-600" />
            <span>Sửa</span>
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-0.5 px-2 py-1 text-[11px] font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-md border border-rose-200 transition-colors cursor-pointer"
            title="Xóa"
            onClick={() => handleDeleteOrderType(item.id, item.name)}
          >
            <Trash2 className="h-3 w-3 text-rose-600" />
            <span>Xóa</span>
          </button>
        </div>
      ),
    },
  ];

  const routeColumns: Column<TransportRouteItem>[] = [
    {
      key: 'select',
      title: (
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary cursor-pointer"
          checked={filteredRoutes.length > 0 && filteredRoutes.every((r) => selectedItems.includes(r.id))}
          onChange={(e) => {
            if (e.target.checked) setSelectedItems(filteredRoutes.map((r) => r.id));
            else setSelectedItems([]);
          }}
        />
      ),
      width: '40px',
      align: 'center',
      render: (item) => (
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary cursor-pointer"
          checked={selectedItems.includes(item.id)}
          onChange={() => toggleSelectItem(item.id)}
        />
      ),
    },
    {
      key: 'code',
      title: 'Mã tuyến',
      sortable: true,
      render: (item) => (
        <span className="font-mono font-extrabold text-teal-700 text-xs bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
          {item.code}
        </span>
      ),
    },
    {
      key: 'name',
      title: 'Tên tuyến đường vận chuyển nội bộ',
      sortable: true,
      render: (item) => (
        <div>
          <strong className="text-slate-900 block text-xs">{item.name}</strong>
          <span className="text-[11px] text-slate-500 block mt-0.5">{item.complexName}</span>
        </div>
      ),
    },
    {
      key: 'path',
      title: 'Điểm xuất phát ➔ Điểm đến',
      render: (item) => (
        <div className="text-xs text-slate-700">
          <div className="font-medium">Đi: {item.origin}</div>
          <div className="text-slate-500 text-[11px] mt-0.5">➔ Đến: {item.destination}</div>
        </div>
      ),
    },
    {
      key: 'distanceKm',
      title: 'Cự ly chuẩn',
      sortable: true,
      render: (item) => (
        <span className="font-mono text-xs font-black text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
          {item.distanceKm} km
        </span>
      ),
    },
    {
      key: 'cargoType',
      title: 'Mặt hàng chuyên chở',
      render: (item) => <span className="text-xs text-slate-800 font-semibold">{item.cargoType}</span>,
    },
    {
      key: 'speedLimitKmH',
      title: 'Giới hạn GPS',
      render: (item) => (
        <span className="inline-flex items-center rounded bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-800 border border-amber-200">
          Tối đa {item.speedLimitKmH} km/h
        </span>
      ),
    },
    {
      key: 'actions',
      title: 'Thao tác',
      align: 'center',
      width: '130px',
      render: (item) => (
        <div className="flex items-center justify-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            className="inline-flex items-center gap-0.5 px-2 py-1 text-[11px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md border border-blue-200 transition-colors cursor-pointer"
            title="Chỉnh sửa tuyến"
            onClick={() => {
              setEditingRoute(item);
              setShowRouteModal(true);
            }}
          >
            <Edit2 className="h-3 w-3 text-blue-600" />
            <span>Sửa</span>
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-0.5 px-2 py-1 text-[11px] font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-md border border-rose-200 transition-colors cursor-pointer"
            title="Xóa tuyến"
            onClick={() => handleDeleteRoute(item.id, item.name)}
          >
            <Trash2 className="h-3 w-3 text-rose-600" />
            <span>Xóa</span>
          </button>
        </div>
      ),
    },
  ];

  const siteColumns: Column<ConstructionSiteItem>[] = [
    {
      key: 'select',
      title: (
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary cursor-pointer"
          checked={filteredSites.length > 0 && filteredSites.every((s) => selectedItems.includes(s.id))}
          onChange={(e) => {
            if (e.target.checked) setSelectedItems(filteredSites.map((s) => s.id));
            else setSelectedItems([]);
          }}
        />
      ),
      width: '40px',
      align: 'center',
      render: (item) => (
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary cursor-pointer"
          checked={selectedItems.includes(item.id)}
          onChange={() => toggleSelectItem(item.id)}
        />
      ),
    },
    {
      key: 'code',
      title: 'Mã khu vực',
      sortable: true,
      render: (item) => (
        <span className="font-mono font-extrabold text-rose-700 text-xs bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
          {item.code}
        </span>
      ),
    },
    {
      key: 'name',
      title: 'Tên khu vực thi công',
      sortable: true,
      render: (item) => (
        <div>
          <strong className="text-slate-900 block text-xs">{item.name}</strong>
          <span className="text-[11px] text-slate-500 block mt-0.5 flex items-center gap-1">
            <Building2 className="w-3 h-3 text-slate-400" />
            {item.complexName}
          </span>
        </div>
      ),
    },
    {
      key: 'categoryName',
      title: 'Phân loại hạng mục',
      render: (item) => (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
          {item.categoryName}
        </span>
      ),
    },
    {
      key: 'unitOwner',
      title: 'Đơn vị quản lý (Ban XD)',
      render: (item) => (
        <div className="text-xs font-semibold text-slate-700">
          <span className="text-slate-900 block">{item.unitOwner}</span>
        </div>
      ),
    },
    {
      key: 'targetScope',
      title: 'Quy mô thiết kế',
      render: (item) => (
        <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
          {item.targetScope}
        </span>
      ),
    },
    {
      key: 'recommendedMachines',
      title: 'Đầu máy khuyến nghị',
      render: (item) => <span className="text-xs text-slate-700">{item.recommendedMachines}</span>,
    },
    {
      key: 'status',
      title: 'Trạng thái',
      align: 'center',
      render: (item) => {
        const isProg = item.status === 'in_progress';
        const isPrep = item.status === 'preparing';
        return (
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-extrabold ${
              isProg
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : isPrep
                ? 'bg-amber-50 text-amber-800 border border-amber-200'
                : 'bg-blue-50 text-blue-700 border border-blue-200'
            }`}
          >
            {item.statusLabel || (isProg ? 'Đang thi công' : isPrep ? 'Chuẩn bị' : 'Hoàn thành')}
          </span>
        );
      },
    },
    {
      key: 'actions',
      title: 'Thao tác',
      align: 'center',
      width: '130px',
      render: (item) => (
        <div className="flex items-center justify-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            className="inline-flex items-center gap-0.5 px-2 py-1 text-[11px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md border border-blue-200 transition-colors cursor-pointer"
            title="Chỉnh sửa khu vực"
            onClick={() => {
              setEditingSite(item);
              setShowSiteModal(true);
            }}
          >
            <Edit2 className="h-3 w-3 text-blue-600" />
            <span>Sửa</span>
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-0.5 px-2 py-1 text-[11px] font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-md border border-rose-200 transition-colors cursor-pointer"
            title="Xóa khu vực"
            onClick={() => handleDeleteSite(item.id, item.name)}
          >
            <Trash2 className="h-3 w-3 text-rose-600" />
            <span>Xóa</span>
          </button>
        </div>
      ),
    },
  ];

  const teamColumns: Column<ConstructionTeamItem>[] = [
    {
      key: 'select',
      title: (
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary cursor-pointer"
          checked={filteredTeams.length > 0 && filteredTeams.every((t) => selectedItems.includes(t.id))}
          onChange={(e) => {
            if (e.target.checked) setSelectedItems(filteredTeams.map((t) => t.id));
            else setSelectedItems([]);
          }}
        />
      ),
      width: '40px',
      align: 'center',
      render: (item) => (
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary cursor-pointer"
          checked={selectedItems.includes(item.id)}
          onChange={() => toggleSelectItem(item.id)}
        />
      ),
    },
    {
      key: 'code',
      title: 'Mã đội',
      sortable: true,
      render: (item) => (
        <span className="font-mono font-extrabold text-orange-700 text-xs bg-orange-50 px-2 py-0.5 rounded border border-orange-200">
          {item.code}
        </span>
      ),
    },
    {
      key: 'name',
      title: 'Tên Đội thi công cơ giới',
      sortable: true,
      render: (item) => (
        <div>
          <strong className="text-slate-900 block text-xs">{item.name}</strong>
          <span className="text-[11px] text-slate-500 block mt-0.5 flex items-center gap-1">
            <Building2 className="w-3 h-3 text-slate-400" />
            {item.complexName}
          </span>
        </div>
      ),
    },
    {
      key: 'managingUnit',
      title: 'Đơn vị quản lý (Ban Xây dựng)',
      render: (item) => (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
          {item.managingUnit}
        </span>
      ),
    },
    {
      key: 'leader',
      title: 'Đội trưởng / Liên hệ',
      render: (item) => (
        <div className="text-xs">
          <div className="font-bold text-slate-800">{item.leaderName}</div>
          <div className="text-slate-500 text-[11px]">{item.leaderPhone}</div>
        </div>
      ),
    },
    {
      key: 'machineCount',
      title: 'Quy mô đầu máy & Nhân sự',
      render: (item) => (
        <div className="text-xs text-slate-700">
          <div className="font-semibold text-slate-900">{item.machineCount}</div>
          <div className="text-[11px] text-slate-500">{item.personnelCount}</div>
        </div>
      ),
    },
    {
      key: 'assignedAreas',
      title: 'Khu vực đang phụ trách',
      render: (item) => (
        <span className="text-xs font-medium text-slate-800 block max-w-xs truncate" title={item.assignedAreas}>
          {item.assignedAreas}
        </span>
      ),
    },
    {
      key: 'status',
      title: 'Trạng thái',
      align: 'center',
      render: (item) => {
        const isActive = item.status === 'active';
        const isBusy = item.status === 'busy';
        return (
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-extrabold ${
              isActive
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : isBusy
                ? 'bg-amber-50 text-amber-800 border border-amber-200'
                : 'bg-rose-50 text-rose-700 border border-rose-200'
            }`}
          >
            {item.statusLabel || (isActive ? 'Đang thi công' : isBusy ? 'Bận' : 'Bảo dưỡng')}
          </span>
        );
      },
    },
    {
      key: 'actions',
      title: 'Thao tác',
      align: 'center',
      width: '130px',
      render: (item) => (
        <div className="flex items-center justify-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            className="inline-flex items-center gap-0.5 px-2 py-1 text-[11px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md border border-blue-200 transition-colors cursor-pointer"
            title="Chỉnh sửa đội thi công"
            onClick={() => {
              setEditingTeam(item);
              setShowTeamModal(true);
            }}
          >
            <Edit2 className="h-3 w-3 text-blue-600" />
            <span>Sửa</span>
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-0.5 px-2 py-1 text-[11px] font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-md border border-rose-200 transition-colors cursor-pointer"
            title="Xóa đội thi công"
            onClick={() => handleDeleteTeam(item.id, item.name)}
          >
            <Trash2 className="h-3 w-3 text-rose-600" />
            <span>Xóa</span>
          </button>
        </div>
      ),
    },
  ];

  const plotColumns: Column<AgriculturalPlotItem>[] = [
    {
      key: 'select',
      title: (
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary cursor-pointer"
          checked={filteredPlots.length > 0 && filteredPlots.every((p) => selectedItems.includes(p.id))}
          onChange={(e) => {
            if (e.target.checked) setSelectedItems(filteredPlots.map((p) => p.id));
            else setSelectedItems([]);
          }}
        />
      ),
      width: '40px',
      align: 'center',
      render: (item) => (
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary cursor-pointer"
          checked={selectedItems.includes(item.id)}
          onChange={() => toggleSelectItem(item.id)}
        />
      ),
    },
    {
      key: 'code',
      title: 'Mã Lô/Thửa',
      sortable: true,
      render: (item) => (
        <span className="font-mono font-extrabold text-emerald-800 text-xs bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
          {item.code}
        </span>
      ),
    },
    {
      key: 'name',
      title: 'Tên Lô / Thửa canh tác',
      sortable: true,
      render: (item) => (
        <div>
          <strong className="text-slate-900 block text-xs">{item.name}</strong>
          <span className="text-[11px] text-slate-500 block mt-0.5 flex items-center gap-1">
            <Building2 className="w-3 h-3 text-slate-400" />
            {item.complexName}
          </span>
        </div>
      ),
    },
    {
      key: 'hierarchy',
      title: 'Phân cấp (Xí nghiệp ➔ Nông trường)',
      render: (item) => (
        <div className="text-xs">
          <div className="font-bold text-slate-800">{item.enterpriseName}</div>
          <div className="text-emerald-700 text-[11px] font-semibold">➔ {item.farmName}</div>
        </div>
      ),
    },
    {
      key: 'areaHa',
      title: 'Diện tích (ha)',
      align: 'center',
      sortable: true,
      render: (item) => (
        <span className="font-black text-slate-900 text-xs bg-slate-100 px-2 py-0.5 rounded">
          {item.areaHa} ha
        </span>
      ),
    },
    {
      key: 'cropType',
      title: 'Cây trồng / Mục đích',
      render: (item) => (
        <div className="text-xs">
          <span className="font-bold text-slate-800 block">{item.cropType}</span>
          <span className="text-[11px] text-slate-500">{item.irrigationSystem}</span>
        </div>
      ),
    },
    {
      key: 'status',
      title: 'Trạng thái',
      align: 'center',
      render: (item) => {
        const isActive = item.status === 'active';
        const isPrep = item.status === 'preparing';
        return (
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-extrabold ${
              isActive
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : isPrep
                ? 'bg-amber-50 text-amber-800 border border-amber-200'
                : 'bg-blue-50 text-blue-700 border border-blue-200'
            }`}
          >
            {item.statusLabel || (isActive ? 'Đang canh tác' : isPrep ? 'Đang làm đất' : 'Tái canh')}
          </span>
        );
      },
    },
    {
      key: 'actions',
      title: 'Thao tác',
      align: 'center',
      width: '130px',
      render: (item) => (
        <div className="flex items-center justify-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            className="inline-flex items-center gap-0.5 px-2 py-1 text-[11px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md border border-blue-200 transition-colors cursor-pointer"
            title="Chỉnh sửa lô thửa"
            onClick={() => {
              setEditingPlot(item);
              setShowPlotModal(true);
            }}
          >
            <Edit2 className="h-3 w-3 text-blue-600" />
            <span>Sửa</span>
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-0.5 px-2 py-1 text-[11px] font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-md border border-rose-200 transition-colors cursor-pointer"
            title="Xóa lô thửa"
            onClick={() => handleDeletePlot(item.id, item.name)}
          >
            <Trash2 className="h-3 w-3 text-rose-600" />
            <span>Xóa</span>
          </button>
        </div>
      ),
    },
  ];

  const agriTeamColumns: Column<AgriculturalTeamItem>[] = [
    {
      key: 'select',
      title: (
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary cursor-pointer"
          checked={filteredAgriTeams.length > 0 && filteredAgriTeams.every((t) => selectedItems.includes(t.id))}
          onChange={(e) => {
            if (e.target.checked) setSelectedItems(filteredAgriTeams.map((t) => t.id));
            else setSelectedItems([]);
          }}
        />
      ),
      width: '40px',
      align: 'center',
      render: (item) => (
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary cursor-pointer"
          checked={selectedItems.includes(item.id)}
          onChange={() => toggleSelectItem(item.id)}
        />
      ),
    },
    {
      key: 'code',
      title: 'Mã đội',
      sortable: true,
      render: (item) => (
        <span className="font-mono font-extrabold text-emerald-800 text-xs bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
          {item.code}
        </span>
      ),
    },
    {
      key: 'name',
      title: 'Tên Đội xe cơ giới',
      sortable: true,
      render: (item) => (
        <div>
          <strong className="text-slate-900 block text-xs">{item.name}</strong>
          <span className="text-[11px] text-slate-500 block mt-0.5 flex items-center gap-1">
            <Building2 className="w-3 h-3 text-slate-400" />
            {item.complexName}
          </span>
        </div>
      ),
    },
    {
      key: 'hierarchy',
      title: 'Phân cấp (Xí nghiệp ➔ Nông trường)',
      render: (item) => (
        <div className="text-xs">
          <div className="font-bold text-slate-800">{item.enterpriseName}</div>
          <div className="text-emerald-700 text-[11px] font-semibold">➔ {item.farmName}</div>
        </div>
      ),
    },
    {
      key: 'leader',
      title: 'Đội trưởng / SĐT',
      render: (item) => (
        <div className="text-xs">
          <div className="font-bold text-slate-800">{item.leaderName}</div>
          <div className="text-slate-500 text-[11px]">{item.leaderPhone}</div>
        </div>
      ),
    },
    {
      key: 'machineCount',
      title: 'Cơ cấu máy & Nhân lực',
      render: (item) => (
        <div className="text-xs text-slate-700">
          <div className="font-semibold text-slate-900">{item.machineCount}</div>
          <div className="text-[11px] text-slate-500">{item.personnelCount}</div>
        </div>
      ),
    },
    {
      key: 'assignedPlots',
      title: 'Lô / Vùng phụ trách',
      render: (item) => (
        <span className="text-xs font-medium text-slate-800 block max-w-xs truncate" title={item.assignedPlots}>
          {item.assignedPlots}
        </span>
      ),
    },
    {
      key: 'status',
      title: 'Trạng thái',
      align: 'center',
      render: (item) => {
        const isActive = item.status === 'active';
        const isBusy = item.status === 'busy';
        return (
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-extrabold ${
              isActive
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : isBusy
                ? 'bg-amber-50 text-amber-800 border border-amber-200'
                : 'bg-rose-50 text-rose-700 border border-rose-200'
            }`}
          >
            {item.statusLabel || (isActive ? 'Sẵn sàng' : isBusy ? 'Đang bận' : 'Bảo dưỡng')}
          </span>
        );
      },
    },
    {
      key: 'actions',
      title: 'Thao tác',
      align: 'center',
      width: '130px',
      render: (item) => (
        <div className="flex items-center justify-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            className="inline-flex items-center gap-0.5 px-2 py-1 text-[11px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md border border-blue-200 transition-colors cursor-pointer"
            title="Chỉnh sửa đội cơ giới"
            onClick={() => {
              setEditingAgriTeam(item);
              setShowAgriTeamModal(true);
            }}
          >
            <Edit2 className="h-3 w-3 text-blue-600" />
            <span>Sửa</span>
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-0.5 px-2 py-1 text-[11px] font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-md border border-rose-200 transition-colors cursor-pointer"
            title="Xóa đội cơ giới"
            onClick={() => handleDeleteAgriTeam(item.id, item.name)}
          >
            <Trash2 className="h-3 w-3 text-rose-600" />
            <span>Xóa</span>
          </button>
        </div>
      ),
    },
  ];

  // Cấu hình thẻ thống kê & Tabs thích ứng theo từng Lĩnh vực (Ưu tiên chuyên biệt cho Nông nghiệp)
  const domainStatCards = useMemo(() => {
    if (selectedJobPlanType === 'NONG_NGHIEP') {
      return [
        {
          label: '1. Hạng mục công việc Nông nghiệp',
          value: filteredJobs.length,
          sub: 'Làm đất, bón lót, chăm sóc, thu hoạch...',
          icon: Briefcase,
          tab: 'jobs' as const,
          color: 'text-emerald-700 bg-emerald-50',
        },
        {
          label: '2. Giai đoạn sản xuất Nông nghiệp',
          value: filteredStages.length,
          sub: 'Đồng bộ trực tiếp Tạo kế hoạch tuần',
          icon: Layers,
          tab: 'stages' as const,
          color: 'text-blue-700 bg-blue-50',
        },
        {
          label: '3. Nông cụ cơ giới Nông nghiệp',
          value: filteredImplements.length,
          sub: 'Dàn cày, bừa đĩa, dàn xới, rơ-moóc...',
          icon: Wrench,
          tab: 'implements' as const,
          color: 'text-amber-700 bg-amber-50',
        },
        {
          label: '4. Loại Lệnh điều động Nông nghiệp',
          value: filteredOrderTypes.length,
          sub: 'Lệnh sản xuất cơ giới & Cứu hộ SOS',
          icon: FileCheck,
          tab: 'orderTypes' as const,
          color: 'text-purple-700 bg-purple-50',
        },
        {
          label: '5. Lô / Thửa canh tác Nông nghiệp',
          value: filteredPlots.length,
          sub: selectedKLH === 'ALL' ? 'Toàn bộ Lô/Thửa các KLH' : KLH_OPTIONS.find((k) => k.code === selectedKLH)?.name || '',
          icon: MapPin,
          tab: 'plots' as const,
          color: 'text-teal-700 bg-teal-50',
        },
        {
          label: '6. Đội Xe Cơ giới Nông nghiệp',
          value: filteredAgriTeams.length,
          sub: selectedKLH === 'ALL' ? 'Đội cơ giới Nông trường' : KLH_OPTIONS.find((k) => k.code === selectedKLH)?.name || '',
          icon: Tractor,
          tab: 'teams' as const,
          color: 'text-emerald-700 bg-emerald-50',
        },
      ];
    }

    if (selectedJobPlanType === 'CONG_TRINH') {
      return [
        {
          label: '1. Ca máy & Hạng mục Công trình',
          value: filteredJobs.length,
          sub: 'Đào đắp mương máng, san gạt, lu lèn...',
          icon: Briefcase,
          tab: 'jobs' as const,
          color: 'text-amber-700 bg-amber-50',
        },
        {
          label: '2. Phân loại Hạng mục Thi công',
          value: filteredStages.length,
          sub: 'Đào đắp, San lấp, Làm đường, Nạo vét',
          icon: Layers,
          tab: 'stages' as const,
          color: 'text-blue-700 bg-blue-50',
        },
        {
          label: '3. Thiết bị thi công phụ trợ',
          value: filteredImplements.length,
          sub: 'Gầu đào, lưỡi ben ủi, búa phá đá...',
          icon: Wrench,
          tab: 'implements' as const,
          color: 'text-emerald-700 bg-emerald-50',
        },
        {
          label: '4. Loại Lệnh điều xe Công trình',
          value: filteredOrderTypes.length,
          sub: 'Lệnh thi công ca máy & Cứu hộ SOS',
          icon: FileCheck,
          tab: 'orderTypes' as const,
          color: 'text-purple-700 bg-purple-50',
        },
        {
          label: '5. Khu vực thi công',
          value: filteredSites.length,
          sub: selectedKLH === 'ALL' ? 'Toàn bộ khu vực thuộc Ban Xây dựng' : KLH_OPTIONS.find((k) => k.code === selectedKLH)?.name || '',
          icon: MapPin,
          tab: 'sites' as const,
          color: 'text-rose-700 bg-rose-50',
        },
        {
          label: '6. Đội thi công cơ giới',
          value: filteredTeams.length,
          sub: selectedKLH === 'ALL' ? 'Đội thi công trực thuộc Ban Xây dựng' : KLH_OPTIONS.find((k) => k.code === selectedKLH)?.name || '',
          icon: HardHat,
          tab: 'teams' as const,
          color: 'text-orange-700 bg-orange-50',
        },
      ];
    }

    // VAN_CHUYEN
    return [
      {
        label: '1. Quy trình & Định mức Vận chuyển',
        value: filteredJobs.length,
        sub: 'Vận chuyển chuối, TĂCN bò, vật tư...',
        icon: Briefcase,
        tab: 'jobs' as const,
        color: 'text-blue-700 bg-blue-50',
      },
      {
        label: '2. Phân loại Mặt hàng Vận chuyển',
        value: filteredStages.length,
        sub: 'Chuối xuất khẩu, Bắp ủ chua, Phân bón...',
        icon: Layers,
        tab: 'stages' as const,
        color: 'text-emerald-700 bg-emerald-50',
      },
      {
        label: '3. Rơ-moóc & Thiết bị chuyên dụng',
        value: filteredImplements.length,
        sub: 'Moóc chở chuối, cont 40ft, téc dầu...',
        icon: Wrench,
        tab: 'implements' as const,
        color: 'text-amber-700 bg-amber-50',
      },
      {
        label: '4. Loại Lệnh điều động Vận chuyển',
        value: filteredOrderTypes.length,
        sub: 'Lệnh vận chuyển nội bộ & Cứu hộ SOS',
        icon: FileCheck,
        tab: 'orderTypes' as const,
        color: 'text-purple-700 bg-purple-50',
      },
      {
        label: '5. Tuyến đường vận chuyển nội bộ',
        value: filteredRoutes.length,
        sub: selectedKLH === 'ALL' ? 'Toàn bộ tuyến KLH' : KLH_OPTIONS.find((k) => k.code === selectedKLH)?.name || '',
        icon: Navigation,
        tab: 'routes' as const,
        color: 'text-teal-700 bg-teal-50',
      },
    ];
  }, [
    selectedJobPlanType,
    filteredJobs.length,
    filteredStages.length,
    filteredImplements.length,
    filteredOrderTypes.length,
    filteredRoutes.length,
    filteredSites.length,
    filteredTeams.length,
    filteredPlots.length,
    filteredAgriTeams.length,
    selectedKLH,
  ]);

  return (
    <div className="space-y-5">


      {/* 2. STATS CARDS - TABS DANH MỤC THÍCH ỨNG THEO LĨNH VỰC */}
      <div
        className={`grid gap-3 ${
          domainStatCards.length === 4
            ? 'grid-cols-2 sm:grid-cols-4'
            : domainStatCards.length === 5
            ? 'grid-cols-2 sm:grid-cols-5'
            : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6'
        }`}
      >
        {domainStatCards.map((stat) => (
          <button
            key={stat.tab}
            type="button"
            onClick={() => handleTabChange(stat.tab)}
            className={`rounded-2xl border p-3.5 text-left transition-all hover:shadow-md cursor-pointer ${
              activeTab === stat.tab
                ? 'border-primary bg-primary-50/40 ring-2 ring-primary/20 shadow-xs'
                : 'border-slate-200 bg-white hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11.5px] font-bold text-slate-700 truncate">{stat.label}</span>
              <div className={`rounded-xl p-1.5 shrink-0 ${stat.color}`}>
                <stat.icon className="h-3.5 w-3.5" />
              </div>
            </div>
            <div className="mt-1.5 text-xl font-black text-slate-900">{stat.value}</div>
            <div className="mt-0.5 text-[10.5px] text-slate-500 font-medium truncate">{stat.sub}</div>
          </button>
        ))}
      </div>

      {/* 3. MAIN TABLE SECTION */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-4">
        {/* Header toolbar with actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wide">
              {activeTab === 'jobs' && 'Bảng danh mục Quy trình & Hạng mục công việc cơ giới (Mã tăng dần)'}
              {activeTab === 'stages' && 'Danh mục Giai đoạn mùa vụ & Phân loại thi công/vận chuyển'}
              {activeTab === 'implements' && 'Danh mục Nông cụ & Thiết bị phụ trợ kèm theo (Đồng bộ Select)'}
              {activeTab === 'orderTypes' && 'Danh mục Loại lệnh điều động cơ giới (3 Lệnh chính + 1 Cứu hộ SOS)'}
              {activeTab === 'routes' && `Danh mục Tuyến đường vận chuyển nội bộ (${KLH_OPTIONS.find(k => k.code === selectedKLH)?.name})`}
              {activeTab === 'sites' && `Danh mục Khu vực thi công công trình - Ban Quản lý Xây dựng (${KLH_OPTIONS.find(k => k.code === selectedKLH)?.name})`}
              {activeTab === 'plots' && `Danh mục Lô / Thửa canh tác Nông nghiệp (${KLH_OPTIONS.find(k => k.code === selectedKLH)?.name})`}
              {activeTab === 'teams' && (selectedJobPlanType === 'NONG_NGHIEP' ? `Danh mục Đội Xe Cơ giới Nông nghiệp - Nông trường (${KLH_OPTIONS.find(k => k.code === selectedKLH)?.name})` : `Danh mục Đội thi công cơ giới - Trực thuộc Ban Xây dựng (${KLH_OPTIONS.find(k => k.code === selectedKLH)?.name})`)}
            </span>
            {selectedItems.length > 0 && (
              <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
                Đã chọn {selectedItems.length} mục
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 ml-auto">
            <div className="relative w-56 sm:w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 py-2 text-xs text-slate-800 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15 h-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm kiếm nhanh từ khóa..."
              />
            </div>

            {selectedItems.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="h-9 text-xs font-bold text-rose-700 bg-rose-50 border-rose-200 hover:bg-rose-100 cursor-pointer"
                icon={<Trash2 className="h-3.5 w-3.5 text-rose-600" />}
                onClick={handleBatchDelete}
              >
                Xóa {selectedItems.length} mục
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              className="h-9 text-xs font-bold border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 cursor-pointer"
              icon={<RefreshCw className="h-3.5 w-3.5" />}
              onClick={handleResetFilters}
            >
              Làm mới
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="h-9 text-xs font-bold border-slate-200 bg-white text-slate-700 hover:bg-slate-50 cursor-pointer shadow-xs"
              icon={<Download className="h-3.5 w-3.5" />}
              onClick={handleExportCSV}
            >
              Xuất file
            </Button>

            {/* NÚT THÊM MỚI TƯƠNG ỨNG THEO TỪNG TAB */}
            {activeTab === 'jobs' && (
              <Button
                size="sm"
                className="h-9 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-xs"
                icon={<Plus className="h-3.5 w-3.5" />}
                onClick={() => handleOpenCreateJob()}
              >
                Thêm công việc mới
              </Button>
            )}

            {activeTab === 'stages' && (
              <Button
                size="sm"
                className="h-9 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-xs"
                icon={<Plus className="h-3.5 w-3.5" />}
                onClick={() => {
                  setEditingStage(null);
                  setShowStageModal(true);
                }}
              >
                Thêm phân loại / giai đoạn
              </Button>
            )}

            {activeTab === 'implements' && (
              <Button
                size="sm"
                className="h-9 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-xs"
                icon={<Plus className="h-3.5 w-3.5" />}
                onClick={() => {
                  setEditingImplement(null);
                  setShowImplementModal(true);
                }}
              >
                Thêm nông cụ / thiết bị
              </Button>
            )}

            {activeTab === 'orderTypes' && (
              <Button
                size="sm"
                className="h-9 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-xs"
                icon={<Plus className="h-3.5 w-3.5" />}
                onClick={() => {
                  setEditingOrderType(null);
                  setShowOrderTypeModal(true);
                }}
              >
                Thêm loại lệnh
              </Button>
            )}

            {activeTab === 'routes' && (
              <Button
                size="sm"
                className="h-9 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-xs"
                icon={<Plus className="h-3.5 w-3.5" />}
                onClick={() => {
                  setEditingRoute(null);
                  setShowRouteModal(true);
                }}
              >
                Thêm tuyến đường
              </Button>
            )}

            {activeTab === 'sites' && (
              <Button
                size="sm"
                className="h-9 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-xs"
                icon={<Plus className="h-3.5 w-3.5" />}
                onClick={() => {
                  setEditingSite(null);
                  setShowSiteModal(true);
                }}
              >
                Thêm khu vực thi công
              </Button>
            )}

            {activeTab === 'plots' && (
              <Button
                size="sm"
                className="h-9 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-xs"
                icon={<Plus className="h-3.5 w-3.5" />}
                onClick={() => {
                  setEditingPlot(null);
                  setShowPlotModal(true);
                }}
              >
                Thêm Lô / Thửa canh tác
              </Button>
            )}

            {activeTab === 'teams' && (
              <Button
                size="sm"
                className="h-9 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-xs"
                icon={<Plus className="h-3.5 w-3.5" />}
                onClick={() => {
                  if (selectedJobPlanType === 'NONG_NGHIEP') {
                    setEditingAgriTeam(null);
                    setShowAgriTeamModal(true);
                  } else {
                    setEditingTeam(null);
                    setShowTeamModal(true);
                  }
                }}
              >
                {selectedJobPlanType === 'NONG_NGHIEP' ? 'Thêm đội xe cơ giới' : 'Thêm đội thi công'}
              </Button>
            )}
          </div>
        </div>

        {/* ------------------------------------------------------------------- */}
        {/* TAB 1: DANH MỤC HẠNG MỤC CÔNG VIỆC CƠ GIỚI & ĐỊNH MỨC               */}
        {/* ------------------------------------------------------------------- */}
        {activeTab === 'jobs' && (
          <div className="space-y-4">
            {/* Thanh lọc & Tiêu chí theo Lĩnh vực hoạt động */}
            <div className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-3 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                  <Filter className="h-3.5 w-3.5 text-primary" />
                  <span>
                    {selectedJobPlanType === 'NONG_NGHIEP' && 'Quy trình công việc Cơ giới Nông nghiệp & Định mức ca máy:'}
                    {selectedJobPlanType === 'CONG_TRINH' && 'Ca máy Máy công trình & Định mức thi công:'}
                    {selectedJobPlanType === 'VAN_CHUYEN' && 'Quy trình Vận chuyển hàng hóa & Định mức chuyến:'}
                  </span>
                </div>
                <span className="text-[11px] text-slate-500 font-medium">
                  Đang hiển thị {filteredJobs.length} hạng mục định mức (Mã quy trình sắp xếp tăng dần)
                </span>
              </div>

              {/* BỘ TIÊU CHÍ TÌM KIẾM DẠNG SELECT TEXT GIỐNG HÌNH 3 MẪU */}
              <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-2xs space-y-2">
                {(filterCode || filterName || filterStage) && (
                  <div className="flex items-center justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setFilterCode('');
                        setFilterName('');
                        setFilterStage('');
                      }}
                      className="text-[11px] text-slate-500 hover:text-red-600 flex items-center gap-1 cursor-pointer font-medium"
                    >
                      <RotateCcw className="h-3 w-3" />
                      Xóa bộ lọc
                    </button>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                      Mã quy trình / công việc
                    </label>
                    <SearchableSelect
                      value={filterCode}
                      onChange={(val) => setFilterCode(val)}
                      options={jobCodeFilterOptions}
                      placeholder={`Tất cả mã (${jobCodeFilterOptions.length})`}
                      emptyOptionLabel={`Tất cả mã (${jobCodeFilterOptions.length})`}
                      heightClass="h-9"
                      icon={<Briefcase className="w-3.5 h-3.5" />}
                      allowCustomInput={true}
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                      Tên hạng mục công việc
                    </label>
                    <SearchableSelect
                      value={filterName}
                      onChange={(val) => setFilterName(val)}
                      options={jobNameFilterOptions}
                      placeholder={`Tất cả tên (${jobNameFilterOptions.length})`}
                      emptyOptionLabel={`Tất cả tên (${jobNameFilterOptions.length})`}
                      heightClass="h-9"
                      icon={<Briefcase className="w-3.5 h-3.5" />}
                      allowCustomInput={true}
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                      Giai đoạn vụ / Phân loại
                    </label>
                    <SearchableSelect
                      value={filterStage}
                      onChange={(val) => setFilterStage(val)}
                      options={stageFilterOptions}
                      placeholder="Tất cả phân loại"
                      emptyOptionLabel="Tất cả phân loại"
                      heightClass="h-9"
                      icon={<Layers className="w-3.5 h-3.5" />}
                      allowCustomInput={true}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <DataTable
                data={filteredJobs}
                columns={jobColumns}
                pageSize={20}
                showSearch={false}
                showExport={false}
                useGlobalFilters={false}
              />
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------- */}
        {/* TAB 2: GIAI ĐOẠN SẢN XUẤT NÔNG NGHIỆP / PHÂN LOẠI THI CÔNG          */}
        {/* ------------------------------------------------------------------- */}
        {activeTab === 'stages' && (
          <div className="overflow-x-auto">
            <DataTable
              data={filteredStages}
              columns={stageColumns}
              pageSize={20}
              showSearch={false}
              showExport={false}
              useGlobalFilters={false}
            />
          </div>
        )}

        {/* ------------------------------------------------------------------- */}
        {/* TAB 3: DANH MỤC NÔNG CỤ & THIẾT BỊ PHỤ TRỢ (ĐỒNG BỘ SELECT)         */}
        {/* ------------------------------------------------------------------- */}
        {activeTab === 'implements' && (
          <div className="overflow-x-auto">
            <DataTable
              data={filteredImplements}
              columns={implementColumns}
              pageSize={20}
              showSearch={false}
              showExport={false}
              useGlobalFilters={false}
            />
          </div>
        )}

        {/* ------------------------------------------------------------------- */}
        {/* TAB 4: DANH MỤC LOẠI LỆNH ĐIỀU ĐỘNG                                */}
        {/* ------------------------------------------------------------------- */}
        {activeTab === 'orderTypes' && (
          <div className="overflow-x-auto">
            <DataTable
              data={filteredOrderTypes}
              columns={orderTypeColumns}
              pageSize={20}
              showSearch={false}
              showExport={false}
              useGlobalFilters={false}
            />
          </div>
        )}

        {/* ------------------------------------------------------------------- */}
        {/* TAB 5: TUYẾN ĐƯỜNG VẬN CHUYỂN NỘI BỘ                                */}
        {/* ------------------------------------------------------------------- */}
        {activeTab === 'routes' && (
          <div className="overflow-x-auto">
            <DataTable
              data={filteredRoutes}
              columns={routeColumns}
              pageSize={20}
              showSearch={false}
              showExport={false}
              useGlobalFilters={false}
            />
          </div>
        )}

        {/* ------------------------------------------------------------------- */}
        {/* TAB 6: KHU VỰC THI CÔNG CÔNG TRÌNH (BAN QUẢN LÝ XÂY DỰNG)            */}
        {/* ------------------------------------------------------------------- */}
        {activeTab === 'sites' && (
          <div className="space-y-4">
            <div className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-3 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                  <Filter className="h-3.5 w-3.5 text-primary" />
                  <span>Bộ lọc Khu vực thi công theo Khu liên hợp & Hạng mục:</span>
                </div>
                <span className="text-[11px] text-slate-500 font-medium">
                  Đang hiển thị {filteredSites.length} khu vực thi công
                </span>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-2xs space-y-2">
                {(siteFilterKLH || siteFilterCategory || siteFilterUnitOwner || siteFilterCode) && (
                  <div className="flex items-center justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setSiteFilterKLH('');
                        setSiteFilterCategory('');
                        setSiteFilterUnitOwner('');
                        setSiteFilterCode('');
                      }}
                      className="text-[11px] text-slate-500 hover:text-red-600 flex items-center gap-1 cursor-pointer font-medium"
                    >
                      <RotateCcw className="h-3 w-3" />
                      Xóa bộ lọc
                    </button>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                      Khu liên hợp
                    </label>
                    <SearchableSelect
                      value={siteFilterKLH}
                      onChange={(val) => {
                        setSiteFilterKLH(val);
                        setSiteFilterUnitOwner('');
                        setSiteFilterCode('');
                      }}
                      options={siteKlhFilterOptions}
                      placeholder={`Tất cả Khu liên hợp (${siteKlhFilterOptions.length})`}
                      emptyOptionLabel={`Tất cả Khu liên hợp (${siteKlhFilterOptions.length})`}
                      heightClass="h-9"
                      icon={<Building2 className="w-3.5 h-3.5" />}
                      allowCustomInput={false}
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                      Hạng mục thi công
                    </label>
                    <SearchableSelect
                      value={siteFilterCategory}
                      onChange={(val) => {
                        setSiteFilterCategory(val);
                        setSiteFilterCode('');
                      }}
                      options={siteCategoryFilterOptions}
                      placeholder="Tất cả hạng mục"
                      emptyOptionLabel="Tất cả hạng mục"
                      heightClass="h-9"
                      icon={<Layers className="w-3.5 h-3.5" />}
                      allowCustomInput={false}
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                      Đơn vị chủ quản
                    </label>
                    <SearchableSelect
                      value={siteFilterUnitOwner}
                      onChange={(val) => {
                        setSiteFilterUnitOwner(val);
                        setSiteFilterCode('');
                      }}
                      options={siteUnitOwnerFilterOptions}
                      placeholder={`Tất cả đơn vị (${siteUnitOwnerFilterOptions.length})`}
                      emptyOptionLabel={`Tất cả đơn vị (${siteUnitOwnerFilterOptions.length})`}
                      heightClass="h-9"
                      icon={<Building2 className="w-3.5 h-3.5" />}
                      allowCustomInput={true}
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                      Mã / Tên Khu vực thi công
                    </label>
                    <SearchableSelect
                      value={siteFilterCode}
                      onChange={(val) => setSiteFilterCode(val)}
                      options={siteCodeFilterOptions}
                      placeholder={`Tất cả khu vực (${sites.length})`}
                      emptyOptionLabel={`Tất cả khu vực (${sites.length})`}
                      heightClass="h-9"
                      icon={<MapPin className="w-3.5 h-3.5" />}
                      allowCustomInput={true}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <DataTable
                data={filteredSites}
                columns={siteColumns}
                pageSize={20}
                showSearch={false}
                showExport={false}
                useGlobalFilters={false}
              />
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------- */}
        {/* TAB 5 (NÔNG NGHIỆP): LÔ / THỬA CANH TÁC NÔNG NGHIỆP                 */}
        {/* ------------------------------------------------------------------- */}
        {activeTab === 'plots' && (
          <div className="space-y-4">
            <div className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-3 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                  <Filter className="h-3.5 w-3.5 text-primary" />
                  <span>Phân cấp Lô / Thửa canh tác theo Khu liên hợp & Xí nghiệp:</span>
                </div>
                <span className="text-[11px] text-slate-500 font-medium">
                  Đang hiển thị {filteredPlots.length} Lô / Thửa canh tác nông nghiệp
                </span>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-2xs space-y-2">
                {(plotFilterKLH || plotFilterEnterprise || plotFilterFarm || plotFilterCode) && (
                  <div className="flex items-center justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setPlotFilterKLH('');
                        setPlotFilterEnterprise('');
                        setPlotFilterFarm('');
                        setPlotFilterCode('');
                      }}
                      className="text-[11px] text-slate-500 hover:text-red-600 flex items-center gap-1 cursor-pointer font-medium"
                    >
                      <RotateCcw className="h-3 w-3" />
                      Xóa bộ lọc
                    </button>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                      Khu liên hợp
                    </label>
                    <SearchableSelect
                      value={plotFilterKLH}
                      onChange={(val) => {
                        setPlotFilterKLH(val);
                        setPlotFilterEnterprise('');
                        setPlotFilterFarm('');
                        setPlotFilterCode('');
                      }}
                      options={plotKlhFilterOptions}
                      placeholder={`Tất cả Khu liên hợp (${plotKlhFilterOptions.length})`}
                      emptyOptionLabel={`Tất cả Khu liên hợp (${plotKlhFilterOptions.length})`}
                      heightClass="h-9"
                      icon={<Building2 className="w-3.5 h-3.5" />}
                      allowCustomInput={false}
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                      Xí nghiệp trực thuộc
                    </label>
                    <SearchableSelect
                      value={plotFilterEnterprise}
                      onChange={(val) => {
                        setPlotFilterEnterprise(val);
                        setPlotFilterFarm('');
                        setPlotFilterCode('');
                      }}
                      options={plotEnterpriseFilterOptions}
                      placeholder={`Tất cả xí nghiệp (${plotEnterpriseFilterOptions.length})`}
                      emptyOptionLabel={`Tất cả xí nghiệp (${plotEnterpriseFilterOptions.length})`}
                      heightClass="h-9"
                      icon={<Building2 className="w-3.5 h-3.5" />}
                      allowCustomInput={true}
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                      Nông trường phụ trách
                    </label>
                    <SearchableSelect
                      value={plotFilterFarm}
                      onChange={(val) => {
                        setPlotFilterFarm(val);
                        setPlotFilterCode('');
                      }}
                      options={plotFarmFilterOptions}
                      placeholder={`Tất cả nông trường (${plotFarmFilterOptions.length})`}
                      emptyOptionLabel={`Tất cả nông trường (${plotFarmFilterOptions.length})`}
                      heightClass="h-9"
                      icon={<MapPin className="w-3.5 h-3.5" />}
                      allowCustomInput={true}
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                      Mã / Tên Lô / Thửa
                    </label>
                    <SearchableSelect
                      value={plotFilterCode}
                      onChange={(val) => setPlotFilterCode(val)}
                      options={plotCodeFilterOptions}
                      placeholder={`Tất cả Lô/Thửa (${plots.length})`}
                      emptyOptionLabel={`Tất cả Lô/Thửa (${plots.length})`}
                      heightClass="h-9"
                      icon={<Layers className="w-3.5 h-3.5" />}
                      allowCustomInput={true}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <DataTable
                data={filteredPlots}
                columns={plotColumns}
                pageSize={20}
                showSearch={false}
                showExport={false}
                useGlobalFilters={false}
              />
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------- */}
        {/* TAB 6/7: ĐỘI XE CƠ GIỚI NÔNG NGHIỆP / ĐỘI THI CÔNG BAN XÂY DỰNG     */}
        {/* ------------------------------------------------------------------- */}
        {activeTab === 'teams' && (
          <div className="space-y-4">
            {selectedJobPlanType === 'NONG_NGHIEP' ? (
              <div className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-3 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                    <Filter className="h-3.5 w-3.5 text-primary" />
                    <span>Phân cấp Đội xe cơ giới nông nghiệp theo Khu liên hợp & Xí nghiệp:</span>
                  </div>
                  <span className="text-[11px] text-slate-500 font-medium">
                    Đang hiển thị {filteredAgriTeams.length} Đội xe cơ giới nông nghiệp
                  </span>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-2xs space-y-2">
                  {(agriTeamFilterKLH || agriTeamFilterEnterprise || agriTeamFilterFarm || agriTeamFilterCode) && (
                    <div className="flex items-center justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          setAgriTeamFilterKLH('');
                          setAgriTeamFilterEnterprise('');
                          setAgriTeamFilterFarm('');
                          setAgriTeamFilterCode('');
                        }}
                        className="text-[11px] text-slate-500 hover:text-red-600 flex items-center gap-1 cursor-pointer font-medium"
                      >
                        <RotateCcw className="h-3 w-3" />
                        Xóa bộ lọc
                      </button>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div>
                      <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                        Khu liên hợp
                      </label>
                      <SearchableSelect
                        value={agriTeamFilterKLH}
                        onChange={(val) => {
                          setAgriTeamFilterKLH(val);
                          setAgriTeamFilterEnterprise('');
                          setAgriTeamFilterFarm('');
                          setAgriTeamFilterCode('');
                        }}
                        options={agriTeamKlhFilterOptions}
                        placeholder={`Tất cả Khu liên hợp (${agriTeamKlhFilterOptions.length})`}
                        emptyOptionLabel={`Tất cả Khu liên hợp (${agriTeamKlhFilterOptions.length})`}
                        heightClass="h-9"
                        icon={<Building2 className="w-3.5 h-3.5" />}
                        allowCustomInput={false}
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                        Xí nghiệp trực thuộc
                      </label>
                      <SearchableSelect
                        value={agriTeamFilterEnterprise}
                        onChange={(val) => {
                          setAgriTeamFilterEnterprise(val);
                          setAgriTeamFilterFarm('');
                          setAgriTeamFilterCode('');
                        }}
                        options={agriTeamEnterpriseFilterOptions}
                        placeholder={`Tất cả xí nghiệp (${agriTeamEnterpriseFilterOptions.length})`}
                        emptyOptionLabel={`Tất cả xí nghiệp (${agriTeamEnterpriseFilterOptions.length})`}
                        heightClass="h-9"
                        icon={<Building2 className="w-3.5 h-3.5" />}
                        allowCustomInput={true}
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                        Nông trường phụ trách
                      </label>
                      <SearchableSelect
                        value={agriTeamFilterFarm}
                        onChange={(val) => {
                          setAgriTeamFilterFarm(val);
                          setAgriTeamFilterCode('');
                        }}
                        options={agriTeamFarmFilterOptions}
                        placeholder={`Tất cả nông trường (${agriTeamFarmFilterOptions.length})`}
                        emptyOptionLabel={`Tất cả nông trường (${agriTeamFarmFilterOptions.length})`}
                        heightClass="h-9"
                        icon={<MapPin className="w-3.5 h-3.5" />}
                        allowCustomInput={true}
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                        Mã / Tên Đội cơ giới
                      </label>
                      <SearchableSelect
                        value={agriTeamFilterCode}
                        onChange={(val) => setAgriTeamFilterCode(val)}
                        options={agriTeamCodeFilterOptions}
                        placeholder={`Tất cả đội (${agriTeams.length})`}
                        emptyOptionLabel={`Tất cả đội (${agriTeams.length})`}
                        heightClass="h-9"
                        icon={<Tractor className="w-3.5 h-3.5" />}
                        allowCustomInput={true}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-3 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                    <Filter className="h-3.5 w-3.5 text-primary" />
                    <span>Bộ lọc Đội thi công cơ giới Ban Xây dựng:</span>
                  </div>
                  <span className="text-[11px] text-slate-500 font-medium">
                    Đang hiển thị {filteredTeams.length} Đội thi công công trình
                  </span>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-2xs space-y-2">
                  {(teamFilterKLH || teamFilterManagingUnit || teamFilterStatus || teamFilterCode) && (
                    <div className="flex items-center justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          setTeamFilterKLH('');
                          setTeamFilterManagingUnit('');
                          setTeamFilterStatus('');
                          setTeamFilterCode('');
                        }}
                        className="text-[11px] text-slate-500 hover:text-red-600 flex items-center gap-1 cursor-pointer font-medium"
                      >
                        <RotateCcw className="h-3 w-3" />
                        Xóa bộ lọc
                      </button>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div>
                      <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                        Khu liên hợp
                      </label>
                      <SearchableSelect
                        value={teamFilterKLH}
                        onChange={(val) => {
                          setTeamFilterKLH(val);
                          setTeamFilterManagingUnit('');
                          setTeamFilterCode('');
                        }}
                        options={teamKlhFilterOptions}
                        placeholder={`Tất cả Khu liên hợp (${teamKlhFilterOptions.length})`}
                        emptyOptionLabel={`Tất cả Khu liên hợp (${teamKlhFilterOptions.length})`}
                        heightClass="h-9"
                        icon={<Building2 className="w-3.5 h-3.5" />}
                        allowCustomInput={false}
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                        Đơn vị chủ quản
                      </label>
                      <SearchableSelect
                        value={teamFilterManagingUnit}
                        onChange={(val) => {
                          setTeamFilterManagingUnit(val);
                          setTeamFilterCode('');
                        }}
                        options={teamManagingUnitFilterOptions}
                        placeholder={`Tất cả đơn vị (${teamManagingUnitFilterOptions.length})`}
                        emptyOptionLabel={`Tất cả đơn vị (${teamManagingUnitFilterOptions.length})`}
                        heightClass="h-9"
                        icon={<Building2 className="w-3.5 h-3.5" />}
                        allowCustomInput={true}
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                        Trạng thái đội
                      </label>
                      <SearchableSelect
                        value={teamFilterStatus}
                        onChange={(val) => setTeamFilterStatus(val)}
                        options={teamStatusFilterOptions}
                        placeholder="Tất cả trạng thái"
                        emptyOptionLabel="Tất cả trạng thái"
                        heightClass="h-9"
                        icon={<CheckCircle2 className="w-3.5 h-3.5" />}
                        allowCustomInput={false}
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                        Mã / Tên Đội thi công
                      </label>
                      <SearchableSelect
                        value={teamFilterCode}
                        onChange={(val) => setTeamFilterCode(val)}
                        options={teamCodeFilterOptions}
                        placeholder={`Tất cả đội (${teams.length})`}
                        emptyOptionLabel={`Tất cả đội (${teams.length})`}
                        heightClass="h-9"
                        icon={<HardHat className="w-3.5 h-3.5" />}
                        allowCustomInput={true}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="overflow-x-auto">
              <DataTable
                data={selectedJobPlanType === 'NONG_NGHIEP' ? filteredAgriTeams : (filteredTeams as any)}
                columns={selectedJobPlanType === 'NONG_NGHIEP' ? (agriTeamColumns as any) : (teamColumns as any)}
                pageSize={20}
                showSearch={false}
                showExport={false}
                useGlobalFilters={false}
              />
            </div>
          </div>
        )}
      </section>

      {/* ===================================================================== */}
      {/* 1. MODAL THÊM / SỬA HẠNG MỤC CÔNG VIỆC CƠ GIỚI (SELECT TEXT GIỐNG HÌNH 3) */}
      {/* ===================================================================== */}
      <Modal
        isOpen={showJobModal}
        hideFooter={true}
        onClose={() => {
          setShowJobModal(false);
          setEditingJob(null);
        }}
        title={editingJob ? `Chỉnh sửa: ${editingJob.name}` : 'Thêm mới Quy trình / Hạng mục công việc cơ giới'}
        subtitle="Chuẩn hóa định mức ca máy, dầu khoán và nhóm nông cụ tương thích cho Lệnh điều xe"
        size="lg"
      >
        <form className="space-y-3.5 text-xs" onSubmit={handleSaveJob}>
          {/* Hàng 1: Mã quy trình, Tên công việc */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Mã quy trình (Tăng dần):
              </label>
              <input
                value={formCode}
                onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                required
                placeholder="VD: CV-NN-10 hoặc CT-07"
                className="w-full rounded-xl border border-slate-200 p-2 font-mono font-bold text-xs uppercase bg-white focus:border-primary focus:outline-none h-9"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="font-bold text-slate-700 block mb-1">
                Tên hạng mục công việc cơ giới:
              </label>
              <input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                required
                placeholder={
                  formPlanType === 'NONG_NGHIEP'
                    ? 'VD: Bừa hoàn thiện tạo mặt phẳng rải phân'
                    : formPlanType === 'CONG_TRINH'
                    ? 'VD: Đào rãnh thoát nước mương chính NT2'
                    : 'VD: Chở chuối đóng gói từ xưởng đóng gói ra cảng xuất'
                }
                className="w-full rounded-xl border border-slate-200 p-2 font-bold text-xs bg-white focus:border-primary focus:outline-none h-9"
              />
            </div>
          </div>

          {/* Hàng 2: Giai đoạn/Phân loại, Khu liên hợp, Đầu máy */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">
                {formPlanType === 'NONG_NGHIEP' && 'Giai đoạn mùa vụ chuối:'}
                {formPlanType === 'CONG_TRINH' && 'Phân loại hạng mục thi công:'}
                {formPlanType === 'VAN_CHUYEN' && 'Phân loại luồng vận chuyển:'}
              </label>
              <SearchableSelect
                value={formStageCode}
                onChange={(val) => setFormStageCode(val)}
                options={stages
                  .filter((s) => s.planType === formPlanType && s.status === 'active')
                  .map((s) => ({
                    value: s.code,
                    label: s.name,
                    subLabel: s.description,
                  }))}
                placeholder="Chọn hoặc nhập phân loại..."
                allowCustomInput={true}
                icon={<Layers className="w-3.5 h-3.5" />}
                heightClass="h-9"
                roundedClass="rounded-xl"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Khu liên hợp áp dụng:
              </label>
              <SearchableSelect
                value={formComplexCode}
                onChange={(val) => setFormComplexCode(val)}
                options={[
                  { value: 'KOUN_MOM', label: 'Khu liên hợp Koun Mom' },
                  { value: 'SNOUL', label: 'Khu liên hợp Snoul' },
                  { value: 'NAM_LAO', label: 'Khu liên hợp Nam Lào' },
                ]}
                placeholder="Chọn Khu liên hợp..."
                allowCustomInput={false}
                icon={<MapPin className="w-3.5 h-3.5" />}
                heightClass="h-9"
                roundedClass="rounded-xl"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Đầu máy khuyến nghị:
              </label>
              <SearchableSelect
                value={formRecommendedVehicle}
                onChange={(val) => setFormRecommendedVehicle(val)}
                options={recommendedVehiclesOptions}
                onAddOption={handleAddRecommendedVehicle}
                onDeleteOption={handleDeleteRecommendedVehicle}
                placeholder="Chọn hoặc gõ đầu máy..."
                allowCustomInput={true}
                icon={<Tractor className="w-3.5 h-3.5" />}
                heightClass="h-9"
                roundedClass="rounded-xl"
              />
            </div>
          </div>

          {/* CHỌN NÔNG CỤ HOẶC THIẾT BỊ PHỤ TRỢ TƯƠNG THÍCH (SELECT TEXT TỪ DANH MỤC) */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2.5">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="modalHasImplement"
                checked={formHasImplement}
                onChange={(e) => setFormHasImplement(e.target.checked)}
                className="h-4 w-4 text-primary rounded border-slate-300 cursor-pointer"
              />
              <label htmlFor="modalHasImplement" className="font-bold text-slate-800 text-xs cursor-pointer select-none">
                {formPlanType === 'NONG_NGHIEP' && 'Có gắn thiết bị nông cụ kèm theo không (Dàn cày, bừa, xới...)?'}
                {formPlanType === 'CONG_TRINH' && 'Có gắn thiết bị phụ trợ (Gầu đào, búa đập đá, lưỡi ủi...)?'}
                {formPlanType === 'VAN_CHUYEN' && 'Có kéo Sơ-mi rơ-moóc / Moóc thùng chở chuối/thức ăn?'}
              </label>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">
                {formPlanType === 'NONG_NGHIEP' && 'Nhóm nông cụ tương thích (Từ danh mục Nông cụ):'}
                {formPlanType === 'CONG_TRINH' && 'Nhóm thiết bị / Phụ tùng công trình:'}
                {formPlanType === 'VAN_CHUYEN' && 'Quy cách Sơ-mi rơ-moóc / Thùng kéo:'}
              </label>
              <SearchableSelect
                value={formImplementGroup}
                onChange={(val) => setFormImplementGroup(val)}
                options={implementsList
                  .filter((i) => i.planType === formPlanType && i.status === 'active')
                  .map((i) => ({
                    value: i.name,
                    label: i.name,
                    subLabel: `${i.category} • ${i.compatibleVehicles}`,
                  }))}
                placeholder="Chọn hoặc gõ nhóm nông cụ/thiết bị..."
                allowCustomInput={true}
                icon={<Wrench className="w-3.5 h-3.5" />}
                heightClass="h-9"
                roundedClass="rounded-xl"
              />
            </div>
          </div>

          {/* Hàng 3: Đơn vị khối lượng, định mức ca và dầu khoán */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Đơn vị khối lượng:</label>
              <SearchableSelect
                value={formDefaultUnit}
                onChange={setFormDefaultUnit}
                options={volumeUnitsOptions}
                onAddOption={handleAddVolumeUnit}
                onDeleteOption={handleDeleteVolumeUnit}
                placeholder="Chọn đơn vị..."
                allowCustomInput={true}
                heightClass="h-9"
                roundedClass="rounded-xl"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">
                {formPlanType === 'NONG_NGHIEP' && 'Định mức năng suất ca (ha/ca):'}
                {formPlanType === 'CONG_TRINH' && 'Định mức ca máy (giờ máy/ca):'}
                {formPlanType === 'VAN_CHUYEN' && 'Định mức ca (chuyến/ca hoặc tấn):'}
              </label>
              <input
                value={formQuotaPerShift}
                onChange={(e) => setFormQuotaPerShift(e.target.value)}
                placeholder="VD: 4.5 ha/ca 8h hoặc 1 ca 8h..."
                className="w-full rounded-xl border border-slate-200 p-2 font-bold text-xs bg-white focus:border-primary focus:outline-none h-9"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Định mức dầu khoán:
              </label>
              <input
                type="number"
                step="0.1"
                required
                value={formFuelQuota}
                onChange={(e) => setFormFuelQuota(parseFloat(e.target.value) || 0)}
                className="w-full rounded-xl border border-slate-200 p-2 font-extrabold text-emerald-700 text-xs bg-white focus:border-primary focus:outline-none h-9"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Đơn vị tính dầu khoán:
              </label>
              <SearchableSelect
                value={formFuelUnit}
                onChange={(val) => setFormFuelUnit(val)}
                options={fuelUnitsOptions}
                onAddOption={handleAddFuelUnit}
                onDeleteOption={handleDeleteFuelUnit}
                placeholder="Chọn đơn vị tính dầu..."
                allowCustomInput={true}
                icon={<Fuel className="w-3.5 h-3.5" />}
                heightClass="h-9"
                roundedClass="rounded-xl"
              />
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">
              Mô tả kỹ thuật & yêu cầu:
            </label>
            <textarea
              rows={2}
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              placeholder="Ghi chú thêm về quy định an toàn, yêu cầu kỹ thuật mùa vụ..."
              className="w-full rounded-xl border border-slate-200 p-2 text-xs bg-white focus:border-primary focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setShowJobModal(false);
                setEditingJob(null);
              }}
            >
              Hủy
            </Button>
            <Button type="submit" variant="primary" size="sm">
              {editingJob ? 'Lưu thay đổi' : 'Thêm vào danh mục'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ===================================================================== */}
      {/* 2. MODAL THÊM / SỬA GIAI ĐOẠN / PHÂN LOẠI HẠNG MỤC                    */}
      {/* ===================================================================== */}
      <Modal
        isOpen={showStageModal}
        hideFooter={true}
        onClose={() => {
          setShowStageModal(false);
          setEditingStage(null);
        }}
        title={editingStage ? `Chỉnh sửa Phân loại: ${editingStage.name}` : 'Thêm mới Phân loại / Giai đoạn công việc'}
        subtitle="Chuẩn hóa các bước chuỗi sản xuất nông nghiệp, công trình và vận chuyển"
        size="md"
      >
        <form className="space-y-3 text-xs" onSubmit={handleSaveStage}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Thứ tự chuỗi:</label>
              <input
                name="sequence"
                type="number"
                min="1"
                required
                defaultValue={editingStage?.sequence || stages.length + 1}
                className="w-full rounded-xl border border-slate-200 p-2 font-bold text-xs focus:border-primary focus:outline-none h-9"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Mã phân loại (Code):</label>
              <input
                name="code"
                required
                defaultValue={editingStage?.code || ''}
                placeholder="VD: LAM_DAT"
                className="w-full rounded-xl border border-slate-200 p-2 font-mono font-bold text-xs uppercase focus:border-primary focus:outline-none h-9"
              />
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Tên phân loại / Giai đoạn:</label>
            <input
              name="name"
              required
              defaultValue={editingStage?.name || ''}
              placeholder="VD: 1. Làm đất hoặc 1. Đào đắp mương máng..."
              className="w-full rounded-xl border border-slate-200 p-2 font-bold text-xs focus:border-primary focus:outline-none h-9"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Quy trình công việc trọng tâm:</label>
            <textarea
              name="description"
              required
              rows={2}
              defaultValue={editingStage?.description || ''}
              placeholder="Mô tả các công việc chính trong giai đoạn này..."
              className="w-full rounded-xl border border-slate-200 p-2 text-xs focus:border-primary focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setShowStageModal(false);
                setEditingStage(null);
              }}
            >
              Hủy
            </Button>
            <Button type="submit" variant="primary" size="sm">
              {editingStage ? 'Lưu thay đổi' : 'Thêm giai đoạn'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ===================================================================== */}
      {/* 3. MODAL THÊM / SỬA NHÓM NÔNG CỤ & THIẾT BỊ PHỤ TRỢ                   */}
      {/* ===================================================================== */}
      <Modal
        isOpen={showImplementModal}
        hideFooter={true}
        onClose={() => {
          setShowImplementModal(false);
          setEditingImplement(null);
        }}
        title={editingImplement ? `Chỉnh sửa: ${editingImplement.name}` : 'Thêm mới Nông cụ / Thiết bị phụ trợ'}
        subtitle="Quản lý danh sách nông cụ và thiết bị phụ trợ đồng bộ vào Select Text"
        size="md"
      >
        <form className="space-y-3 text-xs" onSubmit={handleSaveImplement}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Mã thiết bị / nông cụ:</label>
              <input
                name="code"
                required
                defaultValue={editingImplement?.code || ''}
                placeholder="VD: NC-CAY-02"
                className="w-full rounded-xl border border-slate-200 p-2 font-mono font-bold text-xs uppercase focus:border-primary focus:outline-none h-9"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Phân nhóm công năng:</label>
              <input
                name="category"
                defaultValue={editingImplement?.category || 'Cày xới đất'}
                placeholder="VD: Cày xới đất, San gạt..."
                className="w-full rounded-xl border border-slate-200 p-2 text-xs focus:border-primary focus:outline-none h-9"
              />
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Tên nhóm nông cụ / Thiết bị phụ trợ:</label>
            <input
              name="name"
              required
              defaultValue={editingImplement?.name || ''}
              placeholder="VD: Dàn cày 3 - 4 chảo hoặc Gầu đào 0.8m3..."
              className="w-full rounded-xl border border-slate-200 p-2 font-bold text-xs focus:border-primary focus:outline-none h-9"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Đầu máy / Xe phù hợp tương thích:</label>
            <input
              name="compatibleVehicles"
              defaultValue={editingImplement?.compatibleVehicles || 'Máy kéo 70 - 90HP'}
              placeholder="VD: Máy kéo 70 - 90HP hoặc Máy đào PC200..."
              className="w-full rounded-xl border border-slate-200 p-2 text-xs focus:border-primary focus:outline-none h-9"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Mô tả kỹ thuật:</label>
            <textarea
              name="description"
              rows={2}
              defaultValue={editingImplement?.description || ''}
              placeholder="Ghi chú thêm về chức năng, tải trọng, quy cách..."
              className="w-full rounded-xl border border-slate-200 p-2 text-xs focus:border-primary focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setShowImplementModal(false);
                setEditingImplement(null);
              }}
            >
              Hủy
            </Button>
            <Button type="submit" variant="primary" size="sm">
              {editingImplement ? 'Lưu thay đổi' : 'Thêm nông cụ/thiết bị'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ===================================================================== */}
      {/* 4. MODAL THÊM / SỬA LOẠI LỆNH ĐIỀU ĐỘNG                               */}
      {/* ===================================================================== */}
      <Modal
        isOpen={showOrderTypeModal}
        hideFooter={true}
        onClose={() => {
          setShowOrderTypeModal(false);
          setEditingOrderType(null);
        }}
        title={editingOrderType ? `Chỉnh sửa: ${editingOrderType.name}` : 'Thêm mới Loại lệnh điều động'}
        subtitle="Chuẩn hóa các loại lệnh phân bổ xe cơ giới phục vụ sản xuất & vận chuyển"
        size="md"
      >
        <form className="space-y-3 text-xs" onSubmit={handleSaveOrderType}>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Mã loại lệnh (Code):</label>
              <input
                name="code"
                required
                defaultValue={editingOrderType?.code || ''}
                placeholder="VD: LENH_NONG_NGHIEP"
                className="w-full rounded-xl border border-slate-200 p-2 font-mono font-bold text-xs uppercase focus:border-primary focus:outline-none h-9"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Nhóm lệnh cốt lõi (3+1):</label>
              <select
                name="orderGroup"
                defaultValue={editingOrderType?.orderGroup || 'NONG_NGHIEP'}
                className="w-full rounded-xl border border-slate-200 p-2 font-bold text-xs focus:border-primary focus:outline-none h-9"
              >
                <option value="NONG_NGHIEP">Xe Nông nghiệp</option>
                <option value="CONG_TRINH">Xe Công trình</option>
                <option value="VAN_TAI">Xe Vận tải</option>
                <option value="CUU_HO">Xe Cứu hộ (SOS)</option>
              </select>
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Trạng thái áp dụng:</label>
              <select
                name="status"
                defaultValue={editingOrderType?.status || 'active'}
                className="w-full rounded-xl border border-slate-200 p-2 font-bold text-xs focus:border-primary focus:outline-none h-9"
              >
                <option value="active">Hiệu lực</option>
                <option value="inactive">Tạm ngưng</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Tên loại lệnh điều động:</label>
              <input
                name="name"
                required
                defaultValue={editingOrderType?.name || ''}
                placeholder="VD: Lệnh điều xe sản xuất nông nghiệp"
                className="w-full rounded-xl border border-slate-200 p-2 font-bold text-xs focus:border-primary focus:outline-none h-9"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Phân nhóm hiển thị:</label>
              <input
                name="category"
                required
                defaultValue={editingOrderType?.category || ''}
                placeholder="VD: Canh tác nội đồng, Logistics..."
                className="w-full rounded-xl border border-slate-200 p-2 text-xs focus:border-primary focus:outline-none h-9"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Đơn vị đo lường năng suất:</label>
              <input
                name="measuringMethod"
                defaultValue={editingOrderType?.measuringMethod || 'Héc-ta (ha)'}
                placeholder="VD: Héc-ta (ha), Giờ máy, Chuyến..."
                className="w-full rounded-xl border border-slate-200 bg-white p-2 text-xs focus:border-primary focus:outline-none h-9"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Định mức nhiên liệu:</label>
              <input
                name="fuelQuotaType"
                defaultValue={editingOrderType?.fuelQuotaType || 'Lít/ha'}
                placeholder="VD: Lít/ha, Lít/h, Lít/100km..."
                className="w-full rounded-xl border border-slate-200 bg-white p-2 text-xs focus:border-primary focus:outline-none h-9"
              />
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 p-3 space-y-2">
            <span className="font-bold text-slate-700 block text-xs">Ràng buộc đặc tả & Quy trình:</span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="requiresImplement"
                  defaultChecked={editingOrderType?.requiresImplement ?? true}
                  className="rounded border-slate-300 text-primary focus:ring-primary h-4 w-4"
                />
                <span className="text-slate-700">Bắt buộc Nông cụ gắn kèm</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="requiresLotPlot"
                  defaultChecked={editingOrderType?.requiresLotPlot ?? true}
                  className="rounded border-slate-300 text-primary focus:ring-primary h-4 w-4"
                />
                <span className="text-slate-700">Chỉ định Lô/Thửa canh tác</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="requiresRoute"
                  defaultChecked={editingOrderType?.requiresRoute ?? false}
                  className="rounded border-slate-300 text-primary focus:ring-primary h-4 w-4"
                />
                <span className="text-slate-700">Kiểm soát Tuyến đường</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-rose-700 font-bold">
                <input
                  type="checkbox"
                  name="isEmergency"
                  defaultChecked={editingOrderType?.isEmergency ?? false}
                  className="rounded border-rose-300 text-rose-600 focus:ring-rose-500 h-4 w-4"
                />
                <span>Cứu hộ khẩn cấp (Bypass duyệt)</span>
              </label>
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Đối tượng điều động áp dụng:</label>
            <input
              name="targetScope"
              required
              defaultValue={editingOrderType?.targetScope || ''}
              placeholder="VD: Máy kéo bánh hơi, Máy ủi, Xe tải ben..."
              className="w-full rounded-xl border border-slate-200 p-2 text-xs focus:border-primary focus:outline-none h-9"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Mô tả chi tiết mục đích lệnh:</label>
            <textarea
              name="description"
              rows={2}
              defaultValue={editingOrderType?.description || ''}
              placeholder="Mô tả phạm vi áp dụng của lệnh..."
              className="w-full rounded-xl border border-slate-200 p-2 text-xs focus:border-primary focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setShowOrderTypeModal(false);
                setEditingOrderType(null);
              }}
            >
              Hủy
            </Button>
            <Button type="submit" variant="primary" size="sm">
              {editingOrderType ? 'Lưu thay đổi' : 'Thêm loại lệnh'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ===================================================================== */}
      {/* 5. MODAL THÊM / SỬA TUYẾN ĐƯỜNG VẬN CHUYỂN NỘI BỘ                     */}
      {/* ===================================================================== */}
      <Modal
        isOpen={showRouteModal}
        hideFooter={true}
        onClose={() => {
          setShowRouteModal(false);
          setEditingRoute(null);
        }}
        title={editingRoute ? `Chỉnh sửa Tuyến: ${editingRoute.name}` : 'Thêm Tuyến đường vận chuyển nội bộ mới'}
        subtitle="Chuẩn hóa cự ly km và giới hạn tốc độ GPS cho Lệnh vận chuyển nội bộ"
        size="lg"
      >
        <form className="space-y-3 text-xs" onSubmit={handleSaveRoute}>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Mã tuyến (VD: TD-KM-05):</label>
              <input
                name="code"
                required
                defaultValue={editingRoute?.code || ''}
                placeholder="VD: TD-KM-05"
                className="w-full rounded-xl border border-slate-200 p-2 font-mono font-bold text-xs uppercase focus:border-primary focus:outline-none h-9"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="font-bold text-slate-700 block mb-1">Tên tuyến đường vận chuyển:</label>
              <input
                name="name"
                required
                defaultValue={editingRoute?.name || ''}
                placeholder="VD: Nông trường 1 ➔ Xí nghiệp Bò Koun Mom"
                className="w-full rounded-xl border border-slate-200 p-2 font-bold text-xs focus:border-primary focus:outline-none h-9"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Điểm xuất phát (Origin):</label>
              <input
                name="origin"
                required
                defaultValue={editingRoute?.origin || ''}
                placeholder="VD: Kho phụ phẩm NT1 (Lô A/B)..."
                className="w-full rounded-xl border border-slate-200 p-2 text-xs focus:border-primary focus:outline-none h-9"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Điểm đến (Destination):</label>
              <input
                name="destination"
                required
                defaultValue={editingRoute?.destination || ''}
                placeholder="VD: Trại Bò thịt - Xí nghiệp Chăn nuôi Bò..."
                className="w-full rounded-xl border border-slate-200 p-2 text-xs focus:border-primary focus:outline-none h-9"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Thuộc Khu liên hợp:</label>
              <select
                name="complexCode"
                defaultValue={editingRoute?.complexCode || (selectedKLH !== 'ALL' ? selectedKLH : 'KOUN_MOM')}
                className="w-full rounded-xl border border-slate-200 p-2 text-xs font-bold focus:border-primary focus:outline-none h-9"
              >
                <option value="KOUN_MOM">Khu liên hợp Koun Mom</option>
                <option value="SNOUL">Khu liên hợp Snoul</option>
                <option value="NAM_LAO">Khu liên hợp Nam Lào</option>
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Cự ly chuẩn (km):</label>
              <input
                name="distanceKm"
                type="number"
                step="0.1"
                required
                defaultValue={editingRoute?.distanceKm || 12.0}
                placeholder="VD: 12.5"
                className="w-full rounded-xl border border-slate-200 p-2 font-bold text-xs focus:border-primary focus:outline-none h-9"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Tốc độ tối đa GPS (km/h):</label>
              <input
                name="speedLimitKmH"
                type="number"
                step="1"
                required
                defaultValue={editingRoute?.speedLimitKmH || 35}
                placeholder="VD: 35"
                className="w-full rounded-xl border border-slate-200 p-2 font-bold text-xs focus:border-primary focus:outline-none h-9"
              />
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Mặt hàng / Phụ phẩm chuyên chở:</label>
            <input
              name="cargoType"
              defaultValue={editingRoute?.cargoType || ''}
              placeholder="VD: Thân/lá chuối tươi làm thức ăn chăn nuôi..."
              className="w-full rounded-xl border border-slate-200 p-2 text-xs focus:border-primary focus:outline-none h-9"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Ghi chú lộ trình:</label>
            <textarea
              name="notes"
              rows={2}
              defaultValue={editingRoute?.notes || ''}
              placeholder="Lưu ý mặt đường, cầu cống, trạm cân..."
              className="w-full rounded-xl border border-slate-200 p-2 text-xs focus:border-primary focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setShowRouteModal(false);
                setEditingRoute(null);
              }}
            >
              Hủy
            </Button>
            <Button type="submit" variant="primary" size="sm">
              {editingRoute ? 'Lưu tuyến đường' : 'Thêm tuyến mới'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ===================================================================== */}
      {/* 6. MODAL THÊM / SỬA KHU VỰC THI CÔNG CÔNG TRÌNH                       */}
      {/* ===================================================================== */}
      <Modal
        isOpen={showSiteModal}
        hideFooter={true}
        onClose={() => {
          setShowSiteModal(false);
          setEditingSite(null);
        }}
        title={editingSite ? `Chỉnh sửa: ${editingSite.name}` : 'Thêm Khu vực thi công công trình mới'}
        subtitle="Quản lý địa bàn thi công thuộc Ban Quản lý Xây dựng & Hạ tầng theo Khu liên hợp"
        size="lg"
      >
        <form className="space-y-3 text-xs" onSubmit={handleSaveSite}>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Mã khu vực:</label>
              <input
                name="code"
                required
                defaultValue={editingSite?.code || getNextSiteCode(sites)}
                placeholder="VD: KV-CT-11"
                className="w-full rounded-xl border border-slate-200 p-2 font-mono font-bold text-xs uppercase focus:border-primary focus:outline-none h-9"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="font-bold text-slate-700 block mb-1">Tên khu vực thi công:</label>
              <input
                name="name"
                required
                defaultValue={editingSite?.name || ''}
                placeholder="VD: Khu vực Mương chính Koun Mom (Kênh cấp 1)"
                className="w-full rounded-xl border border-slate-200 p-2 font-bold text-xs focus:border-primary focus:outline-none h-9"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Thuộc Khu liên hợp:</label>
              <select
                name="complexCode"
                defaultValue={editingSite?.complexCode || (selectedKLH !== 'ALL' ? selectedKLH : 'KOUN_MOM')}
                className="w-full rounded-xl border border-slate-200 p-2 text-xs font-bold focus:border-primary focus:outline-none h-9"
              >
                <option value="KOUN_MOM">Khu liên hợp Koun Mom</option>
                <option value="SNOUL">Khu liên hợp Snoul</option>
                <option value="NAM_LAO">Khu liên hợp Nam Lào</option>
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Phân loại hạng mục:</label>
              <select
                name="category"
                defaultValue={editingSite?.category || 'DAO_DAP'}
                className="w-full rounded-xl border border-slate-200 p-2 text-xs font-bold focus:border-primary focus:outline-none h-9"
              >
                <option value="DAO_DAP">Đào đắp mương máng</option>
                <option value="SAN_LAP">San lấp mặt bằng</option>
                <option value="GIAO_THONG">Làm đường giao thông nội bộ</option>
                <option value="HO_DAP">Hồ đập chứa nước & Trạm bơm</option>
                <option value="HA_TANG">Hạ tầng kỹ thuật phụ trợ</option>
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Trạng thái:</label>
              <select
                name="status"
                defaultValue={editingSite?.status || 'in_progress'}
                className="w-full rounded-xl border border-slate-200 p-2 text-xs font-bold focus:border-primary focus:outline-none h-9"
              >
                <option value="in_progress">Đang thi công</option>
                <option value="preparing">Chuẩn bị thi công</option>
                <option value="completed">Đã nghiệm thu</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="font-bold text-slate-700 block mb-1">Đơn vị quản lý (Ban Xây dựng):</label>
              <input
                name="unitOwner"
                required
                defaultValue={editingSite?.unitOwner || 'Ban Quản lý Dự án & Hạ tầng Koun Mom'}
                placeholder="VD: Ban Quản lý Xây dựng & Hạ tầng Koun Mom"
                className="w-full rounded-xl border border-slate-200 p-2 text-xs font-medium focus:border-primary focus:outline-none h-9"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Thời gian thi công (ngày):</label>
              <input
                name="estimatedDays"
                type="number"
                step="1"
                required
                defaultValue={editingSite?.estimatedDays || 45}
                placeholder="VD: 45"
                className="w-full rounded-xl border border-slate-200 p-2 font-bold text-xs focus:border-primary focus:outline-none h-9"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Quy mô thiết kế:</label>
              <input
                name="targetScope"
                required
                defaultValue={editingSite?.targetScope || ''}
                placeholder="VD: 14,500 m³ đào đắp hoặc 8.2 km đường..."
                className="w-full rounded-xl border border-slate-200 p-2 text-xs focus:border-primary focus:outline-none h-9"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Đơn vị tính:</label>
              <input
                name="targetUnit"
                required
                defaultValue={editingSite?.targetUnit || 'm³'}
                placeholder="VD: m³, km, ha, cụm..."
                className="w-full rounded-xl border border-slate-200 p-2 text-xs focus:border-primary focus:outline-none h-9"
              />
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Đầu máy cơ giới khuyến nghị:</label>
            <input
              name="recommendedMachines"
              defaultValue={editingSite?.recommendedMachines || ''}
              placeholder="VD: Xe đào bánh xích 0.8m³, Xe ủi D6, Xe ben 15T..."
              className="w-full rounded-xl border border-slate-200 p-2 text-xs focus:border-primary focus:outline-none h-9"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Ghi chú kỹ thuật thi công:</label>
            <textarea
              name="notes"
              rows={2}
              defaultValue={editingSite?.notes || ''}
              placeholder="Lưu ý địa chất, tiến độ thoát lũ trước mùa mưa..."
              className="w-full rounded-xl border border-slate-200 p-2 text-xs focus:border-primary focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setShowSiteModal(false);
                setEditingSite(null);
              }}
            >
              Hủy
            </Button>
            <Button type="submit" variant="primary" size="sm">
              {editingSite ? 'Lưu khu vực' : 'Thêm khu vực mới'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ===================================================================== */}
      {/* 7. MODAL THÊM / SỬA ĐỘI THI CÔNG CƠ GIỚI                               */}
      {/* ===================================================================== */}
      <Modal
        isOpen={showTeamModal}
        hideFooter={true}
        onClose={() => {
          setShowTeamModal(false);
          setEditingTeam(null);
        }}
        title={editingTeam ? `Chỉnh sửa Đội: ${editingTeam.name}` : 'Thêm Đội thi công cơ giới mới'}
        subtitle="Đội cơ giới thi công trực thuộc Ban Xây dựng quản lý theo từng Khu liên hợp"
        size="lg"
      >
        <form className="space-y-3 text-xs" onSubmit={handleSaveTeam}>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Mã đội:</label>
              <input
                name="code"
                required
                defaultValue={editingTeam?.code || getNextTeamCode(selectedKLH !== 'ALL' ? selectedKLH : 'KOUN_MOM', teams)}
                placeholder="VD: DTC-KM-04"
                className="w-full rounded-xl border border-slate-200 p-2 font-mono font-bold text-xs uppercase focus:border-primary focus:outline-none h-9"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="font-bold text-slate-700 block mb-1">Tên Đội thi công cơ giới:</label>
              <input
                name="name"
                required
                defaultValue={editingTeam?.name || ''}
                placeholder="VD: Đội Xe Cơ giới Thi công Công trình 1"
                className="w-full rounded-xl border border-slate-200 p-2 font-bold text-xs focus:border-primary focus:outline-none h-9"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Thuộc Khu liên hợp:</label>
              <select
                name="complexCode"
                defaultValue={editingTeam?.complexCode || (selectedKLH !== 'ALL' ? selectedKLH : 'KOUN_MOM')}
                className="w-full rounded-xl border border-slate-200 p-2 text-xs font-bold focus:border-primary focus:outline-none h-9"
              >
                <option value="KOUN_MOM">Khu liên hợp Koun Mom</option>
                <option value="SNOUL">Khu liên hợp Snoul</option>
                <option value="NAM_LAO">Khu liên hợp Nam Lào</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="font-bold text-slate-700 block mb-1">Đơn vị chủ quản (Ban Xây dựng):</label>
              <input
                name="managingUnit"
                required
                defaultValue={editingTeam?.managingUnit || 'Ban Quản lý Xây dựng & Hạ tầng Koun Mom'}
                placeholder="VD: Ban Quản lý Xây dựng & Hạ tầng Koun Mom"
                className="w-full rounded-xl border border-slate-200 p-2 text-xs font-medium focus:border-primary focus:outline-none h-9"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Đội trưởng phụ trách:</label>
              <input
                name="leaderName"
                required
                defaultValue={editingTeam?.leaderName || ''}
                placeholder="VD: Nguyễn Văn Tuấn"
                className="w-full rounded-xl border border-slate-200 p-2 font-bold text-xs focus:border-primary focus:outline-none h-9"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Số điện thoại liên hệ:</label>
              <input
                name="leaderPhone"
                defaultValue={editingTeam?.leaderPhone || ''}
                placeholder="VD: 0912.345.678"
                className="w-full rounded-xl border border-slate-200 p-2 text-xs focus:border-primary focus:outline-none h-9"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Trạng thái đội:</label>
              <select
                name="status"
                defaultValue={editingTeam?.status || 'active'}
                className="w-full rounded-xl border border-slate-200 p-2 text-xs font-bold focus:border-primary focus:outline-none h-9"
              >
                <option value="active">Đang thi công</option>
                <option value="busy">Đang bận dự án khác</option>
                <option value="maintenance">Bảo dưỡng / Sửa chữa</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Quy mô máy móc thiết bị:</label>
              <input
                name="machineCount"
                required
                defaultValue={editingTeam?.machineCount || ''}
                placeholder="VD: 14 đầu máy (5 máy đào PC200, 3 máy ủi D6, 2 máy san...)"
                className="w-full rounded-xl border border-slate-200 p-2 text-xs focus:border-primary focus:outline-none h-9"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Lực lượng nhân sự:</label>
              <input
                name="personnelCount"
                defaultValue={editingTeam?.personnelCount || ''}
                placeholder="VD: 18 thợ máy & lái xe"
                className="w-full rounded-xl border border-slate-200 p-2 text-xs focus:border-primary focus:outline-none h-9"
              />
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Khu vực / Địa bàn đang phụ trách:</label>
            <input
              name="assignedAreas"
              defaultValue={editingTeam?.assignedAreas || ''}
              placeholder="VD: KV-CT-01 (Mương chính), KV-CT-06 (Cống hộp Lô C1-C2)..."
              className="w-full rounded-xl border border-slate-200 p-2 text-xs focus:border-primary focus:outline-none h-9"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Ghi chú chuyên trách:</label>
            <textarea
              name="notes"
              rows={2}
              defaultValue={editingTeam?.notes || ''}
              placeholder="Phụ trách đào đắp thủy lợi nội đồng, cống tiêu úng..."
              className="w-full rounded-xl border border-slate-200 p-2 text-xs focus:border-primary focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setShowTeamModal(false);
                setEditingTeam(null);
              }}
            >
              Hủy
            </Button>
            <Button type="submit" variant="primary" size="sm">
              {editingTeam ? 'Lưu đội thi công' : 'Thêm đội mới'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ===================================================================== */}
      {/* 8. MODAL THÊM / SỬA LÔ / THỬA CANH TÁC NÔNG NGHIỆP                    */}
      {/* ===================================================================== */}
      <Modal
        isOpen={showPlotModal}
        hideFooter={true}
        onClose={() => {
          setShowPlotModal(false);
          setEditingPlot(null);
        }}
        title={editingPlot ? `Chỉnh sửa Lô: ${editingPlot.name}` : 'Thêm Lô / Thửa canh tác nông nghiệp mới'}
        subtitle="Lô / Thửa canh tác trực thuộc Xí nghiệp và Nông trường theo từng Khu liên hợp"
        size="lg"
      >
        <form className="space-y-3 text-xs" onSubmit={handleSavePlot}>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Mã Lô / Thửa:</label>
              <input
                name="code"
                required
                defaultValue={editingPlot?.code || getNextPlotCode(selectedKLH !== 'ALL' ? selectedKLH : 'KOUN_MOM', plots)}
                placeholder="VD: LO-KM-07"
                className="w-full rounded-xl border border-slate-200 p-2 font-mono font-bold text-xs uppercase focus:border-primary focus:outline-none h-9"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="font-bold text-slate-700 block mb-1">Tên Lô / Thửa canh tác:</label>
              <input
                name="name"
                required
                defaultValue={editingPlot?.name || ''}
                placeholder="VD: Lô C01 - Chuối Nam Mỹ (Khu mở rộng)"
                className="w-full rounded-xl border border-slate-200 p-2 font-bold text-xs focus:border-primary focus:outline-none h-9"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Thuộc Khu liên hợp:</label>
              <select
                name="complexCode"
                defaultValue={editingPlot?.complexCode || (selectedKLH !== 'ALL' ? selectedKLH : 'KOUN_MOM')}
                className="w-full rounded-xl border border-slate-200 p-2 text-xs font-bold focus:border-primary focus:outline-none h-9"
              >
                <option value="KOUN_MOM">Khu liên hợp Koun Mom</option>
                <option value="SNOUL">Khu liên hợp Snoul</option>
                <option value="NAM_LAO">Khu liên hợp Nam Lào</option>
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Xí nghiệp quản lý:</label>
              <input
                name="enterpriseName"
                required
                defaultValue={editingPlot?.enterpriseName || 'Xí nghiệp Trồng trọt Chuối Koun Mom'}
                placeholder="VD: Xí nghiệp Trồng trọt Chuối Koun Mom"
                className="w-full rounded-xl border border-slate-200 p-2 text-xs font-medium focus:border-primary focus:outline-none h-9"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Nông trường phụ trách:</label>
              <input
                name="farmName"
                required
                defaultValue={editingPlot?.farmName || 'Nông trường Chuối 1'}
                placeholder="VD: Nông trường Chuối 1"
                className="w-full rounded-xl border border-slate-200 p-2 text-xs font-medium focus:border-primary focus:outline-none h-9"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Diện tích canh tác (ha):</label>
              <input
                name="areaHa"
                type="number"
                step="0.1"
                required
                defaultValue={editingPlot?.areaHa || 50}
                placeholder="VD: 52.5"
                className="w-full rounded-xl border border-slate-200 p-2 font-bold text-xs focus:border-primary focus:outline-none h-9"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Cây trồng / Giống cây:</label>
              <input
                name="cropType"
                required
                defaultValue={editingPlot?.cropType || 'Chuối Nam Mỹ Foc TR4'}
                placeholder="VD: Chuối Nam Mỹ, Cỏ Mulato II..."
                className="w-full rounded-xl border border-slate-200 p-2 text-xs focus:border-primary focus:outline-none h-9"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Trạng thái canh tác:</label>
              <select
                name="status"
                defaultValue={editingPlot?.status || 'active'}
                className="w-full rounded-xl border border-slate-200 p-2 text-xs font-bold focus:border-primary focus:outline-none h-9"
              >
                <option value="active">Đang canh tác</option>
                <option value="preparing">Đang làm đất</option>
                <option value="replanting">Tái canh</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Hệ thống tưới tiêu:</label>
              <input
                name="irrigationSystem"
                defaultValue={editingPlot?.irrigationSystem || 'Tưới nhỏ giọt bù áp tự động Netafim'}
                placeholder="VD: Tưới nhỏ giọt bù áp, tưới phun mưa..."
                className="w-full rounded-xl border border-slate-200 p-2 text-xs focus:border-primary focus:outline-none h-9"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Địa hình / Loại đất:</label>
              <input
                name="soilCondition"
                defaultValue={editingPlot?.soilCondition || 'Đất đỏ bazan giàu hữu cơ'}
                placeholder="VD: Đất đỏ bazan, dốc 3-5 độ..."
                className="w-full rounded-xl border border-slate-200 p-2 text-xs focus:border-primary focus:outline-none h-9"
              />
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Ghi chú canh tác:</label>
            <textarea
              name="notes"
              rows={2}
              defaultValue={editingPlot?.notes || ''}
              placeholder="Ghi chú về thổ nhưỡng, lịch sử luân canh..."
              className="w-full rounded-xl border border-slate-200 p-2 text-xs focus:border-primary focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setShowPlotModal(false);
                setEditingPlot(null);
              }}
            >
              Hủy
            </Button>
            <Button type="submit" variant="primary" size="sm">
              {editingPlot ? 'Lưu Lô / Thửa' : 'Thêm Lô mới'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ===================================================================== */}
      {/* 9. MODAL THÊM / SỬA ĐỘI XE CƠ GIỚI NÔNG NGHIỆP                         */}
      {/* ===================================================================== */}
      <Modal
        isOpen={showAgriTeamModal}
        hideFooter={true}
        onClose={() => {
          setShowAgriTeamModal(false);
          setEditingAgriTeam(null);
        }}
        title={editingAgriTeam ? `Chỉnh sửa Đội: ${editingAgriTeam.name}` : 'Thêm Đội Xe Cơ Giới Nông Nghiệp mới'}
        subtitle="Đội xe máy cơ giới nông nghiệp trực thuộc Xí nghiệp và Nông trường theo từng Khu liên hợp"
        size="lg"
      >
        <form className="space-y-3 text-xs" onSubmit={handleSaveAgriTeam}>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Mã đội:</label>
              <input
                name="code"
                required
                defaultValue={editingAgriTeam?.code || getNextAgriTeamCode(selectedKLH !== 'ALL' ? selectedKLH : 'KOUN_MOM', agriTeams)}
                placeholder="VD: DCG-KM-04"
                className="w-full rounded-xl border border-slate-200 p-2 font-mono font-bold text-xs uppercase focus:border-primary focus:outline-none h-9"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="font-bold text-slate-700 block mb-1">Tên Đội xe cơ giới:</label>
              <input
                name="name"
                required
                defaultValue={editingAgriTeam?.name || ''}
                placeholder="VD: Đội Cơ giới Chuối NT1"
                className="w-full rounded-xl border border-slate-200 p-2 font-bold text-xs focus:border-primary focus:outline-none h-9"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Thuộc Khu liên hợp:</label>
              <select
                name="complexCode"
                defaultValue={editingAgriTeam?.complexCode || (selectedKLH !== 'ALL' ? selectedKLH : 'KOUN_MOM')}
                className="w-full rounded-xl border border-slate-200 p-2 text-xs font-bold focus:border-primary focus:outline-none h-9"
              >
                <option value="KOUN_MOM">Khu liên hợp Koun Mom</option>
                <option value="SNOUL">Khu liên hợp Snoul</option>
                <option value="NAM_LAO">Khu liên hợp Nam Lào</option>
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Xí nghiệp trực thuộc:</label>
              <input
                name="enterpriseName"
                required
                defaultValue={editingAgriTeam?.enterpriseName || 'Xí nghiệp Trồng trọt Chuối Koun Mom'}
                placeholder="VD: Xí nghiệp Trồng trọt Chuối Koun Mom"
                className="w-full rounded-xl border border-slate-200 p-2 text-xs font-medium focus:border-primary focus:outline-none h-9"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Nông trường phụ trách:</label>
              <input
                name="farmName"
                required
                defaultValue={editingAgriTeam?.farmName || 'Nông trường Chuối 1'}
                placeholder="VD: Nông trường Chuối 1"
                className="w-full rounded-xl border border-slate-200 p-2 text-xs font-medium focus:border-primary focus:outline-none h-9"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Đội trưởng phụ trách:</label>
              <input
                name="leaderName"
                required
                defaultValue={editingAgriTeam?.leaderName || ''}
                placeholder="VD: Nguyễn Văn Tuấn"
                className="w-full rounded-xl border border-slate-200 p-2 font-bold text-xs focus:border-primary focus:outline-none h-9"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Số điện thoại liên hệ:</label>
              <input
                name="leaderPhone"
                defaultValue={editingAgriTeam?.leaderPhone || ''}
                placeholder="VD: 0912.345.678"
                className="w-full rounded-xl border border-slate-200 p-2 text-xs focus:border-primary focus:outline-none h-9"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Trạng thái hoạt động:</label>
              <select
                name="status"
                defaultValue={editingAgriTeam?.status || 'active'}
                className="w-full rounded-xl border border-slate-200 p-2 text-xs font-bold focus:border-primary focus:outline-none h-9"
              >
                <option value="active">Sẵn sàng / Đang vận hành</option>
                <option value="busy">Đang làm ca ngoài đồng</option>
                <option value="maintenance">Bảo dưỡng thiết bị</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Quy mô máy móc cơ giới:</label>
              <input
                name="machineCount"
                required
                defaultValue={editingAgriTeam?.machineCount || ''}
                placeholder="VD: 16 đầu máy (10 máy kéo John Deere 5075E, 4 máy cày bừa...)"
                className="w-full rounded-xl border border-slate-200 p-2 text-xs focus:border-primary focus:outline-none h-9"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Lực lượng nhân sự:</label>
              <input
                name="personnelCount"
                defaultValue={editingAgriTeam?.personnelCount || ''}
                placeholder="VD: 20 thợ máy & lái máy cày"
                className="w-full rounded-xl border border-slate-200 p-2 text-xs focus:border-primary focus:outline-none h-9"
              />
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Lô / Thửa canh tác đang phụ trách:</label>
            <input
              name="assignedPlots"
              defaultValue={editingAgriTeam?.assignedPlots || ''}
              placeholder="VD: Lô A01 ➔ A06 Nông trường 1 (280 ha chuối)..."
              className="w-full rounded-xl border border-slate-200 p-2 text-xs focus:border-primary focus:outline-none h-9"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Ghi chú chuyên trách:</label>
            <textarea
              name="notes"
              rows={2}
              defaultValue={editingAgriTeam?.notes || ''}
              placeholder="Chuyên trách làm đất, phay đất, bón lót và phun thuốc bảo vệ thực vật..."
              className="w-full rounded-xl border border-slate-200 p-2 text-xs focus:border-primary focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setShowAgriTeamModal(false);
                setEditingAgriTeam(null);
              }}
            >
              Hủy
            </Button>
            <Button type="submit" variant="primary" size="sm">
              {editingAgriTeam ? 'Lưu đội cơ giới' : 'Thêm đội mới'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ===================================================================== */}
      {/* 10. MODAL CHI TIẾT CÔNG VIỆC                                          */}
      {/* ===================================================================== */}
      {selectedJobDetail && (
        <Modal
          isOpen={!!selectedJobDetail}
          onClose={() => setSelectedJobDetail(null)}
          title={`Chi tiết: ${selectedJobDetail.name}`}
          subtitle={`Mã chuẩn: ${selectedJobDetail.code} | ${selectedJobDetail.stageName}`}
          size="lg"
        >
          <div className="space-y-4 text-xs text-slate-700">
            <div className="rounded-2xl bg-slate-50 p-4 border border-slate-200 space-y-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-slate-400 text-[11px] font-medium">Tên quy trình cơ giới</span>
                  {selectedJobDetail.planType === 'NONG_NGHIEP' && (
                    <span className="inline-flex items-center rounded-md bg-emerald-100 text-emerald-800 text-[10.5px] font-bold px-2 py-0.5 border border-emerald-300">
                      Kế hoạch Nông nghiệp
                    </span>
                  )}
                  {selectedJobDetail.planType === 'CONG_TRINH' && (
                    <span className="inline-flex items-center rounded-md bg-amber-100 text-amber-900 text-[10.5px] font-bold px-2 py-0.5 border border-amber-300">
                      Kế hoạch Công trình & Ca máy
                    </span>
                  )}
                  {selectedJobDetail.planType === 'VAN_CHUYEN' && (
                    <span className="inline-flex items-center rounded-md bg-blue-100 text-blue-900 text-[10.5px] font-bold px-2 py-0.5 border border-blue-300">
                      Kế hoạch Vận chuyển nội bộ
                    </span>
                  )}
                </div>
                <h3 className="font-extrabold text-base text-slate-900">{selectedJobDetail.name}</h3>
                {selectedJobDetail.description && (
                  <p className="text-slate-600 text-xs mt-1 leading-relaxed">{selectedJobDetail.description}</p>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-200">
                <div>
                  <span className="text-[11px] text-slate-400 block">Giai đoạn vụ:</span>
                  <span className="font-bold text-slate-800">{selectedJobDetail.stageName}</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block">Đầu máy phù hợp:</span>
                  <span className="font-bold text-slate-800">{selectedJobDetail.recommendedVehicle}</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block">Nông cụ tương thích:</span>
                  <span className="font-bold text-amber-800">{selectedJobDetail.implementGroup}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-2xl border border-slate-200 p-4 bg-white space-y-2">
                <span className="text-slate-400 text-[11px] block">Năng suất định mức ca:</span>
                <div className="text-base font-extrabold text-slate-900">{selectedJobDetail.quotaPerShift}</div>
              </div>

              <div className="rounded-2xl border border-slate-200 p-4 bg-white space-y-2">
                <span className="text-slate-400 text-[11px] block">Định mức dầu khoán:</span>
                <div className="text-base font-extrabold text-emerald-700">
                  {selectedJobDetail.fuelQuota} {selectedJobDetail.fuelUnit}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button variant="outline" size="sm" onClick={() => setSelectedJobDetail(null)}>
                Đóng
              </Button>
              <Button
                variant="primary"
                size="sm"
                icon={<Edit2 className="h-3.5 w-3.5" />}
                onClick={() => {
                  const jobToEdit = selectedJobDetail;
                  setSelectedJobDetail(null);
                  handleOpenEditJob(jobToEdit);
                }}
              >
                Chỉnh sửa
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
