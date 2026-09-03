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
  ShieldCheck,
  Plus,
  Download,
  AlertTriangle,
  FileCheck,
  Shield,
  Clock,
} from 'lucide-react';

interface InspectionInsuranceItem {
  id: string;
  plateNumber: string;
  vehicleCode: string;
  vehicleType: string;
  unitName: string;
  inspectionExpiry: string;
  inspectionNotice: string;
  isInspectionExpiring: boolean;
  inspectionCenter: string;
  insuranceExpiry: string;
  insuranceNotice?: string;
  isInsuranceExpiring?: boolean;
  insuranceCompany: string;
  status: 'valid' | 'expiring_inspection' | 'expiring_insurance' | 'inspecting';
  statusLabel: string;
}

export const InspectionInsurancePage: React.FC = () => {
  const [selectedItem, setSelectedItem] = useState<InspectionInsuranceItem | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [itemsList, setItemsList] = useState<InspectionInsuranceItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInspections = async () => {
      setLoading(true);
      try {
        const res = await apiClient.get('/vehicles', { params: { limit: 100 } });
        const items = res.data?.data?.items || res.data?.items || res.data || [];
        if (Array.isArray(items) && items.length > 0) {
          setItemsList(
            items.map((v: any) => ({
              id: `II-${v.id}`,
              plateNumber: v.plate || '—',
              vehicleCode: v.code,
              vehicleType: v.name,
              unitName: v.unit || 'Chưa phân bổ',
              inspectionExpiry: v.inspectionExpiry ? new Date(v.inspectionExpiry).toLocaleDateString('vi-VN') : 'Chưa cập nhật',
              inspectionNotice: 'Đang theo dõi',
              isInspectionExpiring: false,
              inspectionCenter: 'TTĐK Khu vực',
              insuranceExpiry: v.insuranceExpiry ? new Date(v.insuranceExpiry).toLocaleDateString('vi-VN') : 'Chưa cập nhật',
              insuranceCompany: 'Bảo hiểm THACO',
              status: 'valid',
              statusLabel: 'Hợp lệ',
            }))
          );
        } else {
          setItemsList([]);
        }
      } catch (err) {
        setItemsList([]);
      } finally {
        setLoading(false);
      }
    };
    void fetchInspections();
  }, []);

  const columns: Column<InspectionInsuranceItem>[] = [
    {
      key: 'plateNumber',
      title: 'BIỂN SỐ XE / MÃ',
      sortable: true,
      render: (row) => (
        <div>
          <strong className="text-primary font-bold block">{row.plateNumber}</strong>
          <span className="text-[10px] text-slate-500 font-mono">{row.vehicleCode}</span>
        </div>
      ),
    },
    { key: 'vehicleType', title: 'CHỦNG LOẠI PHƯƠNG TIỆN', sortable: true, render: (row) => <span className="font-semibold text-slate-900 text-xs">{row.vehicleType}</span> },
    { key: 'unitName', title: 'ĐƠN VỊ QUẢN LÝ', render: (row) => <span className="text-xs text-slate-800 font-medium">{row.unitName}</span> },
    {
      key: 'inspectionExpiry',
      title: 'HẠN ĐĂNG KIỂM',
      sortable: true,
      render: (row) => (
        <div>
          <b className={`block text-xs ${row.isInspectionExpiring ? 'text-amber-600 font-bold' : 'text-slate-800'}`}>
            {row.inspectionExpiry}
          </b>
          <span className="text-[10px] text-slate-500">({row.inspectionNotice})</span>
        </div>
      ),
    },
    { key: 'inspectionCenter', title: 'TRUNG TÂM KIỂM ĐỊNH', render: (row) => <span className="text-xs text-slate-600">{row.inspectionCenter}</span> },
    {
      key: 'insuranceExpiry',
      title: 'HẠN BẢO HIỂM TNDS / THÂN VỎ',
      render: (row) => (
        <div>
          <b className={`block text-xs ${row.isInsuranceExpiring ? 'text-amber-600 font-bold' : 'text-slate-800'}`}>
            {row.insuranceExpiry}
          </b>
          {row.insuranceNotice && <span className="text-[10px] text-slate-500">({row.insuranceNotice})</span>}
        </div>
      ),
    },
    { key: 'insuranceCompany', title: 'CÔNG TY BẢO HIỂM', render: (row) => <Badge variant="blue">{row.insuranceCompany}</Badge> },
    {
      key: 'status',
      title: 'TRẠNG THÁI',
      render: (row) => {
        if (row.status === 'valid') return <Badge variant="green">Còn hạn</Badge>;
        if (row.status === 'inspecting') return <Badge variant="blue" dot>Đang khám xe</Badge>;
        return <Badge variant="amber">{row.statusLabel}</Badge>;
      },
    },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 font-heading">
            Quản lý Đăng kiểm & Bảo hiểm xe
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Theo dõi thời hạn kiểm định kỹ thuật an toàn và hợp đồng bảo hiểm TNDS / vật chất thân vỏ xe cơ giới.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="md" icon={<Download className="w-4 h-4" />}>
            Xuất danh sách đến hạn
          </Button>
          <Button variant="primary" size="md" icon={<Plus className="w-4 h-4" />} onClick={() => setShowAddModal(true)}>
            Thêm hồ sơ mới
          </Button>
        </div>
      </div>

      {/* Global FilterBar */}
      <FilterBar
        extraFilters={
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-700 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span>Cảnh báo hạn: Dưới 45 ngày</span>
          </div>
        }
      />

      {/* 4 Stats Cards matching Mockup */}
      <KPIGrid cols={4}>
        <StatCard
          label="Tổng phương tiện theo dõi"
          value={`${itemsList.length} xe`}
          subValue="Đăng kiểm & Bảo hiểm"
          icon={<FileCheck className="w-5 h-5" />}
          iconBgColor="bg-emerald-50"
          iconColor="text-primary"
        />
        <StatCard
          label="Sắp hết hạn đăng kiểm (<30 ngày)"
          value={`${itemsList.filter((i) => i.isInspectionExpiring).length} xe`}
          subValue="Cần đưa đi khám xe"
          icon={<AlertTriangle className="w-5 h-5" />}
          iconBgColor="bg-amber-50"
          iconColor="text-amber-600"
        />
        <StatCard
          label="Đang trong kỳ hạn hợp lệ"
          value={`${itemsList.filter((i) => i.status === 'valid').length} xe`}
          subValue="Đủ điều kiện lưu hành"
          icon={<ShieldCheck className="w-5 h-5" />}
          iconBgColor="bg-sky-50"
          iconColor="text-sky-600"
        />
        <StatCard
          label="Sắp tái tục bảo hiểm"
          value={`${itemsList.filter((i) => i.isInsuranceExpiring).length} hợp đồng`}
          subValue="Bảo hiểm thân vỏ / TNDS"
          icon={<Clock className="w-5 h-5" />}
          iconBgColor="bg-amber-50"
          iconColor="text-amber-600"
        />
      </KPIGrid>

      {/* DataTable */}
      <DataTable
        title="Danh Sách Theo Dõi Thời Hạn Đăng Kiểm & Bảo Hiểm Xe"
        subtitle="Quản lý lịch khám xe tại các trung tâm kiểm định giao thông và thời hạn bảo hiểm thân vỏ"
        columns={columns}
        data={itemsList}
        isLoading={loading}
        onRowClick={(row) => setSelectedItem(row)}
      />

      {/* Detail Modal */}
      {selectedItem && (
        <Modal
          isOpen={!!selectedItem}
          onClose={() => setSelectedItem(null)}
          title={`Hồ Sơ Pháp Lý: ${selectedItem.plateNumber}`}
          subtitle={`${selectedItem.vehicleType} | Đơn vị: ${selectedItem.unitName}`}
          size="md"
        >
          <div className="space-y-3.5 text-xs text-slate-700">
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
              <div className="flex justify-between"><span>Hạn đăng kiểm:</span> <b className={selectedItem.isInspectionExpiring ? 'text-amber-600' : 'text-slate-900'}>{selectedItem.inspectionExpiry}</b></div>
              <div className="flex justify-between"><span>Trung tâm kiểm định:</span> <span>{selectedItem.inspectionCenter}</span></div>
              <div className="flex justify-between"><span>Hạn bảo hiểm TNDS:</span> <b className={selectedItem.isInsuranceExpiring ? 'text-amber-600' : 'text-slate-900'}>{selectedItem.insuranceExpiry}</b></div>
              <div className="flex justify-between"><span>Công ty bảo hiểm:</span> <b className="text-primary">{selectedItem.insuranceCompany}</b></div>
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
        title="Thêm Hồ Sơ Đăng Kiểm / Bảo Hiểm"
        subtitle="Cập nhật giấy chứng nhận đăng kiểm mới hoặc hợp đồng bảo hiểm"
        size="md"
      >
        <div className="space-y-3 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Chọn xe:</label>
              <select className="w-full p-2 border border-slate-200 rounded-xl bg-slate-50">
                <option>51C-892.34 (Howo 4 chân 15T)</option>
                <option>77C-124.58 (Hino 500 8 tấn)</option>
                <option>60C-556.78 (Ben Hyundai HD270)</option>
              </select>
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Trung tâm kiểm định:</label>
              <input type="text" placeholder="Ví dụ: TTĐK 81-02D Gia Lai" className="w-full p-2 border border-slate-200 rounded-xl bg-slate-50" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Hạn đăng kiểm mới:</label>
              <input type="date" defaultValue="2027-08-26" className="w-full p-2 border border-slate-200 rounded-xl bg-slate-50 font-bold" />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Hạn bảo hiểm mới:</label>
              <input type="date" defaultValue="2027-08-26" className="w-full p-2 border border-slate-200 rounded-xl bg-slate-50 font-bold" />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3">
            <Button variant="outline" size="sm" onClick={() => setShowAddModal(false)}>Hủy</Button>
            <Button variant="primary" size="sm" onClick={() => setShowAddModal(false)}>Lưu Hồ Sơ</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
