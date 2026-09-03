import React, { useState, useEffect, useMemo, useRef } from 'react';
import * as XLSX from 'xlsx';
import { DataTable, Column } from '../../components/data-display/DataTable';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { StatCard } from '../../components/data-display/StatCard';
import { KPIGrid } from '../../components/data-display/KPIGrid';
import { SearchableSelect, SelectOption } from '../../components/common/SearchableSelect';
import { apiService } from '../../api/client';
import { catalogsApi } from '../../api/catalogsApi';
import { useAppStore } from '../../store/useAppStore';
import { VehicleProfile } from '../../types';
import { parseOperationalImport } from '../../utils/operationalExcelTemplates';
import {
  Layers,
  CheckCircle2,
  Package,
  Wrench,
  Tractor,
  Download,
  Search,
  ChevronLeft,
  ChevronRight,
  Eye,
  Building2,
  MapPin,
  UserCheck,
  Phone,
  Link2,
  Unlink,
  RotateCcw,
  Tag,
  Gauge,
  SlidersHorizontal,
  Table,
  Boxes,
  FileSpreadsheet,
  AlertTriangle,
  Info,
  Edit,
  Plus,
  RadioTower,
  Upload,
} from 'lucide-react';
import { EditEquipmentModal } from '../../components/fleet/EditEquipmentModal';

export interface AttachedVehicle {
  id: number;
  code: string;
  plate?: string | null;
  name: string;
  category?: string;
  assignedUnitCode?: string | null;
  status: string;
  manufacturer?: string | null;
  modelName?: string | null;
  vehicleSubtype?: string | null;
}

