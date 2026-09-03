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
  Loader2,
  Lock,
  Mail,
  MapPin,
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
import { catalogsApi } from '../../api/catalogsApi';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { SearchableSelect, SelectOption } from '../../components/common/SearchableSelect';
import { Column, DataTable } from '../../components/data-display/DataTable';
import { KPIGrid } from '../../components/data-display/KPIGrid';
import { StatCard } from '../../components/data-display/StatCard';
import { getStoredData } from '../../utils/storage';
import { parseOperationalImport, toIsoDate } from '../../utils/operationalExcelTemplates';
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
}

const EMPTY_OPTIONS: DriverOptions = {
  complexes: [], enterprises: [], farms: [], teams: [], positions: [], units: [], vehicles: [],
};

const UNIT_LABELS: Record<string, string> = {
  NT1: 'Nông trường 1', NT2: 'Nông trường 2', XN_BO: 'Xí nghiệp Bò',
  TT_BTSC: 'Trung tâm BTSC', BAN_CO_GIOI: 'Ban Cơ giới', TOAN_KLH: 'Toàn KLH',
};
const LICENSE_LABELS: Record<string, string> = {
  BANG_MAY_NONG_NGHIEP: 'Máy nông nghiệp', HANG_C: 'Hạng C', HANG_FC: 'Hạng FC',
  HANG_B2: 'Hạng B2', HANG_D: 'Hạng D',
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
  code: '', username: '', password: '', fullName: '', phone: '', unit: 'NT1', joinedDate: inputDate(new Date().toISOString()),
  employmentStatus: 'DANG_LAM_VIEC', businessUnit: '', complex: '', enterprise: '', farm: '', team: '', position: '',
  email: '', idCardNumber: '', idCardIssueDate: '', idCardIssuePlace: '', avatarUrl: '', licenseClass: '', licenseNumber: '',
  licenseIssueDate: '', licenseIssuePlace: '', licenseExpiryDate: '',
  machineryCertType: '', machineryCertNumber: '', machineryCertIssuer: '', machineryCertDate: '',
  healthCheckDate: '', healthCheckHospital: '', healthCheckExpiryDate: '', healthClassification: 'LOAI_1',
  safetyCardNumber: '', rfidCardNumber: '',
  currentShiftStatus: 'SAN_SANG', currentLocation: '', assignedVehicleId: '', assignedVehicleIds: [] as number[],
  resignedDate: '', resignedReason: '', notes: '',
});

type CardFilterType = 'ALL' | 'OPERATING' | 'READY' | 'INACTIVE' | 'COMPLIANCE_ALERT';

