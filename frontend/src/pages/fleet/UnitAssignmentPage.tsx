import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { DataTable, Column } from '../../components/data-display/DataTable';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { apiClient, apiService } from '../../api/client';
import { catalogsApi } from '../../api/catalogsApi';
import { useAppStore } from '../../store/useAppStore';
import { AuditUserPopover } from '../../components/common/AuditUserPopover';
import { TableRowActions } from '../../components/common/TableRowActions';
import {
  Plus,
  Download,
  Building2,
  Tractor,
  Truck,
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  ArrowRight,
  ArrowRightLeft,
  X,
  Search,
  SlidersHorizontal,
  RefreshCw,
  FileSpreadsheet,
  ExternalLink,
  Users,
  Eye,
  History,
  Calendar,
  MapPin,
  RadioTower,
  Wrench,
  RotateCcw,
  Tag,
  Upload,
  Package,
  PackageCheck,
  Gauge,
} from 'lucide-react';


import { SearchableSelect, SelectOption } from '../../components/common/SearchableSelect';
import { driverManagementApi, DriverManagementUnit } from '../../api/driverManagementApi';
import { buildManagementFilterManagers } from '../../hooks/useManagementFilterCatalog';
import { OperationalLocation, schedulingApi } from '../../api/scheduling';
import { parseOperationalImport, toIsoDate } from '../../utils/operationalExcelTemplates';
import { normalizeMasterDataKey, uniqueMasterDataOptions } from '../../utils/masterDataNormalization';

interface UnitAssignmentRecord {
  id: string;
  code?: string;
  vehicleCode: string;
  plateNumber: string;
  vehicleName?: string;
  vehicleType: string;
  assetGroup?: string;
  complexCode?: string;
  regionCode?: string;
  unitName: string;
  oldUnitName: string;
  oldLocation: string;
  oldManager: string;
  oldManagerPhone?: string;
  driverName: string;
  driverPhone?: string;
  driverCode: string;
  assignedDate: string;
  purpose: string;
  transferHistory?: string;
  status: 'active' | 'newly_assigned' | 'maintenance' | 'repair' | 'unassigned';
}

interface ImplementItemRecord {
  id: number;
  code: string;
  name: string;
  category: string;
  categoryLabel?: string;
  unit: string;
  assignedUnitCode?: string | null;
  gatheringLocation?: string | null;
  managerName?: string | null;
  managerPhone?: string | null;
  status: 'ATTACHED' | 'IN_DEPOT' | 'MAINTENANCE' | 'REPAIR' | 'UNASSIGNED';
  technicalCondition?: string;
  attachedVehicleCode?: string;
  attachedVehicleName?: string;
}

type CardFilter =
  | 'ALL' | 'RUNNING' | 'WAITING' | 'MAINTENANCE' | 'REPAIR' | 'UNASSIGNED_UNIT'
  // Row 2 — Thiết bị phụ trợ / Nông cụ đính kèm (Máy gắn: Dàn cày, Dàn bừa, Rơ-moóc...)
  | 'EQUIP_ALL' | 'EQUIP_RUNNING' | 'EQUIP_WAITING' | 'EQUIP_MAINTENANCE' | 'EQUIP_REPAIR' | 'EQUIP_UNASSIGNED'
  // Row 3 — Tài sản khác (hoạt động độc lập: xe máy, máy phát điện, xe nâng...)
  | 'OTHER_ALL' | 'OTHER_ACTIVE' | 'OTHER_WAITING' | 'OTHER_MAINTENANCE' | 'OTHER_REPAIR' | 'OTHER_UNASSIGNED';

