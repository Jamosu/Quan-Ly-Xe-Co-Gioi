import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Calendar,
  CalendarClock,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock,
  FileText,
  HardHat,
  Info,
  Layers,
  ListPlus,
  Lock,
  MapPin,
  Plus,
  RefreshCw,
  Save,
  ShieldCheck,
  Sparkles,
  Tractor,
  Truck,
  User,
  UserCheck,
  Wrench,
  Fuel,
  AlertTriangle,
  LayoutGrid,
  Table as TableIcon,
  X,
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { operationsApi } from '../../api/operations';
import {
  schedulingApi,
  type OperationalWorkOrderRecord,
  type PreparationContextResponse,
} from '../../api/scheduling';
import { catalogsApi } from '../../api/catalogsApi';
import { driverManagementApi, type DriverManagementUnit } from '../../api/driverManagementApi';
import {
  MasterJobItem,
  getStoredStages,
} from '../../data/jobCatalogData';
import type { CatalogItem } from '../../data/catalogData';
import { getStoredData } from '../../utils/storage';
import {
  getStoredPlots,
  getStoredAgriTeams,
  getStoredConstructionSites,
  getStoredConstructionTeams,
  AgriculturalPlotItem,
  ConstructionSiteItem,
  TransportRouteItem,
} from '../../data/locationCatalogData';
import {
  mockComplexes,
  mockEnterprises,
  mockFarms,
} from '../../data/dispatchPlanningData';
import {
  getWeeksOfYear,
  WeekOption,
  formatDateStr,
  getWeekNumber,
} from '../../pages/dispatch/ProductionPlanPage';
import {
  toLocalDateTimeInput,
} from './WorkflowActionPanel';
import { Button } from '../common/Button';
import { SearchableSelect, type SelectOption } from '../common/SearchableSelect';
import { ResourceTimeline } from './ResourceTimeline';
import { ConstructionOrderFormBlocks } from './ConstructionOrderFormBlocks';
import { TransportOrderFormBlocks } from './TransportOrderFormBlocks';

export type Category = 'AGRICULTURE' | 'CONSTRUCTION' | 'TRANSPORT';
export type AssignmentMode = 'FIXED_ASSIGNMENT' | 'OPEN_ASSIGNMENT';
export type Priority = 'NORMAL' | 'HIGH' | 'URGENT';
export type RouteFlowType = 'ONE_WAY' | 'TWO_WAY';

export interface FormState {
  category: Category;
  managementUnitId: string;

  // Lập kế hoạch Nông nghiệp (Hình 1)
  selectedYear: number;
  selectedWeekNumber: number;
  planCode: string;
  planTitle: string;
  selectedStageCode: string;
  durationHours: number;
  startTime: string;

  // Phân cấp đơn vị quản lý (Hình 1)
  complexCode: string;
  complexName: string;
  enterpriseCode: string;
  enterpriseName: string;
  farmCode: string;
  farmName: string;
  teamCode: string;
  teamName: string;
  unit: string;

  // Nông nghiệp đặc thù (Hình 2)
  stageCode: string;
  stageName: string;
  cropType: string;
  implementGroup: string;
  recommendedVehicle: string;
  quotaPerShift: string;
  fuelQuota: number;
  fuelUnit: string;

  // Công trình
  constructionCategory: string;
  constructionItem: string;
  equipmentType: string;
  targetScope: string;
  expectedDurationHours: string;

  // Vận chuyển
  transportCategory: string;
  cargoType: string;
  routeFlowType: RouteFlowType;
  distanceKm: string;
  speedLimitKmH: string;
  returnCargoName: string;
  returnOrigin: string;
  returnDestination: string;
  returnTonnage: string;

  // Chung: Công việc, vị trí, địa điểm
  jobCode: string;
  jobName: string;
  jobDescription: string;
  workLocationKey: string;
  workLocationText: string;
  workLocationNotes: string;
  origin: string;
  destination: string;
  targetQuantity: string;
  targetUnit: string;

  // Thời gian & ca (Hình 3)
  plannedStartAt: string;
  plannedEndAt: string;
  expectedCompletedAt: string;
  shift: string;
  priority: Priority;
  breakHours?: number;

  // Nguồn lực (Hình 3)
  assignmentMode: AssignmentMode;
  vehicleId: string;
  driverId: string;
  implementId: string;
  implementIds?: string[];
  notes: string;
}

const localDateTime = (value: Date | string) => {
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
};

const freshForm = (initialCategory: Category = 'AGRICULTURE'): FormState => {
  const start = new Date();
  start.setMinutes(0, 0, 0);
  start.setHours(start.getHours() + 1);
  const end = new Date(start.getTime() + 10 * 60 * 60 * 1000);
  const currentYear = start.getFullYear();
  const currentWeek = getWeekNumber(start) <= 52 ? getWeekNumber(start) : 37;

  const base = {
    category: initialCategory,
    managementUnitId: '',
    selectedYear: currentYear,
    selectedWeekNumber: currentWeek,
    durationHours: 8,
    breakHours: 1,
    startTime: localDateTime(start),
    plannedStartAt: localDateTime(start),
    plannedEndAt: localDateTime(end),
    expectedCompletedAt: localDateTime(end).slice(0, 10),
    shift: 'CA_NGAY',
    priority: 'NORMAL' as Priority,
    assignmentMode: 'FIXED_ASSIGNMENT' as AssignmentMode,
    vehicleId: '',
    driverId: '',
    implementId: '',
    implementIds: [],
    notes: '',
    complexCode: 'KOUN_MOM',
    complexName: 'Khu liên hợp Koun Mom',
    workLocationNotes: '',
  };

  if (initialCategory === 'CONSTRUCTION') {
    return {
      ...base,
      planCode: '',
      planTitle: '',
      selectedStageCode: '',
      enterpriseCode: '',
      enterpriseName: '',
      farmCode: '',
      farmName: '',
      teamCode: '',
      teamName: '',
      unit: 'KOUN_MOM',
      stageCode: '',
      stageName: '',
      cropType: '',
      implementGroup: '',
      recommendedVehicle: '',
      quotaPerShift: '',
      fuelQuota: 0,
      fuelUnit: 'Lít/h',
      constructionCategory: '',
      constructionItem: '',
      equipmentType: '',
      targetScope: '',
      expectedDurationHours: '8',
      transportCategory: '',
      cargoType: '',
      routeFlowType: 'ONE_WAY',
      distanceKm: '',
      speedLimitKmH: '',
      returnCargoName: '',
      returnOrigin: '',
      returnDestination: '',
      returnTonnage: '',
      jobCode: '',
      jobName: '',
      jobDescription: '',
      workLocationKey: '',
      workLocationText: '',
      origin: '',
      destination: '',
      targetQuantity: '',
      targetUnit: 'km',
    };
  }

  if (initialCategory === 'TRANSPORT') {
    return {
      ...base,
      planCode: '',
      planTitle: '',
      selectedStageCode: '',
      enterpriseCode: '',
      enterpriseName: '',
      farmCode: '',
      farmName: '',
      teamCode: '',
      teamName: '',
      unit: 'KOUN_MOM',
      stageCode: '',
      stageName: '',
      cropType: '',
      implementGroup: '',
      recommendedVehicle: '',
      quotaPerShift: '',
      fuelQuota: 0,
      fuelUnit: 'Lít/100km',
      constructionCategory: '',
      constructionItem: '',
      equipmentType: '',
      targetScope: '',
      expectedDurationHours: '8',
      transportCategory: '',
      cargoType: '',
      routeFlowType: 'ONE_WAY',
      distanceKm: '',
      speedLimitKmH: '',
      returnCargoName: '',
      returnOrigin: '',
      returnDestination: '',
      returnTonnage: '',
      jobCode: '',
      jobName: '',
      jobDescription: '',
      workLocationKey: '',
      workLocationText: '',
      origin: '',
      destination: '',
      targetQuantity: '',
      targetUnit: 'Tấn',
    };
  }

  // Mặc định AGRICULTURE
  return {
    ...base,
    planCode: '',
    planTitle: '',
    selectedStageCode: '',
    enterpriseCode: '',
    enterpriseName: '',
    farmCode: '',
    farmName: '',
    teamCode: '',
    teamName: '',
    unit: 'KOUN_MOM',
    stageCode: '',
    stageName: '',
    cropType: '',
    implementGroup: '',
    recommendedVehicle: '',
    quotaPerShift: '',
    fuelQuota: 0,
    fuelUnit: 'Lít/ha',
    constructionCategory: '',
    constructionItem: '',
    equipmentType: '',
    targetScope: '',
    expectedDurationHours: '8',
    transportCategory: '',
    cargoType: '',
    routeFlowType: 'ONE_WAY',
    distanceKm: '',
    speedLimitKmH: '',
    returnCargoName: '',
    returnOrigin: '',
    returnDestination: '',
    returnTonnage: '',
    jobCode: '',
    jobName: '',
    jobDescription: '',
    workLocationKey: '',
    workLocationText: '',
    origin: '',
    destination: '',
    targetQuantity: '',
    targetUnit: 'ha',
  };
};

const categoryInfo: Record<
  Category,
  {
    title: string;
    short: string;
    prefix: string;
    icon: React.FC<{ className?: string }>;
    tone: 'emerald' | 'amber' | 'blue';
    planType: 'NONG_NGHIEP' | 'CONG_TRINH' | 'VAN_CHUYEN';
    tagColor: string;
    desc: string;
  }
> = {
  AGRICULTURE: {
    title: 'Nông nghiệp',
    short: 'Cơ giới trên lô thửa',
    prefix: 'LDX-NN-MỚI',
    icon: Tractor,
    tone: 'emerald',
    planType: 'NONG_NGHIEP',
    tagColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    desc: 'Làm đất, cày lật, bừa đĩa, rạch hàng, bón phân và chăm sóc lô chuối/cây ăn trái.',
  },
  CONSTRUCTION: {
    title: 'Công trình',
    short: 'Công trình & ca máy',
    prefix: 'LDX-CT-MỚI',
    icon: HardHat,
    tone: 'amber',
    planType: 'CONG_TRINH',
    tagColor: 'bg-amber-50 text-amber-800 border-amber-200',
    desc: 'Đào mương, nạo vét, đào hố móng, đắp bờ bao, san gạt và đầm nén nền đường.',
  },
  TRANSPORT: {
    title: 'Vận chuyển',
    short: 'Vận chuyển nội bộ',
    prefix: 'LVC-NB-MỚI',
    icon: Truck,
    tone: 'blue',
    planType: 'VAN_CHUYEN',
    tagColor: 'bg-blue-50 text-blue-700 border-blue-200',
    desc: 'Vận tải chuối xuất khẩu, phân bón vật tư, bắp sinh khối, tiếp dầu bồn lưu động.',
  },
};

const mapCatalogItemToDispatchJob = (item: CatalogItem): MasterJobItem => ({
  id: item.id,
  code: item.code,
  name: item.name,
  planType: (item.parentCode as MasterJobItem['planType']) || 'NONG_NGHIEP',
  categoryCode: item.enterpriseName || '',
  categoryName: item.parentName || '',
  implementGroup: item.farmName || '',
  recommendedVehicle: item.plotStatus || '',
  routeFlowType: item.routeFlowType,
  defaultUnit: item.systemId || '',
  quotaPerShift: item.managerName || '',
  fuelQuota: item.areaHa || 0,
  fuelUnit: item.address || 'Lít/ha',
  complexCode: item.phone || '',
  description: item.description || '',
});

const mapCatalogItemToDispatchRoute = (item: CatalogItem): TransportRouteItem => {
  const [origin = '', destination = ''] = (item.address || '').split('➔').map((value) => value.trim());
  const description = item.description || '';

  return {
    id: item.id,
    code: item.code,
    name: item.name,
    origin,
    destination,
    distanceKm: Number(description.match(/Cự ly:\s*([\d.]+)/)?.[1]) || 0,
    complexCode: (item.parentCode as TransportRouteItem['complexCode']) || 'KOUN_MOM',
    complexName: item.parentName || '',
    cargoType: description.match(/Hàng:\s*([^|]+)/)?.[1]?.trim() || '',
    speedLimitKmH: Number(description.match(/Tốc độ GPS:\s*(\d+)/)?.[1]) || 0,
    recommendedVehicles: item.managerName || '',
    routeFlowType: item.routeFlowType || 'ONE_WAY',
    returnOrigin: item.returnOrigin || '',
    returnDestination: item.returnDestination || '',
    returnCargoName: item.returnCargoName || '',
    returnTonnage: item.returnTonnage || 0,
    status: item.status === 'TAM_DUNG' ? 'maintenance' : 'active',
    statusLabel: item.status === 'TAM_DUNG' ? 'Tạm dừng' : 'Hoạt động',
    notes: description,
  };
};


export const calculateEndTimeFormatted = (startIso: string, hours: number, breakHours: number = 0) => {
  const s = new Date(startIso);
  if (Number.isNaN(s.getTime())) return '—';
  const totalHours = Number(hours || 0) + Number(breakHours || 0);
  const e = new Date(s.getTime() + totalHours * 3600000);
  const timeStr = e.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  const dateStr = e.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  return `${timeStr} ngày ${dateStr}`;
};

const inputClass =
  'h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-800 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/15 disabled:bg-slate-100 disabled:cursor-not-allowed';
const textAreaClass =
  'w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/15 disabled:bg-slate-100 disabled:cursor-not-allowed';

const Field: React.FC<{
  label: string;
  required?: boolean;
  hint?: string;
  isPlanLocked?: boolean;
  children: React.ReactNode;
}> = ({ label, required, hint, isPlanLocked, children }) => (
  <label className="space-y-1.5 text-xs font-bold text-slate-700 block">
    <div className="flex items-center justify-between">
      <span>
        {label}
        {required && <span className="ml-1 text-rose-500">*</span>}
      </span>
      {isPlanLocked && (
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-400">
          <Lock className="h-3 w-3 text-slate-400" />
          Kế hoạch đã chốt
        </span>
      )}
    </div>
    {children}
    {hint && <span className="block text-[10.5px] font-medium text-slate-400">{hint}</span>}
  </label>
);

const Section: React.FC<{
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  children: React.ReactNode;
}> = ({ icon, title, subtitle, badge, children }) => (
  <section className="rounded-2xl border border-slate-200/90 bg-white shadow-xs overflow-hidden">
    <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-3.5 bg-slate-50/50">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 rounded-xl bg-emerald-50 p-2 text-emerald-700 border border-emerald-100">
          {icon}
        </span>
        <div>
          <h2 className="text-sm font-extrabold text-slate-900 tracking-tight">{title}</h2>
          {subtitle && <p className="mt-0.5 text-[11px] text-slate-500">{subtitle}</p>}
        </div>
      </div>
      {badge}
    </div>
    <div className="p-5">{children}</div>
  </section>
);

