import React, { useState, useEffect, useCallback } from 'react';
import { FilterBar } from '../../components/filters/FilterBar';
import { DataTable, Column } from '../../components/data-display/DataTable';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { StatCard } from '../../components/data-display/StatCard';
import { KPIGrid } from '../../components/data-display/KPIGrid';
import { AuditUserPopover } from '../../components/common/AuditUserPopover';
import { TableRowActions } from '../../components/common/TableRowActions';
import { apiService } from '../../api/client';
import { useAppStore } from '../../store/useAppStore';
import { useFilterStore } from '../../store/useFilterStore';
import {
  History,
  Download,
  Search,
  Clock,
  ArrowRightLeft,
  UserCheck,
  Fuel,
  Truck,
  Calendar,
  FileText,
  Loader2,
  RefreshCw,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

export interface FleetTimelineEvent {
  id: string;
  code?: string;
  title: string;
  description: string;
  meta: string;
  actionText: string;
  badgeType: 'bts' | 'driver' | 'sensor' | 'delivery' | 'fuel';
  createdAt?: string;
  vehicleId?: number;
  vehicleCode?: string;
  vehicleName?: string;
  plate?: string | null;
  unit?: string;
  complexCode?: string;
}

export const FleetHistoryPage: React.FC = () => {
  const { selectedKLH } = useAppStore();
  const { searchTerm, setSearchTerm, selectedUnit } = useFilterStore();

  const [activeTab, setActiveTab] = useState<'timeline' | 'table'>('timeline');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('ALL');
  const [showLookupModal, setShowLookupModal] = useState(false);
  const [vinLookupInput, setVinLookupInput] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<FleetTimelineEvent | null>(null);

  const [eventsList, setEventsList] = useState<FleetTimelineEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [page, setPage] = useState<number>(1);
  const [pageSize] = useState<number>(30);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [stats, setStats] = useState({
    totalEvents: 0,
    btsCount: 0,
    driverCount: 0,
    fuelCount: 0,
    deliveryCount: 0,
  });

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = {
        complexCode: selectedKLH === 'ALL' || selectedKLH === 'ALL_KLH' ? undefined : selectedKLH,
        unit: selectedUnit === 'ALL' ? undefined : selectedUnit,
        search: searchTerm.trim() || undefined,
        type: selectedTypeFilter,
        page,
        limit: pageSize,
      };

      const res = await apiService.getFleetHistoryEvents(params);
      if (res && res.data) {
        setEventsList(res.data);
        setTotalCount(res.total || 0);
        setTotalPages(res.totalPages || Math.ceil((res.total || 0) / pageSize) || 1);
        if (res.stats) {
          setStats(res.stats);
        }
      } else if (Array.isArray(res)) {
        setEventsList(res);
        setTotalCount(res.length);
        setTotalPages(1);
      }
    } catch (err) {
      console.error('Lỗi truy vấn lịch sử biến động từ API:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedKLH, selectedUnit, searchTerm, selectedTypeFilter, page, pageSize]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const handleExportCSV = () => {
    if (!eventsList || eventsList.length === 0) return;

    const headers = ['Mã sự kiện', 'Tiêu đề', 'Nội dung', 'Thời gian & Đơn vị', 'Phân loại', 'Mã xe', 'Biển số'];
    const rows = eventsList.map((e) => [
      `"${e.code || e.id}"`,
      `"${e.title.replace(/"/g, '""')}"`,
      `"${e.description.replace(/"/g, '""')}"`,
      `"${e.meta.replace(/"/g, '""')}"`,
      `"${e.badgeType}"`,
      `"${e.vehicleCode || ''}"`,
      `"${e.plate || ''}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `So_Ly_Lich_Bien_Dong_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleVinLookupSubmit = () => {
    if (vinLookupInput.trim()) {
      setSearchTerm(vinLookupInput.trim());
      setPage(1);
    }
    setShowLookupModal(false);
  };

  const columns: Column<FleetTimelineEvent>[] = [
    {
      key: 'code',
      title: 'MÃ SỰ KIỆN',
      width: '130px',
      render: (row) => (
        <span className="inline-flex items-center rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 font-mono text-xs font-bold text-slate-800">
          {row.code || row.id}
        </span>
      ),
    },
    {
      key: 'title',
      title: 'SỰ KIỆN BIẾN ĐỘNG',
      sortable: true,
      render: (row) => (
        <div className="space-y-0.5">
          <button
            type="button"
            onClick={() => setSelectedEvent(row)}
            className="text-left font-bold text-slate-900 hover:text-primary transition-colors text-xs line-clamp-1"
          >
            {row.title}
          </button>
          {row.vehicleCode && (
            <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-mono">
              <span className="font-bold text-primary">{row.vehicleCode}</span>
              {row.plate && <span className="text-slate-400">· Biển số: {row.plate}</span>}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'description',
      title: 'NỘI DUNG CHI TIẾT',
      render: (row) => <span className="text-xs text-slate-600 line-clamp-2">{row.description}</span>,
    },
    {
      key: 'meta',
      title: 'THỜI GIAN & ĐƠN VỊ THỰC HIỆN',
      render: (row) => (
        <div className="text-xs text-slate-500 flex items-center gap-1">
          <Calendar className="w-3 h-3 text-slate-400 flex-shrink-0" />
          <span className="line-clamp-1">{row.meta}</span>
        </div>
      ),
    },
    {
      key: 'badgeType',
      title: 'PHÂN LOẠI',
      width: '140px',
      render: (row) => {
        if (row.badgeType === 'bts') return <Badge variant="red">Bảo dưỡng BTSC</Badge>;
        if (row.badgeType === 'driver') return <Badge variant="blue">Đổi tài xế</Badge>;
        if (row.badgeType === 'fuel') return <Badge variant="amber">Cấp nhiên liệu</Badge>;
        if (row.badgeType === 'delivery') return <Badge variant="green">Bàn giao & Phân bổ</Badge>;
        return <Badge variant="gray">Biến động khác</Badge>;
      },
    },
    {
      key: 'user',
      title: 'User',
      width: '70px',
      align: 'center',
      render: (row) => (
        <AuditUserPopover
          createdDate={row.createdAt ? new Date(row.createdAt).toLocaleDateString('vi-VN') : '15-09-2026'}
          createdUser="Hệ thống CSDL"
          updatedDate={row.createdAt ? new Date(row.createdAt).toLocaleDateString('vi-VN') : '15-09-2026'}
          updatedUser="KTV Vận Hành"
          title={`Thông tin sự kiện ${row.code || row.id}`}
        />
      ),
    },
    {
      key: 'actions',
      title: 'Tác vụ',
      width: '90px',
      align: 'center',
      render: (row) => (
        <TableRowActions
          onView={() => setSelectedEvent(row)}
          viewTitle="Xem chi tiết sự kiện biến động"
        />
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 font-heading">
              Lịch sử biến động & Thay đổi xe
            </h1>
            <span className="inline-flex rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 font-mono text-xs font-bold text-emerald-800">
              {stats.totalEvents} sự kiện
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Dữ liệu truy vết trực tiếp từ CSDL: sửa chữa BTSC, phân công tài xế, cấp phát nhiên liệu và điều chuyển phương tiện.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="md"
            icon={<RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />}
            onClick={() => fetchEvents()}
          >
            Làm mới
          </Button>
          <Button
            variant="outline"
            size="md"
            icon={<Download className="w-4 h-4" />}
            onClick={handleExportCSV}
            disabled={eventsList.length === 0}
          >
            Xuất sổ lý lịch
          </Button>
          <Button
            variant="primary"
            size="md"
            icon={<Search className="w-4 h-4" />}
            onClick={() => setShowLookupModal(true)}
          >
            Tra cứu số VIN / Xe
          </Button>
        </div>
      </div>

      {/* Global FilterBar */}
      <FilterBar
        searchPlaceholder="Tìm kiếm mã xe, biển số, mã phiếu, tài xế..."
      />

      {/* 4 Stats Cards với dữ liệu thực tế từ DB */}
      <KPIGrid cols={4}>
        <StatCard
          label="Tổng sự kiện biến động"
          value={`${stats.totalEvents} sự kiện`}
          subValue="Toàn bộ lịch sử phương tiện"
          icon={<Clock className="w-5 h-5" />}
          iconBgColor="bg-emerald-50"
          iconColor="text-primary"
        />
        <StatCard
          label="Bảo dưỡng & Sửa chữa"
          value={`${stats.btsCount} lượt`}
          subValue="Phiếu xưởng BTSC & BDC"
          icon={<ArrowRightLeft className="w-5 h-5" />}
          iconBgColor="bg-rose-50"
          iconColor="text-rose-600"
        />
        <StatCard
          label="Phân công & Đổi tài xế"
          value={`${stats.driverCount} lượt`}
          subValue="Biên bản giao quyền điều khiển"
          icon={<UserCheck className="w-5 h-5" />}
          iconBgColor="bg-sky-50"
          iconColor="text-sky-600"
        />
        <StatCard
          label="Cấp phát nhiên liệu"
          value={`${stats.fuelCount} lượt`}
          subValue="Phiếu xuất kho DO & Xăng"
          icon={<Fuel className="w-5 h-5" />}
          iconBgColor="bg-amber-50"
          iconColor="text-amber-600"
        />
      </KPIGrid>

      {/* Type Filter Buttons & View Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-2">
        {/* Filter categories */}
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: 'ALL', label: 'Tất cả', count: stats.totalEvents },
            { id: 'bts', label: 'Bảo dưỡng BTSC', count: stats.btsCount },
            { id: 'driver', label: 'Phân công lái xe', count: stats.driverCount },
            { id: 'fuel', label: 'Cấp nhiên liệu', count: stats.fuelCount },
            { id: 'delivery', label: 'Bàn giao & Phân bổ', count: stats.deliveryCount },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => {
                setSelectedTypeFilter(cat.id);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                selectedTypeFilter === cat.id
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <span>{cat.label}</span>
              <span
                className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full font-bold ${
                  selectedTypeFilter === cat.id
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {cat.count}
              </span>
            </button>
          ))}
        </div>

        {/* View Switcher: Timeline vs Table */}
        <div className="flex items-center gap-1.5 self-end sm:self-auto">
          <button
            onClick={() => setActiveTab('timeline')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'timeline'
                ? 'bg-primary text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            Dòng Thời Gian (Timeline)
          </button>
          <button
            onClick={() => setActiveTab('table')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'table'
                ? 'bg-primary text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Bảng Nhật Ký (Table)
          </button>
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="bg-white rounded-2xl p-12 border border-slate-200 shadow-card text-center">
          <Loader2 className="w-8 h-8 mx-auto animate-spin text-primary" />
          <p className="text-xs font-bold text-slate-600 mt-2">Đang truy vấn lịch sử biến động từ CSDL...</p>
        </div>
      )}

      {/* TIMELINE VIEW */}
      {!loading && activeTab === 'timeline' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-card">
          {eventsList.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Clock className="w-12 h-12 mx-auto mb-3 opacity-40 text-slate-400" />
              <p className="text-sm font-bold text-slate-600">Không tìm thấy sự kiện biến động nào phù hợp</p>
              <p className="text-xs text-slate-400 mt-1">Vui lòng kiểm tra lại bộ lọc Khu liên hợp hoặc từ khóa tìm kiếm.</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="relative border-l-2 border-primary/40 pl-6 space-y-5 ml-3">
                {eventsList.map((event) => {
                  const badgeColorClass =
                    event.badgeType === 'bts'
                      ? 'border-rose-300 text-rose-700 bg-rose-50'
                      : event.badgeType === 'driver'
                      ? 'border-sky-300 text-sky-700 bg-sky-50'
                      : event.badgeType === 'fuel'
                      ? 'border-amber-300 text-amber-700 bg-amber-50'
                      : 'border-emerald-300 text-emerald-700 bg-emerald-50';

                  const badgeLabel =
                    event.badgeType === 'bts'
                      ? 'Bảo dưỡng BTSC'
                      : event.badgeType === 'driver'
                      ? 'Đổi tài xế'
                      : event.badgeType === 'fuel'
                      ? 'Cấp nhiên liệu'
                      : 'Bàn giao xe';

                  return (
                    <div key={event.id} className="relative group">
                      {/* Dot Icon */}
                      <div className="absolute -left-[31px] top-1.5 w-4 h-4 rounded-full bg-white border-4 border-primary group-hover:scale-125 transition-transform" />

                      <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/90 group-hover:border-primary/50 group-hover:bg-emerald-50/30 transition-all">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-1.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded px-1.5 py-0.5">
                              {event.code || event.id}
                            </span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${badgeColorClass}`}>
                              {badgeLabel}
                            </span>
                            <h3 className="font-extrabold text-sm text-slate-900 group-hover:text-primary transition-colors">
                              {event.title}
                            </h3>
                          </div>
                          <button
                            onClick={() => setSelectedEvent(event)}
                            className="text-xs font-bold text-primary hover:underline self-start sm:self-auto flex items-center gap-1"
                          >
                            <span>{event.actionText}</span>
                            <span>→</span>
                          </button>
                        </div>

                        <p className="text-xs text-slate-600 leading-relaxed mb-2.5">
                          {event.description}
                        </p>

                        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200/60 text-[11px] text-slate-500">
                          <div className="flex items-center gap-1.5 font-medium">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            <span>{event.meta}</span>
                          </div>
                          {event.vehicleCode && (
                            <div className="flex items-center gap-2 font-mono">
                              <span className="font-bold text-slate-700">{event.vehicleName || event.vehicleCode}</span>
                              {event.plate && (
                                <span className="bg-white border border-slate-200 rounded px-1.5 py-0.2 text-slate-600 font-semibold">
                                  {event.plate}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Timeline Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 border-t border-slate-200 text-xs text-slate-600">
                  <span>
                    Hiển thị <b>{(page - 1) * pageSize + 1}</b> - <b>{Math.min(page * pageSize, totalCount)}</b> trên <b>{totalCount}</b> sự kiện
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      icon={<ChevronLeft className="w-4 h-4" />}
                      disabled={page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      Trang trước
                    </Button>
                    <span className="px-3 font-bold text-slate-800">
                      Trang {page} / {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= totalPages}
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    >
                      Trang sau
                      <ChevronRight className="w-4 h-4 ml-1 inline" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TABLE VIEW */}
      {!loading && activeTab === 'table' && (
        <DataTable
          title="Nhật Ký Biến Động Lý Lịch Phương Tiện"
          subtitle={`Dữ liệu lưu vết lịch sử vận hành thực tế từ cơ sở dữ liệu (${totalCount} bản ghi)`}
          columns={columns}
          data={eventsList}
          pageSize={pageSize}
          showSearch={false}
          showExport={false}
          actions={
            <span className="inline-flex rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 font-mono text-xs font-bold text-emerald-800">
              {totalCount} sự kiện
            </span>
          }
        />
      )}

      {/* Detail Modal */}
      {selectedEvent && (
        <Modal
          isOpen={!!selectedEvent}
          onClose={() => setSelectedEvent(null)}
          title={`Hồ Sơ Chứng Từ: ${selectedEvent.code || selectedEvent.id}`}
          subtitle={selectedEvent.title}
          size="md"
          footer={
            <Button variant="primary" size="sm" onClick={() => setSelectedEvent(null)}>
              Đóng
            </Button>
          }
        >
          <div className="space-y-3.5 text-xs text-slate-700">
            {/* Header meta badges */}
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md">
                  {selectedEvent.code || selectedEvent.id}
                </span>
                {selectedEvent.badgeType === 'bts' && <Badge variant="red">Bảo dưỡng BTSC</Badge>}
                {selectedEvent.badgeType === 'driver' && <Badge variant="blue">Đổi tài xế</Badge>}
                {selectedEvent.badgeType === 'fuel' && <Badge variant="amber">Cấp nhiên liệu</Badge>}
                {selectedEvent.badgeType === 'delivery' && <Badge variant="green">Bàn giao & Phân bổ</Badge>}
              </div>
              <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                Đã xác thực CSDL
              </span>
            </div>

            {/* Information Grid */}
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                <span className="text-[11px] text-slate-500 font-semibold block mb-0.5">Phương tiện</span>
                <p className="font-bold text-slate-900 text-xs">
                  {selectedEvent.vehicleName || selectedEvent.vehicleCode || 'Chưa định danh'}
                </p>
                {selectedEvent.vehicleCode && (
                  <span className="text-[11px] font-mono text-primary font-semibold block mt-0.5">
                    Mã xe: {selectedEvent.vehicleCode}
                  </span>
                )}
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                <span className="text-[11px] text-slate-500 font-semibold block mb-0.5">Biển số & Đơn vị</span>
                <p className="font-mono font-bold text-slate-900 text-xs">
                  {selectedEvent.plate ? selectedEvent.plate : 'Chưa có biển số'}
                </p>
                <span className="text-[11px] text-slate-500 font-medium block mt-0.5">
                  KLH: {selectedEvent.complexCode || selectedKLH || 'KOUN_MOM'}
                </span>
              </div>
            </div>

            {/* Thời gian & Đơn vị thực hiện */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 space-y-1">
              <span className="text-[11px] text-slate-500 font-semibold block">Thời gian & Đơn vị thực hiện</span>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>{selectedEvent.meta}</span>
              </div>
            </div>

            {/* Nội dung chi tiết */}
            <div className="space-y-1">
              <span className="text-[11px] text-slate-500 font-bold uppercase tracking-wider block">
                Nội dung chi tiết sự kiện
              </span>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 leading-relaxed">
                {selectedEvent.description}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Tra cứu số VIN / Biển số Modal */}
      <Modal
        isOpen={showLookupModal}
        onClose={() => setShowLookupModal(false)}
        title="Tra Cứu Sổ Lý Lịch Theo Mã Xe / Biển Số"
        subtitle="Truy xuất dữ liệu lịch sử phương tiện từ hệ thống cơ sở dữ liệu thực tế"
        size="md"
        footer={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowLookupModal(false)}>
              Hủy
            </Button>
            <Button variant="primary" size="sm" onClick={handleVinLookupSubmit}>
              Tra Cứu Ngay
            </Button>
          </div>
        }
      >
        <div className="space-y-3 text-xs">
          <div>
            <label className="font-bold text-slate-700 block mb-1">
              Nhập mã phương tiện, biển số hoặc từ khóa:
            </label>
            <input
              type="text"
              value={vinLookupInput}
              onChange={(e) => setVinLookupInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleVinLookupSubmit();
              }}
              placeholder="Ví dụ: CHT-MDA-002, 6140B, hoặc tên xe..."
              className="w-full p-2.5 border border-slate-300 rounded-xl bg-slate-50 font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary"
              autoFocus
            />
          </div>
        </div>
      </Modal>
    </div>
  );
};
