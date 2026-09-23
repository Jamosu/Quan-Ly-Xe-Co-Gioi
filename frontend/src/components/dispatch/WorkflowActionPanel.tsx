import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarClock, CheckCircle2, ClipboardCheck, Clock, Timer, Tractor, Truck, UserCheck, Wrench, AlertTriangle, Plus, Trash2, Fuel, Info } from 'lucide-react';
import { Button } from '../common/Button';
import { SearchableSelect, type SelectOption } from '../common/SearchableSelect';
import { buildAttachedEquipmentUrl } from '../../utils/equipmentNavigation';
import { schedulingApi, type VehicleRecommendation } from '../../api/scheduling';

export type DemoOrderKind = 'AGRICULTURE' | 'CONSTRUCTION' | 'TRANSPORT';
export type DemoWorkflowStep = 'PENDING' | 'APPROVED' | 'RECEIVED' | 'COMPLETED';

export interface AssignedTeamMember {
  id: string;
  vehicleCode: string;
  implementNames: string[];
  driverName: string;
  startTime: string;
  durationHours: number;
}

export interface DatabaseVehicle {
  id: number;
  code: string;
  plate?: string;
  name: string;
  status: string;
  unit?: string;
  category?: string;
  fuelQuotaRate?: number | null;
  fuelStandardRate?: number | null;
  fuelQuotaUnit?: string | null;
  vehicleTypeId?: number | null;
  vehicleType?: {
    id?: number;
    name?: string;
    code?: string;
    operationalDomain?: DemoOrderKind;
    implementRequirement?: 'NONE' | 'OPTIONAL' | 'REQUIRED';
    isAssignable?: boolean;
    defaultFuelQuotaRate?: number | null;
  };
  selection?: {
    selectable: boolean;
    reasons: Array<{ code: string; message: string }>;
  };
}

interface DatabaseDriver {
  id: number;
  fullName: string;
  licenseClass?: string;
  unit?: string;
  phone?: string;
  currentShiftStatus?: string;
  employmentStatus?: string;
  isActive?: boolean;
}

interface DatabaseImplement {
  id: number;
  code: string;
  name: string;
  status?: string;
  technicalCondition?: string;
  unit?: string;
  usageMode?: 'ATTACHABLE' | 'STANDALONE' | 'UNCLASSIFIED';
  compatibleVehicleTypes?: Array<{ vehicleTypeId: number }>;
  selection?: {
    selectable: boolean;
    reasons: Array<{ code: string; message: string }>;
  };
}

export interface WorkflowActionPanelProps {
  kind: DemoOrderKind;
  step: DemoWorkflowStep;
  taskName: string;
  vehicleCode?: string;
  driverName?: string;
  implementName?: string;
  initialStartTime?: string;
  initialDurationHours?: number;
  unit?: string;
  complexCode?: string;
  managementUnitId?: number;
  estimatedVehiclesCount?: number;
  initialAssignedVehicles?: string[];
  currentOrderId?: number | string;
  recommendationWorkOrderId?: number;
  existingOrders?: Array<any>;
  onVehicleScheduleChange?: (details: {
    vehicle?: DatabaseVehicle;
    durationHours: number;
    plannedFuelLiters?: number;
    fuelQuotaRate?: string;
  }) => void;
  onApprove: (
    vehicle: { id: number; code: string; name: string; fuelQuotaRate?: number; fuelQuotaUnit?: string },
    driver: { id: number; name: string; license: string },
    schedule: { startTime: string; endTime: string; durationHours: number },
    implement?: { id: number | string; code: string; name: string },
    team?: Array<{
      vehicle: { id: number; code: string; name: string; fuelQuotaRate?: number; fuelQuotaUnit?: string };
      driver: { id: number; name: string; license: string };
      implement?: { id: number | string; code: string; name: string };
      implements?: Array<{ id: number | string; code: string; name: string }>;
      schedule?: { startTime: string; endTime: string; durationHours: number };
    }>,
  ) => void | Promise<void>;
  onReceive?: () => void | Promise<void>;
  onComplete?: () => void | Promise<void>;
}

export const getVehicleFuelQuotaRate = (
  v?: DatabaseVehicle | { code?: string; name?: string; fuelQuotaRate?: number | null; fuelStandardRate?: number | null; vehicleType?: { defaultFuelQuotaRate?: number | null } } | null,
  kind?: string,
): number => {
  if (!v) return 0;
  if (typeof v.fuelQuotaRate === 'number' && v.fuelQuotaRate > 0) return v.fuelQuotaRate;
  if (typeof (v as any).fuelStandardRate === 'number' && (v as any).fuelStandardRate > 0) return (v as any).fuelStandardRate;
  if (typeof v.vehicleType?.defaultFuelQuotaRate === 'number' && v.vehicleType.defaultFuelQuotaRate > 0) return v.vehicleType.defaultFuelQuotaRate;

  const code = (v.code || '').toUpperCase();
  const name = (v.name || '').toUpperCase();
  if (code.includes('MĐA') || code.includes('MX') || name.includes('ĐÀO') || name.includes('XÚC')) return 14.5;
  if (code.includes('MUI') || name.includes('ỦI')) return 18.0;
  if (code.includes('MS') || name.includes('SAN')) return 15.0;
  if (code.includes('ML') || name.includes('LU')) return 12.0;
  if (code.includes('MK-90') || name.includes('90HP') || name.includes('95HP')) return 14.0;
  if (code.includes('MK-75') || name.includes('75HP')) return 12.0;
  if (code.includes('MK-50') || name.includes('50HP')) return 9.5;
  if (kind === 'CONSTRUCTION' || kind === 'CONG_TRINH') return 14.5;
  if (kind === 'TRANSPORT' || kind === 'VAN_CHUYEN') return 25.0;
  return 10.0;
};

export const DEMO_FALLBACK_VEHICLES: Record<DemoOrderKind, DatabaseVehicle[]> = {
  AGRICULTURE: [
    { id: 92001, code: 'MK-75-01', plate: '70A-001.23', name: 'Máy kéo New Holland TT4.75 (75HP)', status: 'CHO_PHAN_CONG', category: 'MAY_KEO', fuelQuotaRate: 12.5, fuelQuotaUnit: 'L_PER_HOUR' },
    { id: 92002, code: 'MK-90-02', plate: '70A-002.45', name: 'Máy kéo Kubota M9540 (95HP)', status: 'CHO_PHAN_CONG', category: 'MAY_KEO', fuelQuotaRate: 15.0, fuelQuotaUnit: 'L_PER_HOUR' },
    { id: 92003, code: 'MK-50-05', plate: '70A-005.67', name: 'Máy kéo Kubota L5018 (50HP)', status: 'CHO_PHAN_CONG', category: 'MAY_KEO', fuelQuotaRate: 9.5, fuelQuotaUnit: 'L_PER_HOUR' },
    { id: 92004, code: 'MK-50-08', plate: '70A-008.89', name: 'Máy kéo John Deere 5050D (50HP)', status: 'CHO_PHAN_CONG', category: 'MAY_KEO', fuelQuotaRate: 9.5, fuelQuotaUnit: 'L_PER_HOUR' },
    { id: 92005, code: 'MK-50-12', plate: '70A-012.01', name: 'Máy kéo New Holland TT4.55 (55HP)', status: 'CHO_PHAN_CONG', category: 'MAY_KEO', fuelQuotaRate: 10.0, fuelQuotaUnit: 'L_PER_HOUR' },
    { id: 92006, code: 'MK-BC-01', plate: '70A-033.11', name: 'Máy kéo bánh cao Kubota Boom 12m', status: 'CHO_PHAN_CONG', category: 'MAY_KEO', fuelQuotaRate: 11.0, fuelQuotaUnit: 'L_PER_HOUR' },
  ],
  CONSTRUCTION: [
    { id: 92009, code: 'MS-02', plate: '70C-009.11', name: 'Máy san Komatsu GD511A (135HP)', status: 'CHO_PHAN_CONG', category: 'MAY_SAN', fuelQuotaRate: 15.0, fuelQuotaUnit: 'L_PER_HOUR' },
    { id: 92010, code: 'MX-01', plate: '70C-010.22', name: 'Máy xúc đào Komatsu PC200-8 (Gầu 0.8m³)', status: 'CHO_PHAN_CONG', category: 'MAY_XUC', fuelQuotaRate: 18.0, fuelQuotaUnit: 'L_PER_HOUR' },
    { id: 92011, code: 'MUI-04', plate: '70C-011.33', name: 'Máy ủi Caterpillar D6 (165HP)', status: 'CHO_PHAN_CONG', category: 'MAY_UI', fuelQuotaRate: 20.0, fuelQuotaUnit: 'L_PER_HOUR' },
    { id: 92012, code: 'ML-05', plate: '70C-012.44', name: 'Máy lu rung Hamm 3411 (14T)', status: 'CHO_PHAN_CONG', category: 'MAY_LU', fuelQuotaRate: 12.0, fuelQuotaUnit: 'L_PER_HOUR' },
  ],
  TRANSPORT: [
    { id: 92014, code: '92C-14689', plate: '92C-146.89', name: 'Đầu kéo Hyundai HD1000 (410HP)', status: 'CHO_PHAN_CONG', category: 'DAU_KEO', fuelQuotaRate: 38.0, fuelQuotaUnit: 'L_PER_HOUR' },
    { id: 92015, code: 'XT-BEN-01', plate: '92C-088.32', name: 'Xe tải ben Howo 3 chân 371HP', status: 'CHO_PHAN_CONG', category: 'XE_TAI', fuelQuotaRate: 32.0, fuelQuotaUnit: 'L_PER_HOUR' },
    { id: 92016, code: 'XTA-006', plate: '92C-155.82', name: 'Xe tải Thaco Auman C160 (9T)', status: 'CHO_PHAN_CONG', category: 'XE_TAI', fuelQuotaRate: 22.0, fuelQuotaUnit: 'L_PER_HOUR' },
    { id: 92017, code: 'XB-02', plate: '92C-112.34', name: 'Xe bồn xitec chuyên dụng 2 ngăn (5 Khối)', status: 'CHO_PHAN_CONG', category: 'XE_BON', fuelQuotaRate: 24.0, fuelQuotaUnit: 'L_PER_HOUR' },
  ],
};

