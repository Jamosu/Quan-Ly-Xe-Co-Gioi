import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Award,
  Briefcase,
  Building2,
  Camera,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Download,
  Edit,
  Eye,
  EyeOff,
  FileSpreadsheet,
  FileText,
  HeartPulse,
  Info,
  Key,
  List,
  Loader2,
  Lock,
  Mail,
  MapPin,
  Network,
  Phone,
  Plus,
  RefreshCcw,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldAlert,
  SlidersHorizontal,
  Truck,
  Upload,
  User,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { apiService } from '../../api/client';
import { driverManagementApi, DriverManagementUnit } from '../../api/driverManagementApi';
import { catalogsApi } from '../../api/catalogsApi';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { SearchableSelect, SelectOption } from '../../components/common/SearchableSelect';
import { TableRowActions } from '../../components/common/TableRowActions';
import { StatusToggle } from '../../components/common/StatusToggle';
import { Column, DataTable } from '../../components/data-display/DataTable';
import { KPIGrid } from '../../components/data-display/KPIGrid';
import { StatCard } from '../../components/data-display/StatCard';
import { getStoredData } from '../../utils/storage';
import { parseOperationalImport, toIsoDate } from '../../utils/operationalExcelTemplates';
import { getEffectiveDriverManager, groupDriversByManagement } from './driverManagementGrouping';
import { useManagementFilterCatalog } from '../../hooks/useManagementFilterCatalog';
import {
  mockComplexes,
  mockEnterprises,
  mockFarms,
  mockTeams,
  mockPositions,
  CatalogItem,
} from '../../data/catalogData';

type ComplianceStatus = 'VALID' | 'EXPIRING_60' | 'EXPIRING_30' | 'EXPIRED' | 'MISSING';

interface VehicleSummary {
  id: number;
  code: string;
  plate?: string | null;
  name: string;
  category?: string;
  type?: string;
  status?: string;
}

interface EmployeeSummary {
  id?: number;
  empCode?: string;
  businessUnit?: string | null;
  complex?: string | null;
  enterprise?: string | null;
  farm?: string | null;
  team?: string | null;
  position?: string | null;
  email?: string | null;
  idCardNumber?: string | null;
  idCardIssueDate?: string | null;
  idCardIssuePlace?: string | null;
  status?: string | null;
  joinedDate?: string | null;
}

export interface DriverLicenseItem {
  category: string;
  number: string;
  issueDate?: string | null;
  expiryDate?: string | null;
  issuedBy?: string | null;
  issuingAuthority?: string | null;
  isPrimary?: boolean;
}

export interface AssignedVehicleItem {
  id?: number;
  vehicleId: number;
  type: 'PRIMARY' | 'SECONDARY';
  vehicle?: VehicleSummary;
}

interface DriverListItem {
  id: number;
  code: string;
  username: string;
  fullName: string;
  phone?: string | null;
  unit: string;
  enterprise?: string | null;
  team?: string | null;
  position?: string | null;
  licenseClass?: string | null;
  licenseNumber?: string | null;
  employmentStatus: string;
  joinedDate: string;
  currentShiftStatus?: string | null;
  avatarUrl?: string | null;
  complianceStatus: ComplianceStatus;
  assignedVehicle?: VehicleSummary | null;
  employee?: EmployeeSummary | null;
  managementUnit?: DriverManagementUnit | null;
  teamUnit?: DriverManagementUnit | null;
  managementAssignment?: { managementUnitId: number; teamUnitId?: number | null } | null;
  management?: {
    manager?: { id: number; code?: string; fullName: string; phone?: string | null } | null;
    teamManager?: { id: number; code?: string; fullName: string; phone?: string | null } | null;
    ownerManager?: { id: number; code?: string; fullName: string; phone?: string | null } | null;
    managerAssignment?: { effectiveFrom: string; effectiveTo?: string | null } | null;
  } | null;
  licenses?: DriverLicenseItem[];
  assignedVehicles?: AssignedVehicleItem[];
  primaryVehicles?: VehicleSummary[];
  secondaryVehicles?: VehicleSummary[];
}

interface DriverProfile extends DriverListItem {
  resignedDate?: string | null;
  resignedReason?: string | null;
  licenseClass?: string | null;
  licenseNumber?: string | null;
  licenseExpiryDate?: string | null;
  healthCheckExpiryDate?: string | null;
  currentLocation?: string | null;
  notes?: string | null;
  isActive: boolean;
  updatedAt: string;
  drivenVehicles: VehicleSummary[];
  secondaryVehicles: VehicleSummary[];
  kpis: any[];
  sosAlerts: any[];
  repairsReported: any[];
  dispatchOrdersDriven: any[];
  transportOrders: any[];
  feedTrips: any[];
  dataAvailability: Record<string, boolean>;
}

interface DriverOptions {
  complexes: string[];
  enterprises: string[];
  farms: string[];
  teams: string[];
  positions: string[];
  units: string[];
  vehicles: VehicleSummary[];
  managementUnits: DriverManagementUnit[];
}

const EMPTY_OPTIONS: DriverOptions = {
  complexes: [], enterprises: [], farms: [], teams: [], positions: [], units: [], vehicles: [], managementUnits: [],
};

const UNIT_LABELS: Record<string, string> = {
  NT1: 'Nông trường 1', NT2: 'Nông trường 2', XN_BO: 'Xí nghiệp Bò',
  TT_BTSC: 'Trung tâm BTSC', BAN_CO_GIOI: 'Ban Cơ giới', TOAN_KLH: 'Toàn KLH',
};
const LICENSE_LABELS: Record<string, string> = {
  HANG_A: 'Hạng A (Mô tô >125CC, 3 bánh)',
  HANG_B1: 'Hạng B1 (Xe con ≤3.5T số tự động)',
  HANG_B2: 'Hạng B2 (Máy cày, ô tô con <9 chỗ, tải <3.5T)',
  HANG_C: 'Hạng C (Xe tải >3.5T)',
  HANG_CE: 'Hạng CE (Đầu kéo, container)',
  HANG_D1: 'Hạng D1 (Xe chở người ≤20 chỗ)',
  HANG_D2: 'Hạng D2 (Xe chở người >20 chỗ)',
};
const SHIFT_LABELS: Record<string, string> = {
  DANG_VAN_HANH: 'Đang vận hành', SAN_SANG: 'Sẵn sàng', NGHI_PHEP_CA: 'Nghỉ ca',
};

const formatDate = (value?: string | null) => value
  ? new Intl.DateTimeFormat('vi-VN').format(new Date(value))
  : 'Chưa có dữ liệu';

const inputDate = (value?: string | null) => value ? value.slice(0, 10) : '';

const calculateTenure = (joinedDate?: string | null, endedDate?: string | null) => {
  if (!joinedDate) return 'Chưa có ngày vào công ty';
  const start = new Date(joinedDate);
  const end = endedDate ? new Date(endedDate) : new Date();
  let months = (end.getFullYear() - start.getFullYear()) * 12 + end.getMonth() - start.getMonth();
  if (end.getDate() < start.getDate()) months -= 1;
  months = Math.max(0, months);
  return `${Math.floor(months / 12)} năm ${months % 12} tháng`;
};

export const hasDriverVehicleAssigned = (driver: DriverListItem): boolean => {
  if (driver.assignedVehicle && (driver.assignedVehicle.plate || driver.assignedVehicle.code || driver.assignedVehicle.id)) {
    return true;
  }
  if (Array.isArray((driver as any).drivenVehicles) && (driver as any).drivenVehicles.length > 0) {
    return true;
  }
  if (Array.isArray((driver as any).secondaryVehicles) && (driver as any).secondaryVehicles.length > 0) {
    return true;
  }
  return false;
};

const employmentBadge = (status: string) => status === 'DA_NGHI_VIEC'
  ? <Badge variant="gray">Đã nghỉ việc</Badge>
  : <Badge variant="green" dot>Đang làm việc</Badge>;

const complianceBadge = (status: ComplianceStatus) => {
  if (status === 'EXPIRED') return <Badge variant="red">Đã hết hạn</Badge>;
  if (status === 'EXPIRING_30') return <Badge variant="amber">Còn tối đa 30 ngày</Badge>;
  if (status === 'EXPIRING_60') return <Badge variant="amber">Còn 31–60 ngày</Badge>;
  if (status === 'MISSING') return <Badge variant="gray">Thiếu hồ sơ</Badge>;
  return <Badge variant="green">Hợp lệ</Badge>;
};

const InfoItem: React.FC<{ label: string; value?: React.ReactNode; wide?: boolean }> = ({ label, value, wide }) => (
  <div className={`rounded-xl border border-slate-200/80 bg-slate-50 p-3 ${wide ? 'sm:col-span-2' : ''}`}>
    <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</div>
    <div className="mt-1 text-xs font-semibold text-slate-900">{value || 'Chưa có dữ liệu'}</div>
  </div>
);

const TextField: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label: string }> = ({ label, ...props }) => (
  <label className="block text-xs font-bold text-slate-700">
    {label}
    <input {...props} className="mt-1 h-9 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-normal outline-none focus:border-primary focus:bg-white" />
  </label>
);

const FORM_STEPS = ['Nhận diện', 'Công tác', 'GPLX & Bằng', 'Sức khỏe', 'Tài khoản/RFID', 'Xe quản lý', 'Xác nhận'];

const defaultForm = () => ({
  code: '', username: '', password: '', fullName: '', phone: '', unit: 'KOUN_MOM', joinedDate: inputDate(new Date().toISOString()),
  employmentStatus: 'DANG_LAM_VIEC', businessUnit: '', complex: '', enterprise: '', farm: '', team: '', position: '',
  managementUnitId: '', teamUnitId: '',
  email: '', idCardNumber: '', idCardIssueDate: '', idCardIssuePlace: '', avatarUrl: '', licenseClass: '', licenseNumber: '',
  licenseIssueDate: '', licenseIssuePlace: '', licenseExpiryDate: '',
  machineryCertType: '', machineryCertNumber: '', machineryCertIssuer: '', machineryCertDate: '',
  licenses: [] as DriverLicenseItem[],
  healthCheckDate: '', healthCheckHospital: '', healthCheckExpiryDate: '', healthClassification: 'LOAI_1',
  safetyCardNumber: '', rfidCardNumber: '',
  currentShiftStatus: 'SAN_SANG', currentLocation: '', assignedVehicleId: '', assignedVehicleIds: [] as number[],
  assignedVehicles: [] as AssignedVehicleItem[],
  resignedDate: '', resignedReason: '', notes: '',
});

type CardFilterType = 'ALL' | 'OPERATING' | 'READY' | 'INACTIVE' | 'UNASSIGNED_VEHICLE' | 'COMPLIANCE_ALERT';
type DriverViewMode = 'GROUPED' | 'LIST';