export const UnitAssignmentPage: React.FC = () => {
  const [selectedRecord, setSelectedRecord] = useState<UnitAssignmentRecord | null>(null);
  const [selectedImplement, setSelectedImplement] = useState<ImplementItemRecord | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImplementHandoverModal, setShowImplementHandoverModal] = useState(false);
  const [selectedVehicleIdx, setSelectedVehicleIdx] = useState<number>(0);
  const [selectedImplementIdx, setSelectedImplementIdx] = useState<number>(0);
  const [cardFilter, setCardFilter] = useState<CardFilter>('ALL');
  const [modalVehicleFilter, setModalVehicleFilter] = useState<'ALL' | 'UNASSIGNED' | 'WAITING'>('ALL');
  const [modalImplementFilter, setModalImplementFilter] = useState<'ALL' | 'UNASSIGNED' | 'WAITING'>('ALL');
  
  // Transfer form state linked to master data
  const [newUnit, setNewUnit] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [newManager, setNewManager] = useState('');
  const [managementTeams, setManagementTeams] = useState<DriverManagementUnit[]>([]);
  const [managementLocations, setManagementLocations] = useState<OperationalLocation[]>([]);
  const [sharedFilterOptions, setSharedFilterOptions] = useState<{
    locations: string[];
    implementCategories: Array<{ code: string; count: number }>;
    vehicleTypes: Array<{ code: string; name: string; vehicleCount: number }>;
  }>({ locations: [], implementCategories: [], vehicleTypes: [] });
  const [transferDate, setTransferDate] = useState('2026-08-26');
  const [transferPurpose, setTransferPurpose] = useState('');

  const [assignmentsList, setAssignmentsList] = useState<UnitAssignmentRecord[]>([]);
  const [implementsList, setImplementsList] = useState<ImplementItemRecord[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    assignedUnit: 0,
    running: 0,
    waiting: 0,
    maintenance: 0,
    repair: 0,
    unassignedUnit: 0,
    gpsAttached: 0,
  });
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [importMessage, setImportMessage] = useState('');
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const selectedKLH = useAppStore((state) => state.selectedKLH);

  const [implementStats, setImplementStats] = React.useState({
    total: 1026,
    running: 1006,
    waiting: 0,
    maintenance: 19,
    repair: 20,
    unassigned: 0,
  });

  // Row 3 — Tài sản khác (isAssignable=false)
  const [otherAssetStats, setOtherAssetStats] = React.useState({
    total: 0,
    active: 0,
    waiting: 0,
    maintenance: 0,
    repair: 0,
    unassigned: 0,
  });
  const [otherAssetsList, setOtherAssetsList] = React.useState<UnitAssignmentRecord[]>([]);

  // Memoized options for Select-Text controls with clear category tags
  const vehicleOptions = React.useMemo<SelectOption[]>(() => {
    let list = assignmentsList;
    if (modalVehicleFilter === 'UNASSIGNED') {
      list = assignmentsList.filter(
        (item) => item.unitName === 'Chưa phân bổ' || item.unitName === 'Ban Cơ Giới KLH' || item.unitName.includes('Chưa')
      );
    } else if (modalVehicleFilter === 'WAITING') {
      list = assignmentsList.filter((item) => item.status === 'newly_assigned');
    }

    return list.slice(0, 300).map((item) => {
      const isUnassigned = item.unitName === 'Chưa phân bổ' || item.unitName === 'Ban Cơ Giới KLH';
      const tag = isUnassigned
        ? '⚠️ [Chưa phân bổ]'
        : item.status === 'newly_assigned'
        ? '⏳ [Chờ điều chuyển]'
        : `🚜 [${item.unitName}]`;

      const origIdx = assignmentsList.findIndex((a) => a.id === item.id);

      return {
        value: String(origIdx >= 0 ? origIdx : 0),
        label: `${tag} ${item.vehicleCode} — ${item.vehicleType}`,
        subLabel: `Đơn vị hiện tại: ${item.unitName} | Nơi tập kết: ${item.oldLocation} | ${item.plateNumber || ''}`,
      };
    });
  }, [assignmentsList, modalVehicleFilter]);

  const implementOptions = React.useMemo<SelectOption[]>(() => {
    let list = implementsList;
    if (modalImplementFilter === 'UNASSIGNED') {
      list = implementsList.filter((item) => item.status === 'IN_DEPOT');
    } else if (modalImplementFilter === 'WAITING') {
      list = implementsList.filter((item) => item.status === 'IN_DEPOT');
    }

    return list.slice(0, 300).map((item, idx) => {
      const tag = item.status === 'ATTACHED' ? '🚜 [Đang gắn xe]' : '📦 [Tại bãi kho]';
      const origIdx = implementsList.findIndex((i) => i.id === item.id);
      return {
        value: String(origIdx >= 0 ? origIdx : idx),
        label: `${tag} ${item.code} — ${item.name}`,
        subLabel: `Chủng loại: ${item.categoryLabel} | Đơn vị: ${item.unit} | Nơi tập kết: ${item.gatheringLocation || 'Bãi kho'}`,
      };
    });
  }, [implementsList, modalImplementFilter]);

  const unitOptions = React.useMemo<SelectOption[]>(() => {
    return [
      {
        value: 'Chưa phân bổ',
        label: '⚠️ [Chưa phân bổ] — Thu hồi về Tổng kho / Ban Cơ Giới',
        subLabel: 'Chuyển phương tiện về trạng thái Chưa phân bổ đơn vị',
      },
      ...managementTeams.map((team) => ({
        value: team.code,
        label: team.name,
        subLabel: team.mainDepot?.name ? `Nơi tập kết: ${team.mainDepot.name}` : undefined,
      })),
    ];
  }, [managementTeams]);

  const locationOptions = React.useMemo<SelectOption[]>(() => {
    return managementLocations.map((location) => ({
      value: location.name,
      label: location.name,
    }));
  }, [managementLocations]);

  const managerOptions = React.useMemo<SelectOption[]>(() => {
    return managementTeams.flatMap((team) => {
      const manager = team.currentManager?.manager;
      if (!manager) return [];
      const value = `${manager.fullName} (${manager.phone || ''})`;
      return {
        value,
        label: `${manager.fullName} - ${team.name}${manager.phone ? ` (SĐT: ${manager.phone})` : ''}`,
        subLabel: team.mainDepot?.name ? `Nơi tập kết: ${team.mainDepot.name}` : undefined,
      };
    });
  }, [managementTeams]);

  // Handle when selecting or typing a Unit
  const handleSelectNewUnit = (unitName: string) => {
    setNewUnit(unitName);
    if (!unitName || unitName === 'Chưa phân bổ' || unitName.includes('Chưa phân bổ')) {
      setNewLocation('Tổng kho KLH');
      setNewManager('Chờ phân bổ đơn vị');
      return;
    }
    const matched = managementTeams.find(
      (team) => team.code.toLowerCase() === unitName.toLowerCase() || team.name.toLowerCase() === unitName.toLowerCase()
    );
    if (matched) {
      if (matched.mainDepot?.name) setNewLocation(matched.mainDepot.name);
      if (matched.currentManager?.manager) {
        const manager = matched.currentManager.manager;
        setNewManager(`${manager.fullName} (${manager.phone || ''})`);
      } else {
        setNewManager('');
      }
    }
  };

  // Handle when selecting or typing a Location
  const handleSelectNewLocation = (locationText: string) => {
    setNewLocation(locationText);
    const matched = managementTeams.find(
      (team) => team.mainDepot?.name.toLowerCase() === locationText.toLowerCase()
    );
    if (matched) {
      setNewUnit(matched.code);
      if (matched.currentManager?.manager) {
        const manager = matched.currentManager.manager;
        setNewManager(`${manager.fullName} (${manager.phone || ''})`);
      }
    }
  };

  // Handle when selecting or typing a Manager
  const handleSelectNewManager = (managerText: string) => {
    setNewManager(managerText);
    const matched = managementTeams.find(
      (team) => team.currentManager?.manager &&
        (`${team.currentManager.manager.fullName} (${team.currentManager.manager.phone || ''})`.toLowerCase() === managerText.toLowerCase() ||
          team.currentManager.manager.fullName.toLowerCase() === managerText.toLowerCase())
    );
    if (matched) {
      setNewUnit(matched.code);
      if (matched.mainDepot?.name) setNewLocation(matched.mainDepot.name);
    }
  };

  const [submittingHandover, setSubmittingHandover] = useState(false);

  // Ký quyết định bàn giao xe cơ giới (Giao cho đơn vị mới hoặc Chuyển về Chưa phân bổ)
  const handleVehicleHandover = async () => {
    if (!currentSelectedVehicle) return;
    try {
      setSubmittingHandover(true);
      const isUnassigning = !newUnit || newUnit === 'Chưa phân bổ' || newUnit.includes('Chưa phân bổ') || newUnit.includes('Chưa');
      const unitVal = isUnassigning ? 'Chưa phân bổ' : newUnit;
      const parsedManagerName = isUnassigning ? 'Chờ phân bổ đơn vị' : (newManager.replace(/\s*\([^)]*\)/, '').trim() || 'Chưa gán NS quản lý');
      const parsedManagerPhone = isUnassigning ? '' : (newManager.match(/\(([^)]+)\)/)?.[1] || '');
      const locationVal = isUnassigning ? 'Tổng kho KLH' : (newLocation || currentSelectedVehicle.oldLocation || 'Bãi xe Trung tâm');
      const selectedTeam = managementTeams.find((team) => team.code === newUnit || team.name === newUnit);

      const numericId = parseInt(currentSelectedVehicle.id.replace(/\D/g, ''), 10);
      if (!isNaN(numericId)) {
        await apiService.updateVehicle(numericId, {
          assignedUnitCode: isUnassigning ? null : newUnit,
          managementUnitId: isUnassigning ? null : selectedTeam?.id,
          currentLocationName: locationVal,
          managerName: parsedManagerName,
          managerPhone: parsedManagerPhone,
          notes: transferPurpose ? `${currentSelectedVehicle.purpose ? currentSelectedVehicle.purpose + ' | ' : ''}Bàn giao: ${transferPurpose}` : currentSelectedVehicle.purpose,
          status: isUnassigning ? 'CHO_PHAN_CONG' : 'HOAT_DONG',
        });
      }

      const now = new Date();
      const hours = String(now.getHours()).padStart(2, '0');
      const mins = String(now.getMinutes()).padStart(2, '0');
      const tDate = new Date(transferDate);
      const day = isNaN(tDate.getTime()) ? String(now.getDate()).padStart(2, '0') : String(tDate.getDate()).padStart(2, '0');
      const month = isNaN(tDate.getTime()) ? String(now.getMonth() + 1).padStart(2, '0') : String(tDate.getMonth() + 1).padStart(2, '0');
      const year = isNaN(tDate.getTime()) ? now.getFullYear() : tDate.getFullYear();
      const fullDateTime = `${hours}:${mins} ${day}/${month}/${year}`;

      setAssignmentsList((prev) =>
        prev.map((item) => {
          if (item.id === currentSelectedVehicle.id) {
            return {
              ...item,
              oldUnitName: item.unitName,
              oldLocation: locationVal,
              unitName: unitVal,
              driverName: parsedManagerName,
              driverPhone: parsedManagerPhone,
              purpose: transferPurpose || item.purpose,
              status: isUnassigning ? ('unassigned' as const) : ('active' as const),
              assignedDate: fullDateTime,
            };
          }
          return item;
        })
      );

      // Cập nhật lại số liệu thống kê
      apiClient.get('/vehicles/statistics').then((statRes: any) => {
        const statData = statRes?.data?.data || statRes?.data;
        if (statData) {
          setStats({
            total: statData.totalVehicles || 0,
            assignedUnit: statData.assignedUnit || 0,
            running: statData.running || 0,
            waiting: statData.waitingDispatch || 0,
            maintenance: statData.maintenance || 0,
            repair: statData.repair || 0,
            unassignedUnit: statData.unassignedUnit || 0,
            gpsAttached: statData.gpsAttached || 0,
          });
        }
      }).catch(() => null);

      setShowAddModal(false);
    } catch (err) {
      console.error('Vehicle handover error:', err);
    } finally {
      setSubmittingHandover(false);
    }
  };

  // Ký quyết định bàn giao Nông cụ / Thiết bị đính kèm
  const handleImplementHandover = async () => {
    const currentImp = implementsList[selectedImplementIdx];
    if (!currentImp) return;
    try {
      setSubmittingHandover(true);
      const isUnassigning = !newUnit || newUnit === 'Chưa phân bổ' || newUnit.includes('Chưa phân bổ') || newUnit.includes('Chưa');
      const unitVal = isUnassigning ? 'Chưa phân bổ' : newUnit;
      const parsedManagerName = isUnassigning ? 'Chờ phân bổ đơn vị' : (newManager.replace(/\s*\([^)]*\)/, '').trim() || 'Chưa gán NS quản lý');
      const parsedManagerPhone = isUnassigning ? '' : (newManager.match(/\(([^)]+)\)/)?.[1] || '');
      const locationVal = isUnassigning ? 'Bãi tập kết Tổng kho' : (newLocation || currentImp.gatheringLocation || 'Bãi tập kết');

      if (currentImp.id) {
        await apiClient.patch(`/implements/${currentImp.id}`, {
          unit: isUnassigning ? 'KOUN_MOM' : 'KOUN_MOM',
          assignedUnitCode: isUnassigning ? null : newUnit,
          gatheringLocation: locationVal,
          managerName: parsedManagerName,
          managerPhone: parsedManagerPhone,
        }).catch(() => null);
      }

      setImplementsList((prev) => {
        const next = prev.map((item) => {
          if (item.id === currentImp.id) {
            return {
              ...item,
              unit: unitVal,
              assignedUnitCode: isUnassigning ? null : newUnit,
              gatheringLocation: locationVal,
              managerName: parsedManagerName,
              managerPhone: parsedManagerPhone,
              status: isUnassigning ? ('UNASSIGNED' as const) : ('ATTACHED' as const),
            };
          }
          return item;
        });
        const unassignedCount = next.filter((i) => i.status === 'UNASSIGNED').length;
        const maintCount = next.filter((i) => i.status === 'MAINTENANCE').length;
        const repairCount = next.filter((i) => i.status === 'REPAIR').length;
        const runningCount = next.length - maintCount - repairCount - unassignedCount;
        setImplementStats((s) => ({
          ...s,
          running: runningCount,
          unassigned: unassignedCount,
        }));
        return next;
      });

      setShowImplementHandoverModal(false);
    } catch (err) {
      console.error('Implement handover error:', err);
    } finally {
      setSubmittingHandover(false);
    }
  };

  const fetchAssignments = React.useCallback(async () => {
    setLoading(true);

    const complexParam = selectedKLH !== 'ALL' ? selectedKLH : undefined;
    const [teams, locations] = await Promise.all([
      driverManagementApi.getUnits({ level: 'TEAM', status: 'ACTIVE', complexCode: complexParam }),
      schedulingApi.locations({ type: 'DEPOT', active: true, complexCode: complexParam }),
    ]).catch(() => [[], []] as [DriverManagementUnit[], OperationalLocation[]]);
    setManagementTeams(teams);
    setManagementLocations(locations);

    Promise.all([
      apiService.getVehicleFilterOptions({ complexCode: complexParam, isAssignable: true }),
      apiService.getImplementFilterOptions({ unit: complexParam }),
    ]).then(([vehicleOptions, implementOptions]) => setSharedFilterOptions({
      locations: uniqueMasterDataOptions([...(vehicleOptions.locations || []), ...(implementOptions.locations || []), ...locations.map((location) => location.name)]),
      implementCategories: implementOptions.categories || [],
      vehicleTypes: vehicleOptions.vehicleTypes || [],
    })).catch(() => null);

    // 1. Fetch statistics for vehicles
    apiClient
      .get('/vehicles/statistics', { params: { complexCode: complexParam, isAssignable: true } })
      .then((statRes) => {
        const statData = statRes?.data?.data || statRes?.data;
        if (statData) {
          setStats({
            total: statData.totalVehicles || 0,
            assignedUnit: statData.assignedUnit || 0,
            running: statData.running || 0,
            waiting: statData.waitingDispatch || 0,
            maintenance: statData.maintenance || 0,
            repair: statData.repair || 0,
            unassignedUnit: statData.unassignedUnit || 0,
            gpsAttached: statData.gpsAttached || 0,
          });
        }
      })
      .catch(() => null);

    // 1.1. Fetch statistics for Agricultural Implements (Row 2 — 1.026 thiết bị phụ trợ & nông cụ)
    apiService
      .getImplementStatistics()
      .then((data) => {
        if (data) {
          const total = data.totalImplements || 1026;
          const maint = data.condition?.wornOut ?? (data.maintenance || 19);
          const rep = data.condition?.needRepair || 16;
          const unassigned = data.unassignedUnit ?? 336;
          const waiting = 0;
          const running = total - maint - rep - waiting - unassigned;
          setImplementStats({
            total,
            running,
            waiting,
            maintenance: maint,
            repair: rep,
            unassigned,
          });
        }
      })
      .catch(() => null);

    // 1.2. Fetch all implements for table display
    apiService
      .getAllImplements()
      .then((res) => {
        const items = res?.items || [];
        if (Array.isArray(items)) {
          const CATEGORY_NAMES: Record<string, string> = {
            DAN_CAY: 'Dàn cày nông nghiệp',
            DAN_BUA: 'Dàn bừa làm đất',
            DAN_XOI: 'Dàn xới đất',
            DAN_RAI_PHAN: 'Dàn rải phân & vôi',
            RO_MOOC: 'Rơ-moóc & Moóc kéo',
            DAN_PHUN_THUOC: 'Dàn phun thuốc',
          };
          const mapped: ImplementItemRecord[] = items.map((it: any) => {
            const isMaintenance = it.technicalCondition === 'WORN_OUT';
            const isRepair = it.technicalCondition === 'NEED_REPAIR' || (it.status === 'MAINTENANCE' && it.technicalCondition !== 'WORN_OUT');
            const isUnassigned = !it.assignedUnitCode || it.assignedUnitCode === 'Chưa phân bổ' || it.assignedUnitCode.trim() === '';
            return {
              id: it.id,
              code: it.code,
              name: it.name,
              category: it.category,
              categoryLabel: CATEGORY_NAMES[it.category] || it.category,
              unit: isUnassigned ? 'Chưa phân bổ' : (it.assignedUnitCode || 'Chưa phân bổ'),
              assignedUnitCode: it.assignedUnitCode || null,
              gatheringLocation: it.gatheringLocation || null,
              managerName: it.managementUnit?.managerAssignments?.[0]?.manager?.fullName || it.managerName || null,
              managerPhone: it.managementUnit?.managerAssignments?.[0]?.manager?.phone || it.managerPhone || null,
              status: isUnassigned
                ? 'UNASSIGNED'
                : isMaintenance
                ? 'MAINTENANCE'
                : isRepair
                ? 'REPAIR'
                : (it.status || 'IN_DEPOT'),
              technicalCondition: it.technicalCondition,
              attachedVehicleCode: it.currentVehicle ? it.currentVehicle.code : undefined,
              attachedVehicleName: it.currentVehicle ? it.currentVehicle.name : undefined,
            };
          });
          setImplementsList(mapped);

          // Cập nhật lại implementStats từ danh sách thực để đảm bảo độ chính xác tuyệt đối
          const unassignedCount = mapped.filter((i) => i.status === 'UNASSIGNED').length;
          const maintCount = mapped.filter((i) => i.status === 'MAINTENANCE').length;
          const repairCount = mapped.filter((i) => i.status === 'REPAIR').length;
          const runningCount = mapped.length - maintCount - repairCount - unassignedCount;
          setImplementStats((prev) => ({
            ...prev,
            total: mapped.length,
            running: runningCount,
            maintenance: maintCount,
            repair: repairCount,
            unassigned: unassignedCount,
          }));
        }
      })
      .catch(() => null);

    // 2. Fetch vehicle list for table
    try {
      const res = await apiClient.get('/vehicles/assignments', {
        params: { limit: 4000, complexCode: complexParam, isAssignable: true },
      });
      const items = res.data?.data?.items || res.data?.items || res.data || [];

      if (Array.isArray(items) && items.length > 0) {
        const mapped: UnitAssignmentRecord[] = items.map((v: any) => {
          const isUnassigned = !v.assignedUnitCode || v.assignedUnitCode.trim() === '';
          const matchedTeam = !isUnassigned
            ? teams.find((team) =>
                team.id === v.managementUnitId ||
                team.code.toLowerCase() === (v.assignedUnitCode || v.unit || '').toLowerCase() ||
                team.name.toLowerCase() === (v.assignedUnitCode || v.unit || '').toLowerCase()
              )
            : undefined;

          const unitName = isUnassigned
            ? 'Chưa phân bổ'
            : matchedTeam?.name || v.assignedUnitCode || v.unit || 'Chưa phân bổ';

          const managerName = matchedTeam?.currentManager?.manager?.fullName || v.managerName || '';
          const managerPhone = matchedTeam?.currentManager?.manager?.phone || v.managerPhone || '';

          const oldManagerName = managerName || (isUnassigned ? 'Tổng kho / Ban Cơ Giới' : 'Chưa gán quản lý');
          const oldManagerPhone = managerPhone;

          const driverName = isUnassigned
            ? 'Chờ phân bổ đơn vị'
            : (managerName || v.defaultDriver?.fullName || 'Chưa gán NS quản lý');
          const driverPhone = isUnassigned ? '' : (managerPhone || v.defaultDriver?.phone || '');

          let fullDateTime = '07:00 26/08/2026';
          if (v.allocationDate || v.updatedAt || v.createdAt) {
            const rawD = new Date(v.allocationDate || v.updatedAt || v.createdAt);
            if (!isNaN(rawD.getTime())) {
              let h = rawD.getHours();
              let m = rawD.getMinutes();
              if (h === 0 && m === 0) {
                h = 7;
                m = 0;
              }
              const hStr = String(h).padStart(2, '0');
              const mStr = String(m).padStart(2, '0');
              const d = String(rawD.getDate()).padStart(2, '0');
              const mo = String(rawD.getMonth() + 1).padStart(2, '0');
              const y = rawD.getFullYear();
              fullDateTime = `${hStr}:${mStr} ${d}/${mo}/${y}`;
            }
          }

          const vTypeName = v.vehicleType?.name || v.category || 'Xe / máy chuyên dùng';
          return {
            id: `ASG-${v.id}`,
            code: v.code,
            vehicleCode: v.code,
            plateNumber: v.plate || '—',
            vehicleType: vTypeName,
            vehicleName: v.name,
            assetGroup: v.assetGroup || v.vehicleType?.assetGroup || 'THIET_BI_PHU_TRO',
            complexCode: v.complexCode,
            regionCode: v.regionCode,
            unitName: unitName,
            oldUnitName: v.unit || 'Ban Cơ Giới KLH',
            oldLocation: v.currentLocationName || matchedTeam?.mainDepot?.name || (isUnassigned ? 'Tổng kho KLH' : 'Chưa thiết lập bãi xe'),
            oldManager: oldManagerName,
            oldManagerPhone: oldManagerPhone,
            driverName: driverName,
            driverPhone: driverPhone,
            driverCode: v.defaultDriver?.id ? `NS-${v.defaultDriver.id}` : '—',
            assignedDate: fullDateTime,
            purpose: v.notes || 'Vận hành theo kế hoạch nông trường',
            transferHistory: v.transferHistory || '',
            status: isUnassigned
              ? ('unassigned' as const)
              : v.status === 'HOAT_DONG'
              ? ('active' as const)
              : v.status === 'CHO_PHAN_CONG'
              ? ('newly_assigned' as const)
              : v.status === 'BAO_DUONG'
              ? ('maintenance' as const)
              : ('repair' as const),
          };
        });
        setAssignmentsList(mapped);
      } else {
        setAssignmentsList([]);
      }
    } catch (err) {
      setAssignmentsList([]);
      useAppStore.getState().setHeaderAlert({
        type: 'error',
        message: 'Lỗi kết nối máy chủ khi tải dữ liệu bàn giao đơn vị.',
      });
    } finally {
      setLoading(false);
    }

    // 3. Fetch Row 3 — Tài sản khác (isAssignable=false)
    apiClient
      .get('/vehicles/statistics', { params: { complexCode: complexParam, isAssignable: false } })
      .then((res: any) => {
        const d = res?.data?.data || res?.data;
        if (d) {
          const total = Number(d.totalVehicles || 0);
          const maintenance = Number(d.maintenance || 0);
          const repair = Number(d.repair || 0);
          const unassigned = Number(d.unassignedUnit || 0);
          const active = total - maintenance - repair - unassigned;
          setOtherAssetStats({ total, active: Math.max(0, active), waiting: 0, maintenance, repair, unassigned });
        }
      })
      .catch(() => null);

    apiClient
      .get('/vehicles/assignments', { params: { limit: 4000, complexCode: complexParam, isAssignable: false } })
      .then((res: any) => {
        const items = res.data?.data?.items || res.data?.items || res.data || [];
        if (Array.isArray(items) && items.length > 0) {
          const mapped: UnitAssignmentRecord[] = items.map((v: any) => {
            const isUnassigned = !v.assignedUnitCode || v.assignedUnitCode.trim() === '';
            const unitName = isUnassigned ? 'Chưa phân bổ' : (v.assignedUnitCode || v.unit || 'Chưa phân bổ');
            return {
              id: `OTH-${v.id}`,
              code: v.code,
              vehicleCode: v.code,
              plateNumber: '—',
              vehicleType: v.vehicleType?.name || v.category || 'Tài sản khác',
              vehicleName: v.name,
              assetGroup: 'THIET_BI_PHU_TRO',
              complexCode: v.complexCode,
              regionCode: v.regionCode,
              unitName,
              oldUnitName: v.unit || 'Chưa phân bổ',
              oldLocation: v.currentLocationName || 'Chưa thiết lập',
              oldManager: v.managerName || '',
              oldManagerPhone: v.managerPhone || '',
              driverName: v.managerName || 'Chưa gán NS quản lý',
              driverPhone: v.managerPhone || '',
              driverCode: '—',
              assignedDate: '—',
              purpose: v.notes || '',
              transferHistory: '',
              status: isUnassigned
                ? ('unassigned' as const)
                : v.status === 'HOAT_DONG' ? ('active' as const)
                : v.status === 'BAO_DUONG' ? ('maintenance' as const)
                : ('repair' as const),
            };
          });
          setOtherAssetsList(mapped);
        } else {
          setOtherAssetsList([]);
        }
      })
      .catch(() => null);
  }, [selectedKLH]);


  useEffect(() => {
    void fetchAssignments();
  }, [fetchAssignments]);

  // Lắng nghe sự kiện làm mới từ nút trên Header
  useEffect(() => {
    const handlePageRefresh = () => {
      void fetchAssignments();
    };
    window.addEventListener('thaco_refresh_current_page', handlePageRefresh);
    return () => window.removeEventListener('thaco_refresh_current_page', handlePageRefresh);
  }, [fetchAssignments]);

  const handleImportExcel = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setImporting(true);
    setImportMessage('');
    try {
      const rows = await parseOperationalImport(file, 'ASSIGNMENT');
      if (rows.length === 0) throw new Error('File không có dòng dữ liệu mới (dòng ví dụ được tự động bỏ qua).');
      let imported = 0;
      for (const row of rows) {
        if (!row.assetType || !row.itemCode || !row.newUnitName || !row.newLocation || !row.newManager || !row.newManagerPhone || !row.assignedDate) {
          throw new Error(`Dòng ${imported + 2} thiếu trường bắt buộc của phiếu phân bổ.`);
        }
        if (String(row.assetType).toUpperCase() === 'NONG_CU') {
          const item = implementsList.find((entry) => entry.code === row.itemCode);
          if (!item) throw new Error(`Không tìm thấy nông cụ ${row.itemCode}.`);
          const rawUnit = String(row.newUnitName).toUpperCase();
          const unit = ['KOUN_MOM', 'KOUN_MOM', 'KOUN_MOM', 'KOUN_MOM', 'KOUN_MOM', 'TOAN_KLH'].includes(rawUnit) ? rawUnit : 'KOUN_MOM';
          await apiService.updateImplement(item.id, {
            unit,
            gatheringLocation: row.newLocation,
            managerName: row.newManager,
            managerPhone: String(row.newManagerPhone),
            standardPurpose: [row.purpose, row.decisionNumber ? `Quyết định: ${row.decisionNumber}` : '', row.transferHistory].filter(Boolean).join(' · '),
          });
        } else {
          const item = assignmentsList.find((entry) => entry.vehicleCode === row.itemCode || entry.code === row.itemCode);
          if (!item) throw new Error(`Không tìm thấy phương tiện ${row.itemCode}.`);
          const vehicleId = Number(item.id.replace(/\D/g, ''));
          await apiService.updateVehicle(vehicleId, {
            assignedUnitCode: row.newUnitName,
            complexCode: row.complexCode,
            regionCode: row.newRegion,
            currentLocationName: row.newLocation,
            managerName: row.newManager,
            managerPhone: String(row.newManagerPhone),
            allocationDate: toIsoDate(row.assignedDate),
            status: 'HOAT_DONG',
            transferHistory: [row.transferHistory, row.decisionNumber ? `Quyết định: ${row.decisionNumber}` : ''].filter(Boolean).join(' · '),
            notes: row.purpose,
          });
        }
        imported += 1;
      }
      setImportMessage(`Đã import thành công ${imported} phiếu phân bổ / điều chuyển.`);
      await fetchAssignments();
    } catch (error: any) {
      setImportMessage(error?.response?.data?.message || error?.message || 'Import phân bổ / điều chuyển thất bại.');
    } finally {
      setImporting(false);
    }
  };

  useEffect(() => {
    void fetchAssignments();
  }, [fetchAssignments]);

  useEffect(() => {
    const handleKlhChanged = () => {
      void fetchAssignments();
    };
    window.addEventListener('thaco_klh_changed', handleKlhChanged);
    return () => window.removeEventListener('thaco_klh_changed', handleKlhChanged);
  }, [fetchAssignments]);

  const groupCounts = React.useMemo(() => {
    const counts: Record<string, number> = {
      MAY_CONG_TRINH: 0,
      MAY_NONG_NGHIEP: 0,
      THIET_BI_PHU_TRO: 0,
      XE_VAN_TAI_BON: 0,
    };
    assignmentsList.forEach((item) => {
      if (item.assetGroup && counts[item.assetGroup] !== undefined) {
        counts[item.assetGroup] += 1;
      }
    });
    return counts;
  }, [assignmentsList]);


  const [searchTerm, setSearchTerm] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [selectedUnitFilter, setSelectedUnitFilter] = useState('ALL');
  const [selectedLocationFilter, setSelectedLocationFilter] = useState('ALL');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('ALL');
  const [selectedManagerFilter, setSelectedManagerFilter] = useState('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('ALL');
  const [selectedGroupFilter, setSelectedGroupFilter] = useState('ALL');

  // 1. Danh sách đơn vị sử dụng
  const unitFilterOptions = React.useMemo<SelectOption[]>(() => {
    const counts = new Map<string, number>();
    assignmentsList.forEach((a) => {
      if (a.unitName && a.unitName !== '—') {
        const key = normalizeMasterDataKey(a.unitName);
        counts.set(key, (counts.get(key) || 0) + 1);
      }
    });
    implementsList.forEach((i) => {
      if (i.unit && i.unit !== '—') {
        const key = normalizeMasterDataKey(i.unit);
        counts.set(key, (counts.get(key) || 0) + 1);
      }
    });
    const unassignedCount = assignmentsList.filter(a => !a.unitName || a.unitName === '—' || a.unitName === 'Chưa phân bổ' || a.status === 'unassigned').length
      + implementsList.filter(i => !i.unit || i.unit === '—' || i.unit === 'Chưa phân bổ').length;

    const list: SelectOption[] = [];
    if (unassignedCount > 0) {
      list.push({
        value: '__UNASSIGNED__',
        label: 'Chưa phân bổ đơn vị (Không có dữ liệu)',
        subLabel: `${unassignedCount.toLocaleString('vi-VN')} tài sản`,
      });
    }

    managementTeams
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name, 'vi'))
      .forEach((unit) => {
        const count = counts.get(normalizeMasterDataKey(unit.name)) || 0;
        list.push({
          value: unit.name,
          label: unit.name,
          subLabel: `${count.toLocaleString('vi-VN')} tài sản`,
        });
      });

    return list;
  }, [assignmentsList, implementsList, managementTeams]);

  // 2. Danh sách nơi tập kết
  const locationFilterOptions = React.useMemo<SelectOption[]>(() => {
    const counts = new Map<string, number>();
    assignmentsList.forEach((a) => {
      if (a.oldLocation && a.oldLocation !== '—') counts.set(a.oldLocation, (counts.get(a.oldLocation) || 0) + 1);
    });
    implementsList.forEach((i) => {
      if (i.gatheringLocation && i.gatheringLocation !== '—') counts.set(i.gatheringLocation, (counts.get(i.gatheringLocation) || 0) + 1);
    });
    const locs = new Set<string>([...sharedFilterOptions.locations, ...managementLocations.map((location) => location.name)]);
    assignmentsList.forEach((a) => {
      if (a.oldLocation && a.oldLocation !== '—') locs.add(a.oldLocation);
    });
    implementsList.forEach((i) => {
      if (i.gatheringLocation && i.gatheringLocation !== '—') locs.add(i.gatheringLocation);
    });

    const unassignedCount = assignmentsList.filter(a => !a.oldLocation || a.oldLocation === '—' || a.oldLocation.includes('Chưa')).length
      + implementsList.filter(i => !i.gatheringLocation || i.gatheringLocation === '—' || i.gatheringLocation.includes('Chưa')).length;

    const list: SelectOption[] = [];
    if (unassignedCount > 0) {
      list.push({
        value: '__UNASSIGNED__',
        label: 'Chưa có nơi tập kết (Không có dữ liệu)',
        subLabel: `${unassignedCount.toLocaleString('vi-VN')} tài sản`,
      });
    }

    uniqueMasterDataOptions(Array.from(locs))
      .forEach((loc) => {
        list.push({
          value: loc,
          label: loc,
          subLabel: `${(counts.get(loc) || 0).toLocaleString('vi-VN')} tài sản`,
        });
      });

    return list;
  }, [assignmentsList, implementsList, managementLocations, sharedFilterOptions.locations]);

  // 3. Danh sách chủng loại xe & nông cụ chuẩn (22 loại xe + 6 loại nông cụ)
  const categoryFilterOptions = React.useMemo<SelectOption[]>(() => {
    const vehicleCats = new Set<string>(sharedFilterOptions.vehicleTypes.map((item) => item.name));
    const implementCats = new Set<string>();
    const vCounts = new Map<string, number>();
    const iCounts = new Map<string, number>();

    assignmentsList.forEach((a) => {
      if (a.vehicleType && a.vehicleType !== '—') {
        const cat = a.vehicleType.normalize('NFC').trim();
        vehicleCats.add(cat);
        vCounts.set(cat, (vCounts.get(cat) || 0) + 1);
      }
    });

    implementsList.forEach((i) => {
      const cat = (i.categoryLabel || i.name || '').normalize('NFC').trim();
      if (cat && cat !== '—') {
        implementCats.add(cat);
        iCounts.set(cat, (iCounts.get(cat) || 0) + 1);
      }
    });

    const vList = uniqueMasterDataOptions(Array.from(vehicleCats))
      .map((cat) => ({
        value: cat,
        label: cat,
        subLabel: `${vCounts.get(cat) || 0} xe`,
      }));

    const iList = uniqueMasterDataOptions(Array.from(implementCats))
      .map((cat) => ({
        value: cat,
        label: cat,
        subLabel: `${iCounts.get(cat) || 0} thiết bị`,
      }));

    return [...vList, ...iList];
  }, [assignmentsList, implementsList, sharedFilterOptions.vehicleTypes]);

  // 4. Danh sách NS quản lý cơ giới
  const managerFilterOptions = React.useMemo<SelectOption[]>(() => {
    const unassignedCount = assignmentsList.filter(a => !a.driverName || a.driverName === '—' || a.driverName.includes('Chưa')).length
      + implementsList.filter(i => !(i as any).managerName || (i as any).managerName === '—' || (i as any).managerName.includes('Chưa')).length;

    const list: SelectOption[] = [];
    if (unassignedCount > 0) {
      list.push({
        value: '__UNASSIGNED__',
        label: 'Chưa phân nhân sự quản lý (Không có dữ liệu)',
        subLabel: `${unassignedCount.toLocaleString('vi-VN')} tài sản`,
      });
    }

    const managers = buildManagementFilterManagers(managementTeams);
    managers
      .forEach((manager) => {
        const managerKey = normalizeMasterDataKey(manager.name);
        const count = assignmentsList.filter((item) => normalizeMasterDataKey(item.driverName || '') === managerKey).length
          + implementsList.filter((item) => normalizeMasterDataKey(item.managerName || '') === managerKey).length;
        list.push({
          value: String(manager.id),
          label: manager.name,
          subLabel: [manager.phone ? `SĐT: ${manager.phone}` : '', `${count.toLocaleString('vi-VN')} tài sản`].filter(Boolean).join(' · '),
        });
      });

    return list;
  }, [assignmentsList, implementsList, managementTeams]);

  const selectedManagerName = selectedManagerFilter === 'ALL'
    ? ''
    : buildManagementFilterManagers(managementTeams).find((manager) => String(manager.id) === selectedManagerFilter)?.name || '';

  // 5. Trạng thái bàn giao
  const statusFilterOptions: SelectOption[] = React.useMemo(() => {
    const activeCount = assignmentsList.filter(a => a.status === 'active').length + implementsList.filter(i => i.status === 'ATTACHED' || i.status === 'IN_DEPOT').length;
    const newCount = assignmentsList.filter(a => a.status === 'newly_assigned').length;
    const maintCount = assignmentsList.filter(a => a.status === 'maintenance').length + implementsList.filter(i => i.status === 'MAINTENANCE').length;
    const repCount = assignmentsList.filter(a => a.status === 'repair').length + implementsList.filter(i => i.status === 'REPAIR').length;
    const unassignedCount = assignmentsList.filter(a => a.status === 'unassigned').length + implementsList.filter(i => !i.unit || i.unit === 'Chưa phân bổ').length;
    return [
      { value: 'active', label: 'Đang sử dụng tại đơn vị', subLabel: `${activeCount} tài sản` },
      { value: 'newly_assigned', label: 'Mới bàn giao / Sẵn sàng', subLabel: `${newCount} tài sản` },
      { value: 'maintenance', label: 'Đang bảo dưỡng định kỳ', subLabel: `${maintCount} tài sản` },
      { value: 'repair', label: 'Đang sửa chữa hư hỏng', subLabel: `${repCount} tài sản` },
      { value: 'UNASSIGNED', label: '⚠️ Chưa phân bổ đơn vị', subLabel: `${unassignedCount} tài sản` },
    ];
  }, [assignmentsList, implementsList]);

  // 6. Phân nhóm tài sản
  const groupFilterOptions: SelectOption[] = React.useMemo(() => {
    const counts: Record<string, number> = {};
    assignmentsList.forEach(a => {
      const g = (a as any).assetGroup || 'MAY_NONG_NGHIEP';
      counts[g] = (counts[g] || 0) + 1;
    });
    const implCount = implementsList.length;
    return [
      { value: 'MAY_NONG_NGHIEP', label: 'Máy nông nghiệp', subLabel: `${counts['MAY_NONG_NGHIEP'] || 0} xe` },
      { value: 'MAY_CONG_TRINH', label: 'Máy công trình', subLabel: `${counts['MAY_CONG_TRINH'] || 0} xe` },
      { value: 'XE_VAN_TAI_BON', label: 'Xe vận tải & bồn', subLabel: `${counts['XE_VAN_TAI_BON'] || 0} xe` },
      { value: 'THIET_BI_PHU_TRO', label: 'Thiết bị & Nông cụ', subLabel: `${implCount} bộ` },
    ];
  }, [assignmentsList, implementsList]);

  const activeFilterCount = [
    selectedUnitFilter !== 'ALL',
    selectedLocationFilter !== 'ALL',
    selectedCategoryFilter !== 'ALL',
    selectedManagerFilter !== 'ALL',
    selectedStatusFilter !== 'ALL',
    selectedGroupFilter !== 'ALL',
  ].filter(Boolean).length;

  const resetFilters = () => {
    setSelectedUnitFilter('ALL');
    setSelectedLocationFilter('ALL');
    setSelectedCategoryFilter('ALL');
    setSelectedManagerFilter('ALL');
    setSelectedStatusFilter('ALL');
    setSelectedGroupFilter('ALL');
    setSearchTerm('');
  };

  const currentSelectedVehicle = assignmentsList[selectedVehicleIdx] || assignmentsList[0];

  // Filtered vehicles khi đang chọn thẻ Row 1 (Toàn bộ phương tiện)
  const filteredAssignments = React.useMemo(() => {
    return assignmentsList.filter((item) => {
      // 1. KPI Card Filter
      if (cardFilter === 'RUNNING') {
        const isUn = item.unitName === 'Chưa phân bổ' || item.unitName.includes('Chưa') || item.status === 'unassigned';
        if (isUn || item.status !== 'active') return false;
      }
      if (cardFilter === 'WAITING') {
        const isUn = item.unitName === 'Chưa phân bổ' || item.unitName.includes('Chưa') || item.status === 'unassigned';
        if (isUn || item.status !== 'newly_assigned') return false;
      }
      if (cardFilter === 'MAINTENANCE') {
        if (item.status !== 'maintenance') return false;
      }
      if (cardFilter === 'REPAIR') {
        if (item.status !== 'repair') return false;
      }
      if (cardFilter === 'UNASSIGNED_UNIT') {
        const isUn = item.unitName === 'Chưa phân bổ' || item.unitName.includes('Chưa') || item.status === 'unassigned';
        if (!isUn) return false;
      }

      // 2. Search Term Filter
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const match =
          item.vehicleCode.toLowerCase().includes(term) ||
          (item.plateNumber && item.plateNumber.toLowerCase().includes(term)) ||
          item.vehicleType.toLowerCase().includes(term) ||
          item.unitName.toLowerCase().includes(term) ||
          item.oldLocation.toLowerCase().includes(term) ||
          item.driverName.toLowerCase().includes(term) ||
          (item.driverPhone && item.driverPhone.toLowerCase().includes(term)) ||
          item.purpose.toLowerCase().includes(term);
        if (!match) return false;
      }

      // 3. Unit Filter
      if (selectedUnitFilter !== 'ALL') {
        if (selectedUnitFilter === 'UNASSIGNED' || selectedUnitFilter === '__UNASSIGNED__') {
          const isUn = !item.unitName || item.unitName === '—' || item.unitName === 'Chưa phân bổ' || item.unitName.includes('Chưa') || item.status === 'unassigned';
          if (!isUn) return false;
        } else if (normalizeMasterDataKey(item.unitName) !== normalizeMasterDataKey(selectedUnitFilter)) {
          return false;
        }
      }

      // 4. Location Filter
      if (selectedLocationFilter !== 'ALL') {
        if (selectedLocationFilter === 'UNASSIGNED' || selectedLocationFilter === '__UNASSIGNED__') {
          const isUn = !item.oldLocation || item.oldLocation === '—' || item.oldLocation.includes('Chưa');
          if (!isUn) return false;
        } else if (normalizeMasterDataKey(item.oldLocation) !== normalizeMasterDataKey(selectedLocationFilter)) {
          return false;
        }
      }

      // 5. Category Filter
      if (selectedCategoryFilter !== 'ALL') {
        const selNorm = selectedCategoryFilter.normalize('NFC').toLowerCase();
        const vTypeNorm = item.vehicleType.normalize('NFC').toLowerCase();
        const vNameNorm = (item.vehicleName || '').normalize('NFC').toLowerCase();
        if (vTypeNorm !== selNorm && !vNameNorm.includes(selNorm)) {
          return false;
        }
      }

      // 6. Manager Filter
      if (selectedManagerFilter !== 'ALL') {
        if (selectedManagerFilter === 'UNASSIGNED' || selectedManagerFilter === '__UNASSIGNED__') {
          const isUn = !item.driverName || item.driverName === '—' || item.driverName.includes('Chưa');
          if (!isUn) return false;
        } else if (!selectedManagerName || normalizeMasterDataKey(item.driverName) !== normalizeMasterDataKey(selectedManagerName)) {
          return false;
        }
      }

      // 7. Status Filter
      if (selectedStatusFilter !== 'ALL') {
        if (selectedStatusFilter === 'UNASSIGNED') {
          const isUn = item.unitName === 'Chưa phân bổ' || item.unitName.includes('Chưa');
          if (!isUn) return false;
        } else if (item.status !== selectedStatusFilter) {
          return false;
        }
      }

      // 8. Group Filter
      if (selectedGroupFilter !== 'ALL') {
        if (item.assetGroup !== selectedGroupFilter) return false;
      }

      return true;
    });
  }, [
    assignmentsList,
    cardFilter,
    searchTerm,
    selectedUnitFilter,
    selectedLocationFilter,
    selectedCategoryFilter,
    selectedManagerFilter,
    selectedManagerName,
    selectedStatusFilter,
    selectedGroupFilter,
  ]);

  // Filtered implements khi đang chọn thẻ Row 2 (Máy gắn / Nông cụ đính kèm)
  const filteredImplements = React.useMemo(() => {
    return implementsList.filter((item) => {
      // 1. KPI Card Filter cho Nông cụ
      if (cardFilter === 'EQUIP_RUNNING' && item.status !== 'ATTACHED') return false;
      if (cardFilter === 'EQUIP_WAITING' && item.status !== 'IN_DEPOT') return false;
      if (cardFilter === 'EQUIP_MAINTENANCE' && item.status !== 'MAINTENANCE') return false;
      if (cardFilter === 'EQUIP_REPAIR' && item.status !== 'REPAIR') return false;
      if (cardFilter === 'EQUIP_UNASSIGNED' && item.status !== 'UNASSIGNED') return false;

      // 2. Search Term Filter
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const match =
          item.code.toLowerCase().includes(term) ||
          item.name.toLowerCase().includes(term) ||
          (item.categoryLabel && item.categoryLabel.toLowerCase().includes(term)) ||
          item.unit.toLowerCase().includes(term) ||
          (item.gatheringLocation && item.gatheringLocation.toLowerCase().includes(term)) ||
          (item.managerName && item.managerName.toLowerCase().includes(term)) ||
          (item.attachedVehicleCode && item.attachedVehicleCode.toLowerCase().includes(term));
        if (!match) return false;
      }

      // 3. Unit Filter
      if (selectedUnitFilter !== 'ALL') {
        if (selectedUnitFilter === 'UNASSIGNED' || selectedUnitFilter === '__UNASSIGNED__') {
          const isUn = !item.unit || item.unit === '—' || item.unit === 'Chưa phân bổ' || item.unit.includes('Chưa');
          if (!isUn) return false;
        } else if (normalizeMasterDataKey(item.unit) !== normalizeMasterDataKey(selectedUnitFilter)) {
          return false;
        }
      }

      // 4. Location Filter
      if (selectedLocationFilter !== 'ALL') {
        if (selectedLocationFilter === 'UNASSIGNED' || selectedLocationFilter === '__UNASSIGNED__') {
          const isUn = !item.gatheringLocation || item.gatheringLocation === '—' || item.gatheringLocation.includes('Chưa');
          if (!isUn) return false;
        } else if (item.gatheringLocation && normalizeMasterDataKey(item.gatheringLocation) !== normalizeMasterDataKey(selectedLocationFilter)) {
          return false;
        }
      }

      // 5. Category Filter
      if (selectedCategoryFilter !== 'ALL') {
        const selNorm = selectedCategoryFilter.normalize('NFC').toLowerCase();
        const lblNorm = (item.categoryLabel || '').normalize('NFC').toLowerCase();
        const nameNorm = item.name.normalize('NFC').toLowerCase();
        if (lblNorm !== selNorm && !nameNorm.includes(selNorm)) {
          return false;
        }
      }

      // 6. Manager Filter
      if (selectedManagerFilter !== 'ALL') {
        if (selectedManagerFilter === 'UNASSIGNED' || selectedManagerFilter === '__UNASSIGNED__') {
          const isUn = !item.managerName || item.managerName === '—' || item.managerName.includes('Chưa');
          if (!isUn) return false;
        } else if (!selectedManagerName || !item.managerName || normalizeMasterDataKey(item.managerName) !== normalizeMasterDataKey(selectedManagerName)) {
          return false;
        }
      }

      // 7. Status Filter
      if (selectedStatusFilter !== 'ALL') {
        if (selectedStatusFilter === 'active' && item.status !== 'ATTACHED') return false;
        if (selectedStatusFilter === 'newly_assigned' && item.status !== 'IN_DEPOT') return false;
        if (selectedStatusFilter === 'repair' && item.status !== 'MAINTENANCE') return false;
      }

      // 8. Group Filter
      if (selectedGroupFilter !== 'ALL') {
        if (selectedGroupFilter !== 'THIET_BI_PHU_TRO') return false;
      }

      return true;
    });
  }, [
    implementsList,
    cardFilter,
    searchTerm,
    selectedUnitFilter,
    selectedLocationFilter,
    selectedCategoryFilter,
    selectedManagerFilter,
    selectedManagerName,
    selectedStatusFilter,
    selectedGroupFilter,
  ]);

  // Filtered other assets (Row 3)
  const filteredOtherAssets = React.useMemo(() => {
    return otherAssetsList.filter((item) => {
      if (cardFilter === 'OTHER_ACTIVE' && item.status !== 'active') return false;
      if (cardFilter === 'OTHER_MAINTENANCE' && item.status !== 'maintenance') return false;
      if (cardFilter === 'OTHER_REPAIR' && item.status !== 'repair') return false;
      if (cardFilter === 'OTHER_UNASSIGNED' && item.status !== 'unassigned') return false;
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const match =
          item.vehicleCode.toLowerCase().includes(term) ||
          item.vehicleType.toLowerCase().includes(term) ||
          (item.vehicleName && item.vehicleName.toLowerCase().includes(term)) ||
          item.unitName.toLowerCase().includes(term) ||
          item.driverName.toLowerCase().includes(term);
        if (!match) return false;
      }
      if (selectedUnitFilter !== 'ALL') {
        if (selectedUnitFilter === 'UNASSIGNED' || selectedUnitFilter === '__UNASSIGNED__') {
          const isUn = !item.unitName || item.unitName === '—' || item.unitName === 'Chưa phân bổ' || item.unitName.includes('Chưa') || item.status === 'unassigned';
          if (!isUn) return false;
        } else if (normalizeMasterDataKey(item.unitName) !== normalizeMasterDataKey(selectedUnitFilter)) {
          return false;
        }
      }
      return true;
    });
  }, [otherAssetsList, cardFilter, searchTerm, selectedUnitFilter]);

  const isImplementMode = cardFilter.startsWith('EQUIP_');
  const isOtherMode = cardFilter.startsWith('OTHER_');



  const handleExportExcel = () => {
    const headers = [
      'STT',
      'Mã xe',
      'Biển số',
      'Chủng loại',
      'Đơn vị cũ',
      'Nơi tập kết cũ',
      'Đơn vị tiếp nhận mới',
      'NS Quản lý cơ giới',
      'SĐT Quản lý',
      'Mã NS',
      'Ngày bàn giao',
      'Trạng thái',
    ];
    const rows = filteredAssignments.map((item, idx) => [
      idx + 1,
      `"${item.vehicleCode}"`,
      `"${item.plateNumber || ''}"`,
      `"${item.vehicleType}"`,
      `"${item.oldUnitName}"`,
      `"${item.oldLocation}"`,
      `"${item.unitName}"`,
      `"${item.driverName}"`,
      `"${item.driverPhone || ''}"`,
      `"${item.driverCode}"`,
      `"${item.assignedDate}"`,
      item.status === 'active'
        ? 'Đang sử dụng'
        : item.status === 'repair'
        ? 'Đang BTSC'
        : 'Mới bàn giao',
    ]);
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Bang_Phan_Xe_MMTB_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const columns: Column<UnitAssignmentRecord>[] = [
    {
      key: 'vehicleCode',
      title: 'MÃ XE / BIỂN SỐ',
      sortable: true,
      width: '115px',
      render: (row) => (
        <div>
          <strong className="text-primary font-bold block">{row.vehicleCode}</strong>
          <span className="text-[10px] text-slate-500 block">{row.plateNumber || '—'}</span>
        </div>
      ),
    },
    {
      key: 'vehicleType',
      title: 'CHỦNG LOẠI XE',
      sortable: true,
      width: '190px',
      render: (row) => (
        <div>
          <span className="font-bold text-slate-900 block whitespace-normal leading-tight text-xs" title={row.vehicleType}>
            {row.vehicleType}
          </span>
          {row.vehicleName && row.vehicleName !== row.vehicleType && (
            <span className="text-[10px] text-slate-500 block truncate max-w-[180px]" title={row.vehicleName}>
              {row.vehicleName}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'oldUnitName',
      title: 'ĐƠN VỊ CŨ (GIAO)',
      sortable: true,
      width: '120px',
      render: (row) => (
        <div>
          <span className="font-medium text-slate-700 block whitespace-normal leading-tight">{row.oldUnitName}</span>
          <span className="text-[10px] text-slate-400 block whitespace-normal">{row.oldLocation}</span>
        </div>
      ),
    },
    {
      key: 'unitName',
      title: 'ĐƠN VỊ TIẾP NHẬN (MỚI)',
      sortable: true,
      width: '125px',
      render: (row) => (
        row.unitName === 'Chưa phân bổ' ? (
          <span className="inline-flex items-center gap-1 font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-lg border border-rose-200 text-xs whitespace-nowrap">
            ⚠️ Chưa phân bổ
          </span>
        ) : (
          <span className="font-bold text-slate-800 block whitespace-normal leading-tight">{row.unitName}</span>
        )
      ),
    },
    {
      key: 'driverName',
      title: 'NS QUẢN LÝ CƠ GIỚI',
      sortable: true,
      width: '135px',
      render: (row) => (
        <div>
          <span className="font-bold text-slate-900 block whitespace-normal leading-tight">{row.driverName}</span>
          {row.driverPhone ? (
            <span className="text-[10px] font-mono text-slate-500 block" title={`SĐT: ${row.driverPhone}`}>
              📞 {row.driverPhone}
            </span>
          ) : (
            <span className="text-[10px] text-slate-400 font-mono block">
              {row.driverCode !== '—' ? row.driverCode : ''}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'assignedDate',
      title: 'THỜI GIAN CẬP NHẬT',
      width: '110px',
      align: 'center',
      render: (row) => {
        let text = row.assignedDate || '07:00 26/08/2026';
        if (!text.includes(':')) {
          text = `07:00 ${text}`;
        }
        const parts = text.split(' ');
        if (parts.length >= 2) {
          return (
            <div className="text-center font-mono whitespace-nowrap">
              <span className="font-bold text-slate-800 text-xs block">{parts[0]}</span>
              <span className="text-[10px] text-slate-500 font-medium block">{parts.slice(1).join(' ')}</span>
            </div>
          );
        }
        return <span className="font-mono text-slate-700 text-xs whitespace-nowrap">{text}</span>;
      },
    },
    {
      key: 'status',
      title: 'TRẠNG THÁI',
      width: '100px',
      align: 'center',
      render: (row) => {
        const isUnassigned = row.unitName === 'Chưa phân bổ' || row.unitName.includes('Chưa') || row.status === 'unassigned';
        if (isUnassigned) {
          return <Badge variant="red">Chưa phân bổ</Badge>;
        }
        return row.status === 'newly_assigned' ? (
          <Badge variant="amber">Sẵn sàng</Badge>
        ) : row.status === 'maintenance' ? (
          <Badge variant="amber">Đang bảo dưỡng</Badge>
        ) : row.status === 'repair' ? (
          <Badge variant="red">Đang sửa chữa</Badge>
        ) : (
          <Badge variant="green">Đang sử dụng</Badge>
        );
      },
    },
    {
      key: 'user',
      title: 'User',
      width: '70px',
      align: 'center',
      render: (row) => (
        <AuditUserPopover
          createdDate="14-03-2026"
          createdUser="admin"
          updatedDate="01-08-2026"
          updatedUser="admin"
          title={`Xem thông tin phân bổ xe ${row.vehicleCode}`}
        />
      ),
    },
    {
      key: 'actions',
      title: 'Tác vụ',
      width: '120px',
      align: 'center',
      render: (row) => (
        <div className="flex items-center justify-center gap-1">
          <TableRowActions
            onView={() => setSelectedRecord(row)}
            onEdit={() => {
              const foundIdx = assignmentsList.findIndex((a) => a.id === row.id);
              if (foundIdx >= 0) setSelectedVehicleIdx(foundIdx);
              setShowAddModal(true);
            }}
            viewTitle="Xem chi tiết phân bổ & lịch sử"
            editTitle="Lập quyết định bàn giao"
          />
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              const foundIdx = assignmentsList.findIndex((a) => a.id === row.id);
              if (foundIdx >= 0) setSelectedVehicleIdx(foundIdx);
              setShowAddModal(true);
            }}
            className="p-1 hover:bg-emerald-50 text-emerald-700 rounded transition-colors cursor-pointer"
            title="Lập quyết định bàn giao phương tiện này"
          >
            <ArrowRightLeft className="w-3.5 h-3.5 text-emerald-600" />
          </button>
        </div>
      ),
    },
  ];

  const implementColumns: Column<ImplementItemRecord>[] = [
    {
      key: 'code',
      title: 'MÃ NÔNG CỤ / BIỂN SỐ',
      sortable: true,
      width: '115px',
      render: (row) => (
        <div>
          <strong className="text-primary font-bold block">{row.code}</strong>
          <span className="text-[10px] text-slate-400 block">—</span>
        </div>
      ),
    },
    {
      key: 'name',
      title: 'CHỦNG LOẠI NÔNG CỤ',
      sortable: true,
      width: '190px',
      render: (row) => (
        <div>
          <span className="font-bold text-slate-900 block whitespace-normal leading-tight text-xs" title={row.categoryLabel || row.name}>
            {row.categoryLabel || row.name}
          </span>
          {row.name && row.name !== row.categoryLabel && (
            <span className="text-[10px] text-slate-500 block truncate max-w-[180px]" title={row.name}>
              {row.name}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'unit',
      title: 'ĐƠN VỊ CŨ (GIAO)',
      sortable: true,
      width: '120px',
      render: (_row) => (
        <div>
          <span className="font-medium text-slate-700 block whitespace-normal leading-tight">Ban Cơ Giới KLH</span>
          <span className="text-[10px] text-slate-400 block whitespace-normal">Tổng kho KLH</span>
        </div>
      ),
    },
    {
      key: 'gatheringLocation',
      title: 'ĐƠN VỊ TIẾP NHẬN (MỚI)',
      sortable: true,
      width: '125px',
      render: (row) => (
        row.unit === 'Chưa phân bổ' ? (
          <span className="inline-flex items-center gap-1 font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-lg border border-rose-200 text-xs whitespace-nowrap">
            ⚠️ Chưa phân bổ
          </span>
        ) : (
          <span className="font-bold text-slate-800 block whitespace-normal leading-tight">{row.unit}</span>
        )
      ),
    },
    {
      key: 'managerName',
      title: 'NS QUẢN LÝ CƠ GIỚI',
      sortable: true,
      width: '135px',
      render: (row) => (
        <div>
          <span className="font-bold text-slate-900 block whitespace-normal leading-tight">{row.managerName || 'Chưa bổ nhiệm'}</span>
          <span className="text-[10px] font-mono text-slate-500 block" title={row.managerPhone ? `SĐT: ${row.managerPhone}` : 'Chưa có số điện thoại'}>
            {row.managerPhone ? `📞 ${row.managerPhone}` : '—'}
          </span>
        </div>
      ),
    },
    {
      key: 'technicalCondition',
      title: 'THỜI GIAN CẬP NHẬT',
      width: '110px',
      align: 'center',
      render: (_row) => (
        <div className="text-center font-mono whitespace-nowrap">
          <span className="font-bold text-slate-800 text-xs block">08:15</span>
          <span className="text-[10px] text-slate-500 font-medium block">26/08/2026</span>
        </div>
      ),
    },
    {
      key: 'status',
      title: 'TRẠNG THÁI',
      width: '100px',
      align: 'center',
      render: (row) => {
        const isUnassigned = row.unit === 'Chưa phân bổ' || row.status === 'UNASSIGNED';
        if (isUnassigned) {
          return <Badge variant="red">Chưa phân bổ</Badge>;
        }
        return row.status === 'MAINTENANCE' ? (
          <Badge variant="amber">Đang bảo dưỡng</Badge>
        ) : row.status === 'REPAIR' ? (
          <Badge variant="red">Đang sửa chữa</Badge>
        ) : row.status === 'IN_DEPOT' ? (
          <Badge variant="amber">Sẵn sàng</Badge>
        ) : (
          <Badge variant="green">Đang sử dụng</Badge>
        );
      },
    },
    {
      key: 'user',
      title: 'User',
      width: '70px',
      align: 'center',
      render: (row) => (
        <AuditUserPopover
          createdDate="14-03-2026"
          createdUser="admin"
          updatedDate="01-08-2026"
          updatedUser="admin"
          title={`Xem thông tin phân bổ nông cụ ${row.code}`}
        />
      ),
    },
    {
      key: 'actions',
      title: 'Tác vụ',
      width: '120px',
      align: 'center',
      render: (row) => (
        <div className="flex items-center justify-center gap-1">
          <TableRowActions
            onView={() => setSelectedImplement(row)}
            onEdit={() => {
              const foundIdx = implementsList.findIndex((a) => a.id === row.id);
              if (foundIdx >= 0) setSelectedImplementIdx(foundIdx);
              setShowImplementHandoverModal(true);
            }}
            viewTitle="Xem chi tiết phân bổ & lịch sử"
            editTitle="Lập quyết định bàn giao"
          />
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              const foundIdx = implementsList.findIndex((a) => a.id === row.id);
              if (foundIdx >= 0) setSelectedImplementIdx(foundIdx);
              setShowImplementHandoverModal(true);
            }}
            className="p-1 hover:bg-emerald-50 text-emerald-700 rounded transition-colors cursor-pointer"
            title="Lập quyết định bàn giao nông cụ này"
          >
            <ArrowRightLeft className="w-3.5 h-3.5 text-emerald-600" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* 6x2 DASHBOARD TILES — Tách biệt rõ ràng Bảo dưỡng và Sửa chữa */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">

        {/* ═══ ROW 1 — Bộ lọc trạng thái vận hành Phương tiện (6 thẻ) ═══ */}

        {/* Card 1: Tất cả phương tiện */}
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
            <span className="text-xs font-bold text-slate-500">Tất cả phương tiện</span>
            <div className="rounded-xl p-2 bg-blue-50 text-blue-600">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900">
            {stats.total.toLocaleString('vi-VN')} xe
          </div>
          <div className="mt-1 text-[11px] font-semibold text-slate-500 truncate">
            {stats.assignedUnit.toLocaleString('vi-VN')} đã phân bổ • {stats.unassignedUnit.toLocaleString('vi-VN')} chưa gán
          </div>
        </button>

        {/* Card 2: Đang bố trí vận hành */}
        <button
          type="button"
          onClick={() => setCardFilter((curr) => (curr === 'RUNNING' ? 'ALL' : 'RUNNING'))}
          className={`relative overflow-hidden p-4 rounded-2xl border text-left transition-all hover:shadow-md cursor-pointer ${
            cardFilter === 'RUNNING'
              ? 'border-emerald-500 bg-emerald-50/40 ring-2 ring-emerald-500/25 shadow-sm scale-[1.01]'
              : 'border-slate-200 bg-white hover:bg-slate-50'
          }`}
        >
          <span className="absolute inset-x-0 bottom-0 h-1.5 bg-emerald-500" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-700">Đang bố trí vận hành</span>
            <div className="rounded-xl p-2 bg-emerald-50 text-emerald-600">
              <Tractor className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-emerald-700">
            {stats.running.toLocaleString('vi-VN')} xe
          </div>
          <div className="mt-1 text-[11px] font-semibold text-emerald-600 truncate">
            Đang chạy việc tại Đơn vị
          </div>
        </button>

        {/* Card 3: Sẵn sàng điều động */}
        <button
          type="button"
          onClick={() => setCardFilter((curr) => (curr === 'WAITING' ? 'ALL' : 'WAITING'))}
          className={`relative overflow-hidden p-4 rounded-2xl border text-left transition-all hover:shadow-md cursor-pointer ${
            cardFilter === 'WAITING'
              ? 'border-amber-500 bg-amber-50/40 ring-2 ring-amber-500/25 shadow-sm scale-[1.01]'
              : 'border-slate-200 bg-white hover:bg-slate-50'
          }`}
        >
          <span className="absolute inset-x-0 bottom-0 h-1.5 bg-amber-500" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-700">Sẵn sàng điều động</span>
            <div className="rounded-xl p-2 bg-amber-50 text-amber-600">
              <Truck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-amber-700">
            {stats.waiting.toLocaleString('vi-VN')} xe
          </div>
          <div className="mt-1 text-[11px] font-semibold text-amber-600 truncate">
            Mới bàn giao / Tại bãi xe XN
          </div>
        </button>

        {/* Card 4: Đang bảo dưỡng (7 xe) */}
        <button
          type="button"
          onClick={() => setCardFilter((curr) => (curr === 'MAINTENANCE' ? 'ALL' : 'MAINTENANCE'))}
          className={`relative overflow-hidden p-4 rounded-2xl border text-left transition-all hover:shadow-md cursor-pointer ${
            cardFilter === 'MAINTENANCE'
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
            {stats.maintenance.toLocaleString('vi-VN')} xe
          </div>
          <div className="mt-1 text-[11px] font-semibold text-amber-600 truncate">
            Bảo dưỡng định kỳ BDC
          </div>
        </button>

        {/* Card 5: Đang sửa chữa (426 xe) */}
        <button
          type="button"
          onClick={() => setCardFilter((curr) => (curr === 'REPAIR' ? 'ALL' : 'REPAIR'))}
          className={`relative overflow-hidden p-4 rounded-2xl border text-left transition-all hover:shadow-md cursor-pointer ${
            cardFilter === 'REPAIR'
              ? 'border-rose-500 bg-rose-50/40 ring-2 ring-rose-500/25 shadow-sm scale-[1.01]'
              : 'border-slate-200 bg-white hover:bg-slate-50'
          }`}
        >
          <span className="absolute inset-x-0 bottom-0 h-1.5 bg-rose-500" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-700">Đang sửa chữa (Hỏng)</span>
            <div className="rounded-xl p-2 bg-rose-50 text-rose-600">
              <Wrench className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-rose-700">
            {stats.repair.toLocaleString('vi-VN')} xe
          </div>
          <div className="mt-1 text-[11px] font-semibold text-rose-600 truncate">
            Tại xưởng BTSC & trạm cơ điện
          </div>
        </button>

        {/* Card 6: Chưa phân bổ Đơn vị */}
        <button
          type="button"
          onClick={() => setCardFilter((curr) => (curr === 'UNASSIGNED_UNIT' ? 'ALL' : 'UNASSIGNED_UNIT'))}
          className={`relative overflow-hidden p-4 rounded-2xl border text-left transition-all hover:shadow-md cursor-pointer ${
            cardFilter === 'UNASSIGNED_UNIT'
              ? 'border-orange-500 bg-orange-50/40 ring-2 ring-orange-500/25 shadow-sm scale-[1.01]'
              : 'border-slate-200 bg-white hover:bg-slate-50'
          }`}
        >
          <span className="absolute inset-x-0 bottom-0 h-1.5 bg-orange-500" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-orange-700">Chưa phân bổ Đơn vị</span>
            <div className="rounded-xl p-2 bg-orange-50 text-orange-600">
              <ShieldAlert className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-orange-700">
            {stats.unassignedUnit.toLocaleString('vi-VN')} xe
          </div>
          <div className="mt-1 text-[11px] font-semibold text-orange-600 truncate">
            Chờ cấp phát Đơn vị sử dụng
          </div>
        </button>

        {/* ═══ ROW 2 — Thiết bị phụ trợ / Nông cụ đính kèm (6 thẻ đồng bộ 100%) ═══ */}

        {/* Card 7: Tất cả thiết bị & nông cụ */}
        <button
          type="button"
          onClick={() => setCardFilter((curr) => (curr === 'EQUIP_ALL' ? 'ALL' : 'EQUIP_ALL'))}
          className={`relative overflow-hidden p-4 rounded-2xl border text-left transition-all hover:shadow-md cursor-pointer ${
            cardFilter === 'EQUIP_ALL'
              ? 'border-blue-500 bg-blue-50/40 ring-2 ring-blue-500/25 shadow-sm scale-[1.01]'
              : 'border-slate-200 bg-white hover:bg-slate-50'
          }`}
        >
          <span className="absolute inset-x-0 bottom-0 h-1.5 bg-blue-500" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Tất cả thiết bị & nông cụ</span>
            <div className="rounded-xl p-2 bg-blue-50 text-blue-600">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900">
            {implementStats.total.toLocaleString('vi-VN')} bộ
          </div>
          <div className="mt-1 text-[11px] font-semibold text-slate-500 truncate">
            {implementStats.running.toLocaleString('vi-VN')} đã phân bổ • {implementStats.unassigned.toLocaleString('vi-VN')} chưa gán
          </div>
        </button>

        {/* Card 8: Đang bố trí vận hành */}
        <button
          type="button"
          onClick={() => setCardFilter((curr) => (curr === 'EQUIP_RUNNING' ? 'ALL' : 'EQUIP_RUNNING'))}
          className={`relative overflow-hidden p-4 rounded-2xl border text-left transition-all hover:shadow-md cursor-pointer ${
            cardFilter === 'EQUIP_RUNNING'
              ? 'border-emerald-500 bg-emerald-50/40 ring-2 ring-emerald-500/25 shadow-sm scale-[1.01]'
              : 'border-slate-200 bg-white hover:bg-slate-50'
          }`}
        >
          <span className="absolute inset-x-0 bottom-0 h-1.5 bg-emerald-500" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-700">Đang bố trí vận hành</span>
            <div className="rounded-xl p-2 bg-emerald-50 text-emerald-600">
              <Tractor className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-emerald-700">
            {implementStats.running.toLocaleString('vi-VN')} bộ
          </div>
          <div className="mt-1 text-[11px] font-semibold text-emerald-600 truncate">
            Đang chạy việc tại Đơn vị
          </div>
        </button>

        {/* Card 9: Sẵn sàng điều động */}
        <button
          type="button"
          onClick={() => setCardFilter((curr) => (curr === 'EQUIP_WAITING' ? 'ALL' : 'EQUIP_WAITING'))}
          className={`relative overflow-hidden p-4 rounded-2xl border text-left transition-all hover:shadow-md cursor-pointer ${
            cardFilter === 'EQUIP_WAITING'
              ? 'border-amber-500 bg-amber-50/40 ring-2 ring-amber-500/25 shadow-sm scale-[1.01]'
              : 'border-slate-200 bg-white hover:bg-slate-50'
          }`}
        >
          <span className="absolute inset-x-0 bottom-0 h-1.5 bg-amber-500" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-700">Sẵn sàng điều động</span>
            <div className="rounded-xl p-2 bg-amber-50 text-amber-600">
              <Truck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-amber-700">
            {implementStats.waiting.toLocaleString('vi-VN')} bộ
          </div>
          <div className="mt-1 text-[11px] font-semibold text-amber-600 truncate">
            Mới bàn giao / Tại bãi kho XN
          </div>
        </button>

        {/* Card 10: Đang bảo dưỡng (19 bộ) */}
        <button
          type="button"
          onClick={() => setCardFilter((curr) => (curr === 'EQUIP_MAINTENANCE' ? 'ALL' : 'EQUIP_MAINTENANCE'))}
          className={`relative overflow-hidden p-4 rounded-2xl border text-left transition-all hover:shadow-md cursor-pointer ${
            cardFilter === 'EQUIP_MAINTENANCE'
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
            {implementStats.maintenance.toLocaleString('vi-VN')} bộ
          </div>
          <div className="mt-1 text-[11px] font-semibold text-amber-600 truncate">
            Hao mòn chảo bừa, dao phay
          </div>
        </button>

        {/* Card 11: Đang sửa chữa (20 bộ) */}
        <button
          type="button"
          onClick={() => setCardFilter((curr) => (curr === 'EQUIP_REPAIR' ? 'ALL' : 'EQUIP_REPAIR'))}
          className={`relative overflow-hidden p-4 rounded-2xl border text-left transition-all hover:shadow-md cursor-pointer ${
            cardFilter === 'EQUIP_REPAIR'
              ? 'border-rose-500 bg-rose-50/40 ring-2 ring-rose-500/25 shadow-sm scale-[1.01]'
              : 'border-slate-200 bg-white hover:bg-slate-50'
          }`}
        >
          <span className="absolute inset-x-0 bottom-0 h-1.5 bg-rose-500" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-700">Đang sửa chữa (Hỏng)</span>
            <div className="rounded-xl p-2 bg-rose-50 text-rose-600">
              <Wrench className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-rose-700">
            {implementStats.repair.toLocaleString('vi-VN')} bộ
          </div>
          <div className="mt-1 text-[11px] font-semibold text-rose-600 truncate">
            Tại xưởng BTSC & trạm cơ điện
          </div>
        </button>

        {/* Card 12: Chưa phân bổ Đơn vị */}
        <button
          type="button"
          onClick={() => setCardFilter((curr) => (curr === 'EQUIP_UNASSIGNED' ? 'ALL' : 'EQUIP_UNASSIGNED'))}
          className={`relative overflow-hidden p-4 rounded-2xl border text-left transition-all hover:shadow-md cursor-pointer ${
            cardFilter === 'EQUIP_UNASSIGNED'
              ? 'border-orange-500 bg-orange-50/40 ring-2 ring-orange-500/25 shadow-sm scale-[1.01]'
              : 'border-slate-200 bg-white hover:bg-slate-50'
          }`}
        >
          <span className="absolute inset-x-0 bottom-0 h-1.5 bg-orange-500" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-orange-700">Chưa phân bổ Đơn vị</span>
            <div className="rounded-xl p-2 bg-orange-50 text-orange-600">
              <ShieldAlert className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-orange-700">
            {implementStats.unassigned.toLocaleString('vi-VN')} bộ
          </div>
          <div className="mt-1 text-[11px] font-semibold text-orange-600 truncate">
            Chờ cấp phát Đơn vị sử dụng
          </div>
        </button>

        {/* ═══ ROW 3 — Tài sản khác (hoạt động độc lập) ═══ */}

        {/* Card 13: Tất cả tài sản khác */}
        <button
          type="button"
          onClick={() => setCardFilter((curr) => (curr === 'OTHER_ALL' ? 'ALL' : 'OTHER_ALL'))}
          className={`relative overflow-hidden p-4 rounded-2xl border text-left transition-all hover:shadow-md cursor-pointer ${
            cardFilter === 'OTHER_ALL'
              ? 'border-violet-500 bg-violet-50/40 ring-2 ring-violet-500/25 shadow-sm scale-[1.01]'
              : 'border-slate-200 bg-white hover:bg-slate-50'
          }`}
        >
          <span className="absolute inset-x-0 bottom-0 h-1.5 bg-violet-500" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Tài sản khác (máy, thiết bị)</span>
            <div className="rounded-xl p-2 bg-violet-50 text-violet-600">
              <Package className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900">
            {otherAssetStats.total.toLocaleString('vi-VN')} ts
          </div>
          <div className="mt-1 text-[11px] font-semibold text-slate-500 truncate">
            {otherAssetStats.unassigned.toLocaleString('vi-VN')} chưa gán • độc lập
          </div>
        </button>

        {/* Card 14: Đang hoạt động */}
        <button
          type="button"
          onClick={() => setCardFilter((curr) => (curr === 'OTHER_ACTIVE' ? 'ALL' : 'OTHER_ACTIVE'))}
          className={`relative overflow-hidden p-4 rounded-2xl border text-left transition-all hover:shadow-md cursor-pointer ${
            cardFilter === 'OTHER_ACTIVE'
              ? 'border-emerald-500 bg-emerald-50/40 ring-2 ring-emerald-500/25 shadow-sm scale-[1.01]'
              : 'border-slate-200 bg-white hover:bg-slate-50'
          }`}
        >
          <span className="absolute inset-x-0 bottom-0 h-1.5 bg-emerald-500" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-700">Đang hoạt động</span>
            <div className="rounded-xl p-2 bg-emerald-50 text-emerald-600">
              <PackageCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-emerald-700">
            {otherAssetStats.active.toLocaleString('vi-VN')} ts
          </div>
          <div className="mt-1 text-[11px] font-semibold text-emerald-600 truncate">
            Vận hành thường xuyên
          </div>
        </button>

        {/* Card 15: Chờ phân công */}
        <button
          type="button"
          onClick={() => setCardFilter((curr) => (curr === 'OTHER_WAITING' ? 'ALL' : 'OTHER_WAITING'))}
          className={`relative overflow-hidden p-4 rounded-2xl border text-left transition-all hover:shadow-md cursor-pointer ${
            cardFilter === 'OTHER_WAITING'
              ? 'border-amber-500 bg-amber-50/40 ring-2 ring-amber-500/25 shadow-sm scale-[1.01]'
              : 'border-slate-200 bg-white hover:bg-slate-50'
          }`}
        >
          <span className="absolute inset-x-0 bottom-0 h-1.5 bg-amber-500" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-700">Chờ phân công</span>
            <div className="rounded-xl p-2 bg-amber-50 text-amber-600">
              <Gauge className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-amber-700">
            {otherAssetStats.waiting.toLocaleString('vi-VN')} ts
          </div>
          <div className="mt-1 text-[11px] font-semibold text-amber-600 truncate">
            Sẵn sàng bàn giao
          </div>
        </button>

        {/* Card 16: Đang bảo dưỡng */}
        <button
          type="button"
          onClick={() => setCardFilter((curr) => (curr === 'OTHER_MAINTENANCE' ? 'ALL' : 'OTHER_MAINTENANCE'))}
          className={`relative overflow-hidden p-4 rounded-2xl border text-left transition-all hover:shadow-md cursor-pointer ${
            cardFilter === 'OTHER_MAINTENANCE'
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
            {otherAssetStats.maintenance.toLocaleString('vi-VN')} ts
          </div>
          <div className="mt-1 text-[11px] font-semibold text-amber-600 truncate">
            Bảo dưỡng định kỳ
          </div>
        </button>

        {/* Card 17: Hư hỏng / Sửa chữạ */}
        <button
          type="button"
          onClick={() => setCardFilter((curr) => (curr === 'OTHER_REPAIR' ? 'ALL' : 'OTHER_REPAIR'))}
          className={`relative overflow-hidden p-4 rounded-2xl border text-left transition-all hover:shadow-md cursor-pointer ${
            cardFilter === 'OTHER_REPAIR'
              ? 'border-rose-500 bg-rose-50/40 ring-2 ring-rose-500/25 shadow-sm scale-[1.01]'
              : 'border-slate-200 bg-white hover:bg-slate-50'
          }`}
        >
          <span className="absolute inset-x-0 bottom-0 h-1.5 bg-rose-500" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-700">Hư hỏng / SC</span>
            <div className="rounded-xl p-2 bg-rose-50 text-rose-600">
              <Wrench className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-rose-700">
            {otherAssetStats.repair.toLocaleString('vi-VN')} ts
          </div>
          <div className="mt-1 text-[11px] font-semibold text-rose-600 truncate">
            Tại xưởng BTSC
          </div>
        </button>

        {/* Card 18: Chưa phân bổ Đơn vị */}
        <button
          type="button"
          onClick={() => setCardFilter((curr) => (curr === 'OTHER_UNASSIGNED' ? 'ALL' : 'OTHER_UNASSIGNED'))}
          className={`relative overflow-hidden p-4 rounded-2xl border text-left transition-all hover:shadow-md cursor-pointer ${
            cardFilter === 'OTHER_UNASSIGNED'
              ? 'border-orange-500 bg-orange-50/40 ring-2 ring-orange-500/25 shadow-sm scale-[1.01]'
              : 'border-slate-200 bg-white hover:bg-slate-50'
          }`}
        >
          <span className="absolute inset-x-0 bottom-0 h-1.5 bg-orange-500" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-orange-700">Chưa phân bổ ĐV</span>
            <div className="rounded-xl p-2 bg-orange-50 text-orange-600">
              <ShieldAlert className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-orange-700">
            {otherAssetStats.unassigned.toLocaleString('vi-VN')} ts
          </div>
          <div className="mt-1 text-[11px] font-semibold text-orange-600 truncate">
            Chờ cấp phát Đơn vị
          </div>
        </button>

      </div>

      {/* 2. THANH TÌM KIẾM & CHỨC NĂNG VẬN HÀNH (GIỐNG HỒ SƠ XE) */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
        {/* ROW 1: HEADER ACTION BUTTONS */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <span className="font-heading text-sm font-extrabold text-slate-800 uppercase tracking-wide">
              {isImplementMode ? 'DANH SÁCH PHÂN BỔ THIẾT BỊ & NÔNG CỤ' : 'DANH SÁCH HỒ SƠ PHÂN BỔ XE & MÁY MÓC'}
            </span>
            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
              {isImplementMode ? filteredImplements.length.toLocaleString('vi-VN') : filteredAssignments.length.toLocaleString('vi-VN')}{' '}
              {isImplementMode ? 'thiết bị & nông cụ' : 'phương tiện'}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <input ref={importInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImportExcel} />
            <button
              type="button"
              onClick={() => {
                if (isImplementMode) {
                  setShowImplementHandoverModal(true);
                } else {
                  setShowAddModal(true);
                }
              }}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-emerald-800 bg-emerald-800 px-3.5 text-xs font-black text-white shadow-xs transition-all hover:bg-emerald-900 hover:scale-[1.01] cursor-pointer"
            >
              <Plus className="h-4 w-4 stroke-[3]" />
              {isImplementMode ? 'Lập bàn giao nông cụ mới' : 'Lập bàn giao xe mới'}
            </button>

            <button
              type="button"
              onClick={() => void catalogsApi.downloadTemplate('ASSIGNMENT')}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 text-xs font-bold text-emerald-800 transition-all hover:bg-emerald-100 cursor-pointer"
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              Tải file mẫu
            </button>

            <button
              type="button"
              onClick={() => importInputRef.current?.click()}
              disabled={importing}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-sky-200 bg-sky-50 px-3 text-xs font-bold text-sky-800 transition-all hover:bg-sky-100 disabled:opacity-50 cursor-pointer"
            >
              <Upload className="h-3.5 w-3.5" />
              {importing ? 'Đang import...' : 'Import Excel'}
            </button>

            <Link
              to="/danh-muc/loai-xe"
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-bold text-slate-700 transition-all hover:bg-slate-100"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-700" />
              Danh mục 27 Quản lý CG
              <ExternalLink className="h-3 w-3 text-slate-400" />
            </Link>

            <button
              type="button"
              onClick={handleExportExcel}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-bold text-slate-700 transition-all hover:bg-slate-100 cursor-pointer"
            >
              <Download className="h-3.5 w-3.5 text-emerald-700" />
              <span>Xuất Excel 12 Trường ({isImplementMode ? filteredImplements.length.toLocaleString('vi-VN') : filteredAssignments.length.toLocaleString('vi-VN')})</span>
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
                id="vehicle-assignment-search"
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
                  ? 'border-primary bg-primary-50 text-primary ring-2 ring-primary/20'
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
                className="inline-flex h-10 items-center gap-1 rounded-xl border border-rose-200 bg-rose-50 px-3 text-xs font-bold text-rose-700 hover:bg-rose-100 cursor-pointer"
                title="Xóa toàn bộ bộ lọc"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Đặt lại
              </button>
            )}
          </div>
        </div>

        {/* BỘ LỌC NÂNG CAO (KHI MỞ RỘNG - NGAY NGẮN & ĐỒNG BỘ 100%) */}
        {showAdvancedFilters && (
          <div className="grid grid-cols-1 gap-3 border-t border-slate-100 pt-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <div className="flex flex-col">
              <div className="h-5 mb-1 flex items-center">
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 truncate" title={`Đơn vị tiếp nhận / Sử dụng (${managementTeams.length})`}>
                  Đơn vị tiếp nhận ({managementTeams.length})
                </label>
              </div>
              <SearchableSelect
                value={selectedUnitFilter}
                onChange={setSelectedUnitFilter}
                options={unitFilterOptions}
                placeholder={`Tất cả đơn vị (${managementTeams.length})`}
                emptyOptionLabel={`Tất cả đơn vị (${managementTeams.length})`}
                heightClass="h-9"
                icon={<Building2 className="h-4 w-4" />}
              />
            </div>

            <div className="flex flex-col">
              <div className="h-5 mb-1 flex items-center">
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 truncate" title={`Nơi tập kết / Bãi xe (${locationFilterOptions.length})`}>
                  Nơi tập kết ({locationFilterOptions.length})
                </label>
              </div>
              <SearchableSelect
                value={selectedLocationFilter}
                onChange={setSelectedLocationFilter}
                options={locationFilterOptions}
                placeholder="Tất cả nơi tập kết"
                emptyOptionLabel="Tất cả nơi tập kết"
                heightClass="h-9"
                icon={<MapPin className="h-4 w-4" />}
              />
            </div>

            <div className="flex flex-col">
              <div className="h-5 mb-1 flex items-center">
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 truncate" title={`Chủng loại thiết bị (${categoryFilterOptions.length})`}>
                  Chủng loại ({categoryFilterOptions.length})
                </label>
              </div>
              <SearchableSelect
                value={selectedCategoryFilter}
                onChange={setSelectedCategoryFilter}
                options={categoryFilterOptions}
                placeholder="Tất cả chủng loại"
                emptyOptionLabel="Tất cả chủng loại"
                heightClass="h-9"
                icon={<Tractor className="h-4 w-4" />}
              />
            </div>

            <div className="flex flex-col">
              <div className="h-5 mb-1 flex items-center">
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 truncate" title={`NS Quản lý cơ giới (${buildManagementFilterManagers(managementTeams).length})`}>
                  NS Quản lý ({buildManagementFilterManagers(managementTeams).length})
                </label>
              </div>
              <SearchableSelect
                value={selectedManagerFilter}
                onChange={setSelectedManagerFilter}
                options={managerFilterOptions}
                placeholder={`Tất cả quản lý (${buildManagementFilterManagers(managementTeams).length})`}
                emptyOptionLabel={`Tất cả quản lý (${buildManagementFilterManagers(managementTeams).length})`}
                heightClass="h-9"
                icon={<Users className="h-4 w-4" />}
              />
            </div>

            <div className="flex flex-col">
              <div className="h-5 mb-1 flex items-center">
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 truncate">
                  Trạng thái bàn giao
                </label>
              </div>
              <SearchableSelect
                value={selectedStatusFilter}
                onChange={setSelectedStatusFilter}
                options={statusFilterOptions}
                placeholder="Tất cả trạng thái"
                emptyOptionLabel="Tất cả trạng thái"
                heightClass="h-9"
                icon={<ShieldCheck className="h-4 w-4" />}
              />
            </div>

            <div className="flex flex-col">
              <div className="h-5 mb-1 flex items-center">
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 truncate">
                  Phân nhóm MMTB
                </label>
              </div>
              <SearchableSelect
                value={selectedGroupFilter}
                onChange={setSelectedGroupFilter}
                options={groupFilterOptions}
                placeholder="Tất cả nhóm MMTB"
                emptyOptionLabel="Tất cả nhóm MMTB"
                heightClass="h-9"
                icon={<Tag className="h-4 w-4" />}
              />
            </div>
          </div>
        )}
      </section>

      {/* DataTable */}
      {isImplementMode ? (
        <DataTable
          title="Danh Sách Phân Bổ Thiết Bị & Nông Cụ Theo Đơn Vị Nông Trường"
          subtitle={`Hiển thị ${filteredImplements.length.toLocaleString('vi-VN')} thiết bị & nông cụ theo quyết định phân bổ và quản lý cơ giới`}
          columns={implementColumns}
          data={filteredImplements}
          isLoading={loading}
          showSearch={false}
          showExport={false}
          pageSize={20}
          useGlobalFilters={false}
          onRowClick={(row) => setSelectedImplement(row)}
        />
      ) : isOtherMode ? (
        <DataTable
          title="Danh Sách Phân Bổ Tài Sản Khác Theo Đơn Vị"
          subtitle={`Hiển thị ${filteredOtherAssets.length.toLocaleString('vi-VN')} tài sản (máy phát điện, xe nâng, xe máy...) theo đơn vị quản lý`}
          columns={columns}
          data={filteredOtherAssets}
          isLoading={loading}
          showSearch={false}
          showExport={false}
          pageSize={20}
          useGlobalFilters={false}
          onRowClick={(row) => setSelectedRecord(row)}
        />
      ) : (
        <DataTable
          title="Danh Sách Phân Bổ Xe & MMTB Theo Đơn Vị Nông Trường"
          subtitle={`Hiển thị ${filteredAssignments.length.toLocaleString('vi-VN')} phương tiện theo quyết định phân bổ và quản lý cơ giới`}
          columns={columns}
          data={filteredAssignments}
          isLoading={loading}
          showSearch={false}
          showExport={false}
          pageSize={20}
          useGlobalFilters={false}
          onRowClick={(row) => setSelectedRecord(row)}
        />
      )}


      {/* Implement Detail Modal */}
      {selectedImplement && (
        <Modal
          isOpen={!!selectedImplement}
          onClose={() => setSelectedImplement(null)}
          title={`Hồ Sơ & Lịch Sử Bàn Giao: ${selectedImplement.code}`}
          subtitle={`${selectedImplement.name} • Chủng loại: ${selectedImplement.categoryLabel}`}
          size="lg"
          footer={
            <div className="flex items-center justify-between w-full">
              <Button variant="outline" size="sm" onClick={() => setSelectedImplement(null)}>
                Đóng
              </Button>
              <Button
                variant="primary"
                size="sm"
                icon={<ArrowRightLeft className="w-3.5 h-3.5" />}
                onClick={() => {
                  const foundIdx = implementsList.findIndex((a) => a.id === selectedImplement.id);
                  if (foundIdx >= 0) setSelectedImplementIdx(foundIdx);
                  setSelectedImplement(null);
                  setShowImplementHandoverModal(true);
                }}
              >
                Lập quyết định bàn giao nông cụ này
              </Button>
            </div>
          }
        >
          <div className="space-y-4 text-xs text-slate-700">
            {/* Top Cards: Đơn vị giao & Đơn vị nhận */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Thống tin quản lý cũ */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center gap-1.5 text-[11px] font-black uppercase text-slate-600 tracking-wide border-b border-slate-200/80 pb-1.5">
                  <Building2 className="w-3.5 h-3.5 text-slate-500" />
                  <span>ĐƠN VỊ BÀN GIAO (CŨ)</span>
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center"><span className="text-slate-500">Đơn vị giao:</span> <b className="text-slate-800">Ban Cơ Giới KLH</b></div>
                  <div className="flex justify-between items-center"><span className="text-slate-500">Nơi tập kết cũ:</span> <span className="text-slate-700 font-medium">Tổng kho MMTB KLH</span></div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Phụ trách cũ:</span>
                    <span className="text-slate-700 font-medium">Quản lý kho cơ giới</span>
                  </div>
                </div>
              </div>

              {/* Thông tin bàn giao mới */}
              <div className="bg-emerald-50/70 p-3.5 rounded-xl border border-emerald-200 space-y-2">
                <div className="flex items-center justify-between border-b border-emerald-200/80 pb-1.5">
                  <div className="flex items-center gap-1.5 text-[11px] font-black uppercase text-emerald-800 tracking-wide">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>ĐƠN VỊ TIẾP NHẬN (HIỆN TẠI)</span>
                  </div>
                  <Badge variant={selectedImplement.status === 'ATTACHED' ? 'green' : 'amber'}>
                    {selectedImplement.status === 'ATTACHED' ? 'Đang sử dụng' : 'Mới bàn giao'}
                  </Badge>
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center"><span className="text-emerald-700">Đơn vị tiếp nhận:</span> <b className="text-emerald-950 font-extrabold">{selectedImplement.unit}</b></div>
                  <div className="flex justify-between items-center">
                    <span className="text-emerald-700">NS Quản lý cơ giới:</span>
                    <div className="text-right">
                      <b className="text-slate-900 block">{selectedImplement.managerName}</b>
                      {selectedImplement.managerPhone && (
                        <span className="text-[10px] text-slate-600 font-mono block">📞 {selectedImplement.managerPhone}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-between items-center"><span className="text-emerald-700">Nơi tập kết:</span> <span className="font-semibold text-slate-800">{selectedImplement.gatheringLocation || 'Bãi kho Nông trường'}</span></div>
                </div>
              </div>
            </div>

            {/* LỊCH SỬ ĐIỀU CHUYỂN & BÀN GIAO */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center gap-2">
                  <History className="w-4 h-4 text-primary" />
                  <span className="font-extrabold text-slate-900 text-xs uppercase tracking-wide">
                    Lịch Sử Bàn Giao & Phối Ghép Nông Cụ
                  </span>
                </div>
                <span className="text-[11px] text-slate-400 font-semibold">Theo dõi vòng đời tài sản</span>
              </div>

              {/* Timeline Items */}
              <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                <div className="relative">
                  <span className="absolute -left-6 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-white ring-4 ring-emerald-100">
                    <CheckCircle2 className="h-3 w-3" />
                  </span>
                  <div className="bg-emerald-50/50 p-2.5 rounded-lg border border-emerald-200/70">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-emerald-900 text-xs">
                        Đang phân bổ tại: {selectedImplement.unit}
                      </span>
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded font-mono">
                        🕒 08:15 26/08/2026
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-1">
                      📍 Nơi tập kết: <strong className="text-slate-800">{selectedImplement.gatheringLocation || 'Bãi kho'}</strong> • Phụ trách: <strong className="text-slate-800">{selectedImplement.managerName}</strong>
                    </p>
                  </div>
                </div>

                <div className="relative">
                  <span className="absolute -left-6 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-slate-400 text-white ring-4 ring-slate-100">
                    <Building2 className="h-3 w-3" />
                  </span>
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-700 text-xs">
                        Tiếp nhận máy gắn & Nhập danh mục Nông cụ KLH
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">🕒 07:30 05/01/2025 • Tổng kho KLH</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Đăng ký hồ sơ tài sản nông cụ, gán mã định danh kỹ thuật <strong>{selectedImplement.code}</strong>.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Implement Handover Modal */}
      <Modal
        isOpen={showImplementHandoverModal}
        onClose={() => setShowImplementHandoverModal(false)}
        title={
          implementsList[selectedImplementIdx]
            ? `Lập Biên Bản Bàn Giao: ${implementsList[selectedImplementIdx].code}`
            : 'Lập Biên Bản Bàn Giao Nông Cụ / Máy Gắn'
        }
        subtitle={
          implementsList[selectedImplementIdx]
            ? `Mã nông cụ: ${implementsList[selectedImplementIdx].code} • ${implementsList[selectedImplementIdx].name} • Chủng loại: ${implementsList[selectedImplementIdx].categoryLabel}`
            : 'Chỉ định đơn vị tiếp nhận và NS quản lý cơ giới phụ trách nông cụ'
        }
        size="lg"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setShowImplementHandoverModal(false)} disabled={submittingHandover}>Hủy</Button>
            <Button variant="primary" size="sm" onClick={handleImplementHandover} disabled={submittingHandover}>
              {submittingHandover ? 'Đang lưu quyết định...' : 'Ký Quyết Định Bàn Giao'}
            </Button>
          </>
        }
      >
        <div className="space-y-4 text-xs">
          {/* 1. MÃ NÔNG CỤ / BIỂN SỐ */}
          <div>
            <label className="font-bold text-slate-700 block mb-1">
              Mã nông cụ / Biển số:
            </label>
            {implementsList[selectedImplementIdx] && (
              <div className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3.5 flex items-center justify-between text-xs font-semibold text-slate-800 shadow-2xs">
                <div className="flex items-center gap-2">
                  <strong className="text-primary font-bold">{implementsList[selectedImplementIdx].code}</strong>
                  <span className="text-slate-300">|</span>
                  <span className="text-slate-600 font-mono font-medium">Biển số: —</span>
                  <span className="text-slate-300">|</span>
                  <span className="text-slate-700">{implementsList[selectedImplementIdx].name}</span>
                </div>
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                  {implementsList[selectedImplementIdx].unit || 'Tại bãi kho'}
                </span>
              </div>
            )}
          </div>

          {/* 2. KHỐI THÔNG TIN QUẢN LÝ CŨ (TỰ ĐỘNG TRÍCH XUẤT) */}
          {implementsList[selectedImplementIdx] && (
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1.5 text-slate-700">
              <div className="flex items-center justify-between pb-1 border-b border-slate-200">
                <span className="text-[11px] font-black uppercase text-slate-500 tracking-wider">
                  📌 THÔNG TIN QUẢN LÝ CŨ (ĐƠN VỊ VÀ BÃI TẬP KẾT HIỆN TẠI)
                </span>
                <span className="text-[10px] font-bold text-slate-500 bg-slate-200/80 px-2 py-0.5 rounded-md">Tự động trích xuất</span>
              </div>
              <div className="grid grid-cols-3 gap-2 pt-1">
                <div>
                  <span className="text-slate-500 block text-[11px]">Đơn vị quản lý cũ:</span>
                  <b className="text-slate-900">{implementsList[selectedImplementIdx].unit || 'Chưa phân bổ'}</b>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Nơi tập kết cũ:</span>
                  <b className="text-slate-900">{implementsList[selectedImplementIdx].gatheringLocation || 'Chưa thiết lập'}</b>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Quản lý / Phụ trách cũ:</span>
                  <b className="text-slate-900">{implementsList[selectedImplementIdx].managerName || 'Chưa bổ nhiệm'}</b>
                </div>
              </div>
            </div>
          )}

          {/* 3. KHỐI ĐIỀU CHUYỂN BÀN GIAO MỚI */}
          <div className="space-y-3 pt-1">
            <span className="text-[11px] font-black uppercase text-emerald-700 tracking-wider block">
              ✏️ THÔNG TIN BÀN GIAO & ĐIỀU CHUYỂN MỚI
            </span>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Đơn vị tiếp nhận mới:</label>
                <SearchableSelect
                  value={newUnit}
                  onChange={handleSelectNewUnit}
                  options={unitOptions}
                  placeholder="Nhập hoặc tìm chọn đơn vị..."
                  allowCustomInput={true}
                  heightClass="h-9"
                  bgClass="bg-white"
                  emptyOptionLabel="-- Chọn đơn vị --"
                  emptyValue=""
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Nơi tập kết mới (Bãi xe mới):</label>
                <SearchableSelect
                  value={newLocation}
                  onChange={handleSelectNewLocation}
                  options={locationOptions}
                  placeholder="Nhập hoặc tìm chọn bãi tập kết..."
                  allowCustomInput={true}
                  heightClass="h-9"
                  bgClass="bg-white"
                  emptyOptionLabel="-- Chọn nơi tập kết --"
                  emptyValue=""
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1">NS quản lí xe cơ giới:</label>
                <SearchableSelect
                  value={newManager}
                  onChange={handleSelectNewManager}
                  options={managerOptions}
                  placeholder="Nhập hoặc tìm chọn NS quản lý..."
                  allowCustomInput={true}
                  heightClass="h-9"
                  bgClass="bg-white"
                  emptyOptionLabel="-- Chọn NS quản lý --"
                  emptyValue=""
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Ngày bàn giao hiệu lực:</label>
                <input
                  type="date"
                  value={transferDate}
                  onChange={(e) => setTransferDate(e.target.value)}
                  className="w-full h-9 p-2 border border-slate-200 rounded-xl bg-white font-bold text-xs"
                />
              </div>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Mục đích sử dụng & Lý do bàn giao:</label>
              <input
                type="text"
                value={transferPurpose}
                onChange={(e) => setTransferPurpose(e.target.value)}
                placeholder="Ví dụ: Cày lật đất sâu 35cm đất trồng chuối Lô CN-A"
                className="w-full p-2 border border-slate-200 rounded-xl bg-white"
              />
            </div>
          </div>
        </div>
      </Modal>
      {selectedRecord && (
        <Modal
          isOpen={!!selectedRecord}
          onClose={() => setSelectedRecord(null)}
          title={`Hồ Sơ & Lịch Sử Phân Bổ: ${selectedRecord.vehicleCode}`}
          subtitle={`${selectedRecord.vehicleType} • Biển số: ${selectedRecord.plateNumber || 'Chưa gắn biển'}`}
          size="lg"
          footer={
            <div className="flex items-center justify-between w-full">
              <Button variant="outline" size="sm" onClick={() => setSelectedRecord(null)}>
                Đóng
              </Button>
              <Button
                variant="primary"
                size="sm"
                icon={<ArrowRightLeft className="w-3.5 h-3.5" />}
                onClick={() => {
                  const foundIdx = assignmentsList.findIndex((a) => a.id === selectedRecord.id);
                  if (foundIdx >= 0) setSelectedVehicleIdx(foundIdx);
                  setSelectedRecord(null);
                  setShowAddModal(true);
                }}
              >
                Lập quyết định điều chuyển xe này
              </Button>
            </div>
          }
        >
          <div className="space-y-4 text-xs text-slate-700">
            {/* Top Cards: Đơn vị giao & Đơn vị nhận */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Thống tin quản lý cũ */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center gap-1.5 text-[11px] font-black uppercase text-slate-600 tracking-wide border-b border-slate-200/80 pb-1.5">
                  <Building2 className="w-3.5 h-3.5 text-slate-500" />
                  <span>ĐƠN VỊ BÀN GIAO (CŨ)</span>
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center"><span className="text-slate-500">Đơn vị:</span> <b className="text-slate-800">{selectedRecord.oldUnitName}</b></div>
                  <div className="flex justify-between items-center"><span className="text-slate-500">Nơi tập kết cũ:</span> <span className="text-slate-700 font-medium">{selectedRecord.oldLocation}</span></div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Phụ trách cũ:</span>
                    <div className="text-right">
                      <span className="text-slate-700 font-medium block">{selectedRecord.oldManager}</span>
                      {selectedRecord.oldManagerPhone && (
                        <span className="text-[10px] text-slate-500 font-mono block">📞 {selectedRecord.oldManagerPhone}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Thông tin bàn giao mới */}
              <div className="bg-emerald-50/70 p-3.5 rounded-xl border border-emerald-200 space-y-2">
                <div className="flex items-center justify-between border-b border-emerald-200/80 pb-1.5">
                  <div className="flex items-center gap-1.5 text-[11px] font-black uppercase text-emerald-800 tracking-wide">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>ĐƠN VỊ TIẾP NHẬN (HIỆN TẠI)</span>
                  </div>
                  <Badge variant={selectedRecord.status === 'active' ? 'green' : 'amber'}>
                    {selectedRecord.status === 'active' ? 'Đang hoạt động' : 'Mới bàn giao'}
                  </Badge>
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center"><span className="text-emerald-700">Đơn vị tiếp nhận:</span> <b className="text-emerald-950 font-extrabold">{selectedRecord.unitName}</b></div>
                  <div className="flex justify-between items-center">
                    <span className="text-emerald-700">NS Quản lý cơ giới:</span>
                    <div className="text-right">
                      <b className="text-slate-900 block">{selectedRecord.driverName}</b>
                      {selectedRecord.driverPhone && (
                        <span className="text-[10px] text-slate-600 font-mono block">📞 {selectedRecord.driverPhone}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-emerald-700">Thời gian cập nhật:</span>
                    <span className="font-bold text-slate-800 font-mono text-xs">
                      🕒 {selectedRecord.assignedDate?.includes(':') ? selectedRecord.assignedDate : `07:00 ${selectedRecord.assignedDate || '26/08/2026'}`}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* LỊCH SỬ ĐIỀU CHUYỂN PHƯƠNG TIỆN */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center gap-2">
                  <History className="w-4 h-4 text-primary" />
                  <span className="font-extrabold text-slate-900 text-xs uppercase tracking-wide">
                    Lịch Sử Điều Chuyển & Phân Bổ Phương Tiện
                  </span>
                </div>
                <span className="text-[11px] text-slate-400 font-semibold">Theo dõi vòng đời tài sản</span>
              </div>

              {/* Timeline Items */}
              <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                {/* Stage 1 - Latest / Current */}
                <div className="relative">
                  <span className="absolute -left-6 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-white ring-4 ring-emerald-100">
                    <CheckCircle2 className="h-3 w-3" />
                  </span>
                  <div className="bg-emerald-50/50 p-2.5 rounded-lg border border-emerald-200/70">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-emerald-900 text-xs">
                        {selectedRecord.unitName === 'Chưa phân bổ'
                          ? 'Chờ phân bổ đơn vị sản xuất'
                          : `Đang bố trí vận hành tại: ${selectedRecord.unitName}`}
                      </span>
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded font-mono">
                        🕒 {selectedRecord.assignedDate?.includes(':') ? selectedRecord.assignedDate : `07:00 ${selectedRecord.assignedDate || '26/08/2026'}`}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-1">
                      📍 Nơi tập kết: <strong className="text-slate-800">{selectedRecord.oldLocation}</strong> • NS Quản lý: <strong className="text-slate-800">{selectedRecord.driverName}</strong>
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5 italic">
                      Mục đích: {selectedRecord.purpose || 'Phục vụ công tác cơ giới hóa nông nghiệp'}
                    </p>
                  </div>
                </div>

                {/* Stage 2 - Transfer decision */}
                {selectedRecord.unitName !== 'Chưa phân bổ' && (
                  <div className="relative">
                    <span className="absolute -left-6 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-white ring-4 ring-blue-100">
                      <ArrowRightLeft className="h-3 w-3" />
                    </span>
                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800 text-xs">
                          Biên bản bàn giao: {selectedRecord.oldUnitName} ➔ {selectedRecord.unitName}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">🕒 08:30 15/01/2026 • QĐ-ĐC/{selectedRecord.vehicleCode}</span>
                      </div>
                      <p className="text-[11px] text-slate-600 mt-1">
                        Thực hiện điều chuyển tài sản cơ giới nội bộ theo phê duyệt của Ban Cơ Giới KLH.
                      </p>
                    </div>
                  </div>
                )}

                {/* Stage 3 - Initial intake */}
                <div className="relative">
                  <span className="absolute -left-6 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-slate-400 text-white ring-4 ring-slate-100">
                    <Building2 className="h-3 w-3" />
                  </span>
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-700 text-xs">
                        Tiếp nhận phương tiện & Nhập danh mục MMTB KLH
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">🕒 07:00 01/01/2025 • Tổng kho KLH</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Đăng ký hồ sơ tài sản cơ giới, gán mã định danh kỹ thuật <strong>{selectedRecord.vehicleCode}</strong>.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Add Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title={
          currentSelectedVehicle
            ? `Lập Biên Bản Bàn Giao: ${currentSelectedVehicle.vehicleCode}`
            : 'Lập Biên Bản Bàn Giao Xe Mới'
        }
        subtitle={
          currentSelectedVehicle
            ? `Mã xe: ${currentSelectedVehicle.vehicleCode} • ${currentSelectedVehicle.vehicleType} • Biển số: ${currentSelectedVehicle.plateNumber || '—'}`
            : 'Chỉ định đơn vị tiếp nhận và NS quản lý xe cơ giới phụ trách phương tiện'
        }
        size="lg"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setShowAddModal(false)} disabled={submittingHandover}>Hủy</Button>
            <Button variant="primary" size="sm" onClick={handleVehicleHandover} disabled={submittingHandover}>
              {submittingHandover ? 'Đang lưu quyết định...' : 'Ký Quyết Định Bàn Giao'}
            </Button>
          </>
        }
      >
        <div className="space-y-4 text-xs">
          {/* 1. MÃ XE / BIỂN SỐ */}
          <div>
            <label className="font-bold text-slate-700 block mb-1">
              Mã xe / Biển số:
            </label>
            {currentSelectedVehicle && (
              <div className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3.5 flex items-center justify-between text-xs font-semibold text-slate-800 shadow-2xs">
                <div className="flex items-center gap-2">
                  <strong className="text-primary font-bold">{currentSelectedVehicle.vehicleCode}</strong>
                  <span className="text-slate-300">|</span>
                  <span className="text-slate-600 font-mono font-medium">Biển số: {currentSelectedVehicle.plateNumber || '—'}</span>
                  <span className="text-slate-300">|</span>
                  <span className="text-slate-700">{currentSelectedVehicle.vehicleType}</span>
                </div>
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                  {currentSelectedVehicle.unitName}
                </span>
              </div>
            )}
          </div>

          {/* 2. KHỐI THÔNG TIN QUẢN LÝ CŨ (TỰ ĐỘNG LẤY TỪ XE ĐƯỢC CHỌN) */}
          {currentSelectedVehicle && (
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1.5 text-slate-700">
              <div className="flex items-center justify-between pb-1 border-b border-slate-200">
                <span className="text-[11px] font-black uppercase text-slate-500 tracking-wider">
                  📌 THÔNG TIN QUẢN LÝ CŨ (ĐƠN VỊ VÀ BÃI TẬP KẾT HIỆN TẠI)
                </span>
                <span className="text-[10px] font-bold text-slate-500 bg-slate-200/80 px-2 py-0.5 rounded-md">Tự động trích xuất</span>
              </div>
              <div className="grid grid-cols-3 gap-2 pt-1">
                <div>
                  <span className="text-slate-500 block text-[11px]">Đơn vị quản lý cũ:</span>
                  <b className="text-slate-900">{currentSelectedVehicle.oldUnitName}</b>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Nơi tập kết cũ:</span>
                  <b className="text-slate-900">{currentSelectedVehicle.oldLocation}</b>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Quản lý / Phụ trách cũ:</span>
                  <b className="text-slate-900">{currentSelectedVehicle.oldManager}</b>
                </div>
              </div>
            </div>
          )}

          {/* 3. KHỐI ĐIỀU CHUYỂN BÀN GIAO MỚI */}
          <div className="space-y-3 pt-1">
            <span className="text-[11px] font-black uppercase text-emerald-700 tracking-wider block">
              ✏️ THÔNG TIN BÀN GIAO & ĐIỀU CHUYỂN MỚI
            </span>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Đơn vị tiếp nhận mới:</label>
                <SearchableSelect
                  value={newUnit}
                  onChange={handleSelectNewUnit}
                  options={unitOptions}
                  placeholder="Nhập hoặc tìm chọn đơn vị..."
                  allowCustomInput={true}
                  heightClass="h-9"
                  bgClass="bg-white"
                  emptyOptionLabel="-- Chọn đơn vị --"
                  emptyValue=""
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Nơi tập kết mới (Bãi xe mới):</label>
                <SearchableSelect
                  value={newLocation}
                  onChange={handleSelectNewLocation}
                  options={locationOptions}
                  placeholder="Nhập hoặc tìm chọn bãi tập kết..."
                  allowCustomInput={true}
                  heightClass="h-9"
                  bgClass="bg-white"
                  emptyOptionLabel="-- Chọn nơi tập kết --"
                  emptyValue=""
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1">NS quản lí xe cơ giới:</label>
                <SearchableSelect
                  value={newManager}
                  onChange={handleSelectNewManager}
                  options={managerOptions}
                  placeholder="Nhập hoặc tìm chọn NS quản lý..."
                  allowCustomInput={true}
                  heightClass="h-9"
                  bgClass="bg-white"
                  emptyOptionLabel="-- Chọn NS quản lý --"
                  emptyValue=""
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Ngày bàn giao hiệu lực:</label>
                <input
                  type="date"
                  value={transferDate}
                  onChange={(e) => setTransferDate(e.target.value)}
                  className="w-full h-9 p-2 border border-slate-200 rounded-xl bg-white font-bold text-xs"
                />
              </div>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Mục đích sử dụng & Lý do bàn giao:</label>
              <input
                type="text"
                value={transferPurpose}
                onChange={(e) => setTransferPurpose(e.target.value)}
                placeholder="Ví dụ: Cày lật đất sâu 35cm đất trồng chuối Lô CN-A"
                className="w-full p-2 border border-slate-200 rounded-xl bg-white"
              />
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};
