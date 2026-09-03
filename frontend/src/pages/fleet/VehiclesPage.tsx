import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { DataTable, Column } from '../../components/data-display/DataTable';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { SearchableSelect, SelectOption } from '../../components/common/SearchableSelect';
import { EditVehicleModal } from '../../components/fleet/EditVehicleModal';
import { apiService } from '../../api/client';
import { catalogsApi } from '../../api/catalogsApi';
import { getStoredData } from '../../utils/storage';
import { mockRegions, CatalogItem } from '../../data/catalogData';
import { useAppStore } from '../../store/useAppStore';
import { VehicleFilterOptions, VehicleProfile, VehicleStatistics } from '../../types';
import { parseOperationalImport, toIsoDate } from '../../utils/operationalExcelTemplates';
import {
  AlertTriangle,
  Boxes,
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Database,
  Download,
  Edit,
  ExternalLink,
  Eye,
  FileSpreadsheet,
  Gauge,
  Info,
  Layers,
  MapPin,
  RadioTower,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Table,
  Tractor,
  Truck,
  WifiOff,
  Wrench,
  X,
  Image as ImageIcon,
  Tag,
  Calendar,
  Fuel,
  ShieldCheck,
  RotateCcw,
  UserCheck,
  Phone,
  Plus,
  Upload,
} from 'lucide-react';

type DetailTab = 'identity' | 'technical' | 'fuel' | 'assignment';
type TableViewMode = 'excel_23' | 'compact';

const ALL = 'ALL';

const STATUS_LABELS: Record<string, string> = {
  HOAT_DONG: 'Đang hoạt động (Bình thường)',
  TAM_DUNG: 'Thanh lý',
  CHO_PHAN_CONG: 'Chờ phân công',
  BAO_DUONG: 'Đang bảo dưỡng',
  SUA_CHUA: 'Đang sửa chữa (Hư hỏng)',
};

const GROUP_META = {
  MAY_CONG_TRINH: {
    label: 'Máy công trình',
    icon: Tractor,
    iconClass: 'bg-orange-50 text-orange-700 border-orange-200',
    selectedClass: 'border-orange-400 bg-orange-50/80 ring-orange-200',
    barClass: 'bg-orange-500',
  },
  MAY_NONG_NGHIEP: {
    label: 'Máy nông nghiệp',
    icon: Layers,
    iconClass: 'bg-lime-50 text-lime-700 border-lime-200',
    selectedClass: 'border-lime-400 bg-lime-50/80 ring-lime-200',
    barClass: 'bg-lime-500',
  },
  XE_VAN_TAI_CONG_VU: {
    label: 'Vận tải & công vụ',
    icon: Truck,
    iconClass: 'bg-sky-50 text-sky-700 border-sky-200',
    selectedClass: 'border-sky-400 bg-sky-50/80 ring-sky-200',
    barClass: 'bg-sky-500',
  },
  THIET_BI_PHU_TRO: {
    label: 'Phụ trợ & nông cụ',
    icon: Boxes,
    iconClass: 'bg-violet-50 text-violet-700 border-violet-200',
    selectedClass: 'border-violet-400 bg-violet-50/80 ring-violet-200',
    barClass: 'bg-violet-500',
  },
} as const;

const EMPTY_FILTER_OPTIONS: VehicleFilterOptions = {
  complexes: [], regions: [], assignedUnits: [], assetGroups: [], vehicleTypes: [],
  manufacturers: [], models: [], origins: [], manufactureYears: [], statuses: [], alertTiers: [],
};

const displayValue = (value?: React.ReactNode) => {
  if (value === null || value === undefined || value === '') return '—';
  return value;
};

const formatQuota = (vehicle: VehicleProfile) => {
  if (vehicle.fuelQuotaRate === null || vehicle.fuelQuotaRate === undefined) return '—';
  const unit =
    vehicle.fuelQuotaUnit === 'L_PER_KM'
      ? 'L/100km'
      : vehicle.fuelQuotaUnit === 'L_PER_HA'
        ? 'L/ha'
        : vehicle.fuelQuotaUnit === 'L_PER_HOUR'
          ? 'L/h'
          : vehicle.fuelQuotaUnit || '';
  return `${vehicle.fuelQuotaRate.toLocaleString('vi-VN')} ${unit}`.trim();
};

