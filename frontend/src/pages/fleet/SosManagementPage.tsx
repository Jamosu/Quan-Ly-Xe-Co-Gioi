import React, { useState, useMemo, useEffect } from 'react';
import {
  AlertTriangle,
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
  ExternalLink,
  Search,
  Filter,
  RefreshCw,
  Download,
  Flame,
  ArrowRight,
  Send,
  Wrench,
  Navigation,
  Layers,
  PhoneCall,
  Calendar,
  Compass,
  AlertOctagon,
  Image as ImageIcon,
} from 'lucide-react';
import { DataTable, Column } from '../../components/data-display/DataTable';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { StatCard } from '../../components/data-display/StatCard';
import { KPIGrid } from '../../components/data-display/KPIGrid';
import { apiClient } from '../../api/client';

// Kiểu dữ liệu sự cố cứu hộ SOS từ App lái xe
export interface SosRecord {
  id: string;
  code: string;
  // Thông tin xe
  vehicleCode: string;
  vehiclePlate: string;
  vehicleName: string;
  vehicleType: string;
  complexName: string;
  farmName: string;
  // Thông tin tài xế
  driverId: string;
  driverName: string;
  driverPhone: string;
  driverAvatar?: string;
  // Địa điểm
  lotLocation: string;
  coordinates: string;
  lat: number;
  lng: number;
  // Thời gian
  createdAt: string;
  timeAgo: string;
  // Nội dung
  emergencyType: 'SA_LAY' | 'HONG_MAY' | 'LAT_XE' | 'TAI_NAN' | 'HET_NHIEN_LIEU' | 'KHAC';
  emergencyTypeName: string;
  urgencyLevel: 'KHAN_CAP_TOI_CAO' | 'KHAN_CAP' | 'CAN_HO_TRO';
  description: string;
  // Minh chứng
  photoUrls: string[];
  evidenceNote?: string;
  // Xử lý
  status: 'PENDING' | 'DISPATCHED' | 'RESOLVED' | 'CANCELLED';
  rescueVehicle?: string;
  rescueLeader?: string;
  rescueDispatchedAt?: string;
  resolvedAt?: string;
  rescueNotes?: string;
}

const getEmergencyTypeName = (type?: string): string => {
  switch (type) {
    case 'SA_LAY':
      return 'Sa lầy bùn đất sâu';
    case 'HONG_MAY':
      return 'Hỏng máy / Chết máy kéo';
    case 'LAT_XE':
      return 'Lật nghiêng / Sụp mép mương';
    case 'TAI_NAN':
      return 'Tai nạn va chạm';
    case 'HET_NHIEN_LIEU':
      return 'Hết nhiên liệu giữa lô';
    default:
      return 'Sự cố cơ giới khẩn cấp';
  }
};