export const DriversListPage: React.FC = () => {
  const globalKLH = useAppStore((state) => state.selectedKLH);
  const currentUser = useAppStore((state) => state.currentUser);
  const canEditDriverProfile = currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'FARM_MANAGER';
  const [drivers, setDrivers] = useState<DriverListItem[]>([]);
  const [summary, setSummary] = useState({ total: 0, operating: 0, ready: 0, inactive: 0, complianceAlerts: 0, unassignedVehicle: 0 });
  const [options, setOptions] = useState<DriverOptions>(EMPTY_OPTIONS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cardFilter, setCardFilter] = useState<CardFilterType>('ALL');
  const [viewMode, setViewMode] = useState<DriverViewMode>('GROUPED');
  const [collapsedUnits, setCollapsedUnits] = useState<Set<string>>(new Set());
  const [collapsedManagers, setCollapsedManagers] = useState<Set<string>>(new Set());
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(true);
  const [filters, setFilters] = useState({
    search: '',
    enterprise: '',
    manager: '',
    team: '',
    position: '',
    licenseClass: '',
    shiftStatus: '',
    employmentStatus: '',
    complianceStatus: '',
    complex: '',
  });
  const { units: managementFilterUnits, managers: managementFilterManagers } = useManagementFilterCatalog(
    filters.complex || ((globalKLH && globalKLH !== 'ALL') ? globalKLH : undefined),
  );
  const [selected, setSelected] = useState<DriverProfile | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailTab, setDetailTab] = useState(0);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formStep, setFormStep] = useState(0);
  const [form, setForm] = useState(defaultForm());
  const [saving, setSaving] = useState(false);
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string; subtitle?: string } | null>(null);

  const detailFileInputRef = useRef<HTMLInputElement | null>(null);
  const editorFileInputRef = useRef<HTMLInputElement | null>(null);
  const importFileInputRef = useRef<HTMLInputElement | null>(null);
  const [importing, setImporting] = useState(false);
  const [importMessage, setImportMessage] = useState('');

  const loadDrivers = async () => {
    setLoading(true);
    setError('');
    try {
      const activeComplex = filters.complex || ((globalKLH && globalKLH !== 'ALL') ? globalKLH : undefined);
      const selectedTeamUnitId = Number(filters.enterprise);
      const managerUserId = Number(filters.manager);
      const teamUnitId = Number(filters.team);
      const result = await apiService.getDriverProfiles({
        limit: 500,
        ...(filters.search ? { search: filters.search } : {}),
        ...(activeComplex ? { complex: activeComplex } : {}),
        ...(Number.isInteger(selectedTeamUnitId) && selectedTeamUnitId > 0 ? { teamUnitId: selectedTeamUnitId } : {}),
        ...(Number.isInteger(managerUserId) && managerUserId > 0 ? { managerUserId } : {}),
        ...(Number.isInteger(teamUnitId) && teamUnitId > 0 ? { teamUnitId } : {}),
        ...(filters.position ? { position: filters.position } : {}),
        ...(filters.employmentStatus ? { employmentStatus: filters.employmentStatus } : {}),
      });
      setDrivers(result.items || []);
      setSummary(result.summary || { total: 0, operating: 0, ready: 0, inactive: 0, complianceAlerts: 0 });
      if ((result.items || []).length === 0) {
        useAppStore.getState().setHeaderAlert({
          type: 'warning',
          message: 'Không tìm thấy hồ sơ nhân sự lái xe theo bộ lọc.',
        });
      }
    } catch {
      setDrivers([]);
      setError('Không tải được dữ liệu hồ sơ lái xe từ máy chủ. Hệ thống không sử dụng dữ liệu giả thay thế.');
      useAppStore.getState().setHeaderAlert({
        type: 'error',
        message: 'Lỗi kết nối máy chủ khi nạp danh sách nhân sự lái xe.',
      });
    } finally {
      setLoading(false);
    }
  };

  // Lắng nghe sự kiện làm mới từ nút trên Header
  useEffect(() => {
    const handlePageRefresh = () => {
      void loadDrivers();
    };
    window.addEventListener('thaco_refresh_current_page', handlePageRefresh);
    return () => window.removeEventListener('thaco_refresh_current_page', handlePageRefresh);
  }, [filters, globalKLH]);

  useEffect(() => {
    void apiService.getDriverProfileOptions().then((data) => setOptions(data || EMPTY_OPTIONS)).catch(() => setOptions(EMPTY_OPTIONS));
  }, []);

  const [showPassword, setShowPassword] = useState(false);

  // Catalog Master Data for Form (Đồng bộ theo danh mục quản lý)
  const [catalogComplexes, setCatalogComplexes] = useState<CatalogItem[]>(() =>
    getStoredData('catalogs_complexes', mockComplexes)
  );
  const [catalogPositions, setCatalogPositions] = useState<CatalogItem[]>(() =>
    getStoredData('catalogs_positions', mockPositions)
  );

  useEffect(() => {
    catalogsApi.getCatalogs('COMPLEX', 'catalogs_complexes', mockComplexes).then((data) => {
      if (Array.isArray(data) && data.length > 0) setCatalogComplexes(data);
    });
    catalogsApi.getCatalogs('POSITION', 'catalogs_positions', mockPositions).then((data) => {
      if (Array.isArray(data) && data.length > 0) setCatalogPositions(data);
    });
  }, []);

  // Options for Form Step 2 (Công tác) - Lấy chuẩn từ Danh mục
  const formComplexOptions = useMemo<SelectOption[]>(() => {
    const codes = [...new Set(options.managementUnits.map((unit) => unit.complexCode))];
    return codes.map((code) => ({
      value: code,
      label: catalogComplexes.find((item) => item.code === code)?.name ? `${code} - ${catalogComplexes.find((item) => item.code === code)!.name}` : code,
    }));
  }, [catalogComplexes, options.managementUnits]);

  const formEnterpriseOptions = useMemo<SelectOption[]>(() => {
    const list = options.managementUnits.filter((unit) => unit.level === 'OWNER' && unit.status === 'ACTIVE' && (!form.complex || unit.complexCode === form.complex));
    return list.map((unit) => ({
      value: String(unit.id),
      label: `${unit.code} - ${unit.name}`,
      subLabel: `KLH: ${unit.complexCode}`,
    }));
  }, [options.managementUnits, form.complex]);

  const formTeamOptions = useMemo<SelectOption[]>(() => {
    return options.managementUnits.filter((unit) => unit.level === 'TEAM' && unit.status === 'ACTIVE' && unit.parentId === Number(form.managementUnitId)).map((unit) => ({
      value: String(unit.id),
      label: `${unit.code} - ${unit.name}`,
    }));
  }, [options.managementUnits, form.managementUnitId]);

  const formPositionOptions = useMemo<SelectOption[]>(() => {
    const catPositions = catalogPositions.map((p) => p.name).filter(Boolean);
    return Array.from(new Set(catPositions)).map((p) => ({
      value: p,
      label: p,
    }));
  }, [catalogPositions]);

  const formUnitOptions = useMemo<SelectOption[]>(() => {
    return [
      { value: 'KOUN_MOM', label: 'NT1 - Nông trường 1', subLabel: 'Nông trường' },
      { value: 'KOUN_MOM', label: 'NT2 - Nông trường 2', subLabel: 'Nông trường' },
      { value: 'KOUN_MOM', label: 'XN_BO - Xí nghiệp Bò', subLabel: 'Xí nghiệp' },
      { value: 'KOUN_MOM', label: 'BAN_CO_GIOI - Ban Cơ giới', subLabel: 'Ban chuyên trách' },
      { value: 'KOUN_MOM', label: 'TT_BTSC - Trung tâm BTSC', subLabel: 'Xưởng dịch vụ' },
      { value: 'TOAN_KLH', label: 'TOAN_KLH - Toàn KLH', subLabel: 'Tổng thể' },
    ];
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadDrivers(), 250);
    return () => window.clearTimeout(timer);
  }, [globalKLH, filters.search, filters.enterprise, filters.manager, filters.team, filters.position, filters.employmentStatus, filters.complex]);

  // Dữ liệu lái xe theo Khu liên hợp đã chọn từ Header
  const klhFilteredDrivers = useMemo(() => {
    const selectedComplex = filters.complex || globalKLH;
    if (!selectedComplex || selectedComplex === 'ALL') return drivers;
    if (selectedComplex === '__UNASSIGNED__') {
      return drivers.filter((d: any) => {
        return (
          !d.complex &&
          !d.managementUnit?.complexCode &&
          !d.managementAssignment?.managementUnit?.complexCode &&
          !d.employee?.complex &&
          !d.employee?.businessUnit
        );
      });
    }
    const reqComp = selectedComplex.toUpperCase();
    return drivers.filter((d: any) => {
      // 1. Kiểm tra trường complex từ backend (nếu có)
      if (d.complex) {
        const c = String(d.complex).toUpperCase();
        if (reqComp === 'KOUN_MOM') return c.includes('KOUN') || c === 'KM';
        if (reqComp === 'SNOUL') return c.includes('SNOUL') || c === 'SN';
        if (reqComp === 'NAM_LAO') return c.includes('LAO') || c === 'NL';
      }

      // 2. Theo đơn vị chủ quản quản lý trực tiếp
      const mgmtComp = (d.managementUnit?.complexCode || d.managementAssignment?.managementUnit?.complexCode || '').toUpperCase();
      if (mgmtComp) {
        if (reqComp === 'KOUN_MOM') return mgmtComp.includes('KOUN') || mgmtComp === 'KM';
        if (reqComp === 'SNOUL') return mgmtComp.includes('SNOUL') || mgmtComp === 'SN';
        if (reqComp === 'NAM_LAO') return mgmtComp.includes('LAO') || mgmtComp === 'NL';
      }

      // 3. Theo tiền tố mã tài xế
      const code = (d.code || '').toUpperCase();
      if (code.startsWith('NL-') || code.startsWith('TX-NL')) return reqComp === 'NAM_LAO';
      if (code.startsWith('SN-') || code.startsWith('TX-SN')) return reqComp === 'SNOUL';
      if (code.startsWith('KM-') || code.startsWith('TX-KM')) return reqComp === 'KOUN_MOM';

      // 4. Theo businessUnit trong hồ sơ nhân sự
      const bu = (d.employee?.businessUnit || '').toUpperCase();
      if (bu.includes('LAO') || bu.includes('ATTAPEU')) return reqComp === 'NAM_LAO';
      if (bu.includes('SNOUL')) return reqComp === 'SNOUL';
      if (bu.includes('KOUN') || bu.includes('LUMPHAT') || bu.includes('IA PUCH')) return reqComp === 'KOUN_MOM';

      // 5. Theo employee.complex
      const empComp = (d.employee?.complex || '').toUpperCase();
      return (
        empComp === reqComp ||
        (reqComp === 'KOUN_MOM' && (empComp.includes('KOUN') || empComp.includes('KM'))) ||
        (reqComp === 'SNOUL' && (empComp.includes('SNOUL') || empComp.includes('SN'))) ||
        (reqComp === 'NAM_LAO' && (empComp.includes('LAO') || empComp.includes('NL')))
      );
    });
  }, [drivers, filters.complex, globalKLH]);

  // Danh sách Đơn vị công tác (Kết hợp Danh mục & Dữ liệu Lái xe có thực tế theo KLH)
  const enterpriseSelectOptions = useMemo(() => {
    const unassignedCount = klhFilteredDrivers.filter((d) => !d.managementAssignment?.teamUnitId && !d.teamUnit?.id && !d.team).length;
    const list: SelectOption[] = [];
    if (unassignedCount > 0) {
      list.push({
        value: '__UNASSIGNED__',
        label: 'Chưa phân bổ đơn vị (Không có dữ liệu)',
        subLabel: `${unassignedCount.toLocaleString('vi-VN')} nhân sự`,
      });
    }

    managementFilterUnits
      .forEach((unit) => {
        const count = klhFilteredDrivers.filter((d) => d.managementAssignment?.teamUnitId === unit.id || d.teamUnit?.id === unit.id).length;
        list.push({
          value: String(unit.id),
          label: unit.name,
          subLabel: `${count.toLocaleString('vi-VN')} nhân sự`,
        });
      });
    return list;
  }, [klhFilteredDrivers, managementFilterUnits]);

  const complexSelectOptions = useMemo(() => {
    const ownerUnits = options.managementUnits.filter((unit) => unit.level === 'OWNER' && unit.status === 'ACTIVE');
    const complexes = [...new Set(ownerUnits.map((unit) => unit.complexCode))].sort();
    const unassignedCount = drivers.filter((d: any) => {
      return (
        !d.complex &&
        !d.managementUnit?.complexCode &&
        !d.managementAssignment?.managementUnit?.complexCode &&
        !d.employee?.complex &&
        !d.employee?.businessUnit
      );
    }).length;
    const list: SelectOption[] = [];
    if (unassignedCount > 0) {
      list.push({
        value: '__UNASSIGNED__',
        label: 'Chưa phân Khu liên hợp (Không có dữ liệu)',
        subLabel: `${unassignedCount.toLocaleString('vi-VN')} nhân sự`,
      });
    }
    complexes.forEach((complexCode) => {
      const count = drivers.filter((driver) => driver.managementUnit?.complexCode === complexCode).length;
      const name = complexCode === 'KOUN_MOM' ? 'KLH Koun Mom' : complexCode === 'SNOUL' ? 'KLH Snoul' : complexCode === 'NAM_LAO' ? 'KLH Nam Lào' : complexCode;
      list.push({
        value: complexCode,
        label: name,
        subLabel: `${count.toLocaleString('vi-VN')} nhân sự`,
      });
    });
    return list;
  }, [drivers, options.managementUnits]);

  const managerSelectOptions = useMemo<SelectOption[]>(() => {
    const counts = new Map<number, number>();
    klhFilteredDrivers.forEach((driver) => {
      const manager = getEffectiveDriverManager(driver);
      if (manager) counts.set(manager.id, (counts.get(manager.id) || 0) + 1);
    });
    return managementFilterManagers.map((manager) => ({
        value: String(manager.id),
        label: manager.name,
        subLabel: [manager.phone, `${(counts.get(manager.id) ?? 0).toLocaleString('vi-VN')} nhân sự`].filter(Boolean).join(' · '),
      }));
  }, [klhFilteredDrivers, managementFilterManagers]);

  // Danh sách Đội/Tổ công tác (Kết hợp Danh mục Đội & Dữ liệu Lái xe có thực tế theo KLH)
  const teamSelectOptions = useMemo(() => {
    const selectedComplex = filters.complex || globalKLH;
    const unassignedCount = klhFilteredDrivers.filter((d) => !d.managementAssignment?.teamUnitId && !d.team).length;
    const list: SelectOption[] = [];
    if (unassignedCount > 0) {
      list.push({
        value: '__UNASSIGNED__',
        label: 'Chưa phân đội/tổ (Không có dữ liệu)',
        subLabel: `${unassignedCount.toLocaleString('vi-VN')} nhân sự`,
      });
    }

    options.managementUnits
      .filter((unit) => {
        if (unit.level !== 'TEAM' || unit.status !== 'ACTIVE') return false;
        if (filters.enterprise) return unit.parentId === Number(filters.enterprise);
        if (!selectedComplex || selectedComplex === 'ALL') return true;
        const reqComp = selectedComplex.toUpperCase();
        if (reqComp === 'KOUN_MOM') return unit.complexCode.includes('KOUN') || unit.complexCode === 'KM';
        if (reqComp === 'SNOUL') return unit.complexCode.includes('SNOUL') || unit.complexCode === 'SN';
        if (reqComp === 'NAM_LAO') return unit.complexCode.includes('LAO') || unit.complexCode === 'NL';
        return true;
      })
      .filter((unit) => {
        if (!filters.manager) return true;
        const owner = options.managementUnits.find((item) => item.id === unit.parentId);
        const manager = unit.managerAssignments?.[0]?.manager || owner?.managerAssignments?.[0]?.manager;
        return manager?.id === Number(filters.manager);
      })
      .forEach((unit) => {
        const count = klhFilteredDrivers.filter((d) => d.managementAssignment?.teamUnitId === unit.id).length;
        list.push({
          value: String(unit.id),
          label: unit.name,
          subLabel: `${count.toLocaleString('vi-VN')} nhân sự`,
        });
      });
    return list;
  }, [klhFilteredDrivers, options.managementUnits, filters.enterprise, filters.manager, filters.complex, globalKLH]);

  // Danh sách Chức danh công tác (Lấy từ Danh mục Chức danh chuẩn & thống kê thực tế)
  const positionSelectOptions = useMemo(() => {
    const counts: Record<string, number> = {};
    let unassignedCount = 0;
    klhFilteredDrivers.forEach((d) => {
      if (d.position) {
        counts[d.position] = (counts[d.position] || 0) + 1;
      } else {
        unassignedCount += 1;
      }
    });

    const catalogPositions = getStoredData<CatalogItem[]>('catalogs_positions', mockPositions);
    const posNames = new Set<string>();
    catalogPositions.forEach((p) => {
      if (p.name) posNames.add(p.name);
    });
    klhFilteredDrivers.forEach((d) => {
      if (d.position) posNames.add(d.position);
    });

    const list: SelectOption[] = [];
    if (unassignedCount > 0) {
      list.push({
        value: '__UNASSIGNED__',
        label: 'Chưa rõ chức danh (Không có dữ liệu)',
        subLabel: `${unassignedCount.toLocaleString('vi-VN')} nhân sự`,
      });
    }

    Array.from(posNames).forEach((name) => {
      list.push({
        value: name,
        label: name,
        subLabel: `${(counts[name] || 0).toLocaleString('vi-VN')} nhân sự`,
      });
    });

    return list;
  }, [klhFilteredDrivers]);

  // Danh sách Hạng GPLX / Bằng máy (Chỉ những hạng có data)
  const licenseClassSelectOptions = useMemo(() => {
    const counts: Record<string, number> = {};
    let unassignedCount = 0;
    klhFilteredDrivers.forEach((d) => {
      if (d.licenseClass && d.licenseClass !== 'KHONG') {
        counts[d.licenseClass] = (counts[d.licenseClass] || 0) + 1;
      } else {
        unassignedCount += 1;
      }
    });

    const list: SelectOption[] = [];
    if (unassignedCount > 0) {
      list.push({
        value: '__UNASSIGNED__',
        label: 'Chưa có GPLX / Bằng lái (Không có dữ liệu)',
        subLabel: `${unassignedCount.toLocaleString('vi-VN')} nhân sự`,
      });
    }

    Object.entries(counts).forEach(([key, count]) => {
      list.push({
        value: key,
        label: LICENSE_LABELS[key] || key,
        subLabel: `${count.toLocaleString('vi-VN')} nhân sự`,
      });
    });

    return list;
  }, [klhFilteredDrivers]);

  // Thống kê số lượng thực tế từ danh sách lái xe (Đảm bảo Tổng = Đang vận hành + Sẵn sàng + Đã nghỉ việc)
  const stats = useMemo(() => {
    const total = klhFilteredDrivers.length;
    const inactive = klhFilteredDrivers.filter((d) => d.employmentStatus === 'DA_NGHI_VIEC').length;
    const operating = klhFilteredDrivers.filter(
      (d) => d.employmentStatus !== 'DA_NGHI_VIEC' && d.currentShiftStatus === 'DANG_VAN_HANH',
    ).length;
    const ready = Math.max(0, total - inactive - operating);
    const unassignedVehicle = klhFilteredDrivers.filter(
      (d) => d.employmentStatus !== 'DA_NGHI_VIEC' && !hasDriverVehicleAssigned(d),
    ).length;
    const complianceAlerts = klhFilteredDrivers.filter(
      (d) => d.complianceStatus && d.complianceStatus !== 'VALID',
    ).length;

    return {
      total,
      operating,
      ready,
      inactive,
      unassignedVehicle,
      complianceAlerts,
    };
  }, [klhFilteredDrivers]);

  // Đếm số lượng bộ lọc đang kích hoạt
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (cardFilter !== 'ALL') count++;
    if (filters.complex) count++;
    if (filters.enterprise) count++;
    if (filters.manager) count++;
    if (filters.team) count++;
    if (filters.position) count++;
    if (filters.licenseClass) count++;
    if (filters.employmentStatus) count++;
    return count;
  }, [cardFilter, filters]);

  // Xuất file CSV/Excel danh sách nhân sự
  const handleExportExcel = () => {
    const csvCell = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const headers = ['Mã NV', 'Họ và tên', 'SĐT', 'Đơn vị sử dụng', 'Đội/Tổ', 'Nhân sự quản lý', 'SĐT quản lý', 'Chức danh', 'GPLX', 'Số GPLX', 'Trạng thái ca', 'Tình trạng làm việc'];
    const rows = displayDrivers.map((d) => [
      d.code,
      d.fullName,
      d.phone || '',
      d.managementUnit?.name || 'Chưa phân đơn vị',
      d.teamUnit?.name || d.team || '',
      getEffectiveDriverManager(d)?.fullName || 'Chưa có nhân sự quản lý',
      getEffectiveDriverManager(d)?.phone || '',
      d.position || '',
      LICENSE_LABELS[d.licenseClass] || d.licenseClass || '',
      d.licenseNumber || '',
      SHIFT_LABELS[d.currentShiftStatus] || '',
      d.employmentStatus === 'DANG_LAM_VIEC' ? 'Đang làm việc' : 'Đã nghỉ việc',
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers, ...rows].map((row) => row.map(csvCell).join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Danh_sach_lai_xe_THACO_AGRI_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportExcel = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setImporting(true);
    setImportMessage('');
    try {
      const rows = await parseOperationalImport(file, 'DRIVER');
      if (rows.length === 0) throw new Error('File không có dòng dữ liệu mới (dòng ví dụ được tự động bỏ qua).');
      const vehicles = await apiService.getVehicles().catch(() => []);
      let imported = 0;
      for (const row of rows) {
        if (!row.code || !row.fullName || !row.phone || !row.complex || !row.businessUnit || !row.position || !row.joinedDate || !row.employmentStatus || !row.licenseClass || !row.licenseExpiryDate) {
          throw new Error(`Dòng ${imported + 2} thiếu trường bắt buộc của hồ sơ lái xe.`);
        }
        const orgText = `${row.businessUnit || ''} ${row.farm || ''}`.toLocaleLowerCase('vi-VN');
        const unit = orgText.includes('bò') ? 'KOUN_MOM'
          : orgText.includes('nông trường 2') || orgText.includes('KOUN_MOM') ? 'KOUN_MOM'
            : orgText.includes('nông trường 1') || orgText.includes('KOUN_MOM') ? 'KOUN_MOM'
              : orgText.includes('btsc') || orgText.includes('xưởng') ? 'KOUN_MOM' : 'KOUN_MOM';
        const vehicle = vehicles.find((item: any) => item.internalCode === row.primaryVehicleCode || item.code === row.primaryVehicleCode);
        const notes = [
          row.gender ? `Giới tính: ${row.gender}` : '', row.dateOfBirth ? `Ngày sinh: ${row.dateOfBirth}` : '',
          row.nationality ? `Quốc tịch: ${row.nationality}` : '', row.permanentAddress ? `Thường trú: ${row.permanentAddress}` : '',
          row.currentAddress ? `Nơi ở hiện tại: ${row.currentAddress}` : '', row.contractType ? `Hợp đồng: ${row.contractType}` : '',
          row.licenseIssueDate ? `Ngày cấp GPLX: ${row.licenseIssueDate}` : '',
        ].filter(Boolean).join(' · ');
        const payload: Record<string, unknown> = {
          ...row,
          username: String(row.username || row.code).toLocaleLowerCase('vi-VN').replace(/[^a-z0-9]/g, '_'),
          password: 'Thaco@1234$', role: 'DRIVER', unit, notes,
          joinedDate: toIsoDate(row.joinedDate), idCardIssueDate: toIsoDate(row.idCardIssueDate),
          licenseExpiryDate: toIsoDate(row.licenseExpiryDate), healthCheckExpiryDate: toIsoDate(row.healthCheckExpiryDate),
          resignedDate: toIsoDate(row.resignedDate),
          assignedVehicleId: vehicle ? Number(String(vehicle.id).replace(/\D/g, '')) : undefined,
        };
        ['gender', 'dateOfBirth', 'nationality', 'permanentAddress', 'currentAddress', 'contractType', 'licenseIssueDate', 'primaryVehicleCode'].forEach((key) => delete payload[key]);
        Object.keys(payload).forEach((key) => payload[key] === undefined && delete payload[key]);
        await apiService.createDriverProfile(payload);
        imported += 1;
      }
      setImportMessage(`Đã import thành công ${imported} hồ sơ lái xe.`);
      await loadDrivers();
    } catch (error: any) {
      setImportMessage(error?.response?.data?.message || error?.message || 'Import hồ sơ lái xe thất bại.');
    } finally {
      setImporting(false);
    }
  };

  // Lọc dữ liệu kết hợp giữa Card KPI, Bộ lọc KLH toàn cục và Form Lọc nâng cao
  const displayDrivers = useMemo(() => {
    return klhFilteredDrivers.filter((item) => {
      // 1. Lọc theo Thẻ KPI đang chọn (Tương ứng chuẩn 100% với số lượng thống kê)
      if (cardFilter === 'OPERATING') {
        if (item.employmentStatus === 'DA_NGHI_VIEC' || item.currentShiftStatus !== 'DANG_VAN_HANH') return false;
      }
      if (cardFilter === 'READY') {
        if (item.employmentStatus === 'DA_NGHI_VIEC' || item.currentShiftStatus === 'DANG_VAN_HANH') return false;
      }
      if (cardFilter === 'INACTIVE') {
        if (item.employmentStatus !== 'DA_NGHI_VIEC') return false;
      }
      if (cardFilter === 'UNASSIGNED_VEHICLE') {
        if (item.employmentStatus === 'DA_NGHI_VIEC' || hasDriverVehicleAssigned(item)) return false;
      }
      if (cardFilter === 'COMPLIANCE_ALERT') {
        if (!item.complianceStatus || item.complianceStatus === 'VALID') return false;
      }

      // 2. Tìm kiếm theo từ khóa
      if (filters.search) {
        const q = filters.search.toLowerCase();
        const match = [
          item.code,
          item.fullName,
          item.phone,
          item.enterprise,
          item.team,
          item.position,
          UNIT_LABELS[item.unit] || item.unit,
          item.employee?.idCardNumber,
          item.licenseNumber,
          getEffectiveDriverManager(item)?.fullName,
          getEffectiveDriverManager(item)?.phone,
        ].some((val) => String(val || '').toLowerCase().includes(q));
        if (!match) return false;
      }

      // 3. Lọc theo Đơn vị
      if (filters.enterprise) {
        if (filters.enterprise === '__UNASSIGNED__') {
          if (item.managementAssignment?.teamUnitId || item.teamUnit?.id || item.team) return false;
        } else if (item.managementAssignment?.teamUnitId !== Number(filters.enterprise) && item.teamUnit?.id !== Number(filters.enterprise)) {
          return false;
        }
      }

      // 4. Lọc theo Đội/Tổ
      if (filters.team) {
        if (filters.team === '__UNASSIGNED__') {
          if (item.managementAssignment?.teamUnitId || item.team) return false;
        } else if (item.managementAssignment?.teamUnitId !== Number(filters.team)) {
          return false;
        }
      }

      // 5. Lọc theo nhân sự quản lý hiệu lực (quản lý Đội/Tổ được ưu tiên)
      if (filters.manager && getEffectiveDriverManager(item)?.id !== Number(filters.manager)) return false;

      // 6. Lọc theo Chức danh
      if (filters.position) {
        if (filters.position === '__UNASSIGNED__') {
          if (item.position) return false;
        } else if (item.position !== filters.position) {
          return false;
        }
      }

      // 7. Lọc theo Hạng GPLX
      if (filters.licenseClass) {
        if (filters.licenseClass === '__UNASSIGNED__') {
          if (item.licenseClass && item.licenseClass !== 'KHONG') return false;
        } else if (item.licenseClass !== filters.licenseClass) {
          return false;
        }
      }

      // 8. Lọc theo Trạng thái làm việc
      if (filters.employmentStatus && item.employmentStatus !== filters.employmentStatus) return false;

      return true;
    });
  }, [klhFilteredDrivers, cardFilter, filters]);

  const managementGroups = useMemo(
    () => groupDriversByManagement(displayDrivers),
    [displayDrivers],
  );

  const toggleCollapsed = (setter: React.Dispatch<React.SetStateAction<Set<string>>>, key: string) => {
    setter((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const openDetail = async (driver: DriverListItem) => {
    setDetailLoading(true);
    setDetailTab(0);
    try {
      setSelected(await apiService.getDriverProfile(driver.id));
    } catch {
      setError(`Không tải được hồ sơ ${driver.code}.`);
    } finally {
      setDetailLoading(false);
    }
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(defaultForm());
    setFormStep(0);
    setEditorOpen(true);
  };

  const openEdit = async (driver: DriverListItem | DriverProfile) => {
    const detail = 'kpis' in driver ? driver : await apiService.getDriverProfile(driver.id);
    setEditingId(detail.id);

    let initialLicenses: DriverLicenseItem[] = [];
    if (Array.isArray((detail as any).licenses) && (detail as any).licenses.length > 0) {
      initialLicenses = (detail as any).licenses.map((l: any) => ({
        category: l.category || 'GPLX B2',
        number: l.number || '',
        issueDate: inputDate(l.issueDate),
        expiryDate: inputDate(l.expiryDate),
        issuedBy: l.issuedBy || '',
        isPrimary: Boolean(l.isPrimary),
      }));
    } else if (detail.licenseClass || detail.licenseNumber) {
      initialLicenses = [{
        category: detail.licenseClass || 'GPLX B2',
        number: detail.licenseNumber || '',
        issueDate: '',
        expiryDate: inputDate(detail.licenseExpiryDate),
        issuedBy: '',
        isPrimary: true,
      }];
    }

    let initialVehicles: AssignedVehicleItem[] = [];
    if (Array.isArray((detail as any).assignedVehicles) && (detail as any).assignedVehicles.length > 0) {
      initialVehicles = (detail as any).assignedVehicles.map((item: any) => ({
        id: item.id,
        vehicleId: item.vehicleId || item.vehicle?.id,
        type: item.type || 'PRIMARY',
        vehicle: item.vehicle || options.vehicles.find((v) => v.id === (item.vehicleId || item.vehicle?.id)),
      }));
    } else {
      if (detail.assignedVehicle?.id) {
        initialVehicles.push({
          vehicleId: detail.assignedVehicle.id,
          type: 'PRIMARY',
          vehicle: detail.assignedVehicle,
        });
      }
      if (Array.isArray((detail as any).secondaryVehicles)) {
        (detail as any).secondaryVehicles.forEach((v: any) => {
          if (v?.id && !initialVehicles.some((x) => x.vehicleId === v.id)) {
            initialVehicles.push({ vehicleId: v.id, type: 'SECONDARY', vehicle: v });
          }
        });
      }
    }

    const allVehicleIds = initialVehicles.map((v) => v.vehicleId);

    setForm({
      ...defaultForm(),
      code: detail.code,
      username: detail.username,
      fullName: detail.fullName,
      phone: detail.phone || '',
      unit: detail.unit,
      joinedDate: inputDate(detail.joinedDate),
      employmentStatus: detail.employmentStatus,
      businessUnit: detail.employee?.businessUnit || '',
      complex: detail.managementUnit?.complexCode || '',
      enterprise: detail.employee?.enterprise || '',
      farm: detail.employee?.farm || '',
      team: detail.employee?.team || '',
      managementUnitId: detail.managementAssignment?.managementUnitId ? String(detail.managementAssignment.managementUnitId) : '',
      teamUnitId: detail.managementAssignment?.teamUnitId ? String(detail.managementAssignment.teamUnitId) : '',
      position: detail.employee?.position || '',
      email: detail.employee?.email || '',
      idCardNumber: detail.employee?.idCardNumber || '',
      idCardIssueDate: detail.employee?.idCardIssueDate || '',
      idCardIssuePlace: detail.employee?.idCardIssuePlace || '',
      avatarUrl: detail.avatarUrl || '',
      licenseClass: detail.licenseClass || (initialLicenses[0]?.category ?? ''),
      licenseNumber: detail.licenseNumber || (initialLicenses[0]?.number ?? ''),
      licenseExpiryDate: inputDate(detail.licenseExpiryDate) || (initialLicenses[0]?.expiryDate ?? ''),
      licenses: initialLicenses,
      healthCheckExpiryDate: inputDate(detail.healthCheckExpiryDate),
      currentShiftStatus: detail.currentShiftStatus || 'SAN_SANG',
      currentLocation: detail.currentLocation || '',
      assignedVehicleId: allVehicleIds[0] ? String(allVehicleIds[0]) : '',
      assignedVehicleIds: allVehicleIds,
      assignedVehicles: initialVehicles,
      resignedDate: inputDate(detail.resignedDate),
      resignedReason: detail.resignedReason || '',
      notes: detail.notes || '',
      password: '',
    });
    setSelected(null);
    setFormStep(0);
    setEditorOpen(true);
  };

  const openEditAssignVehicle = async (driver: DriverListItem | DriverProfile) => {
    await openEdit(driver);
    setFormStep(5);
  };

  const setField = (name: string, value: string) => setForm((current) => ({ ...current, [name]: value }));

  const addLicense = (category = 'Hạng B2 (Máy cày, ô tô con <9 chỗ, tải <3.5T)') => {
    setForm((curr) => {
      const isFirst = curr.licenses.length === 0;
      const newLicenses = [
        ...curr.licenses,
        {
          category,
          number: '',
          issueDate: '',
          expiryDate: '',
          issuedBy: '',
          isPrimary: isFirst,
        },
      ];
      return { ...curr, licenses: newLicenses };
    });
  };

  const updateLicense = (index: number, field: string, value: any) => {
    setForm((curr) => {
      const newLicenses = curr.licenses.map((lic, i) => (i === index ? { ...lic, [field]: value } : lic));
      return { ...curr, licenses: newLicenses };
    });
  };

  const setPrimaryLicense = (index: number) => {
    setForm((curr) => {
      const newLicenses = curr.licenses.map((lic, i) => ({
        ...lic,
        isPrimary: i === index,
      }));
      return {
        ...curr,
        licenses: newLicenses,
        licenseClass: newLicenses[index]?.category || curr.licenseClass,
        licenseNumber: newLicenses[index]?.number || curr.licenseNumber,
        licenseExpiryDate: newLicenses[index]?.expiryDate || curr.licenseExpiryDate,
      };
    });
  };

  const removeLicense = (index: number) => {
    setForm((curr) => {
      const newLicenses = curr.licenses.filter((_, i) => i !== index);
      if (newLicenses.length > 0 && !newLicenses.some((l) => l.isPrimary)) {
        newLicenses[0].isPrimary = true;
      }
      return { ...curr, licenses: newLicenses };
    });
  };

  const addAssignedVehicle = (vehicleId: number, type: 'PRIMARY' | 'SECONDARY' = 'PRIMARY') => {
    const currentVehicles = form.assignedVehicles || [];
    if (currentVehicles.some((v) => v.vehicleId === vehicleId)) return;

    const primaryCount = currentVehicles.filter((v) => v.type === 'PRIMARY').length;
    const secondaryCount = currentVehicles.filter((v) => v.type === 'SECONDARY').length;

    if (type === 'PRIMARY' && primaryCount >= 2) {
      alert('Mỗi tài xế chỉ được phụ trách chính tối đa 2 xe.');
      return;
    }
    if (type === 'SECONDARY' && secondaryCount >= 2) {
      alert('Mỗi tài xế chỉ được phụ trách phụ tối đa 2 xe.');
      return;
    }

    const v = options.vehicles.find((item) => item.id === vehicleId);
    const updated = [...currentVehicles, { vehicleId, type, vehicle: v }];
    setForm((curr) => ({
      ...curr,
      assignedVehicles: updated,
      assignedVehicleIds: updated.map((item) => item.vehicleId),
      assignedVehicleId: updated.find((item) => item.type === 'PRIMARY')?.vehicleId ? String(updated.find((item) => item.type === 'PRIMARY')!.vehicleId) : (updated[0] ? String(updated[0].vehicleId) : ''),
    }));
  };

  const toggleVehicleRole = (vehicleId: number) => {
    const currentVehicles = form.assignedVehicles || [];
    const target = currentVehicles.find((v) => v.vehicleId === vehicleId);
    if (!target) return;

    const newType: 'PRIMARY' | 'SECONDARY' = target.type === 'PRIMARY' ? 'SECONDARY' : 'PRIMARY';
    const primaryCount = currentVehicles.filter((v) => v.type === 'PRIMARY').length;
    const secondaryCount = currentVehicles.filter((v) => v.type === 'SECONDARY').length;

    if (newType === 'PRIMARY' && primaryCount >= 2) {
      alert('Mỗi tài xế chỉ được phụ trách chính tối đa 2 xe.');
      return;
    }
    if (newType === 'SECONDARY' && secondaryCount >= 2) {
      alert('Mỗi tài xế chỉ được phụ trách phụ tối đa 2 xe.');
      return;
    }

    const updated = currentVehicles.map((v) => (v.vehicleId === vehicleId ? { ...v, type: newType } : v));
    setForm((curr) => ({
      ...curr,
      assignedVehicles: updated,
      assignedVehicleIds: updated.map((item) => item.vehicleId),
      assignedVehicleId: updated.find((item) => item.type === 'PRIMARY')?.vehicleId ? String(updated.find((item) => item.type === 'PRIMARY')!.vehicleId) : (updated[0] ? String(updated[0].vehicleId) : ''),
    }));
  };

  const removeAssignedVehicle = (vehicleId: number) => {
    const currentVehicles = form.assignedVehicles || [];
    const updated = currentVehicles.filter((v) => v.vehicleId !== vehicleId);
    setForm((curr) => ({
      ...curr,
      assignedVehicles: updated,
      assignedVehicleIds: updated.map((item) => item.vehicleId),
      assignedVehicleId: updated.find((item) => item.type === 'PRIMARY')?.vehicleId ? String(updated.find((item) => item.type === 'PRIMARY')!.vehicleId) : (updated[0] ? String(updated[0].vehicleId) : ''),
    }));
  };

  const handleDetailAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError('Dung lượng ảnh không được vượt quá 5MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      if (selected) {
        setSelected({ ...selected, avatarUrl: base64 });
        try {
          await apiService.updateDriverProfile(selected.id, { avatarUrl: base64 });
          await loadDrivers();
        } catch {
          // Lưu preview cục bộ
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const handleEditorAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError('Dung lượng ảnh không được vượt quá 5MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setForm((curr) => ({ ...curr, avatarUrl: base64 }));
    };
    reader.readAsDataURL(file);
  };

  const submitProfile = async () => {
    setSaving(true);
    setError('');
    const payload: Record<string, unknown> = { ...form };
    if (form.managementUnitId) payload.managementUnitId = Number(form.managementUnitId);
    else delete payload.managementUnitId;
    if (form.teamUnitId) payload.teamUnitId = Number(form.teamUnitId);
    else delete payload.teamUnitId;
    delete payload.businessUnit;
    delete payload.enterprise;
    delete payload.farm;
    delete payload.team;
    if (!payload.username || !(payload.username as string).trim()) {
      payload.username = (form.code || 'driver').toLowerCase().replace(/[^a-z0-9]/g, '_');
    }
    if (!payload.password || !(payload.password as string).trim()) {
      if (!editingId) {
        payload.password = 'Thaco@1234$';
      } else {
        delete payload.password;
      }
    }
    // Mặc định vai trò luôn là Tài xế khi tạo/sửa ở hồ sơ lái xe
    payload.role = 'DRIVER';

    // User.unit được giữ cho tương thích vận hành; không suy diễn từ tên đơn vị hồ sơ.
    payload.unit = form.unit || 'KOUN_MOM';

    if (form.licenses && form.licenses.length > 0) {
      payload.licenses = form.licenses;
      const primary = form.licenses.find((l) => l.isPrimary) || form.licenses[0];
      if (primary) {
        payload.licenseClass = primary.category;
        payload.licenseNumber = primary.number;
        if (primary.expiryDate) payload.licenseExpiryDate = primary.expiryDate;
      }
    }
    if (form.assignedVehicles && form.assignedVehicles.length > 0) {
      payload.assignedVehicles = form.assignedVehicles.map((v) => ({
        vehicleId: v.vehicleId,
        type: v.type,
      }));
      const primary = form.assignedVehicles.find((v) => v.type === 'PRIMARY');
      payload.assignedVehicleId = primary ? primary.vehicleId : form.assignedVehicles[0].vehicleId;
      payload.assignedVehicleIds = form.assignedVehicles.map((v) => v.vehicleId);
    }

    if (!payload.assignedVehicleId) delete payload.assignedVehicleId;
    else payload.assignedVehicleId = Number(payload.assignedVehicleId);
    ['licenseClass', 'licenseExpiryDate', 'healthCheckExpiryDate', 'resignedDate'].forEach((key) => {
      if (!payload[key]) delete payload[key];
    });
    try {
      const saved = editingId ? await apiService.updateDriverProfile(editingId, payload) : await apiService.createDriverProfile(payload);
      const driverId = editingId || saved?.id;
      if (driverId && form.managementUnitId) {
        await driverManagementApi.assignDriver({ driverId, managementUnitId: Number(form.managementUnitId), teamUnitId: form.teamUnitId ? Number(form.teamUnitId) : undefined, reason: editingId ? 'Cập nhật hồ sơ tài xế' : 'Tiếp nhận hồ sơ tài xế' });
      }
      setEditorOpen(false);
      await loadDrivers();
    } catch (requestError: any) {
      setError(requestError?.response?.data?.message || 'Không thể lưu hồ sơ. Vui lòng kiểm tra các trường bắt buộc.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteDriver = async (driver: DriverListItem) => {
    if (!window.confirm(`Bạn có chắc chắn muốn chuyển tài xế "${driver.fullName}" (${driver.code}) sang trạng thái thôi việc?`)) return;
    try {
      await apiService.updateDriverProfile(driver.id, { employmentStatus: 'DA_NGHI_VIEC', resignedDate: new Date().toISOString().slice(0, 10) });
      await loadDrivers();
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Không thể cập nhật trạng thái thôi việc.');
    }
  };

  const columns = useMemo<Column<DriverListItem>[]>(() => [
    { key: 'code', title: 'MÃ NHÂN VIÊN', sortable: true, render: (row) => <span className="font-mono font-bold text-primary">{row.code}</span> },
    { key: 'fullName', title: 'HỌ VÀ TÊN', sortable: true, render: (row) => (
      <div className="flex items-center gap-2">
        {row.avatarUrl && <img src={row.avatarUrl} alt="" className="h-7 w-7 rounded-full object-cover" />}
        <span className="font-bold text-slate-900">{row.fullName}</span>
      </div>
    ) },
    {
      key: 'assignedVehicle',
      title: 'XE QUẢN LÝ (CHÍNH / PHỤ)',
      render: (row) => {
        const primaryList = row.primaryVehicles || (row.assignedVehicles ? row.assignedVehicles.filter(v => v.type === 'PRIMARY').map(v => v.vehicle).filter(Boolean) : (row.assignedVehicle ? [row.assignedVehicle] : []));
        const secondaryList = row.secondaryVehicles || (row.assignedVehicles ? row.assignedVehicles.filter(v => v.type === 'SECONDARY').map(v => v.vehicle).filter(Boolean) : (row.secondaryVehicles || []));
        const totalVehicles = [...primaryList, ...secondaryList];

        if (totalVehicles.length === 0) {
          return (
            <div className="flex items-center gap-1.5">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                Chưa gắn xe
              </span>
              {canEditDriverProfile && row.employmentStatus !== 'DA_NGHI_VIEC' && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    void openEditAssignVehicle(row);
                  }}
                  className="px-1.5 py-0.5 text-[10px] font-bold text-primary hover:text-primary-700 hover:bg-primary-50 rounded border border-dashed border-primary/40 transition cursor-pointer"
                  title="Gán xe quản lý cho nhân sự này"
                >
                  + Gán xe
                </button>
              )}
            </div>
          );
        }

        return (
          <div className="flex flex-col gap-1">
            {primaryList.length > 0 && (
              <div className="flex items-center gap-1 flex-wrap">
                <span className="inline-flex items-center gap-1 font-mono font-bold text-xs text-slate-900 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                  {primaryList[0]?.plate || primaryList[0]?.code}
                  {primaryList.length > 1 && <span className="text-[10px] text-emerald-700 font-bold">+{primaryList.length - 1}</span>}
                </span>
              </div>
            )}
            {secondaryList.length > 0 && (
              <div className="flex items-center gap-1 flex-wrap">
                <span className="inline-flex items-center gap-1 font-mono font-bold text-xs text-slate-700 bg-sky-50 px-1.5 py-0.5 rounded border border-sky-200" title="Xe phụ hỗ trợ đồng quản lý tài sản">
                  <span className="text-[9px] font-extrabold text-sky-800 bg-sky-100 px-1 rounded">Phụ</span>
                  {secondaryList[0]?.plate || secondaryList[0]?.code}
                  {secondaryList.length > 1 && <span className="text-[10px] text-sky-700 font-bold">+{secondaryList.length - 1}</span>}
                </span>
              </div>
            )}
          </div>
        );
      },
    },
    {
      key: 'licenses',
      title: 'BẰNG LÁI & CHỨNG CHỈ',
      render: (row) => {
        const licenses = row.licenses && row.licenses.length > 0
          ? row.licenses
          : (row.licenseClass || row.licenseNumber ? [{
              category: LICENSE_LABELS[row.licenseClass || ''] || row.licenseClass || 'GPLX',
              number: row.licenseNumber || '',
              isPrimary: true,
            }] : []);

        if (licenses.length === 0) {
          return <span className="text-slate-400 text-xs italic">Chưa khai báo</span>;
        }

        const primary = licenses.find((l) => l.isPrimary) || licenses[0];
        const extraCount = licenses.length - 1;

        return (
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-bold text-xs text-slate-800" title={primary.category}>
                {primary.category.length > 25 ? `${primary.category.slice(0, 25)}...` : primary.category}
              </span>
              {extraCount > 0 && (
                <span
                  title={licenses.map((l) => `${l.category} (${l.number || 'Số bằng'})`).join('\n')}
                  className="rounded-full bg-blue-100 px-1.5 py-0.2 text-[10px] font-extrabold text-blue-800 border border-blue-300 cursor-help"
                >
                  +{extraCount} bằng
                </span>
              )}
            </div>
            {primary.number && (
              <span className="font-mono text-[11px] text-slate-500">
                Số: {primary.number}
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: 'enterprise',
      title: 'ĐƠN VỊ CHỦ QUẢN',
      render: (row) => row.managementUnit?.name ? (
        <span className="font-semibold text-slate-800">{row.managementUnit.name}</span>
      ) : (
        <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded text-[11px] font-semibold border border-amber-200">Chưa phân loại</span>
      ),
    },
    {
      key: 'team',
      title: 'ĐỘI / TỔ',
      render: (row) => row.teamUnit?.name || row.team || (row.managementUnit ? '—' : 'Chưa phân loại'),
    },
    {
      key: 'manager',
      title: 'NS QUẢN LÝ',
      render: (row) => row.management?.manager?.fullName || <span className="text-amber-700">Chưa phân công</span>,
    },
    {
      key: 'managerPhone',
      title: 'SĐT NS QUẢN LÝ',
      render: (row) => row.management?.manager?.phone || '—',
    },
    { key: 'position', title: 'CHỨC DANH', render: (row) => row.position || '—' },
    { key: 'employmentStatus', title: 'TRẠNG THÁI', render: (row) => employmentBadge(row.employmentStatus) },
    {
      key: 'actions',
      title: 'THAO TÁC',
      align: 'center',
      render: (row) => (
        <TableRowActions
          onView={() => void openDetail(row)}
          onEdit={canEditDriverProfile ? () => void openEdit(row) : undefined}
          onDelete={canEditDriverProfile ? () => void handleDeleteDriver(row) : undefined}
          viewTitle="Xem chi tiết hồ sơ"
          editTitle="Chỉnh sửa hồ sơ"
          deleteTitle="Thôi việc / Xóa hồ sơ"
        />
      ),
    },
  ], [canEditDriverProfile]);

  return (
    <div className="space-y-4">
      {/* 1. KPIGrid 5 Thẻ thống kê - THIẾT KẾ CHUẨN ĐẸP THEO HÌNH THỨ 2 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Card 1: Tổng nhân sự (Blue Theme) */}
        <button
          type="button"
          onClick={() => setCardFilter('ALL')}
          aria-pressed={cardFilter === 'ALL'}
          aria-label="Lọc tất cả nhân sự. Nhấn để hiển thị danh sách đầy đủ."
          title="Nhấn để hiển thị toàn bộ nhân sự"
          className={`relative overflow-hidden p-4 rounded-2xl border text-left transition-all hover:shadow-md cursor-pointer ${
            cardFilter === 'ALL'
              ? 'border-blue-500 bg-blue-50/40 ring-2 ring-blue-500/25 shadow-sm scale-[1.01]'
              : 'border-slate-200 bg-white hover:bg-slate-50'
          }`}
        >
          <span className="absolute inset-x-0 bottom-0 h-1.5 bg-blue-500" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-700">Tổng nhân sự</span>
            <div className="rounded-xl p-2 bg-blue-50 text-blue-600">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-blue-700">
            {stats.total.toLocaleString('vi-VN')}
          </div>
          <div className="mt-1 text-[11px] font-semibold text-blue-600 truncate">
            Lái xe, lái máy, thợ vận hành
          </div>
        </button>

        {/* Card 2: Đang vận hành (Emerald Theme) */}
        <button
          type="button"
          onClick={() => setCardFilter((curr) => (curr === 'OPERATING' ? 'ALL' : 'OPERATING'))}
          aria-pressed={cardFilter === 'OPERATING'}
          aria-label="Lọc tài xế đang vận hành. Nhấn để lọc; nhấn lại để bỏ lọc."
          title="Nhấn để lọc nhân sự đang vận hành; nhấn lại để bỏ lọc"
          className={`relative overflow-hidden p-4 rounded-2xl border text-left transition-all hover:shadow-md cursor-pointer ${
            cardFilter === 'OPERATING'
              ? 'border-emerald-500 bg-emerald-50/40 ring-2 ring-emerald-500/25 shadow-sm scale-[1.01]'
              : 'border-slate-200 bg-white hover:bg-slate-50'
          }`}
        >
          <span className="absolute inset-x-0 bottom-0 h-1.5 bg-emerald-500" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-700">Đang vận hành</span>
            <div className="rounded-xl p-2 bg-emerald-50 text-emerald-600">
              <Truck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-emerald-700">
            {stats.operating.toLocaleString('vi-VN')}
          </div>
          <div className="mt-1 text-[11px] font-semibold text-emerald-600 truncate">
            Đang thực hiện ca/lệnh
          </div>
        </button>

        {/* Card 3: Sẵn sàng (Teal Theme) */}
        <button
          type="button"
          onClick={() => setCardFilter((curr) => (curr === 'READY' ? 'ALL' : 'READY'))}
          aria-pressed={cardFilter === 'READY'}
          aria-label="Lọc tài xế sẵn sàng nhận ca. Nhấn để lọc; nhấn lại để bỏ lọc."
          title="Nhấn để lọc nhân sự sẵn sàng; nhấn lại để bỏ lọc"
          className={`relative overflow-hidden p-4 rounded-2xl border text-left transition-all hover:shadow-md cursor-pointer ${
            cardFilter === 'READY'
              ? 'border-teal-500 bg-teal-50/40 ring-2 ring-teal-500/25 shadow-sm scale-[1.01]'
              : 'border-slate-200 bg-white hover:bg-slate-50'
          }`}
        >
          <span className="absolute inset-x-0 bottom-0 h-1.5 bg-teal-500" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-teal-700">Sẵn sàng</span>
            <div className="rounded-xl p-2 bg-teal-50 text-teal-600">
              <UserCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-teal-700">
            {stats.ready.toLocaleString('vi-VN')}
          </div>
          <div className="mt-1 text-[11px] font-semibold text-teal-600 truncate">
            Có thể nhận phân công
          </div>
        </button>

        {/* Card 4: Đã nghỉ việc (Slate Theme) */}
        <button
          type="button"
          onClick={() => setCardFilter((curr) => (curr === 'INACTIVE' ? 'ALL' : 'INACTIVE'))}
          aria-pressed={cardFilter === 'INACTIVE'}
          aria-label="Lọc hồ sơ đã nghỉ việc. Nhấn để lọc; nhấn lại để bỏ lọc."
          title="Nhấn để lọc nhân sự đã nghỉ việc; nhấn lại để bỏ lọc"
          className={`relative overflow-hidden p-4 rounded-2xl border text-left transition-all hover:shadow-md cursor-pointer ${
            cardFilter === 'INACTIVE'
              ? 'border-slate-500 bg-slate-100 ring-2 ring-slate-400/25 shadow-sm scale-[1.01]'
              : 'border-slate-200 bg-white hover:bg-slate-50'
          }`}
        >
          <span className="absolute inset-x-0 bottom-0 h-1.5 bg-slate-500" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700">Đã nghỉ việc</span>
            <div className="rounded-xl p-2 bg-slate-100 text-slate-600">
              <Briefcase className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-slate-800">
            {stats.inactive.toLocaleString('vi-VN')}
          </div>
          <div className="mt-1 text-[11px] font-semibold text-slate-600 truncate">
            Hồ sơ được giữ để truy vết
          </div>
        </button>

        {/* Card 5: Chưa gắn xe (Amber Theme) */}
        <button
          type="button"
          onClick={() => setCardFilter((curr) => (curr === 'UNASSIGNED_VEHICLE' ? 'ALL' : 'UNASSIGNED_VEHICLE'))}
          aria-pressed={cardFilter === 'UNASSIGNED_VEHICLE'}
          aria-label="Lọc nhanh danh sách hồ sơ: Chưa gắn xe (nhân sự chưa được phân bổ xe phụ trách). Nhấn để lọc hoặc bỏ lọc."
          title="Nhấn để lọc các nhân sự chưa được gắn xe; nhấn lại để bỏ lọc"
          className={`relative overflow-hidden p-4 rounded-2xl border text-left transition-all hover:shadow-md cursor-pointer ${
            cardFilter === 'UNASSIGNED_VEHICLE'
              ? 'border-amber-500 bg-amber-50/50 ring-2 ring-amber-500/25 shadow-sm scale-[1.01]'
              : 'border-slate-200 bg-white hover:bg-slate-50'
          }`}
        >
          <span className="absolute inset-x-0 bottom-0 h-1.5 bg-amber-500" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-700">Chưa gắn xe</span>
            <div className="rounded-xl p-2 bg-amber-50 text-amber-600">
              <Truck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-amber-700">
            {stats.unassignedVehicle.toLocaleString('vi-VN')}
          </div>
          <div className="mt-1 text-[11px] font-semibold text-amber-600 truncate">
            Chưa phân xe phụ trách
          </div>
        </button>
      </div>

      {/* 2. THANH TÌM KIẾM & BỘ LỌC DẠNG SELECT TEXT (THIẾT KẾ CHUẨN GIỐNG HÌNH THỨ 2) */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
        {/* HÀNG 1: TIÊU ĐỀ & CÁC NÚT THAO TÁC HEADER */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <span className="font-heading text-sm font-extrabold text-slate-800 uppercase tracking-wide">
              Danh sách Hồ sơ Lái xe & Thợ vận hành
            </span>
            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
              {displayDrivers.length} nhân sự
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <div className="inline-flex h-9 rounded-xl border border-slate-200 bg-slate-50 p-0.5" role="group" aria-label="Chế độ hiển thị hồ sơ lái xe">
              <button
                type="button"
                onClick={() => setViewMode('GROUPED')}
                aria-pressed={viewMode === 'GROUPED'}
                className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 text-xs font-bold transition ${viewMode === 'GROUPED' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
              >
                <Network className="h-3.5 w-3.5" />
                Theo đơn vị & quản lý
              </button>
              <button
                type="button"
                onClick={() => setViewMode('LIST')}
                aria-pressed={viewMode === 'LIST'}
                className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 text-xs font-bold transition ${viewMode === 'LIST' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
              >
                <List className="h-3.5 w-3.5" />
                Danh sách
              </button>
            </div>
            <input ref={importFileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImportExcel} />
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-primary bg-primary px-3.5 text-xs font-black text-white shadow-xs transition-all hover:bg-primary-600 hover:scale-[1.01] cursor-pointer"
            >
              <Plus className="h-4 w-4 stroke-[3]" />
              Tiếp nhận nhân sự
            </button>

            <button
              type="button"
              onClick={() => void catalogsApi.downloadTemplate('DRIVER')}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 text-xs font-bold text-emerald-800 transition-all hover:bg-emerald-100 cursor-pointer"
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              Tải file mẫu
            </button>

            <button
              type="button"
              onClick={() => importFileInputRef.current?.click()}
              disabled={importing}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-sky-200 bg-sky-50 px-3 text-xs font-bold text-sky-800 transition-all hover:bg-sky-100 disabled:opacity-50 cursor-pointer"
            >
              <Upload className="h-3.5 w-3.5" />
              {importing ? 'Đang import...' : 'Import Excel'}
            </button>

            <button
              type="button"
              onClick={handleExportExcel}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-bold text-slate-700 transition-all hover:bg-slate-100 cursor-pointer"
            >
              <Download className="h-3.5 w-3.5 text-emerald-700" />
              Xuất Excel ({displayDrivers.length})
            </button>
          </div>
        </div>

        {importMessage && (
          <div className={`rounded-xl border px-3 py-2 text-xs font-semibold ${importMessage.startsWith('Đã import') ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-700'}`}>
            {importMessage}
          </div>
        )}

        {/* HÀNG 2: Ô TÌM KIẾM TO RÕ & NÚT BẬT TẮT BỘ LỌC NÂNG CAO */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center justify-between">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                placeholder="Nhập họ tên lái xe, mã nhân viên, CCCD, GPLX, số điện thoại..."
                className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-9 text-xs font-medium text-slate-900 outline-none transition focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/15"
              />
              {filters.search && (
                <button
                  type="button"
                  onClick={() => setFilters({ ...filters, search: '' })}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={`inline-flex h-10 items-center gap-1.5 rounded-xl border px-3.5 text-xs font-bold transition-all cursor-pointer ${
                showAdvancedFilters || activeFilterCount > 0
                  ? 'border-primary bg-primary-50 text-primary'
                  : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Bộ lọc nâng cao
              {activeFilterCount > 0 && (
                <span className="rounded-full bg-primary px-1.5 py-0.2 text-[10px] text-white">
                  {activeFilterCount}
                </span>
              )}
            </button>

            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={() => {
                  setCardFilter('ALL');
                  setFilters({
                    search: '',
                    enterprise: '',
                    manager: '',
                    team: '',
                    position: '',
                    licenseClass: '',
                    shiftStatus: '',
                    employmentStatus: '',
                    complianceStatus: '',
                    complex: '',
                  });
                }}
                className="inline-flex h-10 items-center gap-1 rounded-xl border border-rose-200 bg-rose-50 px-3 text-xs font-bold text-rose-700 hover:bg-rose-100 cursor-pointer"
                title="Xóa toàn bộ bộ lọc"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Đặt lại
              </button>
            )}
          </div>
        </div>

        {/* HÀNG 3: CÁC Ô SELECT TEXT (DÙNG SEARCHABLE SELECT ĐÚNG 4 CỘT THEO HÌNH) */}
        {showAdvancedFilters && (
          <div className="grid grid-cols-1 gap-3 border-t border-slate-100 pt-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
            {/* 1. ĐƠN VỊ CHỦ QUẢN HỒ SƠ */}
            <div>
              <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                Đơn vị sử dụng
              </label>
              <SearchableSelect
                value={filters.enterprise}
                onChange={(val) => setFilters({ ...filters, enterprise: val === 'ALL' ? '' : val, manager: '', team: '' })}
                options={enterpriseSelectOptions}
                placeholder={`Tất cả đơn vị (${managementFilterUnits.length})`}
                emptyOptionLabel={`Tất cả đơn vị (${managementFilterUnits.length})`}
                heightClass="h-9"
                icon={<Building2 className="h-4 w-4 text-slate-400" />}
              />
            </div>

            {/* 2. NHÂN SỰ QUẢN LÝ */}
            <div>
              <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                Nhân sự quản lý
              </label>
              <SearchableSelect
                value={filters.manager}
                onChange={(val) => setFilters({ ...filters, manager: val === 'ALL' ? '' : val, team: '' })}
                options={managerSelectOptions}
                placeholder={`Tất cả quản lý (${managementFilterManagers.length})`}
                emptyOptionLabel={`Tất cả quản lý (${managementFilterManagers.length})`}
                heightClass="h-9"
                icon={<UserCheck className="h-4 w-4 text-slate-400" />}
              />
            </div>

            {/* 3. TRẠNG THÁI LÀM VIỆC */}
            <div>
              <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                Trạng thái làm việc
              </label>
              <SearchableSelect
                value={filters.employmentStatus}
                onChange={(val) => setFilters({ ...filters, employmentStatus: val === 'ALL' ? '' : val })}
                options={[
                  { value: 'DANG_LAM_VIEC', label: 'Đang làm việc' },
                  { value: 'DA_NGHI_VIEC', label: 'Đã nghỉ việc' },
                ]}
                placeholder="Tất cả trạng thái"
                emptyOptionLabel="Tất cả trạng thái"
                heightClass="h-9"
                icon={<UserCheck className="h-4 w-4 text-slate-400" />}
              />
            </div>

            {/* 5. HẠNG GPLX / BẰNG MÁY */}
            <div>
              <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                Hạng GPLX / Bằng máy ({licenseClassSelectOptions.length} loại)
              </label>
              <SearchableSelect
                value={filters.licenseClass}
                onChange={(val) => setFilters({ ...filters, licenseClass: val === 'ALL' ? '' : val })}
                options={licenseClassSelectOptions}
                placeholder={`Tất cả GPLX (${licenseClassSelectOptions.length})`}
                emptyOptionLabel={`Tất cả GPLX (${licenseClassSelectOptions.length})`}
                heightClass="h-9"
                icon={<Award className="h-4 w-4 text-slate-400" />}
              />
            </div>

            <div>
              <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                Khu vực ({complexSelectOptions.length})
              </label>
              <SearchableSelect
                value={filters.complex}
                onChange={(val) => setFilters({ ...filters, complex: val === 'ALL' ? '' : val, enterprise: '', manager: '', team: '' })}
                options={complexSelectOptions}
                placeholder={`Tất cả khu vực (${complexSelectOptions.length})`}
                emptyOptionLabel={`Tất cả khu vực (${complexSelectOptions.length})`}
                heightClass="h-9"
                icon={<MapPin className="h-4 w-4 text-slate-400" />}
              />
            </div>

            {/* 7. CHỨC DANH */}
            <div>
              <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                Chức danh ({positionSelectOptions.length} chức danh)
              </label>
              <SearchableSelect
                value={filters.position}
                onChange={(val) => setFilters({ ...filters, position: val === 'ALL' ? '' : val })}
                options={positionSelectOptions}
                placeholder={`Tất cả chức danh (${positionSelectOptions.length})`}
                emptyOptionLabel={`Tất cả chức danh (${positionSelectOptions.length})`}
                heightClass="h-9"
                icon={<Briefcase className="h-4 w-4 text-slate-400" />}
              />
            </div>
          </div>
        )}
      </section>

      {error && <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-700"><ShieldAlert className="h-4 w-4" />{error}<button className="ml-auto" onClick={() => setError('')}><X className="h-4 w-4" /></button></div>}

      {/* Thông báo hướng dẫn khi đang lọc nhân sự chưa gắn xe */}
      {cardFilter === 'UNASSIGNED_VEHICLE' && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50/90 px-4 py-3 text-xs text-amber-900 shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="rounded-xl bg-amber-100 p-2 text-amber-700 shrink-0">
              <Truck className="h-4 w-4" />
            </div>
            <div>
              <div className="font-bold text-amber-900">
                Đang quản lý danh sách nhân sự chưa được gắn xe cơ giới ({displayDrivers.length} nhân sự)
              </div>
              <div className="text-[11px] text-amber-700">
                Nhấn vào nút <span className="font-bold text-primary">+ Gán xe</span> trên từng dòng hoặc mở hồ sơ để phân bổ phương tiện phụ trách.
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setCardFilter('ALL')}
            className="shrink-0 rounded-xl border border-amber-300 bg-white px-3 py-1.5 text-xs font-bold text-amber-800 hover:bg-amber-100 transition cursor-pointer"
          >
            Bỏ lọc (Xem tất cả)
          </button>
        </div>
      )}

      {/* 3. Hồ sơ theo đơn vị và nhân sự quản lý / bảng danh sách */}
      {viewMode === 'LIST' ? (
        <DataTable
          title="Danh sách lái xe / lái máy / thợ vận hành"
          subtitle={
            cardFilter !== 'ALL' || filters.search || filters.enterprise || filters.manager || filters.team || filters.position || filters.employmentStatus
              ? `Đang lọc: ${displayDrivers.length} / ${drivers.length} nhân sự cơ giới`
              : `Tổng số: ${displayDrivers.length} nhân sự cơ giới; bấm vào hàng để mở hồ sơ chi tiết 360°`
          }
          columns={columns}
          data={displayDrivers}
          isLoading={loading || detailLoading}
          showSearch={false}
          showExport
          useGlobalFilters={false}
          onRowClick={(row) => void openDetail(row)}
        />
      ) : (
        <section className="space-y-3" aria-label="Hồ sơ lái xe theo đơn vị và nhân sự quản lý">
          {loading ? (
            <div className="flex min-h-48 items-center justify-center rounded-2xl border border-slate-200 bg-white text-sm font-semibold text-slate-500">
              <Loader2 className="mr-2 h-5 w-5 animate-spin text-primary" /> Đang tải hồ sơ lái xe...
            </div>
          ) : managementGroups.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-12 text-center text-sm font-semibold text-slate-500">
              Không có hồ sơ phù hợp với bộ lọc hiện tại.
            </div>
          ) : managementGroups.map((unitGroup) => {
            const unitCollapsed = collapsedUnits.has(unitGroup.key);
            return (
              <article key={unitGroup.key} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <button
                  type="button"
                  onClick={() => toggleCollapsed(setCollapsedUnits, unitGroup.key)}
                  className="flex w-full flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/80 px-4 py-3 text-left hover:bg-slate-100/80"
                  aria-expanded={!unitCollapsed}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className={`rounded-xl p-2 ${unitGroup.unit ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                      <Building2 className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-black text-slate-900">{unitGroup.unit?.name || 'Chưa phân đơn vị'}</h3>
                      <p className="text-[11px] font-semibold text-slate-500">{unitGroup.managers.length} nhân sự quản lý · {unitGroup.total.toLocaleString('vi-VN')} lái xe</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] font-bold">
                    <span className="rounded-full bg-emerald-100 px-2 py-1 text-emerald-700">Đang chạy {unitGroup.operating}</span>
                    <span className="rounded-full bg-blue-100 px-2 py-1 text-blue-700">Sẵn sàng {unitGroup.ready}</span>
                    {unitGroup.inactive > 0 && <span className="rounded-full bg-slate-200 px-2 py-1 text-slate-600">Đã nghỉ {unitGroup.inactive}</span>}
                    <ChevronDown className={`h-4 w-4 text-slate-500 transition-transform ${unitCollapsed ? '-rotate-90' : ''}`} />
                  </div>
                </button>

                {!unitCollapsed && (
                  <div className="space-y-3 p-3">
                    {unitGroup.managers.map((managerGroup) => {
                      const managerCollapseKey = `${unitGroup.key}-${managerGroup.key}`;
                      const managerCollapsed = collapsedManagers.has(managerCollapseKey);
                      return (
                        <div key={managerCollapseKey} className="overflow-hidden rounded-xl border border-slate-200">
                          <button
                            type="button"
                            onClick={() => toggleCollapsed(setCollapsedManagers, managerCollapseKey)}
                            className="flex w-full flex-wrap items-center justify-between gap-2 bg-white px-3 py-2.5 text-left hover:bg-slate-50"
                            aria-expanded={!managerCollapsed}
                          >
                            <div className="flex min-w-0 items-center gap-2.5">
                              <span className={`rounded-full p-2 ${managerGroup.manager ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'}`}>
                                <UserCheck className="h-4 w-4" />
                              </span>
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                                  <span className="text-xs font-black text-slate-900">{managerGroup.manager?.fullName || 'Chưa có nhân sự quản lý'}</span>
                                  {managerGroup.manager?.phone && (
                                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500"><Phone className="h-3 w-3" />{managerGroup.manager.phone}</span>
                                  )}
                                </div>
                                <p className="truncate text-[10px] font-medium text-slate-500">
                                  {managerGroup.teamNames.length > 0 ? managerGroup.teamNames.join(' · ') : 'Quản lý trực tiếp tại đơn vị'}
                                </p>
                              </div>
                            </div>
                            <span className="flex items-center gap-2 text-[11px] font-bold text-slate-600">
                              {managerGroup.drivers.length.toLocaleString('vi-VN')} nhân sự
                              <ChevronDown className={`h-4 w-4 transition-transform ${managerCollapsed ? '-rotate-90' : ''}`} />
                            </span>
                          </button>

                          {!managerCollapsed && (
                            <div className="overflow-x-auto border-t border-slate-100">
                              <table className="w-full min-w-[880px] text-left text-xs">
                                <thead className="bg-slate-50 text-[10px] font-extrabold uppercase tracking-wide text-slate-500">
                                  <tr>
                                    <th className="px-3 py-2">Nhân sự</th>
                                    <th className="px-3 py-2">Xe quản lý</th>
                                    <th className="px-3 py-2">Đội/Tổ · Chức danh</th>
                                    <th className="px-3 py-2">GPLX</th>
                                    <th className="px-3 py-2">Trạng thái</th>
                                    <th className="px-3 py-2 text-center">Thao tác</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                  {managerGroup.drivers.map((driver) => (
                                    <tr key={driver.id} onClick={() => void openDetail(driver)} className="cursor-pointer hover:bg-primary-50/40">
                                      <td className="px-3 py-2.5">
                                        <div className="font-bold text-slate-900">{driver.fullName}</div>
                                        <div className="font-mono text-[10px] text-slate-500">{driver.code}{driver.phone ? ` · ${driver.phone}` : ''}</div>
                                      </td>
                                      <td className="px-3 py-2.5">
                                        {driver.assignedVehicle ? (
                                          <><div className="font-bold text-slate-800">{driver.assignedVehicle.code}</div><div className="text-[10px] text-slate-500">{driver.assignedVehicle.plate || driver.assignedVehicle.name}</div></>
                                        ) : <span className="font-semibold text-amber-700">Chưa gắn xe</span>}
                                      </td>
                                      <td className="px-3 py-2.5">
                                        <div className="font-semibold text-slate-800">{driver.teamUnit?.name || '—'}</div>
                                        <div className="text-[10px] text-slate-500">{driver.position || 'Chưa có chức danh'}</div>
                                      </td>
                                      <td className="px-3 py-2.5">
                                        <div className="font-semibold text-slate-800">{LICENSE_LABELS[driver.licenseClass || ''] || driver.licenseClass || 'Chưa khai báo'}</div>
                                        {driver.licenseNumber && <div className="font-mono text-[10px] text-slate-500">{driver.licenseNumber}</div>}
                                      </td>
                                      <td className="px-3 py-2.5">{employmentBadge(driver.employmentStatus)}</td>
                                      <td className="px-3 py-2.5" onClick={(event) => event.stopPropagation()}>
                                        <TableRowActions
                                          onView={() => void openDetail(driver)}
                                          onEdit={canEditDriverProfile ? () => void openEdit(driver) : undefined}
                                          onDelete={canEditDriverProfile ? () => void handleDeleteDriver(driver) : undefined}
                                          viewTitle="Xem chi tiết hồ sơ"
                                          editTitle="Chỉnh sửa hồ sơ"
                                          deleteTitle="Thôi việc / Xóa hồ sơ"
                                        />
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </article>
            );
          })}
        </section>
      )}

      {/* 4. MODAL CHI TIẾT HỒ SƠ LÁI XE (BỐ CỤC 2 CỘT: ẢNH BÊN TRÁI, THÔNG TIN CỐ ĐỊNH BÊN PHẢI) */}
      {selected && (
        <Modal
          isOpen
          title={`Hồ sơ nhân sự: ${selected.fullName}`}
          subtitle={`Mã NV: ${selected.code} • Cập nhật: ${formatDate(selected.updatedAt)}`}
          size="2xl"
          onClose={() => setSelected(null)}
          footer={
            <div className="flex w-full items-center justify-between">
              <span className="text-xs text-slate-400">Hệ thống quản lý hồ sơ nhân sự cơ giới THACO AGRI</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setSelected(null)}>
                  Đóng
                </Button>
                {canEditDriverProfile && (
                  <Button size="sm" icon={<Edit className="h-3.5 w-3.5" />} onClick={() => void openEdit(selected)}>
                    Chỉnh sửa hồ sơ
                  </Button>
                )}
              </div>
            </div>
          }
        >
          <div className="flex flex-col md:flex-row gap-5 items-start">
            {/* CỘT TRÁI: ẢNH CHÂN DUNG & TỔNG QUAN PROFILE */}
            <div className="w-full md:w-64 shrink-0 bg-slate-50/90 p-4 rounded-2xl border border-slate-200 flex flex-col items-center text-center space-y-3">
              {/* Profile Avatar Box (Chuẩn tỉ lệ ảnh chân dung 3x4) */}
              <div
                onClick={() => {
                  if (selected.avatarUrl) {
                    setPreviewImage({
                      url: selected.avatarUrl,
                      title: selected.fullName,
                    });
                  }
                }}
                className={`relative group ${selected.avatarUrl ? 'cursor-zoom-in' : 'cursor-default'}`}
              >
                <div className="w-32 h-[168px] aspect-[3/4] rounded-2xl overflow-hidden border-4 border-white shadow-md bg-white flex items-center justify-center transition-transform group-hover:scale-[1.02]">
                  {selected.avatarUrl ? (
                    <img src={selected.avatarUrl} alt={selected.fullName} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-emerald-500 to-teal-700 text-3xl font-black text-white">
                      {selected.fullName.charAt(0)}
                    </div>
                  )}
                </div>

                {/* Hover overlay: Xem ảnh chi tiết */}
                {selected.avatarUrl && (
                  <div
                    className="absolute inset-0 bg-slate-900/50 rounded-2xl text-white opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 text-[11px] font-bold backdrop-blur-[2px]"
                    title="Bấm để xem ảnh chi tiết"
                  >
                    <Eye className="w-5 h-5 text-emerald-300 drop-shadow" />
                    <span>Xem ảnh 3x4</span>
                  </div>
                )}
              </div>

              {/* Hidden file input for upload */}
              <input
                type="file"
                ref={detailFileInputRef}
                onChange={handleDetailAvatarUpload}
                accept="image/png,image/jpeg,image/webp,image/jpg"
                className="hidden"
              />

              {/* Upload Button - Bấm nút này mới là cập nhật / tải ảnh mới */}
              <button
                type="button"
                onClick={() => detailFileInputRef.current?.click()}
                className="w-full py-2 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-primary/60 text-[11px] font-bold text-slate-700 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs group"
                title="Bấm để tải ảnh chân dung mới từ máy tính"
              >
                <Upload className="w-3.5 h-3.5 text-primary group-hover:scale-110 transition-transform" />
                <span>Upload ảnh chân dung</span>
              </button>

              {/* Name & Identity */}
              <div className="w-full border-t border-slate-200/80 pt-2 space-y-1">
                <h3 className="text-base font-black text-slate-900 leading-tight">{selected.fullName}</h3>
                <div className="inline-block">
                  <span className="font-mono text-xs font-bold text-primary bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                    {selected.code}
                  </span>
                </div>
                <div className="flex flex-wrap justify-center gap-1.5 pt-1">
                  {employmentBadge(selected.employmentStatus)}
                  {complianceBadge(selected.complianceStatus)}
                </div>
              </div>

              {/* Quick Info Box */}
              <div className="w-full bg-white rounded-xl border border-slate-200/80 p-3 text-left text-xs space-y-2 shadow-2xs">
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-400 flex items-center gap-1"><Phone className="w-3 h-3" /> SĐT:</span>
                  <span className="font-mono font-bold text-slate-800">{selected.phone || '—'}</span>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-400 flex items-center gap-1"><Building2 className="w-3 h-3" /> Đơn vị:</span>
                  <span className="font-semibold text-slate-800 truncate max-w-[120px]" title={selected.managementUnit?.name || 'Chưa phân loại'}>
                    {selected.managementUnit?.name || 'Chưa phân loại'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-400 flex items-center gap-1"><Users className="w-3 h-3" /> NS quản lý:</span>
                  <span className="font-semibold text-slate-800 truncate max-w-[120px]" title={selected.management?.manager?.fullName || 'Chưa phân công'}>
                    {selected.management?.manager?.fullName || 'Chưa phân công'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-400 flex items-center gap-1"><Briefcase className="w-3 h-3" /> Chức danh:</span>
                  <span className="font-semibold text-slate-800 truncate max-w-[120px]" title={selected.employee?.position || 'Lái xe cơ giới'}>
                    {selected.employee?.position || 'Lái xe cơ giới'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-400">Thâm niên:</span>
                  <span className="font-bold text-emerald-700">{calculateTenure(selected.joinedDate, selected.resignedDate)}</span>
                </div>
              </div>

              {canEditDriverProfile && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs font-bold"
                  icon={<Edit className="w-3.5 h-3.5" />}
                  onClick={() => void openEdit(selected)}
                >
                  Chỉnh sửa hồ sơ
                </Button>
              )}
            </div>

            {/* CỘT PHẢI: THÔNG TIN CHI TIẾT VỚI TAB CỐ ĐỊNH */}
            <div className="flex-1 min-w-0 flex flex-col">
              {/* Tab Navigation Cố định */}
              <div className="flex border-b border-slate-200 gap-1 pb-1 mb-3 overflow-x-auto">
                {[
                  { id: 0, label: 'Cá nhân & Định danh', icon: <UserCheck className="w-3.5 h-3.5" /> },
                  { id: 1, label: 'Công tác & Tổ chức', icon: <Briefcase className="w-3.5 h-3.5" /> },
                  { id: 5, label: 'Nhân sự quản lý', icon: <Users className="w-3.5 h-3.5" /> },
                  { id: 2, label: 'GPLX & Sức khỏe', icon: <ClipboardCheck className="w-3.5 h-3.5" /> },
                  { id: 3, label: 'Phương tiện & Ca', icon: <Truck className="w-3.5 h-3.5" /> },
                  { id: 4, label: 'KPI & Sự cố', icon: <Award className="w-3.5 h-3.5" /> },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setDetailTab(tab.id)}
                    className={`flex items-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-2 text-xs font-bold transition-all cursor-pointer ${
                      detailTab === tab.id
                        ? 'bg-primary text-white shadow-xs'
                        : 'text-slate-600 bg-slate-50 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    {tab.icon}
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>

              {/* Vùng nội dung có chiều cao cố định */}
              <div className="h-[430px] overflow-y-auto pr-1 space-y-3">
                {detailTab === 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <InfoItem label="Mã nhân viên" value={selected.code} />
                    <InfoItem label="Họ và tên đầy đủ" value={selected.fullName} />
                    <InfoItem label="Số điện thoại liên lạc" value={selected.phone || 'Chưa cập nhật'} />
                    <InfoItem label="Email công vụ" value={selected.employee?.email || 'Chưa cập nhật'} />
                    <InfoItem label="Số CCCD / Hộ chiếu" value={selected.employee?.idCardNumber || 'Chưa cập nhật'} />
                    <InfoItem label="Ngày cấp • Nơi cấp" value={`${selected.employee?.idCardIssueDate || '—'} • ${selected.employee?.idCardIssuePlace || '—'}`} />
                    <InfoItem label="Ngày vào công ty" value={formatDate(selected.joinedDate)} />
                    <InfoItem label="Thâm niên làm việc" value={calculateTenure(selected.joinedDate, selected.resignedDate)} />
                    <InfoItem label="Địa chỉ thường trú & liên hệ khẩn cấp" value={selected.employee?.businessUnit || 'Theo hồ sơ nhân sự lưu trữ'} wide />
                  </div>
                )}

                {detailTab === 1 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <InfoItem label="Khu liên hợp" value={selected.managementUnit?.complexCode || selected.employee?.complex || 'Chưa phân loại'} />
                    <InfoItem label="Đơn vị chủ quản hồ sơ" value={selected.managementUnit?.name || 'Chưa phân loại'} />
                    <InfoItem label="Đội / Tổ trực thuộc" value={selected.teamUnit?.name || (selected.managementUnit ? '—' : 'Chưa phân loại')} />
                    <InfoItem label="Chức danh đảm nhiệm" value={selected.employee?.position || selected.position || 'Chưa phân loại'} />
                    <InfoItem label="Trạng thái công tác" value={employmentBadge(selected.employmentStatus)} />
                    <InfoItem label="Ngày gia nhập" value={formatDate(selected.joinedDate)} />
                    <InfoItem label="Thâm niên công tác" value={calculateTenure(selected.joinedDate, selected.resignedDate)} />
                    {selected.employmentStatus === 'DA_NGHI_VIEC' && (
                      <>
                        <InfoItem label="Ngày nghỉ việc" value={formatDate(selected.resignedDate)} />
                        <InfoItem label="Lý do nghỉ việc" value={selected.resignedReason || 'Nghỉ việc theo nguyện vọng'} />
                      </>
                    )}
                  </div>
                )}

                {detailTab === 5 && (
                  <div className="space-y-3.5">
                    {/* Thẻ Cán bộ Quản lý Trực tiếp (Đội cơ giới) */}
                    <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50/60 via-white to-teal-50/30 p-4 shadow-2xs">
                      <div className="flex items-center justify-between border-b border-emerald-100 pb-2.5 mb-3">
                        <div className="flex items-center gap-2.5">
                          <div className="rounded-xl bg-emerald-600 text-white p-2 shadow-xs">
                            <Users className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="text-xs font-black text-slate-900 uppercase tracking-wide">
                              Nhân sự quản lý trực tiếp (Đội cơ giới)
                            </h4>
                            <p className="text-[11px] text-slate-500">
                              Người phụ trách giám sát phân công công việc và chấm công hàng ngày
                            </p>
                          </div>
                        </div>
                        <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-200">
                          {selected.management?.manager ? 'Đang phụ trách' : 'Chưa phân công'}
                        </span>
                      </div>

                      {selected.management?.manager ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <InfoItem
                            label="Họ và tên NS quản lý"
                            value={
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-black text-slate-900">{selected.management.manager.fullName}</span>
                                {selected.management.manager.code && (
                                  <span className="font-mono text-[11px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded">
                                    {selected.management.manager.code}
                                  </span>
                                )}
                              </div>
                            }
                          />
                          <InfoItem
                            label="Số điện thoại liên hệ"
                            value={
                              selected.management.manager.phone ? (
                                <a
                                  href={`tel:${selected.management.manager.phone}`}
                                  className="inline-flex items-center gap-1.5 font-mono text-sm font-bold text-primary hover:text-primary-700 hover:underline"
                                  title="Bấm để gọi"
                                >
                                  <Phone className="w-3.5 h-3.5 text-primary" />
                                  {selected.management.manager.phone}
                                </a>
                              ) : (
                                <span className="text-slate-400 italic">Chưa cập nhật SĐT</span>
                              )
                            }
                          />
                          <InfoItem
                            label="Đội / Tổ phụ trách"
                            value={selected.teamUnit?.name || selected.team || 'Đội cơ giới theo biên chế'}
                          />
                          <InfoItem
                            label="Nguồn dữ liệu bổ nhiệm"
                            value={
                              <span className="text-[11px] text-slate-700 font-medium">
                                Danh mục Quản lý cơ giới & NS quản lý (tab <code>managers</code>)
                              </span>
                            }
                          />
                        </div>
                      ) : (
                        <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50/60 p-3 text-center text-xs text-amber-800">
                          <AlertTriangle className="w-4 h-4 mx-auto mb-1 text-amber-600" />
                          Đội / Tổ trực thuộc hiện chưa có NS quản lý được phân công trong Danh mục Quản lý cơ giới.
                        </div>
                      )}
                    </div>

                    {/* Thẻ Quản lý Cấp Đơn vị Chủ Quản (Xí nghiệp / Ban) */}
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
                      <div className="flex items-center gap-2.5 border-b border-slate-100 pb-2.5 mb-3">
                        <div className="rounded-xl bg-blue-50 text-blue-700 p-2">
                          <Building2 className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-black text-slate-900 uppercase tracking-wide">
                            Đơn vị chủ quản & Lãnh đạo phụ trách
                          </h4>
                          <p className="text-[11px] text-slate-500">
                            Xí nghiệp hoặc Ban chuyên trách quản lý hồ sơ và điều chuyển kế hoạch
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <InfoItem
                          label="Đơn vị chủ quản"
                          value={selected.managementUnit?.name || selected.enterprise || 'Chưa phân loại'}
                        />
                        <InfoItem
                          label="Khu liên hợp"
                          value={selected.managementUnit?.complexCode || selected.employee?.complex || 'Chưa phân loại'}
                        />
                        <InfoItem
                          label="Lãnh đạo phụ trách đơn vị"
                          value={
                            selected.management?.ownerManager ? (
                              <div className="flex flex-col">
                                <span className="font-bold text-slate-800">{selected.management.ownerManager.fullName}</span>
                                {selected.management.ownerManager.phone && (
                                  <a href={`tel:${selected.management.ownerManager.phone}`} className="font-mono text-[11px] text-primary hover:underline">
                                    SĐT: {selected.management.ownerManager.phone}
                                  </a>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-500 italic">Theo ban lãnh đạo xí nghiệp</span>
                            )
                          }
                        />
                        <InfoItem
                          label="Cơ chế thẩm quyền"
                          value="Quản lý cấp Xí nghiệp duyệt phân công, tiếp nhận hồ sơ và điều phối liên đội"
                        />
                      </div>
                    </div>

                    {/* Lịch sử phân công đơn vị nếu có */}
                    {Array.isArray((selected as any).managementAssignmentHistory) && (selected as any).managementAssignmentHistory.length > 0 && (
                      <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-2xs space-y-2">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-800 border-b border-slate-100 pb-2">
                          <span className="flex items-center gap-1.5">
                            <ClipboardCheck className="w-3.5 h-3.5 text-primary" />
                            Lịch sử biên chế Đơn vị & Đội cơ giới ({(selected as any).managementAssignmentHistory.length})
                          </span>
                        </div>
                        <div className="max-h-36 overflow-y-auto space-y-1.5 text-xs">
                          {(selected as any).managementAssignmentHistory.map((h: any, idx: number) => (
                            <div key={h.id || idx} className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100 text-[11px]">
                              <div>
                                <span className="font-bold text-slate-800">{h.managementUnit?.name || 'Đơn vị'}</span>
                                {h.teamUnit?.name && <span className="text-slate-500"> • Đội: <b>{h.teamUnit.name}</b></span>}
                                {h.reason && <div className="text-[10px] text-slate-400 italic mt-0.5">{h.reason}</div>}
                              </div>
                              <div className="text-right font-mono text-[10px] text-slate-500">
                                {formatDate(h.effectiveFrom)} {h.effectiveTo ? `→ ${formatDate(h.effectiveTo)}` : '→ Hiện tại'}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {detailTab === 2 && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <InfoItem label="Hạng GPLX / Bằng chính" value={selected.licenseClass ? LICENSE_LABELS[selected.licenseClass] || selected.licenseClass : 'Chưa khai báo'} />
                      <InfoItem label="Số GPLX / Chứng chỉ" value={selected.licenseNumber || 'Chưa cập nhật'} />
                      <InfoItem label="Ngày hết hạn GPLX chính" value={formatDate(selected.licenseExpiryDate)} />
                      <InfoItem label="Trạng thái hồ sơ GPLX" value={complianceBadge(selected.complianceStatus)} />
                      <InfoItem label="Hạn khám sức khỏe định kỳ" value={formatDate(selected.healthCheckExpiryDate)} />
                      <InfoItem
                        label="Đủ điều kiện vận hành an toàn"
                        value={
                          selected.healthCheckExpiryDate && new Date(selected.healthCheckExpiryDate) >= new Date() ? (
                            <Badge variant="green">Đủ điều kiện lái xe</Badge>
                          ) : (
                            <Badge variant="red">Cần khám lại / Gia hạn</Badge>
                          )
                        }
                      />
                    </div>

                    {/* Danh sách toàn bộ GPLX & Chứng chỉ của tài xế */}
                    <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs space-y-2.5">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-800 border-b border-slate-100 pb-2">
                        <span className="flex items-center gap-1.5">
                          <Award className="w-4 h-4 text-amber-500" />
                          Danh mục Giấy phép lái xe & Chứng chỉ hành nghề ({selected.licenses && selected.licenses.length > 0 ? selected.licenses.length : 1})
                        </span>
                        <span className="text-[10px] text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20 font-bold">
                          Đã xác thực hồ sơ
                        </span>
                      </div>

                      <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                        {selected.licenses && selected.licenses.length > 0 ? (
                          selected.licenses.map((lic, idx) => (
                            <div
                              key={idx}
                              className={`p-3 rounded-xl border transition-all ${
                                lic.isPrimary
                                  ? 'border-amber-300 bg-amber-50/50'
                                  : 'border-slate-200 bg-slate-50/70'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-xs text-slate-900">{lic.category}</span>
                                    {lic.isPrimary && (
                                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-md">
                                        ★ Bằng chính
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-xs text-slate-600 flex items-center gap-2">
                                    <span>Số: <strong className="font-mono text-slate-800">{lic.number}</strong></span>
                                    {lic.issuingAuthority && (
                                      <span className="text-[11px] text-slate-500">| Nơi cấp: {lic.issuingAuthority}</span>
                                    )}
                                  </div>
                                </div>

                                <div className="text-right">
                                  <span className="text-[11px] text-slate-500 block">
                                    Hết hạn: <strong className="font-mono text-slate-700">{formatDate(lic.expiryDate)}</strong>
                                  </span>
                                  {lic.expiryDate ? (
                                    new Date(lic.expiryDate) < new Date() ? (
                                      <span className="text-[10px] text-red-600 font-semibold">Đã hết hạn</span>
                                    ) : (
                                      <span className="text-[10px] text-emerald-600 font-semibold">Còn hiệu lực</span>
                                    )
                                  ) : (
                                    <span className="text-[10px] text-slate-400">Vô thời hạn</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/70 flex items-center justify-between">
                            <div>
                              <span className="font-bold text-xs text-slate-900">{selected.licenseClass || 'GPLX'}</span>
                              <span className="ml-2 font-mono text-xs text-slate-600">{selected.licenseNumber || 'Chưa cập nhật số'}</span>
                            </div>
                            <span className="text-xs text-slate-500 font-mono">{formatDate(selected.licenseExpiryDate)}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 space-y-2">
                      <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <HeartPulse className="w-4 h-4 text-emerald-600" />
                        <span>Quy chuẩn an toàn lao động cơ giới</span>
                      </div>
                      <p className="text-[11px] text-slate-600 leading-relaxed">
                        Lái xe đã hoàn thành khóa huấn luyện an toàn vận hành phương tiện theo đúng nhóm bằng/chứng chỉ (Nông nghiệp / Công trình / Vận chuyển), kiểm tra nồng độ cồn và chất kích thích trước ca lái theo quy định của Ban Quản trị Vận hành Cơ giới THACO AGRI.
                      </p>
                    </div>
                  </div>
                )}

                {detailTab === 3 && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <InfoItem label="Trạng thái ca lái hiện tại" value={selected.currentShiftStatus ? SHIFT_LABELS[selected.currentShiftStatus] || selected.currentShiftStatus : 'Sẵn sàng'} />
                      <InfoItem label="Vị trí định vị gần nhất" value={selected.currentLocation || 'Bãi đỗ trung tâm'} />
                    </div>

                    {/* Cơ chế quản lý phương tiện: Xe chính & Xe phụ */}
                    <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs space-y-3">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-800 border-b border-slate-100 pb-2">
                        <span className="flex items-center gap-1.5">
                          <Truck className="w-4 h-4 text-primary" />
                          Phân công phương tiện quản lý (Chính / Phụ)
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 font-bold">
                            ★ Chính: {((selected.primaryVehicles?.length || (selected.assignedVehicle ? 1 : 0)))}/2
                          </span>
                          <span className="text-[10px] text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200 font-bold">
                            ⚡ Phụ: {(selected.secondaryVehicles?.length || 0)}/2
                          </span>
                        </div>
                      </div>

                      <div className="p-2.5 rounded-lg bg-blue-50/60 border border-blue-100 text-[11px] text-blue-900 leading-relaxed">
                        <strong>Nguyên tắc bàn giao tài sản:</strong> Xe chính là phương tiện do tài xế trực tiếp giữ và chịu trách nhiệm chính. Xe phụ là phương tiện phối hợp đồng quản lý để hỗ trợ vận hành hoặc dự phòng khi đội xe cần huy động.
                      </div>

                      {/* 1. Nhóm Xe chính */}
                      <div className="space-y-1.5">
                        <div className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                          <span>Xe chính (Trực tiếp phụ trách & bảo quản tài sản):</span>
                        </div>
                        {(() => {
                          const primList: VehicleSummary[] = [];
                          if (Array.isArray(selected.primaryVehicles) && selected.primaryVehicles.length > 0) {
                            primList.push(...selected.primaryVehicles);
                          } else if (selected.assignedVehicle) {
                            primList.push(selected.assignedVehicle);
                          } else if (Array.isArray(selected.assignedVehicles)) {
                            selected.assignedVehicles.filter(a => a.type === 'PRIMARY' && a.vehicle).forEach(a => primList.push(a.vehicle!));
                          }

                          if (primList.length === 0) {
                            return (
                              <div className="p-2.5 rounded-lg border border-dashed border-slate-200 text-center text-xs text-slate-400 italic">
                                Chưa phân công xe chính trực tiếp.
                              </div>
                            );
                          }

                          return (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {primList.map((v) => (
                                <div key={v.id} className="flex items-center justify-between p-2.5 rounded-xl border border-emerald-200 bg-emerald-50/40">
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className="font-mono font-bold text-xs text-slate-900">{v.plate || v.code}</span>
                                      <span className="rounded-md bg-emerald-600 px-1.5 py-0.5 text-[9px] font-bold text-white">★ Xe chính</span>
                                    </div>
                                    <p className="text-[11px] text-slate-600 truncate max-w-[200px] mt-0.5">{v.name || 'Phương tiện cơ giới'}</p>
                                    {v.type && <span className="text-[10px] text-slate-400">{v.type}</span>}
                                  </div>
                                </div>
                              ))}
                            </div>
                          );
                        })()}
                      </div>

                      {/* 2. Nhóm Xe phụ */}
                      <div className="space-y-1.5 pt-1">
                        <div className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                          <span>Xe phụ (Hỗ trợ đồng quản lý & dự phòng):</span>
                        </div>
                        {(() => {
                          const secList: VehicleSummary[] = [];
                          if (Array.isArray(selected.secondaryVehicles) && selected.secondaryVehicles.length > 0) {
                            secList.push(...selected.secondaryVehicles);
                          } else if (Array.isArray(selected.assignedVehicles)) {
                            selected.assignedVehicles.filter(a => a.type === 'SECONDARY' && a.vehicle).forEach(a => secList.push(a.vehicle!));
                          }

                          if (secList.length === 0) {
                            return (
                              <div className="p-2.5 rounded-lg border border-dashed border-slate-200 text-center text-xs text-slate-400 italic">
                                Chưa gán xe phụ đồng quản lý.
                              </div>
                            );
                          }

                          return (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {secList.map((v) => (
                                <div key={v.id} className="flex items-center justify-between p-2.5 rounded-xl border border-blue-200 bg-blue-50/40">
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className="font-mono font-bold text-xs text-slate-900">{v.plate || v.code}</span>
                                      <span className="rounded-md bg-blue-600 px-1.5 py-0.5 text-[9px] font-bold text-white">⚡ Xe phụ</span>
                                    </div>
                                    <p className="text-[11px] text-slate-600 truncate max-w-[200px] mt-0.5">{v.name || 'Phương tiện cơ giới'}</p>
                                    {v.type && <span className="text-[10px] text-slate-400">{v.type}</span>}
                                  </div>
                                </div>
                              ))}
                            </div>
                          );
                        })()}
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
                      <div className="border-b border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-bold text-slate-800 flex items-center justify-between">
                        <span>Hoạt động điều động gần nhất</span>
                        <span className="text-[10px] text-slate-400 font-normal">Chuyến điều động</span>
                      </div>
                      <div className="divide-y divide-slate-100 max-h-40 overflow-y-auto">
                        {[...(selected.dispatchOrdersDriven || []), ...(selected.transportOrders || []), ...(selected.feedTrips || [])].slice(0, 8).map((item: any) => (
                          <div key={`${item.code}-${item.id}`} className="flex items-center justify-between px-3.5 py-2 text-xs hover:bg-slate-50">
                            <div>
                              <strong className="text-primary font-mono">{item.code}</strong>
                              <span className="text-slate-500 ml-2">Xe: {item.vehicle?.code || 'Chưa gán xe'}</span>
                            </div>
                            <span className="text-slate-400 font-mono text-[11px]">{formatDate(item.departureTime || item.createdAt)}</span>
                          </div>
                        ))}
                        {![...(selected.dispatchOrdersDriven || []), ...(selected.transportOrders || []), ...(selected.feedTrips || [])].length && (
                          <div className="p-4 text-center text-xs text-slate-400">Chưa ghi nhận hoạt động chuyến trong kỳ này.</div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {detailTab === 4 && (
                  <div className="space-y-3">
                    <div className="rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
                      <div className="border-b border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-bold text-slate-800">
                        Bảng chỉ số KPI hiệu suất lái xe theo tháng
                      </div>
                      <table className="w-full text-xs text-left">
                        <thead className="bg-slate-50 text-[10px] uppercase text-slate-500 font-bold border-b border-slate-200">
                          <tr>
                            <th className="p-2.5">Tháng</th>
                            <th className="p-2.5 text-center">Chuyến</th>
                            <th className="p-2.5 text-center">Km</th>
                            <th className="p-2.5 text-center">Giờ máy</th>
                            <th className="p-2.5 text-center">Tiết kiệm NL</th>
                            <th className="p-2.5 text-center">Điểm KPI</th>
                            <th className="p-2.5 text-center">Hạng</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {selected.kpis.length ? (
                            selected.kpis.map((kpi: any) => (
                              <tr key={kpi.id} className="hover:bg-slate-50">
                                <td className="p-2.5 font-bold font-mono">{kpi.monthYear}</td>
                                <td className="p-2.5 text-center">{kpi.tripsCount}</td>
                                <td className="p-2.5 text-center">{kpi.distanceKm} km</td>
                                <td className="p-2.5 text-center">{kpi.machineHours} h</td>
                                <td className="p-2.5 text-center font-semibold text-emerald-700">+{kpi.fuelSavedLiters} L</td>
                                <td className="p-2.5 text-center font-black text-primary text-sm">{kpi.totalScore}</td>
                                <td className="p-2.5 text-center">
                                  <Badge variant="green">{kpi.rankGrade || 'A'}</Badge>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={7} className="p-4 text-center text-xs text-slate-400">
                                Đang tổng hợp dữ liệu KPI từ module thi đua lái xe...
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* SOS / Sự cố */}
                    <div className="rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
                      <div className="border-b border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-bold text-slate-800">
                        Nhật ký cảnh báo SOS, sự cố & lệch tuyến
                      </div>
                      <div className="divide-y divide-slate-100 max-h-40 overflow-y-auto">
                        {[...selected.sosAlerts, ...selected.repairsReported, ...selected.transportOrders.filter((item: any) => item.isRouteDeviated)].length ? (
                          [...selected.sosAlerts.map((item: any) => ({ ...item, eventType: 'SOS', eventDate: item.createdAt })), ...selected.repairsReported.map((item: any) => ({ ...item, eventType: 'Sự cố', eventDate: item.receivedDate })), ...selected.transportOrders.filter((item: any) => item.isRouteDeviated).map((item: any) => ({ ...item, eventType: 'Lệch tuyến', eventDate: item.updatedAt }))]
                            .sort((a: any, b: any) => new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime())
                            .map((item: any) => (
                              <div key={`${item.eventType}-${item.id}`} className="flex items-center justify-between p-3 text-xs hover:bg-slate-50">
                                <div className="flex items-center gap-2">
                                  <Badge variant={item.eventType === 'SOS' ? 'red' : 'amber'}>{item.eventType}</Badge>
                                  <span className="font-semibold text-slate-800">{item.vehicle?.code || 'Xe chưa rõ'}</span>
                                  <span className="text-slate-500 text-[11px] truncate max-w-xs">{item.description || item.issueDescription || item.deviationReason || 'Không có mô tả'}</span>
                                </div>
                                <span className="text-slate-400 font-mono text-[11px]">{formatDate(item.eventDate)}</span>
                              </div>
                            ))
                        ) : (
                          <div className="p-3 text-center text-xs text-slate-400">Hồ sơ an toàn tốt, chưa ghi nhận sự cố vi phạm nào.</div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* 5. MODAL TIẾP NHẬN / CHỈNH SỬA HỒ SƠ LÁI XE (BỐ CỤC 2 CỘT) */}
      <Modal
        isOpen={editorOpen}
        title={editingId ? 'Chỉnh sửa hồ sơ lái xe / thợ vận hành' : 'Tiếp nhận lái xe / thợ vận hành'}
        subtitle={`Bước ${formStep + 1}/7 · ${FORM_STEPS[formStep]}`}
        size="2xl"
        onClose={() => !saving && setEditorOpen(false)}
        footer={
          <div className="flex w-full justify-between">
            <Button variant="outline" size="sm" disabled={formStep === 0 || saving} icon={<ChevronLeft className="h-3.5 w-3.5" />} onClick={() => setFormStep((step) => step - 1)}>
              Trước
            </Button>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" disabled={saving} onClick={() => setEditorOpen(false)}>
                Hủy
              </Button>
              {formStep < 6 ? (
                <Button size="sm" icon={<ChevronRight className="h-3.5 w-3.5" />} onClick={() => setFormStep((step) => step + 1)}>
                  Tiếp tục
                </Button>
              ) : (
                <Button size="sm" disabled={saving} icon={saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />} onClick={() => void submitProfile()}>
                  {saving ? 'Đang lưu' : 'Xác nhận lưu'}
                </Button>
              )}
            </div>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-7 gap-1">
            {FORM_STEPS.map((step, index) => (
              <button
                key={step}
                type="button"
                onClick={() => setFormStep(index)}
                className={`rounded-lg px-1 py-2 text-[10px] font-bold transition-colors cursor-pointer ${
                  index === formStep
                    ? 'bg-primary text-white shadow-xs'
                    : index < formStep
                    ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
              >
                {index + 1}. {step}
              </button>
            ))}
          </div>

          {/* KHUNG NỘI DUNG CỐ ĐỊNH CHIỀU CAO - KHÔNG BỊ CO RÚT HOẶC NHẢY HỤT KHI ĐỔI TAB */}
          <div className="flex flex-col md:flex-row gap-5 min-h-[500px]">
            {/* Cột trái: Upload ảnh chân dung & Tóm tắt nhanh */}
            <div className="w-full md:w-56 shrink-0 bg-slate-50/90 p-4 rounded-2xl border border-slate-200/80 flex flex-col items-center justify-between text-center space-y-3 min-h-[500px]">
              <div className="flex flex-col items-center w-full space-y-2.5">
                <div className="relative group">
                  <div className="h-32 w-28 rounded-2xl overflow-hidden border-2 border-slate-200 bg-white shadow-sm flex items-center justify-center">
                    {form.avatarUrl ? (
                      <img src={form.avatarUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-slate-400 p-2">
                        <Camera className="w-8 h-8 stroke-1 text-slate-300 mb-1" />
                        <span className="text-[10px] font-medium">Chưa có ảnh</span>
                      </div>
                    )}
                  </div>
                  <input
                    type="file"
                    ref={editorFileInputRef}
                    onChange={handleEditorAvatarUpload}
                    accept="image/png,image/jpeg,image/webp,image/jpg"
                    className="hidden"
                  />
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs font-bold"
                  icon={<Upload className="w-3.5 h-3.5 text-primary" />}
                  onClick={() => editorFileInputRef.current?.click()}
                >
                  Chọn ảnh chân dung
                </Button>
                {form.avatarUrl && (
                  <button
                    type="button"
                    onClick={() => setForm((curr) => ({ ...curr, avatarUrl: '' }))}
                    className="text-[10px] text-rose-600 hover:underline cursor-pointer font-medium"
                  >
                    Xóa ảnh
                  </button>
                )}
                <span className="text-[10px] text-slate-400">Định dạng JPG, PNG, WebP tối đa 5MB</span>
              </div>

              {/* Tóm tắt thông tin nhân sự bên trái */}
              <div className="w-full rounded-xl bg-white p-3 border border-slate-200/70 text-left space-y-1.5 shadow-2xs">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Tóm tắt nhân sự</div>
                <div className="font-bold text-xs text-slate-800 truncate">{form.fullName || 'Chưa nhập họ tên'}</div>
                <div className="text-[11px] font-mono text-primary font-bold">{form.code || 'Mã NV: —'}</div>
                <div className="text-[11px] text-slate-600 truncate">{form.position || 'Chức danh: —'}</div>
                <div className="text-[11px] text-slate-600 truncate">{options.managementUnits.find((u) => u.id === Number(form.teamUnitId))?.name || 'Đội/Tổ: —'}</div>
                <div className="pt-1 border-t border-slate-100 flex items-center justify-between text-[10px]">
                  <span className="text-slate-500">Xe quản lý:</span>
                  <span className="font-bold text-emerald-700">{form.assignedVehicleIds.length} xe</span>
                </div>
              </div>
            </div>

            {/* Cột phải: Fields theo từng bước với khung cố định */}
            <div className="flex-1 min-w-0 flex flex-col justify-between min-h-[500px] bg-slate-50/40 p-4 rounded-2xl border border-slate-200/70">
              <div className="flex-1 overflow-y-auto pr-1">
                {/* BƯỚC 1: THÔNG TIN NHẬN DIỆN */}
                {formStep === 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 pb-2 border-b border-slate-200/70 font-bold text-xs text-slate-800">
                      <User className="w-4 h-4 text-primary" />
                      <span>Thông tin định danh & Liên hệ cơ bản</span>
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <TextField label="Mã nhân viên *" required disabled={Boolean(editingId)} value={form.code} onChange={(e) => setField('code', e.target.value)} />
                      <TextField label="Họ và tên *" required value={form.fullName} onChange={(e) => setField('fullName', e.target.value)} />
                      <TextField label="Số điện thoại" value={form.phone} onChange={(e) => setField('phone', e.target.value)} />
                      <TextField label="Email" type="email" value={form.email} onChange={(e) => setField('email', e.target.value)} />
                      <TextField label="Số CCCD/Hộ chiếu" value={form.idCardNumber} onChange={(e) => setField('idCardNumber', e.target.value)} />
                      <TextField label="Ngày cấp CCCD" type="date" value={form.idCardIssueDate} onChange={(e) => setField('idCardIssueDate', e.target.value)} />
                      <TextField label="Nơi cấp CCCD" value={form.idCardIssuePlace} onChange={(e) => setField('idCardIssuePlace', e.target.value)} />
                      <TextField label="URL ảnh đại diện" value={form.avatarUrl} onChange={(e) => setField('avatarUrl', e.target.value)} />
                    </div>
                  </div>
                )}

                {/* BƯỚC 2: QUAN HỆ CÔNG TÁC & PHÂN BỔ */}
                {formStep === 1 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 pb-2 border-b border-slate-200/70 font-bold text-xs text-slate-800">
                      <Building2 className="w-4 h-4 text-primary" />
                      <span>Thông tin công tác & Đơn vị trực thuộc</span>
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <TextField label="Ngày vào công ty *" type="date" required value={form.joinedDate} onChange={(e) => setField('joinedDate', e.target.value)} />
                      
                      <StatusToggle
                        label="Trạng thái làm việc"
                        value={form.employmentStatus === 'DA_NGHI_VIEC' ? 'INACTIVE' : 'ACTIVE'}
                        onChange={(status) => setField('employmentStatus', status === 'ACTIVE' ? 'DANG_LAM_VIEC' : 'DA_NGHI_VIEC')}
                        activeValue="ACTIVE"
                        inactiveValue="INACTIVE"
                        activeLabel="Đang làm việc"
                        inactiveLabel="Đã nghỉ việc"
                      />

                      <div>
                        <label className="mb-1 block text-xs font-bold text-slate-700">
                          Khu liên hợp
                        </label>
                        <SearchableSelect
                          value={form.complex}
                          onChange={(val) => {
                            setField('complex', val);
                            setField('managementUnitId', '');
                            setField('teamUnitId', '');
                          }}
                          options={formComplexOptions}
                          placeholder="Chọn Khu liên hợp..."
                          heightClass="h-9"
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-xs font-bold text-slate-700">
                          Đơn vị chủ quản hồ sơ
                        </label>
                        <SearchableSelect
                          value={form.managementUnitId}
                          onChange={(val) => {
                            setField('managementUnitId', val);
                            setField('teamUnitId', '');
                          }}
                          options={formEnterpriseOptions}
                          placeholder="Chọn đơn vị đã được xác minh..."
                          heightClass="h-9"
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-xs font-bold text-slate-700">
                          Đội/Tổ trực thuộc
                        </label>
                        <SearchableSelect
                          value={form.teamUnitId}
                          onChange={(val) => setField('teamUnitId', val)}
                          options={formTeamOptions}
                          placeholder="Không bắt buộc"
                          heightClass="h-9"
                        />
                      </div>

                      {(() => {
                        const selectedTeam = options.managementUnits.find((u) => u.id === Number(form.teamUnitId));
                        const selectedOwner = options.managementUnits.find((u) => u.id === Number(form.managementUnitId));
                        const managerInfo = selectedTeam?.managerAssignments?.[0]?.manager || selectedOwner?.managerAssignments?.[0]?.manager;
                        if (!managerInfo) return null;
                        return (
                          <div className="sm:col-span-2 rounded-xl border border-emerald-200 bg-emerald-50/70 p-2.5 text-xs flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Users className="w-4 h-4 text-emerald-700 shrink-0" />
                              <span className="text-emerald-900">
                                <strong>NS quản lý phụ trách:</strong> {managerInfo.fullName}
                                {managerInfo.phone ? ` • SĐT: ${managerInfo.phone}` : ''}
                                {managerInfo.code ? ` (${managerInfo.code})` : ''}
                              </span>
                            </div>
                            <span className="text-[10px] font-bold text-emerald-700 bg-white/90 px-2 py-0.5 rounded border border-emerald-200 shrink-0">
                              Từ Danh mục Quản lý cơ giới
                            </span>
                          </div>
                        );
                      })()}

                      <div className="sm:col-span-2">
                        <label className="mb-1 block text-xs font-bold text-slate-700">
                          Chức danh công việc
                        </label>
                        <SearchableSelect
                          value={form.position}
                          onChange={(val) => setField('position', val)}
                          options={formPositionOptions}
                          placeholder="Chọn hoặc nhập Chức danh..."
                          allowCustomInput={true}
                          heightClass="h-9"
                        />
                      </div>

                      {form.employmentStatus === 'DA_NGHI_VIEC' && (
                        <>
                          <TextField label="Ngày nghỉ việc" type="date" value={form.resignedDate} onChange={(e) => setField('resignedDate', e.target.value)} />
                          <TextField label="Lý do nghỉ việc" value={form.resignedReason} onChange={(e) => setField('resignedReason', e.target.value)} />
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* BƯỚC 3: GPLX & CHỨNG CHỈ VẬN HÀNH CƠ GIỚI (QUẢN LÝ NHIỀU BẰNG LÁI) */}
                {formStep === 2 && (
                  <div className="space-y-3.5">
                    {/* Header thông báo & Nút thêm bằng mới */}
                    <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl">
                      <div>
                        <div className="flex items-center gap-2 font-bold text-xs text-emerald-900">
                          <Award className="w-4 h-4 text-emerald-700" />
                          <span>Danh sách Bằng lái & Chứng chỉ nghề ({form.licenses.length} bằng)</span>
                        </div>
                        <p className="text-[11px] text-emerald-700 mt-0.5">
                          1 nhân sự lái xe có thể có nhiều bằng lái (GPLX đường bộ, chứng chỉ máy cày, chứng chỉ máy đào...)
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => addLicense()}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition shadow-xs cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Thêm bằng lái / chứng chỉ
                      </button>
                    </div>

                    {/* Quick Add Presets */}
                    <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
                      <span className="text-slate-500 font-semibold">Thêm nhanh:</span>
                      <button
                        type="button"
                        onClick={() => addLicense('Hạng B2 (Máy cày, ô tô con <9 chỗ, tải <3.5T)')}
                        className="px-2 py-0.5 rounded-full bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 border border-slate-200 font-medium transition cursor-pointer"
                      >
                        + GPLX B2
                      </button>
                      <button
                        type="button"
                        onClick={() => addLicense('Hạng C (Xe tải ben >3.5T, máy kéo rơ-moóc)')}
                        className="px-2 py-0.5 rounded-full bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 border border-slate-200 font-medium transition cursor-pointer"
                      >
                        + GPLX Hạng C
                      </button>
                      <button
                        type="button"
                        onClick={() => addLicense('Hạng CE (Xe đầu kéo rơ-moóc, Container)')}
                        className="px-2 py-0.5 rounded-full bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 border border-slate-200 font-medium transition cursor-pointer"
                      >
                        + GPLX Hạng CE
                      </button>
                      <button
                        type="button"
                        onClick={() => addLicense('Chứng chỉ vận hành máy kéo & cơ giới nông nghiệp')}
                        className="px-2 py-0.5 rounded-full bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 border border-slate-200 font-medium transition cursor-pointer"
                      >
                        + CC Máy nông nghiệp
                      </button>
                      <button
                        type="button"
                        onClick={() => addLicense('Chứng chỉ vận hành máy xúc đào & thi công công trình')}
                        className="px-2 py-0.5 rounded-full bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 border border-slate-200 font-medium transition cursor-pointer"
                      >
                        + CC Máy đào/ủi
                      </button>
                      <button
                        type="button"
                        onClick={() => addLicense('Chứng chỉ an toàn vận tải & phòng cháy chữa cháy')}
                        className="px-2 py-0.5 rounded-full bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 border border-slate-200 font-medium transition cursor-pointer"
                      >
                        + CC An toàn PCCC
                      </button>
                    </div>

                    {/* Danh sách các bằng lái / chứng chỉ */}
                    {form.licenses.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
                        <Award className="w-8 h-8 text-slate-300 mx-auto mb-1.5" />
                        <p className="text-xs font-bold text-slate-600">Chưa có bằng lái hoặc chứng chỉ nào</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">Bấm nút "Thêm bằng lái / chứng chỉ" ở trên để khai báo.</p>
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                        {form.licenses.map((lic, idx) => (
                          <div
                            key={idx}
                            className={`rounded-xl border p-3.5 transition-all ${
                              lic.isPrimary ? 'border-emerald-300 bg-emerald-50/30 ring-1 ring-emerald-400/20' : 'border-slate-200 bg-white'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2.5 mb-3">
                              <div className="flex items-center gap-2">
                                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-[11px] font-bold text-slate-600">
                                  #{idx + 1}
                                </span>
                                <span className="font-bold text-xs text-slate-800 truncate max-w-[260px]">
                                  {lic.category || 'Bằng lái / Chứng chỉ'}
                                </span>
                                {lic.isPrimary ? (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-extrabold text-emerald-800 border border-emerald-300">
                                    ★ Bằng chính
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => setPrimaryLicense(idx)}
                                    className="text-[10px] font-bold text-primary hover:bg-primary-50 rounded px-2 py-0.5 border border-dashed border-primary/40 cursor-pointer"
                                  >
                                    Đặt làm bằng chính
                                  </button>
                                )}
                              </div>

                              {form.licenses.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => removeLicense(idx)}
                                  className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                                  title="Xóa bằng này"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              )}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                  Loại bằng / Hạng GPLX / Chứng chỉ
                                </label>
                                <input
                                  type="text"
                                  list={`license-categories-${idx}`}
                                  value={lic.category}
                                  onChange={(e) => updateLicense(idx, 'category', e.target.value)}
                                  placeholder="Chọn hoặc nhập loại bằng..."
                                  className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-normal outline-none focus:border-primary focus:bg-white"
                                />
                                <datalist id={`license-categories-${idx}`}>
                                  <option value="Hạng B2 (Máy cày, ô tô con <9 chỗ, tải <3.5T)" />
                                  <option value="Hạng C (Xe tải ben >3.5T, máy kéo rơ-moóc)" />
                                  <option value="Hạng CE (Xe đầu kéo rơ-moóc, Container)" />
                                  <option value="Hạng D2 / E (Xe chở người trên 9 chỗ)" />
                                  <option value="Chứng chỉ vận hành máy kéo & cơ giới nông nghiệp" />
                                  <option value="Chứng chỉ thợ lái máy cày bánh hơi nông nghiệp" />
                                  <option value="Chứng chỉ vận hành máy xúc đào & thi công công trình" />
                                  <option value="Chứng chỉ thợ vận hành máy ủi / lu / san đất" />
                                  <option value="Chứng chỉ an toàn vận tải & phòng cháy chữa cháy" />
                                </datalist>
                              </div>

                              <TextField
                                label="Số GPLX / Số hiệu chứng chỉ"
                                value={lic.number}
                                placeholder="Nhập số bằng..."
                                onChange={(e) => updateLicense(idx, 'number', e.target.value)}
                              />

                              <TextField
                                label="Ngày cấp"
                                type="date"
                                value={lic.issueDate || ''}
                                onChange={(e) => updateLicense(idx, 'issueDate', e.target.value)}
                              />

                              <TextField
                                label="Ngày hết hạn"
                                type="date"
                                value={lic.expiryDate || ''}
                                onChange={(e) => updateLicense(idx, 'expiryDate', e.target.value)}
                              />

                              <div className="sm:col-span-2">
                                <TextField
                                  label="Nơi cấp / Đơn vị đào tạo & cấp bằng"
                                  value={lic.issuedBy || ''}
                                  placeholder="Sở GTVT / Trường đào tạo cơ giới THACO AGRI..."
                                  onChange={(e) => updateLicense(idx, 'issuedBy', e.target.value)}
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center rounded-xl bg-blue-50/70 border border-blue-200/80 p-2.5 text-[11px] text-blue-800">
                      <Info className="w-4 h-4 text-blue-600 shrink-0 mr-2" />
                      Hệ thống tự động theo dõi và cảnh báo trước khi các loại bằng lái / chứng chỉ hết hạn 30 & 60 ngày.
                    </div>
                  </div>
                )}

                {/* BƯỚC 4: SỨC KHỎE & THẺ AN TOÀN */}
                {formStep === 3 && (
                  <div className="space-y-3.5">
                    <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs">
                      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-100 font-bold text-xs text-slate-800">
                        <HeartPulse className="w-4 h-4 text-rose-500" />
                        <span>1. Khám sức khỏe định kỳ lái xe / lái máy</span>
                      </div>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <TextField label="Ngày khám gần nhất" type="date" value={form.healthCheckDate} onChange={(e) => setField('healthCheckDate', e.target.value)} />
                        <TextField label="Hạn khám sức khỏe tiếp theo *" type="date" value={form.healthCheckExpiryDate} onChange={(e) => setField('healthCheckExpiryDate', e.target.value)} />
                        <TextField label="Bệnh viện / Cơ sở y tế khám" value={form.healthCheckHospital} placeholder="Bệnh viện đa khoa / Phòng khám..." onChange={(e) => setField('healthCheckHospital', e.target.value)} />
                        <label className="text-xs font-bold text-slate-700">
                          Phân loại sức khỏe
                          <select
                            value={form.healthClassification}
                            onChange={(e) => setField('healthClassification', e.target.value)}
                            className="mt-1 h-9 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-normal outline-none focus:border-primary focus:bg-white"
                          >
                            <option value="LOAI_1">Loại I - Rất khỏe (Đủ ĐK lái xe tải/container/máy kéo)</option>
                            <option value="LOAI_2">Loại II - Khỏe (Đủ ĐK lái xe và vận hành)</option>
                            <option value="LOAI_3">Loại III - Trung bình</option>
                            <option value="LOAI_4">Loại IV - Không đủ ĐK vận hành</option>
                          </select>
                        </label>
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs">
                      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-100 font-bold text-xs text-slate-800">
                        <ShieldAlert className="w-4 h-4 text-blue-600" />
                        <span>2. Huấn luyện an toàn lao động & Thẻ an toàn</span>
                      </div>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <TextField label="Số thẻ an toàn lao động" value={form.safetyCardNumber} placeholder="Nhập số thẻ an toàn..." onChange={(e) => setField('safetyCardNumber', e.target.value)} />
                        <TextField label="Mã thẻ từ RFID điểm danh / Chíp" value={form.rfidCardNumber} placeholder="Mã định danh thẻ từ..." onChange={(e) => setField('rfidCardNumber', e.target.value)} />
                      </div>
                    </div>
                  </div>
                )}

                {/* BƯỚC 5: TÀI KHOẢN APP MOBILE & RFID */}
                {formStep === 4 && (
                  <div className="space-y-4">
                    <div className="p-3.5 bg-emerald-50/80 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-start gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold">Khởi tạo tài khoản đăng nhập cho lái xe:</span>
                        <p className="text-[11px] text-emerald-700 mt-0.5 leading-relaxed">
                          Tài khoản này được cấp để lái xe truy cập ứng dụng vận hành di động (Mobile App) hoặc quét thẻ RFID. Mật khẩu có thể để trống, hệ thống sẽ tự động gán mật khẩu khởi tạo mặc định là <b>Thaco@1234$</b>.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-primary" />
                            Tên đăng nhập <span className="text-rose-500">*</span>
                          </label>
                          {form.code && (
                            <button
                              type="button"
                              onClick={() => {
                                const autoUser = form.code.toLowerCase().replace(/[^a-z0-9]/g, '_');
                                setField('username', autoUser);
                              }}
                              className="text-[10px] text-primary hover:underline font-bold cursor-pointer"
                            >
                              Lấy theo Mã NV ({form.code})
                            </button>
                          )}
                        </div>
                        <div className="relative">
                          <input
                            type="text"
                            required
                            value={form.username}
                            onChange={(e) => setField('username', e.target.value)}
                            placeholder="Nhập tên đăng nhập (vd: tx_nguyenvana)..."
                            className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 pr-8 text-xs font-normal outline-none focus:border-primary focus:bg-white transition-colors"
                          />
                          {form.username && (
                            <button
                              type="button"
                              onClick={() => setField('username', '')}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                        <p className="mt-1 text-[10px] text-slate-400">
                          * Tên tài khoản không dấu, viết liền hoặc dùng dấu gạch dưới.
                        </p>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                            <Lock className="w-3.5 h-3.5 text-primary" />
                            {editingId ? 'Mật khẩu mới' : 'Mật khẩu khởi tạo'}
                            <span className="text-slate-400 text-[10px] font-normal ml-1">
                              {editingId ? '(để trống nếu giữ nguyên)' : '(để trống = Thaco@1234$)'}
                            </span>
                          </label>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setField('password', 'Thaco@1234$')}
                              className="text-[10px] text-slate-500 hover:text-primary font-medium cursor-pointer"
                            >
                              Gán Thaco@1234$
                            </button>
                            {form.password && (
                              <button
                                type="button"
                                onClick={() => setField('password', '')}
                                className="text-[10px] text-rose-500 hover:underline font-medium cursor-pointer"
                              >
                                Xóa trắng
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="relative">
                          <input
                            type={showPassword ? 'text' : 'password'}
                            value={form.password}
                            onChange={(e) => setField('password', e.target.value)}
                            placeholder={editingId ? 'Để trống nếu không đổi mật khẩu' : 'Để trống sẽ mặc định là Thaco@1234$'}
                            className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 pr-10 text-xs font-normal outline-none focus:border-primary focus:bg-white transition-colors"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer transition-colors"
                            title={showPassword ? 'Ẩn mật khẩu' : 'Hiển thị mật khẩu'}
                          >
                            {showPassword ? (
                              <EyeOff className="w-4 h-4 text-primary" />
                            ) : (
                              <Eye className="w-4 h-4 text-slate-400" />
                            )}
                          </button>
                        </div>
                        <p className="mt-1 text-[10px] text-slate-400">
                          * Bấm biểu tượng con mắt để xem / ẩn mật khẩu đã nhập.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* BƯỚC 6: PHƯƠNG TIỆN QUẢN LÝ (XE CHÍNH 1-2 XE, XE PHỤ 1-2 XE) */}
                {formStep === 5 && (() => {
                  const assignedList = form.assignedVehicles || [];
                  const primaryCount = assignedList.filter((v) => v.type === 'PRIMARY').length;
                  const secondaryCount = assignedList.filter((v) => v.type === 'SECONDARY').length;

                  return (
                    <div className="space-y-3.5">
                      <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs">
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-3 pb-2 border-b border-slate-100">
                          <div className="flex items-center gap-2 font-bold text-xs text-slate-800">
                            <Truck className="w-4 h-4 text-primary" />
                            <span>Phân công Phương tiện Quản lý ({assignedList.length} xe)</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`text-[11px] font-extrabold px-2 py-0.5 rounded-full border ${
                              primaryCount > 0 ? 'bg-emerald-50 text-emerald-800 border-emerald-300' : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}>
                              ★ Xe chính: {primaryCount}/2
                            </span>
                            <span className={`text-[11px] font-extrabold px-2 py-0.5 rounded-full border ${
                              secondaryCount > 0 ? 'bg-sky-50 text-sky-800 border-sky-300' : 'bg-slate-50 text-slate-600 border-slate-200'
                            }`}>
                              ⚡ Xe phụ: {secondaryCount}/2
                            </span>
                          </div>
                        </div>

                        {/* Hướng dẫn nghiệp vụ */}
                        <div className="p-2.5 mb-3 bg-blue-50/70 border border-blue-200 rounded-xl text-[11px] text-blue-900 leading-relaxed">
                          <b>Quy định quản lý tài sản:</b> 1 tài xế được giữ và phụ trách chính <b>1 đến 2 xe</b> (Xe chính). Đối với tài xế khác trong đội, xe này có thể là <b>xe phụ</b> để hỗ trợ cùng quản lý, dự phòng và bảo vệ tài sản đội xe (tối đa 2 xe phụ).
                        </div>

                        {/* Dropdown chọn thêm xe vào danh sách với lựa chọn vai trò */}
                        <div className="mb-3 space-y-2">
                          <label className="block text-xs font-bold text-slate-700">
                            + Chọn xe / máy để thêm vào quyền quản lý của tài xế:
                          </label>
                          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                            <div className="sm:col-span-8">
                              <select
                                id="select-vehicle-to-add"
                                className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-normal outline-none focus:border-primary focus:bg-white"
                                defaultValue=""
                              >
                                <option value="">-- Chọn xe/máy cày/xe ben/đầu kéo để gán quản lý --</option>
                                {options.vehicles
                                  .filter((v) => !assignedList.some((item) => item.vehicleId === v.id))
                                  .map((vehicle) => (
                                    <option key={vehicle.id} value={vehicle.id}>
                                      {vehicle.plate || vehicle.code} · {vehicle.name} ({vehicle.category || 'Cơ giới'})
                                    </option>
                                  ))}
                              </select>
                            </div>
                            <div className="sm:col-span-4 flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  const selectEl = document.getElementById('select-vehicle-to-add') as HTMLSelectElement | null;
                                  const vId = Number(selectEl?.value);
                                  if (vId) {
                                    addAssignedVehicle(vId, 'PRIMARY');
                                    if (selectEl) selectEl.value = '';
                                  }
                                }}
                                disabled={primaryCount >= 2}
                                className="flex-1 h-9 inline-flex items-center justify-center gap-1 rounded-xl bg-emerald-600 text-white text-[11px] font-bold hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer shadow-xs"
                                title={primaryCount >= 2 ? 'Đã đủ tối đa 2 xe chính' : 'Gán làm xe chính'}
                              >
                                + Xe chính
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const selectEl = document.getElementById('select-vehicle-to-add') as HTMLSelectElement | null;
                                  const vId = Number(selectEl?.value);
                                  if (vId) {
                                    addAssignedVehicle(vId, 'SECONDARY');
                                    if (selectEl) selectEl.value = '';
                                  }
                                }}
                                disabled={secondaryCount >= 2}
                                className="flex-1 h-9 inline-flex items-center justify-center gap-1 rounded-xl bg-sky-600 text-white text-[11px] font-bold hover:bg-sky-700 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer shadow-xs"
                                title={secondaryCount >= 2 ? 'Đã đủ tối đa 2 xe phụ' : 'Gán làm xe phụ'}
                              >
                                + Xe phụ
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Danh sách các xe đang được gán */}
                        {assignedList.length === 0 ? (
                          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-4 text-center">
                            <Truck className="w-6 h-6 text-slate-300 mx-auto mb-1" />
                            <p className="text-xs text-slate-500 font-medium">Chưa gán xe nào cho tài xế này.</p>
                            <p className="text-[11px] text-slate-400">Chọn xe từ danh sách ở trên để thêm quyền quản lý xe chính / xe phụ.</p>
                          </div>
                        ) : (
                          <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                            {assignedList.map((item) => {
                              const v = item.vehicle || options.vehicles.find((x) => x.id === item.vehicleId);
                              const isPrimary = item.type === 'PRIMARY';
                              return (
                                <div
                                  key={item.vehicleId}
                                  className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                                    isPrimary ? 'bg-emerald-50/60 border-emerald-300' : 'bg-sky-50/50 border-sky-300'
                                  }`}
                                >
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <div className={`p-2 rounded-lg ${isPrimary ? 'bg-emerald-100 text-emerald-700' : 'bg-sky-100 text-sky-700'}`}>
                                      <Truck className="w-4 h-4" />
                                    </div>
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-2">
                                        <span className="font-mono font-bold text-xs text-slate-900">
                                          {v?.plate || v?.code || `Xe #${item.vehicleId}`}
                                        </span>
                                        <span className="text-[10px] text-slate-500 font-normal">
                                          ({v?.category || 'Cơ giới'})
                                        </span>
                                      </div>
                                      <p className="text-[11px] text-slate-600 truncate max-w-[260px]">
                                        {v?.name || 'Phương tiện cơ giới'}
                                      </p>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2">
                                    {/* Role Switcher Pill Buttons */}
                                    <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 shadow-2xs">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          if (!isPrimary) toggleVehicleRole(item.vehicleId);
                                        }}
                                        className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                                          isPrimary
                                            ? 'bg-emerald-600 text-white shadow-xs'
                                            : 'text-slate-600 hover:text-emerald-700 hover:bg-emerald-50'
                                        }`}
                                      >
                                        ★ Xe chính
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          if (isPrimary) toggleVehicleRole(item.vehicleId);
                                        }}
                                        className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                                          !isPrimary
                                            ? 'bg-sky-600 text-white shadow-xs'
                                            : 'text-slate-600 hover:text-sky-700 hover:bg-sky-50'
                                        }`}
                                      >
                                        ⚡ Xe phụ
                                      </button>
                                    </div>

                                    <button
                                      type="button"
                                      onClick={() => removeAssignedVehicle(item.vehicleId)}
                                      className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                      title="Gỡ xe này khỏi quyền quản lý"
                                    >
                                      <X className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <label className="text-xs font-bold text-slate-700">
                          Trạng thái ca vận hành
                          <select value={form.currentShiftStatus} onChange={(e) => setField('currentShiftStatus', e.target.value)} className="mt-1 h-9 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-normal outline-none focus:border-primary focus:bg-white">
                            {Object.entries(SHIFT_LABELS).map(([key, value]) => (
                              <option key={key} value={key}>{value}</option>
                            ))}
                          </select>
                        </label>
                        <TextField label="Vị trí thực tế / Bãi đỗ xe" value={form.currentLocation} placeholder="Bãi xe KLH / Nông trường..." onChange={(e) => setField('currentLocation', e.target.value)} />
                        <div className="sm:col-span-2">
                          <TextField label="Ghi chú phân công & vận hành" value={form.notes} placeholder="Ghi chú về tình trạng bàn giao, ca máy..." onChange={(e) => setField('notes', e.target.value)} />
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* BƯỚC 7: XÁC NHẬN & HOÀN TẤT */}
                {formStep === 6 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 pb-2 border-b border-slate-200/70 font-bold text-xs text-slate-800">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Xác nhận thông tin hồ sơ lái xe & thợ vận hành</span>
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <InfoItem label="Nhân sự" value={`${form.code || '—'} · ${form.fullName || '—'}`} />
                      <InfoItem label="Đơn vị / Đội" value={`${options.managementUnits.find((u) => u.id === Number(form.managementUnitId))?.name || 'Chưa phân loại'} · ${options.managementUnits.find((u) => u.id === Number(form.teamUnitId))?.name || 'Chưa gán Đội/Tổ'}`} />
                      <InfoItem label="Chức danh" value={form.position || 'Tài xế'} />
                      <InfoItem label="Ngày vào công ty / Thâm niên" value={`${formatDate(form.joinedDate)} · ${calculateTenure(form.joinedDate, form.resignedDate)}`} />
                      <InfoItem
                        label={`Bằng lái & Chứng chỉ (${form.licenses.length} bằng)`}
                        value={
                          form.licenses.length === 0 ? (
                            'Chưa khai báo'
                          ) : (
                            <div className="flex flex-col gap-1 mt-1">
                              {form.licenses.map((lic, i) => (
                                <div key={i} className="text-xs">
                                  <span className="font-bold">{lic.category}</span>
                                  {lic.isPrimary && <span className="ml-1 text-[10px] text-emerald-700 font-extrabold bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">★ Chính</span>}
                                  {lic.number && <span className="ml-1 text-slate-500 font-mono">({lic.number})</span>}
                                </div>
                              ))}
                            </div>
                          )
                        }
                      />
                      <InfoItem label="Ca làm việc" value={SHIFT_LABELS[form.currentShiftStatus]} />
                      <InfoItem
                        label={`Phương tiện quản lý (${(form.assignedVehicles || []).length} xe)`}
                        wide={true}
                        value={
                          (form.assignedVehicles || []).length === 0 ? (
                            <span className="text-slate-400 italic">Chưa phân công xe</span>
                          ) : (
                            <div className="flex flex-wrap gap-1.5 mt-1">
                              {form.assignedVehicles.map((item) => {
                                const v = item.vehicle || options.vehicles.find((x) => x.id === item.vehicleId);
                                const isPrimary = item.type === 'PRIMARY';
                                return (
                                  <span
                                    key={item.vehicleId}
                                    className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-mono font-bold border ${
                                      isPrimary
                                        ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                                        : 'bg-sky-50 text-sky-900 border-sky-300'
                                    }`}
                                  >
                                    <Truck className={`w-3.5 h-3.5 ${isPrimary ? 'text-emerald-600' : 'text-sky-600'}`} />
                                    {v?.plate || v?.code || `Xe #${item.vehicleId}`}
                                    <span className={`text-[10px] font-sans font-bold px-1 rounded ${
                                      isPrimary ? 'bg-emerald-200 text-emerald-900' : 'bg-sky-200 text-sky-900'
                                    }`}>
                                      {isPrimary ? 'Chính' : 'Phụ'}
                                    </span>
                                  </span>
                                );
                              })}
                            </div>
                          )
                        }
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <datalist id="driver-complexes">{options.complexes.map((value) => <option key={value} value={value} />)}</datalist>
          <datalist id="driver-enterprises">{options.enterprises.map((value) => <option key={value} value={value} />)}</datalist>
          <datalist id="driver-farms">{options.farms.map((value) => <option key={value} value={value} />)}</datalist>
          <datalist id="driver-teams">{options.teams.map((value) => <option key={value} value={value} />)}</datalist>
          <datalist id="driver-positions">{options.positions.map((value) => <option key={value} value={value} />)}</datalist>
        </div>
      </Modal>

      {/* 6. MODAL XEM ẢNH CHÂN DUNG CHI TIẾT (CHUẨN ẢNH 3x4 TO RÕ, KHÔNG CÓ TEXT) */}
      {previewImage && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="relative w-full max-w-[380px] sm:max-w-[420px] bg-slate-900 border border-slate-700/80 rounded-3xl overflow-hidden shadow-2xl p-3 flex flex-col items-center animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Nút Đóng góc trên bên phải */}
            <button
              type="button"
              onClick={() => setPreviewImage(null)}
              className="absolute top-5 right-5 z-10 w-9 h-9 rounded-full bg-slate-950/70 hover:bg-slate-900 text-white flex items-center justify-center transition-all hover:scale-110 cursor-pointer backdrop-blur-md border border-white/20 shadow-lg"
              title="Đóng xem ảnh"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Khung ảnh chân dung 3x4 to rõ nét */}
            <div className="w-full aspect-[3/4] rounded-2xl overflow-hidden bg-slate-950 flex items-center justify-center shadow-inner border border-slate-800">
              <img
                src={previewImage.url}
                alt="Ảnh chân dung 3x4"
                className="w-full h-full object-cover"
              />
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-between w-full pt-3 px-1">
              <Button
                variant="outline"
                size="sm"
                className="border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white"
                icon={<Upload className="w-3.5 h-3.5 text-primary" />}
                onClick={() => {
                  setPreviewImage(null);
                  detailFileInputRef.current?.click();
                }}
              >
                Thay đổi ảnh này
              </Button>
              <Button size="sm" onClick={() => setPreviewImage(null)}>
                Đóng
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
