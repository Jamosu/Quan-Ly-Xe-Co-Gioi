import React, { useState, useEffect } from 'react';
import { FilterBar } from '../../components/filters/FilterBar';
import { DataTable, Column } from '../../components/data-display/DataTable';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { StatCard } from '../../components/data-display/StatCard';
import { KPIGrid } from '../../components/data-display/KPIGrid';
import { apiClient } from '../../api/client';
import {
  Wrench,
  Plus,
  Download,
  AlertTriangle,
  Clock,
  Truck,
  CheckCircle2,
  Layers,
  Kanban as KanbanIcon,
  FileText,
} from 'lucide-react';

interface IssueReportItem {
  id: string;
  reportCode: string;
  title: string;
  vehicleCode: string;
  location: string;
  reporterName: string;
  timeStr: string;
  severity: 'light' | 'heavy';
  stage: 'received' | 'onsite' | 'workshop' | 'done';
}

export const IssueReportsPage: React.FC = () => {
  const [activeView, setActiveView] = useState<'kanban' | 'table'>('kanban');
  const [selectedReport, setSelectedReport] = useState<IssueReportItem | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [reportsList, setReportsList] = useState<IssueReportItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReports = async () => {
      setLoading(true);
      try {
        const res = await apiClient.get('/repairs');
        const items = res.data?.data?.items || res.data?.items || res.data || [];
        if (Array.isArray(items) && items.length > 0) {
          setReportsList(
            items.map((r: any) => ({
              id: `IR-${r.id}`,
              reportCode: r.code || `BM09-${r.id}`,
              title: r.issueDescription || 'Báo hỏng thiết bị',
              vehicleCode: r.vehicle?.code || '—',
              location: r.location || 'Hiện trường Nông trường',
              reporterName: r.reporterName || 'Tài xế báo qua Mobile',
              timeStr: r.createdAt ? new Date(r.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '—',
              severity: r.severity === 'HEAVY' ? 'heavy' : 'light',
              stage: r.status === 'COMPLETED' ? 'done' : r.status === 'IN_PROGRESS' ? 'workshop' : 'received',
            }))
          );
        } else {
          setReportsList([]);
        }
      } catch (err) {
        setReportsList([]);
      } finally {
        setLoading(false);
      }
    };
    void fetchReports();
  }, []);

  const columns: Column<IssueReportItem>[] = [
    {
      key: 'reportCode',
      title: 'MÃ PHIẾU BM09',
      sortable: true,
      render: (row) => <strong className="text-primary font-mono font-bold text-xs">{row.reportCode}</strong>,
    },
    {
      key: 'title',
      title: 'SỰ CỐ KỸ THUẬT',
      sortable: true,
      render: (row) => (
        <div>
          <span className="font-bold text-slate-900 block">{row.title}</span>
          <span className="text-[10px] text-slate-500">{row.reporterName}</span>
        </div>
      ),
    },
    {
      key: 'vehicleCode',
      title: 'XE BÁO HỎNG',
      render: (row) => <strong className="text-slate-800">{row.vehicleCode}</strong>,
    },
    { key: 'location', title: 'VỊ TRÍ HIỆN TRƯỜNG' },
    { key: 'timeStr', title: 'THỜI GIAN BÁO' },
    {
      key: 'severity',
      title: 'MỨC ĐỘ SỰ CỐ',
      render: (row) => row.severity === 'heavy' ? <Badge variant="red" dot>Sự cố nặng (Xưởng)</Badge> : <Badge variant="blue">Sự cố nhẹ (Tại chỗ)</Badge>,
    },
    {
      key: 'stage',
      title: 'TIẾN ĐỘ XỬ LÝ',
      render: (row) => {
        if (row.stage === 'received') return <Badge variant="amber" dot>Tiếp nhận mới</Badge>;
        if (row.stage === 'onsite') return <Badge variant="blue">Thợ tại chỗ</Badge>;
        if (row.stage === 'workshop') return <Badge variant="red">Đại tu tại xưởng</Badge>;
        return <Badge variant="green">Đã bàn giao</Badge>;
      },
    },
  ];

  const kanbanStages = [
    { id: 'received', title: '1. Tiếp nhận báo hỏng mới', badgeBg: 'bg-amber-50 text-amber-700' },
    { id: 'onsite', title: '2. Đã cử thợ xử lý tại chỗ', badgeBg: 'bg-sky-50 text-sky-700' },
    { id: 'workshop', title: '3. Đang đại tu tại Xưởng', badgeBg: 'bg-rose-50 text-rose-700' },
    { id: 'done', title: '4. Đã sửa xong & Bàn giao', badgeBg: 'bg-emerald-50 text-emerald-700' },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 font-heading">
            Tiếp nhận yêu cầu sửa chữa (BM09)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Tiếp nhận báo hỏng sự cố từ App tài xế, chẩn đoán mức độ Nhẹ (≤15p tại chỗ) hay Nặng (chuyển xưởng).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="md" icon={<Download className="w-4 h-4" />}>
            Xuất biên bản sự cố
          </Button>
          <Button variant="primary" size="md" icon={<Plus className="w-4 h-4" />} onClick={() => setShowAddModal(true)}>
            Tạo yêu cầu sửa chữa
          </Button>
        </div>
      </div>

      {/* Global FilterBar */}
      <FilterBar
        extraFilters={
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Trạng thái: Đang xử lý</span>
          </div>
        }
      />

      {/* 4 Stats Cards */}
      <KPIGrid cols={4}>
        <StatCard
          label="Yêu cầu sự cố trong ngày"
          value={`${reportsList.length} sự cố`}
          subValue="Tiếp nhận từ App tài xế"
          icon={<AlertTriangle className="w-5 h-5" />}
          iconBgColor="bg-amber-50"
          iconColor="text-amber-600"
        />
        <StatCard
          label="Sự cố nhẹ (Xử lý tại chỗ)"
          value={`${reportsList.filter(r => r.severity === 'light').length} vụ`}
          subValue="Xử lý nhanh hiện trường"
          icon={<Wrench className="w-5 h-5" />}
          iconBgColor="bg-sky-50"
          iconColor="text-sky-600"
        />
        <StatCard
          label="Sự cố nặng (Chuyển xưởng)"
          value={`${reportsList.filter(r => r.severity === 'heavy').length} xe`}
          subValue="Đại tu tại xưởng BTSC"
          icon={<Truck className="w-5 h-5" />}
          iconBgColor="bg-rose-50"
          iconColor="text-rose-600"
        />
        <StatCard
          label="Đã hoàn tất bàn giao"
          value={`${reportsList.filter(r => r.stage === 'done').length} vụ`}
          subValue="Nghiệm thu kỹ thuật"
          icon={<Clock className="w-5 h-5" />}
          iconBgColor="bg-emerald-50"
          iconColor="text-emerald-700"
        />
      </KPIGrid>

      {/* View Switcher */}
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveView('kanban')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeView === 'kanban'
                ? 'bg-primary text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <KanbanIcon className="w-3.5 h-3.5" />
            Luồng Tiếp Nhận & Phân Loại (Kanban)
          </button>
          <button
            onClick={() => setActiveView('table')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeView === 'table'
                ? 'bg-primary text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Bảng Danh Sách Phiếu BM09 (Table)
          </button>
        </div>

        <span className="text-xs font-bold text-slate-500 hidden sm:inline">
          Tổng cộng: <b>6 phiếu tiếp nhận</b>
        </span>
      </div>

      {/* KANBAN VIEW */}
      {activeView === 'kanban' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {kanbanStages.map((stage) => {
            const items = reportsList.filter((i) => i.stage === stage.id);
            return (
              <div key={stage.id} className="bg-slate-50 rounded-2xl p-3 border border-slate-200/80 flex flex-col">
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-200">
                  <h3 className="font-extrabold text-xs text-slate-800">{stage.title}</h3>
                  <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${stage.badgeBg}`}>
                    {items.length}
                  </span>
                </div>

                <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[600px]">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => setSelectedReport(item)}
                      className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-sm hover:shadow-md hover:border-primary/50 transition-all cursor-pointer group"
                    >
                      <div className="flex items-center justify-between text-[11px] font-mono font-bold text-primary mb-1">
                        <span>{item.reportCode}</span>
                        <span className="text-[10px] text-slate-400 font-sans font-normal">{item.timeStr}</span>
                      </div>

                      <h4 className="font-extrabold text-xs text-slate-900 group-hover:text-primary transition-colors mb-1.5 leading-snug">
                        {item.title}
                      </h4>

                      <p className="text-[11px] text-slate-500 mb-2">
                        {item.vehicleCode} · {item.location} · {item.reporterName}
                      </p>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                        {item.severity === 'heavy' ? (
                          <Badge variant="red">Sự cố nặng</Badge>
                        ) : (
                          <Badge variant="blue">Sự cố nhẹ</Badge>
                        )}
                        <span className="text-[10px] font-bold text-primary group-hover:underline">Chi tiết →</span>
                      </div>
                    </div>
                  ))}
                  {items.length === 0 && (
                    <div className="text-center py-8 text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
                      Không có sự cố nào
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TABLE VIEW */}
      {activeView === 'table' && (
        <DataTable
          title="Danh Sách Phiếu Báo Hỏng Đang Xử Lý"
          subtitle="Quản lý thời gian phản hồi cứu hộ kỹ thuật và phân loại mức độ khẩn cấp"
          columns={columns}
          data={reportsList}
          isLoading={loading}
          onRowClick={(row) => setSelectedReport(row)}
        />
      )}

      {/* Detail Modal */}
      {selectedReport && (
        <Modal
          isOpen={!!selectedReport}
          onClose={() => setSelectedReport(null)}
          title={`Chi Tiết Báo Hỏng: ${selectedReport.reportCode}`}
          subtitle={`${selectedReport.title}`}
          size="md"
        >
          <div className="space-y-3.5 text-xs text-slate-700">
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
              <div className="flex justify-between"><span>Phương tiện báo hỏng:</span> <strong className="text-primary">{selectedReport.vehicleCode}</strong></div>
              <div className="flex justify-between"><span>Vị trí hiện trường:</span> <b>{selectedReport.location}</b></div>
              <div className="flex justify-between"><span>Người báo / Diễn biến:</span> <span>{selectedReport.reporterName}</span></div>
              <div className="flex justify-between"><span>Thời gian ghi nhận:</span> <span>{selectedReport.timeStr}</span></div>
              <div className="flex justify-between"><span>Phân loại mức độ:</span> <b>{selectedReport.severity === 'heavy' ? 'Sự cố nặng (Cần chuyển xưởng)' : 'Sự cố nhẹ (Xử lý tại chỗ ≤15p)'}</b></div>
            </div>
            <div className="flex justify-end pt-2">
              <Button variant="primary" size="sm" onClick={() => setSelectedReport(null)}>
                Đóng
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Add Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Tạo Yêu Cầu Sửa Chữa Mới (BM09)"
        subtitle="Tiếp nhận phản ánh hỏng hóc hoặc sự cố máy cơ giới ngoài hiện trường"
        size="md"
      >
        <div className="space-y-3 text-xs">
          <div>
            <label className="font-bold text-slate-700 block mb-1">Xe cơ giới gặp sự cố:</label>
            <select className="w-full p-2 border border-slate-200 rounded-xl bg-slate-50">
              <option>XC-NH-031 (Máy kéo New Holland 110HP)</option>
              <option>XT-HW-108 (Xe tải Howo 4 chân 15T)</option>
              <option>XC-KB-042 (Máy kéo Kubota M7040)</option>
            </select>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Mô tả chi tiết sự cố:</label>
            <input type="text" placeholder="Ví dụ: Bục ống tuy-ô thủy lực dàn cày nâng hạ" className="w-full p-2 border border-slate-200 rounded-xl bg-slate-50 font-bold" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Vị trí hiện trường:</label>
              <input type="text" placeholder="Ví dụ: Lô CN-B06 NT1" className="w-full p-2 border border-slate-200 rounded-xl bg-slate-50" />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Phân loại chẩn đoán:</label>
              <select className="w-full p-2 border border-slate-200 rounded-xl bg-slate-50">
                <option>Sự cố nhẹ (Xử lý tại chỗ ≤ 15 phút)</option>
                <option>Sự cố nặng (Cần cẩu kéo xe về xưởng)</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3">
            <Button variant="outline" size="sm" onClick={() => setShowAddModal(false)}>Hủy</Button>
            <Button variant="primary" size="sm" onClick={() => setShowAddModal(false)}>Phát Lệnh Sửa Chữa</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