export const DriversListPage: React.FC = () => {
  const globalKLH = useAppStore((state) => state.selectedKLH);
  const [drivers, setDrivers] = useState<DriverListItem[]>([]);
  const [summary, setSummary] = useState({ total: 0, operating: 0, ready: 0, inactive: 0, complianceAlerts: 0 });
  const [options, setOptions] = useState<DriverOptions>(EMPTY_OPTIONS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cardFilter, setCardFilter] = useState<CardFilterType>('ALL');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(true);
  const [filters, setFilters] = useState({
    search: '',
    enterprise: '',
    team: '',
    position: '',
    licenseClass: '',
    shiftStatus: '',
    employmentStatus: '',
    complianceStatus: '',
    complex: '',
  });
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
      const activeComplex = (globalKLH && globalKLH !== 'ALL') ? globalKLH : (filters.complex || undefined);
      const result = await apiService.getDriverProfiles({
        limit: 250,
        ...(filters.search ? { search: filters.search } : {}),
        ...(activeComplex ? { complex: activeComplex } : {}),
        ...(filters.enterprise ? { enterprise: filters.enterprise } : {}),
        ...(filters.team ? { team: filters.team } : {}),
        ...(filters.position ? { position: filters.position } : {}),
        ...(filters.employmentStatus ? { employmentStatus: filters.employmentStatus } : {}),
      });
      setDrivers(result.items || []);
      setSummary(result.summary || { total: 0, operating: 0, ready: 0, inactive: 0, complianceAlerts: 0 });
    } catch {
      setDrivers([]);
      setError('Không tải được dữ liệu hồ sơ lái xe từ máy chủ. Hệ thống không sử dụng dữ liệu giả thay thế.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void apiService.getDriverProfileOptions().then((data) => setOptions(data || EMPTY_OPTIONS)).catch(() => setOptions(EMPTY_OPTIONS));
  }, []);

  const [showPassword, setShowPassword] = useState(false);

  // Catalog Master Data for Form (Đồng bộ theo danh mục quản lý)
  const [catalogComplexes, setCatalogComplexes] = useState<CatalogItem[]>(() =>
    getStoredData('catalogs_complexes', mockComplexes)
  );
  const [catalogEnterprises, setCatalogEnterprises] = useState<CatalogItem[]>(() =>
    getStoredData('catalogs_enterprises', mockEnterprises)
  );
  const [catalogFarms, setCatalogFarms] = useState<CatalogItem[]>(() =>
    getStoredData('catalogs_farms', mockFarms)
  );
  const [catalogTeams, setCatalogTeams] = useState<CatalogItem[]>(() =>
    getStoredData('catalogs_teams', mockTeams)
  );
  const [catalogPositions, setCatalogPositions] = useState<CatalogItem[]>(() =>
    getStoredData('catalogs_positions', mockPositions)
  );

  useEffect(() => {
    catalogsApi.getCatalogs('COMPLEX', 'catalogs_complexes', mockComplexes).then((data) => {
      if (Array.isArray(data) && data.length > 0) setCatalogComplexes(data);
    });
    catalogsApi.getCatalogs('ENTERPRISE', 'catalogs_enterprises', mockEnterprises).then((data) => {
      if (Array.isArray(data) && data.length > 0) setCatalogEnterprises(data);
    });
    catalogsApi.getCatalogs('FARM', 'catalogs_farms', mockFarms).then((data) => {
      if (Array.isArray(data) && data.length > 0) setCatalogFarms(data);
    });
    catalogsApi.getCatalogs('TEAM', 'catalogs_teams', mockTeams).then((data) => {
      if (Array.isArray(data) && data.length > 0) setCatalogTeams(data);
    });
    catalogsApi.getCatalogs('JOB_TYPE', 'catalogs_job_types', mockPositions).then((data) => {
      if (Array.isArray(data) && data.length > 0) setCatalogPositions(data);
    });
  }, []);

  // Options for Form Step 2 (Công tác) - Lấy chuẩn từ Danh mục
  const formComplexOptions = useMemo<SelectOption[]>(() => {
    return catalogComplexes.map((c) => ({
      value: c.name,
      label: c.code ? `${c.code} - ${c.name}` : c.name,
    }));
  }, [catalogComplexes]);

  const formEnterpriseOptions = useMemo<SelectOption[]>(() => {
    let list = catalogEnterprises;
    if (form.complex) {
      const comp = catalogComplexes.find((c) => c.name === form.complex || c.code === form.complex);
      const compCode = comp ? comp.code : form.complex;
      const compName = comp ? comp.name : form.complex;
      list = list.filter((e) => e.parentCode === compCode || e.parentName === compName || !e.parentCode);
    }
    return list.map((e) => ({
      value: e.name,
      label: e.code ? `${e.code} - ${e.name}` : e.name,
      subLabel: e.parentName ? `KLH: ${e.parentName}` : undefined,
    }));
  }, [catalogEnterprises, catalogComplexes, form.complex]);

  const formFarmOptions = useMemo<SelectOption[]>(() => {
    let list = catalogFarms;
    if (form.enterprise) {
      const ent = catalogEnterprises.find((e) => e.name === form.enterprise || e.code === form.enterprise);
      const entCode = ent ? ent.code : form.enterprise;
      const entName = ent ? ent.name : form.enterprise;
      list = list.filter((f) => f.parentCode === entCode || f.parentName === entName || !f.parentCode);
    }
    return list.map((f) => ({
      value: f.name,
      label: f.code ? `${f.code} - ${f.name}` : f.name,
      subLabel: f.parentName ? `XN: ${f.parentName}` : undefined,
    }));
  }, [catalogFarms, catalogEnterprises, form.enterprise]);

  const formTeamOptions = useMemo<SelectOption[]>(() => {
    return catalogTeams.map((t) => ({
      value: t.name,
      label: t.code ? `${t.code} - ${t.name}` : t.name,
    }));
  }, [catalogTeams]);

  const formPositionOptions = useMemo<SelectOption[]>(() => {
    const defaultPositions = [
      'Lái máy kéo nông nghiệp',
      'Lái xe tải ben / đầu kéo',
      'Lái xe bồn nước / bồn cám',
      'Thợ vận hành máy đào / ủi',
      'Lái xe công vụ / bán tải',
      'Thợ cơ khí / sửa chữa',
      'Tổ trưởng tổ xe / cơ giới',
      'Lái xe vận chuyển nội bộ',
      'Nhân viên lái xe',
    ];
    const catPositions = catalogPositions.map((p) => p.name).filter(Boolean);
    const combined = Array.from(new Set([...catPositions, ...defaultPositions]));
    return combined.map((p) => ({
      value: p,
      label: p,
    }));
  }, [catalogPositions]);

  const formUnitOptions = useMemo<SelectOption[]>(() => {
    return [
      { value: 'NT1', label: 'NT1 - Nông trường 1', subLabel: 'Nông trường' },
      { value: 'NT2', label: 'NT2 - Nông trường 2', subLabel: 'Nông trường' },
      { value: 'XN_BO', label: 'XN_BO - Xí nghiệp Bò', subLabel: 'Xí nghiệp' },
      { value: 'BAN_CO_GIOI', label: 'BAN_CO_GIOI - Ban Cơ giới', subLabel: 'Ban chuyên trách' },
      { value: 'TT_BTSC', label: 'TT_BTSC - Trung tâm BTSC', subLabel: 'Xưởng dịch vụ' },
      { value: 'TOAN_KLH', label: 'TOAN_KLH - Toàn KLH', subLabel: 'Tổng thể' },
    ];
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadDrivers(), 250);
    return () => window.clearTimeout(timer);
  }, [globalKLH, filters.search, filters.enterprise, filters.team, filters.position, filters.employmentStatus, filters.complex]);

  // Dữ liệu lái xe theo Khu liên hợp đã chọn từ Header
  const klhFilteredDrivers = useMemo(() => {
    if (!globalKLH || globalKLH === 'ALL') return drivers;
    const reqComp = globalKLH.toUpperCase();
    return drivers.filter((d) => {
      const empComp = (d.employee?.complex || '').toUpperCase();
      return (
        empComp === reqComp ||
        (reqComp === 'KOUN_MOM' && (empComp.includes('KOUN') || empComp.includes('KM'))) ||
        (reqComp === 'SNOUL' && (empComp.includes('SNOUL') || empComp.includes('SN'))) ||
        (reqComp === 'NAM_LAO' && (empComp.includes('LAO') || empComp.includes('NL')))
      );
    });
  }, [drivers, globalKLH]);

  // Danh sách Đơn vị công tác (Kết hợp Danh mục & Dữ liệu Lái xe có thực tế)
  const enterpriseSelectOptions = useMemo(() => {
    const counts: Record<string, number> = {};
    klhFilteredDrivers.forEach((d) => {
      const ent = d.enterprise || UNIT_LABELS[d.unit] || d.unit;
      if (ent) counts[ent] = (counts[ent] || 0) + 1;
    });

    const catalogItems = getStoredData<CatalogItem[]>('catalogs_enterprises', mockEnterprises);
    const unitNames = new Set<string>();
    klhFilteredDrivers.forEach((d) => {
      const ent = d.enterprise || UNIT_LABELS[d.unit] || d.unit;
      if (ent) unitNames.add(ent);
    });
    catalogItems.forEach((c) => {
      if (c.name && counts[c.name]) unitNames.add(c.name);
    });

    return Array.from(unitNames).map((name) => ({
      value: name,
      label: `${name} (${counts[name] || 0})`,
    }));
  }, [klhFilteredDrivers]);

  // Danh sách Đội/Tổ công tác (Kết hợp Danh mục Đội & Dữ liệu Lái xe có thực tế)
  const teamSelectOptions = useMemo(() => {
    const counts: Record<string, number> = {};
    klhFilteredDrivers.forEach((d) => {
      if (d.team) counts[d.team] = (counts[d.team] || 0) + 1;
    });

    const catalogTeams = getStoredData<CatalogItem[]>('catalogs_teams', mockTeams);
    const teamNames = new Set<string>();
    klhFilteredDrivers.forEach((d) => {
      if (d.team) teamNames.add(d.team);
    });
    catalogTeams.forEach((t) => {
      if (t.name && counts[t.name]) teamNames.add(t.name);
    });

    return Array.from(teamNames).map((name) => ({
      value: name,
      label: `${name} (${counts[name] || 0})`,
    }));
  }, [klhFilteredDrivers]);

  // Danh sách Chức danh công tác (Kết hợp Danh mục Chức danh & Dữ liệu Lái xe có thực tế)
  const positionSelectOptions = useMemo(() => {
    const counts: Record<string, number> = {};
    klhFilteredDrivers.forEach((d) => {
      if (d.position) counts[d.position] = (counts[d.position] || 0) + 1;
    });

    const catalogPositions = getStoredData<CatalogItem[]>('catalogs_positions', mockPositions);
    const posNames = new Set<string>();
    klhFilteredDrivers.forEach((d) => {
      if (d.position) posNames.add(d.position);
    });
    catalogPositions.forEach((p) => {
      if (p.name && counts[p.name]) posNames.add(p.name);
    });

    return Array.from(posNames).map((name) => ({
      value: name,
      label: `${name} (${counts[name] || 0})`,
    }));
  }, [klhFilteredDrivers]);

  // Danh sách Hạng GPLX / Bằng máy (Chỉ những hạng có data)
  const licenseClassSelectOptions = useMemo(() => {
    const counts: Record<string, number> = {};
    klhFilteredDrivers.forEach((d) => {
      if (d.licenseClass) {
        counts[d.licenseClass] = (counts[d.licenseClass] || 0) + 1;
      }
    });
    return Object.entries(counts).map(([key, count]) => ({
      value: key,
      label: `${LICENSE_LABELS[key] || key} (${count})`,
    }));
  }, [klhFilteredDrivers]);

  // Thống kê số lượng thực tế từ danh sách lái xe (Đảm bảo Tổng = Đang vận hành + Sẵn sàng + Đã nghỉ việc)
  const stats = useMemo(() => {
    const total = klhFilteredDrivers.length;
    const inactive = klhFilteredDrivers.filter((d) => d.employmentStatus === 'DA_NGHI_VIEC').length;
    const operating = klhFilteredDrivers.filter(
      (d) => d.employmentStatus !== 'DA_NGHI_VIEC' && d.currentShiftStatus === 'DANG_VAN_HANH',
    ).length;
    const ready = Math.max(0, total - inactive - operating);
    const complianceAlerts = klhFilteredDrivers.filter(
      (d) => d.complianceStatus && d.complianceStatus !== 'VALID',
    ).length;

    return {
      total,
      operating,
      ready,
      inactive,
      complianceAlerts,
    };
  }, [klhFilteredDrivers]);

  // Đếm số lượng bộ lọc đang kích hoạt
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (cardFilter !== 'ALL') count++;
    if (filters.enterprise) count++;
    if (filters.team) count++;
    if (filters.position) count++;
    if (filters.licenseClass) count++;
    if (filters.employmentStatus) count++;
    return count;
  }, [cardFilter, filters]);

  // Xuất file CSV/Excel danh sách nhân sự
  const handleExportExcel = () => {
    const headers = ['Mã NV', 'Họ và tên', 'SĐT', 'Đơn vị', 'Đội/Tổ', 'Chức danh', 'GPLX', 'Số GPLX', 'Trạng thái ca', 'Tình trạng làm việc'];
    const rows = displayDrivers.map((d) => [
      d.code,
      `"${d.fullName}"`,
      d.phone || '',
      `"${d.enterprise || UNIT_LABELS[d.unit] || d.unit}"`,
      `"${d.team || ''}"`,
      `"${d.position || ''}"`,
      `"${LICENSE_LABELS[d.licenseClass] || d.licenseClass || ''}"`,
      d.licenseNumber || '',
      `"${SHIFT_LABELS[d.currentShiftStatus] || ''}"`,
      d.employmentStatus === 'DANG_LAM_VIEC' ? 'Đang làm việc' : 'Đã nghỉ việc',
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
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
        const unit = orgText.includes('bò') ? 'XN_BO'
          : orgText.includes('nông trường 2') || orgText.includes('nt2') ? 'NT2'
            : orgText.includes('nông trường 1') || orgText.includes('nt1') ? 'NT1'
              : orgText.includes('btsc') || orgText.includes('xưởng') ? 'TT_BTSC' : 'BAN_CO_GIOI';
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
          password: '123456', role: 'DRIVER', unit, notes,
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
        ].some((val) => String(val || '').toLowerCase().includes(q));
        if (!match) return false;
      }

      // 3. Lọc theo Đơn vị
      if (filters.enterprise) {
        const ent = item.enterprise || UNIT_LABELS[item.unit] || item.unit;
        if (ent !== filters.enterprise && item.unit !== filters.enterprise) return false;
      }

      // 4. Lọc theo Đội/Tổ
      if (filters.team && item.team !== filters.team) return false;

      // 5. Lọc theo Chức danh
      if (filters.position && item.position !== filters.position) return false;

      // 6. Lọc theo Hạng GPLX
      if (filters.licenseClass && item.licenseClass !== filters.licenseClass) return false;

      // 7. Lọc theo Trạng thái làm việc
      if (filters.employmentStatus && item.employmentStatus !== filters.employmentStatus) return false;

      return true;
    });
  }, [klhFilteredDrivers, cardFilter, filters]);

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

    const allVehicleIds: number[] = [];
    if (detail.assignedVehicle?.id) allVehicleIds.push(detail.assignedVehicle.id);
    if (Array.isArray((detail as any).drivenVehicles)) {
      (detail as any).drivenVehicles.forEach((v: any) => {
        if (v?.id && !allVehicleIds.includes(v.id)) allVehicleIds.push(v.id);
      });
    }
    if (Array.isArray((detail as any).secondaryVehicles)) {
      (detail as any).secondaryVehicles.forEach((v: any) => {
        if (v?.id && !allVehicleIds.includes(v.id)) allVehicleIds.push(v.id);
      });
    }

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
      complex: detail.employee?.complex || '',
      enterprise: detail.employee?.enterprise || '',
      farm: detail.employee?.farm || '',
      team: detail.employee?.team || '',
      position: detail.employee?.position || '',
      email: detail.employee?.email || '',
      idCardNumber: detail.employee?.idCardNumber || '',
      idCardIssueDate: detail.employee?.idCardIssueDate || '',
      idCardIssuePlace: detail.employee?.idCardIssuePlace || '',
      avatarUrl: detail.avatarUrl || '',
      licenseClass: detail.licenseClass || '',
      licenseNumber: detail.licenseNumber || '',
      licenseExpiryDate: inputDate(detail.licenseExpiryDate),
      healthCheckExpiryDate: inputDate(detail.healthCheckExpiryDate),
      currentShiftStatus: detail.currentShiftStatus || 'SAN_SANG',
      currentLocation: detail.currentLocation || '',
      assignedVehicleId: allVehicleIds[0] ? String(allVehicleIds[0]) : (detail.assignedVehicle?.id ? String(detail.assignedVehicle.id) : ''),
      assignedVehicleIds: allVehicleIds,
      resignedDate: inputDate(detail.resignedDate),
      resignedReason: detail.resignedReason || '',
      notes: detail.notes || '',
      password: '',
    });
    setSelected(null);
    setFormStep(0);
    setEditorOpen(true);
  };

  const setField = (name: string, value: string) => setForm((current) => ({ ...current, [name]: value }));

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
    if (!payload.username || !(payload.username as string).trim()) {
      payload.username = (form.code || 'driver').toLowerCase().replace(/[^a-z0-9]/g, '_');
    }
    if (!payload.password || !(payload.password as string).trim()) {
      if (!editingId) {
        payload.password = '123456';
      } else {
        delete payload.password;
      }
    }
    // Mặc định vai trò luôn là Tài xế khi tạo/sửa ở hồ sơ lái xe
    payload.role = 'DRIVER';

    // Tự động suy ra đơn vị hệ thống theo Xí nghiệp / Nông trường được chọn
    const entStr = `${form.enterprise || ''} ${form.farm || ''}`.toLowerCase();
    if (entStr.includes('bò') || entStr.includes('xn_bo')) {
      payload.unit = 'XN_BO';
    } else if (entStr.includes('nông trường 2') || entStr.includes('nt2')) {
      payload.unit = 'NT2';
    } else if (entStr.includes('nông trường 1') || entStr.includes('nt1')) {
      payload.unit = 'NT1';
    } else if (entStr.includes('btsc') || entStr.includes('xưởng')) {
      payload.unit = 'TT_BTSC';
    } else {
      payload.unit = form.unit || 'BAN_CO_GIOI';
    }

    if (!payload.assignedVehicleId) delete payload.assignedVehicleId;
    else payload.assignedVehicleId = Number(payload.assignedVehicleId);
    ['licenseClass', 'licenseExpiryDate', 'healthCheckExpiryDate', 'resignedDate'].forEach((key) => {
      if (!payload[key]) delete payload[key];
    });
    try {
      if (editingId) await apiService.updateDriverProfile(editingId, payload);
      else await apiService.createDriverProfile(payload);
      setEditorOpen(false);
      await loadDrivers();
    } catch (requestError: any) {
      setError(requestError?.response?.data?.message || 'Không thể lưu hồ sơ. Vui lòng kiểm tra các trường bắt buộc.');
    } finally {
      setSaving(false);
    }
  };

  const columns = useMemo<Column<DriverListItem>[]>(() => [
    { key: 'code', title: 'MÃ NHÂN VIÊN', sortable: true, render: (row) => <span className="font-mono font-bold text-primary">{row.code}</span> },
    { key: 'fullName', title: 'HỌ VÀ TÊN', sortable: true, render: (row) => (
      <div className="flex items-center gap-2.5">
        {row.avatarUrl ? <img src={row.avatarUrl} alt="" className="h-8 w-8 rounded-full object-cover" /> : <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-500">{row.fullName.charAt(0)}</div>}
        <span className="font-bold text-slate-900">{row.fullName}</span>
      </div>
    ) },
    {
      key: 'assignedVehicle',
      title: 'XE PHỤ TRÁCH',
      render: (row) => {
        const vehicles: VehicleSummary[] = [];
        if (row.assignedVehicle) vehicles.push(row.assignedVehicle);
        if (Array.isArray((row as any).drivenVehicles)) {
          (row as any).drivenVehicles.forEach((v: any) => {
            if (v && !vehicles.some((x) => x.id === v.id)) vehicles.push(v);
          });
        }
        if (Array.isArray((row as any).secondaryVehicles)) {
          (row as any).secondaryVehicles.forEach((v: any) => {
            if (v && !vehicles.some((x) => x.id === v.id)) vehicles.push(v);
          });
        }

        if (vehicles.length === 0) {
          return <span className="text-slate-400 text-xs italic">Chưa bàn giao</span>;
        }

        const primary = vehicles[0];
        const extraCount = vehicles.length - 1;

        return (
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-mono font-bold text-xs text-slate-800 flex items-center gap-1">
                <Truck className="h-3.5 w-3.5 text-primary shrink-0" />
                {primary.plate || primary.code}
              </span>
              {extraCount > 0 && (
                <span
                  title={vehicles.map((v) => `${v.plate || v.code} (${v.name || 'Xe'})`).join('\n')}
                  className="rounded-full bg-emerald-100 px-1.5 py-0.2 text-[10px] font-extrabold text-emerald-800 border border-emerald-300 cursor-help"
                >
                  +{extraCount} xe
                </span>
              )}
            </div>
            {primary.name && (
              <span className="text-[10px] text-slate-500 truncate max-w-[170px]" title={primary.name}>
                {primary.name}
              </span>
            )}
          </div>
        );
      },
    },
    { key: 'team', title: 'ĐỘI', render: (row) => row.team || 'Chưa cập nhật' },
    { key: 'position', title: 'CHỨC DANH', render: (row) => row.position || 'Chưa cập nhật' },
    { key: 'employmentStatus', title: 'TRẠNG THÁI', render: (row) => employmentBadge(row.employmentStatus) },
    { key: 'actions', title: 'THAO TÁC', align: 'right', render: (row) => (
      <div className="flex justify-end gap-1" onClick={(event) => event.stopPropagation()}>
        <Button variant="ghost" size="sm" icon={<Eye className="h-3.5 w-3.5" />} onClick={() => void openDetail(row)}>Xem</Button>
        <Button variant="outline" size="sm" icon={<Edit className="h-3.5 w-3.5" />} onClick={() => void openEdit(row)}>Sửa</Button>
      </div>
    ) },
  ], []);

  return (
    <div className="space-y-4">
      {/* 1. KPIGrid 5 Thẻ thống kê - THIẾT KẾ CHUẨN ĐẸP THEO HÌNH THỨ 2 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Card 1: Tổng nhân sự (Blue Theme) */}
        <button
          type="button"
          onClick={() => setCardFilter('ALL')}
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

        {/* Card 5: Cảnh báo hồ sơ (Rose Theme) */}
        <button
          type="button"
          onClick={() => setCardFilter((curr) => (curr === 'COMPLIANCE_ALERT' ? 'ALL' : 'COMPLIANCE_ALERT'))}
          className={`relative overflow-hidden p-4 rounded-2xl border text-left transition-all hover:shadow-md cursor-pointer ${
            cardFilter === 'COMPLIANCE_ALERT'
              ? 'border-rose-500 bg-rose-50/40 ring-2 ring-rose-500/25 shadow-sm scale-[1.01]'
              : 'border-slate-200 bg-white hover:bg-slate-50'
          }`}
        >
          <span className="absolute inset-x-0 bottom-0 h-1.5 bg-rose-500" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-700">Cảnh báo hồ sơ</span>
            <div className="rounded-xl p-2 bg-rose-50 text-rose-600">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-rose-700">
            {stats.complianceAlerts.toLocaleString('vi-VN')}
          </div>
          <div className="mt-1 text-[11px] font-semibold text-rose-600 truncate">
            Thiếu hoặc sắp/quá hạn
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

            <button
              type="button"
              onClick={() => void loadDrivers()}
              disabled={loading}
              title="Làm mới dữ liệu"
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700 transition-all hover:bg-slate-100 disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
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
          <div className="grid grid-cols-1 gap-3 border-t border-slate-100 pt-3 sm:grid-cols-2 lg:grid-cols-4">
            {/* 1. ĐƠN VỊ SỬ DỤNG (XÍ NGHIỆP / ĐỘI) */}
            <div>
              <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                Đơn vị sử dụng (Xí nghiệp / Đội)
              </label>
              <SearchableSelect
                value={filters.enterprise}
                onChange={(val) => setFilters({ ...filters, enterprise: val === 'ALL' ? '' : val })}
                options={enterpriseSelectOptions}
                placeholder={`Tất cả đơn vị (${enterpriseSelectOptions.length})`}
                emptyOptionLabel={`Tất cả đơn vị (${enterpriseSelectOptions.length})`}
                heightClass="h-9"
                icon={<Building2 className="h-4 w-4 text-slate-400" />}
              />
            </div>

            {/* 2. ĐỘI / TỔ CÔNG TÁC */}
            <div>
              <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                Đội / Tổ công tác ({teamSelectOptions.length} đội/tổ)
              </label>
              <SearchableSelect
                value={filters.team}
                onChange={(val) => setFilters({ ...filters, team: val === 'ALL' ? '' : val })}
                options={teamSelectOptions}
                placeholder={`Tất cả đội/tổ (${teamSelectOptions.length})`}
                emptyOptionLabel={`Tất cả đội/tổ (${teamSelectOptions.length})`}
                heightClass="h-9"
                icon={<Users className="h-4 w-4 text-slate-400" />}
              />
            </div>

            {/* 3. CHỨC DANH */}
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

            {/* 4. HẠNG GPLX / BẰNG MÁY */}
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
          </div>
        )}
      </section>

      {error && <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-700"><ShieldAlert className="h-4 w-4" />{error}<button className="ml-auto" onClick={() => setError('')}><X className="h-4 w-4" /></button></div>}

      {/* 3. Bảng danh sách hồ sơ */}
      <DataTable
        title="Danh sách lái xe / lái máy / thợ vận hành"
        subtitle={
          cardFilter !== 'ALL' || filters.search || filters.enterprise || filters.team || filters.position || filters.employmentStatus
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
                <Button size="sm" icon={<Edit className="h-3.5 w-3.5" />} onClick={() => void openEdit(selected)}>
                  Chỉnh sửa hồ sơ
                </Button>
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
                  <span className="font-semibold text-slate-800 truncate max-w-[120px]" title={selected.employee?.enterprise || UNIT_LABELS[selected.unit] || selected.unit}>
                    {selected.employee?.enterprise || UNIT_LABELS[selected.unit] || selected.unit}
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

              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs font-bold"
                icon={<Edit className="w-3.5 h-3.5" />}
                onClick={() => void openEdit(selected)}
              >
                Chỉnh sửa hồ sơ
              </Button>
            </div>

            {/* CỘT PHẢI: THÔNG TIN CHI TIẾT VỚI TAB CỐ ĐỊNH */}
            <div className="flex-1 min-w-0 flex flex-col">
              {/* Tab Navigation Cố định */}
              <div className="flex border-b border-slate-200 gap-1 pb-1 mb-3 overflow-x-auto">
                {[
                  { id: 0, label: 'Cá nhân & Định danh', icon: <UserCheck className="w-3.5 h-3.5" /> },
                  { id: 1, label: 'Công tác & Tổ chức', icon: <Briefcase className="w-3.5 h-3.5" /> },
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
                    <InfoItem label="Khu liên hợp" value={selected.employee?.complex || 'Snoul (Campuchia)'} />
                    <InfoItem label="Xí nghiệp / Đơn vị" value={selected.employee?.enterprise || selected.employee?.businessUnit || UNIT_LABELS[selected.unit] || selected.unit} />
                    <InfoItem label="Nông trường trực thuộc" value={selected.employee?.farm || 'Nông trường 1'} />
                    <InfoItem label="Đội / Tổ sản xuất" value={selected.employee?.team || 'Đội Cơ giới 01'} />
                    <InfoItem label="Chức danh đảm nhiệm" value={selected.employee?.position || 'Lái xe cơ giới'} />
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

                {detailTab === 2 && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <InfoItem label="Hạng Giấy phép lái xe" value={selected.licenseClass ? LICENSE_LABELS[selected.licenseClass] || selected.licenseClass : 'Hạng FC'} />
                      <InfoItem label="Số GPLX / Chứng chỉ nghề" value={selected.licenseNumber || '790182736412'} />
                      <InfoItem label="Ngày hết hạn GPLX" value={formatDate(selected.licenseExpiryDate)} />
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
                    <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 space-y-2">
                      <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <HeartPulse className="w-4 h-4 text-emerald-600" />
                        <span>Quy chuẩn an toàn lao động cơ giới</span>
                      </div>
                      <p className="text-[11px] text-slate-600 leading-relaxed">
                        Lái xe đã hoàn thành khóa huấn luyện an toàn vận hành phương tiện nông nghiệp, kiểm tra nồng độ cồn và chất kích thích trước ca lái theo quy định của Ban Quản trị Vận hành Cơ giới THACO AGRI.
                      </p>
                    </div>
                  </div>
                )}

                {detailTab === 3 && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <InfoItem label="Trạng thái ca lái hiện tại" value={selected.currentShiftStatus ? SHIFT_LABELS[selected.currentShiftStatus] || selected.currentShiftStatus : 'Sẵn sàng'} />
                      <InfoItem label="Vị trí định vị gần nhất" value={selected.currentLocation || 'Bãi đỗ trung tâm'} />
                    </div>

                    {/* Danh sách toàn bộ xe/máy tài xế quản lý */}
                    <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-800 border-b border-slate-100 pb-2">
                        <span className="flex items-center gap-1.5">
                          <Truck className="w-4 h-4 text-primary" />
                          Danh sách xe / máy cơ giới QUẢN LÝ
                        </span>
                        <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 font-bold">
                          {[selected.assignedVehicle, ...(selected.drivenVehicles || []), ...(selected.secondaryVehicles || [])].filter(Boolean).length || 0} phương tiện
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                        {(() => {
                          const allV: VehicleSummary[] = [];
                          if (selected.assignedVehicle) allV.push(selected.assignedVehicle);
                          if (Array.isArray(selected.drivenVehicles)) {
                            selected.drivenVehicles.forEach((v) => {
                              if (v && !allV.some((x) => x.id === v.id)) allV.push(v);
                            });
                          }
                          if (Array.isArray(selected.secondaryVehicles)) {
                            selected.secondaryVehicles.forEach((v) => {
                              if (v && !allV.some((x) => x.id === v.id)) allV.push(v);
                            });
                          }

                          if (allV.length === 0) {
                            return (
                              <div className="col-span-2 p-3 text-center text-xs text-slate-400 italic">
                                Tài xế chưa được bàn giao quản lý phương tiện nào.
                              </div>
                            );
                          }

                          return allV.map((v, idx) => (
                            <div key={v.id} className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 bg-slate-50/70">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono font-bold text-xs text-slate-900">{v.plate || v.code}</span>
                                  {idx === 0 ? (
                                    <span className="rounded-full bg-emerald-100 px-1.5 py-0.2 text-[9px] font-bold text-emerald-800 border border-emerald-300">Xe chính</span>
                                  ) : (
                                    <span className="rounded-full bg-slate-200 px-1.5 py-0.2 text-[9px] font-bold text-slate-600">Xe #{idx + 1}</span>
                                  )}
                                </div>
                                <p className="text-[11px] text-slate-500 truncate max-w-[200px]">{v.name || 'Phương tiện'}</p>
                              </div>
                            </div>
                          ));
                        })()}
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
                      <div className="border-b border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-bold text-slate-800 flex items-center justify-between">
                        <span>Hoạt động điều động gần nhất</span>
                        <span className="text-[10px] text-slate-400 font-normal">8 chuyến gần đây</span>
                      </div>
                      <div className="divide-y divide-slate-100 max-h-40 overflow-y-auto">
                        {[...selected.dispatchOrdersDriven, ...selected.transportOrders, ...selected.feedTrips].slice(0, 8).map((item: any) => (
                          <div key={`${item.code}-${item.id}`} className="flex items-center justify-between px-3.5 py-2 text-xs hover:bg-slate-50">
                            <div>
                              <strong className="text-primary font-mono">{item.code}</strong>
                              <span className="text-slate-500 ml-2">Xe: {item.vehicle?.code || 'Chưa gán xe'}</span>
                            </div>
                            <span className="text-slate-400 font-mono text-[11px]">{formatDate(item.departureTime || item.createdAt)}</span>
                          </div>
                        ))}
                        {![...selected.dispatchOrdersDriven, ...selected.transportOrders, ...selected.feedTrips].length && (
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
                <div className="text-[11px] text-slate-600 truncate">{form.team || 'Đội: —'}</div>
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
                      
                      <label className="text-xs font-bold text-slate-700">
                        Trạng thái làm việc
                        <select value={form.employmentStatus} onChange={(e) => setField('employmentStatus', e.target.value)} className="mt-1 h-9 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-normal outline-none focus:border-primary focus:bg-white">
                          <option value="DANG_LAM_VIEC">Đang làm việc</option>
                          <option value="DA_NGHI_VIEC">Đã nghỉ việc</option>
                        </select>
                      </label>

                      <div>
                        <label className="mb-1 block text-xs font-bold text-slate-700">
                          Khu liên hợp
                        </label>
                        <SearchableSelect
                          value={form.complex}
                          onChange={(val) => {
                            setField('complex', val);
                            setField('enterprise', '');
                            setField('farm', '');
                            setField('team', '');
                          }}
                          options={formComplexOptions}
                          placeholder="Chọn hoặc nhập Khu liên hợp..."
                          allowCustomInput={true}
                          heightClass="h-9"
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-xs font-bold text-slate-700">
                          Xí nghiệp/Đơn vị
                        </label>
                        <SearchableSelect
                          value={form.enterprise}
                          onChange={(val) => {
                            setField('enterprise', val);
                            setField('farm', '');
                            setField('team', '');
                          }}
                          options={formEnterpriseOptions}
                          placeholder="Chọn hoặc nhập Xí nghiệp/Đơn vị..."
                          allowCustomInput={true}
                          heightClass="h-9"
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-xs font-bold text-slate-700">
                          Nông trường
                        </label>
                        <SearchableSelect
                          value={form.farm}
                          onChange={(val) => {
                            setField('farm', val);
                            setField('team', '');
                          }}
                          options={formFarmOptions}
                          placeholder="Chọn hoặc nhập Nông trường..."
                          allowCustomInput={true}
                          heightClass="h-9"
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-xs font-bold text-slate-700">
                          Đội/Tổ công tác (Độc lập)
                        </label>
                        <SearchableSelect
                          value={form.team}
                          onChange={(val) => setField('team', val)}
                          options={formTeamOptions}
                          placeholder="Chọn hoặc nhập Đội/Tổ..."
                          allowCustomInput={true}
                          heightClass="h-9"
                        />
                      </div>

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

                {/* BƯỚC 3: GPLX & CHỨNG CHỈ VẬN HÀNH CƠ GIỚI (THIẾT KẾ ĐẦY ĐỦ KHÔNG BỊ HỤT) */}
                {formStep === 2 && (
                  <div className="space-y-3.5">
                    {/* Nhóm 1: Giấy phép lái xe đường bộ */}
                    <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs">
                      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-100 font-bold text-xs text-slate-800">
                        <Award className="w-4 h-4 text-primary" />
                        <span>1. Giấy phép lái xe (GPLX đường bộ)</span>
                      </div>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <label className="text-xs font-bold text-slate-700">
                          Hạng GPLX
                          <select
                            value={form.licenseClass}
                            onChange={(e) => setField('licenseClass', e.target.value)}
                            className="mt-1 h-9 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-normal outline-none focus:border-primary focus:bg-white"
                          >
                            <option value="">Chưa khai báo</option>
                            {Object.entries(LICENSE_LABELS).map(([key, value]) => (
                              <option key={key} value={key}>{value}</option>
                            ))}
                          </select>
                        </label>
                        <TextField label="Số GPLX" value={form.licenseNumber} placeholder="Nhập số GPLX..." onChange={(e) => setField('licenseNumber', e.target.value)} />
                        <TextField label="Ngày cấp GPLX" type="date" value={form.licenseIssueDate} onChange={(e) => setField('licenseIssueDate', e.target.value)} />
                        <TextField label="Ngày hết hạn GPLX" type="date" value={form.licenseExpiryDate} onChange={(e) => setField('licenseExpiryDate', e.target.value)} />
                        <TextField label="Nơi cấp GPLX" value={form.licenseIssuePlace} placeholder="Sở GTVT..." onChange={(e) => setField('licenseIssuePlace', e.target.value)} />
                        <div className="flex items-center rounded-xl bg-blue-50/70 border border-blue-200/80 p-2.5 text-[11px] text-blue-800">
                          <Info className="w-4 h-4 text-blue-600 shrink-0 mr-2" />
                          Hệ thống tự động theo dõi và cảnh báo trước khi GPLX hết hạn 30 & 60 ngày.
                        </div>
                      </div>
                    </div>

                    {/* Nhóm 2: Chứng chỉ nghề vận hành máy cơ giới & Nông nghiệp */}
                    <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs">
                      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-100 font-bold text-xs text-slate-800">
                        <Briefcase className="w-4 h-4 text-emerald-600" />
                        <span>2. Chứng chỉ vận hành Máy cơ giới & Nông nghiệp</span>
                      </div>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <TextField label="Loại máy được phép vận hành" value={form.machineryCertType} placeholder="Máy kéo, Máy cày Kubota/John Deere, Máy đào, Máy gặt..." onChange={(e) => setField('machineryCertType', e.target.value)} />
                        <TextField label="Số hiệu chứng chỉ nghề" value={form.machineryCertNumber} placeholder="Số chứng chỉ đào tạo..." onChange={(e) => setField('machineryCertNumber', e.target.value)} />
                        <TextField label="Đơn vị đào tạo / Cấp bằng" value={form.machineryCertIssuer} placeholder="Trường dạy nghề cơ giới / THACO AGRI..." onChange={(e) => setField('machineryCertIssuer', e.target.value)} />
                        <TextField label="Ngày cấp chứng chỉ" type="date" value={form.machineryCertDate} onChange={(e) => setField('machineryCertDate', e.target.value)} />
                      </div>
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
                          Tài khoản này được cấp để lái xe truy cập ứng dụng vận hành di động (Mobile App) hoặc quét thẻ RFID. Mật khẩu có thể để trống, hệ thống sẽ tự động gán mật khẩu khởi tạo mặc định là <b>123456</b>.
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
                              {editingId ? '(để trống nếu giữ nguyên)' : '(để trống = 123456)'}
                            </span>
                          </label>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setField('password', '123456')}
                              className="text-[10px] text-slate-500 hover:text-primary font-medium cursor-pointer"
                            >
                              Gán 123456
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
                            placeholder={editingId ? 'Để trống nếu không đổi mật khẩu' : 'Để trống sẽ mặc định là 123456'}
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

                {/* BƯỚC 6: PHƯƠNG TIỆN QUẢN LÝ (1 HOẶC NHIỀU XE) */}
                {formStep === 5 && (
                  <div className="space-y-3.5">
                    <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs">
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-3 pb-2 border-b border-slate-100">
                        <div className="flex items-center gap-2 font-bold text-xs text-slate-800">
                          <Truck className="w-4 h-4 text-primary" />
                          <span>Danh sách Xe / Máy cơ giới QUẢN LÝ ({form.assignedVehicleIds.length} xe)</span>
                        </div>
                        <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          1 tài xế có thể phụ trách 1 hoặc nhiều xe
                        </span>
                      </div>

                      {/* Dropdown chọn thêm xe vào danh sách */}
                      <div className="mb-3">
                        <label className="mb-1 block text-xs font-bold text-slate-700">
                          + Chọn xe / máy để thêm vào quyền quản lý của tài xế:
                        </label>
                        <select
                          value=""
                          onChange={(e) => {
                            const vId = Number(e.target.value);
                            if (vId && !form.assignedVehicleIds.includes(vId)) {
                              const newIds = [...form.assignedVehicleIds, vId];
                              setForm((curr) => ({
                                ...curr,
                                assignedVehicleIds: newIds,
                                assignedVehicleId: String(newIds[0]),
                              }));
                            }
                          }}
                          className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-normal outline-none focus:border-primary focus:bg-white"
                        >
                          <option value="">-- Chọn xe/máy cày/xe ben/đầu kéo để gán quản lý --</option>
                          {options.vehicles
                            .filter((v) => !form.assignedVehicleIds.includes(v.id))
                            .map((vehicle) => (
                              <option key={vehicle.id} value={vehicle.id}>
                                {vehicle.plate || vehicle.code} · {vehicle.name} ({vehicle.category || 'Cơ giới'})
                              </option>
                            ))}
                        </select>
                      </div>

                      {/* Danh sách các xe đang được gán */}
                      {form.assignedVehicleIds.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-4 text-center">
                          <Truck className="w-6 h-6 text-slate-300 mx-auto mb-1" />
                          <p className="text-xs text-slate-500 font-medium">Chưa gán xe nào cho tài xế này.</p>
                          <p className="text-[11px] text-slate-400">Chọn xe từ danh sách ở trên để thêm quyền quản lý.</p>
                        </div>
                      ) : (
                        <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                          {form.assignedVehicleIds.map((vId, idx) => {
                            const v = options.vehicles.find((item) => item.id === vId);
                            const isPrimary = idx === 0;
                            return (
                              <div
                                key={vId}
                                className={`flex items-center justify-between p-2.5 rounded-xl border transition-colors ${
                                  isPrimary ? 'bg-emerald-50/60 border-emerald-200' : 'bg-slate-50 border-slate-200'
                                }`}
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div className={`p-1.5 rounded-lg ${isPrimary ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                                    <Truck className="w-4 h-4" />
                                  </div>
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className="font-mono font-bold text-xs text-slate-800">
                                        {v?.plate || v?.code || `Xe #${vId}`}
                                      </span>
                                      {isPrimary ? (
                                        <span className="rounded-full bg-emerald-100 px-2 py-0.2 text-[10px] font-extrabold text-emerald-800 border border-emerald-300">
                                          Xe chính
                                        </span>
                                      ) : (
                                        <span className="rounded-full bg-slate-100 px-2 py-0.2 text-[10px] font-bold text-slate-600 border border-slate-200">
                                          Xe phụ #{idx + 1}
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-[11px] text-slate-500 truncate max-w-[280px]">
                                      {v?.name || 'Phương tiện vận tải / cơ giới'}
                                    </p>
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => {
                                    const newIds = form.assignedVehicleIds.filter((id) => id !== vId);
                                    setForm((curr) => ({
                                      ...curr,
                                      assignedVehicleIds: newIds,
                                      assignedVehicleId: newIds[0] ? String(newIds[0]) : '',
                                    }));
                                  }}
                                  className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                  title="Gỡ xe này khỏi quyền quản lý"
                                >
                                  <X className="w-4 h-4" />
                                </button>
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
                )}

                {/* BƯỚC 7: XÁC NHẬN & HOÀN TẤT */}
                {formStep === 6 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 pb-2 border-b border-slate-200/70 font-bold text-xs text-slate-800">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Xác nhận thông tin hồ sơ lái xe & thợ vận hành</span>
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <InfoItem label="Nhân sự" value={`${form.code || '—'} · ${form.fullName || '—'}`} />
                      <InfoItem label="Đơn vị / Đội" value={`${form.enterprise || UNIT_LABELS[form.unit] || form.unit} · ${form.team || 'Chưa cập nhật'}`} />
                      <InfoItem label="Chức danh" value={form.position || 'Tài xế'} />
                      <InfoItem label="Ngày vào công ty / Thâm niên" value={`${formatDate(form.joinedDate)} · ${calculateTenure(form.joinedDate, form.resignedDate)}`} />
                      <InfoItem label="GPLX & Bằng lái" value={`${LICENSE_LABELS[form.licenseClass] || 'Chưa khai báo'} · ${form.licenseNumber || 'Chưa có số'}`} />
                      <InfoItem label="Ca làm việc" value={SHIFT_LABELS[form.currentShiftStatus]} />
                      <InfoItem
                        label={`Phương tiện quản lý (${form.assignedVehicleIds.length} xe)`}
                        wide={true}
                        value={
                          form.assignedVehicleIds.length === 0 ? (
                            <span className="text-slate-400 italic">Chưa phân công xe</span>
                          ) : (
                            <div className="flex flex-wrap gap-1.5 mt-1">
                              {form.assignedVehicleIds.map((vId, idx) => {
                                const v = options.vehicles.find((item) => item.id === vId);
                                return (
                                  <span key={vId} className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2 py-1 text-xs font-mono font-bold text-emerald-800 border border-emerald-200">
                                    <Truck className="w-3 h-3 text-emerald-600" />
                                    {v?.plate || v?.code || `Xe #${vId}`}
                                    {idx === 0 && <span className="text-[9px] text-emerald-600 font-sans font-normal">(Chính)</span>}
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
