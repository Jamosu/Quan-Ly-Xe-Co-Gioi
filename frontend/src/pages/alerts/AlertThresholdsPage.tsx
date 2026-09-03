import React, { useState } from 'react';
import { FilterBar } from '../../components/filters/FilterBar';
import { Button } from '../../components/common/Button';
import { StatCard } from '../../components/data-display/StatCard';
import { KPIGrid } from '../../components/data-display/KPIGrid';
import {
  Sliders,
  Save,
  RotateCcw,
  Clock,
  Bell,
  Shield,
  CheckCircle2,
} from 'lucide-react';

export const AlertThresholdsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'speed' | 'fuel' | 'engine' | 'sound'>('speed');
  const [speedInternal, setSpeedInternal] = useState('30');
  const [speedPackhouse, setSpeedPackhouse] = useState('15');
  const [fuelDropRate, setFuelDropRate] = useState('5.0');
  const [maxIdleMinutes, setMaxIdleMinutes] = useState('20');
  const [maxEngineTemp, setMaxEngineTemp] = useState('98');
  const [soundAlert, setSoundAlert] = useState('Bật chuông báo động (Còi SOS âm lượng cao)');
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSave = () => {
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 font-heading">
            Cấu hình Ngưỡng cảnh báo Hệ thống
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Thiết lập các thông số kích hoạt cảnh báo trực tiếp trên giao diện Web: tốc độ, geofence, sụt nhiên liệu, nhiệt độ máy.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="md" icon={<RotateCcw className="w-4 h-4" />}>
            Khôi phục mặc định
          </Button>
          <Button variant="primary" size="md" icon={<Save className="w-4 h-4" />} onClick={handleSave}>
            Lưu cấu hình
          </Button>
        </div>
      </div>

      {/* Global FilterBar */}
      <FilterBar
        extraFilters={
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Phạm vi: Toàn KLH Koun Mom · Áp dụng ngay</span>
          </div>
        }
      />

      {/* 4 Stats Cards matching Mockup */}
      <KPIGrid cols={4}>
        <StatCard
          label="Quy tắc đang kích hoạt"
          value="10 quy tắc"
          subValue="Giám sát 100% tự động"
          icon={<Sliders className="w-5 h-5" />}
          iconBgColor="bg-emerald-50"
          iconColor="text-primary"
          trend={{ value: "10 active", isUp: true }}
        />
        <StatCard
          label="Thời gian quét sự kiện"
          value="Mỗi 10 giây"
          subValue="Xử lý thời gian thực"
          icon={<Clock className="w-5 h-5" />}
          iconBgColor="bg-sky-50"
          iconColor="text-sky-600"
        />
        <StatCard
          label="Hiển thị cảnh báo"
          value="Popup & Chuông Web"
          subValue="Âm thanh báo động SOS"
          icon={<Bell className="w-5 h-5" />}
          iconBgColor="bg-amber-50"
          iconColor="text-amber-600"
        />
        <StatCard
          label="Phân quyền nhận cảnh báo"
          value="Theo vai trò"
          subValue="Quản đốc, Điều phối, Xưởng"
          icon={<Shield className="w-5 h-5" />}
          iconBgColor="bg-emerald-50"
          iconColor="text-emerald-700"
        />
      </KPIGrid>

      {/* Save Success Alert */}
      {saveSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-2xl text-xs font-bold flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Đã lưu thành công và cập nhật các ngưỡng cảnh báo lên máy chủ thời gian thực!</span>
        </div>
      )}

      {/* Main Settings Panel */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-white rounded-2xl p-4 sm:p-6 border border-slate-200 shadow-card">
        {/* Left Navigation */}
        <aside className="space-y-1.5 border-b md:border-b-0 md:border-r border-slate-200 pb-4 md:pb-0 md:pr-4">
          <button
            onClick={() => setActiveTab('speed')}
            className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'speed'
                ? 'bg-primary text-white shadow-sm'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            Quy tắc Tốc độ & Vùng
          </button>
          <button
            onClick={() => setActiveTab('fuel')}
            className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'fuel'
                ? 'bg-primary text-white shadow-sm'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            Quy tắc Nhiên liệu
          </button>
          <button
            onClick={() => setActiveTab('engine')}
            className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'engine'
                ? 'bg-primary text-white shadow-sm'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            Quy tắc Động cơ & Kỹ thuật
          </button>
          <button
            onClick={() => setActiveTab('sound')}
            className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'sound'
                ? 'bg-primary text-white shadow-sm'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            Cấu hình Âm thanh & Popup Web
          </button>
        </aside>

        {/* Right Settings Inputs */}
        <div className="md:col-span-3 space-y-4">
          <div>
            <h2 className="text-sm font-extrabold text-slate-900 mb-0.5">
              Cấu hình thông số kích hoạt cảnh báo trên giao diện Web
            </h2>
            <p className="text-xs text-slate-500">
              Các ngưỡng áp dụng cho toàn bộ thiết bị GPS và cảm biến gắn trên dàn xe cơ giới.
            </p>
          </div>

          <div className="space-y-3.5 pt-2">
            <div>
              <label className="text-xs font-bold text-slate-800 block mb-1">
                Ngưỡng cảnh báo quá tốc độ đường nội bộ nông trường (km/h)
              </label>
              <input
                type="text"
                value={speedInternal}
                onChange={(e) => setSpeedInternal(e.target.value)}
                className="w-full p-2.5 text-xs font-mono font-bold border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:border-primary transition-all"
              />
              <small className="text-[10px] text-slate-400 block mt-1">
                Hệ thống sẽ hiển thị cảnh báo đỏ trên Web nếu xe chạy quá 30 km/h liên tục 15 giây.
              </small>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-800 block mb-1">
                Ngưỡng cảnh báo quá tốc độ khu vực dân cư & Packhouse (km/h)
              </label>
              <input
                type="text"
                value={speedPackhouse}
                onChange={(e) => setSpeedPackhouse(e.target.value)}
                className="w-full p-2.5 text-xs font-mono font-bold border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:border-primary transition-all"
              />
              <small className="text-[10px] text-slate-400 block mt-1">
                Khu vực tập trung đông công nhân sơ chế và trạm cân.
              </small>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-800 block mb-1">
                Ngưỡng sụt giảm nhiên liệu bất thường (Lít / phút)
              </label>
              <input
                type="text"
                value={fuelDropRate}
                onChange={(e) => setFuelDropRate(e.target.value)}
                className="w-full p-2.5 text-xs font-mono font-bold border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:border-primary transition-all"
              />
              <small className="text-[10px] text-slate-400 block mt-1">
                Nếu mức dầu giảm đột ngột &gt; 5L trong 1 phút khi xe đang dừng máy, kích hoạt chuông SOS báo động trộm dầu.
              </small>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-800 block mb-1">
                Thời gian tối đa dừng xe nổ máy tại chỗ (Phút)
              </label>
              <input
                type="text"
                value={maxIdleMinutes}
                onChange={(e) => setMaxIdleMinutes(e.target.value)}
                className="w-full p-2.5 text-xs font-mono font-bold border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:border-primary transition-all"
              />
              <small className="text-[10px] text-slate-400 block mt-1">
                Cảnh báo tài xế bật máy lạnh hoặc nổ máy chờ quá lâu gây lãng phí nhiên liệu.
              </small>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-800 block mb-1">
                Ngưỡng nhiệt độ nước làm mát báo động (°C)
              </label>
              <input
                type="text"
                value={maxEngineTemp}
                onChange={(e) => setMaxEngineTemp(e.target.value)}
                className="w-full p-2.5 text-xs font-mono font-bold border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:border-primary transition-all"
              />
              <small className="text-[10px] text-slate-400 block mt-1">
                Cảnh báo tài xế dừng máy ngay để tránh bó kẹt động cơ.
              </small>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-800 block mb-1">
                Âm thanh báo động trên Web khi có sự cố khẩn cấp
              </label>
              <input
                type="text"
                value={soundAlert}
                onChange={(e) => setSoundAlert(e.target.value)}
                className="w-full p-2.5 text-xs font-semibold border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:border-primary transition-all"
              />
              <small className="text-[10px] text-slate-400 block mt-1">
                Phát âm thanh cảnh báo trên màn hình máy tính trực ban điều độ.
              </small>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200">
            <Button variant="outline" size="sm">
              Khôi phục mặc định
            </Button>
            <Button variant="primary" size="sm" onClick={handleSave}>
              Lưu cấu hình
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
