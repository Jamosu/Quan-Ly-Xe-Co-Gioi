import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { DataTable, Column } from '../../components/data-display/DataTable';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { SearchableSelect, SelectOption } from '../../components/common/SearchableSelect';
import { apiClient, apiService } from '../../api/client';
import { catalogsApi } from '../../api/catalogsApi';
import { AuditUserPopover } from '../../components/common/AuditUserPopover';
import { TableRowActions } from '../../components/common/TableRowActions';
import { EditVehicleModal } from '../../components/fleet/EditVehicleModal';
import { useAppStore } from '../../store/useAppStore';
import { useManagementFilterCatalog } from '../../hooks/useManagementFilterCatalog';
import { VehicleProfile, VehicleStatistics, VehicleFilterOptions } from '../../types';
import {
  Layers,
  CheckCircle2,
  Package,
  Wrench,
  Download,
  Search,
  ChevronLeft,
  ChevronRight,
  Building2,
  MapPin,
  UserCheck,
  Users,
  RotateCcw,
  Tag,
  Gauge,
  SlidersHorizontal,
  Table,
  Boxes,
  FileSpreadsheet,
  AlertTriangle,
  Edit,
  Plus,
  Upload,
  ExternalLink,
  Scissors,
  Bike,
  Zap,
  Truck,
  Flame,
  Activity,
  HelpCircle,
} from 'lucide-react';

type TabType = 'all' | 'active' | 'waiting' | 'maintenance' | 'repair';
type TableViewMode = 'excel_23' | 'compact';
type DetailTab = 'identity' | 'technical' | 'assignment' | 'repairs';

const ALL = 'ALL';

const OTHER_CATEGORY_META: Record<string, { label: string; desc: string; icon: any; barClass: string; iconClass: string; selectedClass: string }> = {
  MAY_PHAT_CO: {
    label: 'Máy phát cỏ',
    desc: 'Cắt tỉa cỏ lô chuối & cảnh quan',
    icon: Scissors,
    barClass: 'bg-emerald-500',
    iconClass: 'bg-emerald-50 text-emerald-600 border-emerald-200',
    selectedClass: 'border-emerald-500 bg-emerald-50/40',
  },
  THIET_BI_NONG_CU: {
    label: 'Thiết bị & Nông cụ khác',
    desc: 'Xe cẩu bàn 5T, máy ép, nghiền rơm',
    icon: Boxes,
    barClass: 'bg-purple-500',
    iconClass: 'bg-purple-50 text-purple-600 border-purple-200',
    selectedClass: 'border-purple-500 bg-purple-50/40',
  },
  XE_MAY_2_BANH: {
    label: 'Xe máy 2 bánh',
    desc: 'Tuần tra & công vụ nông trường',
    icon: Bike,
    barClass: 'bg-sky-500',
    iconClass: 'bg-sky-50 text-sky-600 border-sky-200',
    selectedClass: 'border-sky-500 bg-sky-50/40',
  },
  MAY_PHAT_DIEN: {
    label: 'Máy phát điện',
    desc: 'Cấp điện trạm bơm, kho lạnh, trại bò',
    icon: Zap,
    barClass: 'bg-amber-500',
    iconClass: 'bg-amber-50 text-amber-600 border-amber-200',
    selectedClass: 'border-amber-500 bg-amber-50/40',
  },
  XE_NANG: {
    label: 'Xe nâng hàng',
    desc: 'Bốc dỡ pallet chuối & vật tư kho',
    icon: Truck,
    barClass: 'bg-blue-500',
    iconClass: 'bg-blue-50 text-blue-600 border-blue-200',
    selectedClass: 'border-blue-500 bg-blue-50/40',
  },
  MAY_CUA_BOM: {
    label: 'Máy cưa & Máy bơm',
    desc: 'Khai hoang rừng, bơm tiêu thoát nước',
    icon: Flame,
    barClass: 'bg-teal-500',
    iconClass: 'bg-teal-50 text-teal-600 border-teal-200',
    selectedClass: 'border-teal-500 bg-teal-50/40',
  },
};

const OTHER_CATEGORY_LABELS: Record<string, string> = {
  XE_NANG: 'Xe nâng',
  MAY_PHAT_DIEN: 'Máy phát điện',
  MAY_PHAT_CO: 'Máy phát cỏ',
  MAY_CUA: 'Máy cưa',
  MAY_BOM: 'Máy bơm',
  XE_MAY_2_BANH: 'Xe máy 2 bánh',
  THIET_BI_NONG_CU: 'Thiết bị & Nông cụ khác',
};

