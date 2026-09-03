import React, { useState } from 'react';
import { FilterBar } from '../../components/filters/FilterBar';
import { DataTable, Column } from '../../components/data-display/DataTable';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { StatCard } from '../../components/data-display/StatCard';
import { KPIGrid } from '../../components/data-display/KPIGrid';
import {
  History,
  Download,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  FileText,
  Calendar,
} from 'lucide-react';

interface AlertHistoryEvent {
  id: string;
  title: string;
  description: string;
  meta: string;
  actionText: string;
  eventType: 'fuel' | 'speed' | 'geofence';
}

export const AlertHistoryPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'timeline' | 'table'>('timeline');
  const [selectedEvent, setSelectedEvent] = useState<AlertHistoryEvent | null>(null);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [eventsList, setEventsList] = useState<AlertHistoryEvent[]>([]);

  const columns: Column<AlertHistoryEvent>[] = [
    { key: 'title', title: 'SỰ KIỆN CẢNH BÁO', sortable: true, render: (row) => <strong className="text-slate-900 font-bold">{row.title}</strong> },
    { key: 'description', title: 'NỘI DUNG XỬ LÝ & KẾT LUẬN', render: (row) => <span className="text-xs text-slate-600">{row.description}</span> },
    { key: 'meta', title: 'THỜI GIAN & NGƯỜI DUYỆT', render: (row) => <span className="text-xs text-slate-500">{row.meta}</span> },
    {
      key: 'eventType',
      title: 'PHÂN LOẠI',
      render: (row) => {
        if (row.eventType === 'fuel') return <Badge variant="amber">Nhiên liệu</Badge>;
        if (row.eventType === 'speed') return <Badge variant="red">Quá tốc độ</Badge>;
        return <Badge variant="blue">Rời vùng Geofence</Badge>;
      },
    },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 font-heading">
            Nhật ký cảnh báo & Xử lý sự cố
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Lưu trữ toàn bộ các cảnh báo đã xử lý, đã giải trình hoặc bỏ qua; ghi rõ nguyên nhân và người phê duyệt đóng sự cố.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="md" icon={<Download className="w-4 h-4" />}>
            Xuất file Audit
          </Button>
          <Button variant="primary" size="md" icon={<Search className="w-4 h-4" />} onClick={() => setShowSearchModal(true)}>
            Tìm theo ngày
          </Button>
        </div>
      </div>

      {/* Global FilterBar */}
      <FilterBar
        extraFilters={
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Nhật ký cảnh báo hệ thống</span>
          </div>
        }
      />

      {/* 4 Stats Cards */}
      <KPIGrid cols={4}>
        <StatCard
          label="Tổng sự kiện cảnh báo"
          value={`${eventsList.length} sự kiện`}
          subValue="Đã ghi nhận trong lịch sử"
          icon={<History className="w-5 h-5" />}
          iconBgColor="bg-emerald-50"
          iconColor="text-primary"
        />
        <StatCard
          label="Cảnh báo tốc độ & Ra vùng"
          value={`${eventsList.filter(e => e.eventType === 'speed' || e.eventType === 'geofence').length} sự kiện`}
          subValue="Vi phạm định vị GPS"
          icon={<CheckCircle2 className="w-5 h-5" />}
          iconBgColor="bg-sky-50"
          iconColor="text-sky-600"
        />
        <StatCard
          label="Cảnh báo nhiên liệu"
          value={`${eventsList.filter(e => e.eventType === 'fuel').length} sự kiện`}
          subValue="Sụt giảm & Tiêu hao"
          icon={<AlertTriangle className="w-5 h-5" />}
          iconBgColor="bg-slate-100"
          iconColor="text-slate-600"
        />
        <StatCard
          label="Trạng thái hồ sơ"
          value="100% Đã xử lý"
          subValue="Đã hoàn tất giải trình"
          icon={<Clock className="w-5 h-5" />}
          iconBgColor="bg-emerald-50"
          iconColor="text-emerald-700"
        />
      </KPIGrid>

      {/* View Switcher */}
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('timeline')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'timeline'
                ? 'bg-primary text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            Nhật Ký Dòng Thời Gian (Timeline)
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
            Bảng Tra Cứu Sự Cố (Table)
          </button>
        </div>

        <span className="text-xs font-bold text-slate-500 hidden sm:inline">
          Tổng cộng: <b>{eventsList.length} sự kiện đã lưu vết</b>
        </span>
      </div>

      {/* TIMELINE VIEW */}
      {activeTab === 'timeline' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-card">
          {eventsList.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              Chưa có lịch sử sự cố nào được ghi nhận
            </div>
          ) : (
            <div className="relative border-l-2 border-primary/40 pl-6 space-y-6 ml-3">
              {eventsList.map((event) => (
                <div key={event.id} className="relative group">
                  <div className="absolute -left-[31px] top-0 w-4 h-4 rounded-full bg-white border-4 border-primary group-hover:scale-125 transition-transform" />

                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/90 group-hover:border-primary/50 group-hover:bg-emerald-50/30 transition-all">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-1.5">
                      <h3 className="font-extrabold text-sm text-slate-900 group-hover:text-primary transition-colors">
                        {event.title}
                      </h3>
                      <button
                        onClick={() => setSelectedEvent(event)}
                        className="text-xs font-bold text-primary hover:underline self-start sm:self-auto"
                      >
                        {event.actionText} →
                      </button>
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed mb-2">
                      {event.description}
                    </p>

                    <div className="text-[11px] text-slate-400 font-semibold flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>{event.meta}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TABLE VIEW */}
      {activeTab === 'table' && (
        <DataTable
          title="Nhật Ký Lưu Trữ Cảnh Báo Đã Xử Lý"
          subtitle="Dữ liệu lưu trữ phục vụ thống kê phân tích rủi ro và đánh giá chất lượng lái xe"
          columns={columns}
          data={eventsList}
          onRowClick={(row) => setSelectedEvent(row)}
        />
      )}

      {/* Detail Modal */}
      {selectedEvent && (
        <Modal
          isOpen={!!selectedEvent}
          onClose={() => setSelectedEvent(null)}
          title={`Hồ Sơ Xử Lý Sự Cố: ${selectedEvent.title}`}
          subtitle={selectedEvent.meta}
          size="md"
        >
          <div className="space-y-3.5 text-xs text-slate-700">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
              <p className="font-semibold">{selectedEvent.description}</p>
              <div className="text-[11px] text-slate-500 pt-2 border-t border-slate-200">
                Mã lưu trữ: <b>AUDIT-SOS-2026-{selectedEvent.id}</b> · Đã lưu vĩnh viễn trên máy chủ kiểm toán.
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <Button variant="primary" size="sm" onClick={() => setSelectedEvent(null)}>
                Đóng
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Search Modal */}
      <Modal
        isOpen={showSearchModal}
        onClose={() => setShowSearchModal(false)}
        title="Tìm Kiếm Lịch Sử Cảnh Báo"
        subtitle="Tra cứu theo khoảng thời gian hoặc mã sự cố"
        size="md"
      >
        <div className="space-y-3 text-xs">
          <div>
            <label className="font-bold text-slate-700 block mb-1">Chọn ngày:</label>
            <input type="date" defaultValue="2026-08-23" className="w-full p-2 border border-slate-200 rounded-xl bg-slate-50 font-bold" />
          </div>
          <div className="flex justify-end gap-2 pt-3">
            <Button variant="outline" size="sm" onClick={() => setShowSearchModal(false)}>Hủy</Button>
            <Button variant="primary" size="sm" onClick={() => setShowSearchModal(false)}>Tra Cứu</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
