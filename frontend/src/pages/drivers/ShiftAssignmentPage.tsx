import React, { useState } from 'react';
import { FilterBar } from '../../components/filters/FilterBar';
import { DataTable, Column } from '../../components/data-display/DataTable';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { StatCard } from '../../components/data-display/StatCard';
import { KPIGrid } from '../../components/data-display/KPIGrid';
import {
  Calendar,
  Plus,
  Download,
  Clock,
  UserCheck,
  Users,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';

interface ShiftAssignmentRow {
  id: string;
  vehicleCode: string;
  vehicleModel: string;
  primaryDriver: string;
  primaryDriverPhone: string;
  secondaryDriver: string;
  workArea: string;
  unitName: string;
  taskTitle: string;
  status: 'in_progress' | 'scheduled';
}

export const ShiftAssignmentPage: React.FC = () => {
  const [selectedShift, setSelectedShift] = useState<ShiftAssignmentRow | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [shiftsList, setShiftsList] = useState<ShiftAssignmentRow[]>([]);

  const columns: Column<ShiftAssignmentRow>[] = [
    {
      key: 'vehicleCode',
      title: 'PHƯƠNG TIỆN CƠ GIỚI',
      sortable: true,
      render: (row) => <strong className="text-primary font-bold text-sm">{row.vehicleCode}</strong>,
    },
    { key: 'vehicleModel', title: 'CHỦNG LOẠI XE', sortable: true, render: (row) => <span className="font-semibold text-slate-800">{row.vehicleModel}</span> },
    {
      key: 'primaryDriver',
      title: 'TÀI XẾ CHÍNH (CA 1)',
      render: (row) => (
        <div>
          <span className="font-bold text-slate-900 block">{row.primaryDriver}</span>
          <span className="text-[10px] text-slate-500 font-mono">{row.primaryDriverPhone}</span>
        </div>
      ),
    },
    {
      key: 'secondaryDriver',
      title: 'TÀI XẾ PHỤ (CA 2)',
      render: (row) => <span className="font-medium text-slate-700 text-xs">{row.secondaryDriver}</span>,
    },
    {
      key: 'workArea',
      title: 'KHU VỰC CÔNG TÁC',
      render: (row) => (
        <div>
          <span className="font-semibold text-slate-800 block text-xs">{row.workArea}</span>
          <span className="text-[10px] text-slate-500">{row.unitName}</span>
        </div>
      ),
    },
    {
      key: 'taskTitle',
      title: 'NHIỆM VỤ GIAO',
      render: (row) => <span className="text-xs text-slate-700 line-clamp-1">{row.taskTitle}</span>,
    },
    {
      key: 'status',
      title: 'TRẠNG THÁI',
      render: (row) => row.status === 'in_progress' ? <Badge variant="green" dot>Đang thực hiện</Badge> : <Badge variant="blue">Lên lịch ca</Badge>,
    },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 font-heading">
            Phân công lái xe theo Ca làm việc
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Bố trí tài xế chính, tài xế phụ và phân ca làm việc (Ca 1: 06h-14h, Ca 2: 14h-22h) cho từng đầu xe.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="md" icon={<Download className="w-4 h-4" />}>
            Xuất lịch phân công
          </Button>
          <Button variant="primary" size="md" icon={<Plus className="w-4 h-4" />} onClick={() => setShowAddModal(true)}>
            Phân công ca mới
          </Button>
        </div>
      </div>

      {/* Global FilterBar */}
      <FilterBar
        extraFilters={
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Đã chốt danh sách ca</span>
          </div>
        }
      />

      {/* 4 Stats Cards matching Mockup */}
      <KPIGrid cols={4}>
        <StatCard
          label="Tổng phương tiện phân ca"
          value={`${shiftsList.length} xe`}
          subValue="Đã gán tài xế"
          icon={<UserCheck className="w-5 h-5" />}
          iconBgColor="bg-emerald-50"
          iconColor="text-primary"
        />
        <StatCard
          label="Đang hoạt động ca 1"
          value={`${shiftsList.filter((s) => s.status === 'in_progress').length} ca`}
          subValue="Trực tiếp ngoài hiện trường"
          icon={<Clock className="w-5 h-5" />}
          iconBgColor="bg-sky-50"
          iconColor="text-sky-600"
        />
        <StatCard
          label="Có tài xế phụ (2 người/xe)"
          value={`${shiftsList.filter((s) => s.secondaryDriver).length} xe`}
          subValue="Đảm bảo vận hành liên tục"
          icon={<Users className="w-5 h-5" />}
          iconBgColor="bg-amber-50"
          iconColor="text-amber-600"
        />
        <StatCard
          label="Tuân thủ giờ lái quy định"
          value="100%"
          subValue="Không vượt quá 4h liên tục"
          icon={<ShieldCheck className="w-5 h-5" />}
          iconBgColor="bg-emerald-50"
          iconColor="text-emerald-700"
        />
      </KPIGrid>

      {/* DataTable */}
      <DataTable
        title="Bảng Phân Công Tài Xế Theo Từng Phương Tiện"
        subtitle="Hiển thị lịch phân ca trực tiếp nối lái xe với phương tiện và khu vực sản xuất"
        columns={columns}
        data={shiftsList}
        onRowClick={(row) => setSelectedShift(row)}
      />

      {/* Detail Modal */}
      {selectedShift && (
        <Modal
          isOpen={!!selectedShift}
          onClose={() => setSelectedShift(null)}
          title={`Phân Công Ca: ${selectedShift.vehicleCode} (${selectedShift.vehicleModel})`}
          subtitle={`Khu vực: ${selectedShift.workArea} - ${selectedShift.unitName}`}
          size="md"
        >
          <div className="space-y-3.5 text-xs text-slate-700">
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
              <div className="flex justify-between"><span>Tài xế chính (Ca 1):</span> <strong className="text-primary">{selectedShift.primaryDriver} ({selectedShift.primaryDriverPhone})</strong></div>
              <div className="flex justify-between"><span>Tài xế phụ (Ca 2):</span> <b>{selectedShift.secondaryDriver}</b></div>
              <div className="flex justify-between"><span>Nhiệm vụ:</span> <span>{selectedShift.taskTitle}</span></div>
            </div>
            <div className="flex justify-end pt-2">
              <Button variant="primary" size="sm" onClick={() => setSelectedShift(null)}>
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
        title="Phân Công Lái Xe Theo Ca Mới"
        subtitle="Bố trí nhân sự lái xe chính và phụ cho đầu xe"
        size="md"
      >
        <div className="space-y-3 text-xs">
          <div>
            <label className="font-bold text-slate-700 block mb-1">Chọn xe cơ giới:</label>
            <select className="w-full p-2 border border-slate-200 rounded-xl bg-slate-50">
              <option>XC-JD-024 (John Deere 140HP)</option>
              <option>XT-HW-102 (Howo 4 chân 15T)</option>
              <option>XC-KB-053 (Kubota M7040)</option>
              <option>XT-HN-079 (Hino 500 8T)</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Tài xế chính (Ca 1):</label>
              <select className="w-full p-2 border border-slate-200 rounded-xl bg-slate-50">
                <option>Nguyễn Văn Minh (NV-0824)</option>
                <option>Trần Quốc Huy (NV-0831)</option>
                <option>Lê Hoàng Nam (NV-0845)</option>
              </select>
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Tài xế phụ (Ca 2):</label>
              <select className="w-full p-2 border border-slate-200 rounded-xl bg-slate-50">
                <option>Keo Sarath (Phụ lái)</option>
                <option>Võ Văn Thành (Ca chiều)</option>
                <option>Đỗ Thanh Hải (Phụ)</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-3">
            <Button variant="outline" size="sm" onClick={() => setShowAddModal(false)}>Hủy</Button>
            <Button variant="primary" size="sm" onClick={() => setShowAddModal(false)}>Lưu Phân Công</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

