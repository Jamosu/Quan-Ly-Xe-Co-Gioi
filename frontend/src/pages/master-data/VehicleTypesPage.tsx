import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Boxes,
  Building2,
  CheckSquare,
  Combine,
  Download,
  Edit2,
  ExternalLink,
  Fuel,
  Globe,
  Layers,
  MapPin,
  Plus,
  RefreshCw,
  Search,
  Settings2,
  ShoppingCart,
  Square,
  Table,
  Tag,
  Trash2,
  Tractor,
  Truck,
  Users,
  Wand2,
} from 'lucide-react';
import { apiClient, apiService } from '../../api/client';
import { useAppStore } from '../../store/useAppStore';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { TableRowActions } from '../../components/common/TableRowActions';
import { AuditUserPopover } from '../../components/common/AuditUserPopover';
import { Column, DataTable } from '../../components/data-display/DataTable';
import { SearchableSelect } from '../../components/common/SearchableSelect';
import { VehicleTypeMaster } from '../../types';
import { schedulingApi } from '../../api/scheduling';
import { catalogsApi } from '../../api/catalogsApi';
import { mechanicalCatalogRedirect } from '../../utils/masterDataRedirect';

interface CGManagerItem {
  id: string; assignmentId?: number; legacyCatalogId?: string; managerUserId?: number; managementUnitId?: number;
  unitName: string; enterpriseName?: string; managementArea?: string; region?: string; managerName: string; phone: string;
  location: string; klhCode?: string; roleScope?: string; notes?: string; managerType?: 'PRIMARY' | 'DEPUTY';
  effectiveFrom?: string; effectiveTo?: string | null; status?: 'ACTIVE' | 'PLANNED' | 'ENDED' | 'PENDING_LINK';
  username?: string; assignedVehicleCount?: number; assignedDriverCount?: number; responsibilities?: string[];
  createdDate?: string; createdUser?: string; updatedDate?: string; updatedUser?: string;
}
interface MasterLocationItem {
  id: string; backendId?: number; code?: string; type?: 'DEPOT' | 'WORKSITE' | 'PICKUP' | 'DELIVERY' | 'OTHER';
  name: string; complexCode: string; complexName: string; regionName?: string; address?: string;
  status?: 'HOAT_DONG' | 'TAM_DUNG'; lat?: number; lng?: number; geofenceRadiusM?: number;
}
interface ManagementAreaItem {
  id: string; code: string; name: string; region: string; complexCode: string; complexName: string;
  headOfficer?: string; phone?: string; depotLocation?: string; assignedVehiclesCount?: number;
  status?: 'HOAT_DONG' | 'TAM_DUNG'; description?: string; createdDate?: string; createdUser?: string;
  updatedDate?: string; updatedUser?: string;
}

// Legacy tabs redirect to /danh-muc/quan-ly-co-gioi; no fallback master data remains here.
const INITIAL_CG_MANAGERS: CGManagerItem[] = [];
const INITIAL_MASTER_LOCATIONS: MasterLocationItem[] = [];
const INITIAL_MANAGEMENT_AREAS: ManagementAreaItem[] = [];
import { driverManagementApi } from '../../api/driverManagementApi';
import {
  IMPLEMENT_CATEGORIES_CATALOG,
  ImplementCategoryDefinition,
} from '../../data/implementCategoriesData';
import { normalizeMasterDataKey } from '../../utils/masterDataNormalization';

type CatalogTab =
  | 'types'
  | 'implements'
  | 'manufacturers'
  | 'models'
  | 'origins'
  | 'units'
  | 'managementAreas'
  | 'locations'
  | 'cgManagers'
  | 'purchaseConditions'
  | 'suppliers'
  | 'companyOwners';

export type { ImplementCategoryDefinition };

export type VehicleSubsystem = 'FLEET' | 'EQUIPMENT' | 'OTHER_ASSETS';

export const getVehicleTypeSubsystem = (item: VehicleTypeMaster | { code: string; category?: string; assetGroup?: string }): VehicleSubsystem => {
  const code = (item.code || '').toUpperCase();
  const cat = (item.category || '').toUpperCase();
  const group = (item.assetGroup || '').toUpperCase();

  // 1. Phân hệ 2: Thiết bị & Nông cụ phụ trợ (/doi-xe/thiet-bi)
  if (
    code === 'THIET_BI_NONG_CU' ||
    cat === 'THIET_BI_NONG_CU' ||
    code.startsWith('TB-') ||
    code.includes('DAN_CAY') ||
    code.includes('DAN_BUA') ||
    code.includes('DAN_XOI') ||
    code.includes('DAN_RAI_PHAN') ||
    code.includes('RO_MOOC') ||
    code.includes('DAN_PHUN_THUOC')
  ) {
    return 'EQUIPMENT';
  }

  // 2. Phân hệ 3: Máy phụ trợ & Tài sản khác (/doi-xe/tai-san-khac)
  if (
    code === 'MAY_PHAT_CO' ||
    code === 'XE_MAY_2_BANH' ||
    code === 'XE_NANG' ||
    code === 'MAY_PHAT_DIEN' ||
    code === 'MAY_CUA' ||
    code === 'MAY_BOM' ||
    cat === 'MAY_PHAT_CO' ||
    cat === 'XE_MAY_2_BANH' ||
    cat === 'XE_NANG' ||
    cat === 'MAY_PHAT_DIEN' ||
    cat === 'MAY_CUA' ||
    cat === 'MAY_BOM'
  ) {
    return 'OTHER_ASSETS';
  }

  // 3. Phân hệ 1: Xe cơ giới tự hành (Hồ sơ xe)
  return 'FLEET';
};

export const SUBSYSTEM_META: Record<VehicleSubsystem, {
  label: string;
  shortLabel: string;
  badge: string;
  route: string;
  targetPage: string;
  icon: any;
  description: string;
}> = {
  FLEET: {
    label: 'Xe cơ giới tự hành (Hồ sơ xe)',
    shortLabel: 'Hồ sơ xe',
    badge: 'bg-blue-50 text-blue-700 border-blue-200',
    route: '/doi-xe/ho-so-xe',
    targetPage: 'Hồ sơ xe',
    icon: Tractor,
    description: 'Máy công trình, máy nông nghiệp tự hành, xe tải, xe ben, xe bồn, xe container có động cơ & GPS',
  },
  EQUIPMENT: {
    label: 'Thiết bị & Nông cụ phụ trợ',
    shortLabel: 'Thiết bị phụ trợ',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    route: '/doi-xe/thiet-bi',
    targetPage: 'Thiết bị phụ trợ',
    icon: Combine,
    description: 'Dàn cày, dàn bừa, dàn xới, dàn rải phân, dàn phun thuốc, rơ-moóc thùng ben, gàu máy đào, búa đục',
  },
  OTHER_ASSETS: {
    label: 'Máy phụ trợ & Tài sản độc lập',
    shortLabel: 'Tài sản khác',
    badge: 'bg-purple-50 text-purple-700 border-purple-200',
    route: '/doi-xe/tai-san-khac',
    targetPage: 'Tài sản khác',
    icon: Boxes,
    description: 'Máy phát cỏ cầm tay, xe máy 2 bánh, xe nâng xưởng chuối, máy phát điện, máy cưa, máy bơm dã chiến',
  },
};

const GROUP_LABELS: Record<string, string> = {
  MAY_CONG_TRINH: 'Máy công trình',
  MAY_NONG_NGHIEP: 'Máy nông nghiệp',
  XE_VAN_TAI_CONG_VU: 'Xe vận tải & Công vụ',
  THIET_BI_PHU_TRO: 'Thiết bị phụ trợ',
};

const FUEL_UNIT_LABELS: Record<string, string> = {
  L_PER_HOUR: 'Lít/giờ máy (L/h)',
  L_PER_KM: 'Lít/100km',
  L_PER_HA: 'Lít/ha',
};

export interface TechnicalAttributeItem {
  fuelType: string;
  specs: string;
  operationMode: string;
  application: string;
}

export const TECHNICAL_ATTRIBUTES_MAP: Record<string, TechnicalAttributeItem> = {
  // 1. MÁY PHỤ TRỢ & TÀI SẢN KHÁC (THUỘC TÍNH CHI TIẾT)
  MAY_PHAT_CO: {
    fuelType: 'Xăng pha nhớt 2T (1:50)',
    specs: 'Động cơ 40 - 50cc • Công suất 1.5 - 2.2 HP • Cần cắt hợp kim nhôm • Lưỡi thép sắc bén',
    operationMode: 'Cầm tay đeo vai • Khoán định mức 0.8 - 1.2 L/h (6 - 8 Lít/ca) • Không lập lệnh điều xe',
    application: 'Công nhân cắt dọn cỏ gốc chuối, phát quang mép bờ lô, kênh mương nội đồng',
  },
  XE_MAY_2_BANH: {
    fuelType: 'Xăng RON 95',
    specs: 'Động cơ 110cc • 4 thì làm mát gió • Hộp số 4 cấp • Quản lý tem/biển số nội bộ',
    operationMode: 'Theo dõi ODO (km) & Sổ cấp xăng • Khoán định mức 2.0 Lít / 100km',
    application: 'Kỹ thuật viên nông học kiểm tra sâu bệnh, bảo vệ tuần tra ranh giới, kéo ròng rọc chuối',
  },
  MAY_PHAT_DIEN: {
    fuelType: 'Dầu Diesel (DO)',
    specs: 'Công suất 15 - 500 kVA • 3 Pha 380V/220V 50Hz • Vỏ cách âm chống ồn',
    operationMode: 'Theo dõi đồng hồ giờ nổ máy thực tế • Định mức 18.0 - 45.0 L/h • Cấp phát tại trạm',
    application: 'Nguồn điện dự phòng cho Trạm bơm tưới tự động, Xưởng đóng gói chuối, Kho lạnh khi mất lưới',
  },
  XE_NANG: {
    fuelType: 'Dầu Diesel (DO) / Điện',
    specs: 'Tải nâng 2.5 - 3.5 tấn • Chiều cao nâng 3.0 - 4.5m • Khung nâng 2-3 tầng • Nĩa nâng 1.2m',
    operationMode: 'Theo dõi đồng hồ giờ máy nổ • Định mức 3.5 - 4.8 L/h • Vận hành nội bộ xưởng',
    application: 'Bốc dỡ vật tư nông nghiệp, nâng pallet chuối đóng thùng đưa vào container lạnh xuất khẩu',
  },
  MAY_CUA: {
    fuelType: 'Xăng pha nhớt 2T (1:50)',
    specs: 'Động cơ 50 - 72cc • Chiều dài lam xích 20 - 25 inch (50 - 63cm) • Xích hợp kim chịu mài mòn',
    operationMode: 'Cầm tay di động • Khoán định mức 1.2 - 1.6 L/h • Bàn giao theo phiếu mượn tổ đội',
    application: 'Tỉa cành cây che bóng đồn điền chuối, cắt dọn chướng ngại vật gỗ, giải phóng luồng máy cày',
  },
  MAY_BOM: {
    fuelType: 'Dầu Diesel (DO)',
    specs: 'Động cơ Diesel D200/D300 • Đường kính họng xả 200 - 300mm • Lưu lượng 250 - 500 m³/h',
    operationMode: 'Theo dõi đồng hồ giờ chạy bơm • Định mức 4.5 - 8.0 L/h • Vận hành tại hồ/kênh',
    application: 'Bơm dã chiến chống úng ngập mùa lũ, bơm tiếp nước hồ chứa tưới nhỏ giọt mùa khô hạn',
  },
  THIET_BI_NONG_CU: {
    fuelType: 'Không tiêu hao trực tiếp (dùng lực kéo)',
    specs: 'Dàn cày 3-6 chảo, Dàn bừa đĩa 20-28 chảo, Dàn xới 2.0m, Dàn rải phân, Rơ-moóc ben 8-10T',
    operationMode: 'Đính kèm máy kéo qua 3 điểm Cat 2/3 hoặc trục PTO • Đo mòn cơ học (đường kính chảo đĩa mm)',
    application: 'Gắn máy kéo làm đất sâu, băm đất tơi xốp, bón lót phân vi sinh, vận chuyển nông sản nội đồng',
  },

  // 2. XE CƠ GIỚI TỰ HÀNH (THUỘC TÍNH VẬN HÀNH)
  MAY_DAO: {
    fuelType: 'Dầu Diesel (DO)',
    specs: 'Gàu 0.2 - 1.2 m³ • Bánh xích sắt / bánh lốp • Cần vươn 5 - 9m',
    operationMode: 'GPS Live Tracking • Giờ máy (Hour meter) • Lệnh điều xe',
    application: 'Đào đắp mương thủy lợi, san bờ bao, đào hố trồng chuối',
  },
  MAY_UI: {
    fuelType: 'Dầu Diesel (DO)',
    specs: 'Lưỡi ủi rộng 3.2 - 3.8m • Bánh xích bản rộng đầm lầy',
    operationMode: 'GPS Live Tracking • Giờ máy • Lệnh điều xe',
    application: 'San ủi mặt bằng thi công, khai hoang mở rộng diện tích trồng chuối',
  },
  MAY_LU: {
    fuelType: 'Dầu Diesel (DO)',
    specs: 'Tải trọng 10 - 14 tấn • Lực rung 260 - 320 kN • Lu rung / lu tĩnh',
    operationMode: 'GPS Live Tracking • Giờ máy • Lệnh điều xe',
    application: 'Đầm nén nền đường nội bộ, gia cố bờ bao và đê ngăn lũ',
  },
  MAY_SAN: {
    fuelType: 'Dầu Diesel (DO)',
    specs: 'Lưỡi san 3.7m • 6 bánh lốp • Động cơ 140 - 180 HP',
    operationMode: 'GPS Live Tracking • Giờ máy • Lệnh điều xe',
    application: 'Gạt phẳng mặt đường giao thông nông trường, tạo mái dốc thoát nước',
  },
  MAY_XUC_LAT: {
    fuelType: 'Dầu Diesel (DO)',
    specs: 'Gàu xúc 1.8 - 3.0 m³ • Tải nâng 3.0 - 5.0 tấn • 4WD bánh lốp',
    operationMode: 'GPS Live Tracking • Giờ máy • Lệnh điều xe',
    application: 'Xúc cát đá, phân bón hữu cơ, bốc dỡ vật liệu lên xe ben',
  },
  MAY_CAY: {
    fuelType: 'Dầu Diesel (DO)',
    specs: 'Công suất 70 - 110 HP • 4WD • Treo 3 điểm Cat 2 • Trục PTO 540/1000 rpm',
    operationMode: 'Giờ máy & GPS • Định mức L/ha • Lệnh điều xe nông nghiệp',
    application: 'Kéo dàn cày 3-4 chảo, dàn bừa đĩa, dàn xới đất, dàn rải phân vi sinh',
  },
  MAY_KEO: {
    fuelType: 'Dầu Diesel (DO)',
    specs: 'Công suất 130 - 140 HP • 4WD • Trục PTO chịu lực cao • Ben thủy lực',
    operationMode: 'Giờ máy & GPS • Định mức L/ha • Lệnh điều xe nông nghiệp',
    application: 'Kéo cày ngầm phá tầng đất cứng, kéo rơ-moóc ben 8-10 tấn',
  },
  XE_BEN: {
    fuelType: 'Dầu Diesel (DO)',
    specs: 'Tải trọng 15 tấn • Thùng ben 10 - 12 m³ • 3 chân (6x4)',
    operationMode: 'GPS & Cảm biến dầu • Odometer (km) • Lệnh điều xe logistics',
    application: 'Chở đất tôn nền, vận chuyển phân hữu cơ bón lót nông trường',
  },
  XE_TAI: {
    fuelType: 'Dầu Diesel (DO)',
    specs: 'Tải trọng 8 - 18 tấn • Thùng mui bạt 9.6m • 4 chân (8x4)',
    operationMode: 'GPS & Cảm biến hành trình • Odometer (km) • Lệnh điều xe',
    application: 'Vận chuyển buồng chuối thu hoạch về xưởng đóng gói, chở vật tư phân bón',
  },
  XE_CONTAINER: {
    fuelType: 'Dầu Diesel (DO)',
    specs: 'Đầu kéo 420 HP • Sơ-mi rơ-moóc 40 feet • Tải trọng 30 tấn',
    operationMode: 'GPS hành trình • Odometer (km) • Lệnh vận chuyển xuất khẩu',
    application: 'Kéo container lạnh chuối thành phẩm xuất khẩu sang cảng biển/cửa khẩu',
  },
  XE_CONG_VU: {
    fuelType: 'Xăng / Dầu Diesel',
    specs: '7 - 29 chỗ • Điều hòa công suất lớn • Gầm cao vượt địa hình',
    operationMode: 'Odometer (km) • Nhật trình xe • Cấp lệnh công vụ',
    application: 'Đưa đón Ban giám đốc, chuyên gia, kỹ sư và cán bộ công nhân viên',
  },
  XE_BON: {
    fuelType: 'Dầu Diesel (DO)',
    specs: 'Xi-téc 15 m³ • Bơm xả cánh quạt thủy lực • Vòi phun dập bụi',
    operationMode: 'Odometer & Giờ bơm • GPS • Lệnh điều xe',
    application: 'Cấp dầu DO lưu động cho máy công trình tại lô, tưới nước dập bụi mặt đường',
  },
  XE_BAN_TAI: {
    fuelType: 'Dầu Diesel (DO)',
    specs: '5 chỗ • Tải trọng thùng 800 kg • 4x4 gài cầu điện tử',
    operationMode: 'Odometer (km) • Nhật trình công vụ',
    application: 'Tuần tra an ninh nông trường, cơ động xử lý sự cố kỹ thuật',
  },
  XE_CHO_NGUOI: {
    fuelType: 'Dầu Diesel (DO)',
    specs: 'Xe buýt nông trường 29 chỗ • Khung gầm chịu lực',
    operationMode: 'Odometer (km) • Chạy tuyến cố định',
    application: 'Trung chuyển công nhân thu hoạch giữa khu cư xá và các lô chuối',
  },
  XE_CHUYEN_DUNG: {
    fuelType: 'Dầu Diesel / Xăng',
    specs: 'Thiết bị chuyên biệt (Xe phun thuốc tự hành, xe Clethon điện/xăng, xe cẩu)',
    operationMode: 'Giờ máy • Lệnh công tác chuyên dụng',
    application: 'Phun thuốc bảo vệ thực vật, đẩy cáp chuối thu hoạch',
  },
};

const EMPTY_TYPE_FORM = {
  code: '',
  name: '',
  assetGroup: 'MAY_CONG_TRINH',
  category: '',
  defaultMaintenanceHours: '250',
  defaultFuelQuotaRate: '',
  defaultFuelQuotaUnit: 'L_PER_HOUR',
  description: '',
};

const EMPTY_MANUFACTURER_FORM = {
  name: '',
  countryName: 'VIỆT NAM',
  countryCode: 'VN',
};

const EMPTY_MODEL_FORM = {
  name: '',
  manufacturerId: 0,
  categoryHint: '',
};

const EMPTY_SIMPLE_FORM = {
  name: '',
  description: '',
};

const POPULAR_COUNTRIES = [
  { name: 'VIỆT NAM', code: 'VN' },
  { name: 'NHẬT BẢN', code: 'JP' },
  { name: 'HÀN QUỐC', code: 'KR' },
  { name: 'TRUNG QUỐC', code: 'CN' },
  { name: 'MỸ', code: 'US' },
  { name: 'ĐỨC', code: 'DE' },
  { name: 'THÁI LAN', code: 'TH' },
  { name: 'ẤN ĐỘ', code: 'IN' },
  { name: 'CAMPUCHIA', code: 'KH' },
  { name: 'BELARUS', code: 'BY' },
  { name: 'NGA', code: 'RU' },
  { name: 'ITALIA', code: 'IT' },
  { name: 'BRAZIL', code: 'BR' },
  { name: 'ĐÀI LOAN', code: 'TW' },
  { name: 'ANH', code: 'GB' },
  { name: 'PHÁP', code: 'FR' },
  { name: 'TÂY BAN NHA', code: 'ES' },
  { name: 'THỤY ĐIỂN', code: 'SE' },
  { name: 'CANADA', code: 'CA' },
  { name: 'BA LAN', code: 'PL' },
  { name: 'INDONESIA', code: 'ID' },
  { name: 'MALAYSIA', code: 'MY' },
];

const inputClassName =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15';

