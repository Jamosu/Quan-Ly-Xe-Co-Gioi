import React, { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import {
  Calendar,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Download,
  Layers,
  Lock,
  MapPin,
  Plus,
  Tractor,
  TrendingUp,
  CheckCircle2,
  Send,
  Eye,
  Clock,
  RotateCcw,
  Edit2,
  Trash2,
  Pen,
  Wrench,
  Truck,
  User,
  Building2,
  Search,
  Check,
  AlertCircle,
  AlertTriangle,
  HardHat,
  FileSpreadsheet,
  FileText,
  ListPlus,
  X,
  ExternalLink,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { DataTable, Column } from '../../components/data-display/DataTable';
import { KPIGrid } from '../../components/data-display/KPIGrid';
import { StatCard } from '../../components/data-display/StatCard';
import { StatusBadge, ViewSwitcher } from '../../components/operations/OperationUi';
import { useAppStore } from '../../store/useAppStore';
import { operationsApi } from '../../api/operations';
import { SosRescueModal } from '../../components/dispatch/SosRescueModal';
import type { DispatchOrderRecord } from '../../types';
import { parseScheduledDays, getDaysInRange, getDayActualDate } from './CreateProductionPlanPage';
import { matchesKLH } from '../../utils/filterUtils';

// ============================================================================
// DATA MODELS CHO KẾ HOẠCH SẢN XUẤT THEO TUẦN (1 TUẦN CÓ NHIỀU CÔNG VIỆC)
// ============================================================================
export interface WeeklyTaskItem {
  id: string;
  jobCode: string;
  jobName: string;
  stageCode: string;
  stageName: string;
  lotPlot: string;
  implementGroup: string;
  recommendedVehicle: string;
  targetAreaHa: number;
  assignedVehiclesCount: number;
  scheduledDays: string; // VD: 'Thứ 2 - Thứ 4', 'Thứ 5 - Thứ 7', 'Cả tuần'
  notes?: string;
  status: 'PENDING' | 'DISPATCHED' | 'COMPLETED';
}

export interface WeeklyPlanItem {
  id: string;
  code: string; // VD: KH-2026-W37-0805
  title: string; // Kế hoạch cơ giới sản xuất Tuần 36 - Vùng chuối Koun Mom
  complexCode: string; // KOUN_MOM, SNOUL, NAM_LAO
  complexName: string;
  enterpriseCode?: string;
  enterpriseName?: string;
  farmCode?: string;
  farmName?: string;
  defaultPlot?: string;
  weekNumber: number; // 36
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  stageCode?: string; // LAM_DAT, TRONG_MOI, THU_HOACH, VAN_CHUYEN, HAU_CAN
  stageName?: string;
  status: 'DRAFT' | 'APPROVED' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE';
  tasks: WeeklyTaskItem[];
  notes?: string;
  createdAt: string;
  createdBy?: string;
}

export interface FlattenedTaskRow {
  id: string;
  planId: string;
  planCode: string;
  planTitle: string;
  complexName: string;
  weekNumber: number;
  startDate: string;
  endDate: string;
  planStatus: 'DRAFT' | 'APPROVED' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE';
  planNotes?: string;

  taskId: string;
  jobCode: string;
  jobName: string;
  stageCode: string;
  stageName: string;
  lotPlot: string;
  implementGroup: string;
  recommendedVehicle: string;
  targetAreaHa: number;
  assignedVehiclesCount: number;
  scheduledDays: string;
  taskNotes?: string;

  rawPlan: WeeklyPlanItem;
  rawTask: WeeklyTaskItem;
}

// Cấu trúc phân cấp đơn vị: Khu liên hợp -> Xí nghiệp -> Nông trường -> Lô/Thửa
export interface FarmOption {
  code: string;
  name: string;
  plots: string[];
}

export interface EnterpriseOption {
  code: string;
  name: string;
  farms: FarmOption[];
}

export interface KlhHierarchy {
  code: string;
  name: string;
  enterprises: EnterpriseOption[];
}

export const HIERARCHY_DATA: KlhHierarchy[] = [
  {
    code: 'KOUN_MOM',
    name: 'Khu liên hợp Koun Mom',
    enterprises: [
      {
        code: 'XN_KM_CH1',
        name: 'Xí nghiệp Chuối Koun Mom 1',
        farms: [
          {
            code: 'NT_KM_01',
            name: 'Nông trường 1 (Vùng chuối A)',
            plots: ['Lô A01 - A04', 'Lô A05 - A08', 'Lô A09 - A12', 'Lô A13 - A16'],
          },
          {
            code: 'NT_KM_02',
            name: 'Nông trường 2 (Vùng chuối B)',
            plots: ['Lô B01 - B04', 'Lô B05 - B08', 'Lô B09 - B12'],
          },
          {
            code: 'NT_KM_03',
            name: 'Nông trường 3 (Vùng chuối C)',
            plots: ['Lô C01 - C04', 'Lô C05 - C08'],
          },
        ],
      },
      {
        code: 'XN_KM_CG',
        name: 'Xí nghiệp Cơ giới Koun Mom',
        farms: [
          {
            code: 'NT_KM_CG1',
            name: 'Cụm Cơ giới Trung tâm',
            plots: ['Toàn vùng Koun Mom', 'Lô D01 - D05', 'Khu trung tâm cơ giới'],
          },
          {
            code: 'NT_KM_CG2',
            name: 'Đội Khai hoang - San ủi',
            plots: ['Khu mở rộng KH1', 'Khu mở rộng KH2'],
          },
        ],
      },
      {
        code: 'XN_KM_CAT',
        name: 'Xí nghiệp Cây ăn trái Koun Mom',
        farms: [
          {
            code: 'NT_KM_XOAI',
            name: 'Nông trường Xoài Keo',
            plots: ['Lô X01 - X04', 'Lô X05 - X08'],
          },
          {
            code: 'NT_KM_BUOI',
            name: 'Nông trường Bưởi Da xanh',
            plots: ['Lô BD01 - BD03', 'Lô BD04 - BD06'],
          },
        ],
      },
    ],
  },
  {
    code: 'SNOUL',
    name: 'Khu liên hợp Snoul',
    enterprises: [
      {
        code: 'XN_SN_CH1',
        name: 'Xí nghiệp Chuối Snoul 1',
        farms: [
          {
            code: 'NT_SN_01',
            name: 'Nông trường 1 Snoul',
            plots: ['Lô S01 - S04', 'Lô S05 - S08'],
          },
          {
            code: 'NT_SN_02',
            name: 'Nông trường 2 Snoul',
            plots: ['Lô S09 - S12', 'Lô S13 - S16'],
          },
        ],
      },
      {
        code: 'XN_SN_CS',
        name: 'Xí nghiệp Cao su Snoul',
        farms: [
          {
            code: 'NT_SN_CS1',
            name: 'Nông trường Cao su 1',
            plots: ['Lô CS-01', 'Lô CS-02', 'Lô CS-03'],
          },
        ],
      },
    ],
  },
  {
    code: 'NAM_LAO',
    name: 'Khu liên hợp Nam Lào',
    enterprises: [
      {
        code: 'XN_NL_01',
        name: 'Xí nghiệp Nông nghiệp Nam Lào 1',
        farms: [
          {
            code: 'NT_NL_01',
            name: 'Nông trường Chuối Attapeu',
            plots: ['Lô LA-01', 'Lô LA-02', 'Lô LA-03'],
          },
          {
            code: 'NT_NL_02',
            name: 'Nông trường Cây ăn trái Paksong',
            plots: ['Lô PK-01', 'Lô PK-02'],
          },
        ],
      },
    ],
  },
];

// Danh mục Khu liên hợp chuẩn
const KLH_OPTIONS = [
  { code: 'ALL', name: 'Tất cả Khu liên hợp' },
  { code: 'KOUN_MOM', name: 'Khu liên hợp Koun Mom' },
  { code: 'SNOUL', name: 'Khu liên hợp Snoul' },
  { code: 'NAM_LAO', name: 'Khu liên hợp Nam Lào' },
];

// Danh mục giai đoạn mùa vụ chuẩn
export const STAGES: Record<string, { label: string; bg: string; text: string; border: string }> = {
  LAM_DAT: { label: '1. Làm đất', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  TRONG_MOI: { label: '2. Trồng mới & Chăm sóc', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  THU_HOACH: { label: '3. Thu hoạch', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
};

// Danh mục công việc chuẩn tham chiếu cho kế hoạch nông nghiệp (Chỉ gồm Làm đất, Trồng mới, Thu hoạch)
export const STANDARD_JOBS = [
  {
    code: 'CV-LD-01',
    name: 'Cày lật phá lâm sâu 30cm',
    stageCode: 'LAM_DAT',
    stageName: '1. Làm đất',
    implementGroup: 'Dàn cày 3 - 4 chảo',
    recommendedVehicle: 'Máy kéo bánh hơi 70 - 90HP',
    defaultQuota: 18.5,
    defaultVehicles: 3,
  },
  {
    code: 'CV-LD-02',
    name: 'Bừa đĩa 24 chảo làm tơi đất',
    stageCode: 'LAM_DAT',
    stageName: '1. Làm đất',
    implementGroup: 'Dàn bừa đĩa 24 chảo',
    recommendedVehicle: 'Máy kéo bánh hơi 70 - 90HP',
    defaultQuota: 15.0,
    defaultVehicles: 2,
  },
  {
    code: 'CV-LD-03',
    name: 'Xới đất tơi xốp mặt luống',
    stageCode: 'LAM_DAT',
    stageName: '1. Làm đất',
    implementGroup: 'Dàn xới đất phay',
    recommendedVehicle: 'Máy kéo bánh hơi 50 - 70HP',
    defaultQuota: 20.0,
    defaultVehicles: 3,
  },
  {
    code: 'CV-LD-04',
    name: 'Lên luống trồng chuối chuẩn nông trường',
    stageCode: 'LAM_DAT',
    stageName: '1. Làm đất',
    implementGroup: 'Dàn lên luống 2 tim',
    recommendedVehicle: 'Máy kéo 70 - 90HP',
    defaultQuota: 16.0,
    defaultVehicles: 2,
  },
  {
    code: 'CV-TM-01',
    name: 'Khoan hố đặt bầu cây giống',
    stageCode: 'TRONG_MOI',
    stageName: '2. Trồng mới & Chăm sóc',
    implementGroup: 'Dàn khoan hố tự hành',
    recommendedVehicle: 'Máy kéo nhỏ 40 - 50HP',
    defaultQuota: 8.5,
    defaultVehicles: 2,
  },
  {
    code: 'CV-TM-02',
    name: 'Rải vôi bột & phân lót hữu cơ',
    stageCode: 'TRONG_MOI',
    stageName: '2. Trồng mới & Chăm sóc',
    implementGroup: 'Dàn rải phân / vôi đĩa quay',
    recommendedVehicle: 'Máy kéo 50 - 70HP',
    defaultQuota: 25.0,
    defaultVehicles: 3,
  },
  {
    code: 'CV-TM-03',
    name: 'Phun thuốc BVTV & dưỡng cây tự hành',
    stageCode: 'TRONG_MOI',
    stageName: '2. Trồng mới & Chăm sóc',
    implementGroup: 'Dàn phun thuốc cần dài 12m',
    recommendedVehicle: 'Máy kéo bánh cao 50 - 60HP',
    defaultQuota: 12.0,
    defaultVehicles: 2,
  },
  {
    code: 'CV-TH-01',
    name: 'Cắt buồng & gom kéo mooc về xưởng đóng gói',
    stageCode: 'THU_HOACH',
    stageName: '3. Thu hoạch',
    implementGroup: 'Rơ-moóc chuyên dụng treo chuối',
    recommendedVehicle: 'Máy kéo 50 - 70HP',
    defaultQuota: 14.0,
    defaultVehicles: 4,
  },
  {
    code: 'CV-TH-02',
    name: 'Băm nghiền thân cây chuối sau thu hoạch',
    stageCode: 'THU_HOACH',
    stageName: '3. Thu hoạch',
    implementGroup: 'Dàn băm thân cây PTO',
    recommendedVehicle: 'Máy kéo 70 - 90HP',
    defaultQuota: 12.0,
    defaultVehicles: 2,
  },
];

// Dữ liệu khởi tạo chuẩn: Kế hoạch sản xuất cơ giới Nông nghiệp (rỗng, không dùng dữ liệu ảo)
export function generateInitialAgriPlans(): WeeklyPlanItem[] {
  return [];
}

export const INITIAL_WEEKLY_PLANS: WeeklyPlanItem[] = [];

// Helper kiểm tra kế hoạch có phải thuần Nông nghiệp (Làm đất, Trồng mới, Thu hoạch)
export function isPureAgriPlan(p: WeeklyPlanItem): boolean {
  const validStages = ['LAM_DAT', 'TRONG_MOI', 'THU_HOACH'];
  const hasValidStage = !p.stageCode || validStages.includes(p.stageCode);
  const text = `${p.title || ''} ${p.code || ''} ${(p.tasks || []).map((t) => t.jobName).join(' ')}`.toLowerCase();
  const hasNonAgriKeyword = /công trình|vận chuyển|vận tải|nội bộ|san gạt|nạo vét|mương thoát|hố móng|tiếp dầu|diesel|bồn nước|container/i.test(text);
  return hasValidStage && !hasNonAgriKeyword;
}

// Helper tính thứ 2 đầu tuần
export function getMonday(dateInput: Date | string | number): Date {
  const d = new Date(dateInput);
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

// Helper tính số tuần trong năm (ISO-8601)
export function getWeekNumber(dateInput: Date | string): number {
  const target = new Date(new Date(dateInput).valueOf());
  const dayNr = (target.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
  }
  return 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
}

export function toDateKey(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d) : d;
  if (isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatDateStr(d: string | Date): string {
  if (!d) return '—';
  const date = typeof d === 'string' ? new Date(d) : d;
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function formatDateTimeStr(d?: string | Date): string {
  if (!d) return '—';
  const date = typeof d === 'string' ? new Date(d) : d;
  if (isNaN(date.getTime())) return '—';
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

export function getWeekLabel(monday: Date): string {
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const weekNo = getWeekNumber(monday);
  const startStr = monday.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
  const endStr = sunday.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  return `Tuần ${weekNo} (${startStr} - ${endStr})`;
}

export interface WeekOption {
  weekNumber: number;
  year: number;
  monday: Date;
  sunday: Date;
  startDateKey: string;
  endDateKey: string;
  label: string;
}

// Helper sinh danh sách 52 tuần trong năm kèm thời gian thực tế
export function getWeeksOfYear(year: number): WeekOption[] {
  const weeks: WeekOption[] = [];
  const jan4 = new Date(year, 0, 4);
  const startMonday = getMonday(jan4);

  let currMon = new Date(startMonday);
  for (let w = 1; w <= 52; w++) {
    const sun = new Date(currMon);
    sun.setDate(currMon.getDate() + 6);

    const startStr = currMon.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
    const endStr = sun.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
    const isCurrent = getWeekNumber(new Date()) === w && new Date().getFullYear() === year;

    weeks.push({
      weekNumber: w,
      year,
      monday: new Date(currMon),
      sunday: sun,
      startDateKey: toDateKey(currMon),
      endDateKey: toDateKey(sun),
      label: `Tuần ${w} (${startStr} - ${endStr})${isCurrent ? ' • Tuần hiện tại' : ''}`,
    });

    currMon.setDate(currMon.getDate() + 7);
  }
  return weeks;
}

// Helper chuẩn hóa trạng thái: Kế hoạch cũ thuộc tuần quá khứ nếu chưa duyệt (DRAFT) -> tự động chuyển thành OVERDUE (Quá hạn)
export function normalizePlanStatuses(items: WeeklyPlanItem[]): WeeklyPlanItem[] {
  const currentIso = getWeekNumber(new Date());
  const todayStr = toDateKey(new Date());

  return items.map((p) => {
    const isPast = (p.weekNumber && p.weekNumber < currentIso) || (p.endDate && p.endDate < todayStr);
    if (isPast && (p.status === 'DRAFT' || (p.status as string) === 'PENDING_APPROVAL')) {
      return { ...p, status: 'OVERDUE' as const };
    }
    return p;
  });
}

// ============================================
// MAIN COMPONENT: ProductionPlanPage
// ============================================
export const ProductionPlanPage: React.FC = () => {
  const navigate = useNavigate();
  const [view, setView] = useState<'weekly_cards' | 'table'>('weekly_cards');
  const [showSosModal, setShowSosModal] = useState(false);

  // Quản lý danh sách kế hoạch tuần lấy từ Database
  const [plans, setPlans] = useState<WeeklyPlanItem[]>(() => {
    try {
      const saved = localStorage.getItem('thaco_weekly_agri_plans_v7');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const pure = parsed.filter(isPureAgriPlan);
          if (pure.length > 0) return normalizePlanStatuses(pure);
        }
      }
    } catch {}
    return [];
  });

  // Tải danh sách kế hoạch: Ưu tiên nạp từ API nếu có, đồng thời giữ các kế hoạch người dùng vừa tạo
  const loadPlansFromApi = useCallback(async (isRefresh = false) => {
    try {
      const res = await operationsApi.plans({ limit: 100 });
      let apiPlans: WeeklyPlanItem[] = [];
      if (res && Array.isArray(res.items) && res.items.length > 0) {
        apiPlans = res.items
          .map((p: any) => ({
            id: String(p.id),
            code: p.code,
            title: p.title,
            complexCode: p.complexCode || 'KOUN_MOM',
            complexName: p.complexName || (p.complexCode === 'SNOUL' ? 'Khu liên hợp Snoul' : p.complexCode === 'NAM_LAO' ? 'Khu liên hợp Nam Lào' : 'Khu liên hợp Koun Mom'),
            enterpriseCode: p.enterpriseCode || '',
            enterpriseName: p.enterpriseName || '',
            farmCode: p.farmCode || '',
            farmName: p.farmName || '',
            stageCode: p.stage || 'LAM_DAT',
            stageName: STAGES[p.stage]?.label || p.stage,
            weekNumber: p.weekNumber || 40,
            startDate: typeof p.startDate === 'string' ? p.startDate.slice(0, 10) : new Date(p.startDate).toISOString().slice(0, 10),
            endDate: typeof p.endDate === 'string' ? p.endDate.slice(0, 10) : new Date(p.endDate).toISOString().slice(0, 10),
            status: p.status || 'DRAFT',
            notes: p.notes || '',
            createdAt: p.createdAt || new Date().toISOString(),
            tasks: (p.items || []).map((t: any, idx: number) => ({
              id: String(t.id || `TASK-${idx}`),
              jobCode: t.jobCode || `CV-0${idx + 1}`,
              jobName: t.jobName,
              stageCode: t.stage || p.stage || 'LAM_DAT',
              stageName: STAGES[t.stage || p.stage]?.label || t.stage || p.stage,
              lotPlot: t.plotName || 'Lô quy hoạch',
              implementGroup: t.implementGroup || 'Thiết bị cơ giới',
              recommendedVehicle: t.recommendedVehicle || 'Máy kéo 70 - 90HP',
              targetAreaHa: Number(t.targetQuantity || 0),
              assignedVehiclesCount: Number(t.plannedVehicleCount || 1),
              scheduledDays: t.scheduledDays || 'Thứ 2 - Thứ 6',
              notes: t.notes || '',
              status: (t.taskStatus as any) || 'PENDING',
            })),
          }))
          .filter(isPureAgriPlan);
      }

      // Đọc các kế hoạch do người dùng vừa tạo (nếu có)
      let localPlans: WeeklyPlanItem[] = [];
      try {
        const saved = localStorage.getItem('thaco_weekly_agri_plans_v7');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) localPlans = parsed.filter(isPureAgriPlan);
        }
      } catch {}

      const planMap = new Map<string, WeeklyPlanItem>();
      apiPlans.forEach((p) => planMap.set(p.code, p));
      localPlans.forEach((p) => planMap.set(p.code, p));

      const combined = normalizePlanStatuses(Array.from(planMap.values()));
      setPlans(combined);
      localStorage.setItem('thaco_weekly_agri_plans_v7', JSON.stringify(combined));

      if (isRefresh && combined.length > 0) {
        useAppStore.getState().setHeaderAlert({
          type: 'success',
          message: `Đã làm mới: ${combined.length} kế hoạch sản xuất.`,
        });
      }
      return;
    } catch (err) {
      console.warn('Backend API /production-plans offline or error:', err);
    }
  }, []);

  // Tự động tải từ Database khi vào trang
  useEffect(() => {
    loadPlansFromApi();
  }, [loadPlansFromApi]);

  useEffect(() => {
    localStorage.setItem('thaco_weekly_agri_plans_v7', JSON.stringify(plans));
  }, [plans]);

  // Lắng nghe sự kiện làm mới từ nút trên Header
  useEffect(() => {
    const handlePageRefresh = () => {
      loadPlansFromApi(true);
    };
    window.addEventListener('thaco_refresh_current_page', handlePageRefresh);
    return () => window.removeEventListener('thaco_refresh_current_page', handlePageRefresh);
  }, [loadPlansFromApi]);

  // Bộ lọc đồng bộ trực tiếp từ Header
  const selectedKLH = useAppStore((state) => state.selectedKLH);
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedStage, setSelectedStage] = useState<string>('ALL');
  const currentIsoWeek = useMemo(() => getWeekNumber(new Date()), []);
  const [selectedYear, setSelectedYear] = useState<number>(() => new Date().getFullYear() || 2026);
  const [fromWeekVal, setFromWeekVal] = useState<string>('ALL');
  const [toWeekVal, setToWeekVal] = useState<string>('ALL');
  const [weekFilterMode, setWeekFilterMode] = useState<'ALL' | 'PREV_5' | 'CURRENT' | 'NEXT_5' | 'RANGE'>('ALL');

  // Lùi / Tiến tuần
  const handleStepWeek = (step: number) => {
    const baseWeek =
      fromWeekVal !== 'ALL'
        ? Number(fromWeekVal)
        : toWeekVal !== 'ALL'
        ? Number(toWeekVal)
        : currentIsoWeek;
    const targetWeek = Math.max(1, Math.min(52, baseWeek + step));
    setFromWeekVal(String(targetWeek));
    setToWeekVal(String(targetWeek));
    setWeekFilterMode('RANGE');
  };

  // Danh sách 52 tuần của năm đang chọn trong bộ lọc (sắp xếp giảm dần theo tuần)
  const weeksOfYear = useMemo(() => {
    return [...getWeeksOfYear(selectedYear)].sort((a, b) => b.weekNumber - a.weekNumber);
  }, [selectedYear]);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<WeeklyPlanItem | null>(null);
  const [selectedPlanDetail, setSelectedPlanDetail] = useState<WeeklyPlanItem | null>(null);
  const [addingTaskToPlan, setAddingTaskToPlan] = useState<WeeklyPlanItem | null>(null);

  // Form State cho việc tạo / sửa kế hoạch tuần (Chọn Năm + Chọn Tuần + Phân cấp đơn vị)
  const [formYear, setFormYear] = useState<number>(2026);
  const [formWeekNo, setFormWeekNo] = useState<number>(36);
  const formWeeks = useMemo(() => getWeeksOfYear(formYear), [formYear]);

  const [planForm, setPlanForm] = useState({
    code: '',
    complexCode: 'KOUN_MOM',
    enterpriseCode: 'XN_KM_CH1',
    farmCode: 'NT_KM_01',
    plotPlot: 'Lô A01 - A04',
    weekMondayDate: toDateKey(getMonday(new Date())),
    notes: '',
  });

  // Helper phân cấp cho modal: Khu liên hợp -> Xí nghiệp -> Nông trường -> Lô/Thửa
  const currentKlhObj = useMemo(() => {
    return HIERARCHY_DATA.find((k) => k.code === planForm.complexCode) || HIERARCHY_DATA[0];
  }, [planForm.complexCode]);

  const currentEnterprises = useMemo(() => {
    return currentKlhObj?.enterprises || [];
  }, [currentKlhObj]);

  const currentEnterpriseObj = useMemo(() => {
    return currentEnterprises.find((e) => e.code === planForm.enterpriseCode) || currentEnterprises[0];
  }, [currentEnterprises, planForm.enterpriseCode]);

  const currentFarms = useMemo(() => {
    return currentEnterpriseObj?.farms || [];
  }, [currentEnterpriseObj]);

  const currentFarmObj = useMemo(() => {
    return currentFarms.find((f) => f.code === planForm.farmCode) || currentFarms[0];
  }, [currentFarms, planForm.farmCode]);

  const currentPlots = useMemo(() => {
    return currentFarmObj?.plots || [];
  }, [currentFarmObj]);

  // Danh sách công việc đang soạn trong Modal (Nhiều công việc trong 1 tuần)
  const [formTasks, setFormTasks] = useState<
    Array<{
      id: string;
      jobCode: string;
      jobName: string;
      stageCode: string;
      stageName: string;
      lotPlot: string;
      implementGroup: string;
      recommendedVehicle: string;
      targetAreaHa: number;
      assignedVehiclesCount: number;
      scheduledDays: string;
      notes: string;
    }>
  >([]);

  // Đổi tuần khi chọn ngày thứ 2
  const selectedMonday = useMemo(() => {
    return getMonday(new Date(planForm.weekMondayDate || new Date()));
  }, [planForm.weekMondayDate]);

  const selectedSunday = useMemo(() => {
    const sun = new Date(selectedMonday);
    sun.setDate(selectedMonday.getDate() + 6);
    return sun;
  }, [selectedMonday]);

  const currentWeekNumber = useMemo(() => {
    return getWeekNumber(selectedMonday);
  }, [selectedMonday]);

  // Khởi tạo Modal thêm mới
  const handleOpenCreateModal = () => {
    setEditingPlan(null);
    const mon = getMonday(new Date());
    const monStr = toDateKey(mon);
    const wNum = getWeekNumber(mon);
    const yNum = mon.getFullYear();
    const defaultKlh = selectedKLH !== 'ALL' ? selectedKLH : 'KOUN_MOM';
    const klhObj = HIERARCHY_DATA.find((k) => k.code === defaultKlh) || HIERARCHY_DATA[0];
    const defaultEnt = klhObj.enterprises[0];
    const defaultFarm = defaultEnt?.farms[0];
    const defaultPlot = defaultFarm?.plots[0] || 'Lô A01 - A04';

    setFormYear(yNum);
    setFormWeekNo(wNum);

    setPlanForm({
      code: `KH-${yNum}-W${wNum}-${Date.now().toString().slice(-4)}`,
      complexCode: defaultKlh,
      enterpriseCode: defaultEnt?.code || '',
      farmCode: defaultFarm?.code || '',
      plotPlot: defaultPlot,
      weekMondayDate: monStr,
      notes: '',
    });

    // Mặc định tạo sẵn 2 dòng công việc mẫu để người dùng điền ngay
    const firstJob = STANDARD_JOBS[0];
    const secondJob = STANDARD_JOBS[1];
    setFormTasks([
      {
        id: `TASK-NEW-1`,
        jobCode: firstJob.code,
        jobName: firstJob.name,
        stageCode: firstJob.stageCode,
        stageName: firstJob.stageName,
        lotPlot: defaultPlot,
        implementGroup: firstJob.implementGroup,
        recommendedVehicle: firstJob.recommendedVehicle,
        targetAreaHa: firstJob.defaultQuota,
        assignedVehiclesCount: firstJob.defaultVehicles,
        scheduledDays: 'Thứ 2 - Thứ 4',
        notes: '',
      },
      {
        id: `TASK-NEW-2`,
        jobCode: secondJob.code,
        jobName: secondJob.name,
        stageCode: secondJob.stageCode,
        stageName: secondJob.stageName,
        lotPlot: defaultFarm?.plots[1] || 'Lô B01 - B04',
        implementGroup: secondJob.implementGroup,
        recommendedVehicle: secondJob.recommendedVehicle,
        targetAreaHa: secondJob.defaultQuota,
        assignedVehiclesCount: secondJob.defaultVehicles,
        scheduledDays: 'Thứ 4 - Thứ 6',
        notes: '',
      },
    ]);

    setShowCreateModal(true);
  };

  // Mở modal sửa kế hoạch
  const handleOpenEditModal = (plan: WeeklyPlanItem) => {
    setEditingPlan(plan);
    const planMon = getMonday(new Date(plan.startDate));
    setFormYear(planMon.getFullYear());
    setFormWeekNo(plan.weekNumber);

    const klhObj = HIERARCHY_DATA.find((k) => k.code === plan.complexCode) || HIERARCHY_DATA[0];
    const defaultEnt = klhObj.enterprises.find((e) => e.code === plan.enterpriseCode) || klhObj.enterprises[0];
    const defaultFarm = defaultEnt?.farms.find((f) => f.code === plan.farmCode) || defaultEnt?.farms[0];

    setPlanForm({
      code: plan.code,
      complexCode: plan.complexCode,
      enterpriseCode: plan.enterpriseCode || defaultEnt?.code || '',
      farmCode: plan.farmCode || defaultFarm?.code || '',
      plotPlot: plan.defaultPlot || defaultFarm?.plots[0] || 'Lô A01 - A04',
      weekMondayDate: plan.startDate,
      notes: plan.notes || '',
    });
    setFormTasks(
      plan.tasks.map((t) => ({
        id: t.id,
        jobCode: t.jobCode,
        jobName: t.jobName,
        stageCode: t.stageCode,
        stageName: t.stageName,
        lotPlot: t.lotPlot,
        implementGroup: t.implementGroup,
        recommendedVehicle: t.recommendedVehicle,
        targetAreaHa: t.targetAreaHa,
        assignedVehiclesCount: t.assignedVehiclesCount,
        scheduledDays: t.scheduledDays || 'Thứ 2 - Thứ 6',
        notes: t.notes || '',
      }))
    );
    setShowCreateModal(true);
  };

  // Thêm 1 dòng công việc mới vào bảng công việc của tuần
  const handleAddFormTask = () => {
    const job = STANDARD_JOBS[formTasks.length % STANDARD_JOBS.length];
    setFormTasks((prev) => [
      ...prev,
      {
        id: `TASK-NEW-${Date.now().toString().slice(-4)}`,
        jobCode: job.code,
        jobName: job.name,
        stageCode: job.stageCode,
        stageName: job.stageName,
        lotPlot: planForm.plotPlot || 'Lô mới quy hoạch',
        implementGroup: job.implementGroup,
        recommendedVehicle: job.recommendedVehicle,
        targetAreaHa: job.defaultQuota,
        assignedVehiclesCount: job.defaultVehicles,
        scheduledDays: 'Thứ 2 - Thứ 6',
        notes: '',
      },
    ]);
  };

  // Đổi công việc trên dòng: tự động điền nông cụ & đầu máy
  const handleChangeTaskJob = (index: number, jobCode: string) => {
    const selectedJob = STANDARD_JOBS.find((j) => j.code === jobCode);
    if (!selectedJob) return;

    setFormTasks((prev) => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        jobCode: selectedJob.code,
        jobName: selectedJob.name,
        stageCode: selectedJob.stageCode,
        stageName: selectedJob.stageName,
        implementGroup: selectedJob.implementGroup,
        recommendedVehicle: selectedJob.recommendedVehicle,
        targetAreaHa: selectedJob.defaultQuota,
        assignedVehiclesCount: selectedJob.defaultVehicles,
      };
      return copy;
    });
  };

  // Cập nhật trường bất kỳ trong dòng công việc
  const handleUpdateTaskField = (index: number, field: string, value: any) => {
    setFormTasks((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  // Xóa 1 dòng công việc khỏi modal
  const handleRemoveFormTask = (index: number) => {
    if (formTasks.length <= 1) {
      alert('Kế hoạch tuần phải có ít nhất 1 công việc.');
      return;
    }
    setFormTasks((prev) => prev.filter((_, i) => i !== index));
  };

  // Lưu Kế hoạch tuần (chứa nhiều công việc)
  const handleSavePlan = (e: React.FormEvent) => {
    e.preventDefault();
    if (formTasks.length === 0) {
      alert('Vui lòng thêm ít nhất 1 công việc vào kế hoạch tuần.');
      return;
    }

    const startDateStr = toDateKey(selectedMonday);
    const endDateStr = toDateKey(selectedSunday);
    const klhObj = HIERARCHY_DATA.find((k) => k.code === planForm.complexCode) || HIERARCHY_DATA[0];
    const complexName = klhObj.name;
    const entObj = klhObj.enterprises.find((e) => e.code === planForm.enterpriseCode) || klhObj.enterprises[0];
    const farmObj = entObj?.farms.find((f) => f.code === planForm.farmCode) || entObj?.farms[0];
    const autoTitle = `Kế hoạch cơ giới sản xuất Tuần ${currentWeekNumber} - ${entObj?.name || complexName}`;

    const tasksToSave: WeeklyTaskItem[] = formTasks.map((t, idx) => ({
      id: t.id || `TASK-${Date.now()}-${idx}`,
      jobCode: t.jobCode,
      jobName: t.jobName,
      stageCode: t.stageCode,
      stageName: t.stageName,
      lotPlot: t.lotPlot || planForm.plotPlot || 'Lô quy hoạch',
      implementGroup: t.implementGroup,
      recommendedVehicle: t.recommendedVehicle,
      targetAreaHa: Number(t.targetAreaHa) || 0,
      assignedVehiclesCount: Number(t.assignedVehiclesCount) || 1,
      scheduledDays: t.scheduledDays || 'Thứ 2 - Thứ 6',
      notes: t.notes || '',
      status: 'PENDING',
    }));

    if (editingPlan) {
      setPlans((prev) =>
        prev.map((p) =>
          p.id === editingPlan.id
            ? {
                ...p,
                code: planForm.code,
                title: autoTitle,
                complexCode: planForm.complexCode,
                complexName,
                enterpriseCode: planForm.enterpriseCode,
                enterpriseName: entObj?.name,
                farmCode: planForm.farmCode,
                farmName: farmObj?.name,
                defaultPlot: planForm.plotPlot,
                weekNumber: currentWeekNumber,
                startDate: startDateStr,
                endDate: endDateStr,
                notes: planForm.notes,
                tasks: tasksToSave,
              }
            : p
        )
      );
    } else {
      const newPlan: WeeklyPlanItem = {
        id: `PLAN-W${currentWeekNumber}-${Date.now().toString().slice(-4)}`,
        code: planForm.code,
        title: autoTitle,
        complexCode: planForm.complexCode,
        complexName,
        enterpriseCode: planForm.enterpriseCode,
        enterpriseName: entObj?.name,
        farmCode: planForm.farmCode,
        farmName: farmObj?.name,
        defaultPlot: planForm.plotPlot,
        weekNumber: currentWeekNumber,
        startDate: startDateStr,
        endDate: endDateStr,
        status: 'APPROVED',
        notes: planForm.notes,
        createdAt: new Date().toISOString(),
        tasks: tasksToSave,
      };
      setPlans((prev) => [newPlan, ...prev]);
    }

    setShowCreateModal(false);
    setEditingPlan(null);
  };

  // Xóa cả kế hoạch tuần
  const handleDeletePlan = async (id: string, title: string) => {
    if (window.confirm(`Xác nhận xóa toàn bộ kế hoạch tuần: "${title}"?`)) {
      try {
        const numId = Number(id);
        if (!isNaN(numId) && numId > 0) {
          await operationsApi.deletePlan(numId);
        }
      } catch (err) {
        console.warn('Could not delete plan from backend:', err);
      }
      setPlans((prev) => prev.filter((p) => p.id !== id));
      if (selectedPlanDetail?.id === id) setSelectedPlanDetail(null);
    }
  };

  const issueAgricultureOrders = (plan: WeeklyPlanItem, requestedTasks: WeeklyTaskItem[]) => {
    const storageKey = 'thaco_agriculture_dispatch_orders_v1';
    const existing = JSON.parse(localStorage.getItem(storageKey) || '[]') as DispatchOrderRecord[];
    const created: DispatchOrderRecord[] = [];
    requestedTasks.filter((task) => task.status !== 'DISPATCHED').forEach((task, tIdx) => {
      const count = Math.max(1, task.assignedVehiclesCount || 1);
      const { fromDay, toDay } = parseScheduledDays(task.scheduledDays);
      const days = getDaysInRange(fromDay, toDay);
      const totalDays = days.length;

      days.forEach((dayName, dayIdx) => {
        const dayDate = getDayActualDate(dayName, plan.startDate);
        const dayDateStr = dayDate.toISOString().slice(0, 10);
        const dayDateDisplay = `${String(dayDate.getDate()).padStart(2, '0')}/${String(dayDate.getMonth() + 1).padStart(2, '0')}`;
        const noteParts: string[] = [];
        if (plan.notes) noteParts.push(`[Ghi chú kế hoạch]: ${plan.notes}`);
        if (task.notes) noteParts.push(`[Ghi chú công việc]: ${task.notes}`);

        const planYear = plan.startDate ? new Date(plan.startDate).getFullYear() : new Date().getFullYear();
        const planWeek = plan.weekNumber || getWeekNumber(plan.startDate || new Date());
        const planMatch = (plan.code || '').match(/([A-Za-z0-9]+)$/);
        const planIdPart = planMatch ? planMatch[1] : (plan.id ? String(plan.id).slice(-4) : '0001');

        for (let index = 1; index <= count; index += 1) {
          const code = `LDX-NN-${planYear}-W${planWeek}-${planIdPart}-D${dayIdx + 1}-${index}`;
          if (existing.some((order) => order.code === code) || created.some((order) => order.code === code)) continue;
          created.push({
            id: Date.now() + created.length + tIdx * 100 + dayIdx * 10 + index,
            code,
            sourceType: 'PRODUCTION_ORDER',
            unit: plan.farmCode?.endsWith('02') ? 'NT2' : 'NT1',
            purpose: totalDays > 1
              ? `${task.jobName} (Xe ${index}/${count}) - ${dayName} (${dayDateDisplay} • Ngày ${dayIdx + 1}/${totalDays})`
              : `${task.jobName} (Xe ${index}/${count}) - ${dayName} (${dayDateDisplay})`,
            origin: `Bãi máy ${plan.farmName || plan.enterpriseName || plan.complexName}`,
            destination: task.lotPlot,
            departureTime: new Date(`${dayDateStr}T07:00:00.000Z`).toISOString(),
            plannedEndTime: new Date(`${dayDateStr}T17:00:00.000Z`).toISOString(),
            status: 'PENDING_APPROVAL',
            isDelayed: false,
            notes: noteParts.length > 0 ? noteParts.join('\n') : undefined,
            planNotes: plan.notes || '',
            taskNotes: task.notes || '',
          });
        }
      });
    });
    localStorage.setItem(storageKey, JSON.stringify([...created, ...existing]));

    // Đồng bộ vào Master Dispatch Orders Storage
    try {
      const masterKey = 'thaco_all_dispatch_orders_master_v4';
      const masterExisting = JSON.parse(localStorage.getItem(masterKey) || '[]') as any[];
      const masterCreated: any[] = [];
      requestedTasks.forEach((task, tIdx) => {
        const count = Math.max(1, task.assignedVehiclesCount || 1);
        const { fromDay, toDay } = parseScheduledDays(task.scheduledDays);
        const days = getDaysInRange(fromDay, toDay);
        const totalDays = days.length;

        days.forEach((dayName, dayIdx) => {
          const dayDate = getDayActualDate(dayName, plan.startDate);
          const dayDateStr = dayDate.toISOString().slice(0, 10);
          const dayDateDisplay = `${String(dayDate.getDate()).padStart(2, '0')}/${String(dayDate.getMonth() + 1).padStart(2, '0')}`;
          const noteParts: string[] = [];
          if (plan.notes) noteParts.push(`[Ghi chú kế hoạch]: ${plan.notes}`);
          if (task.notes) noteParts.push(`[Ghi chú công việc]: ${task.notes}`);

          const planYear = plan.startDate ? new Date(plan.startDate).getFullYear() : new Date().getFullYear();
          const planWeek = plan.weekNumber || getWeekNumber(plan.startDate || new Date());
          const planMatch = (plan.code || '').match(/([A-Za-z0-9]+)$/);
          const planIdPart = planMatch ? planMatch[1] : (plan.id ? String(plan.id).slice(-4) : '0001');

          for (let index = 1; index <= count; index += 1) {
            const code = `LDX-NN-${planYear}-W${planWeek}-${planIdPart}-D${dayIdx + 1}-${index}`;
            if (masterExisting.some((order) => order.code === code) || masterCreated.some((order) => order.code === code)) continue;
            masterCreated.push({
              id: Date.now() + masterCreated.length + tIdx * 100 + dayIdx * 10 + index,
              code,
              orderCategory: 'NONG_NGHIEP',
              categoryLabel: 'Nông nghiệp',
              sourceType: 'PRODUCTION_ORDER',
              unit: plan.farmName || plan.enterpriseName || 'Nông trường 1',
              purpose: totalDays > 1
                ? `${task.jobName} (Xe ${index}/${count}) - ${dayName} (${dayDateDisplay} • Ngày ${dayIdx + 1}/${totalDays})`
                : `${task.jobName} (Xe ${index}/${count}) - ${dayName} (${dayDateDisplay})`,
              origin: `Bãi máy ${plan.farmName || plan.enterpriseName || plan.complexName || 'Trung tâm'}`,
              destination: task.lotPlot || 'Lô quy hoạch',
              departureTime: new Date(`${dayDateStr}T06:30:00.000Z`).toISOString(),
              plannedEndTime: new Date(`${dayDateStr}T17:30:00.000Z`).toISOString(),
              status: 'CHO_PHAN_CONG',
              isDelayed: false,
              workVolumeTarget: totalDays > 1 ? Math.round((Number(task.targetAreaHa) / totalDays) * 10) / 10 : Number(task.targetAreaHa) || 0,
              workVolumeUnit: 'Ha',
              notes: noteParts.length > 0 ? noteParts.join('\n') : (task.notes || 'Nạp tự động từ Kế hoạch cơ giới sản xuất tuần'),
              planNotes: plan.notes || '',
              taskNotes: task.notes || '',
            });
          }
        });
      });
      if (masterCreated.length > 0) {
        localStorage.setItem(masterKey, JSON.stringify([...masterCreated, ...masterExisting]));
      }
    } catch (mErr) {
      console.warn('Sync master dispatch failed:', mErr);
    }

    setPlans((current) => current.map((item) => item.id === plan.id ? {
      ...item,
      status: item.status === 'APPROVED' ? 'IN_PROGRESS' : item.status,
      tasks: item.tasks.map((task) => requestedTasks.some((requested) => requested.id === task.id) ? { ...task, status: 'DISPATCHED' } : task),
    } : item));
    useAppStore.getState().setHeaderAlert({ type: 'success', message: `Đã nạp ${created.length} lệnh nông nghiệp sang hàng chờ phân công.` });
    setSelectedPlanDetail(null);
    navigate(`/lenh-dieu-xe/danh-sach?week=${plan.weekNumber}&planCode=${encodeURIComponent(plan.code)}`);
  };

  // Lọc kế hoạch theo Tìm kiếm, KLH, Trạng thái, Giai đoạn và Tuần
  const filteredPlans = useMemo(() => {
    const q = search.trim().toLowerCase();
    return plans.filter((p) => {
      // Lọc Khu liên hợp đồng bộ từ Header
      if (selectedKLH !== 'ALL' && !matchesKLH(p, selectedKLH)) return false;

      // Lọc trạng thái
      if (selectedStatus !== 'ALL' && p.status !== selectedStatus) return false;

      // Lọc giai đoạn: nếu chọn giai đoạn, ít nhất 1 công việc trong kế hoạch phải thuộc giai đoạn đó
      if (selectedStage !== 'ALL') {
        const hasStage = p.tasks.some((t) => t.stageCode === selectedStage);
        if (!hasStage) return false;
      }

      // Lọc theo Năm
      if (p.startDate) {
        const pYear = new Date(p.startDate).getFullYear();
        if (pYear !== selectedYear) return false;
      }

      // Lọc theo Tuần (Chế độ chọn tuần)
      if (weekFilterMode === 'PREV_5') {
        // 5 tuần trước bao gồm tuần hiện tại (VD: Tuần 32 -> Tuần 36)
        const minW = Math.max(1, currentIsoWeek - 4);
        const maxW = currentIsoWeek;
        if (p.weekNumber < minW || p.weekNumber > maxW) return false;
      } else if (weekFilterMode === 'NEXT_5') {
        // 5 tuần tới bao gồm tuần hiện tại (VD: Tuần 36 -> Tuần 40)
        const minW = currentIsoWeek;
        const maxW = Math.min(52, currentIsoWeek + 4);
        if (p.weekNumber < minW || p.weekNumber > maxW) return false;
      } else if (weekFilterMode === 'CURRENT') {
        // Chỉ tuần hiện tại (VD: Tuần 36)
        if (p.weekNumber !== currentIsoWeek) return false;
      } else if (weekFilterMode === 'RANGE') {
        // Lọc theo khoảng từ tuần ... đến tuần ...
        const fromW = fromWeekVal !== 'ALL' ? Number(fromWeekVal) : 1;
        const toW = toWeekVal !== 'ALL' ? Number(toWeekVal) : 52;
        const minW = Math.min(fromW, toW);
        const maxW = Math.max(fromW, toW);
        if (p.weekNumber < minW || p.weekNumber > maxW) return false;
      }

      // Lọc theo từ khóa tìm kiếm (mã KH, tên KH, hoặc tên công việc / lô thửa trong tasks)
      if (q) {
        const matchHeader = p.code.toLowerCase().includes(q) || p.title.toLowerCase().includes(q);
        const matchTasks = p.tasks.some(
          (t) =>
            t.jobName.toLowerCase().includes(q) ||
            t.lotPlot.toLowerCase().includes(q) ||
        t.implementGroup.toLowerCase().includes(q)
        );
        if (!matchHeader && !matchTasks) return false;
      }

      return true;
    }).sort((a, b) => {
        // Sắp xếp thời gian đúng thứ tự: GIẢM DẦN THEO TUẦN (Tuần mới nhất lên trước)
        const timeA = new Date(a.startDate).getTime();
        const timeB = new Date(b.startDate).getTime();
        if (timeB !== timeA) return timeB - timeA;
        if (b.weekNumber !== a.weekNumber) return b.weekNumber - a.weekNumber;
        return a.code.localeCompare(b.code);
      });
  }, [plans, selectedKLH, selectedStatus, selectedStage, selectedYear, weekFilterMode, fromWeekVal, toWeekVal, currentIsoWeek, search]);

  // Thống kê tổng quan
  const totalStats = useMemo(() => {
    let totalArea = 0;
    let totalVehicles = 0;
    let totalTasksCount = 0;

    for (const p of filteredPlans) {
      totalTasksCount += p.tasks.length;
      for (const t of p.tasks) {
        totalArea += t.targetAreaHa || 0;
        totalVehicles += t.assignedVehiclesCount || 0;
      }
    }

    return {
      plansCount: filteredPlans.length,
      tasksCount: totalTasksCount,
      targetArea: Math.round(totalArea * 10) / 10,
      estimatedVehicles: totalVehicles,
    };
  }, [filteredPlans]);

  // Xuất file CSV toàn bộ kế hoạch tuần và chi tiết công việc
  const handleExportCSV = () => {
    if (filteredPlans.length === 0) return;

    const headers = [
      'STT',
      'Mã kế hoạch tuần',
      'Tên kế hoạch tuần',
      'Khu liên hợp',
      'Tuần số',
      'Thời gian thực hiện',
      'Trạng thái kế hoạch',
      'Mã công việc',
      'Tên công việc cơ giới',
      'Giai đoạn mùa vụ',
      'Vị trí Lô / Thửa',
      'Nông cụ kèm theo',
      'Đầu máy khuyến nghị',
      'Diện tích (ha)',
      'Nhu cầu đầu máy (xe)',
      'Lịch thực hiện',
      'Ghi chú',
    ];

    const rows: (string | number)[][] = [];
    let counter = 1;

    for (const plan of filteredPlans) {
      for (const task of plan.tasks) {
        rows.push([
          counter++,
          plan.code,
          plan.title,
          plan.complexName,
          `Tuần ${plan.weekNumber}`,
          `${formatDateStr(plan.startDate)} ➔ ${formatDateStr(plan.endDate)}`,
          plan.status,
          task.jobCode,
          task.jobName,
          task.stageName,
          task.lotPlot,
          task.implementGroup,
          task.recommendedVehicle,
          task.targetAreaHa,
          task.assignedVehiclesCount,
          task.scheduledDays,
          task.notes || plan.notes || '',
        ]);
      }
    }

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [
        headers.map((h) => `"${h.replace(/"/g, '""')}"`).join(','),
        ...rows.map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')),
      ].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `ke-hoach-san-xuat-tuan-${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Chuyển đổi danh sách Kế hoạch thành danh sách từng Hạng mục công việc chi tiết
  const flattenedTaskRows = useMemo(() => {
    const rows: FlattenedTaskRow[] = [];
    filteredPlans.forEach((plan) => {
      plan.tasks.forEach((task) => {
        rows.push({
          id: `${plan.id}-${task.id}`,
          planId: plan.id,
          planCode: plan.code,
          planTitle: plan.title,
          complexName: plan.complexName,
          weekNumber: plan.weekNumber,
          startDate: plan.startDate,
          endDate: plan.endDate,
          planStatus: plan.status,
          planNotes: plan.notes,

          taskId: task.id,
          jobCode: task.jobCode,
          jobName: task.jobName,
          stageCode: task.stageCode,
          stageName: task.stageName,
          lotPlot: task.lotPlot,
          implementGroup: task.implementGroup,
          recommendedVehicle: task.recommendedVehicle,
          targetAreaHa: task.targetAreaHa,
          assignedVehiclesCount: task.assignedVehiclesCount,
          scheduledDays: task.scheduledDays,
          taskNotes: task.notes,

          rawPlan: plan,
          rawTask: task,
        });
      });
    });
    return rows;
  }, [filteredPlans]);

  // Cấu hình bảng chi tiết cho từng Hạng mục công việc cơ giới (Thiết kế thẩm mỹ cao cấp, trực quan & cân đối)
  const taskTableColumns: Column<FlattenedTaskRow>[] = [
    {
      key: 'weekAndPlan',
      title: <span className="whitespace-nowrap font-bold text-slate-700">Tuần & Mã KH</span>,
      sortable: true,
      width: '115px',
      render: (row) => (
        <div className="whitespace-nowrap py-1">
          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 border border-emerald-200/90 text-emerald-800 px-2 py-0.5 text-[11px] font-extrabold shadow-2xs">
            <Calendar className="h-3 w-3 text-emerald-600 shrink-0" />
            Tuần {row.weekNumber}
          </span>
          <div className="font-mono font-bold text-slate-900 text-xs mt-1 tracking-tight">
            {row.planCode}
          </div>
          <span className="text-[10px] text-slate-400 block font-medium">
            {formatDateStr(row.startDate)} – {formatDateStr(row.endDate)}
          </span>
        </div>
      ),
    },
    {
      key: 'jobName',
      title: <span className="whitespace-nowrap font-bold text-slate-700">Hạng mục công việc cơ giới</span>,
      render: (row) => {
        const stageInfo = STAGES[row.stageCode] || {
          label: row.stageName || row.stageCode,
          bg: 'bg-slate-50',
          text: 'text-slate-700',
          border: 'border-slate-200',
        };
        return (
          <div className="py-1 pr-3 space-y-1 min-w-[240px]">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-[11px] font-black text-emerald-800 bg-emerald-100/90 px-1.5 py-0.5 rounded-md border border-emerald-300 shrink-0">
                {row.jobCode}
              </span>
              <span className="text-slate-900 text-xs sm:text-[13px] font-extrabold leading-snug">
                {row.jobName}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs flex-wrap">
              <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold border ${stageInfo.bg} ${stageInfo.text} ${stageInfo.border}`}>
                {stageInfo.label}
              </span>
              <span className="text-slate-300">•</span>
              <span className="inline-flex items-center gap-1 text-slate-600 text-[11px] font-semibold">
                <Building2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                {row.complexName}
              </span>
              {row.taskNotes && (
                <>
                  <span className="text-slate-300">•</span>
                  <span
                    className="inline-flex items-center gap-1 text-[10.5px] text-amber-800 bg-amber-50/90 border border-amber-200/90 rounded-md px-1.5 py-0.5 font-medium max-w-[240px] truncate"
                    title={row.taskNotes}
                  >
                    <span className="font-bold text-amber-900">Lưu ý:</span> {row.taskNotes}
                  </span>
                </>
              )}
            </div>
          </div>
        );
      },
    },
    {
      key: 'lotPlot',
      title: <span className="whitespace-nowrap font-bold text-slate-700">Vị trí Lô / Thửa</span>,
      width: '130px',
      render: (row) => (
        <div className="py-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200/90 text-xs font-bold text-slate-800 whitespace-nowrap shadow-2xs">
            <MapPin className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
            <span>{row.lotPlot}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'equipment',
      title: <span className="whitespace-nowrap font-bold text-slate-700">Nông cụ & Đầu máy</span>,
      width: '170px',
      render: (row) => (
        <div className="text-xs whitespace-nowrap space-y-1 py-1">
          <div className="font-bold text-amber-900 flex items-center gap-1.5 bg-amber-50/80 px-2 py-0.5 rounded-md border border-amber-200/80">
            <Wrench className="h-3.5 w-3.5 text-amber-600 shrink-0" />
            <span className="truncate max-w-[145px]" title={row.implementGroup}>
              {row.implementGroup}
            </span>
          </div>
          <div className="text-slate-700 flex items-center gap-1.5 px-2 py-0.5 font-semibold text-[11px]">
            <Tractor className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <span className="truncate max-w-[145px]" title={row.recommendedVehicle}>
              {row.recommendedVehicle}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: 'targetAreaHa',
      title: <span className="whitespace-nowrap font-bold text-slate-700">Khối lượng</span>,
      align: 'center',
      width: '90px',
      sortable: true,
      render: (row) => (
        <div className="text-center whitespace-nowrap bg-slate-50/90 rounded-xl py-1 px-2 border border-slate-200/80 shadow-2xs">
          <div className="text-slate-900 text-xs font-black">
            {row.targetAreaHa} <span className="text-[10px] font-normal text-slate-500">ha</span>
          </div>
          <span className="inline-block rounded-md bg-amber-100 text-amber-900 text-[10px] font-bold px-2 py-0.5 border border-amber-200 mt-0.5 shadow-2xs">
            {row.assignedVehiclesCount} xe
          </span>
        </div>
      ),
    },
    {
      key: 'scheduledDays',
      title: <span className="whitespace-nowrap font-bold text-slate-700">Lịch thực hiện</span>,
      width: '110px',
      render: (row) => (
        <div className="py-1">
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100/90 border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700 whitespace-nowrap shadow-2xs">
            <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            {row.scheduledDays}
          </span>
        </div>
      ),
    },
    {
      key: 'status',
      title: <span className="whitespace-nowrap font-bold text-slate-700">Trạng thái</span>,
      align: 'center',
      width: '110px',
      render: (row) => (
        <div className="whitespace-nowrap flex justify-center py-1">
          <StatusBadge status={row.planStatus} />
        </div>
      ),
    },
    {
      key: 'actions',
      title: <span className="whitespace-nowrap font-bold text-slate-700">Thao tác</span>,
      align: 'center',
      width: '115px',
      render: (row) => (
        <div className="flex flex-col items-center justify-center gap-1.5 whitespace-nowrap py-1">
          {/* Hàng trên: Các nút icon Xem chi tiết, Chỉnh sửa, Xóa */}
          <div className="flex items-center justify-center gap-1.5">
            <button
              type="button"
              className="inline-flex items-center justify-center h-6.5 w-6.5 text-[11px] font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
              title="Xem chi tiết kế hoạch"
              onClick={() => navigate(`/lenh-dieu-xe/ke-hoach/tao-moi?editPlanId=${row.planId}&mode=view`)}
            >
              <Eye className="h-3.5 w-3.5 text-slate-500" />
            </button>
            <button
              type="button"
              className="inline-flex items-center justify-center h-6.5 w-6.5 text-[11px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors cursor-pointer"
              title="Chỉnh sửa kế hoạch"
              onClick={() => navigate(`/lenh-dieu-xe/ke-hoach/tao-moi?editPlanId=${row.planId}`)}
            >
              <Edit2 className="h-3.5 w-3.5 text-blue-600" />
            </button>
            <button
              type="button"
              className="inline-flex items-center justify-center h-6.5 w-6.5 text-[11px] font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg border border-rose-200 transition-colors cursor-pointer"
              title="Xóa kế hoạch"
              onClick={() => handleDeletePlan(row.planId, row.planTitle)}
            >
              <Trash2 className="h-3.5 w-3.5 text-rose-600" />
            </button>
          </div>

          {/* Hàng dưới: Trạng thái nạp điều xe */}
          <button
            type="button"
            onClick={() => issueAgricultureOrders(row.rawPlan, [row.rawTask])}
            className="h-6 text-[10.5px] font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-md border border-emerald-200 cursor-pointer px-2 shrink-0 flex items-center gap-1 shadow-2xs transition-colors"
            title="Nạp công việc này sang danh sách điều xe"
          >
            <CheckCircle2 className="h-2.5 w-2.5 text-emerald-600" />
            <span>Tự động nạp</span>
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* BỘ CHUYỂN ĐỔI 3 LOẠI KẾ HOẠCH */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white p-3 rounded-2xl shadow-xs">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate('/lenh-dieu-xe/ke-hoach/nong-nghiep')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold bg-slate-900 text-white shadow-xs transition-all cursor-pointer"
          >
            <Tractor className="h-4 w-4 text-emerald-400" />
            <span>Nông nghiệp</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/lenh-dieu-xe/ke-hoach/cong-trinh')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all cursor-pointer"
          >
            <HardHat className="h-4 w-4 text-amber-600" />
            <span>Công trình</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/lenh-dieu-xe/ke-hoach/van-chuyen-noi-bo')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all cursor-pointer"
          >
            <Truck className="h-4 w-4 text-blue-600" />
            <span>Vận chuyển</span>
          </button>
        </div>
      </div>

      {/* 1. KPI CARDS TỔNG QUAN (ĐƯỢC ĐƯA LÊN ĐẦU TRANG) */}
      <KPIGrid cols={4}>
        <StatCard
          label="Tổng kế hoạch tuần"
          value={totalStats.plansCount}
          subValue={selectedKLH === 'ALL' ? 'Toàn bộ các Khu liên hợp' : KLH_OPTIONS.find((k) => k.code === selectedKLH)?.name}
          icon={<Layers className="h-5 w-5 text-blue-600" />}
        />
        <StatCard
          label="Tổng công việc trong tuần"
          value={`${totalStats.tasksCount} hạng mục`}
          subValue="Được phân bổ trong các tuần"
          icon={<ListPlus className="h-5 w-5 text-indigo-600" />}
        />
        <StatCard
          label="Tổng diện tích kế hoạch"
          value={`${totalStats.targetArea} ha`}
          subValue="Chỉ tiêu cơ giới quy hoạch"
          icon={<TrendingUp className="h-5 w-5 text-emerald-600" />}
        />
        <StatCard
          label="Nhu cầu đầu máy dự kiến"
          value={`${totalStats.estimatedVehicles} xe`}
          subValue="Máy kéo & xe cơ giới cần điều động"
          icon={<Tractor className="h-5 w-5 text-amber-600" />}
        />
      </KPIGrid>

      {/* 2. THANH LỌC VÀ CÔNG CỤ CHÍNH (ĐƯA XUỐNG DƯỚI KPI CARDS, TÍCH HỢP VIEW SWITCHER) */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3.5">
        {/* HÀNG 1: Ô TÌM KIẾM + BỘ LỌC */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Ô tìm kiếm */}
          <div className="relative flex-1 min-w-[240px] max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className="w-full rounded-xl border border-slate-200 bg-slate-50/80 pl-9 pr-3 py-2 text-xs text-slate-800 outline-none transition focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/15 h-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm mã KH, tên kế hoạch hoặc lô thửa..."
            />
          </div>

          {/* Select Giai đoạn */}
          <div className="flex items-center gap-1.5 bg-slate-50 hover:bg-slate-100/70 transition-colors px-3 py-1.5 rounded-xl border border-slate-200 h-9">
            <Layers className="h-4 w-4 text-emerald-600 shrink-0" />
            <select
              className="bg-transparent text-xs font-bold text-slate-800 outline-none cursor-pointer pr-1"
              value={selectedStage}
              onChange={(e) => setSelectedStage(e.target.value)}
            >
              <option value="ALL">Tất cả giai đoạn</option>
              {Object.entries(STAGES).map(([key, info]) => (
                <option key={key} value={key}>
                  {info.label}
                </option>
              ))}
            </select>
          </div>

          {/* Select Trạng thái */}
          <div className="flex items-center gap-1.5 bg-slate-50 hover:bg-slate-100/70 transition-colors px-3 py-1.5 rounded-xl border border-slate-200 h-9">
            <CheckCircle2 className="h-4 w-4 text-slate-500 shrink-0" />
            <select
              className="bg-transparent text-xs font-bold text-slate-800 outline-none cursor-pointer pr-1"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="APPROVED">Đã duyệt / Sẵn sàng</option>
              <option value="IN_PROGRESS">Đang thực hiện</option>
              <option value="COMPLETED">Đã hoàn thành</option>
              <option value="OVERDUE">Quá hạn</option>
              <option value="DRAFT">Bản nháp</option>
            </select>
          </div>
        </div>

        {/* TẦNG 1: CHẾ ĐỘ XEM (VIEW SWITCHER TABS) */}
        <div className="border-t border-slate-100 pt-3">
          <ViewSwitcher<'weekly_cards' | 'table'>
            value={view}
            onChange={setView}
            options={[
              { value: 'weekly_cards', label: 'Theo từng tuần (Thẻ trực quan)' },
              { value: 'table', label: 'Bảng danh sách chi tiết' },
            ]}
          />
        </div>

        {/* TẦNG 2: BỘ CHỌN NĂM & TUẦN TRỰC QUAN (TRÁI) + CÁC NÚT TIỆN ÍCH (PHẢI) */}
        <div className="pt-2 flex flex-col xl:flex-row xl:items-center justify-between gap-3 text-xs">
          {/* Bên trái: Chọn Năm, Chọn Tuần, Điều hướng & Các nút chọn khoảng tuần */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1.5 font-extrabold text-slate-700 mr-1">
              <Calendar className="h-4 w-4 text-emerald-600 shrink-0" /> Chọn tuần:
            </span>

            {/* Select Chọn Năm */}
            <div className="flex items-center gap-1.5 bg-slate-50 hover:bg-slate-100/80 transition-colors px-2.5 py-1 rounded-xl border border-slate-200 h-8">
              <span className="text-xs font-bold text-slate-500">Năm:</span>
              <select
                className="bg-transparent text-xs font-extrabold text-slate-900 outline-none cursor-pointer"
                value={selectedYear}
                onChange={(e) => {
                  setSelectedYear(Number(e.target.value));
                  setFromWeekVal('ALL');
                  setToWeekVal('ALL');
                  setWeekFilterMode('ALL');
                }}
              >
                <option value={2025}>2025</option>
                <option value={2026}>2026</option>
                <option value={2027}>2027</option>
                <option value={2028}>2028</option>
              </select>
            </div>

            {/* Cụm Từ Tuần ➔ Đến Tuần + Stepper: LUÔN NGANG NHAU (flex-nowrap shrink-0) KHÔNG BAO GIỜ BỊ XUỐNG DÒNG */}
            <div className="flex items-center gap-1.5 flex-nowrap shrink-0">
              {/* Select Chọn Từ Tuần */}
              <div
                className={`flex items-center gap-1.5 transition-colors px-2.5 py-1 rounded-xl border h-8 ${
                  fromWeekVal === String(currentIsoWeek)
                    ? 'bg-emerald-50/90 border-emerald-300 text-emerald-900 shadow-2xs'
                    : 'bg-slate-50 hover:bg-slate-100/80 border-slate-200 text-slate-800'
                }`}
              >
                <CalendarDays
                  className={`h-3.5 w-3.5 shrink-0 ${
                    fromWeekVal === String(currentIsoWeek) ? 'text-emerald-600' : 'text-primary'
                  }`}
                />
                <span className="text-[11px] font-bold text-slate-500 whitespace-nowrap">Từ:</span>
                <select
                  className={`bg-transparent text-xs font-extrabold outline-none cursor-pointer max-w-[210px] ${
                    fromWeekVal === String(currentIsoWeek) ? 'text-emerald-800 font-black' : 'text-slate-900'
                  }`}
                  value={fromWeekVal}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFromWeekVal(val);
                    if (val === 'ALL' && toWeekVal === 'ALL') {
                      setWeekFilterMode('ALL');
                    } else {
                      setWeekFilterMode('RANGE');
                    }
                  }}
                >
                  <option value="ALL">Từ tuần (Tất cả)...</option>
                  {weeksOfYear.map((w) => {
                    const isCurrent = w.weekNumber === currentIsoWeek;
                    return (
                      <option
                        key={w.weekNumber}
                        value={w.weekNumber}
                        style={
                          isCurrent
                            ? { color: '#047857', fontWeight: 'bold', backgroundColor: '#ecfdf5' }
                            : undefined
                        }
                      >
                        {w.label}
                      </option>
                    );
                  })}
                </select>
              </div>

              <span className="text-slate-400 font-bold text-xs shrink-0">➔</span>

              {/* Select Chọn Đến Tuần */}
              <div
                className={`flex items-center gap-1.5 transition-colors px-2.5 py-1 rounded-xl border h-8 ${
                  toWeekVal === String(currentIsoWeek)
                    ? 'bg-emerald-50/90 border-emerald-300 text-emerald-900 shadow-2xs'
                    : 'bg-slate-50 hover:bg-slate-100/80 border-slate-200 text-slate-800'
                }`}
              >
                <CalendarDays
                  className={`h-3.5 w-3.5 shrink-0 ${
                    toWeekVal === String(currentIsoWeek) ? 'text-emerald-600' : 'text-primary'
                  }`}
                />
                <span className="text-[11px] font-bold text-slate-500 whitespace-nowrap">Đến:</span>
                <select
                  className={`bg-transparent text-xs font-extrabold outline-none cursor-pointer max-w-[210px] ${
                    toWeekVal === String(currentIsoWeek) ? 'text-emerald-800 font-black' : 'text-slate-900'
                  }`}
                  value={toWeekVal}
                  onChange={(e) => {
                    const val = e.target.value;
                    setToWeekVal(val);
                    if (fromWeekVal === 'ALL' && val === 'ALL') {
                      setWeekFilterMode('ALL');
                    } else {
                      setWeekFilterMode('RANGE');
                    }
                  }}
                >
                  <option value="ALL">Đến tuần (Tất cả)...</option>
                  {weeksOfYear.map((w) => {
                    const isCurrent = w.weekNumber === currentIsoWeek;
                    return (
                      <option
                        key={w.weekNumber}
                        value={w.weekNumber}
                        style={
                          isCurrent
                            ? { color: '#047857', fontWeight: 'bold', backgroundColor: '#ecfdf5' }
                            : undefined
                        }
                      >
                        {w.label}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Stepper Lùi / Tiến 1 Tuần */}
              <div className="flex items-center gap-0.5 bg-slate-50 rounded-xl border border-slate-200 p-0.5 h-8 shrink-0">
                <button
                  type="button"
                  onClick={() => handleStepWeek(-1)}
                  className="p-1 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer"
                  title="Lùi 1 tuần"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>

                <button
                  type="button"
                  onClick={() => handleStepWeek(1)}
                  className="p-1 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer"
                  title="Tiến 1 tuần"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Nhóm 4 Nút Chọn Khoảng Tuần Nhanh */}
            <div className="flex flex-wrap items-center gap-1.5 ml-1">
              {/* Nút 1: Tất cả */}
              <button
                type="button"
                onClick={() => {
                  setWeekFilterMode('ALL');
                  setFromWeekVal('ALL');
                  setToWeekVal('ALL');
                }}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                  weekFilterMode === 'ALL'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Tất cả
              </button>

              {/* Nút 2: 5 tuần trước (chứa tuần hiện tại) */}
              <button
                type="button"
                onClick={() => {
                  setWeekFilterMode('PREV_5');
                  setFromWeekVal(String(Math.max(1, currentIsoWeek - 4)));
                  setToWeekVal(String(currentIsoWeek));
                }}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                  weekFilterMode === 'PREV_5'
                    ? 'bg-blue-700 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
                title={`5 tuần trước bao gồm tuần hiện tại (W${Math.max(1, currentIsoWeek - 4)} ➔ W${currentIsoWeek})`}
              >
                5 tuần trước (W{Math.max(1, currentIsoWeek - 4)} - W{currentIsoWeek})
              </button>

              {/* Nút 3: Tuần hiện tại */}
              <button
                type="button"
                onClick={() => {
                  setWeekFilterMode('CURRENT');
                  setFromWeekVal(String(currentIsoWeek));
                  setToWeekVal(String(currentIsoWeek));
                }}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                  weekFilterMode === 'CURRENT'
                    ? 'bg-emerald-700 text-white shadow-xs ring-2 ring-emerald-500/30'
                    : 'bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100'
                }`}
              >
                Tuần hiện tại (W{currentIsoWeek})
              </button>

              {/* Nút 4: 5 tuần tới (chứa tuần hiện tại) */}
              <button
                type="button"
                onClick={() => {
                  setWeekFilterMode('NEXT_5');
                  setFromWeekVal(String(currentIsoWeek));
                  setToWeekVal(String(Math.min(52, currentIsoWeek + 4)));
                }}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                  weekFilterMode === 'NEXT_5'
                    ? 'bg-teal-700 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
                title={`5 tuần tới bao gồm tuần hiện tại (W${currentIsoWeek} ➔ W${Math.min(52, currentIsoWeek + 4)})`}
              >
                5 tuần tới (W{currentIsoWeek} - W{Math.min(52, currentIsoWeek + 4)})
              </button>
            </div>
          </div>

          {/* Bên phải: Các nút tiện ích (Làm mới, Xuất file, Lập kế hoạch tuần mới) */}
          <div className="flex flex-wrap items-center justify-end gap-2 shrink-0 xl:ml-auto">
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs font-bold border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 cursor-pointer"
              icon={<RotateCcw className="h-3.5 w-3.5" />}
              onClick={() => {
                setSearch('');
                setSelectedStatus('ALL');
                setSelectedStage('ALL');
                setSelectedYear(2026);
                setFromWeekVal('ALL');
                setToWeekVal('ALL');
                setWeekFilterMode('ALL');
              }}
            >
              Làm mới
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs font-bold border-slate-200 bg-white text-slate-700 hover:bg-slate-50 cursor-pointer shadow-2xs"
              icon={<Download className="h-3.5 w-3.5" />}
              onClick={handleExportCSV}
            >
              Xuất file
            </Button>

            <button
              type="button"
              onClick={() => navigate('/lenh-dieu-xe/ke-hoach/tao-moi')}
              className="h-8 inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-extrabold px-3.5 shadow-2xs transition-all hover:shadow cursor-pointer active:scale-98"
            >
              <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
              <span>Lập kế hoạch tuần mới</span>
            </button>
          </div>
        </div>
      </section>

      {/* 4. MAIN CONTENT */}
      {filteredPlans.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center text-slate-400">
          <Calendar className="h-10 w-10 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-600">Không tìm thấy kế hoạch nào phù hợp với bộ lọc hiện tại.</p>
          <p className="text-xs text-slate-400 mt-1">Vui lòng chọn tuần khác hoặc bấm "Lập kế hoạch tuần mới".</p>
          <Button
            size="sm"
            className="mt-4 bg-primary text-white text-xs font-bold mx-auto"
            icon={<Plus className="h-3.5 w-3.5" />}
            onClick={() => navigate('/lenh-dieu-xe/ke-hoach/tao-moi')}
          >
            Lập kế hoạch tuần mới
          </Button>
        </div>
      ) : view === 'table' ? (
        /* CHẾ ĐỘ XEM BẢNG CHI TIẾT THEO TỪNG CÔNG VIỆC (GOM THEO TUẦN) */
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
              <ListPlus className="h-4 w-4 text-emerald-600" />
              Danh sách chi tiết từng công việc cơ giới (<strong>{flattenedTaskRows.length}</strong> công việc gom theo <strong>{filteredPlans.length}</strong> kế hoạch tuần)
            </span>
          </div>

          <div className="w-full bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-extrabold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-2.5 px-3 w-36 text-center">Tuần & Mã Kế Hoạch</th>
                    <th className="py-2.5 px-2 w-10 text-center">STT</th>
                    <th className="py-2.5 px-3 min-w-[210px]">Hạng mục công việc cơ giới</th>
                    <th className="py-2.5 px-3 min-w-[170px]">Vị trí Lô / Thửa</th>
                    <th className="py-2.5 px-3 min-w-[160px]">Nông cụ & Đầu máy</th>
                    <th className="py-2.5 px-2 text-center w-24">Khối lượng</th>
                    <th className="py-2.5 px-2 text-center w-24">Nhu cầu xe</th>
                    <th className="py-2.5 px-2 text-center w-24">Lịch thực hiện</th>
                    <th className="py-2.5 px-2 text-center w-24">Trạng thái</th>
                    <th className="py-2.5 px-2 text-center w-24">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPlans.map((plan) =>
                    plan.tasks.map((task, taskIdx) => (
                      <tr key={task.id} className="border-b border-slate-100 hover:bg-slate-50/70 transition-colors">
                        {taskIdx === 0 && (
                          <td rowSpan={plan.tasks.length} className="p-3 align-top border-r border-slate-200 bg-slate-50/50 text-center">
                            <span className="inline-block px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold text-xs">
                              W{plan.weekNumber}
                            </span>
                            <div className="font-mono font-bold text-slate-900 text-xs mt-1">{plan.code}</div>
                            <div className="text-[10px] text-slate-400">{formatDateStr(plan.startDate)}</div>
                            <div className="text-[10px] text-slate-600 font-bold mt-1 truncate max-w-[120px]" title={plan.complexName}>
                              {plan.complexName}
                            </div>
                            {plan.notes && (
                              <div className="mt-2 text-left bg-amber-50/90 p-1.5 rounded-lg border border-amber-200/80 text-[10px] text-amber-900 shadow-2xs">
                                <span className="font-bold flex items-center gap-1 text-[10px] text-amber-800">
                                  <FileText className="h-3 w-3 text-amber-600 shrink-0" /> Ghi chú chung:
                                </span>
                                <div className="text-slate-700 font-medium whitespace-pre-line break-words mt-0.5 max-h-16 overflow-y-auto leading-tight" title={plan.notes}>
                                  {plan.notes}
                                </div>
                              </div>
                            )}
                          </td>
                        )}
                        <td className="py-2.5 px-2 text-center font-bold text-slate-400">{taskIdx + 1}</td>
                        <td className="py-2 px-3">
                          <span className="font-mono text-[10.5px] font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded mr-1">
                            {task.jobCode}
                          </span>
                          <strong className="text-slate-900">{task.jobName}</strong>
                          {task.notes && (
                            <div className="text-[11px] text-slate-500 font-medium italic whitespace-pre-line break-words pt-0.5">
                              {task.notes}
                            </div>
                          )}
                        </td>
                        <td className="py-2 px-3 text-slate-700">{task.lotPlot}</td>
                        <td className="py-2 px-3 text-slate-700">
                          <div>{task.implementGroup || '—'}</div>
                          {task.recommendedVehicle && (
                            <div className="text-[11px] text-slate-500">{task.recommendedVehicle}</div>
                          )}
                        </td>
                        <td className="py-2 px-2 text-center font-bold text-slate-900">
                          {task.targetAreaHa} ha
                        </td>
                        <td className="py-2 px-2 text-center">
                          <span className="rounded bg-amber-100 text-amber-900 text-[10.5px] font-bold px-1.5 py-0.5">
                            {task.assignedVehiclesCount} xe
                          </span>
                        </td>
                        <td className="py-2 px-2 text-center text-slate-600">{task.scheduledDays}</td>
                        <td className="py-2 px-2 text-center">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold border ${
                              task.status === 'DISPATCHED'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : 'bg-slate-100 text-slate-700 border-slate-200'
                            }`}
                          >
                            {task.status === 'DISPATCHED' ? 'Đã phát' : 'Chờ phát'}
                          </span>
                        </td>
                        <td className="py-2 px-2 text-center">
                          <button
                            type="button"
                            onClick={() => issueAgricultureOrders(plan, [task])}
                            className="inline-flex items-center gap-1 h-7 text-[10.5px] font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 cursor-pointer px-2.5 shadow-2xs transition-colors"
                            title="Nạp công việc này sang danh sách điều xe"
                          >
                            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                            <span>Tự động nạp</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* CHẾ ĐỘ XEM THẺ KẾ HOẠCH THEO TỪNG TUẦN */
        <div className="space-y-6">
          {filteredPlans.map((plan) => {
            const totalHa = plan.tasks.reduce((acc, t) => acc + (t.targetAreaHa || 0), 0);
            const totalVehicles = plan.tasks.reduce((acc, t) => acc + (t.assignedVehiclesCount || 0), 0);
            const planStageCode = plan.stageCode || plan.tasks[0]?.stageCode;
            const planStageInfo = planStageCode && STAGES[planStageCode]
              ? STAGES[planStageCode]
              : (plan.stageName ? { label: plan.stageName, bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' } : null);

            return (
              <div
                key={plan.id}
                className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden transition-all hover:border-slate-300"
              >
                {/* HEADER KẾ HOẠCH TUẦN */}
                <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 p-4 bg-slate-50/90 border-b border-slate-200">
                  <div className="flex items-start gap-3.5 min-w-0 flex-1">
                    {/* CỘT TRÁI: BADGE TUẦN + KHOẢNG THỜI GIAN TUẦN Ở DƯỚI + GIAI ĐOẠN VỤ */}
                    <div className="flex flex-col items-center gap-1 shrink-0">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-white font-black text-sm shadow-xs">
                        W{plan.weekNumber}
                      </div>
                      <span className="inline-flex items-center gap-1 font-semibold text-[10.5px] text-slate-500 whitespace-nowrap bg-white/90 px-2 py-0.5 rounded-lg border border-slate-200/80 shadow-2xs">
                        <CalendarDays className="h-3 w-3 text-slate-400 shrink-0" />
                        {formatDateStr(plan.startDate)} ➔ {formatDateStr(plan.endDate)}
                      </span>
                      {planStageInfo && (
                        <span
                          className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-bold border text-center ${planStageInfo.bg} ${planStageInfo.text} ${planStageInfo.border}`}
                        >
                          {planStageInfo.label}
                        </span>
                      )}
                    </div>

                    {/* CỘT GIỮA: MÃ, TIÊU ĐỀ & PHÂN CẤP ĐƠN VỊ (TỰ ĐỘNG XUỐNG DÒNG KHI DÀI) */}
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono font-black text-primary text-xs bg-primary/10 px-2 py-0.5 rounded border border-primary/20 shrink-0">
                          {plan.code}
                        </span>
                        <h3 className="text-sm sm:text-base font-extrabold text-slate-900 break-words leading-snug">
                          {plan.title}
                        </h3>
                        <div className="shrink-0">
                          <StatusBadge status={plan.status} />
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 pt-0.5">
                        <span className="inline-flex items-center gap-1 font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                          <Building2 className="h-3.5 w-3.5 text-emerald-600" /> {plan.complexName}
                        </span>

                        {(plan.enterpriseName || plan.enterpriseCode) && (
                          <span className="inline-flex items-center gap-1 font-bold text-blue-950 bg-blue-50/80 px-2 py-0.5 rounded-md border border-blue-200/80">
                            <Building2 className="h-3.5 w-3.5 text-blue-600" /> {plan.enterpriseName || plan.enterpriseCode}
                          </span>
                        )}

                        {(plan.farmName || plan.farmCode) && (
                          <span className="inline-flex items-center gap-1 font-bold text-emerald-950 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                            <MapPin className="h-3.5 w-3.5 text-emerald-600" /> {plan.farmName || plan.farmCode}
                          </span>
                        )}
                      </div>

                      {/* TRƯỜNG BỔ SUNG: NGƯỜI LẬP (TÊN USER) VÀ THỜI GIAN LẬP */}
                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 pt-1">
                        <span className="inline-flex items-center gap-1 font-medium text-slate-600 bg-slate-100/90 px-2 py-0.5 rounded-md border border-slate-200">
                          <User className="h-3 w-3 text-slate-400" />
                          Người lập: <strong className="text-slate-800 font-bold">{plan.createdBy || 'Chau Tiểu Long'}</strong>
                        </span>
                        <span className="inline-flex items-center gap-1 font-medium text-slate-600 bg-slate-100/90 px-2 py-0.5 rounded-md border border-slate-200">
                          <Clock className="h-3 w-3 text-slate-400" />
                          Thời gian lập: <strong className="text-slate-800 font-bold">{formatDateTimeStr(plan.createdAt)}</strong>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* THỐNG KÊ TUẦN & NÚT HÀNH ĐỘNG (CỐ ĐỊNH BÊN PHẢI, XẾP DỌC: THỐNG KÊ Ở TRÊN, NÚT Ở DƯỚI) */}
                  <div className="flex flex-col items-start sm:items-end justify-center gap-2 shrink-0">
                    {/* Ở TRÊN: Thống kê số lượng, diện tích, nhu cầu xe */}
                    <div className="flex items-center gap-3 bg-white px-3 py-1.5 rounded-xl border border-slate-200 text-xs shadow-2xs shrink-0">
                      <div>
                        <span className="text-[10px] text-slate-400 block font-medium">Số công việc:</span>
                        <strong className="text-blue-700 text-sm">{plan.tasks.length}</strong>
                      </div>
                      <div className="w-px h-6 bg-slate-200" />
                      <div>
                        <span className="text-[10px] text-slate-400 block font-medium">Tổng diện tích:</span>
                        <strong className="text-primary text-sm">{Math.round(totalHa * 10) / 10} ha</strong>
                      </div>
                      <div className="w-px h-6 bg-slate-200" />
                      <div>
                        <span className="text-[10px] text-slate-400 block font-medium">Nhu cầu máy:</span>
                        <strong className="text-amber-700 text-sm">{totalVehicles} xe</strong>
                      </div>
                    </div>

                    {/* Ở DƯỚI: Các nút hành động + Nút Phát lệnh xe tất cả */}
                    <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => navigate(`/lenh-dieu-xe/ke-hoach/tao-moi?editPlanId=${plan.id}&mode=view`)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 rounded-xl border border-slate-200 cursor-pointer shadow-2xs transition-colors"
                        title="Xem chi tiết"
                      >
                        <Eye className="h-3.5 w-3.5 text-slate-500" /> Xem
                      </button>
                      <button
                        type="button"
                        onClick={() => navigate(`/lenh-dieu-xe/ke-hoach/tao-moi?editPlanId=${plan.id}`)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-xl border border-blue-200 cursor-pointer shadow-2xs transition-colors"
                        title="Chỉnh sửa kế hoạch"
                      >
                        <Pen className="h-3.5 w-3.5 text-blue-600" /> Sửa
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeletePlan(plan.id, plan.title)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl border border-rose-200 cursor-pointer shadow-2xs transition-colors"
                        title="Xóa kế hoạch"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-rose-600" /> Xóa
                      </button>
                      <button
                        type="button"
                        onClick={() => issueAgricultureOrders(plan, plan.tasks)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-extrabold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl shadow-2xs cursor-pointer transition-all active:scale-98"
                        title="Xem các lệnh điều xe của kế hoạch này"
                      >
                        <Truck className="h-3.5 w-3.5 text-slate-600" /> Xem điều xe
                      </button>
                    </div>
                  </div>
                </div>

                {/* BẢNG DANH SÁCH NHIỀU CÔNG VIỆC TRONG TUẦN */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-100/75 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="py-2.5 px-3 w-10 text-center">STT</th>
                        <th className="py-2.5 px-3">Hạng mục công việc cơ giới</th>
                        <th className="py-2.5 px-3">Vị trí Lô / Thửa</th>
                        <th className="py-2.5 px-3">Nông cụ tương thích & Đầu máy</th>
                        <th className="py-2.5 px-3 text-right">Diện tích (ha)</th>
                        <th className="py-2.5 px-3 text-center">Nhu cầu máy</th>
                        <th className="py-2.5 px-3">Lịch thực hiện</th>
                        <th className="py-2.5 px-3 text-center">Hành động</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {plan.tasks.map((task, idx) => {
                        return (
                          <tr key={task.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-2.5 px-3 text-center font-bold text-slate-400">{idx + 1}</td>
                            <td className="py-2.5 px-3">
                              <div className="space-y-1">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-mono text-[10px] font-bold text-primary bg-primary/5 px-1.5 py-0.5 rounded border border-primary/10">
                                    {task.jobCode}
                                  </span>
                                  <strong className="text-slate-900 text-xs">{task.jobName}</strong>
                                </div>
                                {task.notes && (
                                  <div className="text-[11px] text-slate-600 italic font-medium whitespace-pre-line break-words leading-relaxed pt-0.5">
                                    {task.notes}
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="py-2.5 px-3 whitespace-nowrap">
                              <span className="inline-flex items-center gap-1.5 font-bold text-slate-800 text-xs">
                                <MapPin className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                                {task.lotPlot}
                              </span>
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="text-xs">
                                <span className="text-amber-800 font-medium flex items-center gap-1">
                                  <Wrench className="h-3 w-3 text-amber-600 shrink-0" />
                                  {task.implementGroup}
                                </span>
                                <span className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                                  <Tractor className="h-3 w-3 text-slate-400 shrink-0" />
                                  {task.recommendedVehicle}
                                </span>
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <strong className="text-slate-900 text-xs">{task.targetAreaHa}</strong>
                              <span className="text-[10px] text-slate-400 ml-1">ha</span>
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-800 border border-amber-200">
                                {task.assignedVehiclesCount} xe
                              </span>
                            </td>
                            <td className="py-2.5 px-3">
                              <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                                <Clock className="h-3 w-3 text-slate-400" />
                                {task.scheduledDays}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <button
                                type="button"
                                onClick={() => issueAgricultureOrders(plan, [task])}
                                className="inline-flex items-center gap-1 h-7 text-[11px] font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 cursor-pointer px-2.5 shadow-2xs transition-colors"
                                title="Nạp công việc này sang danh sách điều xe"
                              >
                                <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                                <span>Tự động nạp</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* FOOTER CỦA THẺ TUẦN (HIỂN THỊ GHI CHÚ CHUNG ĐA DÒNG RÕ RÀNG) */}
                <div className="p-3 bg-slate-50/70 border-t border-slate-100 flex flex-col sm:flex-row sm:items-start justify-between gap-3 text-xs">
                  <div className="flex-1 min-w-0">
                    {plan.notes ? (
                      <div className="space-y-1">
                        <div className="flex items-center gap-1 font-bold text-slate-700 text-[11px]">
                          <FileText className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                          <span>Ghi chú chung kế hoạch:</span>
                        </div>
                        <p className="text-slate-700 font-medium text-xs whitespace-pre-line break-words leading-relaxed pl-3 border-l-2 border-amber-400 bg-amber-50/40 p-1.5 rounded-r-lg">
                          {plan.notes}
                        </p>
                      </div>
                    ) : (
                      <span className="text-slate-500 font-medium italic">
                        Đã hoàn tất quy hoạch {plan.tasks.length} hạng mục cơ giới cho {plan.complexName}.
                      </span>
                    )}
                  </div>

                  {(() => {
                    const isPast =
                      plan.status === 'OVERDUE' ||
                      plan.status === 'COMPLETED' ||
                      (plan.weekNumber !== undefined && plan.weekNumber < currentIsoWeek);

                    if (isPast) {
                      return (
                        <span
                          className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs select-none"
                          title="Kế hoạch này thuộc tuần đã qua trong quá khứ, hệ thống đã khóa không cho nhập thêm công việc mới"
                        >
                          <Lock className="h-3.5 w-3.5 text-slate-400" />
                          <span>Đã qua tuần (Khóa thêm việc)</span>
                        </span>
                      );
                    }

                    return (
                      <button
                        type="button"
                        onClick={() => navigate(`/lenh-dieu-xe/ke-hoach/tao-moi?editPlanId=${plan.id}&addNewTask=true`)}
                        className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline cursor-pointer shrink-0 pt-0.5"
                      >
                        <Plus className="h-3.5 w-3.5" /> Thêm công việc vào tuần này
                      </button>
                    );
                  })()}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ===================================================================== */}
      {/* 5. MODAL LẬP KẾ HOẠCH SẢN XUẤT THEO TUẦN (ĐƯA NHIỀU CÔNG VIỆC)          */}
      {/* ===================================================================== */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setEditingPlan(null);
        }}
        title={editingPlan ? `Chỉnh sửa Kế hoạch tuần: ${editingPlan.code}` : 'Lập kế hoạch sản xuất cơ giới theo tuần'}
        subtitle="Chọn tuần làm việc và khai báo danh sách nhiều công việc cơ giới cần thực hiện"
        size="2xl"
      >
        <form className="space-y-4 text-xs" onSubmit={handleSavePlan}>
          {/* PHẦN 1: THÔNG TIN TUẦN & PHÂN CẤP ĐƠN VỊ */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3.5">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <span className="font-extrabold text-slate-800 uppercase tracking-wide text-xs flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-emerald-600" /> 1. Chọn tuần & Đơn vị phụ trách
              </span>
              <span className="text-xs font-extrabold text-emerald-800 bg-emerald-100/80 px-2.5 py-0.5 rounded-full border border-emerald-200">
                Tuần {currentWeekNumber} ({formatDateStr(selectedMonday)} ➔ {formatDateStr(selectedSunday)})
              </span>
            </div>

            {/* Hàng 1: Chọn Năm + Chọn Tuần */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1 text-xs">
                  Chọn Năm: <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formYear}
                  onChange={(e) => {
                    const y = Number(e.target.value);
                    setFormYear(y);
                    const weeks = getWeeksOfYear(y);
                    const targetW = weeks.find((w) => w.weekNumber === formWeekNo) || weeks[0];
                    setPlanForm((prev) => ({
                      ...prev,
                      weekMondayDate: targetW.startDateKey,
                      code: `KH-${targetW.year}-W${targetW.weekNumber}-${Date.now().toString().slice(-4)}`,
                    }));
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-white p-2 text-xs font-extrabold text-slate-900 focus:border-primary focus:outline-none"
                >
                  <option value={2025}>2025</option>
                  <option value={2026}>2026</option>
                  <option value={2027}>2027</option>
                  <option value={2028}>2028</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="font-bold text-slate-700 block mb-1 text-xs">
                  Chọn Tuần làm việc: <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formWeekNo}
                  onChange={(e) => {
                    const wNo = Number(e.target.value);
                    setFormWeekNo(wNo);
                    const targetW = formWeeks.find((w) => w.weekNumber === wNo) || formWeeks[0];
                    setPlanForm((prev) => ({
                      ...prev,
                      weekMondayDate: targetW.startDateKey,
                      code: `KH-${formYear}-W${wNo}-${Date.now().toString().slice(-4)}`,
                    }));
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-white p-2 text-xs font-extrabold text-slate-900 focus:border-primary focus:outline-none"
                >
                  {formWeeks.map((w) => (
                    <option key={w.weekNumber} value={w.weekNumber}>
                      {w.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Hàng 2: Thuộc khu liên hợp -> xí nghiệp -> nông trường -> lô thửa */}
            <div>
              <div className="text-[11px] font-bold text-slate-500 mb-1.5 uppercase tracking-wide flex items-center gap-1">
                <span>Phân cấp quản lý:</span>
                <span className="text-emerald-700 font-extrabold">Khu liên hợp ➔ Xí nghiệp ➔ Nông trường ➔ Lô / Thửa</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
                {/* 1. Khu liên hợp */}
                <div>
                  <label className="font-bold text-slate-700 block mb-1 text-[11px]">
                    Thuộc Khu liên hợp: <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={planForm.complexCode}
                    onChange={(e) => {
                      const klhCode = e.target.value;
                      const klh = HIERARCHY_DATA.find((k) => k.code === klhCode) || HIERARCHY_DATA[0];
                      const firstEnt = klh.enterprises[0];
                      const firstFarm = firstEnt?.farms[0];
                      const firstPlot = firstFarm?.plots[0] || '';
                      setPlanForm((prev) => ({
                        ...prev,
                        complexCode: klhCode,
                        enterpriseCode: firstEnt?.code || '',
                        farmCode: firstFarm?.code || '',
                        plotPlot: firstPlot,
                      }));
                    }}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50/80 p-1.5 text-xs font-bold text-slate-900 focus:border-primary focus:bg-white focus:outline-none"
                  >
                    {HIERARCHY_DATA.map((k) => (
                      <option key={k.code} value={k.code}>
                        {k.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 2. Xí nghiệp */}
                <div>
                  <label className="font-bold text-slate-700 block mb-1 text-[11px]">
                    Xí nghiệp: <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={planForm.enterpriseCode}
                    onChange={(e) => {
                      const entCode = e.target.value;
                      const currentKlh = HIERARCHY_DATA.find((k) => k.code === planForm.complexCode) || HIERARCHY_DATA[0];
                      const ent = currentKlh.enterprises.find((item) => item.code === entCode) || currentKlh.enterprises[0];
                      const firstFarm = ent?.farms[0];
                      const firstPlot = firstFarm?.plots[0] || '';
                      setPlanForm((prev) => ({
                        ...prev,
                        enterpriseCode: entCode,
                        farmCode: firstFarm?.code || '',
                        plotPlot: firstPlot,
                      }));
                    }}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50/80 p-1.5 text-xs font-bold text-slate-900 focus:border-primary focus:bg-white focus:outline-none"
                  >
                    {currentEnterprises.map((ent) => (
                      <option key={ent.code} value={ent.code}>
                        {ent.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 3. Nông trường */}
                <div>
                  <label className="font-bold text-slate-700 block mb-1 text-[11px]">
                    Nông trường: <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={planForm.farmCode}
                    onChange={(e) => {
                      const fCode = e.target.value;
                      const farm = currentFarms.find((f) => f.code === fCode) || currentFarms[0];
                      const firstPlot = farm?.plots[0] || '';
                      setPlanForm((prev) => ({
                        ...prev,
                        farmCode: fCode,
                        plotPlot: firstPlot,
                      }));
                    }}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50/80 p-1.5 text-xs font-bold text-slate-900 focus:border-primary focus:bg-white focus:outline-none"
                  >
                    {currentFarms.map((f) => (
                      <option key={f.code} value={f.code}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 4. Lô / Thửa */}
                <div>
                  <label className="font-bold text-slate-700 block mb-1 text-[11px]">
                    Lô / Thửa: <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      required
                      value={planForm.plotPlot}
                      onChange={(e) => setPlanForm((prev) => ({ ...prev, plotPlot: e.target.value }))}
                      list="plan-plot-options"
                      placeholder="Chọn hoặc nhập Lô/Thửa..."
                      className="w-full rounded-lg border border-slate-200 bg-slate-50/80 p-1.5 text-xs font-bold text-slate-900 focus:border-primary focus:bg-white focus:outline-none"
                    />
                    <datalist id="plan-plot-options">
                      {currentPlots.map((plot) => (
                        <option key={plot} value={plot} />
                      ))}
                    </datalist>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* PHẦN 2: DANH SÁCH NHIỀU CÔNG VIỆC TRONG TUẦN */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wide flex items-center gap-1.5">
                  <ListPlus className="h-4 w-4 text-emerald-600" /> 2. Danh sách các công việc thực hiện trong tuần ({formTasks.length} công việc)
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Đưa nhiều công việc cơ giới vào tuần. Nông cụ và đầu máy sẽ tự động gợi ý theo từng công việc.
                </p>
              </div>

              <Button
                type="button"
                size="sm"
                className="h-8 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-xs"
                icon={<Plus className="h-3.5 w-3.5" />}
                onClick={handleAddFormTask}
              >
                + Thêm công việc vào tuần
              </Button>
            </div>

            {/* BẢNG CÔNG VIỆC SOẠN THẢO */}
            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 text-slate-700 font-bold text-[11px]">
                    <tr>
                      <th className="p-2 w-8 text-center">#</th>
                      <th className="p-2 min-w-[210px]">Chọn công việc cơ giới</th>
                      <th className="p-2 min-w-[130px]">Lô / Thửa thực hiện</th>
                      <th className="p-2 min-w-[140px]">Nông cụ tương thích</th>
                      <th className="p-2 min-w-[140px]">Đầu máy khuyến nghị</th>
                      <th className="p-2 min-w-[90px]">Diện tích (ha)</th>
                      <th className="p-2 min-w-[85px]">Nhu cầu máy</th>
                      <th className="p-2 min-w-[115px]">Lịch trong tuần</th>
                      <th className="p-2 min-w-[140px]">Ghi chú</th>
                      <th className="p-2 w-10 text-center">Xóa</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {formTasks.map((task, index) => (
                      <tr key={task.id || index} className="hover:bg-slate-50">
                        <td className="p-2 text-center font-bold text-slate-400">{index + 1}</td>

                        {/* Chọn công việc */}
                        <td className="p-2">
                          <select
                            value={task.jobCode}
                            onChange={(e) => handleChangeTaskJob(index, e.target.value)}
                            className="w-full rounded-lg border border-slate-200 p-1.5 text-xs font-bold text-slate-900 bg-white focus:border-primary focus:outline-none"
                          >
                            {STANDARD_JOBS.map((j) => (
                              <option key={j.code} value={j.code}>
                                {j.code}: {j.name} ({j.stageName})
                              </option>
                            ))}
                          </select>
                          <span className="text-[10px] text-blue-700 font-semibold block mt-1">
                            {task.stageName}
                          </span>
                        </td>

                        {/* Lô / Thửa */}
                        <td className="p-2">
                          <input
                            required
                            value={task.lotPlot}
                            onChange={(e) => handleUpdateTaskField(index, 'lotPlot', e.target.value)}
                            placeholder="VD: Lô A12, Thửa 01"
                            className="w-full rounded-lg border border-slate-200 p-1.5 text-xs font-semibold focus:border-primary focus:outline-none"
                          />
                        </td>

                        {/* Nông cụ tương thích */}
                        <td className="p-2">
                          <input
                            value={task.implementGroup}
                            onChange={(e) => handleUpdateTaskField(index, 'implementGroup', e.target.value)}
                            className="w-full rounded-lg border border-slate-200 p-1.5 text-xs font-medium text-amber-800 focus:border-primary focus:outline-none bg-amber-50/40"
                          />
                        </td>

                        {/* Đầu máy */}
                        <td className="p-2">
                          <input
                            value={task.recommendedVehicle}
                            onChange={(e) => handleUpdateTaskField(index, 'recommendedVehicle', e.target.value)}
                            className="w-full rounded-lg border border-slate-200 p-1.5 text-xs font-medium text-slate-700 focus:border-primary focus:outline-none"
                          />
                        </td>

                        {/* Diện tích */}
                        <td className="p-2">
                          <input
                            type="number"
                            step="0.1"
                            min="0.1"
                            required
                            value={task.targetAreaHa}
                            onChange={(e) => handleUpdateTaskField(index, 'targetAreaHa', Number(e.target.value))}
                            className="w-full rounded-lg border border-slate-200 p-1.5 text-xs font-bold text-slate-900 focus:border-primary focus:outline-none"
                          />
                        </td>

                        {/* Nhu cầu máy */}
                        <td className="p-2">
                          <input
                            type="number"
                            min="1"
                            step="1"
                            required
                            value={task.assignedVehiclesCount}
                            onChange={(e) => handleUpdateTaskField(index, 'assignedVehiclesCount', Number(e.target.value))}
                            className="w-full rounded-lg border border-slate-200 p-1.5 text-xs font-bold text-amber-800 focus:border-primary focus:outline-none"
                          />
                        </td>

                        {/* Lịch trong tuần */}
                        <td className="p-2">
                          <select
                            value={task.scheduledDays}
                            onChange={(e) => handleUpdateTaskField(index, 'scheduledDays', e.target.value)}
                            className="w-full rounded-lg border border-slate-200 p-1.5 text-xs font-medium focus:border-primary focus:outline-none"
                          >
                            <option value="Thứ 2 - Thứ 4">Thứ 2 - Thứ 4</option>
                            <option value="Thứ 3 - Thứ 5">Thứ 3 - Thứ 5</option>
                            <option value="Thứ 4 - Thứ 6">Thứ 4 - Thứ 6</option>
                            <option value="Thứ 5 - Thứ 7">Thứ 5 - Thứ 7</option>
                            <option value="Thứ 2 - Thứ 7">Thứ 2 - Thứ 7</option>
                            <option value="Cả tuần (T2 - CN)">Cả tuần (T2 - CN)</option>
                          </select>
                        </td>

                        {/* Ghi chú */}
                        <td className="p-2">
                          <input
                            value={task.notes || ''}
                            onChange={(e) => handleUpdateTaskField(index, 'notes', e.target.value)}
                            placeholder="Ghi chú thêm..."
                            className="w-full rounded-lg border border-slate-200 p-1.5 text-xs focus:border-primary focus:outline-none"
                          />
                        </td>

                        {/* Nút xóa dòng */}
                        <td className="p-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveFormTask(index)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-slate-100 cursor-pointer"
                            title="Xóa công việc này"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* TỔNG KẾT TUẦN TỰ ĐỘNG */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-emerald-50/80 rounded-xl border border-emerald-200 text-xs">
              <div className="flex items-center gap-4">
                <div>
                  <span className="text-slate-500 text-[11px] block">Tổng số công việc:</span>
                  <strong className="text-blue-800 text-sm">{formTasks.length} công việc</strong>
                </div>
                <div className="w-px h-6 bg-emerald-200" />
                <div>
                  <span className="text-slate-500 text-[11px] block">Tổng diện tích quy hoạch:</span>
                  <strong className="text-emerald-800 text-sm">
                    {Math.round(formTasks.reduce((acc, t) => acc + (Number(t.targetAreaHa) || 0), 0) * 10) / 10} ha
                  </strong>
                </div>
                <div className="w-px h-6 bg-emerald-200" />
                <div>
                  <span className="text-slate-500 text-[11px] block">Tổng nhu cầu đầu máy:</span>
                  <strong className="text-amber-800 text-sm">
                    {formTasks.reduce((acc, t) => acc + (Number(t.assignedVehiclesCount) || 0), 0)} xe
                  </strong>
                </div>
              </div>

              <span className="text-[11px] font-semibold text-emerald-700">
                ✓ Đủ điều kiện phê duyệt & phát lệnh điều xe
              </span>
            </div>
          </div>

          {/* GHI CHÚ CHUNG KẾ HOẠCH */}
          <div>
            <label className="font-bold text-slate-700 block mb-1">Ghi chú kế hoạch tuần:</label>
            <textarea
              rows={2}
              value={planForm.notes}
              onChange={(e) => setPlanForm((prev) => ({ ...prev, notes: e.target.value }))}
              placeholder="Nhập yêu cầu đặc biệt về thời tiết, ưu tiên máy móc, hoặc lưu ý vận hành..."
              className="w-full rounded-xl border border-slate-200 p-2 text-xs focus:border-primary focus:outline-none"
            />
          </div>

          {/* NÚT LƯU & HỦY */}
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setShowCreateModal(false);
                setEditingPlan(null);
              }}
            >
              Hủy
            </Button>
            <Button type="submit" variant="primary" size="sm" className="bg-primary hover:bg-primary-600 font-bold">
              {editingPlan ? 'Lưu thay đổi kế hoạch' : 'Lưu kế hoạch tuần'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ===================================================================== */}
      {/* 6. MODAL XEM CHI TIẾT KẾ HOẠCH TUẦN & CÔNG VIỆC BÊN TRONG               */}
      {/* ===================================================================== */}
      {selectedPlanDetail && (
        <Modal
          isOpen={!!selectedPlanDetail}
          onClose={() => setSelectedPlanDetail(null)}
          title={`Chi tiết Kế hoạch sản xuất: ${selectedPlanDetail.code}`}
          subtitle={`${selectedPlanDetail.title} | Tuần ${selectedPlanDetail.weekNumber}`}
          size="2xl"
        >
          <div className="space-y-4 text-xs text-slate-700">
            {/* THÔNG TIN TỔNG HỢP TUẦN */}
            <div className="rounded-2xl bg-slate-50 p-4 border border-slate-200 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="text-slate-400 text-[11px] block font-medium">Tên kế hoạch tuần</span>
                  <h3 className="font-extrabold text-base text-slate-900">{selectedPlanDetail.title}</h3>
                </div>
                <StatusBadge status={selectedPlanDetail.status} />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 pt-3 border-t border-slate-200">
                <div>
                  <span className="text-[11px] text-slate-400 block">Khu liên hợp:</span>
                  <strong className="text-slate-800 text-xs">{selectedPlanDetail.complexName}</strong>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block">Xí nghiệp:</span>
                  <strong className="text-blue-900 text-xs">{selectedPlanDetail.enterpriseName || selectedPlanDetail.enterpriseCode || '—'}</strong>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block">Nông trường:</span>
                  <strong className="text-emerald-900 text-xs">{selectedPlanDetail.farmName || selectedPlanDetail.farmCode || '—'}</strong>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block">Tuần thực hiện:</span>
                  <strong className="text-primary text-xs">
                    Tuần {selectedPlanDetail.weekNumber} ({formatDateStr(selectedPlanDetail.startDate)} ➔ {formatDateStr(selectedPlanDetail.endDate)})
                  </strong>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block">Tổng diện tích:</span>
                  <strong className="text-emerald-700 text-xs">
                    {Math.round(selectedPlanDetail.tasks.reduce((a, b) => a + (b.targetAreaHa || 0), 0) * 10) / 10} ha
                  </strong>
                </div>
              </div>

              {selectedPlanDetail.notes && (
                <p className="text-xs text-slate-600 bg-white p-2.5 rounded-xl border border-slate-200">
                  <b>Ghi chú tuần:</b> {selectedPlanDetail.notes}
                </p>
              )}
            </div>

            {/* BẢNG CHI TIẾT TẤT CẢ CÔNG VIỆC TRONG TUẦN */}
            <div className="space-y-2">
              <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wide flex items-center gap-1.5">
                <ListPlus className="h-4 w-4 text-primary" /> Danh sách {selectedPlanDetail.tasks.length} công việc trong tuần
              </h4>

              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-100 text-slate-700 font-bold text-[10px] uppercase">
                      <tr>
                        <th className="p-2.5 w-8 text-center">STT</th>
                        <th className="p-2.5">Hạng mục công việc</th>
                        <th className="p-2.5">Giai đoạn</th>
                        <th className="p-2.5">Lô / Thửa</th>
                        <th className="p-2.5">Nông cụ & Đầu máy</th>
                        <th className="p-2.5 text-right">Diện tích</th>
                        <th className="p-2.5 text-center">Nhu cầu xe</th>
                        <th className="p-2.5">Lịch thực hiện</th>
                        <th className="p-2.5 text-center">Điều xe</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                      {selectedPlanDetail.tasks.map((task, idx) => {
                        const stageInfo = STAGES[task.stageCode] || {
                          label: task.stageName,
                          bg: 'bg-slate-50',
                          text: 'text-slate-700',
                          border: 'border-slate-200',
                        };

                        return (
                          <tr key={task.id} className="hover:bg-slate-50">
                            <td className="p-2.5 text-center font-bold text-slate-400">{idx + 1}</td>
                            <td className="p-2.5">
                              <strong className="text-slate-900 text-xs">{task.jobName}</strong>
                              <span className="font-mono text-[10px] text-slate-400 block">{task.jobCode}</span>
                            </td>
                            <td className="p-2.5">
                              <span className={`inline-block rounded px-2 py-0.5 text-[10px] font-bold border ${stageInfo.bg} ${stageInfo.text} ${stageInfo.border}`}>
                                {stageInfo.label}
                              </span>
                            </td>
                            <td className="p-2.5 font-semibold text-slate-800">{task.lotPlot}</td>
                            <td className="p-2.5">
                              <div className="text-xs">
                                <span className="text-amber-800 font-medium block">{task.implementGroup}</span>
                                <span className="text-[11px] text-slate-500 block">{task.recommendedVehicle}</span>
                              </div>
                            </td>
                            <td className="p-2.5 text-right font-extrabold text-slate-900">{task.targetAreaHa} ha</td>
                            <td className="p-2.5 text-center font-bold text-amber-800">{task.assignedVehiclesCount} xe</td>
                            <td className="p-2.5 text-slate-600">{task.scheduledDays}</td>
                            <td className="p-2.5 text-center">
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Tự động nạp
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button variant="outline" size="sm" onClick={() => setSelectedPlanDetail(null)}>
                Đóng
              </Button>
              <Button
                variant="primary"
                size="sm"
                icon={<Truck className="h-3.5 w-3.5" />}
                onClick={() => {
                  setSelectedPlanDetail(null);
                  navigate('/lenh-dieu-xe/danh-sach');
                }}
              >
                Xem danh sách điều xe
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* SOS Emergency Rescue Modal */}
      <SosRescueModal
        isOpen={showSosModal}
        onClose={() => setShowSosModal(false)}
      />
    </div>
  );
};
