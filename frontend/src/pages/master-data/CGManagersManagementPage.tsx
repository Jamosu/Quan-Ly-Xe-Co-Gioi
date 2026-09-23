import React, { useEffect, useMemo, useState } from 'react';
import {
  Building2,
  Download,
  MapPin,
  Plus,
  RefreshCw,
  Search,
  Users,
  BarChart3,
  Layers,
  Truck,
  Wrench,
  CheckCircle2,
  ArrowRight,
  TrendingUp,
  FileSpreadsheet,
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { apiService } from '../../api/client';
import {
  DriverManagementUnit,
  DriverManagementUnitType,
  ManagementUnitManagerAssignment,
  driverManagementApi,
} from '../../api/driverManagementApi';
import { OperationalLocation, schedulingApi } from '../../api/scheduling';
import { catalogsApi } from '../../api/catalogsApi';
import { CatalogItem } from '../../data/catalogData';
import { AuditUserPopover } from '../../components/common/AuditUserPopover';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { TableRowActions } from '../../components/common/TableRowActions';
import { Column, DataTable } from '../../components/data-display/DataTable';
import { SearchableSelect } from '../../components/common/SearchableSelect';

type TabType = 'units' | 'managers' | 'regions' | 'areas';
type UserOption = { id: number; code: string; fullName: string; phone?: string; position?: string };
type ViewItem = { title: string; values: Array<[string, React.ReactNode]> };

const TEAM_TYPE_LABELS: Record<DriverManagementUnitType, string> = {
  BAN: 'Ban', PHONG: 'Phòng', TRUNG_TAM: 'Trung tâm', XI_NGHIEP: 'Xí nghiệp',
  NONG_TRUONG: 'Nông trường', DOI: 'Đội cơ giới', TO: 'Tổ cơ giới', KHAC: 'Khác',
};

const OWNER_UNIT_TYPES: Record<string, string> = {
  XI_NGHIEP: 'Xí nghiệp',
  BAN: 'Ban',
  PHONG: 'Phòng',
  TRUNG_TAM: 'Trung tâm',
  NONG_TRUONG: 'Nông trường',
  KHAC: 'Khác (Khối trực thuộc...)',
};

const TEAM_UNIT_TYPES: Record<string, string> = {
  DOI: 'Đội cơ giới',
  TO: 'Tổ cơ giới',
  KHAC: 'Khác (Bộ phận...)',
};

const inputClassName = 'w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-800 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-100 disabled:text-slate-500';
const textareaClassName = 'w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-800 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-100 disabled:text-slate-500';

const emptyUnitForm = {
  complexCode: 'KOUN_MOM', parentId: '', code: '', name: '', unitType: 'DOI' as DriverManagementUnitType,
  mainDepotId: '', mainDepotName: '', description: '', status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE',
};
const emptyManagerForm = {
  complexCode: 'KOUN_MOM', unitId: '', managerName: '', managerPhone: '', managerUserId: '',
  roleTitle: 'Đội trưởng cơ giới', mainDepotId: '', mainDepotName: '', notes: '',
};
const emptyRegionForm = {
  complexCode: 'KOUN_MOM', code: '', name: '', unitType: 'XI_NGHIEP' as DriverManagementUnitType,
  mainDepotId: '', mainDepotName: '', description: '', status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE',
};
const emptyLocationForm = {
  code: '', name: '', complexCode: 'KOUN_MOM', enterpriseCode: '', regionName: '', address: '',
  lat: '', lng: '', geofenceRadiusM: '300', active: true,
};

const errorMessage = (error: unknown, fallback: string) => {
  const message = (error as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
  return Array.isArray(message) ? message.join(', ') : message || fallback;
};

const statusBadge = (active: boolean) => (
  <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${active
    ? 'border-emerald-200 bg-emerald-100 text-emerald-800'
    : 'border-slate-200 bg-slate-100 text-slate-600'}`}>
    {active ? 'Còn hoạt động' : 'Ngưng hoạt động'}
  </span>
);

const exportCsv = (name: string, header: string[], rows: Array<Array<string | number>>) => {
  const escape = (value: string | number) => `"${String(value ?? '').replace(/"/g, '""')}"`;
  const blob = new Blob([`\uFEFF${[header, ...rows].map((row) => row.map(escape).join(',')).join('\n')}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${name}-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
};

export const CGManagersManagementPage: React.FC = () => {
  const [params, setParams] = useSearchParams();
  const requestedTab = params.get('tab');
  const activeTab: TabType = requestedTab && ['units', 'managers', 'regions', 'areas'].includes(requestedTab)
    ? (requestedTab as TabType)
    : 'units';

  const [tableViewMode, setTableViewMode] = useState<'full' | 'compact'>('full');
  const [complexes, setComplexes] = useState<CatalogItem[]>([]);
  const [regions, setRegions] = useState<CatalogItem[]>([]);
  const [owners, setOwners] = useState<DriverManagementUnit[]>([]);
  const [teams, setTeams] = useState<DriverManagementUnit[]>([]);
  const [locations, setLocations] = useState<OperationalLocation[]>([]);
  const [assignments, setAssignments] = useState<ManagementUnitManagerAssignment[]>([]);
  const [managerUsers, setManagerUsers] = useState<UserOption[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [complexFilter, setComplexFilter] = useState('ALL');
  const [ownerFilter, setOwnerFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ACTIVE');
  const [regionFilter, setRegionFilter] = useState('ALL');
  const [unitTypeFilter, setUnitTypeFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  // Tab 1: Units Modal State
  const [unitModal, setUnitModal] = useState(false);
  const [editingUnit, setEditingUnit] = useState<DriverManagementUnit | null>(null);
  const [unitForm, setUnitForm] = useState(emptyUnitForm);
  const [unitSaving, setUnitSaving] = useState(false);

  // Tab 2: Managers Modal State
  const [managerModal, setManagerModal] = useState(false);
  const [editingManagerUnit, setEditingManagerUnit] = useState<DriverManagementUnit | null>(null);
  const [managerForm, setManagerForm] = useState(emptyManagerForm);
  const [managerSaving, setManagerSaving] = useState(false);
  const [customManagerInput, setCustomManagerInput] = useState(false);

  // Tab 3: Regions Modal State
  const [regionModal, setRegionModal] = useState(false);
  const [editingRegion, setEditingRegion] = useState<DriverManagementUnit | null>(null);
  const [regionForm, setRegionForm] = useState(emptyRegionForm);
  const [regionSaving, setRegionSaving] = useState(false);

  // Tab 4: Locations Modal State
  const [locationModal, setLocationModal] = useState(false);
  const [editingLocation, setEditingLocation] = useState<OperationalLocation | null>(null);
  const [locationForm, setLocationForm] = useState(emptyLocationForm);
  const [locationSaving, setLocationSaving] = useState(false);

  const [viewItem, setViewItem] = useState<ViewItem | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [complexData, regionData, ownerData, teamData, locationData, assignmentData, users, employeesData] = await Promise.all([
        catalogsApi.getCatalogs('COMPLEX', 'CATALOG_COMPLEX_DATA'),
        catalogsApi.getCatalogs('REGION', 'CATALOG_REGION_DATA'),
        driverManagementApi.getUnits({ level: 'OWNER', status: 'ACTIVE' }),
        driverManagementApi.getUnits({ level: 'TEAM', status: 'ACTIVE' }),
        schedulingApi.locations({ type: 'DEPOT' }),
        driverManagementApi.getManagers({ includeHistory: true }),
        apiService.getUsers({ role: 'FARM_MANAGER' }),
        apiService.getEmployees().catch(() => []),
      ]);
      const resolvedComplexes = Array.isArray(complexData) && complexData.length > 0 ? complexData : [];
      setComplexes(resolvedComplexes);
      setRegions(Array.isArray(regionData) ? regionData : []);
      setOwners(Array.isArray(ownerData) && ownerData.length > 0 ? ownerData : []);
      setTeams(Array.isArray(teamData) && teamData.length > 0 ? teamData : []);
      setLocations(Array.isArray(locationData) && locationData.length > 0 ? locationData : []);
      setAssignments(Array.isArray(assignmentData) ? assignmentData : []);
      const userList = Array.isArray(users) ? users : ((users as any)?.data || (users as any)?.items || []);
      setManagerUsers(userList.map((user: any) => ({ id: user.id, code: user.code, fullName: user.fullName, phone: user.phone, position: user.position })));
      setEmployees(Array.isArray(employeesData) ? employeesData : []);
    } catch (loadError) {
      console.error('[CGManagersManagementPage] loadData error:', loadError);
      setError(errorMessage(loadError, 'Không tải được dữ liệu quản lý cơ giới từ hệ thống.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadData(); }, []);

  const complexName = useMemo(() => new Map(complexes.map((item) => [item.code, item.name])), [complexes]);
  const keyword = search.trim().toLocaleLowerCase('vi-VN');
  const matchStatus = (status: string) => statusFilter === 'ALL' || status === statusFilter;
  const matchText = (values: Array<string | null | undefined>) => !keyword || values.some((value) => value?.toLocaleLowerCase('vi-VN').includes(keyword));

  const managerSuggestions = useMemo(() => {
    const list: Array<{ fullName: string; phone?: string; position?: string; source: string }> = [];
    const seen = new Set<string>();
    for (const u of managerUsers) {
      const key = (u.fullName || '').trim().toLowerCase();
      if (key && !seen.has(key)) {
        seen.add(key);
        list.push({ fullName: u.fullName, phone: u.phone, position: u.position, source: 'Tài khoản người dùng' });
      }
    }
    for (const emp of employees) {
      const key = (emp.fullName || '').trim().toLowerCase();
      if (key && !seen.has(key)) {
        seen.add(key);
        list.push({ fullName: emp.fullName, phone: emp.phone, position: emp.position, source: 'Hồ sơ nhân viên' });
      }
    }
    return list;
  }, [managerUsers, employees]);

  const availableEmployees = useMemo(() => {
    const sourceList = (employees && employees.length > 0) ? employees : [];
    const targetComplex = managerForm.complexCode || 'KOUN_MOM';

    const getCleanKlh = (emp?: any): string => {
      if (!emp) return 'KLH Koun Mom';
      const code = (emp.empCode || '').toUpperCase();
      if (code === 'ADMIN-001') return 'Toàn bộ 3 Khu Liên Hợp';
      const text = `${emp.complex || ''} ${emp.businessUnit || ''} ${emp.enterprise || ''} ${emp.farm || ''} ${code}`.toUpperCase();
      if (text.includes('TOÀN') || text.includes('TOAN') || text.includes('VĂN PHÒNG ĐIỀU HÀNH')) return 'Toàn bộ 3 Khu Liên Hợp';
      if (text.includes('SNOUL') || text.includes('SN-') || text.includes('SN_')) return 'KLH Snoul';
      if (text.includes('NAM LÀO') || text.includes('NAM LAO') || text.includes('NAMLAO') || text.includes('ATTAPEU') || text.includes('NL-') || text.includes('NL_')) return 'KLH Nam Lào';
      if (text.includes('PUCH') || text.includes('IP-') || text.includes('IP_') || text.includes('GIA LAI')) return 'KLH Ia Puch';
      return 'KLH Koun Mom';
    };

    if (targetComplex === 'ALL') return sourceList;

    const filtered = sourceList.filter((emp) => {
      const klh = getCleanKlh(emp);
      if (klh === 'Toàn bộ 3 Khu Liên Hợp') return true;
      if (targetComplex === 'KOUN_MOM' && klh === 'KLH Koun Mom') return true;
      if (targetComplex === 'SNOUL' && klh === 'KLH Snoul') return true;
      if (targetComplex === 'NAM_LAO' && klh === 'KLH Nam Lào') return true;
      if (targetComplex === 'IA_PUCH' && klh === 'KLH Ia Puch') return true;
      return false;
    });

    return filtered.length > 0 ? filtered : sourceList;
  }, [employees, managerForm.complexCode]);

  const employeeAssignmentsMap = useMemo(() => {
    const map = new Map<string, string[]>();
    teams.forEach((t) => {
      const name = (t.managerName || t.currentManager?.manager?.fullName || '').trim().toLowerCase();
      if (name) {
        const list = map.get(name) || [];
        list.push(t.name);
        map.set(name, list);
      }
    });
    return map;
  }, [teams]);

  const filteredOwners = useMemo(() => owners.filter((item) =>
    (complexFilter === 'ALL' || item.complexCode === complexFilter)
    && (unitTypeFilter === 'ALL' || item.unitType === unitTypeFilter)
    && matchStatus(item.status)
    && matchText([item.code, item.name, item.managerName, item.currentManager?.manager?.fullName, item.mainDepot?.name])),
    [owners, complexFilter, unitTypeFilter, statusFilter, keyword]);

  const filteredTeams = useMemo(() => teams.filter((item) =>
    (complexFilter === 'ALL' || item.complexCode === complexFilter)
    && (ownerFilter === 'ALL' || String(item.parentId) === ownerFilter) && matchStatus(item.status)
    && matchText([item.code, item.name, item.parent?.name, item.managerName, item.currentManager?.manager?.fullName, item.mainDepot?.name])),
    [teams, complexFilter, ownerFilter, statusFilter, keyword]);

  const filteredLocations = useMemo(() => locations.filter((item) =>
    (complexFilter === 'ALL' || item.complexCode === complexFilter)
    && (statusFilter === 'ALL' || (statusFilter === 'ACTIVE') === item.active)
    && (regionFilter === 'ALL' || item.regionName === regionFilter)
    && matchText([item.code, item.name, item.enterpriseCode, item.regionName, item.address])),
    [locations, complexFilter, statusFilter, regionFilter, keyword]);

  // ==================== TAB 1: UNITS HANDLERS ====================
  const openCreateUnit = () => {
    setEditingUnit(null);
    setUnitForm({
      ...emptyUnitForm,
      complexCode: complexFilter === 'ALL' ? 'KOUN_MOM' : complexFilter,
      parentId: ownerFilter === 'ALL' ? '' : ownerFilter,
    });
    setError('');
    setUnitModal(true);
  };

  const openEditUnit = (unit: DriverManagementUnit) => {
    setEditingUnit(unit);
    const depotName = unit.mainDepot?.name || locations.find((l) => l.id === unit.mainDepotId)?.name || '';
    setUnitForm({
      complexCode: unit.complexCode,
      parentId: String(unit.parentId || ''),
      code: unit.code,
      name: unit.name,
      unitType: unit.unitType,
      mainDepotId: String(unit.mainDepotId || unit.mainDepot?.id || ''),
      mainDepotName: depotName,
      description: unit.description || '',
      status: unit.status,
    });
    setError('');
    setUnitModal(true);
  };

  const saveUnit = async () => {
    if (!unitForm.complexCode || !unitForm.code.trim() || !unitForm.name.trim() || !unitForm.parentId) {
      setError('Vui lòng chọn KLH, Khu vực quản lý chung trực thuộc và nhập đầy đủ Mã, Tên đơn vị.');
      return;
    }
    setUnitSaving(true);
    setError('');
    try {
      let resolvedDepotId = unitForm.mainDepotId ? Number(unitForm.mainDepotId) : null;
      if (!resolvedDepotId && unitForm.mainDepotName.trim()) {
        const matchLoc = locations.find(
          (l) => (l.complexCode === unitForm.complexCode || complexFilter === 'ALL') &&
            l.name.toLowerCase() === unitForm.mainDepotName.trim().toLowerCase()
        );
        if (matchLoc) resolvedDepotId = matchLoc.id;
      }

      if (editingUnit) {
        await driverManagementApi.updateUnit(editingUnit.id, {
          name: unitForm.name.trim(),
          parentId: Number(unitForm.parentId),
          unitType: unitForm.unitType,
          status: unitForm.status,
          description: unitForm.description.trim(),
          mainDepotId: resolvedDepotId,
        });
      } else {
        await driverManagementApi.createUnit({
          complexCode: unitForm.complexCode,
          code: unitForm.code.trim(),
          name: unitForm.name.trim(),
          level: 'TEAM',
          parentId: Number(unitForm.parentId),
          unitType: unitForm.unitType,
          description: unitForm.description.trim(),
          mainDepotId: resolvedDepotId || undefined,
        });
      }
      setUnitModal(false);
      await loadData();
    } catch (saveError) {
      setError(errorMessage(saveError, 'Không lưu được đơn vị quản lý cơ giới.'));
    } finally {
      setUnitSaving(false);
    }
  };

  const deleteUnit = async (unit: DriverManagementUnit) => {
    if (!window.confirm(`Xóa đơn vị "${unit.name}"? Dữ liệu đã có lịch sử sẽ không được phép xóa.`)) return;
    try { await driverManagementApi.deleteUnit(unit.id); await loadData(); }
    catch (deleteError) { setError(errorMessage(deleteError, 'Không thể xóa. Hãy chuyển bản ghi sang Ngưng hoạt động.')); }
  };

  // ==================== TAB 2: MANAGERS HANDLERS ====================
  const openCreateManager = () => {
    setEditingManagerUnit(null);
    setCustomManagerInput(false);
    setManagerForm({
      ...emptyManagerForm,
      complexCode: complexFilter === 'ALL' ? 'KOUN_MOM' : complexFilter,
      unitId: '',
    });
    setError('');
    setManagerModal(true);
  };

  const openEditManager = (unit: DriverManagementUnit) => {
    setEditingManagerUnit(unit);
    setCustomManagerInput(false);
    const depotName = unit.mainDepot?.name || locations.find((l) => l.id === unit.mainDepotId)?.name || '';
    setManagerForm({
      complexCode: unit.complexCode,
      unitId: String(unit.id),
      managerName: unit.managerName || unit.currentManager?.manager?.fullName || '',
      managerPhone: unit.managerPhone || unit.currentManager?.manager?.phone || '',
      managerUserId: String(unit.currentManager?.managerUserId || ''),
      roleTitle: 'Đội trưởng cơ giới',
      mainDepotId: String(unit.mainDepotId || unit.mainDepot?.id || ''),
      mainDepotName: depotName,
      notes: unit.description || '',
    });
    setError('');
    setManagerModal(true);
  };

  const saveManager = async () => {
    if (!managerForm.unitId) {
      setError('Vui lòng chọn Đơn vị quản lý cơ giới phụ trách.');
      return;
    }
    if (!managerForm.managerName.trim()) {
      setError('Vui lòng nhập Họ tên Đội trưởng / Người phụ trách.');
      return;
    }
    setManagerSaving(true);
    setError('');
    try {
      let resolvedDepotId = managerForm.mainDepotId ? Number(managerForm.mainDepotId) : null;
      if (!resolvedDepotId && managerForm.mainDepotName.trim()) {
        const matchLoc = locations.find(
          (l) => (l.complexCode === managerForm.complexCode || complexFilter === 'ALL') &&
            l.name.toLowerCase() === managerForm.mainDepotName.trim().toLowerCase()
        );
        if (matchLoc) resolvedDepotId = matchLoc.id;
      }
      const unitId = Number(managerForm.unitId);
      const saved = await driverManagementApi.updateUnit(unitId, {
        managerName: managerForm.managerName.trim(),
        managerPhone: managerForm.managerPhone.trim(),
        mainDepotId: resolvedDepotId,
        description: managerForm.notes.trim() || undefined,
      });
      if (managerForm.managerUserId) {
        const targetUnit = teams.find((t) => t.id === unitId);
        const current = targetUnit?.currentManager;
        const nextManager = Number(managerForm.managerUserId);
        const effectiveFrom = new Date().toISOString();
        if (current && current.managerUserId !== nextManager) {
          await driverManagementApi.replaceManagerAssignment(current.id, { managementUnitId: saved.id, managerUserId: nextManager, managerType: 'PRIMARY', effectiveFrom, reason: 'Thay đổi người phụ trách' });
        } else if (!current) {
          await driverManagementApi.createManagerAssignment({ managementUnitId: saved.id, managerUserId: nextManager, managerType: 'PRIMARY', effectiveFrom, reason: 'Bổ nhiệm người phụ trách' });
        }
      }
      setManagerModal(false);
      await loadData();
    } catch (saveError) {
      setError(errorMessage(saveError, 'Không lưu được thông tin người phụ trách.'));
    } finally {
      setManagerSaving(false);
    }
  };

  const deleteManager = async (unit: DriverManagementUnit) => {
    const mgrName = unit.managerName || unit.currentManager?.manager?.fullName || 'Người phụ trách';
    if (!window.confirm(`Hủy phân công "${mgrName}" khỏi đơn vị "${unit.name}"?`)) return;
    try {
      await driverManagementApi.updateUnit(unit.id, { managerName: null as any, managerPhone: null as any });
      await loadData();
    } catch (err) {
      setError(errorMessage(err, 'Không thể hủy phân công người phụ trách.'));
    }
  };

  // ==================== TAB 3: REGIONS HANDLERS ====================
  const openCreateRegion = () => {
    setEditingRegion(null);
    setRegionForm({
      ...emptyRegionForm,
      complexCode: complexFilter === 'ALL' ? 'KOUN_MOM' : complexFilter,
    });
    setError('');
    setRegionModal(true);
  };

  const openEditRegion = (region: DriverManagementUnit) => {
    setEditingRegion(region);
    const depotName = region.mainDepot?.name || locations.find((l) => l.id === region.mainDepotId)?.name || '';
    setRegionForm({
      complexCode: region.complexCode,
      code: region.code,
      name: region.name,
      unitType: region.unitType,
      mainDepotId: String(region.mainDepotId || region.mainDepot?.id || ''),
      mainDepotName: depotName,
      description: region.description || '',
      status: region.status,
    });
    setError('');
    setRegionModal(true);
  };

  const saveRegion = async () => {
    if (!regionForm.complexCode || !regionForm.code.trim() || !regionForm.name.trim()) {
      setError('Vui lòng chọn KLH, nhập mã và tên Khu vực quản lý chung.');
      return;
    }
    setRegionSaving(true);
    setError('');
    try {
      let resolvedDepotId = regionForm.mainDepotId ? Number(regionForm.mainDepotId) : null;
      if (!resolvedDepotId && regionForm.mainDepotName.trim()) {
        const matchLoc = locations.find(
          (l) => (l.complexCode === regionForm.complexCode || complexFilter === 'ALL') &&
            l.name.toLowerCase() === regionForm.mainDepotName.trim().toLowerCase()
        );
        if (matchLoc) resolvedDepotId = matchLoc.id;
      }

      if (editingRegion) {
        await driverManagementApi.updateUnit(editingRegion.id, {
          name: regionForm.name.trim(),
          unitType: regionForm.unitType,
          status: regionForm.status,
          description: regionForm.description.trim(),
          mainDepotId: resolvedDepotId,
        });
      } else {
        await driverManagementApi.createUnit({
          complexCode: regionForm.complexCode,
          code: regionForm.code.trim(),
          name: regionForm.name.trim(),
          level: 'OWNER',
          unitType: regionForm.unitType,
          description: regionForm.description.trim(),
          mainDepotId: resolvedDepotId || undefined,
        });
      }
      setRegionModal(false);
      await loadData();
    } catch (saveError) {
      setError(errorMessage(saveError, 'Không lưu được khu vực quản lý chung.'));
    } finally {
      setRegionSaving(false);
    }
  };

  const deleteRegion = async (region: DriverManagementUnit) => {
    if (!window.confirm(`Xóa Khu vực quản lý chung "${region.name}"? Dữ liệu đã có lịch sử sẽ không được phép xóa.`)) return;
    try {
      await driverManagementApi.deleteUnit(region.id);
      await loadData();
    } catch (deleteError) {
      setError(errorMessage(deleteError, 'Không thể xóa. Hãy chuyển bản ghi sang Ngưng hoạt động.'));
    }
  };

  const openCreateLocation = () => {
    setEditingLocation(null);
    setLocationForm({ ...emptyLocationForm, complexCode: complexFilter === 'ALL' ? 'KOUN_MOM' : complexFilter });
    setError('');
    setLocationModal(true);
  };

  const openEditLocation = (location: OperationalLocation) => {
    setEditingLocation(location);
    setLocationForm({
      code: location.code, name: location.name, complexCode: location.complexCode || 'KOUN_MOM',
      enterpriseCode: location.enterpriseCode || '', regionName: location.regionName || '', address: location.address || '',
      lat: location.lat === undefined ? '' : String(location.lat), lng: location.lng === undefined ? '' : String(location.lng),
      geofenceRadiusM: String(location.geofenceRadiusM || 300), active: location.active,
    });
    setLocationModal(true);
  };

  const saveLocation = async () => {
    const lat = locationForm.lat === '' ? undefined : Number(locationForm.lat);
    const lng = locationForm.lng === '' ? undefined : Number(locationForm.lng);
    const radius = Number(locationForm.geofenceRadiusM);
    if (!locationForm.code.trim() || !locationForm.name.trim() || !locationForm.complexCode || !locationForm.regionName) {
      setError('Vui lòng nhập mã, tên, KLH và khu vực quản lý.'); return;
    }
    if ((lat !== undefined && (lat < -90 || lat > 90)) || (lng !== undefined && (lng < -180 || lng > 180)) || !Number.isInteger(radius) || radius <= 0) {
      setError('GPS không hợp lệ: vĩ độ -90 đến 90, kinh độ -180 đến 180, bán kính lớn hơn 0.'); return;
    }
    setLocationSaving(true);
    const payload = { ...locationForm, code: locationForm.code.trim(), name: locationForm.name.trim(), type: 'DEPOT', lat, lng, geofenceRadiusM: radius };
    try {
      if (editingLocation) await schedulingApi.updateLocation(editingLocation.id, payload);
      else await schedulingApi.createLocation(payload);
      setLocationModal(false);
      await loadData();
    } catch (saveError) { setError(errorMessage(saveError, 'Không lưu được bãi xe.')); }
    finally { setLocationSaving(false); }
  };

  const deleteLocation = async (location: OperationalLocation) => {
    if (!window.confirm(`Ngưng sử dụng bãi "${location.name}"?`)) return;
    try { await schedulingApi.deactivateLocation(location.id); await loadData(); }
    catch (deleteError) { setError(errorMessage(deleteError, 'Không thể ngưng sử dụng bãi xe.')); }
  };

  const unitColumns = (compact: boolean = false): Column<DriverManagementUnit>[] => {
    if (compact) {
      return [
        {
          key: 'code',
          title: 'Mã đơn vị',
          width: '150px',
          sortable: true,
          render: (row) => <span className="font-mono font-bold text-emerald-800">{row.code}</span>,
        },
        {
          key: 'name',
          title: 'Tên Đơn vị quản lý',
          width: '230px',
          sortable: true,
          render: (row) => (
            <div>
              <span className="font-semibold text-slate-900">{row.name}</span>
              {row.parent?.name && (
                <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                  <span>Khu vực:</span>
                  <span className="font-medium text-slate-700">{row.parent.name}</span>
                </div>
              )}
            </div>
          ),
        },
        {
          key: 'complexCode',
          title: 'KLH',
          width: '130px',
          render: (row) => complexName.get(row.complexCode) || row.complexCode,
        },
        {
          key: 'manager',
          title: 'Người phụ trách',
          width: '180px',
          render: (row) => {
            const mgrName = row.managerName || row.currentManager?.manager?.fullName;
            const mgrPhone = row.managerPhone || row.currentManager?.manager?.phone;
            if (!mgrName) return <span className="text-slate-400 font-medium">—</span>;
            return (
              <div>
                <div className="font-semibold text-slate-800">{mgrName}</div>
                {mgrPhone && <div className="text-[11px] text-slate-500 font-mono">{mgrPhone}</div>}
              </div>
            );
          },
        },
        {
          key: 'totalEquipmentCount',
          title: 'Tổng quy mô TB',
          align: 'center',
          width: '125px',
          render: (row) => (
            <span className="font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200">
              {row.totalEquipmentCount || ((row.vehicleCount || 0) + (row.implementCount || 0))}
            </span>
          ),
        },
        {
          key: 'driverCount',
          title: 'Nhân sự / TX',
          align: 'center',
          width: '110px',
          render: (row) => <span className="font-semibold text-slate-800">{row.driverCount || 0}</span>,
        },
        {
          key: 'status',
          title: 'Trạng thái',
          align: 'center',
          width: '130px',
          render: (row) => statusBadge(row.status === 'ACTIVE'),
        },
        {
          key: 'user',
          title: 'User',
          align: 'center',
          width: '70px',
          render: (row) => <AuditUserPopover title={`Thông tin cập nhật ${row.name}`} />,
        },
        {
          key: 'actions',
          title: 'Tác vụ',
          align: 'center',
          width: '110px',
          render: (row) => (
            <TableRowActions
              onView={() =>
                setViewItem({
                  title: row.name,
                  values: [
                    ['Mã đơn vị', row.code],
                    ['Khu vực quản lý', row.parent?.name || '—'],
                    ['KLH', complexName.get(row.complexCode) || row.complexCode],
                    ['Người phụ trách', row.managerName || row.currentManager?.manager?.fullName || '—'],
                    ['Nơi tập kết / Bãi xe', row.mainDepot?.name || '—'],
                    ['Xe / máy', row.vehicleCount || 0],
                    ['Thiết bị phụ trợ', row.implementCount || 0],
                    ['Tổng quy mô TB', row.totalEquipmentCount || 0],
                    ['Nhân sự / tài xế', row.driverCount || 0],
                    ['Điều lệnh', row.workOrderCount || 0],
                  ],
                })
              }
              onEdit={() => openEditUnit(row)}
              onDelete={() => void deleteUnit(row)}
              requireAdminToDelete={false}
            />
          ),
        },
      ];
    }

    return [
      { key: 'code', title: 'Mã đơn vị', width: '150px', sortable: true, render: (row) => <span className="font-mono font-bold text-emerald-800">{row.code}</span> },
      { key: 'name', title: 'Tên Đơn vị quản lý', width: '220px', sortable: true, render: (row) => <span className="font-semibold text-slate-900">{row.name}</span> },
      { key: 'complexCode', title: 'KLH', width: '130px', render: (row) => complexName.get(row.complexCode) || row.complexCode },
      { key: 'parent', title: 'Khu vực quản lý', width: '200px', render: (row: DriverManagementUnit) => row.parent?.name || '—' },
      {
        key: 'manager',
        title: 'Người phụ trách',
        width: '180px',
        render: (row) => {
          const mgrName = row.managerName || row.currentManager?.manager?.fullName;
          const mgrPhone = row.managerPhone || row.currentManager?.manager?.phone;
          if (!mgrName) return <span className="text-slate-400 font-medium">—</span>;
          return (
            <div>
              <div className="font-semibold">{mgrName}</div>
              {mgrPhone && <div className="text-[11px] text-slate-500 font-mono">{mgrPhone}</div>}
            </div>
          );
        },
      },
      {
        key: 'mainDepot',
        title: 'Nơi tập kết / Bãi xe',
        width: '180px',
        render: (row) => {
          if (!row.mainDepot?.name) return <span className="text-slate-400">—</span>;
          return (
            <div>
              <div>{row.mainDepot.name}</div>
              {row.mainDepot.regionName && <div className="text-[11px] text-slate-500">{row.mainDepot.regionName}</div>}
            </div>
          );
        },
      },
      { key: 'vehicleCount', title: 'Xe / máy', align: 'center', width: '90px', render: (row) => row.vehicleCount || 0 },
      { key: 'implementCount', title: 'TB phụ trợ', align: 'center', width: '90px', render: (row) => row.implementCount || 0 },
      { key: 'totalEquipmentCount', title: 'Tổng quy mô', align: 'center', width: '100px', render: (row) => <span className="font-bold text-emerald-800">{row.totalEquipmentCount || 0}</span> },
      { key: 'driverCount', title: 'Nhân sự / TX', align: 'center', width: '105px', render: (row) => row.driverCount || 0 },
      { key: 'workOrderCount', title: 'Điều lệnh', align: 'center', width: '90px', render: (row) => row.workOrderCount || 0 },
      { key: 'status', title: 'Trạng thái', align: 'center', width: '130px', render: (row) => statusBadge(row.status === 'ACTIVE') },
      { key: 'user', title: 'User', align: 'center', width: '70px', render: (row) => <AuditUserPopover title={`Thông tin cập nhật ${row.name}`} />, },
      {
        key: 'actions',
        title: 'Tác vụ',
        align: 'center',
        width: '110px',
        render: (row) => (
          <TableRowActions
            onView={() =>
              setViewItem({
                title: row.name,
                values: [
                  ['Mã đơn vị', row.code],
                  ['Khu vực quản lý', row.parent?.name || '—'],
                  ['KLH', complexName.get(row.complexCode) || row.complexCode],
                  ['Người phụ trách', row.managerName || row.currentManager?.manager?.fullName || '—'],
                  ['Nơi tập kết / Bãi xe', row.mainDepot?.name || '—'],
                  ['Xe / máy', row.vehicleCount || 0],
                  ['Thiết bị phụ trợ', row.implementCount || 0],
                  ['Tổng quy mô TB', row.totalEquipmentCount || 0],
                  ['Nhân sự / tài xế', row.driverCount || 0],
                  ['Điều lệnh', row.workOrderCount || 0],
                ],
              })
            }
            onEdit={() => openEditUnit(row)}
            onDelete={() => void deleteUnit(row)}
            requireAdminToDelete={false}
          />
        ),
      },
    ];
  };

  const managerColumns = (): Column<DriverManagementUnit>[] => [
    {
      key: 'manager',
      title: 'Đội trưởng / Người phụ trách',
      width: '240px',
      sortable: true,
      render: (row) => {
        const mgrName = row.managerName || row.currentManager?.manager?.fullName;
        const mgrPhone = row.managerPhone || row.currentManager?.manager?.phone;
        if (!mgrName) return <span className="text-slate-400 italic font-medium">Chưa phân công</span>;

        return (
          <div>
            <div className="font-bold text-slate-900">{mgrName}</div>
            {mgrPhone && <div className="text-xs text-emerald-700 font-mono font-semibold mt-0.5">📞 {mgrPhone}</div>}
          </div>
        );
      },
    },
    {
      key: 'name',
      title: 'Đơn vị quản lý phụ trách',
      width: '210px',
      sortable: true,
      render: (row) => (
        <div>
          <span className="font-semibold text-slate-800">{row.name}</span>
          <div className="text-[11px] font-mono text-slate-400">{row.code}</div>
        </div>
      ),
    },
    {
      key: 'parent',
      title: 'Khu vực quản lý',
      width: '190px',
      render: (row) => row.parent?.name ? (
        <span className="font-medium text-slate-700 bg-slate-100 px-2.5 py-1 rounded text-xs">
          {row.parent.name}
        </span>
      ) : <span className="text-slate-400">—</span>,
    },
    {
      key: 'mainDepot',
      title: 'Địa chỉ / Nơi tập kết',
      width: '180px',
      render: (row) => row.mainDepot?.name ? (
        <span className="text-xs text-slate-800 flex items-center gap-1">
          <MapPin className="h-3.5 w-3.5 text-rose-500 shrink-0" />
          {row.mainDepot.name}
        </span>
      ) : <span className="text-slate-400">—</span>,
    },
    {
      key: 'totalEquipmentCount',
      title: 'Tổng quy mô TB',
      align: 'center',
      width: '125px',
      render: (row) => (
        <span className="font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200">
          {row.totalEquipmentCount || ((row.vehicleCount || 0) + (row.implementCount || 0))}
        </span>
      ),
    },
    {
      key: 'driverCount',
      title: 'Nhân sự / TX',
      align: 'center',
      width: '110px',
      render: (row) => <span className="font-semibold text-slate-800">{row.driverCount || 0}</span>,
    },
    {
      key: 'status',
      title: 'Trạng thái',
      align: 'center',
      width: '130px',
      render: (row) => statusBadge(row.status === 'ACTIVE'),
    },
    {
      key: 'user',
      title: 'User',
      align: 'center',
      width: '70px',
      render: (row) => <AuditUserPopover title={`Thông tin cập nhật ${row.managerName || row.name}`} />,
    },
    {
      key: 'actions',
      title: 'Tác vụ',
      align: 'center',
      width: '110px',
      render: (row) => (
        <TableRowActions
          onView={() =>
            setViewItem({
              title: `Đội trưởng: ${row.managerName || row.currentManager?.manager?.fullName || row.name}`,
              values: [
                ['Họ & Tên', row.managerName || row.currentManager?.manager?.fullName || '—'],
                ['Số điện thoại / Zalo', row.managerPhone || row.currentManager?.manager?.phone || '—'],
                ['Đơn vị phụ trách', `${row.code} · ${row.name}`],
                ['Khu vực', row.parent?.name || '—'],
                ['Địa chỉ / Nơi tập kết', row.mainDepot?.name || '—'],
                ['Xe / máy', row.vehicleCount || 0],
                ['Thiết bị phụ trợ', row.implementCount || 0],
                ['Tổng quy mô TB', row.totalEquipmentCount || 0],
                ['Nhân sự / tài xế', row.driverCount || 0],
              ],
            })
          }
          onEdit={() => openEditManager(row)}
          onDelete={() => void deleteManager(row)}
          requireAdminToDelete={false}
        />
      ),
    },
  ];

  const regionColumns = (): Column<DriverManagementUnit>[] => [
    {
      key: 'code',
      title: 'Mã khu vực',
      width: '140px',
      sortable: true,
      render: (row) => <span className="font-mono font-bold text-emerald-800">{row.code}</span>,
    },
    {
      key: 'name',
      title: 'Tên Khu vực quản lý chung',
      width: '240px',
      sortable: true,
      render: (row) => <span className="font-bold text-slate-900">{row.name}</span>,
    },
    {
      key: 'complexCode',
      title: 'KLH',
      width: '140px',
      render: (row) => complexName.get(row.complexCode) || row.complexCode,
    },
    {
      key: 'teamCount',
      title: 'Số Đơn vị trực thuộc',
      align: 'center',
      width: '160px',
      render: (row) => (
        <span className="font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded border border-indigo-200">
          {row.teamCount || 0} đơn vị
        </span>
      ),
    },
    { key: 'vehicleCount', title: 'Xe / máy', align: 'center', width: '100px', render: (row) => row.vehicleCount || 0 },
    { key: 'implementCount', title: 'TB phụ trợ', align: 'center', width: '100px', render: (row) => row.implementCount || 0 },
    {
      key: 'totalEquipmentCount',
      title: 'Tổng quy mô TB',
      align: 'center',
      width: '130px',
      render: (row) => <span className="font-extrabold text-emerald-800">{row.totalEquipmentCount || 0}</span>,
    },
    { key: 'driverCount', title: 'Nhân sự / TX', align: 'center', width: '110px', render: (row) => row.driverCount || 0 },
    { key: 'status', title: 'Trạng thái', align: 'center', width: '130px', render: (row) => statusBadge(row.status === 'ACTIVE') },
    { key: 'user', title: 'User', align: 'center', width: '70px', render: (row) => <AuditUserPopover title={`Thông tin cập nhật ${row.name}`} /> },
    {
      key: 'actions',
      title: 'Tác vụ',
      align: 'center',
      width: '110px',
      render: (row) => (
        <TableRowActions
          onView={() =>
            setViewItem({
              title: row.name,
              values: [
                ['Mã khu vực', row.code],
                ['KLH', complexName.get(row.complexCode) || row.complexCode],
                ['Số đơn vị trực thuộc', `${row.teamCount || 0} đơn vị`],
                ['Xe / máy', row.vehicleCount || 0],
                ['Thiết bị phụ trợ', row.implementCount || 0],
                ['Tổng quy mô TB', row.totalEquipmentCount || 0],
                ['Nhân sự / tài xế', row.driverCount || 0],
              ],
            })
          }
          onEdit={() => openEditRegion(row)}
          onDelete={() => void deleteRegion(row)}
          requireAdminToDelete={false}
        />
      ),
    },
  ];

  const areaColumns = (compact: boolean = false): Column<OperationalLocation>[] => {
    if (compact) {
      return [
        { key: 'code', title: 'Mã bãi', width: '130px', sortable: true, render: (row) => <span className="font-mono font-bold text-emerald-800">{row.code}</span> },
        { key: 'name', title: 'Bãi xe / Nơi tập kết', width: '240px', sortable: true, render: (row) => <span className="font-semibold">{row.name}</span> },
        { key: 'regionName', title: 'Khu vực quản lý', width: '180px', render: (row) => regions.find((item) => item.code === row.regionName)?.name || row.regionName || '—' },
        { key: 'enterpriseCode', title: 'Đơn vị quản lý (Khu vực)', width: '200px', render: (row) => owners.find((item) => item.code === row.enterpriseCode)?.name || row.enterpriseCode || '—' },
        { key: 'status', title: 'Trạng thái', align: 'center', width: '130px', render: (row) => statusBadge(row.active) },
        { key: 'user', title: 'User', align: 'center', width: '70px', render: (row) => <AuditUserPopover title={`Thông tin cập nhật ${row.name}`} /> },
        { key: 'actions', title: 'Tác vụ', align: 'center', width: '110px', render: (row) => <TableRowActions onView={() => setViewItem({ title: row.name, values: [['Mã', row.code], ['Khu vực', row.regionName || '—'], ['Đơn vị quản lý', row.enterpriseCode ? (owners.find((item) => item.code === row.enterpriseCode)?.name || row.enterpriseCode) : '—'], ['Địa chỉ', row.address || '—']] })} onEdit={() => openEditLocation(row)} onDelete={() => void deleteLocation(row)} requireAdminToDelete={false} /> },
      ];
    }
    return [
      { key: 'code', title: 'Mã bãi', width: '130px', sortable: true, render: (row) => <span className="font-mono font-bold text-emerald-800">{row.code}</span> },
      { key: 'name', title: 'Bãi xe / Nơi tập kết', width: '220px', sortable: true, render: (row) => <span className="font-semibold">{row.name}</span> },
      { key: 'regionName', title: 'Khu vực quản lý', width: '180px', render: (row) => regions.find((item) => item.code === row.regionName)?.name || row.regionName || '—' },
      { key: 'enterpriseCode', title: 'Đơn vị quản lý (Khu vực)', width: '200px', render: (row) => owners.find((item) => item.code === row.enterpriseCode)?.name || row.enterpriseCode || '—' },
      { key: 'address', title: 'Địa chỉ / Ghi chú', width: '220px', render: (row) => row.address || '—' },
      { key: 'gps', title: 'GPS / Geofence', width: '170px', render: (row) => row.lat !== undefined && row.lng !== undefined ? `${row.lat}, ${row.lng} · ${row.geofenceRadiusM}m` : `Chưa có tọa độ · ${row.geofenceRadiusM}m` },
      { key: 'status', title: 'Trạng thái', align: 'center', width: '130px', render: (row) => statusBadge(row.active) },
      { key: 'user', title: 'User', align: 'center', width: '70px', render: (row) => <AuditUserPopover title={`Thông tin cập nhật ${row.name}`} /> },
      { key: 'actions', title: 'Tác vụ', align: 'center', width: '110px', render: (row) => <TableRowActions onView={() => setViewItem({ title: row.name, values: [['Mã', row.code], ['Khu vực', row.regionName || '—'], ['Đơn vị quản lý', row.enterpriseCode ? (owners.find((item) => item.code === row.enterpriseCode)?.name || row.enterpriseCode) : '—'], ['Địa chỉ', row.address || '—']] })} onEdit={() => openEditLocation(row)} onDelete={() => void deleteLocation(row)} requireAdminToDelete={false} /> },
    ];
  };

  const cards = [
    {
      id: 'units' as const,
      label: 'Đơn vị quản lý',
      value: filteredTeams.length,
      icon: Building2,
      color: 'text-blue-700 bg-blue-50',
      subtitle: '27 đơn vị quản lý MMTB (theo KLH Koun Mom)',
    },
    {
      id: 'managers' as const,
      label: 'Đội trưởng & Phụ trách',
      value: filteredTeams.filter((t) => !!(t.managerName || t.currentManager?.manager?.fullName)).length,
      icon: Users,
      color: 'text-indigo-700 bg-indigo-50',
      subtitle: 'Nhân sự quản lý cơ giới & thông tin liên lạc',
    },
    {
      id: 'regions' as const,
      label: 'Khu vực quản lý chung',
      value: filteredOwners.length,
      icon: Layers,
      color: 'text-emerald-700 bg-emerald-50',
      subtitle: '4 phân vùng quản lý tổng thể: DP, LP, AD, KLH',
    },
    {
      id: 'areas' as const,
      label: 'Khu vực & Bãi xe',
      value: filteredLocations.length,
      icon: MapPin,
      color: 'text-rose-700 bg-rose-50',
      subtitle: 'Vị trí bãi xe & Nơi tập kết phương tiện',
    },
  ];

  const exportActive = () => {
    if (activeTab === 'areas') {
      exportCsv(
        'khu-vuc-bai-xe',
        ['Mã', 'Tên', 'Khu vực', 'Đơn vị quản lý', 'Địa chỉ'],
        filteredLocations.map((item) => [item.code, item.name, item.regionName || '', item.enterpriseCode || '', item.address || ''])
      );
    } else if (activeTab === 'regions') {
      exportCsv(
        'khu-vuc-quan-ly-chung',
        ['Mã', 'Tên Khu vực', 'Số đơn vị', 'Xe / máy', 'Thiết bị phụ trợ', 'Tổng quy mô', 'Nhân sự / tài xế'],
        filteredOwners.map((item) => [item.code, item.name, item.teamCount || 0, item.vehicleCount || 0, item.implementCount || 0, item.totalEquipmentCount || 0, item.driverCount || 0])
      );
    } else if (activeTab === 'managers') {
      exportCsv(
        'doi-truong-quan-ly-co-gioi',
        ['Đội trưởng / Phụ trách', 'SĐT / Zalo', 'Đơn vị', 'Khu vực', 'Nơi tập kết', 'Tổng quy mô TB'],
        filteredTeams.map((item) => [
          item.managerName || item.currentManager?.manager?.fullName || '',
          item.managerPhone || item.currentManager?.manager?.phone || '',
          item.name,
          item.parent?.name || '',
          item.mainDepot?.name || '',
          item.totalEquipmentCount || 0,
        ])
      );
    } else {
      exportCsv(
        'don-vi-quan-ly-co-gioi',
        ['Mã', 'Tên Đơn vị', 'Khu vực QL', 'Người phụ trách', 'Bãi xe', 'Xe / máy', 'Thiết bị phụ trợ', 'Tổng quy mô', 'Nhân sự / tài xế', 'Điều lệnh'],
        filteredTeams.map((item) => [
          item.code,
          item.name,
          item.parent?.name || '',
          item.managerName || item.currentManager?.manager?.fullName || '',
          item.mainDepot?.name || '',
          item.vehicleCount || 0,
          item.implementCount || 0,
          item.totalEquipmentCount || 0,
          item.driverCount || 0,
          item.workOrderCount || 0,
        ])
      );
    }
  };

  return <div className="space-y-5 pb-8">
    <div>
      <h1 className="text-xl font-extrabold text-slate-900">
        {complexFilter === 'ALL'
          ? 'Quản lý cơ giới & Khu vực'
          : `Quản lý cơ giới - ${complexName.get(complexFilter) || complexFilter}`}
      </h1>
      <p className="mt-1 text-sm text-slate-600">
        Báo cáo tổng hợp quy mô phương tiện, thiết bị phụ trợ, nhân sự vận hành và phân cấp quản lý toàn hệ thống THACO AGRI.
      </p>
    </div>

    <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map((card) => {
        const isActive = activeTab === card.id;
        return (
          <button
            key={card.id}
            type="button"
            onClick={() => setParams({ tab: card.id })}
            className={`rounded-2xl border p-4 text-left transition hover:shadow-md cursor-pointer relative overflow-hidden ${isActive
                ? 'border-emerald-700 bg-emerald-50/40 ring-2 ring-emerald-700/15 shadow-xs'
                : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
          >
            <div className="flex items-center justify-between">
              <span className="truncate text-xs font-bold text-slate-700">{card.label}</span>
              <span className={`rounded-lg p-1.5 ${card.color}`}><card.icon className="h-4 w-4" /></span>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <div className="text-2xl font-black text-slate-900">{card.value}</div>
            </div>
            <div className="mt-1 text-[11px] text-slate-500 truncate">
              {card.subtitle}
            </div>
          </button>
        );
      })}
    </section>

    {error && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</div>}

    <section className="space-y-4 rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      {/* ACTION & CONTEXT FILTER TOOLBAR: Hàng trên là Bộ lọc xếp đều, Hàng dưới là Cụm nút tác vụ */}
      <div className="space-y-3 border-b border-slate-100 p-4 pb-3">
        {/* HÀNG TRÊN: BỘ LỌC (XẾP ĐỀU GRID FULL WIDTH) */}
        {(activeTab === 'units' || activeTab === 'managers') && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                className="h-9 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 py-2 text-xs text-slate-800 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 placeholder:text-slate-400"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={activeTab === 'units' ? 'Tìm kiếm đơn vị quản lý cơ giới...' : 'Tìm kiếm đội trưởng, quản lý...'}
              />
            </div>
            <SearchableSelect
              className="w-full"
              heightClass="h-9"
              roundedClass="rounded-xl"
              bgClass="bg-white"
              emptyOptionLabel="Tất cả Khu liên hợp"
              emptyValue="ALL"
              value={complexFilter}
              onChange={(val) => {
                setComplexFilter(val || 'ALL');
                setOwnerFilter('ALL');
              }}
              options={complexes.map((item) => ({
                value: item.code,
                label: `${item.code} - ${item.name}`,
              }))}
            />
            <SearchableSelect
              className="w-full"
              heightClass="h-9"
              roundedClass="rounded-xl"
              bgClass="bg-white"
              emptyOptionLabel="Tất cả Khu vực quản lý"
              emptyValue="ALL"
              value={ownerFilter}
              onChange={(val) => setOwnerFilter(val || 'ALL')}
              options={owners
                .filter((item) => complexFilter === 'ALL' || item.complexCode === complexFilter)
                .map((item) => ({
                  value: String(item.id),
                  label: `${item.code} - ${item.name}`,
                }))}
            />
            <SearchableSelect
              className="w-full"
              heightClass="h-9"
              roundedClass="rounded-xl"
              bgClass="bg-white"
              emptyOptionLabel="Tất cả trạng thái"
              emptyValue="ALL"
              value={statusFilter}
              onChange={(val) => setStatusFilter(val || 'ALL')}
              options={[
                { value: 'ACTIVE', label: 'Còn hoạt động' },
                { value: 'INACTIVE', label: 'Ngưng hoạt động' },
              ]}
            />
          </div>
        )}

        {activeTab === 'regions' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                className="h-9 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 py-2 text-xs text-slate-800 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 placeholder:text-slate-400"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Tìm kiếm khu vực chung..."
              />
            </div>
            <SearchableSelect
              className="w-full"
              heightClass="h-9"
              roundedClass="rounded-xl"
              bgClass="bg-white"
              emptyOptionLabel="Tất cả Khu liên hợp"
              emptyValue="ALL"
              value={complexFilter}
              onChange={(val) => {
                setComplexFilter(val || 'ALL');
                setOwnerFilter('ALL');
              }}
              options={complexes.map((item) => ({
                value: item.code,
                label: `${item.code} - ${item.name}`,
              }))}
            />
            <SearchableSelect
              className="w-full"
              heightClass="h-9"
              roundedClass="rounded-xl"
              bgClass="bg-white"
              emptyOptionLabel="Tất cả trạng thái"
              emptyValue="ALL"
              value={statusFilter}
              onChange={(val) => setStatusFilter(val || 'ALL')}
              options={[
                { value: 'ACTIVE', label: 'Còn hoạt động' },
                { value: 'INACTIVE', label: 'Ngưng hoạt động' },
              ]}
            />
          </div>
        )}

        {activeTab === 'areas' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                className="h-9 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 py-2 text-xs text-slate-800 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 placeholder:text-slate-400"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Tìm kiếm trong danh mục bãi xe..."
              />
            </div>
            <SearchableSelect
              className="w-full"
              heightClass="h-9"
              roundedClass="rounded-xl"
              bgClass="bg-white"
              emptyOptionLabel="Tất cả Khu liên hợp"
              emptyValue="ALL"
              value={complexFilter}
              onChange={(val) => {
                setComplexFilter(val || 'ALL');
                setRegionFilter('ALL');
              }}
              options={complexes.map((item) => ({
                value: item.code,
                label: `${item.code} - ${item.name}`,
              }))}
            />
            <SearchableSelect
              className="w-full"
              heightClass="h-9"
              roundedClass="rounded-xl"
              bgClass="bg-white"
              emptyOptionLabel="Tất cả khu vực"
              emptyValue="ALL"
              value={regionFilter}
              onChange={(val) => setRegionFilter(val || 'ALL')}
              options={regions
                .filter((item) => complexFilter === 'ALL' || item.parentCode === complexFilter)
                .map((item) => ({
                  value: item.code,
                  label: `${item.code} - ${item.name}`,
                }))}
            />
            <SearchableSelect
              className="w-full"
              heightClass="h-9"
              roundedClass="rounded-xl"
              bgClass="bg-white"
              emptyOptionLabel="Tất cả trạng thái"
              emptyValue="ALL"
              value={statusFilter}
              onChange={(val) => setStatusFilter(val || 'ALL')}
              options={[
                { value: 'ACTIVE', label: 'Còn hoạt động' },
                { value: 'INACTIVE', label: 'Ngưng hoạt động' },
              ]}
            />
          </div>
        )}

        {/* HÀNG DƯỚI: CỤM NÚT TÁC VỤ */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="text-xs text-slate-500 font-medium">
            Phân cấp cơ giới: <span className="font-bold text-slate-800">4 Khu vực quản lý chung · 27 Đơn vị quản lý cơ giới trực thuộc</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-9 text-xs font-bold border-slate-200 bg-white text-slate-700 hover:bg-slate-50 cursor-pointer shadow-xs"
              onClick={() => void loadData()}
              disabled={loading}
              icon={<RefreshCw className={`h-3.5 w-3.5 text-slate-600 ${loading ? 'animate-spin' : ''}`} />}
            >
              Làm mới
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-9 text-xs font-bold border-slate-200 bg-white text-slate-700 hover:bg-slate-50 cursor-pointer shadow-xs"
              onClick={exportActive}
              icon={<Download className="h-3.5 w-3.5" />}
            >
              Xuất file
            </Button>
            {activeTab === 'units' && (
              <Button
                size="sm"
                className="h-9 text-xs font-bold bg-[#154E2C] hover:bg-[#124225] text-[#B8D83D] cursor-pointer shadow-xs"
                onClick={openCreateUnit}
                icon={<Plus className="h-3.5 w-3.5" />}
              >
                Thêm Đơn vị quản lý
              </Button>
            )}
            {activeTab === 'managers' && (
              <Button
                size="sm"
                className="h-9 text-xs font-bold bg-[#154E2C] hover:bg-[#124225] text-[#B8D83D] cursor-pointer shadow-xs"
                onClick={openCreateManager}
                icon={<Plus className="h-3.5 w-3.5" />}
              >
                Phân công Người phụ trách
              </Button>
            )}
            {activeTab === 'regions' && (
              <Button
                size="sm"
                className="h-9 text-xs font-bold bg-[#154E2C] hover:bg-[#124225] text-[#B8D83D] cursor-pointer shadow-xs"
                onClick={openCreateRegion}
                icon={<Plus className="h-3.5 w-3.5" />}
              >
                Thêm Khu vực chung
              </Button>
            )}
            {activeTab === 'areas' && (
              <Button
                size="sm"
                className="h-9 text-xs font-bold bg-[#154E2C] hover:bg-[#124225] text-[#B8D83D] cursor-pointer shadow-xs"
                onClick={openCreateLocation}
                icon={<Plus className="h-3.5 w-3.5" />}
              >
                Thêm Bãi xe
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* HEADER BẢNG DỮ LIỆU & BỘ CHUYỂN ĐỔI CHẾ ĐỘ HIỂN THỊ (TOÀN BỘ CỘT CHI TIẾT / BẢNG VẬN HÀNH THU GỌN) */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-200 px-4 py-3 bg-slate-50/70">
        <div className="flex items-center gap-2">
          <span className="font-extrabold text-sm text-slate-900">
            {activeTab === 'units'
              ? 'Danh sách Đơn vị quản lý cơ giới (27 đơn vị theo KLH Koun Mom)'
              : activeTab === 'managers'
                ? 'Danh sách Đội trưởng & Quản lý cơ giới'
                : activeTab === 'regions'
                  ? 'Danh sách Khu vực quản lý chung (4 phân vùng)'
                  : 'Danh sách Khu vực & Bãi xe'}
          </span>
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800">
            {(activeTab === 'units' || activeTab === 'managers' ? filteredTeams.length : activeTab === 'regions' ? filteredOwners.length : filteredLocations.length).toLocaleString('vi-VN')} bản ghi
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-500 text-[11px] font-semibold">Chế độ hiển thị:</span>
          <button
            type="button"
            onClick={() => setTableViewMode('full')}
            className={`rounded-lg px-2.5 py-1 font-bold transition-all cursor-pointer ${tableViewMode === 'full'
                ? 'bg-[#154E2C] text-white shadow-xs'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
              }`}
          >
            Toàn bộ Cột Chi tiết
          </button>
          <button
            type="button"
            onClick={() => setTableViewMode('compact')}
            className={`rounded-lg px-2.5 py-1 font-bold transition-all cursor-pointer ${tableViewMode === 'compact'
                ? 'bg-[#154E2C] text-white shadow-xs'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
              }`}
          >
            Bảng Vận Hành Thu Gọn
          </button>
        </div>
      </div>

      <div className="p-4 pt-1">
        {activeTab === 'units' && (
          <DataTable
            data={filteredTeams}
            columns={unitColumns(tableViewMode === 'compact')}
            isLoading={loading}
            showSearch={false}
            showExport={false}
            useGlobalFilters={false}
            pageSize={30}
          />
        )}
        {activeTab === 'managers' && (
          <DataTable
            data={filteredTeams}
            columns={managerColumns()}
            isLoading={loading}
            showSearch={false}
            showExport={false}
            useGlobalFilters={false}
            pageSize={30}
          />
        )}
        {activeTab === 'regions' && (
          <DataTable
            data={filteredOwners}
            columns={regionColumns()}
            isLoading={loading}
            showSearch={false}
            showExport={false}
            useGlobalFilters={false}
            pageSize={20}
          />
        )}
        {activeTab === 'areas' && (
          <DataTable
            data={filteredLocations}
            columns={areaColumns(tableViewMode === 'compact')}
            isLoading={loading}
            showSearch={false}
            showExport={false}
            useGlobalFilters={false}
            pageSize={20}
          />
        )}
      </div>
    </section>

    {/* MODAL 1: ĐƠN VỊ QUẢN LÝ CƠ GIỚI (TAB UNITS) */}
    <Modal
      isOpen={unitModal}
      onClose={() => setUnitModal(false)}
      title={editingUnit ? 'Chỉnh sửa Đơn vị quản lý cơ giới' : 'Thêm mới Đơn vị quản lý cơ giới'}
      size="lg"
      footer={
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setUnitModal(false)}>Hủy</Button>
          <Button onClick={() => void saveUnit()} disabled={unitSaving}>{unitSaving ? 'Đang lưu...' : 'Lưu Đơn vị'}</Button>
        </div>
      }
    >
      <div className="mb-3 rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-900 flex items-center gap-2">
        <Building2 className="w-4 h-4 text-emerald-700 shrink-0" />
        <span><strong>Đơn vị quản lý cơ giới:</strong> Quản lý các đơn vị, đội thi công, xí nghiệp trực tiếp vận hành phương tiện theo từng khu vực.</span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-bold text-slate-700">
          Khu liên hợp *
          <div className="mt-1">
            <SearchableSelect
              value={unitForm.complexCode}
              disabled={!!editingUnit}
              emptyValue=""
              emptyOptionLabel="-- Chọn Khu liên hợp --"
              onChange={(val) => setUnitForm({ ...unitForm, complexCode: val, parentId: '', mainDepotId: '', mainDepotName: '' })}
              options={complexes.map((item) => ({
                value: item.code,
                label: `${item.name} (${item.code})`,
              }))}
              placeholder="-- Gõ tìm kiếm hoặc chọn Khu liên hợp --"
              heightClass="h-10"
              roundedClass="rounded-xl"
              bgClass="bg-white"
            />
          </div>
        </label>

        <label className="text-xs font-bold text-slate-700">
          Khu vực quản lý chung trực thuộc *
          <div className="mt-1">
            <SearchableSelect
              value={unitForm.parentId}
              emptyValue=""
              emptyOptionLabel="-- Chọn Khu vực quản lý chung --"
              onChange={(val) => setUnitForm({ ...unitForm, parentId: val })}
              options={owners
                .filter((item) => item.complexCode === (unitForm.complexCode || 'KOUN_MOM') && item.status === 'ACTIVE')
                .map((item) => ({
                  value: String(item.id),
                  label: `${item.code} · ${item.name}`,
                  subLabel: item.complexCode,
                }))}
              placeholder="-- Gõ tìm kiếm hoặc chọn Khu vực quản lý chung --"
              heightClass="h-10"
              roundedClass="rounded-xl"
              bgClass="bg-white"
            />
          </div>
        </label>

        <label className="text-xs font-bold text-slate-700">
          Mã Đơn vị quản lý *
          <input
            type="text"
            className={`${inputClassName} mt-1 font-mono uppercase font-bold`}
            placeholder="VD: XN-KM-DP-D1"
            value={unitForm.code}
            disabled={!!editingUnit}
            onChange={(event) => setUnitForm({ ...unitForm, code: event.target.value.toUpperCase() })}
          />
        </label>

        <label className="text-xs font-bold text-slate-700">
          Tên Đơn vị quản lý *
          <input
            type="text"
            className={`${inputClassName} mt-1 font-medium`}
            placeholder="VD: Đội 1 (DP1 - Khóm 1 & 2)"
            value={unitForm.name}
            onChange={(event) => setUnitForm({ ...unitForm, name: event.target.value })}
          />
        </label>

        <label className="text-xs font-bold text-slate-700">
          Bãi xe / Nơi tập kết mặc định
          <div className="mt-1">
            <SearchableSelect
              value={unitForm.mainDepotName}
              allowCustomInput={true}
              emptyValue=""
              emptyOptionLabel="-- Chọn hoặc gõ bãi xe tập kết --"
              onChange={(val) => {
                const effectiveComplex = unitForm.complexCode || 'KOUN_MOM';
                const matched = locations.find(
                  (l) => l.complexCode === effectiveComplex &&
                    (l.name.toLowerCase() === val.trim().toLowerCase() || l.code.toLowerCase() === val.trim().toLowerCase())
                );
                setUnitForm({
                  ...unitForm,
                  mainDepotName: val,
                  mainDepotId: matched ? String(matched.id) : '',
                });
              }}
              options={locations
                .filter((item) => item.complexCode === (unitForm.complexCode || 'KOUN_MOM') && item.active)
                .map((item) => ({
                  value: item.name,
                  label: item.name,
                  subLabel: `${item.code} · ${item.regionName || 'Bãi xe'}`,
                }))}
              placeholder="-- Gõ tìm kiếm hoặc chọn Bãi xe / Nơi tập kết --"
              heightClass="h-10"
              roundedClass="rounded-xl"
              bgClass="bg-white"
            />
          </div>
        </label>

        <label className="text-xs font-bold text-slate-700">
          Trạng thái
          <div className="mt-1">
            <SearchableSelect
              value={unitForm.status}
              emptyValue=""
              emptyOptionLabel="-- Chọn Trạng thái --"
              onChange={(val) => setUnitForm({ ...unitForm, status: val as 'ACTIVE' | 'INACTIVE' })}
              options={[
                { value: 'ACTIVE', label: 'Còn hoạt động' },
                { value: 'INACTIVE', label: 'Ngưng hoạt động' },
              ]}
              placeholder="-- Chọn Trạng thái --"
              heightClass="h-10"
              roundedClass="rounded-xl"
              bgClass="bg-white"
            />
          </div>
        </label>

        <label className="text-xs font-bold text-slate-700 sm:col-span-2">
          Mô tả / Ghi chú
          <textarea
            rows={2}
            className={`${textareaClassName} mt-1`}
            placeholder="Ghi chú thêm về đơn vị..."
            value={unitForm.description}
            onChange={(event) => setUnitForm({ ...unitForm, description: event.target.value })}
          />
        </label>
      </div>
    </Modal>

    {/* MODAL 2: ĐỘI TRƯỞNG & NGƯỜI PHỤ TRÁCH (TAB MANAGERS) */}
    <Modal
      isOpen={managerModal}
      onClose={() => setManagerModal(false)}
      title={editingManagerUnit ? 'Cập nhật Người phụ trách / Đội trưởng cơ giới' : 'Phân công Người phụ trách / Đội trưởng cơ giới'}
      size="lg"
      footer={
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setManagerModal(false)}>Hủy</Button>
          <Button onClick={() => void saveManager()} disabled={managerSaving}>{managerSaving ? 'Đang lưu...' : 'Lưu Phân công'}</Button>
        </div>
      }
    >
      <div className="mb-3 rounded-xl bg-blue-50 border border-blue-200 p-3 text-xs text-blue-900 flex items-center gap-2">
        <Users className="w-4 h-4 text-blue-700 shrink-0" />
        <span><strong>Thông tin Đội trưởng / Người phụ trách:</strong> Khai báo thông tin cán bộ phụ trách, số điện thoại Zalo và địa bàn tập kết phương tiện.</span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {/* 1. KHU LIÊN HỢP */}
        <label className="text-xs font-bold text-slate-700 sm:col-span-2">
          Khu liên hợp *
          <div className="mt-1">
            <SearchableSelect
              value={managerForm.complexCode}
              disabled={!!editingManagerUnit}
              emptyValue=""
              emptyOptionLabel="-- Chọn Khu liên hợp --"
              onChange={(newComplex) => {
                setManagerForm({
                  ...managerForm,
                  complexCode: newComplex,
                  unitId: '',
                  mainDepotId: '',
                  mainDepotName: '',
                });
              }}
              options={complexes.map((item) => ({
                value: item.code,
                label: `${item.name} (${item.code})`,
              }))}
              placeholder="-- Gõ tìm kiếm hoặc chọn Khu liên hợp --"
              heightClass="h-10"
              roundedClass="rounded-xl"
              bgClass="bg-white"
            />
          </div>
        </label>

        {/* 2. ĐƠN VỊ QUẢN LÝ CƠ GIỚI PHỤ TRÁCH (Lọc theo KLH đã chọn & Chỉ hiện đơn vị còn trống) */}
        <label className="text-xs font-bold text-slate-700 sm:col-span-2">
          Đơn vị quản lý cơ giới phụ trách *
          <div className="mt-1">
            <SearchableSelect
              value={managerForm.unitId}
              disabled={!!editingManagerUnit}
              emptyValue=""
              emptyOptionLabel="-- Chọn Đơn vị quản lý cơ giới --"
              onChange={(selectedId) => {
                const u = teams.find((t) => String(t.id) === selectedId);
                setManagerForm({
                  ...managerForm,
                  unitId: selectedId,
                  complexCode: u?.complexCode || managerForm.complexCode,
                  managerName: u?.managerName || u?.currentManager?.manager?.fullName || managerForm.managerName,
                  managerPhone: u?.managerPhone || u?.currentManager?.manager?.phone || managerForm.managerPhone,
                  mainDepotName: u?.mainDepot?.name || '',
                  mainDepotId: String(u?.mainDepotId || u?.mainDepot?.id || ''),
                });
              }}
              options={teams
                .filter((item) => {
                  const matchComplex = !managerForm.complexCode || managerForm.complexCode === 'ALL' || item.complexCode === managerForm.complexCode;
                  const isActive = item.status === 'ACTIVE';
                  if (!matchComplex || !isActive) return false;
                  if (editingManagerUnit && item.id === editingManagerUnit.id) return true;
                  const hasManager = Boolean(item.managerName?.trim() || item.currentManager?.manager?.fullName?.trim());
                  return !hasManager;
                })
                .map((item) => ({
                  value: String(item.id),
                  label: `${item.name} (${item.code})`,
                  subLabel: `Thuộc ${item.parent?.name || 'Khu vực'}`,
                }))}
              placeholder="-- Gõ tìm kiếm hoặc chọn Đơn vị quản lý cơ giới --"
              heightClass="h-10"
              roundedClass="rounded-xl"
              bgClass="bg-white"
            />
          </div>
        </label>

        {managerForm.unitId && (() => {
          const selectedUnit = teams.find((t) => String(t.id) === managerForm.unitId);
          return (
            <div className="sm:col-span-2 rounded-xl bg-slate-100 border border-slate-200 p-2.5 text-xs text-slate-700 flex flex-wrap items-center justify-between gap-2">
              <span>Khu vực quản lý: <strong className="text-slate-900">{selectedUnit?.parent?.name || '—'}</strong></span>
              <span>Mã đơn vị: <strong className="font-mono text-emerald-800">{selectedUnit?.code}</strong></span>
              <span>Quy mô TB: <strong className="text-emerald-700">{selectedUnit?.totalEquipmentCount || 0} thiết bị</strong></span>
            </div>
          );
        })()}

        {/* 3. HỌ VÀ TÊN ĐỘI TRƯỞNG / NGƯỜI PHỤ TRÁCH (Lấy từ API /phan-quyen/nhan-vien) */}
        <label className="text-xs font-bold text-slate-700">
          Họ và tên Đội trưởng / Người phụ trách *
          <div className="mt-1">
            <SearchableSelect
              value={managerForm.managerName}
              allowCustomInput={true}
              emptyValue=""
              emptyOptionLabel="-- Bỏ chọn người phụ trách --"
              onChange={(val) => {
                const matchedEmp = availableEmployees.find(
                  (e) => (e.fullName || '').trim().toLowerCase() === val.trim().toLowerCase() ||
                         (e.empCode || '').trim().toLowerCase() === val.trim().toLowerCase()
                );
                if (matchedEmp) {
                  setManagerForm({
                    ...managerForm,
                    managerName: matchedEmp.fullName,
                    managerPhone: matchedEmp.phone || managerForm.managerPhone,
                    roleTitle: matchedEmp.position || managerForm.roleTitle || 'Đội trưởng cơ giới',
                  });
                } else {
                  setManagerForm({
                    ...managerForm,
                    managerName: val,
                  });
                }
              }}
              options={availableEmployees.map((emp) => ({
                value: emp.fullName,
                label: emp.fullName,
                subLabel: `${emp.empCode} · ${emp.position || 'Nhân sự'}${emp.phone ? ` · SĐT: ${emp.phone}` : ''}`,
              }))}
              placeholder="-- Gõ tìm kiếm hoặc chọn Đội trưởng / Người phụ trách --"
              heightClass="h-10"
              roundedClass="rounded-xl"
              bgClass="bg-white"
            />
          </div>
        </label>

        <label className="text-xs font-bold text-slate-700">
          Số điện thoại / Zalo liên hệ *
          <input
            type="tel"
            className={`${inputClassName} mt-1 font-mono font-medium`}
            placeholder="VD: 0912.345.678"
            value={managerForm.managerPhone}
            onChange={(event) => setManagerForm({ ...managerForm, managerPhone: event.target.value })}
          />
        </label>

        <label className="text-xs font-bold text-slate-700">
          Chức vụ / Vai trò phụ trách
          <div className="mt-1">
            <SearchableSelect
              value={managerForm.roleTitle}
              allowCustomInput={true}
              emptyValue=""
              emptyOptionLabel="-- Chọn hoặc gõ chức vụ --"
              onChange={(val) => setManagerForm({ ...managerForm, roleTitle: val })}
              options={[
                { value: 'Đội trưởng cơ giới', label: 'Đội trưởng cơ giới' },
                { value: 'Đội phó cơ giới', label: 'Đội phó cơ giới' },
                { value: 'Phụ trách cơ giới', label: 'Phụ trách cơ giới' },
                { value: 'Quản lý máy móc thiết bị', label: 'Quản lý máy móc thiết bị' },
                { value: 'Trưởng xưởng cơ khí', label: 'Trưởng xưởng cơ khí' },
                { value: 'Trưởng ca trạm trộn', label: 'Trưởng ca trạm trộn' },
              ]}
              placeholder="-- Gõ tìm kiếm hoặc chọn Chức vụ --"
              heightClass="h-10"
              roundedClass="rounded-xl"
              bgClass="bg-white"
            />
          </div>
        </label>

        <label className="text-xs font-bold text-slate-700">
          Địa chỉ công trường / Nơi tập kết
          <div className="mt-1">
            <SearchableSelect
              value={managerForm.mainDepotName}
              allowCustomInput={true}
              emptyValue=""
              emptyOptionLabel="-- Chọn hoặc gõ nơi tập kết --"
              onChange={(val) => {
                const targetUnit = teams.find((t) => String(t.id) === managerForm.unitId);
                const effectiveComplex = targetUnit?.complexCode || managerForm.complexCode || 'KOUN_MOM';
                const matched = locations.find(
                  (l) => l.complexCode === effectiveComplex &&
                    (l.name.toLowerCase() === val.trim().toLowerCase() || l.code.toLowerCase() === val.trim().toLowerCase())
                );
                setManagerForm({
                  ...managerForm,
                  mainDepotName: val,
                  mainDepotId: matched ? String(matched.id) : '',
                });
              }}
              options={locations
                .filter((item) => {
                  const targetUnit = teams.find((t) => String(t.id) === managerForm.unitId);
                  const effectiveComplex = targetUnit?.complexCode || managerForm.complexCode || 'KOUN_MOM';
                  return item.complexCode === effectiveComplex && item.active;
                })
                .map((item) => ({
                  value: item.name,
                  label: item.name,
                  subLabel: `${item.code} · ${item.regionName || 'Bãi xe'}`,
                }))}
              placeholder="-- Gõ tìm kiếm hoặc chọn Nơi tập kết / Bãi xe --"
              heightClass="h-10"
              roundedClass="rounded-xl"
              bgClass="bg-white"
            />
          </div>
        </label>

        <label className="text-xs font-bold text-slate-700 sm:col-span-2">
          Ghi chú phân công
          <textarea
            rows={2}
            className={`${textareaClassName} mt-1`}
            placeholder="Ghi chú phân công, nhiệm vụ cụ thể..."
            value={managerForm.notes}
            onChange={(event) => setManagerForm({ ...managerForm, notes: event.target.value })}
          />
        </label>
      </div>
    </Modal>

    {/* MODAL 3: KHU VỰC QUẢN LÝ CHUNG (TAB REGIONS) */}
    <Modal
      isOpen={regionModal}
      onClose={() => setRegionModal(false)}
      title={editingRegion ? 'Chỉnh sửa Khu vực quản lý chung' : 'Thêm mới Khu vực quản lý chung'}
      size="lg"
      footer={
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setRegionModal(false)}>Hủy</Button>
          <Button onClick={() => void saveRegion()} disabled={regionSaving}>{regionSaving ? 'Đang lưu...' : 'Lưu Khu vực'}</Button>
        </div>
      }
    >
      <div className="mb-3 rounded-xl bg-purple-50 border border-purple-200 p-3 text-xs text-purple-900 flex items-center gap-2">
        <Layers className="w-4 h-4 text-purple-700 shrink-0" />
        <span><strong>Khu vực quản lý chung:</strong> Phân vùng cấp 1 (Xí nghiệp / Ban) trực thuộc Khu liên hợp để gom nhóm các Đơn vị quản lý cơ giới.</span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-bold text-slate-700">
          Khu liên hợp *
          <div className="mt-1">
            <SearchableSelect
              value={regionForm.complexCode}
              disabled={!!editingRegion}
              emptyValue=""
              emptyOptionLabel="-- Chọn Khu liên hợp --"
              onChange={(val) => setRegionForm({ ...regionForm, complexCode: val })}
              options={complexes.map((item) => ({
                value: item.code,
                label: `${item.name} (${item.code})`,
              }))}
              placeholder="-- Gõ tìm kiếm hoặc chọn Khu liên hợp --"
              heightClass="h-10"
              roundedClass="rounded-xl"
              bgClass="bg-white"
            />
          </div>
        </label>

        <label className="text-xs font-bold text-slate-700">
          Mã Khu vực quản lý chung *
          <input
            type="text"
            className={`${inputClassName} mt-1 font-mono uppercase font-bold`}
            placeholder="VD: XN-KM-DP"
            value={regionForm.code}
            disabled={!!editingRegion}
            onChange={(event) => setRegionForm({ ...regionForm, code: event.target.value.toUpperCase() })}
          />
        </label>

        <label className="text-xs font-bold text-slate-700 sm:col-span-2">
          Tên Khu vực quản lý chung *
          <input
            type="text"
            className={`${inputClassName} mt-1 font-medium`}
            placeholder="VD: Khu vực Daun Penh (DP)"
            value={regionForm.name}
            onChange={(event) => setRegionForm({ ...regionForm, name: event.target.value })}
          />
        </label>

        <label className="text-xs font-bold text-slate-700">
          Loại khu vực quản lý *
          <div className="mt-1">
            <SearchableSelect
              value={regionForm.unitType}
              emptyValue=""
              emptyOptionLabel="-- Chọn Loại khu vực --"
              onChange={(val) => setRegionForm({ ...regionForm, unitType: val as DriverManagementUnitType })}
              options={Object.entries(OWNER_UNIT_TYPES).map(([value, label]) => ({
                value,
                label,
              }))}
              placeholder="-- Gõ tìm kiếm hoặc chọn Loại khu vực --"
              heightClass="h-10"
              roundedClass="rounded-xl"
              bgClass="bg-white"
            />
          </div>
        </label>

        <label className="text-xs font-bold text-slate-700">
          Trạng thái
          <div className="mt-1">
            <SearchableSelect
              value={regionForm.status}
              emptyValue=""
              emptyOptionLabel="-- Chọn Trạng thái --"
              onChange={(val) => setRegionForm({ ...regionForm, status: val as 'ACTIVE' | 'INACTIVE' })}
              options={[
                { value: 'ACTIVE', label: 'Còn hoạt động' },
                { value: 'INACTIVE', label: 'Ngưng hoạt động' },
              ]}
              placeholder="-- Chọn Trạng thái --"
              heightClass="h-10"
              roundedClass="rounded-xl"
              bgClass="bg-white"
            />
          </div>
        </label>

        <label className="text-xs font-bold text-slate-700 sm:col-span-2">
          Mô tả / Phạm vi địa bàn
          <textarea
            rows={2}
            className={`${textareaClassName} mt-1`}
            placeholder="Mô tả phạm vi hoạt động của khu vực..."
            value={regionForm.description}
            onChange={(event) => setRegionForm({ ...regionForm, description: event.target.value })}
          />
        </label>
      </div>
    </Modal>

    {/* MODAL 4: BÃI XE / NƠI TẬP KẾT (TAB AREAS) */}
    <Modal
      isOpen={locationModal}
      onClose={() => setLocationModal(false)}
      title={editingLocation ? 'Chỉnh sửa Bãi xe / Nơi tập kết' : 'Thêm Bãi xe / Nơi tập kết'}
      size="lg"
      footer={
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setLocationModal(false)}>Hủy</Button>
          <Button onClick={() => void saveLocation()} disabled={locationSaving}>{locationSaving ? 'Đang lưu...' : 'Lưu Bãi xe'}</Button>
        </div>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-bold text-slate-700">
          Khu liên hợp *
          <div className="mt-1">
            <SearchableSelect
              value={locationForm.complexCode}
              emptyValue=""
              emptyOptionLabel="-- Chọn Khu liên hợp --"
              onChange={(val) => setLocationForm({ ...locationForm, complexCode: val, enterpriseCode: '', regionName: '' })}
              options={complexes.map((item) => ({
                value: item.code,
                label: `${item.name} (${item.code})`,
              }))}
              placeholder="-- Gõ tìm kiếm hoặc chọn Khu liên hợp --"
              heightClass="h-10"
              roundedClass="rounded-xl"
              bgClass="bg-white"
            />
          </div>
        </label>

        <label className="text-xs font-bold text-slate-700">
          Khu vực quản lý *
          <div className="mt-1">
            <SearchableSelect
              value={locationForm.regionName}
              emptyValue=""
              emptyOptionLabel="-- Chọn khu vực --"
              onChange={(val) => setLocationForm({ ...locationForm, regionName: val })}
              options={regions
                .filter((item) => item.parentCode === locationForm.complexCode)
                .map((item) => ({
                  value: item.code,
                  label: item.name,
                }))}
              placeholder="-- Gõ tìm kiếm hoặc chọn Khu vực quản lý --"
              heightClass="h-10"
              roundedClass="rounded-xl"
              bgClass="bg-white"
            />
          </div>
        </label>

        <label className="text-xs font-bold text-slate-700">
          Xí nghiệp / Đơn vị quản lý (Khu vực)
          <div className="mt-1">
            <SearchableSelect
              value={locationForm.enterpriseCode}
              emptyValue=""
              emptyOptionLabel="-- Chưa gắn Xí nghiệp --"
              onChange={(val) => setLocationForm({ ...locationForm, enterpriseCode: val })}
              options={owners
                .filter((item) => item.complexCode === locationForm.complexCode)
                .map((item) => ({
                  value: item.code,
                  label: `${item.code} · ${item.name}`,
                }))}
              placeholder="-- Gõ tìm kiếm hoặc chọn Xí nghiệp / Đơn vị quản lý --"
              heightClass="h-10"
              roundedClass="rounded-xl"
              bgClass="bg-white"
            />
          </div>
        </label>

        <label className="text-xs font-bold text-slate-700">
          Mã bãi *
          <input
            type="text"
            className={`${inputClassName} mt-1 font-mono uppercase font-bold`}
            placeholder="VD: LOC-KM-01"
            value={locationForm.code}
            disabled={!!editingLocation}
            onChange={(event) => setLocationForm({ ...locationForm, code: event.target.value.toUpperCase() })}
          />
        </label>

        <label className="text-xs font-bold text-slate-700 sm:col-span-2">
          Tên Bãi / Nơi tập kết *
          <input
            type="text"
            className={`${inputClassName} mt-1 font-medium`}
            placeholder="VD: Lô 21 DP1"
            value={locationForm.name}
            onChange={(event) => setLocationForm({ ...locationForm, name: event.target.value })}
          />
        </label>

        <label className="text-xs font-bold text-slate-700 sm:col-span-2">
          Địa chỉ / Ghi chú
          <textarea
            rows={2}
            className={`${textareaClassName} mt-1`}
            value={locationForm.address}
            onChange={(event) => setLocationForm({ ...locationForm, address: event.target.value })}
          />
        </label>

        <label className="text-xs font-bold text-slate-700">
          Vĩ độ
          <input
            type="number"
            step="any"
            className={`${inputClassName} mt-1`}
            value={locationForm.lat}
            onChange={(event) => setLocationForm({ ...locationForm, lat: event.target.value })}
          />
        </label>

        <label className="text-xs font-bold text-slate-700">
          Kinh độ
          <input
            type="number"
            step="any"
            className={`${inputClassName} mt-1`}
            value={locationForm.lng}
            onChange={(event) => setLocationForm({ ...locationForm, lng: event.target.value })}
          />
        </label>

        <label className="text-xs font-bold text-slate-700">
          Bán kính Geofence (m)
          <input
            type="number"
            min="1"
            className={`${inputClassName} mt-1`}
            value={locationForm.geofenceRadiusM}
            onChange={(event) => setLocationForm({ ...locationForm, geofenceRadiusM: event.target.value })}
          />
        </label>

        <label className="text-xs font-bold text-slate-700">
          Trạng thái
          <div className="mt-1">
            <SearchableSelect
              value={locationForm.active ? 'ACTIVE' : 'INACTIVE'}
              emptyValue=""
              emptyOptionLabel="-- Chọn Trạng thái --"
              onChange={(val) => setLocationForm({ ...locationForm, active: val === 'ACTIVE' })}
              options={[
                { value: 'ACTIVE', label: 'Còn hoạt động' },
                { value: 'INACTIVE', label: 'Ngưng hoạt động' },
              ]}
              placeholder="-- Chọn Trạng thái --"
              heightClass="h-10"
              roundedClass="rounded-xl"
              bgClass="bg-white"
            />
          </div>
        </label>
      </div>
    </Modal>

    {viewItem && <Modal isOpen title={viewItem.title} onClose={() => setViewItem(null)} size="md" hideFooter><dl className="grid grid-cols-[150px_1fr] gap-y-3 text-sm">{viewItem.values.map(([label, value]) => <React.Fragment key={label}><dt className="text-slate-500">{label}</dt><dd className="font-medium text-slate-900">{value}</dd></React.Fragment>)}</dl>{assignments.some((item) => item.managementUnit?.name === viewItem.title) && <div className="mt-5 border-t pt-4"><div className="mb-2 text-xs font-bold uppercase text-emerald-800">Lịch sử người phụ trách</div>{assignments.filter((item) => item.managementUnit?.name === viewItem.title).map((item) => <div key={item.id} className="mb-2 rounded-lg border border-slate-200 px-3 py-2 text-xs"><b>{item.manager?.fullName}</b> · {new Date(item.effectiveFrom).toLocaleDateString('vi-VN')} – {item.effectiveTo ? new Date(item.effectiveTo).toLocaleDateString('vi-VN') : 'hiện tại'}</div>)}</div>}</Modal>}
  </div>;
};
