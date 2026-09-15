import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  AlertTriangle,
  Award,
  Building2,
  Download,
  FileCheck,
  Layers,
  Pencil,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  Users,
  X,
  ExternalLink,
} from 'lucide-react';
import { apiService } from '../../api/client';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { SearchableSelect } from '../../components/common/SearchableSelect';
import { Column, DataTable } from '../../components/data-display/DataTable';
import { KPIGrid } from '../../components/data-display/KPIGrid';
import { driverManagementApi, DriverManagementUnit } from '../../api/driverManagementApi';
import { useAppStore } from '../../store/useAppStore';
import { useFilterStore } from '../../store/useFilterStore';
import { getDriverLicenseClasses, getDriverComplianceStatuses } from '../../data/driverCatalogData';

export type ComplianceStatus = 'MISSING' | 'EXPIRED' | 'EXPIRING_30' | 'EXPIRING_60' | 'VALID';
export type LicenseFilterStatus = 'ALL' | 'EXPIRED' | 'EXPIRING_LE_60' | 'EXPIRING_30' | 'EXPIRING_60' | 'VALID' | 'MISSING';

export interface LicenseRecord {
  id: number;
  code: string;
  fullName: string;
  unit: string;
  employmentStatus: string;
  isActive: boolean;
  licenseNumber?: string | null;
  licenseClass?: string | null;
  licenseExpiryDate?: string | null;
  healthCheckExpiryDate?: string | null;
  complianceStatus: ComplianceStatus;
  employee?: { complex?: string | null; enterprise?: string | null; team?: string | null; businessUnit?: string | null } | null;
  enterprise?: string | null;
  team?: string | null;
  managementUnit?: DriverManagementUnit | null;
  teamUnit?: DriverManagementUnit | null;
  managementAssignment?: { managementUnitId: number; teamUnitId?: number | null } | null;
  assignedVehicle?: { id: number; code: string; plate?: string | null; name: string; assignedUnitCode?: string | null } | null;
}

interface LicenseForm {
  driverId: string;
  licenseClass: string;
  licenseNumber: string;
  licenseExpiryDate: string;
  healthCheckExpiryDate: string;
}

const EMPTY_FORM: LicenseForm = {
  driverId: '', licenseClass: '', licenseNumber: '', licenseExpiryDate: '', healthCheckExpiryDate: '',
};

const LICENSE_LABELS: Record<string, string> = {
  HANG_A: 'Hạng A', HANG_B1: 'Hạng B1', HANG_B2: 'Hạng B2', HANG_C: 'Hạng C',
  HANG_CE: 'Hạng CE', HANG_D1: 'Hạng D1', HANG_D2: 'Hạng D2',
};
const STATUS_LABELS: Record<ComplianceStatus, string> = {
  MISSING: 'Thiếu hồ sơ', EXPIRED: 'Đã hết hạn', EXPIRING_30: 'Còn ≤ 30 ngày',
  EXPIRING_60: 'Còn 31–60 ngày', VALID: 'Còn hạn hợp lệ',
};

const KLH_OPTIONS = [
  { value: 'ALL', label: 'Tất cả Khu liên hợp' },
  { value: 'KOUN_MOM', label: 'Khu liên hợp Koun Mom' },
  { value: 'SNOUL', label: 'Khu liên hợp Snoul' },
  { value: 'NAM_LAO', label: 'Khu liên hợp Nam Lào' },
];

const VALID_STATUSES = new Set<string>([
  'ALL', 'EXPIRED', 'EXPIRING_LE_60', 'EXPIRING_30', 'EXPIRING_60', 'VALID', 'MISSING',
]);

export const calculateLicenseStats = (records: LicenseRecord[]) => ({
  total: records.length,
  expired: records.filter((item) => item.complianceStatus === 'EXPIRED').length,
  expiring: records.filter((item) => item.complianceStatus === 'EXPIRING_30' || item.complianceStatus === 'EXPIRING_60').length,
  valid: records.filter((item) => item.complianceStatus === 'VALID').length,
});

export const filterLicensesByStatus = (records: LicenseRecord[], status: string): LicenseRecord[] => {
  if (!status || status === 'ALL') return records;
  if (status === 'EXPIRED') return records.filter((item) => item.complianceStatus === 'EXPIRED');
  if (status === 'EXPIRING_LE_60') {
    return records.filter((item) => item.complianceStatus === 'EXPIRING_30' || item.complianceStatus === 'EXPIRING_60');
  }
  if (status === 'EXPIRING_30') return records.filter((item) => item.complianceStatus === 'EXPIRING_30');
  if (status === 'EXPIRING_60') return records.filter((item) => item.complianceStatus === 'EXPIRING_60');
  if (status === 'VALID') return records.filter((item) => item.complianceStatus === 'VALID');
  if (status === 'MISSING') return records.filter((item) => item.complianceStatus === 'MISSING');
  return records;
};

