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
  Clock,
  ArrowRightLeft,
  UserCheck,
  ShieldCheck,
  Wrench,
  Tractor,
  Calendar,
  FileText,
} from 'lucide-react';

interface FleetTimelineEvent {
  id: string;
  title: string;
  description: string;
  meta: string;
  actionText: string;
  badgeType: 'bts' | 'driver' | 'sensor' | 'delivery';
}

const INITIAL_FLEET_EVENTS: FleetTimelineEvent[] = [
  {
    id: 'EVT-001',
    title: 'Bàn giao & Điều chuyển đơn vị xe CHT-MĐA-090',
    description: 'Bàn giao quyền sử dụng và quản lý kỹ thuật từ Ban ĐTXD AD sang Xí Nghiệp Bò 1 theo Quyết định số QĐ-ĐC/2026/090.',
    meta: '15:06 02/09/2026 • Ban Cơ Giới KLH • Người thực hiện: Nguyễn Văn Thắng',
    actionText: 'Xem biên bản bàn giao',
    badgeType: 'delivery',
  },
  {
    id: 'EVT-002',
    title: 'Bảo dưỡng định kỳ mốc 250 giờ máy (Lần 2)',
    description: 'Thay lọc dầu động cơ, dầu thủy lực và kiểm tra độ chùng xích xe đào Komatsu PC200 tại Xưởng cơ điện Trung tâm.',
    meta: '09:30 28/08/2026 • Xưởng BTSC Trung Tâm • KTV: Trần Quốc Tuấn',
    actionText: 'Xem phiếu xưởng',
    badgeType: 'bts',
  },
  {
    id: 'EVT-003',
    title: 'Phân công lại nhân sự lái xe chính',
    description: 'Chuyển giao quyền điều khiển phương tiện cho lái xe Lê Hoàng Nam (GPLX Hạng FC - Hạn 2029) thay cho tài xế nghỉ phép.',
    meta: '07:45 20/08/2026 • Đội xe Nông Trường 2 • Quản lý: Phạm Ngọc Hải',
    actionText: 'Xem hồ sơ lái xe',
    badgeType: 'driver',
  },
  {
    id: 'EVT-004',
    title: 'Lắp đặt cảm biến que đo nhiên liệu GPS siêu âm',
    description: 'Hoàn tất nghiệm thu cảm biến đo mức nhiên liệu bình dầu chính xác 99.5% và hiệu chuẩn đường truyền 4G IoT.',
    meta: '14:20 15/07/2026 • Đội Kỹ Thuật Viễn Thông THACO • KS: Đặng Hữu Thành',
    actionText: 'Xem thông số cảm biến',
    badgeType: 'sensor',
  },
  {
    id: 'EVT-005',
    title: 'Tiếp nhận xe mới xuất xưởng từ Chu Lai',
    description: 'Nhập kho tài sản Ban Cơ Giới KLH, cấp mã tài sản định danh kỹ thuật và dán tem giám sát RFID.',
    meta: '08:00 01/01/2025 • Tổng kho Cơ Giới KLH • Người duyệt: Ban Giám Đốc',
    actionText: 'Xem phiếu nhập kho',
    badgeType: 'delivery',
  },
];

