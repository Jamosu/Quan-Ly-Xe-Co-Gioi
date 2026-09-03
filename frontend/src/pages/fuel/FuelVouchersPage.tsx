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
  Fuel,
  Plus,
  Download,
  Truck,
  Building2,
  Calendar,
  CheckCircle2,
} from 'lucide-react';

interface FuelVoucherItem {
  id: string;
  voucherCode: string;
  dispenseTime: string;
  vehicleCode: string;
  vehicleModel: string;
  driverName: string;
  teamUnit: string;
  litersGiven: number;
  engineHoursOrKm: string;
  dispenseLocation: string;
  warehouseStaff: string;
}

export const FuelVouchersPage: React.FC = () => {
  const [selectedVoucher, setSelectedVoucher] = useState<FuelVoucherItem | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [vouchersList, setVouchersList] = useState<FuelVoucherItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTickets = async () => {
      setLoading(true);
      try {
        const res = await apiClient.get('/fuel/tickets');
        const items = res.data?.data?.items || res.data?.items || res.data || [];
        if (Array.isArray(items) && items.length > 0) {
          setVouchersList(
            items.map((t: any) => ({
              id: `FV-${t.id}`,
              voucherCode: t.code || `PCD-${t.id}`,
              dispenseTime: t.createdAt ? new Date(t.createdAt).toLocaleTimeString('vi-VN') : '—',
              vehicleCode: t.vehicle?.code || '—',
              vehicleModel: t.vehicle?.name || 'Phương tiện',
              driverName: t.driver?.fullName || 'Lái xe',
              teamUnit: t.driver?.unit || 'Đội cơ giới',
              litersGiven: t.liters || 0,
              engineHoursOrKm: `${t.odoOrHours || 0}`,
              dispenseLocation: t.warehouse?.name || 'Kho nhiên liệu',
              warehouseStaff: t.issuer?.fullName || 'Thủ kho',
            }))
          );
        } else {
          setVouchersList([]);
        }
      } catch (err) {
        setVouchersList([]);
      } finally {
        setLoading(false);
      }
    };
    void fetchTickets();
  }, []);

  const columns: Column<FuelVoucherItem>[] = [
    {
      key: 'voucherCode',
      title: 'MÃ PHIẾU',
      sortable: true,
      render: (row) => <strong className="text-primary font-mono font-bold text-xs">{row.voucherCode}</strong>,
    },
    { key: 'dispenseTime', title: 'THỜI GIAN', sortable: true },
    {
      key: 'vehicleCode',
      title: 'XE NHẬN DẦU',
      sortable: true,
      render: (row) => (
        <div>
          <span className="font-bold text-slate-900 block">{row.vehicleCode}</span>
          <span className="text-[10px] text-slate-500">{row.vehicleModel}</span>
        </div>
      ),
    },
    {
      key: 'driverName',
      title: 'LÁI XE / NGƯỜI NHẬN',
      render: (row) => (
        <div>
          <span className="font-bold text-slate-800 block text-xs">{row.driverName}</span>
          <span className="text-[10px] text-slate-500">{row.teamUnit}</span>
        </div>
      ),
    },
    {
      key: 'litersGiven',
      title: 'SỐ LÍT CẤP',
      sortable: true,
      render: (row) => <strong className="text-emerald-700 font-extrabold text-sm">{row.litersGiven} Lít</strong>,
    },
    { key: 'engineHoursOrKm', title: 'GIỜ MÁY / ODO', render: (row) => <span className="font-mono text-xs text-slate-700">{row.engineHoursOrKm}</span> },
    { key: 'dispenseLocation', title: 'ĐIỂM CẤP DẦU', render: (row) => <span className="text-xs text-slate-700 font-medium">{row.dispenseLocation}</span> },
    { key: 'warehouseStaff', title: 'THỦ KHO XUẤT', render: (row) => <span className="text-xs text-slate-800 font-semibold">{row.warehouseStaff}</span> },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 font-heading">
            Phiếu cấp phát nhiên liệu số hóa
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Ghi nhận phiếu cấp phát dầu Diesel DO 0.05S theo xe / lệnh / ngày tại cột bơm T1 và xe bồn cấp lưu động ngoài đồng.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="md" icon={<Download className="w-4 h-4" />}>
            Xuất bảng kê cấp dầu
          </Button>
          <Button variant="primary" size="md" icon={<Plus className="w-4 h-4" />} onClick={() => setShowAddModal(true)}>
            Lập phiếu cấp dầu
          </Button>
        </div>
      </div>

      {/* Global FilterBar */}
      <FilterBar
        extraFilters={
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Đã chốt ca sáng</span>
          </div>
        }
      />

      {/* 4 Stats Cards matching Mockup */}
      <KPIGrid cols={4}>
        <StatCard
          label="Tổng dầu xuất cấp"
          value={`${vouchersList.reduce((acc, v) => acc + (v.litersGiven || 0), 0).toLocaleString('vi-VN')} Lít`}
          subValue="DO 0.05S"
          icon={<Fuel className="w-5 h-5" />}
          iconBgColor="bg-emerald-50"
          iconColor="text-primary"
        />
        <StatCard
          label="Số lượt cấp dầu"
          value={`${vouchersList.length} lượt`}
          subValue="Phiếu cấp đã tạo"
          icon={<CheckCircle2 className="w-5 h-5" />}
          iconBgColor="bg-sky-50"
          iconColor="text-sky-600"
        />
        <StatCard
          label="Cấp lưu động ngoài đồng"
          value={`${vouchersList.filter((v) => v.dispenseLocation.toLowerCase().includes('lưu động')).reduce((acc, v) => acc + (v.litersGiven || 0), 0)} Lít`}
          subValue="Xe téc cấp hiện trường"
          icon={<Truck className="w-5 h-5" />}
          iconBgColor="bg-amber-50"
          iconColor="text-amber-600"
        />
        <StatCard
          label="Cấp tại Kho Bồn Cố Định"
          value={`${vouchersList.filter((v) => !v.dispenseLocation.toLowerCase().includes('lưu động')).reduce((acc, v) => acc + (v.litersGiven || 0), 0)} Lít`}
          subValue="Cột bơm điện tử"
          icon={<Building2 className="w-5 h-5" />}
          iconBgColor="bg-emerald-50"
          iconColor="text-emerald-700"
        />
      </KPIGrid>

      {/* DataTable */}
      <DataTable
        title="Danh Sách Phiếu Cấp Phát Nhiên Liệu Số Hóa"
        subtitle="Dữ liệu đồng bộ trực tiếp từ cột bơm điện tử và máy tính bảng của xe téc lưu động"
        columns={columns}
        data={vouchersList}
        isLoading={loading}
        onRowClick={(row) => setSelectedVoucher(row)}
      />

      {/* Detail Modal */}
      {selectedVoucher && (
        <Modal
          isOpen={!!selectedVoucher}
          onClose={() => setSelectedVoucher(null)}
          title={`Phiếu Cấp Dầu: ${selectedVoucher.voucherCode}`}
          subtitle={`Xe: ${selectedVoucher.vehicleCode} (${selectedVoucher.vehicleModel})`}
          size="md"
        >
          <div className="space-y-3.5 text-xs text-slate-700">
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
              <div className="flex justify-between"><span>Số lượng dầu cấp:</span> <b className="text-emerald-700 text-base">{selectedVoucher.litersGiven} Lít DO 0.05S</b></div>
              <div className="flex justify-between"><span>Lái xe nhận:</span> <b>{selectedVoucher.driverName} ({selectedVoucher.teamUnit})</b></div>
              <div className="flex justify-between"><span>Chỉ số máy / ODO:</span> <span className="font-mono">{selectedVoucher.engineHoursOrKm}</span></div>
              <div className="flex justify-between"><span>Điểm cấp:</span> <span>{selectedVoucher.dispenseLocation}</span></div>
              <div className="flex justify-between"><span>Thủ kho xuất:</span> <b>{selectedVoucher.warehouseStaff}</b></div>
            </div>
            <div className="flex justify-end pt-2">
              <Button variant="primary" size="sm" onClick={() => setSelectedVoucher(null)}>
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
        title="Lập Phiếu Cấp Nhiên Liệu Mới"
        subtitle="Ghi nhận lệnh cấp phát dầu Diesel cho phương tiện cơ giới"
        size="md"
      >
        <div className="space-y-3 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Xe nhận dầu:</label>
              <select className="w-full p-2 border border-slate-200 rounded-xl bg-slate-50">
                <option>XC-JD-024 (John Deere 140HP)</option>
                <option>XT-HW-102 (Howo 4 chân)</option>
                <option>XC-KB-053 (Kubota M7040)</option>
              </select>
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Số lít dầu cấp (DO 0.05S):</label>
              <input type="number" defaultValue="150" className="w-full p-2 border border-slate-200 rounded-xl bg-slate-50 font-bold font-mono" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Điểm cấp dầu:</label>
              <select className="w-full p-2 border border-slate-200 rounded-xl bg-slate-50">
                <option>Cột bơm T1 (Kho Trung Tâm)</option>
                <option>Xe téc lưu động số 1 (Lô A)</option>
                <option>Xe téc lưu động số 2 (Lô B)</option>
              </select>
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Chỉ số ODO / Giờ máy:</label>
              <input type="text" placeholder="Ví dụ: 2.450 giờ máy" className="w-full p-2 border border-slate-200 rounded-xl bg-slate-50 font-bold" />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3">
            <Button variant="outline" size="sm" onClick={() => setShowAddModal(false)}>Hủy</Button>
            <Button variant="primary" size="sm" onClick={() => setShowAddModal(false)}>In & Lưu Phiếu Cấp Dầu</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
