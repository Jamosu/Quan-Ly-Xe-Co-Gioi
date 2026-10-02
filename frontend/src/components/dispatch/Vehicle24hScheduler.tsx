import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Calendar,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  LayoutGrid,
  Milestone,
  Moon,
  Search,
  Truck,
  UserCheck,
  Wrench,
} from 'lucide-react';

export interface SchedulerItem {
  id: string | number;
  code: string;
  title: string;
  location?: string;
  categoryLabel?: string;
  category?: 'AGRICULTURE' | 'CONSTRUCTION' | 'TRANSPORT' | string;
  unitName?: string;
  priority?: 'THAP' | 'TRUNG_BINH' | 'CAO' | 'KHAN_CAP';
  vehicleCode: string;
  vehicleName: string;
  vehiclePlate?: string;
  implementName?: string;
  driverName?: string;
  driverPhone?: string;
  secondaryDriverName?: string;
  startTime: string;
  endTime?: string;
  durationHours: number;
  workDate?: string;
  shiftType?: 'CA_NGAY' | 'CA_DEM' | string;
  driverAcceptedAt?: string;
  actualStartTime?: string;
  acceptedAt?: string;
  status: string;
  statusLabel?: string;
  workflowStepIndex: number;
  workVolume?: string;
  fuelInfo?: string;
  acceptanceInfo?: string;
  notes?: string;
  isDelayed?: boolean;
  rawItem: any;
}

export interface SchedulerLane {
  laneKey: string;
  vehicleCode: string;
  vehicleName: string;
  vehiclePlate?: string;
  category?: 'AGRICULTURE' | 'CONSTRUCTION' | 'TRANSPORT' | string;
  implementName?: string;
  primaryDriverName?: string;
  driverPhone?: string;
  items: SchedulerItem[];
}

interface Vehicle24hSchedulerProps {
  title?: string;
  selectedDate: string;
  onDateChange: (date: string) => void;
  availableDates?: string[];
  lanes: SchedulerLane[];
  unassignedItems?: SchedulerItem[];
  onItemClick: (rawItem: any) => void;
  kind?: 'AGRICULTURE' | 'CONSTRUCTION' | 'TRANSPORT' | 'GENERAL';
}

type TimelineMode = 'grid' | 'gantt' | 'milestones';

const HOURS_24 = Array.from({ length: 24 }, (_, hour) => `${String(hour).padStart(2, '0')}:00`);
const FINISHED_STATUSES = new Set(['COMPLETED', 'DELIVERED', 'ACCEPTED', 'HOAN_THANH', 'CLOSED']);