const statusMeta = (status: VehicleProfile['status']) => {
  if (status === 'active') return { label: 'Bình thường', variant: 'green' as const, badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
  if (status === 'maintenance') return { label: 'Đang bảo dưỡng', variant: 'amber' as const, badgeClass: 'bg-amber-50 text-amber-700 border-amber-200' };
  if (status === 'repair') return { label: 'Hư hỏng / Sửa chữa', variant: 'red' as const, badgeClass: 'bg-rose-50 text-rose-700 border-rose-200' };
  return { label: 'Chờ phân công', variant: 'gray' as const, badgeClass: 'bg-slate-50 text-slate-700 border-slate-200' };
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

export const VehiclesPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const categoryParam = searchParams.get('category');
  const unitParam = searchParams.get('unit');

  const [selectedVehicle, setSelectedVehicle] = useState<VehicleProfile | null>(null);
  const [editingVehicle, setEditingVehicle] = useState<VehicleProfile | null>(null);
  const [isCreatingVehicle, setIsCreatingVehicle] = useState(false);
  const [detailTab, setDetailTab] = useState<DetailTab>('identity');
  const [showImagePreview, setShowImagePreview] = useState<string | null>(null);
  const [tableViewMode, setTableViewMode] = useState<TableViewMode>('excel_23');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  const [vehicles, setVehicles] = useState<VehicleProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadMessage, setLoadMessage] = useState('');
  const [importing, setImporting] = useState(false);
  const [importMessage, setImportMessage] = useState('');
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const [filterOptions, setFilterOptions] = useState<VehicleFilterOptions>(EMPTY_FILTER_OPTIONS);
  const [fleetStats, setFleetStats] = useState<VehicleStatistics | null>(null);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 20, totalPages: 1 });

  // Database-driven regions
  const [dbRegions, setDbRegions] = useState<CatalogItem[]>(() =>
    getStoredData('catalogs_regions', mockRegions)
  );

  useEffect(() => {
    catalogsApi.getCatalogs('REGION', 'catalogs_regions', mockRegions).then((data) => {
      if (Array.isArray(data) && data.length > 0) setDbRegions(data);
    });
  }, []);

  // Global KLH from Header Filter
  const globalKLH = useAppStore((state) => state.selectedKLH);

  // Filter state is sent to MySQL through GET /api/vehicles.
  const [selectedComplex, setSelectedComplex] = useState(globalKLH || ALL);

  useEffect(() => {
    if (globalKLH !== undefined) {
      setSelectedComplex(globalKLH);
      setSelectedRegion(ALL);
      setSelectedUnit(ALL);
      setPage(1);
    }
  }, [globalKLH]);

  useEffect(() => {
    const handleKlhChanged = (e: any) => {
      const newKlh = e.detail?.klh || ALL;
      setSelectedComplex(newKlh);
      setSelectedRegion(ALL);
      setSelectedUnit(ALL);
      setPage(1);
    };
    window.addEventListener('thaco_klh_changed', handleKlhChanged);
    return () => window.removeEventListener('thaco_klh_changed', handleKlhChanged);
  }, []);
  const [selectedRegion, setSelectedRegion] = useState(ALL);
  const [selectedGroup, setSelectedGroup] = useState(ALL);
  const [selectedCategory, setSelectedCategory] = useState(categoryParam || ALL);
  const [selectedStatus, setSelectedStatus] = useState(ALL);
  const [selectedUnit, setSelectedUnit] = useState(unitParam || ALL);
  const [selectedLocation, setSelectedLocation] = useState(ALL);
  const [selectedManufacturer, setSelectedManufacturer] = useState(ALL);
  const [selectedModel, setSelectedModel] = useState(ALL);
  const [selectedOrigin, setSelectedOrigin] = useState(ALL);
  const [selectedYear, setSelectedYear] = useState(ALL);
  const [selectedAlertTier, setSelectedAlertTier] = useState(ALL);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const loadVehicles = async () => {
    setLoading(true);
    setLoadMessage('');
    try {
      const response = await apiService.getVehiclesPage({
        page,
        limit: 20,
        search: debouncedSearch || undefined,
        complexCode: selectedComplex !== ALL ? selectedComplex : undefined,
        regionCode: selectedRegion !== ALL ? selectedRegion : undefined,
        assignedUnitCode: selectedUnit !== ALL ? selectedUnit : undefined,
        currentLocationName: selectedLocation !== ALL ? selectedLocation : undefined,
        assetGroup: selectedGroup !== ALL ? selectedGroup : undefined,
        vehicleTypeCode: selectedCategory !== ALL ? selectedCategory : undefined,
        manufacturer: selectedManufacturer !== ALL ? selectedManufacturer : undefined,
        modelName: selectedModel !== ALL ? selectedModel : undefined,
        origin: selectedOrigin !== ALL ? selectedOrigin : undefined,
        manufactureYear: selectedYear !== ALL ? Number(selectedYear) : undefined,
        status: selectedStatus !== ALL ? selectedStatus : undefined,
        alertTier: selectedAlertTier !== ALL ? selectedAlertTier : undefined,
      });
      setVehicles(response.items);
      setPagination(response.pagination);
    } catch (error) {
      setVehicles([]);
      setPagination({ total: 0, page: 1, limit: 20, totalPages: 1 });
      setLoadMessage('Không kết nối được API đội xe hoặc chưa có dữ liệu.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void apiService
      .getVehicleStatistics({
        assetGroup: selectedGroup !== ALL ? selectedGroup : undefined,
        complexCode: selectedComplex !== ALL ? selectedComplex : undefined,
        regionCode: selectedRegion !== ALL ? selectedRegion : undefined,
        assignedUnitCode: selectedUnit !== ALL ? selectedUnit : undefined,
      })
      .then(setFleetStats)
      .catch(() => setLoadMessage('Không tải được metadata bộ lọc từ database.'));
  }, [selectedGroup, selectedComplex, selectedRegion, selectedUnit]);

  useEffect(() => {
    void apiService
      .getVehicleFilterOptions({
        complexCode: selectedComplex !== ALL ? selectedComplex : undefined,
        regionCode: selectedRegion !== ALL ? selectedRegion : undefined,
        assignedUnitCode: selectedUnit !== ALL ? selectedUnit : undefined,
        currentLocationName: selectedLocation !== ALL ? selectedLocation : undefined,
        assetGroup: selectedGroup !== ALL ? selectedGroup : undefined,
        vehicleTypeCode: selectedCategory !== ALL ? selectedCategory : undefined,
        manufacturer: selectedManufacturer !== ALL ? selectedManufacturer : undefined,
        modelName: selectedModel !== ALL ? selectedModel : undefined,
        origin: selectedOrigin !== ALL ? selectedOrigin : undefined,
        status: selectedStatus !== ALL ? selectedStatus : undefined,
        alertTier: selectedAlertTier !== ALL ? selectedAlertTier : undefined,
      })
      .then(setFilterOptions)
      .catch(() => {});
  }, [
    selectedComplex,
    selectedRegion,
    selectedUnit,
    selectedLocation,
    selectedGroup,
    selectedCategory,
    selectedManufacturer,
    selectedModel,
    selectedOrigin,
    selectedStatus,
    selectedAlertTier,
  ]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(searchTerm.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    setPage(1);
  }, [
    selectedComplex,
    selectedRegion,
    selectedUnit,
    selectedLocation,
    selectedGroup,
    selectedCategory,
    selectedManufacturer,
    selectedModel,
    selectedOrigin,
    selectedYear,
    selectedStatus,
    selectedAlertTier,
  ]);

  useEffect(() => {
    void loadVehicles();
  }, [
    page,
    debouncedSearch,
    selectedComplex,
    selectedRegion,
    selectedUnit,
    selectedLocation,
    selectedGroup,
    selectedCategory,
    selectedManufacturer,
    selectedModel,
    selectedOrigin,
    selectedYear,
    selectedStatus,
    selectedAlertTier,
  ]);

  // Update filter when query param changes
  useEffect(() => {
    if (categoryParam) {
      setSelectedCategory(categoryParam);
      setPage(1);
    }
    if (unitParam) {
      setSelectedUnit(unitParam);
      setPage(1);
    }
  }, [categoryParam, unitParam]);

  const groupOptions = useMemo(() => filterOptions.assetGroups.map((key) => {
    const meta = GROUP_META[key as keyof typeof GROUP_META] || GROUP_META.THIET_BI_PHU_TRO;
    const typeCount = filterOptions.vehicleTypes.filter((item) => item.assetGroup === key).length;
    return { key, ...meta, description: `${typeCount} chủng loại từ database` };
  }), [filterOptions]);

  const groupCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    filterOptions.vehicleTypes.forEach((type) => {
      if (type.assetGroup) counts[type.assetGroup] = (counts[type.assetGroup] || 0) + type.vehicleCount;
    });
    return counts;
  }, [filterOptions]);

  const operationalStats = useMemo(() => {
    const total = Number(fleetStats?.totalVehicles ?? pagination.total);
    const active = Number((fleetStats?.running || 0) + (fleetStats?.waitingDispatch || 0) + (fleetStats?.standby || 0));
    const damaged = Number(fleetStats?.repair || 0);
    const gpsAttached = Number(fleetStats?.gpsAttached || 0);

    return {
      total,
      active,
      damaged,
      gpsAttached,
      damagedRatio: total > 0 ? `${damaged}/${total} (${((damaged / total) * 100).toFixed(1)}%)` : '0/0 (0%)',
    };
  }, [fleetStats, pagination.total]);

  const categoryOptions = useMemo(() => {
    return filterOptions.vehicleTypes.filter(
      (item) => selectedGroup === ALL || item.assetGroup === selectedGroup,
    );
  }, [filterOptions, selectedGroup]);

  const unitOptions = filterOptions.assignedUnits;
  const filteredVehicles = vehicles;

  // Memoized options for SearchableSelect controls
  const unitSelectOptions = useMemo<SelectOption[]>(() => {
    return unitOptions.map((u) => ({ value: u, label: u }));
  }, [unitOptions]);

  const locationOptions = useMemo(() => filterOptions.locations || [], [filterOptions.locations]);
  const locationSelectOptions = useMemo<SelectOption[]>(() => {
    return locationOptions.map((loc) => ({ value: loc, label: loc }));
  }, [locationOptions]);

  const categorySelectOptions = useMemo<SelectOption[]>(() => {
    return categoryOptions.map((c) => ({
      value: c.code,
      label: c.name,
      subLabel: `${c.vehicleCount} xe`,
    }));
  }, [categoryOptions]);

  const complexSelectOptions = useMemo<SelectOption[]>(() => {
    return filterOptions.complexes.map((c) => ({ value: c, label: c }));
  }, [filterOptions.complexes]);

  const regionSelectOptions = useMemo<SelectOption[]>(() => {
    const isMatchComplex = (pCode?: string, pName?: string) => {
      if (selectedComplex === ALL) return true;
      const comp = selectedComplex.toUpperCase();
      const c = (pCode || '').toUpperCase();
      const n = (pName || '').toUpperCase();
      if (comp === 'KOUN_MOM' || comp === 'KM') {
        return c === 'KOUN_MOM' || c === 'KM' || c === 'KLH_KM' || n.includes('KOUN MOM');
      }
      if (comp === 'SNOUL' || comp === 'SN') {
        return c === 'SNOUL' || c === 'SN' || c === 'KLH_SN' || n.includes('SNOUL');
      }
      if (comp === 'NAM_LAO' || comp === 'NL') {
        return c === 'NAM_LAO' || c === 'NL' || c === 'KLH_NL' || n.includes('NAM LÀO') || n.includes('NAM LAO') || n.includes('LÀO');
      }
      return c === comp || n.includes(comp);
    };

    const matching = dbRegions.filter((r) => isMatchComplex(r.parentCode, r.parentName));

    if (matching.length > 0) {
      return matching.map((r) => ({
        value: r.code,
        label: r.name ? (r.name.includes(r.code) ? r.name : `${r.code} - ${r.name}`) : r.code,
      }));
    }

    return filterOptions.regions.map((r) => ({ value: r, label: r }));
  }, [dbRegions, selectedComplex, filterOptions.regions]);

  const handleSelectComplex = (complex: string) => {
    setSelectedComplex(complex);
    setSelectedRegion(ALL);
    setSelectedUnit(ALL);
    setPage(1);
    useAppStore.getState().setSelectedKLH(complex);
  };

  const manufacturerSelectOptions = useMemo<SelectOption[]>(() => {
    return filterOptions.manufacturers.map((mf) => {
      const isObj = typeof mf === 'object' && mf !== null;
      const name = isObj ? (mf as any).name : String(mf);
      const count = isObj && typeof (mf as any).vehicleCount === 'number' ? `${(mf as any).vehicleCount} xe` : undefined;
      return { value: name, label: name, subLabel: count };
    });
  }, [filterOptions.manufacturers]);

  const modelSelectOptions = useMemo<SelectOption[]>(() => {
    return filterOptions.models
      .filter((m) => {
        if (selectedManufacturer === ALL) return true;
        if (typeof m === 'object' && m !== null) {
          const mObj = m as any;
          const matchingMf = filterOptions.manufacturers.find((mf: any) =>
            typeof mf === 'object' && mf !== null && mf.name === selectedManufacturer && mf.id === mObj.manufacturerId
          );
          return matchingMf !== undefined;
        }
        return true;
      })
      .map((m) => {
        const isObj = typeof m === 'object' && m !== null;
        const name = isObj ? (m as any).name : String(m);
        const count = isObj && typeof (m as any).vehicleCount === 'number' ? `${(m as any).vehicleCount} xe` : undefined;
        return { value: name, label: name, subLabel: count };
      });
  }, [filterOptions.models, filterOptions.manufacturers, selectedManufacturer]);

  const originSelectOptions = useMemo<SelectOption[]>(() => {
    return filterOptions.origins.map((item) => {
      const isObj = typeof item === 'object' && item !== null;
      const name = isObj ? (item as any).name : String(item);
      const count = isObj && typeof (item as any).vehicleCount === 'number' ? `${(item as any).vehicleCount} xe` : undefined;
      return { value: name, label: name, subLabel: count };
    });
  }, [filterOptions.origins]);

  const yearSelectOptions = useMemo<SelectOption[]>(() => {
    return filterOptions.manufactureYears.map((item) => {
      const isObj = typeof item === 'object' && item !== null;
      const year = isObj ? String((item as any).year) : String(item);
      const count = isObj && typeof (item as any).vehicleCount === 'number' ? `${(item as any).vehicleCount} xe` : undefined;
      return { value: year, label: `Năm ${year}`, subLabel: count };
    });
  }, [filterOptions.manufactureYears]);

  const statusSelectOptions = useMemo<SelectOption[]>(() => {
    return filterOptions.statuses.map((s) => ({ value: s, label: STATUS_LABELS[s] || s }));
  }, [filterOptions.statuses]);

  const alertTierSelectOptions = useMemo<SelectOption[]>(() => {
    return filterOptions.alertTiers.map((t) => ({
      value: t,
      label: t === 'RED' ? 'Cảnh báo Đỏ (≤20h)' : t === 'AMBER' ? 'Cảnh báo Vàng (≤50h)' : 'Bình thường (Xanh)',
    }));
  }, [filterOptions.alertTiers]);

  const activeFilterCount = [
    searchTerm.trim() ? 'search' : '',
    selectedComplex !== ALL ? selectedComplex : '',
    selectedGroup !== ALL ? selectedGroup : '',
    selectedRegion !== ALL ? selectedRegion : '',
    selectedCategory !== ALL ? selectedCategory : '',
    selectedStatus !== ALL ? selectedStatus : '',
    selectedUnit !== ALL ? selectedUnit : '',
    selectedLocation !== ALL ? selectedLocation : '',
    selectedManufacturer !== ALL ? selectedManufacturer : '',
    selectedModel !== ALL ? selectedModel : '',
    selectedOrigin !== ALL ? selectedOrigin : '',
    selectedYear !== ALL ? selectedYear : '',
    selectedAlertTier !== ALL ? selectedAlertTier : '',
  ].filter(Boolean).length;

  const resetFilters = () => {
    setSelectedComplex(ALL);
    setSelectedRegion(ALL);
    setSelectedGroup(ALL);
    setSelectedCategory(ALL);
    setSelectedStatus(ALL);
    setSelectedUnit(ALL);
    setSelectedLocation(ALL);
    setSelectedManufacturer(ALL);
    setSelectedModel(ALL);
    setSelectedOrigin(ALL);
    setSelectedYear(ALL);
    setSelectedAlertTier(ALL);
    setSearchTerm('');
    setPage(1);
  };

  const selectGroup = (group: string) => {
    setSelectedGroup((current) => (current === group ? ALL : group));
    setSelectedCategory(ALL);
  };

  const openVehicle = (vehicle: VehicleProfile) => {
    setDetailTab('identity');
    setSelectedVehicle(vehicle);
  };

  const handleEditVehicle = (vehicle: VehicleProfile) => {
    setEditingVehicle(vehicle);
  };

  const handleEditSuccess = (updatedVehicle: VehicleProfile) => {
    setVehicles((prev) =>
      prev.map((v) => (v.id === updatedVehicle.id ? { ...v, ...updatedVehicle } : v))
    );
    if (selectedVehicle && selectedVehicle.id === updatedVehicle.id) {
      setSelectedVehicle({ ...selectedVehicle, ...updatedVehicle });
    }
    void apiService.getVehicleStatistics().then(setFleetStats).catch(() => {});
  };

  // Full 23-column Excel export
  const handleExportExcel = async () => {
    try {
      const exportVehicles = await apiService.getVehicles({
        search: debouncedSearch || undefined,
        complexCode: selectedComplex !== ALL ? selectedComplex : undefined,
        regionCode: selectedRegion !== ALL ? selectedRegion : undefined,
        assignedUnitCode: selectedUnit !== ALL ? selectedUnit : undefined,
        assetGroup: selectedGroup !== ALL ? selectedGroup : undefined,
        vehicleTypeCode: selectedCategory !== ALL ? selectedCategory : undefined,
        manufacturer: selectedManufacturer !== ALL ? selectedManufacturer : undefined,
        modelName: selectedModel !== ALL ? selectedModel : undefined,
        origin: selectedOrigin !== ALL ? selectedOrigin : undefined,
        manufactureYear: selectedYear !== ALL ? Number(selectedYear) : undefined,
        status: selectedStatus !== ALL ? selectedStatus : undefined,
        alertTier: selectedAlertTier !== ALL ? selectedAlertTier : undefined,
      });
      const XLSX = await import('xlsx');
      const exportData = exportVehicles.map((v, index) => ({
        'TT': index + 1,
        'Mã MMTB mới': v.internalCode,
        'Mã MMTB cũ': v.oldCode || '',
        'Mã Bravo': v.bravoCode || '',
        'Biển số xe': v.plateNumber === 'Chưa gắn biển' ? '' : v.plateNumber,
        'Tình trạng mua': v.purchaseCondition || 'Mua mới',
        'Tên MMTB': v.brandModel || '',
        'Đơn vị sử dụng': v.teamUnit || v.assignedUnitCode || '',
        'Nhân sự quản lý': v.managerName || '',
        'Địa chỉ (Nơi tập kết)': v.currentLocationName || '',
        'Số liên lạc (zalo)': v.managerPhone || '',
        'Ngày phân bổ': v.allocationDate || '',
        'Tình trạng Hỏng': v.conditionStatus || 'Bình thường',
        'Lịch sử điều chuyển': v.transferHistory || '',
        'NHÃN HIỆU': v.manufacturer || '',
        'XUẤT XỨ': v.origin || '',
        'NĂM SX': v.yearManufactured || '',
        'MODEL': v.modelName || '',
        'CÔNG SUẤT': v.powerHp || '',
        'Số khung': v.frameNumber || '',
        'Số máy': v.engineNumber || '',
        'Định mức nhiên liệu': v.fuelQuotaRate ? `${v.fuelQuotaRate} ${v.fuelQuotaUnit || ''}` : '',
        'Dung tích thùng nhiên liệu (lít)': v.fuelTankCapacity || '',
        'NHÀ CUNG CẤP': v.supplier || 'THACO AGRI',
        'Ghi chú': v.notes || '',
        'Hình ảnh MMTB': v.imageUrl || '',
        'Tài xế phụ trách': v.currentDriver || '',
        'Chủng loại hệ thống': v.vehicleCategory || '',
        'Nhóm MMTB': v.categoryGroup || '',
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'HO_SO_MMTB_23_TRUONG');
      XLSX.writeFile(
        workbook,
        `HO_SO_MMTB_THACO_AGRI_KOUN_MOM_${new Date().toISOString().slice(0, 10)}.xlsx`
      );
    } catch (error) {
      console.error('Không thể xuất danh sách hồ sơ xe', error);
      setLoadMessage('Không thể xuất Excel từ dữ liệu đang lọc.');
    }
  };

  const handleImportExcel = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setImporting(true);
    setImportMessage('');
    try {
      const rows = await parseOperationalImport(file, 'VEHICLE');
      if (rows.length === 0) throw new Error('File không có dòng dữ liệu mới (dòng ví dụ được tự động bỏ qua).');
      let imported = 0;
      for (const row of rows) {
        if (!row.code || !row.name || !row.assetGroup || !row.category || !row.complexCode || !row.assignedUnitCode || !row.status) {
          throw new Error(`Dòng ${imported + 2} thiếu một hoặc nhiều trường bắt buộc (*).`);
        }
        const payload: Record<string, unknown> = { ...row, unit: 'BAN_CO_GIOI' };
        ['manufactureYear', 'fuelQuotaRate', 'fuelTankCapacity', 'totalMachineHours', 'odoKm'].forEach((key) => {
          if (payload[key] !== undefined && payload[key] !== '') payload[key] = Number(payload[key]);
          else delete payload[key];
        });
        ['inspectionExpiryDate', 'roadFeeExpiryDate'].forEach((key) => {
          const date = toIsoDate(payload[key]);
          if (date) payload[key] = date;
          else delete payload[key];
        });
        if (payload.status === 'DANG_SUA_CHUA') payload.status = 'SUA_CHUA';
        delete payload.gpsImei;
        delete payload.fuelSensorImei;
        await apiService.createVehicle(payload);
        imported += 1;
      }
      setImportMessage(`Đã import thành công ${imported} phương tiện.`);
      await loadVehicles();
    } catch (error: any) {
      setImportMessage(error?.response?.data?.message || error?.message || 'Import hồ sơ xe thất bại.');
    } finally {
      setImporting(false);
    }
  };

  // --------------------------------------------------------------------------
  // TABLE COLUMNS DEFINITION
  // --------------------------------------------------------------------------
  const renderTechnicalConditionBadge = (v: VehicleProfile) => {
    const raw = v.rawStatus || v.status;
    const cond = (v.conditionStatus || '').toLowerCase();

    // 1. Kiểm tra trạng thái bình thường (Ưu tiên kiểm tra trước)
    const isNormal =
      raw === 'HOAT_DONG' ||
      raw === 'active' ||
      cond.includes('bình thường') ||
      cond === 'hoạt động';

    if (isNormal) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-extrabold text-emerald-700">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          Đang hoạt động (Bình thường)
        </span>
      );
    }

    // 2. Đang sửa chữa / Hư hỏng
    const isRepair =
      raw === 'SUA_CHUA' ||
      raw === 'repair' ||
      cond.includes('hư hỏng') ||
      cond.includes('hỏng') ||
      cond.includes('sửa chữa') ||
      cond.includes('chờ sửa');

    if (isRepair) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-rose-300 bg-rose-50 px-2.5 py-0.5 text-[10px] font-extrabold text-rose-700">
          <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
          Đang sửa chữa (Hư hỏng)
        </span>
      );
    }

    // 3. Đang bảo dưỡng
    const isMaintenance =
      raw === 'BAO_DUONG' ||
      raw === 'maintenance' ||
      cond.includes('bảo dưỡng');

    if (isMaintenance) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2.5 py-0.5 text-[10px] font-extrabold text-amber-700">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
          Đang bảo dưỡng
        </span>
      );
    }

    // 4. Thanh lý / Tạm dừng
    const isStandby =
      raw === 'TAM_DUNG' ||
      raw === 'standby' ||
      cond.includes('thanh lý') ||
      cond.includes('tạm dừng');

    if (isStandby) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-slate-100 px-2.5 py-0.5 text-[10px] font-extrabold text-slate-700">
          <span className="h-1.5 w-1.5 rounded-full bg-slate-500" />
          Thanh lý
        </span>
      );
    }

    // 5. Chờ phân công
    const isWaiting =
      raw === 'CHO_PHAN_CONG' ||
      raw === 'idle' ||
      cond.includes('chờ phân công') ||
      cond.includes('chờ');

    if (isWaiting) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-sky-300 bg-sky-50 px-2.5 py-0.5 text-[10px] font-extrabold text-sky-700">
          <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />
          Chờ phân công
        </span>
      );
    }

    // Mặc định an toàn: Bình thường
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-extrabold text-emerald-700">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        Đang hoạt động (Bình thường)
      </span>
    );
  };

  const compactColumns: Column<VehicleProfile>[] = [
    {
      key: 'internalCode',
      title: 'MÃ MMTB & ERP',
      sortable: true,
      width: '160px',
      render: (v) => (
        <div>
          <button
            type="button"
            onClick={() => openVehicle(v)}
            className="text-left font-mono text-xs font-extrabold text-[#15803d] hover:underline"
          >
            {v.internalCode}
          </button>
          <div className="flex items-center gap-1 mt-0.5">
            {v.bravoCode ? (
              <span className="inline-flex rounded border border-emerald-200 bg-emerald-50 px-1 py-0.2 font-mono text-[9px] font-bold text-emerald-800">
                ERP: {v.bravoCode}
              </span>
            ) : v.oldCode ? (
              <span className="font-mono text-[10px] text-slate-500">Cũ: {v.oldCode}</span>
            ) : (
              <span className="text-[10px] text-slate-400">{v.categoryGroup || '—'}</span>
            )}
          </div>
        </div>
      ),
      filterElement: (
        <div className="relative">
          <Search className="absolute left-1.5 top-1/2 h-3 w-3 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Lọc mã/tên..."
            className="h-7 w-full rounded border border-slate-300 bg-white pl-5 pr-1 text-[11px] text-slate-800 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
          />
        </div>
      ),
    },
    {
      key: 'brandModel',
      title: 'TÊN THIẾT BỊ & CHỦNG LOẠI',
      sortable: true,
      render: (v) => (
        <div className="max-w-[280px] whitespace-normal">
          <div className="text-xs font-bold text-slate-900 leading-tight">
            {v.brandModel || `${v.manufacturer || ''} ${v.modelName || ''}`.trim() || '—'}
          </div>
          <div className="text-[10px] font-semibold text-slate-500 mt-0.5">
            {v.vehicleCategory} {v.manufacturer ? `· ${v.manufacturer}` : ''}
          </div>
        </div>
      ),
      filterElement: (
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="h-7 w-full rounded border border-slate-300 bg-white px-1 text-[11px] text-slate-800 outline-none focus:border-emerald-600"
        >
          <option value={ALL}>Tất cả loại xe</option>
          {categorySelectOptions.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      ),
    },
    {
      key: 'plateNumber',
      title: 'BIỂN SỐ / NĂM SX',
      sortable: true,
      width: '140px',
      render: (v) => (
        <div>
          {v.plateNumber && v.plateNumber !== 'Chưa gắn biển' ? (
            <span className="inline-flex rounded-md border border-slate-300 bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-extrabold text-slate-800">
              {v.plateNumber}
            </span>
          ) : (
            <span className="text-[10px] text-slate-400 italic">Chưa gắn biển</span>
          )}
          <div className="text-[10px] text-slate-500 mt-0.5">
            {v.origin || 'VN'}{v.yearManufactured ? ` · SX ${v.yearManufactured}` : ''}
          </div>
        </div>
      ),
      filterElement: (
        <select
          value={selectedYear}
          onChange={(e) => setSelectedYear(e.target.value)}
          className="h-7 w-full rounded border border-slate-300 bg-white px-1 text-[11px] text-slate-800 outline-none focus:border-emerald-600"
        >
          <option value={ALL}>Tất cả năm</option>
          {yearSelectOptions.map((y) => (
            <option key={y.value} value={y.value}>
              {y.label}
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
      render: (v) => (
        <div>
          <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-800">
            <Building2 className="h-3 w-3 text-slate-500 shrink-0" />
            <span className="truncate max-w-[150px]">{v.teamUnit || v.assignedUnitCode || 'Chờ phân bổ'}</span>
          </span>
          {v.currentLocationName && (
            <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-800 mt-0.5 truncate max-w-[170px]" title={`Nơi tập kết: ${v.currentLocationName}`}>
              <MapPin className="h-3 w-3 text-emerald-600 shrink-0" />
              <span>{v.currentLocationName}</span>
            </div>
          )}
          {v.managerName && (
            <div className="flex items-center gap-1 text-[10px] text-slate-600 mt-0.5 truncate max-w-[170px]" title={`Nhân sự quản lý: ${v.managerName}${v.managerPhone ? ` - ${v.managerPhone}` : ''}`}>
              <UserCheck className="h-3 w-3 text-blue-600 shrink-0" />
              <span>{v.managerName}{v.managerPhone ? ` · ${v.managerPhone}` : ''}</span>
            </div>
          )}
        </div>
      ),
      filterElement: (
        <select
          value={selectedUnit}
          onChange={(e) => setSelectedUnit(e.target.value)}
          className="h-7 w-full rounded border border-slate-300 bg-white px-1 text-[11px] text-slate-800 outline-none focus:border-emerald-600"
        >
          <option value={ALL}>Tất cả đơn vị</option>
          {unitSelectOptions.map((u) => (
            <option key={u.value} value={u.value}>
              {u.label}
            </option>
          ))}
        </select>
      ),
    },
    {
      key: 'fuelQuotaRate',
      title: 'ĐỊNH MỨC DẦU',
      sortable: true,
      width: '130px',
      render: (v) => (
        <span className="font-mono text-xs font-extrabold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
          {formatQuota(v)}
        </span>
      ),
    },
    {
      key: 'conditionStatus',
      title: 'TÌNH TRẠNG KỸ THUẬT',
      sortable: true,
      width: '160px',
      render: (v) => renderTechnicalConditionBadge(v),
      filterElement: (
        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="h-7 w-full rounded border border-slate-300 bg-white px-1 text-[11px] text-slate-800 outline-none focus:border-emerald-600"
        >
          <option value={ALL}>Tất cả</option>
          {statusSelectOptions.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      ),
    },
    {
      key: 'actions',
      title: 'THAO TÁC',
      width: '145px',
      align: 'center',
      render: (v) => (
        <div className="flex items-center justify-center gap-1.5">
          <Button
            size="sm"
            variant="outline"
            onClick={() => openVehicle(v)}
            className="h-7 text-[11px] px-2 font-bold"
            title="Xem chi tiết lý lịch xe"
          >
            <Eye className="h-3 w-3 mr-1" /> Chi tiết
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleEditVehicle(v)}
            className="h-7 text-[11px] px-2 font-bold border-amber-300 text-amber-800 bg-amber-50/70 hover:bg-amber-100 hover:border-amber-400"
            title="Chỉnh sửa thông tin hồ sơ xe"
          >
            <Edit className="h-3 w-3 mr-1 text-amber-700" /> Sửa
          </Button>
        </div>
      ),
      filterElement: (searchTerm || selectedUnit !== ALL || selectedCategory !== ALL || selectedStatus !== ALL || selectedYear !== ALL) ? (
        <button
          type="button"
          onClick={() => {
            setSearchTerm('');
            setSelectedUnit(ALL);
            setSelectedCategory(ALL);
            setSelectedStatus(ALL);
            setSelectedYear(ALL);
            setSelectedComplex(ALL);
            setSelectedRegion(ALL);
            setSelectedManufacturer(ALL);
            setSelectedModel(ALL);
            setSelectedOrigin(ALL);
            setSelectedAlertTier(ALL);
          }}
          className="inline-flex items-center justify-center gap-1 rounded bg-rose-50 px-1.5 py-1 text-[10px] font-bold text-rose-700 hover:bg-rose-100 border border-rose-200 w-full transition-colors"
          title="Xóa toàn bộ lọc"
        >
          <RotateCcw className="h-3 w-3" /> Đặt lại
        </button>
      ) : null,
    },
  ];

  // Full 23-column Excel format
  const full23Columns: Column<VehicleProfile>[] = [
    {
      key: 'internalCode',
      title: 'MÃ MMTB MỚI',
      sortable: true,
      width: '145px',
      render: (v) => (
        <div>
          <button
            type="button"
            onClick={() => openVehicle(v)}
            className="text-left font-mono text-xs font-extrabold text-[#15803d] hover:underline"
          >
            {v.internalCode}
          </button>
          <div className="text-[10px] text-slate-400">{v.categoryGroup}</div>
        </div>
      ),
    },
    {
      key: 'oldCode',
      title: 'MÃ MMTB CŨ',
      sortable: true,
      width: '130px',
      render: (v) => <span className="font-mono text-xs text-slate-600">{displayValue(v.oldCode)}</span>,
    },
    {
      key: 'bravoCode',
      title: 'MÃ BRAVO',
      sortable: true,
      width: '130px',
      render: (v) => (
        v.bravoCode ? (
          <span className="inline-flex rounded-md border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 font-mono text-[10px] font-bold text-emerald-800">
            {v.bravoCode}
          </span>
        ) : <span className="text-slate-300">—</span>
      ),
    },
    {
      key: 'plateNumber',
      title: 'BIỂN SỐ XE',
      sortable: true,
      width: '120px',
      render: (v) => (
        v.plateNumber && v.plateNumber !== 'Chưa gắn biển' ? (
          <span className="inline-flex rounded-md border border-slate-300 bg-slate-100 px-2 py-0.5 font-mono text-[10px] font-extrabold text-slate-800">
            {v.plateNumber}
          </span>
        ) : <span className="text-[10px] text-slate-400 italic">Chưa gắn biển</span>
      ),
    },
    {
      key: 'purchaseCondition',
      title: 'TÌNH TRẠNG MUA',
      sortable: true,
      width: '130px',
      render: (v) => <span className="text-xs text-slate-700">{displayValue(v.purchaseCondition)}</span>,
    },
    {
      key: 'brandModel',
      title: 'TÊN MMTB',
      sortable: true,
      width: '260px',
      render: (v) => (
        <div className="min-w-[220px] max-w-[320px] whitespace-normal">
          <div className="text-xs font-bold text-slate-900">{v.brandModel || '—'}</div>
          <div className="text-[10px] font-semibold text-slate-500">{v.vehicleCategory}</div>
        </div>
      ),
    },
    {
      key: 'teamUnit',
      title: 'ĐƠN VỊ SỬ DỤNG',
      sortable: true,
      width: '180px',
      render: (v) => (
        <div className="min-w-[150px] whitespace-normal">
          <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-xs font-bold text-slate-800">
            <Building2 className="h-3 w-3 text-slate-500" />
            {v.teamUnit || v.assignedUnitCode || 'Chờ phân bổ'}
          </span>
        </div>
      ),
    },
    {
      key: 'managerName',
      title: 'NHÂN SỰ QUẢN LÝ',
      sortable: true,
      width: '160px',
      render: (v) => (
        <div>
          <span className="text-xs font-bold text-slate-900 block">{displayValue(v.managerName)}</span>
          {v.managerPhone && (
            <span className="text-[10px] text-slate-500 font-mono flex items-center gap-0.5 mt-0.5">
              <Phone className="h-2.5 w-2.5 text-blue-500" />
              {v.managerPhone}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'currentLocationName',
      title: 'ĐỊA CHỈ (NƠI TẬP KẾT)',
      sortable: true,
      width: '180px',
      render: (v) => (
        v.currentLocationName ? (
          <div className="flex items-center gap-1 text-xs font-semibold text-emerald-800">
            <MapPin className="h-3 w-3 text-emerald-600 shrink-0" />
            <span className="truncate max-w-[155px]">{v.currentLocationName}</span>
          </div>
        ) : <span className="text-slate-300">—</span>
      ),
    },
    {
      key: 'allocationDate',
      title: 'NGÀY PHÂN BỔ',
      sortable: true,
      width: '120px',
      render: (v) => <span className="text-xs text-slate-600">{displayValue(v.allocationDate)}</span>,
    },
    {
      key: 'conditionStatus',
      title: 'TÌNH TRẠNG HỎNG',
      sortable: true,
      width: '160px',
      render: (v) => renderTechnicalConditionBadge(v),
    },
    {
      key: 'transferHistory',
      title: 'LỊCH SỬ ĐIỀU CHUYỂN',
      width: '180px',
      render: (v) => (
        <span className="line-clamp-2 text-[11px] text-slate-600 whitespace-normal">
          {displayValue(v.transferHistory)}
        </span>
      ),
    },
    {
      key: 'manufacturer',
      title: 'NHÃN HIỆU',
      sortable: true,
      width: '130px',
      render: (v) => <span className="text-xs font-bold text-slate-800">{displayValue(v.manufacturer)}</span>,
    },
    {
      key: 'origin',
      title: 'XUẤT XỨ',
      sortable: true,
      width: '110px',
      render: (v) => <span className="text-xs text-slate-700">{displayValue(v.origin)}</span>,
    },
    {
      key: 'yearManufactured',
      title: 'NĂM SX',
      sortable: true,
      width: '90px',
      align: 'center',
      render: (v) => <span className="font-mono text-xs text-slate-700">{v.yearManufactured ? v.yearManufactured : '—'}</span>,
    },
    {
      key: 'modelName',
      title: 'MODEL',
      sortable: true,
      width: '130px',
      render: (v) => <span className="font-mono text-xs font-semibold text-slate-800">{displayValue(v.modelName)}</span>,
    },
    {
      key: 'powerHp',
      title: 'CÔNG SUẤT',
      sortable: true,
      width: '110px',
      render: (v) => <span className="text-xs font-semibold text-slate-700">{displayValue(v.powerHp)}</span>,
    },
    {
      key: 'frameNumber',
      title: 'SỐ KHUNG',
      width: '140px',
      render: (v) => <span className="font-mono text-[11px] text-slate-600">{displayValue(v.frameNumber)}</span>,
    },
    {
      key: 'engineNumber',
      title: 'SỐ MÁY',
      width: '140px',
      render: (v) => <span className="font-mono text-[11px] text-slate-600">{displayValue(v.engineNumber)}</span>,
    },
    {
      key: 'fuelQuotaRate',
      title: 'ĐỊNH MỨC DẦU',
      sortable: true,
      width: '130px',
      render: (v) => (
        <span className="font-mono text-xs font-extrabold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
          {formatQuota(v)}
        </span>
      ),
    },
    {
      key: 'fuelTankCapacity',
      title: 'DUNG TÍCH BÌNH',
      sortable: true,
      width: '120px',
      align: 'right',
      render: (v) => (
        <span className="font-mono text-xs text-slate-700">
          {v.fuelTankCapacity ? `${v.fuelTankCapacity} L` : '—'}
        </span>
      ),
    },
    {
      key: 'supplier',
      title: 'NHÀ CUNG CẤP',
      width: '160px',
      render: (v) => <span className="text-xs text-slate-700 truncate">{displayValue(v.supplier)}</span>,
    },
    {
      key: 'notes',
      title: 'GHI CHÚ',
      width: '160px',
      render: (v) => <span className="line-clamp-2 text-[11px] text-slate-500 whitespace-normal">{displayValue(v.notes)}</span>,
    },
    {
      key: 'imageUrl',
      title: 'HÌNH ẢNH',
      width: '90px',
      align: 'center',
      render: (v) => (
        v.imageUrl ? (
          <button
            type="button"
            onClick={() => setShowImagePreview(v.imageUrl || null)}
            className="inline-flex items-center gap-1 rounded-md bg-slate-100 p-1.5 text-xs text-slate-700 hover:bg-slate-200"
            title="Xem hình ảnh"
          >
            <ImageIcon className="h-3.5 w-3.5 text-emerald-600" />
            <span className="text-[10px] font-bold">Xem</span>
          </button>
        ) : <span className="text-[10px] text-slate-300">Không có</span>
      ),
    },
    {
      key: 'actions',
      title: 'THAO TÁC',
      width: '145px',
      align: 'center',
      render: (v) => (
        <div className="flex items-center justify-center gap-1.5">
          <Button
            size="sm"
            variant="outline"
            onClick={() => openVehicle(v)}
            className="h-7 text-[11px] px-2 font-bold"
            title="Xem chi tiết lý lịch xe"
          >
            <Eye className="h-3 w-3 mr-1" /> Chi tiết
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleEditVehicle(v)}
            className="h-7 text-[11px] px-2 font-bold border-amber-300 text-amber-800 bg-amber-50/70 hover:bg-amber-100 hover:border-amber-400"
            title="Chỉnh sửa thông tin hồ sơ xe"
          >
            <Edit className="h-3 w-3 mr-1 text-amber-700" /> Sửa
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* 4x2 DASHBOARD TILES GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Row 1 - Card 1: Tổng quy mô MMTB */}
        <button
          type="button"
          onClick={() => {
            setSelectedStatus(ALL);
            setSelectedGroup(ALL);
          }}
          className={`relative overflow-hidden p-4 rounded-2xl border text-left transition-all hover:shadow-md cursor-pointer ${
            selectedStatus === ALL && selectedGroup === ALL
              ? 'border-blue-500 bg-blue-50/40 ring-2 ring-blue-500/25 shadow-sm scale-[1.01]'
              : 'border-slate-200 bg-white hover:bg-slate-50'
          }`}
        >
          <span className="absolute inset-x-0 bottom-0 h-1.5 bg-blue-500" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Tổng quy mô MMTB</span>
            <div className="rounded-xl p-2 bg-blue-50 text-blue-600">
              <Database className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900">
            {loading ? '...' : operationalStats.total.toLocaleString('vi-VN')}
          </div>
          <div className="mt-1 text-[11px] font-semibold text-slate-500 truncate">
            {selectedGroup !== ALL
              ? `Nhóm: ${groupOptions.find((g) => g.key === selectedGroup)?.label || selectedGroup}`
              : 'Phương tiện & thiết bị sạch 100%'}
          </div>
        </button>

        {/* Row 1 - Card 2: Sẵn sàng vận hành */}
        <button
          type="button"
          onClick={() => setSelectedStatus((curr) => (curr === 'HOAT_DONG' ? ALL : 'HOAT_DONG'))}
          className={`relative overflow-hidden p-4 rounded-2xl border text-left transition-all hover:shadow-md cursor-pointer ${
            selectedStatus === 'HOAT_DONG'
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
            {loading ? '...' : operationalStats.active.toLocaleString('vi-VN')}
          </div>
          <div className="mt-1 text-[11px] font-semibold text-emerald-700 truncate">
            Tình trạng kỹ thuật bình thường
          </div>
        </button>

        {/* Row 1 - Card 3: Tình trạng Hỏng / Sửa */}
        <button
          type="button"
          onClick={() => setSelectedStatus((curr) => (curr === 'SUA_CHUA' ? ALL : 'SUA_CHUA'))}
          className={`relative overflow-hidden p-4 rounded-2xl border text-left transition-all hover:shadow-md cursor-pointer ${
            selectedStatus === 'SUA_CHUA' || selectedStatus === 'BAO_DUONG'
              ? 'border-rose-500 bg-rose-50/40 ring-2 ring-rose-500/25 shadow-sm scale-[1.01]'
              : 'border-slate-200 bg-white hover:bg-slate-50'
          }`}
        >
          <span className="absolute inset-x-0 bottom-0 h-1.5 bg-rose-500" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-700">Tình trạng Hỏng / Sửa</span>
            <div className="rounded-xl p-2 bg-rose-50 text-rose-600">
              <Wrench className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-rose-700">
            {loading ? '...' : operationalStats.damagedRatio}
          </div>
          <div className="mt-1 text-[11px] font-semibold text-rose-600 truncate">
            Cần theo dõi & điều chuyển BTSC
          </div>
        </button>

        {/* Row 1 - Card 4: Đã gắn GPS / Giám sát */}
        <button
          type="button"
          onClick={() => {}}
          className="relative overflow-hidden p-4 rounded-2xl border text-left transition-all hover:shadow-md cursor-pointer border-slate-200 bg-white hover:bg-slate-50"
        >
          <span className="absolute inset-x-0 bottom-0 h-1.5 bg-sky-500" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Đã gắn GPS / Giám sát</span>
            <div className="rounded-xl p-2 bg-sky-50 text-sky-600">
              <RadioTower className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-sky-700">
            {loading ? '...' : operationalStats.gpsAttached.toLocaleString('vi-VN')}
          </div>
          <div className="mt-1 text-[11px] font-semibold text-sky-700 truncate">
            Truyền tọa độ & cảm biến dầu
          </div>
        </button>

        {/* Row 2 - 4 Group Cards */}
        {groupOptions.map((group) => {
          const Icon = group.icon;
          const selected = selectedGroup === group.key;
          return (
            <button
              key={group.key}
              type="button"
              onClick={() => selectGroup(group.key)}
              className={`relative overflow-hidden p-4 rounded-2xl border text-left transition-all hover:shadow-md cursor-pointer ${
                selected
                  ? `${group.selectedClass} ring-2 ring-emerald-500/30 scale-[1.01]`
                  : 'border-slate-200 bg-white hover:bg-slate-50'
              }`}
            >
              <span className={`absolute inset-x-0 bottom-0 h-1.5 ${group.barClass}`} />
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 truncate">{group.label}</span>
                <div className={`rounded-xl p-2 border ${group.iconClass}`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-2 text-2xl font-black text-slate-900">
                {(groupCounts[group.key] || 0).toLocaleString('vi-VN')}
              </div>
              <div className="mt-1 text-[11px] font-semibold text-slate-500 truncate">
                {group.description}
              </div>
            </button>
          );
        })}
      </div>

      {/* 3. THANH TÌM KIẾM & CHỨC NĂNG VẬN HÀNH */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
        {/* ROW 1: HEADER ACTION BUTTONS */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <span className="font-heading text-sm font-extrabold text-slate-800 uppercase tracking-wide">
              Danh sách Hồ sơ Xe & Máy móc
            </span>
            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
              {pagination.total.toLocaleString('vi-VN')} phương tiện
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <input ref={importInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImportExcel} />
            <button
              type="button"
              onClick={() => setIsCreatingVehicle(true)}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-primary bg-primary px-3.5 text-xs font-black text-white shadow-xs transition-all hover:bg-primary-600 hover:scale-[1.01]"
            >
              <Plus className="h-4 w-4 stroke-[3]" />
              Thêm mới phương tiện
            </button>

            <Link
              to="/danh-muc/loai-xe"
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-bold text-slate-700 transition-all hover:bg-slate-100"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-700" />
              Danh mục {filterOptions.vehicleTypes.length} Chủng loại
              <ExternalLink className="h-3 w-3 text-slate-400" />
            </Link>

            <button
              type="button"
              onClick={() => void catalogsApi.downloadTemplate('VEHICLE')}
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
              onClick={() => void handleExportExcel()}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-bold text-slate-700 transition-all hover:bg-slate-100"
            >
              <Download className="h-3.5 w-3.5 text-emerald-700" />
              Xuất Excel 23 Trường ({pagination.total})
            </button>

            <button
              type="button"
              onClick={() => void loadVehicles()}
              disabled={loading}
              title="Làm mới dữ liệu"
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700 transition-all hover:bg-slate-100 disabled:opacity-50"
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

        {/* ROW 2: SEARCH INPUT & ADVANCED FILTER TOGGLE */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center justify-between">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                id="vehicle-search"
                type="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Nhập tên xe, máy móc thiết bị, biển số, mã tài sản..."
                className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-9 text-xs font-medium text-slate-900 outline-none transition focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/15"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
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
              className={`inline-flex h-10 items-center gap-1.5 rounded-xl border px-3.5 text-xs font-bold transition-all ${
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

        {/* BỘ LỌC NÂNG CAO (KHI MỞ RỘNG) */}
        {showAdvancedFilters && (
          <div className="grid grid-cols-1 gap-3 border-t border-slate-100 pt-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                Đơn vị sử dụng (Xí nghiệp / Đội)
              </label>
              <SearchableSelect
                value={selectedUnit}
                onChange={setSelectedUnit}
                options={unitSelectOptions}
                placeholder={`Tất cả đơn vị (${unitOptions.length})`}
                emptyOptionLabel={`Tất cả đơn vị (${unitOptions.length})`}
                heightClass="h-9"
                icon={<Building2 className="h-4 w-4" />}
              />
            </div>

            <div>
              <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                Đơn vị / Nơi tập kết ({locationOptions.length} điểm)
              </label>
              <SearchableSelect
                value={selectedLocation}
                onChange={setSelectedLocation}
                options={locationSelectOptions}
                placeholder={`Tất cả nơi tập kết (${locationOptions.length})`}
                emptyOptionLabel={`Tất cả nơi tập kết (${locationOptions.length})`}
                heightClass="h-9"
                icon={<MapPin className="h-4 w-4" />}
              />
            </div>

            <div>
              <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                Chủng loại xe ({categoryOptions.length} loại)
              </label>
              <SearchableSelect
                value={selectedCategory}
                onChange={setSelectedCategory}
                options={categorySelectOptions}
                placeholder={`Tất cả chủng loại (${categoryOptions.length})`}
                emptyOptionLabel={`Tất cả chủng loại (${categoryOptions.length})`}
                heightClass="h-9"
                icon={<Tractor className="h-4 w-4" />}
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                Khu liên hợp
              </label>
              <SearchableSelect
                value={selectedComplex}
                onChange={handleSelectComplex}
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
                onChange={setSelectedRegion}
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
                onChange={setSelectedManufacturer}
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
                onChange={setSelectedModel}
                options={modelSelectOptions}
                placeholder="Tất cả model"
                emptyOptionLabel="Tất cả model"
                heightClass="h-9"
                icon={<Table className="h-4 w-4" />}
              />
            </div>

            <div>
              <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Xuất xứ</label>
              <SearchableSelect
                value={selectedOrigin}
                onChange={setSelectedOrigin}
                options={originSelectOptions}
                placeholder="Tất cả xuất xứ"
                emptyOptionLabel="Tất cả xuất xứ"
                heightClass="h-9"
              />
            </div>

            <div>
              <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Năm sản xuất</label>
              <SearchableSelect
                value={selectedYear}
                onChange={setSelectedYear}
                options={yearSelectOptions}
                placeholder="Tất cả năm"
                emptyOptionLabel="Tất cả năm"
                heightClass="h-9"
              />
            </div>

            <div>
              <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Trạng thái hệ thống</label>
              <SearchableSelect
                value={selectedStatus}
                onChange={setSelectedStatus}
                options={statusSelectOptions}
                placeholder="Tất cả trạng thái"
                emptyOptionLabel="Tất cả trạng thái"
                heightClass="h-9"
              />
            </div>

            <div>
              <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Cảnh báo bảo dưỡng</label>
              <SearchableSelect
                value={selectedAlertTier}
                onChange={setSelectedAlertTier}
                options={alertTierSelectOptions}
                placeholder="Tất cả cảnh báo"
                emptyOptionLabel="Tất cả cảnh báo"
                heightClass="h-9"
              />
            </div>
          </div>
        )}
      </section>

      {loadMessage && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-700">
          {loadMessage}
        </div>
      )}

      {/* 4. BẢNG HỒ SƠ 23 CỘT EXCEL CHUẨN MỰC */}
      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="flex flex-wrap items-center justify-between border-b border-slate-200 px-4 py-3 bg-slate-50/70">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-sm text-slate-900">Danh sách Hồ sơ MMTB</span>
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800">
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
              Toàn bộ 23 Cột Chuẩn Excel
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

        <div className="overflow-x-auto">
          <DataTable
            data={filteredVehicles}
            columns={tableViewMode === 'excel_23' ? full23Columns : compactColumns}
            isLoading={loading}
            pageSize={20}
            showSearch={false}
            showExport={false}
            showPagination={false}
            useGlobalFilters={false}
          />
        </div>
        <div className="p-3 border-t border-slate-200/80 bg-slate-50/70 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
          <div className="font-medium">
            Hiển thị <span className="font-bold text-slate-900">{pagination.total > 0 ? (pagination.page - 1) * pagination.limit + 1 : 0}</span> –{' '}
            <span className="font-bold text-slate-900">{Math.min(pagination.page * pagination.limit, pagination.total)}</span> trên{' '}
            <span className="font-bold text-slate-900">{pagination.total.toLocaleString('vi-VN')}</span> phương tiện (20 dòng/trang)
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Nút Trang Trước */}
            <button
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              disabled={pagination.page <= 1 || loading}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow-2xs hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              title="Trang trước"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Các nút số trang: 1 2 3 ... totalPages */}
            {(() => {
              const currentP = pagination.page;
              const totalP = Math.max(1, pagination.totalPages);
              let pages: (number | string)[] = [];
              if (totalP <= 7) {
                pages = Array.from({ length: totalP }, (_, i) => i + 1);
              } else if (currentP <= 4) {
                pages = [1, 2, 3, 4, 5, '...', totalP];
              } else if (currentP >= totalP - 3) {
                pages = [1, '...', totalP - 4, totalP - 3, totalP - 2, totalP - 1, totalP];
              } else {
                pages = [1, '...', currentP - 1, currentP, currentP + 1, '...', totalP];
              }

              return pages.map((pNum, index) => {
                if (pNum === '...') {
                  return (
                    <span key={`ellipsis-${index}`} className="px-1 text-slate-400 font-bold select-none">
                      ...
                    </span>
                  );
                }
                const num = Number(pNum);
                const isActive = num === currentP;
                return (
                  <button
                    key={`page-${num}`}
                    onClick={() => setPage(num)}
                    disabled={loading}
                    className={`inline-flex h-8 min-w-[32px] items-center justify-center rounded-lg px-2 text-xs font-mono font-bold transition-all ${
                      isActive
                        ? 'bg-[#1B4D20] text-white shadow-sm ring-1 ring-[#1B4D20]'
                        : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    {num}
                  </button>
                );
              });
            })()}

            {/* Nút Trang Sau */}
            <button
              onClick={() => setPage((p) => Math.min(p + 1, pagination.totalPages))}
              disabled={pagination.page >= pagination.totalPages || loading}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow-2xs hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              title="Trang sau"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {/* Nút Trang Cuối */}
            {pagination.page < pagination.totalPages && pagination.totalPages > 5 && (
              <button
                onClick={() => setPage(pagination.totalPages)}
                disabled={loading}
                className="ml-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-600 hover:bg-slate-100 hover:text-[#1B4D20] transition-colors"
                title="Đến trang cuối cùng"
              >
                Trang cuối ({pagination.totalPages})
              </button>
            )}
          </div>
        </div>
      </section>

      {/* 5. MODAL HỒ SƠ CHI TIẾT MMTB (23 TRƯỜNG TOÀN DIỆN) */}
      {selectedVehicle && (
        <Modal
          isOpen={Boolean(selectedVehicle)}
          onClose={() => setSelectedVehicle(null)}
          title={`Hồ sơ chi tiết: ${selectedVehicle.internalCode} - ${selectedVehicle.brandModel || ''}`}
          size="xl"
        >
          <div className="space-y-4">
            {/* Modal Header Card */}
            <div className="rounded-xl border border-emerald-200 bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-base font-black text-emerald-900">
                      {selectedVehicle.internalCode}
                    </span>
                    {selectedVehicle.plateNumber && selectedVehicle.plateNumber !== 'Chưa gắn biển' && (
                      <span className="rounded-md border border-slate-300 bg-white px-2 py-0.5 font-mono text-xs font-extrabold text-slate-800">
                        {selectedVehicle.plateNumber}
                      </span>
                    )}
                    <span className={`rounded-full border px-2.5 py-0.5 text-xs font-bold ${statusMeta(selectedVehicle.status).badgeClass}`}>
                      {statusMeta(selectedVehicle.status).label}
                    </span>
                  </div>
                  <h3 className="mt-1 text-sm font-extrabold text-slate-900">
                    {selectedVehicle.brandModel}
                  </h3>
                  <div className="mt-1 text-xs text-slate-600 flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span>{selectedVehicle.vehicleCategory} · {selectedVehicle.teamUnit || 'Chưa phân bổ'}</span>
                    {selectedVehicle.currentLocationName && (
                      <span className="inline-flex items-center gap-1 text-emerald-900 font-bold bg-emerald-100/90 px-2 py-0.5 rounded-md text-[11px] border border-emerald-300">
                        <MapPin className="h-3 w-3 text-emerald-700" />
                        Nơi tập kết: {selectedVehicle.currentLocationName}
                      </span>
                    )}
                    {selectedVehicle.managerName && (
                      <span className="inline-flex items-center gap-1 text-blue-900 font-bold bg-blue-100/90 px-2 py-0.5 rounded-md text-[11px] border border-blue-300">
                        <UserCheck className="h-3 w-3 text-blue-700" />
                        Quản lý: {selectedVehicle.managerName} {selectedVehicle.managerPhone ? `(${selectedVehicle.managerPhone})` : ''}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const v = selectedVehicle;
                      setSelectedVehicle(null);
                      handleEditVehicle(v);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-800 shadow-xs hover:bg-amber-100 transition-colors"
                  >
                    <Edit className="h-3.5 w-3.5" />
                    Sửa hồ sơ
                  </button>
                  {selectedVehicle.imageUrl && (
                    <button
                      type="button"
                      onClick={() => setShowImagePreview(selectedVehicle.imageUrl || null)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-white px-3 py-1.5 text-xs font-bold text-emerald-800 shadow-xs hover:bg-emerald-50"
                    >
                      <ImageIcon className="h-3.5 w-3.5" />
                      Xem ảnh MMTB
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Tabs */}
            <div className="flex border-b border-slate-200">
              {[
                { key: 'identity', label: '1. Định danh & Mua sắm', icon: Tag },
                { key: 'technical', label: '2. Thông số & Động cơ', icon: Gauge },
                { key: 'fuel', label: '3. Định mức & Nhiên liệu', icon: Fuel },
                { key: 'assignment', label: '4. Phân bổ & Vận hành', icon: Building2 },
              ].map((tab) => {
                const Icon = tab.icon;
                const active = detailTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setDetailTab(tab.key as DetailTab)}
                    className={`flex items-center gap-1.5 border-b-2 px-3.5 py-2.5 text-xs font-bold transition-all ${
                      active
                        ? 'border-primary text-primary bg-primary-50/50'
                        : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Tab Contents: Cố định min-height để modal không bị thụt lùi / co giật khi chuyển tab */}
            <div className="pt-2 min-h-[415px]">
              {detailTab === 'identity' && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
                  <DetailField label="1. Mã MMTB mới" value={selectedVehicle.internalCode} mono />
                  <DetailField label="2. Mã MMTB cũ" value={selectedVehicle.oldCode} mono />
                  <DetailField label="3. Mã Bravo ERP" value={selectedVehicle.bravoCode} mono />
                  <DetailField label="4. Biển số xe" value={selectedVehicle.plateNumber} mono />
                  <DetailField label="5. Tình trạng mua" value={selectedVehicle.purchaseCondition || 'Mua mới 100%'} />
                  <DetailField label="6. Nhà cung cấp" value={selectedVehicle.supplier || 'THACO AGRI'} />
                  <DetailField label="7. Mã tài sản kế toán" value={selectedVehicle.assetCode} mono />
                  <DetailField label="8. Đơn vị chủ quản" value={selectedVehicle.companyOwner || 'THACO AGRI'} />
                  <DetailField label="9. Loại hợp đồng" value={selectedVehicle.contractStatus || 'KLH Koun Mom'} />
                  <DetailField label="Mã VehicleType" value={selectedVehicle.vehicleTypeCode || selectedVehicle.categoryCode} mono />
                  <DetailField label="Nhóm tài sản" value={selectedVehicle.assetGroup} mono />
                  <DetailField label="Nguồn Excel" value={selectedVehicle.sourceSheets?.join(', ')} />
                </div>
              )}

              {detailTab === 'technical' && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
                  <DetailField label="10. Nhãn hiệu" value={selectedVehicle.manufacturer} />
                  <DetailField label="11. Xuất xứ" value={selectedVehicle.origin} />
                  <DetailField label="12. Năm sản xuất" value={selectedVehicle.yearManufactured} mono />
                  <DetailField label="13. Model kiểu loại" value={selectedVehicle.modelName} mono />
                  <DetailField label="14. Công suất động cơ" value={selectedVehicle.powerHp} />
                  <DetailField label="15. Số khung (Chassis/VIN)" value={selectedVehicle.frameNumber} mono />
                  <DetailField label="16. Số máy (Engine No)" value={selectedVehicle.engineNumber} mono />
                  <DetailField label="17. Hạn đăng kiểm" value={selectedVehicle.inspectionExpiry} mono />
                  <DetailField label="18. Chủng loại MMTB" value={selectedVehicle.vehicleCategory} />
                  <DetailField label="Phân nhóm chi tiết từ Excel" value={selectedVehicle.vehicleSubtype} />
                  <DetailField label="Thông số kỹ thuật" value={selectedVehicle.technicalSpecs} />
                  <DetailField label="Kích thước" value={selectedVehicle.dimensions} mono />
                  <DetailField label="Năng suất" value={selectedVehicle.productivity} />
                </div>
              )}

              {detailTab === 'fuel' && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
                  <DetailField
                    label="19. Định mức nhiên liệu chuẩn"
                    value={formatQuota(selectedVehicle)}
                    mono
                    className="border-amber-200 bg-amber-50/50"
                  />
                  <DetailField
                    label="20. Dung tích thùng nhiên liệu"
                    value={selectedVehicle.fuelTankCapacity ? `${selectedVehicle.fuelTankCapacity} Lít` : '—'}
                    mono
                  />
                  <DetailField label="Đơn vị định mức" value={selectedVehicle.fuelQuotaUnit} mono />
                  <DetailField label="Mã IMEI cảm biến dầu" value={selectedVehicle.fuelSensorImei} mono />
                  <DetailField label="Mã IMEI thiết bị GPS" value={selectedVehicle.gpsImei} mono />
                  <DetailField label="Tọa độ GPS hiện tại" value={selectedVehicle.lastGpsUpdate || 'Đã đồng bộ trạm'} />
                  <DetailField label="Ngày đăng kiểm" value={selectedVehicle.inspectionDate} />
                  <DetailField label="Hạn đăng kiểm" value={selectedVehicle.inspectionExpiry} />
                  <DetailField label="Hạn phí đường bộ" value={selectedVehicle.roadFeeExpiryDate} />
                </div>
              )}

              {detailTab === 'assignment' && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
                  <DetailField label="21. Đơn vị sử dụng (Xí nghiệp)" value={selectedVehicle.teamUnit} />
                  <DetailField label="22. Ngày phân bổ đưa vào SD" value={selectedVehicle.allocationDate} />
                  <DetailField label="Khu liên hợp" value={selectedVehicle.complexCode} mono />
                  <DetailField label="Khu vực" value={selectedVehicle.regionCode} mono />
                  <DetailField
                    label="23. Tình trạng Hỏng kỹ thuật"
                    value={selectedVehicle.conditionStatus || 'Bình thường'}
                    className={selectedVehicle.conditionStatus?.toLowerCase().includes('hỏng') ? 'border-rose-200 bg-rose-50' : 'border-emerald-200 bg-emerald-50'}
                  />
                  <DetailField label="Tài xế phụ trách hiện tại" value={selectedVehicle.currentDriver} />
                  <DetailField label="Tổng giờ máy tích lũy" value={`${selectedVehicle.currentEngineHours.toLocaleString('vi-VN')} h`} mono />
                  <DetailField
                    label="26. Nhân sự quản lý"
                    value={selectedVehicle.managerName}
                    className="border-blue-200 bg-blue-50/60 font-bold"
                  />
                  <DetailField
                    label="27. Địa chỉ (Nơi tập kết)"
                    value={selectedVehicle.currentLocationName}
                    className="border-emerald-200 bg-emerald-50/60 font-bold"
                  />
                  <DetailField
                    label="28. Số liên lạc (Zalo / SĐT)"
                    value={selectedVehicle.managerPhone}
                    mono
                    className="border-blue-200 bg-blue-50/60"
                  />
                  <div className="sm:col-span-2 md:col-span-3">
                    <DetailField label="24. Lịch sử điều chuyển nội bộ" value={selectedVehicle.transferHistory} />
                  </div>
                  <div className="sm:col-span-2 md:col-span-3">
                    <DetailField label="25. Ghi chú nghiệp vụ" value={selectedVehicle.notes} />
                  </div>
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* 6. IMAGE PREVIEW MODAL */}
      {showImagePreview && (
        <Modal
          isOpen={Boolean(showImagePreview)}
          onClose={() => setShowImagePreview(null)}
          title="Hình ảnh thực tế MMTB"
          size="md"
        >
          <div className="space-y-3">
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-900 flex items-center justify-center p-2 min-h-[250px]">
              <img
                src={showImagePreview}
                alt="Hình ảnh MMTB"
                className="max-h-[400px] w-auto object-contain rounded-lg"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </div>
          </div>
        </Modal>
      )}

      {/* 7. EDIT / CREATE VEHICLE MODAL */}
      <EditVehicleModal
        isOpen={isCreatingVehicle || Boolean(editingVehicle)}
        isCreate={isCreatingVehicle}
        onClose={() => {
          setIsCreatingVehicle(false);
          setEditingVehicle(null);
        }}
        vehicle={editingVehicle}
        filterOptions={filterOptions}
        onSuccess={(saved) => {
          setIsCreatingVehicle(false);
          setEditingVehicle(null);
          handleEditSuccess(saved);
        }}
      />
    </div>
  );
};