export const matchDriverToUnit = (driver: LicenseRecord, unitIdOrName?: string, teamIdOrName?: string): boolean => {
  if (unitIdOrName && unitIdOrName !== 'ALL') {
    const targetId = Number(unitIdOrName);
    const unitMatch = Number.isFinite(targetId)
      ? driver.managementAssignment?.managementUnitId === targetId || driver.managementUnit?.id === targetId
      : driver.managementUnit?.name === unitIdOrName || driver.managementUnit?.code === unitIdOrName;
    if (!unitMatch) return false;
  }
  if (teamIdOrName && teamIdOrName !== 'ALL') {
    const targetTeamId = Number(teamIdOrName);
    const teamMatch = Number.isFinite(targetTeamId)
      ? driver.managementAssignment?.teamUnitId === targetTeamId || driver.teamUnit?.id === targetTeamId
      : driver.teamUnit?.name === teamIdOrName || driver.teamUnit?.code === teamIdOrName;
    if (!teamMatch) return false;
  }
  return true;
};

const inputDate = (value?: string | null) => value ? value.slice(0, 10) : '';
const formatDate = (value?: string | null) => {
  if (!value) return 'Chưa cập nhật';
  const [year, month, day] = value.slice(0, 10).split('-');
  return `${day}/${month}/${year}`;
};
const daysFromToday = (value?: string | null) => {
  if (!value) return null;
  const [year, month, day] = value.slice(0, 10).split('-').map(Number);
  const now = new Date();
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((Date.UTC(year, month - 1, day) - today) / 86_400_000);
};
const expiryNotice = (value?: string | null) => {
  const days = daysFromToday(value);
  if (days === null) return 'Chưa cập nhật';
  if (days < 0) return `Quá hạn ${Math.abs(days)} ngày`;
  if (days === 0) return 'Hết hạn hôm nay';
  return `Còn ${days} ngày`;
};

const statusBadge = (status: ComplianceStatus) => {
  if (status === 'VALID') return <Badge variant="green">{STATUS_LABELS[status]}</Badge>;
  if (status === 'EXPIRING_30' || status === 'EXPIRING_60') return <Badge variant="amber">{STATUS_LABELS[status]}</Badge>;
  if (status === 'EXPIRED') return <Badge variant="red">{STATUS_LABELS[status]}</Badge>;
  return <Badge variant="gray">{STATUS_LABELS[status]}</Badge>;
};

