/**
 * dispatchExcel.ts
 * Utility xuất Excel cho các trang Lệnh điều xe THACO AGRI.
 * Sử dụng thư viện `xlsx` (đã có sẵn trong project).
 */
import * as XLSX from 'xlsx';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function fmtDate(value?: string | Date | null): string {
  if (!value) return '';
  const d = typeof value === 'string' ? new Date(value) : value;
  if (isNaN(d.getTime())) return '';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function fmtTime(value?: string | Date | null): string {
  if (!value) return '';
  const d = typeof value === 'string' ? new Date(value) : value;
  if (isNaN(d.getTime())) return '';
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function fmtDatetime(value?: string | Date | null): string {
  const date = fmtDate(value);
  const time = fmtTime(value);
  if (!date) return '';
  return time ? `${date} ${time}` : date;
}

function buildFilename(prefix: string, weekRangeLabel: string): string {
  const now = new Date();
  const yyyymmdd = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const weekPart = weekRangeLabel.replace(/[^a-zA-Z0-9_\-]/g, '_').replace(/_+/g, '_');
  return `${prefix}_${weekPart}_${yyyymmdd}.xlsx`;
}

function applySheetStyle(ws: XLSX.WorkSheet, numCols: number): void {
  // Tự động điều chỉnh độ rộng cột
  ws['!cols'] = Array.from({ length: numCols }, () => ({ wch: 22 }));
}

function writeWorkbook(wb: XLSX.WorkBook, filename: string): void {
  XLSX.writeFile(wb, filename, { compression: true });
}

// ─────────────────────────────────────────────────────────────────────────────
// STATUS LABEL MAPS
// ─────────────────────────────────────────────────────────────────────────────

const DISPATCH_STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Chờ duyệt',
  PENDING_APPROVAL: 'Chờ duyệt',
  CHO_DUYET: 'Chờ duyệt',
  CHO_PHAN_CONG: 'Chờ phân công',
  APPROVED: 'Đã duyệt',
  ASSIGNED: 'Đã phân công',
  DA_DUYET: 'Đã duyệt',
  DA_NHAN: 'Đã nhận lệnh',
  DRIVER_ACCEPTED: 'Tài xế đã nhận',
  DEPARTED: 'Đã xuất phát',
  AT_WORKSITE: 'Đang tại công trường',
  WORKING: 'Đang vận hành',
  IN_TRANSIT: 'Đang di chuyển',
  DANG_THI_CONG: 'Đang thi công',
  TAM_DUNG: 'Tạm dừng',
  RETURNING_TO_DEPOT: 'Đang về bãi',
  COMPLETED: 'Hoàn tất',
  ACCEPTED: 'Đã nghiệm thu',
  HOAN_THANH: 'Hoàn thành',
  DELIVERED: 'Đã giao hàng',
  CLOSED: 'Đóng lệnh',
  CANCELLED: 'Đã hủy',
};

const CONSTRUCTION_STATUS_LABEL: Record<string, string> = {
  CHO_DUYET: 'Chờ duyệt',
  DA_DUYET: 'Đã phân công',
  DA_NHAN: 'Đã nhận ca',
  DANG_THI_CONG: 'Đang thi công',
  TAM_DUNG: 'Tạm dừng',
  HOAN_THANH: 'Hoàn thành',
};

const TRANSPORT_STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Chờ duyệt',
  PENDING_APPROVAL: 'Chờ duyệt',
  APPROVED: 'Đã duyệt',
  ASSIGNED: 'Đã phân công',
  DRIVER_ACCEPTED: 'Tài xế đã nhận',
  AT_PICKUP: 'Đang tại kho',
  LOADING: 'Đang bốc hàng',
  DEPARTED: 'Đã xuất phát',
  IN_TRANSIT: 'Đang vận chuyển',
  AT_DELIVERY: 'Đến điểm giao',
  UNLOADING: 'Đang dỡ hàng',
  DELIVERED: 'Đã giao hàng',
  RETURNING_TO_DEPOT: 'Đang về bãi',
  AT_DEPOT: 'Đã về bãi',
  ACCEPTED: 'Đã nghiệm thu',
  COMPLETED: 'Hoàn tất',
  CANCELLED: 'Đã hủy',
};

