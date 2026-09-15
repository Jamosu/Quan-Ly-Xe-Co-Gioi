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
import { VehicleTypeMaster } from '../../types';
import { INITIAL_CG_MANAGERS, MASTER_LOCATIONS, INITIAL_MASTER_LOCATIONS, CGManagerItem, MasterLocationItem } from '../../data/cgManagersData';
import { schedulingApi } from '../../api/scheduling';
import {
  IMPLEMENT_CATEGORIES_CATALOG,
  ImplementCategoryDefinition,
} from '../../data/implementCategoriesData';

type CatalogTab =
  | 'types'
  | 'implements'
  | 'manufacturers'
  | 'models'
  | 'origins'
  | 'units'
  | 'locations'
  | 'cgManagers'
  | 'purchaseConditions'
  | 'suppliers';

export type { ImplementCategoryDefinition };

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
  const [units, setUnits] = useState<string[]>(() => {
    const saved = localStorage.getItem('vehicle_units_master');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch {}
    }
    return INITIAL_CG_MANAGERS.map((m) => m.unitName);
  });

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

  // 8. CG Managers Data (Nhân sự quản lý cơ giới từ sheet NS QUẢN LÝ CG)
  const [cgManagers, setCgManagers] = useState<CGManagerItem[]>(INITIAL_CG_MANAGERS);
  const [showCgManagerModal, setShowCgManagerModal] = useState(false);
  const [editingCgManager, setEditingCgManager] = useState<CGManagerItem | null>(null);
  const [cgManagerForm, setCgManagerForm] = useState({
    unitName: '',
    managerName: '',
    phone: '',
    location: '',
  });

  const openAddCgManagerModal = () => {
    setEditingCgManager(null);
    setCgManagerForm({ unitName: '', managerName: '', phone: '', location: '' });
    setShowCgManagerModal(true);
  };

  const openEditCgManagerModal = (item: CGManagerItem) => {
    setEditingCgManager(item);
    setCgManagerForm({
      unitName: item.unitName,
      managerName: item.managerName,
      phone: item.phone,
      location: item.location,
    });
    setShowCgManagerModal(true);
  };

  const handleSaveCgManager = () => {
    if (!cgManagerForm.unitName.trim() || !cgManagerForm.managerName.trim()) {
      setFormError('Vui lòng nhập Đơn vị và Họ tên nhân sự quản lý');
      return;
    }
    if (editingCgManager) {
      setCgManagers((prev) =>
        prev.map((item) =>
          item.id === editingCgManager.id ? { ...item, ...cgManagerForm } : item
        )
      );
    } else {
      const newItem: CGManagerItem = {
        id: `CGM-${Date.now().toString().slice(-4)}`,
        ...cgManagerForm,
      };
      setCgManagers((prev) => [newItem, ...prev]);
    }
    setShowCgManagerModal(false);
    setEditingCgManager(null);
  };

  const handleDeleteCgManager = (id: string) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa nhân sự quản lý cơ giới này?')) {
      setCgManagers((prev) => prev.filter((item) => item.id !== id));
    }
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
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const handleTabChange = (tab: CatalogTab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
    setSearch('');
    setSelectedItems([]);
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
        setUnits(opts.assignedUnits);
        localStorage.setItem('vehicle_units_master', JSON.stringify(opts.assignedUnits));
      }
      if (opts?.locations) setLocations(opts.locations);
      if (opts?.purchaseConditions) setPurchaseConditions(opts.purchaseConditions);
      if (opts?.suppliers) setSuppliers(opts.suppliers);
      if (opts?.companyOwners) setCompanyOwners(opts.companyOwners);
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

    // Group names by normalized lowercase
    const groups = new Map<string, string[]>();
    currentNames.forEach((name) => {
      const key = name.trim().toLowerCase().normalize('NFC');
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

  const handleSaveSimpleItem = () => {
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

    if (simpleTarget === 'units') {
      setUnits((prev) => {
        const next = updateList(prev, editingSimpleItem?.name);
        localStorage.setItem('vehicle_units_master', JSON.stringify(next));
        return next;
      });
    } else if (simpleTarget === 'locations') {
      setLocations((prev) => updateList(prev, editingSimpleItem?.name));
    } else if (simpleTarget === 'purchaseConditions') {
      setPurchaseConditions((prev) => updateList(prev, editingSimpleItem?.name));
    } else if (simpleTarget === 'suppliers') {
      setSuppliers((prev) => updateList(prev, editingSimpleItem?.name));
      setCompanyOwners((prev) => updateList(prev, editingSimpleItem?.name));
    }

    setShowSimpleAddModal(false);
    setEditingSimpleItem(null);
    setSimpleForm(EMPTY_SIMPLE_FORM);
  };

  const handleDeleteSimpleItem = (target: CatalogTab, val: string) => {
    if (!window.confirm(`Xác nhận xóa mục "${val}" khỏi danh mục?`)) return;
    if (target === 'units') {
      setUnits((prev) => {
        const next = prev.filter((u) => u !== val);
        localStorage.setItem('vehicle_units_master', JSON.stringify(next));
        return next;
      });
    }
    if (target === 'locations') setLocations(locations.filter((l) => l !== val));
    if (target === 'purchaseConditions') setPurchaseConditions(purchaseConditions.filter((c) => c !== val));
    if (target === 'suppliers') {
      setSuppliers(suppliers.filter((s) => s !== val));
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
      return matchSearch && matchGroup;
    });
  }, [types, search, assetGroupFilter]);

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
      return matchSearch && matchMf;
    });
  }, [models, search, selectedMfFilter]);

  const countryStats = useMemo(() => {
    const map = new Map<string, { code: string; mfCount: number; vehicleCount: number }>();
    POPULAR_COUNTRIES.forEach((c) => {
      map.set(c.name, { code: c.code, mfCount: 0, vehicleCount: 0 });
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
  }, [manufacturers]);

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

  const filteredImplements = useMemo(() => {
    if (!search.trim()) return implementCategories;
    const q = search.toLowerCase();
    return implementCategories.filter(
      (it) =>
        it.name.toLowerCase().includes(q) ||
        it.code.toLowerCase().includes(q) ||
        it.functionalGroup.toLowerCase().includes(q) ||
        it.compatibleVehicles.toLowerCase().includes(q) ||
        it.description.toLowerCase().includes(q)
    );
  }, [implementCategories, search]);

  const totalImplementsCount = useMemo(() => {
    return implementCategories.reduce((sum, item) => sum + item.totalCount, 0);
  }, [implementCategories]);

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
          <div className="font-bold text-primary font-mono text-xs">{item.code}</div>
          <div className="mt-0.5 text-[10px] text-slate-400">{item.category || 'Chưa gán enum'}</div>
        </div>
      ),
    },
    {
      key: 'name',
      title: 'Tên chủng loại xe & MMTB',
      sortable: true,
      render: (item) => (
        <div className="max-w-[260px] whitespace-normal">
          <div className="font-bold text-slate-900 text-xs">{item.name}</div>
          <div className="mt-0.5 text-[11px] text-slate-500">
            {item.assetGroup ? GROUP_LABELS[item.assetGroup] || item.assetGroup : 'Chưa phân nhóm'}
          </div>
        </div>
      ),
    },
    {
      key: 'manufacturers',
      title: 'Hãng & Model thực tế',
      render: (item) => (
        <div className="max-w-[240px] whitespace-normal text-[11px]">
          <div className="font-semibold text-slate-800">{item.manufacturers.slice(0, 3).join(', ') || '—'}</div>
          <div className="mt-0.5 text-slate-400 text-[10px]">{item.models.slice(0, 3).join(', ') || 'Chưa có model'}</div>
        </div>
      ),
    },
    {
      key: 'defaultMaintenanceHours',
      title: 'Định mức kỹ thuật',
      align: 'right',
      render: (item) => (
        <div className="text-right">
          <span className="inline-block rounded bg-amber-50 px-2 py-0.5 font-mono text-xs font-bold text-amber-800 border border-amber-200">
            {item.defaultMaintenanceHours}h / bảo dưỡng
          </span>
          <div className="mt-0.5 text-[10px] text-slate-500 font-mono">
            Định mức dầu: {item.defaultFuelQuotaRate ?? '—'} {item.defaultFuelQuotaUnit ? FUEL_UNIT_LABELS[item.defaultFuelQuotaUnit] : ''}
          </div>
        </div>
      ),
    },
    {
      key: 'vehicleCount',
      title: 'Số MMTB thực tế',
      align: 'center',
      sortable: true,
      width: '140px',
      render: (item) => (
        <button
          type="button"
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-black bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 transition shadow-2xs cursor-pointer"
          onClick={() => navigate(`/doi-xe/ho-so-xe?category=${encodeURIComponent(item.code)}`)}
          title={`Xem danh sách xe thuộc chủng loại ${item.name}`}
        >
          {item.vehicleCount.toLocaleString('vi-VN')} xe
          <ExternalLink className="h-3 w-3 text-emerald-600" />
        </button>
      ),
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
          editTitle="Sửa chủng loại"
          deleteTitle="Xóa chủng loại"
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
          <span className="inline-block px-2 py-0.5 rounded-md font-mono text-xs font-black bg-teal-50 text-teal-800 border border-teal-200">
            {item.code}
          </span>
          <div className="mt-0.5 text-[10px] text-slate-400 font-mono">{item.categoryKey}</div>
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
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700">
          {item.functionalGroup}
        </span>
      ),
    },
    {
      key: 'compatibleVehicles',
      title: 'Đầu máy kéo tương thích',
      render: (item) => (
        <div className="text-[11px] text-slate-700 max-w-[220px] whitespace-normal flex items-start gap-1">
          <Tractor className="h-3 w-3 text-slate-400 shrink-0 mt-0.5" />
          <span>{item.compatibleVehicles}</span>
        </div>
      ),
    },
    {
      key: 'defaultMaintenanceHours',
      title: 'Định mức BDC',
      align: 'center',
      width: '120px',
      render: (item) => (
        <span className="font-mono text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
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
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-black bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 transition shadow-2xs"
          title={`Xem chi tiết các thiết bị thuộc ${item.name}`}
        >
          {item.totalCount.toLocaleString('vi-VN')} bộ
          <ExternalLink className="h-3 w-3 text-emerald-600" />
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
      headers = ['STT', 'Tên Đơn vị sử dụng'];
      rows = unitRows.map((u, idx) => [idx + 1, u.name]);
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
      headers = ['STT', 'Đơn vị trực thuộc', 'Nhân sự Quản lý CG', 'Số điện thoại', 'Vị trí bãi'];
      rows = filteredCgManagers.map((c, idx) => [
        idx + 1,
        c.unitName,
        c.managerName,
        c.phone,
        c.location,
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
      headers = ['STT', 'Nhà cung cấp / Pháp nhân đối tác'];
      rows = supplierRows.map((s, idx) => [idx + 1, s.name]);
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
        <div className="flex items-center gap-2">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 font-bold text-emerald-800 text-xs border border-emerald-200">
            {item.name.slice(0, 2)}
          </span>
          <div>
            <div className="font-bold text-slate-900 text-xs">{item.name}</div>
            <div className="text-[10px] text-slate-400 font-mono">Mã ID: #{item.id}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'countryName',
      title: 'Quốc gia / Xuất xứ',
      sortable: true,
      render: (item) => (
        <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-800">
          <Globe className="h-3 w-3 text-slate-500" />
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
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-black bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 transition shadow-2xs cursor-pointer"
          onClick={() => {
            setSelectedMfFilter(String(item.id));
            setActiveTab('models');
          }}
          title={`Xem các model của hãng ${item.name}`}
        >
          {item.modelCount.toLocaleString('vi-VN')} model
          <ExternalLink className="h-3 w-3 text-emerald-600" />
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
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-black bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 transition shadow-2xs cursor-pointer"
          onClick={() => navigate(`/doi-xe/ho-so-xe?manufacturer=${encodeURIComponent(item.name)}`)}
          title={`Xem danh sách xe thuộc hãng ${item.name}`}
        >
          {item.vehicleCount.toLocaleString('vi-VN')} xe
          <ExternalLink className="h-3 w-3 text-emerald-600" />
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
        <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-800">
          <Tag className="h-3 w-3 text-slate-500" />
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
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-black bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 transition shadow-2xs cursor-pointer"
          onClick={() => navigate(`/doi-xe/ho-so-xe?model=${encodeURIComponent(item.name)}`)}
          title={`Xem danh sách xe model ${item.name}`}
        >
          {item.vehicleCount.toLocaleString('vi-VN')} xe
          <ExternalLink className="h-3 w-3 text-emerald-600" />
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
        <div className="flex items-center gap-2">
          <Globe className="h-4 w-4 text-primary" />
          <span className="font-bold text-xs text-slate-900">{item.name}</span>
          <span className="font-mono text-[10px] text-slate-400">({item.code})</span>
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
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-black bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 transition shadow-2xs cursor-pointer"
          onClick={() => {
            setActiveTab('manufacturers');
            setSearch(item.name);
          }}
          title={`Xem các hãng sản xuất từ ${item.name}`}
        >
          {item.mfCount.toLocaleString('vi-VN')} thương hiệu
          <ExternalLink className="h-3 w-3 text-emerald-600" />
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
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-black bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 transition shadow-2xs cursor-pointer"
          onClick={() => navigate(`/doi-xe/ho-so-xe?origin=${encodeURIComponent(item.name)}`)}
          title={`Xem danh sách xe xuất xứ ${item.name}`}
        >
          {item.vehicleCount.toLocaleString('vi-VN')} phương tiện
          <ExternalLink className="h-3 w-3 text-emerald-600" />
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
        <div className="flex items-center gap-2">
          {target === 'units' && <Building2 className="h-4 w-4 text-primary shrink-0" />}
          {target === 'locations' && <MapPin className="h-4 w-4 text-emerald-600 shrink-0" />}
          {target === 'purchaseConditions' && <ShoppingCart className="h-4 w-4 text-amber-600 shrink-0" />}
          {target === 'suppliers' && <Tag className="h-4 w-4 text-sky-600 shrink-0" />}
          <span className="font-bold text-xs text-slate-900">{item.name}</span>
        </div>
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
        : <span className="text-[11px] font-semibold text-amber-700">Chưa khai báo tọa độ</span>,
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
              suppliers: 'Nhà cung cấp / Pháp nhân',
            };
            openSimpleEditModal(target, titles[target] || 'Xem danh mục', item.name);
          }}
          onEdit={() => {
            const titles: Record<string, string> = {
              units: 'Chỉnh sửa Đơn vị sử dụng',
              locations: 'Chỉnh sửa Bãi / Nơi tập kết',
              purchaseConditions: 'Chỉnh sửa Tình trạng mua sắm',
              suppliers: 'Chỉnh sửa Nhà cung cấp / Pháp nhân',
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
          <div className="flex items-center gap-1.5">
            <span
              className={`inline-flex items-center gap-1 font-bold px-2.5 py-1 rounded-lg border text-xs whitespace-nowrap ${
                isKM
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : isSN
                  ? 'bg-blue-50 text-blue-800 border-blue-200'
                  : isNL
                  ? 'bg-amber-50 text-amber-900 border-amber-200'
                  : 'bg-slate-50 text-slate-700 border-slate-200'
              }`}
            >
              <Building2 className="w-3.5 h-3.5 shrink-0 opacity-80" />
              {item.complexName || (isKM ? 'Khu liên hợp Koun Mom' : isSN ? 'Khu liên hợp Snoul' : isNL ? 'Khu liên hợp Nam Lào' : 'Toàn KLH')}
            </span>
          </div>
        );
      },
    },
    {
      key: 'name',
      title: 'Tên Bãi / Nơi tập kết phương tiện',
      sortable: true,
      render: (item) => (
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-emerald-600 shrink-0" />
          <span className="font-bold text-xs text-slate-900">{item.name}</span>
        </div>
      ),
    },
    {
      key: 'regionName',
      title: 'Khu vực / Nông trường / Xí nghiệp',
      sortable: true,
      render: (item) => (
        <div>
          <span className="font-semibold text-xs text-slate-700 block">{item.regionName || 'Khu trung tâm'}</span>
          {item.address && <span className="text-[10px] text-slate-400 block">{item.address}</span>}
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

  const filteredCgManagers = useMemo(() => {
    return cgManagers.filter((m) => {
      const q = search.trim().toLowerCase();
      if (!q) return true;
      return (
        m.unitName.toLowerCase().includes(q) ||
        m.managerName.toLowerCase().includes(q) ||
        m.phone.includes(q) ||
        m.location.toLowerCase().includes(q)
      );
    });
  }, [cgManagers, search]);

  const cgManagerColumns: Column<CGManagerItem>[] = [
    {
      key: 'id',
      title: 'MÃ NS',
      width: '90px',
      align: 'center',
      render: (item) => <span className="text-xs font-mono font-bold text-slate-500">{item.id}</span>,
    },
    {
      key: 'unitName',
      title: 'ĐƠN VỊ SỬ DỤNG',
      sortable: true,
      render: (item) => (
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-primary shrink-0" />
          <span className="font-bold text-xs text-slate-900">{item.unitName}</span>
        </div>
      ),
    },
    {
      key: 'managerName',
      title: 'HỌ & TÊN NS QUẢN LÝ',
      sortable: true,
      render: (item) => (
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-indigo-600 shrink-0" />
          <span className="font-extrabold text-xs text-slate-900">{item.managerName || '—'}</span>
        </div>
      ),
    },
    {
      key: 'phone',
      title: 'SỐ ZALO / ĐIỆN THOẠI',
      render: (item) => (
        <span className="font-mono text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
          {item.phone || '—'}
        </span>
      ),
    },
    {
      key: 'location',
      title: 'ĐỊA CHỈ (NƠI TẬP KẾT)',
      sortable: true,
      render: (item) => (
        <div className="flex items-center gap-1.5 text-xs text-slate-700">
          <MapPin className="h-3.5 w-3.5 text-rose-500 shrink-0" />
          <span>{item.location || '—'}</span>
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
          title={`Xem thông tin tạo/sửa của ${item.managerName}`}
        />
      ),
    },
    {
      key: 'actions',
      title: 'Tác vụ',
      align: 'center',
      width: '100px',
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

      {/* 2. STATS OVERVIEW CARDS */}
      <div className="grid gap-2.5 grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-10">
        {[
          { label: 'Chủng loại xe', value: types.length, icon: Tractor, tab: 'types' as const, color: 'text-emerald-700 bg-emerald-50' },
          { label: 'Chủng loại thiết bị', value: implementCategories.length, icon: Combine, tab: 'implements' as const, color: 'text-teal-700 bg-teal-50' },
          { label: 'Hãng sản xuất', value: manufacturers.length, icon: Tag, tab: 'manufacturers' as const, color: 'text-sky-700 bg-sky-50' },
          { label: 'Model xe', value: models.length, icon: Table, tab: 'models' as const, color: 'text-violet-700 bg-violet-50' },
          { label: 'Quốc gia xuất xứ', value: countryStats.length, icon: Globe, tab: 'origins' as const, color: 'text-amber-700 bg-amber-50' },
          { label: 'Đơn vị sử dụng', value: units.length, icon: Building2, tab: 'units' as const, color: 'text-blue-700 bg-blue-50' },
          { label: 'Bãi tập kết', value: locations.length, icon: MapPin, tab: 'locations' as const, color: 'text-rose-700 bg-rose-50' },
          { label: 'NS quản lý cơ giới', value: cgManagers.length, icon: Users, tab: 'cgManagers' as const, color: 'text-indigo-700 bg-indigo-50' },
          { label: 'Tình trạng mua', value: purchaseConditions.length, icon: ShoppingCart, tab: 'purchaseConditions' as const, color: 'text-orange-700 bg-orange-50' },
          { label: 'Nhà cung cấp', value: suppliers.length, icon: Layers, tab: 'suppliers' as const, color: 'text-teal-700 bg-teal-50' },
        ].map((stat) => (
          <button
            key={stat.label}
            type="button"
            onClick={() => handleTabChange(stat.tab)}
            className={`rounded-xl border p-3 text-left transition-all hover:shadow-md ${
              activeTab === stat.tab
                ? 'border-primary bg-primary-50/40 ring-2 ring-primary/20 shadow-xs'
                : 'border-slate-200 bg-white hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 truncate">{stat.label}</span>
              <div className={`rounded-lg p-1 shrink-0 ${stat.color}`}>
                <stat.icon className="h-3.5 w-3.5" />
              </div>
            </div>
            <div className="mt-1.5 text-lg font-black text-slate-900">{stat.value.toLocaleString('vi-VN')}</div>
          </button>
        ))}
      </div>

      {/* 3. MAIN TABLE CONTAINER */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          {/* ACTIVE TAB SELECTION BADGE */}
          <div className="flex items-center gap-2">
            {selectedItems.length > 0 && (
              <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
                Đã chọn {selectedItems.length} mục
              </span>
            )}
          </div>

          {/* SEARCH BOX, CONTEXT FILTER & ACTION BUTTONS */}
          <div className="flex flex-wrap items-center gap-2 ml-auto">
            <div className="relative w-56 sm:w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 py-2 text-xs text-slate-800 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15 h-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm kiếm trong danh mục..."
              />
            </div>

            {activeTab === 'types' && (
              <select
                className="h-9 w-44 shrink-0 rounded-xl border border-slate-200 bg-white px-3 py-1 text-xs text-slate-800 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
                value={assetGroupFilter}
                onChange={(e) => setAssetGroupFilter(e.target.value)}
              >
                <option value="ALL">Tất cả nhóm</option>
                {Object.entries(GROUP_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            )}

            {activeTab === 'models' && (
              <select
                className="h-9 w-48 shrink-0 rounded-xl border border-slate-200 bg-white px-3 py-1 text-xs text-slate-800 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
                value={selectedMfFilter}
                onChange={(e) => setSelectedMfFilter(e.target.value)}
              >
                <option value="ALL">Tất cả hãng ({manufacturers.length})</option>
                {manufacturers.map((mf) => (
                  <option key={mf.id} value={String(mf.id)}>{mf.name}</option>
                ))}
              </select>
            )}



            {selectedItems.length > 0 && (
              <Button
                variant="primary"
                size="sm"
                className="h-9 text-xs font-extrabold bg-emerald-600 hover:bg-emerald-700 border-none shadow-sm animate-pulse"
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
              className="h-9 text-xs font-bold border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
              icon={<RefreshCw className="h-3.5 w-3.5" />}
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
                className="h-9 text-xs font-bold bg-primary hover:bg-primary-600 text-white"
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
                  className="h-9 text-xs font-bold bg-primary hover:bg-primary-600 text-white cursor-pointer"
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
                  Quản lý hồ sơ {totalImplementsCount.toLocaleString('vi-VN')} thiết bị & nông cụ
                </Button>
              </div>
            )}
            {activeTab === 'manufacturers' && (
              <Button
                size="sm"
                className="h-9 text-xs font-bold bg-primary hover:bg-primary-600 text-white cursor-pointer"
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
                className="h-9 text-xs font-bold bg-primary hover:bg-primary-600 text-white cursor-pointer"
                icon={<Plus className="h-3.5 w-3.5" />}
                onClick={() => {
                  setEditingModel(null);
                  setModelForm({ ...EMPTY_MODEL_FORM, manufacturerId: manufacturers[0]?.id || 0 });
                  setShowAddModelModal(true);
                }}
              >
                Thêm model mới
              </Button>
            )}
            {activeTab === 'units' && (
              <Button size="sm" className="h-9 text-xs font-bold bg-primary hover:bg-primary-600 text-white cursor-pointer" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => openSimpleAddModal('units', 'Thêm Đơn vị sử dụng')}>
                Thêm đơn vị
              </Button>
            )}
            {activeTab === 'locations' && (
              <Button size="sm" className="h-9 text-xs font-bold bg-primary hover:bg-primary-600 text-white cursor-pointer" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => openAddLocationModal()}>
                Thêm nơi tập kết
              </Button>
            )}
            {activeTab === 'cgManagers' && (
              <Button size="sm" className="h-9 text-xs font-bold bg-primary hover:bg-primary-600 text-white cursor-pointer" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => openAddCgManagerModal()}>
                Thêm NS quản lý
              </Button>
            )}
            {activeTab === 'purchaseConditions' && (
              <Button size="sm" className="h-9 text-xs font-bold bg-primary hover:bg-primary-600 text-white cursor-pointer" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => openSimpleAddModal('purchaseConditions', 'Thêm Tình trạng mua')}>
                Thêm tình trạng
              </Button>
            )}
            {activeTab === 'suppliers' && (
              <Button size="sm" className="h-9 text-xs font-bold bg-primary hover:bg-primary-600 text-white cursor-pointer" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => openSimpleAddModal('suppliers', 'Thêm Nhà cung cấp / Pháp nhân')}>
                Thêm đối tác
              </Button>
            )}
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

        {/* TAB 5: UNITS */}
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
          <div className="overflow-x-auto">
            <DataTable
              data={filteredCgManagers}
              columns={cgManagerColumns}
              pageSize={25}
              showSearch={false}
              showExport={false}
              useGlobalFilters={false}
            />
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

        {/* TAB 9: SUPPLIERS & OWNERS */}
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

      {/* MODAL 5: NS QUẢN LÝ CƠ GIỚI */}
      <Modal
        isOpen={showCgManagerModal}
        onClose={() => {
          setShowCgManagerModal(false);
          setEditingCgManager(null);
          setFormError('');
        }}
        title={editingCgManager ? 'Chỉnh sửa NS Quản lý Xe Cơ giới' : 'Thêm mới NS Quản lý Xe Cơ giới'}
        subtitle="Quản lý nhân sự phụ trách cơ giới và điểm tập kết theo từng đơn vị"
        size="md"
      >
        <div className="space-y-3.5">
          {formError && <div className="rounded-xl bg-rose-50 p-3 text-xs font-bold text-rose-700">{formError}</div>}
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-700">Đơn vị sử dụng (Xí nghiệp / Đội) *</label>
            <input
              className={inputClassName}
              placeholder="VD: XN Chuối DP1, CGTC DP..."
              value={cgManagerForm.unitName}
              onChange={(e) => setCgManagerForm({ ...cgManagerForm, unitName: e.target.value })}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-700">Họ & Tên NS Quản lý cơ giới *</label>
            <input
              className={inputClassName}
              placeholder="VD: Thái Cao Lưu, Phạm Ngọc Hải..."
              value={cgManagerForm.managerName}
              onChange={(e) => setCgManagerForm({ ...cgManagerForm, managerName: e.target.value })}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-700">Số Zalo / Điện thoại</label>
            <input
              className={inputClassName}
              placeholder="VD: 0387783316..."
              value={cgManagerForm.phone}
              onChange={(e) => setCgManagerForm({ ...cgManagerForm, phone: e.target.value })}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-700">Địa chỉ (Nơi tập kết / Bãi xe)</label>
            <input
              className={inputClassName}
              placeholder="VD: Lô 21 DP1, Lô 85 DP4..."
              value={cgManagerForm.location}
              onChange={(e) => setCgManagerForm({ ...cgManagerForm, location: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-2 border-t pt-3">
            <Button variant="outline" onClick={() => { setShowCgManagerModal(false); setEditingCgManager(null); }}>Hủy</Button>
            <Button onClick={handleSaveCgManager}>
              {editingCgManager ? 'Cập nhật' : 'Thêm NS quản lý'}
            </Button>
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

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
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
        </div>
      </Modal>
    </div>
  );
};
