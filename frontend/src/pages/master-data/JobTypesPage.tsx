import React, { useState } from 'react';
import { FilterBar } from '../../components/filters/FilterBar';
import { DataTable, Column } from '../../components/data-display/DataTable';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { StatCard } from '../../components/data-display/StatCard';
import { KPIGrid } from '../../components/data-display/KPIGrid';
import {
  Briefcase,
  Plus,
  Download,
  FileCheck,
  CheckCircle2,
  Layers,
  Clock,
} from 'lucide-react';

interface JobTypeDefinition {
  id: string;
  code: string;
  name: string;
  subName: string;
  category: string;
  approvalLevel: string;
  machineQuota: string;
  fuelQuota: string;
  status: 'active' | 'inactive';
}

export const JobTypesPage: React.FC = () => {
  const [selectedJob, setSelectedJob] = useState<JobTypeDefinition | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [jobsList, setJobsList] = useState<JobTypeDefinition[]>([]);

  const columns: Column<JobTypeDefinition>[] = [
    {
      key: 'code',
      title: 'MÃ LOẠI LỆNH / CV',
      sortable: true,
      render: (row) => <strong className="text-primary font-mono font-bold text-xs">{row.code}</strong>,
    },
    {
      key: 'name',
      title: 'TÊN QUY TRÌNH / HẠNG MỤC',
      sortable: true,
      render: (row) => (
        <div>
          <strong className="text-slate-900 block text-xs">{row.name}</strong>
          <span className="text-[10px] text-slate-500">{row.subName}</span>
        </div>
      ),
    },
    { key: 'category', title: 'PHÂN LOẠI', render: (row) => <Badge variant="blue">{row.category}</Badge> },
    { key: 'approvalLevel', title: 'CẤP PHÊ DUYỆT BẮT BUỘC', render: (row) => <span className="text-xs text-slate-800 font-semibold">{row.approvalLevel}</span> },
    { key: 'machineQuota', title: 'ĐỊNH MỨC CA MÁY', render: (row) => <span className="text-xs text-slate-700">{row.machineQuota}</span> },
    {
      key: 'fuelQuota',
      title: 'ĐỊNH MỨC DẦU KHOÁN',
      render: (row) => <strong className="text-emerald-700 font-bold text-xs">{row.fuelQuota}</strong>,
    },
    {
      key: 'status',
      title: 'TRẠNG THÁI',
      render: () => <Badge variant="green">Hiệu lực</Badge>,
    },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 font-heading">
            Danh mục Loại công việc & Loại lệnh
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Chuẩn hóa các loại lệnh sản xuất, lệnh vận chuyển, lệnh điều xe công tác và các hạng mục công việc cơ giới.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="md" icon={<Download className="w-4 h-4" />}>
            Xuất danh mục
          </Button>
          <Button variant="primary" size="md" icon={<Plus className="w-4 h-4" />} onClick={() => setShowAddModal(true)}>
            Thêm loại mới
          </Button>
        </div>
      </div>

      {/* Global FilterBar */}
      <FilterBar
        extraFilters={
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Áp dụng: Toàn KLH (Đang hiệu lực)</span>
          </div>
        }
      />

      {/* 4 Stats Cards matching Mockup */}
      <KPIGrid cols={4}>
        <StatCard
          label="Tổng loại công việc / lệnh"
          value={`${jobsList.length} loại`}
          subValue="Đã ban hành quy chuẩn"
          icon={<FileCheck className="w-5 h-5" />}
          iconBgColor="bg-emerald-50"
          iconColor="text-primary"
        />
        <StatCard
          label="Loại lệnh điều động"
          value={`${jobsList.filter((j) => j.category.toLowerCase().includes('lệnh')).length} loại`}
          subValue="Quy trình điều động"
          icon={<Briefcase className="w-5 h-5" />}
          iconBgColor="bg-sky-50"
          iconColor="text-sky-600"
        />
        <StatCard
          label="Hạng mục canh tác cơ giới"
          value={`${jobsList.filter((j) => !j.category.toLowerCase().includes('lệnh')).length} mục`}
          subValue="Làm đất, thu hoạch, vận chuyển"
          icon={<CheckCircle2 className="w-5 h-5" />}
          iconBgColor="bg-amber-50"
          iconColor="text-amber-600"
        />
        <StatCard
          label="Quy chuẩn mã hóa"
          value="Chuẩn ERP THACO"
          subValue="Dễ dàng tra cứu"
          icon={<Layers className="w-5 h-5" />}
          iconBgColor="bg-emerald-50"
          iconColor="text-emerald-700"
        />
      </KPIGrid>

      {/* DataTable */}
      <DataTable
        title="Bảng Danh Mục Loại Lệnh & Hạng Mục Công Việc Cơ Giới"
        subtitle="Chuẩn hóa cấp phê duyệt, quy chuẩn định mức máy và mức dầu khoán cho từng nghiệp vụ"
        columns={columns}
        data={jobsList}
        onRowClick={(row) => setSelectedJob(row)}
      />

      {/* Detail Modal */}
      {selectedJob && (
        <Modal
          isOpen={!!selectedJob}
          onClose={() => setSelectedJob(null)}
          title={`Quy Trình: ${selectedJob.name}`}
          subtitle={`Mã: ${selectedJob.code} | ${selectedJob.category}`}
          size="md"
        >
          <div className="space-y-3.5 text-xs text-slate-700">
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
              <div className="flex justify-between"><span>Cấp duyệt:</span> <b>{selectedJob.approvalLevel}</b></div>
              <div className="flex justify-between"><span>Định mức ca máy:</span> <span>{selectedJob.machineQuota}</span></div>
              <div className="flex justify-between"><span>Định mức dầu khoán:</span> <strong className="text-emerald-700 text-sm">{selectedJob.fuelQuota}</strong></div>
            </div>
            <div className="flex justify-end pt-2">
              <Button variant="primary" size="sm" onClick={() => setSelectedJob(null)}>
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
        title="Thêm Loại Công Việc / Lệnh Mới"
        subtitle="Khai báo quy trình công việc cơ giới vào hệ thống"
        size="md"
      >
        <div className="space-y-3 text-xs">
          <div>
            <label className="font-bold text-slate-700 block mb-1">Tên hạng mục công việc:</label>
            <input type="text" placeholder="Ví dụ: Rải vôi bột khử khuẩn đất trồng chuối" className="w-full p-2 border border-slate-200 rounded-xl bg-slate-50 font-bold" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Phân loại:</label>
              <select className="w-full p-2 border border-slate-200 rounded-xl bg-slate-50">
                <option>Công việc làm đất</option>
                <option>Công việc chăm sóc & BVTV</option>
                <option>Công việc thu hoạch</option>
                <option>Lệnh vận chuyển nội bộ</option>
              </select>
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Định mức dầu khoán:</label>
              <input type="text" placeholder="Ví dụ: 6.5 Lít / ha" className="w-full p-2 border border-slate-200 rounded-xl bg-slate-50 font-bold" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-3">
            <Button variant="outline" size="sm" onClick={() => setShowAddModal(false)}>Hủy</Button>
            <Button variant="primary" size="sm" onClick={() => setShowAddModal(false)}>Lưu Công Việc</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