export const DEMO_FALLBACK_DRIVERS: Record<DemoOrderKind, DatabaseDriver[]> = {
  AGRICULTURE: [
    { id: 93001, fullName: 'Nguyễn Văn Hùng', licenseClass: 'Máy kéo A4 / Thợ bậc 4', phone: '0981.234.567' },
    { id: 93002, fullName: 'Trần Đình Trọng', licenseClass: 'Máy kéo A4', phone: '0982.345.678' },
    { id: 93003, fullName: 'Lê Thanh Bình', licenseClass: 'Máy kéo A4 / Phun boom', phone: '0983.456.789' },
    { id: 93004, fullName: 'Võ Minh Trí', licenseClass: 'Máy kéo A4', phone: '0984.567.890' },
  ],
  CONSTRUCTION: [
    { id: 93009, fullName: 'Đỗ Văn Tuấn', licenseClass: 'Chứng chỉ máy san GD511A', phone: '0985.678.901' },
    { id: 93010, fullName: 'Danh Sóc Phon', licenseClass: 'Chứng chỉ máy xúc PC200-8', phone: '0986.789.012' },
    { id: 93011, fullName: 'Nguyễn Thành Long', licenseClass: 'Chứng chỉ máy ủi D6 Cat', phone: '0987.112.233' },
    { id: 93012, fullName: 'Phạm Văn Thạch', licenseClass: 'Chứng chỉ máy lu rung Hamm', phone: '0988.334.455' },
  ],
  TRANSPORT: [
    { id: 93014, fullName: 'Trần Văn Mạnh', licenseClass: 'Hạng FC (Đầu kéo Container)', phone: '0987.890.123' },
    { id: 93015, fullName: 'Lê Hoàng Nam', licenseClass: 'Hạng C (Xe ben Howo)', phone: '0988.901.234' },
    { id: 93016, fullName: 'Hoàng Quốc Việt', licenseClass: 'Hạng FC (Xe đầu kéo đường dài)', phone: '0989.012.345' },
    { id: 93017, fullName: 'Phan Trọng Tín', licenseClass: 'Hạng C (Xe tải thùng mui bạt)', phone: '0980.123.456' },
  ],
};

export const DEMO_EQUIPMENTS: Record<DemoOrderKind, Array<{ id: number | string; code: string; name: string }>> = {
  AGRICULTURE: [
    { id: 94001, code: 'NC-CAY-01', name: 'Dàn cày 4 chảo phá lâm Baldan' },
    { id: 94002, code: 'NC-BUA-01', name: 'Dàn bừa đĩa 24 chảo TATU' },
    { id: 94003, code: 'NC-XOI-01', name: 'Dàn xới đất phay Howard' },
    { id: 94004, code: 'NC-LUONG-01', name: 'Dàn lên luống 2 tim' },
    { id: 94005, code: 'NC-KHOAN-01', name: 'Dàn khoan hố tự hành' },
    { id: 94006, code: 'NC-RAIPHAN-01', name: 'Dàn rải phân đĩa quay' },
    { id: 94007, code: 'NC-PHUN-01', name: 'Dàn phun boom 12m áp lực cao' },
    { id: 94008, code: 'NC-MOOC-01', name: 'Rơ-moóc đệm mút treo chuối' },
    { id: 94009, code: 'NC-BAM-01', name: 'Dàn băm thân cây PTO' },
    { id: 94010, code: 'TB-NONE', name: 'Không gắn nông cụ (Xe tự hành / Ca máy)' },
  ],
  CONSTRUCTION: [
    { id: 95001, code: 'PK-GAU-01', name: 'Gầu xúc tiêu chuẩn 0.8m³ Komatsu' },
    { id: 95002, code: 'PK-NGOAM-01', name: 'Gầu ngoạm gỗ / đá xoay thủy lực 360°' },
    { id: 95003, code: 'PK-BUA-01', name: 'Búa đập đá thủy lực Furukawa F22' },
    { id: 95004, code: 'PK-LUOI-01', name: 'Lưỡi san gạt thủy lực đa hướng 3.7m' },
    { id: 95005, code: 'PK-RIPPER-01', name: 'Răng cày xới đất đá cứng (Ripper 3 răng)' },
    { id: 95006, code: 'PK-LUCUU-01', name: 'Vỏ áo lu chân cừu bọc ngoài trống lu' },
    { id: 95007, code: 'TB-NONE', name: 'Thiết bị tiêu chuẩn theo máy (Không phụ kiện rời)' },
  ],
  TRANSPORT: [
    { id: 96001, code: '92R-00583', name: 'Sơ-mi Rơ-moóc xương 40ft chở Container (92R-005.83)' },
    { id: 96002, code: '92R-01124', name: 'Sơ-mi Rơ-moóc sàn 40ft chở hàng bao / phân bón (92R-011.24)' },
    { id: 96003, code: '92R-02845', name: 'Rơ-moóc ben 3 trục tự đổ 32 tấn (92R-028.45)' },
    { id: 96004, code: 'THUNG-BAT', name: 'Thùng xe tải mui bạt tiêu chuẩn 9.5m' },
    { id: 96005, code: 'CONT-COOL-40', name: 'Container lạnh 40ft Thermo King chuối tươi' },
    { id: 96006, code: 'TEC-XITEC-05', name: 'Téc bồn 5000L nhiên liệu / nước sạch' },
    { id: 96007, code: 'XE-LIEN-THUNG', name: 'Xe tải liền thùng (Không dùng rơ-moóc rời)' },
  ],
};

const DOMAIN_CONFIG: Record<
  DemoOrderKind,
  {
    title: string;
    subtitle: string;
    vehicleLabel: string;
    vehicleIcon: React.ReactNode;
    accessoryLabel: string;
    accessoryIcon: React.ReactNode;
    driverLabel: string;
    driverIcon: React.ReactNode;
    scheduleLabel: string;
    scheduleIcon: React.ReactNode;
    submitLabel: string;
    quickHours: number[];
  }
> = {
  AGRICULTURE: {
    title: 'Quy trình Phê duyệt & Điều máy Nông nghiệp',
    subtitle: 'Phân công máy kéo, nông cụ cơ giới, thợ lái và ấn định ca làm việc trên lô thửa.',
    vehicleLabel: '1. Phương tiện / Đầu máy nông nghiệp:',
    vehicleIcon: <Tractor className="h-4 w-4 text-primary" />,
    accessoryLabel: '2. Nông cụ cơ giới gắn kèm:',
    accessoryIcon: <Wrench className="h-4 w-4 text-primary" />,
    driverLabel: '3. Lái xe / Thợ máy vận hành:',
    driverIcon: <UserCheck className="h-4 w-4 text-primary" />,
    scheduleLabel: '4. Thời gian bắt đầu làm việc & Ca máy:',
    scheduleIcon: <CalendarClock className="h-4 w-4 text-primary" />,
    submitLabel: 'Phê duyệt & Phân công Lệnh Nông nghiệp',
    quickHours: [2, 4, 8, 10, 12],
  },
  CONSTRUCTION: {
    title: 'Quy trình Phê duyệt & Điều máy Thi công Công trình',
    subtitle: 'Phân công xe máy chuyên dùng, đầu công tác, thợ máy và ấn định ca thi công.',
    vehicleLabel: '1. Thiết bị xe máy thi công cơ giới:',
    vehicleIcon: <Truck className="h-4 w-4 text-primary" />,
    accessoryLabel: '2. Phụ kiện / Đầu công tác gắn kèm:',
    accessoryIcon: <Wrench className="h-4 w-4 text-primary" />,
    driverLabel: '3. Thợ máy vận hành công trình:',
    driverIcon: <UserCheck className="h-4 w-4 text-primary" />,
    scheduleLabel: '4. Thời gian bắt đầu thi công & Ca máy:',
    scheduleIcon: <CalendarClock className="h-4 w-4 text-primary" />,
    submitLabel: 'Phê duyệt & Phân công Ca máy Công trình',
    quickHours: [2, 4, 8, 10, 12],
  },
  TRANSPORT: {
    title: 'Quy trình Phê duyệt & Điều vận Lệnh Vận chuyển Nội bộ',
    subtitle: 'Phân công xe tải / đầu kéo, rơ-moóc / container, tổ lái và ấn định khung giờ xuất bến.',
    vehicleLabel: '1. Xe tải / Đầu kéo vận chuyển:',
    vehicleIcon: <Truck className="h-4 w-4 text-primary" />,
    accessoryLabel: '2. Rơ-moóc / Sơ-mi rơ-moóc / Cont kèm theo:',
    accessoryIcon: <Wrench className="h-4 w-4 text-primary" />,
    driverLabel: '3. Lái xe phụ trách chính (Tổ lái):',
    driverIcon: <UserCheck className="h-4 w-4 text-primary" />,
    scheduleLabel: '4. Thời gian xuất bến & Khung giờ chạy:',
    scheduleIcon: <CalendarClock className="h-4 w-4 text-primary" />,
    submitLabel: 'Phê duyệt & Điều xe Vận chuyển',
    quickHours: [2, 4, 8, 10, 12],
  },
};

