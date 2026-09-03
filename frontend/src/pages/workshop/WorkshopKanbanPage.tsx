import React, { useState, useEffect } from 'react';
import { FilterBar } from '../../components/filters/FilterBar';
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
  Fuel,
  Users,
  Activity,
  CheckCircle2,
  Package,
} from 'lucide-react';

interface WorkshopTrackItem {
  id: string;
  code: string;
  title: string;
  vehicleCode: string;
  details: string;
  timeStr: string;
  statusTag: string;
  isAbnormalFuel?: boolean;
  stage: 'diagnosing' | 'waiting_parts' | 'repairing' | 'kcs_done';
}

export const WorkshopKanbanPage: React.FC = () => {
  const [selectedItem, setSelectedItem] = useState<WorkshopTrackItem | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [trackItems, setTrackItems] = useState<WorkshopTrackItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchKanban = async () => {
      setLoading(true);
      try {
        const res = await apiClient.get('/repairs');
        const items = res.data?.data?.items || res.data?.items || res.data || [];
        if (Array.isArray(items) && items.length > 0) {
          setTrackItems(
            items.map((r: any) => ({
              id: `TD-${r.id}`,
              code: r.code || `TD-${r.id}`,
              title: r.issueDescription || 'Sửa chữa bảo dưỡng xe',
              vehicleCode: r.vehicle?.code || '—',
              details: `Tiếp nhận · KTV: ${r.technician || 'Chưa gán'}`,
              timeStr: r.createdAt ? new Date(r.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '—',
              statusTag: r.status,
              isAbnormalFuel: Boolean(r.isAbnormalFuel),
              stage: r.status === 'COMPLETED' ? 'kcs_done' : r.status === 'IN_PROGRESS' ? 'repairing' : r.status === 'WAITING_PARTS' ? 'waiting_parts' : 'diagnosing',
            }))
          );
        } else {
          setTrackItems([]);
        }
      } catch (err) {
        setTrackItems([]);
      } finally {
        setLoading(false);
      }
    };
    void fetchKanban();
  }, []);

  const stages = [
    { id: 'diagnosing', title: '1. Đang chẩn đoán hư hỏng', count: 2, badgeColor: 'bg-amber-50 text-amber-700' },
    { id: 'waiting_parts', title: '2. Chờ xuất kho phụ tùng', count: 2, badgeColor: 'bg-sky-50 text-sky-700' },
    { id: 'repairing', title: '3. Đang lắp ráp & Sửa chữa', count: 2, badgeColor: 'bg-indigo-50 text-indigo-700' },
    { id: 'kcs_done', title: '4. KCS kiểm tra & Bàn giao', count: 1, badgeColor: 'bg-emerald-50 text-emerald-700' },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 font-heading">
            Theo dõi tiến độ xưởng & Tiêu hao bất thường
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Theo dõi tiến độ sửa chữa, cảnh báo trễ hạn và theo dõi tiêu hao nhiên liệu bất thường gắn liền với sự cố máy móc.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="md" icon={<Download className="w-4 h-4" />}>
            Xem luồng xưởng
          </Button>
          <Button variant="primary" size="md" icon={<Plus className="w-4 h-4" />} onClick={() => setShowAddModal(true)}>
            Tiếp nhận xe
          </Button>
        </div>
      </div>

      {/* Global FilterBar */}
      <FilterBar
        extraFilters={
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Tiến độ luồng xưởng BTSC</span>
          </div>
        }
      />

      {/* 4 Stats Cards */}
      <KPIGrid cols={4}>
        <StatCard
          label="Xe đang nằm xưởng"
          value={`${trackItems.length} xe`}
          subValue="Theo dõi tiến độ"
          icon={<Wrench className="w-5 h-5" />}
          iconBgColor="bg-emerald-50"
          iconColor="text-primary"
        />
        <StatCard
          label="Đang sửa chữa / Chờ vật tư"
          value={`${trackItems.filter(t => t.stage === 'repairing' || t.stage === 'waiting_parts').length} xe`}
          subValue="Đang thao tác tại cầu nâng"
          icon={<Clock className="w-5 h-5" />}
          iconBgColor="bg-sky-50"
          iconColor="text-sky-600"
        />
        <StatCard
          label="Xe có hao dầu bất thường"
          value={`${trackItems.filter(t => t.isAbnormalFuel).length} xe`}
          subValue="Cảnh báo kỹ thuật"
          icon={<Fuel className="w-5 h-5" />}
          iconBgColor="bg-rose-50"
          iconColor="text-rose-600"
        />
        <StatCard
          label="Đã hoàn tất kiểm thử (KCS)"
          value={`${trackItems.filter(t => t.stage === 'kcs_done').length} xe`}
          subValue="Sẵn sàng bàn giao"
          icon={<Users className="w-5 h-5" />}
          iconBgColor="bg-emerald-50"
          iconColor="text-emerald-700"
        />
      </KPIGrid>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {stages.map((stage) => {
          const items = trackItems.filter((i) => i.stage === stage.id);
          return (
            <div key={stage.id} className="bg-slate-50 rounded-2xl p-3 border border-slate-200/80 flex flex-col">
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-200">
                <h3 className="font-extrabold text-xs text-slate-800">{stage.title}</h3>
                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${stage.badgeColor}`}>
                  {items.length}
                </span>
              </div>

              <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[600px]">
                {items.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => setSelectedItem(item)}
                    className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-sm hover:shadow-md hover:border-primary/50 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center justify-between text-[11px] font-mono font-bold text-primary mb-1">
                      <span>{item.code}</span>
                      <span className="text-[10px] text-slate-400 font-sans font-normal">{item.timeStr}</span>
                    </div>

                    <h4 className="font-extrabold text-xs text-slate-900 group-hover:text-primary transition-colors mb-1.5 leading-snug">
                      {item.title}
                    </h4>

                    <p className="text-[11px] text-slate-500 mb-2">
                      <strong className="text-slate-800">{item.vehicleCode}</strong> · {item.details}
                    </p>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                      {item.isAbnormalFuel ? (
                        <Badge variant="red" dot>{item.statusTag}</Badge>
                      ) : item.stage === 'kcs_done' ? (
                        <Badge variant="green">{item.statusTag}</Badge>
                      ) : (
                        <Badge variant="amber">{item.statusTag}</Badge>
                      )}
                      <span className="text-[10px] font-bold text-primary group-hover:underline">Theo dõi →</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Detail Modal */}
      {selectedItem && (
        <Modal
          isOpen={!!selectedItem}
          onClose={() => setSelectedItem(null)}
          title={`Tiến Độ: ${selectedItem.title}`}
          subtitle={`Xe: ${selectedItem.vehicleCode} | Mã phiếu: ${selectedItem.code}`}
          size="md"
        >
          <div className="space-y-3.5 text-xs text-slate-700">
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
              <div className="flex justify-between"><span>Phương tiện:</span> <strong className="text-primary">{selectedItem.vehicleCode}</strong></div>
              <div className="flex justify-between"><span>Trạng thái kỹ thuật:</span> <b>{selectedItem.statusTag}</b></div>
              <div className="flex justify-between"><span>Chi tiết công việc:</span> <span>{selectedItem.details}</span></div>
              {selectedItem.isAbnormalFuel && (
                <div className="bg-rose-50 p-2.5 rounded-xl border border-rose-200 text-rose-800 font-bold">
                  ⚠️ Phát hiện tiêu hao dầu bất thường (+18%) do hư hỏng kim phun nhiên liệu
                </div>
              )}
            </div>
            <div className="flex justify-end pt-2">
              <Button variant="primary" size="sm" onClick={() => setSelectedItem(null)}>
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
        title="Tiếp Nhận Phương Tiện Vào Xưởng BTSC"
        subtitle="Lập biên bản tiếp nhận xe vào sửa chữa tại Xưởng Trung tâm"
        size="md"
      >
        <div className="space-y-3 text-xs">
          <div>
            <label className="font-bold text-slate-700 block mb-1">Chọn xe cơ giới vào xưởng:</label>
            <select className="w-full p-2 border border-slate-200 rounded-xl bg-slate-50">
              <option>XC-KB-058 (Kubota M7040)</option>
              <option>MU-KM-015 (Komatsu D31P)</option>
              <option>XC-JD-019 (John Deere 140HP)</option>
              <option>XT-HW-108 (Howo 4 chân)</option>
            </select>
          </div>
          <div>
            <label className="font-bold text-slate-700 block mb-1">Mô tả tình trạng tiếp nhận:</label>
            <input type="text" placeholder="Ví dụ: Khói đen, kẹt bơm cao áp, hao dầu" className="w-full p-2 border border-slate-200 rounded-xl bg-slate-50 font-bold" />
          </div>
          <div className="flex justify-end gap-2 pt-3">
            <Button variant="outline" size="sm" onClick={() => setShowAddModal(false)}>Hủy</Button>
            <Button variant="primary" size="sm" onClick={() => setShowAddModal(false)}>Lưu Tiếp Nhận</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
