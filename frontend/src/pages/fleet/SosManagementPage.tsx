import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldAlert,
  Truck,
  Tractor,
  User,
  Phone,
  MapPin,
  Clock,
  CheckCircle2,
  XCircle,
  Eye,
  Camera,
  Search,
  Filter,
  RefreshCw,
  Download,
  Wrench,
  AlertTriangle,
  Compass,
  Image as ImageIcon,
} from 'lucide-react';
import { DataTable, Column } from '../../components/data-display/DataTable';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { AuditUserPopover } from '../../components/common/AuditUserPopover';
import { TableRowActions } from '../../components/common/TableRowActions';
import { apiService } from '../../api/client';

export interface SosRecord {
  id: string;
  code: string;
  vehicleCode: string;
  vehiclePlate: string;
  vehicleName: string;
  vehicleType: string;
  complexName: string;
  farmName: string;
  driverId: string;
  driverName: string;
  driverPhone: string;
  lotLocation: string;
  coordinates: string;
  lat: number;
  lng: number;
  createdAt: string;
  timeAgo: string;
  emergencyType: string;
  emergencyTypeName: string;
  urgencyLevel: string;
  description: string;
  photoUrls: string[];
  evidenceNote?: string;
  status: 'PENDING' | 'DISPATCHED' | 'RESOLVED' | 'CANCELLED';
  workshopRequestId?: number;
}

const getEmergencyTypeName = (type?: string): string => {
  switch (type) {
    case 'SA_LAY':
    case 'SA_LAY_RUONG':
      return 'Sa lầy ruộng / Bùn đất sâu';
    case 'HONG_MAY':
      return 'Hỏng máy / Chết máy kéo';
    case 'THUNG_LOP':
      return 'Thủng lốp / Bể bánh xe';
    case 'LAT_XE':
      return 'Lật nghiêng / Sụp mép mương';
    case 'TAI_NAN':
      return 'Tai nạn va chạm giao thông';
    case 'HET_NHIEN_LIEU':
    case 'HET_DAU_DOT_XUAT':
      return 'Hết dầu đột xuất giữa lô';
    default:
      return 'Sự cố cơ giới khẩn cấp';
  }
};