export const DispatchOrderForm: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const workOrderIdParam = Number(searchParams.get('workOrderId') || 0) || undefined;
  const planIdParam = Number(searchParams.get('planId') || 0) || undefined;
  const itemIdParam = Number(searchParams.get('itemId') || 0) || undefined;
  const rawCat = searchParams.get('category')?.toUpperCase();
  const initialCat: Category =
    rawCat === 'CONSTRUCTION' || rawCat === 'CONG_TRINH'
      ? 'CONSTRUCTION'
      : rawCat === 'TRANSPORT' || rawCat === 'VAN_CHUYEN' || rawCat === 'NOI_BO'
      ? 'TRANSPORT'
      : 'AGRICULTURE';

  const [form, setForm] = useState<FormState>(() => freshForm(initialCat));
  const [sourceOrder, setSourceOrder] = useState<OperationalWorkOrderRecord | null>(null);
  const [context, setContext] = useState<PreparationContextResponse | null>(null);
  const [generatedOrders, setGeneratedOrders] = useState<
    Array<{ id: number; code: string; workOrderId?: number; status: string }>
  >([]);
  const [loading, setLoading] = useState(Boolean(workOrderIdParam || (planIdParam && itemIdParam)));
  const [contextLoading, setContextLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [agriTaskViewMode, setAgriTaskViewMode] = useState<'CARD' | 'TABLE'>('CARD');
  const [autoVehicleNotice, setAutoVehicleNotice] = useState<{
    type: 'PRIMARY_1' | 'PRIMARY_2' | 'SECONDARY' | 'ALL_BUSY' | 'NO_ASSIGNED';
    message: string;
    badge: string;
    tone: 'emerald' | 'amber' | 'blue' | 'rose' | 'slate';
  } | null>(null);

  useEffect(() => {
    if (sourceOrder) return;
    const raw = searchParams.get('category')?.toUpperCase();
    if (!raw) return;
    let targetCat: Category | null = null;
    if (raw === 'CONSTRUCTION' || raw === 'CONG_TRINH') targetCat = 'CONSTRUCTION';
    else if (raw === 'TRANSPORT' || raw === 'VAN_CHUYEN' || raw === 'NOI_BO') targetCat = 'TRANSPORT';
    else if (raw === 'AGRICULTURE' || raw === 'NONG_NGHIEP') targetCat = 'AGRICULTURE';

    if (targetCat && targetCat !== form.category) {
      setForm(freshForm(targetCat));
    }
  }, [searchParams, sourceOrder, form.category]);

  // Nạp danh mục từ Catalogs API
  interface AdminUnitItem {
    code: string;
    name: string;
    parentCode?: string;
    areaHa?: number;
  }
  const [complexes, setComplexes] = useState<AdminUnitItem[]>(mockComplexes);
  const [enterprises, setEnterprises] = useState<AdminUnitItem[]>(mockEnterprises);
  const [farms, setFarms] = useState<AdminUnitItem[]>(mockFarms);
  const [catalogJobs, setCatalogJobs] = useState<MasterJobItem[]>([]);
  const [catalogTransportRoutes, setCatalogTransportRoutes] = useState<TransportRouteItem[]>([]);
  const [managementUnits, setManagementUnits] = useState<DriverManagementUnit[]>([]);

  useEffect(() => {
    driverManagementApi.getUnits({ level: 'TEAM', status: 'ACTIVE' })
      .then((items) => setManagementUnits(items.filter((item) => item.level === 'TEAM' && item.status === 'ACTIVE')))
      .catch(() => {
        setManagementUnits([]);
        setError('Không tải được danh sách khu vực quản lý. Vui lòng thử lại.');
      });
  }, []);

  useEffect(() => {
    catalogsApi
      .getCatalogs('COMPLEX', 'catalogs_complexes', mockComplexes)
      .then((data) => {
        if (data?.length) {
          setComplexes(
            data.map((item) => ({
              code: item.code,
              name: item.name,
              areaHa: item.areaHa || 0,
            }))
          );
        }
      })
      .catch(() => {});

    catalogsApi
      .getCatalogs('ENTERPRISE', 'catalogs_enterprises', mockEnterprises)
      .then((data) => {
        if (data?.length) {
          setEnterprises(
            data.map((item) => ({
              code: item.code,
              name: item.name,
              parentCode: item.parentCode || 'KOUN_MOM',
            }))
          );
        }
      })
      .catch(() => {});

    catalogsApi
      .getCatalogs('FARM', 'catalogs_farms', mockFarms)
      .then((data) => {
        if (data?.length) {
          setFarms(
            data.map((item) => ({
              code: item.code,
              name: item.name,
              parentCode: item.parentCode || '',
            }))
          );
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    let active = true;
    const loadAgricultureJobs = async () => {
      const items = await catalogsApi.getCatalogs('JOB_ITEM', 'catalogs_job_items');
      const jobs = items.length
        ? items.map(mapCatalogItemToDispatchJob)
        : getStoredData<MasterJobItem[]>('thaco_job_items_v5', []);

      if (active) {
        setCatalogJobs(jobs);
      }
    };

    void loadAgricultureJobs();
    window.addEventListener('catalogs-job-items-updated', loadAgricultureJobs);
    return () => {
      active = false;
      window.removeEventListener('catalogs-job-items-updated', loadAgricultureJobs);
    };
  }, []);

  useEffect(() => {
    let active = true;
    const loadTransportRoutes = async () => {
      const items = await catalogsApi.getCatalogs('ROUTE', 'catalogs_routes');
      if (active) setCatalogTransportRoutes(items.map(mapCatalogItemToDispatchRoute));
    };

    void loadTransportRoutes();
    window.addEventListener('catalogs-routes-updated', loadTransportRoutes);
    return () => {
      active = false;
      window.removeEventListener('catalogs-routes-updated', loadTransportRoutes);
    };
  }, []);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((old) => ({ ...old, [key]: value }));

  const selectManagementUnit = (val: string) => {
    if (!val) {
      setForm((old) => ({
        ...old,
        managementUnitId: '',
        vehicleId: '',
        driverId: '',
        implementId: '',
      }));
      return;
    }
    const area = managementUnits.find((item) => item.id === Number(val));
    setForm((old) => {
      const nextComplexCode = area?.complexCode || old.complexCode || '';
      const changesComplex = Boolean(old.complexCode && nextComplexCode !== old.complexCode);
      return {
        ...old,
        managementUnitId: val,
        complexCode: nextComplexCode,
        complexName: complexes.find((item) => item.code === nextComplexCode)?.name || nextComplexCode || old.complexName || '',
        unit: nextComplexCode || old.unit || '',
        ...(changesComplex ? {
          enterpriseCode: '',
          enterpriseName: '',
          farmCode: '',
          farmName: '',
          workLocationKey: '',
          workLocationText: '',
          origin: '',
          destination: '',
        } : {}),
        vehicleId: '',
        driverId: '',
        implementId: '',
      };
    });
  };

  // 1. Khi có planId + itemId mà chưa có workOrderId: tìm lệnh con
  useEffect(() => {
    if (!planIdParam || !itemIdParam || workOrderIdParam) return;
    setLoading(true);
    operationsApi
      .generatedPlanOrders(planIdParam, itemIdParam)
      .then((orders) => {
        const available = orders.filter((order) => order.workOrderId);
        if (available.length === 1) {
          setSearchParams({ workOrderId: String(available[0].workOrderId) }, { replace: true });
        } else {
          setGeneratedOrders(available);
          if (!available.length) {
            setError('Công việc kế hoạch này chưa sinh lệnh con để hoàn thiện điều xe.');
          }
        }
      })
      .catch(() => setError('Không tải được danh sách lệnh đã sinh từ kế hoạch.'))
      .finally(() => setLoading(false));
  }, [itemIdParam, planIdParam, setSearchParams, workOrderIdParam]);

  // 2. Nạp hồ sơ nguồn khi có workOrderId
  useEffect(() => {
    if (!workOrderIdParam) return;
    setLoading(true);
    schedulingApi
      .workOrder(workOrderIdParam)
      .then((order) => {
        setSourceOrder(order);
        const legacy = order.dispatchOrder ?? order.transportOrder;
        const details = (order.categoryDetails as Record<string, any>) ?? {};
        const vehicleId = order.vehicleAssignments?.find(
          (item) => item.status === 'ASSIGNED' || item.status === 'ACCEPTED'
        )?.vehicleId;
        const driverId = order.driverAssignments?.find(
          (item) => item.status === 'ASSIGNED' || item.status === 'ACCEPTED'
        )?.driverId;

        const cat = order.category as Category;
        setForm((prev) => ({
          ...prev,
          managementUnitId: order.managementUnitId ? String(order.managementUnitId) : '',
          category: cat,
          selectedYear: order.plannedStartAt ? new Date(order.plannedStartAt).getFullYear() : prev.selectedYear,
          selectedWeekNumber: order.plannedStartAt ? getWeekNumber(new Date(order.plannedStartAt)) : prev.selectedWeekNumber,
          planCode: (order as any).productionOrder?.plan?.code || prev.planCode,
          planTitle: (order as any).productionOrder?.plan?.title || prev.planTitle,
          selectedStageCode: details.stageCode || prev.selectedStageCode,
          durationHours: Math.max(1, Math.round((new Date(order.plannedEndAt).getTime() - new Date(order.plannedStartAt).getTime()) / 3600000)) || 10,
          startTime: localDateTime(order.plannedStartAt),
          complexCode: order.complexCode || 'KOUN_MOM',
          complexName: order.complexName || 'Khu liên hợp Koun Mom',
          enterpriseCode: order.enterpriseCode || '',
          enterpriseName: order.enterpriseName || '',
          farmCode: order.farmCode || '',
          farmName: order.farmName || '',
          teamCode: details.teamCode || details.constructionTeam || '',
          teamName: details.teamName || details.constructionTeam || '',
          unit: order.unit || 'KOUN_MOM',

          // Nông nghiệp
          stageCode: details.stageCode || (cat === 'AGRICULTURE' ? 'LAM_DAT' : ''),
          stageName: details.stageName || (cat === 'AGRICULTURE' ? '1. Làm đất' : ''),
          cropType: details.crop || 'Chuối Nam Mỹ Foc TR4',
          implementGroup: details.implementGroup || 'Dàn cày 3 - 4 chảo',
          recommendedVehicle: details.recommendedVehicle || 'Máy kéo bánh hơi 70 - 90HP',
          quotaPerShift: details.quotaPerShift || '2.5 ha/ca',
          fuelQuota: Number(details.fuelQuota) || 12.5,
          fuelUnit: details.fuelUnit || 'Lít/ha',

          // Công trình
          constructionCategory: details.constructionType || details.constructionCategory || 'SAN_GAT',
          constructionItem: details.constructionItem || order.jobName || '',
          equipmentType: details.equipmentType || details.recommendedVehicle || '',
          targetScope: details.targetScope || '',
          expectedDurationHours: String(details.expectedDurationHours || '8'),

          // Vận chuyển
          transportCategory: details.transportCategory || 'NONG_SAN',
          cargoType: details.cargoType || (order.type === 'TRANSPORT' ? order.jobName : ''),
          routeFlowType: (details.routeFlowType as RouteFlowType) || 'ONE_WAY',
          distanceKm: String(details.distanceKm || ''),
          speedLimitKmH: String(details.speedLimitKmH || '35'),
          returnCargoName: details.returnCargoName || '',
          returnOrigin: details.returnOrigin || '',
          returnDestination: details.returnDestination || '',
          returnTonnage: String(details.returnTonnage || ''),

          // Chung
          jobCode: order.jobCode || '',
          jobName: order.jobName || '',
          jobDescription: order.jobDescription || order.jobName || '',
          workLocationKey: details.workLocationKey || '',
          workLocationText: order.workLocationText || legacy?.destination || '',
          workLocationNotes: order.workLocationNotes || '',
          origin: legacy?.origin || details.origin || '',
          destination: legacy?.destination || order.workLocationText || '',
          targetQuantity: String(order.targetQuantity || ''),
          targetUnit: order.targetUnit || (cat === 'TRANSPORT' ? 'Tấn' : cat === 'CONSTRUCTION' ? 'giờ máy' : 'ha'),

          plannedStartAt: localDateTime(order.plannedStartAt),
          plannedEndAt: localDateTime(order.plannedEndAt),
          shift: order.shift || 'CA_NGAY',
          priority: order.priority || 'NORMAL',

          assignmentMode: order.assignmentMode || 'FIXED_ASSIGNMENT',
          vehicleId: vehicleId ? String(vehicleId) : '',
          driverId: driverId ? String(driverId) : '',
          notes: order.notes || '',
        }));
      })
      .catch(() => setError('Không tải được thông tin lệnh từ kế hoạch.'))
      .finally(() => setLoading(false));
  }, [workOrderIdParam]);

  // 3. Tải ngữ cảnh kiểm tra xung đột nguồn lực thời gian thực
  useEffect(() => {
    if (
      !form.category ||
      !form.managementUnitId ||
      !form.unit ||
      !form.plannedStartAt ||
      !form.plannedEndAt ||
      new Date(form.plannedEndAt) <= new Date(form.plannedStartAt)
    ) {
      setContext(null);
      return;
    }

    const timer = window.setTimeout(() => {
      setContextLoading(true);
      schedulingApi
        .preparationContext({
          managementUnitId: Number(form.managementUnitId),
          category: form.category,
          unit: form.unit,
          complexCode: form.complexCode || 'KOUN_MOM',
          startAt: new Date(form.plannedStartAt).toISOString(),
          endAt: new Date(form.plannedEndAt).toISOString(),
          excludeWorkOrderId: workOrderIdParam,
          vehicleId: form.vehicleId ? Number(form.vehicleId) : undefined,
        })
        .then((ctx) => {
          setContext(ctx);
          setForm((old) => {
            const remainsSelectable = <T extends { id: number; selection?: { selectable: boolean } },>(
              selectedId: string,
              resources: T[],
            ) => !selectedId || resources.some(
              (item) => String(item.id) === selectedId && item.selection?.selectable !== false,
            );

            return {
              ...old,
              vehicleId: remainsSelectable(old.vehicleId, ctx.vehicles) ? old.vehicleId : '',
              driverId: remainsSelectable(old.driverId, ctx.drivers) ? old.driverId : '',
              implementId: remainsSelectable(old.implementId, ctx.implements) ? old.implementId : '',
            };
          });
        })
        .catch(() => {
          setContext(null);
          console.warn('Không tải được ngữ cảnh phân công xe và tài xế.');
        })
        .finally(() => setContextLoading(false));
    }, 350);

    return () => window.clearTimeout(timer);
  }, [form.category, form.managementUnitId, form.complexCode, form.plannedEndAt, form.plannedStartAt, form.unit, form.vehicleId, workOrderIdParam]);

  // Lắng nghe thay đổi Master Data từ màn hình Danh mục (/danh-muc/loai-cong-viec/*)
  const [stagesVersion, setStagesVersion] = useState(0);
  useEffect(() => {
    const handleStorageChange = () => setStagesVersion((v) => v + 1);
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // 4. Tuần và Năm làm việc (Hình 1)
  const weeksOfYear = useMemo(() => getWeeksOfYear(form.selectedYear), [form.selectedYear]);
  const activeWeek = useMemo(() => {
    return (
      weeksOfYear.find((w) => w.weekNumber === form.selectedWeekNumber) ||
      weeksOfYear[0] || {
        weekNumber: form.selectedWeekNumber,
        monday: new Date(),
        sunday: new Date(Date.now() + 6 * 86400000),
        label: `Tuần ${form.selectedWeekNumber}`,
      }
    );
  }, [weeksOfYear, form.selectedWeekNumber]);

  // Sinh động danh sách năm: chỉ cho phép năm hiện tại và năm hiện tại + 1 khi tạo mới, hỗ trợ năm của lệnh cũ nếu đang sửa
  const yearOptions: SelectOption[] = useMemo(() => {
    const curY = new Date().getFullYear();
    const years = [curY, curY + 1];
    const selY = form.selectedYear ? Number(form.selectedYear) : curY;
    if (selY && !years.includes(selY)) {
      years.push(selY);
      years.sort((a, b) => a - b);
    }
    return years.map((y) => ({ value: String(y), label: `Năm ${y}` }));
  }, [form.selectedYear]);

  const weekOptions: SelectOption[] = useMemo(() => {
    const curY = new Date().getFullYear();
    const curW = getWeekNumber(new Date());
    const selY = form.selectedYear ? Number(form.selectedYear) : curY;

    // Sắp xếp tuần tăng dần: nếu là năm hiện tại, chỉ cho phép chọn từ tuần hiện tại trở đi
    let sortedWeeks = [...weeksOfYear].sort((a, b) => a.weekNumber - b.weekNumber);
    if (selY === curY) {
      sortedWeeks = sortedWeeks.filter(
        (w) => w.weekNumber >= curW || (sourceOrder && w.weekNumber === form.selectedWeekNumber)
      );
    } else if (selY < curY) {
      sortedWeeks = sourceOrder ? sortedWeeks.filter((w) => w.weekNumber === form.selectedWeekNumber) : [];
    }

    return sortedWeeks.map((w) => ({
      value: String(w.weekNumber),
      label: w.label,
    }));
  }, [weeksOfYear, form.selectedYear, sourceOrder, form.selectedWeekNumber]);

  // Toàn bộ Giai đoạn / Phân loại tải động từ Danh mục Master Data (hỗ trợ cả Nông nghiệp, Công trình, Vận chuyển)
  const masterStages = useMemo(() => {
    return getStoredStages();
  }, [stagesVersion]);

  // Danh mục Giai đoạn Nông nghiệp (đồng bộ từ http://localhost:5173/danh-muc/loai-cong-viec/nong-nghiep?tab=stages)
  const agriStageOptions: SelectOption[] = useMemo(() => {
    return masterStages
      .filter((s) => (s.planType === 'NONG_NGHIEP' || !s.planType) && s.status !== 'inactive')
      .sort((a, b) => a.sequence - b.sequence)
      .map((s) => ({
        value: s.code,
        label: s.name,
        subLabel: s.description,
      }));
  }, [masterStages]);

  // Công trình phân loại theo categoryCode của JOB_ITEM.
  const constructionCategoryOptions: SelectOption[] = useMemo(() => {
    const categories = new Map<string, SelectOption>();
    catalogJobs
      .filter((job) => job.planType === 'CONG_TRINH' && job.categoryCode)
      .forEach((job) => categories.set(job.categoryCode, {
        value: job.categoryCode,
        label: job.categoryName || job.categoryCode,
      }));
    return [...categories.values()];
  }, [catalogJobs]);

  // Vận chuyển phân loại theo categoryCode của JOB_ITEM.
  const transportCategoryOptions: SelectOption[] = useMemo(() => {
    const categories = new Map<string, SelectOption>();
    catalogJobs
      .filter((job) => job.planType === 'VAN_CHUYEN' && job.categoryCode)
      .forEach((job) => categories.set(job.categoryCode, {
        value: job.categoryCode,
        label: job.categoryName || job.categoryCode,
      }));
    return [...categories.values()];
  }, [catalogJobs]);

  // stageOptions tương ứng theo lĩnh vực của lệnh hiện tại (mặc định Nông nghiệp)
  const stageOptions: SelectOption[] = useMemo(() => {
    if (form.category === 'CONSTRUCTION') return constructionCategoryOptions;
    if (form.category === 'TRANSPORT') return transportCategoryOptions;
    return agriStageOptions;
  }, [form.category, agriStageOptions, constructionCategoryOptions, transportCategoryOptions]);

  // 5. Phân cấp đơn vị quản lý (Hình 1)
  const complexOptions: SelectOption[] = useMemo(() => {
    const list = complexes.length > 0 ? complexes : mockComplexes;
    return list.map((k) => ({
      value: k.code,
      label: `${k.name} (${k.code})`,
    }));
  }, [complexes]);

  const availableEnterprises = useMemo(() => {
    if (!form.complexCode) return [];
    const list = enterprises.length > 0 ? enterprises : mockEnterprises;
    return list.filter((item) => item.parentCode === form.complexCode);
  }, [form.complexCode, enterprises]);

  const enterpriseOptions: SelectOption[] = useMemo(() => {
    return availableEnterprises.map((item) => ({
      value: item.code,
      label: `${item.name} (${item.code})`,
    }));
  }, [availableEnterprises]);

  const managementUnitOptions: SelectOption[] = useMemo(() => {
    let list = managementUnits;
    if (form.complexCode) {
      const filtered = managementUnits.filter((item) => !item.complexCode || item.complexCode === form.complexCode);
      if (filtered.length > 0) list = filtered;
    }
    return list.map((item) => {
      const vCount = item.vehicleCount ?? item._count?.vehicles ?? 0;
      const dCount = item.driverCount ?? item._count?.teamAssignments ?? 0;
      const stats = `Hiện có: ${vCount} xe · ${dCount} tài xế`;
      return {
        value: String(item.id),
        label: `${item.code} · ${item.name}`,
        subLabel: [
          item.parent?.name,
          item.currentManager?.manager?.fullName ? `Đội trưởng: ${item.currentManager.manager.fullName}` : undefined,
          stats,
        ].filter(Boolean).join(' · ') || (item.complexCode ? `KLH ${item.complexCode}` : undefined),
      };
    });
  }, [managementUnits, form.complexCode]);

  const availableFarms = useMemo(() => {
    if (!form.enterpriseCode) return [];
    const allFarms = farms.length > 0 ? farms : mockFarms;
    const list = allFarms.filter((item) => item.parentCode === form.enterpriseCode);
    return list.length > 0
      ? list
      : allFarms.filter((item) => item.parentCode?.startsWith(form.enterpriseCode.slice(0, 3)));
  }, [form.enterpriseCode, farms]);

  const farmOptions: SelectOption[] = useMemo(() => {
    return availableFarms.map((item) => ({
      value: item.code,
      label: `${item.name} (${item.code})`,
    }));
  }, [availableFarms]);

  const selectedComplex = (complexes.length > 0 ? complexes : mockComplexes).find((item) => item.code === form.complexCode);
  const selectedEnterprise = availableEnterprises.find((item) => item.code === form.enterpriseCode);
  const selectedFarm = availableFarms.find((item) => item.code === form.farmCode);
  const selectedManagementUnit = useMemo(() => {
    return managementUnits.find((item) => String(item.id) === form.managementUnitId);
  }, [managementUnits, form.managementUnitId]);

  const unitVehicleCount = useMemo(() => {
    if (!selectedManagementUnit) return 0;
    if (selectedManagementUnit.vehicleCount !== undefined && selectedManagementUnit.vehicleCount > 0) {
      return selectedManagementUnit.vehicleCount;
    }
    if (selectedManagementUnit._count?.vehicles !== undefined && selectedManagementUnit._count.vehicles > 0) {
      return selectedManagementUnit._count.vehicles;
    }
    if (context?.vehicles && context.vehicles.length > 0) {
      return context.vehicles.length;
    }
    return selectedManagementUnit.vehicleCount ?? 0;
  }, [selectedManagementUnit, context?.vehicles]);

  const unitDriverCount = useMemo(() => {
    if (!selectedManagementUnit) return 0;
    if (selectedManagementUnit.driverCount !== undefined && selectedManagementUnit.driverCount > 0) {
      return selectedManagementUnit.driverCount;
    }
    if (selectedManagementUnit._count?.teamAssignments !== undefined && selectedManagementUnit._count.teamAssignments > 0) {
      return selectedManagementUnit._count.teamAssignments;
    }
    if (context?.drivers && context.drivers.length > 0) {
      return context.drivers.length;
    }
    return selectedManagementUnit.driverCount ?? 0;
  }, [selectedManagementUnit, context?.drivers]);

  // 6. Danh mục Lô / Thửa lọc theo Nông trường (Hình 2)
  const plotOptions: SelectOption[] = useMemo(() => {
    const stored = getStoredPlots();
    let filtered = stored.filter((p) => p.complexCode === form.complexCode);
    if (selectedFarm) {
      const farmName = selectedFarm.name.toLowerCase();
      const farmMatched = filtered.filter((p) => {
        const pFarm = p.farmName.toLowerCase();
        return pFarm.includes(farmName) || farmName.includes(pFarm);
      });
      if (farmMatched.length > 0) {
        filtered = farmMatched;
      }
    }
    return filtered.map((p) => ({
      value: `${p.code}: ${p.name}`,
      label: `${p.code}: ${p.name}`,
      subLabel: `${p.farmName} • ${p.areaHa} ha • ${p.cropType}`,
    }));
  }, [form.complexCode, selectedFarm]);

  // 7. Danh mục công việc lọc theo Giai đoạn sản xuất (Hình 2)
  const agriPlanningJobs = useMemo(() => {
    return catalogJobs
      .filter((job) => job.planType === 'NONG_NGHIEP')
      .map((job) => ({
        code: job.code,
        name: job.name,
        stageCode: job.categoryCode,
        stageName: job.categoryName,
        implementGroup: job.implementGroup,
        recommendedVehicle: job.recommendedVehicle,
        quotaPerShift: job.quotaPerShift,
        fuelQuota: job.fuelQuota,
        fuelUnit: job.fuelUnit,
        routeFlowType: job.routeFlowType,
        defaultUnit: job.defaultUnit,
        defaultQuota: 35,
      }));
  }, [catalogJobs]);

  const availableAgriJobsForStage = useMemo(() => {
    if (!form.selectedStageCode) return agriPlanningJobs;
    const list = agriPlanningJobs.filter((j) => j.stageCode === form.selectedStageCode);
    return list.length > 0 ? list : agriPlanningJobs;
  }, [agriPlanningJobs, form.selectedStageCode]);

  const jobOptions: SelectOption[] = useMemo(() => {
    return availableAgriJobsForStage.map((j) => ({
      value: j.code,
      label: j.name,
      subLabel: `${j.code} • ${j.implementGroup} • ${j.recommendedVehicle} • ${j.fuelQuota} ${j.fuelUnit}`,
    }));
  }, [availableAgriJobsForStage]);

  // Danh mục công việc dùng chung cho các phân hệ, lấy từ JOB_ITEM
  const masterJobs = useMemo(() => {
    return catalogJobs.filter((item) => item.planType === categoryInfo[form.category].planType);
  }, [catalogJobs, form.category]);

  // Danh mục Lô nông nghiệp
  const agriPlots = useMemo(() => {
    if (form.category !== 'AGRICULTURE') return [];
    const all = getStoredPlots();
    let filtered = all.filter((p) => p.complexCode === form.complexCode);
    if (selectedFarm) {
      const farmNameLower = selectedFarm.name.toLowerCase();
      const byFarm = filtered.filter(
        (p) =>
          p.farmName.toLowerCase().includes(farmNameLower) ||
          farmNameLower.includes(p.farmName.toLowerCase())
      );
      if (byFarm.length) filtered = byFarm;
    }
    return filtered;
  }, [form.category, form.complexCode, selectedFarm]);

  // Danh mục Đội cơ giới nông nghiệp
  const agriTeams = useMemo(() => {
    if (form.category !== 'AGRICULTURE') return [];
    return getStoredAgriTeams().filter((t) => t.complexCode === form.complexCode);
  }, [form.category, form.complexCode]);

  // Danh mục Công trường / Vị trí thi công
  const constructionSites = useMemo(() => {
    if (form.category !== 'CONSTRUCTION') return [];
    const all = getStoredConstructionSites();
    const filtered = all.filter((s) => s.complexCode === form.complexCode);
    return filtered.length ? filtered : all;
  }, [form.category, form.complexCode]);

  // Danh mục Đội thi công công trình
  const constructionTeams = useMemo(() => {
    if (form.category !== 'CONSTRUCTION') return [];
    return getStoredConstructionTeams().filter((t) => t.complexCode === form.complexCode);
  }, [form.category, form.complexCode]);

  // Danh mục Tuyến đường vận chuyển
  const transportRoutes = useMemo(() => {
    if (form.category !== 'TRANSPORT') return [];
    const all = catalogTransportRoutes;
    const matchingFlow = catalogJobs.find((job) => job.code === form.jobCode)?.routeFlowType;
    const scoped = matchingFlow ? all.filter((route) => route.routeFlowType === matchingFlow) : all;
    const filtered = scoped.filter((route) => route.complexCode === form.complexCode);
    return filtered.length ? filtered : scoped;
  }, [catalogJobs, catalogTransportRoutes, form.category, form.complexCode, form.jobCode]);

  // Options riêng cho phân hệ Công trình
  const constructionPlanningJobs = useMemo(() => {
    return catalogJobs
      .filter((job) => job.planType === 'CONG_TRINH')
      .map((job) => ({
        code: job.code,
        name: job.name,
        categoryCode: job.categoryCode,
        categoryName: job.categoryName,
        implementGroup: job.implementGroup,
        recommendedVehicle: job.recommendedVehicle,
        quotaPerShift: job.quotaPerShift,
        fuelQuota: job.fuelQuota,
        fuelUnit: job.fuelUnit,
        routeFlowType: job.routeFlowType,
        defaultUnit: job.defaultUnit,
        description: job.description,
      }));
  }, [catalogJobs]);

  const availableConstructionJobs = useMemo(() => {
    if (!form.constructionCategory) return constructionPlanningJobs;
    const list = constructionPlanningJobs.filter((j) => j.categoryCode === form.constructionCategory);
    return list.length > 0 ? list : constructionPlanningJobs;
  }, [constructionPlanningJobs, form.constructionCategory]);

  const constructionJobOptions: SelectOption[] = useMemo(() => {
    return availableConstructionJobs.map((j) => ({
      value: j.code,
      label: j.name,
      subLabel: `${j.code} • ${j.recommendedVehicle} • Định mức: ${j.quotaPerShift} • ${j.fuelQuota} ${j.fuelUnit}`,
    }));
  }, [availableConstructionJobs]);

  const constructionSiteOptions: SelectOption[] = useMemo(() => {
    return constructionSites.map((s) => ({
      value: `${s.code}: ${s.name}`,
      label: `${s.code}: ${s.name}`,
      subLabel: `${s.categoryName} • Quy mô: ${s.targetScope} • ${s.recommendedMachines}`,
    }));
  }, [constructionSites]);

  const constructionTeamOptions: SelectOption[] = useMemo(() => {
    return constructionTeams.map((t) => ({
      value: t.code,
      label: `${t.name} (${t.code})`,
      subLabel: `Đội trưởng: ${t.leaderName} • ${t.machineCount} • ${t.assignedAreas}`,
    }));
  }, [constructionTeams]);

  // Options riêng cho phân hệ Vận chuyển
  const transportPlanningJobs = useMemo(() => {
    return catalogJobs
      .filter((job) => job.planType === 'VAN_CHUYEN')
      .map((job) => ({
        code: job.code,
        name: job.name,
        categoryCode: job.categoryCode,
        categoryName: job.categoryName,
        implementGroup: job.implementGroup,
        recommendedVehicle: job.recommendedVehicle,
        quotaPerShift: job.quotaPerShift,
        fuelQuota: job.fuelQuota,
        fuelUnit: job.fuelUnit,
        routeFlowType: job.routeFlowType,
        defaultUnit: job.defaultUnit,
        description: job.description,
      }));
  }, [catalogJobs]);

  const availableTransportJobs = useMemo(() => {
    if (!form.transportCategory) return transportPlanningJobs;
    const list = transportPlanningJobs.filter((j) => j.categoryCode === form.transportCategory);
    return list.length > 0 ? list : transportPlanningJobs;
  }, [transportPlanningJobs, form.transportCategory]);

  const transportJobOptions: SelectOption[] = useMemo(() => {
    return availableTransportJobs.map((j) => ({
      value: j.code,
      label: j.name,
      subLabel: `${j.code} • ${j.recommendedVehicle} • Định mức: ${j.quotaPerShift} • ${j.fuelQuota} ${j.fuelUnit}`,
    }));
  }, [availableTransportJobs]);

  const transportRouteOptions: SelectOption[] = useMemo(() => {
    return transportRoutes.map((r) => ({
      value: `${r.code}: ${r.name}`,
      label: `${r.code}: ${r.name}`,
      subLabel: `${r.origin} ➔ ${r.destination} • ${r.distanceKm} km • ${r.cargoType}`,
    }));
  }, [transportRoutes]);

  const returnOriginOptions: SelectOption[] = useMemo(() => [...new Set(
    transportRoutes.filter((route) => route.routeFlowType === 'TWO_WAY').map((route) => route.returnOrigin).filter(Boolean),
  )].map((value) => ({ value: value!, label: value! })), [transportRoutes]);

  const returnDestinationOptions: SelectOption[] = useMemo(() => [...new Set(
    transportRoutes.filter((route) => route.routeFlowType === 'TWO_WAY').map((route) => route.returnDestination).filter(Boolean),
  )].map((value) => ({ value: value!, label: value! })), [transportRoutes]);

  const returnCargoOptions: SelectOption[] = useMemo(() => [...new Set(
    transportRoutes.filter((route) => route.routeFlowType === 'TWO_WAY').map((route) => route.returnCargoName).filter(Boolean),
  )].map((value) => ({ value: value!, label: value! })), [transportRoutes]);

  const returnTonnageOptions: SelectOption[] = useMemo(() => [...new Set(
    transportRoutes.filter((route) => route.routeFlowType === 'TWO_WAY').map((route) => route.returnTonnage).filter((value) => value && value > 0),
  )].map((value) => ({ value: String(value), label: `${value} Tấn` })), [transportRoutes]);

  // 8. Tùy chọn nguồn lực điều động (Hình 3): kết hợp context backend + fallback demo
  // Sắp xếp: Xe sẵn sàng trước (rank 0), sau đó xe bận do đang lái/đang ca (rank 1), sau đó xe sửa chữa/bảo dưỡng (rank 2)
  const vehicleOptions: SelectOption[] = useMemo(() => {
    const list: Array<SelectOption & { rank: number; sortKey: string }> = [];
    const seen = new Set<string>();

    const backendVehicles = context?.vehicles ?? [];

    backendVehicles.forEach((item) => {
        if (seen.has(String(item.id)) || seen.has(item.code)) return;
        seen.add(String(item.id));
        seen.add(item.code);

        const isAvailable = item.selection?.selectable ?? Boolean(item.availability?.available);
        const selectionReasons = item.selection?.reasons ?? item.availability?.reasons ?? [];
        const reasons = selectionReasons.map((r) => r.message).join('; ');
        const reasonCodes = selectionReasons.map((r) => r.code).join(' ');
        const isRepair =
          item.status === 'SUA_CHUA' ||
          item.status === 'BAO_DUONG' ||
          /MAINTENANCE|REPAIR|SUA_CHUA|BAO_DUONG/i.test(reasonCodes) ||
          /sửa chữa|bảo dưỡng/i.test(reasons);

        let rank = 0;
        let badge = '🟢 [Sẵn sàng]';
        if (!isAvailable) {
          if (isRepair) {
            rank = 2;
            badge = '🔧 [Sửa chữa]';
          } else {
            rank = 1;
            badge = '🔴 [Không phù hợp/Bận]';
          }
        }

        list.push({
          value: String(item.id),
          disabled: !isAvailable,
          rank,
          sortKey: item.code,
          label: `${badge} ${item.code} — ${item.name}${item.plate ? ` [${item.plate}]` : ''}`,
          subLabel:
            reasons ||
            `${item.vehicleType?.name ?? 'Chưa phân loại'} • ${item.status}`,
        });
      });

    return list.sort((a, b) => {
      if (a.rank !== b.rank) return a.rank - b.rank;
      return a.sortKey.localeCompare(b.sortKey);
    });
  }, [context?.vehicles]);

  const driverOptions: SelectOption[] = useMemo(() => {
    const list: Array<SelectOption & { rank: number; sortKey: string }> = [];
    const seen = new Set<string>();

    const backendDrivers = context?.drivers ?? [];

    backendDrivers.forEach((item) => {
        if (seen.has(String(item.id))) return;
        seen.add(String(item.id));

        const isAvailable = item.selection?.selectable ?? Boolean(item.availability?.available);
        const reasons = (item.selection?.reasons ?? item.availability?.reasons ?? []).map((r) => r.message).join('; ');
        const rank = isAvailable ? 0 : 1;
        const badge = isAvailable ? '🟢 [Sẵn sàng]' : '🔴 [Không đủ điều kiện/Bận]';

        list.push({
          value: String(item.id),
          disabled: !isAvailable,
          rank,
          sortKey: item.fullName,
          label: `${badge} ${item.code} — ${item.fullName}`,
          subLabel:
            reasons ||
            item.licenseClass ||
            item.driverProfile?.licenseClass ||
            'Chưa cập nhật GPLX',
        });
      });

    return list.sort((a, b) => {
      if (a.rank !== b.rank) return a.rank - b.rank;
      return a.sortKey.localeCompare(b.sortKey);
    });
  }, [context?.drivers]);

  const implementOptions: SelectOption[] = useMemo(() => {
    const list: SelectOption[] = [];
    const seen = new Set<string>();

    const backendImplements = context?.implements ?? [];

    backendImplements.forEach((item) => {
        if (seen.has(String(item.id)) || seen.has(item.code)) return;
        seen.add(String(item.id));
        seen.add(item.code);
        const isSelectable = item.selection?.selectable ?? (item.status !== 'MAINTENANCE' && item.technicalCondition !== 'NEED_REPAIR');
        const reasons = item.selection?.reasons.map((reason) => reason.message).join('; ');
        list.push({
          value: String(item.id),
          label: `${item.code} — ${item.name}`,
          subLabel: reasons || `${item.status} • ${item.technicalCondition}`,
          disabled: !isSelectable,
        });
      });

    return list.sort((a, b) => Number(Boolean(a.disabled)) - Number(Boolean(b.disabled)) || a.label.localeCompare(b.label));
  }, [context?.implements]);

  const availVehiclesCount = useMemo(() => vehicleOptions.filter((o) => !o.disabled).length, [vehicleOptions]);
  const totalVehiclesCount = context?.summary?.vehicles.total ?? vehicleOptions.length;

  const availImplementsCount = useMemo(() => implementOptions.filter((o) => !o.disabled).length, [implementOptions]);
  const totalImplementsCount = context?.summary?.implements.total ?? implementOptions.length;

  const availDriversCount = useMemo(() => driverOptions.filter((o) => !o.disabled).length, [driverOptions]);
  const totalDriversCount = context?.summary?.drivers.total ?? driverOptions.length;

  const suggestedVehicles = useMemo(
    () => (context?.vehicles ?? []).filter((item) => item.selection?.selectable !== false).slice(0, 6),
    [context?.vehicles],
  );
  const stepTwoComplete = Boolean(form.managementUnitId && form.jobName && form.workLocationText);

  const selectedVehicle = useMemo(() => {
    return context?.vehicles.find((item) => String(item.id) === form.vehicleId);
  }, [context?.vehicles, form.vehicleId]);

  const selectedDriver = useMemo(() => {
    return context?.drivers.find((item) => String(item.id) === form.driverId);
  }, [context?.drivers, form.driverId]);

  const selectedImplement = useMemo(() => {
    return context?.implements.find((item) => String(item.id) === form.implementId);
  }, [context?.implements, form.implementId]);

  const selectedImplementIds = useMemo(() => {
    if (Array.isArray(form.implementIds) && form.implementIds.length > 0) return form.implementIds;
    return form.implementId ? [form.implementId] : [];
  }, [form.implementIds, form.implementId]);

  const handleAddImplement = (val: string) => {
    if (!val) return;
    if (!selectedImplementIds.includes(val)) {
      const nextIds = [...selectedImplementIds, val];
      setForm((old) => ({ ...old, implementId: nextIds[0], implementIds: nextIds }));
    }
  };

  const handleRemoveImplement = (idToRemove: string) => {
    const nextIds = selectedImplementIds.filter((id) => id !== idToRemove);
    setForm((old) => ({ ...old, implementId: nextIds[0] || '', implementIds: nextIds }));
  };

  const handleClearImplements = () => {
    setForm((old) => ({ ...old, implementId: '', implementIds: [] }));
  };

  const selectedImplementItems = useMemo(() => {
    return selectedImplementIds.map((id) => {
      const opt = implementOptions.find((o) => o.value === id);
      const foundInContext = context?.implements.find((item) => String(item.id) === String(id));
      return {
        id,
        label: opt?.label || (foundInContext ? `${foundInContext.code} — ${foundInContext.name}` : `Thiết bị #${id}`),
      };
    });
  }, [selectedImplementIds, implementOptions, context?.implements]);

  // Xử lý chuyển đổi loại lệnh (khi không bị khóa bởi kế hoạch cha)
  const selectCategory = (newCat: Category) => {
    if (sourceOrder) return;
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('category', newCat);
      return next;
    }, { replace: true });
    const nextState = freshForm(newCat);
    nextState.managementUnitId = form.managementUnitId;
    nextState.complexCode = form.complexCode || 'KOUN_MOM';
    nextState.complexName = form.complexName || 'Khu liên hợp Koun Mom';
    nextState.unit = form.complexCode || 'KOUN_MOM';
    setForm(nextState);
  };

  // 9. Handlers riêng cho phân hệ Nông nghiệp
  const handleSelectAgriJob = (val: string) => {
    if (!val || !val.trim() || val === 'ALL') {
      setForm((old) => ({
        ...old,
        jobCode: '',
        jobName: '',
        jobDescription: '',
        implementGroup: '',
        recommendedVehicle: '',
        quotaPerShift: '',
        fuelQuota: 0,
        fuelUnit: '',
      }));
      return;
    }
    const job = agriPlanningJobs.find((j) => j.code === val || j.name === val);
    if (job) {
      setForm((old) => ({
        ...old,
        jobCode: job.code,
        jobName: job.name,
        jobDescription: `${job.name} - Định mức kỹ thuật THACO AGRI`,
        implementGroup: job.implementGroup,
        recommendedVehicle: job.recommendedVehicle,
        quotaPerShift: job.quotaPerShift,
        fuelQuota: job.fuelQuota,
        fuelUnit: job.fuelUnit,
        targetQuantity: old.targetQuantity && Number(old.targetQuantity) > 0 ? old.targetQuantity : '35',
        targetUnit: job.defaultUnit || 'ha',
      }));
    } else {
      setForm((old) => ({
        ...old,
        jobCode: val,
        jobName: val,
        jobDescription: `${val} (Công việc tùy chỉnh)`,
      }));
    }
  };

  const handleSelectAgriPlot = (val: string) => {
    const stored = getStoredPlots();
    const plot = stored.find((p) => `${p.code}: ${p.name}` === val || p.code === val || p.id === val);
    if (plot) {
      setForm((old) => ({
        ...old,
        workLocationKey: plot.id,
        workLocationText: `${plot.code}: ${plot.name}`,
        destination: plot.name,
        targetQuantity: String(plot.areaHa || 35),
        cropType: plot.cropType || 'Chuối Nam Mỹ Foc TR4',
        origin: old.origin || `Bãi máy ${plot.farmName || 'Nông trường'}`,
      }));
    } else {
      setForm((old) => ({
        ...old,
        workLocationKey: val,
        workLocationText: val,
        destination: val,
      }));
    }
  };

  // 10. Handlers riêng cho phân hệ Công trình
  const handleSelectConstructionJob = (val: string) => {
    if (!val || !val.trim() || val === 'ALL') {
      setForm((old) => ({
        ...old,
        jobCode: '',
        jobName: '',
        jobDescription: '',
        constructionCategory: '',
        constructionItem: '',
        equipmentType: '',
        recommendedVehicle: '',
        implementGroup: '',
        quotaPerShift: '',
        fuelQuota: 0,
        fuelUnit: '',
      }));
      return;
    }
    const job = constructionPlanningJobs.find((j) => j.code === val || j.name === val);
    if (job) {
      setForm((old) => ({
        ...old,
        jobCode: job.code,
        jobName: job.name,
        jobDescription: job.description || `${job.name} - Tiêu chuẩn kỹ thuật công trình`,
        constructionCategory: job.categoryCode || old.constructionCategory,
        constructionItem: job.name,
        equipmentType: job.recommendedVehicle,
        recommendedVehicle: job.recommendedVehicle,
        implementGroup: job.implementGroup,
        quotaPerShift: job.quotaPerShift,
        fuelQuota: job.fuelQuota,
        fuelUnit: job.fuelUnit,
        targetUnit: job.defaultUnit || 'km',
        targetQuantity: old.targetQuantity && Number(old.targetQuantity) > 0 ? old.targetQuantity : '1.5',
      }));
    } else {
      setForm((old) => ({
        ...old,
        jobCode: val,
        jobName: val,
        constructionItem: val,
        jobDescription: `${val} (Công việc công trình tùy chỉnh)`,
      }));
    }
  };

  const handleSelectConstructionSite = (val: string) => {
    const site = constructionSites.find((s) => `${s.code}: ${s.name}` === val || s.code === val || s.id === val);
    if (site) {
      setForm((old) => ({
        ...old,
        workLocationKey: site.id,
        workLocationText: `${site.code}: ${site.name}`,
        destination: site.name,
        targetScope: site.targetScope,
        targetUnit: site.targetUnit || 'km',
        equipmentType: site.recommendedMachines || old.equipmentType,
        expectedDurationHours: String(site.estimatedDays * 8 || 8),
        origin: old.origin || `Bãi tập kết Ban Xây dựng ${selectedComplex?.name || ''}`,
      }));
    } else {
      setForm((old) => ({
        ...old,
        workLocationKey: val,
        workLocationText: val,
        destination: val,
      }));
    }
  };

  // 11. Handlers riêng cho phân hệ Vận chuyển
  const handleSelectTransportJob = (val: string) => {
    if (!val || !val.trim() || val === 'ALL') {
      setForm((old) => ({
        ...old,
        jobCode: '',
        jobName: '',
        jobDescription: '',
        cargoType: '',
        equipmentType: '',
        recommendedVehicle: '',
        implementGroup: '',
        quotaPerShift: '',
        fuelQuota: 0,
        fuelUnit: '',
      }));
      return;
    }
    const job = transportPlanningJobs.find((j) => j.code === val || j.name === val);
    if (job) {
      setForm((old) => ({
        ...old,
        jobCode: job.code,
        jobName: job.name,
        jobDescription: job.description || `${job.name} - Tiêu chuẩn vận tải THACO AGRI`,
        transportCategory: job.categoryCode || old.transportCategory,
        cargoType: job.name,
        equipmentType: job.recommendedVehicle,
        recommendedVehicle: job.recommendedVehicle,
        implementGroup: job.implementGroup,
        quotaPerShift: job.quotaPerShift,
        fuelQuota: job.fuelQuota,
        fuelUnit: job.fuelUnit,
        routeFlowType: job.routeFlowType || old.routeFlowType,
        targetUnit: job.defaultUnit || 'Tấn',
        targetQuantity: old.targetQuantity && Number(old.targetQuantity) > 0 ? old.targetQuantity : '25',
        ...(job.routeFlowType === 'ONE_WAY'
          ? { returnCargoName: '', returnOrigin: '', returnDestination: '', returnTonnage: '' }
          : {}),
      }));
    } else {
      setForm((old) => ({
        ...old,
        jobCode: val,
        jobName: val,
        cargoType: val,
        jobDescription: `${val} (Nhu cầu vận chuyển tùy chỉnh)`,
      }));
    }
  };

  const handleSelectTransportRoute = (val: string) => {
    const route = transportRoutes.find((r) => `${r.code}: ${r.name}` === val || r.code === val || r.id === val);
    if (route) {
      setForm((old) => ({
        ...old,
        workLocationKey: route.id,
        workLocationText: `${route.code}: ${route.name}`,
        origin: route.origin,
        destination: route.destination,
        distanceKm: String(route.distanceKm),
        speedLimitKmH: String(route.speedLimitKmH || '35'),
        cargoType: old.cargoType || route.cargoType,
        equipmentType: route.recommendedVehicles || old.equipmentType,
        routeFlowType: route.routeFlowType || old.routeFlowType,
        returnOrigin: route.routeFlowType === 'TWO_WAY' ? route.returnOrigin || '' : '',
        returnDestination: route.routeFlowType === 'TWO_WAY' ? route.returnDestination || '' : '',
        returnCargoName: route.routeFlowType === 'TWO_WAY' ? route.returnCargoName || '' : '',
        returnTonnage: route.routeFlowType === 'TWO_WAY' ? String(route.returnTonnage || '') : '',
      }));
    } else {
      setForm((old) => ({
        ...old,
        workLocationKey: val,
        workLocationText: val,
      }));
    }
  };

  const handleStartTimeChange = (val: string) => {
    const startDate = new Date(val);
    const totalHours = form.durationHours + (form.breakHours ?? 1);
    const endDate = new Date(startDate.getTime() + totalHours * 3600000);
    setForm((old) => ({
      ...old,
      startTime: val,
      plannedStartAt: val,
      plannedEndAt: localDateTime(endDate),
    }));
  };

  const handleSetCurrentTime = () => {
    const now = new Date();
    const val = localDateTime(now);
    const totalHours = form.durationHours + (form.breakHours ?? 1);
    const endDate = new Date(now.getTime() + totalHours * 3600000);
    setForm((old) => ({
      ...old,
      startTime: val,
      plannedStartAt: val,
      plannedEndAt: localDateTime(endDate),
    }));
  };

  const handleDurationChange = (hours: number) => {
    const startDate = new Date(form.startTime || form.plannedStartAt);
    const totalHours = hours + (form.breakHours ?? 1);
    const endDate = new Date(startDate.getTime() + totalHours * 3600000);
    setForm((old) => ({
      ...old,
      durationHours: hours,
      plannedEndAt: localDateTime(endDate),
    }));
  };

  const handleBreakChange = (breakH: number) => {
    const startDate = new Date(form.startTime || form.plannedStartAt);
    const totalHours = form.durationHours + breakH;
    const endDate = new Date(startDate.getTime() + totalHours * 3600000);
    setForm((old) => ({
      ...old,
      breakHours: breakH,
      plannedEndAt: localDateTime(endDate),
    }));
  };

  const handleDriverChange = (val: string) => {
    setForm((old) => ({ ...old, driverId: val, vehicleId: '', implementId: '', implementIds: [] }));
    setAutoVehicleNotice(null);

    if (!val) {
      return;
    }

    const driver = context?.drivers.find((d) => String(d.id) === val);
    if (!driver) return;

    // Lấy danh sách xe chính và xe phụ của tài xế
    const primaryVehicles: Array<{ id: number; code: string; name: string; plate?: string }> = [];
    const secondaryVehicles: Array<{ id: number; code: string; name: string; plate?: string }> = [];

    // 1. Kiểm tra assignedVehicles từ DriverProfile
    if (Array.isArray((driver as any).assignedVehicles) && (driver as any).assignedVehicles.length > 0) {
      (driver as any).assignedVehicles.forEach((a: any) => {
        if (a.vehicle) {
          if (a.type === 'PRIMARY') primaryVehicles.push(a.vehicle);
          else secondaryVehicles.push(a.vehicle);
        }
      });
    }

    // 2. Kiểm tra primaryVehicles / drivenVehicles
    if (Array.isArray((driver as any).primaryVehicles) && (driver as any).primaryVehicles.length > 0) {
      (driver as any).primaryVehicles.forEach((pv: any) => {
        if (!primaryVehicles.some((p) => p.id === pv.id)) primaryVehicles.push(pv);
      });
    }
    if (Array.isArray((driver as any).drivenVehicles) && (driver as any).drivenVehicles.length > 0) {
      (driver as any).drivenVehicles.forEach((dv: any) => {
        if (!primaryVehicles.some((p) => p.id === dv.id)) primaryVehicles.push(dv);
      });
    }

    // 3. Kiểm tra secondaryVehicles
    if (Array.isArray((driver as any).secondaryVehicles) && (driver as any).secondaryVehicles.length > 0) {
      (driver as any).secondaryVehicles.forEach((sv: any) => {
        if (!secondaryVehicles.some((s) => s.id === sv.id) && !primaryVehicles.some((p) => p.id === sv.id)) {
          secondaryVehicles.push(sv);
        }
      });
    }

    // Helper kiểm tra xe có khả dụng trong khung giờ hiện tại hay không
    const checkVehicleAvail = (vId: number) => {
      const ctxVeh = context?.vehicles.find((v) => v.id === vId);
      if (!ctxVeh) return { available: false, vehicle: null };
      const isAvail = ctxVeh.selection
        ? ctxVeh.selection.selectable
        : ctxVeh.availability
        ? ctxVeh.availability.available
        : ctxVeh.status === 'READY' || ctxVeh.status === 'HOAT_DONG' || ctxVeh.status === 'CHO_PHAN_CONG';
      return { available: isAvail, vehicle: ctxVeh };
    };

    // A. Ưu tiên xe chính #1
    if (primaryVehicles.length > 0) {
      const v1 = primaryVehicles[0];
      const status1 = checkVehicleAvail(v1.id);
      if (status1.available) {
        setForm((old) => ({ ...old, vehicleId: String(v1.id), implementId: '', implementIds: [] }));
        setAutoVehicleNotice({
          type: 'PRIMARY_1',
          message: `Đã tự động chọn Xe chính #1 (${v1.code}${v1.plate ? ' • ' + v1.plate : ''}) do tài xế ${driver.fullName} trực tiếp nắm giữ.`,
          badge: '★ Xe chính #1',
          tone: 'emerald',
        });
        return;
      }

      // Xe chính #1 bận! Kiểm tra tiếp Xe chính #2
      if (primaryVehicles.length > 1) {
        const v2 = primaryVehicles[1];
        const status2 = checkVehicleAvail(v2.id);
        if (status2.available) {
          setForm((old) => ({ ...old, vehicleId: String(v2.id), implementId: '', implementIds: [] }));
          setAutoVehicleNotice({
            type: 'PRIMARY_2',
            message: `Xe chính #1 (${v1.code}) đang bận; đã tự động chuyển sang Xe chính #2 (${v2.code}${v2.plate ? ' • ' + v2.plate : ''}) của tài xế.`,
            badge: '★ Xe chính #2',
            tone: 'amber',
          });
          return;
        }
      }
    }

    // B. Xe chính bận hoặc chưa có -> Kiểm tra Xe phụ (Secondary)
    if (secondaryVehicles.length > 0) {
      const vSec = secondaryVehicles[0];
      const statusSec = checkVehicleAvail(vSec.id);
      if (statusSec.available) {
        setForm((old) => ({ ...old, vehicleId: String(vSec.id), implementId: '', implementIds: [] }));
        setAutoVehicleNotice({
          type: 'SECONDARY',
          message: `Xe chính đang bận; đã tự động chọn Xe phụ đồng quản lý (${vSec.code}${vSec.plate ? ' • ' + vSec.plate : ''}) của tài xế ${driver.fullName}.`,
          badge: '⚡ Xe phụ',
          tone: 'blue',
        });
        return;
      }
    }

    // C. Nếu tài xế có xe nhưng tất cả đều bận
    if (primaryVehicles.length > 0 || secondaryVehicles.length > 0) {
      setAutoVehicleNotice({
        type: 'ALL_BUSY',
        message: `Tất cả phương tiện của tài xế ${driver.fullName} (xe chính & xe phụ) hiện đều đang bận hoặc bảo dưỡng. Vui lòng chọn xe khả dụng khác từ danh sách.`,
        badge: '⚠️ Xe của tài xế đang bận',
        tone: 'rose',
      });
      return;
    }

    // D. Tài xế chưa được phân công xe cố định
    setAutoVehicleNotice({
      type: 'NO_ASSIGNED',
      message: `Tài xế ${driver.fullName} chưa được bàn giao xe cố định. Vui lòng chọn xe khả dụng từ danh sách.`,
      badge: 'ℹ️ Chưa gán xe cố định',
      tone: 'slate',
    });
  };

  const handleVehicleChange = (val: string) => {
    setForm((old) => ({
      ...old,
      vehicleId: val,
      implementId: '',
      implementIds: [],
    }));
    if (autoVehicleNotice) {
      setAutoVehicleNotice(null);
    }
  };

  // Xử lý chọn công việc từ Master Jobs
  const handleSelectJob = (code: string) => {
    const job = masterJobs.find((item) => item.code === code);
    if (!job) return;

    setForm((old) => ({
      ...old,
      jobCode: job.code,
      jobName: job.name,
      jobDescription: job.description,
      targetUnit: job.defaultUnit || old.targetUnit,
      stageCode: job.categoryCode,
      stageName: job.categoryName,
      implementGroup: job.implementGroup || old.implementGroup,
      recommendedVehicle: job.recommendedVehicle || old.recommendedVehicle,
      quotaPerShift: job.quotaPerShift || old.quotaPerShift,
      fuelQuota: job.fuelQuota || old.fuelQuota,
      fuelUnit: job.fuelUnit || old.fuelUnit,
      ...(old.category === 'CONSTRUCTION'
        ? {
            constructionCategory: job.categoryCode,
            constructionItem: job.name,
            equipmentType: job.recommendedVehicle,
            expectedDurationHours: '8',
            targetQuantity: old.targetQuantity || '8',
          }
        : {}),
      ...(old.category === 'TRANSPORT'
        ? {
            cargoType: old.cargoType || job.name,
            equipmentType: job.recommendedVehicle,
            targetQuantity: old.targetQuantity || '10',
          }
        : {}),
      ...(old.category === 'AGRICULTURE'
        ? {
            targetQuantity: old.targetQuantity || '5',
          }
        : {}),
    }));
  };

  // Xử lý chọn địa điểm / vị trí theo loại
  const handleSelectLocation = (key: string) => {
    if (form.category === 'AGRICULTURE') {
      const plot = agriPlots.find((item) => item.id === key || item.code === key);
      if (!plot) return;
      setForm((old) => ({
        ...old,
        workLocationKey: key,
        workLocationText: `${plot.code}: ${plot.name}`,
        destination: plot.name,
        targetQuantity: String(plot.areaHa),
        targetUnit: 'ha',
        cropType: plot.cropType,
        origin: old.origin || `Bãi máy ${plot.farmName || 'Nông trường'}`,
      }));
    } else if (form.category === 'CONSTRUCTION') {
      const site = constructionSites.find((item) => item.id === key || item.code === key);
      if (!site) return;
      setForm((old) => ({
        ...old,
        workLocationKey: key,
        workLocationText: `${site.code}: ${site.name}`,
        destination: site.name,
        targetScope: site.targetScope,
        targetUnit: site.targetUnit || 'giờ máy',
        equipmentType: site.recommendedMachines || old.equipmentType,
        expectedDurationHours: String(site.estimatedDays * 8 || 8),
        origin: old.origin || `Bãi tập kết Ban Xây dựng ${selectedComplex?.name || ''}`,
      }));
    } else {
      const route = transportRoutes.find((item) => item.id === key || item.code === key);
      if (!route) return;
      setForm((old) => ({
        ...old,
        workLocationKey: key,
        workLocationText: `${route.code}: ${route.name}`,
        origin: route.origin,
        destination: route.destination,
        distanceKm: String(route.distanceKm),
        speedLimitKmH: String(route.speedLimitKmH || '35'),
        cargoType: old.cargoType || route.cargoType,
        equipmentType: route.recommendedVehicles || old.equipmentType,
      }));
    }
  };

  // Ràng buộc kiểm tra form trước khi lưu
  const validate = (action: 'SAVE_DRAFT' | 'ISSUE') => {
    if (!form.managementUnitId) return 'Vui lòng chọn khu vực quản lý trước khi chọn tài xế và xe.';
    if (!form.complexCode) return 'Vui lòng chọn Khu liên hợp.';
    if (form.category === 'AGRICULTURE' && availableEnterprises.length > 0 && !form.enterpriseCode) {
      return 'Lệnh nông nghiệp yêu cầu chọn Xí nghiệp trực thuộc.';
    }
    if (form.category === 'AGRICULTURE' && availableFarms.length > 0 && !form.farmCode) {
      return 'Lệnh nông nghiệp yêu cầu chọn Nông trường sản xuất.';
    }
    if (!form.jobName || !form.workLocationText) {
      return 'Vui lòng chọn hoặc nhập đủ Hạng mục công việc và Vị trí thực hiện.';
    }
    if (
      action === 'ISSUE' &&
      form.category === 'TRANSPORT' &&
      form.routeFlowType === 'TWO_WAY' &&
      (!form.returnCargoName || !form.returnOrigin || !form.returnDestination || Number(form.returnTonnage) <= 0)
    ) {
      return 'Lệnh vận chuyển đối lưu phải có điểm lấy/trả hàng về, tên hàng và tải trọng chiều về.';
    }
    if (
      !form.plannedStartAt ||
      !form.plannedEndAt ||
      new Date(form.plannedEndAt) <= new Date(form.plannedStartAt)
    ) {
      return 'Thời gian kết thúc phải sau thời gian bắt đầu dự kiến.';
    }
    if (action === 'ISSUE') {
      if (!form.vehicleId) return 'Phát hành lệnh bắt buộc phải phân công Xe/Máy thực hiện.';
      if (form.assignmentMode === 'FIXED_ASSIGNMENT' && !form.driverId) {
        return 'Chế độ giao cứng bắt buộc phải chọn Tài xế/Thợ máy trước khi phát hành.';
      }
      if (selectedVehicle?.selection?.selectable === false || selectedVehicle?.availability?.available === false) {
        return `Xe đã chọn đang có xung đột: ${
          selectedVehicle.selection?.reasons[0]?.message || selectedVehicle.availability?.reasons[0]?.message || 'Không khả dụng'
        }. Vui lòng chọn xe khác hoặc dời khung giờ.`;
      }
      if (
        form.assignmentMode === 'FIXED_ASSIGNMENT' &&
        (selectedDriver?.selection?.selectable === false || selectedDriver?.availability?.available === false)
      ) {
        return `Tài xế đã chọn không khả dụng: ${
          selectedDriver.selection?.reasons[0]?.message || selectedDriver.availability?.reasons[0]?.message || 'Đang bận'
        }.`;
      }
      if (selectedImplement?.selection?.selectable === false) {
        return `Thiết bị đã chọn không khả dụng: ${selectedImplement.selection.reasons[0]?.message || 'Không phù hợp'}.`;
      }
    }
    return '';
  };

  // Đóng gói payload gửi backend
  const buildPayload = (action: 'SAVE_DRAFT' | 'ISSUE') => {
    const categoryDetails: Record<string, any> = {
      teamCode: form.teamCode,
      teamName: form.teamName,
    };

    if (form.category === 'AGRICULTURE') {
      categoryDetails.agricultureJobType = form.jobName || form.jobDescription || 'Công việc cơ giới nông nghiệp';
      categoryDetails.stageCode = form.selectedStageCode || form.stageCode;
      categoryDetails.stageName = form.stageName;
      categoryDetails.planCode = form.planCode;
      categoryDetails.planTitle = form.planTitle;
      categoryDetails.year = form.selectedYear;
      categoryDetails.weekNumber = form.selectedWeekNumber;
      categoryDetails.durationHours = form.durationHours;
      categoryDetails.crop = form.cropType;
      categoryDetails.implementGroup = form.implementGroup;
      categoryDetails.recommendedVehicle = form.recommendedVehicle;
      categoryDetails.quotaPerShift = form.quotaPerShift;
      categoryDetails.fuelQuota = form.fuelQuota;
      categoryDetails.fuelUnit = form.fuelUnit;
    } else if (form.category === 'CONSTRUCTION') {
      categoryDetails.constructionType = form.constructionCategory || 'SAN_GAT';
      categoryDetails.constructionCategory = form.constructionCategory;
      categoryDetails.constructionItem = form.constructionItem;
      categoryDetails.equipmentType = form.equipmentType;
      categoryDetails.targetScope = form.targetScope;
      categoryDetails.expectedDurationHours = form.expectedDurationHours;
    } else if (form.category === 'TRANSPORT') {
      categoryDetails.transportCategory = form.transportCategory;
      categoryDetails.cargoType = form.cargoType || form.jobName || 'Hàng hóa nông sản';
      categoryDetails.routeFlowType = form.routeFlowType;
      categoryDetails.distanceKm = Number(form.distanceKm) || 0;
      categoryDetails.speedLimitKmH = Number(form.speedLimitKmH) || 35;
      if (form.routeFlowType === 'TWO_WAY') {
        categoryDetails.returnCargoName = form.returnCargoName;
        categoryDetails.returnOrigin = form.returnOrigin;
        categoryDetails.returnDestination = form.returnDestination;
        categoryDetails.returnTonnage = Number(form.returnTonnage) || 0;
      }
    }

    return {
      managementUnitId: Number(form.managementUnitId),
      category: form.category,
      unit: form.unit,
      complexCode: form.complexCode,
      complexName: selectedComplex?.name || form.complexName,
      enterpriseCode: form.enterpriseCode || undefined,
      enterpriseName: selectedEnterprise?.name || form.enterpriseName || undefined,
      farmCode: form.farmCode || undefined,
      farmName: selectedFarm?.name || form.farmName || undefined,
      workLocationText: form.workLocationText,
      workLocationNotes: form.workLocationNotes || undefined,
      jobCode: form.jobCode || undefined,
      jobName: form.jobName,
      jobDescription: form.jobDescription || form.jobName,
      plannedStartAt: new Date(form.plannedStartAt).toISOString(),
      plannedEndAt: new Date(form.plannedEndAt).toISOString(),
      expectedCompletedAt: form.expectedCompletedAt ? new Date(`${form.expectedCompletedAt}T23:59:59`).toISOString() : undefined,
      workDurationMinutes: Math.round(form.durationHours * 60),
      breakDurationMinutes: Math.round((form.breakHours ?? 0) * 60),
      shift: form.shift,
      priority: form.priority,
      targetQuantity: form.targetQuantity ? Number(form.targetQuantity) : 0,
      targetUnit: form.targetUnit,
      categoryDetails: {
        ...categoryDetails,
        implementIds: selectedImplementIds,
      },
      notes: form.notes || undefined,
      origin: form.origin,
      destination: form.destination,
      assignmentMode: form.assignmentMode,
      vehicleId: form.vehicleId ? Number(form.vehicleId) : undefined,
      driverId:
        form.assignmentMode === 'FIXED_ASSIGNMENT' && form.driverId
          ? Number(form.driverId)
          : undefined,
      implementId: selectedImplementIds[0] ? Number(selectedImplementIds[0]) : undefined,
      action,
    };
  };

  // Submit form (Lưu nháp hoặc Phát hành)
  const handleSubmit = async (action: 'SAVE_DRAFT' | 'ISSUE') => {
    const errorMsg = validate(action);
    if (errorMsg) {
      setError(errorMsg);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setError('');
    setSaving(true);

    try {
      const payload = buildPayload(action);
      const saved = sourceOrder
        ? await schedulingApi.prepare(sourceOrder.id, payload)
        : await schedulingApi.createManual(payload);

      // Định hướng về trang chi tiết tương thích chính xác
      // Định hướng về trang chi tiết tương thích chính xác
      const rawSaved = saved as any;
      let targetId: number | string = rawSaved.id;
      if (rawSaved.dispatchOrderId || rawSaved.dispatchOrder?.id) {
        targetId = rawSaved.dispatchOrderId ?? rawSaved.dispatchOrder?.id;
      } else if (rawSaved.transportOrderId || rawSaved.transportOrder?.id) {
        const transId = rawSaved.transportOrderId ?? rawSaved.transportOrder?.id;
        targetId = 200000 + transId;
      }

      const planCode =
        (sourceOrder as any)?.productionOrder?.plan?.code ??
        (sourceOrder?.dispatchOrder as any)?.productionOrder?.plan?.code ??
        (sourceOrder?.transportOrder as any)?.productionOrder?.plan?.code;
      const planTitle =
        (sourceOrder as any)?.productionOrder?.plan?.title ??
        (sourceOrder?.dispatchOrder as any)?.productionOrder?.plan?.title ??
        (sourceOrder?.transportOrder as any)?.productionOrder?.plan?.title;

      navigate('/lenh-dieu-xe/danh-sach', {
        replace: true,
      });
    } catch (exception: any) {
      const response = exception as {
        response?: { data?: { message?: string | string[] } };
      };
      const detail = response.response?.data?.message;
      setError(
        Array.isArray(detail)
          ? detail.join(', ')
          : detail || 'Không thể lưu lệnh điều xe. Vui lòng kiểm tra lại thông tin.'
      );
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="grid min-h-[380px] place-items-center rounded-2xl bg-white text-xs font-bold text-slate-500 shadow-xs border border-slate-200">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="h-6 w-6 animate-spin text-emerald-600" />
          <span>Đang nạp hồ sơ lệnh điều xe...</span>
        </div>
      </div>
    );
  }

  if (generatedOrders.length > 1) {
    return (
      <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs max-w-2xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-black">
            !
          </div>
          <div>
            <h1 className="text-base font-black text-slate-900">Chọn lệnh con cần hoàn thiện</h1>
            <p className="text-xs text-slate-500">
              Công việc này sinh ra nhiều ca/lệnh con. Vui lòng chọn lệnh để phân công nguồn lực:
            </p>
          </div>
        </div>
        <div className="space-y-2 pt-2">
          {generatedOrders.map((order) => (
            <button
              key={order.id}
              type="button"
              className="flex w-full items-center justify-between rounded-xl border border-slate-200 p-3.5 text-left transition hover:border-emerald-600 hover:bg-emerald-50/40"
              onClick={() =>
                setSearchParams({ workOrderId: String(order.workOrderId) }, { replace: true })
              }
            >
              <div>
                <b className="text-xs font-black text-slate-800">{order.code}</b>
                <span className="ml-3 text-[11px] font-bold text-slate-500 uppercase">
                  {order.status}
                </span>
              </div>
              <ArrowRight className="h-4 w-4 text-emerald-600" />
            </button>
          ))}
        </div>
      </div>
    );
  }

  const currentCatInfo = categoryInfo[form.category];
  const CategoryIcon = currentCatInfo.icon;

  return (
    <div className="space-y-5 pb-24 max-w-7xl mx-auto">
      {/* 1. HEADER CHÍNH & CHỌN LOẠI LỆNH */}
      <header className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <Button
              variant="outline"
              size="sm"
              icon={<ArrowLeft className="h-4 w-4" />}
              onClick={() => navigate('/lenh-dieu-xe/danh-sach')}
              className="font-bold text-xs"
            >
              Quay lại danh sách
            </Button>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight font-mono">
                  {sourceOrder
                    ? sourceOrder.dispatchOrder?.code ??
                      sourceOrder.transportOrder?.code ??
                      (sourceOrder as any).code ??
                      `WO-${sourceOrder.id}`
                    : currentCatInfo.prefix}
                </h1>
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-extrabold text-slate-700">
                  {sourceOrder ? sourceOrder.status : 'DRAFT'}
                </span>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-extrabold border ${currentCatInfo.tagColor}`}
                >
                  {currentCatInfo.title}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500 font-medium">
                {sourceOrder ? (
                  <>
                    Hoàn thiện hồ sơ từ Kế hoạch tuần:{' '}
                    <strong className="text-slate-800 font-bold">
                      {(sourceOrder as any).productionOrder?.plan?.code ||
                        (sourceOrder.dispatchOrder as any)?.productionOrder?.plan?.code ||
                        (sourceOrder.transportOrder as any)?.productionOrder?.plan?.code ||
                        'Kế hoạch đã phê duyệt'}
                    </strong>{' '}
                    • Tuần{' '}
                    {(sourceOrder as any).productionOrder?.plan?.weekNumber ||
                      (sourceOrder.dispatchOrder as any)?.productionOrder?.plan?.weekNumber ||
                      'hiện tại'}
                  </>
                ) : (
                  'Lập lệnh điều xe trực tiếp • Nạp chuẩn danh mục định mức cơ giới THACO AGRI'
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              icon={<Save className="h-4 w-4 text-slate-600" />}
              disabled={saving}
              onClick={() => void handleSubmit('SAVE_DRAFT')}
              className="font-bold text-xs"
            >
              Lưu nháp
            </Button>
            <Button
              icon={<CheckCircle2 className="h-4 w-4 text-white" />}
              disabled={saving || contextLoading}
              onClick={() => void handleSubmit('ISSUE')}
              className="font-bold text-xs bg-emerald-700 hover:bg-emerald-800 text-white"
            >
              {saving ? 'Đang phát hành...' : 'Phát hành lệnh điều xe'}
            </Button>
          </div>
        </div>

        {/* 3 TABS PHÂN HỆ: NÔNG NGHIỆP - CÔNG TRÌNH - VẬN CHUYỂN */}
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {(Object.keys(categoryInfo) as Category[]).map((key) => {
            const item = categoryInfo[key];
            const Icon = item.icon;
            const active = form.category === key;

            return (
              <button
                key={key}
                type="button"
                disabled={Boolean(sourceOrder)}
                onClick={() => selectCategory(key)}
                className={`flex items-center gap-3.5 rounded-xl border-2 p-3 text-left transition-all ${
                  active
                    ? 'border-emerald-600 bg-emerald-50/50 shadow-2xs'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                } ${sourceOrder ? 'cursor-not-allowed opacity-80' : 'cursor-pointer'}`}
              >
                <span
                  className={`rounded-xl p-2.5 transition-colors ${
                    active ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <b className="block text-xs font-black text-slate-900">{item.title}</b>
                  <span className="block text-[11px] text-slate-500 font-medium truncate">
                    {item.short}
                  </span>
                </div>
                {active && <Check className="h-5 w-5 text-emerald-600 shrink-0" />}
              </button>
            );
          })}
        </div>
      </header>

      {/* BANNER THÔNG BÁO LỆNH GỐC NẾU CÓ */}
      {sourceOrder && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-emerald-950">
                Lệnh được khởi tạo từ Kế hoạch tuần:{' '}
                <span className="font-mono underline font-extrabold">
                  {(sourceOrder as any).productionOrder?.plan?.code ||
                    (sourceOrder.dispatchOrder as any)?.productionOrder?.plan?.code ||
                    (sourceOrder.transportOrder as any)?.productionOrder?.plan?.code ||
                    'Kế hoạch tuần'}
                </span>{' '}
                — Nhiệm vụ:{' '}
                <strong className="text-emerald-900">{sourceOrder.jobName}</strong>
              </p>
              <p className="text-[11px] text-emerald-800 font-medium mt-0.5">
                Các trường mục tiêu kế hoạch đã được khóa bảo vệ. Bạn chỉ cần chọn xe sẵn sàng,
                thợ lái và điều chỉnh ca máy để phát hành.
              </p>
            </div>
          </div>
          <span className="text-[11px] font-bold text-emerald-700 bg-white px-2.5 py-1 rounded-md border border-emerald-200 shadow-2xs shrink-0">
            Khóa theo Kế hoạch
          </span>
        </div>
      )}

      {/* HIỂN THỊ LỖI NẾU CÓ */}
      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs font-bold text-rose-700 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PHÂN HỆ NÔNG NGHIỆP: THIẾT KẾ CHUẨN XÁC THEO HÌNH 1, HÌNH 2 VÀ HÌNH 3 */}
      {/* ========================================================================= */}
      {form.category === 'AGRICULTURE' ? (
        <>
          {/* 1. HÌNH 1: THỜI GIAN TUẦN LÀM VIỆC & PHÂN CẤP ĐƠN VỊ PHỤ TRÁCH (DANH MỤC DÙNG CHUNG) */}
          <section className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="h-6 w-6 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-black flex items-center justify-center">
                  1
                </span>
                <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wide flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-emerald-600" />
                  Thời gian Tuần làm việc & Phân cấp đơn vị phụ trách (Danh mục dùng chung)
                </h2>
              </div>

              <div className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200/90 rounded-xl px-3 py-1 text-xs font-bold text-emerald-800">
                <Clock className="h-3.5 w-3.5 text-emerald-600" />
                <span>
                  Thời gian tuần: {formatDateStr(activeWeek.monday)} ➔ {formatDateStr(activeWeek.sunday)} ({form.selectedYear})
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Cột trái: Năm và Tuần (6 cols) */}
              <div className="lg:col-span-6 bg-slate-50/90 rounded-xl p-4 border border-slate-200/80 space-y-3.5">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <CalendarDays className="h-3.5 w-3.5 text-emerald-600" /> Thời gian tuần & Nội dung điều động
                </h3>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Năm làm việc: <span className="text-rose-500">*</span>
                    </label>
                    <SearchableSelect
                      value={String(form.selectedYear)}
                      onChange={(val) => {
                        const y = Number(val);
                        const curY = new Date().getFullYear();
                        const curW = getWeekNumber(new Date());
                        let nextW = form.selectedWeekNumber;
                        if (y === curY && nextW < curW) {
                          nextW = curW;
                        }
                        setForm((old) => ({
                          ...old,
                          selectedYear: y,
                          selectedWeekNumber: nextW,
                          planTitle: `Điều động cơ giới sản xuất Tuần ${nextW}`,
                        }));
                      }}
                      options={yearOptions}
                      placeholder="Chọn năm"
                      disabled={Boolean(sourceOrder) || Boolean(form.managementUnitId)}
                      heightClass="h-9"
                      bgClass={sourceOrder ? 'bg-slate-100' : 'bg-white'}
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Chọn Tuần sản xuất: <span className="text-rose-500">*</span>
                    </label>
                    <SearchableSelect
                      value={String(form.selectedWeekNumber)}
                      onChange={(val) => {
                        const w = Number(val);
                        setForm((old) => ({
                          ...old,
                          selectedWeekNumber: w,
                          planTitle: `Điều động cơ giới sản xuất Tuần ${w}`,
                        }));
                      }}
                      options={weekOptions}
                      placeholder="Chọn tuần sản xuất"
                      disabled={Boolean(sourceOrder)}
                      heightClass="h-9"
                      bgClass={sourceOrder ? 'bg-slate-100' : 'bg-white'}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Giai đoạn sản xuất (1 lệnh / 1 giai đoạn): <span className="text-rose-500">*</span>
                  </label>
                  <SearchableSelect
                    value={form.selectedStageCode}
                    onChange={(val) => {
                      const st = stageOptions.find((s) => s.value === val);
                      setForm((old) => ({
                        ...old,
                        selectedStageCode: val,
                        stageCode: val,
                        stageName: st?.label || val,
                        jobCode: '',
                        jobName: '',
                      }));
                    }}
                    options={stageOptions}
                    placeholder="Chọn giai đoạn sản xuất..."
                    disabled={Boolean(sourceOrder)}
                    heightClass="h-9"
                    bgClass={sourceOrder ? 'bg-slate-100' : 'bg-white'}
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Nội dung / Mục đích điều động: <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={2}
                    value={form.planTitle}
                    onChange={(e) => update('planTitle', e.target.value)}
                    placeholder="Nhập mục đích hoặc nội dung điều động xe cơ giới..."
                    className={`w-full rounded-xl border border-slate-200 p-2.5 text-xs font-bold text-slate-900 focus:border-emerald-600 focus:outline-none shadow-2xs resize-y min-h-[56px] leading-relaxed transition-all ${
                      sourceOrder ? 'bg-slate-100 cursor-not-allowed' : 'bg-white focus:bg-white'
                    }`}
                  />
                </div>

                <div className="rounded-lg bg-white p-2.5 border border-slate-200 text-[11px] text-slate-600 space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Ngày bắt đầu tuần (Thứ Hai):</span>
                    <strong className="text-slate-800">{formatDateStr(activeWeek.monday)}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Ngày kết thúc tuần (Chủ Nhật):</span>
                    <strong className="text-slate-800">{formatDateStr(activeWeek.sunday)}</strong>
                  </div>
                </div>
              </div>

              {/* Cột phải: 3 Cấp Phân Cấp Đơn Vị từ Danh mục dùng chung (6 cols) */}
              <div className="lg:col-span-6 bg-white rounded-xl p-4 border border-slate-200/80 space-y-3.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 text-emerald-600" />
                    Phân cấp đơn vị quản lý (Danh mục chuẩn)
                  </h3>
                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                    1. KLH ➔ 2. Xí nghiệp ➔ 3. Nông trường
                  </span>
                </div>

                <div className="space-y-3.5">
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-[11px] font-extrabold text-emerald-900">
                        Đội cơ giới quản lý lệnh <span className="text-rose-500">*</span>
                      </label>
                      {selectedManagementUnit && (
                        <div className="flex items-center gap-1.5">
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-100/90 px-2 py-0.5 rounded-md border border-emerald-300">
                            <Tractor className="w-3 h-3 text-emerald-700" />
                            <span>{unitVehicleCount} xe</span>
                          </span>
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-800 bg-blue-100/90 px-2 py-0.5 rounded-md border border-blue-300">
                            <UserCheck className="w-3 h-3 text-blue-700" />
                            <span>{unitDriverCount} tài xế</span>
                          </span>
                        </div>
                      )}
                    </div>
                    <SearchableSelect
                      value={form.managementUnitId}
                      onChange={(val) => {
                        selectManagementUnit(val);
                      }}
                      options={managementUnitOptions}
                      placeholder="Chọn Đội cơ giới trước khi chọn tài xế và xe..."
                      disabled={Boolean(sourceOrder)}
                      heightClass="h-10"
                      bgClass={sourceOrder ? 'bg-slate-100' : 'bg-white'}
                    />
                    {selectedManagementUnit ? (
                      <div className="mt-2 pt-2 border-t border-emerald-200/80 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                        <div className="flex items-center gap-2.5">
                          <span className="inline-flex items-center gap-1.5 font-bold text-emerald-950">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                            <span>Xe đang có:</span>
                            <strong className="text-emerald-700 text-xs">{unitVehicleCount} xe</strong>
                          </span>
                          <span className="text-slate-300">|</span>
                          <span className="inline-flex items-center gap-1.5 font-bold text-slate-900">
                            <span className="w-2 h-2 rounded-full bg-blue-500 inline-block"></span>
                            <span>Tài xế đang có:</span>
                            <strong className="text-blue-700 text-xs">{unitDriverCount} tài xế</strong>
                          </span>
                        </div>
                        {selectedManagementUnit.currentManager?.manager?.fullName && (
                          <div className="text-[10.5px] text-emerald-800 font-medium">
                            <span className="text-slate-500">Đội trưởng: </span>
                            <span className="font-bold">{selectedManagementUnit.currentManager.manager.fullName}</span>
                            {selectedManagementUnit.currentManager.manager.phone && (
                              <span className="text-slate-500 ml-1">({selectedManagementUnit.currentManager.manager.phone})</span>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="mt-1 text-[10px] font-semibold text-emerald-700">Tài xế, xe và thiết bị chỉ được tải từ Đội cơ giới này.</p>
                    )}
                  </div>
                  {/* 1. Khu liên hợp */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      1. Thuộc Khu liên hợp: <span className="text-rose-500">*</span>
                    </label>
                    <SearchableSelect
                      value={form.complexCode}
                      onChange={(val) => {
                        const comp = mockComplexes.find((c) => c.code === val);
                        setForm((old) => ({
                          ...old,
                          complexCode: val,
                          complexName: comp?.name || val,
                          unit: val,
                          enterpriseCode: '',
                          enterpriseName: '',
                          farmCode: '',
                          farmName: '',
                          workLocationKey: '',
                          workLocationText: '',
                          destination: '',
                          vehicleId: '',
                          driverId: '',
                          implementId: '',
                        }));
                      }}
                      options={complexOptions}
                      placeholder="Chọn Khu liên hợp..."
                      disabled={Boolean(sourceOrder) || Boolean(form.managementUnitId)}
                      heightClass="h-9"
                      bgClass={sourceOrder ? 'bg-slate-100' : 'bg-white'}
                    />
                  </div>

                  {/* 2. Xí nghiệp */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      2. Xí nghiệp trực thuộc: <span className="text-rose-500">*</span>
                    </label>
                    <SearchableSelect
                      value={form.enterpriseCode}
                      onChange={(val) => {
                        const ent = availableEnterprises.find((e) => e.code === val);
                        setForm((old) => ({
                          ...old,
                          enterpriseCode: val,
                          enterpriseName: ent?.name || val,
                          farmCode: '',
                          farmName: '',
                          workLocationKey: '',
                          workLocationText: '',
                          destination: '',
                          vehicleId: '',
                          driverId: '',
                          implementId: '',
                        }));
                      }}
                      options={enterpriseOptions}
                      placeholder={!form.complexCode ? 'Chưa chọn Khu liên hợp...' : 'Chọn Xí nghiệp trực thuộc...'}
                      disabled={Boolean(sourceOrder) || !form.complexCode}
                      heightClass="h-9"
                      bgClass={sourceOrder || !form.complexCode ? 'bg-slate-100' : 'bg-white'}
                    />
                  </div>

                  {/* 3. Nông trường */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      3. Nông trường sản xuất: <span className="text-rose-500">*</span>
                    </label>
                    <SearchableSelect
                      value={form.farmCode}
                      onChange={(val) => {
                        const farm = availableFarms.find((f) => f.code === val);
                        setForm((old) => ({
                          ...old,
                          farmCode: val,
                          farmName: farm?.name || val,
                          unit: old.complexCode,
                          workLocationKey: '',
                          workLocationText: '',
                          destination: '',
                          vehicleId: '',
                          driverId: '',
                          implementId: '',
                        }));
                      }}
                      options={farmOptions}
                      placeholder={!form.enterpriseCode ? 'Chưa chọn Xí nghiệp...' : 'Chọn Nông trường sản xuất...'}
                      disabled={Boolean(sourceOrder) || !form.enterpriseCode}
                      heightClass="h-9"
                      bgClass={sourceOrder || !form.enterpriseCode ? 'bg-slate-100' : 'bg-white'}
                    />
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* 2. HÌNH 2: CHI TIẾT CÔNG VIỆC CƠ GIỚI TRÊN LÔ THỬA & ĐỊNH MỨC */}
          <section className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="h-6 w-6 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-black flex items-center justify-center">
                  2
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wide flex items-center gap-2">
                    <ListPlus className="h-4 w-4 text-emerald-600" />
                    Hạng mục công việc cơ giới & Lô thửa thực hiện
                  </h2>
                  <span className="inline-flex items-center justify-center rounded-lg px-2.5 py-0.5 text-xs font-bold border shadow-2xs bg-emerald-50 text-emerald-800 border-emerald-200">
                    {stageOptions.find((s) => s.value === form.selectedStageCode)?.label || '1. Làm đất'}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                {/* Nút chuyển đổi chế độ xem: Dạng thẻ đầy đủ chữ vs Dạng bảng */}
                <div className="inline-flex items-center rounded-xl bg-slate-100 p-0.5 text-xs font-bold text-slate-600 border border-slate-200/70">
                  <button
                    type="button"
                    onClick={() => setAgriTaskViewMode('CARD')}
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg transition-all cursor-pointer ${
                      agriTaskViewMode === 'CARD'
                        ? 'bg-white text-emerald-800 shadow-2xs font-extrabold'
                        : 'hover:text-slate-900 text-slate-600'
                    }`}
                  >
                    <LayoutGrid className="h-3.5 w-3.5" />
                    <span>Dạng thẻ (Đầy đủ chữ)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAgriTaskViewMode('TABLE')}
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg transition-all cursor-pointer ${
                      agriTaskViewMode === 'TABLE'
                        ? 'bg-white text-emerald-800 shadow-2xs font-extrabold'
                        : 'hover:text-slate-900 text-slate-600'
                    }`}
                  >
                    <TableIcon className="h-3.5 w-3.5" />
                    <span>Dạng bảng mở rộng</span>
                  </button>
                </div>

                <div className="inline-flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1 text-xs font-bold text-slate-700">
                  <span>
                    Diện tích: <strong className="text-emerald-700 font-extrabold">{form.targetQuantity || '35'} ha</strong>
                  </span>
                  <span className="text-slate-300">•</span>
                  <span>
                    Định mức: <strong className="text-slate-800">{form.fuelQuota || 12.5} Lít/ha</strong>
                  </span>
                </div>
              </div>
            </div>

            {/* CHẾ ĐỘ 1: DẠNG THẺ CHI TIẾT (HIỂN THỊ ĐẦY ĐỦ 100% NỘI DUNG TẤT CẢ CÁC Ô TEXT BOX) */}
            {agriTaskViewMode === 'CARD' ? (
              <div className="rounded-2xl border border-slate-200/90 bg-slate-50/60 p-4 space-y-4 shadow-2xs">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="h-6 w-6 rounded-lg bg-emerald-700 text-white text-xs font-black flex items-center justify-center shadow-xs">
                      1
                    </span>
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                      Tác vụ cơ giới #1 • {stageOptions.find((s) => s.value === form.selectedStageCode)?.label || 'Làm đất'}
                    </h3>
                  </div>
                  <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100/70 px-2.5 py-0.5 rounded-full border border-emerald-200">
                    Đang chuẩn bị điều động
                  </span>
                </div>

                {/* HÀNG 1: NHIỆM VỤ CÔNG VIỆC & VỊ TRÍ LÔ THỬA (2 CỘT RỘNG RÃI: 7 / 5) */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                  {/* Cột 1: Hạng mục công việc cơ giới (7 cột - Rộng rãi) */}
                  <div className="lg:col-span-7 space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-700 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <FileText className="h-3.5 w-3.5 text-emerald-600" />
                        <span>Hạng mục công việc cơ giới:</span>
                        <span className="text-rose-500">*</span>
                      </span>
                      {form.jobCode && !form.jobCode.startsWith('CUSTOM-') && (
                        <span className="text-[10px] font-mono font-bold text-emerald-700 bg-white px-2 py-0.5 rounded border border-emerald-200">
                          {form.jobCode}
                        </span>
                      )}
                    </label>
                    <SearchableSelect
                      value={form.jobCode?.startsWith('CUSTOM-') && form.jobName ? form.jobName : form.jobCode}
                      onChange={handleSelectAgriJob}
                      options={jobOptions}
                      placeholder="Chọn công việc cơ giới..."
                      disabled={Boolean(sourceOrder)}
                      allowCustomInput={true}
                      heightClass="h-10"
                      roundedClass="rounded-xl"
                      bgClass={sourceOrder ? 'bg-slate-100' : 'bg-white'}
                      className="w-full"
                      inputClassName="border-emerald-600/70 text-emerald-950 font-bold px-3 text-xs shadow-2xs"
                    />
                    <div className="text-[11px] text-slate-500 flex items-center gap-2">
                      <span className="font-semibold text-slate-600">Quy trình kỹ thuật:</span>
                      <span className="truncate">{form.jobDescription || form.jobName || 'Tiêu chuẩn làm đất sâu 30cm'}</span>
                    </div>
                  </div>

                  {/* Cột 2: Lô / Thửa thực hiện (5 cột - Rộng rãi) */}
                  <div className="lg:col-span-5 space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-700 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-emerald-600" />
                        <span>Lô / Thửa canh tác thực hiện:</span>
                        <span className="text-rose-500">*</span>
                      </span>
                      {form.workLocationKey && (
                        <span className="text-[10px] font-mono font-bold text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                          {form.workLocationKey}
                        </span>
                      )}
                    </label>
                    <SearchableSelect
                      value={form.workLocationText}
                      onChange={handleSelectAgriPlot}
                      options={plotOptions}
                      placeholder={!form.farmCode ? 'Chưa chọn Nông trường...' : 'Chọn Lô / Thửa canh tác...'}
                      disabled={Boolean(sourceOrder) || !form.farmCode}
                      allowCustomInput={false}
                      heightClass="h-10"
                      roundedClass="rounded-xl"
                      bgClass={sourceOrder || !form.farmCode ? 'bg-slate-100' : 'bg-white'}
                      className="w-full"
                      inputClassName="border-emerald-600/70 text-emerald-950 font-bold px-3 text-xs shadow-2xs"
                    />
                    <div className="text-[11px] text-slate-500 flex items-center gap-2">
                      <span className="font-semibold text-slate-600">Đơn vị quản lý:</span>
                      <span>{form.farmName || 'Nông trường 1'}</span>
                    </div>
                  </div>
                </div>

                {/* HÀNG 2: THIẾT BỊ CƠ GIỚI & KHỐI LƯỢNG (3 CỘT RỘNG RÃI: 5 / 5 / 2) */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 pt-1">
                  {/* Cột 1: Nông cụ tương thích (5 cột) */}
                  <div className="lg:col-span-5 space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                      <Wrench className="h-3.5 w-3.5 text-amber-600" />
                      <span>Nông cụ tương thích (Danh mục chuẩn):</span>
                    </label>
                    <input
                      value={form.implementGroup}
                      disabled={Boolean(sourceOrder)}
                      onChange={(e) => update('implementGroup', e.target.value)}
                      placeholder="Dàn cày 3 - 4 chảo"
                      className={`w-full h-10 rounded-xl border border-amber-200 px-3.5 text-xs font-bold text-amber-900 focus:border-amber-500 focus:outline-none shadow-2xs ${
                        sourceOrder ? 'bg-amber-50/30 cursor-not-allowed' : 'bg-amber-50/70'
                      }`}
                    />
                    <span className="text-[10.5px] text-amber-800/80 font-medium block">
                      Tự động đề xuất theo quy chuẩn công việc cơ giới
                    </span>
                  </div>

                  {/* Cột 2: Đầu máy khuyến nghị (5 cột) */}
                  <div className="lg:col-span-5 space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                      <Tractor className="h-3.5 w-3.5 text-slate-600" />
                      <span>Đầu máy cơ giới khuyến nghị:</span>
                    </label>
                    <input
                      value={form.recommendedVehicle}
                      disabled={Boolean(sourceOrder)}
                      onChange={(e) => update('recommendedVehicle', e.target.value)}
                      placeholder="Máy kéo bánh hơi 70 - 90HP"
                      className={`w-full h-10 rounded-xl border border-slate-200 px-3.5 text-xs font-semibold text-slate-800 focus:border-emerald-600 focus:outline-none shadow-2xs ${
                        sourceOrder ? 'bg-slate-100 cursor-not-allowed' : 'bg-white'
                      }`}
                    />
                    <span className="text-[10.5px] text-slate-500 font-medium block">
                      Chủng loại công suất đầu kéo phù hợp yêu cầu tải
                    </span>
                  </div>

                  {/* Cột 3: Khối lượng (ha) (2 cột) */}
                  <div className="lg:col-span-2 space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                      <Layers className="h-3.5 w-3.5 text-emerald-600" />
                      <span>Khối lượng (ha): <span className="text-rose-500">*</span></span>
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        disabled={Boolean(sourceOrder)}
                        placeholder="35"
                        value={form.targetQuantity || ''}
                        onChange={(e) => update('targetQuantity', e.target.value)}
                        className={`w-full h-10 rounded-xl border border-emerald-300 px-3 pr-8 text-center text-sm font-black text-emerald-950 focus:border-emerald-600 focus:outline-none shadow-2xs ${
                          sourceOrder ? 'bg-slate-100 cursor-not-allowed' : 'bg-white'
                        }`}
                      />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                        ha
                      </span>
                    </div>
                    <span className="text-[10.5px] text-slate-500 font-medium block text-center">
                      Diện tích canh tác
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              /* CHẾ ĐỘ 2: DẠNG BẢNG MỞ RỘNG (VỚI MIN-WIDTH RỘNG RÃI ĐỂ KHÔNG BỊ CẮT CHỮ) */
              <div className="rounded-xl border border-slate-200/90 overflow-hidden shadow-2xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse min-w-[1150px]">
                    <thead className="bg-slate-50 border-b border-slate-200/90 text-slate-700 font-extrabold text-[11px]">
                      <tr>
                        <th className="p-3 w-12 text-center">#</th>
                        <th className="p-3 min-w-[340px]">Hạng mục công việc cơ giới</th>
                        <th className="p-3 min-w-[280px]">Lô / Thửa thực hiện</th>
                        <th className="p-3 min-w-[220px]">Nông cụ tương thích</th>
                        <th className="p-3 min-w-[240px]">Đầu máy khuyến nghị</th>
                        <th className="p-3 min-w-[120px] text-center">Khối lượng (ha)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      <tr className="hover:bg-slate-50/70 transition-colors">
                        {/* # STT */}
                        <td className="p-3 text-center font-bold text-slate-400 align-middle">1</td>

                        {/* 1. Chọn Công việc cơ giới */}
                        <td className="p-3 align-middle">
                          <SearchableSelect
                            value={form.jobCode?.startsWith('CUSTOM-') && form.jobName ? form.jobName : form.jobCode}
                            onChange={handleSelectAgriJob}
                            options={jobOptions}
                            placeholder="Chọn công việc cơ giới..."
                            disabled={Boolean(sourceOrder)}
                            allowCustomInput={true}
                            heightClass="h-9"
                            roundedClass="rounded-full"
                            bgClass={sourceOrder ? 'bg-slate-100' : 'bg-white'}
                            inputClassName="border-emerald-600/80 text-emerald-950 font-bold px-3 text-xs shadow-2xs"
                          />
                        </td>

                        {/* 2. Lô / Thửa thực hiện */}
                        <td className="p-3 align-middle">
                          <SearchableSelect
                            value={form.workLocationText}
                            onChange={handleSelectAgriPlot}
                            options={plotOptions}
                            placeholder={!form.farmCode ? 'Chưa chọn Nông trường...' : 'Chọn Lô / Thửa canh tác...'}
                            disabled={Boolean(sourceOrder) || !form.farmCode}
                            allowCustomInput={false}
                            heightClass="h-9"
                            roundedClass="rounded-full"
                            bgClass={sourceOrder || !form.farmCode ? 'bg-slate-100' : 'bg-white'}
                            inputClassName="border-emerald-600/80 text-emerald-950 font-bold px-3 text-xs shadow-2xs"
                          />
                        </td>

                        {/* 3. Nông cụ tương thích */}
                        <td className="p-3 align-middle">
                          <input
                            value={form.implementGroup}
                            disabled={Boolean(sourceOrder)}
                            onChange={(e) => update('implementGroup', e.target.value)}
                            placeholder="Dàn cày 3 - 4 chảo"
                            className={`w-full h-9 rounded-full border border-amber-200 px-4 text-xs font-bold text-amber-900 text-center focus:border-amber-500 focus:outline-none shadow-2xs ${
                              sourceOrder ? 'bg-amber-50/30 cursor-not-allowed' : 'bg-amber-50/70'
                            }`}
                          />
                        </td>

                        {/* 4. Đầu máy khuyến nghị */}
                        <td className="p-3 align-middle">
                          <input
                            value={form.recommendedVehicle}
                            disabled={Boolean(sourceOrder)}
                            onChange={(e) => update('recommendedVehicle', e.target.value)}
                            placeholder="Máy kéo bánh hơi 70 - 90HP"
                            className={`w-full h-9 rounded-full border border-slate-200 px-4 text-xs font-semibold text-slate-800 text-center focus:border-emerald-600 focus:outline-none shadow-2xs ${
                              sourceOrder ? 'bg-slate-100 cursor-not-allowed' : 'bg-white'
                            }`}
                          />
                        </td>

                        {/* 5. Diện tích thực hiện ha */}
                        <td className="p-3 text-center align-middle">
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            disabled={Boolean(sourceOrder)}
                            placeholder="35"
                            value={form.targetQuantity || ''}
                            onChange={(e) => update('targetQuantity', e.target.value)}
                            className={`w-24 h-9 text-center mx-auto rounded-full border border-slate-200 px-2 text-xs font-black text-slate-900 focus:border-emerald-600 focus:outline-none shadow-2xs ${
                              sourceOrder ? 'bg-slate-100 cursor-not-allowed' : 'bg-white'
                            }`}
                          />
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* THÔNG TIN BỔ SUNG KỸ THUẬT & ĐỊNH MỨC */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
              <div>
                <span className="text-[11px] font-bold text-slate-400 block">Cây trồng trên lô:</span>
                <strong className="text-slate-800">{form.cropType || 'Chuối Nam Mỹ Foc TR4'}</strong>
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-400 block">Năng suất tiêu chuẩn:</span>
                <strong className="text-slate-800">{form.quotaPerShift || '2.5 ha/ca'}</strong>
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-400 block">Điểm xuất phát:</span>
                <strong className="text-slate-800">{form.origin || 'Bãi máy Nông trường'}</strong>
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-400 block">Dự toán dầu định mức:</span>
                <strong className="text-emerald-700 font-extrabold">
                  ~ {((Number(form.targetQuantity) || 35) * (form.fuelQuota || 12.5)).toFixed(1)} Lít
                </strong>
              </div>
            </div>
          </section>

          {stepTwoComplete && (
            <section className="rounded-2xl border border-blue-200 bg-blue-50/60 p-4 shadow-xs">
              <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-extrabold text-blue-950">Gợi ý xe đến sớm nhất</span>
                <span className="text-[11px] font-medium text-blue-700">
                  {contextLoading
                    ? 'Đang kiểm tra xe phù hợp...'
                    : `${suggestedVehicles.length} xe phù hợp · ${Math.max(0, totalVehiclesCount - suggestedVehicles.length)} xe bị loại`}
                </span>
              </div>
              {!contextLoading && suggestedVehicles.length === 0 ? (
                <p className="text-xs font-semibold text-amber-700">Chưa có xe đúng miền vận hành, đội quản lý và khung giờ đã chọn.</p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {suggestedVehicles.map((vehicle) => {
                    const available = vehicle.availability?.available !== false;
                    return (
                      <button
                        type="button"
                        key={vehicle.id}
                        disabled={!form.driverId || !available}
                        title={!form.driverId ? 'Chọn tài xế trước khi chọn xe' : undefined}
                        onClick={() => handleVehicleChange(String(vehicle.id))}
                        className="rounded-xl border border-blue-100 bg-white p-2.5 text-left text-xs shadow-2xs transition hover:border-blue-500 disabled:cursor-not-allowed disabled:opacity-55"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <b className="font-mono text-slate-900">{vehicle.code}</b>
                          <span className={available ? 'font-semibold text-emerald-700' : 'font-semibold text-amber-700'}>
                            {available ? 'Đang rảnh' : 'Đang bận'}
                          </span>
                        </div>
                        <div className="mt-1 truncate text-slate-700">{vehicle.name}</div>
                        <div className="mt-1 text-[10px] text-slate-500">Theo khu vực · Chưa có tọa độ để tính ETA</div>
                      </button>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {/* 3. HÌNH 3: ĐIỀU ĐỘNG CA MÁY & PHÂN BỔ NGUỒN LỰC THỜI GIAN THỰC */}
          <section className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="h-6 w-6 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-black flex items-center justify-center">
                  3
                </span>
                <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wide flex items-center gap-2">
                  <Tractor className="h-4 w-4 text-emerald-600" />
                  Điều động ca máy & Phân bổ nguồn lực thực hiện
                </h2>
              </div>

              <div className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-1 text-xs font-bold text-emerald-800">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                <span>Sẵn sàng phát lệnh điều xe</span>
              </div>
            </div>

            {/* CONTAINER PHÂN CÔNG (ĐÚNG HÌNH 3) */}
            <div className="p-3.5 rounded-xl border border-slate-200 bg-white transition-all space-y-3 shadow-2xs">
              {/* DÒNG 1: THỜI GIAN CA MÁY (COMPACT 1 HÀNG - ĐÚNG HÌNH 3) */}
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center justify-between gap-2 p-2 rounded-xl bg-white border border-slate-200 text-xs">
                  <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                    <Clock className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    <span className="text-[11px] font-bold text-slate-700 shrink-0">Ca máy:</span>
                    <input
                      type="datetime-local"
                      value={form.startTime}
                      onChange={(e) => handleStartTimeChange(e.target.value)}
                      className="h-7 rounded-lg border border-slate-300 bg-white px-2 text-[11px] font-semibold text-slate-800 shadow-2xs focus:border-emerald-600 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleSetCurrentTime}
                      title="Chỉnh về ngày giờ hiện tại"
                      className="h-7 px-2 rounded-lg border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-[10.5px] font-bold text-emerald-800 shrink-0 cursor-pointer"
                    >
                      Hiện tại
                    </button>
                    <input
                      type="number"
                      min="0.5"
                      step="0.5"
                      value={form.durationHours}
                      onChange={(e) => handleDurationChange(Math.max(0.5, Number(e.target.value)))}
                      className="w-12 h-7 rounded-lg border border-slate-300 bg-white text-center text-[11px] font-extrabold text-slate-900 shadow-2xs focus:border-emerald-600 focus:outline-none"
                    />
                    <span className="text-[11px] text-slate-500 font-medium">giờ</span>

                    <span className="text-slate-300 mx-1">|</span>
                    <span className="text-[11px] font-bold text-slate-700 shrink-0">Nghỉ trưa:</span>
                    <input
                      type="number"
                      min="0"
                      max="4"
                      step="0.5"
                      value={form.breakHours ?? 1}
                      onChange={(e) => handleBreakChange(Math.max(0, Number(e.target.value)))}
                      className="w-11 h-7 rounded-lg border border-slate-300 bg-white text-center text-[11px] font-extrabold text-slate-900 shadow-2xs focus:border-emerald-600 focus:outline-none"
                    />
                    <span className="text-[11px] text-slate-500 font-medium">giờ</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-1">
                    <span className="text-[10px] text-slate-400 font-semibold mr-0.5">Ca:</span>
                    {[4, 8, 10, 12].map((h) => (
                      <button
                        key={h}
                        type="button"
                        onClick={() => handleDurationChange(h)}
                        className={`h-6 px-2 rounded-full text-[10.5px] font-bold transition-all cursor-pointer ${
                          form.durationHours === h
                            ? 'bg-slate-900 text-white shadow-2xs'
                            : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                        }`}
                      >
                        {h}h
                      </button>
                    ))}
                    <span className="text-slate-200 mx-0.5">|</span>
                    <span className="text-[10px] text-slate-400 font-semibold mr-0.5">Nghỉ:</span>
                    {[0, 1, 1.5, 2].map((b) => (
                      <button
                        key={b}
                        type="button"
                        onClick={() => handleBreakChange(b)}
                        className={`h-6 px-2 rounded-full text-[10.5px] font-bold transition-all cursor-pointer ${
                          (form.breakHours ?? 1) === b
                            ? 'bg-emerald-800 text-white shadow-2xs'
                            : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                        }`}
                      >
                        {b === 0 ? '0h' : `${b}h`}
                      </button>
                    ))}
                  </div>
                </div>

                {/* DÒNG DƯỚI CA MÁY: KẾT THÚC CA LÚC */}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-2 py-0.5 text-[11px] text-slate-600">
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-500 font-medium">Kết thúc ca lúc:</span>
                    <span className="font-bold text-slate-800">
                      {calculateEndTimeFormatted(form.startTime || form.plannedStartAt, form.durationHours, form.breakHours ?? 1)}
                    </span>
                  </div>
                  {(form.breakHours ?? 1) > 0 ? (
                    <span className="text-[10.5px] font-medium text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/80">
                      Đã cộng {form.breakHours ?? 1}h nghỉ trưa (Tổng thời lượng: {form.durationHours + (form.breakHours ?? 1)}h)
                    </span>
                  ) : (
                    <span className="text-[10.5px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                      Không nghỉ trưa / Làm liên tục
                    </span>
                  )}
                  <label className="ml-auto flex items-center gap-2 font-medium">Dự kiến hoàn thành công việc:<input type="date" value={form.expectedCompletedAt} min={form.plannedStartAt.slice(0, 10)} onChange={(e) => update('expectedCompletedAt', e.target.value)} className="h-7 rounded-lg border border-slate-300 bg-white px-2 text-[11px] font-bold text-slate-800" /></label>
                </div>
              </div>

              {/* DÒNG 2: LƯỚI 3 CỘT NGANG: 1. THỢ LÁI (ƯU TIÊN) | 2. XE MÁY (TỰ ĐỘNG THEO TÀI) | 3. PHỤ KIỆN */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Cột 1: Chọn Thợ máy / Lái xe (ƯU TIÊN CHỌN TRƯỚC) */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-800 flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <User className="h-3.5 w-3.5 text-indigo-600" />
                      <span>1. Thợ máy / Lái xe:</span>
                      <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200/80 font-mono" title="Số thợ máy/lái xe sẵn sàng / Tổng số thợ máy đủ điều kiện">
                        ({availDriversCount}/{totalDriversCount})
                      </span>
                    </span>
                    {selectedDriver ? (
                      <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-1.5 rounded truncate max-w-[120px]">
                        {selectedDriver.fullName}
                      </span>
                    ) : (
                      <span className="text-[10px] font-extrabold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                        Ưu tiên chọn trước
                      </span>
                    )}
                  </label>
                  <SearchableSelect
                    value={form.driverId}
                    onChange={handleDriverChange}
                    options={driverOptions}
                    allowCustomInput={false}
                    placeholder="-- Chọn thợ máy / lái xe --"
                    heightClass="h-9"
                    roundedClass="rounded-lg"
                    bgClass="bg-white"
                    className="w-full"
                    inputClassName="text-xs font-semibold text-slate-900 border-indigo-300 shadow-2xs focus:border-indigo-600"
                    emptyOptionLabel="-- Chọn thợ máy / lái xe --"
                    emptyValue=""
                  />
                  {form.managementUnitId && !contextLoading && totalDriversCount === 0 && (
                    <p className="text-[10.5px] font-semibold text-rose-700">Đội này chưa có tài xế đang được phân công.</p>
                  )}
                  {form.managementUnitId && !contextLoading && totalDriversCount > 0 && availDriversCount === 0 && (
                    <p className="text-[10.5px] font-semibold text-amber-700">Không có tài xế đủ điều kiện. Mở danh sách để xem rõ từng lý do: hạng GPLX, nghỉ phép/nghỉ ca, đang vận hành hoặc trùng lệnh.</p>
                  )}
                  {selectedDriver && (
                    <div className="rounded-lg bg-indigo-50/70 border border-indigo-200/80 px-2.5 py-1.5 text-[11px] text-indigo-950 flex items-center justify-between">
                      <span className="font-semibold truncate">{selectedDriver.fullName} • {selectedDriver.licenseClass || 'GPLX A4'}</span>
                      <span className="font-bold text-indigo-800 shrink-0 ml-1">{selectedDriver.phone || 'Sẵn sàng'}</span>
                    </div>
                  )}
                </div>

                {/* Cột 2: Chọn Phương tiện / Thiết bị xe máy (TỰ ĐỘNG GÁN THEO TÀI XẾ) */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-800 flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <Tractor className="h-3.5 w-3.5 text-emerald-600" />
                      <span>2. Thiết bị xe máy:</span>
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/80 font-mono" title="Số xe có thể hoạt động / Tổng số xe">
                        ({availVehiclesCount}/{totalVehiclesCount})
                      </span>
                    </span>
                    {selectedVehicle ? (
                      <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 px-1.5 rounded">
                        {selectedVehicle.code}
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400 font-medium italic">
                        Tự động theo tài xế
                      </span>
                    )}
                  </label>
                  <SearchableSelect
                    value={form.vehicleId}
                    onChange={handleVehicleChange}
                    options={vehicleOptions}
                    disabled={!form.driverId}
                    allowCustomInput={false}
                    placeholder="-- Chọn xe máy --"
                    heightClass="h-9"
                    roundedClass="rounded-lg"
                    bgClass="bg-white"
                    className="w-full"
                    inputClassName="text-xs font-semibold text-slate-900 border-slate-300 shadow-2xs"
                    emptyOptionLabel="-- Chọn xe máy --"
                    emptyValue=""
                  />
                  {form.managementUnitId && !contextLoading && totalVehiclesCount === 0 && (
                    <p className="text-[10.5px] font-semibold text-rose-700">Đội này chưa có xe/máy.</p>
                  )}
                  {form.managementUnitId && !contextLoading && totalVehiclesCount > 0 && availVehiclesCount === 0 && (
                    <p className="text-[10.5px] font-semibold text-amber-700">Không có xe/máy phù hợp loại lệnh hoặc đang sẵn sàng.</p>
                  )}
                  {selectedVehicle && (
                    <div className="rounded-lg bg-emerald-50/70 border border-emerald-200/80 px-2.5 py-1.5 text-[11px] text-emerald-950 flex items-center justify-between">
                      <span className="font-semibold truncate">{selectedVehicle.name} • {selectedVehicle.plate || 'Chưa gắn biển'}</span>
                      <span className="font-bold text-emerald-800 shrink-0 ml-1">{selectedVehicle.fuelQuotaRate || 12.5} L/h</span>
                    </div>
                  )}
                </div>

                {/* Cột 3: Chọn Phụ kiện gắn kèm (HỖ TRỢ CHỌN NHIỀU THIẾT BỊ) */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-800 flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <Wrench className="h-3.5 w-3.5 text-blue-600" />
                      <span>3. Phụ kiện gắn kèm:</span>
                      <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200/80 font-mono" title="Số phụ kiện có thể gắn / Tổng số phụ kiện">
                        ({availImplementsCount}/{totalImplementsCount})
                      </span>
                    </span>
                    {selectedImplementIds.length > 0 && (
                      <span className="text-[10px] font-bold text-blue-700 bg-blue-100/70 px-1.5 py-0.5 rounded-full border border-blue-200">
                        Đã chọn {selectedImplementIds.length} thiết bị
                      </span>
                    )}
                  </label>
                  <SearchableSelect
                    value=""
                    onChange={handleAddImplement}
                    options={implementOptions.filter((o) => !selectedImplementIds.includes(o.value))}
                    disabled={!form.vehicleId}
                    placeholder={selectedImplementIds.length > 0 ? "+ Chọn thêm thiết bị phụ trợ..." : "-- Chọn phụ kiện / moóc --"}
                    heightClass="h-9"
                    roundedClass="rounded-lg"
                    bgClass="bg-white"
                    className="w-full"
                    inputClassName="text-xs font-semibold text-slate-900 border-slate-300 shadow-2xs"
                    emptyOptionLabel={selectedImplementIds.length > 0 ? "+ Chọn thêm thiết bị phụ trợ..." : "-- Chọn phụ kiện / moóc --"}
                    emptyValue=""
                  />
                  {form.managementUnitId && !contextLoading && totalImplementsCount === 0 && (
                    <p className="text-[10.5px] font-semibold text-slate-600">Đội này không có thiết bị gắn kèm.</p>
                  )}
                  {form.managementUnitId && !contextLoading && totalImplementsCount > 0 && availImplementsCount === 0 && (
                    <p className="text-[10.5px] font-semibold text-amber-700">Không có thiết bị phù hợp với loại lệnh hoặc xe đã chọn.</p>
                  )}
                  {selectedImplementItems.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <div className="flex flex-wrap gap-1.5">
                        {selectedImplementItems.map((item) => (
                          <span
                            key={item.id}
                            className="inline-flex items-center gap-1 bg-blue-50 text-blue-900 border border-blue-200/90 rounded-lg px-2 py-1 text-[11px] font-bold shadow-2xs"
                          >
                            <Wrench className="h-3 w-3 text-blue-600 shrink-0" />
                            <span className="truncate max-w-[180px]">{item.label}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveImplement(item.id)}
                              className="ml-1 text-slate-400 hover:text-rose-600 font-black text-xs hover:bg-rose-100 rounded-full w-3.5 h-3.5 flex items-center justify-center transition-colors"
                              title="Bỏ chọn thiết bị này"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                      {selectedImplementIds.length > 1 && (
                        <button
                          type="button"
                          onClick={handleClearImplements}
                          className="text-[10px] text-slate-400 hover:text-rose-600 font-semibold underline block"
                        >
                          Bỏ chọn tất cả ({selectedImplementIds.length} thiết bị)
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* THÔNG BÁO TỰ ĐỘNG GÁN XE THEO TÀI XẾ */}
              {autoVehicleNotice && (
                <div
                  className={`flex items-start justify-between gap-3 p-3 rounded-xl border text-xs transition-all shadow-2xs ${
                    autoVehicleNotice.tone === 'emerald'
                      ? 'bg-emerald-50/90 border-emerald-300 text-emerald-950'
                      : autoVehicleNotice.tone === 'amber'
                      ? 'bg-amber-50/90 border-amber-300 text-amber-950'
                      : autoVehicleNotice.tone === 'blue'
                      ? 'bg-blue-50/90 border-blue-300 text-blue-950'
                      : autoVehicleNotice.tone === 'rose'
                      ? 'bg-rose-50/90 border-rose-300 text-rose-950'
                      : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider shrink-0 ${
                        autoVehicleNotice.tone === 'emerald'
                          ? 'bg-emerald-200 text-emerald-900'
                          : autoVehicleNotice.tone === 'amber'
                          ? 'bg-amber-200 text-amber-900'
                          : autoVehicleNotice.tone === 'blue'
                          ? 'bg-blue-200 text-blue-900'
                          : autoVehicleNotice.tone === 'rose'
                          ? 'bg-rose-200 text-rose-900'
                          : 'bg-slate-200 text-slate-800'
                      }`}
                    >
                      {autoVehicleNotice.badge}
                    </span>
                    <p className="font-semibold text-xs leading-relaxed">{autoVehicleNotice.message}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAutoVehicleNotice(null)}
                    className="text-slate-400 hover:text-slate-700 p-0.5 rounded-md hover:bg-slate-200/50"
                    title="Đóng thông báo"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}

              {/* DÒNG 3: DỰ TOÁN NHIÊN LIỆU & GHI CHÚ */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <Fuel className="h-4 w-4 text-amber-500" />
                  <span>Dầu dự toán xe #1:</span>
                  <strong className="text-amber-900 font-extrabold text-sm">
                    {(form.durationHours * (selectedVehicle?.fuelQuotaRate || 12.5)).toFixed(1)} Lít
                  </strong>
                  <span className="text-slate-400 text-[11px]">
                    (Ca {form.durationHours}h × {selectedVehicle?.fuelQuotaRate || 12.5} L/h)
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-[11px] text-slate-500">Chế độ giao việc:</span>
                  <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 font-bold text-[11px] border border-emerald-200">
                    Giao cứng (Chỉ định đích danh)
                  </span>
                </div>
              </div>
            </div>

            {/* TIMELINE NGUỒN LỰC */}
            {(selectedVehicle || selectedDriver) && (
              <div className="grid gap-4 sm:grid-cols-2 pt-1">
                {selectedVehicle && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <b className="text-xs font-black text-slate-800">
                          {selectedVehicle.code} — {selectedVehicle.name}
                        </b>
                        <span className="block text-[10.5px] text-slate-500">
                          Biển số: {selectedVehicle.plate || 'Chưa gắn'}
                        </span>
                      </div>
                      <span className="rounded-full px-2 py-0.5 text-[10.5px] font-extrabold bg-emerald-100 text-emerald-800">
                        Sẵn sàng
                      </span>
                    </div>
                    {selectedVehicle.availability?.intervals && (
                      <ResourceTimeline
                        from={new Date(form.plannedStartAt).toISOString()}
                        to={new Date(form.plannedEndAt).toISOString()}
                        intervals={selectedVehicle.availability.intervals}
                      />
                    )}
                  </div>
                )}

                {selectedDriver && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <b className="text-xs font-black text-slate-800">
                          {selectedDriver.fullName}
                        </b>
                        <span className="block text-[10.5px] text-slate-500">
                          GPLX: {selectedDriver.licenseClass || 'Máy kéo A4'} • ĐT: {selectedDriver.phone || '—'}
                        </span>
                      </div>
                      <span className="rounded-full px-2 py-0.5 text-[10.5px] font-extrabold bg-emerald-100 text-emerald-800">
                        Đủ điều kiện
                      </span>
                    </div>
                    {selectedDriver.availability?.intervals && (
                      <ResourceTimeline
                        from={new Date(form.plannedStartAt).toISOString()}
                        to={new Date(form.plannedEndAt).toISOString()}
                        intervals={selectedDriver.availability.intervals}
                      />
                    )}
                  </div>
                )}
              </div>
            )}
          </section>
        </>
      ) : form.category === 'CONSTRUCTION' ? (
        <ConstructionOrderFormBlocks
          form={form}
          update={update}
          setForm={setForm}
          sourceOrder={sourceOrder}
          activeWeek={activeWeek}
          yearOptions={yearOptions}
          weekOptions={weekOptions}
          complexOptions={complexOptions}
          selectedComplex={selectedComplex}
          managementUnits={managementUnits}
          managementUnitOptions={managementUnitOptions}
          selectManagementUnit={selectManagementUnit}
          enterpriseOptions={enterpriseOptions}
          availableEnterprises={availableEnterprises}
          complexes={complexes}
          constructionCategoryOptions={constructionCategoryOptions}
          constructionJobOptions={constructionJobOptions}
          availableConstructionJobs={availableConstructionJobs}
          constructionSiteOptions={constructionSiteOptions}
          constructionTeamOptions={constructionTeamOptions}
          vehicleOptions={vehicleOptions}
          driverOptions={driverOptions}
          implementOptions={implementOptions}
          selectedVehicle={selectedVehicle}
          selectedDriver={selectedDriver}
          selectedImplement={selectedImplement}
          handleDurationChange={handleDurationChange}
          handleBreakChange={handleBreakChange}
          handleStartTimeChange={handleStartTimeChange}
          handleSetCurrentTime={handleSetCurrentTime}
          handleVehicleChange={handleVehicleChange}
          handleDriverChange={handleDriverChange}
          autoVehicleNotice={autoVehicleNotice}
          onCloseNotice={() => setAutoVehicleNotice(null)}
          handleSelectConstructionJob={handleSelectConstructionJob}
          handleSelectConstructionSite={handleSelectConstructionSite}
        />
      ) : (
        <TransportOrderFormBlocks
          form={form}
          update={update}
          setForm={setForm}
          sourceOrder={sourceOrder}
          activeWeek={activeWeek}
          yearOptions={yearOptions}
          weekOptions={weekOptions}
          complexOptions={complexOptions}
          selectedComplex={selectedComplex}
          managementUnits={managementUnits}
          managementUnitOptions={managementUnitOptions}
          selectManagementUnit={selectManagementUnit}
          enterpriseOptions={enterpriseOptions}
          availableEnterprises={availableEnterprises}
          complexes={complexes}
          transportCategoryOptions={transportCategoryOptions}
          transportJobOptions={transportJobOptions}
          availableTransportJobs={availableTransportJobs}
          transportRouteOptions={transportRouteOptions}
          returnOriginOptions={returnOriginOptions}
          returnDestinationOptions={returnDestinationOptions}
          returnCargoOptions={returnCargoOptions}
          returnTonnageOptions={returnTonnageOptions}
          vehicleOptions={vehicleOptions}
          driverOptions={driverOptions}
          implementOptions={implementOptions}
          selectedVehicle={selectedVehicle}
          selectedDriver={selectedDriver}
          selectedImplement={selectedImplement}
          handleDurationChange={handleDurationChange}
          handleBreakChange={handleBreakChange}
          handleStartTimeChange={handleStartTimeChange}
          handleSetCurrentTime={handleSetCurrentTime}
          handleVehicleChange={handleVehicleChange}
          handleDriverChange={handleDriverChange}
          autoVehicleNotice={autoVehicleNotice}
          onCloseNotice={() => setAutoVehicleNotice(null)}
          handleSelectTransportJob={handleSelectTransportJob}
          handleSelectTransportRoute={handleSelectTransportRoute}
        />
      )}

      {/* 5. STICKY FOOTER ACTION BAR */}
      <div className="sticky bottom-4 z-20 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-xl backdrop-blur">
        <div className="flex items-center gap-4 text-xs text-slate-600 font-bold">
          <span className="flex items-center gap-1.5">
            <Building2 className="h-4 w-4 text-slate-400" />
            {selectedComplex?.name || 'Chưa chọn đơn vị'}
          </span>
          <span className="flex items-center gap-1.5">
            <MapPin className="h-4 w-4 text-slate-400" />
            {form.workLocationText || 'Chưa chọn vị trí'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            icon={<Save className="h-4 w-4 text-slate-600" />}
            disabled={saving}
            onClick={() => void handleSubmit('SAVE_DRAFT')}
            className="font-bold text-xs"
          >
            Lưu nháp
          </Button>
          <Button
            icon={<CheckCircle2 className="h-4 w-4 text-white" />}
            disabled={saving || contextLoading}
            onClick={() => void handleSubmit('ISSUE')}
            className="font-bold text-xs bg-emerald-700 hover:bg-emerald-800 text-white"
          >
            {saving ? 'Đang phát hành...' : 'Phát hành lệnh điều xe'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DispatchOrderForm;
