import React, { useState } from 'react';
import { FilterBar } from '../../components/filters/FilterBar';
import { DataTable, Column } from '../../components/data-display/DataTable';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { StatCard } from '../../components/data-display/StatCard';
import { KPIGrid } from '../../components/data-display/KPIGrid';
import {
  ShieldCheck,
  Plus,
  Download,
  AlertTriangle,
  Clock,
  ShieldAlert,
  FileCheck,
} from 'lucide-react';

interface LicenseRecord {
  id: string;
  employeeCode: string;
  driverName: string;
  licenseNumber: string;
  licenseClass: string;
  issueAuthority: string;
  issueDate: string;
  expiryDate: string;
  expiryNotice: string;
  isExpiringSoon: boolean;
  allowedVehicles: string;
  status: 'valid' | 'expiring' | 'renewing';
}

export const LicenseExpiryPage: React.FC = () => {
  const [selectedLicense, setSelectedLicense] = useState<LicenseRecord | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [licensesList, setLicensesList] = useState<LicenseRecord[]>([]);

  const columns: Column<LicenseRecord>[] = [
    {
      key: 'employeeCode',
      title: 'MÃ NV / HỌ TÊN',
      sortable: true,
      render: (row) => (
        <div>
          <strong className="text-primary font-mono font-bold block">{row.employeeCode}</strong>
          <span className="font-bold text-slate-900">{row.driverName}</span>
        </div>
      ),
    },
    {
      key: 'licenseNumber',
      title: 'SỐ GPLX / CHỨNG CHỈ',
      render: (row) => <strong className="font-mono text-slate-900">{row.licenseNumber}</strong>,
    },
    { key: 'licenseClass', title: 'HẠNG GPLX', render: (row) => <Badge variant="blue">{row.licenseClass}</Badge> },
    { key: 'issueAuthority', title: 'NƠI CẤP' },
    { key: 'issueDate', title: 'NGÀY CẤP' },
    {
      key: 'expiryDate',
      title: 'NGÀY HẾT HẠN',
      sortable: true,
      render: (row) => (
        <div>
          <b className={`block ${row.isExpiringSoon ? 'text-amber-600 font-bold' : 'text-emerald-700 font-bold'}`}>
            {row.expiryDate}
          </b>
          <span className="text-[10px] text-slate-500">({row.expiryNotice})</span>
        </div>
      ),
    },
    { key: 'allowedVehicles', title: 'LOẠI XE ĐƯỢC PHÉP LÁI', render: (row) => <span className="text-xs text-slate-700 font-medium">{row.allowedVehicles}</span> },
    {
      key: 'status',
      title: 'TÌNH TRẠNG HIỆU LỰC',
      render: (row) => {
        if (row.status === 'valid') return <Badge variant="green">Còn hạn</Badge>;
        if (row.status === 'expiring') return <Badge variant="amber">Sắp hết hạn</Badge>;
        return <Badge variant="blue">Đang đổi bằng</Badge>;
      },
    },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 font-heading">
            Quản lý GPLX & Cảnh báo hết hạn
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Theo dõi thời hạn Giấy phép lái xe (B2, C, FC, Chứng chỉ máy kéo), tự động kiểm tra loại xe được phép điều khiển.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="md" icon={<Download className="w-4 h-4" />}>
            Xuất danh sách quá hạn
          </Button>
          <Button variant="primary" size="md" icon={<Plus className="w-4 h-4" />} onClick={() => setShowAddModal(true)}>
            Thêm chứng chỉ
          </Button>
        </div>
      </div>

      {/* Global FilterBar */}
      <FilterBar
        extraFilters={
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-700 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span>Cảnh báo hạn: Dưới 60 ngày</span>
          </div>
        }
      />

      {/* 4 Stats Cards matching Mockup */}
      <KPIGrid cols={4}>
        <StatCard
          label="Tổng GPLX & Chứng chỉ"
          value={`${licensesList.length} hồ sơ`}
          subValue="Đã được chuẩn hóa"
          icon={<FileCheck className="w-5 h-5" />}
          iconBgColor="bg-emerald-50"
          iconColor="text-primary"
        />
        <StatCard
          label="Sắp hết hạn (<30 ngày)"
          value={`${licensesList.filter((l) => l.isExpiringSoon).length} hồ sơ`}
          subValue="Cần gia hạn gấp"
          icon={<AlertTriangle className="w-5 h-5" />}
          iconBgColor="bg-amber-50"
          iconColor="text-amber-600"
        />
        <StatCard
          label="Đang làm thủ tục đổi"
          value={`${licensesList.filter((l) => l.status === 'renewing').length} hồ sơ`}
          subValue="Sở GTVT / MPWT"
          icon={<Clock className="w-5 h-5" />}
          iconBgColor="bg-sky-50"
          iconColor="text-sky-600"
        />
        <StatCard
          label="Đang còn hạn hợp lệ"
          value={`${licensesList.filter((l) => l.status === 'valid').length} hồ sơ`}
          subValue="Đủ điều kiện vận hành"
          icon={<ShieldCheck className="w-5 h-5" />}
          iconBgColor="bg-emerald-50"
          iconColor="text-emerald-700"
        />
      </KPIGrid>

      {/* DataTable */}
      <DataTable
        title="Danh Sách Quản Lý Bằng Lái & Chứng Chỉ Cơ Giới"
        subtitle="Hệ thống tự động nhắc nhở trước 30-60 ngày và cảnh báo khi tài xế lái xe không đúng hạng bằng"
        columns={columns}
        data={licensesList}
        onRowClick={(row) => setSelectedLicense(row)}
      />

      {/* Detail Modal */}
      {selectedLicense && (
        <Modal
          isOpen={!!selectedLicense}
          onClose={() => setSelectedLicense(null)}
          title={`Chi Tiết GPLX: ${selectedLicense.driverName} (${selectedLicense.employeeCode})`}
          subtitle={`Số bằng: ${selectedLicense.licenseNumber} | Hạng: ${selectedLicense.licenseClass}`}
          size="md"
        >
          <div className="space-y-3.5 text-xs text-slate-700">
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
              <div className="flex justify-between"><span>Cơ quan cấp:</span> <b>{selectedLicense.issueAuthority}</b></div>
              <div className="flex justify-between"><span>Ngày cấp:</span> <span>{selectedLicense.issueDate}</span></div>
              <div className="flex justify-between"><span>Ngày hết hạn:</span> <b className={selectedLicense.isExpiringSoon ? 'text-amber-600' : 'text-emerald-700'}>{selectedLicense.expiryDate}</b></div>
              <div className="flex justify-between"><span>Phạm vi điều khiển:</span> <b className="text-primary">{selectedLicense.allowedVehicles}</b></div>
            </div>
            <div className="flex justify-end pt-2">
              <Button variant="primary" size="sm" onClick={() => setSelectedLicense(null)}>
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
        title="Thêm Bằng Lái / Chứng Chỉ Lái Xe Mới"
        subtitle="Cập nhật thông tin giấy phép lái xe và chứng chỉ vận hành máy"
        size="md"
      >
        <div className="space-y-3 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Lái xe tiếp nhận:</label>
              <select className="w-full p-2 border border-slate-200 rounded-xl bg-slate-50">
                <option>Nguyễn Văn Minh (NV-0824)</option>
                <option>Trần Quốc Huy (NV-0831)</option>
                <option>Sok Phearith (NV-KH-012)</option>
              </select>
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Số giấy phép / Chứng chỉ:</label>
              <input type="text" placeholder="Ví dụ: 790124892104" className="w-full p-2 border border-slate-200 rounded-xl bg-slate-50 font-mono font-bold" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Hạng GPLX:</label>
              <select className="w-full p-2 border border-slate-200 rounded-xl bg-slate-50">
                <option>Hạng FC (Xe đầu kéo container)</option>
                <option>Hạng C (Xe tải nặng)</option>
                <option>Chứng chỉ Máy kéo nông nghiệp</option>
                <option>GPLX Hạng C Campuchia</option>
              </select>
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Ngày hết hạn:</label>
              <input type="date" defaultValue="2028-12-10" className="w-full p-2 border border-slate-200 rounded-xl bg-slate-50 font-bold" />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3">
            <Button variant="outline" size="sm" onClick={() => setShowAddModal(false)}>Hủy</Button>
            <Button variant="primary" size="sm" onClick={() => setShowAddModal(false)}>Lưu Chứng Chỉ</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

