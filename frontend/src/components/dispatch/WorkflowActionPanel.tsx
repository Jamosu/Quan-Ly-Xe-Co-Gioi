import React, { useEffect, useMemo, useState } from 'react';
import { CalendarClock, CheckCircle2, ClipboardCheck, Timer, Tractor, Truck, UserCheck, Wrench, AlertTriangle, Plus, Trash2 } from 'lucide-react';
import { Button } from '../common/Button';
import { SearchableSelect, type SelectOption } from '../common/SearchableSelect';
import { apiClient } from '../../api/client';

export type DemoOrderKind = 'AGRICULTURE' | 'CONSTRUCTION' | 'TRANSPORT';
export type DemoWorkflowStep = 'PENDING' | 'APPROVED' | 'RECEIVED' | 'COMPLETED';

export interface AssignedTeamMember {
  id: string;
  vehicleCode: string;
  implementName: string;
  driverName: string;
  startTime: string;
  durationHours: number;
}

interface DatabaseVehicle {
  id: number;
  code: string;
  plate?: string;
  name: string;
  status: string;
  unit?: string;
  category?: string;
  vehicleType?: { name?: string; code?: string };
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

interface WorkflowActionPanelProps {
  kind: DemoOrderKind;
  step: DemoWorkflowStep;
  taskName: string;
  vehicleCode?: string;
  driverName?: string;
  implementName?: string;
  initialStartTime?: string;
  initialDurationHours?: number;
  unit?: string;
  estimatedVehiclesCount?: number;
  initialAssignedVehicles?: string[];
  currentOrderId?: number | string;
  existingOrders?: Array<any>;
  onApprove: (
    vehicle: { id: number; code: string; name: string },
    driver: { id: number; name: string; license: string },
    schedule: { startTime: string; endTime: string; durationHours: number },
    implement?: { id: number | string; code: string; name: string },
    team?: Array<{
      vehicle: { id: number; code: string; name: string };
      driver: { id: number; name: string; license: string };
      implement?: { id: number | string; code: string; name: string };
      schedule?: { startTime: string; endTime: string; durationHours: number };
    }>,
  ) => void;
  onReceive: () => void;
  onComplete: () => void;
}

const DEMO_FALLBACK_VEHICLES: Record<DemoOrderKind, DatabaseVehicle[]> = {
  AGRICULTURE: [
    { id: 92001, code: 'MK-75-01', plate: '70A-001.23', name: 'Máy kéo New Holland TT4.75 (75HP)', status: 'CHO_PHAN_CONG', category: 'MAY_KEO' },
    { id: 92002, code: 'MK-90-02', plate: '70A-002.45', name: 'Máy kéo Kubota M9540 (95HP)', status: 'CHO_PHAN_CONG', category: 'MAY_KEO' },
    { id: 92003, code: 'MK-50-05', plate: '70A-005.67', name: 'Máy kéo Kubota L5018 (50HP)', status: 'CHO_PHAN_CONG', category: 'MAY_KEO' },
    { id: 92004, code: 'MK-50-08', plate: '70A-008.89', name: 'Máy kéo John Deere 5050D (50HP)', status: 'CHO_PHAN_CONG', category: 'MAY_KEO' },
    { id: 92005, code: 'MK-50-12', plate: '70A-012.01', name: 'Máy kéo New Holland TT4.55 (55HP)', status: 'CHO_PHAN_CONG', category: 'MAY_KEO' },
    { id: 92006, code: 'MK-BC-01', plate: '70A-033.11', name: 'Máy kéo bánh cao Kubota Boom 12m', status: 'CHO_PHAN_CONG', category: 'MAY_KEO' },
  ],
  CONSTRUCTION: [
    { id: 92009, code: 'MS-02', plate: '70C-009.11', name: 'Máy san Komatsu GD511A (135HP)', status: 'CHO_PHAN_CONG', category: 'MAY_SAN' },
    { id: 92010, code: 'MX-01', plate: '70C-010.22', name: 'Máy xúc đào Komatsu PC200-8 (Gầu 0.8m³)', status: 'CHO_PHAN_CONG', category: 'MAY_XUC' },
    { id: 92011, code: 'MUI-04', plate: '70C-011.33', name: 'Máy ủi Caterpillar D6 (165HP)', status: 'CHO_PHAN_CONG', category: 'MAY_UI' },
    { id: 92012, code: 'ML-05', plate: '70C-012.44', name: 'Máy lu rung Hamm 3411 (14T)', status: 'CHO_PHAN_CONG', category: 'MAY_LU' },
  ],
  TRANSPORT: [
    { id: 92014, code: '92C-14689', plate: '92C-146.89', name: 'Đầu kéo Hyundai HD1000 (410HP)', status: 'CHO_PHAN_CONG', category: 'DAU_KEO' },
    { id: 92015, code: 'XT-BEN-01', plate: '92C-088.32', name: 'Xe tải ben Howo 3 chân 371HP', status: 'CHO_PHAN_CONG', category: 'XE_TAI' },
    { id: 92016, code: 'XTA-006', plate: '92C-155.82', name: 'Xe tải Thaco Auman C160 (9T)', status: 'CHO_PHAN_CONG', category: 'XE_TAI' },
    { id: 92017, code: 'XB-02', plate: '92C-112.34', name: 'Xe bồn xitec chuyên dụng 2 ngăn (5 Khối)', status: 'CHO_PHAN_CONG', category: 'XE_BON' },
  ],
};

const DEMO_FALLBACK_DRIVERS: Record<DemoOrderKind, DatabaseDriver[]> = {
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

const DEMO_EQUIPMENTS: Record<DemoOrderKind, Array<{ id: number | string; code: string; name: string }>> = {
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

const toLocalDateTimeInput = (value?: string) => {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return '';
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
  estimatedVehiclesCount,
  initialAssignedVehicles,
  currentOrderId,
  existingOrders,
  onApprove,
  onReceive,
  onComplete,
}) => {
  const [databaseVehicles, setDatabaseVehicles] = useState<DatabaseVehicle[]>([]);
  const [databaseDrivers, setDatabaseDrivers] = useState<DatabaseDriver[]>([]);
  const [loadingResources, setLoadingResources] = useState(step === 'PENDING');

  const config = DOMAIN_CONFIG[kind] || DOMAIN_CONFIG.AGRICULTURE;
  const currentEquipments = useMemo(() => {
    return DEMO_EQUIPMENTS[kind] || DEMO_EQUIPMENTS.AGRICULTURE;
  }, [kind]);

  useEffect(() => {
    if (step !== 'PENDING') return;
    let active = true;
    const load = async () => {
      setLoadingResources(true);
      try {
        const [vehicleResponse, driverResponse] = await Promise.allSettled([
          apiClient.get('/vehicles', { params: { page: 1, limit: 100 } }),
          apiClient.get('/users', { params: { role: 'DRIVER' } }),
        ]);

        let vItems: DatabaseVehicle[] = [];
        if (vehicleResponse.status === 'fulfilled') {
          const body = (vehicleResponse.value.data as any)?.data ?? vehicleResponse.value.data;
          vItems = Array.isArray(body?.items) ? body.items : Array.isArray(body) ? body : [];
        }

        let dItems: DatabaseDriver[] = [];
        if (driverResponse.status === 'fulfilled') {
          const body = (driverResponse.value.data as any)?.data ?? driverResponse.value.data;
          dItems = Array.isArray(body?.items) ? body.items : Array.isArray(body) ? body : [];
        }

        if (active) {
          setDatabaseVehicles(vItems);
          setDatabaseDrivers(dItems);
        }
      } finally {
        if (active) setLoadingResources(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [step]);

  // Merge database vehicles with rich fallbacks
  const vehicles = useMemo(() => {
    const fallback = DEMO_FALLBACK_VEHICLES[kind] || DEMO_FALLBACK_VEHICLES.AGRICULTURE;
    const combined = [...fallback];
    databaseVehicles.forEach((dv) => {
      if (!combined.some((c) => c.code === dv.code)) {
        combined.push(dv);
      }
    });
    return combined;
  }, [databaseVehicles, kind]);

  // Merge database drivers with rich fallbacks tailored by domain
  const drivers = useMemo(() => {
    const fallback = DEMO_FALLBACK_DRIVERS[kind] || DEMO_FALLBACK_DRIVERS.AGRICULTURE;
    const combined = [...fallback];
    databaseDrivers.forEach((dd) => {
      if (!combined.some((c) => c.fullName === dd.fullName)) {
        combined.push(dd);
      }
    });
    return combined;
  }, [databaseDrivers, kind]);

  // Đơn lẻ cho Công trình & Vận chuyển: Ban đầu TRỐNG khi đang phân công (step === 'PENDING')
  const [selectedVehicle, setSelectedVehicle] = useState(step === 'PENDING' ? '' : (vehicleCode || ''));
  const [selectedDriver, setSelectedDriver] = useState(step === 'PENDING' ? '' : (driverName || ''));
  const [selectedImplement, setSelectedImplement] = useState(step === 'PENDING' ? '' : (implementName || ''));

  // Danh sách tổ xe động cho Nông nghiệp: Mỗi xe là 1 dòng riêng kèm khung giờ độc lập (Ban đầu TRỐNG 100%)
  const [assignedTeam, setAssignedTeam] = useState<AssignedTeamMember[]>(() => {
    const defaultStart = toLocalDateTimeInput(initialStartTime);
    const defaultDur = initialDurationHours || 8;
    const count = Math.max(1, Number(estimatedVehiclesCount) || (initialAssignedVehicles?.length || 1));

    const initialList: AssignedTeamMember[] = [];
    for (let i = 0; i < count; i++) {
      initialList.push({
        id: `team-${Date.now()}-${i}`,
        vehicleCode: step === 'PENDING' ? '' : (initialAssignedVehicles?.[i] || (i === 0 ? vehicleCode || '' : '')),
        implementName: step === 'PENDING' ? '' : (i === 0 ? implementName || '' : ''),
        driverName: step === 'PENDING' ? '' : (i === 0 ? driverName || '' : ''),
        startTime: defaultStart,
        durationHours: defaultDur,
      });
    }
    return initialList;
  });

  const [startTime, setStartTime] = useState(toLocalDateTimeInput(initialStartTime));
  const [durationHours, setDurationHours] = useState(initialDurationHours || (kind === 'CONSTRUCTION' ? 7.5 : 8));

  // Tự động đồng bộ và ĐẶT TRỐNG 100% khi mở lệnh ở trạng thái chờ duyệt / chờ phân công (step === 'PENDING')
  useEffect(() => {
    setSelectedVehicle(step === 'PENDING' ? '' : (vehicleCode || ''));
    setSelectedDriver(step === 'PENDING' ? '' : (driverName || ''));
    setSelectedImplement(step === 'PENDING' ? '' : (implementName || ''));

    const defaultStart = toLocalDateTimeInput(initialStartTime);
    const defaultDur = initialDurationHours || 8;
    const count = Math.max(1, Number(estimatedVehiclesCount) || (initialAssignedVehicles?.length || 1));

    const initialList: AssignedTeamMember[] = [];
    for (let i = 0; i < count; i++) {
      initialList.push({
        id: `team-${currentOrderId || Date.now()}-${i}`,
        vehicleCode: step === 'PENDING' ? '' : (initialAssignedVehicles?.[i] || (i === 0 ? vehicleCode || '' : '')),
        implementName: step === 'PENDING' ? '' : (i === 0 ? implementName || '' : ''),
        driverName: step === 'PENDING' ? '' : (i === 0 ? driverName || '' : ''),
        startTime: defaultStart,
        durationHours: defaultDur,
      });
    }
    setAssignedTeam(initialList);
    setStartTime(defaultStart);
    setDurationHours(initialDurationHours || (kind === 'CONSTRUCTION' ? 7.5 : 8));
  }, [currentOrderId, step, vehicleCode, driverName, implementName, estimatedVehiclesCount, initialAssignedVehicles, initialStartTime, initialDurationHours, kind]);

  // Hàm phát hiện xung đột trùng xe trong cùng khung giờ
  const getConflictingOrder = (vCode: string, startIso: string, duration: number) => {
    if (!vCode || !startIso || !duration) return null;
    const targetStart = new Date(startIso).getTime();
    if (Number.isNaN(targetStart)) return null;
    const targetEnd = targetStart + duration * 3600000;

    let allOrders = existingOrders || [];
    if (allOrders.length === 0) {
      try {
        const raw = localStorage.getItem('thaco_all_dispatch_orders_master_v4');
        if (raw) allOrders = JSON.parse(raw);
      } catch (e) {}
    }

    for (const o of allOrders) {
      if (currentOrderId && String(o.id) === String(currentOrderId)) continue;
      if (o.status === 'CANCELLED' || o.status === 'COMPLETED' || o.status === 'CLOSED') continue;

      const usesVehicle =
        o.vehicle?.code === vCode ||
        (Array.isArray(o.assignedVehicleList) && o.assignedVehicleList.includes(vCode)) ||
        (Array.isArray(o.assignedTeamDetails) && o.assignedTeamDetails.some((d: any) => d.vehicleCode === vCode));

      if (!usesVehicle) continue;

      const oStart = o.departureTime ? new Date(o.departureTime).getTime() : 0;
      const oEnd = o.plannedEndTime ? new Date(o.plannedEndTime).getTime() : (oStart > 0 ? oStart + 8 * 3600000 : 0);

      if (oStart > 0 && oEnd > 0) {
        if (targetStart < oEnd && targetEnd > oStart) {
          const oStartStr = new Date(oStart).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
          const oEndStr = new Date(oEnd).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
          return {
            orderCode: o.code || `Lệnh #${o.id}`,
            timeRange: `${oStartStr} - ${oEndStr}`,
            purpose: o.purpose || o.taskJobName || 'Đang thực hiện nhiệm vụ',
          };
        }
      }
    }
    return null;
  };

  // Tạo danh sách tùy chọn xe có gắn nhãn khả dụng / bận ca theo thời gian
  const getVehicleOptionsForSchedule = (startIso: string, duration: number): SelectOption[] => {
    return vehicles.map((item) => {
      const conflict = getConflictingOrder(item.code, startIso, duration);
      return {
        value: item.code,
        label: conflict
          ? `${item.code} — ${item.name} ⚠️ [BẬN CA: ${conflict.timeRange} (${conflict.orderCode})]`
          : `${item.code} — ${item.name}${item.plate ? ` [${item.plate}]` : ''}`,
      };
    });
  };

  const equipmentOptions: SelectOption[] = useMemo(() => {
    return currentEquipments.map((item) => ({
      value: item.name,
      label: `${item.code} — ${item.name}`,
    }));
  }, [currentEquipments]);

  const driverOptions: SelectOption[] = useMemo(() => {
    return drivers.map((item) => ({
      value: item.fullName,
      label: `${item.fullName} — ${item.licenseClass || 'Chứng chỉ nghề'}${item.phone ? ` (${item.phone})` : ''}`,
    }));
  }, [drivers]);

  // Thêm xe mới vào tổ: kế thừa khung giờ từ xe trước đó, data xe/lái xe ĐỂ TRỐNG
  const handleAddVehicle = () => {
    const lastMember = assignedTeam[assignedTeam.length - 1];
    const itemStart = lastMember?.startTime || toLocalDateTimeInput(initialStartTime);
    const itemDur = lastMember?.durationHours || 8;

    setAssignedTeam((prev) => [
      ...prev,
      {
        id: `team-${Date.now()}-${prev.length}`,
        vehicleCode: '',
        implementName: '',
        driverName: '',
        startTime: itemStart,
        durationHours: itemDur,
      },
    ]);
  };

  // Xóa xe khỏi tổ
  const handleRemoveVehicle = (index: number) => {
    if (assignedTeam.length <= 1) return;
    setAssignedTeam((prev) => prev.filter((_, i) => i !== index));
  };

  // Cập nhật từng dòng xe (xe, nông cụ, thợ lái, giờ bắt đầu, số giờ ca)
  const handleUpdateMember = (index: number, field: keyof AssignedTeamMember, value: any) => {
    setAssignedTeam((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  // Sao chép khung giờ của 1 xe sang toàn bộ các xe khác trong tổ
  const handleCopyScheduleToAll = (fromIndex: number) => {
    const source = assignedTeam[fromIndex];
    if (!source) return;
    setAssignedTeam((prev) =>
      prev.map((item) => ({
        ...item,
        startTime: source.startTime,
        durationHours: source.durationHours,
      }))
    );
  };

  const calculateEndTimeFormatted = (startIso: string, hours: number) => {
    const s = new Date(startIso);
    if (Number.isNaN(s.getTime())) return '—';
    const e = new Date(s.getTime() + hours * 3600000);
    return `${e.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} ngày ${e.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}`;
  };

  const approve = () => {
    if (kind === 'AGRICULTURE' && assignedTeam.length > 0) {
      // Chuẩn bị toàn bộ tổ máy kèm khung giờ độc lập của từng xe
      const teamList = assignedTeam.map((m, idx) => {
        const v = vehicles.find((item) => item.code === m.vehicleCode) || { id: 95000 + idx, code: m.vehicleCode, name: m.vehicleCode };
        const d = drivers.find((item) => item.fullName === m.driverName) || { id: 93000 + idx, fullName: m.driverName, licenseClass: 'Chứng chỉ thợ máy' };
        const imp = currentEquipments.find((item) => item.name === m.implementName || item.code === m.implementName);

        const mStart = new Date(m.startTime || startTime);
        const mDur = Number(m.durationHours) || 8;
        const mEnd = new Date(mStart.getTime() + mDur * 3600000);

        return {
          vehicle: { id: v.id, code: v.code, name: v.name },
          driver: { id: d.id, name: d.fullName, license: d.licenseClass || 'Chứng chỉ nghề' },
          implement: imp ? { id: imp.id, code: imp.code, name: imp.name } : undefined,
          schedule: {
            startTime: mStart.toISOString(),
            endTime: mEnd.toISOString(),
            durationHours: mDur,
          },
        };
      });

      const lead = teamList[0];
      onApprove(lead.vehicle, lead.driver, lead.schedule, lead.implement, teamList);
    } else {
      const start = new Date(startTime);
      if (Number.isNaN(start.getTime()) || durationHours <= 0) return;
      const end = new Date(start.getTime() + durationHours * 3600000);
      const schedule = { startTime: start.toISOString(), endTime: end.toISOString(), durationHours };

      const vehicle = vehicles.find((item) => item.code === selectedVehicle) || vehicles[0];
      const driver = drivers.find((item) => item.fullName === selectedDriver) || drivers[0];
      const imp = currentEquipments.find((item) => item.name === selectedImplement || item.code === selectedImplement);
      if (vehicle && driver) {
        onApprove(
          { id: vehicle.id, code: vehicle.code, name: vehicle.name },
          { id: driver.id, name: driver.fullName, license: driver.licenseClass || 'Chứng chỉ nghề' },
          schedule,
          imp ? { id: imp.id, code: imp.code, name: imp.name } : undefined,
        );
      }
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

      {/* Form Phân công khi đang ở bước PENDING */}
      {step === 'PENDING' && (
        <div className="space-y-4">
          {/* NÔNG NGHIỆP: MỖI XE LÀ 1 DÒNG RIÊNG BIỆT + CÓ NÚT THÊM XE */}
          {kind === 'AGRICULTURE' ? (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Tractor className="h-4 w-4 text-emerald-600" />
                    <span>Danh sách Phương tiện & Thợ máy trong tổ ({assignedTeam.length} xe):</span>
                  </span>
                  {estimatedVehiclesCount && (
                    <span className="text-[11px] text-slate-500 font-medium bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                      Ước lượng kế hoạch: <b>{estimatedVehiclesCount} xe</b>
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleAddVehicle}
                  className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 px-3 py-1.5 rounded-xl transition-all shadow-2xs cursor-pointer active:scale-95"
                >
                  <Plus className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Thêm xe vào tổ</span>
                </button>
              </div>

              {/* Danh sách từng dòng xe */}
              <div className="space-y-3">
                {assignedTeam.map((member, index) => {
                  const isLead = index === 0;
                  return (
                    <div
                      key={member.id}
                      className={`p-3.5 rounded-2xl border transition-all ${
                        isLead
                          ? 'bg-blue-50/40 border-blue-200/90 shadow-2xs'
                          : 'bg-slate-50/70 border-slate-200 shadow-2xs'
                      }`}
                    >
                      <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-200/60">
                        <div className="flex items-center gap-2">
                          <span className={`text-[11px] font-extrabold px-2 py-0.5 rounded-md ${
                            isLead ? 'bg-blue-600 text-white shadow-2xs' : 'bg-slate-200 text-slate-700'
                          }`}>
                            {isLead ? 'Xe #1 (Máy trưởng)' : `Xe #${index + 1} (Hỗ trợ tổ)`}
                          </span>
                          <span className="text-xs text-slate-700 font-bold">
                            {member.vehicleCode || 'Chưa gán máy kéo'}
                          </span>
                        </div>
                        {assignedTeam.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveVehicle(index)}
                            className="text-slate-400 hover:text-red-600 p-1 rounded-lg hover:bg-red-50 transition-colors cursor-pointer flex items-center gap-1 text-[11px] font-semibold"
                            title="Xóa xe này khỏi tổ"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span>Xóa</span>
                          </button>
                        )}
                      </div>

                      {/* BƯỚC 1: KHUNG GIỜ & CA MÁY ĐỘC LẬP CỦA XE NÀY (Chọn trước) */}
                      <div className="bg-slate-50/80 p-2.5 rounded-xl border border-slate-200/80 space-y-2 mb-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
                            <CalendarClock className="h-3.5 w-3.5 text-primary" />
                            <span>Bước 1: Ấn định giờ làm & Ca máy ({isLead ? 'Xe #1 - Máy trưởng' : `Xe #${index + 1}`}):</span>
                            <span className="text-[10.5px] font-bold text-slate-700 bg-white px-2 py-0.5 rounded-md border border-slate-200 shadow-2xs">
                              {member.durationHours} giờ
                            </span>
                          </span>

                          {isLead && assignedTeam.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleCopyScheduleToAll(index)}
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2.5 py-1 rounded-lg transition-all cursor-pointer shadow-2xs active:scale-95"
                              title="Sao chép khung giờ và thời lượng ca này cho các xe còn lại trong tổ"
                            >
                              <span>🔗 Áp dụng giờ này cho cả tổ</span>
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                          <div className="sm:col-span-5">
                            <input
                              type="datetime-local"
                              value={member.startTime}
                              onChange={(e) => handleUpdateMember(index, 'startTime', e.target.value)}
                              className="w-full h-8 rounded-xl border border-slate-300 bg-white px-2.5 text-xs font-semibold text-slate-900 shadow-xs focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                          </div>

                          <div className="sm:col-span-3 flex items-center gap-1">
                            <input
                              type="number"
                              min="0.5"
                              step="0.5"
                              value={member.durationHours}
                              onChange={(e) => handleUpdateMember(index, 'durationHours', Math.max(0.5, Number(e.target.value)))}
                              className="w-full h-8 rounded-xl border border-slate-300 bg-white px-2 text-xs font-extrabold text-center text-slate-900 shadow-xs focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                            <span className="text-xs text-slate-500 font-semibold pr-1">giờ</span>
                          </div>

                          <div className="sm:col-span-4 flex items-center gap-1">
                            {[2, 4, 8, 10, 12].map((h) => (
                              <button
                                key={h}
                                type="button"
                                onClick={() => handleUpdateMember(index, 'durationHours', h)}
                                className={`flex-1 h-7 rounded-lg text-[10.5px] font-bold transition-all ${
                                  member.durationHours === h
                                    ? 'bg-slate-900 text-white shadow-2xs'
                                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                                }`}
                              >
                                {h}h
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="text-[11px] text-slate-500 flex items-center justify-between bg-white px-2.5 py-1 rounded-lg border border-slate-200/80">
                          <span>Dự kiến hoàn thành ca:</span>
                          <b className="text-slate-800 font-bold">{calculateEndTimeFormatted(member.startTime, member.durationHours)}</b>
                        </div>
                      </div>

                      {/* BƯỚC 2: PHÂN CÔNG ĐẦU MÁY, NÔNG CỤ, THỢ LÁI (Data ban đầu Trống) */}
                      <div className="space-y-2">
                        <div className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                          <Tractor className="h-3.5 w-3.5 text-primary" />
                          <span>Bước 2: Phân công Đầu máy, Nông cụ & Thợ lái (Chọn sau khi đã ấn định ca):</span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          {/* Cột 1: Chọn Đầu máy / Xe kéo */}
                          <div className="space-y-1">
                            <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                              <Tractor className="h-3 w-3 text-primary" />
                              1. Đầu máy / Xe kéo:
                            </span>
                            <SearchableSelect
                              value={member.vehicleCode}
                              onChange={(val) => handleUpdateMember(index, 'vehicleCode', val)}
                              options={getVehicleOptionsForSchedule(member.startTime, member.durationHours)}
                              placeholder="-- Chọn máy kéo / xe --"
                              heightClass="h-9"
                              roundedClass="rounded-xl"
                              bgClass="bg-white"
                              className="w-full"
                              inputClassName="text-xs font-semibold text-slate-900 border-slate-300"
                              emptyOptionLabel="-- Chọn máy kéo / xe --"
                              emptyValue=""
                            />
                          </div>

                          {/* Cột 2: Chọn Nông cụ gắn kèm */}
                          <div className="space-y-1">
                            <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                              <Wrench className="h-3 w-3 text-primary" />
                              2. Nông cụ gắn kèm:
                            </span>
                            <SearchableSelect
                              value={member.implementName}
                              onChange={(val) => handleUpdateMember(index, 'implementName', val)}
                              options={equipmentOptions}
                              placeholder="-- Chọn nông cụ gắn kèm --"
                              heightClass="h-9"
                              roundedClass="rounded-xl"
                              bgClass="bg-white"
                              className="w-full"
                              inputClassName="text-xs font-semibold text-slate-900 border-slate-300"
                              emptyOptionLabel="-- Chọn nông cụ gắn kèm --"
                              emptyValue=""
                            />
                          </div>

                          {/* Cột 3: Chọn Thợ máy / Lái xe */}
                          <div className="space-y-1">
                            <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                              <UserCheck className="h-3 w-3 text-primary" />
                              3. Thợ máy / Lái xe:
                            </span>
                            <SearchableSelect
                              value={member.driverName}
                              onChange={(val) => handleUpdateMember(index, 'driverName', val)}
                              options={driverOptions}
                              placeholder="-- Chọn thợ máy / lái xe --"
                              heightClass="h-9"
                              roundedClass="rounded-xl"
                              bgClass="bg-white"
                              className="w-full"
                              inputClassName="text-xs font-semibold text-slate-900 border-slate-300"
                              emptyOptionLabel="-- Chọn thợ máy / lái xe --"
                              emptyValue=""
                            />
                          </div>
                        </div>

                        {/* Cảnh báo nếu xe bị trùng ca với lệnh khác */}
                        {(() => {
                          const conflict = getConflictingOrder(member.vehicleCode, member.startTime, member.durationHours);
                          if (!conflict) return null;
                          return (
                            <div className="mt-2 p-2 rounded-xl bg-amber-50 border border-amber-300 text-[11px] text-amber-900 flex items-start gap-2 shadow-2xs">
                              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                              <div>
                                <b>Cảnh báo trùng xe:</b> Phương tiện <b>{member.vehicleCode}</b> đã được giao ca <b>{conflict.timeRange}</b> ở {conflict.orderCode} ({conflict.purpose}). Vui lòng đổi xe khác hoặc đổi khung giờ!
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* CÁC PHÂN HỆ KHÁC (CÔNG TRÌNH / VẬN TẢI): BƯỚC 1 CHỌN GIỜ TRƯỚC, BƯỚC 2 CHỌN XE SAU */
            <div className="space-y-4">
              {/* BƯỚC 1: KHUNG GIỜ THI CÔNG / XUẤT BẾN & CA MÁY (Chọn trước) */}
              <div className="bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    {config.scheduleIcon}
                    <span>Bước 1: Ấn định khung giờ ca máy / xuất bến (Chọn trước để kiểm tra xe rảnh):</span>
                  </span>
                  <span className="text-[11px] font-semibold text-slate-700 bg-white px-2 py-0.5 rounded-md border border-slate-200 shadow-2xs">
                    Thời lượng: {durationHours}h
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                  <div className="sm:col-span-5">
                    <input
                      type="datetime-local"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full h-9 rounded-xl border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-900 shadow-xs focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  <div className="sm:col-span-3 flex items-center gap-1">
                    <input
                      type="number"
                      min="0.5"
                      step="0.5"
                      value={durationHours}
                      onChange={(e) => setDurationHours(Math.max(0.5, Number(e.target.value)))}
                      className="w-full h-9 rounded-xl border border-slate-300 bg-white px-2 text-xs font-extrabold text-center text-slate-900 shadow-xs focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    <span className="text-xs text-slate-500 font-semibold pr-1">giờ</span>
                  </div>

                  <div className="sm:col-span-4 flex items-center gap-1">
                    {config.quickHours.map((h) => (
                      <button
                        key={h}
                        type="button"
                        onClick={() => setDurationHours(h)}
                        className={`flex-1 h-8 rounded-lg text-[11px] font-bold transition-all ${
                          durationHours === h
                            ? 'bg-slate-900 text-white shadow-2xs'
                            : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {h}h
                      </button>
                    ))}
                  </div>
                </div>

                <div className="text-xs text-slate-600 font-normal bg-white px-3.5 py-1.5 rounded-xl border border-slate-200 flex items-center justify-between">
                  <span>Hoàn thành dự kiến:</span>
                  <b className="text-slate-900 font-bold">{calculateEndTimeFormatted(startTime, durationHours)}</b>
                </div>
              </div>

              {/* BƯỚC 2: CHỌN PHƯƠNG TIỆN, PHỤ KIỆN / MOÓC, LÁI XE (Data ban đầu Trống) */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  {config.vehicleIcon}
                  <span>Bước 2: Phân công Thiết bị xe máy, Thiết bị phụ trợ & Thợ vận hành:</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* 1. Chọn Phương tiện */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 flex items-center justify-between min-h-[22px]">
                      <span>{config.vehicleLabel}</span>
                    </label>
                    <SearchableSelect
                      value={selectedVehicle}
                      onChange={setSelectedVehicle}
                      options={getVehicleOptionsForSchedule(startTime, durationHours)}
                      placeholder="-- Chọn phương tiện / xe máy --"
                      heightClass="h-10"
                      roundedClass="rounded-xl"
                      bgClass="bg-white"
                      className="w-full"
                      inputClassName="text-xs font-semibold text-slate-900 border-slate-300"
                      emptyOptionLabel="-- Chọn phương tiện / xe máy --"
                      emptyValue=""
                    />
                  </div>

                  {/* 2. Chọn Nông cụ / Thiết bị phụ trợ */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 flex items-center justify-between min-h-[22px]">
                      <span>{config.accessoryLabel}</span>
                    </label>
                    <SearchableSelect
                      value={selectedImplement}
                      onChange={setSelectedImplement}
                      options={equipmentOptions}
                      placeholder="-- Chọn phụ kiện / moóc --"
                      heightClass="h-10"
                      roundedClass="rounded-xl"
                      bgClass="bg-white"
                      className="w-full"
                      inputClassName="text-xs font-semibold text-slate-900 border-slate-300"
                      emptyOptionLabel="-- Chọn phụ kiện / moóc --"
                      emptyValue=""
                    />
                  </div>

                  {/* 3. Chọn Lái xe / Thợ máy */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 flex items-center justify-between min-h-[22px]">
                      <span>{config.driverLabel}</span>
                    </label>
                    <SearchableSelect
                      value={selectedDriver}
                      onChange={setSelectedDriver}
                      options={driverOptions}
                      placeholder="-- Chọn lái xe / thợ máy --"
                      heightClass="h-10"
                      roundedClass="rounded-xl"
                      bgClass="bg-white"
                      className="w-full"
                      inputClassName="text-xs font-semibold text-slate-900 border-slate-300"
                      emptyOptionLabel="-- Chọn lái xe / thợ máy --"
                      emptyValue=""
                    />
                  </div>
                </div>

                {/* Cảnh báo trùng xe cho Công trình / Vận tải */}
                {(() => {
                  const conflict = getConflictingOrder(selectedVehicle, startTime, durationHours);
                  if (!conflict) return null;
                  return (
                    <div className="mt-2 p-2.5 rounded-xl bg-amber-50 border border-amber-300 text-xs text-amber-900 flex items-start gap-2 shadow-2xs">
                      <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <b>Cảnh báo trùng xe:</b> Thiết bị <b>{selectedVehicle}</b> đã được giao ca <b>{conflict.timeRange}</b> ở {conflict.orderCode} ({conflict.purpose}). Vui lòng đổi xe khác hoặc đổi khung giờ!
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {/* 4. Khung giờ ca máy chung (Chỉ dành cho Công trình & Vận chuyển xe đơn lẻ) */}
          {kind !== 'AGRICULTURE' && (
            <>
              <div className="space-y-1.5 pt-1">
                <label className="text-xs font-bold text-slate-700 flex items-center justify-between min-h-[26px]">
                  <span className="flex items-center gap-1.5">
                    {config.scheduleIcon}
                    <span>Thời gian bắt đầu làm việc & Ca máy:</span>
                  </span>
                  <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                    Thời lượng: {durationHours}h
                  </span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="datetime-local"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="sm:col-span-2 h-10 rounded-xl border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-900 shadow-xs focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="0.5"
                      step="0.5"
                      value={durationHours}
                      onChange={(e) => setDurationHours(Math.max(0.5, Number(e.target.value)))}
                      className="w-full h-10 rounded-xl border border-slate-300 bg-white px-2 text-xs font-extrabold text-center text-slate-900 shadow-xs focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    <span className="text-xs text-slate-500 font-semibold pr-1">giờ</span>
                  </div>
                </div>
              </div>

              {/* Hàng nút bấm chọn nhanh thời lượng ca */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <div className="flex items-center gap-1.5 text-xs text-slate-600">
                  <span className="font-semibold text-slate-700">Chọn nhanh ca:</span>
                  {config.quickHours.map((h) => (
                    <button
                      key={h}
                      type="button"
                      onClick={() => setDurationHours(h)}
                      className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition-all ${
                        durationHours === h
                          ? 'bg-slate-900 text-white shadow-2xs'
                          : 'bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200'
                      }`}
                    >
                      {h}h
                    </button>
                  ))}
                </div>

                <div className="text-xs text-slate-600 font-normal bg-slate-50 px-3.5 py-1.5 rounded-xl border border-slate-200">
                  <span>Hoàn thành dự kiến: </span>
                  <b className="text-slate-900 font-bold ml-1">{calculateEndTimeFormatted(startTime, durationHours)}</b>
                </div>
              </div>
            </>
          )}

          {/* Nút hành động phê duyệt */}
          <div className="flex justify-end pt-3 border-t border-slate-100">
            <Button
              size="md"
              disabled={
                loadingResources ||
                (kind === 'AGRICULTURE'
                  ? assignedTeam.length === 0 ||
                    assignedTeam.some((m) => !m.vehicleCode || !m.driverName || !m.startTime || m.durationHours <= 0)
                  : !selectedVehicle || !selectedDriver || !startTime || durationHours <= 0)
              }
              icon={<ClipboardCheck className="h-4 w-4" />}
              className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-6 py-2.5 rounded-xl shadow-xs hover:shadow-md transition-all active:scale-95 cursor-pointer text-xs sm:text-sm"
              onClick={approve}
            >
              {config.submitLabel}
            </Button>
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
          <Button
            size="md"
            icon={<UserCheck className="h-4 w-4" />}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs"
            onClick={onReceive}
          >
            Tài xế xác nhận nhận việc
          </Button>
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
          <Button
            size="md"
            icon={<CheckCircle2 className="h-4 w-4" />}
            className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs"
            onClick={onComplete}
          >
            Nghiệm thu & Hoàn thành ca máy
          </Button>
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
