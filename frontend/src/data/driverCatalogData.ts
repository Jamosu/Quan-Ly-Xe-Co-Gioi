import { getStoredData, setStoredData } from '../utils/storage';

export interface DriverLicenseClassItem {
  id: string;
  code: string;
  name: string;
  category: 'ROAD_LICENSE' | 'AGRI_MACHINERY' | 'CONSTRUCTION';
  categoryLabel: string;
  allowedVehicles: string;
  validityYears?: number | string;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt?: string;
  createdUser?: string;
  updatedAt?: string;
  updatedUser?: string;
}

export interface DriverComplianceStatusItem {
  id: string;
  code: string;
  name: string;
  badgeVariant: 'green' | 'amber' | 'red' | 'gray';
  thresholdDays?: string;
  actionRequired: string;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt?: string;
  createdUser?: string;
  updatedAt?: string;
  updatedUser?: string;
}

export interface DriverEmploymentStatusItem {
  id: string;
  code: string;
  name: string;
  canDispatch: boolean;
  badgeVariant: 'green' | 'blue' | 'amber' | 'gray' | 'red';
  description: string;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt?: string;
  createdUser?: string;
  updatedAt?: string;
  updatedUser?: string;
}

export interface DriverUnitTypeItem {
  id: string;
  code: string;
  name: string;
  level: 'OWNER' | 'TEAM';
  levelLabel: string;
  description: string;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt?: string;
  createdUser?: string;
  updatedAt?: string;
  updatedUser?: string;
}

// ----------------------------------------------------------------------------
// DEFAULT DATA
// ----------------------------------------------------------------------------

export const DEFAULT_LICENSE_CLASSES: DriverLicenseClassItem[] = [
  {
    id: 'lc-hang-a',
    code: 'HANG_A',
    name: 'Hạng A (Mô tô hai bánh)',
    category: 'ROAD_LICENSE',
    categoryLabel: 'GPLX đường bộ',
    allowedVehicles: 'Xe mô tô 2 bánh dung tích xi-lanh từ 50cm3 trở lên',
    validityYears: 'Vô thời hạn',
    status: 'ACTIVE',
    createdAt: '14-03-2026',
    createdUser: 'admin',
    updatedAt: '15-09-2026',
    updatedUser: 'admin',
  },
  {
    id: 'lc-hang-b1',
    code: 'HANG_B1',
    name: 'Hạng B1 (Ô tô số tự động)',
    category: 'ROAD_LICENSE',
    categoryLabel: 'GPLX đường bộ',
    allowedVehicles: 'Ô tô chở người đến 9 chỗ, ô tô tải số tự động < 3.5 tấn',
    validityYears: 'Đến tuổi nghỉ hưu',
    status: 'ACTIVE',
    createdAt: '14-03-2026',
    createdUser: 'admin',
    updatedAt: '15-09-2026',
    updatedUser: 'admin',
  },
  {
    id: 'lc-hang-b2',
    code: 'HANG_B2',
    name: 'Hạng B2 (Ô tô đến 9 chỗ & Tải < 3.5T)',
    category: 'ROAD_LICENSE',
    categoryLabel: 'GPLX đường bộ',
    allowedVehicles: 'Ô tô chở người đến 9 chỗ, ô tô tải trọng tải thiết kế < 3.5 tấn',
    validityYears: 10,
    status: 'ACTIVE',
    createdAt: '14-03-2026',
    createdUser: 'admin',
    updatedAt: '15-09-2026',
    updatedUser: 'admin',
  },
  {
    id: 'lc-hang-c',
    code: 'HANG_C',
    name: 'Hạng C (Ô tô tải ≥ 3.5T & Đầu kéo)',
    category: 'ROAD_LICENSE',
    categoryLabel: 'GPLX đường bộ',
    allowedVehicles: 'Ô tô tải, ô tô chuyên dùng có trọng tải ≥ 3.5 tấn, máy kéo một rơ moóc',
    validityYears: 5,
    status: 'ACTIVE',
    createdAt: '14-03-2026',
    createdUser: 'admin',
    updatedAt: '15-09-2026',
    updatedUser: 'admin',
  },
  {
    id: 'lc-hang-ce',
    code: 'HANG_CE',
    name: 'Hạng CE (Xe kéo rơ-moóc / Container)',
    category: 'ROAD_LICENSE',
    categoryLabel: 'GPLX đường bộ',
    allowedVehicles: 'Ô tô đầu kéo kéo sơ mi rơ moóc, ô tô tải kéo rơ moóc hạng C',
    validityYears: 5,
    status: 'ACTIVE',
    createdAt: '14-03-2026',
    createdUser: 'admin',
    updatedAt: '15-09-2026',
    updatedUser: 'admin',
  },
  {
    id: 'lc-hang-d1',
    code: 'HANG_D1',
    name: 'Hạng D1 (Ô tô chở người 10–16 chỗ)',
    category: 'ROAD_LICENSE',
    categoryLabel: 'GPLX đường bộ',
    allowedVehicles: 'Ô tô chở người từ 10 đến 16 chỗ ngồi, xe vận chuyển nội bộ',
    validityYears: 5,
    status: 'ACTIVE',
    createdAt: '14-03-2026',
    createdUser: 'admin',
    updatedAt: '15-09-2026',
    updatedUser: 'admin',
  },
  {
    id: 'lc-hang-d2',
    code: 'HANG_D2',
    name: 'Hạng D2 (Ô tô chở người 17–30 chỗ)',
    category: 'ROAD_LICENSE',
    categoryLabel: 'GPLX đường bộ',
    allowedVehicles: 'Ô tô chở người từ 17 đến 30 chỗ ngồi, xe đưa đón CBCNV',
    validityYears: 5,
    status: 'ACTIVE',
    createdAt: '14-03-2026',
    createdUser: 'admin',
    updatedAt: '15-09-2026',
    updatedUser: 'admin',
  },
  {
    id: 'lc-may-keo',
    code: 'BANG_MAY_KEO',
    name: 'Bằng lái / Chứng chỉ Máy kéo Nông nghiệp',
    category: 'AGRI_MACHINERY',
    categoryLabel: 'Cơ giới nông nghiệp',
    allowedVehicles: 'Máy kéo bánh hơi Kubota, John Deere, Yanmar công suất đến 140HP',
    validityYears: 5,
    status: 'ACTIVE',
    createdAt: '14-03-2026',
    createdUser: 'admin',
    updatedAt: '15-09-2026',
    updatedUser: 'admin',
  },
  {
    id: 'lc-may-dao',
    code: 'CC_MAY_DAO',
    name: 'Chứng chỉ vận hành Máy đào (Cuốc)',
    category: 'CONSTRUCTION',
    categoryLabel: 'Máy công trình',
    allowedVehicles: 'Máy đào bánh xích, bánh lốp Komatsu, Sumitomo, Doosan dung tích gàu 0.3 - 1.2m3',
    validityYears: 5,
    status: 'ACTIVE',
    createdAt: '14-03-2026',
    createdUser: 'admin',
    updatedAt: '15-09-2026',
    updatedUser: 'admin',
  },
  {
    id: 'lc-may-ui',
    code: 'CC_MAY_UI',
    name: 'Chứng chỉ vận hành Máy ủi & San gạt',
    category: 'CONSTRUCTION',
    categoryLabel: 'Máy công trình',
    allowedVehicles: 'Máy ủi đất Komatsu D31/D60, máy san gạt làm đất nông nghiệp',
    validityYears: 5,
    status: 'ACTIVE',
    createdAt: '14-03-2026',
    createdUser: 'admin',
    updatedAt: '15-09-2026',
    updatedUser: 'admin',
  },
];

