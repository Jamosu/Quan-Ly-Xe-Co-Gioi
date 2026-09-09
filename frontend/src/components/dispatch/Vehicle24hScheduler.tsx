import React, { useState, useMemo } from 'react';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  Search,
  Truck,
  Tractor,
  Wrench,
  User,
  CheckCircle2,
  AlertTriangle,
  Play,
  RotateCcw,
  Sparkles,
  Layers,
  MapPin,
  ClipboardCheck,
  Fuel,
  LayoutGrid,
  CalendarDays,
  Milestone,
  ZoomIn,
  ZoomOut,
  Moon,
  Sun,
  Filter,
  SlidersHorizontal,
  Flame,
  FolderTree,
  Target,
  Check,
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
  
  // Phương tiện & tài xế
  vehicleCode: string;
  vehicleName: string;
  vehiclePlate?: string;
  implementName?: string;
  driverName?: string;
  driverPhone?: string;
  secondaryDriverName?: string;
  
  // Thời gian & ca làm việc
  startTime: string; // "HH:mm" hoặc ISO string
  endTime?: string;   // "HH:mm" hoặc ISO string
  durationHours: number; // e.g. 7.5, 8.0, 4.0
  workDate?: string;
  shiftType?: 'CA_NGAY' | 'CA_DEM' | string;
  
  // Trạng thái & Chu trình 3 giai đoạn chuẩn
  status: string;
  statusLabel?: string;
  /**
   * Chu trình 3 giai đoạn:
   * 1: Tài xế giao nhận (Thời điểm ghi nhận / Phân công xe / Bàn giao ca)
   * 2: Đang thực hiện (Thanh vàng dài trải qua các giờ xử lý / thi công)
   * 3: Nghiệm thu (Nghiệm thu đạt & đóng phiếu)
   */
  workflowStepIndex: number;
  
  // Chi tiết thực địa
  workVolume?: string; // e.g. "12.5 Ha", "450 m³"
  fuelInfo?: string;   // e.g. "Đã cấp 118L dầu"
  acceptanceInfo?: string; // e.g. "Phan Long nghiệm thu · Đạt 100%"
  notes?: string;
  isDelayed?: boolean;
  
  // Dữ liệu gốc để trigger modal
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
  selectedDate: string; // "YYYY-MM-DD" hoặc "ALL"
  onDateChange: (date: string) => void;
  availableDates?: string[];
  lanes: SchedulerLane[];
  unassignedItems?: SchedulerItem[];
  onItemClick: (rawItem: any) => void;
  kind?: 'AGRICULTURE' | 'CONSTRUCTION' | 'TRANSPORT' | 'GENERAL';
}

// 24 Giờ trong ngày (00:00 -> 23:00)
const HOURS_24 = Array.from({ length: 24 }, (_, i) => ({
  hour: i,
  label: `${String(i).padStart(2, '0')}:00`,
  shift: i < 6 ? 'NIGHT' : i < 12 ? 'MORNING' : i < 18 ? 'AFTERNOON' : 'EVENING',
}));