export interface ImplementItem {
  id: number;
  code: string;
  name: string;
  category: 'DAN_CAY' | 'DAN_BUA' | 'DAN_XOI' | 'DAN_RAI_PHAN' | 'RO_MOOC' | 'DAN_PHUN_THUOC';
  unit: string;
  currentVehicleId?: number | null;
  currentVehicle?: AttachedVehicle | null;
  status: 'ATTACHED' | 'IN_DEPOT' | 'MAINTENANCE';
  technicalCondition: 'GOOD' | 'WORN_OUT' | 'NEED_REPAIR';
  standardPurpose?: string | null;
  managerName?: string | null;
  gatheringLocation?: string | null;
  managerPhone?: string | null;
  attachedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

type TabType = 'all' | 'in_depot' | 'attached' | 'maintenance';
type TableViewMode = 'excel_23' | 'compact';
type DetailTab = 'identity' | 'technical' | 'assignment' | 'operation';

const ALL = 'ALL';

const CATEGORY_NAMES: Record<string, { label: string; badge: string }> = {
  DAN_CAY: { label: 'Dàn cày nông nghiệp', badge: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  DAN_BUA: { label: 'Dàn bừa đĩa', badge: 'bg-sky-100 text-sky-800 border-sky-300' },
  DAN_XOI: { label: 'Dàn xới & Làm đất', badge: 'bg-amber-100 text-amber-800 border-amber-300' },
  DAN_RAI_PHAN: { label: 'Dàn rải phân & Vôi', badge: 'bg-orange-100 text-orange-800 border-orange-300' },
  RO_MOOC: { label: 'Rơ-moóc & Moóc kéo', badge: 'bg-purple-100 text-purple-800 border-purple-300' },
  DAN_PHUN_THUOC: { label: 'Dàn phun thuốc BVTV', badge: 'bg-teal-100 text-teal-800 border-teal-300' },
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

const statusMeta = (item: ImplementItem) => {
  if (item.status === 'ATTACHED') {
    return {
      label: `Đang gắn xe: ${item.currentVehicle?.code || 'Xe kéo'}`,
      badgeClass: 'bg-sky-50 text-sky-700 border-sky-200',
      dotClass: 'bg-sky-500',
    };
  }
  if (item.status === 'MAINTENANCE' || item.technicalCondition === 'NEED_REPAIR') {
    return {
      label: 'Hư hỏng / BTSC',
      badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
      dotClass: 'bg-rose-500',
    };
  }
  return {
    label: 'Sẵn sàng tại bãi',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dotClass: 'bg-emerald-500',
  };
};

export const EquipmentPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [tableViewMode, setTableViewMode] = useState<TableViewMode>('excel_23');
  const [equipmentList, setEquipmentList] = useState<ImplementItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEquipment, setSelectedEquipment] = useState<ImplementItem | null>(null);
  const [editingEquipment, setEditingEquipment] = useState<ImplementItem | null>(null);
  const [isCreatingEquipment, setIsCreatingEquipment] = useState(false);
  const [detailTab, setDetailTab] = useState<DetailTab>('identity');
  const [importing, setImporting] = useState(false);
  const [importMessage, setImportMessage] = useState('');
  const importInputRef = useRef<HTMLInputElement | null>(null);

  // Attach modal state
  const [attachingItem, setAttachingItem] = useState<ImplementItem | null>(null);
  const [availableVehicles, setAvailableVehicles] = useState<VehicleProfile[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
  const [attachingLoading, setAttachingLoading] = useState(false);
  const [attachMessage, setAttachMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // 1. Column-Level Quick Search States
  const [searchCode, setSearchCode] = useState('');
  const [searchName, setSearchName] = useState('');
  const [searchLocation, setSearchLocation] = useState('');

  // 2. Advanced / Header Shared Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUnit, setSelectedUnit] = useState(ALL);
  const [selectedLocation, setSelectedLocation] = useState(ALL);
  const [selectedCategory, setSelectedCategory] = useState(ALL);
  const globalKLH = useAppStore((state) => state.selectedKLH);
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
  const [selectedManufacturer, setSelectedManufacturer] = useState(ALL);
  const [selectedModel, setSelectedModel] = useState(ALL);
  const [selectedOrigin, setSelectedOrigin] = useState(ALL);
  const [selectedYear, setSelectedYear] = useState(ALL);
  const [selectedStatus, setSelectedStatus] = useState(ALL);
  const [selectedCondition, setSelectedCondition] = useState(ALL);
  const [selectedAlertTier, setSelectedAlertTier] = useState(ALL);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // Stats from backend
  const [stats, setStats] = useState({
    total: 0,
    attached: 0,
    inDepot: 0,
    maintenance: 0,
  });

  const loadData = async () => {
    setLoading(true);

    // 1. Fetch statistics IMMEDIATELY (< 20ms)
    apiService
      .getImplementStatistics()
      .then((statsData) => {
        if (statsData) {
          setStats({
            total: statsData.totalImplements || 0,
            attached: statsData.attached || 0,
            inDepot: statsData.inDepot || 0,
            maintenance: statsData.maintenance || 0,
          });
        }
      })
      .catch(() => null);

    // 2. Fetch implements list
    try {
      const allData = await apiService.getAllImplements();
      if (allData && Array.isArray(allData.items)) {
        setEquipmentList(allData.items);
      }
    } catch (err) {
      console.error('Lỗi nạp danh sách thiết bị đính kèm:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleImportExcel = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setImporting(true);
    setImportMessage('');
    try {
      const rows = await parseOperationalImport(file, 'IMPLEMENT');
      if (rows.length === 0) throw new Error('File không có dòng dữ liệu mới (dòng ví dụ được tự động bỏ qua).');
      const vehicles = await apiService.getVehicles().catch(() => [] as VehicleProfile[]);
      let imported = 0;
      for (const row of rows) {
        if (!row.code || !row.name || !row.category || !row.complexCode || !row.unit || !row.gatheringLocation || !row.technicalCondition || !row.status) {
          throw new Error(`Dòng ${imported + 2} thiếu một hoặc nhiều trường bắt buộc (*).`);
        }
        const unitText = String(row.unit || '').toUpperCase();
        const unit = ['NT1', 'NT2', 'XN_BO', 'TT_BTSC', 'BAN_CO_GIOI', 'TOAN_KLH'].includes(unitText) ? unitText : 'BAN_CO_GIOI';
        const metadata = [
          row.standardPurpose ? String(row.standardPurpose) : '',
          row.brand ? `Hãng: ${row.brand}` : '', row.model ? `Model: ${row.model}` : '',
          row.year ? `Năm SX: ${row.year}` : '', row.purchaseCondition ? `Tình trạng mua: ${row.purchaseCondition}` : '',
          row.unit ? `Đơn vị: ${row.unit}` : '',
          row.complexCode ? `Khu liên hợp: ${row.complexCode}` : '', row.regionCode ? `Khu vực: ${row.regionCode}` : '',
          row.companyOwner ? `Pháp nhân: ${row.companyOwner}` : '', row.alertTier ? `Cảnh báo: ${row.alertTier}` : '',
          row.maintenanceNotes ? `Ghi chú: ${row.maintenanceNotes}` : '',
        ].filter(Boolean).join(' · ');
        const created = await apiService.createImplement({
          code: row.code, name: row.name, category: row.category, unit,
          status: row.status === 'MAINTENANCE' ? 'MAINTENANCE' : 'IN_DEPOT', technicalCondition: row.technicalCondition || 'GOOD',
          gatheringLocation: row.gatheringLocation, managerName: row.managerName,
          managerPhone: row.managerPhone ? String(row.managerPhone) : undefined,
          standardPurpose: metadata,
        });
        if (row.attachedVehicleCode && created?.id) {
          const vehicle = vehicles.find((item) => item.internalCode === row.attachedVehicleCode || (item as any).code === row.attachedVehicleCode);
          if (vehicle) await apiService.attachImplement(created.id, Number(String(vehicle.id).replace(/\D/g, '')));
        }
        imported += 1;
      }
      setImportMessage(`Đã import thành công ${imported} thiết bị / nông cụ.`);
      await loadData();
    } catch (error: any) {
      setImportMessage(error?.response?.data?.message || error?.message || 'Import thiết bị / nông cụ thất bại.');
    } finally {
      setImporting(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  // Helper trích xuất thông tin
  const getProp = (text: string | null | undefined, prefix: string): string => {
    if (!text) return '';
    const match = text.normalize('NFC').match(new RegExp(`${prefix}:\\s*([^·]+)`));
    return match ? match[1].normalize('NFC').trim() : '';
  };

  const getItemManager = (item: ImplementItem) => (item.managerName?.normalize('NFC').trim()) || getProp(item.standardPurpose, 'Quản lý') || 'Ban Cơ Giới';
  const getItemLocation = (item: ImplementItem) => (item.gatheringLocation?.normalize('NFC').trim()) || getProp(item.standardPurpose, 'Nơi tập kết') || 'Bãi xe Trung tâm';
  const getItemPhone = (item: ImplementItem) => (item.managerPhone?.normalize('NFC').trim()) || getProp(item.standardPurpose, 'Zalo/SĐT') || '';
  const getItemUnit = (item: ImplementItem) => getProp(item.standardPurpose, 'Đơn vị') || item.unit?.normalize('NFC').trim() || '';
  const getItemBrand = (item: ImplementItem) => getProp(item.standardPurpose, 'Hãng') || '—';
  const getItemModel = (item: ImplementItem) => getProp(item.standardPurpose, 'Model') || '—';
  const getItemPurchaseCondition = (item: ImplementItem) => getProp(item.standardPurpose, 'Tình trạng mua') || 'ĐQSD';
  const getItemYear = (item: ImplementItem) => getProp(item.standardPurpose, 'Năm SX') || '—';
  const getItemNotes = (item: ImplementItem) => getProp(item.standardPurpose, 'Ghi chú') || '—';

  // Xác định Khu liên hợp & Khu vực địa lý thực tế
  const getItemComplex = (item: ImplementItem): string => {
    const code = (item.code || '').normalize('NFC').toUpperCase();
    const u = (getItemUnit(item) || item.unit || '').normalize('NFC').toUpperCase();
    const purp = (item.standardPurpose || '').normalize('NFC').toUpperCase();
    const loc = (item.gatheringLocation || '').normalize('NFC').toUpperCase();

    if (code.startsWith('SN-') || u.includes('SNOUL') || purp.includes('SNOUL') || loc.includes('SNOUL')) {
      return 'SNOUL';
    }
    if (
      code.startsWith('NL-') ||
      u.includes('NAM_LAO') ||
      u.includes('ATTAPEU') ||
      u.includes('LÀO') ||
      u.includes('LAO') ||
      purp.includes('ATTAPEU') ||
      purp.includes('NAM LÀO') ||
      loc.includes('ATTAPEU') ||
      loc.includes('NAM LÀO')
    ) {
      return 'NAM_LAO';
    }
    return 'KOUN_MOM';
  };

  const getItemRegion = (item: ImplementItem): string => {
    const text = (((item.standardPurpose || '') + ' ' + (item.gatheringLocation || '') + ' ' + (item.unit || '') + ' ' + (item.managerName || ''))).normalize('NFC').toUpperCase();
    if (text.includes('DP')) return 'DP';
    if (text.includes('LP')) return 'LP';
    if (text.includes('AD')) return 'AD';
    return 'KLH';
  };

  // Lọc danh sách gốc theo Khu liên hợp đã chọn
  const klhEquipment = useMemo(() => {
    if (!selectedComplex || selectedComplex === ALL) return equipmentList;
    return equipmentList.filter((item) => getItemComplex(item) === selectedComplex);
  }, [equipmentList, selectedComplex]);

  // Thống kê nhanh tự động nhảy theo Khu liên hợp
  const dynamicStats = useMemo(() => {
    const list = klhEquipment;
    const total = list.length;
    const attached = list.filter((it) => it.status === 'ATTACHED').length;
    const inDepot = list.filter((it) => it.status === 'IN_DEPOT' && it.technicalCondition !== 'NEED_REPAIR').length;
    const maintenance = list.filter((it) => it.status === 'MAINTENANCE' || it.technicalCondition === 'NEED_REPAIR').length;
    const gpsCount = list.filter((it) => it.currentVehicleId !== null && it.currentVehicleId !== undefined).length;

    const danCay = list.filter((it) => it.category === 'DAN_CAY').length;
    const danBuaXoi = list.filter((it) => it.category === 'DAN_BUA' || it.category === 'DAN_XOI').length;
    const roMooc = list.filter((it) => it.category === 'RO_MOOC').length;

    return {
      total,
      attached,
      inDepot,
      maintenance,
      gpsCount,
      danCay,
      danBuaXoi,
      roMooc,
    };
  }, [klhEquipment]);

  // Dynamic Filter Options trích xuất từ dữ liệu thực tế của Khu liên hợp
  const unitOptions = useMemo(() => {
    const s = new Set<string>();
    klhEquipment.forEach((it) => {
      const u = getItemUnit(it);
      if (u) s.add(u);
    });
    return Array.from(s).sort();
  }, [klhEquipment]);

  const categoryOptions = useMemo(() => {
    const s = new Set<string>();
    klhEquipment.forEach((it) => {
      if (it.category) s.add(it.category);
    });
    return Array.from(s).sort();
  }, [klhEquipment]);

  const brandOptions = useMemo(() => {
    const s = new Set<string>();
    klhEquipment.forEach((it) => {
      const b = getItemBrand(it);
      if (b && b !== '—') s.add(b);
    });
    return Array.from(s).sort();
  }, [klhEquipment]);

  const modelOptions = useMemo(() => {
    const s = new Set<string>();
    klhEquipment.forEach((it) => {
      const m = getItemModel(it);
      if (m && m !== '—') s.add(m);
    });
    return Array.from(s).sort();
  }, [klhEquipment]);

  const originOptions = useMemo(() => {
    const s = new Set<string>();
    klhEquipment.forEach((it) => {
      const o = getProp(it.standardPurpose, 'Xuất xứ');
      if (o && o !== '—') s.add(o);
    });
    return Array.from(s).sort();
  }, [klhEquipment]);

  const yearOptions = useMemo(() => {
    const s = new Set<string>();
    klhEquipment.forEach((it) => {
      const y = getItemYear(it);
      if (y && y !== '—') s.add(y);
    });
    return Array.from(s).sort((a, b) => Number(b) - Number(a));
  }, [klhEquipment]);

  // SelectOptions cho SearchableSelect (Đồng bộ nhãn chuẩn với Hồ sơ xe)
  const unitSelectOptions = useMemo<SelectOption[]>(() => {
    return unitOptions.map((u) => ({ value: u, label: u }));
  }, [unitOptions]);

  const locationOptions = useMemo(() => {
    const s = new Set<string>();
    klhEquipment.forEach((it) => {
      const l = getItemLocation(it);
      if (l && l !== '—') s.add(l);
    });
    return Array.from(s).sort();
  }, [klhEquipment]);

  const locationSelectOptions = useMemo<SelectOption[]>(() => {
    return locationOptions.map((l) => ({ value: l, label: l }));
  }, [locationOptions]);

  const categorySelectOptions = useMemo<SelectOption[]>(() => {
    return categoryOptions.map((c) => ({
      value: c,
      label: CATEGORY_NAMES[c]?.label || c,
    }));
  }, [categoryOptions]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    klhEquipment.forEach((it) => {
      if (it.category) counts[it.category] = (counts[it.category] || 0) + 1;
    });
    return counts;
  }, [klhEquipment]);

  const complexSelectOptions = useMemo<SelectOption[]>(() => [
    { value: 'KOUN_MOM', label: 'Khu liên hợp Koun Mom' },
    { value: 'SNOUL', label: 'Khu liên hợp Snoul' },
    { value: 'NAM_LAO', label: 'Khu liên hợp Nam Lào' },
  ], []);

  const regionSelectOptions = useMemo<SelectOption[]>(() => [
    { value: 'DP', label: 'DP' },
    { value: 'LP', label: 'LP' },
    { value: 'AD', label: 'AD' },
    { value: 'KLH', label: 'KLH' },
  ], []);

  const manufacturerSelectOptions = useMemo<SelectOption[]>(() => {
    return brandOptions.map((b) => ({ value: b, label: b }));
  }, [brandOptions]);

  const modelSelectOptions = useMemo<SelectOption[]>(() => {
    return modelOptions.map((m) => ({ value: m, label: m }));
  }, [modelOptions]);

  const originSelectOptions = useMemo<SelectOption[]>(() => {
    return originOptions.map((o) => ({ value: o, label: o }));
  }, [originOptions]);

  const yearSelectOptions = useMemo<SelectOption[]>(() => {
    return yearOptions.map((y) => ({ value: y, label: `Năm ${y}` }));
  }, [yearOptions]);

  const statusSelectOptions = useMemo<SelectOption[]>(() => [
    { value: 'active', label: 'Bình thường' },
    { value: 'maintenance', label: 'Đang bảo dưỡng' },
    { value: 'repair', label: 'Hư hỏng / Sửa chữa' },
  ], []);

  const alertTierSelectOptions = useMemo<SelectOption[]>(() => [
    { value: 'RED', label: 'Cảnh báo Đỏ (≤20h / Hư hỏng)' },
    { value: 'AMBER', label: 'Cảnh báo Vàng (≤50h / Mòn chảo)' },
    { value: 'GREEN', label: 'Bình thường (Xanh)' },
  ], []);

  // Đếm số lượng bộ lọc đang active
  const activeFilterCount = [
    searchTerm.trim() ? 'search' : '',
    searchCode.trim() ? 'code' : '',
    searchName.trim() ? 'name' : '',
    searchLocation.trim() ? 'loc' : '',
    selectedUnit !== ALL ? selectedUnit : '',
    selectedLocation !== ALL ? selectedLocation : '',
    selectedCategory !== ALL ? selectedCategory : '',
    selectedComplex !== ALL ? selectedComplex : '',
    selectedRegion !== ALL ? selectedRegion : '',
    selectedManufacturer !== ALL ? selectedManufacturer : '',
    selectedModel !== ALL ? selectedModel : '',
    selectedOrigin !== ALL ? selectedOrigin : '',
    selectedYear !== ALL ? selectedYear : '',
    selectedStatus !== ALL ? selectedStatus : '',
    selectedCondition !== ALL ? selectedCondition : '',
    selectedAlertTier !== ALL ? selectedAlertTier : '',
  ].filter(Boolean).length;

  const resetFilters = () => {
    setSearchTerm('');
    setSearchCode('');
    setSearchName('');
    setSearchLocation('');
    setSelectedUnit(ALL);
    setSelectedLocation(ALL);
    setSelectedCategory(ALL);
    setSelectedComplex(ALL);
    setSelectedRegion(ALL);
    setSelectedManufacturer(ALL);
    setSelectedModel(ALL);
    setSelectedOrigin(ALL);
    setSelectedYear(ALL);
    setSelectedStatus(ALL);
    setSelectedCondition(ALL);
    setSelectedAlertTier(ALL);
    setPage(1);
  };

  // Filtered items theo cả bộ lọc nâng cao và từng cột
  const filteredList = useMemo(() => {
    return klhEquipment.filter((item) => {
      // 1. Tab Filter
      if (activeTab === 'attached' && item.status !== 'ATTACHED') return false;
      if (activeTab === 'in_depot' && (item.status !== 'IN_DEPOT' || item.technicalCondition === 'NEED_REPAIR')) return false;
      if (activeTab === 'maintenance' && item.status !== 'MAINTENANCE' && item.technicalCondition !== 'NEED_REPAIR') return false;

      // 3. Region Filter (Khu vực địa lý: DP, LP, AD, KLH)
      if (selectedRegion !== ALL) {
        const itemRegion = getItemRegion(item);
        if (itemRegion !== selectedRegion) return false;
      }

      // 4. Unit Filter (Đơn vị sử dụng)
      if (selectedUnit !== ALL) {
        const u = getItemUnit(item).normalize('NFC').toLowerCase();
        const selU = selectedUnit.normalize('NFC').toLowerCase();
        const purpose = (item.standardPurpose || '').normalize('NFC').toLowerCase();
        if (u !== selU && !purpose.includes(selU)) return false;
      }

      // 4.1. Location Filter (Đơn vị / Nơi tập kết)
      if (selectedLocation !== ALL) {
        const loc = getItemLocation(item).normalize('NFC').toLowerCase();
        const selLoc = selectedLocation.normalize('NFC').toLowerCase();
        const purpose = (item.standardPurpose || '').normalize('NFC').toLowerCase();
        if (loc !== selLoc && !purpose.includes(selLoc)) return false;
      }

      // 5. Category Filter (Chủng loại)
      if (selectedCategory !== ALL && item.category !== selectedCategory) return false;

      // 6. Manufacturer Filter (Hãng / Nhãn hiệu)
      if (selectedManufacturer !== ALL) {
        const b = getItemBrand(item);
        if (b !== selectedManufacturer) return false;
      }

      // 7. Model Filter
      if (selectedModel !== ALL) {
        const m = getItemModel(item);
        if (m !== selectedModel) return false;
      }

      // 8. Origin Filter (Xuất xứ)
      if (selectedOrigin !== ALL) {
        const o = getProp(item.standardPurpose, 'Xuất xứ');
        if (o !== selectedOrigin) return false;
      }

      // 9. Year Filter (Năm sản xuất)
      if (selectedYear !== ALL) {
        const y = getItemYear(item);
        if (y !== selectedYear) return false;
      }

      // 10. Status Filter (Trạng thái hệ thống)
      if (selectedStatus !== ALL) {
        if (selectedStatus === 'active' && (item.technicalCondition !== 'GOOD' || item.status === 'MAINTENANCE')) return false;
        if (selectedStatus === 'maintenance' && item.status !== 'MAINTENANCE') return false;
        if (selectedStatus === 'repair' && item.technicalCondition !== 'NEED_REPAIR' && item.status !== 'MAINTENANCE') return false;
        if (selectedStatus === 'ATTACHED' && item.status !== 'ATTACHED') return false;
        if (selectedStatus === 'IN_DEPOT' && item.status !== 'IN_DEPOT') return false;
      }

      // 11. Condition Filter (Tình trạng kỹ thuật)
      if (selectedCondition !== ALL) {
        if (selectedCondition === 'NEED_REPAIR' && item.technicalCondition !== 'NEED_REPAIR' && item.status !== 'MAINTENANCE') return false;
        if (selectedCondition === 'GOOD' && (item.technicalCondition === 'NEED_REPAIR' || item.status === 'MAINTENANCE')) return false;
      }

      // 12. AlertTier Filter (Cảnh báo bảo dưỡng)
      if (selectedAlertTier !== ALL) {
        if (selectedAlertTier === 'RED' && item.technicalCondition !== 'NEED_REPAIR' && item.status !== 'MAINTENANCE') return false;
        if (selectedAlertTier === 'AMBER' && item.technicalCondition !== 'WORN_OUT') return false;
        if (selectedAlertTier === 'GREEN' && (item.technicalCondition !== 'GOOD' || item.status === 'MAINTENANCE')) return false;
      }

      // 13. Column-Level Quick Searches
      if (searchCode.trim()) {
        const q = searchCode.toLowerCase().trim();
        if (!item.code.toLowerCase().includes(q)) return false;
      }

      if (searchName.trim()) {
        const q = searchName.toLowerCase().trim();
        const b = getItemBrand(item).toLowerCase();
        const m = getItemModel(item).toLowerCase();
        const c = (CATEGORY_NAMES[item.category]?.label || item.category).toLowerCase();
        if (!item.name.toLowerCase().includes(q) && !b.includes(q) && !m.includes(q) && !c.includes(q)) {
          return false;
        }
      }

      if (searchLocation.trim()) {
        const q = searchLocation.toLowerCase().trim();
        const loc = getItemLocation(item).toLowerCase();
        const mgr = getItemManager(item).toLowerCase();
        if (!loc.includes(q) && !mgr.includes(q)) return false;
      }

      // 14. Top General Search (nếu có nhập)
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchCode = item.code.toLowerCase().includes(query);
        const matchName = item.name.toLowerCase().includes(query);
        const matchMgr = getItemManager(item).toLowerCase().includes(query);
        const matchLoc = getItemLocation(item).toLowerCase().includes(query);
        const matchVehicle = item.currentVehicle?.code?.toLowerCase().includes(query) ||
                             item.currentVehicle?.name?.toLowerCase().includes(query);
        const matchPurpose = (item.standardPurpose || '').toLowerCase().includes(query);
        if (!matchCode && !matchName && !matchMgr && !matchLoc && !matchVehicle && !matchPurpose) return false;
      }

      return true;
    });
  }, [
    equipmentList,
    activeTab,
    selectedComplex,
    selectedRegion,
    selectedUnit,
    selectedCategory,
    selectedManufacturer,
    selectedModel,
    selectedOrigin,
    selectedYear,
    selectedStatus,
    selectedCondition,
    selectedAlertTier,
    searchCode,
    searchName,
    searchLocation,
    searchTerm,
  ]);

  // Paginated slice
  const paginatedList = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredList.slice(start, start + pageSize);
  }, [filteredList, page, pageSize]);

  const totalPages = Math.ceil(filteredList.length / pageSize) || 1;

  // Handle Attach Vehicle Modal
  const openAttachModal = async (item: ImplementItem) => {
    setAttachingItem(item);
    setSelectedVehicleId('');
    setAttachMessage(null);
    try {
      const unit = getItemUnit(item);
      const vehicles = await apiService.getVehicles({
        assignedUnitCode: unit.includes('DP') ? 'DP' : unit.includes('LP') ? 'LP' : undefined,
      });
      setAvailableVehicles(vehicles.slice(0, 100));
    } catch (e) {
      console.error(e);
    }
  };

  const handleConfirmAttach = async () => {
    if (!attachingItem || !selectedVehicleId) return;
    setAttachingLoading(true);
    setAttachMessage(null);
    try {
      const vId = parseInt(selectedVehicleId.replace(/\D/g, ''), 10);
      await apiService.attachImplement(attachingItem.id, vId);
      setAttachMessage({ type: 'success', text: 'Gắn thiết bị vào xe cơ giới thành công!' });
      setTimeout(() => {
        setAttachingItem(null);
        void loadData();
      }, 700);
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Không thể gắn xe.';
      setAttachMessage({ type: 'error', text: Array.isArray(msg) ? msg.join(', ') : msg });
    } finally {
      setAttachingLoading(false);
    }
  };

  const handleDetach = async (item: ImplementItem) => {
    if (!window.confirm(`Xác nhận tháo nông cụ ${item.code} - ${item.name} về lại bãi tập kết?`)) return;
    try {
      await apiService.detachImplement(item.id, 'Tháo hoàn thành ca máy');
      void loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Lỗi khi tháo nông cụ.');
    }
  };

  // Handle Export Excel
  const handleExportExcel = () => {
    try {
      const exportData = filteredList.map((item, idx) => ({
        'STT': idx + 1,
        'MÃ MMTB MỚI': item.code,
        'TÊN MMTB': item.name,
        'CHỦNG LOẠI': CATEGORY_NAMES[item.category]?.label || item.category,
        'TÌNH TRẠNG MUA': getItemPurchaseCondition(item),
        'ĐƠN VỊ QUẢN LÝ': getItemUnit(item),
        'THƯƠNG HIỆU': getItemBrand(item),
        'MODEL': getItemModel(item),
        'NĂM SX': getItemYear(item),
        'NHÂN SỰ QUẢN LÝ': getItemManager(item),
        'ĐỊA CHỈ (NƠI TẬP KẾT)': getItemLocation(item),
        'SỐ LIÊN LẠC (ZALO)': getItemPhone(item),
        'TÌNH TRẠNG KỸ THUẬT': item.technicalCondition === 'NEED_REPAIR' ? 'Hư hỏng' : 'Bình thường',
        'TRẠNG THÁI VẬN HÀNH': item.status === 'ATTACHED' ? 'Đang gắn xe' : item.status === 'MAINTENANCE' ? 'Đang bảo dưỡng' : 'Sẵn sàng tại bãi',
        'XE ĐANG GẮN KÈM': item.currentVehicle ? `${item.currentVehicle.code} - ${item.currentVehicle.name}` : 'Chưa gắn xe',
        'GHI CHÚ TỪ EXCEL': item.standardPurpose || '',
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'DS_NONG_CU_THIET_BI');
      XLSX.writeFile(
        workbook,
        `DS_NONG_CU_THIET_BI_THACO_AGRI_KOUN_MOM_${new Date().toISOString().slice(0, 10)}.xlsx`
      );
    } catch (error) {
      console.error('Không thể xuất Excel', error);
      alert('Không thể xuất Excel từ dữ liệu đang lọc.');
    }
  };

  // --------------------------------------------------------------------------
  // TABLE COLUMNS DEFINITION
  // --------------------------------------------------------------------------
  // 1. COMPACT COLUMNS (Bảng Vận Hành Thu Gọn)
  const compactColumns: Column<ImplementItem>[] = [
    {
      key: 'code',
      title: 'MÃ NÔNG CỤ & ERP',
      sortable: true,
      width: '160px',
      render: (item) => (
        <div>
          <button
            type="button"
            onClick={() => setSelectedEquipment(item)}
            className="text-left font-mono text-xs font-extrabold text-[#15803d] hover:underline"
          >
            {item.code}
          </button>
          <div className="flex items-center gap-1 mt-0.5">
            <span className="inline-flex rounded border border-emerald-200 bg-emerald-50 px-1 py-0.2 font-mono text-[9px] font-bold text-emerald-800">
              {getItemPurchaseCondition(item)}
            </span>
            <span className="text-[10px] text-slate-400">
              {getItemYear(item) !== '—' ? `SX ${getItemYear(item)}` : ''}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: 'name',
      title: 'TÊN THIẾT BỊ & CHỦNG LOẠI',
      sortable: true,
      render: (item) => (
        <div className="max-w-[280px] whitespace-normal">
          <div className="text-xs font-bold text-slate-900 leading-tight">
            {item.name}
          </div>
          <div className="text-[10px] font-semibold text-slate-500 mt-0.5 flex items-center gap-1.5">
            <span className={`inline-flex items-center rounded px-1.5 py-0.2 text-[9px] font-bold border ${CATEGORY_NAMES[item.category]?.badge}`}>
              {CATEGORY_NAMES[item.category]?.label || item.category}
            </span>
            {getItemBrand(item) !== '—' && <span>{getItemBrand(item)}</span>}
          </div>
        </div>
      ),
    },
    {
      key: 'unit',
      title: 'ĐƠN VỊ & NƠI TẬP KẾT',
      sortable: true,
      width: '210px',
      render: (item) => {
        const unitName = getItemUnit(item);
        const locationName = getItemLocation(item);
        const manager = getItemManager(item);
        const phone = getItemPhone(item);
        return (
          <div>
            <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-800">
              <Building2 className="h-3 w-3 text-slate-500" />
              {unitName}
            </span>
            {locationName && (
              <div className="mt-1 flex items-center gap-1 text-[11px] font-bold text-emerald-800">
                <MapPin className="h-3 w-3 text-emerald-600 shrink-0" />
                <span className="truncate max-w-[150px]" title={locationName}>{locationName}</span>
              </div>
            )}
            {manager && manager !== 'Ban Cơ Giới' && (
              <div className="mt-0.5 flex items-center gap-1 text-[10px] font-semibold text-blue-700">
                <UserCheck className="h-2.5 w-2.5 text-blue-500 shrink-0" />
                <span>{manager}</span>
                {phone && <span className="text-slate-400 font-mono">({phone})</span>}
              </div>
            )}
          </div>
        );
      },
      filterElement: (
        <select
          value={selectedLocation !== ALL ? selectedLocation : selectedUnit}
          onChange={(e) => {
            const val = e.target.value;
            if (val === ALL) {
              setSelectedLocation(ALL);
              setSelectedUnit(ALL);
            } else if (locationOptions.includes(val)) {
              setSelectedLocation(val);
              setSelectedUnit(ALL);
            } else {
              setSelectedUnit(val);
              setSelectedLocation(ALL);
            }
            setPage(1);
          }}
          className="h-7 w-full rounded border border-slate-300 bg-white px-1 text-[11px] text-slate-800 outline-none focus:border-emerald-600"
        >
          <option value={ALL}>Tất cả đơn vị & nơi tập kết</option>
          {locationOptions.length > 0 && (
            <optgroup label="📍 Nơi tập kết">
              {locationSelectOptions.map((l) => (
                <option key={`loc-${l.value}`} value={l.value}>
                  {l.label}
                </option>
              ))}
            </optgroup>
          )}
          {unitOptions.length > 0 && (
            <optgroup label="🏢 Đơn vị sử dụng">
              {unitSelectOptions.map((u) => (
                <option key={`unit-${u.value}`} value={u.value}>
                  {u.label}
                </option>
              ))}
            </optgroup>
          )}
        </select>
      ),
    },
    {
      key: 'status',
      title: 'TRẠNG THÁI & TÌNH TRẠNG KT',
      sortable: true,
      width: '200px',
      render: (item) => {
        const meta = statusMeta(item);
        return (
          <div>
            <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${meta.badgeClass}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${meta.dotClass}`} />
              {meta.label}
            </span>
            {item.currentVehicle && (
              <div className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
                <Tractor className="h-3 w-3 text-sky-600" />
                <span>{item.currentVehicle.name}</span>
              </div>
            )}
          </div>
        );
      },
    },
    {
      key: 'actions',
      title: 'THAO TÁC',
      width: '160px',
      align: 'center',
      render: (item) => {
        const isAttached = item.status === 'ATTACHED';
        const isMaintenance = item.status === 'MAINTENANCE';
        return (
          <div className="flex items-center justify-center gap-1.5">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setSelectedEquipment(item)}
              className="h-7 text-[11px] px-2 font-bold"
              title="Xem chi tiết lý lịch nông cụ"
            >
              <Eye className="h-3 w-3 mr-1" /> Chi tiết
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setEditingEquipment(item)}
              className="h-7 text-[11px] px-2 font-bold border-amber-300 text-amber-800 bg-amber-50/70 hover:bg-amber-100 hover:border-amber-400"
              title="Chỉnh sửa thông tin & cập nhật sửa chữa"
            >
              <Edit className="h-3 w-3 mr-1 text-amber-700" /> Sửa
            </Button>
            {isAttached ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => void handleDetach(item)}
                className="h-7 text-[10px] px-1.5 font-bold text-rose-700 border-rose-200 bg-rose-50 hover:bg-rose-100"
                title="Tháo nông cụ khỏi xe đưa về bãi"
              >
                <Unlink className="h-3 w-3 mr-0.5" /> Tháo
              </Button>
            ) : !isMaintenance ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => void openAttachModal(item)}
                className="h-7 text-[10px] px-1.5 font-bold text-sky-700 border-sky-200 bg-sky-50 hover:bg-sky-100"
                title="Gắn nông cụ vào xe cơ giới"
              >
                <Link2 className="h-3 w-3 mr-0.5" /> Gắn xe
              </Button>
            ) : null}
          </div>
        );
      },
    },
  ];

  // 2. FULL EXCEL COLUMNS (Toàn bộ Cột Chuẩn Excel)
  const fullExcelColumns: Column<ImplementItem>[] = [
    {
      key: 'code',
      title: 'MÃ MMTB MỚI',
      sortable: true,
      width: '145px',
      render: (item) => (
        <div>
          <button
            type="button"
            onClick={() => setSelectedEquipment(item)}
            className="text-left font-mono text-xs font-extrabold text-[#15803d] hover:underline"
          >
            {item.code}
          </button>
          <div className="text-[10px] text-slate-400">{CATEGORY_NAMES[item.category]?.label || item.category}</div>
        </div>
      ),
    },
    {
      key: 'purchaseCondition',
      title: 'TÌNH TRẠNG MUA',
      sortable: true,
      width: '130px',
      render: (item) => <span className="text-xs text-slate-700">{getItemPurchaseCondition(item)}</span>,
    },
    {
      key: 'name',
      title: 'TÊN MMTB',
      sortable: true,
      render: (item) => (
        <div className="max-w-[240px] whitespace-normal">
          <div className="text-xs font-bold text-slate-900">{item.name}</div>
          <div className="text-[10px] text-slate-500">{getItemBrand(item)} {getItemModel(item) !== '—' ? `· ${getItemModel(item)}` : ''}</div>
        </div>
      ),
    },
    {
      key: 'unit',
      title: 'ĐƠN VỊ SỬ DỤNG',
      sortable: true,
      width: '140px',
      render: (item) => <span className="font-bold text-xs text-slate-800">{getItemUnit(item)}</span>,
    },
    {
      key: 'brand',
      title: 'THƯƠNG HIỆU',
      sortable: true,
      width: '130px',
      render: (item) => <span className="text-xs text-slate-800">{getItemBrand(item)}</span>,
    },
    {
      key: 'model',
      title: 'MODEL',
      sortable: true,
      width: '120px',
      render: (item) => <span className="font-mono text-xs text-slate-700">{getItemModel(item)}</span>,
    },
    {
      key: 'year',
      title: 'NĂM SX',
      sortable: true,
      width: '90px',
      render: (item) => <span className="font-mono text-xs text-slate-600">{getItemYear(item)}</span>,
    },
    {
      key: 'managerName',
      title: 'NHÂN SỰ QUẢN LÝ',
      sortable: true,
      width: '160px',
      render: (item) => {
        const mgr = getItemManager(item);
        const phone = getItemPhone(item);
        return (
          <div>
            <div className="font-bold text-xs text-blue-900">{mgr}</div>
            {phone && (
              <div className="text-[10px] text-slate-500 font-mono flex items-center gap-0.5 mt-0.5">
                <Phone className="h-2.5 w-2.5 text-blue-500" />
                {phone}
              </div>
            )}
          </div>
        );
      },
    },
    {
      key: 'gatheringLocation',
      title: 'ĐỊA CHỈ (NƠI TẬP KẾT)',
      sortable: true,
      width: '160px',
      render: (item) => {
        const loc = getItemLocation(item);
        return (
          <div className="flex items-center gap-1 font-bold text-xs text-emerald-800">
            <MapPin className="h-3 w-3 text-emerald-600 shrink-0" />
            <span className="truncate max-w-[140px]" title={loc}>{loc}</span>
          </div>
        );
      },
    },
    {
      key: 'technicalCondition',
      title: 'TÌNH TRẠNG KỸ THUẬT',
      sortable: true,
      width: '140px',
      render: (item) => {
        const isDamaged = item.technicalCondition === 'NEED_REPAIR' || item.status === 'MAINTENANCE';
        return (
          <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${
            isDamaged
              ? 'border-rose-300 bg-rose-50 text-rose-700'
              : 'border-emerald-300 bg-emerald-50 text-emerald-700'
          }`}>
            <span className={`h-1.5 w-1.5 rounded-full ${isDamaged ? 'bg-rose-500' : 'bg-emerald-500'}`} />
            {isDamaged ? 'Hư hỏng' : 'Bình thường'}
          </span>
        );
      },
    },
    {
      key: 'status',
      title: 'TRẠNG THÁI VẬN HÀNH',
      sortable: true,
      width: '150px',
      render: (item) => {
        const meta = statusMeta(item);
        return (
          <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${meta.badgeClass}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${meta.dotClass}`} />
            {meta.label}
          </span>
        );
      },
    },
    {
      key: 'actions',
      title: 'THAO TÁC',
      width: '145px',
      align: 'center',
      render: (item) => (
        <div className="flex items-center justify-center gap-1">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setSelectedEquipment(item)}
            className="h-7 text-[11px] px-2 font-bold"
            title="Xem chi tiết lý lịch nông cụ"
          >
            <Eye className="h-3 w-3 mr-1" /> Chi tiết
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setEditingEquipment(item)}
            className="h-7 text-[11px] px-2 font-bold border-amber-300 text-amber-800 bg-amber-50/70 hover:bg-amber-100 hover:border-amber-400"
            title="Chỉnh sửa thông tin & cập nhật sửa chữa"
          >
            <Edit className="h-3 w-3 mr-1 text-amber-700" /> Sửa
          </Button>
          {item.status === 'ATTACHED' ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => void handleDetach(item)}
              className="h-7 text-[10px] px-1.5 font-bold text-rose-700 border-rose-200 bg-rose-50 hover:bg-rose-100"
            >
              Tháo
            </Button>
          ) : item.status !== 'MAINTENANCE' ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => void openAttachModal(item)}
              className="h-7 text-[10px] px-1.5 font-bold text-sky-700 border-sky-200 bg-sky-50 hover:bg-sky-100"
            >
              Gắn
            </Button>
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">


      {/* 4x2 DASHBOARD TILES GRID (THIẾT KẾ ĐỒNG BỘ 8 THẺ CARD SÁNG CÓ THANH VIỀN ĐÁY) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Row 1 - Card 1: Tất cả thiết bị & Nông cụ */}
        <button
          type="button"
          onClick={() => {
            setActiveTab('all');
            setSelectedCategory(ALL);
            setPage(1);
          }}
          className={`relative overflow-hidden p-4 rounded-2xl border text-left transition-all hover:shadow-md cursor-pointer ${
            activeTab === 'all' && selectedCategory === ALL
              ? 'border-blue-500 bg-blue-50/40 ring-2 ring-blue-500/25 shadow-sm scale-[1.01]'
              : 'border-slate-200 bg-white hover:bg-slate-50'
          }`}
        >
          <span className="absolute inset-x-0 bottom-0 h-1.5 bg-blue-500" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Tất cả thiết bị & Nông cụ</span>
            <div className="rounded-xl p-2 bg-blue-50 text-blue-600">
              <Layers className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900">
            {loading ? '...' : dynamicStats.total.toLocaleString('vi-VN')}
          </div>
          <div className="mt-1 text-[11px] font-semibold text-slate-500 truncate">
            {selectedCategory !== ALL
              ? `Nhóm: ${CATEGORY_NAMES[selectedCategory]?.label || selectedCategory}`
              : selectedComplex !== ALL
              ? `Phân bổ tại ${selectedComplex === 'KOUN_MOM' ? 'KLH Koun Mom' : selectedComplex === 'SNOUL' ? 'KLH Snoul' : 'KLH Nam Lào'}`
              : '100% Dữ liệu thực từ database'}
          </div>
        </button>

        {/* Row 1 - Card 2: Sẵn sàng tại bãi đội */}
        <button
          type="button"
          onClick={() => {
            setActiveTab((curr) => (curr === 'in_depot' ? 'all' : 'in_depot'));
            setPage(1);
          }}
          className={`relative overflow-hidden p-4 rounded-2xl border text-left transition-all hover:shadow-md cursor-pointer ${
            activeTab === 'in_depot'
              ? 'border-emerald-500 bg-emerald-50/40 ring-2 ring-emerald-500/25 shadow-sm scale-[1.01]'
              : 'border-slate-200 bg-white hover:bg-slate-50'
          }`}
        >
          <span className="absolute inset-x-0 bottom-0 h-1.5 bg-emerald-500" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Sẵn sàng tại bãi đội</span>
            <div className="rounded-xl p-2 bg-emerald-50 text-emerald-600">
              <Package className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-emerald-700">
            {loading ? '...' : dynamicStats.inDepot.toLocaleString('vi-VN')}
          </div>
          <div className="mt-1 text-[11px] font-semibold text-emerald-700 truncate">
            Sẵn sàng gắn vào xe làm đất
          </div>
        </button>

        {/* Row 1 - Card 3: Đang sửa chữa / Bảo dưỡng */}
        <button
          type="button"
          onClick={() => {
            setActiveTab((curr) => (curr === 'maintenance' ? 'all' : 'maintenance'));
            setPage(1);
          }}
          className={`relative overflow-hidden p-4 rounded-2xl border text-left transition-all hover:shadow-md cursor-pointer ${
            activeTab === 'maintenance'
              ? 'border-rose-500 bg-rose-50/40 ring-2 ring-rose-500/25 shadow-sm scale-[1.01]'
              : 'border-slate-200 bg-white hover:bg-slate-50'
          }`}
        >
          <span className="absolute inset-x-0 bottom-0 h-1.5 bg-rose-500" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-700">Đang sửa chữa / Bảo dưỡng</span>
            <div className="rounded-xl p-2 bg-rose-50 text-rose-600">
              <Wrench className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-rose-700">
            {loading ? '...' : dynamicStats.maintenance.toLocaleString('vi-VN')}
          </div>
          <div className="mt-1 text-[11px] font-semibold text-rose-600 truncate">
            Ghi nhận hư hỏng tại Xưởng BTSC
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
            {loading ? '...' : dynamicStats.gpsCount.toLocaleString('vi-VN')}
          </div>
          <div className="mt-1 text-[11px] font-semibold text-sky-700 truncate">
            Truyền tọa độ & cảm biến
          </div>
        </button>

        {/* ═══ ROW 2 — Phân loại Nông cụ & Thiết bị đính kèm (Tính động từ MySQL) ═══ */}

        {/* Card 5: Đang gắn trên xe */}
        <button
          type="button"
          onClick={() => {
            setActiveTab((curr) => (curr === 'attached' ? 'all' : 'attached'));
            setPage(1);
          }}
          className={`relative overflow-hidden p-4 rounded-2xl border text-left transition-all hover:shadow-md cursor-pointer ${
            activeTab === 'attached'
              ? 'border-sky-500 bg-sky-50/40 ring-2 ring-sky-500/25 shadow-sm scale-[1.01]'
              : 'border-slate-200 bg-white hover:bg-slate-50'
          }`}
        >
          <span className="absolute inset-x-0 bottom-0 h-1.5 bg-sky-500" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-900 truncate">Đang gắn trên xe</span>
            <div className="rounded-xl p-2 bg-sky-50 text-sky-600 border border-sky-200">
              <Tractor className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900">
            {loading ? '...' : dynamicStats.attached.toLocaleString('vi-VN')}
          </div>
          <div className="mt-1 text-[11px] font-semibold text-slate-500 truncate">
            Đang theo xe làm việc ngoài đồng
          </div>
        </button>

        {/* Card 6: Dàn cày nông nghiệp */}
        <button
          type="button"
          onClick={() => {
            setSelectedCategory((curr) => (curr === 'DAN_CAY' ? ALL : 'DAN_CAY'));
            setPage(1);
          }}
          className={`relative overflow-hidden p-4 rounded-2xl border text-left transition-all hover:shadow-md cursor-pointer ${
            selectedCategory === 'DAN_CAY'
              ? 'border-emerald-500 bg-emerald-50/40 ring-2 ring-emerald-500/30 scale-[1.01]'
              : 'border-slate-200 bg-white hover:bg-slate-50'
          }`}
        >
          <span className="absolute inset-x-0 bottom-0 h-1.5 bg-emerald-500" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-900 truncate">Dàn cày nông nghiệp</span>
            <div className="rounded-xl p-2 bg-emerald-50 text-emerald-600 border border-emerald-200">
              <Tractor className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900">
            {loading ? '...' : dynamicStats.danCay.toLocaleString('vi-VN')}
          </div>
          <div className="mt-1 text-[11px] font-semibold text-slate-500 truncate">
            Cày sâu 30-45cm làm đất
          </div>
        </button>

        {/* Card 7: Dàn bừa & xới làm đất */}
        <button
          type="button"
          onClick={() => {
            setSelectedCategory((curr) => (curr === 'DAN_BUA' ? ALL : 'DAN_BUA'));
            setPage(1);
          }}
          className={`relative overflow-hidden p-4 rounded-2xl border text-left transition-all hover:shadow-md cursor-pointer ${
            selectedCategory === 'DAN_BUA' || selectedCategory === 'DAN_XOI'
              ? 'border-amber-500 bg-amber-50/40 ring-2 ring-amber-500/30 scale-[1.01]'
              : 'border-slate-200 bg-white hover:bg-slate-50'
          }`}
        >
          <span className="absolute inset-x-0 bottom-0 h-1.5 bg-amber-500" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-900 truncate">Dàn bừa & xới làm đất</span>
            <div className="rounded-xl p-2 bg-amber-50 text-amber-600 border border-amber-200">
              <Tractor className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900">
            {loading ? '...' : dynamicStats.danBuaXoi.toLocaleString('vi-VN')}
          </div>
          <div className="mt-1 text-[11px] font-semibold text-slate-500 truncate">
            Bừa tơi xốp & lên luống
          </div>
        </button>

        {/* Card 8: Rơ-moóc & Moóc kéo */}
        <button
          type="button"
          onClick={() => {
            setSelectedCategory((curr) => (curr === 'RO_MOOC' ? ALL : 'RO_MOOC'));
            setPage(1);
          }}
          className={`relative overflow-hidden p-4 rounded-2xl border text-left transition-all hover:shadow-md cursor-pointer ${
            selectedCategory === 'RO_MOOC'
              ? 'border-purple-500 bg-purple-50/40 ring-2 ring-purple-500/30 scale-[1.01]'
              : 'border-slate-200 bg-white hover:bg-slate-50'
          }`}
        >
          <span className="absolute inset-x-0 bottom-0 h-1.5 bg-purple-500" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-900 truncate">Rơ-moóc & Moóc kéo</span>
            <div className="rounded-xl p-2 bg-purple-50 text-purple-600 border border-purple-200">
              <Tractor className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900">
            {loading ? '...' : dynamicStats.roMooc.toLocaleString('vi-VN')}
          </div>
          <div className="mt-1 text-[11px] font-semibold text-slate-500 truncate">
            Vận chuyển nông sản & vật tư
          </div>
        </button>
      </div>

      {/* 4. THANH TÌM KIẾM & CHỨC NĂNG VẬN HÀNH */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
        {/* ROW 1: HEADER ACTION BUTTONS */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <span className="font-heading text-sm font-extrabold text-slate-800 uppercase tracking-wide">
              Danh mục Thiết bị & Nông cụ
            </span>
            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
              {dynamicStats.total.toLocaleString('vi-VN')} bộ thiết bị
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <input ref={importInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImportExcel} />
            <button
              type="button"
              onClick={() => setIsCreatingEquipment(true)}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-primary bg-primary px-3.5 text-xs font-black text-white shadow-xs transition-all hover:bg-primary-600 hover:scale-[1.01]"
            >
              <Plus className="h-4 w-4 stroke-[3]" />
              Thêm mới thiết bị
            </button>

            <button
              type="button"
              onClick={() => void catalogsApi.downloadTemplate('IMPLEMENT')}
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
              onClick={() => void loadData()}
              disabled={loading}
              title="Làm mới dữ liệu"
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700 transition-all hover:bg-slate-100 disabled:opacity-50"
            >
              <RotateCcw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
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
                type="text"
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                placeholder="Nhập tên nông cụ, thiết bị, bãi tập kết, đơn vị quản lý..."
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

        {/* METADATA CỦA TOÀN BỘ BỘ LỌC NÂNG CAO (8 Ô LƯỚI CHUẨN 4 CỘT) */}
        {showAdvancedFilters && (
          <div className="grid grid-cols-1 gap-3 border-t border-slate-100 pt-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                Đơn vị sử dụng (Xí nghiệp / Đội)
              </label>
              <SearchableSelect
                value={selectedUnit}
                onChange={(val) => { setSelectedUnit(val); setPage(1); }}
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
                onChange={(val) => { setSelectedLocation(val); setPage(1); }}
                options={locationSelectOptions}
                placeholder={`Tất cả nơi tập kết (${locationOptions.length})`}
                emptyOptionLabel={`Tất cả nơi tập kết (${locationOptions.length})`}
                heightClass="h-9"
                icon={<MapPin className="h-4 w-4" />}
              />
            </div>

            <div>
              <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                Chủng loại nông cụ ({categoryOptions.length} loại)
              </label>
              <SearchableSelect
                value={selectedCategory}
                onChange={(val) => { setSelectedCategory(val); setPage(1); }}
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
                onChange={(val) => { setSelectedRegion(val); setPage(1); }}
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
                onChange={(val) => { setSelectedManufacturer(val); setPage(1); }}
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
                onChange={(val) => { setSelectedModel(val); setPage(1); }}
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
                onChange={(val) => { setSelectedOrigin(val); setPage(1); }}
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
                onChange={(val) => { setSelectedYear(val); setPage(1); }}
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
                onChange={(val) => { setSelectedStatus(val); setPage(1); }}
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
                onChange={(val) => { setSelectedAlertTier(val); setPage(1); }}
                options={alertTierSelectOptions}
                placeholder="Tất cả cảnh báo"
                emptyOptionLabel="Tất cả cảnh báo"
                heightClass="h-9"
              />
            </div>
          </div>
        )}
      </section>

      {/* 5. BẢNG HỒ SƠ CHUẨN MỰC: CÓ NÚT CHUYỂN ĐỔI CHẾ ĐỘ XEM */}
      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="flex flex-wrap items-center justify-between border-b border-slate-200 px-4 py-3 bg-slate-50/70">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-sm text-slate-900">Danh sách Thiết bị đính kèm & Nông cụ</span>
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800">
              {filteredList.length.toLocaleString('vi-VN')} bản ghi
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

        <div className="overflow-x-auto">
          <DataTable
            data={paginatedList}
            columns={tableViewMode === 'excel_23' ? fullExcelColumns : compactColumns}
            isLoading={loading}
            pageSize={pageSize}
            showSearch={false}
            showExport={false}
            showPagination={false}
            useGlobalFilters={false}
          />
        </div>

        {/* Phân trang chuẩn */}
        {/* Phân trang chuẩn */}
        <div className="p-3 border-t border-slate-200/80 bg-slate-50/70 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
          <div className="font-medium">
            Hiển thị <span className="font-bold text-slate-900">{filteredList.length > 0 ? (page - 1) * pageSize + 1 : 0}</span> –{' '}
            <span className="font-bold text-slate-900">{Math.min(page * pageSize, filteredList.length)}</span> trên{' '}
            <span className="font-bold text-slate-900">{filteredList.length.toLocaleString('vi-VN')}</span> thiết bị (20 dòng/trang)
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Nút Trang Trước */}
            <button
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              disabled={page <= 1 || loading}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow-2xs hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              title="Trang trước"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Các nút số trang: 1 2 3 ... totalPages */}
            {(() => {
              const currentP = page;
              const totalP = Math.max(1, totalPages);
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
              onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
              disabled={page >= totalPages || loading}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow-2xs hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              title="Trang sau"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {/* Nút Trang Cuối */}
            {page < totalPages && totalPages > 5 && (
              <button
                onClick={() => setPage(totalPages)}
                disabled={loading}
                className="ml-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-600 hover:bg-slate-100 hover:text-[#1B4D20] transition-colors"
                title="Đến trang cuối cùng"
              >
                Trang cuối ({totalPages})
              </button>
            )}
          </div>
        </div>
      </section>

      {/* 6. MODAL GẮN NÔNG CỤ VÀO XE CƠ GIỚI THỰC TẾ */}
      {attachingItem && (
        <Modal
          isOpen={Boolean(attachingItem)}
          onClose={() => setAttachingItem(null)}
          title={`Gắn thiết bị vào xe: ${attachingItem.code} - ${attachingItem.name}`}
          size="md"
        >
          <div className="space-y-4">
            <div className="rounded-xl border border-sky-200 bg-sky-50/70 p-3.5 text-xs text-sky-900 space-y-1">
              <div className="font-extrabold flex items-center gap-1.5">
                <Tractor className="h-4 w-4 text-sky-700" />
                <span>Nông cụ được điều động:</span>
              </div>
              <p>Mã: <b>{attachingItem.code}</b> — {attachingItem.name}</p>
              <p>Đơn vị: <b>{getItemUnit(attachingItem)}</b> · Nơi tập kết: <b>{getItemLocation(attachingItem)}</b></p>
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700">
                Chọn phương tiện cơ giới của đội để gắn:
              </label>
              <SearchableSelect
                value={selectedVehicleId}
                onChange={(val) => setSelectedVehicleId(val)}
                options={availableVehicles.map((v) => ({
                  value: v.id,
                  label: `${v.internalCode} - ${v.brandModel || v.vehicleCategory} (${v.teamUnit || v.assignedUnitCode})`,
                }))}
                placeholder="-- Chọn xe cơ giới nhận nông cụ --"
                emptyOptionLabel="-- Chọn xe cơ giới --"
                heightClass="h-9"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">
                Hệ thống hiển thị danh sách xe cơ giới thực tế (máy kéo, máy cày, máy đào, máy ủi) thuộc cùng đơn vị.
              </span>
            </div>

            {attachMessage && (
              <div className={`p-2.5 rounded-lg text-xs font-bold ${
                attachMessage.type === 'success' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
              }`}>
                {attachMessage.text}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button variant="outline" size="sm" onClick={() => setAttachingItem(null)}>
                Hủy bỏ
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => void handleConfirmAttach()}
                disabled={!selectedVehicleId || attachingLoading}
                className="bg-sky-700 hover:bg-sky-800 text-white font-bold"
              >
                {attachingLoading ? 'Đang xử lý...' : 'Xác nhận gắn xe'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* 7. MODAL HỒ SƠ CHI TIẾT NÔNG CỤ (THIẾT KẾ ĐỒNG BỘ 100% VỚI HỒ SƠ XE) */}
      {selectedEquipment && (
        <Modal
          isOpen={Boolean(selectedEquipment)}
          onClose={() => setSelectedEquipment(null)}
          title={`Hồ sơ chi tiết: ${selectedEquipment.code} - ${selectedEquipment.name}`}
          size="xl"
        >
          <div className="space-y-4">
            {/* Modal Header Card */}
            <div className="rounded-xl border border-emerald-200 bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-base font-black text-emerald-900">
                      {selectedEquipment.code}
                    </span>
                    <span className={`rounded-full border px-2.5 py-0.5 text-xs font-bold ${statusMeta(selectedEquipment).badgeClass}`}>
                      {statusMeta(selectedEquipment).label}
                    </span>
                    <span className={`rounded-md border px-2 py-0.5 text-xs font-bold ${CATEGORY_NAMES[selectedEquipment.category]?.badge}`}>
                      {CATEGORY_NAMES[selectedEquipment.category]?.label || selectedEquipment.category}
                    </span>
                  </div>
                  <h3 className="mt-1 text-sm font-extrabold text-slate-900">
                    {selectedEquipment.name}
                  </h3>
                  <div className="mt-1 text-xs text-slate-600 flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span>{getItemUnit(selectedEquipment)} · {getItemBrand(selectedEquipment)}</span>
                    {getItemLocation(selectedEquipment) && (
                      <span className="inline-flex items-center gap-1 text-emerald-900 font-bold bg-emerald-100/90 px-2 py-0.5 rounded-md text-[11px] border border-emerald-300">
                        <MapPin className="h-3 w-3 text-emerald-700" />
                        Nơi tập kết: {getItemLocation(selectedEquipment)}
                      </span>
                    )}
                    {getItemManager(selectedEquipment) && (
                      <span className="inline-flex items-center gap-1 text-blue-900 font-bold bg-blue-100/90 px-2 py-0.5 rounded-md text-[11px] border border-blue-300">
                        <UserCheck className="h-3 w-3 text-blue-700" />
                        Quản lý: {getItemManager(selectedEquipment)} {getItemPhone(selectedEquipment) ? `(${getItemPhone(selectedEquipment)})` : ''}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const item = selectedEquipment;
                      setSelectedEquipment(null);
                      setEditingEquipment(item);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-800 shadow-xs hover:bg-amber-100 transition-colors"
                  >
                    <Edit className="h-3.5 w-3.5" />
                    Sửa hồ sơ
                  </button>
                  {selectedEquipment.status === 'ATTACHED' ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const item = selectedEquipment;
                        setSelectedEquipment(null);
                        void handleDetach(item);
                      }}
                      className="border-rose-300 bg-rose-50 text-rose-800 hover:bg-rose-100 text-xs font-bold shadow-xs"
                    >
                      <Unlink className="h-3.5 w-3.5 mr-1" />
                      Tháo khỏi xe
                    </Button>
                  ) : selectedEquipment.status !== 'MAINTENANCE' ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const item = selectedEquipment;
                        setSelectedEquipment(null);
                        void openAttachModal(item);
                      }}
                      className="border-sky-300 bg-sky-50 text-sky-800 hover:bg-sky-100 text-xs font-bold shadow-xs"
                    >
                      <Link2 className="h-3.5 w-3.5 mr-1" />
                      Gắn vào xe cơ giới
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>

            {/* Modal Tabs */}
            <div className="flex border-b border-slate-200">
              {[
                { key: 'identity', label: '1. Định danh & Mua sắm', icon: Tag },
                { key: 'technical', label: '2. Thông số & Kỹ thuật', icon: Gauge },
                { key: 'assignment', label: '3. Phân bổ & Bãi tập kết', icon: Building2 },
                { key: 'operation', label: '4. Vận hành & Xe đang gắn', icon: Tractor },
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

            {/* Tab Contents: Cố định min-height [415px] để không bị co giật khi chuyển tab */}
            <div className="pt-2 min-h-[415px]">
              {detailTab === 'identity' && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
                  <DetailField label="1. Mã MMTB mới" value={selectedEquipment.code} mono />
                  <DetailField label="2. Tên MMTB" value={selectedEquipment.name} />
                  <DetailField label="3. Tình trạng mua" value={getItemPurchaseCondition(selectedEquipment)} />
                  <DetailField label="4. Chủng loại hệ thống" value={CATEGORY_NAMES[selectedEquipment.category]?.label || selectedEquipment.category} />
                  <DetailField label="5. Nhóm MMTB" value={getProp(selectedEquipment.standardPurpose, 'Nhóm') || 'NHÓM TB SXTT & CHĂN NUÔI'} />
                  <DetailField label="6. Đơn vị sử dụng" value={getItemUnit(selectedEquipment)} />
                  <DetailField label="7. Đơn vị chủ quản" value="THACO AGRI" />
                  <DetailField label="8. Khu liên hợp" value="KLH KOUN MOM" mono />
                  <DetailField label="9. Nguồn dữ liệu Excel" value="Sheet 03.1 NHÓM TB & TB CG AGRI" />
                </div>
              )}

              {detailTab === 'technical' && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
                  <DetailField label="10. Thương hiệu (Nhãn hiệu)" value={getItemBrand(selectedEquipment)} />
                  <DetailField label="11. Model" value={getItemModel(selectedEquipment)} mono />
                  <DetailField label="12. Năm sản xuất" value={getItemYear(selectedEquipment)} mono />
                  <DetailField label="13. Xuất xứ" value={getProp(selectedEquipment.standardPurpose, 'Xuất xứ') || 'Việt Nam / Trung Quốc'} />
                  <DetailField label="14. Tình trạng kỹ thuật" value={selectedEquipment.technicalCondition === 'NEED_REPAIR' ? 'Hư hỏng (XSC)' : 'Bình thường'} />
                  <DetailField label="15. Ghi chú kỹ thuật từ Excel" value={selectedEquipment.standardPurpose || 'Không có ghi chú thêm'} />
                </div>
              )}

              {detailTab === 'assignment' && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
                  <DetailField label="16. Đơn vị quản lý" value={getItemUnit(selectedEquipment)} />
                  <DetailField
                    label="17. Địa chỉ (Nơi tập kết)"
                    value={getItemLocation(selectedEquipment)}
                    className="border-emerald-200 bg-emerald-50/60 font-bold"
                  />
                  <DetailField
                    label="18. Nhân sự quản lý"
                    value={getItemManager(selectedEquipment)}
                    className="border-blue-200 bg-blue-50/60 font-bold"
                  />
                  <DetailField
                    label="19. Số liên lạc (Zalo / SĐT)"
                    value={getItemPhone(selectedEquipment)}
                    mono
                    className="border-blue-200 bg-blue-50/60"
                  />
                  <DetailField label="20. Tình trạng hoạt động" value={statusMeta(selectedEquipment).label} />
                  <DetailField label="21. Ghi chú điều chuyển" value={getItemNotes(selectedEquipment)} />
                </div>
              )}

              {detailTab === 'operation' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
                    <DetailField label="Trạng thái gắn xe hiện tại" value={statusMeta(selectedEquipment).label} />
                    <DetailField label="Phương tiện cơ giới kéo/gắn" value={selectedEquipment.currentVehicle ? `${selectedEquipment.currentVehicle.code} - ${selectedEquipment.currentVehicle.name}` : 'Chưa gắn xe (Tại bãi đội)'} />
                    <DetailField label="Thời điểm gắn" value={selectedEquipment.attachedAt ? new Date(selectedEquipment.attachedAt).toLocaleString('vi-VN') : '—'} />
                  </div>

                  {selectedEquipment.currentVehicle ? (
                    <div className="rounded-xl border border-sky-200 bg-sky-50/70 p-4">
                      <h5 className="text-xs font-bold text-sky-900 mb-2 flex items-center gap-1.5">
                        <Tractor className="h-4 w-4 text-sky-700" />
                        Thông tin phương tiện cơ giới đang mang nông cụ:
                      </h5>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                        <div><span className="text-slate-500">Mã MMTB:</span> <b>{selectedEquipment.currentVehicle.code}</b></div>
                        <div><span className="text-slate-500">Tên xe:</span> <b>{selectedEquipment.currentVehicle.name}</b></div>
                        <div><span className="text-slate-500">Biển số:</span> <b>{selectedEquipment.currentVehicle.plate || 'Chưa gắn biển'}</b></div>
                        <div><span className="text-slate-500">Đơn vị:</span> <b>{selectedEquipment.currentVehicle.assignedUnitCode || '—'}</b></div>
                        <div><span className="text-slate-500">Trạng thái xe:</span> <b>{selectedEquipment.currentVehicle.status}</b></div>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-500">
                      <Package className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                      Nông cụ hiện đang nằm tại bãi tập kết <b>{getItemLocation(selectedEquipment)}</b> của đơn vị <b>{getItemUnit(selectedEquipment)}</b>, sẵn sàng điều động gắn vào xe cơ giới khi có lệnh làm đất.
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <Button variant="outline" size="sm" onClick={() => setSelectedEquipment(null)}>
                Đóng
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* 8. MODAL CHỈNH SỬA / THÊM MỚI NÔNG CỤ */}
      <EditEquipmentModal
        isOpen={isCreatingEquipment || Boolean(editingEquipment)}
        isCreate={isCreatingEquipment}
        onClose={() => {
          setIsCreatingEquipment(false);
          setEditingEquipment(null);
        }}
        equipment={editingEquipment}
        onSuccess={(saved) => {
          setIsCreatingEquipment(false);
          setEditingEquipment(null);
          setEquipmentList((prev) => {
            const idx = prev.findIndex((it) => it.id === saved.id);
            if (idx >= 0) {
              return prev.map((it) => (it.id === saved.id ? saved : it));
            }
            return [saved, ...prev];
          });
          void loadData();
        }}
      />
    </div>
  );
};
export default EquipmentPage;