export const DEFAULT_COMPLIANCE_STATUSES: DriverComplianceStatusItem[] = [
  {
    id: 'cs-valid',
    code: 'VALID',
    name: 'Còn hạn hợp lệ',
    badgeVariant: 'green',
    thresholdDays: '> 60 ngày',
    actionRequired: 'Đủ điều kiện pháp lý & sức khỏe vận hành phương tiện trên công trường.',
    status: 'ACTIVE',
    createdAt: '14-03-2026',
    createdUser: 'admin',
    updatedAt: '15-09-2026',
    updatedUser: 'admin',
  },
  {
    id: 'cs-expiring-60',
    code: 'EXPIRING_60',
    name: 'Sắp hết hạn (Còn 31–60 ngày)',
    badgeVariant: 'amber',
    thresholdDays: '31 – 60 ngày',
    actionRequired: 'Cảnh báo tự động chuẩn bị lịch khám sức khỏe hoặc nộp hồ sơ đổi GPLX.',
    status: 'ACTIVE',
    createdAt: '14-03-2026',
    createdUser: 'admin',
    updatedAt: '15-09-2026',
    updatedUser: 'admin',
  },
  {
    id: 'cs-expiring-30',
    code: 'EXPIRING_30',
    name: 'Cần gia hạn khẩn (Còn ≤ 30 ngày)',
    badgeVariant: 'amber',
    thresholdDays: '≤ 30 ngày',
    actionRequired: 'Cán bộ quản lý đôn đốc tài xế hoàn tất thủ tục gia hạn trước ngày hết hạn.',
    status: 'ACTIVE',
    createdAt: '14-03-2026',
    createdUser: 'admin',
    updatedAt: '15-09-2026',
    updatedUser: 'admin',
  },
  {
    id: 'cs-expired',
    code: 'EXPIRED',
    name: 'Đã hết hạn (Quá hạn)',
    badgeVariant: 'red',
    thresholdDays: '< 0 ngày',
    actionRequired: 'Tạm khóa quyền điều xe, đình chỉ phân công phương tiện cho đến khi gia hạn.',
    status: 'ACTIVE',
    createdAt: '14-03-2026',
    createdUser: 'admin',
    updatedAt: '15-09-2026',
    updatedUser: 'admin',
  },
  {
    id: 'cs-missing',
    code: 'MISSING',
    name: 'Thiếu hồ sơ GPLX / Hạn SK',
    badgeVariant: 'gray',
    thresholdDays: 'Chưa cập nhật',
    actionRequired: 'Yêu cầu nhân sự / tài xế nộp bản chụp GPLX và giấy khám sức khỏe định kỳ.',
    status: 'ACTIVE',
    createdAt: '14-03-2026',
    createdUser: 'admin',
    updatedAt: '15-09-2026',
    updatedUser: 'admin',
  },
];

