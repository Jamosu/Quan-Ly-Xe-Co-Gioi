import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { apiClient } from '../../api/client';
import { useAppStore } from '../../store/useAppStore';

interface DashboardAlertItem {
  id: string;
  symbol: string;
  symbolColor: 'red' | 'amber' | 'blue';
  title: string;
  subText: string;
  timeAgo: string;
}

interface DashboardOrderRow {
  id: string;
  orderCode: string;
  orderType: 'LSX' | 'LVC' | 'LĐX' | 'CHỜ';
  orderTypeLabel: string;
  orderTagClass: string;
  shiftTime: string;
  plateNumber: string;
  vehicleDesc: string;
  driverName: string;
  driverLicense: string;
  driverPhone: string;
  jobLocation: string;
  jobProgressDetails: string;
  fuelCurrent: string;
  fuelQuota: string;
  fuelExtra: string;
  progressPercent: number;
  progressEta: string;
  statusLabel: string;
  statusClass?: string;
  actionType?: 'gps' | 'dispatch';
}

export const DashboardPage: React.FC = () => {
  const selectedKLH = useAppStore((state) => state.selectedKLH);
  const [activeTab, setActiveTab] = useState<'ALL' | 'LSX' | 'LVC' | 'LDX' | 'ATTN'>('ALL');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<DashboardOrderRow | null>(null);
  const [selectedVehicleMap, setSelectedVehicleMap] = useState<string | null>(null);
  const [chartPeriod, setChartPeriod] = useState<'DAY' | 'WEEK' | 'MONTH'>('DAY');
  const [chartPreset, setChartPreset] = useState<'TODAY' | '7DAYS' | 'WEEK' | 'MONTH'>('7DAYS');
  const [ordersList, setOrdersList] = useState<DashboardOrderRow[]>([]);
  const [alertsList, setAlertsList] = useState<DashboardAlertItem[]>([]);
  const [vehiclesList, setVehiclesList] = useState<any[]>([]);
  const [driversCount, setDriversCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        const complexParam = selectedKLH !== 'ALL' ? selectedKLH : undefined;
        const [ordersRes, alertsRes, vehiclesRes, driversRes] = await Promise.allSettled([
          apiClient.get('/dispatch-orders', { params: { limit: 20, complexCode: complexParam } }),
          apiClient.get('/alerts', { params: { limit: 10 } }),
          apiClient.get('/vehicles', { params: { limit: 100, complexCode: complexParam } }),
          apiClient.get('/users', { params: { role: 'DRIVER' } }),
        ]);

        if (ordersRes.status === 'fulfilled') {
          const items = ordersRes.value.data?.data?.items || ordersRes.value.data?.items || ordersRes.value.data || [];
          if (Array.isArray(items)) {
            setOrdersList(
              items.map((o: any) => ({
                id: `DO-${o.id}`,
                orderCode: o.orderCode || o.code || `LSX-${o.id}`,
                orderType: (o.type === 'TRANSPORT' ? 'LVC' : o.type === 'MISSION' ? 'LĐX' : 'LSX') as any,
                orderTypeLabel: o.type === 'TRANSPORT' ? 'Vận chuyển' : o.type === 'MISSION' ? 'Điều động' : 'Lệnh sản xuất',
                orderTagClass: o.type === 'TRANSPORT' ? 'bg-[#e8f1fa] text-[#407fbc]' : 'bg-[#e6f3ec] text-[#1f7a55]',
                shiftTime: o.shift || 'Ca 1',
                plateNumber: o.vehicle?.plate || o.vehicleCode || '—',
                vehicleDesc: o.vehicle?.name || o.vehicleType || 'Phương tiện',
                driverName: o.driver?.fullName || o.driverName || 'Chưa gán',
                driverLicense: o.driver?.licenseClass || 'Chưa xác minh',
                driverPhone: o.driver?.phone || '—',
                jobLocation: o.plotName || o.destination || 'Nông trường',
                jobProgressDetails: o.description || 'Theo dõi tiến độ',
                fuelCurrent: `${o.fuelAssigned || 0} L`,
                fuelQuota: `${o.fuelQuota || 0} L`,
                fuelExtra: 'Định mức tiêu chuẩn',
                progressPercent: o.progress || (['COMPLETED','ACCEPTED','CLOSED'].includes(o.status) ? 100 : ['WORKING','DEPARTED'].includes(o.status) ? 60 : 0),
                progressEta: 'Đang cập nhật',
                statusLabel: ['COMPLETED','ACCEPTED','CLOSED'].includes(o.status) ? 'Hoàn thành' : ['WORKING','DEPARTED'].includes(o.status) ? 'Đang thực hiện' : 'Chờ xuất bến',
                statusClass: ['COMPLETED','ACCEPTED','CLOSED'].includes(o.status) ? 'bg-[#e6f3ec] text-[#1f7a55]' : 'bg-[#fff3df] text-[#b57411]',
                actionType: ['DRAFT','PENDING_APPROVAL','APPROVED','ASSIGNED'].includes(o.status) ? 'dispatch' : 'gps',
              }))
            );
          }
        }

        if (alertsRes.status === 'fulfilled') {
          const items = alertsRes.value.data?.data?.items || alertsRes.value.data?.items || alertsRes.value.data || [];
          if (Array.isArray(items)) {
            setAlertsList(
              items.map((a: any) => ({
                id: `AL-${a.id}`,
                symbol: a.severity === 'CRITICAL' ? '!' : a.severity === 'WARNING' ? '⚡' : '⏱',
                symbolColor: a.severity === 'CRITICAL' ? 'red' : a.severity === 'WARNING' ? 'amber' : 'blue',
                title: a.title || a.message || 'Cảnh báo hệ thống',
                subText: `${a.vehicle?.plate || 'Phương tiện'} · ${a.location || 'Nông trường'}`,
                timeAgo: 'Vừa xong',
              }))
            );
          }
        }

        if (vehiclesRes.status === 'fulfilled') {
          const items = vehiclesRes.value.data?.data?.items || vehiclesRes.value.data?.items || vehiclesRes.value.data || [];
          if (Array.isArray(items)) {
            setVehiclesList(items);
          }
        }

        if (driversRes.status === 'fulfilled') {
          const items = driversRes.value.data?.data?.items || driversRes.value.data?.items || driversRes.value.data || [];
          if (Array.isArray(items)) {
            setDriversCount(items.length);
          }
        }
      } catch (err) {
        setOrdersList([]);
        setAlertsList([]);
      } finally {
        setLoading(false);
      }
    };
    void fetchDashboardData();
  }, [selectedKLH]);

  const filteredOrders = ordersList.filter((order) => {
    if (activeTab === 'LSX' && order.orderType !== 'LSX') return false;
    if (activeTab === 'LVC' && order.orderType !== 'LVC') return false;
    if (activeTab === 'LDX' && order.orderType !== 'LĐX' && order.orderType !== 'CHỜ') return false;
    if (searchKeyword.trim()) {
      const q = searchKeyword.toLowerCase();
      return (
        order.orderCode.toLowerCase().includes(q) ||
        order.plateNumber.toLowerCase().includes(q) ||
        order.driverName.toLowerCase().includes(q) ||
        order.jobLocation.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const activeVehicles = vehiclesList.filter((v) => v.status === 'ACTIVE' || v.status === 'IN_USE').length;
  const maintenanceVehicles = vehiclesList.filter((v) => v.status === 'MAINTENANCE' || v.status === 'REPAIRING').length;
  const idleVehicles = vehiclesList.length - activeVehicles - maintenanceVehicles;

  return (
    <div className="space-y-4 text-slate-800 antialiased pb-6">
      {/* 1. Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-[26px] font-extrabold text-slate-900 font-heading leading-tight">
            Tổng quan Vận hành Cơ giới
          </h1>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button className="h-9 px-3.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-sm transition-colors flex items-center gap-1.5">
            <span>↗</span> Xuất báo cáo
          </button>
          <NavLink to="/lenh-dieu-xe/danh-sach">
            <button className="h-9 px-4 rounded-lg bg-[#135c3f] hover:bg-[#0f4a32] text-xs font-bold text-white shadow-sm transition-colors flex items-center gap-1.5">
              <span>＋</span> Lập lệnh điều xe
            </button>
          </NavLink>
        </div>
      </div>

      {/* 2. Sub-filter bar */}
      <div className="h-13 bg-white border border-slate-200 rounded-xl px-3 py-2 flex flex-wrap items-center justify-between gap-2.5 shadow-sm">
        <div className="flex items-center gap-2 flex-wrap">
          <button className="h-8 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 flex items-center gap-2 transition-colors">
            <span className="text-slate-400">▦</span>
            <span>Hôm nay, {new Date().toLocaleDateString('vi-VN')}</span>
            <span className="text-slate-400 text-[10px]">⌄</span>
          </button>

          <button className="h-8 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 flex items-center gap-2 transition-colors">
            <span className="text-slate-400">⌂</span>
            <span>Tất cả đơn vị trực thuộc</span>
            <span className="text-slate-400 text-[10px]">⌄</span>
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold text-[#1f7a55]">
          <span className="w-2 h-2 rounded-full bg-[#35a56f] animate-pulse" />
          <span>Dữ liệu trực tiếp GPS</span>
        </div>
      </div>

      {/* 3. 4 Top KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Card 1 */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Tổng phương tiện</span>
            <span className="text-[10px] font-extrabold text-[#1f7a55] bg-[#e5f3ec] px-2 py-0.5 rounded-full">
              Hệ thống
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-heading mt-2.5 mb-1 tracking-tight">
            {vehiclesList.length}
          </div>
          <div className="text-[11px] text-slate-500 leading-snug">
            {vehiclesList.length > 0
              ? `${activeVehicles} đang chạy / ${Math.max(0, idleVehicles)} dừng / ${maintenanceVehicles} BTSC`
              : 'Chưa có phương tiện đăng ký'}
          </div>
        </div>

        {/* Card 2 */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Lực lượng lái xe</span>
            <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
              {driversCount} nhân sự
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-heading mt-2.5 mb-1 tracking-tight">
            {driversCount}
          </div>
          <div className="text-[11px] text-slate-500 leading-snug">
            {driversCount > 0 ? 'Đội ngũ lái xe & vận hành máy móc' : 'Chưa có dữ liệu lái xe'}
          </div>
        </div>

        {/* Card 3 */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Lệnh điều xe hôm nay</span>
            <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
              Hôm nay
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-heading mt-2.5 mb-1 tracking-tight">
            {ordersList.length}
          </div>
          <div className="text-[11px] text-slate-500 leading-snug">
            {ordersList.length > 0 ? `${ordersList.filter(o => o.statusLabel === 'Đang thực hiện').length} lệnh đang thực hiện trên đồng` : 'Chưa có lệnh nào trong ngày'}
          </div>
        </div>

        {/* Card 4 */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Cảnh báo tồn đọng</span>
            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${alertsList.length > 0 ? 'text-rose-700 bg-rose-50 border border-rose-200/60' : 'text-emerald-700 bg-emerald-50'}`}>
              {alertsList.length > 0 ? `${alertsList.length} cảnh báo` : 'An toàn'}
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-heading mt-2.5 mb-1 tracking-tight">
            {alertsList.length}
          </div>
          <div className="text-[11px] text-slate-500 leading-snug">
            {alertsList.length > 0 ? 'Cảnh báo cần xử lý trên hệ thống' : 'Không có cảnh báo vi phạm tồn đọng'}
          </div>
        </div>
      </div>

      {/* 4. Split Section: Map (Left) + Unresolved Alerts (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
        {/* Left: GPS Realtime Map Card (~7 cols) */}
        <div className="lg:col-span-7 xl:col-span-8 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm flex flex-col justify-between">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold text-slate-900 font-heading">
                Bản đồ GPS Realtime toàn đội xe
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Giám sát vị trí và trạng thái hoạt động của phương tiện
              </p>
            </div>
            <NavLink
              to="/gps/realtime"
              className="text-xs font-bold text-[#1f7a55] hover:underline flex items-center gap-1 shrink-0"
            >
              Mở bản đồ lớn ↗
            </NavLink>
          </div>

          {/* Interactive Agricultural Estate Map Canvas */}
          <div className="relative w-full h-[360px] bg-[#eef0e9] overflow-hidden select-none">
            {/* Grid Pattern */}
            <div
              className="absolute inset-0 opacity-80 pointer-events-none"
              style={{
                backgroundImage: `
                  linear-gradient(31deg, transparent 47%, #d7ddd5 48%, #d7ddd5 50%, transparent 51%),
                  linear-gradient(92deg, transparent 47%, #dde2da 48%, #dde2da 50%, transparent 51%)
                `,
                backgroundSize: '145px 100px',
              }}
            />

            {/* Farm Region Shapes */}
            <div className="absolute w-[240px] h-[110px] -left-8 top-32 rounded-[45%] border-2 border-[#dce3d6] bg-[#e2eadc]/70 pointer-events-none rotate-[-12deg]" />
            <div className="absolute w-[300px] h-[120px] -right-16 top-12 rounded-[45%] border-2 border-[#dce3d6] bg-[#e2eadc]/70 pointer-events-none rotate-[19deg]" />

            {/* SVG Roads */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 900 390" preserveAspectRatio="none">
              <path
                d="M44 282 C170 236, 190 290, 320 210 S535 92, 655 170 S785 300, 860 242"
                fill="none"
                stroke="#ffffff"
                strokeWidth="11"
                strokeLinecap="round"
                className="drop-shadow-sm"
              />
              <path
                d="M84 72 C210 120, 300 70, 410 145 S624 270, 808 82"
                fill="none"
                stroke="#cad3c9"
                strokeWidth="5"
                strokeDasharray="6 8"
                strokeLinecap="round"
              />
            </svg>

            {/* Farm Region Labels */}
            <div className="absolute left-[13%] top-[18%] text-[10px] font-bold text-slate-500 pointer-events-none">
              XN Chuối 1
            </div>
            <div className="absolute left-[45%] top-[28%] text-[10px] font-bold text-slate-500 pointer-events-none">
              XN Chuối 2
            </div>
            <div className="absolute right-[13%] top-[23%] text-[10px] font-bold text-slate-500 pointer-events-none">
              Packhouse 2
            </div>
            <div className="absolute right-[18%] bottom-[15%] text-[10px] font-bold text-slate-500 pointer-events-none">
              Xưởng BTSC
            </div>

            {/* Vehicle Markers */}
            {vehiclesList.length === 0 ? (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="bg-white/90 backdrop-blur-md px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 shadow-sm border border-slate-200">
                  Chưa có dữ liệu GPS trực tuyến từ phương tiện
                </div>
              </div>
            ) : (
              vehiclesList.slice(0, 15).map((v, idx) => (
                <button
                  key={v.id || idx}
                  onClick={() => setSelectedVehicleMap(`${v.plate || v.code} • ${v.name || v.vehicleType || 'Phương tiện'} • Trạng thái: ${v.status || 'Hoạt động'}`)}
                  style={{ left: `${20 + (idx * 17) % 65}%`, top: `${25 + (idx * 23) % 55}%` }}
                  className={`absolute w-7 h-7 rounded-lg text-white font-bold text-[10px] flex items-center justify-center border-2 border-white shadow-md hover:scale-125 transition-transform ${
                    v.status === 'MAINTENANCE' ? 'bg-[#d94b4b]' : v.status === 'ACTIVE' ? 'bg-[#1f7a55]' : 'bg-[#407fbc]'
                  }`}
                  title={`${v.plate || v.code} • ${v.name || 'Phương tiện'}`}
                >
                  {String(v.plate || v.code || idx + 1).slice(-2)}
                </button>
              ))
            )}

            {/* Zoom Buttons */}
            <div className="absolute right-3 top-3 flex flex-col bg-white rounded-md shadow-sm border border-slate-200 overflow-hidden">
              <button className="w-7 h-7 flex items-center justify-center text-xs font-bold text-slate-700 hover:bg-slate-50 border-b border-slate-200">
                ＋
              </button>
              <button className="w-7 h-7 flex items-center justify-center text-xs font-bold text-slate-700 hover:bg-slate-50">
                −
              </button>
            </div>

            {/* Bottom Legend */}
            <div className="absolute left-3 bottom-3 bg-white/95 backdrop-blur-sm rounded-lg px-3 py-1.5 border border-slate-200 shadow-sm flex items-center gap-3 text-[10px] font-bold text-slate-600">
              <span className="flex items-center gap-1.5">
                <i className="w-2 h-2 rounded-full bg-[#1f7a55] inline-block" /> Đang chạy lệnh {activeVehicles}
              </span>
              <span className="flex items-center gap-1.5">
                <i className="w-2 h-2 rounded-full bg-[#407fbc] inline-block" /> Dừng đỗ {Math.max(0, idleVehicles)}
              </span>
              <span className="flex items-center gap-1.5">
                <i className="w-2 h-2 rounded-full bg-[#d94b4b] inline-block" /> BTSC {maintenanceVehicles}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Unresolved Alerts List (~5 cols) */}
        <div className="lg:col-span-5 xl:col-span-4 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm flex flex-col justify-between">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold text-slate-900 font-heading">
                Cảnh báo chưa xử lý (Phân cấp ưu tiên)
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {alertsList.length} cảnh báo cần theo dõi trên hệ thống
              </p>
            </div>
            <NavLink
              to="/canh-bao/chua-xu-ly"
              className="text-xs font-bold text-[#1f7a55] hover:underline shrink-0"
            >
              Xem tất cả
            </NavLink>
          </div>

          <div className="p-3 divide-y divide-slate-100 flex-1 overflow-y-auto max-h-[360px]">
            {alertsList.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                Không có cảnh báo tồn đọng nào cần xử lý
              </div>
            ) : (
              alertsList.map((alert) => (
                <div key={alert.id} className="py-3 flex items-start gap-3 hover:bg-slate-50/70 rounded-lg px-2 transition-colors">
                  <div
                    className={`w-7 h-7 rounded-md font-bold text-xs flex items-center justify-center shrink-0 mt-0.5 ${
                      alert.symbolColor === 'red'
                        ? 'bg-[#fbeaea] text-[#d94b4b]'
                        : alert.symbolColor === 'amber'
                        ? 'bg-[#fff3df] text-[#e59e2f]'
                        : 'bg-[#eaf2fa] text-[#407fbc]'
                    }`}
                  >
                    {alert.symbol}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-bold text-slate-900 leading-snug line-clamp-1">
                      {alert.title}
                    </h4>
                    <p className="text-[10px] text-slate-500 truncate mt-0.5">
                      {alert.subText}
                    </p>
                  </div>
                  <span className="text-[10px] text-slate-400 font-medium shrink-0 whitespace-nowrap">
                    {alert.timeAgo}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* 5. Horizontal Orders & Active Transport Section */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        {/* Header & Tabs */}
        <div className="p-4 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm font-bold text-slate-900 font-heading flex items-center gap-1.5">
                <span>▦</span> Lệnh điều xe & Vận chuyển hôm nay
              </h2>
              <span className="text-[10px] font-bold bg-[#e6f3ec] text-[#1f7a55] px-2 py-0.5 rounded-full">
                {ordersList.length} lệnh trong ngày
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Giám sát tiến độ realtime qua GPS, đồng hồ giờ máy & App Lái xe (Tự động kiểm tra GPLX & Cấp dầu)
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setActiveTab('ALL')}
              className={`h-8 px-3 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === 'ALL'
                  ? 'bg-[#135c3f] text-white shadow-sm'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <span>Tất cả</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${activeTab === 'ALL' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>
                {ordersList.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('LSX')}
              className={`h-8 px-3 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === 'LSX'
                  ? 'bg-[#135c3f] text-white shadow-sm'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <span>🚜 Sản xuất (LSX)</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${activeTab === 'LSX' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>
                {ordersList.filter(o => o.orderType === 'LSX').length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('LVC')}
              className={`h-8 px-3 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === 'LVC'
                  ? 'bg-[#135c3f] text-white shadow-sm'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <span>🚛 Vận chuyển (LVC)</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${activeTab === 'LVC' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>
                {ordersList.filter(o => o.orderType === 'LVC').length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('LDX')}
              className={`h-8 px-3 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === 'LDX'
                  ? 'bg-[#135c3f] text-white shadow-sm'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <span>🔧 Điều động cơ giới (LĐX)</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${activeTab === 'LDX' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>
                {ordersList.filter(o => o.orderType === 'LĐX' || o.orderType === 'CHỜ').length}
              </span>
            </button>
          </div>
        </div>

        {/* Search & Action bar */}
        <div className="px-4 py-2.5 bg-slate-50/70 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 flex-1 max-w-sm">
            <div className="relative w-full">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">🔍</span>
              <input
                type="text"
                placeholder="Tìm mã lệnh, xe, lái xe, lô..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                className="w-full pl-8 pr-3 py-1 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-700"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <NavLink to="/lenh-dieu-xe/danh-sach">
              <button className="h-7 px-3 rounded-lg bg-[#135c3f] hover:bg-[#0f4a32] text-[11px] font-bold text-white transition-colors">
                ＋ Lập lệnh mới
              </button>
            </NavLink>
            <NavLink to="/lenh-dieu-xe/danh-sach" className="text-xs font-bold text-[#1f7a55] hover:underline">
              Xem tất cả ↗
            </NavLink>
          </div>
        </div>

        {/* 5-KPI Strip Bar */}
        <div className="grid grid-cols-2 md:grid-cols-5 divide-x divide-y md:divide-y-0 divide-slate-200/60 bg-[#fafbfa] border-b border-slate-200 text-xs">
          <div className="p-3 flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-sm text-[#1f7a55] shrink-0">
              📋
            </span>
            <div>
              <small className="text-[9px] text-slate-500 block uppercase font-bold tracking-wider">Tổng lệnh phát hành</small>
              <strong className="text-slate-900 font-bold text-xs">{ordersList.length} lệnh</strong>
            </div>
          </div>

          <div className="p-3 flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-sm text-[#1f7a55] shrink-0">
              🚜
            </span>
            <div>
              <small className="text-[9px] text-slate-500 block uppercase font-bold tracking-wider">Đang làm việc tại Lô/Thửa</small>
              <strong className="text-slate-900 font-bold text-xs">{ordersList.filter(o => o.orderType === 'LSX').length} phương tiện cơ giới</strong>
            </div>
          </div>

          <div className="p-3 flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-sm text-[#407fbc] shrink-0">
              🚛
            </span>
            <div>
              <small className="text-[9px] text-slate-500 block uppercase font-bold tracking-wider">Đang vận chuyển trên đường</small>
              <strong className="text-slate-900 font-bold text-xs">{ordersList.filter(o => o.orderType === 'LVC').length} chuyến xe</strong>
            </div>
          </div>

          <div className="p-3 flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-sm text-[#e59e2f] shrink-0">
              ⏱
            </span>
            <div>
              <small className="text-[9px] text-slate-500 block uppercase font-bold tracking-wider">Chờ duyệt & Xuất bến</small>
              <strong className="text-slate-900 font-bold text-xs">{ordersList.filter(o => o.statusLabel === 'Chờ xuất bến').length} lệnh</strong>
            </div>
          </div>

          <div className="p-3 flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-sm text-[#1f7a55] shrink-0">
              🛡
            </span>
            <div>
              <small className="text-[9px] text-slate-500 block uppercase font-bold tracking-wider">GPLX & An toàn kỹ thuật</small>
              <strong className="text-slate-900 font-bold text-xs">100% Đạt chuẩn</strong>
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-[#fafbfa] border-b border-slate-200 text-slate-500 font-bold text-[9px] uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">MÃ LỆNH & LOẠI LỆNH</th>
                <th className="py-3 px-4">PHƯƠNG TIỆN & THIẾT BỊ</th>
                <th className="py-3 px-4">LÁI XE / VẬN HÀNH</th>
                <th className="py-3 px-4">CÔNG VIỆC / LÔ THỬA / LỘ TRÌNH</th>
                <th className="py-3 px-4">NHIÊN LIỆU & ĐỊNH MỨC</th>
                <th className="py-3 px-4">TIẾN ĐỘ THỰC HIỆN</th>
                <th className="py-3 px-4">TRẠNG THÁI & HÀNH ĐỘNG</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-xs text-slate-400">
                    Không có lệnh điều xe hoặc chuyến vận chuyển nào phù hợp
                  </td>
                </tr>
              ) : (
                filteredOrders.map((row) => (
                  <tr key={row.id} className="hover:bg-[#f8faf8] transition-colors">
                    <td className="py-3 px-4">
                      <strong className="text-slate-900 font-bold block text-xs">{row.orderCode}</strong>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${row.orderTagClass}`}>
                          {row.orderTypeLabel}
                        </span>
                        <span className="text-[10px] text-slate-400">{row.shiftTime}</span>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <strong className="text-slate-900 font-bold block text-xs">{row.plateNumber}</strong>
                      <span className="text-[10px] text-slate-500 block">{row.vehicleDesc}</span>
                    </td>

                    <td className="py-3 px-4">
                      <strong className="text-slate-900 block text-xs">{row.driverName}</strong>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        <span className="text-[#1f7a55] font-bold">{row.driverLicense}</span> · {row.driverPhone}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <strong className="text-slate-900 block text-xs">{row.jobLocation}</strong>
                      <span className="text-[10px] text-slate-500 block">{row.jobProgressDetails}</span>
                    </td>

                    <td className="py-3 px-4">
                      <strong className="text-slate-900 block text-xs">{row.fuelCurrent} / {row.fuelQuota}</strong>
                      <span className="text-[10px] text-slate-500 block">{row.fuelExtra}</span>
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div className="bg-[#1f7a55] h-full rounded-full" style={{ width: `${row.progressPercent}%` }} />
                        </div>
                        <b className="text-xs text-slate-900">{row.progressPercent}%</b>
                      </div>
                      <span className="text-[10px] text-slate-400 block mt-0.5">{row.progressEta}</span>
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${row.statusClass || 'bg-[#e6f3ec] text-[#1f7a55]'}`}>
                          {row.statusLabel}
                        </span>
                        {row.actionType === 'dispatch' ? (
                          <button
                            onClick={() => setSelectedOrder(row)}
                            className="h-6 px-2 rounded bg-[#135c3f] hover:bg-[#0f4a32] text-white font-bold text-[10px] transition-colors"
                          >
                            ✓ Xuất bến
                          </button>
                        ) : (
                          <button
                            onClick={() => setSelectedOrder(row)}
                            className="h-6 px-2 rounded border border-slate-200 bg-white hover:bg-slate-50 text-[10px] font-semibold text-[#1f7a55] transition-colors"
                          >
                            ⌖ GPS
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer */}
        <div className="p-3.5 bg-[#fafbfa] border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-slate-500">
          <span>Hiển thị <b>{filteredOrders.length}</b> lệnh điều xe & vận chuyển</span>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <button className="w-6 h-6 rounded border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:bg-slate-50">‹</button>
              <button className="w-6 h-6 rounded bg-[#135c3f] text-white text-xs font-bold">1</button>
              <button className="w-6 h-6 rounded border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:bg-slate-50">2</button>
              <button className="w-6 h-6 rounded border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:bg-slate-50">3</button>
              <span className="text-slate-400 text-xs px-1">...</span>
              <button className="w-6 h-6 rounded border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:bg-slate-50">9</button>
              <button className="w-6 h-6 rounded border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:bg-slate-50">›</button>
            </div>
            <NavLink to="/lenh-dieu-xe/danh-sach" className="font-bold text-[#1f7a55] hover:underline">
              Mở phân hệ Lệnh điều xe →
            </NavLink>
          </div>
        </div>
      </div>

      {/* 6. Operations & Vehicle Categories Allocation Section */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900 font-heading">
              Hiệu suất vận hành theo chu kỳ & Tình trạng điều độ các chủng loại xe cơ giới
            </h2>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Thống kê tỷ lệ hoàn thành sản lượng kế hoạch vs thực tế và cơ cấu {vehiclesList.length} phương tiện
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button className="h-8 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-[11px] font-semibold text-slate-700 transition-colors">
              ↗ Xuất Excel
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="p-3 bg-[#fafbfa] border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-1 bg-[#edf1ee] p-0.5 rounded-lg">
            <button
              onClick={() => setChartPeriod('DAY')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${
                chartPeriod === 'DAY' ? 'bg-white text-[#135c3f] shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              📅 Theo ngày
            </button>
            <button
              onClick={() => setChartPeriod('WEEK')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${
                chartPeriod === 'WEEK' ? 'bg-white text-[#135c3f] shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              🗓 Theo tuần
            </button>
            <button
              onClick={() => setChartPeriod('MONTH')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${
                chartPeriod === 'MONTH' ? 'bg-white text-[#135c3f] shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              📆 Theo tháng
            </button>
          </div>
        </div>

        {/* Split Grid: Bar Chart + Categories Table */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-4">
          {/* Left Chart: Weekly Completion */}
          <div className="lg:col-span-5 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-600 uppercase tracking-tight">
                Biểu đồ hoàn thành kế hoạch
              </span>
            </div>

            <div className="h-56 flex items-center justify-center border border-slate-100 rounded-xl bg-slate-50/50">
              <div className="text-center text-xs text-slate-400 p-4">
                Chưa có dữ liệu chu kỳ sản xuất để vẽ biểu đồ
              </div>
            </div>
          </div>

          {/* Right Table: Categories Fleet Status */}
          <div className="lg:col-span-7 overflow-x-auto">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-600 uppercase tracking-tight">
                Phân bổ trạng thái các chủng loại xe cơ giới ({vehiclesList.length} xe)
              </span>
            </div>

            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-[#fafbfa] border-b border-slate-200 text-slate-500 font-bold text-[8px] uppercase tracking-wider">
                <tr>
                  <th className="py-2 px-2.5">CHỦNG LOẠI XE</th>
                  <th className="py-2 px-2 text-center">TỔNG</th>
                  <th className="py-2 px-2 text-center text-[#1f7a55]">ĐÃ GIAO VIỆC</th>
                  <th className="py-2 px-2 text-center text-[#b57411]">CHƯA GIAO VIỆC</th>
                  <th className="py-2 px-2 text-center text-rose-700">BẢO DƯỠNG</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[11px]">
                {vehiclesList.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-xs text-slate-400">
                      Chưa có dữ liệu phân bổ chủng loại xe
                    </td>
                  </tr>
                ) : (
                  <tr>
                    <td className="py-2 px-2.5 font-bold text-slate-800">Tất cả chủng loại</td>
                    <td className="py-2 px-2 text-center font-bold">{vehiclesList.length}</td>
                    <td className="py-2 px-2 text-center text-[#1f7a55] font-bold">{activeVehicles} xe</td>
                    <td className="py-2 px-2 text-center text-[#b57411] font-bold">{Math.max(0, idleVehicles)} xe</td>
                    <td className="py-2 px-2 text-center text-rose-700 font-bold">{maintenanceVehicles} xe</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Map Vehicle Click Modal */}
      {selectedVehicleMap && (
        <Modal
          isOpen={!!selectedVehicleMap}
          onClose={() => setSelectedVehicleMap(null)}
          title="Thông Tin Giám Sát Phương Tiện GPS"
          subtitle={selectedVehicleMap}
          size="sm"
        >
          <div className="space-y-3 text-xs text-slate-700">
            <p className="bg-slate-50 p-3 rounded-xl border border-slate-200 leading-relaxed">
              Xe đang truyền tín hiệu GPS 4G định kỳ 30 giây từ khu vực nông trường KLH Koun Mom. Tốc độ, mức dầu que đo và giờ máy PTO đều trong ngưỡng kiểm soát kỹ thuật.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setSelectedVehicleMap(null)}>
                Đóng
              </Button>
              <NavLink to="/gps/realtime">
                <Button variant="primary" size="sm">
                  Xem bản đồ trực tuyến
                </Button>
              </NavLink>
            </div>
          </div>
        </Modal>
      )}

      {/* Order Detail Modal */}
      {selectedOrder && (
        <Modal
          isOpen={!!selectedOrder}
          onClose={() => setSelectedOrder(null)}
          title={`Chi Tiết Lệnh: ${selectedOrder.orderCode}`}
          subtitle={`${selectedOrder.orderTypeLabel} · Xe ${selectedOrder.plateNumber} · ${selectedOrder.driverName}`}
          size="md"
        >
          <div className="space-y-3.5 text-xs text-slate-700">
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
              <div className="flex justify-between"><span>Công việc / Lô thửa:</span> <b className="text-slate-900">{selectedOrder.jobLocation}</b></div>
              <div className="flex justify-between"><span>Lái xe vận hành:</span> <b>{selectedOrder.driverName} ({selectedOrder.driverLicense})</b></div>
              <div className="flex justify-between"><span>Nhiên liệu tiêu thụ:</span> <b className="text-[#1f7a55]">{selectedOrder.fuelCurrent} / {selectedOrder.fuelQuota} ({selectedOrder.fuelExtra})</b></div>
              <div className="flex justify-between"><span>Tiến độ thực hiện:</span> <b className="text-[#135c3f]">{selectedOrder.progressPercent}% ({selectedOrder.jobProgressDetails})</b></div>
              <div className="flex justify-between"><span>Dự kiến ETA:</span> <span>{selectedOrder.progressEta}</span></div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setSelectedOrder(null)}>
                Đóng
              </Button>
              <NavLink to="/lenh-dieu-xe/danh-sach">
                <Button variant="primary" size="sm">
                  Mở chi tiết lệnh
                </Button>
              </NavLink>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
