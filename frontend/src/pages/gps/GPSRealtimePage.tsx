import React, { useState, useEffect } from 'react';
import { FilterBar } from '../../components/filters/FilterBar';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { StatCard } from '../../components/data-display/StatCard';
import { KPIGrid } from '../../components/data-display/KPIGrid';
import { apiClient } from '../../api/client';
import { useAppStore } from '../../store/useAppStore';
import {
  Navigation,
  Maximize2,
  Zap,
  Truck,
  AlertTriangle,
  Clock,
  Fuel,
  CheckCircle2,
  MapPin,
  Search,
} from 'lucide-react';

interface RealtimeVehicle {
  id: string;
  code: string;
  model: string;
  activity: string;
  driver: string;
  speed: string;
  fuelPercent: string;
  status: 'ordered' | 'free' | 'stopped' | 'speed_warning';
  coords: { x: number; y: number };
}

export const GPSRealtimePage: React.FC = () => {
  const selectedKLH = useAppStore((state) => state.selectedKLH);
  const [vehiclesList, setVehiclesList] = useState<RealtimeVehicle[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<RealtimeVehicle | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVehicles = async () => {
      setLoading(true);
      try {
        const res = await apiClient.get('/vehicles', {
          params: {
            limit: 100,
            complexCode: selectedKLH !== 'ALL' ? selectedKLH : undefined,
          },
        });
        const items = res.data?.data?.items || res.data?.items || res.data || [];
        if (Array.isArray(items) && items.length > 0) {
          setVehiclesList(
            items.map((v: any, index: number) => {
              const capacity = v.fuelCapacity || 150;
              const current = v.fuelLevel || 0;
              const percent = capacity > 0 ? Math.round((current / capacity) * 100) : 50;
              return {
                id: `V-${v.id}`,
                code: v.plate || v.code,
                model: v.name || v.type?.name || 'Phương tiện',
                activity: v.currentStatus || 'Sẵn sàng điều phối',
                driver: v.driver?.fullName || 'Chưa gán tài xế',
                speed: v.currentSpeed ? `${v.currentSpeed} km/h` : '0 km/h',
                fuelPercent: `${percent}%`,
                status: (v.status === 'IN_USE' ? 'ordered' : v.status === 'AVAILABLE' ? 'free' : 'stopped') as any,
                coords: {
                  x: 20 + ((index * 17) % 60),
                  y: 20 + ((index * 23) % 60),
                },
              };
            })
          );
        } else {
          setVehiclesList([]);
        }
      } catch (err) {
        setVehiclesList([]);
      } finally {
        setLoading(false);
      }
    };
    void fetchVehicles();
  }, [selectedKLH]);

  const filteredVehicles = vehiclesList.filter(
    (v) =>
      v.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.driver.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.activity.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 font-heading">
            Bản đồ GPS Realtime toàn đội xe
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Giám sát vị trí trực tiếp, tốc độ, mức nhiên liệu que đo và phân biệt xe chạy theo lệnh vs xe chạy tự do.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="md" icon={<Maximize2 className="w-4 h-4" />}>
            Bản đồ toàn màn hình
          </Button>
          <Button variant="primary" size="md" icon={<Zap className="w-4 h-4" />}>
            Lệnh khẩn cấp
          </Button>
        </div>
      </div>

      {/* Global FilterBar */}
      <FilterBar
        extraFilters={
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>GPS cập nhật mỗi 30s</span>
          </div>
        }
      />

      {/* 4 Stats Cards matching Mockup */}
      <KPIGrid cols={4}>
        <StatCard
          label="Xe đang chạy theo lệnh"
          value={`${vehiclesList.filter((v) => v.status === 'ordered').length} xe`}
          subValue="Hoạt động theo lệnh"
          icon={<Truck className="w-5 h-5" />}
          iconBgColor="bg-emerald-50"
          iconColor="text-primary"
        />
        <StatCard
          label="Xe chạy tự do / Sẵn sàng"
          value={`${vehiclesList.filter((v) => v.status === 'free').length} xe`}
          subValue="Sẵn sàng điều phối"
          icon={<Navigation className="w-5 h-5" />}
          iconBgColor="bg-sky-50"
          iconColor="text-sky-600"
        />
        <StatCard
          label="Xe đang dừng đỗ"
          value={`${vehiclesList.filter((v) => v.status === 'stopped').length} xe`}
          subValue="Đỗ tại bãi xe"
          icon={<Clock className="w-5 h-5" />}
          iconBgColor="bg-amber-50"
          iconColor="text-amber-600"
        />
        <StatCard
          label="Cảnh báo vi phạm tốc độ/vùng"
          value={`${vehiclesList.filter((v) => v.status === 'speed_warning').length} xe`}
          subValue="Cần kiểm tra GPS"
          icon={<AlertTriangle className="w-5 h-5" />}
          iconBgColor="bg-rose-50"
          iconColor="text-rose-600"
        />
      </KPIGrid>

      {/* Module Map Split Stage */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 bg-white rounded-2xl p-4 border border-slate-200 shadow-card">
        {/* Left Sidebar List */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm biển số, tài xế, lô thửa..."
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:border-primary transition-all font-medium"
            />
          </div>

          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
            {filteredVehicles.map((v) => (
              <div
                key={v.id}
                onClick={() => setSelectedVehicle(v)}
                className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                  selectedVehicle?.id === v.id
                    ? 'border-primary bg-emerald-50/50 shadow-sm'
                    : 'border-slate-200/80 bg-slate-50/70 hover:bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-start gap-2.5 flex-1 min-w-0">
                  <div
                    className={`w-2.5 h-2.5 rounded-full mt-1 shrink-0 ${
                      v.status === 'speed_warning'
                        ? 'bg-rose-500 animate-ping'
                        : v.status === 'stopped'
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                    }`}
                  />
                  <div className="truncate">
                    <div className="flex items-center gap-2">
                      <strong className="text-xs font-bold text-slate-900">{v.code}</strong>
                      <span className="text-[10px] text-slate-500 font-semibold">{v.speed}</span>
                      <span className="text-[10px] text-emerald-700 font-bold">Dầu {v.fuelPercent}</span>
                    </div>
                    <p className="text-[11px] text-slate-600 truncate mt-0.5">{v.activity}</p>
                    <span className="text-[10px] text-slate-400">TX: {v.driver}</span>
                  </div>
                </div>
                <span className="text-slate-400 text-xs font-bold">›</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right Map Canvas Stage */}
        <div className="lg:col-span-2 relative min-h-[500px] bg-slate-900 rounded-xl overflow-hidden border border-slate-800 flex flex-col items-center justify-between p-4">
          {/* Subtle Grid / Satellite Canvas Mock */}
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage:
                'linear-gradient(#22c55e 1px, transparent 1px), linear-gradient(90deg, #22c55e 1px, transparent 1px)',
              backgroundSize: '40px 40px',
            }}
          />

          {/* Map Top Bar */}
          <div className="relative z-10 w-full flex items-center justify-between bg-slate-800/80 backdrop-blur-md px-3 py-2 rounded-xl text-white text-xs border border-slate-700/80">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-semibold">Vệ Tinh Trực Tuyến · KLH Koun Mom (Bản Đồ Nông Trường)</span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-300">
              <span>Độ phóng đại: 14x</span>
            </div>
          </div>

          {/* Interactive Markers on Map */}
          {vehiclesList.map((v) => (
            <button
              key={v.id}
              onClick={() => setSelectedVehicle(v)}
              style={{ left: `${v.coords.x}%`, top: `${v.coords.y}%` }}
              className={`absolute z-10 -translate-x-1/2 -translate-y-1/2 px-2.5 py-1 rounded-full font-bold text-[10px] shadow-lg transition-all flex items-center gap-1 ${
                selectedVehicle?.id === v.id
                  ? 'bg-primary text-white ring-4 ring-primary/40 scale-125 z-20'
                  : v.status === 'speed_warning'
                  ? 'bg-rose-600 text-white animate-bounce'
                  : v.status === 'stopped'
                  ? 'bg-amber-500 text-slate-900'
                  : 'bg-emerald-600 text-white hover:scale-110'
              }`}
            >
              <MapPin className="w-3 h-3" />
              <span>{v.code.split('-').pop()}</span>
            </button>
          ))}

          {/* Map Bottom Footer */}
          <div className="relative z-10 w-full text-center bg-slate-800/80 backdrop-blur-md px-3 py-1.5 rounded-xl text-slate-300 text-[11px] border border-slate-700/80">
            <em>86 xe đang lăn bánh trên tổng số 128 xe · Tích hợp cảm biến dầu siêu âm & App Lái xe</em>
          </div>
        </div>
      </div>

      {/* Vehicle Detail Modal */}
      {selectedVehicle && (
        <Modal
          isOpen={!!selectedVehicle}
          onClose={() => setSelectedVehicle(null)}
          title={`Chi Tiết Vị Trí: ${selectedVehicle.code}`}
          subtitle={`${selectedVehicle.model} | Lái xe: ${selectedVehicle.driver}`}
          size="md"
        >
          <div className="space-y-3.5 text-xs text-slate-700">
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
              <div className="flex justify-between"><span>Hoạt động:</span> <strong className="text-slate-900">{selectedVehicle.activity}</strong></div>
              <div className="flex justify-between"><span>Vận tốc GPS:</span> <b className={selectedVehicle.status === 'speed_warning' ? 'text-rose-600' : 'text-primary'}>{selectedVehicle.speed}</b></div>
              <div className="flex justify-between"><span>Mức dầu trong bình:</span> <b className="text-emerald-700">{selectedVehicle.fuelPercent} (Que đo DUT-E)</b></div>
              <div className="flex justify-between"><span>Trạng thái máy:</span> <b>{selectedVehicle.status === 'stopped' ? 'Đang dừng máy' : 'Đang nổ máy di chuyển'}</b></div>
            </div>
            <div className="flex justify-end pt-2">
              <Button variant="primary" size="sm" onClick={() => setSelectedVehicle(null)}>
                Đóng
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
