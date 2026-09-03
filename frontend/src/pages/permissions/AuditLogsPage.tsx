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
  Truck,
  CloudRain,
  ShieldCheck,
  Calendar,
  Layers,
} from 'lucide-react';

interface AuditEventItem {
  id: string;
  title: string;
  description: string;
  timeString: string;
  ipAddress: string;
  actor: string;
  actionType: 'dispatch' | 'fuel' | 'plan_change' | 'repair';
  actionBtnText: string;
}

export const AuditLogsPage: React.FC = () => {
  const [selectedEvent, setSelectedEvent] = useState<AuditEventItem | null>(null);
  const [viewMode, setViewMode] = useState<'timeline' | 'table'>('timeline');
  const [eventsList, setEventsList] = useState<AuditEventItem[]>([]);

  const columns: Column<AuditEventItem>[] = [
    { key: 'timeString', title: 'THỜI GIAN', sortable: true, render: (row) => <span className="font-mono text-xs text-slate-600">{row.timeString}</span> },
    { key: 'title', title: 'HÀNH ĐỘNG AUDIT', sortable: true, render: (row) => <strong className="text-slate-900 text-xs">{row.title}</strong> },
    { key: 'actor', title: 'NGƯỜI THỰC HIỆN', render: (row) => <strong className="text-primary text-xs">{row.actor}</strong> },
    { key: 'ipAddress', title: 'IP TRUY CẬP', render: (row) => <span className="font-mono text-xs text-slate-500">{row.ipAddress}</span> },
    {
      key: 'actionBtnText',
      title: 'THAO TÁC',
      render: (row) => (
        <Button variant="outline" size="sm" onClick={() => setSelectedEvent(row)}>
          {row.actionBtnText}
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 font-heading">
            Nhật ký hệ thống (Audit Trail)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Lưu vết toàn bộ thao tác điều xe, cấp dầu, bảo trì, sửa định mức và thay đổi kế hoạch sản xuất theo thời gian thực.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="md" icon={<Download className="w-4 h-4" />}>
            Xuất nhật ký Audit
          </Button>
          <Button variant="primary" size="md" icon={<Search className="w-4 h-4" />}>
            Lọc theo người dùng
          </Button>
        </div>
      </div>

      {/* Global FilterBar */}
      <FilterBar
        extraFilters={
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Hôm nay, 23/08/2026 · Dữ liệu lưu trữ vĩnh viễn</span>
          </div>
        }
      />

      {/* 4 Stats Cards matching Mockup */}
      <KPIGrid cols={4}>
        <StatCard
          label="Tổng bản ghi Audit"
          value={`${eventsList.length} sự kiện`}
          subValue="Lưu vết hệ thống"
          icon={<History className="w-5 h-5" />}
          iconBgColor="bg-emerald-50"
          iconColor="text-primary"
        />
        <StatCard
          label="Thao tác điều xe & lệnh"
          value={`${eventsList.filter((e) => e.actionType === 'dispatch').length} thao tác`}
          subValue="Tạo & điều phối"
          icon={<Truck className="w-5 h-5" />}
          iconBgColor="bg-sky-50"
          iconColor="text-sky-600"
        />
        <StatCard
          label="Thao tác cấp phát nhiên liệu"
          value={`${eventsList.filter((e) => e.actionType === 'fuel').length} thao tác`}
          subValue="Xuất phiếu cấp dầu"
          icon={<Layers className="w-5 h-5" />}
          iconBgColor="bg-amber-50"
          iconColor="text-amber-600"
        />
        <StatCard
          label="Bảo mật & Tính toàn vẹn"
          value="100%"
          subValue="IP nội bộ & lưu vết bất biến"
          icon={<ShieldCheck className="w-5 h-5" />}
          iconBgColor="bg-emerald-50"
          iconColor="text-emerald-700"
        />
      </KPIGrid>

      {/* View Switcher Bar */}
      <div className="flex items-center justify-between bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
        <div className="text-xs font-bold text-slate-700">
          Chế độ xem nhật ký vết Audit:
        </div>
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setViewMode('timeline')}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
              viewMode === 'timeline' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Dòng thời gian (Timeline)
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
              viewMode === 'table' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Dạng bảng (Table)
          </button>
        </div>
      </div>

      {/* Timeline View */}
      {viewMode === 'timeline' ? (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          {eventsList.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              Chưa có bản ghi Audit nào trong hệ thống
            </div>
          ) : (
            eventsList.map((event) => (
              <div key={event.id} className="relative pl-8 pb-6 last:pb-0 border-l-2 border-emerald-500/30 last:border-l-0">
                {/* Dot icon */}
                <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white shadow" />

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50/70 p-4 rounded-xl border border-slate-200/80 hover:bg-slate-50 transition-colors">
                  <div className="space-y-1">
                    <h4 className="font-extrabold text-sm text-slate-900">
                      {event.title}
                    </h4>
                    <p className="text-xs text-slate-600">
                      {event.description}
                    </p>
                    <div className="text-[11px] text-slate-400 font-mono pt-1">
                      {event.timeString} · IP: {event.ipAddress} · <b className="text-slate-600">{event.actor}</b>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedEvent(event)}
                    className="self-start sm:self-center shrink-0 text-xs"
                  >
                    {event.actionBtnText}
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <DataTable
          title="Bảng Truy Vết Nhật Ký Hệ Thống Chi Tiết"
          subtitle="Dữ liệu lưu trữ bất biến phục vụ công tác thanh tra kiểm toán Tập đoàn"
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
          title="Chi Tiết Bản Ghi Nhật Ký Audit"
          subtitle={selectedEvent.title}
          size="md"
        >
          <div className="space-y-3.5 text-xs text-slate-700">
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
              <div className="flex justify-between"><span>Thời gian thực hiện:</span> <b className="font-mono text-primary">{selectedEvent.timeString}</b></div>
              <div className="flex justify-between"><span>Địa chỉ IP:</span> <span className="font-mono">{selectedEvent.ipAddress}</span></div>
              <div className="flex justify-between"><span>Cán bộ thực hiện:</span> <strong className="text-slate-900">{selectedEvent.actor}</strong></div>
              <div className="pt-2 border-t border-slate-200">
                <span className="font-bold block mb-1">Nội dung chi tiết:</span>
                <p className="text-slate-800 bg-white p-2.5 rounded-lg border border-slate-200 leading-relaxed">
                  {selectedEvent.description}
                </p>
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
    </div>
  );
};
