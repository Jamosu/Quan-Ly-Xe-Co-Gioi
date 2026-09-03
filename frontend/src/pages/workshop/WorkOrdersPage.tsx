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
  FileText,
  Plus,
  Download,
  DollarSign,
  Clock,
  Wrench,
  CheckCircle2,
  Package,
} from 'lucide-react';

interface WorkOrderItem {
  id: string;
  orderCode: string;
  vehicleCode: string;
  vehicleModel: string;
  taskTitle: string;
  repairChannel: 'internal' | 'warranty_vendor';
  technicianName: string;
  partsUsed: string;
  estimatedCostVND: string;
  status: 'in_progress' | 'waiting_vendor' | 'completed';
}

export const WorkOrdersPage: React.FC = () => {
  const [selectedOrder, setSelectedOrder] = useState<WorkOrderItem | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [ordersList, setOrdersList] = useState<WorkOrderItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      setLoading(true);
      try {
        const res = await apiClient.get('/repairs');
        const items = res.data?.data?.items || res.data?.items || res.data || [];
        if (Array.isArray(items) && items.length > 0) {
          setOrdersList(
            items.map((r: any) => ({
              id: `WO-${r.id}`,
              orderCode: r.code || `PSC-${r.id}`,
              vehicleCode: r.vehicle?.plate || r.vehicle?.code || '—',
              vehicleModel: r.vehicle?.name || r.vehicleType || 'Phương tiện',
              taskTitle: r.description || 'Sửa chữa bảo dưỡng',
              repairChannel: (r.isExternal ? 'warranty_vendor' : 'internal') as any,
              technicianName: r.technician || 'Kỹ thuật viên xưởng',
              partsUsed: r.parts || 'Vật tư theo phiếu',
              estimatedCostVND: r.cost ? `${Number(r.cost).toLocaleString('vi-VN')} đ` : '—',
              status: (r.status === 'COMPLETED' ? 'completed' : r.status === 'WAITING_PARTS' ? 'waiting_vendor' : 'in_progress') as any,
            }))
          );
        } else {
          setOrdersList([]);
        }
      } catch (err) {
        setOrdersList([]);
      } finally {
        setLoading(false);
      }
    };
    void fetchOrders();
  }, []);

  const columns: Column<WorkOrderItem>[] = [
    {
      key: 'orderCode',
      title: 'SỐ PHIẾU BM02',
      sortable: true,
      render: (row) => <strong className="text-primary font-mono font-bold text-xs">{row.orderCode}</strong>,
    },
    {
      key: 'vehicleCode',
      title: 'XE SỬA CHỮA',
      sortable: true,
      render: (row) => (
        <div>
          <span className="font-bold text-slate-900 block">{row.vehicleCode}</span>
          <span className="text-[10px] text-slate-500">{row.vehicleModel}</span>
        </div>
      ),
    },
    { key: 'taskTitle', title: 'HẠNG MỤC CÔNG VIỆC', render: (row) => <span className="font-semibold text-slate-800 text-xs">{row.taskTitle}</span> },
    {
      key: 'repairChannel',
      title: 'PHÂN LUỒNG SỬA CHỮA',
      render: (row) => row.repairChannel === 'warranty_vendor' ? (
        <b className="text-amber-600 text-xs">Bảo hành NCC (BM03)</b>
      ) : (
        <span className="text-slate-700 text-xs font-medium">Nội bộ Xưởng BTSC</span>
      ),
    },
    { key: 'technicianName', title: 'KỸ THUẬT VIÊN', render: (row) => <span className="font-medium text-slate-800 text-xs">{row.technicianName}</span> },
    { key: 'partsUsed', title: 'VẬT TƯ XUẤT KHO', render: (row) => <span className="text-xs text-slate-600 line-clamp-1">{row.partsUsed}</span> },
    {
      key: 'estimatedCostVND',
      title: 'CHI PHÍ DỰ KIẾN',
      sortable: true,
      render: (row) => <strong className="text-slate-900 font-bold text-xs">{row.estimatedCostVND}</strong>,
    },
    {
      key: 'status',
      title: 'TRẠNG THÁI',
      render: (row) => {
        if (row.status === 'in_progress') return <Badge variant="green" dot>Đang thực hiện</Badge>;
        if (row.status === 'waiting_vendor') return <Badge variant="amber">Chờ NCC</Badge>;
        return <Badge variant="blue">Đã hoàn thành</Badge>;
      },
    },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 font-heading">
            Phiếu sửa chữa & Xuất vật tư (BM02)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Lập phiếu giao việc thợ máy, phân luồng sửa chữa nội bộ / bảo hành NCC (BM03) và xuất kho phụ tùng.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="md" icon={<Download className="w-4 h-4" />}>
            Xuất phiếu giao việc
          </Button>
          <Button variant="primary" size="md" icon={<Plus className="w-4 h-4" />} onClick={() => setShowAddModal(true)}>
            Tạo phiếu BM02
          </Button>
        </div>
      </div>

      {/* Global FilterBar */}
      <FilterBar
        extraFilters={
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Trạng thái: Đang thực hiện</span>
          </div>
        }
      />

      {/* 4 Stats Cards matching Mockup */}
      <KPIGrid cols={4}>
        <StatCard
          label="Phiếu giao việc (BM02)"
          value={`${ordersList.length} phiếu`}
          subValue="Đang theo dõi tại xưởng"
          icon={<FileText className="w-5 h-5" />}
          iconBgColor="bg-emerald-50"
          iconColor="text-primary"
        />
        <StatCard
          label="Sửa chữa nội bộ Xưởng"
          value={`${ordersList.filter((o) => o.repairChannel === 'internal').length} phiếu`}
          subValue="KTV Xưởng trực tiếp xử lý"
          icon={<Wrench className="w-5 h-5" />}
          iconBgColor="bg-sky-50"
          iconColor="text-sky-600"
        />
        <StatCard
          label="Chờ bảo hành NCC (BM03)"
          value={`${ordersList.filter((o) => o.repairChannel === 'warranty_vendor').length} phiếu`}
          subValue="Hãng bảo hành chính hãng"
          icon={<Package className="w-5 h-5" />}
          iconBgColor="bg-amber-50"
          iconColor="text-amber-600"
        />
        <StatCard
          label="Đã hoàn thành sửa chữa"
          value={`${ordersList.filter((o) => o.status === 'completed').length} phiếu`}
          subValue="Xe đã bàn giao vận hành"
          icon={<CheckCircle2 className="w-5 h-5" />}
          iconBgColor="bg-emerald-50"
          iconColor="text-emerald-700"
        />
      </KPIGrid>

      {/* DataTable */}
      <DataTable
        title="Danh Sách Phiếu Sửa Chữa & Xuất Kho Phụ Tùng (BM02)"
        subtitle="Hiển thị các phiếu giao việc cho kỹ thuật viên và phân luồng bảo hành chính hãng"
        columns={columns}
        data={ordersList}
        isLoading={loading}
        onRowClick={(row) => setSelectedOrder(row)}
      />

      {/* Detail Modal */}
      {selectedOrder && (
        <Modal
          isOpen={!!selectedOrder}
          onClose={() => setSelectedOrder(null)}
          title={`Phiếu Sửa Chữa: ${selectedOrder.orderCode}`}
          subtitle={`Xe: ${selectedOrder.vehicleCode} (${selectedOrder.vehicleModel})`}
          size="md"
        >
          <div className="space-y-3.5 text-xs text-slate-700">
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
              <div className="flex justify-between"><span>Hạng mục công việc:</span> <b className="text-slate-900">{selectedOrder.taskTitle}</b></div>
              <div className="flex justify-between"><span>Phân luồng:</span> <b>{selectedOrder.repairChannel === 'warranty_vendor' ? 'Bảo hành NCC (BM03)' : 'Nội bộ Xưởng'}</b></div>
              <div className="flex justify-between"><span>Kỹ thuật viên phụ trách:</span> <b className="text-primary">{selectedOrder.technicianName}</b></div>
              <div className="flex justify-between"><span>Vật tư xuất kho:</span> <span>{selectedOrder.partsUsed}</span></div>
              <div className="flex justify-between"><span>Chi phí dự kiến:</span> <strong className="text-emerald-700">{selectedOrder.estimatedCostVND}</strong></div>
            </div>
            <div className="flex justify-end pt-2">
              <Button variant="primary" size="sm" onClick={() => setSelectedOrder(null)}>
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
        title="Tạo Phiếu Sửa Chữa Mới (BM02)"
        subtitle="Phân công thợ máy và tạo lệnh xuất kho vật tư phụ tùng"
        size="md"
      >
        <div className="space-y-3 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Chọn xe sửa chữa:</label>
              <select className="w-full p-2 border border-slate-200 rounded-xl bg-slate-50">
                <option>XC-JD-024 (John Deere 140HP)</option>
                <option>XC-NH-031 (New Holland 110HP)</option>
                <option>XT-HW-102 (Howo 4 chân)</option>
              </select>
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Phân luồng sửa chữa:</label>
              <select className="w-full p-2 border border-slate-200 rounded-xl bg-slate-50">
                <option>Nội bộ Xưởng BTSC</option>
                <option>Bảo hành NCC (BM03)</option>
                <option>Gia công cơ khí ngoài</option>
              </select>
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Nội dung công việc:</label>
            <input type="text" placeholder="Ví dụ: Thay bộ lá côn & mâm ép máy kéo" className="w-full p-2 border border-slate-200 rounded-xl bg-slate-50 font-bold" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">KTV chính phụ trách:</label>
              <select className="w-full p-2 border border-slate-200 rounded-xl bg-slate-50">
                <option>Đỗ Thanh Hải (Tổ Gầm Máy)</option>
                <option>Huỳnh Tấn Đạt (Tổ Thủy Lực)</option>
                <option>Nguyễn Thành Long (Tổ Điện - Lạnh)</option>
              </select>
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Chi phí dự kiến (VNĐ):</label>
              <input type="text" placeholder="Ví dụ: 3.500.000" className="w-full p-2 border border-slate-200 rounded-xl bg-slate-50 font-bold font-mono" />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3">
            <Button variant="outline" size="sm" onClick={() => setShowAddModal(false)}>Hủy</Button>
            <Button variant="primary" size="sm" onClick={() => setShowAddModal(false)}>Lập Phiếu Giao Việc</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