export const DEFAULT_EMPLOYMENT_STATUSES: DriverEmploymentStatusItem[] = [
  {
    id: 'es-active',
    code: 'DANG_LAM_VIEC',
    name: 'Đang làm việc',
    canDispatch: true,
    badgeVariant: 'green',
    description: 'Tài xế đang làm việc chính thức, sẵn sàng nhận lệnh điều xe.',
    status: 'ACTIVE',
    createdAt: '14-03-2026',
    createdUser: 'admin',
    updatedAt: '15-09-2026',
    updatedUser: 'admin',
  },
  {
    id: 'es-probation',
    code: 'THU_VIEC',
    name: 'Đang thử việc',
    canDispatch: true,
    badgeVariant: 'blue',
    description: 'Tài xế trong thời gian thử việc, được phân công có giám sát.',
    status: 'ACTIVE',
    createdAt: '14-03-2026',
    createdUser: 'admin',
    updatedAt: '15-09-2026',
    updatedUser: 'admin',
  },
  {
    id: 'es-leave',
    code: 'NGHI_PHEP',
    name: 'Nghỉ phép / Nghỉ ốm',
    canDispatch: false,
    badgeVariant: 'amber',
    description: 'Tài xế đang trong thời gian nghỉ phép, tạm ngừng nhận lệnh điều động.',
    status: 'ACTIVE',
    createdAt: '14-03-2026',
    createdUser: 'admin',
    updatedAt: '15-09-2026',
    updatedUser: 'admin',
  },
  {
    id: 'es-suspended',
    code: 'TAM_HOAN',
    name: 'Tạm hoãn hợp đồng',
    canDispatch: false,
    badgeVariant: 'gray',
    description: 'Hợp đồng lao động tạm hoãn hoặc tài xế chờ điều chuyển đơn vị.',
    status: 'ACTIVE',
    createdAt: '14-03-2026',
    createdUser: 'admin',
    updatedAt: '15-09-2026',
    updatedUser: 'admin',
  },
  {
    id: 'es-resigned',
    code: 'DA_NGHI_VIEC',
    name: 'Đã nghỉ việc',
    canDispatch: false,
    badgeVariant: 'red',
    description: 'Tài xế đã chấm dứt hợp đồng lao động, bàn giao toàn bộ xe và công cụ.',
    status: 'ACTIVE',
    createdAt: '14-03-2026',
    createdUser: 'admin',
    updatedAt: '15-09-2026',
    updatedUser: 'admin',
  },
];