function toDateString(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function parseTime(value?: string): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime()) && value.includes('T')) return parsed;
  const match = value.match(/(\d{1,2}):(\d{2})/);
  if (!match) return null;
  const date = new Date(2000, 0, 1, Number(match[1]), Number(match[2]));
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatTime(value?: string, fallback = '—') {
  const date = parseTime(value);
  if (!date) return fallback;
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function hourValue(value?: string) {
  const date = parseTime(value);
  return date ? date.getHours() + date.getMinutes() / 60 : 0;
}

function receiveDelta(item: SchedulerItem) {
  const planned = parseTime(item.startTime);
  const received = parseTime(item.driverAcceptedAt);
  if (!planned || !received) return null;
  const plannedMinute = Math.floor(planned.getTime() / 60_000);
  const receivedMinute = Math.floor(received.getTime() / 60_000);
  return receivedMinute - plannedMinute;
}

function deltaLabel(delta: number | null) {
  if (delta === null) return 'Chưa nhận lệnh';
  if (delta === 0) return 'Đúng giờ';
  if (delta < 0) return `Sớm ${Math.abs(delta)} phút`;
  return delta <= 15 ? `Sau dự kiến ${delta} phút · trong hạn` : `Quá hạn ${delta} phút`;
}

function deltaClass(delta: number | null) {
  if (delta === null) return 'border-slate-200 bg-slate-100 text-slate-600';
  if (delta > 15) return 'border-rose-200 bg-rose-50 text-rose-700';
  return 'border-emerald-200 bg-emerald-50 text-emerald-700';
}

const WORKFLOW_STAGES = ['Tạo lệnh', 'Tài xế nhận lệnh', 'Đến điểm làm việc', 'Làm việc', 'Nghiệm thu', 'Trở về bãi'];

function workflowIndex(item: SchedulerItem) {
  if (item.status === 'RETURNING_TO_DEPOT' || item.status === 'CLOSED') return 5;
  if (item.acceptedAt || item.status === 'ACCEPTED') return 4;
  if (item.actualStartTime || ['WORKING', 'IN_PROGRESS', 'SHIFT_FINISHED', 'WAITING_REPORT', 'WAITING_REVIEW', 'COMPLETED'].includes(item.status)) return 3;
  if (item.status === 'AT_WORKSITE') return 2;
  if (item.driverAcceptedAt || ['DRIVER_ACCEPTED', 'DEPARTED', 'DA_NHAN'].includes(item.status)) return 1;
  return 0;
}

const modeOptions: Array<{
  value: TimelineMode;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { value: 'grid', label: 'Tổng quan', description: 'Đọc nhanh từng lệnh', icon: LayoutGrid },
  { value: 'gantt', label: 'Tiến độ 24 giờ', description: 'So sánh thời lượng theo xe', icon: CalendarDays },
  { value: 'milestones', label: 'Mốc thực tế', description: 'Nhận · Làm việc · Nghiệm thu', icon: Milestone },
];

const TimeAxis: React.FC<{ leftWidth: number; hourWidth: number; leftLabel: string }> = ({ leftWidth, hourWidth, leftLabel }) => (
  <div className="grid border-b border-slate-200 bg-slate-50 text-[10px] font-bold text-slate-500" style={{ gridTemplateColumns: `${leftWidth}px repeat(24, ${hourWidth}px)` }}>
    <div className="sticky left-0 z-20 border-r border-slate-200 bg-slate-50 px-3 py-2 text-slate-700">{leftLabel}</div>
    {HOURS_24.map((hour, index) => (
      <div key={hour} className={`border-r border-slate-200 py-2 text-center font-mono ${index % 6 === 0 ? 'bg-slate-100 text-slate-800' : ''}`}>
        {hour}
      </div>
    ))}
  </div>
);

export const Vehicle24hScheduler: React.FC<Vehicle24hSchedulerProps> = ({
  title = 'Theo dõi lịch chạy và giờ nhận lệnh',
  selectedDate,
  onDateChange,
  lanes,
  unassignedItems = [],
  onItemClick,
}) => {
  const [timelineMode, setTimelineMode] = useState<TimelineMode>('grid');
  const [zoomLevel, setZoomLevel] = useState(90);
  const [nightShiftOnly, setNightShiftOnly] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [showUnassigned, setShowUnassigned] = useState(true);

  const filteredLanes = useMemo(() => {
    const query = searchTerm.trim().toLocaleLowerCase('vi');
    return lanes
      .map((lane) => ({
        ...lane,
        items: lane.items.filter((item) => {
          if (query) {
            const source = [item.code, item.title, item.location, item.driverName, lane.vehicleCode, lane.vehicleName, lane.vehiclePlate]
              .filter(Boolean)
              .join(' ')
              .toLocaleLowerCase('vi');
            if (!source.includes(query)) return false;
          }
          if (filterStatus === 'WAITING' && item.driverAcceptedAt) return false;
          if (filterStatus === 'LATE' && !(receiveDelta(item) !== null && receiveDelta(item)! > 15)) return false;
          if (filterStatus === 'RUNNING' && item.workflowStepIndex !== 2) return false;
          if (filterStatus === 'DONE' && !FINISHED_STATUSES.has(item.status)) return false;
          if (nightShiftOnly) {
            const hour = hourValue(item.startTime);
            if (hour >= 6 && hour < 18) return false;
          }
          return true;
        }),
      }))
      .filter((lane) => lane.items.length > 0);
  }, [filterStatus, lanes, nightShiftOnly, searchTerm]);

  const allItems = useMemo(() => filteredLanes.flatMap((lane) => lane.items.map((item) => ({ lane, item }))), [filteredLanes]);
  const summary = useMemo(() => {
    const items = lanes.flatMap((lane) => lane.items);
    return {
      total: items.length,
      received: items.filter((item) => item.driverAcceptedAt).length,
      late: items.filter((item) => (receiveDelta(item) ?? 0) > 15).length,
      waiting: items.filter((item) => !item.driverAcceptedAt).length,
    };
  }, [lanes]);

  const displayDate = selectedDate === 'ALL' || !selectedDate
    ? 'Tất cả ngày'
    : selectedDate.split('-').reverse().join('/');
  const isToday = selectedDate === toDateString(new Date());
  const hourWidth = Math.round(64 * zoomLevel / 100);
  const timelineWidth = 24 * hourWidth;

  const stepDate = (days: number) => {
    const date = selectedDate === 'ALL' || !selectedDate ? new Date() : new Date(`${selectedDate}T00:00:00`);
    date.setDate(date.getDate() + days);
    onDateChange(toDateString(date));
  };

  const resetFilters = () => {
    setSearchTerm('');
    setFilterStatus('ALL');
    setNightShiftOnly(false);
  };

  const renderTiming = (item: SchedulerItem, compact = false) => {
    const delta = receiveDelta(item);
    return (
      <div className={`grid ${compact ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-4'} gap-2`}>
        <div className="rounded-lg bg-slate-50 px-2.5 py-2">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Dự kiến bắt đầu</div>
          <div className="mt-0.5 font-mono text-sm font-black text-slate-900">{formatTime(item.startTime)}</div>
        </div>
        <div className="rounded-lg bg-sky-50 px-2.5 py-2">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-sky-700">Tài xế nhận lệnh</div>
          <div className="mt-0.5 font-mono text-sm font-black text-sky-950">{formatTime(item.driverAcceptedAt)}</div>
        </div>
        {!compact && (
          <>
            <div className="rounded-lg bg-amber-50 px-2.5 py-2">
              <div className="text-[10px] font-semibold uppercase tracking-wide text-amber-700">Bắt đầu làm việc</div>
              <div className="mt-0.5 font-mono text-sm font-black text-amber-950">{formatTime(item.actualStartTime)}</div>
            </div>
            <div className="rounded-lg bg-emerald-50 px-2.5 py-2">
              <div className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700">Nghiệm thu</div>
              <div className="mt-0.5 font-mono text-sm font-black text-emerald-950">{formatTime(item.acceptedAt)}</div>
            </div>
          </>
        )}
        <span className={`col-span-2 w-fit rounded-full border px-2 py-0.5 text-[10px] font-bold ${deltaClass(delta)}`}>
          {deltaLabel(delta)}
        </span>
      </div>
    );
  };

  return (
    <section className="space-y-3.5">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        <div className="flex flex-col gap-4 border-b border-slate-200 bg-gradient-to-r from-slate-950 to-slate-800 px-5 py-4 text-white lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Clock3 className="h-5 w-5 text-amber-400" />
              <h2 className="text-base font-black">{title}</h2>
            </div>
            <p className="mt-1 text-xs text-slate-300">Đối chiếu giờ dự kiến với lúc tài xế nhận lệnh và tiến độ làm việc.</p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              ['Lệnh đã xếp', summary.total, 'text-white'],
              ['Đã nhận', summary.received, 'text-sky-300'],
              ['Nhận quá hạn', summary.late, 'text-rose-300'],
              ['Chờ nhận', summary.waiting, 'text-amber-300'],
            ].map(([label, value, color]) => (
              <div key={String(label)} className="min-w-[94px] rounded-xl border border-white/10 bg-white/10 px-3 py-2">
                <div className="text-[10px] font-semibold text-slate-300">{label}</div>
                <div className={`text-lg font-black ${color}`}>{value}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-3.5">
          <div className="grid gap-2 lg:grid-cols-3" role="tablist" aria-label="Chế độ hiển thị lịch chạy">
            {modeOptions.map((mode) => {
              const Icon = mode.icon;
              const active = timelineMode === mode.value;
              return (
                <button
                  key={mode.value}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setTimelineMode(mode.value)}
                  className={`flex items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition-all ${active ? 'border-emerald-700 bg-emerald-700 text-white shadow-md' : 'border-slate-200 bg-white text-slate-700 hover:border-emerald-300 hover:bg-emerald-50'}`}
                >
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${active ? 'bg-white/15 text-amber-300' : 'bg-slate-100 text-slate-600'}`}>
                    <Icon className="h-4.5 w-4.5" />
                  </span>
                  <span>
                    <span className="block text-xs font-black">{mode.label}</span>
                    <span className={`mt-0.5 block text-[10px] font-medium ${active ? 'text-emerald-100' : 'text-slate-500'}`}>{mode.description}</span>
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
            <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 p-0.5">
              <button type="button" onClick={() => stepDate(-1)} title="Ngày trước" className="rounded-lg p-1.5 text-slate-600 hover:bg-white hover:text-slate-900"><ChevronLeft className="h-4 w-4" /></button>
              <label className="relative flex min-w-[112px] cursor-pointer items-center justify-center gap-1.5 px-2 text-xs font-bold text-slate-900">
                <Calendar className="h-3.5 w-3.5 text-emerald-700" />
                {displayDate}
                <input type="date" value={selectedDate === 'ALL' ? '' : selectedDate} onChange={(event) => onDateChange(event.target.value || 'ALL')} className="absolute inset-0 cursor-pointer opacity-0" />
              </label>
              <button type="button" onClick={() => stepDate(1)} title="Ngày sau" className="rounded-lg p-1.5 text-slate-600 hover:bg-white hover:text-slate-900"><ChevronRight className="h-4 w-4" /></button>
            </div>
            <button type="button" onClick={() => onDateChange(toDateString(new Date()))} className={`rounded-xl border px-3 py-1.5 text-xs font-bold ${isToday ? 'border-emerald-700 bg-emerald-700 text-white' : 'border-emerald-300 bg-white text-emerald-700 hover:bg-emerald-50'}`}>Hôm nay</button>

            <div className="relative min-w-[220px] flex-1 lg:max-w-sm">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Tìm mã lệnh, xe hoặc tài xế" className="w-full rounded-xl border border-slate-200 bg-slate-50 py-1.5 pl-9 pr-3 text-xs outline-none focus:border-emerald-600 focus:bg-white" />
            </div>
            <select value={filterStatus} onChange={(event) => setFilterStatus(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 outline-none focus:border-emerald-600">
              <option value="ALL">Tất cả tiến độ</option>
              <option value="WAITING">Chưa nhận lệnh</option>
              <option value="LATE">Quá 15 phút chưa nhận</option>
              <option value="RUNNING">Đang thực hiện</option>
              <option value="DONE">Đã nghiệm thu</option>
            </select>
            <button type="button" aria-pressed={nightShiftOnly} onClick={() => setNightShiftOnly((value) => !value)} className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold ${nightShiftOnly ? 'border-indigo-950 bg-indigo-950 text-white' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}><Moon className="h-3.5 w-3.5" /> Ca đêm</button>
            {(searchTerm || filterStatus !== 'ALL' || nightShiftOnly) && <button type="button" onClick={resetFilters} className="text-xs font-bold text-emerald-700 hover:underline">Xóa lọc</button>}

            {timelineMode !== 'grid' && (
              <label className="ml-auto flex items-center gap-2 text-[10px] font-bold text-slate-500">
                Thu phóng
                <input type="range" min="75" max="130" step="5" value={zoomLevel} onChange={(event) => setZoomLevel(Number(event.target.value))} className="w-24 accent-emerald-700" />
                <span className="w-9 font-mono text-slate-700">{zoomLevel}%</span>
              </label>
            )}
          </div>
        </div>
      </div>

      {unassignedItems.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3.5">
          <button type="button" onClick={() => setShowUnassigned((value) => !value)} className="flex w-full items-center justify-between text-left">
            <span className="flex items-center gap-2 text-xs font-black text-amber-950"><AlertTriangle className="h-4 w-4 text-amber-600" /> {unassignedItems.length} lệnh chưa có xe hoặc tài xế</span>
            <span className="text-[10px] font-bold text-amber-800">{showUnassigned ? 'Thu gọn' : 'Xem lệnh'}</span>
          </button>
          {showUnassigned && (
            <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              {unassignedItems.map((item) => (
                <button key={item.id} type="button" onClick={() => onItemClick(item.rawItem)} className="rounded-xl border border-amber-200 bg-white p-3 text-left hover:border-amber-400 hover:shadow-sm">
                  <div className="flex items-center justify-between gap-2"><span className="font-mono text-[11px] font-black text-emerald-800">{item.code}</span><span className="rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-bold text-amber-800">Chờ phân công</span></div>
                  <div className="mt-1 truncate text-xs font-bold text-slate-900">{item.title}</div>
                  <div className="mt-2 text-[10px] text-slate-500">Bắt đầu dự kiến <span className="font-mono font-bold text-slate-800">{formatTime(item.startTime)}</span></div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {allItems.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center text-sm text-slate-500">
          Không có lịch chạy phù hợp. <button type="button" onClick={resetFilters} className="font-bold text-emerald-700 hover:underline">Xóa bộ lọc</button>
        </div>
      ) : timelineMode === 'grid' ? (
        <div className="grid gap-3 xl:grid-cols-2">
          {allItems.map(({ lane, item }) => {
            const delta = receiveDelta(item);
            return (
              <button key={`${lane.laneKey}-${item.id}`} type="button" onClick={() => onItemClick(item.rawItem)} className="rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-xs transition-all hover:border-emerald-300 hover:shadow-md">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2"><span className="font-mono text-xs font-black text-emerald-800">{item.code}</span><span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${deltaClass(delta)}`}>{deltaLabel(delta)}</span></div>
                    <div className="mt-1 truncate text-sm font-black text-slate-900">{item.title}</div>
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-600"><span className="font-semibold"><Truck className="mr-1 inline h-3 w-3" />{lane.vehicleCode}</span><span><UserCheck className="mr-1 inline h-3 w-3" />{item.driverName || 'Chưa gán tài xế'}</span>{item.implementName && <span><Wrench className="mr-1 inline h-3 w-3" />{item.implementName}</span>}</div>
                  </div>
                  <span className="shrink-0 rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600">{formatTime(item.startTime)}–{formatTime(item.endTime)}</span>
                </div>
                <div className="mt-3 border-t border-slate-100 pt-3">{renderTiming(item)}</div>
                <div className="mt-3 grid grid-cols-3 gap-1.5 sm:grid-cols-6">
                  {WORKFLOW_STAGES.map((stage, index) => {
                    const reached = index <= workflowIndex(item);
                    return (
                      <div key={stage} className={`rounded-lg border px-2 py-1.5 text-center text-[9px] font-bold ${reached ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-slate-200 bg-slate-50 text-slate-400'}`}>
                        <span className="mr-1">{reached ? '✓' : index + 1}</span>{stage}
                      </div>
                    );
                  })}
                </div>
              </button>
            );
          })}
        </div>
      ) : timelineMode === 'gantt' ? (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-xs">
          <div style={{ minWidth: 260 + timelineWidth }}>
            <TimeAxis leftWidth={260} hourWidth={hourWidth} leftLabel={`${filteredLanes.length} phương tiện`} />
            {filteredLanes.map((lane) => {
              const rowHeight = Math.max(76, lane.items.length * 58 + 16);
              return (
                <div key={lane.laneKey} className="grid border-b border-slate-100" style={{ gridTemplateColumns: `260px ${timelineWidth}px`, minHeight: rowHeight }}>
                  <div className="sticky left-0 z-20 flex flex-col justify-center border-r border-slate-200 bg-slate-50 px-3">
                    <div className="font-mono text-xs font-black text-slate-900">{lane.vehicleCode}</div><div className="truncate text-[11px] font-semibold text-slate-600">{lane.vehicleName}</div><div className="mt-1 truncate text-[10px] text-slate-500">{lane.primaryDriverName || 'Chưa gán tài xế'}</div>
                  </div>
                  <div className="relative" style={{ backgroundImage: `repeating-linear-gradient(to right, transparent 0, transparent ${hourWidth - 1}px, #e2e8f0 ${hourWidth - 1}px, #e2e8f0 ${hourWidth}px)` }}>
                    {lane.items.map((item, index) => {
                      const start = hourValue(item.startTime);
                      const duration = Math.max(0.75, Math.min(24 - start, item.durationHours || 1));
                      const delta = receiveDelta(item);
                      const receiveHour = hourValue(item.driverAcceptedAt);
                      return (
                        <button key={item.id} type="button" onClick={() => onItemClick(item.rawItem)} className={`absolute h-11 overflow-hidden rounded-lg border px-2.5 text-left shadow-sm hover:brightness-95 ${item.isDelayed || (delta ?? 0) > 0 ? 'border-rose-300 bg-rose-100 text-rose-950' : item.workflowStepIndex >= 3 ? 'border-emerald-300 bg-emerald-100 text-emerald-950' : 'border-sky-300 bg-sky-100 text-sky-950'}`} style={{ left: start * hourWidth, top: 8 + index * 58, width: Math.max(74, duration * hourWidth) }} title={`${item.code}: ${deltaLabel(delta)}`}>
                          <div className="truncate text-[10px] font-black">{item.code} · {item.title}</div><div className="mt-0.5 flex items-center gap-2 text-[9px] font-semibold"><span>Dự kiến {formatTime(item.startTime)}</span><span>Nhận {formatTime(item.driverAcceptedAt)}</span></div>
                          {item.driverAcceptedAt && <span className="absolute bottom-0 top-0 w-0.5 bg-sky-700" style={{ left: Math.max(2, Math.min(duration * hourWidth - 2, (receiveHour - start) * hourWidth)) }} />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-xs">
          <div style={{ minWidth: 300 + timelineWidth }}>
            <TimeAxis leftWidth={300} hourWidth={hourWidth} leftLabel="Lệnh / phương tiện" />
            {allItems.map(({ lane, item }) => {
              const milestones = [
                { label: 'Dự kiến', value: item.startTime, color: 'border-slate-700 bg-white text-slate-800' },
                { label: 'Tài xế nhận', value: item.driverAcceptedAt, color: 'border-sky-600 bg-sky-600 text-white' },
                { label: 'Bắt đầu làm việc', value: item.actualStartTime, color: 'border-amber-600 bg-amber-500 text-white' },
                { label: 'Nghiệm thu', value: item.acceptedAt, color: 'border-emerald-700 bg-emerald-600 text-white' },
              ].filter((point) => point.value);
              const delta = receiveDelta(item);
              return (
                <div key={`${lane.laneKey}-${item.id}`} className="grid min-h-[92px] border-b border-slate-100" style={{ gridTemplateColumns: `300px ${timelineWidth}px` }}>
                  <button type="button" onClick={() => onItemClick(item.rawItem)} className="sticky left-0 z-20 border-r border-slate-200 bg-white px-3 py-2 text-left hover:bg-slate-50">
                    <div className="flex items-center justify-between gap-2"><span className="font-mono text-[11px] font-black text-emerald-800">{item.code}</span><span className={`rounded-full border px-1.5 py-0.5 text-[9px] font-bold ${deltaClass(delta)}`}>{deltaLabel(delta)}</span></div><div className="mt-1 truncate text-xs font-bold text-slate-900">{item.title}</div><div className="mt-1 truncate text-[10px] text-slate-500">{lane.vehicleCode} · {item.driverName || 'Chưa gán tài xế'}</div>
                  </button>
                  <div className="relative" style={{ backgroundImage: `repeating-linear-gradient(to right, transparent 0, transparent ${hourWidth - 1}px, #e2e8f0 ${hourWidth - 1}px, #e2e8f0 ${hourWidth}px)` }}>
                    <div className="absolute left-0 right-0 top-[30px] h-0.5 bg-slate-200" />
                    {milestones.map((point, index) => (
                      <button key={`${point.label}-${point.value}`} type="button" onClick={() => onItemClick(item.rawItem)} className="absolute top-4 -translate-x-1/2 text-center" style={{ left: hourValue(point.value) * hourWidth, zIndex: 10 + index }} title={`${point.label}: ${formatTime(point.value)}`}>
                        <span className={`mx-auto flex h-7 w-7 items-center justify-center rounded-full border-2 text-[10px] font-black shadow-sm ${point.color}`}>{index + 1}</span><span className="mt-1 block whitespace-nowrap rounded bg-white/90 px-1 text-[9px] font-bold text-slate-700">{point.label} {formatTime(point.value)}</span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[10px] font-semibold text-slate-600">
        <span className="font-black text-slate-800">Chú thích thời gian</span><span><i className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-slate-700" /> Dự kiến bắt đầu</span><span><i className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-sky-600" /> Tài xế nhận lệnh</span><span><i className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-amber-500" /> Bắt đầu làm việc</span><span><i className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-emerald-600" /> Nghiệm thu</span><span className="ml-auto flex items-center gap-1 text-slate-500"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Bấm vào lệnh để xem chi tiết</span>
      </div>
    </section>
  );
};
