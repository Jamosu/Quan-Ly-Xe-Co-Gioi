import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Building2,
  Users,
  Briefcase,
  Award,
  ShieldAlert,
  UserCheck,
  Layers,
  Plus,
  RefreshCw,
  Search,
  LayoutDashboard,
  Table as TableIcon,
  RotateCcw,
  Download,
  Upload,
  FileSpreadsheet,
} from 'lucide-react';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { TableRowActions } from '../../components/common/TableRowActions';
import { StatusToggle } from '../../components/common/StatusToggle';
import { AuditUserPopover } from '../../components/common/AuditUserPopover';
import { useAppStore } from '../../store/useAppStore';
import { driverManagementApi, DriverManagementLevel, DriverManagementUnit, DriverManagementUnitType } from '../../api/driverManagementApi';
import { PositionsCatalogPage } from './PositionsCatalogPage';
import { CatalogItem, mockComplexes } from '../../data/catalogData';
import { catalogsApi } from '../../api/catalogsApi';
import { getStoredData } from '../../utils/storage';
import {
  DriverLicenseClassItem,
  DriverComplianceStatusItem,
  DriverEmploymentStatusItem,
  DriverUnitTypeItem,
  getDriverLicenseClasses,
  setDriverLicenseClasses,
  getDriverComplianceStatuses,
  setDriverComplianceStatuses,
  getDriverEmploymentStatuses,
  setDriverEmploymentStatuses,
  getDriverUnitTypes,
  setDriverUnitTypes,
} from '../../data/driverCatalogData';

type Tab =
  | 'owners'
  | 'teams'
  | 'positions'
  | 'license-classes'
  | 'compliance-statuses'
  | 'employment-statuses'
  | 'unit-types';

const TABS: Array<{ id: Tab; label: string; icon: React.ElementType }> = [
  { id: 'owners', label: 'Đơn vị chủ quản', icon: Building2 },
  { id: 'teams', label: 'Đội/Tổ trực thuộc', icon: Users },
  { id: 'positions', label: 'Chức danh', icon: Briefcase },
  { id: 'license-classes', label: 'Hạng GPLX & Bằng máy', icon: Award },
  { id: 'compliance-statuses', label: 'Tình trạng GPLX & Hạn SK', icon: ShieldAlert },
  { id: 'employment-statuses', label: 'Tình trạng việc làm', icon: UserCheck },
  { id: 'unit-types', label: 'Loại đơn vị quản lý', icon: Layers },
];

const TYPE_LABELS: Record<DriverManagementUnitType, string> = {
  BAN: 'Ban',
  PHONG: 'Phòng',
  TRUNG_TAM: 'Trung tâm',
  XI_NGHIEP: 'Xí nghiệp',
  NONG_TRUONG: 'Nông trường',
  DOI: 'Đội',
  TO: 'Tổ',
  KHAC: 'Khác',
};

const blankUnit = (level: DriverManagementLevel) => ({
  complexCode: 'KOUN_MOM',
  code: '',
  name: '',
  level,
  unitType: (level === 'OWNER' ? 'BAN' : 'DOI') as DriverManagementUnitType,
  parentId: '',
  description: '',
  status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE',
});