export const DEFAULT_UNIT_TYPES: DriverUnitTypeItem[] = [
  {
    id: 'ut-ban',
    code: 'BAN',
    name: 'Ban chức năng',
    level: 'OWNER',
    levelLabel: 'Cấp 2 - Đơn vị chủ quản',
    description: 'Ban Cơ Giới KLH, Ban Quản trị thiết bị...',
    status: 'ACTIVE',
    createdAt: '14-03-2026',
    createdUser: 'admin',
    updatedAt: '15-09-2026',
    updatedUser: 'admin',
  },
  {
    id: 'ut-phong',
    code: 'PHONG',
    name: 'Phòng ban nghiệp vụ',
    level: 'OWNER',
    levelLabel: 'Cấp 2 - Đơn vị chủ quản',
    description: 'Phòng Kỹ thuật, Phòng Điều hành điều phối xe...',
    status: 'ACTIVE',
    createdAt: '14-03-2026',
    createdUser: 'admin',
    updatedAt: '15-09-2026',
    updatedUser: 'admin',
  },
  {
    id: 'ut-trung-tam',
    code: 'TRUNG_TAM',
    name: 'Trung tâm BTSC & Cơ điện',
    level: 'OWNER',
    levelLabel: 'Cấp 2 - Đơn vị chủ quản',
    description: 'Trung tâm Bảo trì sửa chữa, Xưởng trung tâm KLH...',
    status: 'ACTIVE',
    createdAt: '14-03-2026',
    createdUser: 'admin',
    updatedAt: '15-09-2026',
    updatedUser: 'admin',
  },
  {
    id: 'ut-xi-nghiep',
    code: 'XI_NGHIEP',
    name: 'Xí nghiệp chuyên ngành',
    level: 'OWNER',
    levelLabel: 'Cấp 2 - Đơn vị chủ quản',
    description: 'Xí nghiệp Chuối, Xí nghiệp Bò, Xí nghiệp Xây dựng cơ bản...',
    status: 'ACTIVE',
    createdAt: '14-03-2026',
    createdUser: 'admin',
    updatedAt: '15-09-2026',
    updatedUser: 'admin',
  },
  {
    id: 'ut-nong-truong',
    code: 'NONG_TRUONG',
    name: 'Nông trường nông nghiệp',
    level: 'OWNER',
    levelLabel: 'Cấp 2 - Đơn vị chủ quản',
    description: 'Nông trường 1, Nông trường 2, Nông trường Cao su...',
    status: 'ACTIVE',
    createdAt: '14-03-2026',
    createdUser: 'admin',
    updatedAt: '15-09-2026',
    updatedUser: 'admin',
  },
  {
    id: 'ut-doi',
    code: 'DOI',
    name: 'Đội cơ giới / Đội xe',
    level: 'TEAM',
    levelLabel: 'Cấp 3 - Đội/Tổ trực thuộc',
    description: 'Đội máy kéo, Đội xe ben vận chuyển, Đội cơ điện công trình...',
    status: 'ACTIVE',
    createdAt: '14-03-2026',
    createdUser: 'admin',
    updatedAt: '15-09-2026',
    updatedUser: 'admin',
  },
  {
    id: 'ut-to',
    code: 'TO',
    name: 'Tổ vận hành / Tổ máy',
    level: 'TEAM',
    levelLabel: 'Cấp 3 - Đội/Tổ trực thuộc',
    description: 'Tổ máy kéo 1, Tổ phun xịt BVTV, Tổ cơ động...',
    status: 'ACTIVE',
    createdAt: '14-03-2026',
    createdUser: 'admin',
    updatedAt: '15-09-2026',
    updatedUser: 'admin',
  },
  {
    id: 'ut-khac',
    code: 'KHAC',
    name: 'Bộ phận khác',
    level: 'OWNER',
    levelLabel: 'Cấp 2 - Đơn vị chủ quản',
    description: 'Các đơn vị hoặc bộ phận đặc thù khác',
    status: 'ACTIVE',
    createdAt: '14-03-2026',
    createdUser: 'admin',
    updatedAt: '15-09-2026',
    updatedUser: 'admin',
  },
];

export const STORAGE_KEY_LICENSE_CLASSES = 'catalogs_driver_license_classes';
export const STORAGE_KEY_COMPLIANCE_STATUSES = 'catalogs_driver_compliance_statuses';
export const STORAGE_KEY_EMPLOYMENT_STATUSES = 'catalogs_driver_employment_statuses';
export const STORAGE_KEY_UNIT_TYPES = 'catalogs_driver_unit_types';

export const getDriverLicenseClasses = (): DriverLicenseClassItem[] => {
  return getStoredData(STORAGE_KEY_LICENSE_CLASSES, DEFAULT_LICENSE_CLASSES);
};

export const setDriverLicenseClasses = (items: DriverLicenseClassItem[]): void => {
  setStoredData(STORAGE_KEY_LICENSE_CLASSES, items);
};

export const getDriverComplianceStatuses = (): DriverComplianceStatusItem[] => {
  return getStoredData(STORAGE_KEY_COMPLIANCE_STATUSES, DEFAULT_COMPLIANCE_STATUSES);
};

export const setDriverComplianceStatuses = (items: DriverComplianceStatusItem[]): void => {
  setStoredData(STORAGE_KEY_COMPLIANCE_STATUSES, items);
};

export const getDriverEmploymentStatuses = (): DriverEmploymentStatusItem[] => {
  return getStoredData(STORAGE_KEY_EMPLOYMENT_STATUSES, DEFAULT_EMPLOYMENT_STATUSES);
};

export const setDriverEmploymentStatuses = (items: DriverEmploymentStatusItem[]): void => {
  setStoredData(STORAGE_KEY_EMPLOYMENT_STATUSES, items);
};

export const getDriverUnitTypes = (): DriverUnitTypeItem[] => {
  return getStoredData(STORAGE_KEY_UNIT_TYPES, DEFAULT_UNIT_TYPES);
};

export const setDriverUnitTypes = (items: DriverUnitTypeItem[]): void => {
  setStoredData(STORAGE_KEY_UNIT_TYPES, items);
};