export const SosManagementPage: React.FC = () => {
  // Dữ liệu thực tế từ Database (mặc định rỗng khi chưa có dữ liệu)
  const [sosList, setSosList] = useState<SosRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Tải dữ liệu thực tế từ backend API
  const fetchSosAlerts = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get<any[]>('/vehicles/sos-alerts');
      const data = Array.isArray(res.data) ? res.data : [];
      const mapped: SosRecord[] = data.map((item) => ({
        id: `SOS-${item.id}`,
        code: `SOS-${item.id.toString().padStart(4, '0')}`,
        vehicleCode: item.vehicle?.code || 'Chưa rõ',
        vehiclePlate: item.vehicle?.plate || 'Chưa ĐK',
        vehicleName: item.vehicle?.name || 'Phương tiện',
        vehicleType: item.vehicle?.category || 'Cơ giới',
        complexName: item.vehicle?.complexCode || 'Khu liên hợp',
        farmName: item.vehicle?.assignedUnitCode || 'Nông trường',
        driverId: item.driver ? `TX-${item.driver.id}` : '',
        driverName: item.driver?.fullName || 'Tài xế',
        driverPhone: item.driver?.phone || 'Chưa cập nhật',
        lotLocation: item.lotLocation || 'Đang cập nhật vị trí',
        coordinates: `${item.lat}° N, ${item.lng}° E`,
        lat: item.lat || 0,
        lng: item.lng || 0,
        createdAt: item.createdAt
          ? new Date(item.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) +
            ' ' +
            new Date(item.createdAt).toLocaleDateString('vi-VN')
          : '',
        timeAgo: 'Mới cập nhật',
        emergencyType: item.emergencyType || 'KHAC',
        emergencyTypeName: getEmergencyTypeName(item.emergencyType),
        urgencyLevel: 'KHAN_CAP',
        description: item.description || '',
        photoUrls: item.photoUrl ? [item.photoUrl] : [],
        evidenceNote: 'Ảnh chụp từ App Lái xe',
        status: item.status || 'PENDING',
      }));
      setSosList(mapped);
    } catch (err) {
      console.warn('Lấy dữ liệu cứu hộ SOS từ backend:', err);
      setSosList([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Xóa cache mock cũ trên browser
    localStorage.removeItem('thaco_fleet_sos_records_v2');
    localStorage.removeItem('thaco_fleet_sos_records_v1');
    fetchSosAlerts();
  }, []);

  // State bộ lọc
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [filterComplex, setFilterComplex] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // State Modal xem chi tiết sự cố
  const [selectedRecord, setSelectedRecord] = useState<SosRecord | null>(null);

  // State Modal xem ảnh minh chứng phóng to
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  // State Modal Điều động cứu hộ
  const [dispatchingRecord, setDispatchingRecord] = useState<SosRecord | null>(null);
  const [rescueVehicleInput, setRescueVehicleInput] = useState('MK-110-01 (Máy kéo New Holland 110HP - Tời cáp 30T)');
  const [rescueLeaderInput, setRescueLeaderInput] = useState('Trần Văn Cường (Tổ trưởng cơ động)');
  const [rescueNotesInput, setRescueNotesInput] = useState('');

  // Cập nhật state
  const updateRecords = (newRecords: SosRecord[]) => {
    setSosList(newRecords);
  };

  // Tính toán số liệu thống kê
  const stats = useMemo(() => {
    const total = sosList.length;
    const pending = sosList.filter((r) => r.status === 'PENDING').length;
    const dispatched = sosList.filter((r) => r.status === 'DISPATCHED').length;
    const resolved = sosList.filter((r) => r.status === 'RESOLVED').length;
    return { total, pending, dispatched, resolved };
  }, [sosList]);

  // Lọc danh sách
  const filteredRecords = useMemo(() => {
    return sosList.filter((r) => {
      if (filterStatus !== 'ALL' && r.status !== filterStatus) return false;
      if (filterType !== 'ALL' && r.emergencyType !== filterType) return false;
      if (filterComplex !== 'ALL' && !r.complexName.includes(filterComplex)) return false;
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchVehicle = r.vehicleCode.toLowerCase().includes(q) || r.vehiclePlate.toLowerCase().includes(q) || r.vehicleName.toLowerCase().includes(q);
        const matchDriver = r.driverName.toLowerCase().includes(q) || r.driverPhone.toLowerCase().includes(q);
        const matchLocation = r.lotLocation.toLowerCase().includes(q) || r.farmName.toLowerCase().includes(q);
        const matchDesc = r.description.toLowerCase().includes(q) || r.emergencyTypeName.toLowerCase().includes(q);
        if (!matchVehicle && !matchDriver && !matchLocation && !matchDesc) return false;
      }
      return true;
    });
  }, [sosList, filterStatus, filterType, filterComplex, searchTerm]);

  // Xử lý Tiếp nhận & Điều xe cứu hộ
  const handleConfirmDispatch = () => {
    if (!dispatchingRecord) return;
    const updated = sosList.map((r) => {
      if (r.id === dispatchingRecord.id) {
        return {
          ...r,
          status: 'DISPATCHED' as const,
          rescueVehicle: rescueVehicleInput,
          rescueLeader: rescueLeaderInput,
          rescueDispatchedAt: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' ' + new Date().toLocaleDateString('vi-VN'),
          rescueNotes: rescueNotesInput.trim() || 'Đang di chuyển tiếp cận hiện trường.',
        };
      }
      return r;
    });
    updateRecords(updated);
    if (selectedRecord && selectedRecord.id === dispatchingRecord.id) {
      setSelectedRecord(updated.find((x) => x.id === dispatchingRecord.id) || null);
    }
    setDispatchingRecord(null);
  };

  // Xử lý Hoàn tất giải cứu
  const handleResolveRecord = (record: SosRecord) => {
    const updated = sosList.map((r) => {
      if (r.id === record.id) {
        return {
          ...r,
          status: 'RESOLVED' as const,
          resolvedAt: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' ' + new Date().toLocaleDateString('vi-VN'),
        };
      }
      return r;
    });
    updateRecords(updated);
    if (selectedRecord && selectedRecord.id === record.id) {
      setSelectedRecord(updated.find((x) => x.id === record.id) || null);
    }
  };

  // Định nghĩa các cột hiển thị trên bảng DataTable
  const columns: Column<SosRecord>[] = [
    {
      key: 'code',
      title: '# MÃ SOS',
      width: '120px',
      render: (row) => (
        <div>
          <span className="font-mono font-black text-xs text-rose-700 block">{row.code}</span>
          <span className="text-[10px] text-slate-400">{row.timeAgo}</span>
        </div>
      ),
    },
    {
      key: 'vehicleInfo',
      title: 'THÔNG TIN XE CƠ GIỚI',
      width: '260px',
      render: (row) => (
        <div className="flex items-start gap-2.5">
          <div className="p-2 rounded-xl bg-slate-100 text-slate-700 border border-slate-200 shrink-0 mt-0.5">
            {row.vehicleType.includes('kéo') ? (
              <Tractor className="h-4 w-4 text-emerald-700" />
            ) : row.vehicleType.includes('xúc') ? (
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
      title: 'TÀI XẾ BÁO CỨU HỘ',
      width: '180px',
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
      render: (row) => (
        <div>
          <div className="flex items-start gap-1 text-xs font-semibold text-slate-800">
            <MapPin className="h-3.5 w-3.5 text-rose-600 shrink-0 mt-0.5" />
            <span className="line-clamp-2">{row.lotLocation}</span>
          </div>
          <div className="flex items-center gap-1 text-[10px] font-mono text-slate-500 mt-0.5 ml-4.5">
            <Compass className="h-3 w-3 text-slate-400" />
            <span>{row.coordinates}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'time',
      title: 'THỜI GIAN',
      width: '130px',
      render: (row) => (
        <div>
          <div className="flex items-center gap-1 text-xs font-bold text-slate-800">
            <Clock className="h-3.5 w-3.5 text-slate-400" />
            <span>{row.createdAt.split(' ')[0]}</span>
          </div>
          <span className="text-[10px] text-slate-500 ml-4.5">{row.createdAt.split(' ')[1]}</span>
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
      title: 'MINH CHỨNG HIỆN TRƯỜNG',
      width: '150px',
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
                  className="relative group w-12 h-12 rounded-lg overflow-hidden border border-slate-200 shadow-2xs cursor-pointer hover:ring-2 hover:ring-emerald-500 transition-all"
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
            <span className="text-[11px] text-slate-400 italic">Chưa có ảnh</span>
          )}
          <span className="text-[10px] font-bold text-slate-500">
            {row.photoUrls.length} ảnh chụp
          </span>
        </div>
      ),
    },
    {
      key: 'status',
      title: 'TRẠNG THÁI',
      width: '140px',
      align: 'center',
      render: (row) => {
        if (row.status === 'PENDING') {
          return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black bg-rose-100 text-rose-800 border border-rose-300 animate-pulse shadow-xs">
              <span className="w-2 h-2 rounded-full bg-rose-600"></span>
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
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
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
      key: 'actions',
      title: 'THAO TÁC',
      width: '140px',
      align: 'center',
      render: (row) => (
        <div className="flex items-center justify-center gap-1.5">
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedRecord(row);
            }}
            className="text-xs font-bold border-slate-200 hover:border-slate-300 h-7 px-2.5"
            icon={<Eye className="w-3 h-3" />}
          >
            Chi tiết
          </Button>

          {row.status === 'PENDING' && (
            <Button
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setDispatchingRecord(row);
              }}
              className="text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-2xs h-7 px-2.5"
            >
              Cứu hộ
            </Button>
          )}

          {row.status === 'DISPATCHED' && (
            <Button
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleResolveRecord(row);
              }}
              className="text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs h-7 px-2.5"
            >
              Xong
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto">
      {/* 1. HEADER & BREADCRUMBS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-1">
            <span>Quản lý đội xe</span>
            <span>/</span>
            <span className="text-slate-800 font-bold">Nhật ký sự cố cứu hộ SOS</span>
          </div>

          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
              <ShieldAlert className="h-6 w-6 text-rose-600" />
              Quản lý Cứu hộ SOS & Sự cố cơ giới
            </h1>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-100 text-rose-800 text-xs font-extrabold px-3 py-0.5 border border-rose-200">
              <Flame className="h-3.5 w-3.5 text-rose-600" />
              {stats.pending} ca khẩn cấp
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Theo dõi tín hiệu báo động khẩn cấp được tài xế phát từ ứng dụng di động (bao gồm tọa độ GPS, thông tin xe, mô tả và hình ảnh minh chứng hiện trường).
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const csvData = sosList.map((r) => ({
                Ma_SOS: r.code,
                Bien_So: r.vehiclePlate,
                Ten_Xe: r.vehicleName,
                Tai_Xe: r.driverName,
                SDT: r.driverPhone,
                Vi_Tri: r.lotLocation,
                Thoi_Gian: r.createdAt,
                Loai_Su_Co: r.emergencyTypeName,
                Mo_Ta: r.description,
                Trang_Thai: r.status,
              }));
              const blob = new Blob([JSON.stringify(csvData, null, 2)], { type: 'application/json' });
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

      {/* 2. STATS KPI CARDS */}
      <KPIGrid cols={4}>
        <StatCard
          label="Tổng sự cố SOS ghi nhận"
          value={stats.total}
          subValue="Toàn bộ lịch sử ca cứu hộ"
          icon={<ShieldAlert className="h-5 w-5 text-slate-600" />}
        />
        <StatCard
          label="Chờ xử lý / Cần cứu hộ gấp"
          value={stats.pending}
          subValue={stats.pending > 0 ? 'Cần điều phương tiện ứng cứu ngay' : 'Hiện tại không có ca tồn đọng'}
          icon={<AlertTriangle className="h-5 w-5 text-rose-600" />}
        />
        <StatCard
          label="Đang điều động cứu hộ"
          value={stats.dispatched}
          subValue="Xe cứu hộ đang tiếp cận vị trí"
          icon={<Truck className="h-5 w-5 text-amber-600" />}
        />
        <StatCard
          label="Đã giải cứu an toàn"
          value={stats.resolved}
          subValue="Phương tiện đã được hỗ trợ xong"
          icon={<CheckCircle2 className="h-5 w-5 text-emerald-600" />}
        />
      </KPIGrid>

      {/* 3. BỘ LỌC TÌM KIẾM NHANH */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
          <Filter className="w-3.5 h-3.5 text-emerald-600" />
          <span>Bộ lọc sự cố & điều kiện tìm kiếm</span>
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
                placeholder="Biển số, tài xế, lô thửa, mô tả..."
                className="w-full h-9 rounded-xl border border-slate-200 pl-8 pr-3 text-xs font-medium text-slate-800 focus:border-emerald-600 focus:outline-none"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            </div>
          </div>

          {/* Lọc theo trạng thái */}
          <div>
            <label className="text-[11px] font-bold text-slate-600 block mb-1">Trạng thái xử lý:</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full h-9 rounded-xl border border-slate-200 px-3 text-xs font-semibold text-slate-800 bg-white focus:border-emerald-600 focus:outline-none cursor-pointer"
            >
              <option value="ALL">Tất cả trạng thái ({stats.total})</option>
              <option value="PENDING">Chờ tiếp nhận ({stats.pending})</option>
              <option value="DISPATCHED">Đang cứu hộ ({stats.dispatched})</option>
              <option value="RESOLVED">Đã giải cứu ({stats.resolved})</option>
              <option value="CANCELLED">Đã hủy</option>
            </select>
          </div>

          {/* Lọc theo loại sự cố */}
          <div>
            <label className="text-[11px] font-bold text-slate-600 block mb-1">Loại sự cố cơ giới:</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full h-9 rounded-xl border border-slate-200 px-3 text-xs font-semibold text-slate-800 bg-white focus:border-emerald-600 focus:outline-none cursor-pointer"
            >
              <option value="ALL">Tất cả loại sự cố</option>
              <option value="SA_LAY">Sa lầy bùn đất sâu</option>
              <option value="HONG_MAY">Hỏng máy / Chết máy kéo</option>
              <option value="LAT_XE">Lật nghiêng / Sụp mép mương</option>
              <option value="TAI_NAN">Va chạm giao thông</option>
              <option value="HET_NHIEN_LIEU">Hết nhiên liệu giữa lô</option>
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

      {/* 4. BẢNG DỮ LIỆU SỰ CỐ SOS */}
      <DataTable<SosRecord>
        columns={columns}
        data={filteredRecords}
        title="Danh sách tín hiệu cứu hộ khẩn cấp từ tài xế"
        subtitle={`Hiển thị ${filteredRecords.length} / ${sosList.length} ca sự cố`}
        pageSize={10}
        onRowClick={(row) => setSelectedRecord(row)}
      />

      {/* 5. MODAL XEM CHI TIẾT HỒ SƠ SỰ CỐ SOS & MINH CHỨNG */}
      {selectedRecord && (
        <Modal
          isOpen={!!selectedRecord}
          onClose={() => setSelectedRecord(null)}
          title={`Chi tiết sự cố SOS: ${selectedRecord.code}`}
          subtitle={`Phát lúc ${selectedRecord.createdAt} • ${selectedRecord.timeAgo}`}
          size="2xl"
          footer={
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <a
                  href={`tel:${selectedRecord.driverPhone}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  <PhoneCall className="w-3.5 h-3.5 text-emerald-600" />
                  Gọi tài xế ({selectedRecord.driverPhone})
                </a>
              </div>

              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setSelectedRecord(null)}>
                  Đóng
                </Button>

                {selectedRecord.status === 'PENDING' && (
                  <Button
                    size="sm"
                    onClick={() => {
                      setDispatchingRecord(selectedRecord);
                    }}
                    className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
                    icon={<Truck className="w-3.5 h-3.5" />}
                  >
                    Điều xe ứng cứu
                  </Button>
                )}

                {selectedRecord.status === 'DISPATCHED' && (
                  <Button
                    size="sm"
                    onClick={() => handleResolveRecord(selectedRecord)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                    icon={<CheckCircle2 className="w-3.5 h-3.5" />}
                  >
                    Xác nhận hoàn thành giải cứu
                  </Button>
                )}
              </div>
            </div>
          }
        >
          <div className="space-y-5 text-xs text-slate-700">
            {/* Banner trạng thái */}
            <div
              className={`p-3.5 rounded-xl border flex items-center justify-between ${
                selectedRecord.status === 'PENDING'
                  ? 'bg-rose-50 border-rose-200 text-rose-900'
                  : selectedRecord.status === 'DISPATCHED'
                  ? 'bg-amber-50 border-amber-200 text-amber-900'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-900'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <AlertOctagon className="w-5 h-5 shrink-0" />
                <div>
                  <h4 className="font-black text-sm">
                    {selectedRecord.status === 'PENDING'
                      ? 'SỰ CỐ ĐANG CHỜ TIẾP NHẬN ỨNG CỨU'
                      : selectedRecord.status === 'DISPATCHED'
                      ? 'ĐANG TRIỂN KHAI PHƯƠNG TIỆN CỨU HỘ'
                      : 'ĐÃ GIẢI CỨU THÀNH CÔNG VÀ AN TOÀN'}
                  </h4>
                  <p className="text-[11px] opacity-90">
                    Phân loại: <strong>{selectedRecord.emergencyTypeName}</strong> • Mức độ:{' '}
                    <strong>
                      {selectedRecord.urgencyLevel === 'KHAN_CAP_TOI_CAO'
                        ? 'Khẩn cấp tối cao'
                        : selectedRecord.urgencyLevel === 'KHAN_CAP'
                        ? 'Khẩn cấp'
                        : 'Cần hỗ trợ'}
                    </strong>
                  </p>
                </div>
              </div>

              <span className="text-[11px] font-bold px-3 py-1 rounded-lg bg-white/80 border shadow-2xs">
                {selectedRecord.timeAgo}
              </span>
            </div>

            {/* Khối thông tin 2 cột: Xe & Tài xế */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Thông tin Xe */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
                <div className="flex items-center gap-2 font-black text-slate-900 border-b border-slate-200 pb-1.5">
                  <Truck className="w-4 h-4 text-emerald-700" />
                  <span>THÔNG TIN PHƯƠNG TIỆN</span>
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">Mã phương tiện:</span>
                    <strong className="text-slate-900 font-bold">{selectedRecord.vehicleCode}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">Biển kiểm soát:</span>
                    <strong className="text-slate-900 font-bold">{selectedRecord.vehiclePlate}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">Model xe:</span>
                    <span className="text-slate-800 font-semibold">{selectedRecord.vehicleName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">Chủng loại:</span>
                    <span className="text-slate-700">{selectedRecord.vehicleType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">Đơn vị quản lý:</span>
                    <span className="text-slate-700 font-semibold">
                      {selectedRecord.complexName} ({selectedRecord.farmName})
                    </span>
                  </div>
                </div>
              </div>

              {/* Thông tin Tài xế & Vị trí */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
                <div className="flex items-center gap-2 font-black text-slate-900 border-b border-slate-200 pb-1.5">
                  <User className="w-4 h-4 text-emerald-700" />
                  <span>TÀI XẾ & ĐỊA ĐIỂM SỰ CỐ</span>
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">Họ tên tài xế:</span>
                    <strong className="text-slate-900 font-bold">{selectedRecord.driverName}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">Số điện thoại:</span>
                    <a
                      href={`tel:${selectedRecord.driverPhone}`}
                      className="text-emerald-700 font-bold hover:underline flex items-center gap-1"
                    >
                      <Phone className="w-3 h-3" />
                      {selectedRecord.driverPhone}
                    </a>
                  </div>
                  <div className="flex justify-between items-start">
                    <span className="text-slate-500 font-medium">Vị trí lô/thửa:</span>
                    <span className="text-slate-900 font-bold text-right ml-4">
                      {selectedRecord.lotLocation}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-medium">Tọa độ GPS:</span>
                    <span className="font-mono text-emerald-800 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      {selectedRecord.coordinates}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Mô tả chi tiết nội dung sự cố */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5">
              <div className="flex items-center gap-2 font-black text-slate-900">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <span>NỘI DUNG KHAI BÁO TỪ TÀI XẾ HIỆN TRƯỜNG:</span>
              </div>
              <p className="text-slate-800 leading-relaxed font-medium bg-white p-3 rounded-lg border border-slate-200">
                {selectedRecord.description}
              </p>
            </div>

            {/* MINH CHỨNG HÌNH ẢNH HIỆN TRƯỜNG */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-black text-slate-900">
                  <Camera className="w-4 h-4 text-emerald-700" />
                  <span>HÌNH ẢNH MINH CHỨNG HIỆN TRƯỜNG ({selectedRecord.photoUrls.length} ẢNH)</span>
                </div>
                <span className="text-[11px] text-slate-500 italic">{selectedRecord.evidenceNote}</span>
              </div>

              {selectedRecord.photoUrls.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {selectedRecord.photoUrls.map((url, idx) => (
                    <div
                      key={idx}
                      onClick={() => setPreviewImageUrl(url)}
                      className="group relative rounded-xl overflow-hidden border border-slate-200 shadow-xs cursor-pointer hover:ring-2 hover:ring-emerald-500 transition-all bg-slate-900/5 aspect-video"
                    >
                      <img
                        src={url}
                        alt={`Ảnh minh chứng ${idx + 1}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3 text-white">
                        <div className="flex items-center justify-between w-full text-[11px] font-bold">
                          <span>Phóng to ảnh {idx + 1}</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-400">
                  <ImageIcon className="w-8 h-8 mx-auto mb-1 text-slate-300" />
                  <p>Tài xế chưa gửi hình ảnh minh chứng</p>
                </div>
              )}
            </div>

            {/* Thông tin điều xe cứu hộ (Nếu đã điều hoặc hoàn thành) */}
            {selectedRecord.rescueVehicle && (
              <div className="p-3.5 rounded-xl bg-teal-50 border border-teal-200 text-teal-950 space-y-2">
                <div className="flex items-center gap-2 font-black border-b border-teal-200/80 pb-1.5">
                  <Wrench className="w-4 h-4 text-teal-700" />
                  <span>TIẾN ĐỘ & PHƯƠNG ÁN CỨU HỘ ĐÃ PHÂN CÔNG:</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-teal-700 font-medium">Xe cứu hộ: </span>
                    <strong>{selectedRecord.rescueVehicle}</strong>
                  </div>
                  <div>
                    <span className="text-teal-700 font-medium">Chỉ huy cứu hộ: </span>
                    <strong>{selectedRecord.rescueLeader}</strong>
                  </div>
                  {selectedRecord.rescueDispatchedAt && (
                    <div>
                      <span className="text-teal-700 font-medium">Thời gian xuất phát: </span>
                      <strong>{selectedRecord.rescueDispatchedAt}</strong>
                    </div>
                  )}
                  {selectedRecord.resolvedAt && (
                    <div>
                      <span className="text-teal-700 font-medium">Hoàn tất lúc: </span>
                      <strong>{selectedRecord.resolvedAt}</strong>
                    </div>
                  )}
                </div>
                {selectedRecord.rescueNotes && (
                  <p className="text-[11px] text-teal-900 bg-white/70 p-2 rounded-lg border border-teal-200/60">
                    Ghi chú kỹ thuật: {selectedRecord.rescueNotes}
                  </p>
                )}
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* 6. MODAL ĐIỀU PHƯƠNG TIỆN CỨU HỘ */}
      {dispatchingRecord && (
        <Modal
          isOpen={!!dispatchingRecord}
          onClose={() => setDispatchingRecord(null)}
          title={`Điều động xe cứu hộ: ${dispatchingRecord.code}`}
          subtitle={`Ứng cứu cho ${dispatchingRecord.vehicleCode} (${dispatchingRecord.vehiclePlate}) tại ${dispatchingRecord.lotLocation}`}
          size="lg"
          footer={
            <div className="flex items-center justify-end gap-2 w-full">
              <Button variant="outline" size="sm" onClick={() => setDispatchingRecord(null)}>
                Hủy
              </Button>
              <Button
                size="sm"
                onClick={handleConfirmDispatch}
                className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold"
                icon={<Send className="w-3.5 h-3.5" />}
              >
                Xác nhận điều xe ngay
              </Button>
            </div>
          }
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900">
              <p className="font-bold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                Lệnh cứu hộ SOS là lệnh điều xe khẩn cấp, được phép xuất phát ngay không qua xét duyệt.
              </p>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Chọn phương tiện cứu hộ chuyên dụng: <span className="text-rose-500">*</span>
              </label>
              <select
                value={rescueVehicleInput}
                onChange={(e) => setRescueVehicleInput(e.target.value)}
                className="w-full h-9 rounded-xl border border-slate-200 px-3 text-xs font-bold text-slate-800 bg-white focus:border-emerald-600 focus:outline-none"
              >
                <option value="MK-110-01 (Máy kéo New Holland 110HP - Tời cáp 30T)">
                  MK-110-01 (Máy kéo New Holland 110HP - Tời cáp 30T) - Sẵn sàng
                </option>
                <option value="MK-110-02 (Máy kéo John Deere 6110M - Hai cầu)">
                  MK-110-02 (Máy kéo John Deere 6110M - Hai cầu) - Sẵn sàng
                </option>
                <option value="MX-08 (Máy xúc Komatsu PC200 - Cần với 9.8m)">
                  MX-08 (Máy xúc Komatsu PC200 - Cần với 9.8m) - Sẵn sàng
                </option>
                <option value="MUI-04 (Máy ủi Caterpillar D6 bánh xích đầm lầy)">
                  MUI-04 (Máy ủi Caterpillar D6 bánh xích đầm lầy) - Trực chiến
                </option>
                <option value="KT-02 (Xe sửa chữa kỹ thuật lưu động)">
                  KT-02 (Xe sửa chữa kỹ thuật lưu động) - Đầy đủ đồ nghề
                </option>
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Người chỉ huy / Trưởng ca cứu hộ: <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={rescueLeaderInput}
                onChange={(e) => setRescueLeaderInput(e.target.value)}
                className="w-full h-9 rounded-xl border border-slate-200 px-3 text-xs font-semibold text-slate-800 focus:border-emerald-600 focus:outline-none"
                placeholder="Nhập tên người phụ trách..."
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Ghi chú chỉ đạo kỹ thuật:</label>
              <textarea
                rows={3}
                value={rescueNotesInput}
                onChange={(e) => setRescueNotesInput(e.target.value)}
                className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-medium text-slate-800 focus:border-emerald-600 focus:outline-none"
                placeholder="Ví dụ: Mang theo cáp dù 30T, tiếp cận theo bờ kênh phía Nam tránh lún sụt..."
              />
            </div>
          </div>
        </Modal>
      )}

      {/* 7. MODAL XEM PHÓNG TO HÌNH ẢNH MINH CHỨNG */}
      {previewImageUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setPreviewImageUrl(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] bg-slate-900 rounded-2xl overflow-hidden shadow-2xl border border-white/20">
            <button
              type="button"
              onClick={() => setPreviewImageUrl(null)}
              className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <XCircle className="w-5 h-5" />
            </button>
            <img
              src={previewImageUrl}
              alt="Phóng to ảnh minh chứng SOS"
              className="max-h-[85vh] w-auto object-contain mx-auto"
            />
            <div className="p-3 bg-slate-950/90 text-white text-center text-xs">
              <span>Hình ảnh minh chứng sự cố hiện trường được truyền từ điện thoại di động tài xế</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default SosManagementPage;