export const FleetHistoryPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'timeline' | 'table'>('timeline');
  const [showLookupModal, setShowLookupModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<FleetTimelineEvent | null>(null);
  const [eventsList, setEventsList] = useState<FleetTimelineEvent[]>(INITIAL_FLEET_EVENTS);

  const columns: Column<FleetTimelineEvent>[] = [
    { key: 'title', title: 'SỰ KIỆN BIẾN ĐỘNG', sortable: true, render: (row) => <strong className="text-slate-900 font-bold">{row.title}</strong> },
    { key: 'description', title: 'NỘI DUNG CHI TIẾT', render: (row) => <span className="text-xs text-slate-600">{row.description}</span> },
    { key: 'meta', title: 'THỜI GIAN & ĐƠN VỊ THỰC HIỆN', render: (row) => <span className="text-xs text-slate-500">{row.meta}</span> },
    {
      key: 'badgeType',
      title: 'PHÂN LOẠI',
      render: (row) => {
        if (row.badgeType === 'bts') return <Badge variant="red">Bảo dưỡng BTSC</Badge>;
        if (row.badgeType === 'driver') return <Badge variant="blue">Đổi tài xế</Badge>;
        if (row.badgeType === 'sensor') return <Badge variant="green">Gắn cảm biến</Badge>;
        return <Badge variant="amber">Nhận xe mới</Badge>;
      },
    },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 font-heading">
            Lịch sử biến động & Thay đổi xe
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Nhật ký truy vết toàn bộ quá trình bàn giao, chuyển xí nghiệp, thay đổi tài xế phụ trách và hoán cải nông cụ.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="md" icon={<Download className="w-4 h-4" />}>
            Xuất sổ lý lịch
          </Button>
          <Button variant="primary" size="md" icon={<Search className="w-4 h-4" />} onClick={() => setShowLookupModal(true)}>
            Tra cứu số VIN
          </Button>
        </div>
      </div>

      {/* Global FilterBar */}
      <FilterBar
        extraFilters={
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Đã xác thực dữ liệu lý lịch xe</span>
          </div>
        }
      />

      {/* 4 Stats Cards */}
      <KPIGrid cols={4}>
        <StatCard
          label="Tổng sự kiện biến động"
          value={`${eventsList.length} sự kiện`}
          subValue="Nhật ký hệ thống"
          icon={<Clock className="w-5 h-5" />}
          iconBgColor="bg-emerald-50"
          iconColor="text-primary"
        />
        <StatCard
          label="Bảo dưỡng & Sửa chữa"
          value={`${eventsList.filter(e => e.badgeType === 'bts').length} lần`}
          subValue="Phiếu xưởng BTSC"
          icon={<ArrowRightLeft className="w-5 h-5" />}
          iconBgColor="bg-sky-50"
          iconColor="text-sky-600"
        />
        <StatCard
          label="Đổi tài xế phụ trách"
          value={`${eventsList.filter(e => e.badgeType === 'driver').length} lần`}
          subValue="Biên bản bàn giao xe"
          icon={<UserCheck className="w-5 h-5" />}
          iconBgColor="bg-amber-50"
          iconColor="text-amber-600"
        />
        <StatCard
          label="Tình trạng hồ sơ"
          value="100% hợp lệ"
          subValue="Đủ kiểm định & bảo hiểm"
          icon={<ShieldCheck className="w-5 h-5" />}
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
            Dòng Thời Gian Lý Lịch (Timeline)
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
            Bảng Nhật Ký Biến Động (Table)
          </button>
        </div>

        <span className="text-xs font-bold text-slate-500 hidden sm:inline">
          Toàn bộ lịch sử biến động phương tiện
        </span>
      </div>

      {/* TIMELINE VIEW */}
      {activeTab === 'timeline' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-card">
          {eventsList.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Clock className="w-12 h-12 mx-auto mb-3 opacity-40 text-slate-400" />
              <p className="text-sm font-bold text-slate-600">Chưa có nhật ký biến động nào cho phương tiện này</p>
              <p className="text-xs text-slate-400 mt-1">Các sự kiện bàn giao, hoán cải và bảo dưỡng sẽ được tự động ghi nhận khi phát sinh.</p>
            </div>
          ) : (
            <div className="relative border-l-2 border-primary/40 pl-6 space-y-6 ml-3">
              {eventsList.map((event) => (
                <div key={event.id} className="relative group">
                  {/* Dot Icon */}
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
          title="Nhật Ký Biến Động Lý Lịch Phương Tiện"
          subtitle="Dữ liệu lưu vết lịch sử vận hành giúp tra cứu kiểm toán và đánh giá hao mòn tài sản"
          columns={columns}
          data={eventsList}
        />
      )}

      {/* Detail Modal */}
      {selectedEvent && (
        <Modal
          isOpen={!!selectedEvent}
          onClose={() => setSelectedEvent(null)}
          title={`Hồ Sơ Chứng Từ: ${selectedEvent.title}`}
          subtitle={selectedEvent.meta}
          size="md"
        >
          <div className="space-y-3.5 text-xs text-slate-700">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
              <p className="font-semibold">{selectedEvent.description}</p>
              <div className="text-[11px] text-slate-500 pt-2 border-t border-slate-200">
                Chứng từ số: <b>CT-THACO-2026-{selectedEvent.id}</b> · Đã lưu trữ trên máy chủ dữ liệu trung tâm.
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

      {/* Tra cứu số VIN Modal */}
      <Modal
        isOpen={showLookupModal}
        onClose={() => setShowLookupModal(false)}
        title="Tra Cứu Sổ Lý Lịch Theo Số VIN / Biển Số"
        subtitle="Truy xuất dữ liệu lịch sử phương tiện từ hệ thống ERP THACO AGRI"
        size="md"
      >
        <div className="space-y-3 text-xs">
          <div>
            <label className="font-bold text-slate-700 block mb-1">Nhập số VIN hoặc Biển số xe:</label>
            <input type="text" placeholder="Ví dụ: JD6140B-9982 hoặc XC-JD-024" className="w-full p-2 border border-slate-200 rounded-xl bg-slate-50 font-bold" />
          </div>
          <div className="flex justify-end gap-2 pt-3">
            <Button variant="outline" size="sm" onClick={() => setShowLookupModal(false)}>Hủy</Button>
            <Button variant="primary" size="sm" onClick={() => setShowLookupModal(false)}>Tra Cứu Ngay</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

