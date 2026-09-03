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
  PackageCheck,
  CheckCircle2,
} from 'lucide-react';

interface MaintenancePlanItem {
  id: string;
  vehicleCode: string;
  vehicleModel: string;
  maintenanceTier: string;
  currentHoursAndKm: string;
  currentHoursSub: string;
  dueCycleHoursAndKm: string;
  dueCycleSub: string;
  replacementItems: string;
  assignedTechnician: string;
  alertLevel: 'green' | 'yellow' | 'red';
  alertLabel: string;
}

export const MaintenancePlanPage: React.FC = () => {
  const [selectedPlan, setSelectedPlan] = useState<MaintenancePlanItem | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [maintenanceList, setMaintenanceList] = useState<MaintenancePlanItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPlans = async () => {
      setLoading(true);
      try {
        const res = await apiClient.get('/maintenance');
        const items = res.data?.data?.items || res.data?.items || res.data || [];
        if (Array.isArray(items) && items.length > 0) {
          setMaintenanceList(
            items.map((m: any) => ({
              id: `MP-${m.id}`,
              vehicleCode: m.vehicle?.plate || m.vehicle?.code || '—',
              vehicleModel: m.vehicle?.name || m.vehicleType || 'Phương tiện',
              maintenanceTier: m.planType || 'Bảo dưỡng định kỳ',
              currentHoursAndKm: `${m.vehicle?.engineHours || 0} giờ máy`,
              currentHoursSub: 'Cập nhật từ GPS',
              dueCycleHoursAndKm: `${m.intervalHours || 250} giờ máy`,
              dueCycleSub: 'Chu kỳ chuẩn',
              replacementItems: m.notes || 'Dầu nhờn & Lọc',
              assignedTechnician: m.technician || 'Kỹ thuật viên xưởng',
              alertLevel: (m.status === 'OVERDUE' ? 'red' : m.status === 'NEAR_DUE' ? 'yellow' : 'green') as any,
              alertLabel: m.status === 'OVERDUE' ? 'Quá hạn' : m.status === 'NEAR_DUE' ? 'Sắp đến hạn' : 'An toàn',
            }))
          );
        } else {
          setMaintenanceList([]);
        }
      } catch (err) {
        setMaintenanceList([]);
      } finally {
        setLoading(false);
      }
    };
    void fetchPlans();
  }, []);

  const columns: Column<MaintenancePlanItem>[] = [
    {
      key: 'vehicleCode',
      title: 'MÃ XE',
      sortable: true,
      render: (row) => <strong className="text-primary font-bold">{row.vehicleCode}</strong>,
    },
    { key: 'vehicleModel', title: 'CHỦNG LOẠI XE', sortable: true, render: (row) => <span className="font-semibold text-slate-800 text-xs">{row.vehicleModel}</span> },
    { key: 'maintenanceTier', title: 'CẤP BẢO DƯỠNG', render: (row) => <span className="font-bold text-slate-900 text-xs">{row.maintenanceTier}</span> },
    {
      key: 'currentHoursAndKm',
      title: 'GIỜ MÁY / KM HIỆN TẠI',
      render: (row) => (
        <div>
          <strong className="text-slate-900 block font-bold text-xs">{row.currentHoursAndKm}</strong>
          <span className="text-[10px] text-slate-500">{row.currentHoursSub}</span>
        </div>
      ),
    },
    {
      key: 'dueCycleHoursAndKm',
      title: 'CHU KỲ ĐẾN HẠN',
      render: (row) => (
        <div>
          <b className="text-slate-800 block text-xs">{row.dueCycleHoursAndKm}</b>
          <span className="text-[10px] text-slate-500">{row.dueCycleSub}</span>
        </div>
      ),
    },
    {
      key: 'replacementItems',
      title: 'HẠNG MỤC CẦN THAY THẾ',
      render: (row) => <span className="text-xs text-slate-600 line-clamp-1">{row.replacementItems}</span>,
    },
    { key: 'assignedTechnician', title: 'KỸ THUẬT VIÊN', render: (row) => <span className="font-medium text-slate-800 text-xs">{row.assignedTechnician}</span> },
    {
      key: 'alertLevel',
      title: 'CẢNH BÁO MÀU',
      render: (row) => {
        if (row.alertLevel === 'red') return <Badge variant="red">{row.alertLabel}</Badge>;
        if (row.alertLevel === 'yellow') return <Badge variant="amber">{row.alertLabel}</Badge>;
        return <Badge variant="green">{row.alertLabel}</Badge>;
      },
    },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 font-heading">
            Kế hoạch bảo dưỡng theo giờ máy & km
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Bảo dưỡng định kỳ 2 cấp (BDC1 hằng ngày, BDC2 theo giờ máy 50h, 250h, 500h...) theo QĐ 13/2023 THACO AGRI.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="md" icon={<Download className="w-4 h-4" />}>
            Xuất kế hoạch
          </Button>
          <Button variant="primary" size="md" icon={<Plus className="w-4 h-4" />} onClick={() => setShowAddModal(true)}>
            Lập lịch bảo dưỡng
          </Button>
        </div>
      </div>

      {/* Global FilterBar */}
      <FilterBar
        extraFilters={
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Đúng định mức kỹ thuật</span>
          </div>
        }
      />

      {/* 4 Stats Cards matching Mockup */}
      <KPIGrid cols={4}>
        <StatCard
          label="Tổng xe trong kế hoạch bảo dưỡng"
          value={`${maintenanceList.length} xe`}
          subValue="Theo dõi chu kỳ bảo dưỡng"
          icon={<Clock className="w-5 h-5" />}
          iconBgColor="bg-amber-50"
          iconColor="text-amber-600"
        />
        <StatCard
          label="An toàn (Mức Xanh)"
          value={`${maintenanceList.filter((m) => m.alertLevel === 'green').length} xe`}
          subValue="Còn nhiều thời gian"
          icon={<CheckCircle2 className="w-5 h-5" />}
          iconBgColor="bg-emerald-50"
          iconColor="text-primary"
        />
        <StatCard
          label="Gần đến hạn (Mức Vàng)"
          value={`${maintenanceList.filter((m) => m.alertLevel === 'yellow').length} xe`}
          subValue="Chuẩn bị vật tư thay thế"
          icon={<AlertTriangle className="w-5 h-5" />}
          iconBgColor="bg-amber-50"
          iconColor="text-amber-600"
        />
        <StatCard
          label="Cảnh báo Đỏ (Quá hạn)"
          value={`${maintenanceList.filter((m) => m.alertLevel === 'red').length} xe`}
          subValue="Cần đưa vào xưởng ngay"
          icon={<AlertTriangle className="w-5 h-5" />}
          iconBgColor="bg-rose-50"
          iconColor="text-rose-600"
        />
      </KPIGrid>

      {/* DataTable */}
      <DataTable
        title="Danh Sách Xe Đến Hạn Bảo Dưỡng Định Kỳ (BDC2)"
        subtitle="Hệ thống tự động đồng bộ giờ máy từ GPS và phân loại cảnh báo Xanh / Vàng / Đỏ theo QĐ 13"
        columns={columns}
        data={maintenanceList}
        isLoading={loading}
        onRowClick={(row) => setSelectedPlan(row)}
      />

      {/* Detail Modal */}
      {selectedPlan && (
        <Modal
          isOpen={!!selectedPlan}
          onClose={() => setSelectedPlan(null)}
          title={`Chi Tiết Bảo Dưỡng: ${selectedPlan.vehicleCode}`}
          subtitle={`${selectedPlan.maintenanceTier} | Xe: ${selectedPlan.vehicleModel}`}
          size="md"
        >
          <div className="space-y-3.5 text-xs text-slate-700">
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
              <div className="flex justify-between"><span>Giờ máy hiện tại:</span> <b>{selectedPlan.currentHoursAndKm} ({selectedPlan.currentHoursSub})</b></div>
              <div className="flex justify-between"><span>Mốc đến hạn:</span> <b>{selectedPlan.dueCycleHoursAndKm}</b></div>
              <div className="flex justify-between"><span>Vật tư cần thay:</span> <span>{selectedPlan.replacementItems}</span></div>
              <div className="flex justify-between"><span>KTV phụ trách:</span> <b className="text-primary">{selectedPlan.assignedTechnician}</b></div>
            </div>
            <div className="flex justify-end pt-2">
              <Button variant="primary" size="sm" onClick={() => setSelectedPlan(null)}>
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
        title="Lập Kế Hoạch Bảo Dưỡng Mới"
        subtitle="Lên lịch đưa phương tiện vào bảo trì định kỳ cấp 1 / cấp 2 / cấp 3"
        size="md"
      >
        <div className="space-y-3 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Chọn xe cơ giới:</label>
              <select className="w-full p-2 border border-slate-200 rounded-xl bg-slate-50">
                <option>XC-JD-024 (John Deere 140HP)</option>
                <option>XT-HW-102 (Howo 4 chân)</option>
                <option>XC-KB-053 (Kubota M7040)</option>
              </select>
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Cấp bảo dưỡng:</label>
              <select className="w-full p-2 border border-slate-200 rounded-xl bg-slate-50">
                <option>BDC2 - Cấp 1 (250 giờ máy)</option>
                <option>BDC2 - Cấp 2 (2.500 giờ máy)</option>
                <option>BDC2 - Cấp 3 (150.000 km)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Vật tư dự kiến thay thế:</label>
            <input type="text" placeholder="Ví dụ: Lọc nhớt, dầu động cơ 15W-40, lọc nhiên liệu" className="w-full p-2 border border-slate-200 rounded-xl bg-slate-50 font-bold" />
          </div>

          <div className="flex justify-end gap-2 pt-3">
            <Button variant="outline" size="sm" onClick={() => setShowAddModal(false)}>Hủy</Button>
            <Button variant="primary" size="sm" onClick={() => setShowAddModal(false)}>Lưu Lịch Bảo Dưỡng</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
