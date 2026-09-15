import React, { useState, useEffect } from 'react';
import { FilterBar } from '../../components/filters/FilterBar';
import { DataTable, Column } from '../../components/data-display/DataTable';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { StatCard } from '../../components/data-display/StatCard';
import { KPIGrid } from '../../components/data-display/KPIGrid';
import { TableRowActions } from '../../components/common/TableRowActions';
import { AuditUserPopover } from '../../components/common/AuditUserPopover';
import { catalogsApi } from '../../api/catalogsApi';
import { CatalogItem } from '../../data/catalogData';
import {
  FileSpreadsheet,
  FileText,
  Plus,
  Download,
  Tractor,
  Truck,
  Wrench,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Sliders,
  Award,
} from 'lucide-react';

interface TechQuotaStandard {
  id: string;
  quotaCode: string;
  quotaName: string;
  targetObject: string;
  productivityPerShift: string;
  laborHoursQuota: string;
  tolerance: string;
  effectiveDate: string;
  status: 'active' | 'reviewing';
}

const mapCatalogToTechnicalQuota = (item: CatalogItem): TechQuotaStandard => ({
  id: item.id,
  quotaCode: item.code,
  quotaName: item.name,
  targetObject: item.description?.match(/Đối tượng:\s*([^|]+)/)?.[1]?.trim() || 'Xe máy cơ giới',
  productivityPerShift: item.description?.match(/Năng suất:\s*([^|]+)/)?.[1]?.trim() || 'Theo ca 8h',
  laborHoursQuota: item.description?.match(/Giờ công:\s*([^|]+)/)?.[1]?.trim() || '8 giờ / ca',
  tolerance: item.description?.match(/Dung sai:\s*([^|]+)/)?.[1]?.trim() || '± 5%',
  effectiveDate: item.description?.match(/Ngày ban hành:\s*([^|]+)/)?.[1]?.trim() || '01/01/2026',
  status: item.status === 'HOAT_DONG' ? 'active' : 'reviewing',
});

