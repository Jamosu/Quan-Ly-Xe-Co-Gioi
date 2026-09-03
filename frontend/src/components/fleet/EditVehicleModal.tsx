import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { SearchableSelect, SelectOption } from '../common/SearchableSelect';
import { apiService } from '../../api/client';
import { catalogsApi } from '../../api/catalogsApi';
import { VehicleProfile, VehicleFilterOptions } from '../../types';
import { getStoredData } from '../../utils/storage';
import { mockEnterprises, mockRegions, CatalogItem } from '../../data/catalogData';
import { INITIAL_CG_MANAGERS } from '../../data/cgManagersData';
import {
  Tag,
  Building2,
  Gauge,
  Fuel,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Save,
  X,
  Tractor,
  Layers,
  MapPin,
  FileSpreadsheet,
  RefreshCw,
} from 'lucide-react';

interface EditVehicleModalProps {
  isOpen: boolean;
  onClose: () => void;
  vehicle: VehicleProfile | null;
  filterOptions: VehicleFilterOptions;
  onSuccess: (savedVehicle: VehicleProfile) => void;
  isCreate?: boolean;
}

type EditTab = 'identity' | 'location' | 'technical' | 'status';

export const EditVehicleModal: React.FC<EditVehicleModalProps> = ({
  isOpen,
  onClose,
  vehicle,
  filterOptions,
  onSuccess,
  isCreate = false,
}) => {
  const isCreateMode = isCreate || !vehicle;
  const [activeTab, setActiveTab] = useState<EditTab>('identity');
  const [saving, setSaving] = useState(false);
  const [generatingCode, setGeneratingCode] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Master catalog states loaded from Database API
  const [catalogRegions, setCatalogRegions] = useState<CatalogItem[]>(() =>
    getStoredData('catalogs_regions', mockRegions)
  );
  const [catalogEnterprises, setCatalogEnterprises] = useState<CatalogItem[]>(() =>
    getStoredData('catalogs_enterprises', mockEnterprises)
  );

  // Units list from http://localhost:5173/danh-muc/loai-xe?tab=units
  const [vehicleMasterUnits, setVehicleMasterUnits] = useState<string[]>(() => {
    const saved = localStorage.getItem('vehicle_units_master');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch {}
    }
    return INITIAL_CG_MANAGERS.map((m) => m.unitName);
  });

  // Sync with Backend Database on modal open
  useEffect(() => {
    if (!isOpen) return;
    catalogsApi.getCatalogs('REGION', 'catalogs_regions', mockRegions).then((data) => {
      if (Array.isArray(data) && data.length > 0) setCatalogRegions(data);
    });
    catalogsApi.getCatalogs('ENTERPRISE', 'catalogs_enterprises', mockEnterprises).then((data) => {
      if (Array.isArray(data) && data.length > 0) setCatalogEnterprises(data);
    });
    apiService.getVehicleFilterOptions().then((opts) => {
      if (opts?.assignedUnits && opts.assignedUnits.length > 0) {
        setVehicleMasterUnits(opts.assignedUnits);
        localStorage.setItem('vehicle_units_master', JSON.stringify(opts.assignedUnits));
      }
    });
  }, [isOpen]);

  // Form state
  const [formData, setFormData] = useState({
    // 1. Identity
    code: '',
    oldCode: '',
    bravoCode: '',
    assetCode: '',
    plate: '',
    name: '',
    purchaseCondition: '',
    supplier: '',
    companyOwner: '',
    contractStatus: '',

    // 2. Location & Assignment
    complexCode: 'KOUN_MOM',
    regionCode: '',
    assignedUnitCode: '',
    currentLocationName: '',
    managerName: '',
    managerPhone: '',
    teamUnit: '',

    // 3. Technical Specs
    category: 'MAY_DAO',
    vehicleTypeId: undefined as number | undefined,
    assetGroup: '',
    manufacturer: '',
    modelName: '',
    origin: '',
    manufactureYear: undefined as number | undefined,
    powerHp: '',
    frameNumber: '',
    engineNumber: '',
    technicalSpecs: '',
    dimensions: '',
    productivity: '',

    // 4. Fuel & Status
    fuelQuotaRate: undefined as number | undefined,
    fuelQuotaUnit: 'L_PER_HOUR',
    fuelTankCapacity: undefined as number | undefined,
    status: 'CHO_PHAN_CONG',
    conditionStatus: 'Bình thường',
    totalMachineHours: undefined as number | undefined,
    odoKm: undefined as number | undefined,
    imageUrl: '',
    notes: '',
  });

  useEffect(() => {
    if (vehicle) {
      setFormData({
        code: vehicle.internalCode || '',
        oldCode: vehicle.oldCode || '',
        bravoCode: vehicle.bravoCode || '',
        assetCode: vehicle.assetCode || '',
        plate: vehicle.plateNumber === 'Chưa gắn biển' ? '' : (vehicle.plateNumber || ''),
        name: vehicle.brandModel?.replace(/\s*\(.*\)$/, '') || vehicle.internalCode || '',
        purchaseCondition: vehicle.purchaseCondition || 'Mua mới',
        supplier: vehicle.supplier || 'THACO AGRI',
        companyOwner: vehicle.companyOwner || 'THACO AGRI',
        contractStatus: vehicle.contractStatus || 'KLH Koun Mom',

        complexCode: vehicle.complexCode || 'KOUN_MOM',
        regionCode: vehicle.regionCode || '',
        assignedUnitCode: vehicle.assignedUnitCode || vehicle.teamUnit || '',
        currentLocationName: vehicle.currentLocationName || '',
        managerName: vehicle.managerName || '',
        managerPhone: vehicle.managerPhone || '',
        teamUnit: vehicle.teamUnit || '',

        category: (vehicle.categoryCode as string) || 'MAY_DAO',
        vehicleTypeId: vehicle.vehicleTypeId,
        assetGroup: vehicle.assetGroup || '',
        manufacturer: vehicle.manufacturer || '',
        modelName: vehicle.modelName || '',
        origin: vehicle.origin || '',
        manufactureYear: vehicle.yearManufactured ? Number(vehicle.yearManufactured) : undefined,
        powerHp: vehicle.powerHp || '',
        frameNumber: vehicle.frameNumber || '',
        engineNumber: vehicle.engineNumber || '',
        technicalSpecs: vehicle.technicalSpecs || '',
        dimensions: vehicle.dimensions || '',
        productivity: vehicle.productivity || '',

        fuelQuotaRate: typeof vehicle.fuelQuotaRate === 'number' ? vehicle.fuelQuotaRate : undefined,
        fuelQuotaUnit: (vehicle.fuelQuotaUnit as string) || 'L_PER_HOUR',
        fuelTankCapacity: typeof vehicle.fuelTankCapacity === 'number' ? vehicle.fuelTankCapacity : undefined,
        status: vehicle.status === 'active' ? 'HOAT_DONG' :
                vehicle.status === 'maintenance' ? 'BAO_DUONG' :
                vehicle.status === 'repair' ? 'SUA_CHUA' : 'CHO_PHAN_CONG',
        conditionStatus: vehicle.conditionStatus || 'Bình thường',
        totalMachineHours: vehicle.currentEngineHours || 0,
        odoKm: vehicle.currentOdoKm || 0,
        imageUrl: vehicle.imageUrl || '',
        notes: vehicle.notes || '',
      });
      setErrorMessage(null);
      setSuccessMessage(null);
      setActiveTab('identity');
    } else if (isCreateMode) {
      setFormData({
        code: '',
        oldCode: '',
        bravoCode: '',
        assetCode: '',
        plate: '',
        name: '',
        purchaseCondition: 'Mua mới',
        supplier: 'THACO AGRI',
        companyOwner: 'THACO AGRI',
        contractStatus: 'KLH Koun Mom',

        complexCode: 'KOUN_MOM',
        regionCode: 'DP',
        assignedUnitCode: '',
        currentLocationName: '',
        managerName: '',
        managerPhone: '',
        teamUnit: '',

        category: 'MAY_DAO',
        vehicleTypeId: undefined,
        assetGroup: '',
        manufacturer: '',
        modelName: '',
        origin: 'Việt Nam',
        manufactureYear: new Date().getFullYear(),
        powerHp: '',
        frameNumber: '',
        engineNumber: '',
        technicalSpecs: '',
        dimensions: '',
        productivity: '',

        fuelQuotaRate: undefined,
        fuelQuotaUnit: 'L_PER_HOUR',
        fuelTankCapacity: undefined,
        status: 'CHO_PHAN_CONG',
        conditionStatus: 'Bình thường',
        totalMachineHours: 0,
        odoKm: 0,
        imageUrl: '',
        notes: '',
      });
      setErrorMessage(null);
      setSuccessMessage(null);
      setActiveTab('identity');
      void fetchNextCode('MAY_DAO', undefined, 'CHT');
    }
  }, [vehicle, isCreateMode, isOpen]);

  const fetchNextCode = async (category: string, vehicleTypeId?: number, unit?: string) => {
    try {
      setGeneratingCode(true);
      const res = await apiService.getNextVehicleCode(category, vehicleTypeId, unit);
      if (res && res.code) {
        setFormData((prev) => ({ ...prev, code: res.code }));
      }
    } catch (err) {
      console.error('Failed to auto generate code:', err);
    } finally {
      setGeneratingCode(false);
    }
  };

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Complex selection options
  const availableComplexes = useMemo<SelectOption[]>(() => {
    const list = filterOptions.complexes && filterOptions.complexes.length > 0
      ? filterOptions.complexes
      : ['KOUN_MOM', 'SNOUL', 'NAM_LAO'];
    return list.map((c) => ({
      value: c,
      label: c === 'KOUN_MOM' ? 'KOUN_MOM (Khu liên hợp Koun Mom)'
        : c === 'SNOUL' ? 'SNOUL (Khu liên hợp Snoul)'
        : c === 'NAM_LAO' ? 'NAM_LAO (Khu liên hợp Nam Lào)'
        : c,
    }));
  }, [filterOptions.complexes]);

  // Handle Complex Change: auto reset/cascade Region and Unit dynamically
  const handleComplexChange = (newComplex: string) => {
    let defaultRegion = '';
    const storedRegions = getStoredData<any[]>('catalogs_regions', mockRegions) || [];
    const firstMatchingRegion = storedRegions.find((r) => {
      const c = (r.parentCode || '').toUpperCase();
      const n = (r.parentName || '').toUpperCase();
      if (newComplex === 'KOUN_MOM' || newComplex === 'KM') {
        return c === 'KOUN_MOM' || c === 'KM' || c === 'KLH_KM' || n.includes('KOUN MOM');
      }
      if (newComplex === 'SNOUL' || newComplex === 'SN') {
        return c === 'SNOUL' || c === 'SN' || c === 'KLH_SN' || n.includes('SNOUL');
      }
      if (newComplex === 'NAM_LAO' || newComplex === 'NL') {
        return c === 'NAM_LAO' || c === 'NL' || c === 'KLH_NL' || n.includes('NAM LÀO') || n.includes('NAM LAO');
      }
      return c === newComplex || n.includes(newComplex);
    });

    if (firstMatchingRegion) {
      defaultRegion = firstMatchingRegion.code;
    } else {
      if (newComplex === 'KOUN_MOM') defaultRegion = 'DP';
      else if (newComplex === 'SNOUL') defaultRegion = 'BP';
      else if (newComplex === 'NAM_LAO') defaultRegion = 'NSA';
    }

    setFormData((prev) => ({
      ...prev,
      complexCode: newComplex,
      regionCode: defaultRegion,
      assignedUnitCode: '',
    }));
  };

  // Handle Region Change: auto reset assigned unit
  const handleRegionChange = (newRegion: string) => {
    setFormData((prev) => ({
      ...prev,
      regionCode: newRegion,
      assignedUnitCode: '',
    }));
  };

  // Dynamic Regions filtered by selected Complex: reads 100% from Database records
  const availableRegions = useMemo<SelectOption[]>(() => {
    const complex = (formData.complexCode || '').toUpperCase();
    if (!complex) return [];

    const isMatchComplex = (pCode?: string, pName?: string) => {
      const c = (pCode || '').toUpperCase();
      const n = (pName || '').toUpperCase();
      if (complex === 'KOUN_MOM' || complex === 'KM') {
        return c === 'KOUN_MOM' || c === 'KM' || c === 'KLH_KM' || n.includes('KOUN MOM') || n.includes('DAUN PENH') || n.includes('LUMPHAT') || n.includes('ANDONG MEAS');
      }
      if (complex === 'SNOUL' || complex === 'SN') {
        return c === 'SNOUL' || c === 'SN' || c === 'KLH_SN' || n.includes('SNOUL');
      }
      if (complex === 'NAM_LAO' || complex === 'NL') {
        return c === 'NAM_LAO' || c === 'NL' || c === 'KLH_NL' || n.includes('NAM LÀO') || n.includes('NAM LAO') || n.includes('LÀO');
      }
      return c === complex || n.includes(complex);
    };

    const regionMap = new Map<string, string>();

    // 1. Add all regions from the database
    catalogRegions.forEach((r) => {
      if (isMatchComplex(r.parentCode, r.parentName) && r.code) {
        regionMap.set(r.code.toUpperCase(), r.name || `Khu vực ${r.code}`);
      }
    });

    // 2. Also check any enterprises that define a region code in description
    catalogEnterprises.forEach((e) => {
      if (isMatchComplex(e.parentCode, e.parentName)) {
        if (e.description && e.description.length <= 10 && !e.description.includes(' ')) {
          const code = e.description.toUpperCase();
          if (!regionMap.has(code)) {
            regionMap.set(code, `Khu vực ${code}`);
          }
        }
      }
    });

    return Array.from(regionMap.entries()).map(([code, name]) => ({
      value: code,
      label: name.startsWith(code) ? name : `${code} - ${name}`,
    }));
  }, [formData.complexCode, catalogRegions, catalogEnterprises]);

  // Dynamic Units: Take 100% directly from http://localhost:5173/danh-muc/loai-xe?tab=units
  const availableUnits = useMemo<SelectOption[]>(() => {
    const rawList =
      vehicleMasterUnits.length > 0
        ? vehicleMasterUnits
        : filterOptions.assignedUnits && filterOptions.assignedUnits.length > 0
        ? filterOptions.assignedUnits
        : INITIAL_CG_MANAGERS.map((m) => m.unitName);

    // Filter unique, non-empty, and sort alphabetically
    const uniqueUnits = Array.from(new Set(rawList.map((u) => u.trim()).filter(Boolean))).sort((a, b) =>
      a.localeCompare(b, 'vi')
    );

    return uniqueUnits.map((u) => ({
      value: u,
      label: u,
    }));
  }, [vehicleMasterUnits, filterOptions.assignedUnits]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.code.trim()) {
      setErrorMessage('Vui lòng nhập "Mã MMTB mới" tại Tab 1 (Định danh & Sở hữu).');
      setActiveTab('identity');
      return;
    }

    if (!formData.name.trim()) {
      setErrorMessage('Vui lòng nhập "Tên thiết bị MMTB" tại Tab 1 (Định danh & Sở hữu).');
      setActiveTab('identity');
      return;
    }

    if (!formData.category) {
      setErrorMessage('Vui lòng chọn "Chủng loại xe" tại Tab 1 (Định danh & Sở hữu).');
      setActiveTab('identity');
      return;
    }

    try {
      setSaving(true);
      setErrorMessage(null);

      // Safe Unit Enum resolution
      const rawUnitCode = (formData.assignedUnitCode || '').toUpperCase();
      let resolvedUnit = 'BAN_CO_GIOI';
      if (rawUnitCode.includes('NT1')) resolvedUnit = 'NT1';
      else if (rawUnitCode.includes('NT2')) resolvedUnit = 'NT2';
      else if (rawUnitCode.includes('BO')) resolvedUnit = 'XN_BO';
      else if (rawUnitCode.includes('BTSC')) resolvedUnit = 'TT_BTSC';
      else if (rawUnitCode.includes('TOAN_KLH') || rawUnitCode.includes('KLH')) resolvedUnit = 'TOAN_KLH';

      // Clean payload for backend
      const payload: Record<string, any> = {
        code: formData.code.trim().toUpperCase(),
        oldCode: formData.oldCode.trim() || undefined,
        bravoCode: formData.bravoCode.trim() || undefined,
        assetCode: formData.assetCode.trim() || undefined,
        plate: formData.plate.trim() || undefined,
        name: formData.name.trim(),
        purchaseCondition: formData.purchaseCondition.trim() || undefined,
        supplier: formData.supplier.trim() || undefined,
        companyOwner: formData.companyOwner.trim() || undefined,
        contractStatus: formData.contractStatus.trim() || undefined,

        unit: resolvedUnit,
        complexCode: formData.complexCode || 'KOUN_MOM',
        regionCode: formData.regionCode.trim() || undefined,
        assignedUnitCode: formData.assignedUnitCode.trim() || undefined,
        currentLocationName: formData.currentLocationName.trim() || undefined,
        managerName: formData.managerName.trim() || undefined,
        managerPhone: formData.managerPhone.trim() || undefined,

        category: formData.category,
        vehicleTypeId: formData.vehicleTypeId ? Number(formData.vehicleTypeId) : undefined,
        assetGroup: formData.assetGroup.trim() || undefined,
        manufacturer: formData.manufacturer.trim() || undefined,
        modelName: formData.modelName.trim() || undefined,
        origin: formData.origin.trim() || undefined,
        manufactureYear: formData.manufactureYear ? Number(formData.manufactureYear) : undefined,
        powerHp: formData.powerHp.trim() || undefined,
        frameNumber: formData.frameNumber.trim() || undefined,
        engineNumber: formData.engineNumber.trim() || undefined,
        technicalSpecs: formData.technicalSpecs.trim() || undefined,
        dimensions: formData.dimensions.trim() || undefined,
        productivity: formData.productivity.trim() || undefined,

        fuelQuotaRate: formData.fuelQuotaRate !== undefined && formData.fuelQuotaRate !== null && !isNaN(Number(formData.fuelQuotaRate)) ? Number(formData.fuelQuotaRate) : undefined,
        fuelQuotaUnit: formData.fuelQuotaUnit,
        fuelTankCapacity: formData.fuelTankCapacity !== undefined && formData.fuelTankCapacity !== null && !isNaN(Number(formData.fuelTankCapacity)) ? Number(formData.fuelTankCapacity) : undefined,
        status: formData.status,
        conditionStatus: formData.conditionStatus.trim() || undefined,
        totalMachineHours: formData.totalMachineHours ? Number(formData.totalMachineHours) : undefined,
        odoKm: formData.odoKm ? Number(formData.odoKm) : undefined,
        imageUrl: formData.imageUrl.trim() || undefined,
        notes: formData.notes.trim() || undefined,
      };

      if (isCreateMode) {
        const created = await apiService.createVehicle(payload);
        setSuccessMessage('Đã thêm mới hồ sơ phương tiện thành công!');
        setTimeout(() => {
          onSuccess(created);
          onClose();
        }, 700);
      } else {
        const updated = await apiService.updateVehicle(vehicle!.id, payload);
        setSuccessMessage('Đã cập nhật thông tin phương tiện thành công!');
        setTimeout(() => {
          onSuccess(updated);
          onClose();
        }, 700);
      }
    } catch (err: any) {
      console.error('Save vehicle error:', err);
      let rawMsg = err.response?.data?.message || err.message || 'Không thể lưu thông tin vào cơ sở dữ liệu.';
      if (Array.isArray(rawMsg)) {
        rawMsg = rawMsg
          .map((m: string) => {
            if (m.includes('unit must be one of') || m.includes('Đơn vị quản lý')) {
              return 'Đơn vị quản lý (unit) không hợp lệ';
            }
            if (m.includes('code should not be empty') || m.includes('code must be')) {
              return 'Mã MMTB mới không được để trống (Tab 1)';
            }
            if (m.includes('name should not be empty') || m.includes('name must be')) {
              return 'Tên thiết bị MMTB không được để trống (Tab 1)';
            }
            if (m.includes('category must be')) {
              return 'Chủng loại phương tiện không hợp lệ (Tab 1)';
            }
            return m;
          })
          .join(' • ');
      }
      setErrorMessage(rawMsg);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isCreateMode ? 'Thêm mới hồ sơ phương tiện & MMTB' : `Chỉnh sửa hồ sơ xe: ${vehicle?.internalCode}`}
      subtitle={isCreateMode ? 'Khai báo định danh, thông số kỹ thuật, định mức và đơn vị quản lý' : 'Cập nhật lý lịch kỹ thuật, định mức và phân bổ quản trị'}
      size="xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="text-xs text-slate-500 font-medium">
            {isCreateMode ? (
              <span className="text-emerald-700 font-bold">Thêm mới MMTB vào hệ thống</span>
            ) : (
              <>Mã ID hệ thống: <span className="font-mono font-bold text-slate-700">{vehicle?.id}</span></>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={saving}
              className="h-9 px-4 text-xs font-bold"
            >
              Hủy bỏ
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={saving}
              className="h-9 px-5 text-xs font-bold bg-[#15803d] hover:bg-[#166534] text-white shadow-md inline-flex items-center gap-1.5"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Đang lưu...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  {isCreateMode ? 'Thêm mới phương tiện' : 'Lưu thay đổi'}
                </>
              )}
            </Button>
          </div>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Alerts */}
        {errorMessage && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-800 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200">
          {[
            { key: 'identity', label: '1. Định danh & Sở hữu', icon: Tag },
            { key: 'location', label: '2. Khu vực & Phân bổ', icon: Building2 },
            { key: 'technical', label: '3. Kỹ thuật & Động cơ', icon: Gauge },
            { key: 'status', label: '4. Nhiên liệu & Trạng thái', icon: Fuel },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key as EditTab)}
                className={`flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-xs font-bold transition-all ${
                  active
                    ? 'border-primary text-primary bg-primary-50/50'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Contents Container: Cố định min-height */}
        <div className="min-h-[380px] pt-1">
          {/* TAB 1: ĐỊNH DANH & SỞ HỮU */}
          {activeTab === 'identity' && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-600">
                  Mã MMTB mới <span className="text-rose-500">*</span>
                </label>
                {isCreateMode && (
                  <button
                    type="button"
                    onClick={() => void fetchNextCode(formData.category, formData.vehicleTypeId, formData.teamUnit || formData.assignedUnitCode)}
                    className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 hover:text-emerald-800 hover:underline"
                    title="Tự động tạo mã tiếp theo theo chủng loại xe"
                  >
                    <RefreshCw className={`h-2.5 w-2.5 ${generatingCode ? 'animate-spin' : ''}`} />
                    Tự sinh mã
                  </button>
                )}
              </div>
              <div className="relative">
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => handleChange('code', e.target.value)}
                  placeholder="VD: CHT-MĐA-071"
                  className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-mono font-bold text-slate-900 outline-none focus:border-primary focus:bg-white pr-20"
                  required
                />
                {isCreateMode && (
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 rounded bg-emerald-100 px-1.5 py-0.5 text-[9px] font-extrabold text-emerald-800 pointer-events-none">
                    Tự tăng dần
                  </span>
                )}
              </div>
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-extrabold uppercase tracking-wider text-slate-600">
                Chủng loại xe (Tự sinh mã theo loại)
              </label>
              <SearchableSelect
                value={formData.vehicleTypeId ? String(formData.vehicleTypeId) : ''}
                onChange={(typeIdStr) => {
                  const typeId = typeIdStr ? Number(typeIdStr) : undefined;
                  const matched = filterOptions.vehicleTypes.find((t) => t.id === typeId);
                  const newCategory = matched?.category || formData.category;
                  handleChange('vehicleTypeId', typeId);
                  if (matched?.assetGroup) handleChange('assetGroup', matched.assetGroup);
                  if (matched?.category) handleChange('category', matched.category);
                  if (isCreateMode) {
                    void fetchNextCode(newCategory, typeId, formData.teamUnit || formData.assignedUnitCode);
                  }
                }}
                options={filterOptions.vehicleTypes.map((t) => ({
                  value: String(t.id),
                  label: t.name,
                  subLabel: t.assetGroup,
                }))}
                placeholder="Chọn loại xe..."
                emptyOptionLabel="-- Chọn chủng loại xe --"
                heightClass="h-9"
              />
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-extrabold uppercase tracking-wider text-slate-600">
                Mã MMTB cũ
              </label>
              <input
                type="text"
                value={formData.oldCode}
                onChange={(e) => handleChange('oldCode', e.target.value)}
                placeholder="VD: MĐ-012"
                className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-mono text-slate-900 outline-none focus:border-primary focus:bg-white"
              />
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-extrabold uppercase tracking-wider text-slate-600">
                Mã Bravo ERP
              </label>
              <input
                type="text"
                value={formData.bravoCode}
                onChange={(e) => handleChange('bravoCode', e.target.value)}
                placeholder="VD: ATT-A23-0025"
                className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-mono text-slate-900 outline-none focus:border-primary focus:bg-white"
              />
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-extrabold uppercase tracking-wider text-slate-600">
                Biển số xe / Đăng ký
              </label>
              <input
                type="text"
                value={formData.plate}
                onChange={(e) => handleChange('plate', e.target.value)}
                placeholder="VD: 70C-12345"
                className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-mono font-bold text-slate-900 outline-none focus:border-primary focus:bg-white"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1 block text-[11px] font-extrabold uppercase tracking-wider text-slate-600">
                Tên thiết bị MMTB <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="VD: Máy đào KOBELCO SK200-08 gàu 0.9m3"
                className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-bold text-slate-900 outline-none focus:border-primary focus:bg-white"
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-extrabold uppercase tracking-wider text-slate-600">
                Tình trạng mua sắm
              </label>
              <SearchableSelect
                value={formData.purchaseCondition}
                onChange={(val) => handleChange('purchaseCondition', val)}
                options={(filterOptions.purchaseConditions || [
                  'Mua mới 100%',
                  'Đã qua sử dụng (ĐQSD)',
                  'Điều chuyển nội bộ',
                  'Thuê ngoài',
                ]).map((c) => ({ value: c, label: c }))}
                placeholder="Chọn tình trạng mua..."
                emptyOptionLabel="-- Chọn tình trạng --"
                heightClass="h-9"
              />
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-extrabold uppercase tracking-wider text-slate-600">
                Nhà cung cấp
              </label>
              <SearchableSelect
                value={formData.supplier}
                onChange={(val) => handleChange('supplier', val)}
                options={(filterOptions.suppliers || [
                  'THACO AGRI',
                  'THACO INDUSTRIES',
                  'CATERPILLAR VN',
                  'KOBELCO VN',
                  'KOMATSU VN',
                  'TÂN PHÁT',
                  'LOVOL',
                  'PHƯỚC LỘC',
                  'CƯỜNG CƠ GIỚI',
                ]).map((s) => ({ value: s, label: s }))}
                placeholder="Chọn nhà cung cấp..."
                emptyOptionLabel="-- Chọn nhà cung cấp --"
                heightClass="h-9"
              />
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-extrabold uppercase tracking-wider text-slate-600">
                Pháp nhân sở hữu
              </label>
              <SearchableSelect
                value={formData.companyOwner}
                onChange={(val) => handleChange('companyOwner', val)}
                options={(filterOptions.companyOwners || [
                  'THACO AGRI',
                  'CÔNG TY CP NÔNG NGHIỆP DP',
                  'CÔNG TY TNHH BÒ AD',
                  'CÔNG TY CP NÔNG NGHIỆP LP',
                  'DP',
                  'ADM',
                  'LP',
                ]).map((o) => ({ value: o, label: o }))}
                placeholder="Chọn pháp nhân..."
                emptyOptionLabel="-- Chọn pháp nhân --"
                heightClass="h-9"
              />
            </div>
          </div>
        )}

        {/* TAB 2: KHU VỰC & PHÂN BỔ */}
        {activeTab === 'location' && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 pt-1">
            <div>
              <label className="mb-1 block text-[11px] font-extrabold uppercase tracking-wider text-slate-600">
                Khu liên hợp
              </label>
              <SearchableSelect
                value={formData.complexCode}
                onChange={(val) => handleComplexChange(val)}
                options={availableComplexes}
                placeholder="Chọn khu liên hợp"
                emptyOptionLabel="-- Chọn khu liên hợp --"
                heightClass="h-9"
              />
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-extrabold uppercase tracking-wider text-slate-600">
                Khu vực địa lý
              </label>
              <SearchableSelect
                value={formData.regionCode}
                onChange={(val) => handleRegionChange(val)}
                options={availableRegions}
                placeholder="Chọn khu vực (DP, LP, AD...)"
                emptyOptionLabel="-- Bỏ chọn khu vực --"
                heightClass="h-9"
              />
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-extrabold uppercase tracking-wider text-slate-600">
                Đơn vị sử dụng (Xí nghiệp / Đội)
              </label>
              <SearchableSelect
                value={formData.assignedUnitCode}
                onChange={(val) => handleChange('assignedUnitCode', val)}
                options={availableUnits}
                placeholder="Chọn đơn vị sử dụng"
                emptyOptionLabel="-- Bỏ chọn đơn vị --"
                heightClass="h-9"
              />
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-extrabold uppercase tracking-wider text-slate-600">
                Địa chỉ (Nơi tập kết)
              </label>
              <SearchableSelect
                value={formData.currentLocationName}
                onChange={(val) => handleChange('currentLocationName', val)}
                options={(filterOptions.locations || []).map((loc) => ({ value: loc, label: loc }))}
                placeholder="Chọn hoặc tìm nơi tập kết..."
                emptyOptionLabel="-- Chọn nơi tập kết --"
                heightClass="h-9"
              />
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-extrabold uppercase tracking-wider text-slate-600">
                Nhân sự quản lý
              </label>
              <input
                type="text"
                value={formData.managerName}
                onChange={(e) => handleChange('managerName', e.target.value)}
                placeholder="VD: Phạm Ngọc Hải"
                className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs text-slate-800 outline-none focus:border-primary focus:bg-white"
              />
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-extrabold uppercase tracking-wider text-slate-600">
                Số liên lạc (Zalo / SĐT)
              </label>
              <input
                type="text"
                value={formData.managerPhone}
                onChange={(e) => handleChange('managerPhone', e.target.value)}
                placeholder="VD: 0825456565"
                className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs text-slate-800 outline-none focus:border-primary focus:bg-white"
              />
            </div>
          </div>
        )}

        {/* TAB 3: KỸ THUẬT & ĐỘNG CƠ */}
        {activeTab === 'technical' && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 pt-1">
            <div>
              <label className="mb-1 block text-[11px] font-extrabold uppercase tracking-wider text-slate-600">
                Chủng loại hệ thống
              </label>
              <SearchableSelect
                value={formData.vehicleTypeId ? String(formData.vehicleTypeId) : ''}
                onChange={(val) => {
                  const typeId = val ? Number(val) : undefined;
                  const matched = filterOptions.vehicleTypes.find((t) => String(t.id) === val);
                  handleChange('vehicleTypeId', typeId);
                  if (matched?.assetGroup) handleChange('assetGroup', matched.assetGroup);
                  if (matched?.category) handleChange('category', matched.category);
                }}
                options={filterOptions.vehicleTypes.map((t) => ({
                  value: String(t.id),
                  label: t.name,
                  subLabel: t.assetGroup,
                }))}
                placeholder="Chọn chủng loại chuẩn"
                emptyOptionLabel="-- Chọn chủng loại chuẩn --"
                heightClass="h-9"
              />
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-extrabold uppercase tracking-wider text-slate-600">
                Nhóm tài sản
              </label>
              <select
                value={formData.assetGroup}
                onChange={(e) => handleChange('assetGroup', e.target.value)}
                className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-800 outline-none focus:border-primary focus:bg-white"
              >
                <option value="">-- Chưa phân nhóm --</option>
                {filterOptions.assetGroups.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-extrabold uppercase tracking-wider text-slate-600">
                Hãng / Nhãn hiệu
              </label>
              <SearchableSelect
                value={formData.manufacturer}
                onChange={(val) => handleChange('manufacturer', val)}
                options={filterOptions.manufacturers.map((mf) => {
                  const name = typeof mf === 'object' ? (mf as any).name : String(mf);
                  return { value: name, label: name };
                })}
                placeholder="Chọn hoặc nhập hãng"
                emptyOptionLabel="-- Bỏ chọn hãng --"
                heightClass="h-9"
              />
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-extrabold uppercase tracking-wider text-slate-600">
                Model kiểu loại
              </label>
              <SearchableSelect
                value={formData.modelName}
                onChange={(val) => handleChange('modelName', val)}
                options={filterOptions.models.map((m) => {
                  const name = typeof m === 'object' ? (m as any).name : String(m);
                  return { value: name, label: name };
                })}
                placeholder="Chọn hoặc nhập model"
                emptyOptionLabel="-- Bỏ chọn model --"
                heightClass="h-9"
              />
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-extrabold uppercase tracking-wider text-slate-600">
                Xuất xứ / Quốc gia
              </label>
              <SearchableSelect
                value={formData.origin}
                onChange={(val) => handleChange('origin', val)}
                options={filterOptions.origins.map((orig) => {
                  const name = typeof orig === 'object' ? (orig as any).name : String(orig);
                  return { value: name, label: name };
                })}
                placeholder="Chọn hoặc nhập xuất xứ"
                emptyOptionLabel="-- Bỏ chọn xuất xứ --"
                heightClass="h-9"
              />
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-extrabold uppercase tracking-wider text-slate-600">
                Năm sản xuất
              </label>
              <input
                type="number"
                min="1950"
                max="2035"
                value={formData.manufactureYear || ''}
                onChange={(e) => handleChange('manufactureYear', e.target.value ? Number(e.target.value) : undefined)}
                placeholder="VD: 2022"
                className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-mono font-bold text-slate-900 outline-none focus:border-primary focus:bg-white"
              />
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-extrabold uppercase tracking-wider text-slate-600">
                Công suất động cơ
              </label>
              <input
                type="text"
                value={formData.powerHp}
                onChange={(e) => handleChange('powerHp', e.target.value)}
                placeholder="VD: 140 HP / 110 kW"
                className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs text-slate-900 outline-none focus:border-primary focus:bg-white"
              />
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-extrabold uppercase tracking-wider text-slate-600">
                Số khung (VIN)
              </label>
              <input
                type="text"
                value={formData.frameNumber}
                onChange={(e) => handleChange('frameNumber', e.target.value)}
                placeholder="VD: SK200-88899"
                className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-mono text-slate-900 outline-none focus:border-primary focus:bg-white"
              />
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-extrabold uppercase tracking-wider text-slate-600">
                Số máy (Engine No)
              </label>
              <input
                type="text"
                value={formData.engineNumber}
                onChange={(e) => handleChange('engineNumber', e.target.value)}
                placeholder="VD: J05E-123456"
                className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-mono text-slate-900 outline-none focus:border-primary focus:bg-white"
              />
            </div>
          </div>
        )}

        {/* TAB 4: NHIÊN LIỆU & TRẠNG THÁI */}
        {activeTab === 'status' && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 pt-1">
            <div>
              <label className="mb-1 block text-[11px] font-extrabold uppercase tracking-wider text-slate-600">
                Định mức tiêu hao dầu
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={formData.fuelQuotaRate ?? ''}
                onChange={(e) => handleChange('fuelQuotaRate', e.target.value ? parseFloat(e.target.value) : undefined)}
                placeholder="VD: 14.5"
                className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-mono font-bold text-slate-900 outline-none focus:border-primary focus:bg-white"
              />
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-extrabold uppercase tracking-wider text-slate-600">
                Đơn vị định mức
              </label>
              <select
                value={formData.fuelQuotaUnit}
                onChange={(e) => handleChange('fuelQuotaUnit', e.target.value)}
                className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-800 outline-none focus:border-primary focus:bg-white"
              >
                <option value="L_PER_HOUR">Lít / Giờ máy (L/h)</option>
                <option value="L_PER_KM">Lít / 100km (L/100km)</option>
                <option value="L_PER_HA">Lít / Hécta (L/ha)</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-extrabold uppercase tracking-wider text-slate-600">
                Dung tích thùng dầu (Lít)
              </label>
              <input
                type="number"
                min="0"
                value={formData.fuelTankCapacity || ''}
                onChange={(e) => handleChange('fuelTankCapacity', e.target.value ? parseFloat(e.target.value) : undefined)}
                placeholder="VD: 340"
                className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-mono text-slate-900 outline-none focus:border-primary focus:bg-white"
              />
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-extrabold uppercase tracking-wider text-slate-600">
                Trạng thái hệ thống
              </label>
              <select
                value={formData.status}
                onChange={(e) => handleChange('status', e.target.value)}
                className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-bold text-slate-800 outline-none focus:border-primary focus:bg-white"
              >
                <option value="HOAT_DONG">Đang hoạt động (Bình thường)</option>
                <option value="TAM_DUNG">Thanh lý</option>
                <option value="CHO_PHAN_CONG">Chờ phân công</option>
                <option value="BAO_DUONG">Đang bảo dưỡng</option>
                <option value="SUA_CHUA">Đang sửa chữa (Hư hỏng)</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-extrabold uppercase tracking-wider text-slate-600">
                Tình trạng kỹ thuật
              </label>
              <input
                type="text"
                value={formData.conditionStatus}
                onChange={(e) => handleChange('conditionStatus', e.target.value)}
                placeholder="VD: Bình thường / Hư hỏng"
                className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs text-slate-800 outline-none focus:border-primary focus:bg-white"
              />
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-extrabold uppercase tracking-wider text-slate-600">
                Tổng giờ máy lũy kế
              </label>
              <input
                type="number"
                step="0.1"
                value={formData.totalMachineHours || ''}
                onChange={(e) => handleChange('totalMachineHours', e.target.value ? parseFloat(e.target.value) : undefined)}
                placeholder="VD: 1450.5"
                className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-mono text-slate-900 outline-none focus:border-primary focus:bg-white"
              />
            </div>

            <div className="sm:col-span-3">
              <label className="mb-1 block text-[11px] font-extrabold uppercase tracking-wider text-slate-600">
                Link hình ảnh thiết bị (Image URL)
              </label>
              <input
                type="text"
                value={formData.imageUrl}
                onChange={(e) => handleChange('imageUrl', e.target.value)}
                placeholder="VD: https://thacoagri.vn/images/mmtb/sk200.jpg"
                className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs text-slate-900 outline-none focus:border-primary focus:bg-white"
              />
            </div>

            <div className="sm:col-span-3">
              <label className="mb-1 block text-[11px] font-extrabold uppercase tracking-wider text-slate-600">
                Ghi chú / Hiện trạng
              </label>
              <textarea
                rows={2}
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                placeholder="Ghi chú chi tiết về tình trạng thiết bị, lịch sử điều chuyển..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-900 outline-none focus:border-primary focus:bg-white"
              />
            </div>
          </div>
        )}
        </div>
      </form>
    </Modal>
  );
};