export const LicenseExpiryPage: React.FC = () => {
  const { selectedKLH, setSelectedKLH, currentUser, setHeaderAlert } = useAppStore();
  const { searchTerm, setSearchTerm, selectedStatus, setSelectedStatus } = useFilterStore();
  const [selectedEnterprise, setSelectedEnterprise] = useState('ALL');
  const [selectedTeam, setSelectedTeam] = useState('ALL');
  const [selectedClass, setSelectedClass] = useState('ALL');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [searchParams] = useSearchParams();
  const [licenses, setLicenses] = useState<LicenseRecord[]>([]);
  const [selectedLicense, setSelectedLicense] = useState<LicenseRecord | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [form, setForm] = useState<LicenseForm>(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Danh sách đơn vị chủ quản hồ sơ tài xế đã được duyệt (Cấp 2 & Cấp 3).
  const [masterUnits, setMasterUnits] = useState<DriverManagementUnit[]>([]);
  useEffect(() => {
    driverManagementApi.getUnits({ status: 'ACTIVE' }).then(setMasterUnits).catch(() => setMasterUnits([]));
  }, []);

  const canEdit = currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'FARM_MANAGER';

  useEffect(() => {
    if (!VALID_STATUSES.has(selectedStatus)) {
      setSelectedStatus('ALL');
    }
  }, [selectedStatus, setSelectedStatus]);

  const loadLicenses = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await apiService.getDriverProfiles({
        limit: 10000,
        ...(selectedKLH !== 'ALL' ? { complexCode: selectedKLH } : {}),
      });
      setLicenses(Array.isArray(result?.items) ? result.items : []);
    } catch {
      setLicenses([]);
      setError('Không tải được hồ sơ GPLX từ máy chủ. Trang này không sử dụng dữ liệu giả thay thế.');
    } finally {
      setLoading(false);
    }
  }, [selectedKLH]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadLicenses(), 250);
    return () => window.clearTimeout(timer);
  }, [loadLicenses]);

  useEffect(() => {
    const refresh = () => void loadLicenses();
    window.addEventListener('thaco_refresh_current_page', refresh);
    return () => window.removeEventListener('thaco_refresh_current_page', refresh);
  }, [loadLicenses]);

  useEffect(() => {
    const driverId = Number(searchParams.get('driverId'));
    if (!driverId || selectedLicense?.id === driverId) return;
    const target = licenses.find((item) => item.id === driverId);
    if (target) setSelectedLicense(target);
  }, [licenses, searchParams, selectedLicense?.id]);

  // Derived stats from full dataset (never collapses to 0 when filtering)
  const stats = useMemo(() => calculateLicenseStats(licenses), [licenses]);

  const ownerUnits = useMemo(() => masterUnits.filter((u) => u.level === 'OWNER'), [masterUnits]);
  const teamUnits = useMemo(() => {
    if (selectedEnterprise === 'ALL') return [];
    return masterUnits.filter((u) => u.level === 'TEAM' && String(u.parentId) === selectedEnterprise);
  }, [masterUnits, selectedEnterprise]);

  // Chỉ dùng danh mục đơn vị chủ quản hồ sơ đã được xác minh trên máy chủ.
  const unitSelectOptions = useMemo(() => {
    return ownerUnits.map((u) => {
      const count = licenses.filter((item) => matchDriverToUnit(item, String(u.id))).length;
      return {
        value: String(u.id),
        label: `${u.complexCode} · ${u.name} (${count})`,
      };
    });
  }, [ownerUnits, licenses]);

  const teamSelectOptions = useMemo(() => {
    return teamUnits.map((u) => {
      const count = licenses.filter((item) => matchDriverToUnit(item, selectedEnterprise, String(u.id))).length;
      return {
        value: String(u.id),
        label: `${u.name} (${count})`,
      };
    });
  }, [teamUnits, licenses, selectedEnterprise]);

  // License class options (Nạp động từ Danh mục hồ sơ tài xế)
  const dynamicLicenseClasses = useMemo(() => {
    return getDriverLicenseClasses().filter((item) => item.status === 'ACTIVE');
  }, []);

  const licenseClassOptions = useMemo(() => {
    return [
      { value: 'ALL', label: `Tất cả hạng GPLX (${dynamicLicenseClasses.length})` },
      ...dynamicLicenseClasses.map((item) => ({ value: item.code, label: item.name })),
    ];
  }, [dynamicLicenseClasses]);

  // Status options for dropdown
  const statusOptions = useMemo(() => [
    { value: 'ALL', label: 'Tất cả tình trạng' },
    { value: 'EXPIRED', label: 'Đã hết hạn' },
    { value: 'EXPIRING_LE_60', label: 'Sắp hết hạn ≤ 60 ngày' },
    { value: 'EXPIRING_30', label: 'Còn ≤ 30 ngày' },
    { value: 'EXPIRING_60', label: 'Còn 31–60 ngày' },
    { value: 'VALID', label: 'Còn hạn hợp lệ' },
    { value: 'MISSING', label: 'Thiếu hồ sơ' },
  ], []);

  // Derived filtered licenses
  const filteredLicenses = useMemo(() => {
    let list = filterLicensesByStatus(licenses, selectedStatus);

    if (selectedEnterprise !== 'ALL') {
      list = list.filter((item) => matchDriverToUnit(item, selectedEnterprise, selectedTeam));
    }

    if (selectedClass !== 'ALL') {
      list = list.filter((item) => item.licenseClass === selectedClass);
    }

    if (searchTerm.trim()) {
      const q = searchTerm.trim().toLowerCase();
      list = list.filter(
        (item) =>
          item.code.toLowerCase().includes(q) ||
          item.fullName.toLowerCase().includes(q) ||
          (item.licenseNumber && item.licenseNumber.toLowerCase().includes(q)) ||
          (item.licenseClass && item.licenseClass.toLowerCase().includes(q)) ||
          (item.assignedVehicle?.plate && item.assignedVehicle.plate.toLowerCase().includes(q)) ||
          (item.assignedVehicle?.code && item.assignedVehicle.code.toLowerCase().includes(q))
      );
    }

    return list;
  }, [licenses, selectedStatus, selectedEnterprise, selectedTeam, selectedClass, searchTerm]);

  // Active state for KPI cards
  const isTotalActive = selectedStatus === 'ALL';
  const isExpiredActive = selectedStatus === 'EXPIRED';
  const isExpiringActive =
    selectedStatus === 'EXPIRING_LE_60' || selectedStatus === 'EXPIRING_30' || selectedStatus === 'EXPIRING_60';
  const isValidActive = selectedStatus === 'VALID';

  // Active filters count
  const activeAdvancedFilterCount = useMemo(() => {
    let count = 0;
    if (selectedKLH !== 'ALL') count++;
    if (selectedStatus !== 'ALL') count++;
    if (selectedEnterprise !== 'ALL') count++;
    if (selectedTeam !== 'ALL') count++;
    if (selectedClass !== 'ALL') count++;
    return count;
  }, [selectedKLH, selectedStatus, selectedEnterprise, selectedTeam, selectedClass]);

  const isAnyFilterActive =
    searchTerm.trim() !== '' ||
    selectedKLH !== 'ALL' ||
    selectedStatus !== 'ALL' ||
    selectedEnterprise !== 'ALL' ||
    selectedTeam !== 'ALL' ||
    selectedClass !== 'ALL';

  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedKLH('ALL');
    setSelectedStatus('ALL');
    setSelectedEnterprise('ALL');
    setSelectedTeam('ALL');
    setSelectedClass('ALL');
  };

  const handleExportExcel = () => {
    if (!filteredLicenses.length) return;
    const headers = [
      'Mã NV',
      'Họ và tên',
      'Số GPLX',
      'Hạng GPLX',
      'Hạn GPLX',
      'Hạn khám sức khỏe',
      'Xe đang giao',
      'Đơn vị chủ quản hồ sơ',
      'Đội/Tổ trực thuộc',
      'Tình trạng',
    ];
    const rows = filteredLicenses.map((d) => [
      d.code,
      `"${d.fullName}"`,
      `"${d.licenseNumber || 'Chưa cập nhật'}"`,
      `"${d.licenseClass ? LICENSE_LABELS[d.licenseClass] || d.licenseClass : ''}"`,
      `"${formatDate(d.licenseExpiryDate)}"`,
      `"${formatDate(d.healthCheckExpiryDate)}"`,
      `"${d.assignedVehicle?.plate || d.assignedVehicle?.code || 'Chưa giao xe'}"`,
      `"${d.managementUnit?.name || 'Chưa phân loại'}"`,
      `"${d.teamUnit?.name || '—'}"`,
      `"${STATUS_LABELS[d.complianceStatus] || d.complianceStatus}"`,
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `Danh_sach_GPLX_va_suc_khoe_THACO_AGRI_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const setEditorDriver = (record?: LicenseRecord | null) => {
    setForm(record ? {
      driverId: String(record.id),
      licenseClass: record.licenseClass || '',
      licenseNumber: record.licenseNumber || '',
      licenseExpiryDate: inputDate(record.licenseExpiryDate),
      healthCheckExpiryDate: inputDate(record.healthCheckExpiryDate),
    } : EMPTY_FORM);
  };

  const openEditor = (record?: LicenseRecord | null) => {
    const target = record || filteredLicenses[0] || licenses[0] || null;
    setEditorDriver(target);
    setShowEditor(true);
  };

  const save = async () => {
    const driverId = Number(form.driverId);
    if (!driverId || !form.licenseClass || !form.licenseNumber.trim() || !form.licenseExpiryDate || !form.healthCheckExpiryDate) {
      setHeaderAlert({ type: 'warning', message: 'Vui lòng nhập đầy đủ hạng, số GPLX và hai ngày hết hạn.' });
      return;
    }
    setSaving(true);
    try {
      await apiService.updateDriverProfile(driverId, {
        licenseClass: form.licenseClass,
        licenseNumber: form.licenseNumber.trim(),
        licenseExpiryDate: form.licenseExpiryDate,
        healthCheckExpiryDate: form.healthCheckExpiryDate,
      });
      setShowEditor(false);
      setSelectedLicense(null);
      setHeaderAlert({ type: 'success', message: 'Đã cập nhật GPLX và hạn khám sức khỏe.' });
      await loadLicenses();
      window.dispatchEvent(new Event('thaco_alerts_refresh'));
    } catch {
      // Global Axios interceptor displays the server error and permission message.
    } finally {
      setSaving(false);
    }
  };

  const columns: Column<LicenseRecord>[] = [
    {
      key: 'code', title: 'MÃ NV / HỌ TÊN', sortable: true, render: (row) => (
        <div><strong className="block font-mono text-primary">{row.code}</strong><span className="font-bold text-slate-900">{row.fullName}</span></div>
      ),
    },
    { key: 'licenseNumber', title: 'SỐ GPLX', render: (row) => <strong className="font-mono">{row.licenseNumber || 'Chưa cập nhật'}</strong> },
    { key: 'licenseClass', title: 'HẠNG', render: (row) => row.licenseClass ? <Badge variant="blue">{LICENSE_LABELS[row.licenseClass] || row.licenseClass}</Badge> : '—' },
    {
      key: 'licenseExpiryDate', title: 'HẠN GPLX', sortable: true, render: (row) => (
        <div><b>{formatDate(row.licenseExpiryDate)}</b><span className="block text-[10px] text-slate-500">{expiryNotice(row.licenseExpiryDate)}</span></div>
      ),
    },
    {
      key: 'healthCheckExpiryDate', title: 'HẠN KHÁM SỨC KHỎE', sortable: true, render: (row) => (
        <div><b>{formatDate(row.healthCheckExpiryDate)}</b><span className="block text-[10px] text-slate-500">{expiryNotice(row.healthCheckExpiryDate)}</span></div>
      ),
    },
    {
      key: 'assignedVehicle', title: 'XE / ĐƠN VỊ', render: (row) => (
        <div>
          <b>{row.assignedVehicle?.plate || row.assignedVehicle?.code || 'Chưa giao xe'}</b>
          <span className="block text-[10px] text-slate-500">
            {row.managementUnit?.name ? (
              `${row.managementUnit.name}${row.teamUnit?.name ? ` · ${row.teamUnit.name}` : ''}`
            ) : (
              'Chưa phân loại'
            )}
          </span>
        </div>
      ),
    },
    { key: 'complianceStatus', title: 'TÌNH TRẠNG', render: (row) => statusBadge(row.complianceStatus) },
  ];

  return (
    <div className="space-y-4">
      {/* 1. TIÊU ĐỀ TRANG */}
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-heading text-xl font-extrabold text-slate-900 sm:text-2xl">Quản lý GPLX & Sức khỏe tài xế</h1>
          <p className="mt-0.5 text-xs text-slate-500">Dữ liệu trực tiếp từ hồ sơ tài xế; cảnh báo tự động trước hạn 60 ngày.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700">
            Ngưỡng cảnh báo: 60 ngày
          </div>
        </div>
      </div>

      {/* 2. KPIGrid 4 THẺ THỐNG KÊ LỌC NHANH */}
      <KPIGrid cols={4}>
        {/* Card 1: Tổng hồ sơ */}
        <button
          type="button"
          onClick={() => setSelectedStatus('ALL')}
          aria-pressed={isTotalActive}
          aria-label={`Lọc tất cả hồ sơ. Tổng cộng ${stats.total} tài xế.${isTotalActive ? ' Đang được chọn.' : ' Nhấn để hiển thị tất cả.'}`}
          title="Nhấn để xem toàn bộ hồ sơ"
          className={`group relative overflow-hidden rounded-2xl border p-4 text-left transition-all hover:shadow-md cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
            isTotalActive
              ? 'border-emerald-600 bg-emerald-50/60 ring-2 ring-emerald-500/30 shadow-sm'
              : 'border-slate-200 bg-white hover:border-emerald-300 hover:bg-slate-50/70'
          }`}
        >
          <span className={`absolute inset-x-0 bottom-0 h-1.5 transition-colors ${isTotalActive ? 'bg-primary' : 'bg-transparent group-hover:bg-primary/40'}`} />
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold ${isTotalActive ? 'text-emerald-800' : 'text-slate-600'}`}>
              Tổng hồ sơ
            </span>
            <div className={`rounded-xl p-2 transition-colors ${isTotalActive ? 'bg-emerald-100 text-primary' : 'bg-slate-100 text-slate-500 group-hover:bg-emerald-50 group-hover:text-primary'}`}>
              <FileCheck className="h-5 w-5" />
            </div>
          </div>
          <div className={`mt-2 text-2xl font-black ${isTotalActive ? 'text-primary' : 'text-slate-900'}`}>
            {stats.total.toLocaleString('vi-VN')}
          </div>
          <div className="mt-1 flex items-center justify-between text-[11px] font-semibold text-slate-500">
            <span>Theo bộ lọc hiện tại</span>
            {isTotalActive && <span className="font-bold text-primary">Đang xem</span>}
          </div>
        </button>

        {/* Card 2: Đã hết hạn */}
        <button
          type="button"
          onClick={() => setSelectedStatus(isExpiredActive ? 'ALL' : 'EXPIRED')}
          aria-pressed={isExpiredActive}
          aria-label={`Lọc hồ sơ đã hết hạn. Hiện có ${stats.expired} hồ sơ.${isExpiredActive ? ' Đang được chọn. Nhấn lại để bỏ lọc.' : ' Nhấn để lọc.'}`}
          title="Nhấn để lọc hồ sơ đã hết hạn; nhấn lại để bỏ lọc"
          className={`group relative overflow-hidden rounded-2xl border p-4 text-left transition-all hover:shadow-md cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 ${
            isExpiredActive
              ? 'border-rose-500 bg-rose-50/70 ring-2 ring-rose-500/30 shadow-sm'
              : 'border-slate-200 bg-white hover:border-rose-300 hover:bg-rose-50/30'
          }`}
        >
          <span className={`absolute inset-x-0 bottom-0 h-1.5 transition-colors ${isExpiredActive ? 'bg-rose-600' : 'bg-transparent group-hover:bg-rose-400'}`} />
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold ${isExpiredActive ? 'text-rose-800' : 'text-rose-700'}`}>
              Đã hết hạn
            </span>
            <div className={`rounded-xl p-2 transition-colors ${isExpiredActive ? 'bg-rose-100 text-rose-700' : 'bg-rose-50 text-rose-600 group-hover:bg-rose-100'}`}>
              <ShieldAlert className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-rose-700">
            {stats.expired.toLocaleString('vi-VN')}
          </div>
          <div className="mt-1 flex items-center justify-between text-[11px] font-semibold text-rose-600">
            <span>Cần xử lý ngay</span>
            {isExpiredActive && <span className="font-bold text-rose-800">Đang lọc</span>}
          </div>
        </button>

        {/* Card 3: Sắp hết hạn ≤ 60 ngày */}
        <button
          type="button"
          onClick={() => setSelectedStatus(isExpiringActive ? 'ALL' : 'EXPIRING_LE_60')}
          aria-pressed={isExpiringActive}
          aria-label={`Lọc hồ sơ sắp hết hạn trong vòng 60 ngày. Hiện có ${stats.expiring} hồ sơ.${isExpiringActive ? ' Đang được chọn. Nhấn lại để bỏ lọc.' : ' Nhấn để lọc.'}`}
          title="Nhấn để lọc hồ sơ sắp hết hạn ≤ 60 ngày; nhấn lại để bỏ lọc"
          className={`group relative overflow-hidden rounded-2xl border p-4 text-left transition-all hover:shadow-md cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
            isExpiringActive
              ? 'border-amber-500 bg-amber-50/70 ring-2 ring-amber-500/30 shadow-sm'
              : 'border-slate-200 bg-white hover:border-amber-300 hover:bg-amber-50/30'
          }`}
        >
          <span className={`absolute inset-x-0 bottom-0 h-1.5 transition-colors ${isExpiringActive ? 'bg-amber-500' : 'bg-transparent group-hover:bg-amber-400'}`} />
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold ${isExpiringActive ? 'text-amber-800' : 'text-amber-700'}`}>
              Sắp hết hạn ≤ 60 ngày
            </span>
            <div className={`rounded-xl p-2 transition-colors ${isExpiringActive ? 'bg-amber-100 text-amber-700' : 'bg-amber-50 text-amber-600 group-hover:bg-amber-100'}`}>
              <AlertTriangle className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-amber-700">
            {stats.expiring.toLocaleString('vi-VN')}
          </div>
          <div className="mt-1 flex items-center justify-between text-[11px] font-semibold text-amber-700">
            <span>Chuẩn bị gia hạn</span>
            {isExpiringActive && <span className="font-bold text-amber-800">Đang lọc</span>}
          </div>
        </button>

        {/* Card 4: Còn hạn hợp lệ */}
        <button
          type="button"
          onClick={() => setSelectedStatus(isValidActive ? 'ALL' : 'VALID')}
          aria-pressed={isValidActive}
          aria-label={`Lọc hồ sơ còn hạn hợp lệ. Hiện có ${stats.valid} hồ sơ.${isValidActive ? ' Đang được chọn. Nhấn lại để bỏ lọc.' : ' Nhấn để lọc.'}`}
          title="Nhấn để lọc hồ sơ còn hạn hợp lệ; nhấn lại để bỏ lọc"
          className={`group relative overflow-hidden rounded-2xl border p-4 text-left transition-all hover:shadow-md cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
            isValidActive
              ? 'border-emerald-600 bg-emerald-50/70 ring-2 ring-emerald-500/30 shadow-sm'
              : 'border-slate-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/30'
          }`}
        >
          <span className={`absolute inset-x-0 bottom-0 h-1.5 transition-colors ${isValidActive ? 'bg-emerald-600' : 'bg-transparent group-hover:bg-emerald-400'}`} />
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold ${isValidActive ? 'text-emerald-800' : 'text-emerald-700'}`}>
              Còn hạn hợp lệ
            </span>
            <div className={`rounded-xl p-2 transition-colors ${isValidActive ? 'bg-emerald-100 text-emerald-700' : 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100'}`}>
              <ShieldCheck className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-emerald-800">
            {stats.valid.toLocaleString('vi-VN')}
          </div>
          <div className="mt-1 flex items-center justify-between text-[11px] font-semibold text-emerald-700">
            <span>Đủ hồ sơ thời hạn</span>
            {isValidActive && <span className="font-bold text-emerald-800">Đang lọc</span>}
          </div>
        </button>
      </KPIGrid>

      {/* 3. BỘ LỌC TÌM KIẾM & BỘ LỌC NÂNG CAO (ĐẶT DƯỚI THẺ KPI THEO THIẾT KẾ MỚI) */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
        {/* HÀNG 1: TIÊU ĐỀ & CÁC NÚT THAO TÁC HEADER */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <span className="font-heading text-sm font-extrabold text-slate-800 uppercase tracking-wide">
              Danh sách Hồ sơ GPLX & Sức khỏe tài xế
            </span>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                isAnyFilterActive
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-emerald-100 text-emerald-800'
              }`}
            >
              {isAnyFilterActive
                ? `Đang lọc: ${filteredLicenses.length}/${licenses.length} hồ sơ`
                : `${licenses.length} hồ sơ`}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {canEdit && (
              <button
                type="button"
                onClick={() => openEditor()}
                disabled={!licenses.length}
                className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-primary bg-primary px-3.5 text-xs font-black text-white shadow-xs transition-all hover:bg-primary-600 hover:scale-[1.01] cursor-pointer disabled:opacity-50"
              >
                <Pencil className="h-3.5 w-3.5" />
                Cập nhật GPLX & sức khỏe
              </button>
            )}

            <button
              type="button"
              onClick={() => void loadLicenses()}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-bold text-slate-700 transition-all hover:bg-slate-100 cursor-pointer"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-primary' : ''}`} />
              Làm mới
            </button>

            <button
              type="button"
              onClick={handleExportExcel}
              disabled={!filteredLicenses.length}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-bold text-slate-700 transition-all hover:bg-slate-100 cursor-pointer disabled:opacity-50"
            >
              <Download className="h-3.5 w-3.5 text-emerald-700" />
              Xuất Excel ({filteredLicenses.length})
            </button>

            <Link
              to="/danh-muc/danh-muc-ho-so"
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 text-xs font-bold text-emerald-800 transition-all hover:bg-emerald-100 cursor-pointer"
            >
              <Award className="h-3.5 w-3.5 text-emerald-700" />
              Danh mục hồ sơ tài xế ↗
            </Link>
          </div>
        </div>

        {/* HÀNG 2: Ô TÌM KIẾM TO RÕ & NÚT BẬT TẮT BỘ LỌC NÂNG CAO */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center justify-between">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Nhập họ tên lái xe, mã nhân viên, CCCD, số hoặc hạng GPLX, biển số xe..."
                className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-9 text-xs font-medium text-slate-900 outline-none transition focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/15"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
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
                showAdvancedFilters || activeAdvancedFilterCount > 0
                  ? 'border-primary bg-primary-50 text-primary'
                  : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Bộ lọc nâng cao
              {activeAdvancedFilterCount > 0 && (
                <span className="rounded-full bg-primary px-1.5 py-0.2 text-[10px] text-white">
                  {activeAdvancedFilterCount}
                </span>
              )}
            </button>

            {isAnyFilterActive && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="inline-flex h-10 items-center gap-1 rounded-xl border border-rose-200 bg-rose-50 px-3 text-xs font-bold text-rose-700 hover:bg-rose-100 cursor-pointer"
                title="Xóa toàn bộ bộ lọc"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Đặt lại
              </button>
            )}
          </div>
        </div>

        {/* HÀNG 3: CÁC Ô SELECT TEXT (SEARCHABLE SELECT 5 CỘT THEO ĐẶC THÙ TRANG) */}
        {showAdvancedFilters && (
          <div className="grid grid-cols-1 gap-3 border-t border-slate-100 pt-3 sm:grid-cols-2 lg:grid-cols-5">
            {/* 1. KHU LIÊN HỢP */}
            <div>
              <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                Khu liên hợp
              </label>
              <SearchableSelect
                value={selectedKLH}
                onChange={(val) => setSelectedKLH(val)}
                options={KLH_OPTIONS}
                placeholder="Tất cả Khu liên hợp"
                emptyOptionLabel="Tất cả Khu liên hợp"
                heightClass="h-9"
                icon={<Layers className="h-4 w-4 text-slate-400" />}
              />
            </div>

            {/* 2. ĐƠN VỊ CHỦ QUẢN */}
            <div>
              <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                Đơn vị chủ quản hồ sơ ({unitSelectOptions.length} đơn vị)
              </label>
              <SearchableSelect
                value={selectedEnterprise}
                onChange={(val) => {
                  setSelectedEnterprise(val);
                  setSelectedTeam('ALL');
                }}
                options={unitSelectOptions}
                placeholder={`Tất cả đơn vị (${unitSelectOptions.length})`}
                emptyOptionLabel={`Tất cả đơn vị (${unitSelectOptions.length})`}
                heightClass="h-9"
                icon={<Building2 className="h-4 w-4 text-slate-400" />}
              />
            </div>

            {/* 3. ĐỘI / TỔ TRỰC THUỘC */}
            <div>
              <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                Đội / Tổ trực thuộc ({teamSelectOptions.length} đội/tổ)
              </label>
              <SearchableSelect
                value={selectedTeam}
                onChange={(val) => setSelectedTeam(val)}
                options={teamSelectOptions}
                placeholder={selectedEnterprise === 'ALL' ? 'Chọn đơn vị trước' : `Tất cả Đội/Tổ (${teamSelectOptions.length})`}
                emptyOptionLabel={selectedEnterprise === 'ALL' ? 'Chọn đơn vị trước' : `Tất cả Đội/Tổ (${teamSelectOptions.length})`}
                heightClass="h-9"
                disabled={selectedEnterprise === 'ALL' || teamSelectOptions.length === 0}
                icon={<Users className="h-4 w-4 text-slate-400" />}
              />
            </div>

            {/* 4. HẠNG GPLX / BẰNG MÁY */}
            <div>
              <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                Hạng GPLX / Bằng máy ({licenseClassOptions.length - 1} hạng)
              </label>
              <SearchableSelect
                value={selectedClass}
                onChange={(val) => setSelectedClass(val)}
                options={licenseClassOptions}
                placeholder={`Tất cả GPLX (${licenseClassOptions.length - 1})`}
                emptyOptionLabel={`Tất cả GPLX (${licenseClassOptions.length - 1})`}
                heightClass="h-9"
                icon={<Award className="h-4 w-4 text-slate-400" />}
              />
            </div>

            {/* 5. TÌNH TRẠNG GPLX & SỨC KHỎE (ĐỒNG BỘ VỚI 4 THẺ KPI) */}
            <div>
              <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                Tình trạng GPLX & Sức khỏe
              </label>
              <SearchableSelect
                value={selectedStatus}
                onChange={(val) => setSelectedStatus(val)}
                options={statusOptions}
                placeholder="Tất cả tình trạng"
                emptyOptionLabel="Tất cả tình trạng"
                heightClass="h-9"
                icon={<ShieldAlert className="h-4 w-4 text-slate-400" />}
              />
            </div>
          </div>
        )}
      </section>

      {error && <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700">{error}</div>}

      {/* 4. BẢNG DỮ LIỆU */}
      <DataTable
        key={`${selectedStatus}-${selectedEnterprise}-${selectedClass}`}
        title="Danh sách GPLX và hạn khám sức khỏe"
        subtitle={
          isAnyFilterActive
            ? `Đang lọc: ${filteredLicenses.length}/${licenses.length} hồ sơ · Chọn một hồ sơ để xem chi tiết hoặc cập nhật nếu bạn có quyền.`
            : `${licenses.length} hồ sơ · Chọn một hồ sơ để xem chi tiết hoặc cập nhật nếu bạn có quyền.`
        }
        columns={columns}
        data={filteredLicenses}
        isLoading={loading}
        showSearch={false}
        searchKeys={['code', 'fullName', 'licenseNumber', 'licenseClass']}
        useGlobalFilters={false}
        onRowClick={(row) => setSelectedLicense(row)}
      />

      {/* MODAL CHI TIẾT */}
      <Modal
        isOpen={Boolean(selectedLicense)}
        onClose={() => setSelectedLicense(null)}
        title={selectedLicense ? `${selectedLicense.fullName} (${selectedLicense.code})` : 'Chi tiết hồ sơ'}
        subtitle="GPLX hiện hành và thời hạn khám sức khỏe"
        size="md"
      >
        {selectedLicense && (
          <div className="space-y-4 text-sm">
            <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex justify-between gap-4"><span>Số GPLX</span><b>{selectedLicense.licenseNumber || 'Chưa cập nhật'}</b></div>
              <div className="flex justify-between gap-4"><span>Hạng GPLX</span><b>{selectedLicense.licenseClass ? LICENSE_LABELS[selectedLicense.licenseClass] || selectedLicense.licenseClass : 'Chưa cập nhật'}</b></div>
              <div className="flex justify-between gap-4"><span>Ngày hết hạn GPLX</span><b>{formatDate(selectedLicense.licenseExpiryDate)}</b></div>
              <div className="flex justify-between gap-4"><span>Hạn khám sức khỏe</span><b>{formatDate(selectedLicense.healthCheckExpiryDate)}</b></div>
              <div className="flex justify-between gap-4"><span>Tình trạng</span>{statusBadge(selectedLicense.complianceStatus)}</div>
              <div className="flex justify-between gap-4"><span>Xe đang giao</span><b>{selectedLicense.assignedVehicle?.plate || selectedLicense.assignedVehicle?.code || 'Chưa giao xe'}</b></div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setSelectedLicense(null)}>Đóng</Button>
              {canEdit && <Button size="sm" icon={<Pencil className="h-3.5 w-3.5" />} onClick={() => { openEditor(selectedLicense); setSelectedLicense(null); }}>Cập nhật</Button>}
            </div>
          </div>
        )}
      </Modal>

      {/* MODAL CẬP NHẬT */}
      <Modal
        isOpen={showEditor}
        onClose={() => !saving && setShowEditor(false)}
        title="Cập nhật GPLX & sức khỏe"
        subtitle="Mỗi tài xế sử dụng một hồ sơ GPLX hiện hành."
        size="md"
      >
        <div className="space-y-4 text-xs">
          <label className="block font-bold text-slate-700">
            Tài xế
            <select
              value={form.driverId}
              onChange={(event) => setEditorDriver(licenses.find((item) => item.id === Number(event.target.value)))}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5"
            >
              <option value="">Chọn tài xế</option>
              {selectedStatus !== 'ALL' && filteredLicenses.length > 0 ? (
                <>
                  <optgroup label="Đang lọc (ưu tiên)">
                    {filteredLicenses.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.code} - {item.fullName} ({STATUS_LABELS[item.complianceStatus] || item.complianceStatus})
                      </option>
                    ))}
                  </optgroup>
                  {licenses.filter((item) => !filteredLicenses.some((f) => f.id === item.id)).length > 0 && (
                    <optgroup label="Các hồ sơ khác">
                      {licenses
                        .filter((item) => !filteredLicenses.some((f) => f.id === item.id))
                        .map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.code} - {item.fullName} ({STATUS_LABELS[item.complianceStatus] || item.complianceStatus})
                          </option>
                        ))}
                    </optgroup>
                  )}
                </>
              ) : (
                licenses.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.code} - {item.fullName} ({STATUS_LABELS[item.complianceStatus] || item.complianceStatus})
                  </option>
                ))
              )}
            </select>
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="font-bold text-slate-700">Hạng GPLX
              <select value={form.licenseClass} onChange={(event) => setForm((current) => ({ ...current, licenseClass: event.target.value }))} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5">
                <option value="">Chọn hạng GPLX</option>
                {Object.entries(LICENSE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            <label className="font-bold text-slate-700">Số GPLX
              <input value={form.licenseNumber} onChange={(event) => setForm((current) => ({ ...current, licenseNumber: event.target.value }))} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 font-mono" placeholder="Nhập số GPLX" />
            </label>
            <label className="font-bold text-slate-700">Ngày hết hạn GPLX
              <input type="date" value={form.licenseExpiryDate} onChange={(event) => setForm((current) => ({ ...current, licenseExpiryDate: event.target.value }))} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5" />
            </label>
            <label className="font-bold text-slate-700">Hạn khám sức khỏe
              <input type="date" value={form.healthCheckExpiryDate} onChange={(event) => setForm((current) => ({ ...current, healthCheckExpiryDate: event.target.value }))} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5" />
            </label>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" disabled={saving} onClick={() => setShowEditor(false)}>Hủy</Button>
            <Button size="sm" disabled={saving} onClick={() => void save()}>{saving ? 'Đang lưu...' : 'Lưu hồ sơ'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