const STATUS_META: Record<string, { label: string; bg: string; dot: string }> = {
  HOAT_DONG: { label: 'Còn hoạt động (Sẵn sàng)', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  BAO_DUONG: { label: 'Đang bảo dưỡng', bg: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500' },
  SUA_CHUA: { label: 'Đang sửa chữa (Hư hỏng)', bg: 'bg-rose-50 text-rose-700 border-rose-200', dot: 'bg-rose-500' },
  TAM_DUNG: { label: 'Ngưng hoạt động', bg: 'bg-slate-100 text-slate-700 border-slate-300', dot: 'bg-slate-400' },
  CHO_PHAN_CONG: { label: 'Chờ phân công', bg: 'bg-sky-50 text-sky-700 border-sky-200', dot: 'bg-sky-500' },
};

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const s = STATUS_META[status] || STATUS_META.HOAT_DONG;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-extrabold ${s.bg}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
};

const displayValue = (value?: React.ReactNode) => {
  if (value === null || value === undefined || value === '') return '—';
  return value;
};

const DetailField: React.FC<{
  label: string;
  value?: React.ReactNode;
  mono?: boolean;
  className?: string;
  badge?: React.ReactNode;
}> = ({ label, value, mono = false, className = '', badge }) => (
  <div className={`rounded-xl border border-slate-200/80 bg-slate-50/70 p-3 transition-colors hover:bg-white hover:shadow-xs ${className}`}>
    <div className="flex items-center justify-between gap-1">
      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</span>
      {badge}
    </div>
    <div className={`mt-1 text-xs font-bold text-slate-900 break-words ${mono ? 'font-mono' : ''}`}>
      {displayValue(value)}
    </div>
  </div>
);

export const OtherAssetsPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [tableViewMode, setTableViewMode] = useState<TableViewMode>('excel_23');
  const [assets, setAssets] = useState<VehicleProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadMsg, setLoadMsg] = useState('');
  const [stats, setStats] = useState<VehicleStatistics | null>(null);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 20, totalPages: 1 });
  const [filterOptions, setFilterOptions] = useState<VehicleFilterOptions>({
    complexes: [],
    regions: [],
    assignedUnits: [],
    locations: [],
    assetGroups: [],
    vehicleTypes: [],
    manufacturers: [],
    models: [],
    origins: [],
    manufactureYears: [],
    statuses: [],
    alertTiers: [],
  });
  const [page, setPage] = useState(1);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(ALL);
  const [selectedStatus, setSelectedStatus] = useState(ALL);
  const [selectedUnit, setSelectedUnit] = useState(ALL);
  const [selectedLocation, setSelectedLocation] = useState(ALL);
  const [selectedManufacturer, setSelectedManufacturer] = useState(ALL);
  const [selectedModel, setSelectedModel] = useState(ALL);
  const [selectedOrigin, setSelectedOrigin] = useState(ALL);
  const [selectedYear, setSelectedYear] = useState(ALL);
  const [selectedManager, setSelectedManager] = useState(ALL);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Global Complex
  const globalKLH = useAppStore((s) => s.selectedKLH);
  const [selectedComplex, setSelectedComplex] = useState(globalKLH || ALL);
  const [selectedRegion, setSelectedRegion] = useState(ALL);
  const { units: managementFilterUnits, managers: managementFilterManagers } = useManagementFilterCatalog(
    selectedComplex !== ALL ? selectedComplex : undefined,
  );
  const selectedManagementUnitId = selectedUnit !== ALL && selectedUnit !== '__UNASSIGNED__'
    ? Number(selectedUnit)
    : undefined;
  const unitFilterParams = Number.isInteger(selectedManagementUnitId) && Number(selectedManagementUnitId) > 0
    ? { managementUnitId: selectedManagementUnitId }
    : selectedUnit !== ALL ? { assignedUnitCode: selectedUnit } : {};

  // Detail & Modals
  const [selectedAsset, setSelectedAsset] = useState<VehicleProfile | null>(null);
  const [editingAsset, setEditingAsset] = useState<VehicleProfile | null>(null);
  const [isCreatingAsset, setIsCreatingAsset] = useState(false);
  const [detailTab, setDetailTab] = useState<DetailTab>('identity');
  const [repairHistory, setRepairHistory] = useState<any[]>([]);
  const [importing, setImporting] = useState(false);
  const [importMessage, setImportMessage] = useState('');
  const importInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (globalKLH !== undefined) setSelectedComplex(globalKLH);
  }, [globalKLH]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      setDebouncedSearch(searchTerm.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(t);
  }, [searchTerm]);

  const changeTab = (nextTab: TabType) => {
    setActiveTab(nextTab);
    if (nextTab === 'all') {
      setSelectedStatus(ALL);
    } else if (nextTab === 'active') {
      setSelectedStatus('HOAT_DONG');
    } else if (nextTab === 'waiting') {
      setSelectedStatus('CHO_PHAN_CONG');
    } else if (nextTab === 'maintenance') {
      setSelectedStatus('BAO_DUONG');
    } else if (nextTab === 'repair') {
      setSelectedStatus('SUA_CHUA');
    }
    setPage(1);
  };

  const loadAssets = async () => {
    setLoading(true);
    try {
      // Map category shortcut for MAY_CUA_BOM
      let vehicleTypeCodeParam: string | undefined = undefined;
      if (selectedCategory !== ALL) {
        vehicleTypeCodeParam = selectedCategory;
      }

      const resp = await apiService.getVehiclesPage({
        page,
        limit: 20,
        isAssignable: false,
        search: debouncedSearch || undefined,
        complexCode: selectedComplex !== ALL ? selectedComplex : undefined,
        regionCode: selectedRegion !== ALL ? selectedRegion : undefined,
        ...unitFilterParams,
        currentLocationName: selectedLocation !== ALL ? selectedLocation : undefined,
        vehicleTypeCode: vehicleTypeCodeParam,
        manufacturer: selectedManufacturer !== ALL ? selectedManufacturer : undefined,
        modelName: selectedModel !== ALL ? selectedModel : undefined,
        origin: selectedOrigin !== ALL ? selectedOrigin : undefined,
        manufactureYear: selectedYear === '__UNASSIGNED__' ? -1 : (selectedYear !== ALL ? Number(selectedYear) : undefined),
        status: selectedStatus !== ALL ? selectedStatus : undefined,
        managerUserId: selectedManager === '__UNASSIGNED__' ? -1 : (selectedManager !== ALL ? Number(selectedManager) : undefined),
      });
      setAssets(resp.items);
      setPagination(resp.pagination);
    } catch {
      setAssets([]);
      setLoadMsg('Không kết nối được API máy phụ trợ & khác.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAssets();
  }, [
    page,
    debouncedSearch,
    selectedCategory,
    selectedStatus,
    selectedUnit,
    selectedLocation,
    selectedComplex,
    selectedRegion,
    selectedManufacturer,
    selectedModel,
    selectedOrigin,
    selectedYear,
    selectedManager,
  ]);

  useEffect(() => {
    const complexCode = selectedComplex !== ALL ? selectedComplex : undefined;
    const managerId = selectedManager === '__UNASSIGNED__' ? -1 : (selectedManager !== ALL ? Number(selectedManager) : undefined);
    void apiService
      .getVehicleStatistics({ isAssignable: false, complexCode, managerUserId: managerId })
      .then(setStats)
      .catch(() => {});
    void apiService
      .getVehicleFilterOptions({ isAssignable: false, complexCode, managerUserId: managerId })
      .then((opts: any) => setFilterOptions(opts))
      .catch(() => {});
  }, [selectedComplex, selectedManager]);

  const openAssetDetail = (asset: VehicleProfile) => {
    setDetailTab('identity');
    setRepairHistory([]);
    setSelectedAsset(asset);
    const vehicleId = Number(String(asset.id).replace(/^V/, ''));
    if (vehicleId) {
      void apiClient
        .get(`/repairs`, { params: { vehicleId, limit: 50 } })
        .then((res) => {
          const payload = res.data?.data || res.data || {};
          setRepairHistory(Array.isArray(payload.items) ? payload.items : []);
        })
        .catch(() => setRepairHistory([]));
    }
  };

  const handleDelete = async (asset: VehicleProfile) => {
    if (asset.isLiquidated) return;
    const reason = window.prompt(`Nhập lý do lưu trữ tài sản ${asset.internalCode}:`);
    if (reason === null) return;
    if (reason.trim().length < 3) {
      alert('Lý do lưu trữ phải có ít nhất 3 ký tự.');
      return;
    }
    try {
      const archived = await apiService.archiveVehicle(asset.id, reason.trim());
      setAssets((prev) => prev.map((item) => (item.id === asset.id ? archived : item)));
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Không thể lưu trữ tài sản này');
    }
  };

  const handleExportExcel = async () => {
    try {
      const all = await apiService.getVehicles({
        isAssignable: false,
        search: debouncedSearch || undefined,
        complexCode: selectedComplex !== ALL ? selectedComplex : undefined,
        regionCode: selectedRegion !== ALL ? selectedRegion : undefined,
        ...unitFilterParams,
        vehicleTypeCode: selectedCategory !== ALL ? selectedCategory : undefined,
        status: selectedStatus !== ALL ? selectedStatus : undefined,
        managerUserId: selectedManager !== ALL ? Number(selectedManager) : undefined,
      });
      const rows = all.map((a, i) => ({
        'STT': i + 1,
        'Mã MMTB mới': a.internalCode,
        'Mã MMTB cũ': a.oldCode || '',
        'Mã Bravo': (a as any).bravoCode || '',
        'Tên tài sản / Model': a.brandModel || '',
        'Chủng loại': a.vehicleTypeName || OTHER_CATEGORY_LABELS[a.categoryCode || a.vehicleCategory] || a.vehicleCategory || '',
        'Khu liên hợp': a.klhName || a.complexCode || '',
        'Khu vực': a.regionCode || '',
        'Đơn vị sử dụng': a.teamUnit || a.assignedUnitCode || '',
        'Nơi tập kết': a.currentLocationName || '',
        'Nhân sự quản lý': a.managerName || '',
        'Số điện thoại': a.managerPhone || '',
        'Hãng sản xuất': a.manufacturer || '',
        'Năm sản xuất': a.yearManufactured || '',
        'Xuất xứ': a.origin || '',
        'Tình trạng': STATUS_META[a.rawStatus || a.status]?.label || a.status || '',
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'MAY_PHU_TRO_KHAC');
      XLSX.writeFile(wb, `MAY_PHU_TRO_KHAC_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch {
      alert('Không thể xuất Excel');
    }
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportMessage('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      await apiClient.post('/vehicles/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setImportMessage(`Đã import thành công file ${file.name}`);
      void loadAssets();
    } catch (err: any) {
      setImportMessage(err?.response?.data?.message || `Lỗi khi import file: ${err.message}`);
    } finally {
      setImporting(false);
      if (importInputRef.current) importInputRef.current.value = '';
    }
  };

  // Operational stats calculated
  const dynamicStats = useMemo(() => {
    const total = Number(stats?.totalVehicles ?? pagination.total);
    const active = Number((stats as any)?.running || 0) + Number((stats as any)?.waitingDispatch || 0);
    const maintenance = Number((stats as any)?.maintenance || 0);
    const repair = Number((stats as any)?.repair || 0);
    const waiting = Number((stats as any)?.standby || 0);
    const unassignedUnit = Number((stats as any)?.unassignedUnit || 0);
    return { total, active, maintenance, repair, waiting, unassignedUnit };
  }, [stats, pagination.total]);

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {
      MAY_PHAT_CO: 0,
      THIET_BI_NONG_CU: 0,
      XE_MAY_2_BANH: 0,
      MAY_PHAT_DIEN: 0,
      XE_NANG: 0,
      MAY_CUA_BOM: 0,
    };
    (filterOptions.vehicleTypes || []).forEach((t: any) => {
      const code = t.code;
      if (code === 'MAY_PHAT_CO') counts.MAY_PHAT_CO += t.vehicleCount || 0;
      else if (code === 'THIET_BI_NONG_CU') counts.THIET_BI_NONG_CU += t.vehicleCount || 0;
      else if (code === 'XE_MAY_2_BANH') counts.XE_MAY_2_BANH += t.vehicleCount || 0;
      else if (code === 'MAY_PHAT_DIEN') counts.MAY_PHAT_DIEN += t.vehicleCount || 0;
      else if (code === 'XE_NANG') counts.XE_NANG += t.vehicleCount || 0;
      else if (code === 'MAY_CUA' || code === 'MAY_BOM') counts.MAY_CUA_BOM += t.vehicleCount || 0;
    });
    return counts;
  }, [filterOptions.vehicleTypes]);

  // Select Options for SearchableSelect
  const unitSelectOptions = useMemo<SelectOption[]>(() => {
    const list: SelectOption[] = [];
    const unassignedCount = filterOptions.unassignedCounts?.assignedUnit ?? filterOptions.unitCounts?.['__UNASSIGNED__'];
    if (unassignedCount !== undefined && unassignedCount > 0) {
      list.push({
        value: '__UNASSIGNED__',
        label: 'Chưa phân bổ đơn vị (Không có dữ liệu)',
        subLabel: `${unassignedCount.toLocaleString('vi-VN')} máy`,
      });
    }
    managementFilterUnits.forEach((unit) => {
      const count = filterOptions.unitCounts?.[unit.name] ?? 0;
      list.push({ value: String(unit.id), label: unit.name, subLabel: `${count.toLocaleString('vi-VN')} tài sản` });
    });
    return list;
  }, [managementFilterUnits, filterOptions.unassignedCounts, filterOptions.unitCounts]);

  const locationSelectOptions = useMemo<SelectOption[]>(() => {
    const list: SelectOption[] = [];
    const unassignedCount = filterOptions.unassignedCounts?.currentLocation ?? filterOptions.locationCounts?.['__UNASSIGNED__'];
    if (unassignedCount !== undefined && unassignedCount > 0) {
      list.push({
        value: '__UNASSIGNED__',
        label: 'Chưa có nơi tập kết (Không có dữ liệu)',
        subLabel: `${unassignedCount.toLocaleString('vi-VN')} máy`,
      });
    }
    (filterOptions.locations || []).forEach((loc: any) => {
      const name = typeof loc === 'object' && loc !== null ? loc.name : String(loc);
      const count = typeof loc === 'object' && loc !== null && typeof loc.vehicleCount === 'number'
        ? `${loc.vehicleCount.toLocaleString('vi-VN')} máy`
        : filterOptions.locationCounts?.[name] !== undefined
          ? `${filterOptions.locationCounts[name].toLocaleString('vi-VN')} máy`
          : undefined;
      list.push({ value: name, label: name, subLabel: count });
    });
    return list;
  }, [filterOptions.locations, filterOptions.unassignedCounts, filterOptions.locationCounts]);

  const categorySelectOptions = useMemo<SelectOption[]>(
    () =>
      (filterOptions.vehicleTypes || []).map((t: any) => ({
        value: t.code,
        label: t.name,
        subLabel: `${(t.vehicleCount || 0).toLocaleString('vi-VN')} máy`,
      })),
    [filterOptions.vehicleTypes]
  );

  const complexSelectOptions = useMemo<SelectOption[]>(
    () => (filterOptions.complexes || []).map((c: any) => {
      const name = typeof c === 'object' && c !== null ? c.name : String(c);
      const count = typeof c === 'object' && c !== null && typeof c.vehicleCount === 'number'
        ? `${c.vehicleCount.toLocaleString('vi-VN')} máy`
        : filterOptions.complexCounts?.[name] !== undefined
          ? `${filterOptions.complexCounts[name].toLocaleString('vi-VN')} máy`
          : undefined;
      return { value: name, label: name, subLabel: count };
    }),
    [filterOptions.complexes, filterOptions.complexCounts]
  );

  const regionSelectOptions = useMemo<SelectOption[]>(() => {
    const list: SelectOption[] = [];
    const unassignedCount = filterOptions.unassignedCounts?.region ?? filterOptions.regionCounts?.['__UNASSIGNED__'];
    if (unassignedCount !== undefined && unassignedCount > 0) {
      list.push({
        value: '__UNASSIGNED__',
        label: 'Chưa xác định khu vực (Không có dữ liệu)',
        subLabel: `${unassignedCount.toLocaleString('vi-VN')} máy`,
      });
    }
    (filterOptions.regions || []).forEach((r: any) => {
      const name = typeof r === 'object' && r !== null ? r.name || r.code : String(r);
      const count = typeof r === 'object' && r !== null && typeof r.vehicleCount === 'number'
        ? `${r.vehicleCount.toLocaleString('vi-VN')} máy`
        : filterOptions.regionCounts?.[name] !== undefined
          ? `${filterOptions.regionCounts[name].toLocaleString('vi-VN')} máy`
          : undefined;
      list.push({ value: name, label: name, subLabel: count });
    });
    return list;
  }, [filterOptions.regions, filterOptions.unassignedCounts, filterOptions.regionCounts]);

  const manufacturerSelectOptions = useMemo<SelectOption[]>(() => {
    const list: SelectOption[] = [];
    const unassignedCount = filterOptions.unassignedCounts?.manufacturer;
    if (unassignedCount !== undefined && unassignedCount > 0) {
      list.push({
        value: '__UNASSIGNED__',
        label: 'Chưa có thông tin hãng (Không có dữ liệu)',
        subLabel: `${unassignedCount.toLocaleString('vi-VN')} máy`,
      });
    }
    (filterOptions.manufacturers || []).forEach((mf: any) => {
      const name = typeof mf === 'object' ? mf.name : String(mf);
      const count = typeof mf === 'object' && typeof mf.vehicleCount === 'number' ? `${mf.vehicleCount.toLocaleString('vi-VN')} máy` : undefined;
      list.push({ value: name, label: name, subLabel: count });
    });
    return list;
  }, [filterOptions.manufacturers, filterOptions.unassignedCounts]);

  const modelSelectOptions = useMemo<SelectOption[]>(() => {
    const list: SelectOption[] = [];
    const unassignedCount = filterOptions.unassignedCounts?.model;
    if (unassignedCount !== undefined && unassignedCount > 0) {
      list.push({
        value: '__UNASSIGNED__',
        label: 'Chưa có thông tin model (Không có dữ liệu)',
        subLabel: `${unassignedCount.toLocaleString('vi-VN')} máy`,
      });
    }
    (filterOptions.models || []).forEach((m: any) => {
      const name = typeof m === 'object' ? m.name : String(m);
      const count = typeof m === 'object' && typeof m.vehicleCount === 'number' ? `${m.vehicleCount.toLocaleString('vi-VN')} máy` : undefined;
      list.push({ value: name, label: name, subLabel: count });
    });
    return list;
  }, [filterOptions.models, filterOptions.unassignedCounts]);

  const statusSelectOptions = useMemo<SelectOption[]>(
    () => Object.entries(STATUS_META).map(([k, v]) => ({ value: k, label: v.label })),
    []
  );

  const managerSelectOptions = useMemo<SelectOption[]>(() => {
    const list: SelectOption[] = [];
    const unassignedCount = filterOptions.unassignedCounts?.manager ?? stats?.unassignedDriver;
    if (unassignedCount !== undefined && unassignedCount > 0) {
      list.push({
        value: '__UNASSIGNED__',
        label: 'Chưa phân nhân sự quản lý (Không có dữ liệu)',
        subLabel: `${unassignedCount.toLocaleString('vi-VN')} tài sản`,
      });
    }
    const contextualCounts = new Map((filterOptions.managers || []).map((manager) => [manager.id, manager.vehicleCount]));
    managementFilterManagers.forEach((manager) => {
      list.push({
        value: String(manager.id),
        label: manager.name,
        subLabel: [manager.phone, `${(contextualCounts.get(manager.id) ?? 0).toLocaleString('vi-VN')} tài sản`].filter(Boolean).join(' · '),
      });
    });
    return list;
  }, [managementFilterManagers, filterOptions.managers, filterOptions.unassignedCounts, stats?.unassignedDriver]);

  const activeFilterCount = [
    debouncedSearch ? 'search' : '',
    selectedCategory !== ALL ? selectedCategory : '',
    selectedStatus !== ALL ? selectedStatus : '',
    selectedUnit !== ALL ? selectedUnit : '',
    selectedLocation !== ALL ? selectedLocation : '',
    selectedComplex !== ALL ? selectedComplex : '',
    selectedRegion !== ALL ? selectedRegion : '',
    selectedManufacturer !== ALL ? selectedManufacturer : '',
    selectedModel !== ALL ? selectedModel : '',
    selectedOrigin !== ALL ? selectedOrigin : '',
    selectedYear !== ALL ? selectedYear : '',
    selectedManager !== ALL ? selectedManager : '',
  ].filter(Boolean).length;

  const resetFilters = () => {
    setSearchTerm('');
    setDebouncedSearch('');
    setSelectedCategory(ALL);
    setSelectedStatus(ALL);
    setSelectedUnit(ALL);
    setSelectedLocation(ALL);
    setSelectedComplex(ALL);
    setSelectedRegion(ALL);
    setSelectedManufacturer(ALL);
    setSelectedModel(ALL);
    setSelectedOrigin(ALL);
    setSelectedYear(ALL);
    setSelectedManager(ALL);
    setActiveTab('all');
    setPage(1);
  };

  // ═══ COLUMNS DEFINITIONS ═══
  const compactColumns: Column<VehicleProfile>[] = [
    {
      key: 'internalCode',
      title: 'MÃ TÀI SẢN',
      sortable: true,
      width: '130px',
      render: (a) => (
        <button
          type="button"
          onClick={() => openAssetDetail(a)}
          className="text-left font-mono text-xs font-extrabold text-violet-700 hover:underline"
        >
          {a.internalCode}
          {a.oldCode && <div className="font-mono text-[9px] text-slate-400">Cũ: {a.oldCode}</div>}
        </button>
      ),
      filterElement: (
        <div className="relative">
          <Search className="absolute left-1.5 top-1/2 h-3 w-3 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm mã/tên..."
            className="h-7 w-full rounded border border-slate-300 bg-white pl-5 pr-1 text-[11px] outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
          />
        </div>
      ),
    },
    {
      key: 'brandModel',
      title: 'TÊN & CHỦNG LOẠI',
      sortable: true,
      render: (a) => (
        <div className="max-w-[220px] whitespace-normal">
          <div className="text-xs font-bold text-slate-900 leading-tight">{a.brandModel || '—'}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            {a.vehicleTypeName || OTHER_CATEGORY_LABELS[a.categoryCode || a.vehicleCategory] || a.vehicleCategory || '—'}
            {a.manufacturer ? ` · ${a.manufacturer}` : ''}
          </div>
        </div>
      ),
      filterElement: (
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="h-7 w-full rounded border border-slate-300 bg-white px-1 text-[11px] outline-none focus:border-violet-500"
        >
          <option value={ALL}>Tất cả loại</option>
          {categorySelectOptions.map((c: any) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      ),
    },
    {
      key: 'teamUnit',
      title: 'ĐƠN VỊ & NƠI TẬP KẾT',
      sortable: true,
      width: '190px',
      render: (a) => (
        <div>
          <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-800">
            <Building2 className="h-3 w-3 text-slate-500 shrink-0" />
            <span className="truncate max-w-[140px]">{a.teamUnit || a.assignedUnitCode || 'Chờ phân bổ'}</span>
          </span>
          {a.currentLocationName && (
            <div className="flex items-center gap-1 text-[10px] font-bold text-violet-800 mt-0.5 truncate max-w-[170px]">
              <MapPin className="h-3 w-3 text-violet-600 shrink-0" />
              <span>{a.currentLocationName}</span>
            </div>
          )}
        </div>
      ),
      filterElement: (
        <select
          value={selectedUnit}
          onChange={(e) => setSelectedUnit(e.target.value)}
          className="h-7 w-full rounded border border-slate-300 bg-white px-1 text-[11px] outline-none focus:border-violet-500"
        >
          <option value={ALL}>Tất cả đơn vị</option>
          {unitSelectOptions.map((u: any) => (
            <option key={u.value} value={u.value}>
              {u.label}
            </option>
          ))}
        </select>
      ),
    },
    {
      key: 'managerName',
      title: 'QUẢN LÝ',
      width: '160px',
      render: (a) => (
        <div>
          {a.managerName ? (
            <div className="flex items-center gap-1 text-xs font-bold text-slate-800">
              <UserCheck className="h-3 w-3 text-blue-500 shrink-0" />
              <span className="truncate max-w-[130px]">{a.managerName}</span>
            </div>
          ) : (
            <span className="text-[10px] text-slate-400 italic">Chưa gán</span>
          )}
          {a.managerPhone && <div className="text-[10px] text-slate-500 mt-0.5">{a.managerPhone}</div>}
        </div>
      ),
    },
    {
      key: 'status',
      title: 'TRẠNG THÁI',
      width: '160px',
      render: (a) => <StatusBadge status={a.rawStatus || a.status} />,
      filterElement: (
        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="h-7 w-full rounded border border-slate-300 bg-white px-1 text-[11px] outline-none focus:border-violet-500"
        >
          <option value={ALL}>Tất cả</option>
          {Object.entries(STATUS_META).map(([k, v]) => (
            <option key={k} value={k}>
              {v.label}
            </option>
          ))}
        </select>
      ),
    },
    {
      key: 'yearManufactured' as any,
      title: 'USER',
      width: '100px',
      render: (a) => (
        <AuditUserPopover
          createdDate={(a as any).createdAt || '14-03-2026'}
          updatedDate={(a as any).updatedAt || '01-08-2026'}
          createdUser={(a as any).createdByName || 'admin'}
          updatedUser={(a as any).updatedByName || 'admin'}
          title={`Xem thông tin tạo/sửa của ${a.internalCode}`}
        />
      ),
    },
    {
      key: 'id',
      title: 'TÁC VỤ',
      width: '100px',
      render: (a) => (
        <TableRowActions
          onView={() => openAssetDetail(a)}
          onEdit={() => setEditingAsset(a)}
          onDelete={() => handleDelete(a)}
          viewTitle="Xem chi tiết máy / tài sản"
          editTitle="Chỉnh sửa thông tin"
          deleteTitle={a.isLiquidated ? 'Tài sản đã được lưu trữ' : 'Lưu trữ tài sản'}
          disabledDelete={a.isLiquidated}
        />
      ),
    },
  ];

  const excelColumns: Column<VehicleProfile>[] = [
    {
      key: 'id',
      title: 'STT',
      width: '50px',
      align: 'center',
      render: (a) => <span className="text-xs text-slate-500 font-mono">{assets.indexOf(a) + 1 + (page - 1) * 20}</span>,
    },
    {
      key: 'internalCode',
      title: 'MÃ TÀI SẢN',
      sortable: true,
      width: '120px',
      render: (a) => (
        <button
          type="button"
          onClick={() => openAssetDetail(a)}
          className="font-mono text-xs font-extrabold text-violet-700 hover:underline"
        >
          {a.internalCode}
        </button>
      ),
    },
    {
      key: 'oldCode',
      title: 'MÃ CŨ',
      width: '100px',
      render: (a) => <span className="font-mono text-xs text-slate-500">{a.oldCode || '—'}</span>,
    },
    {
      key: 'brandModel',
      title: 'TÊN TÀI SẢN / MODEL',
      width: '180px',
      render: (a) => (
        <div>
          <div className="text-xs font-bold text-slate-900">{a.brandModel || '—'}</div>
          {a.modelName && <div className="text-[10px] text-slate-500">Model: {a.modelName}</div>}
        </div>
      ),
    },
    {
      key: 'vehicleCategory',
      title: 'CHỦNG LOẠI',
      width: '140px',
      render: (a) => (
        <span className="text-xs text-slate-700 font-semibold">
          {a.vehicleTypeName || OTHER_CATEGORY_LABELS[a.categoryCode || a.vehicleCategory] || a.vehicleCategory || '—'}
        </span>
      ),
    },
    {
      key: 'klhName',
      title: 'KHU LIÊN HỢP',
      width: '130px',
      render: (a) => <span className="text-xs text-slate-700">{a.complexCode || 'KOUN_MOM'}</span>,
    },
    {
      key: 'teamUnit',
      title: 'ĐƠN VỊ SỬ DỤNG',
      width: '160px',
      render: (a) => <span className="text-xs font-bold text-slate-800">{a.teamUnit || a.assignedUnitCode || 'Chờ phân bổ'}</span>,
    },
    {
      key: 'currentLocationName',
      title: 'NƠI TẬP KẾT',
      width: '140px',
      render: (a) => <span className="text-xs text-slate-600">{a.currentLocationName || '—'}</span>,
    },
    {
      key: 'managerName',
      title: 'QUẢN LÝ & SĐT',
      width: '150px',
      render: (a) => (
        <div>
          <div className="text-xs font-bold text-slate-800">{a.managerName || 'Chưa gán'}</div>
          {a.managerPhone && <div className="text-[10px] text-slate-500">{a.managerPhone}</div>}
        </div>
      ),
    },
    {
      key: 'manufacturer',
      title: 'HÃNG SX',
      width: '110px',
      render: (a) => <span className="text-xs text-slate-700">{a.manufacturer || '—'}</span>,
    },
    {
      key: 'yearManufactured',
      title: 'NĂM SX',
      width: '80px',
      align: 'center',
      render: (a) => <span className="text-xs font-mono text-slate-700">{a.yearManufactured || '—'}</span>,
    },
    {
      key: 'origin',
      title: 'XUẤT XỨ',
      width: '90px',
      render: (a) => <span className="text-xs text-slate-700">{a.origin || '—'}</span>,
    },
    {
      key: 'status',
      title: 'TRẠNG THÁI',
      width: '150px',
      render: (a) => <StatusBadge status={a.rawStatus || a.status} />,
    },
    {
      key: 'yearManufactured' as any,
      title: 'USER',
      width: '80px',
      align: 'center',
      render: (a) => (
        <AuditUserPopover
          createdDate={(a as any).createdAt || '14-03-2026'}
          updatedDate={(a as any).updatedAt || '01-08-2026'}
          createdUser={(a as any).createdByName || 'admin'}
          updatedUser={(a as any).updatedByName || 'admin'}
          title={`Xem thông tin tạo/sửa của ${a.internalCode}`}
        />
      ),
    },
    {
      key: 'id',
      title: 'TÁC VỤ',
      width: '100px',
      align: 'center',
      render: (a) => (
        <TableRowActions
          onView={() => openAssetDetail(a)}
          onEdit={() => setEditingAsset(a)}
          onDelete={() => handleDelete(a)}
          viewTitle="Xem chi tiết máy / tài sản"
          editTitle="Chỉnh sửa thông tin"
          deleteTitle={a.isLiquidated ? 'Tài sản đã được lưu trữ' : 'Lưu trữ tài sản'}
          disabledDelete={a.isLiquidated}
        />
      ),
    },
  ];

  const columns = tableViewMode === 'compact' ? compactColumns : excelColumns;

  return (
    <div className="space-y-4">
      {/* ═══ ROW 1: TRẠNG THÁI VẬN HÀNH & GIÁM SÁT (6 THẺ ĐỒNG BỘ CHUẨN THIẾT BỊ) ═══ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
        {/* Card 1: Tổng quy mô */}
        <button
          type="button"
          onClick={() => {
            changeTab('all');
            setSelectedCategory(ALL);
          }}
          className={`relative overflow-hidden p-4 rounded-2xl border text-left transition-all hover:shadow-md cursor-pointer ${
            activeTab === 'all' && selectedCategory === ALL
              ? 'border-blue-500 bg-blue-50/40 ring-2 ring-blue-500/25 shadow-sm scale-[1.01]'
              : 'border-slate-200 bg-white hover:bg-slate-50'
          }`}
        >
          <span className="absolute inset-x-0 bottom-0 h-1.5 bg-blue-500" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Tổng máy & tài sản</span>
            <div className="rounded-xl p-2 bg-blue-50 text-blue-600 border border-blue-200">
              <Layers className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900">
            {loading ? '...' : dynamicStats.total.toLocaleString('vi-VN')}
          </div>
          <div className="mt-1 text-[11px] font-semibold text-slate-500 truncate">
            {selectedCategory !== ALL
              ? `Nhóm: ${OTHER_CATEGORY_META[selectedCategory]?.label || selectedCategory}`
              : selectedComplex !== ALL
              ? `Phân bổ tại ${selectedComplex}`
              : '100% Dữ liệu thực từ database'}
          </div>
        </button>

        {/* Card 2: Sẵn sàng hoạt động */}
        <button
          type="button"
          onClick={() => changeTab(activeTab === 'active' ? 'all' : 'active')}
          className={`relative overflow-hidden p-4 rounded-2xl border text-left transition-all hover:shadow-md cursor-pointer ${
            activeTab === 'active'
              ? 'border-emerald-500 bg-emerald-50/40 ring-2 ring-emerald-500/25 shadow-sm scale-[1.01]'
              : 'border-slate-200 bg-white hover:bg-slate-50'
          }`}
        >
          <span className="absolute inset-x-0 bottom-0 h-1.5 bg-emerald-500" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Sẵn sàng vận hành</span>
            <div className="rounded-xl p-2 bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-emerald-700">
            {loading ? '...' : dynamicStats.active.toLocaleString('vi-VN')}
          </div>
          <div className="mt-1 text-[11px] font-semibold text-emerald-700 truncate">
            Tình trạng kỹ thuật bình thường
          </div>
        </button>

        {/* Card 3: Chờ phân công */}
        <button
          type="button"
          onClick={() => changeTab(activeTab === 'waiting' ? 'all' : 'waiting')}
          className={`relative overflow-hidden p-4 rounded-2xl border text-left transition-all hover:shadow-md cursor-pointer ${
            activeTab === 'waiting'
              ? 'border-sky-500 bg-sky-50/40 ring-2 ring-sky-500/25 shadow-sm scale-[1.01]'
              : 'border-slate-200 bg-white hover:bg-slate-50'
          }`}
        >
          <span className="absolute inset-x-0 bottom-0 h-1.5 bg-sky-500" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Chờ phân công</span>
            <div className="rounded-xl p-2 bg-sky-50 text-sky-600 border border-sky-200">
              <Gauge className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-sky-700">
            {loading ? '...' : dynamicStats.waiting.toLocaleString('vi-VN')}
          </div>
          <div className="mt-1 text-[11px] font-semibold text-sky-700 truncate">
            Sẵn sàng điều phối tại bãi đội
          </div>
        </button>

        {/* Card 4: Đang bảo dưỡng */}
        <button
          type="button"
          onClick={() => changeTab(activeTab === 'maintenance' ? 'all' : 'maintenance')}
          className={`relative overflow-hidden p-4 rounded-2xl border text-left transition-all hover:shadow-md cursor-pointer ${
            activeTab === 'maintenance'
              ? 'border-amber-500 bg-amber-50/40 ring-2 ring-amber-500/25 shadow-sm scale-[1.01]'
              : 'border-slate-200 bg-white hover:bg-slate-50'
          }`}
        >
          <span className="absolute inset-x-0 bottom-0 h-1.5 bg-amber-500" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-700">Đang bảo dưỡng</span>
            <div className="rounded-xl p-2 bg-amber-50 text-amber-600">
              <Wrench className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-amber-700">
            {loading ? '...' : dynamicStats.maintenance.toLocaleString('vi-VN')}
          </div>
          <div className="mt-1 text-[11px] font-semibold text-amber-600 truncate">
            Bảo dưỡng định kỳ / Thay dầu nhớt
          </div>
        </button>

        {/* Card 5: Đang sửa chữa (Hư hỏng) */}
        <button
          type="button"
          onClick={() => changeTab(activeTab === 'repair' ? 'all' : 'repair')}
          className={`relative overflow-hidden p-4 rounded-2xl border text-left transition-all hover:shadow-md cursor-pointer ${
            activeTab === 'repair'
              ? 'border-rose-500 bg-rose-50/40 ring-2 ring-rose-500/25 shadow-sm scale-[1.01]'
              : 'border-slate-200 bg-white hover:bg-slate-50'
          }`}
        >
          <span className="absolute inset-x-0 bottom-0 h-1.5 bg-rose-500" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-700">Đang sửa chữa (Hỏng)</span>
            <div className="rounded-xl p-2 bg-rose-50 text-rose-600">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-rose-700">
            {loading ? '...' : dynamicStats.repair.toLocaleString('vi-VN')}
          </div>
          <div className="mt-1 text-[11px] font-semibold text-rose-600 truncate">
            Hư hỏng tại Xưởng BTSC
          </div>
        </button>

        {/* Card 6: Thiếu đơn vị sử dụng */}
        <button
          type="button"
          onClick={() => navigate('/doi-xe/phan-xe')}
          className="relative overflow-hidden p-4 rounded-2xl border text-left transition-all hover:shadow-md cursor-pointer border-slate-200 bg-white hover:bg-slate-50"
        >
          <span className="absolute inset-x-0 bottom-0 h-1.5 bg-amber-500" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-700">Thiếu đơn vị sử dụng</span>
            <div className="rounded-xl p-2 bg-amber-50 text-amber-600">
              <HelpCircle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-amber-700">
            {loading ? '...' : `${dynamicStats.unassignedUnit.toLocaleString('vi-VN')}/${dynamicStats.total.toLocaleString('vi-VN')} (${dynamicStats.total > 0 ? ((dynamicStats.unassignedUnit / dynamicStats.total) * 100).toFixed(1) : '0'}%)`}
          </div>
          <div className="mt-1 text-[11px] font-semibold text-amber-600 truncate">
            Xe/máy và thiết bị chờ phân bổ →
          </div>
        </button>
      </div>

      {/* ═══ ROW 2: PHÂN LOẠI 6 CHỦNG LOẠI MÁY PHỤ TRỢ (TƯƠNG TỰ NHƯ TRANG THIẾT BỊ) ═══ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {Object.entries(OTHER_CATEGORY_META).map(([key, meta]) => {
          const Icon = meta.icon;
          const isSelected = selectedCategory === key;
          const count = categoryCounts[key] || 0;

          return (
            <button
              key={key}
              type="button"
              onClick={() => {
                setSelectedCategory((curr) => (curr === key ? ALL : key));
                setPage(1);
              }}
              className={`relative overflow-hidden p-4 rounded-2xl border text-left transition-all hover:shadow-md cursor-pointer ${
                isSelected ? `${meta.selectedClass} ring-2 ring-primary/30 scale-[1.01]` : 'border-slate-200 bg-white hover:bg-slate-50'
              }`}
            >
              <span className={`absolute inset-x-0 bottom-0 h-1.5 ${meta.barClass}`} />
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 truncate">{meta.label}</span>
                <div className={`rounded-xl p-2 border ${meta.iconClass}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2 text-2xl font-black text-slate-900">{count.toLocaleString('vi-VN')}</div>
              <div className="mt-1 text-[11px] font-semibold text-slate-500 truncate">{meta.desc}</div>
            </button>
          );
        })}
      </div>

      {/* ═══ ROW 3: THANH TÌM KIẾM & CHỨC NĂNG VẬN HÀNH (CHUẨN TRANG THIẾT BỊ) ═══ */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
        {/* ROW 1: HEADER ACTION BUTTONS */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <span className="font-heading text-sm font-extrabold text-slate-800 uppercase tracking-wide">
              Quản lý Máy phụ trợ & Khác
            </span>
            <span className="rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-bold text-violet-800">
              {dynamicStats.total.toLocaleString('vi-VN')} máy & tài sản
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <input ref={importInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImportExcel} />
            <button
              type="button"
              onClick={() => setIsCreatingAsset(true)}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-primary bg-primary px-3.5 text-xs font-black text-white shadow-xs transition-all hover:bg-primary-600 hover:scale-[1.01]"
            >
              <Plus className="h-4 w-4 stroke-[3]" />
              Thêm mới tài sản
            </button>

            <button
              type="button"
              onClick={() => void catalogsApi.downloadTemplate('EQUIPMENT')}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 text-xs font-bold text-emerald-800 transition-all hover:bg-emerald-100"
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              Tải file mẫu
            </button>

            <button
              type="button"
              onClick={() => importInputRef.current?.click()}
              disabled={importing}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-sky-200 bg-sky-50 px-3 text-xs font-bold text-sky-800 transition-all hover:bg-sky-100 disabled:opacity-50"
            >
              <Upload className="h-3.5 w-3.5" />
              {importing ? 'Đang import...' : 'Import Excel'}
            </button>

            <button
              type="button"
              onClick={handleExportExcel}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-bold text-slate-700 transition-all hover:bg-slate-100"
            >
              <Download className="h-3.5 w-3.5 text-emerald-700" />
              Xuất Excel
            </button>

            <button
              type="button"
              onClick={() => void loadAssets()}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-bold text-slate-700 transition-all hover:bg-slate-100"
              title="Làm mới dữ liệu"
            >
              <RotateCcw className="h-3.5 w-3.5 text-slate-500" />
              Làm mới
            </button>
          </div>
        </div>

        {importMessage && (
          <div
            className={`rounded-xl border px-3 py-2 text-xs font-semibold ${
              importMessage.startsWith('Đã import')
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                : 'border-rose-200 bg-rose-50 text-rose-700'
            }`}
          >
            {importMessage}
          </div>
        )}

        {/* ROW 2: SEARCH INPUT & ADVANCED FILTER TOGGLE */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center justify-between">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
                placeholder="Nhập mã tài sản, tên máy, nhãn hiệu, đơn vị quản lý, nơi tập kết..."
                className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-9 text-xs font-medium text-slate-800 outline-none focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/15"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={`inline-flex h-10 items-center gap-1.5 rounded-xl border px-3.5 text-xs font-bold transition-all ${
                showAdvancedFilters || activeFilterCount > 0
                  ? 'border-primary bg-primary-50 text-primary'
                  : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Bộ lọc nâng cao
              {activeFilterCount > 0 && (
                <span className="rounded-full bg-primary px-1.5 py-0.2 text-[10px] text-white font-bold">
                  {activeFilterCount}
                </span>
              )}
            </button>

            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex h-10 items-center gap-1 rounded-xl border border-rose-200 bg-rose-50 px-3 text-xs font-bold text-rose-700 hover:bg-rose-100"
                title="Xóa toàn bộ bộ lọc"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Đặt lại
              </button>
            )}
          </div>
        </div>

        {/* METADATA CỦA TOÀN BỘ BỘ LỌC NÂNG CAO (8 Ô LƯỚI CHUẨN 4 CỘT NHƯ EQUIPMENT PAGE) */}
        {showAdvancedFilters && (
          <div className="grid grid-cols-1 gap-3 border-t border-slate-100 pt-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                Đơn vị sử dụng (Xí nghiệp / Đội)
              </label>
              <SearchableSelect
                value={selectedUnit}
                onChange={(val) => {
                  setSelectedUnit(val);
                  setPage(1);
                }}
                options={unitSelectOptions}
                placeholder={`Tất cả đơn vị (${managementFilterUnits.length})`}
                emptyOptionLabel={`Tất cả đơn vị (${managementFilterUnits.length})`}
                heightClass="h-9"
                icon={<Building2 className="h-4 w-4" />}
              />
            </div>

            <div>
              <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                Đơn vị / Nơi tập kết ({locationSelectOptions.length} điểm)
              </label>
              <SearchableSelect
                value={selectedLocation}
                onChange={(val) => {
                  setSelectedLocation(val);
                  setPage(1);
                }}
                options={locationSelectOptions}
                placeholder={`Tất cả nơi tập kết (${locationSelectOptions.length})`}
                emptyOptionLabel={`Tất cả nơi tập kết (${locationSelectOptions.length})`}
                heightClass="h-9"
                icon={<MapPin className="h-4 w-4" />}
              />
            </div>

            <div>
              <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                Chủng loại máy ({categorySelectOptions.length} loại)
              </label>
              <SearchableSelect
                value={selectedCategory}
                onChange={(val) => {
                  setSelectedCategory(val);
                  setPage(1);
                }}
                options={categorySelectOptions}
                placeholder={`Tất cả chủng loại (${categorySelectOptions.length})`}
                emptyOptionLabel={`Tất cả chủng loại (${categorySelectOptions.length})`}
                heightClass="h-9"
                icon={<Boxes className="h-4 w-4" />}
              />
            </div>

            <div>
              <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                Khu liên hợp
              </label>
              <SearchableSelect
                value={selectedComplex}
                onChange={(val) => {
                  setSelectedComplex(val);
                  setSelectedRegion(ALL);
                  setSelectedUnit(ALL);
                  setPage(1);
                  useAppStore.getState().setSelectedKLH(val);
                }}
                options={complexSelectOptions}
                placeholder="Tất cả khu liên hợp"
                emptyOptionLabel="Tất cả khu liên hợp"
                heightClass="h-9"
                icon={<Building2 className="h-4 w-4" />}
              />
            </div>

            <div>
              <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                Khu vực địa lý
              </label>
              <SearchableSelect
                value={selectedRegion}
                onChange={(val) => {
                  setSelectedRegion(val);
                  setPage(1);
                }}
                options={regionSelectOptions}
                placeholder="Tất cả khu vực"
                emptyOptionLabel="Tất cả khu vực"
                heightClass="h-9"
                icon={<MapPin className="h-4 w-4" />}
              />
            </div>

            <div>
              <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                Hãng / Nhãn hiệu
              </label>
              <SearchableSelect
                value={selectedManufacturer}
                onChange={(val) => {
                  setSelectedManufacturer(val);
                  setPage(1);
                }}
                options={manufacturerSelectOptions}
                placeholder="Tất cả hãng"
                emptyOptionLabel="Tất cả hãng"
                heightClass="h-9"
                icon={<Tag className="h-4 w-4" />}
              />
            </div>

            <div>
              <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                Model
              </label>
              <SearchableSelect
                value={selectedModel}
                onChange={(val) => {
                  setSelectedModel(val);
                  setPage(1);
                }}
                options={modelSelectOptions}
                placeholder="Tất cả model"
                emptyOptionLabel="Tất cả model"
                heightClass="h-9"
                icon={<Table className="h-4 w-4" />}
              />
            </div>

            <div>
              <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                Tình trạng hoạt động
              </label>
              <SearchableSelect
                value={selectedStatus}
                onChange={(val) => {
                  setSelectedStatus(val);
                  setPage(1);
                }}
                options={statusSelectOptions}
                placeholder="Tất cả trạng thái"
                emptyOptionLabel="Tất cả trạng thái"
                heightClass="h-9"
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                Nhân sự quản lý
              </label>
              <SearchableSelect
                value={selectedManager}
                onChange={(val) => {
                  setSelectedManager(val);
                  setPage(1);
                }}
                options={managerSelectOptions}
                placeholder={`Tất cả nhân sự (${managementFilterManagers.length})`}
                emptyOptionLabel="Tất cả nhân sự quản lý"
                heightClass="h-9"
                icon={<Users className="h-4 w-4" />}
              />
            </div>
          </div>
        )}
      </section>

      {/* ═══ ROW 4: BẢNG HỒ SƠ CHUẨN MỰC: CÓ NÚT CHUYỂN ĐỔI CHẾ ĐỘ XEM ═══ */}
      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="flex flex-wrap items-center justify-between border-b border-slate-200 px-4 py-3 bg-slate-50/70">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-sm text-slate-900">Danh sách Máy phụ trợ & Thiết bị độc lập</span>
            <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-bold text-violet-800">
              {pagination.total.toLocaleString('vi-VN')} bản ghi
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500 text-[11px] font-semibold">Chế độ hiển thị:</span>
            <button
              type="button"
              onClick={() => setTableViewMode('excel_23')}
              className={`rounded-lg px-2.5 py-1 font-bold transition-all ${
                tableViewMode === 'excel_23'
                  ? 'bg-primary text-white shadow-xs'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              Toàn bộ Cột Chuẩn Excel
            </button>
            <button
              type="button"
              onClick={() => setTableViewMode('compact')}
              className={`rounded-lg px-2.5 py-1 font-bold transition-all ${
                tableViewMode === 'compact'
                  ? 'bg-primary text-white shadow-xs'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              Bảng Vận Hành Thu Gọn
            </button>
          </div>
        </div>

        {loadMsg && (
          <div className="rounded-none border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-800">
            {loadMsg}
          </div>
        )}

        <DataTable data={assets} columns={columns} isLoading={loading} showSearch={false} showExport={false} />

        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-100 px-4 py-2.5">
            <span className="text-[11px] text-slate-500">
              Trang {pagination.page}/{pagination.totalPages} · {pagination.total.toLocaleString('vi-VN')} máy & tài sản
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="h-7 w-7 p-0"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={page >= pagination.totalPages}
                className="h-7 w-7 p-0"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </section>

      {/* ═══ 7. MODAL XEM CHI TIẾT HỒ SƠ TÀI SẢN ═══ */}
      {selectedAsset && (
        <Modal
          isOpen
          onClose={() => setSelectedAsset(null)}
          title={`Hồ sơ chi tiết: ${selectedAsset.internalCode} - ${selectedAsset.brandModel}`}
          size="2xl"
        >
          <div className="space-y-4">
            {/* TABS ĐIỀU HƯỚNG CHI TIẾT */}
            <div className="flex border-b border-slate-200">
              <button
                type="button"
                onClick={() => setDetailTab('identity')}
                className={`flex items-center gap-1.5 border-b-2 px-4 py-2 text-xs font-bold transition-all ${
                  detailTab === 'identity'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <Tag className="h-3.5 w-3.5" />
                1. Định danh & Phân nhóm
              </button>
              <button
                type="button"
                onClick={() => setDetailTab('technical')}
                className={`flex items-center gap-1.5 border-b-2 px-4 py-2 text-xs font-bold transition-all ${
                  detailTab === 'technical'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <Wrench className="h-3.5 w-3.5" />
                2. Thông số kỹ thuật
              </button>
              <button
                type="button"
                onClick={() => setDetailTab('assignment')}
                className={`flex items-center gap-1.5 border-b-2 px-4 py-2 text-xs font-bold transition-all ${
                  detailTab === 'assignment'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <Building2 className="h-3.5 w-3.5" />
                3. Đơn vị & Quản lý
              </button>
              <button
                type="button"
                onClick={() => setDetailTab('repairs')}
                className={`flex items-center gap-1.5 border-b-2 px-4 py-2 text-xs font-bold transition-all ${
                  detailTab === 'repairs'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <Activity className="h-3.5 w-3.5" />
                4. Lịch sử bảo dưỡng ({repairHistory.length})
              </button>
            </div>

            {/* NỘI DUNG TỪNG TAB CHI TIẾT */}
            <div className="min-h-[260px]">
              {detailTab === 'identity' && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
                  <DetailField label="1. Mã tài sản mới" value={selectedAsset.internalCode} mono />
                  <DetailField label="2. Mã MMTB cũ" value={selectedAsset.oldCode} mono />
                  <DetailField label="3. Mã Bravo" value={(selectedAsset as any).bravoCode} mono />
                  <DetailField label="4. Tên máy / Thiết bị" value={selectedAsset.brandModel} />
                  <DetailField
                    label="5. Chủng loại máy"
                    value={
                      selectedAsset.vehicleTypeName ||
                      OTHER_CATEGORY_LABELS[selectedAsset.categoryCode || selectedAsset.vehicleCategory] ||
                      selectedAsset.vehicleCategory
                    }
                  />
                  <DetailField label="6. Nhóm tài sản" value="MÁY PHỤ TRỢ & KHÁC (ĐỘC LẬP)" />
                  <DetailField label="7. Khu liên hợp" value={selectedAsset.klhName || selectedAsset.complexCode} />
                  <DetailField label="8. Khu vực địa lý" value={selectedAsset.regionCode} />
                  <DetailField label="9. Trạng thái hoạt động" value={STATUS_META[selectedAsset.rawStatus || selectedAsset.status]?.label || selectedAsset.status} />
                </div>
              )}

              {detailTab === 'technical' && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
                  <DetailField label="10. Thương hiệu / Hãng" value={selectedAsset.manufacturer} />
                  <DetailField label="11. Model" value={selectedAsset.modelName} mono />
                  <DetailField label="12. Năm sản xuất" value={selectedAsset.yearManufactured} mono />
                  <DetailField label="13. Xuất xứ" value={selectedAsset.origin} />
                  <DetailField label="14. Số khung" value={selectedAsset.frameNumber} mono />
                  <DetailField label="15. Số máy / Động cơ" value={selectedAsset.engineNumber} mono />
                  <DetailField label="16. Công suất HP" value={selectedAsset.powerHp} />
                  <DetailField label="17. Dung tích bình dầu" value={selectedAsset.fuelTankCapacity ? `${selectedAsset.fuelTankCapacity} L` : '—'} />
                  <DetailField label="18. Định mức nhiên liệu" value={selectedAsset.fuelQuotaRate ? `${selectedAsset.fuelQuotaRate} L/h` : '—'} />
                </div>
              )}

              {detailTab === 'assignment' && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
                  <DetailField label="19. Đơn vị quản lý" value={selectedAsset.teamUnit || selectedAsset.assignedUnitCode} />
                  <DetailField
                    label="20. Địa chỉ (Nơi tập kết)"
                    value={selectedAsset.currentLocationName}
                    className="border-emerald-200 bg-emerald-50/60 font-bold"
                  />
                  <DetailField
                    label="21. Nhân sự quản lý"
                    value={selectedAsset.managerName}
                    className="border-blue-200 bg-blue-50/60 font-bold"
                  />
                  <DetailField
                    label="22. Số liên lạc (Zalo / SĐT)"
                    value={selectedAsset.managerPhone}
                    mono
                    className="border-blue-200 bg-blue-50/60"
                  />
                  <DetailField label="23. Tình trạng kỹ thuật" value={selectedAsset.conditionStatus || 'Bình thường'} />
                  <DetailField label="24. Ghi chú chuyển giao" value={selectedAsset.transferHistory || selectedAsset.notes} />
                </div>
              )}

              {detailTab === 'repairs' && (
                <div className="space-y-3">
                  {repairHistory.length > 0 ? (
                    repairHistory.map((repair: any) => (
                      <div key={repair.id} className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-xs">
                        <div className="flex items-center justify-between font-bold text-slate-800">
                          <span>Phiếu SC: {repair.code || `#${repair.id}`}</span>
                          <span className="text-amber-700">{repair.status}</span>
                        </div>
                        <p className="mt-1 text-slate-600">{repair.description || repair.reason || 'Sửa chữa định kỳ'}</p>
                        <div className="mt-2 grid gap-2 text-slate-500 sm:grid-cols-3">
                          <span>Báo bởi: {repair.reportedBy?.fullName || '—'}</span>
                          <span>Xưởng: {repair.workshop?.name || 'Xưởng BTSC'}</span>
                          <span>Ngày: {new Date(repair.createdAt).toLocaleDateString('vi-VN')}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-16 text-center text-xs text-slate-400">Chưa có lịch sử báo hỏng hay sửa chữa.</div>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setEditingAsset(selectedAsset);
                  setSelectedAsset(null);
                }}
              >
                <Edit className="mr-1.5 h-3.5 w-3.5" /> Chỉnh sửa
              </Button>
              <Button variant="outline" size="sm" onClick={() => setSelectedAsset(null)}>
                Đóng
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ═══ 8. MODAL CHỈNH SỬA / THÊM MỚI TÀI SẢN ═══ */}
      {(editingAsset || isCreatingAsset) && (
        <EditVehicleModal
          isOpen
          vehicle={editingAsset || ({} as any)}
          filterOptions={filterOptions as any}
          onClose={() => {
            setEditingAsset(null);
            setIsCreatingAsset(false);
          }}
          onSuccess={(updated) => {
            setAssets((prev) => {
              const idx = prev.findIndex((a) => a.id === updated.id);
              if (idx >= 0) {
                return prev.map((a) => (a.id === updated.id ? { ...a, ...updated } : a));
              }
              return [updated, ...prev];
            });
            setEditingAsset(null);
            setIsCreatingAsset(false);
            void loadAssets();
          }}
        />
      )}
    </div>
  );
};

export default OtherAssetsPage;
