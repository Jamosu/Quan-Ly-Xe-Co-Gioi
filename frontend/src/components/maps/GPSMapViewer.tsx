import React, { useState } from 'react';
import { Navigation, Compass, ZoomIn, ZoomOut, Maximize2, Fuel, Gauge, AlertTriangle, CheckCircle, Shield } from 'lucide-react';
import { VehicleGPS } from '../../types';
import { Badge } from '../common/Badge';
import { useFilterStore } from '../../store/useFilterStore';
import { useAppStore } from '../../store/useAppStore';
import { filterItems } from '../../utils/filterUtils';

export interface GPSMapViewerProps {
  vehicles: VehicleGPS[];
  selectedVehicleId?: string;
  onSelectVehicle?: (vehicle: VehicleGPS) => void;
  height?: string;
  showSidebarList?: boolean;
}

export const GPSMapViewer: React.FC<GPSMapViewerProps> = ({
  vehicles,
  selectedVehicleId,
  onSelectVehicle,
  height = '540px',
  showSidebarList = true,
}) => {
  const globalSearchTerm = useFilterStore((state) => state.searchTerm);
  const selectedStatus = useFilterStore((state) => state.selectedStatus);
  const selectedKLH = useAppStore((state) => state.selectedKLH);

  const displayVehicles = React.useMemo(() => {
    return filterItems(vehicles, {
      searchTerm: globalSearchTerm,
      selectedKLH,
      selectedStatus,
    });
  }, [vehicles, globalSearchTerm, selectedKLH, selectedStatus]);

  const [activeVehicle, setActiveVehicle] = useState<VehicleGPS | null>(
    displayVehicles.find((v) => v.id === selectedVehicleId) || displayVehicles[0] || null
  );

  React.useEffect(() => {
    if (displayVehicles.length > 0) {
      if (!activeVehicle || !displayVehicles.some((v) => v.id === activeVehicle.id)) {
        setActiveVehicle(displayVehicles[0]);
      }
    } else {
      setActiveVehicle(null);
    }
  }, [displayVehicles]);

  const handleSelect = (v: VehicleGPS) => {
    setActiveVehicle(v);
    if (onSelectVehicle) onSelectVehicle(v);
  };

  const getStatusColor = (status: VehicleGPS['status']) => {
    switch (status) {
      case 'running':
        return 'bg-emerald-500 text-white';
      case 'idling':
        return 'bg-amber-500 text-white';
      case 'maintenance':
        return 'bg-rose-500 text-white';
      case 'stopped':
        return 'bg-slate-600 text-white';
      default:
        return 'bg-slate-400 text-white';
    }
  };

  const getStatusBadge = (status: VehicleGPS['status']) => {
    switch (status) {
      case 'running':
        return <Badge variant="green" dot>Đang chạy</Badge>;
      case 'idling':
        return <Badge variant="amber" dot>Nổ máy dừng</Badge>;
      case 'maintenance':
        return <Badge variant="red" dot>Bảo trì xưởng</Badge>;
      case 'stopped':
        return <Badge variant="gray" dot>Đang đỗ tắt máy</Badge>;
      default:
        return <Badge variant="gray">Mất tín hiệu</Badge>;
    }
  };

  return (
    <div
      className="bg-white rounded-xl border border-slate-200/80 shadow-card overflow-hidden grid grid-cols-1 lg:grid-cols-12"
      style={{ height }}
    >
      {/* Sidebar List (If enabled) */}
      {showSidebarList && (
        <div className="lg:col-span-4 border-r border-slate-200 flex flex-col h-full bg-slate-50/50">
          <div className="p-3.5 border-b border-slate-200 bg-white flex items-center justify-between">
            <div>
              <h4 className="text-xs font-bold text-slate-800 font-heading">Danh sách xe trực tuyến</h4>
              <p className="text-[11px] text-slate-500">{displayVehicles.length} phương tiện phù hợp</p>
            </div>
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2 space-y-1">
            {displayVehicles.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                Không tìm thấy xe phù hợp bộ lọc
              </div>
            ) : (
              displayVehicles.map((v) => {
                const isSelected = activeVehicle?.id === v.id;
                return (
                  <div
                    key={v.id}
                    onClick={() => handleSelect(v)}
                    className={`p-3 rounded-xl cursor-pointer transition-all duration-150 ${
                      isSelected
                        ? 'bg-white border-2 border-primary shadow-sm'
                        : 'bg-white/80 hover:bg-white border border-slate-200/60'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-900 font-heading">{v.plateNumber}</span>
                      {getStatusBadge(v.status)}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
                      <span>{v.driverName}</span>
                      <span className="font-medium text-slate-700">{v.speed} km/h</span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1 truncate">
                      📍 {v.address}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Map Interactive Canvas */}
      <div className={`${showSidebarList ? 'lg:col-span-8' : 'lg:col-span-12'} relative h-full bg-[#E5EBE6] overflow-hidden flex flex-col`}>
        {/* Map Vector Grid Simulation */}
        <div
          className="absolute inset-0 opacity-80"
          style={{
            backgroundImage: `radial-gradient(#C2DEC9 1.5px, transparent 1.5px), radial-gradient(#D6E6DA 1.5px, #E5EBE6 1.5px)`,
            backgroundSize: '30px 30px',
            backgroundPosition: '0 0, 15px 15px',
          }}
        />

        {/* Plantation Vector Road Grid Mockup */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-40">
          <line x1="10%" y1="20%" x2="90%" y2="20%" stroke="#1B743B" strokeWidth="4" strokeDasharray="8 6" />
          <line x1="20%" y1="10%" x2="20%" y2="90%" stroke="#1B743B" strokeWidth="3" />
          <line x1="60%" y1="10%" x2="60%" y2="90%" stroke="#1B743B" strokeWidth="4" />
          <line x1="10%" y1="65%" x2="90%" y2="65%" stroke="#1B743B" strokeWidth="3" strokeDasharray="6 4" />
          <polygon points="150,80 320,60 360,240 180,260" fill="#2E8B4C" fillOpacity="0.12" stroke="#2E8B4C" strokeWidth="1.5" />
          <polygon points="420,180 620,150 670,360 480,380" fill="#B8D83D" fillOpacity="0.1" stroke="#B8D83D" strokeWidth="1.5" />
        </svg>

        {/* Floating Controls */}
        <div className="absolute top-4 right-4 z-20 flex flex-col gap-1.5 bg-white/90 backdrop-blur-md rounded-xl p-1 shadow-lg border border-slate-200">
          <button className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors" title="Phóng to">
            <ZoomIn className="w-4 h-4" />
          </button>
          <button className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors" title="Thu nhỏ">
            <ZoomOut className="w-4 h-4" />
          </button>
          <button className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors" title="Toàn màn hình">
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>

        {/* Map Legend Overlay */}
        <div className="absolute bottom-4 left-4 z-20 bg-white/90 backdrop-blur-md rounded-xl px-3 py-2 shadow-lg border border-slate-200 text-[11px] flex items-center gap-4 text-slate-700 font-medium">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span>Đang chạy</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span>Nổ máy dừng</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
            <span>Bảo dưỡng</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-600" />
            <span>Đỗ xe</span>
          </div>
        </div>

        {/* Vehicle Markers Placed on Map */}
        <div className="absolute inset-0 p-8">
          {displayVehicles.map((v, index) => {
            // Distribute markers visually
            const positions = [
              { left: '28%', top: '35%' },
              { left: '55%', top: '22%' },
              { left: '68%', top: '58%' },
              { left: '38%', top: '65%' },
              { left: '78%', top: '38%' },
              { left: '18%', top: '72%' },
              { left: '82%', top: '78%' },
              { left: '48%', top: '80%' },
            ];
            const pos = positions[index % positions.length];
            const isSelected = activeVehicle?.id === v.id;

            return (
              <div
                key={v.id}
                style={{ left: pos.left, top: pos.top }}
                onClick={() => handleSelect(v)}
                className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer group z-10 transition-transform duration-200 hover:scale-110"
              >
                {/* Ping wave for active vehicle */}
                {isSelected && (
                  <span className="animate-ping absolute -inset-1 rounded-2xl bg-primary opacity-50" />
                )}

                {/* Marker Pill */}
                <div
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl shadow-lg border-2 font-bold text-[11px] whitespace-nowrap transition-all ${
                    isSelected ? 'border-primary ring-4 ring-primary/20 scale-105' : 'border-white'
                  } ${getStatusColor(v.status)}`}
                >
                  <Navigation
                    className="w-3 h-3 transform"
                    style={{ transform: `rotate(${v.heading}deg)` }}
                  />
                  <span>{v.plateNumber}</span>
                  <span className="opacity-80 text-[10px] font-normal">({v.speed} km/h)</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Active Vehicle Floating Telemetry Card */}
        {activeVehicle && (
          <div className="absolute top-4 left-4 z-20 max-w-[calc(100%-2rem)] sm:max-w-sm bg-white/95 backdrop-blur-md rounded-2xl p-4 shadow-xl border border-slate-200/90 text-xs animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <span className="font-extrabold text-sm text-slate-900 font-heading">{activeVehicle.plateNumber}</span>
                <span className="text-[10px] text-slate-500 block">{activeVehicle.vehicleType}</span>
              </div>
              {getStatusBadge(activeVehicle.status)}
            </div>

            <div className="grid grid-cols-2 gap-2.5 my-3">
              <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 border border-slate-100">
                <Gauge className="w-4 h-4 text-primary" />
                <div>
                  <div className="text-[10px] text-slate-500">Tốc độ hiện tại</div>
                  <div className="font-bold text-slate-800">{activeVehicle.speed} km/h</div>
                </div>
              </div>

              <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 border border-slate-100">
                <Fuel className="w-4 h-4 text-amber-500" />
                <div>
                  <div className="text-[10px] text-slate-500">Nhiên liệu</div>
                  <div className="font-bold text-slate-800">{activeVehicle.fuelLevelPercent}% ({activeVehicle.fuelLiters}L)</div>
                </div>
              </div>
            </div>

            <div className="space-y-1.5 text-[11px] text-slate-600 bg-slate-50/70 p-2.5 rounded-xl border border-slate-100">
              <div><span className="text-slate-400">Tài xế:</span> <strong className="text-slate-800">{activeVehicle.driverName}</strong> ({activeVehicle.driverPhone})</div>
              <div><span className="text-slate-400">Đơn vị:</span> <strong className="text-slate-800">{activeVehicle.klhName}</strong></div>
              <div><span className="text-slate-400">Vị trí:</span> <span>{activeVehicle.address}</span></div>
              <div className="flex justify-between pt-1 border-t border-slate-200/60 text-[10px] text-slate-400">
                <span>Quãng đường hôm nay: <b className="text-slate-700">{activeVehicle.todayKm} km</b></span>
                <span>Giờ máy: <b className="text-slate-700">{activeVehicle.todayEngineHours} h</b></span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
