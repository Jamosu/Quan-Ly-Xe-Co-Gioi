import React, { useState, useEffect } from 'react';
import { FilterBar } from '../../components/filters/FilterBar';
import { DataTable, Column } from '../../components/data-display/DataTable';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { StatCard } from '../../components/data-display/StatCard';
import { KPIGrid } from '../../components/data-display/KPIGrid';
import { apiClient } from '../../api/client';
import {
  Radio,
  Plus,
  Download,
  Wifi,
  WifiOff,
  Fuel,
  Activity,
  CheckCircle2,
} from 'lucide-react';

interface GPSSensorItem {
  id: string;
  imei: string;
  model: string;
  vehicleCode: string;
  vehicleDesc: string;
  sensorFeatures: string;
  simNumber: string;
  telecomProvider: string;
  gpsSignal: string;
  satellites: number;
  lastUpdate: string;
  status: 'online' | 'offline';
}

export const GPSSensorsPage: React.FC = () => {
  const [selectedSensor, setSelectedSensor] = useState<GPSSensorItem | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [sensorList, setSensorList] = useState<GPSSensorItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSensors = async () => {
      setLoading(true);
      try {
        const res = await apiClient.get('/vehicles', { params: { limit: 100 } });
        const items = res.data?.data?.items || res.data?.items || res.data || [];
        if (Array.isArray(items) && items.length > 0) {
          const gpsVehicles = items.filter((v: any) => Boolean(v.gpsImei));
          setSensorList(
            gpsVehicles.map((v: any, idx: number) => ({
              id: `G${v.id || idx}`,
              imei: v.gpsImei || '—',
              model: 'TMS-T90 4G Telemetry',
              vehicleCode: v.code,
              vehicleDesc: `${v.name} (${v.plate || 'Chưa biển'})`,
              sensorFeatures: v.fuelSensorImei ? 'GPS 4G + Cảm biến dầu siêu âm' : 'GPS 4G Telemetry',
              simNumber: '088.xxx.xxxx',
              telecomProvider: 'Metfone Campuchia',
              gpsSignal: 'Tốt (16 Vệ tinh)',
              satellites: 16,
              lastUpdate: v.lastGpsUpdate ? new Date(v.lastGpsUpdate).toLocaleString('vi-VN') : 'Vừa cập nhật',
              status: v.status === 'HOAT_DONG' ? 'online' : 'offline',
            }))
          );
        } else {
          setSensorList([]);
        }
      } catch (err) {
        setSensorList([]);
      } finally {
        setLoading(false);
      }
    };
    void fetchSensors();
  }, []);

  const columns: Column<GPSSensorItem>[] = [
    {
      key: 'imei',
      title: 'MÃ THIẾT BỊ / IMEI',
      sortable: true,
      render: (row) => (
        <div>
          <strong className="text-primary font-mono font-bold block">IMEI: {row.imei}</strong>
          <span className="text-[10px] text-slate-500">Model: {row.model}</span>
        </div>
      ),
    },
    {
      key: 'vehicleCode',
      title: 'XE GẮN KÈM',
      sortable: true,
      render: (row) => (
        <div>
          <span className="font-bold text-slate-900 block">{row.vehicleCode}</span>
          <span className="text-[10px] text-slate-500">{row.vehicleDesc}</span>
        </div>
      ),
    },
    { key: 'sensorFeatures', title: 'LOẠI THIẾT BỊ & CẢM BIẾN', render: (row) => <span className="font-medium text-xs text-slate-700">{row.sensorFeatures}</span> },
    {
      key: 'simNumber',
      title: 'SỐ SIM / NHÀ MẠNG',
      render: (row) => (
        <div>
          <span className="font-semibold text-slate-800 block">{row.simNumber}</span>
          <span className="text-[10px] text-slate-500">{row.telecomProvider}</span>
        </div>
      ),
    },
    {
      key: 'gpsSignal',
      title: 'TÍN HIỆU GPS',
      render: (row) => row.status === 'online' ? (
        <span className="font-bold text-emerald-700 text-xs">● {row.gpsSignal}</span>
      ) : (
        <span className="font-bold text-rose-600 text-xs">✕ {row.gpsSignal}</span>
      ),
    },
    { key: 'lastUpdate', title: 'CẬP NHẬT CUỐI' },
    {
      key: 'status',
      title: 'TRẠNG THÁI',
      render: (row) => row.status === 'online' ? <Badge variant="green" dot>Online</Badge> : <Badge variant="red" dot>Mất kết nối</Badge>,
    },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 font-heading">
            Thiết bị GPS & Cảm biến que đo
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Quản lý thiết bị định vị GPS 4G TMS-T90, cảm biến nhiên liệu que đo siêu âm DUT-E và cảm biến PTO.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="md" icon={<Download className="w-4 h-4" />}>
            Xuất danh sách SIM
          </Button>
          <Button variant="primary" size="md" icon={<Plus className="w-4 h-4" />} onClick={() => setShowAddModal(true)}>
            Gán thiết bị mới
          </Button>
        </div>
      </div>

      {/* Global FilterBar */}
      <FilterBar
        extraFilters={
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Trạng thái: Online (122 xe)</span>
          </div>
        }
      />

      {/* 4 Stats Cards matching Mockup */}
      <KPIGrid cols={4}>
        <StatCard
          label="GPS đang Online"
          value={`${sensorList.filter((s) => s.status === 'online').length} thiết bị`}
          subValue="Đang truyền tín hiệu"
          icon={<Wifi className="w-5 h-5" />}
          iconBgColor="bg-emerald-50"
          iconColor="text-primary"
        />
        <StatCard
          label="Mất kết nối / Offline"
          value={`${sensorList.filter((s) => s.status === 'offline').length} thiết bị`}
          subValue="Cần kiểm tra nguồn/SIM"
          icon={<WifiOff className="w-5 h-5" />}
          iconBgColor="bg-rose-50"
          iconColor="text-rose-600"
        />
        <StatCard
          label="Cảm biến que đo dầu siêu âm"
          value={`${sensorList.filter((s) => s.sensorFeatures.includes('dầu')).length} bộ`}
          subValue="Đang kết nối Telemetry"
          icon={<Fuel className="w-5 h-5" />}
          iconBgColor="bg-sky-50"
          iconColor="text-sky-600"
        />
        <StatCard
          label="Tổng thiết bị GPS đã gán"
          value={`${sensorList.length} thiết bị`}
          subValue="Gắn trên xe cơ giới"
          icon={<Activity className="w-5 h-5" />}
          iconBgColor="bg-amber-50"
          iconColor="text-amber-600"
        />
      </KPIGrid>

      {/* DataTable */}
      <DataTable
        title="Danh Sách Thiết Bị Viễn Thông GPS & Cảm Biến Telemetry"
        subtitle="Quản lý định vị, SIM data 4G Metfone/Viettel và que đo nhiên liệu lắp trên xe"
        columns={columns}
        data={sensorList}
        isLoading={loading}
        onRowClick={(row) => setSelectedSensor(row)}
      />

      {/* Detail Modal */}
      {selectedSensor && (
        <Modal
          isOpen={!!selectedSensor}
          onClose={() => setSelectedSensor(null)}
          title={`Chi Tiết Thiết Bị: IMEI ${selectedSensor.imei}`}
          subtitle={`Xe gắn kèm: ${selectedSensor.vehicleCode} (${selectedSensor.vehicleDesc})`}
          size="md"
        >
          <div className="space-y-3.5 text-xs text-slate-700">
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
              <div className="flex justify-between"><span>Model thiết bị:</span> <b>{selectedSensor.model}</b></div>
              <div className="flex justify-between"><span>Số SIM Data:</span> <b>{selectedSensor.simNumber} ({selectedSensor.telecomProvider})</b></div>
              <div className="flex justify-between"><span>Tính năng cảm biến:</span> <span>{selectedSensor.sensorFeatures}</span></div>
              <div className="flex justify-between"><span>Tín hiệu vệ tinh:</span> <b className="text-emerald-700">{selectedSensor.gpsSignal}</b></div>
              <div className="flex justify-between"><span>Cập nhật gần nhất:</span> <span>{selectedSensor.lastUpdate}</span></div>
            </div>
            <div className="flex justify-end pt-2">
              <Button variant="primary" size="sm" onClick={() => setSelectedSensor(null)}>
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
        title="Gán Thiết Bị GPS & Cảm Biến Mới"
        subtitle="Đăng ký mã IMEI và SIM data 4G vào hệ thống giám sát"
        size="md"
      >
        <div className="space-y-3 text-xs">
          <div>
            <label className="font-bold text-slate-700 block mb-1">Số IMEI thiết bị GPS (15 chữ số):</label>
            <input type="text" placeholder="Ví dụ: 864291048821909" className="w-full p-2 border border-slate-200 rounded-xl bg-slate-50 font-mono" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Xe cơ giới gắn kèm:</label>
              <select className="w-full p-2 border border-slate-200 rounded-xl bg-slate-50">
                <option>XC-JD-024 (John Deere 140HP)</option>
                <option>XT-HW-102 (Howo 4 chân)</option>
                <option>XC-KB-053 (Kubota M7040)</option>
              </select>
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Số SIM data 4G:</label>
              <input type="text" placeholder="Ví dụ: 088.992.3399" className="w-full p-2 border border-slate-200 rounded-xl bg-slate-50" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-3">
            <Button variant="outline" size="sm" onClick={() => setShowAddModal(false)}>Hủy</Button>
            <Button variant="primary" size="sm" onClick={() => setShowAddModal(false)}>Lưu & Kích Hoạt</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