// ─────────────────────────────────────────────────────────────────────────────
// 1. XUẤT LỆNH ĐIỀU XE NÔNG NGHIỆP / TỔNG HỢP (DispatchOrdersPage)
// ─────────────────────────────────────────────────────────────────────────────

export interface ExportableDispatchOrder {
  code: string;
  categoryLabel?: string;
  complexName?: string;
  planCode?: string;
  taskJobName?: string;
  purpose?: string;
  taskPlot?: string;
  origin?: string;
  departureTime?: string;
  plannedEndTime?: string;
  vehicle?: { code?: string; plate?: string; name?: string } | null;
  driver?: { fullName?: string; name?: string } | null;
  implement?: { name?: string } | null;
  workVolumeTarget?: number;
  workVolumeActual?: number;
  workVolumeUnit?: string;
  plannedFuelLiters?: number;
  actualFuelLiters?: number;
  status: string;
  notes?: string;
  enterpriseName?: string;
  farmName?: string;
}

export function exportDispatchOrdersToExcel(
  orders: ExportableDispatchOrder[],
  weekRangeLabel = 'TatCa',
  sheetTitle = 'LỆNH ĐIỀU XE NÔNG NGHIỆP',
): void {
  const headers = [
    'Mã lệnh',
    'Loại lệnh',
    'Khu liên hợp',
    'Xí nghiệp / Nông trường',
    'Mã kế hoạch',
    'Công việc / Mục đích',
    'Lô / Thửa / Khu vực',
    'Ngày thực hiện',
    'Giờ bắt đầu',
    'Giờ kết thúc DK',
    'Phương tiện (Mã)',
    'Biển số xe',
    'Tên máy / Xe',
    'Tài xế / Lái máy',
    'Nông cụ kèm theo',
    'KL kế hoạch',
    'ĐVT',
    'KL thực tế',
    'Dầu KH (L)',
    'Dầu TT (L)',
    'Trạng thái',
    'Ghi chú',
  ];

  const rows = orders.map((o) => [
    o.code,
    o.categoryLabel || 'Nông nghiệp',
    o.complexName || '',
    [o.enterpriseName, o.farmName].filter(Boolean).join(' / ') || '',
    o.planCode || '',
    o.taskJobName || o.purpose || '',
    o.taskPlot || o.origin || '',
    fmtDate(o.departureTime),
    fmtTime(o.departureTime),
    fmtTime(o.plannedEndTime),
    o.vehicle?.code || '',
    o.vehicle?.plate || '',
    o.vehicle?.name || '',
    (o.driver as any)?.fullName || (o.driver as any)?.name || '',
    o.implement?.name || '',
    o.workVolumeTarget != null ? o.workVolumeTarget : '',
    o.workVolumeUnit || '',
    o.workVolumeActual != null ? o.workVolumeActual : '',
    o.plannedFuelLiters != null ? o.plannedFuelLiters : '',
    o.actualFuelLiters != null ? o.actualFuelLiters : '',
    DISPATCH_STATUS_LABEL[o.status] || o.status,
    o.notes || '',
  ]);

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  ws['!cols'] = [
    { wch: 18 }, { wch: 16 }, { wch: 22 }, { wch: 24 }, { wch: 20 },
    { wch: 30 }, { wch: 22 }, { wch: 14 }, { wch: 10 }, { wch: 12 },
    { wch: 14 }, { wch: 14 }, { wch: 28 }, { wch: 20 }, { wch: 22 },
    { wch: 12 }, { wch: 8 },  { wch: 12 }, { wch: 12 }, { wch: 12 },
    { wch: 18 }, { wch: 28 },
  ];
  ws['!autofilter'] = { ref: `A1:${XLSX.utils.encode_col(headers.length - 1)}1` };

  const guideWs = XLSX.utils.aoa_to_sheet([
    [sheetTitle, `Xuất ngày: ${fmtDatetime(new Date())}`],
    ['Bộ lọc tuần', weekRangeLabel],
    ['Tổng số lệnh', orders.length],
  ]);
  guideWs['!cols'] = [{ wch: 24 }, { wch: 50 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Lenh_Dieu_Xe');
  XLSX.utils.book_append_sheet(wb, guideWs, 'Thong_Tin_Xuat');

  writeWorkbook(wb, buildFilename('Lenh_NN_TongHop', weekRangeLabel));
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. XUẤT CA MÁY CÔNG TRÌNH (ConstructionDispatchPage)
// ─────────────────────────────────────────────────────────────────────────────

export interface ExportableConstructionShift {
  code: string;
  workDate: string;
  shiftType: string;
  complexName?: string;
  projectName: string;
  locationDetails: string;
  jobCategoryName: string;
  machineName: string;
  machineCode: string;
  machineType?: string;
  operatorName: string;
  operatorPhone?: string;
  plannedHours: number;
  actualWorkingHours?: number;
  actualIdlingHours?: number;
  fuelQuotaLitersPerHour: number;
  plannedFuelLiters: number;
  actualFuelLiters?: number;
  workVolumeTarget: number;
  workVolumeUnit: string;
  workVolumeActual?: number;
  status: string;
  notes?: string;
}

export function exportConstructionShiftsToExcel(
  shifts: ExportableConstructionShift[],
  weekRangeLabel = 'TatCa',
): void {
  const headers = [
    'Mã ca máy',
    'Ngày thi công',
    'Ca làm việc',
    'Khu liên hợp',
    'Công trình / Hạng mục',
    'Vị trí thi công chi tiết',
    'Loại công việc',
    'Mã máy',
    'Tên máy thi công',
    'Loại máy',
    'Thợ máy / Vận hành',
    'SĐT thợ máy',
    'Giờ máy KH (h)',
    'Giờ máy TT (h)',
    'Giờ nổ không tải (h)',
    'Định mức dầu (L/h)',
    'Dầu KH (L)',
    'Dầu TT (L)',
    'KL kế hoạch',
    'ĐVT',
    'KL thực tế',
    'Trạng thái',
    'Ghi chú',
  ];

  const rows = shifts.map((s) => [
    s.code,
    fmtDate(s.workDate),
    s.shiftType === 'CA_NGAY' ? 'Ca ngày' : 'Ca đêm',
    s.complexName || '',
    s.projectName,
    s.locationDetails,
    s.jobCategoryName,
    s.machineCode,
    s.machineName,
    s.machineType || '',
    s.operatorName,
    s.operatorPhone || '',
    s.plannedHours,
    s.actualWorkingHours != null ? s.actualWorkingHours : '',
    s.actualIdlingHours != null ? s.actualIdlingHours : '',
    s.fuelQuotaLitersPerHour,
    s.plannedFuelLiters,
    s.actualFuelLiters != null ? s.actualFuelLiters : '',
    s.workVolumeTarget,
    s.workVolumeUnit,
    s.workVolumeActual != null ? s.workVolumeActual : '',
    CONSTRUCTION_STATUS_LABEL[s.status] || s.status,
    s.notes || '',
  ]);

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  ws['!cols'] = [
    { wch: 16 }, { wch: 14 }, { wch: 10 }, { wch: 22 }, { wch: 32 },
    { wch: 28 }, { wch: 28 }, { wch: 10 }, { wch: 30 }, { wch: 18 },
    { wch: 22 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 18 },
    { wch: 18 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 8 },
    { wch: 12 }, { wch: 18 }, { wch: 28 },
  ];
  ws['!autofilter'] = { ref: `A1:${XLSX.utils.encode_col(headers.length - 1)}1` };

  const guideWs = XLSX.utils.aoa_to_sheet([
    ['LỆNH CA MÁY CÔNG TRÌNH', `Xuất ngày: ${fmtDatetime(new Date())}`],
    ['Bộ lọc tuần', weekRangeLabel],
    ['Tổng số ca máy', shifts.length],
  ]);
  guideWs['!cols'] = [{ wch: 24 }, { wch: 50 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Ca_May_Cong_Trinh');
  XLSX.utils.book_append_sheet(wb, guideWs, 'Thong_Tin_Xuat');

  writeWorkbook(wb, buildFilename('Lenh_Cong_Trinh', weekRangeLabel));
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. XUẤT LỆNH VẬN CHUYỂN NỘI BỘ (InternalTransportPage)
// ─────────────────────────────────────────────────────────────────────────────

export interface ExportableTransportOrder {
  code: string;
  complexName?: string;
  cargoType?: string;
  origin?: string;
  destination?: string;
  departureTime?: string;
  plannedEndTime?: string;
  executionDate?: string;
  requestDate?: string;
  vehicle?: { code?: string; plate?: string; name?: string } | null;
  legacyVehicle?: string;
  driver?: { fullName?: string } | null;
  legacyDriver?: string;
  tripsCount?: number;
  tonnage?: number;
  palletCount?: number;
  distanceKm?: number;
  plannedFuelLiters?: number;
  actualFuelLiters?: number;
  containerNumber?: string;
  status: string;
  notes?: string;
  items?: Array<{
    materialCode?: string;
    cargoName?: string;
    unitOfMeasure?: string;
    plannedQuantity?: number;
    actualQuantity?: number;
    pickupLocation?: string;
    deliveryLocation?: string;
  }>;
}

export function exportTransportOrdersToExcel(
  orders: ExportableTransportOrder[],
  weekRangeLabel = 'TatCa',
): void {
  const headers = [
    'Mã lệnh',
    'Khu liên hợp',
    'Loại hàng vận chuyển',
    'Điểm xuất phát / Kho',
    'Điểm đến / Giao hàng',
    'Ngày vận chuyển',
    'Giờ khởi hành',
    'Giờ dự kiến về',
    'Mã xe / Biển số',
    'Tên xe',
    'Tài xế',
    'Số container',
    'Số chuyến',
    'Trọng lượng (Tấn)',
    'Số pallet',
    'Khoảng cách (km)',
    'Dầu KH (L)',
    'Dầu TT (L)',
    'Trạng thái',
    'Ghi chú',
  ];

  const rows = orders.map((o) => {
    const orderItems = Array.isArray(o.items) ? o.items : [];
    const firstItem = orderItems[0];
    const dateVal = o.departureTime || o.executionDate || o.requestDate;
    const vehiclePlate = o.vehicle?.plate || o.vehicle?.code || o.legacyVehicle || '';
    const vehicleName = o.vehicle?.name || '';
    const driverName = (o.driver as any)?.fullName || o.legacyDriver || '';
    const cargo = o.cargoType || firstItem?.cargoName || '';

    return [
      o.code,
      o.complexName || '',
      cargo,
      o.origin || firstItem?.pickupLocation || '',
      o.destination || firstItem?.deliveryLocation || '',
      fmtDate(dateVal),
      fmtTime(o.departureTime),
      fmtTime(o.plannedEndTime),
      vehiclePlate,
      vehicleName,
      driverName,
      o.containerNumber || '',
      o.tripsCount != null ? o.tripsCount : '',
      o.tonnage != null ? o.tonnage : '',
      o.palletCount != null ? o.palletCount : '',
      o.distanceKm != null ? o.distanceKm : '',
      o.plannedFuelLiters != null ? o.plannedFuelLiters : '',
      o.actualFuelLiters != null ? o.actualFuelLiters : '',
      TRANSPORT_STATUS_LABEL[o.status] || o.status,
      o.notes || '',
    ];
  });

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  ws['!cols'] = [
    { wch: 18 }, { wch: 22 }, { wch: 24 }, { wch: 22 }, { wch: 22 },
    { wch: 14 }, { wch: 10 }, { wch: 12 }, { wch: 16 }, { wch: 22 },
    { wch: 20 }, { wch: 18 }, { wch: 10 }, { wch: 16 }, { wch: 12 },
    { wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 18 }, { wch: 28 },
  ];
  ws['!autofilter'] = { ref: `A1:${XLSX.utils.encode_col(headers.length - 1)}1` };

  const guideWs = XLSX.utils.aoa_to_sheet([
    ['LỆNH VẬN CHUYỂN NỘI BỘ', `Xuất ngày: ${fmtDatetime(new Date())}`],
    ['Bộ lọc tuần', weekRangeLabel],
    ['Tổng số lệnh', orders.length],
  ]);
  guideWs['!cols'] = [{ wch: 24 }, { wch: 50 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Van_Chuyen_Noi_Bo');
  XLSX.utils.book_append_sheet(wb, guideWs, 'Thong_Tin_Xuat');

  writeWorkbook(wb, buildFilename('Lenh_Van_Chuyen', weekRangeLabel));
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: Tạo label khoảng tuần để hiển thị và đặt tên file
// ─────────────────────────────────────────────────────────────────────────────

export function buildWeekRangeLabel(fromWeek: number | 'ALL', toWeek: number | 'ALL'): string {
  if (fromWeek === 'ALL' || toWeek === 'ALL') return 'TatCa';
  if (fromWeek === toWeek) return `T${fromWeek}`;
  return `T${fromWeek}-T${toWeek}`;
}