export const TechnicalQuotasPage: React.FC = () => {
  const [selectedQuota, setSelectedQuota] = useState<TechQuotaStandard | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [quotasList, setQuotasList] = useState<TechQuotaStandard[]>([]);

  useEffect(() => {
    catalogsApi.getCatalogs('TECHNICAL_QUOTA', 'catalogs_technical_quotas').then((items) => {
      if (Array.isArray(items) && items.length > 0) {
        setQuotasList(items.map(mapCatalogToTechnicalQuota));
      }
    });
  }, []);

  const columns: Column<TechQuotaStandard>[] = [
    {
      key: 'quotaCode',
      title: 'MÃ ĐỊNH MỨC',
      sortable: true,
      render: (row) => <strong className="text-primary font-mono font-bold text-xs">{row.quotaCode}</strong>,
    },
    { key: 'quotaName', title: 'TÊN BẢNG ĐỊNH MỨC KỸ THUẬT', sortable: true, render: (row) => <strong className="text-slate-900 text-xs">{row.quotaName}</strong> },
    { key: 'targetObject', title: 'ĐỐI TƯỢNG ÁP DỤNG', render: (row) => <span className="text-xs text-slate-700">{row.targetObject}</span> },
    {
      key: 'productivityPerShift',
      title: 'ĐỊNH MỨC NĂNG SUẤT / CA',
      render: (row) => <strong className="text-emerald-700 font-bold text-xs">{row.productivityPerShift}</strong>,
    },
    { key: 'laborHoursQuota', title: 'ĐỊNH MỨC GIỜ CÔNG', render: (row) => <span className="text-xs text-slate-800">{row.laborHoursQuota}</span> },
    { key: 'tolerance', title: 'DUNG SAI CHO PHÉP', render: (row) => <span className="text-xs text-slate-600 font-semibold">{row.tolerance}</span> },
    { key: 'effectiveDate', title: 'NGÀY BAN HÀNH' },
    {
      key: 'status',
      title: 'Trạng thái',
      align: 'center',
      width: '110px',
      render: () => (
        <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800">
          Hoạt động
        </span>
      ),
    },
    {
      key: 'user',
      title: 'User',
      align: 'center',
      width: '70px',
      render: (row) => (
        <AuditUserPopover
          createdDate="14-03-2026"
          createdUser="admin"
          updatedDate="01-08-2026"
          updatedUser="admin"
          title={`Xem thông tin tạo/sửa của ${row.quotaName}`}
        />
      ),
    },
    {
      key: 'actions',
      title: 'Tác vụ',
      align: 'center',
      width: '110px',
      render: (row) => (
        <TableRowActions
          onView={() => setSelectedQuota(row)}
          onEdit={() => setSelectedQuota(row)}
          onDelete={() => {
            if (window.confirm(`Xóa định mức: "${row.quotaName}"?`)) {
              setQuotasList((prev) => prev.filter((q) => q.id !== row.id));
            }
          }}
          viewTitle="Xem định mức"
          editTitle="Sửa định mức"
          deleteTitle="Xóa định mức"
        />
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 font-heading">
            Danh mục Bảng định mức kỹ thuật
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Bảng định mức năng suất diện tích cày bừa/ca máy, định mức giờ công và tải trọng vận chuyển nội bộ.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="md" icon={<Download className="w-4 h-4" />}>
            Xuất sổ tay định mức
          </Button>
          <Button variant="primary" size="md" icon={<Plus className="w-4 h-4" />} onClick={() => setShowAddModal(true)}>
            Ban hành định mức mới
          </Button>
        </div>
      </div>

      {/* Global FilterBar */}
      <FilterBar
        extraFilters={
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Bảng định mức năm 2026 · Phê duyệt: Ban TGĐ</span>
          </div>
        }
      />

      {/* 4 Stats Cards matching Mockup */}
      <KPIGrid cols={4}>
        <StatCard
          label="Tổng bảng định mức"
          value={`${quotasList.length} quy chuẩn`}
          subValue="Ban TGĐ phê duyệt"
          icon={<FileText className="w-5 h-5" />}
          iconBgColor="bg-emerald-50"
          iconColor="text-primary"
        />
        <StatCard
          label="Định mức làm đất / thu hoạch"
          value={`${quotasList.filter((q) => q.quotaName.toLowerCase().includes('cày') || q.quotaName.toLowerCase().includes('bừa') || q.quotaName.toLowerCase().includes('thu hoạch')).length} quy chuẩn`}
          subValue="Năng suất diện tích / ca"
          icon={<Tractor className="w-5 h-5" />}
          iconBgColor="bg-sky-50"
          iconColor="text-sky-600"
        />
        <StatCard
          label="Định mức vận chuyển & BTSC"
          value={`${quotasList.filter((q) => q.quotaName.toLowerCase().includes('vận chuyển') || q.quotaName.toLowerCase().includes('bảo dưỡng')).length} quy chuẩn`}
          subValue="Tấn/chuyến & giờ công"
          icon={<Truck className="w-5 h-5" />}
          iconBgColor="bg-amber-50"
          iconColor="text-amber-600"
        />
        <StatCard
          label="Chu kỳ rà soát"
          value="Hằng năm"
          subValue="Theo điều kiện thực tế"
          icon={<Calendar className="w-5 h-5" />}
          iconBgColor="bg-emerald-50"
          iconColor="text-emerald-700"
        />
      </KPIGrid>

      {/* DataTable */}
      <DataTable
        title="Danh Mục Bảng Định Mức Kỹ Thuật Năng Suất Ca Máy Toàn Tập Đoàn"
        subtitle="Chuẩn hóa theo Quyết định số 13/2023 của Tổng Giám Đốc THACO AGRI"
        columns={columns}
        data={quotasList}
        onRowClick={(row) => setSelectedQuota(row)}
      />

      {/* Detail Modal */}
      {selectedQuota && (
        <Modal
          isOpen={!!selectedQuota}
          onClose={() => setSelectedQuota(null)}
          title={`Định Mức Kỹ Thuật: ${selectedQuota.quotaCode}`}
          subtitle={selectedQuota.quotaName}
          size="md"
        >
          <div className="space-y-3.5 text-xs text-slate-700">
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
              <div className="flex justify-between"><span>Đối tượng áp dụng:</span> <b>{selectedQuota.targetObject}</b></div>
              <div className="flex justify-between"><span>Năng suất định mức:</span> <strong className="text-emerald-700 text-sm">{selectedQuota.productivityPerShift}</strong></div>
              <div className="flex justify-between"><span>Định mức giờ công:</span> <span>{selectedQuota.laborHoursQuota}</span></div>
              <div className="flex justify-between"><span>Dung sai cho phép:</span> <b>{selectedQuota.tolerance}</b></div>
            </div>
            <div className="flex justify-end pt-2">
              <Button variant="primary" size="sm" onClick={() => setSelectedQuota(null)}>
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
        title="Ban Hành Định Mức Kỹ Thuật Mới"
        subtitle="Thiết lập tiêu chuẩn năng suất cơ giới hóa cho mùa vụ mới"
        size="md"
      >
        <div className="space-y-3 text-xs">
          <div>
            <label className="font-bold text-slate-700 block mb-1">Tên bảng định mức kỹ thuật:</label>
            <input type="text" placeholder="Ví dụ: Định mức xới cỏ gốc sầu riêng" className="w-full p-2 border border-slate-200 rounded-xl bg-slate-50 font-bold" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Thiết bị cơ giới áp dụng:</label>
              <input type="text" placeholder="Ví dụ: Máy kéo Kubota 50HP" className="w-full p-2 border border-slate-200 rounded-xl bg-slate-50" />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Năng suất định mức / ca:</label>
              <input type="text" placeholder="Ví dụ: 2.0 ha / ca 8 giờ" className="w-full p-2 border border-slate-200 rounded-xl bg-slate-50 font-bold" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-3">
            <Button variant="outline" size="sm" onClick={() => setShowAddModal(false)}>Hủy</Button>
            <Button variant="primary" size="sm" onClick={() => setShowAddModal(false)}>Lưu & Ban Hành</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
