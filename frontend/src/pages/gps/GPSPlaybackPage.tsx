import React, { useState } from 'react';
import { FilterBar } from '../../components/filters/FilterBar';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { StatCard } from '../../components/data-display/StatCard';
import { KPIGrid } from '../../components/data-display/KPIGrid';
import {
  Play,
  Pause,
  RotateCcw,
  Download,
  Clock,
  Navigation,
  Gauge,
  Fuel,
  MapPin,
  CheckCircle2,
} from 'lucide-react';

interface MilestoneItem {
  id: string;
  title: string;
  subTitle: string;
  timeStr: string;
  statusColor: 'green' | 'amber' | 'blue';
  markerCode: string;
  coords: { x: number; y: number };
}

export const GPSPlaybackPage: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<1 | 2 | 4>(2);
  const [milestones, setMilestones] = useState<MilestoneItem[]>([]);
  const [selectedMilestone, setSelectedMilestone] = useState<MilestoneItem | null>(null);
  const [progress, setProgress] = useState(0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 font-heading">
            Playback hành trình theo ngày / ca
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Xem lại lịch sử di chuyển, biểu đồ vận tốc và các điểm dừng đỗ nổ máy theo mốc thời gian.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="md" icon={<Download className="w-4 h-4" />}>
            Xuất KML
          </Button>
          <Button
            variant="primary"
            size="md"
            icon={isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            onClick={() => setIsPlaying(!isPlaying)}
            disabled={milestones.length === 0}
          >
            {isPlaying ? 'Tạm dừng' : 'Bắt đầu phát lại'}
          </Button>
        </div>
      </div>

      {/* Global FilterBar */}
      <FilterBar
        extraFilters={
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Tốc độ phát: {playbackSpeed}x</span>
          </div>
        }
      />

      {/* 4 Stats Cards */}
      <KPIGrid cols={4}>
        <StatCard
          label="Tổng quãng đường ca lái"
          value={milestones.length > 0 ? "64.8 km" : "0 km"}
          subValue="Tính toán từ tọa độ GPS"
          icon={<Navigation className="w-5 h-5" />}
          iconBgColor="bg-emerald-50"
          iconColor="text-primary"
        />
        <StatCard
          label="Thời gian nổ máy hữu ích"
          value={milestones.length > 0 ? "7h 42p" : "0h 00p"}
          subValue="Giờ máy động cơ"
          icon={<Clock className="w-5 h-5" />}
          iconBgColor="bg-sky-50"
          iconColor="text-sky-600"
        />
        <StatCard
          label="Số lần dừng đỗ"
          value={`${milestones.length > 0 ? milestones.length : 0} điểm`}
          subValue="Điểm dừng trên tuyến"
          icon={<Fuel className="w-5 h-5" />}
          iconBgColor="bg-amber-50"
          iconColor="text-amber-600"
        />
        <StatCard
          label="Vận tốc cao nhất"
          value={milestones.length > 0 ? "26.4 km/h" : "0 km/h"}
          subValue="Giới hạn nông trường 40 km/h"
          icon={<Gauge className="w-5 h-5" />}
          iconBgColor="bg-emerald-50"
          iconColor="text-emerald-700"
        />
      </KPIGrid>

      {/* Split Map Stage Container */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 bg-white rounded-2xl p-4 border border-slate-200 shadow-card">
        {/* Left Milestones Sidebar */}
        <div className="space-y-2.5">
          <div className="text-xs font-extrabold text-slate-800 pb-1 border-b border-slate-200">
            Mốc Hành Trình Xe (Timeline)
          </div>

          <div className="space-y-2">
            {milestones.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-slate-200">
                Chưa có dữ liệu hành trình. Vui lòng chọn xe và khoảng thời gian để phát lại.
              </div>
            ) : (
              milestones.map((m) => (
                <div
                  key={m.id}
                  onClick={() => setSelectedMilestone(m)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                    selectedMilestone?.id === m.id
                      ? 'border-primary bg-emerald-50/50 shadow-sm'
                      : 'border-slate-200/80 bg-slate-50/70 hover:bg-white'
                  }`}
                >
                  <div className="flex items-start gap-2.5 flex-1 min-w-0">
                    <div
                      className={`w-2.5 h-2.5 rounded-full mt-1 shrink-0 ${
                        m.statusColor === 'amber'
                          ? 'bg-amber-500'
                          : m.statusColor === 'blue'
                          ? 'bg-sky-500'
                          : 'bg-emerald-500'
                      }`}
                    />
                    <div className="truncate">
                      <strong className="text-xs font-bold text-slate-900 block truncate">{m.title}</strong>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">{m.subTitle}</p>
                    </div>
                  </div>
                  <span className="text-slate-400 text-xs font-bold">›</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Playback Canvas Stage */}
        <div className="lg:col-span-2 relative min-h-[480px] bg-slate-900 rounded-xl overflow-hidden border border-slate-800 flex flex-col items-center justify-between p-4">
          {/* Subtle Grid Canvas */}
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage:
                'linear-gradient(#22c55e 1px, transparent 1px), linear-gradient(90deg, #22c55e 1px, transparent 1px)',
              backgroundSize: '40px 40px',
            }}
          />

          {milestones.length === 0 ? (
            <div className="relative z-10 flex-1 flex flex-col items-center justify-center text-slate-400 text-xs text-center p-8">
              <MapPin className="w-10 h-10 mb-2 opacity-30 text-emerald-400" />
              <p className="font-semibold text-slate-300">Chưa có hành trình GPS để hiển thị</p>
              <p className="text-[11px] text-slate-500 mt-1">Chọn phương tiện từ bộ lọc để nạp lộ trình di chuyển vệ tinh</p>
            </div>
          ) : (
            <>
              {/* Polyline Route Track */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none">
                <path
                  d="M 120 180 Q 240 260, 380 200 T 560 320 T 780 180"
                  fill="none"
                  stroke="#22c55e"
                  strokeWidth="4"
                  strokeDasharray="6 4"
                />
              </svg>

              {/* Top HUD */}
              <div className="relative z-10 w-full flex items-center justify-between bg-slate-800/80 backdrop-blur-md px-3 py-2 rounded-xl text-white text-xs border border-slate-700/80">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="font-semibold">Lộ trình phương tiện giám sát</span>
                </div>
                <Badge variant="green">Đang phát lại</Badge>
              </div>

              {/* Marker Nodes on Canvas */}
              {milestones.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setSelectedMilestone(m)}
                  style={{ left: `${m.coords.x}%`, top: `${m.coords.y}%` }}
                  className={`absolute z-10 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full font-bold text-xs shadow-lg transition-all flex items-center justify-center ${
                    selectedMilestone?.id === m.id
                      ? 'bg-primary text-white ring-4 ring-primary/40 scale-125 z-20'
                      : 'bg-slate-800 text-emerald-400 border-2 border-emerald-500'
                  }`}
                >
                  {m.markerCode}
                </button>
              ))}
            </>
          )}

          {/* Bottom Player Footer */}
          <div className="relative z-10 w-full bg-slate-800/90 backdrop-blur-md p-3 rounded-xl border border-slate-700/80 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-300">
              <span>Bắt đầu ca</span>
              <span className="font-bold text-emerald-400">Tiến độ phát lại: {progress}%</span>
              <span>Kết thúc ca</span>
            </div>

            <input
              type="range"
              min="0"
              max="100"
              value={progress}
              onChange={(e) => setProgress(Number(e.target.value))}
              className="w-full accent-primary h-2 bg-slate-700 rounded-lg cursor-pointer"
            />

            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" icon={<RotateCcw className="w-3.5 h-3.5" />} onClick={() => setProgress(0)}>
                  Đầu ca
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  icon={isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  onClick={() => setIsPlaying(!isPlaying)}
                  disabled={milestones.length === 0}
                >
                  {isPlaying ? 'Tạm dừng' : 'Phát'}
                </Button>
              </div>

              <div className="flex items-center gap-1.5 text-xs text-slate-300">
                <span>Tốc độ:</span>
                {([1, 2, 4] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setPlaybackSpeed(s)}
                    className={`px-2 py-0.5 rounded text-xs font-bold transition-all ${
                      playbackSpeed === s ? 'bg-primary text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    {s}x
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
