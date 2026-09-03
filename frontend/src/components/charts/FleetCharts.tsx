import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

export interface FleetProductivityChartProps {
  title?: string;
  subtitle?: string;
  data?: any[];
}

const DEFAULT_PRODUCTIVITY_DATA = [
  { name: 'KLH Snoul', hoatDong: 215, tamDung: 45, baoTri: 25 },
  { name: 'KLH Koun Mom', hoatDong: 180, tamDung: 38, baoTri: 22 },
  { name: 'KLH Ia Puch', hoatDong: 128, tamDung: 24, baoTri: 13 },
  { name: 'KLH HAGL Attapeu', hoatDong: 110, tamDung: 28, baoTri: 14 },
  { name: 'KLH Andong Meas', hoatDong: 72, tamDung: 15, baoTri: 9 },
];

export const FleetProductivityChart: React.FC<FleetProductivityChartProps> = ({
  title = 'Tỷ lệ Vận hành Phương tiện theo Khu liên hợp',
  subtitle = 'Phân bổ trạng thái hoạt động thực tế 24h qua',
  data = DEFAULT_PRODUCTIVITY_DATA,
}) => {
  return (
    <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-card">
      <div className="mb-4">
        <h3 className="text-sm font-bold text-slate-900 font-heading">{title}</h3>
        <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8E5" />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6F7C75' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#6F7C75' }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                border: '1px solid #E2E8E5',
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                fontSize: '12px',
              }}
            />
            <Legend
              wrapperStyle={{ paddingTop: '12px', fontSize: '11px' }}
              formatter={(val) => {
                if (val === 'hoatDong') return 'Đang hoạt động';
                if (val === 'tamDung') return 'Tạm dừng / Đỗ';
                if (val === 'baoTri') return 'Bảo dưỡng / BTSC';
                return val;
              }}
            />
            <Bar dataKey="hoatDong" fill="#0F5F2A" radius={[4, 4, 0, 0]} />
            <Bar dataKey="tamDung" fill="#F59E0B" radius={[4, 4, 0, 0]} />
            <Bar dataKey="baoTri" fill="#EF4444" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

const DEFAULT_FUEL_TREND = [
  { time: '05:00', thucTe: 420, dinhMuc: 450 },
  { time: '07:00', thucTe: 1250, dinhMuc: 1200 },
  { time: '09:00', thucTe: 2480, dinhMuc: 2400 },
  { time: '11:00', thucTe: 3890, dinhMuc: 3900 },
  { time: '13:00', thucTe: 4620, dinhMuc: 4700 },
  { time: '15:00', thucTe: 5980, dinhMuc: 5850 },
  { time: '17:00', thucTe: 7120, dinhMuc: 7200 },
];

export const FuelConsumptionChart: React.FC<{ title?: string }> = ({
  title = 'Biểu đồ Tiêu hao Nhiên liệu: Cảm biến GPS vs Định mức Khoán',
}) => {
  return (
    <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-card">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-900 font-heading">{title}</h3>
          <p className="text-xs text-slate-500 mt-0.5">So sánh tích lũy lít dầu tiêu thụ trong ngày</p>
        </div>
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={DEFAULT_FUEL_TREND} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
            <defs>
              <linearGradient id="fuelRealGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0F5F2A" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#0F5F2A" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="fuelQuotaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8E5" />
            <XAxis dataKey="time" tick={{ fontSize: 11, fill: '#6F7C75' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#6F7C75' }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                border: '1px solid #E2E8E5',
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                fontSize: '12px',
              }}
            />
            <Legend
              wrapperStyle={{ paddingTop: '12px', fontSize: '11px' }}
              formatter={(val) => (val === 'thucTe' ? 'Cảm biến GPS (Lít)' : 'Định mức Kế hoạch (Lít)')}
            />
            <Area type="monotone" dataKey="thucTe" stroke="#0F5F2A" strokeWidth={2.5} fillOpacity={1} fill="url(#fuelRealGradient)" />
            <Area type="monotone" dataKey="dinhMuc" stroke="#3B82F6" strokeWidth={2} strokeDasharray="4 4" fillOpacity={1} fill="url(#fuelQuotaGradient)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

const PIE_DATA = [
  { name: 'Xe kéo rơ-moóc', value: 38, color: '#0F5F2A' },
  { name: 'Máy cày xới đất', value: 27, color: '#2E8B4C' },
  { name: 'Xe tải ben nông nghiệp', value: 18, color: '#B8D83D' },
  { name: 'Xe bồn tưới & cơ giới khác', value: 17, color: '#F59E0B' },
];

export const FleetCategoryPieChart: React.FC = () => {
  return (
    <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-card">
      <div className="mb-2">
        <h3 className="text-sm font-bold text-slate-900 font-heading">Cơ cấu Chủng loại Phương tiện</h3>
        <p className="text-xs text-slate-500 mt-0.5">Tỷ trọng các nhóm xe cơ giới</p>
      </div>

      <div className="h-60 w-full flex items-center justify-center">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={PIE_DATA}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={80}
              paddingAngle={4}
              dataKey="value"
            >
              {PIE_DATA.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip />
            <Legend
              verticalAlign="bottom"
              wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
              formatter={(val, entry: any) => `${val} (${entry.payload.value}%)`}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