export const SosManagementPage: React.FC = () => {
  const navigate = useNavigate();
  const [sosList, setSosList] = useState<SosRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // State bộ lọc tìm kiếm
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [filterComplex, setFilterComplex] = useState<string>('ALL');

  // State Modal xem chi tiết
  const [selectedRecord, setSelectedRecord] = useState<SosRecord | null>(null);

  // State phóng to ảnh minh chứng
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  // Tải danh sách sự cố SOS từ backend
  const fetchSosAlerts = async () => {
    setIsLoading(true);
    try {
      const data = await apiService.getSosAlerts();
      const items = Array.isArray(data) ? data : [];
      const mapped: SosRecord[] = items.map((item: any) => {
        const createdDate = item.createdAt ? new Date(item.createdAt) : null;
        const timeStr = createdDate && !isNaN(createdDate.getTime())
          ? `${createdDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} ${createdDate.toLocaleDateString('vi-VN')}`
          : 'Mới cập nhật';

        return {
          id: `SOS-${item.id}`,
          code: `SOS-${item.id?.toString().padStart(4, '0') || '0000'}`,
          vehicleCode: item.vehicle?.code || 'Chưa rõ mã',
          vehiclePlate: item.vehicle?.plate || 'Chưa gắn biển',
          vehicleName: item.vehicle?.name || 'Phương tiện cơ giới',
          vehicleType: item.vehicle?.category || 'Cơ giới',
          complexName: item.vehicle?.complexCode === 'KOUN_MOM' ? 'KLH Koun Mom' : (item.vehicle?.complexCode || 'KLH Koun Mom'),
          farmName: item.vehicle?.assignedUnitCode || 'Nông trường',
          driverId: item.driver ? `TX-${item.driver.id}` : '',
          driverName: item.driver?.fullName || 'Tài xế',
          driverPhone: item.driver?.phone || 'Chưa cập nhật SĐT',
          lotLocation: item.lotLocation || 'Đang xác định vị trí',
          coordinates: item.lat && item.lng ? `${item.lat}° N, ${item.lng}° E` : 'Chưa có tọa độ',
          lat: item.lat || 0,
          lng: item.lng || 0,
          createdAt: timeStr,
          timeAgo: 'Ghi nhận từ hệ thống',
          emergencyType: item.emergencyType || 'KHAC',
          emergencyTypeName: getEmergencyTypeName(item.emergencyType),
          urgencyLevel: 'Khẩn cấp',
          description: !item.description || item.description === 'None'
            ? 'Tài xế phát tín hiệu cứu hộ khẩn cấp từ ứng dụng di động.'
            : item.description,
          photoUrls: item.photoUrl ? [item.photoUrl] : [],
          evidenceNote: 'Ảnh chụp từ App Lái xe',
          status: item.status || 'PENDING',
          workshopRequestId: item.workshopRequest?.id,
        };
      });
      setSosList(mapped);
    } catch (err) {
      console.warn('Lỗi khi tải danh sách SOS alerts:', err);
      setSosList([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    localStorage.removeItem('thaco_fleet_sos_records_v2');
    localStorage.removeItem('thaco_fleet_sos_records_v1');
    void fetchSosAlerts();
  }, []);

  // Lọc danh sách theo các tiêu chí tìm kiếm
  const filteredRecords = useMemo(() => {
    return sosList.filter((r) => {
      if (filterStatus !== 'ALL' && r.status !== filterStatus) return false;
      if (filterType !== 'ALL' && r.emergencyType !== filterType) return false;
      if (filterComplex !== 'ALL' && !r.complexName.toLowerCase().includes(filterComplex.toLowerCase())) return false;
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchVehicle =
          r.vehicleCode.toLowerCase().includes(q) ||
          r.vehiclePlate.toLowerCase().includes(q) ||
          r.vehicleName.toLowerCase().includes(q);
        const matchDriver =
          r.driverName.toLowerCase().includes(q) ||
          r.driverPhone.toLowerCase().includes(q);
        const matchLocation =
          r.lotLocation.toLowerCase().includes(q) ||
          r.farmName.toLowerCase().includes(q);
        const matchDesc =
          r.description.toLowerCase().includes(q) ||
          r.emergencyTypeName.toLowerCase().includes(q) ||
          r.code.toLowerCase().includes(q);
        if (!matchVehicle && !matchDriver && !matchLocation && !matchDesc) return false;
      }
      return true;
    });
  }, [sosList, filterStatus, filterType, filterComplex, searchTerm]);

  // Định nghĩa các cột hiển thị trong danh sách
  const columns: Column<SosRecord>[] = [
    {
      key: 'code',
      title: 'MÃ SỰ CỐ SOS',
      width: '130px',
      sortable: true,
      render: (row) => (
        <div>
          <span className="font-mono font-black text-xs text-rose-700 block">{row.code}</span>
          <span className="text-[10px] text-slate-400">{row.timeAgo}</span>
        </div>
      ),
    },
    {
      key: 'vehicleInfo',
      title: 'THÔNG TIN PHƯƠNG TIỆN',
      width: '280px',
      sortable: true,
      render: (row) => (
        <div className="flex items-start gap-2.5">
          <div className="p-2 rounded-xl bg-slate-100 text-slate-700 border border-slate-200 shrink-0 mt-0.5">
            {row.vehicleType.includes('KEO') || row.vehicleType.includes('CAY') ? (
              <Tractor className="h-4 w-4 text-emerald-700" />
            ) : row.vehicleType.includes('XUC') || row.vehicleType.includes('DAO') || row.vehicleType.includes('UI') ? (
              <Wrench className="h-4 w-4 text-amber-600" />
            ) : (
              <Truck className="h-4 w-4 text-blue-600" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <strong className="font-extrabold text-slate-900 text-xs">{row.vehicleCode}</strong>
              <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                {row.vehiclePlate}
              </span>
            </div>
            <p className="text-[11px] text-slate-600 line-clamp-1">{row.vehicleName}</p>
            <p className="text-[10px] text-slate-400 font-medium">{row.complexName} • {row.farmName}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'driverInfo',
      title: 'TÀI XẾ KHAI BÁO',
      width: '180px',
      sortable: true,
      render: (row) => (
        <div>
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
            <User className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <span>{row.driverName}</span>
          </div>
          <a
            href={`tel:${row.driverPhone}`}
            className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-800 mt-0.5 transition-colors"
          >
            <Phone className="h-3 w-3" />
            <span>{row.driverPhone}</span>
          </a>
        </div>
      ),
    },
    {
      key: 'location',
      title: 'ĐỊA ĐIỂM & TỌA ĐỘ',
      width: '240px',
      sortable: true,
      render: (row) => (
        <div>
          <div className="flex items-start gap-1 text-xs font-semibold text-slate-800">
            <MapPin className="h-3.5 w-3.5 text-rose-600 shrink-0 mt-0.5" />
            <span className="line-clamp-2">{row.lotLocation}</span>
          </div>
          <div className="flex items-center gap-1 text-[10px] font-mono text-slate-500 mt-0.5 ml-4">
            <Compass className="h-3 w-3 text-slate-400" />
            <span>{row.coordinates}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'time',
      title: 'THỜI GIAN',
      width: '140px',
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
          <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
          <span>{row.createdAt}</span>
        </div>
      ),
    },
    {
      key: 'incident',
      title: 'NỘI DUNG SỰ CỐ',
      width: '260px',
      render: (row) => (
        <div className="space-y-1">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-extrabold bg-rose-50 text-rose-800 border border-rose-200">
            <AlertTriangle className="h-3 w-3 text-rose-600 shrink-0" />
            {row.emergencyTypeName}
          </span>
          <p className="text-[11px] text-slate-600 line-clamp-2 italic">
            "{row.description}"
          </p>
        </div>
      ),
    },
    {
      key: 'evidence',
      title: 'MINH CHỨNG',
      width: '120px',
      align: 'center',
      render: (row) => (
        <div className="flex flex-col items-center gap-1">
          {row.photoUrls.length > 0 ? (
            <div className="flex items-center gap-1">
              {row.photoUrls.slice(0, 2).map((imgUrl, i) => (
                <div
                  key={i}
                  onClick={(e) => {
                    e.stopPropagation();
                    setPreviewImageUrl(imgUrl);
                  }}
                  className="relative group w-10 h-10 rounded-lg overflow-hidden border border-slate-200 shadow-2xs cursor-pointer hover:ring-2 hover:ring-emerald-500 transition-all"
                  title="Nhấp để phóng to ảnh minh chứng"
                >
                  <img
                    src={imgUrl}
                    alt={`Minh chứng ${i + 1}`}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-200"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <Eye className="w-3.5 h-3.5 text-white" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <span className="text-[11px] text-slate-400 italic">Không có ảnh</span>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      title: 'TRẠNG THÁI',
      width: '140px',
      align: 'center',
      sortable: true,
      render: (row) => {
        if (row.status === 'PENDING') {
          return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">
              <span className="w-2 h-2 rounded-full bg-rose-600 animate-pulse"></span>
              Chờ tiếp nhận
            </span>
          );
        }
        if (row.status === 'DISPATCHED') {
          return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              Đang cứu hộ
            </span>
          );
        }
        if (row.status === 'RESOLVED') {
          return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Đã giải cứu
            </span>
          );
        }
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
            <XCircle className="w-3 h-3 text-slate-400" />
            Đã hủy
          </span>
        );
      },
    },
    {
      key: 'user',
      title: 'User',
      width: '70px',
      align: 'center',
      render: (row) => (
        <AuditUserPopover
          createdDate={row.createdAt || '14-03-2026'}
          createdUser="admin"
          updatedDate={row.createdAt || '01-08-2026'}
          updatedUser="admin"
          title={`Xem thông tin sự cố ${row.code || row.vehiclePlate}`}
        />
      ),
    },
    {
      key: 'actions',
      title: 'Tác vụ',
      width: '90px',
      align: 'center',
      render: (row) => (
        <TableRowActions
          onView={() => setSelectedRecord(row)}
          onEdit={() => setSelectedRecord(row)}
          viewTitle="Xem chi tiết sự cố SOS"
          editTitle="Cập nhật xử lý sự cố"
        />
      ),
    },
  ];

  return (
    <div className="space-y-5 pb-12 max-w-7xl mx-auto">
      {/* 1. HEADER & BREADCRUMB */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-1">
            <span>Quản lý đội xe</span>
            <span>/</span>
            <span className="text-slate-800 font-bold">Danh sách sự cố cứu hộ SOS</span>
          </div>

          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <ShieldAlert className="h-6 w-6 text-rose-600" />
            Danh sách Cứu hộ SOS & Sự cố cơ giới
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Tổng hợp toàn bộ danh sách tín hiệu cứu hộ khẩn cấp được tài xế phát từ ứng dụng di động kèm thông tin vị trí và hiện trường.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const exportData = sosList.map((r) => ({
                Ma_SOS: r.code,
                Ma_Xe: r.vehicleCode,
                Bien_So: r.vehiclePlate,
                Ten_Xe: r.vehicleName,
                Tai_Xe: r.driverName,
                SDT: r.driverPhone,
                Vi_Tri: r.lotLocation,
                Toa_Do: r.coordinates,
                Thoi_Gian: r.createdAt,
                Loai_Su_Co: r.emergencyTypeName,
                Mo_Ta: r.description,
                Trang_Thai: r.status,
              }));
              const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `Danh_sach_cuu_ho_SOS_${new Date().toISOString().slice(0, 10)}.json`;
              a.click();
            }}
            icon={<Download className="w-3.5 h-3.5" />}
          >
            Xuất dữ liệu
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={fetchSosAlerts}
            disabled={isLoading}
            icon={<RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />}
          >
            Làm mới danh sách
          </Button>
        </div>
      </div>

      {/* 2. BỘ LỌC TÌM KIẾM NHANH */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
          <Filter className="w-3.5 h-3.5 text-emerald-600" />
          <span>Tìm kiếm & Bộ lọc</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {/* Tìm kiếm từ khóa */}
          <div>
            <label className="text-[11px] font-bold text-slate-600 block mb-1">Tìm kiếm từ khóa:</label>
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Mã SOS, biển số, tài xế, vị trí..."
                className="w-full h-9 rounded-xl border border-slate-200 pl-8 pr-3 text-xs font-medium text-slate-800 focus:border-emerald-600 focus:outline-none"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            </div>
          </div>

          {/* Lọc theo trạng thái */}
          <div>
            <label className="text-[11px] font-bold text-slate-600 block mb-1">Trạng thái:</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full h-9 rounded-xl border border-slate-200 px-3 text-xs font-semibold text-slate-800 bg-white focus:border-emerald-600 focus:outline-none cursor-pointer"
            >
              <option value="ALL">Tất cả trạng thái ({sosList.length})</option>
              <option value="PENDING">Chờ tiếp nhận ({sosList.filter((x) => x.status === 'PENDING').length})</option>
              <option value="DISPATCHED">Đang cứu hộ ({sosList.filter((x) => x.status === 'DISPATCHED').length})</option>
              <option value="RESOLVED">Đã giải cứu ({sosList.filter((x) => x.status === 'RESOLVED').length})</option>
            </select>
          </div>

          {/* Lọc theo loại sự cố */}
          <div>
            <label className="text-[11px] font-bold text-slate-600 block mb-1">Loại sự cố:</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full h-9 rounded-xl border border-slate-200 px-3 text-xs font-semibold text-slate-800 bg-white focus:border-emerald-600 focus:outline-none cursor-pointer"
            >
              <option value="ALL">Tất cả loại sự cố</option>
              <option value="SA_LAY_RUONG">Sa lầy ruộng</option>
              <option value="HONG_MAY">Hỏng máy / Chết máy</option>
              <option value="THUNG_LOP">Thủng lốp xe</option>
              <option value="LAT_XE">Lật xe</option>
              <option value="TAI_NAN">Tai nạn va chạm</option>
              <option value="HET_DAU_DOT_XUAT">Hết dầu</option>
            </select>
          </div>

          {/* Lọc theo Khu liên hợp */}
          <div>
            <label className="text-[11px] font-bold text-slate-600 block mb-1">Khu liên hợp:</label>
            <select
              value={filterComplex}
              onChange={(e) => setFilterComplex(e.target.value)}
              className="w-full h-9 rounded-xl border border-slate-200 px-3 text-xs font-semibold text-slate-800 bg-white focus:border-emerald-600 focus:outline-none cursor-pointer"
            >
              <option value="ALL">Tất cả Khu liên hợp</option>
              <option value="Koun Mom">KLH Koun Mom (Campuchia)</option>
              <option value="Snoul">KLH Snoul (Campuchia)</option>
              <option value="Paksong">KLH Paksong (Lào)</option>
            </select>
          </div>
        </div>
      </div>

      {/* 3. BẢNG DANH SÁCH SỰ CỐ SOS */}
      <DataTable<SosRecord>
        columns={columns}
        data={filteredRecords}
        title="Danh Sách Tín Hiệu Cứu Hộ SOS"
        subtitle={`Hiển thị ${filteredRecords.length} sự cố cứu hộ được ghi nhận trong hệ thống`}
        isLoading={isLoading}
        pageSize={10}
        onRowClick={(row) => setSelectedRecord(row)}
      />

      {/* 4. MODAL XEM CHI TIẾT SỰ CỐ SOS (READ-ONLY) */}
      {selectedRecord && (
        <Modal
          isOpen={!!selectedRecord}
          onClose={() => setSelectedRecord(null)}
          title={`Chi tiết sự cố: ${selectedRecord.code}`}
          subtitle={`Ghi nhận lúc: ${selectedRecord.createdAt}`}
          size="lg"
          footer={
            <div className="flex items-center justify-between w-full">
              <a
                href={`tel:${selectedRecord.driverPhone}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <Phone className="w-3.5 h-3.5 text-emerald-600" />
                Gọi tài xế ({selectedRecord.driverPhone})
              </a>

              <div className="flex gap-2">
                {selectedRecord.workshopRequestId && <Button variant="outline" size="sm" icon={<Wrench className="h-3.5 w-3.5" />} onClick={() => navigate(`/xuong-btsc/yeu-cau?tab=repair&view=kanban&requestId=${selectedRecord.workshopRequestId}`)}>Mở yêu cầu xưởng</Button>}
                <Button variant="primary" size="sm" onClick={() => setSelectedRecord(null)}>Đóng</Button>
              </div>
            </div>
          }
        >
          <div className="space-y-4 text-xs text-slate-700">
            {/* Thông tin trạng thái */}
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <span className="text-slate-500 font-medium block">Phân loại sự cố:</span>
                <strong className="text-sm font-black text-rose-700 flex items-center gap-1.5 mt-0.5">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  {selectedRecord.emergencyTypeName}
                </strong>
              </div>

              <div>
                <span className="text-slate-500 font-medium block text-right mb-0.5">Trạng thái:</span>
                {selectedRecord.status === 'PENDING' ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">
                    Chờ tiếp nhận
                  </span>
                ) : selectedRecord.status === 'DISPATCHED' ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                    Đang cứu hộ
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                    Đã giải cứu
                  </span>
                )}
              </div>
            </div>

            {/* 2 Cột: Xe & Tài xế */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Cột 1: Phương tiện */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center gap-1.5 font-bold text-slate-900 border-b border-slate-200/80 pb-1">
                  <Truck className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Phương tiện gặp sự cố</span>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Mã xe:</span>
                    <strong>{selectedRecord.vehicleCode}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Biển số:</span>
                    <strong>{selectedRecord.vehiclePlate}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Tên xe:</span>
                    <span className="text-slate-800 font-medium">{selectedRecord.vehicleName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Đơn vị:</span>
                    <span className="text-slate-700">{selectedRecord.farmName}</span>
                  </div>
                </div>
              </div>

              {/* Cột 2: Tài xế & Vị trí */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center gap-1.5 font-bold text-slate-900 border-b border-slate-200/80 pb-1">
                  <User className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Tài xế & Vị trí hiện trường</span>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Họ tên:</span>
                    <strong>{selectedRecord.driverName}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Điện thoại:</span>
                    <strong className="text-emerald-700">{selectedRecord.driverPhone}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Vị trí:</span>
                    <span className="text-slate-800 font-medium text-right ml-2">{selectedRecord.lotLocation}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Tọa độ:</span>
                    <span className="font-mono text-slate-700">{selectedRecord.coordinates}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Mô tả từ tài xế */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
              <span className="font-bold text-slate-900 block">Nội dung khai báo từ hiện trường:</span>
              <p className="text-slate-700 leading-relaxed font-medium bg-white p-2.5 rounded-lg border border-slate-200">
                {selectedRecord.description}
              </p>
            </div>

            {/* Hình ảnh minh chứng hiện trường */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 font-bold text-slate-900">
                <Camera className="w-3.5 h-3.5 text-emerald-700" />
                <span>Ảnh minh chứng hiện trường ({selectedRecord.photoUrls.length} ảnh)</span>
              </div>

              {selectedRecord.photoUrls.length > 0 ? (
                <div className="grid grid-cols-2 gap-2">
                  {selectedRecord.photoUrls.map((url, idx) => (
                    <div
                      key={idx}
                      onClick={() => setPreviewImageUrl(url)}
                      className="group relative rounded-xl overflow-hidden border border-slate-200 shadow-2xs cursor-pointer aspect-video bg-slate-900/5"
                    >
                      <img
                        src={url}
                        alt={`Ảnh minh chứng ${idx + 1}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1">
                        <Eye className="w-3.5 h-3.5" />
                        <span>Xem ảnh lớn</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-400">
                  <ImageIcon className="w-6 h-6 mx-auto mb-1 text-slate-300" />
                  <p className="text-[11px]">Tài xế không đính kèm ảnh chụp</p>
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* 5. MODAL XEM PHÓNG TO ẢNH MINH CHỨNG */}
      {previewImageUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setPreviewImageUrl(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] bg-slate-900 rounded-2xl overflow-hidden shadow-2xl border border-white/20">
            <button
              type="button"
              onClick={() => setPreviewImageUrl(null)}
              className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <XCircle className="w-5 h-5" />
            </button>
            <img
              src={previewImageUrl}
              alt="Phóng to ảnh minh chứng SOS"
              className="max-h-[85vh] w-auto object-contain mx-auto"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default SosManagementPage;