export const Vehicle24hScheduler: React.FC<Vehicle24hSchedulerProps> = ({
  title = 'Scheduler lịch chạy phương tiện 24h',
  selectedDate,
  onDateChange,
  availableDates = [],
  lanes,
  unassignedItems = [],
  onItemClick,
  kind = 'AGRICULTURE',
}) => {
  // 1. Chế độ hiển thị: Bảng Giai Đoạn (Grid) | Dòng Thời Gian (Gantt) | Cột Mốc (Milestones)
  const [timelineMode, setTimelineMode] = useState<'grid' | 'gantt' | 'milestones'>('grid');

  // 2. Độ phân giải thời gian: Ngày / 24 Giờ | Tuần | Tháng | Quý
  const [timeGranularity, setTimeGranularity] = useState<'ngay' | 'tuan' | 'thang' | 'quy'>('ngay');

  // 3. Thanh trượt thu phóng (Zoom slider): 70% -> 140%
  const [zoomLevel, setZoomLevel] = useState<number>(100);

  // 4. Bộ lọc ca đêm / chế độ tối (Night shift focus)
  const [nightShiftOnly, setNightShiftOnly] = useState<boolean>(false);

  // 5. Tìm kiếm & Bộ lọc nâng cao
  const [searchTerm, setSearchTerm] = useState('');
  const [filterUnit, setFilterUnit] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterPriority, setFilterPriority] = useState<string>('ALL');

  // 6. Trạng thái mở rộng / thu gọn
  const [isAllExpanded, setIsAllExpanded] = useState<boolean>(true);
  const [showUnassignedDrawer, setShowUnassignedDrawer] = useState<boolean>(true);

  // Danh sách các đơn vị / xí nghiệp duy nhất để đưa vào dropdown lọc
  const uniqueUnits = useMemo(() => {
    const set = new Set<string>();
    for (const lane of lanes) {
      for (const item of lane.items) {
        if (item.unitName) set.add(item.unitName);
      }
    }
    return Array.from(set);
  }, [lanes]);

  // Lọc dữ liệu theo Search và 3 Dropdown
  const filteredLanes = useMemo(() => {
    return lanes
      .map((lane) => {
        const matchingItems = lane.items.filter((it) => {
          // Lọc theo search
          if (searchTerm.trim()) {
            const q = searchTerm.toLowerCase();
            const matchCode = it.code.toLowerCase().includes(q);
            const matchTitle = it.title.toLowerCase().includes(q);
            const matchLoc = (it.location || '').toLowerCase().includes(q);
            const matchDriver = (it.driverName || '').toLowerCase().includes(q);
            const matchVehicle =
              lane.vehicleCode.toLowerCase().includes(q) ||
              lane.vehicleName.toLowerCase().includes(q) ||
              (lane.vehiclePlate || '').toLowerCase().includes(q);
            if (!matchCode && !matchTitle && !matchLoc && !matchDriver && !matchVehicle) {
              return false;
            }
          }

          // Lọc theo 3 Giai đoạn chuẩn
          if (filterStatus !== 'ALL') {
            if (filterStatus === 'GIAO_NHAN' && it.workflowStepIndex !== 1) return false;
            if (filterStatus === 'THUC_HIEN' && it.workflowStepIndex !== 2) return false;
            if (filterStatus === 'NGHIEM_THU' && it.workflowStepIndex < 3) return false;
          }

          // Lọc theo Đơn vị / Xí nghiệp
          if (filterUnit !== 'ALL' && it.unitName && it.unitName !== filterUnit) {
            return false;
          }

          // Lọc theo Ca đêm (nếu bật nút 🌙 Ca đêm / Tối)
          if (nightShiftOnly) {
            const startHour = parseHourValue(it.startTime);
            const isNight = startHour >= 18 || startHour < 6;
            if (!isNight) return false;
          }

          return true;
        });

        return { ...lane, items: matchingItems };
      })
      .filter((lane) => isAllExpanded || lane.items.length > 0);
  }, [lanes, searchTerm, filterStatus, filterUnit, filterPriority, nightShiftOnly, isAllExpanded]);

  // Điều hướng ngày
  const handleStepDate = (days: number) => {
    const base = selectedDate === 'ALL' || !selectedDate ? new Date() : new Date(selectedDate);
    base.setDate(base.getDate() + days);
    const y = base.getFullYear();
    const m = String(base.getMonth() + 1).padStart(2, '0');
    const d = String(base.getDate()).padStart(2, '0');
    onDateChange(`${y}-${m}-${d}`);
  };

  const toDateString = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const isToday = selectedDate === toDateString(new Date());

  // Xóa toàn bộ bộ lọc
  const handleResetFilters = () => {
    setSearchTerm('');
    setFilterUnit('ALL');
    setFilterStatus('ALL');
    setFilterPriority('ALL');
    setNightShiftOnly(false);
  };

  // Tính toán độ rộng cột giờ dựa trên thanh trượt Zoom
  const hourColWidth = useMemo(() => {
    const base = 70; // 70px ở 100%
    return Math.max(50, Math.min(120, Math.round(base * (zoomLevel / 100))));
  }, [zoomLevel]);

  // Phân giải giờ bắt đầu (0 -> 23.99)
  function parseHourValue(timeStr?: string): number {
    if (!timeStr) return 7;
    if (timeStr.includes('T')) {
      const d = new Date(timeStr);
      if (!isNaN(d.getTime())) return d.getHours() + d.getMinutes() / 60;
    }
    const match = timeStr.match(/(\d{1,2}):(\d{2})/);
    if (match) {
      return parseInt(match[1], 10) + parseInt(match[2], 10) / 60;
    }
    return 7;
  }

  // Định dạng chuỗi giờ "HH:mm"
  function formatHourString(timeStr?: string): string {
    if (!timeStr) return '07:00';
    if (timeStr.includes('T')) {
      const d = new Date(timeStr);
      if (!isNaN(d.getTime())) {
        return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
      }
    }
    const match = timeStr.match(/(\d{1,2}):(\d{2})/);
    if (match) {
      return `${match[1].padStart(2, '0')}:${match[2]}`;
    }
    return timeStr;
  }

  // Định dạng ngày hiển thị VN
  const displayFormattedDate = useMemo(() => {
    if (selectedDate === 'ALL' || !selectedDate) return 'Tất cả các ngày';
    const parts = selectedDate.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return selectedDate;
  }, [selectedDate]);

  return (
    <div className="space-y-3.5 select-none font-sans">
      {/* 1. THANH TIÊU CHUẨN: "CÁC CHẶNG TIẾN ĐỘ" (LEGEND BĂNG TRÊN CÙNG - 3 GIAI ĐOẠN) */}
      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs sm:text-[13px] font-extrabold uppercase tracking-wider text-slate-900">
            CÁC CHẶNG TIẾN ĐỘ:
          </span>
        </div>

        {/* 3 Badge chặng tiến độ chuẩn: Tài xế giao nhận -> Đang thực hiện -> Nghiệm thu */}
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-4 text-xs font-semibold">
          {/* Chặng 1: Tài xế giao nhận */}
          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center gap-1 rounded-full bg-[#0284c7] px-2.5 py-0.5 text-[11px] font-bold text-white shadow-2xs">
              <span>📌</span> Tài xế giao nhận
            </span>
            <span className="text-[11.5px] text-slate-600 font-medium">Thời điểm ghi nhận / Bàn giao xe & việc</span>
          </div>

          {/* Chặng 2: Đang thực hiện */}
          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center gap-1 rounded-full bg-[#ea580c] px-2.5 py-0.5 text-[11px] font-bold text-white shadow-2xs">
              <span>⚡</span> Đang thực hiện
            </span>
            <span className="text-[11.5px] text-slate-600 font-medium">Thanh vàng dài trải qua các giờ xử lý</span>
          </div>

          {/* Chặng 3: Nghiệm thu */}
          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center gap-1 rounded-full bg-[#16a34a] px-2.5 py-0.5 text-[11px] font-bold text-white shadow-2xs">
              <span>✅</span> Nghiệm thu
            </span>
            <span className="text-[11.5px] text-slate-600 font-medium">Nghiệm thu đạt & đóng phiếu</span>
          </div>
        </div>
      </div>

      {/* 2. KHUNG ĐIỀU KHIỂN & BỘ LỌC TIMELINE ĐỒNG BỘ 100% VỚI HÌNH */}
      <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xs space-y-3">
        {/* HÀNG 1: CÁC NÚT CHUYỂN CHẾ ĐỘ + GRANULARITY + ZOOM + NGÀY + TỐI */}
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          {/* Nhóm trái 1: Chuyển chế độ [Bảng Giai Đoạn (Grid)] [Dòng Thời Gian (Gantt)] [Cột Mốc (Milestones)] */}
          <div className="flex items-center rounded-xl bg-slate-100 p-1 border border-slate-200 shadow-2xs">
            <button
              type="button"
              onClick={() => setTimelineMode('grid')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                timelineMode === 'grid'
                  ? 'bg-[#166534] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span>Bảng Giai Đoạn (Grid)</span>
            </button>

            <button
              type="button"
              onClick={() => setTimelineMode('gantt')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                timelineMode === 'gantt'
                  ? 'bg-[#166534] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
              }`}
            >
              <CalendarDays className="h-3.5 w-3.5" />
              <span>Dòng Thời Gian (Gantt)</span>
            </button>

            <button
              type="button"
              onClick={() => setTimelineMode('milestones')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                timelineMode === 'milestones'
                  ? 'bg-[#166534] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
              }`}
            >
              <Milestone className="h-3.5 w-3.5" />
              <span>Cột Mốc (Milestones)</span>
            </button>
          </div>

          {/* Nhóm 2: Chuyển chu kỳ [Ngày | Tuần | Tháng | Quý] */}
          <div className="flex items-center rounded-xl bg-slate-100 p-1 border border-slate-200 shadow-2xs text-xs">
            {(['ngay', 'tuan', 'thang', 'quy'] as const).map((g) => {
              const labelMap = { ngay: 'Ngày (24h)', tuan: 'Tuần', thang: 'Tháng', quy: 'Quý' };
              const isActive = timeGranularity === g;
              return (
                <button
                  key={g}
                  type="button"
                  onClick={() => setTimeGranularity(g)}
                  className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-white text-emerald-900 shadow-2xs border border-slate-200/60'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {labelMap[g]}
                </button>
              );
            })}
          </div>

          {/* Nhóm 3: Thanh trượt Zoom [ 🔍 - ===●=== + 100% ] */}
          <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-1 border border-slate-200 shadow-2xs text-xs">
            <Search className="h-3.5 w-3.5 text-slate-400" />
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.max(70, z - 10))}
              className="font-bold text-slate-600 hover:text-slate-900 px-1 py-0.5 rounded hover:bg-slate-200"
              title="Thu nhỏ"
            >
              -
            </button>
            <input
              type="range"
              min="70"
              max="140"
              step="5"
              value={zoomLevel}
              onChange={(e) => setZoomLevel(parseInt(e.target.value, 10))}
              className="w-20 sm:w-24 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-700"
            />
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.min(140, z + 10))}
              className="font-bold text-slate-600 hover:text-slate-900 px-1 py-0.5 rounded hover:bg-slate-200"
              title="Phóng to"
            >
              +
            </button>
            <span className="font-mono text-[11px] font-bold text-emerald-900 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
              {zoomLevel}%
            </span>
          </div>

          {/* Nhóm 4: Điều hướng ngày & Nút Hôm nay & Nút Ca Đêm/Tối */}
          <div className="flex items-center gap-2">
            {/* Bộ chọn ngày < 14/08/2026 📅 > */}
            <div className="flex items-center rounded-xl bg-slate-50 border border-slate-200 p-0.5 shadow-2xs">
              <button
                type="button"
                onClick={() => handleStepDate(-1)}
                className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                title="Ngày trước"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <div className="flex items-center gap-1.5 px-2.5 py-0.5">
                <span className="text-xs font-bold text-slate-900 font-mono">
                  {displayFormattedDate}
                </span>
                <input
                  type="date"
                  value={selectedDate === 'ALL' || !selectedDate ? '' : selectedDate}
                  onChange={(e) => onDateChange(e.target.value || 'ALL')}
                  className="opacity-0 w-4 h-4 absolute cursor-pointer"
                  title="Chọn ngày"
                />
                <Calendar className="h-3.5 w-3.5 text-emerald-700 cursor-pointer pointer-events-none" />
              </div>

              <button
                type="button"
                onClick={() => handleStepDate(1)}
                className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                title="Ngày sau"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {/* Nút Hôm nay (viền xanh lá) */}
            <button
              type="button"
              onClick={() => onDateChange(toDateString(new Date()))}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                isToday
                  ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
                  : 'border-emerald-600 text-emerald-700 hover:bg-emerald-50 bg-white'
              }`}
            >
              Hôm nay
            </button>

            {/* Nút Ca đêm / Tối */}
            <button
              type="button"
              onClick={() => setNightShiftOnly(!nightShiftOnly)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                nightShiftOnly
                  ? 'bg-indigo-950 text-white border-indigo-900 shadow-xs'
                  : 'border-slate-200 text-slate-700 hover:bg-slate-100 bg-white'
              }`}
              title="Lọc ca đêm 18:00 - 06:00"
            >
              <Moon className={`h-3.5 w-3.5 ${nightShiftOnly ? 'text-amber-400' : 'text-slate-600'}`} />
              <span>Tối</span>
            </button>
          </div>
        </div>

        {/* HÀNG 2: THANH BỘ LỌC CHI TIẾT (SEARCH + 3 DROPDOWNS + MỞ TẤT CẢ / THU GỌN / XÓA LỌC) */}
        <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-slate-100 text-xs">
          {/* Ô tìm kiếm */}
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm theo mã issue/lệnh, tiêu đề, phân hệ, người xử lý..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50/50 text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-emerald-600 focus:outline-none transition-colors"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                ✕
              </button>
            )}
          </div>

          {/* Dropdown 1: Tất cả dự án / phân hệ / đơn vị */}
          <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-2.5 py-1 shadow-2xs">
            <span className="text-amber-600">📁</span>
            <select
              value={filterUnit}
              onChange={(e) => setFilterUnit(e.target.value)}
              className="bg-transparent text-xs font-semibold text-slate-800 outline-none cursor-pointer pr-1"
            >
              <option value="ALL">Tất cả dự án / phần mềm</option>
              {uniqueUnits.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
              {uniqueUnits.length === 0 && (
                <>
                  <option value="NÔNG_NGHIỆP">Phân hệ Nông nghiệp</option>
                  <option value="CÔNG_TRÌNH">Phân hệ Công trình</option>
                  <option value="VẬN_CHUYỂN">Phân hệ Vận chuyển nội bộ</option>
                </>
              )}
            </select>
          </div>

          {/* Dropdown 2: Tất cả trạng thái (3 giai đoạn) */}
          <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-2.5 py-1 shadow-2xs">
            <span className="text-pink-600">🎯</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-transparent text-xs font-semibold text-slate-800 outline-none cursor-pointer pr-1"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="GIAO_NHAN">📌 1. Tài xế giao nhận</option>
              <option value="THUC_HIEN">⚡ 2. Đang thực hiện</option>
              <option value="NGHIEM_THU">✅ 3. Nghiệm thu hoàn tất</option>
            </select>
          </div>

          {/* Dropdown 3: Mọi mức độ / Ưu tiên */}
          <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-2.5 py-1 shadow-2xs">
            <span className="text-orange-500">🔥</span>
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="bg-transparent text-xs font-semibold text-slate-800 outline-none cursor-pointer pr-1"
            >
              <option value="ALL">Mọi mức độ</option>
              <option value="KHAN_CAP">Khẩn cấp / SOS</option>
              <option value="CAO">Ưu tiên cao</option>
              <option value="TRUNG_BINH">Bình thường</option>
              <option value="THAP">Ưu tiên thấp</option>
            </select>
          </div>

          {/* Nút tiện ích bên phải: Mở tất cả | Thu gọn | Xóa lọc */}
          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={() => setIsAllExpanded(true)}
              className={`text-[11px] font-bold transition-colors cursor-pointer ${
                isAllExpanded ? 'text-emerald-700 underline' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Mở tất cả
            </button>
            <span className="text-slate-300">|</span>
            <button
              type="button"
              onClick={() => setIsAllExpanded(false)}
              className={`text-[11px] font-bold transition-colors cursor-pointer ${
                !isAllExpanded ? 'text-emerald-700 underline' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Thu gọn
            </button>
            <span className="text-slate-300">|</span>
            <button
              type="button"
              onClick={handleResetFilters}
              className="flex items-center gap-1 px-2.5 py-1 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-colors cursor-pointer shadow-2xs"
            >
              <RotateCcw className="h-3 w-3 text-slate-500" />
              <span>Xóa lọc</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. NGĂN LỆNH CHỜ PHÂN CÔNG (UNASSIGNED ITEMS) */}
      {unassignedItems.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-3.5 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
              <h4 className="text-xs font-bold text-amber-950 uppercase tracking-wide">
                Lệnh chờ phân công xe & thợ lái ({unassignedItems.length} lệnh chưa gán)
              </h4>
            </div>
            <button
              type="button"
              onClick={() => setShowUnassignedDrawer(!showUnassignedDrawer)}
              className="text-[11px] font-bold text-amber-900 hover:underline cursor-pointer"
            >
              {showUnassignedDrawer ? 'Thu gọn ▲' : 'Mở rộng ▼'}
            </button>
          </div>

          {showUnassignedDrawer && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 mt-2">
              {unassignedItems.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => onItemClick(item.rawItem)}
                  className="rounded-xl border border-amber-200 bg-white p-2.5 text-left text-xs shadow-2xs hover:border-amber-400 hover:shadow-md transition-all cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono font-bold text-primary text-[11px]">{item.code}</span>
                    <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.2 rounded-md">
                      Chờ gán xe
                    </span>
                  </div>
                  <div className="font-semibold text-slate-900 text-xs truncate" title={item.title}>
                    {item.title}
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
                    <span className="truncate">{item.location || 'Chưa định vị'}</span>
                    <span className="font-bold text-slate-700">{item.durationHours}h</span>
                  </div>
                  <div className="mt-1.5 pt-1.5 border-t border-amber-100 flex items-center justify-between text-[10px] text-emerald-800 font-bold">
                    <span>👉 Bấm để chọn xe & thợ lái</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 4. VÙNG HIỂN THỊ CHÍNH TIMELINE (GRID / GANTT / MILESTONES) */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-xs">
        <div
          style={{
            minWidth: `${280 + 24 * hourColWidth}px`,
          }}
        >
          {/* HÀNG BANNER PHÂN CHIA 4 CA VẬN HÀNH TRONG 24H */}
          <div
            className="grid border-b border-slate-200 bg-slate-100/90 text-[11px] font-bold"
            style={{
              gridTemplateColumns: `280px repeat(24, ${hourColWidth}px)`,
            }}
          >
            {/* Cột Trái Cố Định */}
            <div className="p-2.5 flex items-center gap-1.5 text-slate-700 border-r border-slate-200 bg-slate-100">
              <Truck className="h-4 w-4 text-primary shrink-0" />
              <span className="truncate">Phương tiện & Thợ lái</span>
            </div>

            {/* 4 Ca làm việc 24 tiếng */}
            <div className="col-span-6 bg-indigo-50/90 text-indigo-900 border-r border-indigo-200 py-1.5 px-2 flex items-center justify-center gap-1">
              <span>🌙 Ca Đêm (00:00 - 06:00)</span>
            </div>
            <div className="col-span-6 bg-amber-50/90 text-amber-900 border-r border-amber-200 py-1.5 px-2 flex items-center justify-center gap-1">
              <span>🌅 Ca Sáng (06:00 - 12:00)</span>
            </div>
            <div className="col-span-6 bg-sky-50/90 text-sky-900 border-r border-sky-200 py-1.5 px-2 flex items-center justify-center gap-1">
              <span>☀️ Ca Chiều (12:00 - 18:00)</span>
            </div>
            <div className="col-span-6 bg-purple-50/90 text-purple-900 py-1.5 px-2 flex items-center justify-center gap-1">
              <span>🌆 Ca Tối (18:00 - 24:00)</span>
            </div>
          </div>

          {/* HÀNG CỘT MỐC 24 GIỜ (00:00 -> 23:00) */}
          <div
            className="grid border-b border-slate-200 bg-slate-50 text-[11px] font-mono font-bold text-slate-600"
            style={{
              gridTemplateColumns: `280px repeat(24, ${hourColWidth}px)`,
            }}
          >
            <div className="p-2 border-r border-slate-200 text-slate-500 text-[10px] flex items-center justify-between">
              <span>24 Giờ Hoạt động</span>
              <span className="font-sans font-bold text-slate-700">{filteredLanes.length} xe</span>
            </div>
            {HOURS_24.map((h) => (
              <div
                key={h.hour}
                style={{ width: `${hourColWidth}px` }}
                className={`border-r border-slate-200 py-2 text-center select-none ${
                  h.hour === 6 || h.hour === 12 || h.hour === 18 ? 'bg-slate-100 font-extrabold text-slate-900' : ''
                }`}
              >
                {h.label}
              </div>
            ))}
          </div>

          {/* CÁC LÀN CHẠY PHƯƠNG TIỆN (LANES) */}
          {filteredLanes.length === 0 ? (
            <div className="p-16 text-center text-sm font-medium text-slate-400 space-y-2">
              <p>Không có dữ liệu lịch chạy xe nào phù hợp với bộ lọc.</p>
              <button
                type="button"
                onClick={handleResetFilters}
                className="text-primary hover:underline text-xs font-bold"
              >
                Xóa bộ lọc để xem toàn bộ 24h
              </button>
            </div>
          ) : (
            filteredLanes.map((lane) => (
              <div
                key={lane.laneKey}
                className="grid min-h-[110px] border-b border-slate-100 hover:bg-slate-50/40 transition-colors relative"
                style={{
                  gridTemplateColumns: `280px repeat(24, ${hourColWidth}px)`,
                }}
              >
                {/* CỘT PHƯƠNG TIỆN CỐ ĐỊNH BÊN TRÁI */}
                <div className="p-3 flex flex-col justify-center border-r border-slate-200 bg-slate-50/80 select-none">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-bold font-mono text-slate-900">{lane.vehicleCode}</span>
                    {lane.vehiclePlate && (
                      <span className="text-[10px] font-mono bg-white border border-slate-200 px-1 py-0.2 rounded text-slate-700">
                        {lane.vehiclePlate}
                      </span>
                    )}
                  </div>

                  <div className="text-[11px] font-semibold text-slate-800 line-clamp-1 mt-0.5" title={lane.vehicleName}>
                    {lane.vehicleName}
                  </div>

                  {lane.implementName && (
                    <div className="flex items-center gap-1 text-[10.5px] text-amber-800 font-medium truncate mt-0.5" title={lane.implementName}>
                      <Wrench className="h-3 w-3 text-amber-600 shrink-0" />
                      <span className="truncate">{lane.implementName}</span>
                    </div>
                  )}

                  <div className="mt-1 flex items-center justify-between pt-1 border-t border-slate-200/60 text-[10.5px]">
                    <span className="text-slate-600 font-medium truncate" title={lane.primaryDriverName}>
                      👤 {lane.primaryDriverName || 'Chưa gán thợ'}
                    </span>
                    <span className="font-bold text-primary text-[10px] shrink-0 ml-1">
                      {lane.items.length} ca
                    </span>
                  </div>
                </div>

                {/* VÙNG LƯỚI THỜI GIAN 24 CỘT */}
                <div
                  className="col-span-24 relative grid p-2 items-center gap-1"
                  style={{
                    gridTemplateColumns: `repeat(24, ${hourColWidth}px)`,
                  }}
                >
                  {/* Đường lưới giờ mờ */}
                  <div
                    className="absolute inset-0 grid pointer-events-none"
                    style={{
                      gridTemplateColumns: `repeat(24, ${hourColWidth}px)`,
                    }}
                  >
                    {HOURS_24.map((h) => (
                      <div
                        key={h.hour}
                        style={{ width: `${hourColWidth}px` }}
                        className={`border-r border-slate-100 h-full ${
                          h.hour === 6 || h.hour === 12 || h.hour === 18 ? 'bg-slate-50/50 border-slate-200/60' : ''
                        }`}
                      />
                    ))}
                  </div>

                  {/* RENDER THEO 3 CHẾ ĐỘ: GRID / GANTT / MILESTONES */}
                  {lane.items.map((item) => {
                    const startHour = parseHourValue(item.startTime);
                    const colStart = Math.max(1, Math.min(24, Math.floor(startHour) + 1));
                    const durationCol = Math.max(2, Math.min(24 - colStart + 1, Math.round(item.durationHours || 4)));
                    const colEnd = colStart + durationCol;

                    const startLabel = formatHourString(item.startTime);
                    const endLabel = item.endTime
                      ? formatHourString(item.endTime)
                      : `${String(Math.min(23, Math.floor(startHour + (item.durationHours || 4)))).padStart(2, '0')}:00`;

                    // ================= CHẾ ĐỘ 1: BẢNG GIAI ĐOẠN (GRID) =================
                    if (timelineMode === 'grid') {
                      let cardBg = 'bg-sky-50/95 border-sky-300 hover:bg-sky-100/90 text-sky-950 shadow-2xs';
                      if (item.workflowStepIndex === 2) {
                        cardBg = 'bg-amber-50/95 border-amber-400 hover:bg-amber-100/90 text-amber-950 shadow-xs ring-1 ring-amber-400/60';
                      } else if (item.workflowStepIndex >= 3) {
                        cardBg = 'bg-emerald-50/95 border-emerald-300 hover:bg-emerald-100/90 text-emerald-950 shadow-2xs';
                      } else if (item.status === 'TAM_DUNG' || item.isDelayed) {
                        cardBg = 'bg-red-50/95 border-red-300 hover:bg-red-100/90 text-red-950';
                      }

                      return (
                        <button
                          type="button"
                          key={item.id}
                          onClick={() => onItemClick(item.rawItem)}
                          style={{
                            gridColumnStart: colStart,
                            gridColumnEnd: colEnd,
                          }}
                          className={`z-10 rounded-xl border p-2.5 text-left text-xs shadow-2xs transition-all hover:scale-[1.01] hover:shadow-md cursor-pointer relative ${cardBg}`}
                        >
                          {/* Hàng 1: Mã lệnh + Khung giờ */}
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-bold text-primary text-[11px]">{item.code}</span>
                              {item.isDelayed && <AlertTriangle className="h-3.5 w-3.5 text-red-600" />}
                            </div>
                            <span className="font-mono text-[10px] font-bold bg-white/90 border border-slate-200/80 px-1.5 py-0.2 rounded shadow-2xs">
                              {startLabel} ➔ {endLabel} ({item.durationHours}h)
                            </span>
                          </div>

                          {/* Hàng 2: Tiêu đề công việc */}
                          <div className="font-bold text-[11.5px] text-slate-900 truncate mb-1" title={item.title}>
                            {item.title}
                          </div>

                          {/* 3 GIAI ĐOẠN TIẾN ĐỘ CHUẨN: TÀI XẾ GIAO NHẬN ➔ ĐANG THỰC HIỆN ➔ NGHIỆM THU */}
                          <div className="my-1.5 rounded-lg bg-white/80 border border-slate-200/70 p-1.5 space-y-1">
                            <div className="grid grid-cols-3 gap-1 text-[9.5px] font-bold">
                              {/* Giai đoạn 1: Tài xế giao nhận */}
                              <div
                                className={`flex items-center gap-1 px-1 py-0.5 rounded truncate border ${
                                  item.workflowStepIndex >= 1
                                    ? 'bg-sky-100 text-sky-900 border-sky-300 font-extrabold shadow-2xs'
                                    : 'bg-slate-100 text-slate-400 border-transparent'
                                }`}
                                title={`1. Tài xế giao nhận: ${item.driverName || 'Chưa gán'}`}
                              >
                                <span>📌</span>
                                <span className="truncate">{item.driverName ? item.driverName.split(' ').slice(-1)[0] : 'Giao nhận'}</span>
                              </div>

                              {/* Giai đoạn 2: Đang thực hiện */}
                              <div
                                className={`flex items-center gap-1 px-1 py-0.5 rounded truncate border ${
                                  item.workflowStepIndex === 2
                                    ? 'bg-amber-100 text-amber-950 border-amber-400 font-extrabold ring-1 ring-amber-400 shadow-2xs animate-pulse'
                                    : item.workflowStepIndex > 2
                                    ? 'bg-amber-50 text-amber-800 border-amber-200'
                                    : 'bg-slate-100 text-slate-400 border-transparent'
                                }`}
                                title={`2. Đang thực hiện: ${item.workVolume || `${item.durationHours}h`}`}
                              >
                                <span>⚡</span>
                                <span className="truncate">{item.workVolume || 'Đang thực hiện'}</span>
                              </div>

                              {/* Giai đoạn 3: Nghiệm thu */}
                              <div
                                className={`flex items-center gap-1 px-1 py-0.5 rounded truncate border ${
                                  item.workflowStepIndex >= 3
                                    ? 'bg-emerald-100 text-emerald-900 border-emerald-300 font-extrabold shadow-2xs'
                                    : 'bg-slate-100 text-slate-400 border-transparent'
                                }`}
                                title={`3. Nghiệm thu: ${item.acceptanceInfo || 'Chưa nghiệm thu'}`}
                              >
                                <span>✅</span>
                                <span className="truncate">{item.workflowStepIndex >= 3 ? 'Đạt chuẩn' : 'Nghiệm thu'}</span>
                              </div>
                            </div>
                          </div>

                          {/* Hàng cuối: Vị trí + Nhiên liệu */}
                          <div className="flex items-center justify-between text-[10px] text-slate-600 mt-1">
                            <span className="truncate font-medium flex items-center gap-1" title={item.location}>
                              <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                              <span className="truncate">{item.location || 'Tại thực địa'}</span>
                            </span>

                            {item.fuelInfo && (
                              <span className="inline-flex items-center gap-0.5 font-bold text-amber-800 bg-amber-100/80 px-1 py-0.2 rounded text-[9.5px]">
                                <Fuel className="h-2.5 w-2.5" />
                                {item.fuelInfo}
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    }

                    // ================= CHẾ ĐỘ 2: DÒNG THỜI GIAN (GANTT) =================
                    if (timelineMode === 'gantt') {
                      let barColor = 'bg-sky-600 hover:bg-sky-700 text-white';
                      if (item.workflowStepIndex === 2) barColor = 'bg-amber-600 hover:bg-amber-700 text-white animate-pulse';
                      if (item.workflowStepIndex >= 3) barColor = 'bg-emerald-600 hover:bg-emerald-700 text-white';

                      return (
                        <button
                          type="button"
                          key={item.id}
                          onClick={() => onItemClick(item.rawItem)}
                          style={{
                            gridColumnStart: colStart,
                            gridColumnEnd: colEnd,
                          }}
                          className={`z-10 h-11 rounded-xl p-2 flex items-center justify-between shadow-xs transition-all hover:scale-[1.01] hover:shadow-md cursor-pointer ${barColor}`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <span className="font-mono font-black text-xs">{item.code}</span>
                            <span className="text-[11px] font-semibold truncate">
                              {item.title} ({item.driverName || 'Chưa gán TX'})
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0 pl-2">
                            <span className="bg-black/20 text-white font-mono text-[10px] font-bold px-1.5 py-0.5 rounded">
                              {startLabel} - {endLabel}
                            </span>
                            {item.workflowStepIndex >= 3 && <Check className="h-3.5 w-3.5 text-white" />}
                          </div>
                        </button>
                      );
                    }

                    // ================= CHẾ ĐỘ 3: CỘT MỐC (MILESTONES - 3 MỐC) =================
                    return (
                      <div
                        key={item.id}
                        style={{
                          gridColumnStart: colStart,
                          gridColumnEnd: colEnd,
                        }}
                        className="z-10 relative flex items-center justify-between px-2"
                      >
                        {/* Mốc 1: Tài xế giao nhận */}
                        <button
                          type="button"
                          onClick={() => onItemClick(item.rawItem)}
                          className="flex flex-col items-center group cursor-pointer"
                          title={`1. Tài xế giao nhận: ${item.driverName || 'Chưa gán'}`}
                        >
                          <span className={`h-6 w-6 rounded-full text-white flex items-center justify-center text-xs font-bold shadow-xs group-hover:scale-110 transition-transform ${
                            item.workflowStepIndex >= 1 ? 'bg-sky-600' : 'bg-slate-400'
                          }`}>
                            📌
                          </span>
                          <span className="text-[10px] font-mono font-bold text-slate-700 mt-0.5">
                            {startLabel}
                          </span>
                          <span className="text-[9px] text-slate-500 font-medium truncate max-w-[60px]">
                            Giao nhận
                          </span>
                        </button>

                        {/* Đoạn nối 1 ➔ 2 */}
                        <div className="flex-1 h-1 bg-slate-200 mx-1.5 rounded-full relative overflow-hidden">
                          <div
                            className={`h-full ${
                              item.workflowStepIndex >= 2 ? 'bg-amber-500 w-full' : 'bg-transparent'
                            }`}
                          />
                        </div>

                        {/* Mốc 2: Đang thực hiện */}
                        <button
                          type="button"
                          onClick={() => onItemClick(item.rawItem)}
                          className="flex flex-col items-center group cursor-pointer"
                          title={`2. Đang thực hiện: ${item.workVolume || 'Đang thi công'}`}
                        >
                          <span className={`h-6 w-6 rounded-full text-white flex items-center justify-center text-xs font-bold shadow-xs group-hover:scale-110 transition-transform ${
                            item.workflowStepIndex === 2
                              ? 'bg-amber-600 ring-2 ring-amber-400 animate-pulse'
                              : item.workflowStepIndex > 2
                              ? 'bg-amber-600'
                              : 'bg-slate-400'
                          }`}>
                            ⚡
                          </span>
                          <span className="text-[9px] font-bold text-slate-700 mt-0.5">
                            Thực hiện
                          </span>
                        </button>

                        {/* Đoạn nối 2 ➔ 3 */}
                        <div className="flex-1 h-1 bg-slate-200 mx-1.5 rounded-full relative overflow-hidden">
                          <div
                            className={`h-full ${
                              item.workflowStepIndex >= 3 ? 'bg-emerald-500 w-full' : 'bg-transparent'
                            }`}
                          />
                        </div>

                        {/* Mốc 3: Nghiệm thu */}
                        <button
                          type="button"
                          onClick={() => onItemClick(item.rawItem)}
                          className="flex flex-col items-center group cursor-pointer"
                          title={`3. Nghiệm thu: ${item.acceptanceInfo || 'Nghiệm thu đạt'}`}
                        >
                          <span className={`h-6 w-6 rounded-full text-white flex items-center justify-center text-xs font-bold shadow-xs group-hover:scale-110 transition-transform ${
                            item.workflowStepIndex >= 3 ? 'bg-emerald-600' : 'bg-slate-400'
                          }`}>
                            ✅
                          </span>
                          <span className="text-[10px] font-mono font-bold text-slate-700 mt-0.5">
                            {endLabel}
                          </span>
                          <span className="text-[9px] text-slate-500 font-medium truncate max-w-[60px]">
                            Nghiệm thu
                          </span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