export const DriverProfileCatalogPage: React.FC = () => {
  const [params, setParams] = useSearchParams();
  const requested = params.get('tab') as Tab | null;
  const activeTab: Tab = TABS.some((tab) => tab.id === requested) ? requested! : 'owners';
  const currentUser = useAppStore((state) => state.currentUser);
  const canEdit = currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'FARM_MANAGER';

  const [viewMode, setViewMode] = useState<'summary' | 'table'>('table');

  // 1. Quản lý Đơn vị chủ quản & Đội/Tổ (Cấp 2 & Cấp 3)
  const [units, setUnits] = useState<DriverManagementUnit[]>([]);
  const [catalogComplexes, setCatalogComplexes] = useState<CatalogItem[]>(() =>
    getStoredData('catalogs_complexes', mockComplexes)
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Bộ lọc cho Đơn vị (owners / teams)
  const [unitCodeFilter, setUnitCodeFilter] = useState('');
  const [unitNameFilter, setUnitNameFilter] = useState('');
  const [complexCode, setComplexCode] = useState('ALL');
  const [unitTypeFilter, setUnitTypeFilter] = useState('ALL');
  const [unitStatusFilter, setUnitStatusFilter] = useState('ALL');

  // Bộ lọc cho Hạng GPLX
  const [lcCodeFilter, setLcCodeFilter] = useState('');
  const [lcNameFilter, setLcNameFilter] = useState('');
  const [lcCategoryFilter, setLcCategoryFilter] = useState('ALL');
  const [lcStatusFilter, setLcStatusFilter] = useState('ALL');

  // Bộ lọc cho Tình trạng GPLX & SK
  const [csCodeFilter, setCsCodeFilter] = useState('');
  const [csNameFilter, setCsNameFilter] = useState('');
  const [csBadgeFilter, setCsBadgeFilter] = useState('ALL');
  const [csStatusFilter, setCsStatusFilter] = useState('ALL');

  // Bộ lọc cho Trạng thái việc làm
  const [esCodeFilter, setEsCodeFilter] = useState('');
  const [esNameFilter, setEsNameFilter] = useState('');
  const [esDispatchFilter, setEsDispatchFilter] = useState('ALL');
  const [esStatusFilter, setEsStatusFilter] = useState('ALL');

  // Bộ lọc cho Loại đơn vị
  const [utCodeFilter, setUtCodeFilter] = useState('');
  const [utNameFilter, setUtNameFilter] = useState('');
  const [utLevelFilter, setUtLevelFilter] = useState('ALL');
  const [utStatusFilter, setUtStatusFilter] = useState('ALL');

  const [unitModal, setUnitModal] = useState(false);
  const [editingUnit, setEditingUnit] = useState<DriverManagementUnit | null>(null);
  const [viewingUnit, setViewingUnit] = useState<DriverManagementUnit | null>(null);
  const [unitForm, setUnitForm] = useState(blankUnit('OWNER'));

  // 2. Quản lý Hạng GPLX & Bằng máy
  const [licenseClasses, setLocalLicenseClasses] = useState<DriverLicenseClassItem[]>(() =>
    getDriverLicenseClasses()
  );
  const [licenseClassModal, setLicenseClassModal] = useState(false);
  const [editingLicenseClass, setEditingLicenseClass] = useState<DriverLicenseClassItem | null>(null);
  const [viewingLicenseClass, setViewingLicenseClass] = useState<DriverLicenseClassItem | null>(null);
  const [licenseClassForm, setLicenseClassForm] = useState<Partial<DriverLicenseClassItem>>({
    code: '',
    name: '',
    category: 'ROAD_LICENSE',
    categoryLabel: 'GPLX đường bộ',
    allowedVehicles: '',
    validityYears: 5,
    status: 'ACTIVE',
  });

  // 3. Quản lý Tình trạng GPLX & Hạn SK
  const [complianceStatuses, setLocalComplianceStatuses] = useState<DriverComplianceStatusItem[]>(() =>
    getDriverComplianceStatuses()
  );
  const [complianceModal, setComplianceModal] = useState(false);
  const [editingCompliance, setEditingCompliance] = useState<DriverComplianceStatusItem | null>(null);
  const [viewingCompliance, setViewingCompliance] = useState<DriverComplianceStatusItem | null>(null);
  const [complianceForm, setComplianceForm] = useState<Partial<DriverComplianceStatusItem>>({
    code: '',
    name: '',
    badgeVariant: 'green',
    thresholdDays: '',
    actionRequired: '',
    status: 'ACTIVE',
  });

  // 4. Quản lý Tình trạng việc làm
  const [employmentStatuses, setLocalEmploymentStatuses] = useState<DriverEmploymentStatusItem[]>(() =>
    getDriverEmploymentStatuses()
  );
  const [employmentModal, setEmploymentModal] = useState(false);
  const [editingEmployment, setEditingEmployment] = useState<DriverEmploymentStatusItem | null>(null);
  const [viewingEmployment, setViewingEmployment] = useState<DriverEmploymentStatusItem | null>(null);
  const [employmentForm, setEmploymentForm] = useState<Partial<DriverEmploymentStatusItem>>({
    code: '',
    name: '',
    canDispatch: true,
    badgeVariant: 'green',
    description: '',
    status: 'ACTIVE',
  });

  // 5. Quản lý Loại đơn vị
  const [unitTypes, setLocalUnitTypes] = useState<DriverUnitTypeItem[]>(() => getDriverUnitTypes());
  const [unitTypeModal, setUnitTypeModal] = useState(false);
  const [editingUnitType, setEditingUnitType] = useState<DriverUnitTypeItem | null>(null);
  const [viewingUnitType, setViewingUnitType] = useState<DriverUnitTypeItem | null>(null);
  const [unitTypeForm, setUnitTypeForm] = useState<Partial<DriverUnitTypeItem>>({
    code: '',
    name: '',
    level: 'OWNER',
    levelLabel: 'Cấp 2 - Đơn vị chủ quản',
    description: '',
    status: 'ACTIVE',
  });

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const unitData = await driverManagementApi.getUnits();
      setUnits(unitData || []);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Không tải được danh mục đơn vị từ máy chủ.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    catalogsApi.getCatalogs('COMPLEX', 'catalogs_complexes', mockComplexes).then((data) => {
      if (Array.isArray(data) && data.length > 0) setCatalogComplexes(data);
    });
  }, []);

  const owners = useMemo(() => units.filter((u) => u.level === 'OWNER'), [units]);

  // Danh sách Đơn vị sau lọc
  const visibleUnits = useMemo(() => {
    return units.filter((unit) => {
      const expectedLevel = activeTab === 'teams' ? 'TEAM' : 'OWNER';
      if (unit.level !== expectedLevel) return false;
      if (complexCode !== 'ALL' && unit.complexCode !== complexCode) return false;
      if (unitTypeFilter !== 'ALL' && unit.unitType !== unitTypeFilter) return false;
      if (unitStatusFilter !== 'ALL' && unit.status !== unitStatusFilter) return false;
      if (unitCodeFilter && !unit.code.toLowerCase().includes(unitCodeFilter.toLowerCase())) return false;
      if (unitNameFilter && !unit.name.toLowerCase().includes(unitNameFilter.toLowerCase())) return false;
      return true;
    });
  }, [units, activeTab, complexCode, unitTypeFilter, unitStatusFilter, unitCodeFilter, unitNameFilter]);

  // Danh sách Hạng GPLX sau lọc
  const visibleLicenseClasses = useMemo(() => {
    return licenseClasses.filter((item) => {
      if (lcCategoryFilter !== 'ALL' && item.category !== lcCategoryFilter) return false;
      if (lcStatusFilter !== 'ALL' && item.status !== lcStatusFilter) return false;
      if (lcCodeFilter && !item.code.toLowerCase().includes(lcCodeFilter.toLowerCase())) return false;
      if (lcNameFilter && !item.name.toLowerCase().includes(lcNameFilter.toLowerCase())) return false;
      return true;
    });
  }, [licenseClasses, lcCategoryFilter, lcStatusFilter, lcCodeFilter, lcNameFilter]);

  // Danh sách Tình trạng tuân thủ sau lọc
  const visibleComplianceStatuses = useMemo(() => {
    return complianceStatuses.filter((item) => {
      if (csBadgeFilter !== 'ALL' && item.badgeVariant !== csBadgeFilter) return false;
      if (csStatusFilter !== 'ALL' && item.status !== csStatusFilter) return false;
      if (csCodeFilter && !item.code.toLowerCase().includes(csCodeFilter.toLowerCase())) return false;
      if (csNameFilter && !item.name.toLowerCase().includes(csNameFilter.toLowerCase())) return false;
      return true;
    });
  }, [complianceStatuses, csBadgeFilter, csStatusFilter, csCodeFilter, csNameFilter]);

  // Danh sách Trạng thái việc làm sau lọc
  const visibleEmploymentStatuses = useMemo(() => {
    return employmentStatuses.filter((item) => {
      if (esDispatchFilter !== 'ALL') {
        const canD = esDispatchFilter === 'true';
        if (item.canDispatch !== canD) return false;
      }
      if (esStatusFilter !== 'ALL' && item.status !== esStatusFilter) return false;
      if (esCodeFilter && !item.code.toLowerCase().includes(esCodeFilter.toLowerCase())) return false;
      if (esNameFilter && !item.name.toLowerCase().includes(esNameFilter.toLowerCase())) return false;
      return true;
    });
  }, [employmentStatuses, esDispatchFilter, esStatusFilter, esCodeFilter, esNameFilter]);

  // Danh sách Loại đơn vị sau lọc
  const visibleUnitTypes = useMemo(() => {
    return unitTypes.filter((item) => {
      if (utLevelFilter !== 'ALL' && item.level !== utLevelFilter) return false;
      if (utStatusFilter !== 'ALL' && item.status !== utStatusFilter) return false;
      if (utCodeFilter && !item.code.toLowerCase().includes(utCodeFilter.toLowerCase())) return false;
      if (utNameFilter && !item.name.toLowerCase().includes(utNameFilter.toLowerCase())) return false;
      return true;
    });
  }, [unitTypes, utLevelFilter, utStatusFilter, utCodeFilter, utNameFilter]);

  // Hàm reset filter theo tab
  const handleResetFilters = () => {
    if (activeTab === 'owners' || activeTab === 'teams') {
      setUnitCodeFilter('');
      setUnitNameFilter('');
      setComplexCode('ALL');
      setUnitTypeFilter('ALL');
      setUnitStatusFilter('ALL');
    } else if (activeTab === 'license-classes') {
      setLcCodeFilter('');
      setLcNameFilter('');
      setLcCategoryFilter('ALL');
      setLcStatusFilter('ALL');
    } else if (activeTab === 'compliance-statuses') {
      setCsCodeFilter('');
      setCsNameFilter('');
      setCsBadgeFilter('ALL');
      setCsStatusFilter('ALL');
    } else if (activeTab === 'employment-statuses') {
      setEsCodeFilter('');
      setEsNameFilter('');
      setEsDispatchFilter('ALL');
      setEsStatusFilter('ALL');
    } else if (activeTab === 'unit-types') {
      setUtCodeFilter('');
      setUtNameFilter('');
      setUtLevelFilter('ALL');
      setUtStatusFilter('ALL');
    }
  };

  // Hàm Export Excel
  const handleExportExcel = () => {
    try {
      let headers: string[] = ['STT', 'Mã', 'Tên', 'Ghi chú / Mô tả', 'Trạng thái'];
      let rows: Array<Array<string | number>> = [];

      if (activeTab === 'owners' || activeTab === 'teams') {
        headers = ['STT', 'Mã đơn vị', 'Tên đơn vị', 'Khu liên hợp', 'Loại đơn vị', 'Mô tả', 'Trạng thái'];
        rows = visibleUnits.map((u, i) => [
          i + 1,
          u.code,
          u.name,
          u.complexCode,
          TYPE_LABELS[u.unitType] || u.unitType,
          u.description || '',
          u.status === 'ACTIVE' ? 'Hoạt động' : 'Không hoạt động',
        ]);
      } else if (activeTab === 'license-classes') {
        headers = ['STT', 'Mã hạng', 'Tên hạng GPLX', 'Phân nhóm', 'Phương tiện được phép', 'Thời hạn', 'Trạng thái'];
        rows = visibleLicenseClasses.map((item, i) => [
          i + 1,
          item.code,
          item.name,
          item.categoryLabel,
          item.allowedVehicles || '',
          String(item.validityYears),
          item.status === 'ACTIVE' ? 'Hoạt động' : 'Không hoạt động',
        ]);
      } else if (activeTab === 'compliance-statuses') {
        headers = ['STT', 'Mã trạng thái', 'Tên hiển thị', 'Ngưỡng thời hạn', 'Hành động quy định', 'Trạng thái'];
        rows = visibleComplianceStatuses.map((item, i) => [
          i + 1,
          item.code,
          item.name,
          item.thresholdDays || '',
          item.actionRequired || '',
          item.status === 'ACTIVE' ? 'Hoạt động' : 'Không hoạt động',
        ]);
      } else if (activeTab === 'employment-statuses') {
        headers = ['STT', 'Mã trạng thái', 'Tên trạng thái', 'Phép điều xe', 'Mô tả', 'Trạng thái'];
        rows = visibleEmploymentStatuses.map((item, i) => [
          i + 1,
          item.code,
          item.name,
          item.canDispatch ? 'Có' : 'Không',
          item.description || '',
          item.status === 'ACTIVE' ? 'Hoạt động' : 'Không hoạt động',
        ]);
      } else if (activeTab === 'unit-types') {
        headers = ['STT', 'Mã loại', 'Tên loại đơn vị', 'Cấp phân nhóm', 'Mô tả', 'Trạng thái'];
        rows = visibleUnitTypes.map((item, i) => [
          i + 1,
          item.code,
          item.name,
          item.levelLabel,
          item.description || '',
          item.status === 'ACTIVE' ? 'Hoạt động' : 'Không hoạt động',
        ]);
      }

      const csvRows = [
        headers.map((h) => `"${h.replace(/"/g, '""')}"`).join(','),
        ...rows.map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')),
      ];
      const csvContent = '\uFEFF' + csvRows.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `danh_muc_${activeTab}_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error(e);
      alert('Xuất file thất bại!');
    }
  };

  // Hàm Download Template
  const handleDownloadTemplate = () => {
    const csvContent = '\uFEFFMã,Tên,Ghi chú,Trạng thái\n';
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `template_${activeTab}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Hàm Upload File
  const handleUploadFile = () => {
    alert('Tính năng nhập dữ liệu file Excel đã sẵn sàng. Vui lòng chuẩn bị file theo đúng template mẫu.');
  };

  // Handler Units
  const openCreateUnit = (level: DriverManagementLevel) => {
    setEditingUnit(null);
    setUnitForm(blankUnit(level));
    setUnitModal(true);
  };

  const openEditUnit = (unit: DriverManagementUnit) => {
    setEditingUnit(unit);
    setUnitForm({
      complexCode: unit.complexCode,
      code: unit.code,
      name: unit.name,
      level: unit.level,
      unitType: unit.unitType,
      parentId: unit.parentId ? String(unit.parentId) : '',
      description: unit.description || '',
      status: unit.status || 'ACTIVE',
    });
    setUnitModal(true);
  };

  const saveUnit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    try {
      if (editingUnit) {
        await driverManagementApi.updateUnit(editingUnit.id, {
          name: unitForm.name,
          unitType: unitForm.unitType,
          description: unitForm.description,
          status: unitForm.status,
        });
      } else {
        await driverManagementApi.createUnit({
          ...unitForm,
          parentId: unitForm.parentId ? Number(unitForm.parentId) : undefined,
        });
      }
      setUnitModal(false);
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Không thể lưu đơn vị.');
    }
  };

  const handleDeleteUnit = async (unit: DriverManagementUnit) => {
    const label = unit.level === 'TEAM' ? 'Đội/Tổ' : 'đơn vị';
    if (!window.confirm(`Bạn có chắc chắn muốn xóa ${label} "${unit.name}" (${unit.code})?`)) return;
    try {
      await driverManagementApi.deleteUnit(unit.id);
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.message || `Không thể xóa ${label}.`);
    }
  };

  // Handler License Classes
  const saveLicenseClass = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = [...licenseClasses];
    if (editingLicenseClass) {
      const idx = updated.findIndex((i) => i.id === editingLicenseClass.id);
      if (idx >= 0) {
        updated[idx] = {
          ...editingLicenseClass,
          ...licenseClassForm,
          categoryLabel:
            licenseClassForm.category === 'ROAD_LICENSE'
              ? 'GPLX đường bộ'
              : licenseClassForm.category === 'AGRI_MACHINERY'
              ? 'Cơ giới nông nghiệp'
              : 'Máy công trình',
          updatedAt: '15-09-2026',
          updatedUser: currentUser?.username || 'admin',
        } as DriverLicenseClassItem;
      }
    } else {
      const newItem: DriverLicenseClassItem = {
        id: `lc-${Date.now()}`,
        code: licenseClassForm.code || `HANG_${Date.now()}`,
        name: licenseClassForm.name || 'Hạng mới',
        category: licenseClassForm.category || 'ROAD_LICENSE',
        categoryLabel:
          licenseClassForm.category === 'ROAD_LICENSE'
            ? 'GPLX đường bộ'
            : licenseClassForm.category === 'AGRI_MACHINERY'
            ? 'Cơ giới nông nghiệp'
            : 'Máy công trình',
        allowedVehicles: licenseClassForm.allowedVehicles || '',
        validityYears: licenseClassForm.validityYears || 5,
        status: licenseClassForm.status || 'ACTIVE',
        createdAt: '15-09-2026',
        createdUser: currentUser?.username || 'admin',
        updatedAt: '15-09-2026',
        updatedUser: currentUser?.username || 'admin',
      };
      updated.unshift(newItem);
    }
    setLocalLicenseClasses(updated);
    setDriverLicenseClasses(updated);
    setLicenseClassModal(false);
  };

  const deleteLicenseClass = (item: DriverLicenseClassItem) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa hạng "${item.name}"?`)) return;
    const updated = licenseClasses.filter((i) => i.id !== item.id);
    setLocalLicenseClasses(updated);
    setDriverLicenseClasses(updated);
  };

  // Handler Compliance Statuses
  const saveCompliance = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = [...complianceStatuses];
    if (editingCompliance) {
      const idx = updated.findIndex((i) => i.id === editingCompliance.id);
      if (idx >= 0) {
        updated[idx] = {
          ...editingCompliance,
          ...complianceForm,
          updatedAt: '15-09-2026',
          updatedUser: currentUser?.username || 'admin',
        } as DriverComplianceStatusItem;
      }
    } else {
      const newItem: DriverComplianceStatusItem = {
        id: `cs-${Date.now()}`,
        code: complianceForm.code || `STATUS_${Date.now()}`,
        name: complianceForm.name || 'Tình trạng mới',
        badgeVariant: complianceForm.badgeVariant || 'green',
        thresholdDays: complianceForm.thresholdDays || '',
        actionRequired: complianceForm.actionRequired || '',
        status: complianceForm.status || 'ACTIVE',
        createdAt: '15-09-2026',
        createdUser: currentUser?.username || 'admin',
        updatedAt: '15-09-2026',
        updatedUser: currentUser?.username || 'admin',
      };
      updated.unshift(newItem);
    }
    setLocalComplianceStatuses(updated);
    setDriverComplianceStatuses(updated);
    setComplianceModal(false);
  };

  const deleteCompliance = (item: DriverComplianceStatusItem) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa tình trạng "${item.name}"?`)) return;
    const updated = complianceStatuses.filter((i) => i.id !== item.id);
    setLocalComplianceStatuses(updated);
    setDriverComplianceStatuses(updated);
  };

  // Handler Employment Statuses
  const saveEmployment = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = [...employmentStatuses];
    if (editingEmployment) {
      const idx = updated.findIndex((i) => i.id === editingEmployment.id);
      if (idx >= 0) {
        updated[idx] = {
          ...editingEmployment,
          ...employmentForm,
          updatedAt: '15-09-2026',
          updatedUser: currentUser?.username || 'admin',
        } as DriverEmploymentStatusItem;
      }
    } else {
      const newItem: DriverEmploymentStatusItem = {
        id: `es-${Date.now()}`,
        code: employmentForm.code || `EMP_${Date.now()}`,
        name: employmentForm.name || 'Trạng thái mới',
        canDispatch: employmentForm.canDispatch !== undefined ? employmentForm.canDispatch : true,
        badgeVariant: employmentForm.badgeVariant || 'green',
        description: employmentForm.description || '',
        status: employmentForm.status || 'ACTIVE',
        createdAt: '15-09-2026',
        createdUser: currentUser?.username || 'admin',
        updatedAt: '15-09-2026',
        updatedUser: currentUser?.username || 'admin',
      };
      updated.unshift(newItem);
    }
    setLocalEmploymentStatuses(updated);
    setDriverEmploymentStatuses(updated);
    setEmploymentModal(false);
  };

  const deleteEmployment = (item: DriverEmploymentStatusItem) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa trạng thái "${item.name}"?`)) return;
    const updated = employmentStatuses.filter((i) => i.id !== item.id);
    setLocalEmploymentStatuses(updated);
    setDriverEmploymentStatuses(updated);
  };

  // Handler Unit Types
  const saveUnitType = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = [...unitTypes];
    if (editingUnitType) {
      const idx = updated.findIndex((i) => i.id === editingUnitType.id);
      if (idx >= 0) {
        updated[idx] = {
          ...editingUnitType,
          ...unitTypeForm,
          levelLabel:
            unitTypeForm.level === 'OWNER' ? 'Cấp 2 - Đơn vị chủ quản' : 'Cấp 3 - Đội/Tổ trực thuộc',
          updatedAt: '15-09-2026',
          updatedUser: currentUser?.username || 'admin',
        } as DriverUnitTypeItem;
      }
    } else {
      const newItem: DriverUnitTypeItem = {
        id: `ut-${Date.now()}`,
        code: unitTypeForm.code || `TYPE_${Date.now()}`,
        name: unitTypeForm.name || 'Loại mới',
        level: unitTypeForm.level || 'OWNER',
        levelLabel:
          unitTypeForm.level === 'OWNER' ? 'Cấp 2 - Đơn vị chủ quản' : 'Cấp 3 - Đội/Tổ trực thuộc',
        description: unitTypeForm.description || '',
        status: unitTypeForm.status || 'ACTIVE',
        createdAt: '15-09-2026',
        createdUser: currentUser?.username || 'admin',
        updatedAt: '15-09-2026',
        updatedUser: currentUser?.username || 'admin',
      };
      updated.unshift(newItem);
    }
    setLocalUnitTypes(updated);
    setDriverUnitTypes(updated);
    setUnitTypeModal(false);
  };

  const deleteUnitType = (item: DriverUnitTypeItem) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa loại "${item.name}"?`)) return;
    const updated = unitTypes.filter((i) => i.id !== item.id);
    setLocalUnitTypes(updated);
    setDriverUnitTypes(updated);
  };

  // Helper render status badge chuẩn Hình 1
  const renderStatusBadge = (status?: string) => {
    const isActive = status === 'ACTIVE' || status === 'HOAT_DONG';
    return (
      <span
        className={`inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
          isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
        }`}
      >
        {isActive ? 'Hoạt động' : 'Không hoạt động'}
      </span>
    );
  };

  return (
    <div className="space-y-4 font-sans">
      {/* 1. THANH ĐIỀU HƯỚNG CHUYỂN CHẾ ĐỘ GIỐNG HÌNH 1 (KHÔNG CÓ CHỮ DƯ THỪA ĐẦU TRANG) */}
      <div className="flex items-center justify-between gap-4 bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between w-full gap-2 flex-wrap">
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setViewMode('summary')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                viewMode === 'summary'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              Tổng quan Thống kê
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              Quản lý Bảng Dữ liệu
            </button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => void load()}
            disabled={loading}
            className="flex items-center gap-1.5 bg-white hover:bg-slate-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-600' : ''}`} />
            <span>Làm mới</span>
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-700">
          {error}
        </div>
      )}

      {/* CHẾ ĐỘ 1: TỔNG QUAN THỐNG KÊ (KPI CARDS) */}
      {viewMode === 'summary' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {[
            {
              id: 'owners',
              label: 'Đơn vị chủ quản',
              count: units.filter((u) => u.level === 'OWNER').length,
              unit: 'đơn vị',
              icon: Building2,
              color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
            },
            {
              id: 'teams',
              label: 'Đội/Tổ trực thuộc',
              count: units.filter((u) => u.level === 'TEAM').length,
              unit: 'đội/tổ',
              icon: Users,
              color: 'text-teal-700 bg-teal-50 border-teal-200',
            },
            {
              id: 'positions',
              label: 'Chức danh tài xế',
              count: 12,
              unit: 'chức danh',
              icon: Briefcase,
              color: 'text-sky-700 bg-sky-50 border-sky-200',
            },
            {
              id: 'license-classes',
              label: 'Hạng GPLX & Bằng máy',
              count: licenseClasses.length,
              unit: 'hạng',
              icon: Award,
              color: 'text-violet-700 bg-violet-50 border-violet-200',
            },
            {
              id: 'compliance-statuses',
              label: 'Tình trạng GPLX & SK',
              count: complianceStatuses.length,
              unit: 'mốc',
              icon: ShieldAlert,
              color: 'text-amber-700 bg-amber-50 border-amber-200',
            },
            {
              id: 'employment-statuses',
              label: 'Trạng thái việc làm',
              count: employmentStatuses.length,
              unit: 'trạng thái',
              icon: UserCheck,
              color: 'text-blue-700 bg-blue-50 border-blue-200',
            },
            {
              id: 'unit-types',
              label: 'Loại đơn vị quản lý',
              count: unitTypes.length,
              unit: 'loại',
              icon: Layers,
              color: 'text-rose-700 bg-rose-50 border-rose-200',
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setParams({ tab: item.id });
                  setViewMode('table');
                }}
                className={`p-3.5 rounded-xl border bg-white hover:shadow-md transition-all text-left cursor-pointer border-slate-200 hover:border-emerald-500`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-500 truncate">{item.label}</span>
                  <div className={`p-1.5 rounded-lg border ${item.color}`}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="mt-2 text-xl font-black text-slate-900">{item.count}</div>
                <div className="text-[10px] text-slate-400 font-semibold">{item.unit}</div>
              </button>
            );
          })}
        </div>
      )}

      {/* CHẾ ĐỘ 2: QUẢN LÝ BẢNG DỮ LIỆU */}
      {viewMode === 'table' && (
        <div className="space-y-4">
          {/* 2. THANH TABS DANH MỤC NẰM NGANG */}
          <div className="flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-xs">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setParams({ tab: tab.id })}
                  className={`flex shrink-0 items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-bold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#154E2C] text-[#B8D83D] shadow-xs'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* TAB CHỨC DANH TÀI XẾ (ĐÃ CÓ SẴN TIÊU CHÍ TÌM KIẾM & BẢNG CHUẨN) */}
          {activeTab === 'positions' && <PositionsCatalogPage />}

          {/* CÁC TAB CÒN LẠI: HIỂN THỊ KHUNG TIÊU CHÍ TÌM KIẾM VÀ BẢNG CHUẨN HÌNH 1 */}
          {activeTab !== 'positions' && (
            <div className="space-y-4">
              {/* ========================================================================= */}
              {/* KHUNG TIÊU CHÍ TÌM KIẾM (SEARCH CRITERIA PANEL CHUẨN HÌNH 1)               */}
              {/* ========================================================================= */}
              <div className="bg-white p-3.5 rounded border border-slate-200 shadow-xs space-y-3 font-sans text-xs">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-red-600 uppercase tracking-wide">Tiêu chí tìm kiếm</div>
                  <span className="text-[11px] text-slate-400 italic">Chọn tiêu chí và bấm "Tìm kiếm" (hoặc nhấn Enter)</span>
                </div>

                {/* 1 & 2. Tiêu chí - Đơn vị chủ quản & Đội/Tổ */}
                {(activeTab === 'owners' || activeTab === 'teams') && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                    <div>
                      <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Mã đơn vị</label>
                      <input
                        value={unitCodeFilter}
                        onChange={(e) => setUnitCodeFilter(e.target.value)}
                        placeholder="Tất cả mã"
                        className="w-full h-9 rounded border border-slate-200 px-3 text-xs bg-white text-slate-800 focus:border-emerald-600 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Tên đơn vị</label>
                      <input
                        value={unitNameFilter}
                        onChange={(e) => setUnitNameFilter(e.target.value)}
                        placeholder="Tất cả tên đơn vị"
                        className="w-full h-9 rounded border border-slate-200 px-3 text-xs bg-white text-slate-800 focus:border-emerald-600 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Khu liên hợp</label>
                      <select
                        value={complexCode}
                        onChange={(e) => setComplexCode(e.target.value)}
                        className="w-full h-9 rounded border border-slate-200 px-2 text-xs bg-white text-slate-700 focus:border-emerald-600 focus:outline-none"
                      >
                        <option value="ALL">Tất cả Khu liên hợp</option>
                        {catalogComplexes.map((c) => (
                          <option key={c.code} value={c.code}>
                            {c.code} - {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Loại đơn vị</label>
                      <select
                        value={unitTypeFilter}
                        onChange={(e) => setUnitTypeFilter(e.target.value)}
                        className="w-full h-9 rounded border border-slate-200 px-2 text-xs bg-white text-slate-700 focus:border-emerald-600 focus:outline-none"
                      >
                        <option value="ALL">Tất cả loại đơn vị</option>
                        {Object.entries(TYPE_LABELS).map(([k, v]) => (
                          <option key={k} value={k}>{v}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Trạng thái</label>
                      <select
                        value={unitStatusFilter}
                        onChange={(e) => setUnitStatusFilter(e.target.value)}
                        className="w-full h-9 rounded border border-slate-200 px-2 text-xs bg-white text-slate-700 focus:border-emerald-600 focus:outline-none"
                      >
                        <option value="ALL">Tất cả trạng thái</option>
                        <option value="ACTIVE">Hoạt động</option>
                        <option value="INACTIVE">Không hoạt động</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* 3. Tiêu chí - Hạng GPLX & Bằng máy */}
                {activeTab === 'license-classes' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Mã hạng</label>
                      <input
                        value={lcCodeFilter}
                        onChange={(e) => setLcCodeFilter(e.target.value)}
                        placeholder="Tất cả mã hạng"
                        className="w-full h-9 rounded border border-slate-200 px-3 text-xs bg-white text-slate-800 focus:border-emerald-600 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Tên hạng GPLX / Chứng chỉ</label>
                      <input
                        value={lcNameFilter}
                        onChange={(e) => setLcNameFilter(e.target.value)}
                        placeholder="Tất cả tên hạng"
                        className="w-full h-9 rounded border border-slate-200 px-3 text-xs bg-white text-slate-800 focus:border-emerald-600 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Phân nhóm bằng lái</label>
                      <select
                        value={lcCategoryFilter}
                        onChange={(e) => setLcCategoryFilter(e.target.value)}
                        className="w-full h-9 rounded border border-slate-200 px-2 text-xs bg-white text-slate-700 focus:border-emerald-600 focus:outline-none"
                      >
                        <option value="ALL">Tất cả phân nhóm</option>
                        <option value="ROAD_LICENSE">GPLX đường bộ</option>
                        <option value="AGRI_MACHINERY">Cơ giới nông nghiệp</option>
                        <option value="CONSTRUCTION">Máy công trình</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Trạng thái</label>
                      <select
                        value={lcStatusFilter}
                        onChange={(e) => setLcStatusFilter(e.target.value)}
                        className="w-full h-9 rounded border border-slate-200 px-2 text-xs bg-white text-slate-700 focus:border-emerald-600 focus:outline-none"
                      >
                        <option value="ALL">Tất cả trạng thái</option>
                        <option value="ACTIVE">Hoạt động</option>
                        <option value="INACTIVE">Không hoạt động</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* 4. Tiêu chí - Tình trạng tuân thủ GPLX & SK */}
                {activeTab === 'compliance-statuses' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Mã tình trạng</label>
                      <input
                        value={csCodeFilter}
                        onChange={(e) => setCsCodeFilter(e.target.value)}
                        placeholder="Tất cả mã"
                        className="w-full h-9 rounded border border-slate-200 px-3 text-xs bg-white text-slate-800 focus:border-emerald-600 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Tên hiển thị</label>
                      <input
                        value={csNameFilter}
                        onChange={(e) => setCsNameFilter(e.target.value)}
                        placeholder="Tất cả tên hiển thị"
                        className="w-full h-9 rounded border border-slate-200 px-3 text-xs bg-white text-slate-800 focus:border-emerald-600 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Màu sắc cảnh báo</label>
                      <select
                        value={csBadgeFilter}
                        onChange={(e) => setCsBadgeFilter(e.target.value)}
                        className="w-full h-9 rounded border border-slate-200 px-2 text-xs bg-white text-slate-700 focus:border-emerald-600 focus:outline-none"
                      >
                        <option value="ALL">Tất cả màu sắc</option>
                        <option value="green">Xanh lá (Hợp lệ)</option>
                        <option value="amber">Vàng (Cảnh báo gia hạn)</option>
                        <option value="red">Đỏ (Nguy hiểm / Hết hạn)</option>
                        <option value="gray">Xám (Thiếu dữ liệu)</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Trạng thái</label>
                      <select
                        value={csStatusFilter}
                        onChange={(e) => setCsStatusFilter(e.target.value)}
                        className="w-full h-9 rounded border border-slate-200 px-2 text-xs bg-white text-slate-700 focus:border-emerald-600 focus:outline-none"
                      >
                        <option value="ALL">Tất cả trạng thái</option>
                        <option value="ACTIVE">Hoạt động</option>
                        <option value="INACTIVE">Không hoạt động</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* 5. Tiêu chí - Trạng thái việc làm */}
                {activeTab === 'employment-statuses' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Mã trạng thái</label>
                      <input
                        value={esCodeFilter}
                        onChange={(e) => setEsCodeFilter(e.target.value)}
                        placeholder="Tất cả mã"
                        className="w-full h-9 rounded border border-slate-200 px-3 text-xs bg-white text-slate-800 focus:border-emerald-600 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Tên trạng thái việc làm</label>
                      <input
                        value={esNameFilter}
                        onChange={(e) => setEsNameFilter(e.target.value)}
                        placeholder="Tất cả tên trạng thái"
                        className="w-full h-9 rounded border border-slate-200 px-3 text-xs bg-white text-slate-800 focus:border-emerald-600 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Phép phân công / Điều xe</label>
                      <select
                        value={esDispatchFilter}
                        onChange={(e) => setEsDispatchFilter(e.target.value)}
                        className="w-full h-9 rounded border border-slate-200 px-2 text-xs bg-white text-slate-700 focus:border-emerald-600 focus:outline-none"
                      >
                        <option value="ALL">Tất cả quyền gán lệnh</option>
                        <option value="true">Có (Được nhận xe & lệnh)</option>
                        <option value="false">Không (Khóa điều xe)</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Trạng thái</label>
                      <select
                        value={esStatusFilter}
                        onChange={(e) => setEsStatusFilter(e.target.value)}
                        className="w-full h-9 rounded border border-slate-200 px-2 text-xs bg-white text-slate-700 focus:border-emerald-600 focus:outline-none"
                      >
                        <option value="ALL">Tất cả trạng thái</option>
                        <option value="ACTIVE">Hoạt động</option>
                        <option value="INACTIVE">Không hoạt động</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* 6. Tiêu chí - Loại đơn vị quản lý */}
                {activeTab === 'unit-types' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Mã loại</label>
                      <input
                        value={utCodeFilter}
                        onChange={(e) => setUtCodeFilter(e.target.value)}
                        placeholder="Tất cả mã loại"
                        className="w-full h-9 rounded border border-slate-200 px-3 text-xs bg-white text-slate-800 focus:border-emerald-600 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Tên loại đơn vị</label>
                      <input
                        value={utNameFilter}
                        onChange={(e) => setUtNameFilter(e.target.value)}
                        placeholder="Tất cả tên loại"
                        className="w-full h-9 rounded border border-slate-200 px-3 text-xs bg-white text-slate-800 focus:border-emerald-600 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Cấp phân nhóm</label>
                      <select
                        value={utLevelFilter}
                        onChange={(e) => setUtLevelFilter(e.target.value)}
                        className="w-full h-9 rounded border border-slate-200 px-2 text-xs bg-white text-slate-700 focus:border-emerald-600 focus:outline-none"
                      >
                        <option value="ALL">Tất cả cấp phân nhóm</option>
                        <option value="OWNER">Cấp 2 - Đơn vị chủ quản</option>
                        <option value="TEAM">Cấp 3 - Đội/Tổ trực thuộc</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Trạng thái</label>
                      <select
                        value={utStatusFilter}
                        onChange={(e) => setUtStatusFilter(e.target.value)}
                        className="w-full h-9 rounded border border-slate-200 px-2 text-xs bg-white text-slate-700 focus:border-emerald-600 focus:outline-none"
                      >
                        <option value="ALL">Tất cả trạng thái</option>
                        <option value="ACTIVE">Hoạt động</option>
                        <option value="INACTIVE">Không hoạt động</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* HÀNG NÚT THAO TÁC TIÊU CHÍ TÌM KIẾM CHUẨN HÌNH 1 */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={handleResetFilters}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50 transition-colors text-xs cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Nhập lại
                    </button>
                    <button
                      type="button"
                      onClick={() => {}}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded bg-emerald-800 hover:bg-emerald-900 text-white font-semibold shadow-xs transition-colors text-xs cursor-pointer"
                    >
                      <Search className="w-3.5 h-3.5" />
                      Tìm kiếm
                    </button>
                    <button
                      type="button"
                      onClick={handleDownloadTemplate}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50 transition-colors text-xs cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download Template
                    </button>
                    <button
                      type="button"
                      onClick={handleUploadFile}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50 transition-colors text-xs cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      Upload file
                    </button>
                    <button
                      type="button"
                      onClick={handleExportExcel}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50 transition-colors text-xs cursor-pointer"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
                      Xuất excel
                    </button>
                  </div>

                  {canEdit && (
                    <div>
                      {activeTab === 'owners' && (
                        <Button variant="primary" size="sm" icon={<Plus className="h-4 w-4" />} onClick={() => openCreateUnit('OWNER')}>
                          + Thêm đơn vị chủ quản
                        </Button>
                      )}
                      {activeTab === 'teams' && (
                        <Button variant="primary" size="sm" icon={<Plus className="h-4 w-4" />} onClick={() => openCreateUnit('TEAM')}>
                          + Thêm Đội/Tổ
                        </Button>
                      )}
                      {activeTab === 'license-classes' && (
                        <Button
                          variant="primary"
                          size="sm"
                          icon={<Plus className="h-4 w-4" />}
                          onClick={() => {
                            setEditingLicenseClass(null);
                            setLicenseClassForm({
                              code: '',
                              name: '',
                              category: 'ROAD_LICENSE',
                              categoryLabel: 'GPLX đường bộ',
                              allowedVehicles: '',
                              validityYears: 5,
                              status: 'ACTIVE',
                            });
                            setLicenseClassModal(true);
                          }}
                        >
                          + Thêm hạng GPLX / Bằng máy
                        </Button>
                      )}
                      {activeTab === 'compliance-statuses' && (
                        <Button
                          variant="primary"
                          size="sm"
                          icon={<Plus className="h-4 w-4" />}
                          onClick={() => {
                            setEditingCompliance(null);
                            setComplianceForm({
                              code: '',
                              name: '',
                              badgeVariant: 'green',
                              thresholdDays: '',
                              actionRequired: '',
                              status: 'ACTIVE',
                            });
                            setComplianceModal(true);
                          }}
                        >
                          + Thêm tình trạng hồ sơ
                        </Button>
                      )}
                      {activeTab === 'employment-statuses' && (
                        <Button
                          variant="primary"
                          size="sm"
                          icon={<Plus className="h-4 w-4" />}
                          onClick={() => {
                            setEditingEmployment(null);
                            setEmploymentForm({
                              code: '',
                              name: '',
                              canDispatch: true,
                              badgeVariant: 'green',
                              description: '',
                              status: 'ACTIVE',
                            });
                            setEmploymentModal(true);
                          }}
                        >
                          + Thêm trạng thái việc làm
                        </Button>
                      )}
                      {activeTab === 'unit-types' && (
                        <Button
                          variant="primary"
                          size="sm"
                          icon={<Plus className="h-4 w-4" />}
                          onClick={() => {
                            setEditingUnitType(null);
                            setUnitTypeForm({
                              code: '',
                              name: '',
                              level: 'OWNER',
                              levelLabel: 'Cấp 2 - Đơn vị chủ quản',
                              description: '',
                              status: 'ACTIVE',
                            });
                            setUnitTypeModal(true);
                          }}
                        >
                          + Thêm loại đơn vị
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* ========================================================================= */}
              {/* BẢNG DỮ LIỆU CHUẨN HÌNH 1 (HEADER CHỮ ĐỎ + TỔNG SỐ, KHÔNG CÓ CHỮ DƯ THỪA)  */}
              {/* ========================================================================= */}
              <div className="bg-white rounded border border-slate-200 overflow-hidden shadow-xs">
                {/* 1 & 2. BẢNG ĐƠN VỊ CHỦ QUẢN & ĐỘI/TỔ */}
                {(activeTab === 'owners' || activeTab === 'teams') && (
                  <div>
                    <div className="flex items-center justify-between px-4 py-2.5 bg-white border-b border-slate-200">
                      <div className="text-xs font-bold text-red-600 uppercase tracking-wide">
                        {activeTab === 'teams' ? 'DANH SÁCH ĐỘI / TỔ TRỰC THUỘC' : 'DANH SÁCH ĐƠN VỊ CHỦ QUẢN'}
                      </div>
                      <span className="text-xs text-slate-500 font-semibold">
                        Tổng số: {visibleUnits.length} {activeTab === 'teams' ? 'đội/tổ' : 'đơn vị'}
                      </span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[900px] text-left text-xs">
                        <thead className="border-b border-slate-200 bg-slate-50 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                          <tr>
                            <th className="py-2.5 px-3 text-center w-12">STT</th>
                            <th className="py-2.5 px-3">Mã đơn vị</th>
                            <th className="py-2.5 px-3">Tên đơn vị</th>
                            <th className="py-2.5 px-3">Khu liên hợp</th>
                            <th className="py-2.5 px-3">Loại đơn vị</th>
                            {activeTab === 'teams' && <th className="py-2.5 px-3">Đơn vị chủ quản</th>}
                            <th className="py-2.5 px-3">Mô tả</th>
                            <th className="py-2.5 px-3 text-center">Trạng thái</th>
                            <th className="py-2.5 px-3 text-center">User</th>
                            <th className="py-2.5 px-3 text-center">Tác vụ</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {visibleUnits.map((unit, idx) => (
                            <tr key={unit.id} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-2.5 px-3 text-center font-mono text-slate-400">{idx + 1}</td>
                              <td className="py-2.5 px-3 font-mono font-bold text-emerald-800">{unit.code}</td>
                              <td className="py-2.5 px-3 font-semibold text-slate-900">{unit.name}</td>
                              <td className="py-2.5 px-3">
                                <span className="font-mono text-[11px] font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                  {unit.complexCode}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 font-medium text-slate-600">{TYPE_LABELS[unit.unitType]}</td>
                              {activeTab === 'teams' && (
                                <td className="py-2.5 px-3 font-medium text-slate-700">{unit.parent?.name || '—'}</td>
                              )}
                              <td className="py-2.5 px-3 text-slate-500 max-w-[200px] truncate">{unit.description || '—'}</td>
                              <td className="py-2.5 px-3 text-center">
                                {renderStatusBadge(unit.status)}
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <AuditUserPopover
                                  createdDate={(unit as any).createdAt || '14-03-2026'}
                                  createdUser="admin"
                                  updatedDate={(unit as any).updatedAt || '01-08-2026'}
                                  updatedUser="admin"
                                  title={`Xem thông tin tạo/sửa của ${unit.name}`}
                                />
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <TableRowActions
                                  onView={() => setViewingUnit(unit)}
                                  onEdit={canEdit ? () => openEditUnit(unit) : undefined}
                                  onDelete={canEdit ? () => void handleDeleteUnit(unit) : undefined}
                                  viewTitle="Xem chi tiết"
                                  editTitle={activeTab === 'teams' ? 'Sửa Đội/Tổ' : 'Sửa đơn vị'}
                                  deleteTitle={activeTab === 'teams' ? 'Xóa Đội/Tổ' : 'Xóa đơn vị'}
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {!loading && visibleUnits.length === 0 && (
                      <div className="p-10 text-center text-xs text-slate-500">
                        Chưa có dữ liệu đơn vị phù hợp với tiêu chí tìm kiếm.
                      </div>
                    )}
                  </div>
                )}

                {/* 3. BẢNG HẠNG GPLX & BẰNG MÁY */}
                {activeTab === 'license-classes' && (
                  <div>
                    <div className="flex items-center justify-between px-4 py-2.5 bg-white border-b border-slate-200">
                      <div className="text-xs font-bold text-red-600 uppercase tracking-wide">
                        DANH MỤC HẠNG GIẤY PHÉP LÁI XE & BẰNG MÁY
                      </div>
                      <span className="text-xs text-slate-500 font-semibold">
                        Tổng số: {visibleLicenseClasses.length} hạng
                      </span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[900px] text-left text-xs">
                        <thead className="border-b border-slate-200 bg-slate-50 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                          <tr>
                            <th className="py-2.5 px-3 text-center w-12">STT</th>
                            <th className="py-2.5 px-3">Mã hạng</th>
                            <th className="py-2.5 px-3">Tên hạng GPLX / Chứng chỉ</th>
                            <th className="py-2.5 px-3">Phân nhóm</th>
                            <th className="py-2.5 px-3">Phương tiện được phép điều khiển</th>
                            <th className="py-2.5 px-3">Thời hạn định kỳ</th>
                            <th className="py-2.5 px-3 text-center">Trạng thái</th>
                            <th className="py-2.5 px-3 text-center">User</th>
                            <th className="py-2.5 px-3 text-center">Tác vụ</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {visibleLicenseClasses.map((item, idx) => (
                            <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-2.5 px-3 text-center font-mono text-slate-400">{idx + 1}</td>
                              <td className="py-2.5 px-3 font-mono font-bold text-emerald-800">{item.code}</td>
                              <td className="py-2.5 px-3 font-bold text-slate-900">{item.name}</td>
                              <td className="py-2.5 px-3">
                                <span className="font-semibold text-slate-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-[11px]">
                                  {item.categoryLabel}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-slate-600 max-w-[280px]">{item.allowedVehicles}</td>
                              <td className="py-2.5 px-3 font-semibold text-slate-700">
                                {typeof item.validityYears === 'number' ? `${item.validityYears} năm` : item.validityYears}
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                {renderStatusBadge(item.status)}
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <AuditUserPopover
                                  createdDate={item.createdAt || '14-03-2026'}
                                  createdUser={item.createdUser || 'admin'}
                                  updatedDate={item.updatedAt || '15-09-2026'}
                                  updatedUser={item.updatedUser || 'admin'}
                                  title={`Thông tin hạng ${item.name}`}
                                />
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <TableRowActions
                                  onView={() => setViewingLicenseClass(item)}
                                  onEdit={canEdit ? () => {
                                    setEditingLicenseClass(item);
                                    setLicenseClassForm({ ...item });
                                    setLicenseClassModal(true);
                                  } : undefined}
                                  onDelete={canEdit ? () => deleteLicenseClass(item) : undefined}
                                  viewTitle="Xem chi tiết"
                                  editTitle="Sửa hạng GPLX"
                                  deleteTitle="Xóa hạng GPLX"
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* 4. BẢNG TÌNH TRẠNG GPLX & HẠN SK */}
                {activeTab === 'compliance-statuses' && (
                  <div>
                    <div className="flex items-center justify-between px-4 py-2.5 bg-white border-b border-slate-200">
                      <div className="text-xs font-bold text-red-600 uppercase tracking-wide">
                        DANH MỤC TÌNH TRẠNG TUÂN THỦ GPLX & KHÁM SỨC KHỎE
                      </div>
                      <span className="text-xs text-slate-500 font-semibold">
                        Tổng số: {visibleComplianceStatuses.length} tình trạng
                      </span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[900px] text-left text-xs">
                        <thead className="border-b border-slate-200 bg-slate-50 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                          <tr>
                            <th className="py-2.5 px-3 text-center w-12">STT</th>
                            <th className="py-2.5 px-3">Mã trạng thái</th>
                            <th className="py-2.5 px-3">Tên tình trạng hiển thị</th>
                            <th className="py-2.5 px-3">Ngưỡng thời hạn áp dụng</th>
                            <th className="py-2.5 px-3">Hành động quy định</th>
                            <th className="py-2.5 px-3 text-center">Trạng thái</th>
                            <th className="py-2.5 px-3 text-center">User</th>
                            <th className="py-2.5 px-3 text-center">Tác vụ</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {visibleComplianceStatuses.map((item, idx) => (
                            <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-2.5 px-3 text-center font-mono text-slate-400">{idx + 1}</td>
                              <td className="py-2.5 px-3 font-mono font-bold text-emerald-800">{item.code}</td>
                              <td className="py-2.5 px-3">
                                <Badge variant={item.badgeVariant}>{item.name}</Badge>
                              </td>
                              <td className="py-2.5 px-3 font-semibold text-slate-700">{item.thresholdDays || '—'}</td>
                              <td className="py-2.5 px-3 text-slate-600 max-w-[320px]">{item.actionRequired}</td>
                              <td className="py-2.5 px-3 text-center">
                                {renderStatusBadge(item.status)}
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <AuditUserPopover
                                  createdDate={item.createdAt || '14-03-2026'}
                                  createdUser={item.createdUser || 'admin'}
                                  updatedDate={item.updatedAt || '15-09-2026'}
                                  updatedUser={item.updatedUser || 'admin'}
                                  title={`Thông tin tình trạng ${item.name}`}
                                />
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <TableRowActions
                                  onView={() => setViewingCompliance(item)}
                                  onEdit={canEdit ? () => {
                                    setEditingCompliance(item);
                                    setComplianceForm({ ...item });
                                    setComplianceModal(true);
                                  } : undefined}
                                  onDelete={canEdit ? () => deleteCompliance(item) : undefined}
                                  viewTitle="Xem chi tiết"
                                  editTitle="Sửa tình trạng"
                                  deleteTitle="Xóa tình trạng"
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* 5. BẢNG TRẠNG THÁI VIỆC LÀM */}
                {activeTab === 'employment-statuses' && (
                  <div>
                    <div className="flex items-center justify-between px-4 py-2.5 bg-white border-b border-slate-200">
                      <div className="text-xs font-bold text-red-600 uppercase tracking-wide">
                        DANH MỤC TRẠNG THÁI VIỆC LÀM & CÔNG TÁC
                      </div>
                      <span className="text-xs text-slate-500 font-semibold">
                        Tổng số: {visibleEmploymentStatuses.length} trạng thái
                      </span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[900px] text-left text-xs">
                        <thead className="border-b border-slate-200 bg-slate-50 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                          <tr>
                            <th className="py-2.5 px-3 text-center w-12">STT</th>
                            <th className="py-2.5 px-3">Mã trạng thái</th>
                            <th className="py-2.5 px-3">Tên trạng thái việc làm</th>
                            <th className="py-2.5 px-3 text-center">Phép phân công / Điều xe</th>
                            <th className="py-2.5 px-3">Mô tả nghiệp vụ</th>
                            <th className="py-2.5 px-3 text-center">Trạng thái</th>
                            <th className="py-2.5 px-3 text-center">User</th>
                            <th className="py-2.5 px-3 text-center">Tác vụ</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {visibleEmploymentStatuses.map((item, idx) => (
                            <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-2.5 px-3 text-center font-mono text-slate-400">{idx + 1}</td>
                              <td className="py-2.5 px-3 font-mono font-bold text-slate-800">{item.code}</td>
                              <td className="py-2.5 px-3">
                                <Badge variant={item.badgeVariant}>{item.name}</Badge>
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                {item.canDispatch ? (
                                  <span className="inline-flex rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 font-bold text-emerald-800 text-[11px]">
                                    ✓ Cho phép gán xe
                                  </span>
                                ) : (
                                  <span className="inline-flex rounded-md border border-slate-200 bg-slate-100 px-2 py-0.5 font-bold text-slate-600 text-[11px]">
                                    ✕ Khóa điều xe
                                  </span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-slate-600 max-w-[320px]">{item.description}</td>
                              <td className="py-2.5 px-3 text-center">
                                {renderStatusBadge(item.status)}
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <AuditUserPopover
                                  createdDate={item.createdAt || '14-03-2026'}
                                  createdUser={item.createdUser || 'admin'}
                                  updatedDate={item.updatedAt || '15-09-2026'}
                                  updatedUser={item.updatedUser || 'admin'}
                                  title={`Thông tin trạng thái ${item.name}`}
                                />
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <TableRowActions
                                  onView={() => setViewingEmployment(item)}
                                  onEdit={canEdit ? () => {
                                    setEditingEmployment(item);
                                    setEmploymentForm({ ...item });
                                    setEmploymentModal(true);
                                  } : undefined}
                                  onDelete={canEdit ? () => deleteEmployment(item) : undefined}
                                  viewTitle="Xem chi tiết"
                                  editTitle="Sửa trạng thái"
                                  deleteTitle="Xóa trạng thái"
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* 6. BẢNG CẤP LOẠI ĐƠN VỊ QUẢN LÝ */}
                {activeTab === 'unit-types' && (
                  <div>
                    <div className="flex items-center justify-between px-4 py-2.5 bg-white border-b border-slate-200">
                      <div className="text-xs font-bold text-red-600 uppercase tracking-wide">
                        DANH MỤC CẤP LOẠI ĐƠN VỊ QUẢN LÝ HỒ SƠ
                      </div>
                      <span className="text-xs text-slate-500 font-semibold">
                        Tổng số: {visibleUnitTypes.length} loại đơn vị
                      </span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[900px] text-left text-xs">
                        <thead className="border-b border-slate-200 bg-slate-50 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                          <tr>
                            <th className="py-2.5 px-3 text-center w-12">STT</th>
                            <th className="py-2.5 px-3">Mã loại</th>
                            <th className="py-2.5 px-3">Tên loại đơn vị</th>
                            <th className="py-2.5 px-3">Cấp phân nhóm</th>
                            <th className="py-2.5 px-3">Mô tả & Phạm vi chức năng</th>
                            <th className="py-2.5 px-3 text-center">Trạng thái</th>
                            <th className="py-2.5 px-3 text-center">User</th>
                            <th className="py-2.5 px-3 text-center">Tác vụ</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {visibleUnitTypes.map((item, idx) => (
                            <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-2.5 px-3 text-center font-mono text-slate-400">{idx + 1}</td>
                              <td className="py-2.5 px-3 font-mono font-bold text-slate-800">{item.code}</td>
                              <td className="py-2.5 px-3 font-bold text-slate-900">{item.name}</td>
                              <td className="py-2.5 px-3">
                                <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${
                                  item.level === 'OWNER'
                                    ? 'bg-blue-50 text-blue-800 border-blue-200'
                                    : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                }`}>
                                  {item.levelLabel}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-slate-600 max-w-[320px]">{item.description}</td>
                              <td className="py-2.5 px-3 text-center">
                                {renderStatusBadge(item.status)}
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <AuditUserPopover
                                  createdDate={item.createdAt || '14-03-2026'}
                                  createdUser={item.createdUser || 'admin'}
                                  updatedDate={item.updatedAt || '15-09-2026'}
                                  updatedUser={item.updatedUser || 'admin'}
                                  title={`Thông tin loại ${item.name}`}
                                />
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <TableRowActions
                                  onView={() => setViewingUnitType(item)}
                                  onEdit={canEdit ? () => {
                                    setEditingUnitType(item);
                                    setUnitTypeForm({ ...item });
                                    setUnitTypeModal(true);
                                  } : undefined}
                                  onDelete={canEdit ? () => deleteUnitType(item) : undefined}
                                  viewTitle="Xem chi tiết"
                                  editTitle="Sửa loại đơn vị"
                                  deleteTitle="Xóa loại đơn vị"
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: UNIT CREATE / EDIT (KHI BẤM CHỈNH SỬA / THÊM MỚI HIỆN 2 NÚT HOẠT ĐỘNG / KHÔNG HOẠT ĐỘNG) */}
      <Modal
        isOpen={unitModal}
        onClose={() => setUnitModal(false)}
        title={editingUnit ? 'Chỉnh sửa đơn vị' : 'Thêm đơn vị mới'}
        subtitle="Quản lý thông tin đơn vị chủ quản hoặc Đội/Tổ trực thuộc"
        hideFooter
      >
        <form onSubmit={saveUnit} className="space-y-3.5 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block mb-1 font-bold text-slate-700">Khu liên hợp</label>
              <select
                disabled={Boolean(editingUnit)}
                value={unitForm.complexCode}
                onChange={(e) => setUnitForm({ ...unitForm, complexCode: e.target.value })}
                className="w-full h-9 rounded-lg border border-slate-300 px-2 bg-white"
              >
                {catalogComplexes.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code} - {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block mb-1 font-bold text-slate-700">Loại đơn vị</label>
              <select
                value={unitForm.unitType}
                onChange={(e) => setUnitForm({ ...unitForm, unitType: e.target.value as DriverManagementUnitType })}
                className="w-full h-9 rounded-lg border border-slate-300 px-2 bg-white"
              >
                {Object.entries(TYPE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block mb-1 font-bold text-slate-700">Mã đơn vị</label>
              <input
                required
                disabled={Boolean(editingUnit)}
                value={unitForm.code}
                onChange={(e) => setUnitForm({ ...unitForm, code: e.target.value.toUpperCase() })}
                placeholder="VD: CGTC_DP"
                className="w-full h-9 rounded-lg border border-slate-300 px-3 uppercase font-mono font-bold"
              />
            </div>
            <div>
              <label className="block mb-1 font-bold text-slate-700">Tên đơn vị</label>
              <input
                required
                value={unitForm.name}
                onChange={(e) => setUnitForm({ ...unitForm, name: e.target.value })}
                placeholder="VD: Cơ Giới Thi Công DP"
                className="w-full h-9 rounded-lg border border-slate-300 px-3 font-semibold"
              />
            </div>
          </div>

          {unitForm.level === 'TEAM' && (
            <div>
              <label className="block mb-1 font-bold text-slate-700">Đơn vị chủ quản trực tiếp</label>
              <select
                required
                value={unitForm.parentId}
                onChange={(e) => setUnitForm({ ...unitForm, parentId: e.target.value })}
                className="w-full h-9 rounded-lg border border-slate-300 px-2 bg-white"
              >
                <option value="">Chọn đơn vị chủ quản...</option>
                {owners
                  .filter((u) => u.complexCode === unitForm.complexCode)
                  .map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.code})
                    </option>
                  ))}
              </select>
            </div>
          )}

          <div>
            <label className="block mb-1 font-bold text-slate-700">Mô tả / Ghi chú</label>
            <textarea
              rows={2}
              value={unitForm.description}
              onChange={(e) => setUnitForm({ ...unitForm, description: e.target.value })}
              className="w-full rounded-lg border border-slate-300 p-2"
              placeholder="Nhập ghi chú thêm nếu có..."
            />
          </div>

          {/* 2 NÚT TRẠNG THÁI HOẠT ĐỘNG / KHÔNG HOẠT ĐỘNG CHỈ HIỆN KHI CHỈNH SỬA / THÊM MỚI */}
          <div className="pt-2 border-t border-slate-100">
            <StatusToggle
              value={unitForm.status}
              onChange={(val) => setUnitForm({ ...unitForm, status: val as any })}
              activeValue="ACTIVE"
              inactiveValue="INACTIVE"
              activeLabel="Hoạt động"
              inactiveLabel="Không hoạt động"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
            <Button variant="outline" size="sm" onClick={() => setUnitModal(false)}>
              Hủy
            </Button>
            <Button variant="primary" size="sm" type="submit">
              Lưu đơn vị
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: VIEW UNIT */}
      {viewingUnit && (
        <Modal
          isOpen={Boolean(viewingUnit)}
          onClose={() => setViewingUnit(null)}
          title={`Chi tiết ${viewingUnit.level === 'TEAM' ? 'Đội/Tổ' : 'đơn vị'}: ${viewingUnit.name}`}
          subtitle={`Mã định danh: ${viewingUnit.code}`}
          hideFooter
        >
          <div className="space-y-3 text-xs">
            <div className="rounded-xl bg-slate-50 p-4 border border-slate-200 space-y-2">
              <div className="flex justify-between border-b border-slate-200 pb-2">
                <span className="text-slate-500 font-bold">Khu liên hợp:</span>
                <span className="font-bold text-emerald-800">{viewingUnit.complexCode}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-2">
                <span className="text-slate-500 font-bold">Loại đơn vị:</span>
                <span className="font-semibold text-slate-800">{TYPE_LABELS[viewingUnit.unitType]}</span>
              </div>
              {viewingUnit.level === 'TEAM' && (
                <div className="flex justify-between border-b border-slate-200 pb-2">
                  <span className="text-slate-500 font-bold">Đơn vị chủ quản:</span>
                  <span className="font-semibold text-slate-800">{viewingUnit.parent?.name || '—'}</span>
                </div>
              )}
              <div className="flex justify-between border-b border-slate-200 pb-2">
                <span className="text-slate-500 font-bold">Trạng thái:</span>
                {renderStatusBadge(viewingUnit.status)}
              </div>
              <div className="pt-1">
                <span className="text-slate-500 font-bold block mb-1">Mô tả:</span>
                <p className="text-slate-700 bg-white p-2 rounded border border-slate-200">
                  {viewingUnit.description || 'Không có mô tả.'}
                </p>
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <Button variant="primary" size="sm" onClick={() => setViewingUnit(null)}>
                Đóng
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL 3: LICENSE CLASS CREATE / EDIT */}
      <Modal
        isOpen={licenseClassModal}
        onClose={() => setLicenseClassModal(false)}
        title={editingLicenseClass ? 'Sửa hạng GPLX / Chứng chỉ' : 'Thêm hạng GPLX / Chứng chỉ mới'}
        subtitle="Cấu hình danh mục hạng giấy phép lái xe và bằng lái máy cơ giới"
        hideFooter
      >
        <form onSubmit={saveLicenseClass} className="space-y-3.5 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block mb-1 font-bold text-slate-700">Mã hạng</label>
              <input
                required
                value={licenseClassForm.code}
                onChange={(e) => setLicenseClassForm({ ...licenseClassForm, code: e.target.value.toUpperCase() })}
                placeholder="VD: HANG_C"
                className="w-full h-9 rounded-lg border border-slate-300 px-3 uppercase font-mono font-bold"
              />
            </div>
            <div>
              <label className="block mb-1 font-bold text-slate-700">Phân nhóm bằng lái</label>
              <select
                value={licenseClassForm.category}
                onChange={(e) =>
                  setLicenseClassForm({ ...licenseClassForm, category: e.target.value as any })
                }
                className="w-full h-9 rounded-lg border border-slate-300 px-2 bg-white"
              >
                <option value="ROAD_LICENSE">GPLX đường bộ</option>
                <option value="AGRI_MACHINERY">Cơ giới nông nghiệp</option>
                <option value="CONSTRUCTION">Máy công trình</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block mb-1 font-bold text-slate-700">Tên hạng bằng lái</label>
            <input
              required
              value={licenseClassForm.name}
              onChange={(e) => setLicenseClassForm({ ...licenseClassForm, name: e.target.value })}
              placeholder="VD: Hạng C (Ô tô tải ≥ 3.5T)"
              className="w-full h-9 rounded-lg border border-slate-300 px-3 font-semibold"
            />
          </div>

          <div>
            <label className="block mb-1 font-bold text-slate-700">Phương tiện được phép điều khiển</label>
            <textarea
              rows={2}
              value={licenseClassForm.allowedVehicles}
              onChange={(e) => setLicenseClassForm({ ...licenseClassForm, allowedVehicles: e.target.value })}
              className="w-full rounded-lg border border-slate-300 p-2"
              placeholder="Mô tả các loại xe hoặc máy cơ giới được phép vận hành..."
            />
          </div>

          <div>
            <label className="block mb-1 font-bold text-slate-700">Thời hạn định kỳ</label>
            <input
              value={licenseClassForm.validityYears}
              onChange={(e) => setLicenseClassForm({ ...licenseClassForm, validityYears: e.target.value })}
              placeholder="VD: 5 năm hoặc Vô thời hạn"
              className="w-full h-9 rounded-lg border border-slate-300 px-3 font-semibold"
            />
          </div>

          {/* 2 NÚT TRẠNG THÁI HIỆN KHI BẤM CHỈNH SỬA / THÊM MỚI */}
          <div className="pt-2 border-t border-slate-100">
            <StatusToggle
              value={licenseClassForm.status || 'ACTIVE'}
              onChange={(val) => setLicenseClassForm({ ...licenseClassForm, status: val as any })}
              activeValue="ACTIVE"
              inactiveValue="INACTIVE"
              activeLabel="Hoạt động"
              inactiveLabel="Không hoạt động"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
            <Button variant="outline" size="sm" onClick={() => setLicenseClassModal(false)}>
              Hủy
            </Button>
            <Button variant="primary" size="sm" type="submit">
              Lưu hạng GPLX
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 4: VIEW LICENSE CLASS */}
      {viewingLicenseClass && (
        <Modal
          isOpen={Boolean(viewingLicenseClass)}
          onClose={() => setViewingLicenseClass(null)}
          title={`Hạng GPLX / Bằng máy: ${viewingLicenseClass.name}`}
          subtitle={`Mã: ${viewingLicenseClass.code}`}
          hideFooter
        >
          <div className="space-y-3 text-xs">
            <div className="rounded-xl bg-slate-50 p-4 border border-slate-200 space-y-2">
              <div className="flex justify-between border-b border-slate-200 pb-2">
                <span className="text-slate-500 font-bold">Phân nhóm:</span>
                <span className="font-bold text-slate-800">{viewingLicenseClass.categoryLabel}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-2">
                <span className="text-slate-500 font-bold">Thời hạn định kỳ:</span>
                <span className="font-semibold text-slate-800">
                  {typeof viewingLicenseClass.validityYears === 'number'
                    ? `${viewingLicenseClass.validityYears} năm`
                    : viewingLicenseClass.validityYears}
                </span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-2">
                <span className="text-slate-500 font-bold">Trạng thái:</span>
                {renderStatusBadge(viewingLicenseClass.status)}
              </div>
              <div className="pt-1">
                <span className="text-slate-500 font-bold block mb-1">Phương tiện được phép điều khiển:</span>
                <p className="text-slate-700 bg-white p-2 rounded border border-slate-200">
                  {viewingLicenseClass.allowedVehicles}
                </p>
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <Button variant="primary" size="sm" onClick={() => setViewingLicenseClass(null)}>
                Đóng
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL 5: COMPLIANCE STATUS CREATE / EDIT */}
      <Modal
        isOpen={complianceModal}
        onClose={() => setComplianceModal(false)}
        title={editingCompliance ? 'Sửa tình trạng GPLX & Hạn SK' : 'Thêm tình trạng hồ sơ mới'}
        subtitle="Cấu hình quy chuẩn cảnh báo và xử lý hồ sơ"
        hideFooter
      >
        <form onSubmit={saveCompliance} className="space-y-3.5 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block mb-1 font-bold text-slate-700">Mã trạng thái</label>
              <input
                required
                value={complianceForm.code}
                onChange={(e) => setComplianceForm({ ...complianceForm, code: e.target.value.toUpperCase() })}
                placeholder="VD: EXPIRING_30"
                className="w-full h-9 rounded-lg border border-slate-300 px-3 uppercase font-mono font-bold"
              />
            </div>
            <div>
              <label className="block mb-1 font-bold text-slate-700">Màu sắc cảnh báo</label>
              <select
                value={complianceForm.badgeVariant}
                onChange={(e) => setComplianceForm({ ...complianceForm, badgeVariant: e.target.value as any })}
                className="w-full h-9 rounded-lg border border-slate-300 px-2 bg-white"
              >
                <option value="green">Xanh lá (Hợp lệ)</option>
                <option value="amber">Vàng (Cảnh báo gia hạn)</option>
                <option value="red">Đỏ (Nguy hiểm / Hết hạn)</option>
                <option value="gray">Xám (Thiếu dữ liệu)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block mb-1 font-bold text-slate-700">Tên hiển thị</label>
            <input
              required
              value={complianceForm.name}
              onChange={(e) => setComplianceForm({ ...complianceForm, name: e.target.value })}
              placeholder="VD: Sắp hết hạn ≤ 30 ngày"
              className="w-full h-9 rounded-lg border border-slate-300 px-3 font-semibold"
            />
          </div>

          <div>
            <label className="block mb-1 font-bold text-slate-700">Ngưỡng thời hạn (ngày)</label>
            <input
              value={complianceForm.thresholdDays}
              onChange={(e) => setComplianceForm({ ...complianceForm, thresholdDays: e.target.value })}
              placeholder="VD: ≤ 30 ngày hoặc > 60 ngày"
              className="w-full h-9 rounded-lg border border-slate-300 px-3 font-semibold"
            />
          </div>

          <div>
            <label className="block mb-1 font-bold text-slate-700">Hành động quy định</label>
            <textarea
              rows={2}
              value={complianceForm.actionRequired}
              onChange={(e) => setComplianceForm({ ...complianceForm, actionRequired: e.target.value })}
              className="w-full rounded-lg border border-slate-300 p-2"
              placeholder="Mô tả hành động cần thực hiện đối với tài xế..."
            />
          </div>

          {/* 2 NÚT TRẠNG THÁI HIỆN KHI BẤM CHỈNH SỬA / THÊM MỚI */}
          <div className="pt-2 border-t border-slate-100">
            <StatusToggle
              value={complianceForm.status || 'ACTIVE'}
              onChange={(val) => setComplianceForm({ ...complianceForm, status: val as any })}
              activeValue="ACTIVE"
              inactiveValue="INACTIVE"
              activeLabel="Hoạt động"
              inactiveLabel="Không hoạt động"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
            <Button variant="outline" size="sm" onClick={() => setComplianceModal(false)}>
              Hủy
            </Button>
            <Button variant="primary" size="sm" type="submit">
              Lưu tình trạng
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 6: VIEW COMPLIANCE */}
      {viewingCompliance && (
        <Modal
          isOpen={Boolean(viewingCompliance)}
          onClose={() => setViewingCompliance(null)}
          title={`Tình trạng hồ sơ: ${viewingCompliance.name}`}
          subtitle={`Mã định danh: ${viewingCompliance.code}`}
          hideFooter
        >
          <div className="space-y-3 text-xs">
            <div className="rounded-xl bg-slate-50 p-4 border border-slate-200 space-y-2">
              <div className="flex justify-between border-b border-slate-200 pb-2">
                <span className="text-slate-500 font-bold">Mức độ hiển thị:</span>
                <Badge variant={viewingCompliance.badgeVariant}>{viewingCompliance.name}</Badge>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-2">
                <span className="text-slate-500 font-bold">Ngưỡng thời hạn:</span>
                <span className="font-semibold text-slate-800">{viewingCompliance.thresholdDays || '—'}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-2">
                <span className="text-slate-500 font-bold">Trạng thái:</span>
                {renderStatusBadge(viewingCompliance.status)}
              </div>
              <div className="pt-1">
                <span className="text-slate-500 font-bold block mb-1">Hành động quy định:</span>
                <p className="text-slate-700 bg-white p-2 rounded border border-slate-200">
                  {viewingCompliance.actionRequired}
                </p>
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <Button variant="primary" size="sm" onClick={() => setViewingCompliance(null)}>
                Đóng
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL 7: EMPLOYMENT STATUS CREATE / EDIT */}
      <Modal
        isOpen={employmentModal}
        onClose={() => setEmploymentModal(false)}
        title={editingEmployment ? 'Sửa trạng thái việc làm' : 'Thêm trạng thái việc làm mới'}
        subtitle="Cấu hình trạng thái công tác và quyền gán lệnh điều xe"
        hideFooter
      >
        <form onSubmit={saveEmployment} className="space-y-3.5 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block mb-1 font-bold text-slate-700">Mã trạng thái</label>
              <input
                required
                value={employmentForm.code}
                onChange={(e) => setEmploymentForm({ ...employmentForm, code: e.target.value.toUpperCase() })}
                placeholder="VD: DANG_LAM_VIEC"
                className="w-full h-9 rounded-lg border border-slate-300 px-3 uppercase font-mono font-bold"
              />
            </div>
            <div>
              <label className="block mb-1 font-bold text-slate-700">Cho phép điều xe</label>
              <select
                value={employmentForm.canDispatch ? 'true' : 'false'}
                onChange={(e) => setEmploymentForm({ ...employmentForm, canDispatch: e.target.value === 'true' })}
                className="w-full h-9 rounded-lg border border-slate-300 px-2 bg-white"
              >
                <option value="true">Có (Được nhận xe & lệnh)</option>
                <option value="false">Không (Khóa điều xe)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block mb-1 font-bold text-slate-700">Tên trạng thái việc làm</label>
            <input
              required
              value={employmentForm.name}
              onChange={(e) => setEmploymentForm({ ...employmentForm, name: e.target.value })}
              placeholder="VD: Đang làm việc, Thử việc..."
              className="w-full h-9 rounded-lg border border-slate-300 px-3 font-semibold"
            />
          </div>

          <div>
            <label className="block mb-1 font-bold text-slate-700">Mô tả nghiệp vụ</label>
            <textarea
              rows={2}
              value={employmentForm.description}
              onChange={(e) => setEmploymentForm({ ...employmentForm, description: e.target.value })}
              className="w-full rounded-lg border border-slate-300 p-2"
              placeholder="Ghi chú về chế độ công tác của tài xế..."
            />
          </div>

          {/* 2 NÚT TRẠNG THÁI HIỆN KHI BẤM CHỈNH SỬA / THÊM MỚI */}
          <div className="pt-2 border-t border-slate-100">
            <StatusToggle
              value={employmentForm.status || 'ACTIVE'}
              onChange={(val) => setEmploymentForm({ ...employmentForm, status: val as any })}
              activeValue="ACTIVE"
              inactiveValue="INACTIVE"
              activeLabel="Hoạt động"
              inactiveLabel="Không hoạt động"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
            <Button variant="outline" size="sm" onClick={() => setEmploymentModal(false)}>
              Hủy
            </Button>
            <Button variant="primary" size="sm" type="submit">
              Lưu trạng thái
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 8: VIEW EMPLOYMENT STATUS */}
      {viewingEmployment && (
        <Modal
          isOpen={Boolean(viewingEmployment)}
          onClose={() => setViewingEmployment(null)}
          title={`Trạng thái: ${viewingEmployment.name}`}
          subtitle={`Mã: ${viewingEmployment.code}`}
          hideFooter
        >
          <div className="space-y-3 text-xs">
            <div className="rounded-xl bg-slate-50 p-4 border border-slate-200 space-y-2">
              <div className="flex justify-between border-b border-slate-200 pb-2">
                <span className="text-slate-500 font-bold">Quyền phân công xe:</span>
                <span className="font-bold text-slate-800">
                  {viewingEmployment.canDispatch ? '✓ Được phân công điều xe' : '✕ Tạm khóa điều xe'}
                </span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-2">
                <span className="text-slate-500 font-bold">Trạng thái:</span>
                {renderStatusBadge(viewingEmployment.status)}
              </div>
              <div className="pt-1">
                <span className="text-slate-500 font-bold block mb-1">Mô tả nghiệp vụ:</span>
                <p className="text-slate-700 bg-white p-2 rounded border border-slate-200">
                  {viewingEmployment.description}
                </p>
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <Button variant="primary" size="sm" onClick={() => setViewingEmployment(null)}>
                Đóng
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL 9: UNIT TYPE CREATE / EDIT */}
      <Modal
        isOpen={unitTypeModal}
        onClose={() => setUnitTypeModal(false)}
        title={editingUnitType ? 'Sửa loại đơn vị' : 'Thêm loại đơn vị mới'}
        subtitle="Cấu hình cấp phân nhóm đơn vị chủ quản và cấp trực thuộc"
        hideFooter
      >
        <form onSubmit={saveUnitType} className="space-y-3.5 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block mb-1 font-bold text-slate-700">Mã loại</label>
              <input
                required
                value={unitTypeForm.code}
                onChange={(e) => setUnitTypeForm({ ...unitTypeForm, code: e.target.value.toUpperCase() })}
                placeholder="VD: XI_NGHIEP"
                className="w-full h-9 rounded-lg border border-slate-300 px-3 uppercase font-mono font-bold"
              />
            </div>
            <div>
              <label className="block mb-1 font-bold text-slate-700">Cấp phân nhóm</label>
              <select
                value={unitTypeForm.level}
                onChange={(e) => setUnitTypeForm({ ...unitTypeForm, level: e.target.value as any })}
                className="w-full h-9 rounded-lg border border-slate-300 px-2 bg-white"
              >
                <option value="OWNER">Cấp 2 - Đơn vị chủ quản</option>
                <option value="TEAM">Cấp 3 - Đội/Tổ trực thuộc</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block mb-1 font-bold text-slate-700">Tên loại đơn vị</label>
            <input
              required
              value={unitTypeForm.name}
              onChange={(e) => setUnitTypeForm({ ...unitTypeForm, name: e.target.value })}
              placeholder="VD: Xí nghiệp chuyên ngành"
              className="w-full h-9 rounded-lg border border-slate-300 px-3 font-semibold"
            />
          </div>

          <div>
            <label className="block mb-1 font-bold text-slate-700">Mô tả & Phạm vi chức năng</label>
            <textarea
              rows={2}
              value={unitTypeForm.description}
              onChange={(e) => setUnitTypeForm({ ...unitTypeForm, description: e.target.value })}
              className="w-full rounded-lg border border-slate-300 p-2"
              placeholder="Mô tả loại hình đơn vị..."
            />
          </div>

          {/* 2 NÚT TRẠNG THÁI HIỆN KHI BẤM CHỈNH SỬA / THÊM MỚI */}
          <div className="pt-2 border-t border-slate-100">
            <StatusToggle
              value={unitTypeForm.status || 'ACTIVE'}
              onChange={(val) => setUnitTypeForm({ ...unitTypeForm, status: val as any })}
              activeValue="ACTIVE"
              inactiveValue="INACTIVE"
              activeLabel="Hoạt động"
              inactiveLabel="Không hoạt động"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
            <Button variant="outline" size="sm" onClick={() => setUnitTypeModal(false)}>
              Hủy
            </Button>
            <Button variant="primary" size="sm" type="submit">
              Lưu loại đơn vị
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 10: VIEW UNIT TYPE */}
      {viewingUnitType && (
        <Modal
          isOpen={Boolean(viewingUnitType)}
          onClose={() => setViewingUnitType(null)}
          title={`Loại đơn vị: ${viewingUnitType.name}`}
          subtitle={`Mã: ${viewingUnitType.code}`}
          hideFooter
        >
          <div className="space-y-3 text-xs">
            <div className="rounded-xl bg-slate-50 p-4 border border-slate-200 space-y-2">
              <div className="flex justify-between border-b border-slate-200 pb-2">
                <span className="text-slate-500 font-bold">Cấp phân nhóm:</span>
                <span className="font-bold text-slate-800">{viewingUnitType.levelLabel}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-2">
                <span className="text-slate-500 font-bold">Trạng thái:</span>
                {renderStatusBadge(viewingUnitType.status)}
              </div>
              <div className="pt-1">
                <span className="text-slate-500 font-bold block mb-1">Mô tả phạm vi:</span>
                <p className="text-slate-700 bg-white p-2 rounded border border-slate-200">
                  {viewingUnitType.description}
                </p>
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <Button variant="primary" size="sm" onClick={() => setViewingUnitType(null)}>
                Đóng
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