export const toLocalDateTimeInput = (value?: string) => {
  let date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) {
    date = new Date();
  }
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
};

export const WorkflowActionPanel: React.FC<WorkflowActionPanelProps> = ({
  kind,
  step,
  taskName,
  vehicleCode,
  driverName,
  implementName,
  initialStartTime,
  initialDurationHours = 8,
  unit,
  complexCode,
  managementUnitId,
  estimatedVehiclesCount,
  initialAssignedVehicles,
  currentOrderId,
  recommendationWorkOrderId,
  existingOrders,
  onVehicleScheduleChange,
  onApprove,
  onReceive,
  onComplete,
}) => {
  const [databaseVehicles, setDatabaseVehicles] = useState<DatabaseVehicle[]>([]);
  const [databaseDrivers, setDatabaseDrivers] = useState<DatabaseDriver[]>([]);
  const [databaseImplements, setDatabaseImplements] = useState<DatabaseImplement[]>([]);
  const [databaseOrders] = useState<any[]>([]);
  const [loadingResources, setLoadingResources] = useState(step === 'PENDING');
  const [resourceLoadFailed, setResourceLoadFailed] = useState(false);

  // Availability map từ API thực tế: vehicleId/driverId → { available, availabilityStatus, reasons }
  type AvailabilityMap = Record<number, { available: boolean; availabilityStatus: string; reasons: Array<{ code: string; message: string; relatedCode?: string; conflictInterval?: { startAt: string; endAt: string; overlapMinutes: number } }> }>;
  const [vehicleAvailMap, setVehicleAvailMap] = useState<AvailabilityMap>({});
  const [driverAvailMap, setDriverAvailMap] = useState<AvailabilityMap>({});
  const [fetchingAvailability, setFetchingAvailability] = useState(false);
  const [approving, setApproving] = useState(false);
  const [recommendations, setRecommendations] = useState<VehicleRecommendation[]>([]);
  const [excludedRecommendationCount, setExcludedRecommendationCount] = useState(0);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);
  const availabilityRequestRef = useRef(0);
  const resourcesLoadedRef = useRef(false);
  const firstAvailabilityLoadRef = useRef(true);

  const config = DOMAIN_CONFIG[kind] || DOMAIN_CONFIG.AGRICULTURE;

  useEffect(() => {
    if (step !== 'PENDING' || !recommendationWorkOrderId || loadingResources) { setRecommendations([]); setExcludedRecommendationCount(0); return; }
    let active = true;
    setLoadingRecommendations(true);
    schedulingApi.recommendVehicles(recommendationWorkOrderId)
      .then((result) => { if (active) { setRecommendations(result.recommendations); setExcludedRecommendationCount(result.excluded.length); } })
      .catch(() => { if (active) { setRecommendations([]); setExcludedRecommendationCount(0); } })
      .finally(() => { if (active) setLoadingRecommendations(false); });
    return () => { active = false; };
  }, [recommendationWorkOrderId, step, loadingResources]);

  const vehicles = useMemo<DatabaseVehicle[]>(() => {
    return databaseVehicles.filter((v) =>
      v.vehicleType?.operationalDomain === kind &&
      v.vehicleType?.isAssignable !== false &&
      v.status !== 'TAM_DUNG' &&
      (v as any).status !== 'inactive' &&
      (v as any).status !== 'NGUNG_HOAT_DONG'
    );
  }, [databaseVehicles, kind]);

  const drivers = useMemo<DatabaseDriver[]>(() => {
    return databaseDrivers.filter((d) => (d as any).isActive !== false && d.employmentStatus !== 'DA_NGHI_VIEC' && (d as any).status !== 'inactive');
  }, [databaseDrivers]);

  const currentEquipments = useMemo<DatabaseImplement[]>(() => {
    return databaseImplements.filter((eq) => eq.status !== 'TAM_DUNG' && (eq as any).status !== 'inactive' && (eq as any).status !== 'NGUNG_HOAT_DONG');
  }, [databaseImplements]);

  // Fetch availability từ API thực tế khi startTime hoặc durationHours thay đổi
  const fetchAvailabilityForSchedule = useCallback(async (startIso: string, durationH: number, vehicleId?: number) => {
    if (!startIso || durationH <= 0 || !managementUnitId) {
      setResourceLoadFailed(true);
      return;
    }
    const startDate = new Date(startIso);
    if (Number.isNaN(startDate.getTime())) return;
    const endDate = new Date(startDate.getTime() + durationH * 3_600_000);

    const requestId = ++availabilityRequestRef.current;
    if (!resourcesLoadedRef.current) setLoadingResources(true);
    setFetchingAvailability(true);
    setResourceLoadFailed(false);
    try {
      const data = await schedulingApi.preparationContext({
        managementUnitId,
        category: kind,
        unit: unit || 'KOUN_MOM',
        complexCode: complexCode || 'KOUN_MOM',
        startAt: startDate.toISOString(),
        endAt: endDate.toISOString(),
        excludeWorkOrderId: recommendationWorkOrderId,
        vehicleId,
      });
      const vMap: AvailabilityMap = {};
      const dMap: AvailabilityMap = {};
      for (const v of data.vehicles) vMap[v.id] = v.availability;
      for (const d of data.drivers) dMap[d.id] = d.availability;
      if (requestId !== availabilityRequestRef.current) return;
      setDatabaseVehicles(data.vehicles as DatabaseVehicle[]);
      setDatabaseDrivers(data.drivers.map((item) => ({ ...item, currentShiftStatus: item.driverProfile?.currentShiftStatus })));
      setDatabaseImplements(data.implements as DatabaseImplement[]);
      setVehicleAvailMap(vMap);
      setDriverAvailMap(dMap);
      resourcesLoadedRef.current = true;
    } catch {
      if (requestId === availabilityRequestRef.current) setResourceLoadFailed(true);
    } finally {
      if (requestId === availabilityRequestRef.current) {
        setFetchingAvailability(false);
        setLoadingResources(false);
      }
    }
  }, [kind, unit, complexCode, managementUnitId, recommendationWorkOrderId]);

  // Phân công phương tiện và thợ máy: Đúng 1 xe duy nhất cho mỗi lệnh điều xe
  const [assignedTeam, setAssignedTeam] = useState<AssignedTeamMember[]>(() => {
    const defaultStart = step === 'PENDING' ? toLocalDateTimeInput() : toLocalDateTimeInput(initialStartTime);
    const defaultDur = initialDurationHours || 8;
    return [{
      id: `team-${Date.now()}-0`,
      vehicleCode: step === 'PENDING' ? '' : (vehicleCode || initialAssignedVehicles?.[0] || ''),
      implementNames: step === 'PENDING' || !implementName ? [] : [implementName],
      driverName: step === 'PENDING' ? '' : (driverName || ''),
      startTime: defaultStart,
      durationHours: defaultDur,
    }];
  });

  const lastOrderIdRef = useRef(currentOrderId);
  const lastStepRef = useRef(step);

  // Tự động đồng bộ khi MỞ LỆNH MỚI hoặc BƯỚC QUY TRÌNH THAY ĐỔI
  useEffect(() => {
    const isNewOrder = lastOrderIdRef.current !== currentOrderId;
    const isStepChanged = lastStepRef.current !== step;

    if (isNewOrder || isStepChanged) {
      lastOrderIdRef.current = currentOrderId;
      lastStepRef.current = step;

      const defaultStart = step === 'PENDING' ? toLocalDateTimeInput() : toLocalDateTimeInput(initialStartTime);
      const defaultDur = initialDurationHours || 8;
      setAssignedTeam([{
        id: `team-${currentOrderId || Date.now()}-0`,
        vehicleCode: vehicleCode || initialAssignedVehicles?.[0] || '',
        implementNames: implementName ? [implementName] : [],
        driverName: driverName || '',
        startTime: defaultStart,
        durationHours: defaultDur,
      }]);
    }
  }, [currentOrderId, step, vehicleCode, driverName, implementName, estimatedVehiclesCount, initialAssignedVehicles, initialStartTime, initialDurationHours, kind]);

  // Lần mở đầu tải ngay; chỉ debounce các lần người dùng thay đổi khung giờ.
  useEffect(() => {
    const scheduleStart = assignedTeam[0]?.startTime;
    const scheduleDuration = assignedTeam[0]?.durationHours;
    const scheduleVehicleCode = assignedTeam[0]?.vehicleCode;
    const scheduleVehicleId = vehicles.find((item) => item.code === scheduleVehicleCode || item.plate === scheduleVehicleCode)?.id;
    if (step !== 'PENDING' || !scheduleStart || !scheduleDuration || scheduleDuration <= 0) return;
    if (firstAvailabilityLoadRef.current) {
      firstAvailabilityLoadRef.current = false;
      void fetchAvailabilityForSchedule(scheduleStart, scheduleDuration, scheduleVehicleId);
      return;
    }
    const timer = setTimeout(() => void fetchAvailabilityForSchedule(scheduleStart, scheduleDuration, scheduleVehicleId), 250);
    return () => clearTimeout(timer);
  }, [assignedTeam, step, vehicles, fetchAvailabilityForSchedule]);

  // Helper lấy danh sách toàn bộ các lệnh đang có (từ props, API và localStorage)
  const getAllOrdersList = useCallback(() => {
    let list: any[] = [];
    if (existingOrders && existingOrders.length > 0) {
      list = [...existingOrders];
    }
    if (databaseOrders && databaseOrders.length > 0) {
      const map = new Map<string, any>();
      list.forEach((o) => map.set(String(o.id || o.code), o));
      databaseOrders.forEach((o) => {
        const k = String(o.id || o.code);
        if (!map.has(k)) map.set(k, o);
      });
      list = Array.from(map.values());
    }
    if (list.length === 0) {
      try {
        const raw = localStorage.getItem('thaco_all_dispatch_orders_master_v4');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) list = parsed;
        }
      } catch (e) {}
    }
    return list;
  }, [existingOrders, databaseOrders]);

  const isOrderCompletedOrAccepted = (status?: string) => {
    if (!status) return false;
    const s = String(status).toUpperCase();
    return ['CANCELLED', 'COMPLETED', 'CLOSED', 'ACCEPTED', 'DELIVERED', 'REJECTED', 'HOAN_THANH'].includes(s);
  };

  const getConflictingOrder = (vCode: string, startIso: string, duration: number) => {
    if (!vCode) return null;
    const targetStart = startIso ? new Date(startIso).getTime() : Date.now();
    const targetEnd = startIso && duration ? targetStart + duration * 3600000 : targetStart + 8 * 3600000;

    const allOrders = getAllOrdersList();

    for (const o of allOrders) {
      if (currentOrderId && String(o.id) === String(currentOrderId)) continue;
      if (isOrderCompletedOrAccepted(o.status)) continue;

      const usesVehicle =
        o.vehicle?.code === vCode ||
        o.vehicleCode === vCode ||
        (Array.isArray(o.assignedVehicleList) && o.assignedVehicleList.includes(vCode)) ||
        (Array.isArray(o.assignedTeamDetails) && o.assignedTeamDetails.some((d: any) => d.vehicleCode === vCode));

      if (!usesVehicle) continue;

      const oStart = o.departureTime ? new Date(o.departureTime).getTime() : 0;
      const oEnd = o.plannedEndTime ? new Date(o.plannedEndTime).getTime() : (oStart > 0 ? oStart + 8 * 3600000 : 0);

      const isCurrentlyActive = ['ASSIGNED', 'DRIVER_ACCEPTED', 'DEPARTED', 'WORKING', 'IN_TRANSIT', 'DA_NHAN', 'DANG_THI_CONG'].includes(o.status);
      const isTimeOverlap = oStart > 0 && oEnd > 0 && targetStart < oEnd && targetEnd > oStart;

      if (isCurrentlyActive || isTimeOverlap) {
        const orderCode = o.code || `Lệnh #${o.id}`;
        const statusText =
          o.status === 'WORKING' || o.status === 'DANG_THI_CONG' || o.status === 'IN_TRANSIT'
            ? 'Đang thi công'
            : o.status === 'DRIVER_ACCEPTED' || o.status === 'DA_NHAN'
            ? 'Đã nhận ca'
            : o.status === 'ASSIGNED' || o.status === 'APPROVED'
            ? 'Đã phân công'
            : 'Đang trong lệnh';

        const timeStr = oStart > 0
          ? `${new Date(oStart).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} - ${oEnd > 0 ? new Date(oEnd).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '...'}`
          : '';

        return {
          orderCode,
          status: o.status,
          statusText,
          timeRange: timeStr,
          purpose: o.purpose || o.taskJobName || 'Đang thực hiện nhiệm vụ',
          reason: `Đang bận tại ${orderCode} (${statusText} - Chưa nghiệm thu)${timeStr ? ` [${timeStr}]` : ''}`,
        };
      }
    }
    return null;
  };

  const getConflictingDriver = (name: string, startIso: string, duration: number) => {
    if (!name) return null;
    const targetStart = startIso ? new Date(startIso).getTime() : Date.now();
    const targetEnd = startIso && duration ? targetStart + duration * 3_600_000 : targetStart + 8 * 3_600_000;

    const allOrders = getAllOrdersList();

    for (const order of allOrders) {
      if (currentOrderId && String(order.id) === String(currentOrderId)) continue;
      if (isOrderCompletedOrAccepted(order.status)) continue;

      const usesDriver =
        order.driver?.fullName === name ||
        order.driver?.name === name ||
        order.driverName === name ||
        (Array.isArray(order.assignedTeamDetails) && order.assignedTeamDetails.some((item: any) => item.driverName === name));

      if (!usesDriver) continue;

      const orderStart = order.departureTime ? new Date(order.departureTime).getTime() : 0;
      const orderEnd = order.plannedEndTime ? new Date(order.plannedEndTime).getTime() : (orderStart > 0 ? orderStart + 8 * 3_600_000 : 0);

      const isCurrentlyActive = ['ASSIGNED', 'DRIVER_ACCEPTED', 'DEPARTED', 'WORKING', 'IN_TRANSIT', 'DA_NHAN', 'DANG_THI_CONG'].includes(order.status);
      const isTimeOverlap = orderStart > 0 && orderEnd > 0 && targetStart < orderEnd && targetEnd > orderStart;

      if (isCurrentlyActive || isTimeOverlap) {
        const orderCode = order.code || `Lệnh #${order.id}`;
        const statusText =
          order.status === 'WORKING' || order.status === 'DANG_THI_CONG' || order.status === 'IN_TRANSIT'
            ? 'Đang thi công'
            : order.status === 'DRIVER_ACCEPTED' || order.status === 'DA_NHAN'
            ? 'Lái xe đã nhận ca'
            : order.status === 'ASSIGNED' || order.status === 'APPROVED'
            ? 'Đã phân công'
            : 'Đang trong lệnh';

        const timeStr = orderStart > 0
          ? `${new Date(orderStart).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} - ${orderEnd > 0 ? new Date(orderEnd).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '...'}`
          : '';

        return {
          id: order.id,
          code: orderCode,
          status: order.status,
          statusText,
          timeRange: timeStr,
          reason: `Đang bận tại ${orderCode} (${statusText} - Chưa nghiệm thu)${timeStr ? ` [${timeStr}]` : ''}`,
        };
      }
    }
    return null;
  };

  const getConflictingImplement = (value: string, startIso: string, duration: number) => {
    if (!value) return null;
    const selected = currentEquipments.find((item) => item.name === value || item.code === value);
    if (!selected || selected.code === 'TB-NONE' || selected.code === 'XE-LIEN-THUNG') return null;

    const targetStart = startIso ? new Date(startIso).getTime() : Date.now();
    const targetEnd = startIso && duration ? targetStart + duration * 3_600_000 : targetStart + 8 * 3_600_000;

    const allOrders = getAllOrdersList();

    for (const order of allOrders) {
      if (currentOrderId && String(order.id) === String(currentOrderId)) continue;
      if (isOrderCompletedOrAccepted(order.status)) continue;

      const usesImplement =
        order.implement?.id === selected.id ||
        order.implement?.code === selected.code ||
        order.implement?.name === selected.name ||
        order.implementName === selected.name ||
        order.trailer?.id === selected.id ||
        order.trailer?.code === selected.code ||
        (Array.isArray(order.assignedTeamDetails) &&
          order.assignedTeamDetails.some((d: any) => d.implementName === selected.name || d.implementCode === selected.code));

      if (!usesImplement) continue;

      const orderStart = order.departureTime ? new Date(order.departureTime).getTime() : 0;
      const orderEnd = order.plannedEndTime ? new Date(order.plannedEndTime).getTime() : (orderStart > 0 ? orderStart + 8 * 3_600_000 : 0);

      const isCurrentlyActive = ['ASSIGNED', 'DRIVER_ACCEPTED', 'DEPARTED', 'WORKING', 'IN_TRANSIT', 'DA_NHAN', 'DANG_THI_CONG'].includes(order.status);
      const isTimeOverlap = orderStart > 0 && orderEnd > 0 && targetStart < orderEnd && targetEnd > orderStart;

      if (isCurrentlyActive || isTimeOverlap) {
        const orderCode = order.code || `Lệnh #${order.id}`;
        const statusText =
          order.status === 'WORKING' || order.status === 'DANG_THI_CONG' || order.status === 'IN_TRANSIT'
            ? 'Đang thi công'
            : 'Chưa nghiệm thu';
        return {
          id: order.id,
          code: orderCode,
          statusText,
          reason: `Đang bận tại ${orderCode} (${statusText} - Chưa nghiệm thu)`,
        };
      }
    }
    return null;
  };

  // Tạo label xe với badge availability thực tế từ API (ưu tiên) hoặc local conflict check (fallback)
  // Tạo label xe với badge availability thực tế từ API (ưu tiên) hoặc local conflict check (fallback)
  // Sắp xếp: Xe sẵn sàng trước (rank 0), sau đó xe bận do đang lái/đang ca (rank 1), sau đó xe sửa chữa/bảo dưỡng (rank 2)
  const getVehicleOptionsForSchedule = (startIso: string, duration: number, currentMemberIndex?: number): SelectOption[] => {
    const list: Array<SelectOption & { rank: number; code: string }> = vehicles.map((item) => {
      // 1. Kiểm tra xem xe đã được chọn ở dòng xe khác trong cùng ca hay chưa
      const otherMemberIndex = assignedTeam.findIndex(
        (m, idx) => idx !== currentMemberIndex && m.vehicleCode?.trim() === item.code.trim()
      );
      if (otherMemberIndex !== -1) {
        const otherMemberNum = otherMemberIndex + 1;
        return {
          value: item.code,
          code: item.code,
          rank: 3,
          label: `🔴 [Đã chọn ở xe #${otherMemberNum}] ${item.code} — ${item.name}${item.plate ? ` [${item.plate}]` : ''}`,
          disabled: true,
          title: `Thiết bị xe máy đã được chọn ở Xe #${otherMemberNum}`,
        };
      }

      // 2. Kiểm tra xe đang trong lệnh khác chưa được nghiệm thu (Đang lái / Đang thi công)
      const conflict = getConflictingOrder(item.code, startIso, duration);
      if (conflict) {
        return {
          value: item.code,
          code: item.code,
          rank: 1, // Đang lái / bận ca
          label: `🔴 [Đang lái] ${item.code} — ${item.name}${item.plate ? ` [${item.plate}]` : ''} [${conflict.reason}]`,
          disabled: true,
          title: `Xe đang thực hiện ${conflict.orderCode} (${conflict.statusText}), chưa được nghiệm thu đóng ca. Không thể chọn.`,
        };
      }

      // 3. Ưu tiên dữ liệu từ API availability
      const apiAvail = item.id < 90000 ? vehicleAvailMap[item.id] : undefined;
      if (apiAvail) {
        const isRepair =
          item.status === 'SUA_CHUA' ||
          item.status === 'BAO_DUONG' ||
          apiAvail.reasons.some((r) => /MAINTENANCE|REPAIR|SUA_CHUA|BAO_DUONG/i.test(r.code) || /sửa chữa|bảo dưỡng/i.test(r.message));

        if (!apiAvail.available) {
          const reasonText = apiAvail.reasons.length > 0 ? apiAvail.reasons.map((r) => r.message).join('; ') : '';
          if (isRepair) {
            return {
              value: item.code,
              code: item.code,
              rank: 2, // Sửa chữa / bảo dưỡng
              label: `🔧 [Sửa chữa] ${item.code} — ${item.name}${item.plate ? ` [${item.plate}]` : ''}${reasonText ? ` [${reasonText.substring(0, 60)}]` : ''}`,
              disabled: true,
              title: reasonText || 'Xe đang sửa chữa hoặc bảo dưỡng định kỳ',
            };
          } else {
            return {
              value: item.code,
              code: item.code,
              rank: 1, // Đang lái / bận lệnh
              label: `🔴 [Đang lái/Bận] ${item.code} — ${item.name}${item.plate ? ` [${item.plate}]` : ''}${reasonText ? ` [${reasonText.substring(0, 60)}]` : ''}`,
              disabled: true,
              title: reasonText || 'Xe đang có lịch công tác trùng giờ',
            };
          }
        }

        const statusIcon = apiAvail.availabilityStatus === 'WARNING' ? '🟡' : '🟢';
        const reasonText = apiAvail.reasons.length > 0 ? apiAvail.reasons.map((r) => r.message).join('; ') : '';
        const label = `${statusIcon} [Sẵn sàng] ${item.code} — ${item.name}${item.plate ? ` [${item.plate}]` : ''}${reasonText ? ` ⚠️ [${reasonText.substring(0, 50)}]` : ''}`;
        return {
          value: item.code,
          code: item.code,
          rank: 0, // Sẵn sàng
          label,
          disabled: false,
          title: reasonText || label,
        };
      }

      // 4. Fallback kiểm tra trạng thái tĩnh
      if (item.status === 'SUA_CHUA' || item.status === 'BAO_DUONG') {
        return {
          value: item.code,
          code: item.code,
          rank: 2,
          label: `🔧 [Sửa chữa] ${item.code} — ${item.name}${item.plate ? ` [${item.plate}]` : ''} [${item.status}]`,
          disabled: true,
          title: `Xe đang ở trạng thái ${item.status}`,
        };
      }

      return {
        value: item.code,
        code: item.code,
        rank: 0,
        label: `🟢 [Sẵn sàng] ${item.code} — ${item.name}${item.plate ? ` [${item.plate}]` : ''}`,
        disabled: false,
        title: 'Sẵn sàng điều phối',
      };
    });

    // Sắp xếp: Sẵn sàng (0) -> Đang lái/Bận ca (1) -> Sửa chữa/Bảo dưỡng (2) -> Đã gán (3)
    return list.sort((a, b) => {
      if (a.rank !== b.rank) return a.rank - b.rank;
      return a.code.localeCompare(b.code);
    });
  };

  const getSelectedVehicle = (vehicleValue: string) =>
    vehicles.find((item) => item.code === vehicleValue || item.plate === vehicleValue);

  const getImplementRequirement = (vehicleValue: string): 'NONE' | 'OPTIONAL' | 'REQUIRED' =>
    getSelectedVehicle(vehicleValue)?.vehicleType?.implementRequirement ?? 'NONE';

  const getEquipmentOptionsForSchedule = (scheduleStart: string, scheduleDuration: number, vehicleValue: string, currentMemberIndex?: number): SelectOption[] => {
    const vehicle = getSelectedVehicle(vehicleValue);
    const vehicleTypeId = vehicle?.vehicleTypeId ?? vehicle?.vehicleType?.id;
    if (!vehicleTypeId || getImplementRequirement(vehicleValue) === 'NONE') return [];

    return currentEquipments
      .filter((item) => item.usageMode === 'ATTACHABLE')
      .filter((item) => !item.selection?.reasons.some((reason) => reason.code === 'IMPLEMENT_CATEGORY_MISMATCH'))
      .filter((item) => item.compatibleVehicleTypes?.some((compatibility) => compatibility.vehicleTypeId === vehicleTypeId))
      .map((item) => {
        // 1. Kiểm tra xem phụ kiện đã được gắn ở xe khác trong ca hay chưa
        const otherMemberIndex = assignedTeam.findIndex(
          (m, idx) =>
            idx !== currentMemberIndex &&
            m.implementNames.some((name) => name.trim() === item.name.trim() || name.trim() === item.code.trim())
        );
        if (otherMemberIndex !== -1) {
          const otherMemberNum = otherMemberIndex + 1;
          return {
            value: item.name,
            label: `🔴 ${item.code} — ${item.name} [Đã gắn ở xe #${otherMemberNum}]`,
            disabled: true,
            title: `Phụ kiện / nông cụ đã được gắn ở Xe #${otherMemberNum}`,
          };
        }

        // 2. Kiểm tra phụ kiện đang trong lệnh khác chưa được nghiệm thu hoặc bảo dưỡng
        const conflict = getConflictingImplement(item.name, scheduleStart, scheduleDuration);
        const selectionReasons = item.selection?.reasons ?? [];
        const unavailable = item.selection?.selectable === false || item.status === 'MAINTENANCE' || (item.technicalCondition && item.technicalCondition !== 'GOOD');
        if (conflict || unavailable) {
          const reason = selectionReasons.map((item) => item.message).join('; ');
          return {
            value: item.name,
            label: `🔴 ${item.code} — ${item.name} [${conflict ? conflict.reason : reason || 'Đang bảo dưỡng/Không đủ điều kiện'}]`,
            disabled: true,
            title: conflict ? conflict.reason : reason || 'Nông cụ không đủ điều kiện vận hành.',
          };
        }

        return {
          value: item.name,
          label: `🟢 ${item.code} — ${item.name}`,
          disabled: false,
          title: 'Sẵn sàng gắn vào phương tiện',
        };
      });
  };

  const isDriverEligibleForAgriculture = (driver: DatabaseDriver): boolean => {
    const lic = String((driver as any).driverProfile?.licenseClass || driver.licenseClass || '').toUpperCase();
    const notes = String((driver as any).notes || '').toLowerCase();

    // 1. Bằng chính là Hạng B (B2, B1), Hạng A4 hoặc bằng/chứng chỉ máy nông nghiệp, máy kéo
    const hasB = lic.includes('B2') || lic.includes('B1') || lic === 'HANG_B' || lic.includes('HẠNG B') || lic.includes('A4') || lic.includes('NONG_NGHIEP') || lic.includes('MÁY KÉO') || lic.includes('MÁY CÀY');
    if (hasB) return true;

    // 2. Bằng chính là Hạng C, CE hoặc FC: chỉ hợp lệ nếu có thêm bằng Hạng B / chứng chỉ máy nông nghiệp
    const isC = lic.includes('HANG_C') || lic.includes('HẠNG C') || lic.includes('HANG_CE') || lic.includes('HẠNG CE') || lic.includes('HANG_FC') || lic.includes('HẠNG FC');
    const hasAddB = notes.includes('b2') || notes.includes('b1') || notes.includes('hạng b') || notes.includes('máy cày') || notes.includes('máy kéo') || notes.includes('bằng b') || notes.includes('a4');
    if (isC) {
      return hasAddB;
    }

    return hasAddB;
  };

  const getDriverOptionsForSchedule = (scheduleStart: string, scheduleDuration: number, currentMemberIndex?: number, vehicleValue?: string): SelectOption[] => {
    const vObj = getSelectedVehicle(vehicleValue || assignedTeam[currentMemberIndex || 0]?.vehicleCode || '');
    const isAgriContext = kind === 'AGRICULTURE' || vObj?.category === 'MAY_CAY' || vObj?.category === 'MAY_KEO' || vObj?.vehicleType?.operationalDomain === 'AGRICULTURE';

    // Lọc danh sách: Khi lái máy nông nghiệp, chỉ đưa người có bằng Hạng B (hoặc người có bằng C nhưng có thêm bằng B)
    const eligibleDrivers = isAgriContext
      ? drivers.filter(isDriverEligibleForAgriculture)
      : drivers;

    const list: Array<SelectOption & { rank: number; name: string }> = eligibleDrivers.map((item) => {
      // 1. Kiểm tra xem thợ máy / lái xe đã được phân công ở xe khác trong ca hay chưa
      const otherMemberIndex = assignedTeam.findIndex(
        (m, idx) => idx !== currentMemberIndex && m.driverName?.trim() === item.fullName.trim()
      );
      if (otherMemberIndex !== -1) {
        const otherMemberNum = otherMemberIndex + 1;
        return {
          value: item.fullName,
          name: item.fullName,
          rank: 2,
          label: `🔴 [Đã chọn ở xe #${otherMemberNum}] ${item.fullName} — ${item.licenseClass || 'Chứng chỉ nghề'}${item.phone ? ` (${item.phone})` : ''}`,
          disabled: true,
          title: `Thợ máy / Lái xe đã được phân công ở Xe #${otherMemberNum}`,
        };
      }

      // 2. Kiểm tra tài xế đang trong lệnh khác chưa được nghiệm thu
      const conflict = getConflictingDriver(item.fullName, scheduleStart, scheduleDuration);
      if (conflict) {
        return {
          value: item.fullName,
          name: item.fullName,
          rank: 1,
          label: `🔴 [Đang bận ca] ${item.fullName} — ${item.licenseClass || 'Chứng chỉ nghề'}${item.phone ? ` (${item.phone})` : ''} [${conflict.reason}]`,
          disabled: true,
          title: `Tài xế đang bận tại ${conflict.code} (${conflict.statusText}), chưa được nghiệm thu đóng ca. Không thể chọn.`,
        };
      }

      // 3. Ưu tiên dữ liệu từ API availability
      const apiAvail = item.id < 90000 ? driverAvailMap[item.id] : undefined;
      if (apiAvail) {
        const statusIcon = apiAvail.availabilityStatus === 'AVAILABLE' ? '🟢' : apiAvail.availabilityStatus === 'WARNING' ? '🟡' : '🔴';
        const reasonText = apiAvail.reasons.length > 0 ? apiAvail.reasons.map((r) => r.message).join('; ') : '';
        const rank = apiAvail.available ? 0 : 1;
        return {
          value: item.fullName,
          name: item.fullName,
          rank,
          label: `${statusIcon} [${apiAvail.available ? 'Sẵn sàng' : 'Đang bận'}] ${item.fullName} — ${item.licenseClass || 'Chứng chỉ nghề'}${item.phone ? ` (${item.phone})` : ''}${reasonText ? ` ⚠️ [${reasonText.substring(0, 50)}]` : ''}`,
          disabled: !apiAvail.available,
          title: reasonText || undefined,
        };
      }

      // 4. Sẵn sàng điều phối
      return {
        value: item.fullName,
        name: item.fullName,
        rank: 0,
        label: `🟢 [Sẵn sàng] ${item.fullName} — ${item.licenseClass || 'Chứng chỉ nghề'}${item.phone ? ` (${item.phone})` : ''}`,
        disabled: false,
        title: 'Sẵn sàng điều phối',
      };
    });

    return list.sort((a, b) => {
      if (a.rank !== b.rank) return a.rank - b.rank;
      return a.name.localeCompare(b.name);
    });
  };

  const selectedVehicleBlocked = (code: string, scheduleStart: string, scheduleDuration: number) => {
    const resource = vehicles.find((item) => item.code === code);
    const apiResult = resource ? vehicleAvailMap[resource.id] : undefined;
    return apiResult ? !apiResult.available : Boolean(getConflictingOrder(code, scheduleStart, scheduleDuration));
  };

  const selectedDriverBlocked = (name: string, scheduleStart: string, scheduleDuration: number) => {
    const resource = drivers.find((item) => item.fullName === name);
    const apiResult = resource ? driverAvailMap[resource.id] : undefined;
    return apiResult ? !apiResult.available : Boolean(getConflictingDriver(name, scheduleStart, scheduleDuration));
  };

  const selectedImplementsBlocked = (values: string[], scheduleStart: string, scheduleDuration: number) => {
    return values.some((value) => {
      const resource = currentEquipments.find((item) => item.name === value || item.code === value);
      return Boolean(
        getConflictingImplement(value, scheduleStart, scheduleDuration) ||
        resource?.selection?.selectable === false ||
        resource?.status === 'MAINTENANCE' ||
        (resource?.technicalCondition && resource.technicalCondition !== 'GOOD'),
      );
    });
  };

  // Cập nhật thông tin phân công xe (xe, nông cụ, thợ lái, giờ bắt đầu, số giờ ca)
  const handleUpdateMember = (index: number, field: keyof AssignedTeamMember, value: any) => {
    setAssignedTeam((prev) => {
      const next = [...prev];
      if (next[0]) {
        next[0] = {
          ...next[0],
          [field]: value,
          ...(field === 'driverName' ? { vehicleCode: '', implementNames: [] } : {}),
          ...(field === 'vehicleCode' ? { implementNames: [] } : {}),
        };
      }
      return next;
    });
  };

  const addImplement = (index: number, value: string) => {
    if (!value) return;
    setAssignedTeam((prev) => prev.map((member, memberIndex) =>
      memberIndex === index && !member.implementNames.includes(value)
        ? { ...member, implementNames: [...member.implementNames, value] }
        : member
    ));
  };

  const removeImplement = (index: number, value: string) => {
    setAssignedTeam((prev) => prev.map((member, memberIndex) =>
      memberIndex === index
        ? { ...member, implementNames: member.implementNames.filter((name) => name !== value) }
        : member
    ));
  };

  const calculateEndTimeFormatted = (startIso: string, hours: number) => {
    const s = new Date(startIso);
    if (Number.isNaN(s.getTime())) return '—';
    const e = new Date(s.getTime() + hours * 3600000);
    return `${e.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} ngày ${e.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}`;
  };

  // Tính toán dự toán nhiên liệu theo từng xe và tổng hợp toàn tổ xe
  const teamFuelCalculations = useMemo(() => {
    return assignedTeam.map((m) => {
      const v = getSelectedVehicle(m.vehicleCode);
      const rate = getVehicleFuelQuotaRate(v, kind);
      const hours = Number(m.durationHours) || 8;
      const fuel = v && rate > 0 ? Number((hours * rate).toFixed(1)) : 0;
      return { vehicle: v, rate, hours, fuel };
    });
  }, [assignedTeam, vehicles, kind]);

  const totalEstimatedFuel = useMemo(() => {
    const sum = teamFuelCalculations.reduce((acc, cur) => acc + cur.fuel, 0);
    return sum > 0 ? Number(sum.toFixed(1)) : undefined;
  }, [teamFuelCalculations]);

  const totalAssignedHours = useMemo(() => {
    return assignedTeam.reduce((acc, cur) => acc + (Number(cur.durationHours) || 0), 0);
  }, [assignedTeam]);

  const onVehicleScheduleChangeRef = useRef(onVehicleScheduleChange);
  useEffect(() => {
    onVehicleScheduleChangeRef.current = onVehicleScheduleChange;
  });

  useEffect(() => {
    if (onVehicleScheduleChangeRef.current) {
      const leadVehicle = getSelectedVehicle(assignedTeam[0]?.vehicleCode);
      const leadDuration = Number(assignedTeam[0]?.durationHours) || 8;
      const leadRate = getVehicleFuelQuotaRate(leadVehicle, kind);
      onVehicleScheduleChangeRef.current({
        vehicle: leadVehicle,
        durationHours: leadDuration,
        plannedFuelLiters: totalEstimatedFuel,
        fuelQuotaRate: leadRate > 0 ? `${leadRate} L/h` : undefined,
      });
    }
  }, [assignedTeam, totalEstimatedFuel, kind]);

  const approve = async () => {
    if (assignedTeam.length === 0 || approving) return;

    // Chuẩn bị toàn bộ tổ máy kèm khung giờ độc lập của từng xe
    const teamList = assignedTeam.map((m, idx) => {
      const v = vehicles.find((item) => item.code === m.vehicleCode) || { id: 95000 + idx, code: m.vehicleCode, name: m.vehicleCode };
      const d = drivers.find((item) => item.fullName === m.driverName) || { id: 93000 + idx, fullName: m.driverName, licenseClass: 'Chứng chỉ thợ máy' };
      const implementsList = m.implementNames
        .map((name) => currentEquipments.find((item) => item.name === name || item.code === name))
        .filter((item): item is DatabaseImplement => Boolean(item));
      const vRate = getVehicleFuelQuotaRate(v, kind);

      const mStart = new Date(m.startTime);
      const mDur = Number(m.durationHours) || 8;
      const mEnd = new Date(mStart.getTime() + mDur * 3600000);

      return {
        vehicle: { id: v.id, code: v.code, name: v.name, fuelQuotaRate: vRate, fuelQuotaUnit: 'L_PER_HOUR' },
        driver: { id: d.id, name: d.fullName, license: d.licenseClass || 'Chứng chỉ nghề' },
        implement: implementsList[0] ? { id: implementsList[0].id, code: implementsList[0].code, name: implementsList[0].name } : undefined,
        implements: implementsList.map((item) => ({ id: item.id, code: item.code, name: item.name })),
        schedule: {
          startTime: mStart.toISOString(),
          endTime: mEnd.toISOString(),
          durationHours: mDur,
        },
      };
    });

    const lead = teamList[0];
    setApproving(true);
    try {
      await onApprove(lead.vehicle, lead.driver, lead.schedule, lead.implement, teamList);
    } finally {
      setApproving(false);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 space-y-4 shadow-xs">
      {/* Header trạng thái */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
        <div>
          <h4 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-900">
            {config.title}
          </h4>
          <p className="text-[11.5px] text-slate-500 font-normal mt-0.5">
            {config.subtitle}
          </p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700 border border-slate-200 shadow-2xs">
          {step === 'PENDING'
            ? '📌 Bước 1/3: Chờ duyệt & Phân công'
            : step === 'APPROVED'
            ? '🚚 Bước 2/3: Đã phân công - Chờ nhận ca'
            : step === 'RECEIVED'
            ? '⚡ Bước 3/3: Đang thi công ngoài hiện trường'
            : '✅ Đã hoàn thành & Nghiệm thu'}
        </span>
      </div>

      {/* Form Phân công khi đang ở bước PENDING (Hỗ trợ 1 hoặc nhiều xe cho mọi phân hệ) */}
      {step === 'PENDING' && (
        <div className="space-y-4">
          {recommendationWorkOrderId && <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-3">
            <div className="mb-2 flex items-center justify-between"><span className="text-xs font-extrabold text-blue-900">Gợi ý xe đến sớm nhất</span><span className="text-[11px] text-blue-700">{loadingRecommendations ? 'Đang tính ETA...' : `${recommendations.length} xe phù hợp · ${excludedRecommendationCount} xe bị loại`}</span></div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{recommendations.slice(0, 6).map((item) => <button type="button" key={item.vehicle.id} disabled={!assignedTeam[0]?.driverName} title={!assignedTeam[0]?.driverName ? 'Chọn tài xế trước khi chọn xe' : undefined} onClick={() => handleUpdateMember(0, 'vehicleCode', item.vehicle.code)} className={`rounded-lg border bg-white p-2 text-left text-xs transition hover:border-blue-500 disabled:cursor-not-allowed disabled:opacity-50 ${item.feasible ? 'border-blue-100' : 'border-amber-300'}`}><div className="flex items-center justify-between gap-2"><b>{item.vehicle.code}</b><span className={item.availability === 'AVAILABLE_NOW' ? 'text-emerald-700' : 'text-amber-700'}>{item.availability === 'AVAILABLE_NOW' ? 'Đang rảnh' : 'Sắp xong'}</span></div><div className="mt-1 text-slate-600">{item.etaMinutes ? `${item.etaMinutes} phút · ${item.distanceKm ?? '—'} km` : 'Chưa đủ tọa độ'}</div><div className="mt-1 text-[10px] text-slate-500">{item.positionSource === 'VEHICLE_GPS' ? 'GPS xe' : item.positionSource === 'PHOTO_EXIF' ? 'Ảnh EXIF' : item.positionSource === 'HOME_DEPOT' ? 'Theo bãi' : item.positionSource === 'TASK_DESTINATION' ? 'Điểm nhiệm vụ hiện tại' : 'Theo khu vực'} · {item.etaSource === 'ROUTING' ? 'ETA tuyến đường' : item.etaSource === 'HAVERSINE' ? 'ETA ước tính' : 'Chưa có ETA'} · Tin cậy {item.confidence === 'HIGH' ? 'cao' : item.confidence === 'MEDIUM' ? 'vừa' : 'thấp'}</div>{item.warnings[0] && <div className="mt-1 text-[10px] font-semibold text-amber-700">{item.warnings[0]}</div>}</button>)}</div>
          </div>}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Tractor className="h-4 w-4 text-emerald-600" />
                <span>Phương tiện & Thợ máy thực hiện lệnh (1 xe):</span>
              </span>
            </div>
          </div>

          {/* Chi tiết phân công xe (1 lệnh = 1 xe duy nhất) */}
          <div className="space-y-4">
            {assignedTeam.slice(0, 1).map((member, index) => {
              const isLead = true;
              const vObj = getSelectedVehicle(member.vehicleCode);
              const vRate = getVehicleFuelQuotaRate(vObj, kind);
              const mDur = Number(member.durationHours) || 8;
              const vFuel = vObj && vRate > 0 ? Number((mDur * vRate).toFixed(1)) : 0;
              const conflict = getConflictingOrder(member.vehicleCode, member.startTime, member.durationHours);

              const vehicleOpts = getVehicleOptionsForSchedule(member.startTime, member.durationHours, index);
              const availVehiclesCount = vehicleOpts.filter((o) => !o.disabled).length;
              const totalVehiclesCount = vehicleOpts.length;

              const implementOpts = getEquipmentOptionsForSchedule(member.startTime, member.durationHours, member.vehicleCode, index);
              const availImplementsCount = implementOpts.filter((o) => !o.disabled).length;
              const totalImplementsCount = implementOpts.length;

              const driverOpts = getDriverOptionsForSchedule(member.startTime, member.durationHours, index, member.vehicleCode);
              const availDriversCount = driverOpts.filter((o) => !o.disabled).length;
              const totalDriversCount = driverOpts.length;

              return (
                <div
                  key={member.id}
                  className="p-3.5 rounded-xl border border-slate-200 bg-white transition-all space-y-2.5 shadow-2xs"
                >
                  {/* Header thẻ xe */}
                  <div className="flex items-center justify-between pb-2.5 border-b border-slate-200/70">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-extrabold px-2.5 py-1 rounded-lg bg-emerald-700 text-white shadow-2xs">
                        Phương tiện phân công
                      </span>
                      {loadingResources && <span className="text-[11px] font-semibold text-blue-700">Đang tải nguồn lực...</span>}
                      {resourceLoadFailed && <span className="text-[11px] font-semibold text-rose-700">Không tải được nguồn lực từ hệ thống. Vui lòng thử lại.</span>}
                      {member.vehicleCode && (
                        <span className="text-xs font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          {member.vehicleCode}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* DÒNG 1: THỜI GIAN CA MÁY (COMPACT 1 HÀNG) */}
                  <div className="flex flex-wrap items-center justify-between gap-2 p-2 rounded-xl bg-white border border-slate-200 text-xs">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Clock className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span className="text-[11px] font-bold text-slate-700 shrink-0">Ca máy:</span>
                      <input
                        type="datetime-local"
                        value={member.startTime}
                        onChange={(e) => handleUpdateMember(index, 'startTime', e.target.value)}
                        className="h-7 rounded-lg border border-slate-300 bg-white px-2 text-[11px] font-semibold text-slate-800 shadow-2xs focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                      <button
                        type="button"
                        onClick={() => handleUpdateMember(index, 'startTime', toLocalDateTimeInput())}
                        title="Chỉnh về ngày giờ hiện tại"
                        className="h-7 px-1.5 rounded-lg border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-[10.5px] font-bold text-emerald-800 shrink-0 cursor-pointer"
                      >
                        Hiện tại
                      </button>
                      <input
                        type="number"
                        min="0.5"
                        step="0.5"
                        value={member.durationHours}
                        onChange={(e) => handleUpdateMember(index, 'durationHours', Math.max(0.5, Number(e.target.value)))}
                        className="w-12 h-7 rounded-lg border border-slate-300 bg-white text-center text-[11px] font-extrabold text-slate-900 shadow-2xs focus:border-primary focus:outline-none"
                      />
                      <span className="text-[11px] text-slate-500 font-medium">giờ</span>
                    </div>

                    <div className="flex items-center gap-1">
                      {[4, 8, 10, 12].map((h) => (
                        <button
                          key={h}
                          type="button"
                          onClick={() => handleUpdateMember(index, 'durationHours', h)}
                          className={`h-6 px-2 rounded text-[10.5px] font-bold transition-all ${
                            member.durationHours === h
                              ? 'bg-slate-900 text-white shadow-2xs'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          }`}
                        >
                          {h}h
                        </button>
                      ))}

                    </div>
                  </div>

                  {/* DÒNG 2: LƯỚI 3 CỘT NGANG (THỢ LÁI | XE MÁY | PHỤ KIỆN) */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                    {/* Cột 1: Chọn Thợ máy vận hành / Lái xe */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-800 flex items-center justify-between">
                        <span className="flex items-center gap-1">
                          <UserCheck className="h-3.5 w-3.5 text-indigo-600" />
                          <span>1. Thợ máy / Lái xe:</span>
                          <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200/80 font-mono" title="Số thợ máy/lái xe sẵn sàng / Tổng số thợ máy đủ điều kiện">
                            {loadingResources ? '(...)' : `(${availDriversCount}/${totalDriversCount})`}
                          </span>
                        </span>
                        {member.driverName && (
                          <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-1.5 rounded truncate max-w-[120px]">
                            {member.driverName}
                          </span>
                        )}
                      </label>
                      <SearchableSelect
                        value={member.driverName}
                        onChange={(val) => handleUpdateMember(index, 'driverName', val)}
                        options={driverOpts}
                        disabled={loadingResources}
                        allowCustomInput={false}
                        placeholder={loadingResources ? 'Đang tải danh sách tài xế...' : '-- Chọn thợ máy / lái xe --'}
                        heightClass="h-9"
                        roundedClass="rounded-lg"
                        bgClass="bg-white"
                        className="w-full"
                        inputClassName="text-xs font-semibold text-slate-900 border-slate-300 shadow-2xs"
                        emptyOptionLabel="-- Chọn thợ máy / lái xe --"
                        emptyValue=""
                      />
                    </div>

                    {/* Cột 2: Chọn Phương tiện / Thiết bị xe máy */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-800 flex items-center justify-between">
                        <span className="flex items-center gap-1">
                          <Tractor className="h-3.5 w-3.5 text-emerald-600" />
                          <span>2. Thiết bị xe máy:</span>
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/80 font-mono" title="Số xe đúng nhóm có thể hoạt động / Tổng số xe đúng nhóm">
                            {loadingResources ? '(...)' : `(${availVehiclesCount}/${totalVehiclesCount})`}
                          </span>
                        </span>
                        {member.vehicleCode && (
                          <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 px-1.5 rounded">
                            {member.vehicleCode}
                          </span>
                        )}
                      </label>
                      <SearchableSelect
                        value={member.vehicleCode}
                        onChange={(val) => handleUpdateMember(index, 'vehicleCode', val)}
                        options={vehicleOpts}
                        disabled={loadingResources || !member.driverName}
                        allowCustomInput={false}
                        placeholder={!member.driverName ? '-- Chọn tài xế trước --' : '-- Chọn xe máy --'}
                        heightClass="h-9"
                        roundedClass="rounded-lg"
                        bgClass="bg-white"
                        className="w-full"
                        inputClassName="text-xs font-semibold text-slate-900 border-slate-300 shadow-2xs"
                        emptyOptionLabel="-- Chọn xe máy --"
                        emptyValue=""
                      />
                    </div>

                    {/* Cột 3: Chọn nhiều Phụ kiện / Đầu công tác gắn kèm */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-800 flex items-center justify-between">
                        <span className="flex items-center gap-1">
                          <Wrench className="h-3.5 w-3.5 text-blue-600" />
                          <span>3. Phụ kiện gắn kèm:</span>
                          <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200/80 font-mono" title="Số phụ kiện đúng nhóm và tương thích / Tổng số phụ kiện tương thích">
                            {loadingResources ? '(...)' : `(${availImplementsCount}/${totalImplementsCount})`}
                          </span>
                        </span>
                        {member.implementNames.length > 0 ? (
                          <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-1.5 rounded">
                            Đã chọn {member.implementNames.length}
                          </span>
                        ) : getSelectedVehicle(member.vehicleCode) ? (
                          <Link to={buildAttachedEquipmentUrl(getSelectedVehicle(member.vehicleCode)?.id || '')} className="text-[10px] font-semibold text-blue-700 hover:underline">
                            Đang gắn ➔
                          </Link>
                        ) : null}
                      </label>
                      <SearchableSelect
                        value=""
                        onChange={(val) => addImplement(index, val)}
                        options={implementOpts.filter((option) => !member.implementNames.includes(option.value))}
                        disabled={!member.vehicleCode || getImplementRequirement(member.vehicleCode) === 'NONE'}
                        placeholder={!member.vehicleCode ? '-- Chọn xe trước --' : member.implementNames.length ? '+ Chọn thêm thiết bị...' : '-- Chọn phụ kiện / moóc --'}
                        heightClass="h-9"
                        roundedClass="rounded-lg"
                        bgClass="bg-white"
                        className="w-full"
                        inputClassName="text-xs font-semibold text-slate-900 border-slate-300 shadow-2xs"
                        emptyOptionLabel={member.implementNames.length ? '+ Chọn thêm thiết bị...' : '-- Chọn phụ kiện / moóc --'}
                        emptyValue=""
                      />
                      {member.implementNames.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-0.5">
                          {member.implementNames.map((name) => {
                            const item = currentEquipments.find((equipment) => equipment.name === name || equipment.code === name);
                            return (
                              <span key={name} className="inline-flex max-w-full items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2 py-1 text-[10px] font-bold text-blue-900">
                                <span className="truncate">{item ? `${item.code} — ${item.name}` : name}</span>
                                <button type="button" onClick={() => removeImplement(index, name)} className="text-slate-400 hover:text-rose-600" title="Bỏ thiết bị">×</button>
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* DÒNG 3: DỰ TOÁN NHIÊN LIỆU & CẢNH BÁO TRÙNG (COMPACT) */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
                    {vObj ? (
                      <div className="flex items-center gap-2 text-purple-950">
                        <Fuel className="h-3.5 w-3.5 text-purple-600 shrink-0" />
                        <span>Dầu dự toán xe #{index + 1}: <b className="text-purple-700 font-extrabold">{vFuel} Lít</b></span>
                        <span className="text-[10.5px] text-purple-800 bg-purple-100/70 px-1.5 py-0.5 rounded border border-purple-200">
                          {vRate} L/h × {mDur}h
                        </span>
                      </div>
                    ) : (
                      <span className="text-[11px] text-slate-400 italic">Vui lòng chọn thiết bị xe máy</span>
                    )}

                    <span className="text-[11px] text-slate-500">
                      Kết thúc ca: <b>{calculateEndTimeFormatted(member.startTime, member.durationHours)}</b>
                    </span>
                  </div>

                  {/* Cảnh báo trùng xe */}
                  {conflict && (
                    <div className="p-2 rounded-lg bg-amber-50 border border-amber-300 text-[11px] text-amber-900 flex items-center gap-2">
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                      <span><b>Trùng xe {member.vehicleCode}:</b> Đã có ca {conflict.timeRange} ở {conflict.orderCode}. Vui lòng đổi xe hoặc khung giờ!</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* BANNER TỔNG HỢP & NÚT PHÊ DUYỆT (COMPACT TRÊN 1 KHỐI GỌN GÀNG) */}
          <div className="p-3 rounded-xl bg-gradient-to-r from-purple-50 via-purple-50/50 to-indigo-50 border border-purple-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-purple-600 text-white shadow-2xs">
                <Fuel className="h-4 w-4" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-slate-600 text-xs font-semibold">
                  Dự toán nhiên liệu ca (<b>1 xe</b>, <b>{totalAssignedHours}h</b>):
                </span>
                <span className="text-purple-900 font-black text-lg sm:text-xl">
                  {totalEstimatedFuel !== undefined ? `${totalEstimatedFuel} Lít` : 'Chưa đủ dữ liệu'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                disabled={
                  loadingResources || fetchingAvailability || approving ||
                  assignedTeam.length === 0 ||
                  assignedTeam.some((m) => !m.vehicleCode || !m.driverName || !m.startTime || m.durationHours <= 0 || (getImplementRequirement(m.vehicleCode) === 'REQUIRED' && m.implementNames.length === 0) || selectedVehicleBlocked(m.vehicleCode, m.startTime, m.durationHours) || selectedDriverBlocked(m.driverName, m.startTime, m.durationHours) || selectedImplementsBlocked(m.implementNames, m.startTime, m.durationHours))
                }
                icon={<ClipboardCheck className="h-4 w-4" />}
                className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs px-4 py-1.5 rounded-lg shadow-2xs cursor-pointer"
                onClick={approve}
              >
                {approving ? 'Đang phê duyệt...' : 'Phê duyệt & Phát hành lệnh'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Các bước tiếp theo trong quy trình */}
      {step === 'APPROVED' && (
        <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
          <div>
            <p className="text-xs font-bold text-slate-800">
              Lệnh đã được duyệt và chuyển thông báo đến ứng dụng di động của lái xe / thợ máy.
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Tài xế bấm nút bên phải để xác nhận tiếp nhận lệnh điều xe vào ca.
            </p>
          </div>
          {onReceive ? (
            <Button
              size="md"
              icon={<UserCheck className="h-4 w-4" />}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs"
              onClick={onReceive}
            >
              Tài xế xác nhận nhận việc
            </Button>
          ) : (
            <span className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-[11px] font-bold text-blue-800">
              Chờ tài xế xác nhận trên ứng dụng di động
            </span>
          )}
        </div>
      )}

      {step === 'RECEIVED' && (
        <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
          <div>
            <p className="text-xs font-bold text-slate-800">
              Phương tiện đang hoạt động trên lô thửa / tuyến đường theo kế hoạch.
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Khi hoàn thành khối lượng ca, cán bộ kỹ thuật nông trường bấm nghiệm thu để đóng lệnh.
            </p>
          </div>
          {onComplete ? (
            <Button
              size="md"
              icon={<CheckCircle2 className="h-4 w-4" />}
              className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs"
              onClick={onComplete}
            >
              Nghiệm thu & Hoàn thành ca máy
            </Button>
          ) : (
            <span className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] font-bold text-emerald-800">
              Nghiệm thu tại hàng đợi sau khi tài xế hoàn tất ca
            </span>
          )}
        </div>
      )}

      {step === 'COMPLETED' && (
        <div className="flex items-center gap-2 bg-emerald-50/80 p-3 rounded-xl text-xs font-bold text-emerald-900 border border-emerald-200">
          <CheckCircle2 className="h-4 w-4 text-emerald-700 shrink-0" />
          <span>Ca máy đã hoàn thành và được nghiệm thu khối lượng thành công. Lệnh đã chuyển sang trạng thái đóng.</span>
        </div>
      )}
    </div>
  );
};