const renderMasterDataStatusBadge = (status?: string | boolean) => {
  const isInactive = status === 'inactive' || status === 'TAM_DUNG' || status === 'NGUNG_HOAT_DONG' || status === false;
  return (
    <span
      className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
        isInactive ? 'bg-slate-100 text-slate-600' : 'bg-emerald-100 text-emerald-800'
      }`}
    >
      {isInactive ? 'Ngưng hoạt động' : 'Còn hoạt động'}
    </span>
  );
};

export const VehicleTypesPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = (searchParams.get('tab') as CatalogTab) || 'types';
  const [activeTab, setActiveTab] = useState<CatalogTab>(initialTab);

  useEffect(() => {
    const target = mechanicalCatalogRedirect(initialTab);
    if (target) navigate(target, { replace: true });
  }, [initialTab, navigate]);

  // 1. Vehicle Types Data
  const [types, setTypes] = useState<VehicleTypeMaster[]>([]);
  const [typesLoading, setTypesLoading] = useState(true);
  const [showAddTypeModal, setShowAddTypeModal] = useState(false);
  const [editingType, setEditingType] = useState<VehicleTypeMaster | null>(null);
  const [typeForm, setTypeForm] = useState(EMPTY_TYPE_FORM);
  const [maintenanceType, setMaintenanceType] = useState<VehicleTypeMaster | null>(null);
  const [maintenanceStandards, setMaintenanceStandards] = useState<any[]>([]);
  const [maintenanceMetric, setMaintenanceMetric] = useState<'ENGINE_HOUR' | 'ODOMETER_KM'>('ENGINE_HOUR');
  const [maintenanceMilestones, setMaintenanceMilestones] = useState('50, 250, 500, 750, 1000, 1250, 1500, 1750, 2000');
  const [maintenanceName, setMaintenanceName] = useState('Định mức BDC2 giờ máy');
  const [maintenanceSaving, setMaintenanceSaving] = useState(false);

  // 1.5 Implements Categories Data
  const [implementCategories, setImplementCategories] = useState<ImplementCategoryDefinition[]>(IMPLEMENT_CATEGORIES_CATALOG);
  const [implementsLoading, setImplementsLoading] = useState(false);
  const [editingImplement, setEditingImplement] = useState<ImplementCategoryDefinition | null>(null);
  const [showImplementModal, setShowImplementModal] = useState(false);
  const [implementForm, setImplementForm] = useState({
    code: '',
    name: '',
    functionalGroup: '',
    compatibleVehicles: '',
    defaultMaintenanceHours: '250',
    description: '',
  });

  // 2. Manufacturers Data
  const [manufacturers, setManufacturers] = useState<Array<{
    id: number;
    name: string;
    countryName?: string;
    countryCode?: string;
    active: boolean;
    vehicleCount: number;
    modelCount: number;
  }>>([]);
  const [mfLoading, setMfLoading] = useState(false);
  const [showAddMfModal, setShowAddMfModal] = useState(false);
  const [editingMf, setEditingMf] = useState<{ id: number; name: string; countryName?: string; countryCode?: string } | null>(null);
  const [mfForm, setMfForm] = useState(EMPTY_MANUFACTURER_FORM);

  // 3. Models Data
  const [models, setModels] = useState<Array<{
    id: number;
    name: string;
    manufacturerId: number;
    manufacturerName?: string;
    countryName?: string;
    categoryHint?: string;
    active: boolean;
    vehicleCount: number;
  }>>([]);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [selectedMfFilter, setSelectedMfFilter] = useState<string>('ALL');
  const [showAddModelModal, setShowAddModelModal] = useState(false);
  const [editingModel, setEditingModel] = useState<{ id: number; name: string; manufacturerId: number; categoryHint?: string } | null>(null);
  const [modelForm, setModelForm] = useState(EMPTY_MODEL_FORM);

  // 4. Units Data
  const [units, setUnits] = useState<string[]>([]);

  const globalKLH = useAppStore((state) => state.selectedKLH);
  const [selectedLocationKlh, setSelectedLocationKlh] = useState<string>('ALL');

  const [masterLocations, setMasterLocations] = useState<MasterLocationItem[]>(INITIAL_MASTER_LOCATIONS);

  // 5. Locations Data
  const [locations, setLocations] = useState<string[]>(() => masterLocations.map((l) => l.name));

  useEffect(() => {
    let active = true;
    schedulingApi.locations({ active: true }).then((items) => {
      if (!active || !items.length) return;
      const mapped: MasterLocationItem[] = items.map((item) => ({
        id: String(item.id), backendId: item.id, code: item.code, name: item.name, type: item.type,
        complexCode: item.complexCode || 'KOUN_MOM',
        complexName: item.complexCode === 'SNOUL' ? 'Khu liên hợp Snoul' : item.complexCode === 'NAM_LAO' ? 'Khu liên hợp Nam Lào' : 'Khu liên hợp Koun Mom',
        regionName: item.regionName, address: item.address, status: item.active ? 'HOAT_DONG' : 'TAM_DUNG', lat: item.lat, lng: item.lng, geofenceRadiusM: item.geofenceRadiusM,
      }));
      setMasterLocations(mapped);
      setLocations(mapped.map((item) => item.name));
    }).catch(() => undefined);
    return () => { active = false; };
  }, []);

  const [showLocationModal, setShowLocationModal] = useState(false);
  const [editingLocation, setEditingLocation] = useState<MasterLocationItem | null>(null);
  const [locationForm, setLocationForm] = useState<{
    name: string;
    complexCode: string;
    complexName: string;
    regionName: string;
    address: string;
    lat: string;
    lng: string;
    geofenceRadiusM: string;
  }>({
    name: '',
    complexCode: 'KOUN_MOM',
    complexName: 'Khu liên hợp Koun Mom',
    regionName: '',
    address: '',
    lat: '',
    lng: '',
    geofenceRadiusM: '300',
  });

  const openAddLocationModal = () => {
    setEditingLocation(null);
    const defaultCode = globalKLH && globalKLH !== 'ALL' ? globalKLH : 'KOUN_MOM';
    const defaultName =
      defaultCode === 'SNOUL'
        ? 'Khu liên hợp Snoul'
        : defaultCode === 'NAM_LAO'
        ? 'Khu liên hợp Nam Lào'
        : 'Khu liên hợp Koun Mom';
    setLocationForm({
      name: '',
      complexCode: defaultCode,
      complexName: defaultName,
      regionName: '',
      address: '',
      lat: '',
      lng: '',
      geofenceRadiusM: '300',
    });
    setShowLocationModal(true);
  };

  const openEditLocationModal = (item: MasterLocationItem) => {
    setEditingLocation(item);
    setLocationForm({
      name: item.name,
      complexCode: item.complexCode,
      complexName: item.complexName,
      regionName: item.regionName || '',
      address: item.address || '',
      lat: item.lat?.toString() || '',
      lng: item.lng?.toString() || '',
      geofenceRadiusM: String(item.geofenceRadiusM || 300),
    });
    setShowLocationModal(true);
  };

  const handleSaveLocation = async () => {
    if (!locationForm.name.trim()) {
      setFormError('Vui lòng nhập tên Bãi / Nơi tập kết');
      return;
    }
    const val = locationForm.name.trim();
    setFormError('');
    try {
      if (editingLocation) {
        const saved = editingLocation.backendId ? await schedulingApi.updateLocation(editingLocation.backendId, { name: val, complexCode: locationForm.complexCode, regionName: locationForm.regionName, address: locationForm.address, lat: locationForm.lat ? Number(locationForm.lat) : undefined, lng: locationForm.lng ? Number(locationForm.lng) : undefined, geofenceRadiusM: Number(locationForm.geofenceRadiusM) || 300 }) : undefined;
        setMasterLocations((prev) => prev.map((item) => item.id === editingLocation.id || item.name === editingLocation.name ? { ...item, name: val, complexCode: locationForm.complexCode, complexName: locationForm.complexName, regionName: locationForm.regionName, address: locationForm.address, lat: locationForm.lat ? Number(locationForm.lat) : undefined, lng: locationForm.lng ? Number(locationForm.lng) : undefined, geofenceRadiusM: Number(locationForm.geofenceRadiusM) || 300, backendId: saved?.id ?? item.backendId, code: saved?.code ?? item.code } : item));
        setLocations((prev) => prev.map((l) => (l === editingLocation.name ? val : l)));
      } else {
        const generatedCode = `LOC-${locationForm.complexCode}-${Date.now()}`;
        const saved = await schedulingApi.createLocation({ code: generatedCode, name: val, type: 'DEPOT', complexCode: locationForm.complexCode, regionName: locationForm.regionName, address: locationForm.address, lat: locationForm.lat ? Number(locationForm.lat) : undefined, lng: locationForm.lng ? Number(locationForm.lng) : undefined, geofenceRadiusM: Number(locationForm.geofenceRadiusM) || 300 });
        const newItem: MasterLocationItem = {
          id: String(saved.id), backendId: saved.id, code: saved.code, type: saved.type,
          name: val, complexCode: locationForm.complexCode, complexName: locationForm.complexName,
          regionName: locationForm.regionName, address: locationForm.address,
          lat: locationForm.lat ? Number(locationForm.lat) : undefined,
          lng: locationForm.lng ? Number(locationForm.lng) : undefined,
          geofenceRadiusM: Number(locationForm.geofenceRadiusM) || 300,
        };
        setMasterLocations((prev) => [newItem, ...prev]);
        setLocations((prev) => (prev.includes(val) ? prev : [val, ...prev]));
      }
      setShowLocationModal(false);
      setEditingLocation(null);
    } catch {
      setFormError('Không thể lưu bãi tập kết. Vui lòng kiểm tra mã, tên và thử lại.');
    }
  };

  const handleDeleteLocation = async (name: string) => {
    if (window.confirm(`Xác nhận xóa bãi tập kết "${name}" khỏi danh mục?`)) {
      const target = masterLocations.find((item) => item.name === name);
      try {
        if (target?.backendId) await schedulingApi.deactivateLocation(target.backendId);
        setMasterLocations((prev) => prev.filter((l) => l.name !== name));
        setLocations((prev) => prev.filter((l) => l !== name));
      } catch {
        setFormError('Không thể ngưng sử dụng bãi tập kết. Vui lòng thử lại.');
      }
    }
  };

  // 6. Purchase Conditions Data
  const [origins, setOrigins] = useState<string[]>([]);
  const [purchaseConditions, setPurchaseConditions] = useState<string[]>([
    'Mua mới 100%',
    'Đã qua sử dụng (ĐQSD)',
    'Điều chuyển nội bộ',
    'Thuê ngoài',
  ]);

  // 7. Suppliers & Owners Data
  const [suppliers, setSuppliers] = useState<string[]>([
    'THACO AGRI',
    'THACO INDUSTRIES',
    'CATERPILLAR VN',
    'KOBELCO VN',
    'KOMATSU VN',
    'TÂN PHÁT',
    'LOVOL',
    'PHƯỚC LỘC',
    'CƯỜNG CƠ GIỚI',
  ]);

  const [companyOwners, setCompanyOwners] = useState<string[]>([
    'THACO AGRI',
    'CÔNG TY CP NÔNG NGHIỆP DP',
    'CÔNG TY TNHH BÒ AD',
    'CÔNG TY CP NÔNG NGHIỆP LP',
    'DP',
    'ADM',
    'LP',
  ]);

  // 7.5. Management Areas Data (Khu vực quản lý riêng biệt với Xí nghiệp)
  const [managementAreas, setManagementAreas] = useState<ManagementAreaItem[]>(() => {
    const saved = localStorage.getItem('vehicle_management_areas');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch {}
    }
    return INITIAL_MANAGEMENT_AREAS;
  });
  const [selectedAreaRegion, setSelectedAreaRegion] = useState<string>('ALL');
  const [showAreaModal, setShowAreaModal] = useState(false);
  const [editingArea, setEditingArea] = useState<ManagementAreaItem | null>(null);
  const [areaForm, setAreaForm] = useState({
    code: '',
    name: '',
    region: 'Khu vực Daun Penh (DP)',
    complexCode: 'KOUN_MOM',
    complexName: 'Khu liên hợp Koun Mom',
    headOfficer: '',
    phone: '',
    depotLocation: '',
    assignedVehiclesCount: 0,
    description: '',
  });

  const openAddAreaModal = () => {
    setEditingArea(null);
    setAreaForm({
      code: `MA-${Date.now().toString().slice(-4)}`,
      name: '',
      region: 'Khu vực Daun Penh (DP)',
      complexCode: globalKLH && globalKLH !== 'ALL' ? globalKLH : 'KOUN_MOM',
      complexName: globalKLH === 'SNOUL' ? 'Khu liên hợp Snoul' : globalKLH === 'NAM_LAO' ? 'Khu liên hợp Nam Lào' : 'Khu liên hợp Koun Mom',
      headOfficer: '',
      phone: '',
      depotLocation: '',
      assignedVehiclesCount: 0,
      description: '',
    });
    setShowAreaModal(true);
  };

  const openEditAreaModal = (item: ManagementAreaItem) => {
    setEditingArea(item);
    setAreaForm({
      code: item.code,
      name: item.name,
      region: item.region,
      complexCode: item.complexCode,
      complexName: item.complexName,
      headOfficer: item.headOfficer || '',
      phone: item.phone || '',
      depotLocation: item.depotLocation || '',
      assignedVehiclesCount: item.assignedVehiclesCount || 0,
      description: item.description || '',
    });
    setShowAreaModal(true);
  };

  const handleSaveArea = () => {
    if (!areaForm.name.trim()) {
      setFormError('Vui lòng nhập tên khu vực quản lý.');
      return;
    }
    if (editingArea) {
      const updated = managementAreas.map((a) =>
        a.id === editingArea.id
          ? {
              ...a,
              code: areaForm.code,
              name: areaForm.name,
              region: areaForm.region,
              complexCode: areaForm.complexCode,
              complexName: areaForm.complexName,
              headOfficer: areaForm.headOfficer,
              phone: areaForm.phone,
              depotLocation: areaForm.depotLocation,
              assignedVehiclesCount: Number(areaForm.assignedVehiclesCount) || 0,
              description: areaForm.description,
            }
          : a
      );
      setManagementAreas(updated);
      localStorage.setItem('vehicle_management_areas', JSON.stringify(updated));
    } else {
      const newArea: ManagementAreaItem = {
        id: `MA-${Date.now()}`,
        code: areaForm.code || `MA-${Date.now().toString().slice(-4)}`,
        name: areaForm.name,
        region: areaForm.region,
        complexCode: areaForm.complexCode,
        complexName: areaForm.complexName,
        headOfficer: areaForm.headOfficer,
        phone: areaForm.phone,
        depotLocation: areaForm.depotLocation,
        assignedVehiclesCount: Number(areaForm.assignedVehiclesCount) || 0,
        status: 'HOAT_DONG',
        description: areaForm.description,
      };
      const updated = [newArea, ...managementAreas];
      setManagementAreas(updated);
      localStorage.setItem('vehicle_management_areas', JSON.stringify(updated));
    }
    setShowAreaModal(false);
    setEditingArea(null);
  };

  const handleDeleteArea = (id: string, name: string) => {
    if (window.confirm(`Xác nhận xóa khu vực quản lý "${name}"?`)) {
      const updated = managementAreas.filter((a) => a.id !== id);
      setManagementAreas(updated);
      localStorage.setItem('vehicle_management_areas', JSON.stringify(updated));
    }
  };

  // 8. CG Managers Data (Nhân sự quản lý cơ giới từ sheet NS QUẢN LÝ CG)
  const [cgManagers, setCgManagers] = useState<CGManagerItem[]>(INITIAL_CG_MANAGERS);
  const [cgManagersLoading, setCgManagersLoading] = useState(false);
  const [cgManagementUnits, setCgManagementUnits] = useState<Array<{ id: number; code: string; name: string }>>([]);
  const [farmManagerUsers, setFarmManagerUsers] = useState<Array<{ id: number; code: string; fullName: string }>>([]);

  const loadCgManagers = async () => {
    setCgManagersLoading(true);
    try {
      const [assignments, unresolved] = await Promise.all([
        driverManagementApi.getManagers({ includeHistory: true }),
        driverManagementApi.getUnresolvedManagers(),
      ]);
      const now = Date.now();
      const mappedAssignments = assignments.map((item) => {
        const legacy = INITIAL_CG_MANAGERS.find((m) => m.id === item.legacyCatalogId || m.managerName === item.manager?.fullName);
        return {
          id: item.manager?.code || `USR-${item.managerUserId}`,
          assignmentId: item.id,
          legacyCatalogId: item.legacyCatalogId || undefined,
          managerUserId: item.managerUserId,
          managementUnitId: item.managementUnitId,
          unitName: item.managementUnit?.name || legacy?.unitName || `Xí nghiệp #${item.managementUnitId}`,
          enterpriseName: legacy?.enterpriseName || item.managementUnit?.name || `Xí nghiệp #${item.managementUnitId}`,
          managementArea: legacy?.managementArea || 'Khu vực Daun Penh (DP)',
          managerName: item.manager?.fullName || legacy?.managerName || 'Chưa xác định',
          phone: item.manager?.phone || legacy?.phone || '',
          location: item.legacyCatalog?.address || legacy?.location || '',
          klhCode: item.managementUnit?.complexCode || 'KOUN_MOM',
          managerType: item.managerType,
          effectiveFrom: item.effectiveFrom,
          effectiveTo: item.effectiveTo,
          status: new Date(item.effectiveFrom).getTime() > now ? 'PLANNED' : item.effectiveTo && new Date(item.effectiveTo).getTime() <= now ? 'ENDED' : 'ACTIVE',
          username: item.manager?.username,
          roleScope: 'Quản lý toàn bộ xe, tài xế & Lập lệnh điều xe',
        } as CGManagerItem;
      });

      if (mappedAssignments.length > 0) {
        const existingNames = new Set(mappedAssignments.map((a) => a.managerName.toLowerCase()));
        const remaining = INITIAL_CG_MANAGERS.filter((m) => !existingNames.has(m.managerName.toLowerCase()));
        setCgManagers([...mappedAssignments, ...remaining]);
      } else {
        setCgManagers(INITIAL_CG_MANAGERS);
      }
    } catch {
      setCgManagers(INITIAL_CG_MANAGERS);
    } finally {
      setCgManagersLoading(false);
    }
  };

  useEffect(() => {
    void loadCgManagers();
    Promise.all([driverManagementApi.getUnits({ level: 'OWNER', status: 'ACTIVE' }), apiService.getUsers({ role: 'FARM_MANAGER' })])
      .then(([unitsData, usersData]: [any[], any[]]) => {
        setCgManagementUnits(unitsData.map((item) => ({ id: item.id, code: item.code, name: item.name })));
        setFarmManagerUsers(usersData.map((item) => ({ id: item.id, code: item.code, fullName: item.fullName })));
      }).catch(() => undefined);
  }, []);
  const [showCgManagerModal, setShowCgManagerModal] = useState(false);
  const [editingCgManager, setEditingCgManager] = useState<CGManagerItem | null>(null);
  const [cgManagerForm, setCgManagerForm] = useState({
    managementUnitId: '',
    managerUserId: '',
    managerType: 'PRIMARY' as 'PRIMARY' | 'DEPUTY',
    effectiveFrom: new Date().toISOString().slice(0, 16),
    legacyCatalogId: '',
    unitName: '',
    enterpriseName: '',
    managementArea: '',
    managerName: '',
    phone: '',
    location: '',
  });

  const openAddCgManagerModal = () => {
    setEditingCgManager(null);
    setCgManagerForm({
      managementUnitId: '',
      managerUserId: '',
      managerType: 'PRIMARY',
      effectiveFrom: new Date().toISOString().slice(0, 16),
      legacyCatalogId: '',
      unitName: '',
      enterpriseName: '',
      managementArea: '',
      managerName: '',
      phone: '',
      location: '',
    });
    setShowCgManagerModal(true);
  };

  const openEditCgManagerModal = (item: CGManagerItem) => {
    setEditingCgManager(item);
    setCgManagerForm({
      managementUnitId: item.managementUnitId ? String(item.managementUnitId) : '',
      managerUserId: item.managerUserId ? String(item.managerUserId) : '',
      managerType: item.managerType || 'PRIMARY',
      effectiveFrom: item.assignmentId ? new Date().toISOString().slice(0, 16) : item.effectiveFrom?.slice(0, 16) || new Date().toISOString().slice(0, 16),
      legacyCatalogId: item.legacyCatalogId || '',
      unitName: item.enterpriseName || item.unitName,
      enterpriseName: item.enterpriseName || item.unitName,
      managementArea: item.managementArea || 'Khu vực Daun Penh (DP)',
      managerName: item.managerName,
      phone: item.phone,
      location: item.location,
    });
    setShowCgManagerModal(true);
  };

  const handleSaveCgManager = async () => {
    if (!cgManagerForm.managerName.trim() && !cgManagerForm.managerUserId) {
      setFormError('Vui lòng nhập họ tên hoặc chọn User FARM_MANAGER.');
      return;
    }
    try {
      if (cgManagerForm.managementUnitId && cgManagerForm.managerUserId) {
        const assignmentPayload = {
          managementUnitId: Number(cgManagerForm.managementUnitId),
          managerUserId: Number(cgManagerForm.managerUserId),
          managerType: cgManagerForm.managerType,
          effectiveFrom: new Date(cgManagerForm.effectiveFrom).toISOString(),
          legacyCatalogId: cgManagerForm.legacyCatalogId || undefined,
          reason: editingCgManager?.assignmentId ? 'Thay đổi người phụ trách từ danh mục' : 'Phân công từ danh mục',
        };
        if (editingCgManager?.assignmentId) await driverManagementApi.replaceManagerAssignment(editingCgManager.assignmentId, assignmentPayload);
        else await driverManagementApi.createManagerAssignment(assignmentPayload);
        await loadCgManagers();
      } else {
        // Local update for items
        if (editingCgManager) {
          setCgManagers((prev) =>
            prev.map((m) =>
              m.id === editingCgManager.id
                ? {
                    ...m,
                    unitName: cgManagerForm.enterpriseName || cgManagerForm.unitName,
                    enterpriseName: cgManagerForm.enterpriseName || cgManagerForm.unitName,
                    managementArea: cgManagerForm.managementArea || 'Khu vực Daun Penh (DP)',
                    managerName: cgManagerForm.managerName,
                    phone: cgManagerForm.phone,
                    location: cgManagerForm.location,
                  }
                : m
            )
          );
        } else {
          const newMgr: CGManagerItem = {
            id: `CGM-${Date.now().toString().slice(-4)}`,
            unitName: cgManagerForm.enterpriseName || cgManagerForm.unitName || 'Xí nghiệp mới',
            enterpriseName: cgManagerForm.enterpriseName || cgManagerForm.unitName || 'Xí nghiệp mới',
            managementArea: cgManagerForm.managementArea || 'Khu vực Daun Penh (DP)',
            managerName: cgManagerForm.managerName,
            phone: cgManagerForm.phone,
            location: cgManagerForm.location,
            klhCode: 'KOUN_MOM',
            roleScope: 'Quản lý toàn bộ xe, tài xế & Lập lệnh điều xe',
            status: 'ACTIVE',
          };
          setCgManagers((prev) => [newMgr, ...prev]);
        }
      }
      setShowCgManagerModal(false);
      setEditingCgManager(null);
    } catch (error: any) {
      setFormError(error?.response?.data?.message || 'Không thể lưu nhân sự quản lý cơ giới.');
    }
  };

  const handleDeleteCgManager = async (id: string) => {
    const item = cgManagers.find((manager) => manager.id === id);
    if (!item?.assignmentId || !window.confirm('Kết thúc nhiệm kỳ này? Lịch sử sẽ được giữ nguyên.')) return;
    await driverManagementApi.endManagerAssignment(item.assignmentId, { reason: 'Kết thúc từ danh mục' });
    await loadCgManagers();
  };

  // Modals for Generic Items (Units, Locations, Conditions, Suppliers)
  const [showSimpleAddModal, setShowSimpleAddModal] = useState(false);
  const [simpleModalTitle, setSimpleModalTitle] = useState('');
  const [simpleForm, setSimpleForm] = useState(EMPTY_SIMPLE_FORM);
  const [simpleTarget, setSimpleTarget] = useState<CatalogTab>('units');
  const [editingSimpleItem, setEditingSimpleItem] = useState<{ target: CatalogTab; name: string } | null>(null);

  // Merge State
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [mergeTargetName, setMergeTargetName] = useState('');
  const [merging, setMerging] = useState(false);

  // Common UI State
  const [search, setSearch] = useState('');
  const [assetGroupFilter, setAssetGroupFilter] = useState('ALL');
  const [subsystemFilter, setSubsystemFilter] = useState<'ALL' | 'FLEET' | 'EQUIPMENT' | 'OTHER_ASSETS'>('ALL');
  const [typeStatusFilter, setTypeStatusFilter] = useState('ALL');
  const [modelStatusFilter, setModelStatusFilter] = useState('ALL');
  const [functionalGroupFilter, setFunctionalGroupFilter] = useState('ALL');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const handleTabChange = (tab: CatalogTab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
    setSearch('');
    setSelectedItems([]);
    setTypeStatusFilter('ALL');
    setModelStatusFilter('ALL');
    setFunctionalGroupFilter('ALL');
  };

  const toggleSelectItem = (name: string) => {
    setSelectedItems((prev) =>
      prev.includes(name) ? prev.filter((i) => i !== name) : [...prev, name]
    );
  };

  // --------------------------------------------------------------------------
  // DATA LOADERS
  // --------------------------------------------------------------------------
  const loadTypes = async () => {
    setTypesLoading(true);
    try {
      const data = await apiService.getVehicleTypes({ active: true });
      setTypes(data);
    } catch (err) {
      console.error('Không thể tải chủng loại xe', err);
      setTypes([]);
    } finally {
      setTypesLoading(false);
    }
  };

  const loadManufacturers = async () => {
    setMfLoading(true);
    try {
      const data = await apiService.getManufacturers();
      setManufacturers(data);
    } catch (err) {
      console.error('Không thể tải danh sách hãng sản xuất', err);
      setManufacturers([]);
    } finally {
      setMfLoading(false);
    }
  };

  const loadModels = async () => {
    setModelsLoading(true);
    try {
      const data = await apiService.getModels();
      setModels(data);
    } catch (err) {
      console.error('Không thể tải danh sách models', err);
      setModels([]);
    } finally {
      setModelsLoading(false);
    }
  };

  const loadFilterOptions = async () => {
    try {
      const opts = await apiService.getVehicleFilterOptions();
      if (opts?.assignedUnits && opts.assignedUnits.length > 0) {
        setUnits(opts.assignedUnits.map((item: any) => typeof item === 'string' ? item : item.name));
      }
      if (opts?.locations) setLocations(opts.locations.map((item: any) => typeof item === 'string' ? item : item.name));
      if (opts?.origins) setOrigins(opts.origins.map((item: any) => typeof item === 'string' ? item : item.name));
      if (opts?.purchaseConditions) setPurchaseConditions(opts.purchaseConditions);
      if (opts?.suppliers) setSuppliers(opts.suppliers);
      if (opts?.companyOwners) setCompanyOwners(opts.companyOwners);
      catalogsApi.getCatalogs('COMPANY_OWNER', 'catalogs_company_owners').then((dbOwners) => {
        if (Array.isArray(dbOwners) && dbOwners.length > 0) {
          const names = dbOwners.map((i) => i.name || i.code).filter(Boolean);
          setCompanyOwners((prev) => Array.from(new Set([...prev, ...names])));
        }
      });
    } catch (err) {
      console.error('Không thể tải metadata bộ lọc xe', err);
    }
  };

  const loadImplementsSummary = async () => {
    setImplementsLoading(true);
    try {
      const res = await apiService.getAllImplements();
      if (res && Array.isArray(res.items)) {
        const counts: Record<string, number> = {};
        res.items.forEach((item: any) => {
          if (item.category) {
            counts[item.category] = (counts[item.category] || 0) + 1;
          }
        });
        setImplementCategories((prev) =>
          prev.map((cat) => ({
            ...cat,
            totalCount: counts[cat.categoryKey] ?? cat.totalCount,
          }))
        );
      }
    } catch (err) {
      console.error('Không thể tải tổng hợp nông cụ:', err);
    } finally {
      setImplementsLoading(false);
    }
  };

  useEffect(() => {
    void loadTypes();
    void loadImplementsSummary();
    void loadManufacturers();
    void loadModels();
    void loadFilterOptions();
  }, []);

  // --------------------------------------------------------------------------
  // ACTIONS: MERGE CATALOG ITEMS
  // --------------------------------------------------------------------------
  const handleAutoDetectDuplicates = () => {
    let currentNames: string[] = [];
    if (activeTab === 'units') currentNames = units;
    else if (activeTab === 'locations') currentNames = locations;
    else if (activeTab === 'purchaseConditions') currentNames = purchaseConditions;
    else if (activeTab === 'suppliers') currentNames = suppliers;
    else if (activeTab === 'manufacturers') currentNames = manufacturers.map((m) => m.name);
    else if (activeTab === 'models') currentNames = models.map((m) => m.name);
    else if (activeTab === 'types') currentNames = types.map((t) => t.name);
    else if (activeTab === 'origins') currentNames = origins;

    // Group names by normalized lowercase
    const groups = new Map<string, string[]>();
    currentNames.forEach((name) => {
      const key = normalizeMasterDataKey(name);
      const list = groups.get(key) || [];
      list.push(name);
      groups.set(key, list);
    });

    const dupGroup = Array.from(groups.values()).find((list) => list.length > 1);
    if (dupGroup && dupGroup.length > 1) {
      setSelectedItems(dupGroup);
      setMergeTargetName(dupGroup[0]);
      setShowMergeModal(true);
    } else {
      alert('Không phát hiện mục trùng lặp tên / viết hoa thường trong danh mục này.');
    }
  };

  const handleExecuteMerge = async () => {
    if (selectedItems.length < 2) {
      alert('Vui lòng chọn ít nhất 2 mục để gộp.');
      return;
    }
    if (!mergeTargetName.trim()) {
      alert('Vui lòng chọn hoặc nhập tên chuẩn duy nhất.');
      return;
    }

    const target = mergeTargetName.trim();
    const isConfirmed = window.confirm(
      `XÁC NHẬN GỘP DỮ LIỆU:\n\nBạn có chắc chắn muốn gộp ${selectedItems.length} mục đã chọn:\n${selectedItems.map((s) => ` • ${s}`).join('\n')}\n\nthành 1 tên chuẩn duy nhất: "${target}" không?\n\nHành động này sẽ cập nhật toàn bộ hồ sơ xe và dữ liệu liên quan!`
    );
    if (!isConfirmed) return;

    setMerging(true);
    try {
      const sources = selectedItems.filter((s) => s !== target);

      const result = await apiService.mergeCatalogItems({
        catalogType: activeTab,
        sourceNames: selectedItems,
        targetName: target,
      });

      const updateList = (list: string[]) => {
        const filtered = list.filter((item) => !sources.includes(item));
        return filtered.includes(target) ? filtered : [target, ...filtered];
      };

      if (activeTab === 'units') setUnits(updateList);
      else if (activeTab === 'locations') setLocations(updateList);
      else if (activeTab === 'purchaseConditions') setPurchaseConditions(updateList);
      else if (activeTab === 'suppliers') {
        setSuppliers(updateList);
        setCompanyOwners(updateList);
      }

      await loadTypes();
      await loadManufacturers();
      await loadModels();
      await loadFilterOptions();

      setSelectedItems([]);
      setShowMergeModal(false);
      alert(`Gộp thành công! Đã chuyển đổi ${result.updatedVehicles} hồ sơ xe liên quan về tên chuẩn "${target}".`);
    } catch (err) {
      console.error(err);
      alert('Lỗi khi thực hiện gộp danh mục.');
    } finally {
      setMerging(false);
    }
  };

  // --------------------------------------------------------------------------
  // ACTIONS: TYPE
  // --------------------------------------------------------------------------
  const handleSaveType = async () => {
    if (!typeForm.code.trim() || !typeForm.name.trim()) {
      setFormError('Mã và tên chủng loại là bắt buộc.');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      const payload = {
        code: typeForm.code.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_'),
        name: typeForm.name.trim(),
        assetGroup: typeForm.assetGroup,
        ...(typeForm.category ? { category: typeForm.category } : {}),
        defaultMaintenanceHours: Number(typeForm.defaultMaintenanceHours),
        ...(typeForm.defaultFuelQuotaRate ? { defaultFuelQuotaRate: Number(typeForm.defaultFuelQuotaRate) } : {}),
        defaultFuelQuotaUnit: typeForm.defaultFuelQuotaUnit,
        ...(typeForm.description.trim() ? { description: typeForm.description.trim() } : {}),
        active: true,
      };

      if (editingType) {
        await apiService.updateVehicleType(editingType.id, payload);
      } else {
        await apiService.createVehicleType(payload);
      }
      setShowAddTypeModal(false);
      setEditingType(null);
      setTypeForm(EMPTY_TYPE_FORM);
      await loadTypes();
    } catch (err) {
      console.error(err);
      setFormError('Không thể lưu chủng loại. Kiểm tra mã không bị trùng lặp.');
    } finally {
      setSaving(false);
    }
  };

  const openMaintenanceStandard = async (item: VehicleTypeMaster) => {
    setMaintenanceType(item);
    const response = await apiClient.get('/maintenance/standards', { params: { vehicleTypeId: item.id } });
    const payload = response.data?.data || response.data;
    setMaintenanceStandards(Array.isArray(payload) ? payload : []);
  };

  const changeMaintenanceMetric = (metric: 'ENGINE_HOUR' | 'ODOMETER_KM') => {
    setMaintenanceMetric(metric);
    if (metric === 'ENGINE_HOUR') {
      setMaintenanceMilestones('50, 250, 500, 750, 1000, 1250, 1500, 1750, 2000');
      setMaintenanceName('Định mức BDC2 giờ máy');
    } else {
      setMaintenanceMilestones('500, 5000, 10000, 15000, 20000, 25000, 30000, 35000, 40000');
      setMaintenanceName('Định mức BDC2 ODO km');
    }
  };

  const createAndActivateMaintenanceStandard = async () => {
    if (!maintenanceType) return;
    const values = maintenanceMilestones.split(/[,;\s]+/).map(Number).filter((value) => Number.isFinite(value) && value > 0);
    if (!values.length) {
      setFormError('Phải nhập ít nhất một mốc bảo dưỡng hợp lệ.');
      return;
    }
    setMaintenanceSaving(true);
    setFormError('');
    try {
      const createdResponse = await apiClient.post('/maintenance/standards', {
        code: `${maintenanceType.code}-${maintenanceMetric}-${Date.now()}`,
        name: maintenanceName,
        vehicleTypeId: maintenanceType.id,
        metric: maintenanceMetric,
        warningPercent: 80,
        explanationPercent: 110,
        repeatAfterMax: true,
        bdc1ChecklistJson: {
          clean_vehicle: false,
          inspect_general_condition: false,
          lubricate_required_points: false,
          tighten_bolts: false,
        },
        milestones: [...new Set(values)].sort((a, b) => a - b).map((meterValue) => ({
          meterValue,
          label: `BDC2 ${meterValue.toLocaleString('vi-VN')} ${maintenanceMetric === 'ENGINE_HOUR' ? 'giờ' : 'km'}`,
        })),
      });
      const created = createdResponse.data?.data || createdResponse.data;
      await apiClient.post(`/maintenance/standards/${created.id}/activate`);
      const listResponse = await apiClient.get('/maintenance/standards', { params: { vehicleTypeId: maintenanceType.id } });
      setMaintenanceStandards(listResponse.data?.data || listResponse.data || []);
    } finally {
      setMaintenanceSaving(false);
    }
  };

  // --------------------------------------------------------------------------
  // ACTIONS: MANUFACTURER
  // --------------------------------------------------------------------------
  const handleSaveManufacturer = async () => {
    if (!mfForm.name.trim()) {
      setFormError('Tên thương hiệu / hãng sản xuất là bắt buộc.');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      if (editingMf) {
        await apiService.updateManufacturer(editingMf.id, {
          name: mfForm.name.trim(),
          countryName: mfForm.countryName,
          countryCode: mfForm.countryCode,
        });
      } else {
        await apiService.createManufacturer({
          name: mfForm.name.trim(),
          countryName: mfForm.countryName,
          countryCode: mfForm.countryCode,
        });
      }
      setShowAddMfModal(false);
      setEditingMf(null);
      setMfForm(EMPTY_MANUFACTURER_FORM);
      await loadManufacturers();
    } catch (err) {
      console.error(err);
      setFormError('Lỗi khi lưu hãng sản xuất. Vui lòng thử lại.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteManufacturer = async (id: number, name: string) => {
    if (!window.confirm(`Xác nhận xóa hãng sản xuất "${name}" khỏi danh mục?`)) return;
    try {
      await apiService.deleteManufacturer(id);
      await loadManufacturers();
    } catch (err) {
      alert('Không thể xóa hãng đang có xe hoặc model liên kết.');
    }
  };

  // --------------------------------------------------------------------------
  // ACTIONS: MODEL
  // --------------------------------------------------------------------------
  const handleSaveModel = async () => {
    if (!modelForm.name.trim() || !modelForm.manufacturerId) {
      setFormError('Vui lòng nhập tên Model và chọn Hãng sản xuất.');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      if (editingModel) {
        await apiService.updateModel(editingModel.id, {
          name: modelForm.name.trim(),
          manufacturerId: modelForm.manufacturerId,
          categoryHint: modelForm.categoryHint || undefined,
        });
      } else {
        await apiService.createModel({
          name: modelForm.name.trim(),
          manufacturerId: modelForm.manufacturerId,
          categoryHint: modelForm.categoryHint || undefined,
        });
      }
      setShowAddModelModal(false);
      setEditingModel(null);
      setModelForm(EMPTY_MODEL_FORM);
      await loadModels();
    } catch (err) {
      console.error(err);
      setFormError('Lỗi khi lưu model. Model có thể đã tồn tại.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteModel = async (id: number, name: string) => {
    if (!window.confirm(`Xác nhận xóa model "${name}" khỏi danh mục?`)) return;
    try {
      await apiService.deleteModel(id);
      await loadModels();
    } catch (err) {
      alert('Không thể xóa model đang gắn với hồ sơ xe.');
    }
  };

  // --------------------------------------------------------------------------
  // ACTIONS: GENERIC SIMPLE CATALOG (Units, Locations, Conditions, Suppliers)
  // --------------------------------------------------------------------------
  const openSimpleAddModal = (target: CatalogTab, title: string) => {
    setSimpleTarget(target);
    setSimpleModalTitle(title);
    setEditingSimpleItem(null);
    setSimpleForm(EMPTY_SIMPLE_FORM);
    setFormError('');
    setShowSimpleAddModal(true);
  };

  const openSimpleEditModal = (target: CatalogTab, title: string, oldName: string) => {
    setSimpleTarget(target);
    setSimpleModalTitle(title);
    setEditingSimpleItem({ target, name: oldName });
    setSimpleForm({ name: oldName, description: '' });
    setFormError('');
    setShowSimpleAddModal(true);
  };

  const handleSaveSimpleItem = async () => {
    const val = simpleForm.name.trim();
    if (!val) {
      setFormError('Vui lòng nhập tên danh mục.');
      return;
    }

    const updateList = (list: string[], oldVal?: string) => {
      if (oldVal) {
        return list.map((item) => (item === oldVal ? val : item));
      }
      return list.includes(val) ? list : [val, ...list];
    };

    const catalogTypes: Partial<Record<CatalogTab, string[]>> = {
      origins: ['VEHICLE_ORIGIN'],
      purchaseConditions: ['PURCHASE_CONDITION'],
      suppliers: ['SUPPLIER'],
      companyOwners: ['COMPANY_OWNER'],
    };
    const types = catalogTypes[simpleTarget] || [];
    try {
      await Promise.all(types.map((type) => apiClient.post('/catalogs', {
        id: `${type}-${encodeURIComponent(val.toLocaleLowerCase('vi-VN')).slice(0, 80)}`,
        code: val.toLocaleUpperCase('vi-VN').replace(/\s+/g, '_'),
        name: val,
        type,
        status: 'HOAT_DONG',
      })));
    } catch {
      setFormError('Không thể lưu danh mục dùng chung. Vui lòng thử lại.');
      return;
    }

    if (simpleTarget === 'origins') {
      setOrigins((prev) => updateList(prev, editingSimpleItem?.name));
    } else if (simpleTarget === 'units') {
      setUnits((prev) => updateList(prev, editingSimpleItem?.name));
    } else if (simpleTarget === 'locations') {
      setLocations((prev) => updateList(prev, editingSimpleItem?.name));
    } else if (simpleTarget === 'purchaseConditions') {
      setPurchaseConditions((prev) => updateList(prev, editingSimpleItem?.name));
    } else if (simpleTarget === 'suppliers') {
      setSuppliers((prev) => updateList(prev, editingSimpleItem?.name));
    } else if (simpleTarget === 'companyOwners') {
      setCompanyOwners((prev) => updateList(prev, editingSimpleItem?.name));
    }

    setShowSimpleAddModal(false);
    setEditingSimpleItem(null);
    setSimpleForm(EMPTY_SIMPLE_FORM);
  };

  const handleDeleteSimpleItem = (target: CatalogTab, val: string) => {
    if (!window.confirm(`Xác nhận xóa mục "${val}" khỏi danh mục?`)) return;
    if (target === 'units') {
      setUnits((prev) => prev.filter((u) => u !== val));
    }
    if (target === 'locations') setLocations(locations.filter((l) => l !== val));
    if (target === 'purchaseConditions') setPurchaseConditions(purchaseConditions.filter((c) => c !== val));
    if (target === 'suppliers') {
      setSuppliers(suppliers.filter((s) => s !== val));
    }
    if (target === 'companyOwners') {
      setCompanyOwners(companyOwners.filter((o) => o !== val));
    }
  };

  // --------------------------------------------------------------------------
  // FILTERED DATA FOR TABLES
  // --------------------------------------------------------------------------
  const filteredTypes = useMemo(() => {
    const q = search.trim().toLowerCase();
    return types.filter((item) => {
      const matchSearch = !q || item.code.toLowerCase().includes(q) || item.name.toLowerCase().includes(q);
      const matchGroup = assetGroupFilter === 'ALL' || item.assetGroup === assetGroupFilter;
      const matchSubsystem = subsystemFilter === 'ALL' || getVehicleTypeSubsystem(item) === subsystemFilter;
      const matchStatus = typeStatusFilter === 'ALL' || (typeStatusFilter === 'ACTIVE' ? item.active : !item.active);
      return matchSearch && matchGroup && matchSubsystem && matchStatus;
    });
  }, [types, search, assetGroupFilter, subsystemFilter, typeStatusFilter]);

  const filteredManufacturers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return manufacturers.filter((item) => {
      return !q || item.name.toLowerCase().includes(q) || (item.countryName || '').toLowerCase().includes(q);
    });
  }, [manufacturers, search]);

  const filteredModels = useMemo(() => {
    const q = search.trim().toLowerCase();
    return models.filter((item) => {
      const matchSearch = !q || item.name.toLowerCase().includes(q) || (item.manufacturerName || '').toLowerCase().includes(q);
      const matchMf = selectedMfFilter === 'ALL' || String(item.manufacturerId) === selectedMfFilter;
      const matchStatus = modelStatusFilter === 'ALL' || (item as any).status === modelStatusFilter;
      return matchSearch && matchMf && matchStatus;
    });
  }, [models, search, selectedMfFilter, modelStatusFilter]);

  const countryStats = useMemo(() => {
    const map = new Map<string, { code: string; mfCount: number; vehicleCount: number }>();
    origins.forEach((name) => {
      const country = POPULAR_COUNTRIES.find((item) => item.name === name);
      map.set(name, { code: country?.code || '—', mfCount: 0, vehicleCount: 0 });
    });
    manufacturers.forEach((mf) => {
      const country = mf.countryName || 'Chưa xác định';
      const existing = map.get(country) || { code: mf.countryCode || '—', mfCount: 0, vehicleCount: 0 };
      existing.mfCount += 1;
      existing.vehicleCount += mf.vehicleCount;
      map.set(country, existing);
    });
    return Array.from(map.entries()).map(([name, stat]) => ({
      name,
      code: stat.code,
      mfCount: stat.mfCount,
      vehicleCount: stat.vehicleCount,
    })).sort((a, b) => b.vehicleCount - a.vehicleCount);
  }, [manufacturers, origins]);

  const unitRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return units
      .filter((u) => !q || u.toLowerCase().includes(q))
      .map((u) => ({ name: u }));
  }, [units, search]);

  const filteredLocationItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    const activeKlh = selectedLocationKlh !== 'ALL' ? selectedLocationKlh : (globalKLH !== 'ALL' ? globalKLH : 'ALL');

    return masterLocations.filter((item) => {
      const matchSearch =
        !q ||
        item.name.toLowerCase().includes(q) ||
        (item.complexName && item.complexName.toLowerCase().includes(q)) ||
        (item.regionName && item.regionName.toLowerCase().includes(q)) ||
        (item.address && item.address.toLowerCase().includes(q));

      let matchKlh = true;
      if (activeKlh && activeKlh !== 'ALL') {
        const itemCode = (item.complexCode || '').toUpperCase();
        const itemName = (item.complexName || '').toUpperCase();
        matchKlh =
          itemCode === activeKlh ||
          (activeKlh === 'KOUN_MOM' && (itemCode.includes('KOUN') || itemName.includes('KOUN') || itemCode.includes('KM'))) ||
          (activeKlh === 'SNOUL' && (itemCode.includes('SNOUL') || itemName.includes('SNOUL') || itemCode.includes('SN'))) ||
          (activeKlh === 'NAM_LAO' && (itemCode.includes('LAO') || itemName.includes('LAO') || itemCode.includes('NL')));
      }

      return matchSearch && matchKlh;
    });
  }, [masterLocations, search, selectedLocationKlh, globalKLH]);

  const locationRows = useMemo(() => {
    return filteredLocationItems.map((l) => ({ name: l.name }));
  }, [filteredLocationItems]);

  const conditionRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return purchaseConditions
      .filter((c) => !q || c.toLowerCase().includes(q))
      .map((c) => ({ name: c }));
  }, [purchaseConditions, search]);

  const supplierRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return suppliers
      .filter((s) => !q || s.toLowerCase().includes(q))
      .map((s) => ({ name: s }));
  }, [suppliers, search]);

  const companyOwnerRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return companyOwners
      .filter((o) => !q || o.toLowerCase().includes(q))
      .map((o) => ({ name: o }));
  }, [companyOwners, search]);

  const filteredImplements = useMemo(() => {
    const q = search.trim().toLowerCase();
    return implementCategories.filter((it) => {
      const matchSearch =
        !q ||
        it.name.toLowerCase().includes(q) ||
        it.code.toLowerCase().includes(q) ||
        it.functionalGroup.toLowerCase().includes(q) ||
        it.compatibleVehicles.toLowerCase().includes(q) ||
        it.description.toLowerCase().includes(q);
      const matchGroup = functionalGroupFilter === 'ALL' || it.functionalGroup === functionalGroupFilter;
      return matchSearch && matchGroup;
    });
  }, [implementCategories, search, functionalGroupFilter]);

  const totalImplementsCount = useMemo(() => {
    return implementCategories.reduce((sum, item) => sum + item.totalCount, 0);
  }, [implementCategories]);

  const subsystemStats = useMemo(() => {
    const fleetTypes = types.filter((t) => getVehicleTypeSubsystem(t) === 'FLEET');
    const fleetVehicles = fleetTypes.reduce((sum, t) => sum + (t.vehicleCount || 0), 0);

    const otherTypes = types.filter((t) => getVehicleTypeSubsystem(t) === 'OTHER_ASSETS');
    const otherVehicles = otherTypes.reduce((sum, t) => sum + (t.vehicleCount || 0), 0);

    const equipmentTypes = types.filter((t) => getVehicleTypeSubsystem(t) === 'EQUIPMENT');
    const equipmentVehiclesFromTypes = equipmentTypes.reduce((sum, t) => sum + (t.vehicleCount || 0), 0);
    const equipmentTotal = 1026; // Chuẩn hóa toàn bộ 1.026 thiết bị phụ trợ & nông cụ

    return {
      fleetTypesCount: fleetTypes.length,
      fleetVehicles: fleetVehicles || 1016,
      equipmentTypesCount: implementCategories.length,
      equipmentTotal,
      otherTypesCount: otherTypes.length,
      otherVehicles: otherVehicles || 1049,
      totalVehicles: 3091,
    };
  }, [types, implementCategories]);

  // --------------------------------------------------------------------------
  // COLUMNS DEFINITIONS WITH CHECKBOX MULTI-SELECT
  // --------------------------------------------------------------------------
  const typeColumns: Column<VehicleTypeMaster>[] = [
    {
      key: 'select',
      title: (
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary cursor-pointer"
          checked={filteredTypes.length > 0 && filteredTypes.every((r) => selectedItems.includes(r.name))}
          onChange={(e) => {
            if (e.target.checked) setSelectedItems(filteredTypes.map((r) => r.name));
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
          checked={selectedItems.includes(item.name)}
          onChange={() => toggleSelectItem(item.name)}
        />
      ),
    },
    {
      key: 'code',
      title: 'Mã chủng loại',
      sortable: true,
      render: (item) => (
        <div>
          <div className="font-bold text-slate-900 font-mono text-xs">{item.code}</div>
          <div className="mt-0.5 text-[11px] text-slate-500">{item.category || '—'}</div>
        </div>
      ),
    },
    {
      key: 'name',
      title: 'Tên chủng loại xe & MMTB',
      sortable: true,
      render: (item) => {
        const subsystem = getVehicleTypeSubsystem(item);
        const meta = SUBSYSTEM_META[subsystem];
        return (
          <div className="max-w-[280px] whitespace-normal">
            <div className="font-bold text-slate-900 text-xs">{item.name}</div>
            <div className="mt-0.5 text-[11px] text-slate-500">
              {meta.shortLabel} • {item.assetGroup ? GROUP_LABELS[item.assetGroup] || item.assetGroup : 'Chưa phân nhóm'}
            </div>
          </div>
        );
      },
    },
    {
      key: 'technicalSpecs',
      title: 'Thuộc tính kỹ thuật & Quản lý vận hành',
      render: (item) => {
        const specs = TECHNICAL_ATTRIBUTES_MAP[item.code] || {
          fuelType: item.defaultFuelQuotaUnit ? FUEL_UNIT_LABELS[item.defaultFuelQuotaUnit] : 'Theo định mức',
          specs: item.description || 'Thuộc tính kỹ thuật theo tiêu chuẩn hãng',
          operationMode: 'Quản lý theo danh mục',
          application: 'Phục vụ sản xuất nông nghiệp và cơ giới',
        };

        return (
          <div className="max-w-[340px] whitespace-normal space-y-0.5 text-xs text-slate-700">
            <div>
              <span className="font-semibold text-slate-900">{specs.fuelType}</span>
              <span className="text-slate-400 mx-1.5">•</span>
              <span className="text-slate-600">{specs.operationMode}</span>
            </div>
            <div className="text-[11px] text-slate-600 leading-tight">
              {specs.specs}
            </div>
            <div className="text-[10px] text-slate-500 line-clamp-1">
              {specs.application}
            </div>
          </div>
        );
      },
    },
    {
      key: 'manufacturers',
      title: 'Hãng & Model thực tế',
      render: (item) => (
        <div className="max-w-[240px] whitespace-normal text-[11px]">
          <div className="font-semibold text-slate-900">{item.manufacturers.slice(0, 3).join(', ') || '—'}</div>
          <div className="mt-0.5 text-slate-500 text-[10px]">{item.models.slice(0, 3).join(', ') || 'Chưa có model'}</div>
        </div>
      ),
    },
    {
      key: 'defaultMaintenanceHours',
      title: 'Định mức kỹ thuật',
      align: 'right',
      render: (item) => (
        <div className="text-right text-xs">
          <div className="font-mono font-semibold text-slate-900">
            {item.defaultMaintenanceHours}h / bảo dưỡng
          </div>
          <div className="mt-0.5 text-[10px] text-slate-500 font-mono">
            Định mức dầu: {item.defaultFuelQuotaRate ?? '—'} {item.defaultFuelQuotaUnit ? FUEL_UNIT_LABELS[item.defaultFuelQuotaUnit] : ''}
          </div>
        </div>
      ),
    },
    {
      key: 'vehicleCount',
      title: 'Số lượng & Phân hệ quản lý',
      align: 'center',
      sortable: true,
      width: '180px',
      render: (item) => {
        const subsystem = getVehicleTypeSubsystem(item);
        const meta = SUBSYSTEM_META[subsystem];
        const targetUrl =
          subsystem === 'EQUIPMENT'
            ? '/doi-xe/thiet-bi'
            : subsystem === 'OTHER_ASSETS'
            ? `/doi-xe/tai-san-khac?category=${encodeURIComponent(item.code)}`
            : `/doi-xe/ho-so-xe?category=${encodeURIComponent(item.code)}`;

        return (
          <div className="text-center text-xs">
            <button
              type="button"
              className="font-bold text-slate-900 hover:text-emerald-700 hover:underline cursor-pointer"
              onClick={() => navigate(targetUrl)}
              title={`Mở quản lý trong phân hệ ${meta.targetPage}`}
            >
              {item.vehicleCount.toLocaleString('vi-VN')} {subsystem === 'EQUIPMENT' ? 'bộ' : 'xe/máy'}
            </button>
            <div className="text-[10px] text-slate-500 font-medium mt-0.5">
              Thuộc: {meta.targetPage}
            </div>
          </div>
        );
      },
    },
    {
      key: 'status',
      title: 'Trạng thái',
      align: 'center',
      width: '120px',
      render: (item) => renderMasterDataStatusBadge((item as any).status),
    },
    {
      key: 'user',
      title: 'User',
      align: 'center',
      width: '70px',
      render: (item) => (
        <AuditUserPopover
          createdDate="14-03-2026"
          createdUser="admin"
          updatedDate="01-08-2026"
          updatedUser="admin"
          title={`Xem thông tin tạo/sửa của ${item.name}`}
        />
      ),
    },
    {
      key: 'actions',
      title: 'Tác vụ',
      align: 'center',
      width: '110px',
      render: (item) => (
        <TableRowActions
          onView={() => {
            setEditingType(item);
            setTypeForm({
              code: item.code,
              name: item.name,
              assetGroup: item.assetGroup || 'MAY_CONG_TRINH',
              category: item.category || '',
              defaultMaintenanceHours: String(item.defaultMaintenanceHours || 250),
              defaultFuelQuotaRate: item.defaultFuelQuotaRate != null ? String(item.defaultFuelQuotaRate) : '',
              defaultFuelQuotaUnit: item.defaultFuelQuotaUnit || 'L_PER_HOUR',
              description: item.description || '',
            });
            setShowAddTypeModal(true);
          }}
          onEdit={() => {
            setEditingType(item);
            setTypeForm({
              code: item.code,
              name: item.name,
              assetGroup: item.assetGroup || 'MAY_CONG_TRINH',
              category: item.category || '',
              defaultMaintenanceHours: String(item.defaultMaintenanceHours || 250),
              defaultFuelQuotaRate: item.defaultFuelQuotaRate != null ? String(item.defaultFuelQuotaRate) : '',
              defaultFuelQuotaUnit: item.defaultFuelQuotaUnit || 'L_PER_HOUR',
              description: item.description || '',
            });
            setShowAddTypeModal(true);
          }}
          onDelete={() => {
            if (confirm(`Bạn có chắc chắn muốn xóa chủng loại "${item.name}"?`)) {
              setTypes((prev) => prev.filter((t) => t.code !== item.code));
            }
          }}
          viewTitle="Xem chi tiết chủng loại"
          editTitle="Sửa thông tin chủng loại"
          deleteTitle="Xóa chủng loại"
          requireAdminToDelete={false}
        />
      ),
    },
  ];

  const implementColumns: Column<ImplementCategoryDefinition>[] = [
    {
      key: 'code',
      title: 'Mã chủng loại',
      sortable: true,
      width: '130px',
      render: (item) => (
        <div>
          <div className="font-mono text-xs font-bold text-slate-900">
            {item.code}
          </div>
          <div className="mt-0.5 text-[10px] text-slate-500 font-mono">{item.categoryKey}</div>
        </div>
      ),
    },
    {
      key: 'name',
      title: 'Tên chủng loại thiết bị & nông cụ',
      sortable: true,
      render: (item) => (
        <div className="max-w-[320px] whitespace-normal">
          <div className="font-bold text-slate-900 text-xs">{item.name}</div>
          <div className="mt-1 text-[11px] text-slate-500 leading-tight">
            {item.description}
          </div>
        </div>
      ),
    },
    {
      key: 'functionalGroup',
      title: 'Phân nhóm chức năng',
      sortable: true,
      render: (item) => (
        <span className="text-xs text-slate-700 font-medium">
          {item.functionalGroup}
        </span>
      ),
    },
    {
      key: 'compatibleVehicles',
      title: 'Đầu máy kéo tương thích',
      render: (item) => (
        <div className="text-[11px] text-slate-700 max-w-[220px] whitespace-normal">
          {item.compatibleVehicles}
        </div>
      ),
    },
    {
      key: 'defaultMaintenanceHours',
      title: 'Định mức BDC',
      align: 'center',
      width: '120px',
      render: (item) => (
        <span className="font-mono text-xs font-semibold text-slate-900">
          {item.defaultMaintenanceHours} giờ
        </span>
      ),
    },
    {
      key: 'totalCount',
      title: 'Số lượng thực tế',
      align: 'center',
      sortable: true,
      width: '140px',
      render: (item) => (
        <a
          href={`/doi-xe/thiet-bi?category=${item.categoryKey}`}
          className="text-xs font-bold text-slate-900 hover:text-emerald-700 hover:underline cursor-pointer"
          title={`Xem chi tiết các thiết bị thuộc ${item.name}`}
        >
          {item.totalCount.toLocaleString('vi-VN')} bộ
        </a>
      ),
    },
    {
      key: 'status',
      title: 'Trạng thái',
      align: 'center',
      width: '120px',
      render: (item) => renderMasterDataStatusBadge(item.status),
    },
    {
      key: 'user',
      title: 'User',
      align: 'center',
      width: '70px',
      render: (item) => (
        <AuditUserPopover
          createdDate="14-03-2026"
          createdUser="admin"
          updatedDate="01-08-2026"
          updatedUser="admin"
          title={`Xem thông tin tạo/sửa của ${item.name}`}
        />
      ),
    },
    {
      key: 'actions',
      title: 'Tác vụ',
      align: 'center',
      width: '110px',
      render: (item) => (
        <TableRowActions
          onView={() => {
            setEditingImplement(item);
            setImplementForm({
              code: item.code,
              name: item.name,
              functionalGroup: item.functionalGroup,
              compatibleVehicles: item.compatibleVehicles,
              defaultMaintenanceHours: String(item.defaultMaintenanceHours),
              description: item.description,
            });
            setShowImplementModal(true);
          }}
          onEdit={() => {
            setEditingImplement(item);
            setImplementForm({
              code: item.code,
              name: item.name,
              functionalGroup: item.functionalGroup,
              compatibleVehicles: item.compatibleVehicles,
              defaultMaintenanceHours: String(item.defaultMaintenanceHours),
              description: item.description,
            });
            setShowImplementModal(true);
          }}
          onDelete={() => {
            if (confirm(`Bạn có chắc chắn muốn xóa chủng loại thiết bị "${item.name}"?`)) {
              setImplementCategories((prev) => prev.filter((i) => i.code !== item.code));
            }
          }}
          viewTitle="Xem chi tiết chủng loại thiết bị"
          editTitle="Sửa chủng loại thiết bị"
          deleteTitle="Xóa chủng loại thiết bị"
        />
      ),
    },
  ];

  // Xuất file CSV cho tab hiện tại
  const handleExportCSV = () => {
    let headers: string[] = [];
    let rows: (string | number)[][] = [];
    let filename = `danh-muc-xe-${activeTab}-${new Date().toISOString().slice(0, 10)}.csv`;

    if (activeTab === 'types') {
      headers = ['STT', 'Mã chủng loại', 'Tên chủng loại', 'Phân nhóm tài sản', 'Nhóm phương tiện', 'Bảo dưỡng định kỳ', 'Định mức dầu khoán', 'Đơn vị tính', 'Số lượng xe'];
      rows = filteredTypes.map((t, idx) => [
        idx + 1,
        t.code,
        t.name,
        GROUP_LABELS[t.assetGroup] || t.assetGroup,
        t.category || '',
        t.defaultMaintenanceHours ? `${t.defaultMaintenanceHours} giờ` : '250 giờ',
        t.defaultFuelQuotaRate ?? '',
        FUEL_UNIT_LABELS[t.defaultFuelQuotaUnit] || t.defaultFuelQuotaUnit,
        t.vehicleCount ?? 0,
      ]);
    } else if (activeTab === 'manufacturers') {
      headers = ['STT', 'Tên Hãng / Thương hiệu', 'Quốc gia / Xuất xứ', 'Mã QG', 'Số lượng Model', 'Số xe sử dụng'];
      rows = filteredManufacturers.map((m, idx) => [
        idx + 1,
        m.name,
        m.countryName || '',
        m.countryCode || '',
        m.modelCount,
        m.vehicleCount,
      ]);
    } else if (activeTab === 'models') {
      headers = ['STT', 'Tên Model', 'Hãng sản xuất', 'Xuất xứ Hãng', 'Số xe sử dụng'];
      rows = filteredModels.map((m, idx) => [
        idx + 1,
        m.name,
        m.manufacturerName || '',
        m.countryName || '',
        m.vehicleCount,
      ]);
    } else if (activeTab === 'origins') {
      headers = ['STT', 'Tên Quốc gia / Xuất xứ', 'Mã Quốc gia', 'Số Hãng sản xuất', 'Tổng số MMTB nhập khẩu'];
      rows = countryStats.map((c, idx) => [
        idx + 1,
        c.name,
        c.code,
        c.mfCount,
        c.vehicleCount,
      ]);
    } else if (activeTab === 'units') {
      headers = ['STT', 'Tên Xí nghiệp / Đơn vị'];
      rows = unitRows.map((u, idx) => [idx + 1, u.name]);
    } else if (activeTab === 'managementAreas') {
      headers = ['STT', 'Mã khu vực', 'Tên khu vực quản lý', 'Cụm vùng / Địa bàn', 'Khu liên hợp', 'Đội trưởng / Phụ trách', 'Số điện thoại', 'Bãi xe / Nơi tập kết', 'Số xe trực thuộc'];
      rows = filteredManagementAreas.map((a, idx) => [
        idx + 1,
        a.code,
        a.name,
        a.region,
        a.complexName,
        a.headOfficer || '',
        a.phone || '',
        a.depotLocation || '',
        a.assignedVehiclesCount || 0,
      ]);
    } else if (activeTab === 'locations') {
      headers = ['STT', 'Tên Bãi / Nơi tập kết', 'Khu liên hợp', 'Khu vực / Nông trường', 'Địa chỉ / Vị trí'];
      rows = filteredLocationItems.map((l, idx) => [
        idx + 1,
        l.name,
        l.complexName,
        l.regionName || '',
        l.address || '',
      ]);
    } else if (activeTab === 'cgManagers') {
      headers = ['STT', 'Mã NS', 'Họ & Tên NS Quản lý', 'Xí nghiệp trực thuộc', 'Khu vực quản lý', 'Số điện thoại', 'Địa chỉ / Bãi xe / Lô', 'Nhiệm vụ'];
      rows = filteredCgManagers.map((c, idx) => [
        idx + 1,
        c.id,
        c.managerName,
        c.enterpriseName || c.unitName,
        c.managementArea || 'Khu vực Daun Penh (DP)',
        c.phone,
        c.location,
        c.roleScope || 'Quản lý toàn bộ xe, tài xế & Lập lệnh điều xe',
      ]);
    } else if (activeTab === 'implements') {
      headers = ['STT', 'Mã chủng loại', 'Tên chủng loại thiết bị & nông cụ', 'Mã phân loại', 'Phân nhóm chức năng', 'Đầu máy tương thích', 'Định mức BDC', 'Số lượng thực tế (bộ)'];
      rows = filteredImplements.map((imp, idx) => [
        idx + 1,
        imp.code,
        imp.name,
        imp.categoryKey,
        imp.functionalGroup,
        imp.compatibleVehicles,
        `${imp.defaultMaintenanceHours} giờ`,
        imp.totalCount,
      ]);
    } else if (activeTab === 'purchaseConditions') {
      headers = ['STT', 'Tình trạng mua xe'];
      rows = conditionRows.map((p, idx) => [idx + 1, p.name]);
    } else if (activeTab === 'suppliers') {
      headers = ['STT', 'Nhà cung cấp'];
      rows = supplierRows.map((s, idx) => [idx + 1, s.name]);
    } else if (activeTab === 'companyOwners') {
      headers = ['STT', 'Pháp nhân sở hữu'];
      rows = companyOwnerRows.map((o, idx) => [idx + 1, o.name]);
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

  const mfColumns: Column<any>[] = [
    {
      key: 'select',
      title: (
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary cursor-pointer"
          checked={filteredManufacturers.length > 0 && filteredManufacturers.every((r) => selectedItems.includes(r.name))}
          onChange={(e) => {
            if (e.target.checked) setSelectedItems(filteredManufacturers.map((r) => r.name));
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
          checked={selectedItems.includes(item.name)}
          onChange={() => toggleSelectItem(item.name)}
        />
      ),
    },
    {
      key: 'name',
      title: 'Tên Hãng sản xuất / Thương hiệu',
      sortable: true,
      render: (item) => (
        <div>
          <div className="font-bold text-slate-900 text-xs">{item.name}</div>
          <div className="text-[10px] text-slate-500 font-mono">Mã ID: #{item.id}</div>
        </div>
      ),
    },
    {
      key: 'countryName',
      title: 'Quốc gia / Xuất xứ',
      sortable: true,
      render: (item) => (
        <span className="text-xs text-slate-800">
          {item.countryName || 'Chưa cập nhật'}
        </span>
      ),
    },
    {
      key: 'modelCount',
      title: 'Số lượng Model',
      align: 'center',
      sortable: true,
      width: '140px',
      render: (item) => (
        <button
          type="button"
          className="text-xs font-bold text-slate-900 hover:text-emerald-700 hover:underline cursor-pointer"
          onClick={() => {
            setSelectedMfFilter(String(item.id));
            setActiveTab('models');
          }}
          title={`Xem các model của hãng ${item.name}`}
        >
          {item.modelCount.toLocaleString('vi-VN')} model
        </button>
      ),
    },
    {
      key: 'vehicleCount',
      title: 'Số MMTB đang dùng',
      align: 'center',
      sortable: true,
      width: '140px',
      render: (item) => (
        <button
          type="button"
          className="text-xs font-bold text-slate-900 hover:text-emerald-700 hover:underline cursor-pointer"
          onClick={() => navigate(`/doi-xe/ho-so-xe?manufacturer=${encodeURIComponent(item.name)}`)}
          title={`Xem danh sách xe thuộc hãng ${item.name}`}
        >
          {item.vehicleCount.toLocaleString('vi-VN')} xe
        </button>
      ),
    },
    {
      key: 'status',
      title: 'Trạng thái',
      align: 'center',
      width: '120px',
      render: (item) => renderMasterDataStatusBadge(item.status),
    },
    {
      key: 'user',
      title: 'User',
      align: 'center',
      width: '70px',
      render: (item) => (
        <AuditUserPopover
          createdDate="14-03-2026"
          createdUser="admin"
          updatedDate="01-08-2026"
          updatedUser="admin"
          title={`Xem thông tin tạo/sửa của ${item.name}`}
        />
      ),
    },
    {
      key: 'actions',
      title: 'Tác vụ',
      align: 'center',
      width: '110px',
      render: (item) => (
        <TableRowActions
          onView={() => {
            setEditingMf(item);
            setMfForm({
              name: item.name,
              countryName: item.countryName || 'VIỆT NAM',
              countryCode: item.countryCode || 'VN',
            });
            setShowAddMfModal(true);
          }}
          onEdit={() => {
            setEditingMf(item);
            setMfForm({
              name: item.name,
              countryName: item.countryName || 'VIỆT NAM',
              countryCode: item.countryCode || 'VN',
            });
            setShowAddMfModal(true);
          }}
          onDelete={() => void handleDeleteManufacturer(item.id, item.name)}
          viewTitle="Xem chi tiết hãng"
          editTitle="Sửa hãng"
          deleteTitle="Xóa hãng"
        />
      ),
    },
  ];

  const modelColumns: Column<any>[] = [
    {
      key: 'select',
      title: (
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary cursor-pointer"
          checked={filteredModels.length > 0 && filteredModels.every((r) => selectedItems.includes(r.name))}
          onChange={(e) => {
            if (e.target.checked) setSelectedItems(filteredModels.map((r) => r.name));
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
          checked={selectedItems.includes(item.name)}
          onChange={() => toggleSelectItem(item.name)}
        />
      ),
    },
    {
      key: 'name',
      title: 'Tên Model',
      sortable: true,
      render: (item) => (
        <div className="font-mono font-bold text-xs text-slate-900">
          {item.name}
        </div>
      ),
    },
    {
      key: 'manufacturerName',
      title: 'Hãng sản xuất',
      sortable: true,
      render: (item) => (
        <span className="text-xs font-semibold text-slate-800">
          {item.manufacturerName || '—'}
        </span>
      ),
    },
    {
      key: 'countryName',
      title: 'Xuất xứ Hãng',
      render: (item) => (
        <span className="text-xs text-slate-600">
          {item.countryName || '—'}
        </span>
      ),
    },
    {
      key: 'vehicleCount',
      title: 'Số xe sử dụng',
      align: 'center',
      sortable: true,
      width: '140px',
      render: (item) => (
        <button
          type="button"
          className="text-xs font-bold text-slate-900 hover:text-emerald-700 hover:underline cursor-pointer"
          onClick={() => navigate(`/doi-xe/ho-so-xe?model=${encodeURIComponent(item.name)}`)}
          title={`Xem danh sách xe model ${item.name}`}
        >
          {item.vehicleCount.toLocaleString('vi-VN')} xe
        </button>
      ),
    },
    {
      key: 'status',
      title: 'Trạng thái',
      align: 'center',
      width: '120px',
      render: (item) => renderMasterDataStatusBadge(item.status),
    },
    {
      key: 'user',
      title: 'User',
      align: 'center',
      width: '70px',
      render: (item) => (
        <AuditUserPopover
          createdDate="14-03-2026"
          createdUser="admin"
          updatedDate="01-08-2026"
          updatedUser="admin"
          title={`Xem thông tin tạo/sửa của ${item.name}`}
        />
      ),
    },
    {
      key: 'actions',
      title: 'Tác vụ',
      align: 'center',
      width: '110px',
      render: (item) => (
        <TableRowActions
          onView={() => {
            setEditingModel(item);
            setModelForm({
              name: item.name,
              manufacturerId: item.manufacturerId,
              categoryHint: item.categoryHint || '',
            });
            setShowAddModelModal(true);
          }}
          onEdit={() => {
            setEditingModel(item);
            setModelForm({
              name: item.name,
              manufacturerId: item.manufacturerId,
              categoryHint: item.categoryHint || '',
            });
            setShowAddModelModal(true);
          }}
          onDelete={() => void handleDeleteModel(item.id, item.name)}
          viewTitle="Xem chi tiết model"
          editTitle="Sửa model"
          deleteTitle="Xóa model"
        />
      ),
    },
  ];

  const countryColumns: Column<any>[] = [
    {
      key: 'name',
      title: 'Tên Quốc gia / Xuất xứ',
      sortable: true,
      render: (item) => (
        <div className="text-xs">
          <span className="font-bold text-slate-900">{item.name}</span>
          <span className="font-mono text-[11px] text-slate-500 ml-1.5">({item.code})</span>
        </div>
      ),
    },
    {
      key: 'mfCount',
      title: 'Số Hãng sản xuất',
      align: 'center',
      sortable: true,
      width: '140px',
      render: (item) => (
        <button
          type="button"
          className="text-xs font-bold text-slate-900 hover:text-emerald-700 hover:underline cursor-pointer"
          onClick={() => {
            setActiveTab('manufacturers');
            setSearch(item.name);
          }}
          title={`Xem các hãng sản xuất từ ${item.name}`}
        >
          {item.mfCount.toLocaleString('vi-VN')} thương hiệu
        </button>
      ),
    },
    {
      key: 'vehicleCount',
      title: 'Tổng số MMTB nhập khẩu',
      align: 'center',
      sortable: true,
      width: '150px',
      render: (item) => (
        <button
          type="button"
          className="text-xs font-bold text-slate-900 hover:text-emerald-700 hover:underline cursor-pointer"
          onClick={() => navigate(`/doi-xe/ho-so-xe?origin=${encodeURIComponent(item.name)}`)}
          title={`Xem danh sách xe xuất xứ ${item.name}`}
        >
          {item.vehicleCount.toLocaleString('vi-VN')} phương tiện
        </button>
      ),
    },
  ];

  const simpleColumns = (
    target: CatalogTab,
    currentRows: Array<{ name: string; lat?: number; lng?: number; geofenceRadiusM?: number }>,
  ): Column<{ name: string; lat?: number; lng?: number; geofenceRadiusM?: number }>[] => [
    {
      key: 'select',
      title: (
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary cursor-pointer"
          checked={currentRows.length > 0 && currentRows.every((r) => selectedItems.includes(r.name))}
          onChange={(e) => {
            if (e.target.checked) setSelectedItems(currentRows.map((r) => r.name));
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
          checked={selectedItems.includes(item.name)}
          onChange={() => toggleSelectItem(item.name)}
        />
      ),
    },
    {
      key: 'name',
      title: 'Giá trị hiển thị trong danh mục',
      sortable: true,
      render: (item) => (
        <span className="font-bold text-xs text-slate-900">{item.name}</span>
      ),
    },
    {
      key: 'status',
      title: 'Trạng thái',
      width: '120px',
      align: 'center',
      render: (item: any) => renderMasterDataStatusBadge(item?.status),
    },
    ...(target === 'locations' ? [{
      key: 'coordinates',
      title: 'Tọa độ / vùng xác nhận',
      width: '190px',
      render: (item: { name: string; lat?: number; lng?: number; geofenceRadiusM?: number }) => item.lat !== undefined && item.lng !== undefined
        ? <span className="font-mono text-[11px] text-slate-700">{item.lat.toFixed(6)}, {item.lng.toFixed(6)}<small className="block font-sans text-slate-400">Bán kính {item.geofenceRadiusM || 300} m</small></span>
        : <span className="text-[11px] font-medium text-slate-500">Chưa khai báo tọa độ</span>,
    }] : []),
    {
      key: 'user',
      title: 'User',
      align: 'center',
      width: '70px',
      render: (item: { name: string }) => (
        <AuditUserPopover
          createdDate="14-03-2026"
          createdUser="admin"
          updatedDate="01-08-2026"
          updatedUser="admin"
          title={`Xem thông tin tạo/sửa của ${item.name}`}
        />
      ),
    },
    {
      key: 'actions',
      title: 'Tác vụ',
      align: 'center',
      width: '110px',
      render: (item) => (
        <TableRowActions
          onView={() => {
            const titles: Record<string, string> = {
              units: 'Đơn vị sử dụng',
              locations: 'Bãi / Nơi tập kết',
              purchaseConditions: 'Tình trạng mua sắm',
              suppliers: 'Nhà cung cấp',
              companyOwners: 'Pháp nhân sở hữu',
            };
            openSimpleEditModal(target, titles[target] || 'Xem danh mục', item.name);
          }}
          onEdit={() => {
            const titles: Record<string, string> = {
              units: 'Chỉnh sửa Đơn vị sử dụng',
              locations: 'Chỉnh sửa Bãi / Nơi tập kết',
              purchaseConditions: 'Chỉnh sửa Tình trạng mua sắm',
              suppliers: 'Chỉnh sửa Nhà cung cấp',
              companyOwners: 'Chỉnh sửa Pháp nhân sở hữu',
            };
            openSimpleEditModal(target, titles[target] || 'Chỉnh sửa danh mục', item.name);
          }}
          onDelete={() => handleDeleteSimpleItem(target, item.name)}
          viewTitle="Xem chi tiết"
          editTitle="Chỉnh sửa"
          deleteTitle="Xóa lựa chọn"
        />
      ),
    },
  ];

  const locationColumns: Column<MasterLocationItem>[] = [
    {
      key: 'select',
      title: (
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary cursor-pointer"
          checked={filteredLocationItems.length > 0 && filteredLocationItems.every((r) => selectedItems.includes(r.name))}
          onChange={(e) => {
            if (e.target.checked) setSelectedItems(filteredLocationItems.map((r) => r.name));
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
          checked={selectedItems.includes(item.name)}
          onChange={() => toggleSelectItem(item.name)}
        />
      ),
    },
    {
      key: 'complexName',
      title: 'Khu liên hợp',
      sortable: true,
      width: '210px',
      render: (item) => {
        const isKM = item.complexCode === 'KOUN_MOM' || (item.complexName && item.complexName.includes('Koun Mom'));
        const isSN = item.complexCode === 'SNOUL' || (item.complexName && item.complexName.includes('Snoul'));
        const isNL = item.complexCode === 'NAM_LAO' || (item.complexName && (item.complexName.includes('Nam Lào') || item.complexName.includes('Lào')));
        return (
          <span className="text-xs font-semibold text-slate-800">
            {item.complexName || (isKM ? 'Khu liên hợp Koun Mom' : isSN ? 'Khu liên hợp Snoul' : isNL ? 'Khu liên hợp Nam Lào' : 'Toàn KLH')}
          </span>
        );
      },
    },
    {
      key: 'name',
      title: 'Tên Bãi / Nơi tập kết phương tiện',
      sortable: true,
      render: (item) => (
        <span className="font-bold text-xs text-slate-900">{item.name}</span>
      ),
    },
    {
      key: 'regionName',
      title: 'Khu vực / Nông trường / Xí nghiệp',
      sortable: true,
      render: (item) => (
        <div>
          <span className="font-semibold text-xs text-slate-700 block">{item.regionName || 'Khu trung tâm'}</span>
          {item.address && <span className="text-[10px] text-slate-500 block">{item.address}</span>}
        </div>
      ),
    },
    {
      key: 'status',
      title: 'Trạng thái',
      width: '120px',
      align: 'center',
      render: (item: any) => renderMasterDataStatusBadge(item?.status ?? item?.active),
    },
    {
      key: 'user',
      title: 'User',
      align: 'center',
      width: '70px',
      render: (item) => (
        <AuditUserPopover
          createdDate="14-03-2026"
          createdUser="admin"
          updatedDate="01-08-2026"
          updatedUser="admin"
          title={`Xem thông tin tạo/sửa của ${item.name}`}
        />
      ),
    },
    {
      key: 'actions',
      title: 'Tác vụ',
      align: 'center',
      width: '110px',
      render: (item) => (
        <TableRowActions
          onView={() => openEditLocationModal(item)}
          onEdit={() => openEditLocationModal(item)}
          onDelete={() => handleDeleteLocation(item.name)}
          viewTitle="Xem chi tiết bãi tập kết"
          editTitle="Sửa bãi tập kết"
          deleteTitle="Xóa bãi tập kết"
        />
      ),
    },
  ];

  const filteredManagementAreas = useMemo(() => {
    return managementAreas.filter((a) => {
      const matchKlh = selectedLocationKlh === 'ALL' || a.complexCode === selectedLocationKlh;
      const matchRegion = selectedAreaRegion === 'ALL' || a.region.includes(selectedAreaRegion) || a.code.includes(selectedAreaRegion);
      if (!matchKlh || !matchRegion) return false;
      const q = search.trim().toLowerCase();
      if (!q) return true;
      return (
        a.code.toLowerCase().includes(q) ||
        a.name.toLowerCase().includes(q) ||
        a.region.toLowerCase().includes(q) ||
        (a.headOfficer && a.headOfficer.toLowerCase().includes(q)) ||
        (a.phone && a.phone.includes(q)) ||
        (a.depotLocation && a.depotLocation.toLowerCase().includes(q))
      );
    });
  }, [managementAreas, selectedLocationKlh, selectedAreaRegion, search]);

  const managementAreaColumns: Column<ManagementAreaItem>[] = [
    {
      key: 'code',
      title: 'MÃ KHU VỰC',
      width: '110px',
      align: 'center',
      render: (item) => <span className="font-mono text-xs font-semibold text-slate-800">{item.code}</span>,
    },
    {
      key: 'name',
      title: 'TÊN KHU VỰC QUẢN LÝ',
      sortable: true,
      render: (item) => (
        <div>
          <span className="font-extrabold text-xs text-slate-900">{item.name}</span>
          {item.description && <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">{item.description}</p>}
        </div>
      ),
    },
    {
      key: 'region',
      title: 'CỤM VÙNG / ĐỊA BÀN',
      sortable: true,
      render: (item) => (
        <span className="text-xs font-medium text-slate-800">
          {item.region}
        </span>
      ),
    },
    {
      key: 'headOfficer',
      title: 'ĐỘI TRƯỞNG / PHỤ TRÁCH',
      render: (item) => (
        <div>
          <span className="font-bold text-xs text-slate-900">{item.headOfficer || 'Chưa phân công'}</span>
          {item.phone && <span className="font-mono text-[10px] text-slate-500 block">{item.phone}</span>}
        </div>
      ),
    },
    {
      key: 'depotLocation',
      title: 'BÃI XE / NƠI TẬP KẾT',
      render: (item) => (
        <span className="text-xs text-slate-700 font-medium">{item.depotLocation || '—'}</span>
      ),
    },
    {
      key: 'assignedVehiclesCount',
      title: 'SỐ XE TRỰC THUỘC',
      align: 'center',
      width: '130px',
      render: (item) => (
        <span className="text-xs font-semibold text-slate-900">
          {item.assignedVehiclesCount || 0} xe
        </span>
      ),
    },
    {
      key: 'status',
      title: 'Trạng thái',
      align: 'center',
      width: '110px',
      render: (item) => renderMasterDataStatusBadge(item.status),
    },
    {
      key: 'actions',
      title: 'Tác vụ',
      align: 'center',
      width: '100px',
      render: (item) => (
        <TableRowActions
          onView={() => openEditAreaModal(item)}
          onEdit={() => openEditAreaModal(item)}
          onDelete={() => handleDeleteArea(item.id, item.name)}
          viewTitle="Xem chi tiết khu vực"
          editTitle="Sửa khu vực"
          deleteTitle="Xóa khu vực"
        />
      ),
    },
  ];

  const filteredCgManagers = useMemo(() => {
    return cgManagers.filter((m) => {
      const q = search.trim().toLowerCase();
      if (!q) return true;
      return (
        m.unitName.toLowerCase().includes(q) ||
        (m.enterpriseName && m.enterpriseName.toLowerCase().includes(q)) ||
        (m.managementArea && m.managementArea.toLowerCase().includes(q)) ||
        m.managerName.toLowerCase().includes(q) ||
        m.phone.includes(q) ||
        m.location.toLowerCase().includes(q) ||
        m.klhCode?.toLowerCase().includes(q)
      );
    });
  }, [cgManagers, search]);

  const cgManagerColumns: Column<CGManagerItem>[] = [
    {
      key: 'id',
      title: 'MÃ NS',
      width: '85px',
      align: 'center',
      render: (item) => <span className="text-xs font-mono font-bold text-slate-600">{item.id}</span>,
    },
    {
      key: 'managerName',
      title: 'HỌ & TÊN NS QUẢN LÝ',
      sortable: true,
      render: (item) => (
        <div>
          <span className="font-extrabold text-xs text-slate-900">{item.managerName || '—'}</span>
          <span className="text-[10px] text-slate-500 block mt-0.5">
            Quản lý xe, tài xế & Lập lệnh điều xe
          </span>
        </div>
      ),
    },
    {
      key: 'enterpriseName',
      title: 'XÍ NGHIỆP TRỰC THUỘC',
      sortable: true,
      render: (item) => (
        <span className="font-semibold text-xs text-slate-900">{item.enterpriseName || item.unitName}</span>
      ),
    },
    {
      key: 'managementArea',
      title: 'KHU VỰC QUẢN LÝ',
      sortable: true,
      render: (item) => (
        <span className="text-xs text-slate-800 font-medium">
          {item.managementArea || 'Khu vực Daun Penh (DP)'}
        </span>
      ),
    },
    {
      key: 'phone',
      title: 'SỐ ZALO / ĐIỆN THOẠI',
      render: (item) => (
        <span className="font-mono text-xs font-semibold text-slate-800">
          {item.phone || '—'}
        </span>
      ),
    },
    {
      key: 'location',
      title: 'ĐỊA CHỈ (BÃI XE / LÔ)',
      sortable: true,
      render: (item) => (
        <span className="text-xs text-slate-700 font-medium">{item.location || '—'}</span>
      ),
    },
    {
      key: 'klhCode',
      title: 'KLH',
      width: '110px',
      align: 'center',
      render: (item) => <span className="text-xs font-semibold text-slate-700">{item.klhCode || 'KOUN_MOM'}</span>,
    },
    {
      key: 'status',
      title: 'Trạng thái',
      width: '110px',
      align: 'center',
      render: (item: any) => renderMasterDataStatusBadge(item?.status ?? item?.active),
    },
    {
      key: 'actions',
      title: 'Tác vụ',
      align: 'center',
      width: '90px',
      render: (item) => (
        <TableRowActions
          onView={() => openEditCgManagerModal(item)}
          onEdit={() => openEditCgManagerModal(item)}
          onDelete={() => handleDeleteCgManager(item.id)}
          viewTitle="Xem chi tiết nhân sự"
          editTitle="Sửa nhân sự"
          deleteTitle="Xóa nhân sự"
        />
      ),
    },
  ];

  return (
    <div className="space-y-5">

      {/* ═══ 1. HÀNG THẺ DANH MỤC & PHÂN HỆ CHI TIẾT ═══ */}
      <div className="grid gap-2.5 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-9">
        {/* THẺ 1: XE CƠ GIỚI TỰ HÀNH */}
        <button
          type="button"
          onClick={() => {
            handleTabChange('types');
            setSubsystemFilter('FLEET');
          }}
          className={`rounded-2xl border p-3 text-left transition-all hover:shadow-md cursor-pointer flex flex-col justify-between ${
            activeTab === 'types' && subsystemFilter === 'FLEET'
              ? 'border-blue-500 bg-blue-50/50 ring-2 ring-blue-500/20 shadow-xs'
              : 'border-slate-200 bg-white hover:border-blue-300 hover:bg-slate-50'
          }`}
        >
          <div>
            <div className="flex items-center justify-between gap-1">
              <span className="text-[11px] font-bold text-blue-700 truncate">Xe tự hành (Hồ sơ xe)</span>
              <div className="rounded-lg p-1 shrink-0 text-blue-700 bg-blue-50 border border-blue-200">
                <Tractor className="h-3.5 w-3.5" />
              </div>
            </div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-lg font-black text-slate-900 font-mono">
                {subsystemStats.fleetTypesCount}
              </span>
            </div>
          </div>
          <p className="mt-1.5 text-[10px] text-slate-500 line-clamp-2 leading-tight">
            Máy đào, ủi, lu, san, cày, ben, tải...
          </p>
        </button>

        {/* THẺ 2: THIẾT BỊ & NÔNG CỤ PHỤ TRỢ */}
        <button
          type="button"
          onClick={() => {
            handleTabChange('implements');
            setSubsystemFilter('EQUIPMENT');
          }}
          className={`rounded-2xl border p-3 text-left transition-all hover:shadow-md cursor-pointer flex flex-col justify-between ${
            activeTab === 'implements' || (activeTab === 'types' && subsystemFilter === 'EQUIPMENT')
              ? 'border-emerald-500 bg-emerald-50/50 ring-2 ring-emerald-500/20 shadow-xs'
              : 'border-slate-200 bg-white hover:border-emerald-300 hover:bg-slate-50'
          }`}
        >
          <div>
            <div className="flex items-center justify-between gap-1">
              <span className="text-[11px] font-bold text-emerald-700 truncate">Thiết bị & Nông cụ</span>
              <div className="rounded-lg p-1 shrink-0 text-emerald-700 bg-emerald-50 border border-emerald-200">
                <Combine className="h-3.5 w-3.5" />
              </div>
            </div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-lg font-black text-slate-900 font-mono">
                {implementCategories.length}
              </span>
            </div>
          </div>
          <p className="mt-1.5 text-[10px] text-slate-500 line-clamp-2 leading-tight">
            Dàn cày, bừa, xới, rải phân, phun thuốc, moóc...
          </p>
        </button>

        {/* THẺ 3: MÁY PHỤ TRỢ & TÀI SẢN KHÁC */}
        <button
          type="button"
          onClick={() => {
            handleTabChange('types');
            setSubsystemFilter('OTHER_ASSETS');
          }}
          className={`rounded-2xl border p-3 text-left transition-all hover:shadow-md cursor-pointer flex flex-col justify-between ${
            activeTab === 'types' && subsystemFilter === 'OTHER_ASSETS'
              ? 'border-purple-500 bg-purple-50/50 ring-2 ring-purple-500/20 shadow-xs'
              : 'border-slate-200 bg-white hover:border-purple-300 hover:bg-slate-50'
          }`}
        >
          <div>
            <div className="flex items-center justify-between gap-1">
              <span className="text-[11px] font-bold text-purple-700 truncate">Máy phụ trợ & Khác</span>
              <div className="rounded-lg p-1 shrink-0 text-purple-700 bg-purple-50 border border-purple-200">
                <Boxes className="h-3.5 w-3.5" />
              </div>
            </div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-lg font-black text-slate-900 font-mono">
                {subsystemStats.otherTypesCount}
              </span>
            </div>
          </div>
          <p className="mt-1.5 text-[10px] text-slate-500 line-clamp-2 leading-tight">
            Máy phát cỏ, xe máy, phát điện, xe nâng, cưa, bơm...
          </p>
        </button>

        {/* THẺ 4: HÃNG SẢN XUẤT */}
        <button
          type="button"
          onClick={() => handleTabChange('manufacturers')}
          className={`rounded-2xl border p-3 text-left transition-all hover:shadow-md cursor-pointer flex flex-col justify-between ${
            activeTab === 'manufacturers'
              ? 'border-sky-500 bg-sky-50/50 ring-2 ring-sky-500/20 shadow-xs'
              : 'border-slate-200 bg-white hover:border-sky-300 hover:bg-slate-50'
          }`}
        >
          <div>
            <div className="flex items-center justify-between gap-1">
              <span className="text-[11px] font-bold text-slate-600 truncate">Hãng sản xuất</span>
              <div className="rounded-lg p-1 shrink-0 text-sky-700 bg-sky-50 border border-sky-200">
                <Tag className="h-3.5 w-3.5" />
              </div>
            </div>
            <div className="mt-1 text-lg font-black text-slate-900 font-mono">
              {manufacturers.length.toLocaleString('vi-VN')}
            </div>
          </div>
          <p className="mt-1.5 text-[10px] text-slate-500 line-clamp-1 leading-tight">
            Kobelco, Komatsu, John Deere, Howo...
          </p>
        </button>

        {/* THẺ 5: MODEL XE & MMTB */}
        <button
          type="button"
          onClick={() => handleTabChange('models')}
          className={`rounded-2xl border p-3 text-left transition-all hover:shadow-md cursor-pointer flex flex-col justify-between ${
            activeTab === 'models'
              ? 'border-violet-500 bg-violet-50/50 ring-2 ring-violet-500/20 shadow-xs'
              : 'border-slate-200 bg-white hover:border-violet-300 hover:bg-slate-50'
          }`}
        >
          <div>
            <div className="flex items-center justify-between gap-1">
              <span className="text-[11px] font-bold text-slate-600 truncate">Model MMTB</span>
              <div className="rounded-lg p-1 shrink-0 text-violet-700 bg-violet-50 border border-violet-200">
                <Table className="h-3.5 w-3.5" />
              </div>
            </div>
            <div className="mt-1 text-lg font-black text-slate-900 font-mono">
              {models.length.toLocaleString('vi-VN')}
            </div>
          </div>
          <p className="mt-1.5 text-[10px] text-slate-500 line-clamp-1 leading-tight">
            SK200, D31P, 6140B, HD270, CG411...
          </p>
        </button>

        {/* THẺ 6: QUỐC GIA XUẤT XỨ */}
        <button
          type="button"
          onClick={() => handleTabChange('origins')}
          className={`rounded-2xl border p-3 text-left transition-all hover:shadow-md cursor-pointer flex flex-col justify-between ${
            activeTab === 'origins'
              ? 'border-amber-500 bg-amber-50/50 ring-2 ring-amber-500/20 shadow-xs'
              : 'border-slate-200 bg-white hover:border-amber-300 hover:bg-slate-50'
          }`}
        >
          <div>
            <div className="flex items-center justify-between gap-1">
              <span className="text-[11px] font-bold text-slate-600 truncate">Xuất xứ</span>
              <div className="rounded-lg p-1 shrink-0 text-amber-700 bg-amber-50 border border-amber-200">
                <Globe className="h-3.5 w-3.5" />
              </div>
            </div>
            <div className="mt-1 text-lg font-black text-slate-900 font-mono">
              {countryStats.length.toLocaleString('vi-VN')}
            </div>
          </div>
          <p className="mt-1.5 text-[10px] text-slate-500 line-clamp-1 leading-tight">
            Nhật Bản, Mỹ, Trung Quốc, Đức, VN...
          </p>
        </button>

        {/* THẺ 7: TÌNH TRẠNG MUA */}
        <button
          type="button"
          onClick={() => handleTabChange('purchaseConditions')}
          className={`rounded-2xl border p-3 text-left transition-all hover:shadow-md cursor-pointer flex flex-col justify-between ${
            activeTab === 'purchaseConditions'
              ? 'border-orange-500 bg-orange-50/50 ring-2 ring-orange-500/20 shadow-xs'
              : 'border-slate-200 bg-white hover:border-orange-300 hover:bg-slate-50'
          }`}
        >
          <div>
            <div className="flex items-center justify-between gap-1">
              <span className="text-[11px] font-bold text-slate-600 truncate">Tình trạng mua</span>
              <div className="rounded-lg p-1 shrink-0 text-orange-700 bg-orange-50 border border-orange-200">
                <ShoppingCart className="h-3.5 w-3.5" />
              </div>
            </div>
            <div className="mt-1 text-lg font-black text-slate-900 font-mono">
              {purchaseConditions.length.toLocaleString('vi-VN')}
            </div>
          </div>
          <p className="mt-1.5 text-[10px] text-slate-500 line-clamp-1 leading-tight">
            Mua mới, Đã qua SD, Thuê ngoài...
          </p>
        </button>

        {/* THẺ 8: NHÀ CUNG CẤP */}
        <button
          type="button"
          onClick={() => handleTabChange('suppliers')}
          className={`rounded-2xl border p-3 text-left transition-all hover:shadow-md cursor-pointer flex flex-col justify-between ${
            activeTab === 'suppliers'
              ? 'border-teal-500 bg-teal-50/50 ring-2 ring-teal-500/20 shadow-xs'
              : 'border-slate-200 bg-white hover:border-teal-300 hover:bg-slate-50'
          }`}
        >
          <div>
            <div className="flex items-center justify-between gap-1">
              <span className="text-[11px] font-bold text-slate-600 truncate">Nhà cung cấp</span>
              <div className="rounded-lg p-1 shrink-0 text-teal-700 bg-teal-50 border border-teal-200">
                <Layers className="h-3.5 w-3.5" />
              </div>
            </div>
            <div className="mt-1 text-lg font-black text-slate-900 font-mono">
              {suppliers.length.toLocaleString('vi-VN')}
            </div>
          </div>
          <p className="mt-1.5 text-[10px] text-slate-500 line-clamp-1 leading-tight">
            Tập đoàn Thaco, Chu Lai, đối tác...
          </p>
        </button>

        {/* THẺ 9: PHÁP NHÂN SỞ HỮU */}
        <button
          type="button"
          onClick={() => handleTabChange('companyOwners')}
          className={`rounded-2xl border p-3 text-left transition-all hover:shadow-md cursor-pointer flex flex-col justify-between ${
            activeTab === 'companyOwners'
              ? 'border-indigo-500 bg-indigo-50/50 ring-2 ring-indigo-500/20 shadow-xs'
              : 'border-slate-200 bg-white hover:border-indigo-300 hover:bg-slate-50'
          }`}
        >
          <div>
            <div className="flex items-center justify-between gap-1">
              <span className="text-[11px] font-bold text-indigo-700 truncate">Pháp nhân sở hữu</span>
              <div className="rounded-lg p-1 shrink-0 text-indigo-700 bg-indigo-50 border border-indigo-200">
                <Building2 className="h-3.5 w-3.5" />
              </div>
            </div>
            <div className="mt-1 text-lg font-black text-slate-900 font-mono">
              {companyOwners.length.toLocaleString('vi-VN')}
            </div>
          </div>
          <p className="mt-1.5 text-[10px] text-slate-500 line-clamp-1 leading-tight">
            THACO AGRI, DP, LP, Bò AD...
          </p>
        </button>
      </div>

      {/* 3. MAIN TABLE CONTAINER */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-4">
        {/* ACTION & CONTEXT FILTER TOOLBAR: BỘ LỌC Ở TRÊN - HÀNG DƯỚI LÀ CÁC BUTTON */}
        <div className="space-y-3 border-b border-slate-100 pb-3">
          {/* HÀNG TRÊN: BỘ LỌC (SEARCH & BỘ LỌC PHÂN HỆ, DROPDOWNS XẾP ĐỀU GRID) */}
          {activeTab === 'types' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-center">
              {/* Search Input */}
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  className="h-9 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 py-2 text-xs text-slate-800 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 placeholder:text-slate-400"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Tìm kiếm trong danh mục..."
                />
              </div>

              {/* Subsystem Filter Dropdown */}
              <div className="w-full">
                <SearchableSelect
                  className="w-full"
                  heightClass="h-9"
                  roundedClass="rounded-xl"
                  bgClass="bg-white"
                  emptyOptionLabel={`Tất cả phân hệ (${types.length})`}
                  emptyValue="ALL"
                  value={subsystemFilter}
                  onChange={(val) => setSubsystemFilter((val || 'ALL') as 'ALL' | 'FLEET' | 'EQUIPMENT' | 'OTHER_ASSETS')}
                  options={[
                    { value: 'FLEET', label: `Hồ sơ xe (${types.filter((t) => getVehicleTypeSubsystem(t) === 'FLEET').length})` },
                    { value: 'EQUIPMENT', label: `Thiết bị phụ trợ (${types.filter((t) => getVehicleTypeSubsystem(t) === 'EQUIPMENT').length})` },
                    { value: 'OTHER_ASSETS', label: `Tài sản khác (${types.filter((t) => getVehicleTypeSubsystem(t) === 'OTHER_ASSETS').length})` },
                  ]}
                />
              </div>

              {/* Asset Group Dropdown */}
              <div className="w-full">
                <SearchableSelect
                  className="w-full"
                  heightClass="h-9"
                  roundedClass="rounded-xl"
                  bgClass="bg-white"
                  emptyOptionLabel="Tất cả nhóm tài sản"
                  emptyValue="ALL"
                  value={assetGroupFilter}
                  onChange={(val) => setAssetGroupFilter(val || 'ALL')}
                  options={Object.entries(GROUP_LABELS).map(([k, v]) => ({ value: k, label: v }))}
                />
              </div>

              {/* Status Dropdown */}
              <div className="w-full">
                <SearchableSelect
                  className="w-full"
                  heightClass="h-9"
                  roundedClass="rounded-xl"
                  bgClass="bg-white"
                  emptyOptionLabel="Tất cả trạng thái"
                  emptyValue="ALL"
                  value={typeStatusFilter}
                  onChange={(val) => setTypeStatusFilter(val || 'ALL')}
                  options={[
                    { value: 'ACTIVE', label: 'Còn hoạt động' },
                    { value: 'INACTIVE', label: 'Ngưng hoạt động' },
                  ]}
                />
              </div>
            </div>
          )}

          {/* Implements Filter Toolbar */}
          {activeTab === 'implements' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  className="h-9 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 py-2 text-xs text-slate-800 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 placeholder:text-slate-400"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Tìm kiếm chủng loại thiết bị & nông cụ..."
                />
              </div>
              <div className="w-full">
                <SearchableSelect
                  className="w-full"
                  heightClass="h-9"
                  roundedClass="rounded-xl"
                  bgClass="bg-white"
                  emptyOptionLabel="Tất cả nhóm chức năng"
                  emptyValue="ALL"
                  value={functionalGroupFilter}
                  onChange={(val) => setFunctionalGroupFilter(val || 'ALL')}
                  options={Array.from(new Set(implementCategories.map((it) => it.functionalGroup).filter(Boolean))).map((fg) => ({
                    value: fg,
                    label: fg,
                  }))}
                />
              </div>
            </div>
          )}

          {/* Manufacturer Dropdown for Models */}
          {activeTab === 'models' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 items-center">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  className="h-9 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 py-2 text-xs text-slate-800 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 placeholder:text-slate-400"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Tìm kiếm model xe & MMTB..."
                />
              </div>
              <div className="w-full">
                <SearchableSelect
                  className="w-full"
                  heightClass="h-9"
                  roundedClass="rounded-xl"
                  bgClass="bg-white"
                  emptyOptionLabel={`Tất cả hãng (${manufacturers.length})`}
                  emptyValue="ALL"
                  value={selectedMfFilter}
                  onChange={(val) => setSelectedMfFilter(val || 'ALL')}
                  options={manufacturers.map((mf) => ({
                    value: String(mf.id),
                    label: `${mf.name}${mf.countryName ? ` (${mf.countryName})` : ''}`,
                  }))}
                />
              </div>
              <div className="w-full">
                <SearchableSelect
                  className="w-full"
                  heightClass="h-9"
                  roundedClass="rounded-xl"
                  bgClass="bg-white"
                  emptyOptionLabel="Tất cả trạng thái"
                  emptyValue="ALL"
                  value={modelStatusFilter}
                  onChange={(val) => setModelStatusFilter(val || 'ALL')}
                  options={[
                    { value: 'ACTIVE', label: 'Còn hoạt động' },
                    { value: 'INACTIVE', label: 'Ngưng hoạt động' },
                  ]}
                />
              </div>
            </div>
          )}

          {activeTab !== 'types' && activeTab !== 'implements' && activeTab !== 'models' && (
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                className="h-9 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 py-2 text-xs text-slate-800 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 placeholder:text-slate-400"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm kiếm trong danh mục..."
              />
            </div>
          )}

          {/* HÀNG DƯỚI: CÁC BUTTON TÁC VỤ */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-slate-100/80">
            {/* Bên trái: Thông tin chọn / Badge */}
            <div className="flex items-center gap-2">
              {selectedItems.length > 0 ? (
                <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
                  Đã chọn {selectedItems.length} mục
                </span>
              ) : (
                <span className="text-xs font-semibold text-slate-500">
                  Danh mục đang xem: <b className="text-slate-800 font-bold">{
                    activeTab === 'types'
                      ? subsystemFilter === 'FLEET'
                        ? 'Chủng loại Xe cơ giới tự hành'
                        : subsystemFilter === 'EQUIPMENT'
                        ? 'Chủng loại Thiết bị phụ trợ'
                        : subsystemFilter === 'OTHER_ASSETS'
                        ? 'Chủng loại Máy phụ trợ & Tài sản khác'
                        : 'Tất cả 22 Chủng loại MMTB'
                      : activeTab === 'implements'
                      ? 'Chủng loại Thiết bị & Nông cụ'
                      : activeTab === 'manufacturers'
                      ? 'Danh mục Hãng sản xuất'
                      : activeTab === 'models'
                      ? 'Danh mục Model xe & MMTB'
                      : activeTab === 'origins'
                      ? 'Danh mục Quốc gia xuất xứ'
                      : activeTab === 'purchaseConditions'
                      ? 'Danh mục Tình trạng mua sắm'
                      : activeTab === 'suppliers'
                      ? 'Danh mục Nhà cung cấp'
                      : activeTab === 'companyOwners'
                      ? 'Danh mục Pháp nhân sở hữu'
                      : 'Danh mục dùng chung'
                  }</b>
                </span>
              )}
            </div>

            {/* Bên phải: Action Buttons */}
            <div className="flex flex-wrap items-center gap-2 ml-auto">
              {selectedItems.length > 0 && (
                <Button
                  variant="primary"
                  size="sm"
                  className="h-9 text-xs font-extrabold bg-emerald-600 hover:bg-emerald-700 border-none shadow-sm animate-pulse cursor-pointer"
                  icon={<Combine className="h-3.5 w-3.5" />}
                  onClick={() => {
                    setMergeTargetName(selectedItems[0] || '');
                    setShowMergeModal(true);
                  }}
                >
                  🔀 Gộp {selectedItems.length} mục đã chọn
                </Button>
              )}

              <Button
                variant="outline"
                size="sm"
                className="h-9 text-xs font-bold border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 cursor-pointer"
                icon={<RefreshCw className="h-3.5 w-3.5 text-slate-600" />}
                onClick={() => {
                  void loadTypes();
                  void loadImplementsSummary();
                  void loadManufacturers();
                  void loadModels();
                  void loadFilterOptions();
                  setSelectedItems([]);
                }}
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

              {activeTab === 'types' && (
                <Button
                  size="sm"
                  className="h-9 text-xs font-bold bg-[#154E2C] hover:bg-[#103d22] text-[#B8D83D] cursor-pointer shadow-xs"
                  icon={<Plus className="h-3.5 w-3.5" />}
                  onClick={() => {
                    setEditingType(null);
                    setTypeForm(EMPTY_TYPE_FORM);
                    setShowAddTypeModal(true);
                  }}
                >
                  Thêm chủng loại
                </Button>
              )}

              {activeTab === 'implements' && (
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    className="h-9 text-xs font-bold bg-[#154E2C] hover:bg-[#103d22] text-[#B8D83D] cursor-pointer shadow-xs"
                    icon={<Plus className="h-3.5 w-3.5" />}
                    onClick={() => {
                      setEditingImplement(null);
                      setImplementForm({
                        code: `TB-${Date.now().toString().slice(-4)}`,
                        name: '',
                        functionalGroup: 'Máy làm đất & Làm tơi xốp',
                        compatibleVehicles: 'Máy kéo nông nghiệp',
                        defaultMaintenanceHours: '250',
                        description: '',
                      });
                      setShowImplementModal(true);
                    }}
                  >
                    Thêm chủng loại thiết bị
                  </Button>
                  <Button
                    size="sm"
                    className="h-9 text-xs font-bold bg-teal-50 border border-teal-200 text-teal-800 hover:bg-teal-100 cursor-pointer"
                    icon={<ExternalLink className="h-3.5 w-3.5" />}
                    onClick={() => navigate('/doi-xe/thiet-bi')}
                  >
                    Quản lý hồ sơ {totalImplementsCount.toLocaleString('vi-VN')} thiết bị
                  </Button>
                </div>
              )}

              {activeTab === 'manufacturers' && (
                <Button
                  size="sm"
                  className="h-9 text-xs font-bold bg-[#154E2C] hover:bg-[#103d22] text-[#B8D83D] cursor-pointer shadow-xs"
                  icon={<Plus className="h-3.5 w-3.5" />}
                  onClick={() => {
                    setEditingMf(null);
                    setMfForm(EMPTY_MANUFACTURER_FORM);
                    setShowAddMfModal(true);
                  }}
                >
                  Thêm hãng sản xuất
                </Button>
              )}

              {activeTab === 'models' && (
                <Button
                  size="sm"
                  className="h-9 text-xs font-bold bg-[#154E2C] hover:bg-[#103d22] text-[#B8D83D] cursor-pointer shadow-xs"
                  icon={<Plus className="h-3.5 w-3.5" />}
                  onClick={() => {
                    setEditingModel(null);
                    setModelForm(EMPTY_MODEL_FORM);
                    setShowAddModelModal(true);
                  }}
                >
                  Thêm model MMTB
                </Button>
              )}

              {activeTab === 'origins' && (
                <Button
                  size="sm"
                  className="h-9 text-xs font-bold bg-[#154E2C] hover:bg-[#103d22] text-[#B8D83D] cursor-pointer shadow-xs"
                  icon={<Plus className="h-3.5 w-3.5" />}
                  onClick={() => openSimpleAddModal('origins', 'Thêm Quốc gia xuất xứ')}
                >
                  Thêm quốc gia xuất xứ
                </Button>
              )}

              {activeTab === 'purchaseConditions' && (
                <Button
                  size="sm"
                  className="h-9 text-xs font-bold bg-[#154E2C] hover:bg-[#103d22] text-[#B8D83D] cursor-pointer shadow-xs"
                  icon={<Plus className="h-3.5 w-3.5" />}
                  onClick={() => openSimpleAddModal('purchaseConditions', 'Thêm Tình trạng mua')}
                >
                  Thêm tình trạng mua
                </Button>
              )}

              {activeTab === 'suppliers' && (
                <Button
                  size="sm"
                  className="h-9 text-xs font-bold bg-[#154E2C] hover:bg-[#103d22] text-[#B8D83D] cursor-pointer shadow-xs"
                  icon={<Plus className="h-3.5 w-3.5" />}
                  onClick={() => openSimpleAddModal('suppliers', 'Thêm Nhà cung cấp')}
                >
                  Thêm nhà cung cấp
                </Button>
              )}

              {activeTab === 'companyOwners' && (
                <Button
                  size="sm"
                  className="h-9 text-xs font-bold bg-[#154E2C] hover:bg-[#103d22] text-[#B8D83D] cursor-pointer shadow-xs"
                  icon={<Plus className="h-3.5 w-3.5" />}
                  onClick={() => openSimpleAddModal('companyOwners', 'Thêm Pháp nhân sở hữu')}
                >
                  Thêm pháp nhân
                </Button>
              )}
              {activeTab === 'units' && (
                <Button size="sm" className="h-9 text-xs font-bold bg-[#154E2C] hover:bg-[#103d22] text-[#B8D83D] cursor-pointer shadow-xs" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => openSimpleAddModal('units', 'Thêm Xí nghiệp / Đơn vị')}>
                  Thêm xí nghiệp
                </Button>
              )}
              {activeTab === 'managementAreas' && (
                <Button size="sm" className="h-9 text-xs font-bold bg-[#154E2C] hover:bg-[#103d22] text-[#B8D83D] cursor-pointer shadow-xs" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => openAddAreaModal()}>
                  Thêm khu vực quản lý
                </Button>
              )}
              {activeTab === 'locations' && (
                <Button size="sm" className="h-9 text-xs font-bold bg-[#154E2C] hover:bg-[#103d22] text-[#B8D83D] cursor-pointer shadow-xs" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => openAddLocationModal()}>
                  Thêm nơi tập kết
                </Button>
              )}
              {activeTab === 'cgManagers' && (
                <Button size="sm" className="h-9 text-xs font-bold bg-[#154E2C] hover:bg-[#103d22] text-[#B8D83D] cursor-pointer shadow-xs" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => openAddCgManagerModal()}>
                  Thêm NS quản lý
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* TAB 1: VEHICLE TYPES */}
        {activeTab === 'types' && (
          <div className="overflow-x-auto">
            <DataTable
              data={filteredTypes}
              columns={typeColumns}
              isLoading={typesLoading}
              pageSize={20}
              showSearch={false}
              showExport={false}
              useGlobalFilters={false}
            />
          </div>
        )}

        {/* TAB 1.5: IMPLEMENTS (CHỦNG LOẠI THIẾT BỊ & NÔNG CỤ) */}
        {activeTab === 'implements' && (
          <div className="overflow-x-auto">
            <DataTable
              data={filteredImplements}
              columns={implementColumns}
              isLoading={implementsLoading}
              pageSize={20}
              showSearch={false}
              showExport={false}
              useGlobalFilters={false}
            />
          </div>
        )}

        {/* TAB 2: MANUFACTURERS */}
        {activeTab === 'manufacturers' && (
          <div className="overflow-x-auto">
            <DataTable
              data={filteredManufacturers}
              columns={mfColumns}
              isLoading={mfLoading}
              pageSize={20}
              showSearch={false}
              showExport={false}
              useGlobalFilters={false}
            />
          </div>
        )}

        {/* TAB 3: MODELS */}
        {activeTab === 'models' && (
          <div className="overflow-x-auto">
            <DataTable
              data={filteredModels}
              columns={modelColumns}
              isLoading={modelsLoading}
              pageSize={20}
              showSearch={false}
              showExport={false}
              useGlobalFilters={false}
            />
          </div>
        )}

        {/* TAB 4: ORIGINS */}
        {activeTab === 'origins' && (
          <div className="overflow-x-auto">
            <DataTable
              data={countryStats}
              columns={countryColumns}
              pageSize={20}
              showSearch={false}
              showExport={false}
              useGlobalFilters={false}
            />
          </div>
        )}

        {/* TAB 5: UNITS (XÍ NGHIỆP & ĐƠN VỊ) */}
        {activeTab === 'units' && (
          <div className="overflow-x-auto">
            <DataTable
              data={unitRows}
              columns={simpleColumns('units', unitRows)}
              pageSize={20}
              showSearch={false}
              showExport={false}
              useGlobalFilters={false}
            />
          </div>
        )}

        {/* TAB 5.5: MANAGEMENT AREAS (KHU VỰC QUẢN LÝ RIÊNG BIỆT) */}
        {activeTab === 'managementAreas' && (
          <div className="space-y-3">
            {/* Thanh lọc Cụm vùng / Khu vực nhanh */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-700" />
                <span className="text-xs font-bold text-slate-700">Lọc theo Cụm vùng quản lý:</span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  { code: 'ALL', label: 'Tất cả Cụm vùng' },
                  { code: 'DP', label: 'Cụm Daun Penh (DP)' },
                  { code: 'LP', label: 'Cụm Lumphat (LP)' },
                  { code: 'AD', label: 'Cụm Andong Meas (AD)' },
                  { code: 'KLH', label: 'Khối Văn phòng KLH' },
                ].map((reg) => (
                  <button
                    key={reg.code}
                    type="button"
                    onClick={() => setSelectedAreaRegion(reg.code)}
                    className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      selectedAreaRegion === reg.code
                        ? 'bg-emerald-800 text-white shadow-xs'
                        : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {reg.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-emerald-50 border border-emerald-200">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-emerald-700 shrink-0" />
                <div>
                  <div className="text-xs font-bold text-emerald-900">
                    Khu vực quản lý & Bãi xe đã có trang quản trị chuyên biệt!
                  </div>
                  <div className="text-[11px] text-emerald-700">
                    Xem phân bổ theo Cụm Daun Penh, Lumphat, Andong Meas và Văn phòng KLH.
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => navigate('/danh-muc/quan-ly-co-gioi?tab=areas')}
                className="inline-flex items-center gap-1.5 text-xs font-bold bg-emerald-800 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-900 shadow-xs cursor-pointer"
              >
                Mở trang chuyên trách <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <DataTable
                data={filteredManagementAreas}
                columns={managementAreaColumns}
                pageSize={20}
                showSearch={false}
                showExport={false}
                useGlobalFilters={false}
              />
            </div>
          </div>
        )}

        {/* TAB 6: LOCATIONS */}
        {activeTab === 'locations' && (
          <div className="space-y-3">
            {/* Thanh lọc Khu liên hợp nhanh cho Bãi tập kết */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-emerald-700" />
                <span className="text-xs font-bold text-slate-700">Lọc theo Khu liên hợp:</span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  { code: 'ALL', label: 'Tất cả Khu liên hợp' },
                  { code: 'KOUN_MOM', label: 'KLH Koun Mom' },
                  { code: 'SNOUL', label: 'KLH Snoul' },
                  { code: 'NAM_LAO', label: 'KLH Nam Lào' },
                ].map((klh) => (
                  <button
                    key={klh.code}
                    type="button"
                    onClick={() => setSelectedLocationKlh(klh.code)}
                    className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      (selectedLocationKlh === klh.code || (selectedLocationKlh === 'ALL' && klh.code === 'ALL'))
                        ? 'bg-emerald-800 text-white shadow-xs'
                        : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {klh.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto">
              <DataTable
                data={filteredLocationItems}
                columns={locationColumns}
                pageSize={20}
                showSearch={false}
                showExport={false}
                useGlobalFilters={false}
              />
            </div>
          </div>
        )}

        {/* TAB 7: CG MANAGERS */}
        {activeTab === 'cgManagers' && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-emerald-50 border border-emerald-200">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-700 shrink-0" />
                <div>
                  <div className="text-xs font-bold text-emerald-900">
                    Menu Quản lý Cơ giới & Khu vực phụ trách đã được tách riêng vào Menu chính!
                  </div>
                  <div className="text-[11px] text-emerald-700">
                    Bao gồm quản lý người phụ trách, khu vực bãi xe, số lượng xe, tài xế và quy trình lập lệnh điều xe.
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => navigate('/danh-muc/quan-ly-co-gioi?tab=managers')}
                className="inline-flex items-center gap-1.5 text-xs font-bold bg-emerald-800 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-900 shadow-xs cursor-pointer"
              >
                Mở trang chuyên trách <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <DataTable
                data={filteredCgManagers}
                columns={cgManagerColumns}
                isLoading={cgManagersLoading}
                pageSize={25}
                showSearch={false}
                showExport={false}
                useGlobalFilters={false}
              />
            </div>
          </div>
        )}

        {/* TAB 8: PURCHASE CONDITIONS */}
        {activeTab === 'purchaseConditions' && (
          <div className="overflow-x-auto">
            <DataTable
              data={conditionRows}
              columns={simpleColumns('purchaseConditions', conditionRows)}
              pageSize={20}
              showSearch={false}
              showExport={false}
              useGlobalFilters={false}
            />
          </div>
        )}

        {/* TAB 9: SUPPLIERS */}
        {activeTab === 'suppliers' && (
          <div className="overflow-x-auto">
            <DataTable
              data={supplierRows}
              columns={simpleColumns('suppliers', supplierRows)}
              pageSize={20}
              showSearch={false}
              showExport={false}
              useGlobalFilters={false}
            />
          </div>
        )}

        {/* TAB 10: COMPANY OWNERS */}
        {activeTab === 'companyOwners' && (
          <div className="overflow-x-auto">
            <DataTable
              data={companyOwnerRows}
              columns={simpleColumns('companyOwners', companyOwnerRows)}
              pageSize={20}
              showSearch={false}
              showExport={false}
              useGlobalFilters={false}
            />
          </div>
        )}
      </section>

      {/* MODAL GỘP DANH MỤC TRÙNG LẶP */}
      <Modal
        isOpen={showMergeModal}
        onClose={() => {
          setShowMergeModal(false);
          setSelectedItems([]);
        }}
        title={`🔀 Gộp Các Mục Trùng Lặp (${selectedItems.length} mục đã chọn)`}
        size="lg"
      >
        <div className="space-y-4">
          <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-3 text-xs text-amber-900 space-y-1">
            <div className="font-bold flex items-center gap-1.5 text-amber-800">
              <Combine className="h-4 w-4" />
              Hướng dẫn Gộp danh mục:
            </div>
            <p>
              Tất cả các hồ sơ phương tiện đang sử dụng các tên bị gộp sẽ được <strong>tự động chuyển đổi về Tên chuẩn duy nhất</strong>.
            </p>
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold text-slate-700">Các mục sẽ bị Gộp / Hợp nhất:</label>
            <div className="flex flex-wrap gap-1.5 rounded-xl border border-slate-200 bg-slate-50 p-3 max-h-36 overflow-y-auto">
              {selectedItems.map((item) => (
                <span
                  key={item}
                  className="inline-flex items-center gap-1 rounded-lg bg-white px-2.5 py-1 text-xs font-bold text-slate-800 border border-slate-200 shadow-2xs"
                >
                  {item}
                  <button
                    type="button"
                    onClick={() => toggleSelectItem(item)}
                    className="ml-1 text-slate-400 hover:text-rose-600 font-bold"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold text-slate-700">Chọn hoặc Nhập Tên Chuẩn Duy Nhất *</label>
            <select
              className={`${inputClassName} mb-2`}
              value={mergeTargetName}
              onChange={(e) => setMergeTargetName(e.target.value)}
            >
              {selectedItems.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
            <input
              className={inputClassName}
              placeholder="Hoặc gõ tên chuẩn mới tại đây..."
              value={mergeTargetName}
              onChange={(e) => setMergeTargetName(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div><label className="mb-1 block text-xs font-bold text-slate-700">Loại quản lý</label><select className={inputClassName} value={cgManagerForm.managerType} onChange={(e) => setCgManagerForm({ ...cgManagerForm, managerType: e.target.value as 'PRIMARY' | 'DEPUTY' })}><option value="PRIMARY">Chính</option><option value="DEPUTY">Phó</option></select></div>
            <div><label className="mb-1 block text-xs font-bold text-slate-700">Hiệu lực từ</label><input type="datetime-local" className={inputClassName} value={cgManagerForm.effectiveFrom} onChange={(e) => setCgManagerForm({ ...cgManagerForm, effectiveFrom: e.target.value })} /></div>
          </div>
          {cgManagerForm.legacyCatalogId && <div className="rounded-lg bg-amber-50 p-2 text-xs font-semibold text-amber-800">Đang liên kết bản ghi cũ: {cgManagerForm.legacyCatalogId}</div>}
          <div className="flex justify-end gap-2 border-t pt-3">
            <Button variant="outline" onClick={() => setShowMergeModal(false)}>Hủy</Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => void handleExecuteMerge()}
              disabled={merging}
            >
              {merging ? 'Đang xử lý gộp...' : 'Xác nhận gộp & Cập nhật xe'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* MODAL 1: THÊM / SỬA CHỦNG LOẠI */}
      <Modal
        isOpen={Boolean(maintenanceType)}
        onClose={() => { setMaintenanceType(null); setFormError(''); }}
        title={`Định mức bảo dưỡng: ${maintenanceType?.name || ''}`}
        subtitle="Quản trị chọn bộ đo và mốc áp dụng; hệ thống không tự suy diễn theo nhóm xe"
        size="lg"
      >
        <div className="space-y-4 text-xs">
          {formError && <div className="rounded-xl bg-rose-50 p-3 font-bold text-rose-700">{formError}</div>}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <b>Phiên bản đã lưu</b>
            <div className="mt-2 flex flex-wrap gap-2">
              {maintenanceStandards.length ? maintenanceStandards.map((standard) => (
                <span key={standard.id} className={`rounded-full border px-3 py-1 font-semibold ${standard.status === 'ACTIVE' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-600'}`}>
                  v{standard.version} · {standard.metric === 'ENGINE_HOUR' ? 'Giờ máy' : 'ODO km'} · {standard.status} · {standard.milestones?.length || 0} mốc
                </span>
              )) : <span className="text-slate-500">Chưa có định mức; xe đang dùng fallback 250 giờ.</span>}
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><label className="mb-1 block font-bold text-slate-700">Bộ đo</label><select className={inputClassName} value={maintenanceMetric} onChange={(e) => changeMaintenanceMetric(e.target.value as 'ENGINE_HOUR' | 'ODOMETER_KM')}><option value="ENGINE_HOUR">Giờ máy</option><option value="ODOMETER_KM">ODO km</option></select></div>
            <div><label className="mb-1 block font-bold text-slate-700">Tên phiên bản</label><input className={inputClassName} value={maintenanceName} onChange={(e) => setMaintenanceName(e.target.value)} /></div>
          </div>
          <div>
            <label className="mb-1 block font-bold text-slate-700">Các mốc áp dụng (phân cách bằng dấu phẩy)</label>
            <textarea rows={3} className={inputClassName} value={maintenanceMilestones} onChange={(e) => setMaintenanceMilestones(e.target.value)} />
            <p className="mt-1 text-[10px] text-slate-500">Xanh &lt; 80% · Vàng 80–99,99% · Đỏ từ 100% · bắt buộc giải trình khi vượt 110%. Bộ mốc lặp lại sau mốc lớn nhất.</p>
          </div>
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-blue-800"><b>BDC1 hằng ngày:</b> checklist mặc định gồm vệ sinh, kiểm tra tổng thể, bôi trơn và siết bulông. Checklist BDC2 chi tiết được cấu hình khi có tài liệu kỹ thuật được duyệt.</div>
          <div className="flex justify-end gap-2 border-t pt-3"><Button variant="outline" onClick={() => setMaintenanceType(null)}>Đóng</Button><Button onClick={() => void createAndActivateMaintenanceStandard()} disabled={maintenanceSaving}>{maintenanceSaving ? 'Đang kích hoạt...' : 'Tạo phiên bản & kích hoạt'}</Button></div>
        </div>
      </Modal>

      <Modal
        isOpen={showAddTypeModal}
        onClose={() => {
          setShowAddTypeModal(false);
          setEditingType(null);
          setFormError('');
        }}
        title={editingType ? `Chỉnh sửa Chủng loại: ${editingType.name}` : 'Thêm mới Chủng loại xe & MMTB'}
        size="lg"
      >
        <div className="space-y-4">
          {formError && <div className="rounded-xl bg-rose-50 p-3 text-xs font-bold text-rose-700">{formError}</div>}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700">Mã chủng loại *</label>
              <input
                className={inputClassName}
                placeholder="VD: MAY_DAO, XE_BEN..."
                value={typeForm.code}
                onChange={(e) => setTypeForm({ ...typeForm, code: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700">Tên chủng loại *</label>
              <input
                className={inputClassName}
                placeholder="VD: Máy đào bánh xích..."
                value={typeForm.name}
                onChange={(e) => setTypeForm({ ...typeForm, name: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700">Nhóm MMTB</label>
              <select
                className={inputClassName}
                value={typeForm.assetGroup}
                onChange={(e) => setTypeForm({ ...typeForm, assetGroup: e.target.value })}
              >
                {Object.entries(GROUP_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700">Chu kỳ bảo dưỡng chuẩn</label>
              <input
                type="number"
                className={inputClassName}
                placeholder="250"
                value={typeForm.defaultMaintenanceHours}
                onChange={(e) => setTypeForm({ ...typeForm, defaultMaintenanceHours: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700">Định mức nhiên liệu chuẩn</label>
              <input
                type="number"
                step="0.1"
                className={inputClassName}
                placeholder="12.5"
                value={typeForm.defaultFuelQuotaRate}
                onChange={(e) => setTypeForm({ ...typeForm, defaultFuelQuotaRate: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700">Đơn vị định mức</label>
              <select
                className={inputClassName}
                value={typeForm.defaultFuelQuotaUnit}
                onChange={(e) => setTypeForm({ ...typeForm, defaultFuelQuotaUnit: e.target.value })}
              >
                {Object.entries(FUEL_UNIT_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-700">Mô tả / Ghi chú</label>
            <textarea
              className={`${inputClassName} h-20 resize-none`}
              placeholder="Ghi chú chi tiết về chủng loại phương tiện..."
              value={typeForm.description}
              onChange={(e) => setTypeForm({ ...typeForm, description: e.target.value })}
            />
          </div>

          {/* KHỐI THUỘC TÍNH KỸ THUẬT & QUẢN LÝ VẬN HÀNH ĐẶC THÙ CỦA THIẾT BỊ */}
          {editingType && TECHNICAL_ATTRIBUTES_MAP[editingType.code] && (
            <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 space-y-2">
              <div className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                <Settings2 className="w-3.5 h-3.5 text-primary" />
                Thuộc tính kỹ thuật & Cơ chế quản lý thực tế ({editingType.name})
              </div>
              <div className="grid gap-2 text-xs sm:grid-cols-2">
                <div className="rounded-lg bg-white p-2.5 border border-slate-200">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Loại nhiên liệu</div>
                  <div className="font-bold text-slate-800 mt-0.5 flex items-center gap-1">
                    <Fuel className="w-3 h-3 text-amber-600" />
                    {TECHNICAL_ATTRIBUTES_MAP[editingType.code].fuelType}
                  </div>
                </div>
                <div className="rounded-lg bg-white p-2.5 border border-slate-200">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Phương thức vận hành & giám sát</div>
                  <div className="font-bold text-slate-800 mt-0.5">
                    {TECHNICAL_ATTRIBUTES_MAP[editingType.code].operationMode}
                  </div>
                </div>
                <div className="sm:col-span-2 rounded-lg bg-white p-2.5 border border-slate-200">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Thông số kỹ thuật cốt lõi</div>
                  <div className="font-bold text-slate-800 mt-0.5">
                    ⚙️ {TECHNICAL_ATTRIBUTES_MAP[editingType.code].specs}
                  </div>
                </div>
                <div className="sm:col-span-2 rounded-lg bg-white p-2.5 border border-slate-200">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Mục đích & Địa bàn sử dụng</div>
                  <div className="font-medium text-slate-700 mt-0.5">
                    🎯 {TECHNICAL_ATTRIBUTES_MAP[editingType.code].application}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 border-t pt-3">
            <Button variant="outline" onClick={() => { setShowAddTypeModal(false); setEditingType(null); }}>Hủy</Button>
            <Button onClick={() => void handleSaveType()} disabled={saving}>
              {saving ? 'Đang lưu...' : editingType ? 'Cập nhật chủng loại' : 'Lưu chủng loại'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* MODAL 2: THÊM / SỬA HÃNG SẢN XUẤT */}
      <Modal
        isOpen={showAddMfModal}
        onClose={() => {
          setShowAddMfModal(false);
          setEditingMf(null);
          setFormError('');
        }}
        title={editingMf ? 'Chỉnh sửa Hãng sản xuất' : 'Thêm mới Hãng sản xuất / Thương hiệu'}
        size="md"
      >
        <div className="space-y-4">
          {formError && <div className="rounded-xl bg-rose-50 p-3 text-xs font-bold text-rose-700">{formError}</div>}
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-700">Tên Hãng sản xuất *</label>
            <input
              className={inputClassName}
              placeholder="VD: KOBELCO, KOMATSU, THACO AGRI..."
              value={mfForm.name}
              onChange={(e) => setMfForm({ ...mfForm, name: e.target.value })}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-700">Quốc gia xuất xứ chính</label>
            <select
              className={inputClassName}
              value={mfForm.countryName}
              onChange={(e) => {
                const found = POPULAR_COUNTRIES.find((c) => c.name === e.target.value);
                setMfForm({
                  ...mfForm,
                  countryName: e.target.value,
                  countryCode: found ? found.code : 'VN',
                });
              }}
            >
              {POPULAR_COUNTRIES.map((c) => (
                <option key={c.code} value={c.name}>{c.name} ({c.code})</option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2 border-t pt-3">
            <Button variant="outline" onClick={() => setShowAddMfModal(false)}>Hủy</Button>
            <Button onClick={() => void handleSaveManufacturer()} disabled={saving}>
              {saving ? 'Đang lưu...' : editingMf ? 'Cập nhật hãng' : 'Tạo hãng mới'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* MODAL 3: THÊM / SỬA MODEL */}
      <Modal
        isOpen={showAddModelModal}
        onClose={() => {
          setShowAddModelModal(false);
          setEditingModel(null);
          setFormError('');
        }}
        title={editingModel ? `Chỉnh sửa Model: ${editingModel.name}` : 'Thêm mới Model phương tiện'}
        size="md"
      >
        <div className="space-y-4">
          {formError && <div className="rounded-xl bg-rose-50 p-3 text-xs font-bold text-rose-700">{formError}</div>}
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-700">Tên Model *</label>
            <input
              className={inputClassName}
              placeholder="VD: SK200-08, HD270, 320D..."
              value={modelForm.name}
              onChange={(e) => setModelForm({ ...modelForm, name: e.target.value })}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-700">Thuộc Hãng sản xuất *</label>
            <select
              className={inputClassName}
              value={modelForm.manufacturerId}
              onChange={(e) => setModelForm({ ...modelForm, manufacturerId: Number(e.target.value) })}
            >
              {manufacturers.map((mf) => (
                <option key={mf.id} value={mf.id}>{mf.name} ({mf.countryName || 'Chưa gán xuất xứ'})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-700">Gợi ý Chủng loại (tùy chọn)</label>
            <select
              className={inputClassName}
              value={modelForm.categoryHint}
              onChange={(e) => setModelForm({ ...modelForm, categoryHint: e.target.value })}
            >
              <option value="">Tất cả chủng loại</option>
              {types.map((t) => (
                <option key={t.id} value={t.code}>{t.name} ({t.code})</option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2 border-t pt-3">
            <Button variant="outline" onClick={() => { setShowAddModelModal(false); setEditingModel(null); }}>Hủy</Button>
            <Button onClick={() => void handleSaveModel()} disabled={saving}>
              {saving ? 'Đang lưu...' : editingModel ? 'Cập nhật model' : 'Tạo model mới'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* MODAL 4: GENERIC MODAL CHO CÁC MỤC SELECT KHÁC */}
      <Modal
        isOpen={showSimpleAddModal}
        onClose={() => {
          setShowSimpleAddModal(false);
          setEditingSimpleItem(null);
          setFormError('');
        }}
        title={simpleModalTitle}
        size="md"
      >
        <div className="space-y-4">
          {formError && <div className="rounded-xl bg-rose-50 p-3 text-xs font-bold text-rose-700">{formError}</div>}
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-700">Tên / Giá trị mục danh mục *</label>
            <input
              className={inputClassName}
              placeholder="Nhập tên đơn vị, bãi tập kết, nhà cung cấp..."
              value={simpleForm.name}
              onChange={(e) => setSimpleForm({ ...simpleForm, name: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-2 border-t pt-3">
            <Button variant="outline" onClick={() => { setShowSimpleAddModal(false); setEditingSimpleItem(null); }}>Hủy</Button>
            <Button onClick={() => handleSaveSimpleItem()}>
              {editingSimpleItem ? 'Cập nhật mục' : 'Thêm vào danh mục'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* MODAL 4B: THÊM / SỬA BÃI TẬP KẾT THEO KHU LIÊN HỢP */}
      <Modal
        isOpen={showLocationModal}
        onClose={() => {
          setShowLocationModal(false);
          setEditingLocation(null);
          setFormError('');
        }}
        title={editingLocation ? `Chỉnh sửa Bãi / Nơi tập kết: ${editingLocation.name}` : 'Thêm mới Bãi / Nơi tập kết phương tiện'}
        subtitle="Quản lý địa điểm tập kết, bãi xe và khu vực trực thuộc theo từng Khu liên hợp"
        size="md"
      >
        <div className="space-y-4">
          {formError && <div className="rounded-xl bg-rose-50 p-3 text-xs font-bold text-rose-700">{formError}</div>}

          <div>
            <label className="mb-1 block text-xs font-bold text-slate-700">Trực thuộc Khu liên hợp *</label>
            <select
              className={inputClassName}
              value={locationForm.complexCode}
              onChange={(e) => {
                const code = e.target.value;
                const name =
                  code === 'KOUN_MOM'
                    ? 'Khu liên hợp Koun Mom'
                    : code === 'SNOUL'
                    ? 'Khu liên hợp Snoul'
                    : code === 'NAM_LAO'
                    ? 'Khu liên hợp Nam Lào'
                    : 'Toàn hệ thống THACO AGRI';
                setLocationForm({ ...locationForm, complexCode: code, complexName: name });
              }}
            >
              <option value="KOUN_MOM">Khu liên hợp Koun Mom (Campuchia)</option>
              <option value="SNOUL">Khu liên hợp Snoul (Campuchia)</option>
              <option value="NAM_LAO">Khu liên hợp Nam Lào (Attapeu, Lào)</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold text-slate-700">Tên Bãi / Nơi tập kết *</label>
            <input
              className={inputClassName}
              placeholder="VD: Lô 21 DP1, Bãi xe XN Cao su Snoul 1, Xưởng BTSC..."
              value={locationForm.name}
              onChange={(e) => setLocationForm({ ...locationForm, name: e.target.value })}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold text-slate-700">Khu vực / Nông trường / Xí nghiệp</label>
            <input
              className={inputClassName}
              placeholder="VD: Khu vực Daun Penh (DP), XN Bò Snoul, Nông trường 1 Attapeu..."
              value={locationForm.regionName}
              onChange={(e) => setLocationForm({ ...locationForm, regionName: e.target.value })}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold text-slate-700">Địa chỉ chi tiết / Ghi chú</label>
            <input
              className={inputClassName}
              placeholder="VD: Huyện Koun Mom, Tỉnh Ratanakiri..."
              value={locationForm.address}
              onChange={(e) => setLocationForm({ ...locationForm, address: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <label className="text-xs font-bold text-slate-700">Vĩ độ<input className={`${inputClassName} mt-1`} type="number" step="any" placeholder="13.5678" value={locationForm.lat} onChange={(e) => setLocationForm({ ...locationForm, lat: e.target.value })} /></label>
            <label className="text-xs font-bold text-slate-700">Kinh độ<input className={`${inputClassName} mt-1`} type="number" step="any" placeholder="106.8901" value={locationForm.lng} onChange={(e) => setLocationForm({ ...locationForm, lng: e.target.value })} /></label>
            <label className="text-xs font-bold text-slate-700">Bán kính (m)<input className={`${inputClassName} mt-1`} type="number" min="1" value={locationForm.geofenceRadiusM} onChange={(e) => setLocationForm({ ...locationForm, geofenceRadiusM: e.target.value })} /></label>
          </div>

          <div className="flex justify-end gap-2 border-t pt-3">
            <Button variant="outline" onClick={() => { setShowLocationModal(false); setEditingLocation(null); }}>Hủy</Button>
            <Button onClick={() => handleSaveLocation()}>
              {editingLocation ? 'Cập nhật bãi tập kết' : 'Tạo nơi tập kết'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* MODAL 5: NS QUẢN LÝ CƠ GIỚI & ĐIỀU XE */}
      <Modal
        isOpen={showCgManagerModal}
        onClose={() => {
          setShowCgManagerModal(false);
          setEditingCgManager(null);
          setFormError('');
        }}
        title={editingCgManager ? 'Chỉnh sửa Người Quản lý Xe Cơ giới & Điều xe' : 'Thêm mới Người Quản lý Xe Cơ giới & Điều xe'}
        subtitle="Quản lý toàn bộ xe, tài xế và lập lệnh điều xe tại Khu liên hợp Koun Mom"
        size="md"
        footer={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setShowCgManagerModal(false);
                setEditingCgManager(null);
              }}
            >
              Hủy
            </Button>
            <Button variant="primary" size="sm" onClick={handleSaveCgManager}>
              {editingCgManager ? 'Cập nhật' : 'Thêm NS quản lý'}
            </Button>
          </div>
        }
      >
        <div className="space-y-3.5">
          {formError && <div className="rounded-xl bg-rose-50 p-3 text-xs font-bold text-rose-700">{formError}</div>}

          {/* 1. XÍ NGHIỆP TRỰC THUỘC (TÁCH RIÊNG) */}
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-700">
              1. Xí nghiệp trực thuộc <span className="text-rose-500">*</span>
            </label>
            <select
              className={inputClassName}
              value={cgManagerForm.enterpriseName || cgManagerForm.unitName}
              onChange={(e) => setCgManagerForm({ ...cgManagerForm, enterpriseName: e.target.value, unitName: e.target.value })}
            >
              <option value="">-- Chọn xí nghiệp sản xuất --</option>
              {[
                'Xí nghiệp Chuối DP1',
                'Xí nghiệp Chuối DP2',
                'Xí nghiệp Chuối DP3',
                'Xí nghiệp Chuối DP4',
                'Xí nghiệp Chuối LP1',
                'Xí nghiệp Chuối LP2',
                'Xí nghiệp Chuối LP3',
                'Xí nghiệp Bò Andong Meas',
                'Xí nghiệp Xoài Daun Penh',
                'Xí nghiệp Xoài Andong Meas',
                'Xí nghiệp Bưởi Andong Meas',
                'Nhà máy Nhựa - Xốp Daun Penh',
                'Trạm trộn Bê tông Daun Penh',
                'Xưởng BTSC Daun Penh',
                'Phòng Giao nhận Vận chuyển',
                'Ban Điện Nước KLH',
                'Tổng kho Vật tư KLH',
                'Khối Văn phòng KLH',
                'Ban Xe Cơ giới KLH',
                'Ban Điều hành Thadicons',
                'Ban Điều hành Thagricons',
              ].map((xn) => (
                <option key={xn} value={xn}>
                  {xn}
                </option>
              ))}
            </select>
          </div>

          {/* 2. KHU VỰC QUẢN LÝ (TÁCH RIÊNG HOÀN TOÀN) */}
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-700">
              2. Khu vực quản lý (Cụm điều hành cơ giới) <span className="text-rose-500">*</span>
            </label>
            <select
              className={inputClassName}
              value={cgManagerForm.managementArea}
              onChange={(e) => setCgManagerForm({ ...cgManagerForm, managementArea: e.target.value })}
            >
              <option value="">-- Chọn khu vực quản lý cơ giới --</option>
              {managementAreas.map((area) => (
                <option key={area.id} value={area.name}>
                  {area.code} · {area.name} ({area.region})
                </option>
              ))}
            </select>
          </div>

          {/* 3. HỌ VÀ TÊN NGƯỜI QUẢN LÝ */}
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-700">
              3. Họ và tên người quản lý xe & điều xe <span className="text-rose-500">*</span>
            </label>
            <input
              className={inputClassName}
              placeholder="VD: Thái Cao Lưu, Nguyễn Tấn Triều..."
              value={cgManagerForm.managerName}
              onChange={(e) => setCgManagerForm({ ...cgManagerForm, managerName: e.target.value })}
            />
          </div>

          {/* 4. TÀI KHOẢN HỆ THỐNG LIÊN KẾT */}
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-700">Tài khoản User (FARM_MANAGER / Đội trưởng)</label>
            <select
              className={inputClassName}
              value={cgManagerForm.managerUserId}
              onChange={(e) => {
                const found = farmManagerUsers.find((u) => String(u.id) === e.target.value);
                setCgManagerForm({
                  ...cgManagerForm,
                  managerUserId: e.target.value,
                  managerName: found ? found.fullName : cgManagerForm.managerName,
                });
              }}
            >
              <option value="">-- Chọn tài khoản nếu có sẵn trong hệ thống --</option>
              {farmManagerUsers.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.code} · {item.fullName}
                </option>
              ))}
            </select>
          </div>

          {/* 5. SỐ ĐIỆN THOẠI / ZALO */}
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-700">Số Zalo / Điện thoại liên hệ</label>
            <input
              className={inputClassName}
              placeholder="VD: 0387783316, 05974160290..."
              value={cgManagerForm.phone}
              onChange={(e) => setCgManagerForm({ ...cgManagerForm, phone: e.target.value })}
            />
          </div>

          {/* 6. ĐỊA CHỈ (NƠI TẬP KẾT / BÃI XE / LÔ) */}
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-700">Địa chỉ (Nơi tập kết / Bãi xe / Lô)</label>
            <input
              className={inputClassName}
              placeholder="VD: Lô 21 DP1, Lô 85 DP4, Tổng kho KLH..."
              value={cgManagerForm.location}
              onChange={(e) => setCgManagerForm({ ...cgManagerForm, location: e.target.value })}
            />
          </div>

          {/* NHÃN THÔNG BÁO VAI TRÒ & PHẠM VI QUYỀN HẠN */}
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-2.5 text-xs text-emerald-800">
            <div className="font-bold flex items-center gap-1.5">
              <CheckSquare className="w-3.5 h-3.5 text-emerald-600" />
              <span>Phạm vi quyền hạn & Trách nhiệm:</span>
            </div>
            <p className="mt-0.5 text-[11px] text-emerald-700">
              Quản lý toàn bộ xe cơ giới, máy nông cụ, tài xế và trực tiếp làm lệnh điều xe tại khu vực này.
            </p>
          </div>
        </div>
      </Modal>

      {/* MODAL 5.5: THÊM / SỬA KHU VỰC QUẢN LÝ */}
      <Modal
        isOpen={showAreaModal}
        onClose={() => {
          setShowAreaModal(false);
          setEditingArea(null);
          setFormError('');
        }}
        title={editingArea ? 'Chỉnh sửa Khu vực quản lý' : 'Thêm mới Khu vực quản lý'}
        subtitle="Khu vực / Cụm vận hành cơ giới độc lập theo địa bàn nông trường & nhà máy"
        size="md"
        footer={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setShowAreaModal(false);
                setEditingArea(null);
              }}
            >
              Hủy
            </Button>
            <Button variant="primary" size="sm" onClick={handleSaveArea}>
              {editingArea ? 'Cập nhật' : 'Tạo khu vực quản lý'}
            </Button>
          </div>
        }
      >
        <div className="space-y-3.5">
          {formError && <div className="rounded-xl bg-rose-50 p-3 text-xs font-bold text-rose-700">{formError}</div>}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700">Mã khu vực *</label>
              <input
                className={inputClassName}
                placeholder="VD: CGLD_DP, CGTC_LP..."
                value={areaForm.code}
                onChange={(e) => setAreaForm({ ...areaForm, code: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700">Cụm vùng / Địa bàn *</label>
              <select
                className={inputClassName}
                value={areaForm.region}
                onChange={(e) => setAreaForm({ ...areaForm, region: e.target.value })}
              >
                <option value="Khu vực Daun Penh (DP)">Khu vực Daun Penh (DP)</option>
                <option value="Khu vực Lumphat (LP)">Khu vực Lumphat (LP)</option>
                <option value="Khu vực Andong Meas (AD)">Khu vực Andong Meas (AD)</option>
                <option value="Văn phòng KLH">Văn phòng KLH</option>
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold text-slate-700">Tên khu vực quản lý *</label>
            <input
              className={inputClassName}
              placeholder="VD: Đội Cơ giới làm đất Daun Penh (CGLĐ DP)..."
              value={areaForm.name}
              onChange={(e) => setAreaForm({ ...areaForm, name: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700">Đội trưởng / Người phụ trách</label>
              <input
                className={inputClassName}
                placeholder="VD: Nguyễn Tấn Triều..."
                value={areaForm.headOfficer}
                onChange={(e) => setAreaForm({ ...areaForm, headOfficer: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700">Số điện thoại liên hệ</label>
              <input
                className={inputClassName}
                placeholder="VD: 05974160290..."
                value={areaForm.phone}
                onChange={(e) => setAreaForm({ ...areaForm, phone: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700">Bãi xe / Nơi tập kết</label>
              <input
                className={inputClassName}
                placeholder="VD: Lô 85 DP4, Lô 21 DP1..."
                value={areaForm.depotLocation}
                onChange={(e) => setAreaForm({ ...areaForm, depotLocation: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700">Số lượng xe dự kiến</label>
              <input
                type="number"
                min="0"
                className={inputClassName}
                placeholder="42"
                value={areaForm.assignedVehiclesCount}
                onChange={(e) => setAreaForm({ ...areaForm, assignedVehiclesCount: parseInt(e.target.value, 10) || 0 })}
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold text-slate-700">Mô tả / Phạm vi hoạt động</label>
            <textarea
              rows={2}
              className={inputClassName}
              placeholder="Mô tả phạm vi quản lý xe máy, thiết bị nông nghiệp..."
              value={areaForm.description}
              onChange={(e) => setAreaForm({ ...areaForm, description: e.target.value })}
            />
          </div>
        </div>
      </Modal>

      {/* MODAL: THÊM / SỬA CHỦNG LOẠI THIẾT BỊ & NÔNG CỤ */}
      <Modal
        isOpen={showImplementModal}
        onClose={() => {
          setShowImplementModal(false);
          setEditingImplement(null);
          setFormError('');
        }}
        title={editingImplement ? `Chỉnh sửa Chủng loại Thiết bị: ${editingImplement.name}` : 'Thêm mới Chủng loại Thiết bị & Nông cụ'}
        size="lg"
        footer={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setShowImplementModal(false);
                setEditingImplement(null);
                setFormError('');
              }}
            >
              Hủy
            </Button>
            <Button
              variant="primary"
              size="sm"
              className="bg-primary text-white"
              onClick={() => {
                if (!implementForm.name.trim()) {
                  setFormError('Vui lòng nhập tên chủng loại thiết bị');
                  return;
                }
                if (editingImplement) {
                  setImplementCategories((prev) =>
                    prev.map((it) =>
                      it.code === editingImplement.code
                        ? {
                            ...it,
                            code: implementForm.code,
                            name: implementForm.name,
                            functionalGroup: implementForm.functionalGroup,
                            compatibleVehicles: implementForm.compatibleVehicles,
                            defaultMaintenanceHours: parseInt(implementForm.defaultMaintenanceHours, 10) || 250,
                            description: implementForm.description,
                          }
                        : it
                    )
                  );
                } else {
                  const newItem: ImplementCategoryDefinition = {
                    code: implementForm.code || `TB-${Date.now().toString().slice(-4)}`,
                    categoryKey: 'DAN_BUA',
                    name: implementForm.name,
                    functionalGroup: implementForm.functionalGroup,
                    compatibleVehicles: implementForm.compatibleVehicles,
                    defaultMaintenanceHours: parseInt(implementForm.defaultMaintenanceHours, 10) || 250,
                    totalCount: 0,
                    status: 'HOAT_DONG',
                    description: implementForm.description,
                    badge: 'bg-teal-100 text-teal-800 border-teal-300',
                  };
                  setImplementCategories((prev) => [newItem, ...prev]);
                }
                setShowImplementModal(false);
                setEditingImplement(null);
                setFormError('');
              }}
            >
              Lưu chủng loại
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          {formError && <div className="rounded-xl bg-rose-50 p-3 text-xs font-bold text-rose-700">{formError}</div>}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700">Mã chủng loại *</label>
              <input
                className={inputClassName}
                placeholder="VD: TB-BD, TB-DC, TB-PT..."
                value={implementForm.code}
                onChange={(e) => setImplementForm({ ...implementForm, code: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700">Tên chủng loại thiết bị *</label>
              <input
                className={inputClassName}
                placeholder="VD: Dàn bừa đĩa, Dàn cày nông nghiệp..."
                value={implementForm.name}
                onChange={(e) => setImplementForm({ ...implementForm, name: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700">Phân nhóm chức năng</label>
              <input
                className={inputClassName}
                placeholder="VD: Máy làm đất & Làm tơi xốp, Vận chuyển nội bộ..."
                value={implementForm.functionalGroup}
                onChange={(e) => setImplementForm({ ...implementForm, functionalGroup: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700">Đầu máy kéo tương thích</label>
              <input
                className={inputClassName}
                placeholder="VD: Máy kéo nông nghiệp 50 - 90HP..."
                value={implementForm.compatibleVehicles}
                onChange={(e) => setImplementForm({ ...implementForm, compatibleVehicles: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700">Định mức chu kỳ BDC (giờ)</label>
              <input
                type="number"
                className={inputClassName}
                placeholder="250"
                value={implementForm.defaultMaintenanceHours}
                onChange={(e) => setImplementForm({ ...implementForm, defaultMaintenanceHours: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700">Trạng thái áp dụng</label>
              <div className="mt-2 text-xs font-bold text-emerald-700">Còn hoạt động (Áp dụng toàn hệ thống)</div>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-700">Mô tả quy chuẩn kỹ thuật</label>
            <textarea
              rows={3}
              className={inputClassName}
              placeholder="Nhập mô tả quy chuẩn kỹ thuật, điều kiện vận hành áp dụng..."
              value={implementForm.description}
              onChange={(e) => setImplementForm({ ...implementForm, description: e.target.value })}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
};
