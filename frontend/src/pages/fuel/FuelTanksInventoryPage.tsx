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
  Fuel,
  Plus,
  Download,
  CheckCircle2,
  AlertTriangle,
  Activity,
} from 'lucide-react';

interface VehicleFuelLevelItem {
  id: string;
  plateNumber: string;
  vehicleName: string;
  vehicleType: string;
  teamUnit: string;
  driverName: string;
  tankCapacity: number;
  currentFuelLiters: number;
  fillPercent: number;
  quotaRate: string;
  consumedToday: string;
  remainingWorkHours: string;
  sensorStatus: 'normal' | 'low' | 'drop_alert' | 'full';
  statusLabel: string;
  lastUpdated: string;
}

export const FuelTanksInventoryPage: React.FC = () => {
  const [dataList, setDataList] = useState<VehicleFuelLevelItem[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleFuelLevelItem | null>(null);
  const [showAddVoucherModal, setShowAddVoucherModal] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVehicles = async () => {
      setLoading(true);
      try {
        const res = await apiClient.get('/vehicles', { params: { limit: 100 } });
        const items = res.data?.data?.items || res.data?.items || res.data || [];
        if (Array.isArray(items) && items.length > 0) {
          setDataList(
            items.map((v: any) => {
              const capacity = v.fuelCapacity || 150;
              const current = v.fuelLevel || 0;
              const percent = capacity > 0 ? (current / capacity) * 100 : 0;
              return {
                id: `VF-${v.id}`,
                plateNumber: v.plate || v.code,
                vehicleName: v.name,
                vehicleType: v.type?.name || 'Phương tiện',
                teamUnit: v.unit || 'Đội xe nông trường',
                driverName: v.driver?.fullName || 'Chưa gán',
                tankCapacity: capacity,
                currentFuelLiters: current,
                fillPercent: Number(percent.toFixed(1)),
                quotaRate: `${v.standardQuota || 0} L/định mức`,
                consumedToday: '0 L',
                remainingWorkHours: '~0 giờ',
                sensorStatus: percent < 20 ? 'low' : 'normal',
                statusLabel: percent < 20 ? 'Sắp cạn dầu' : 'Bình thường',
                lastUpdated: v.updatedAt ? new Date(v.updatedAt).toLocaleTimeString('vi-VN') : '—',
              };
            })
          );
        } else {
          setDataList([]);
        }
      } catch (err) {
        setDataList([]);
      } finally {
        setLoading(false);
      }
    };
    void fetchVehicles();
  }, []);

  const columns: Column<VehicleFuelLevelItem>[] = [
    {
      key: 'plateNumber',
      title: 'MÃ XE & BIỂN SỐ',
      render: (row) => (
        <div>
          <div className="font-bold text-slate-900">{row.plateNumber}</div>
          <div className="text-[11px] text-slate-500 font-medium">{row.vehicleName}</div>
        </div>
      ),
    },
    {
      key: 'teamUnit',
      title: 'CHỦNG LOẠI & ĐỘI XE',
      render: (row) => (
        <div>
          <div className="font-semibold text-slate-800">{row.vehicleType}</div>
          <div className="text-[11px] text-slate-500">{row.teamUnit}</div>
        </div>
      ),
    },
    {
      key: 'driverName',
      title: 'LÁI XE / VẬN HÀNH',
      render: (row) => <span className="font-medium text-slate-800">{row.driverName}</span>,
    },
    {
      key: 'tankCapacity',
      title: 'DUNG TÍCH BÌNH',
      render: (row) => <span className="font-semibold text-slate-700">{row.tankCapacity} Lít</span>,
    },
    {
      key: 'currentFuelLiters',
      title: 'MỨC DẦU TRONG BÌNH (QUE ĐO GPS)',
      render: (row) => {
        let barColor = 'bg-[#1f7a55]';
        let textColor = 'text-[#1f7a55]';
        if (row.sensorStatus === 'low') {
          barColor = 'bg-amber-500';
          textColor = 'text-amber-600';
        } else if (row.sensorStatus === 'drop_alert') {
          barColor = 'bg-rose-500';
          textColor = 'text-rose-600';
        }

        return (
          <div className="space-y-1 min-w-[160px]">
            <div className="flex items-center justify-between text-xs">
              <strong className={`font-bold ${textColor}`}>
                {row.currentFuelLiters} L / {row.tankCapacity} L
              </strong>
              <span className="font-semibold text-slate-600">{row.fillPercent}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
              <div
                className={`h-full rounded-full ${barColor} transition-all duration-300`}
                style={{ width: `${Math.min(row.fillPercent, 100)}%` }}
              />
            </div>
          </div>
        );
      },
    },
    {
      key: 'quotaRate',
      title: 'ĐỊNH MỨC KHOÁN',
      render: (row) => <span className="text-slate-600 font-medium">{row.quotaRate}</span>,
    },
    {
      key: 'consumedToday',
      title: 'TIÊU HAO CA HÔM NAY',
      render: (row) => <span className="font-semibold text-slate-800">{row.consumedToday}</span>,
    },
    {
      key: 'remainingWorkHours',
      title: 'CHẠY CÒN LẠI',
      render: (row) => <span className="text-slate-700 font-medium">{row.remainingWorkHours}</span>,
    },
    {
      key: 'statusLabel',
      title: 'TRẠNG THÁI',
      render: (row) => {
        let variant: 'green' | 'amber' | 'red' = 'green';
        if (row.sensorStatus === 'low') variant = 'amber';
        if (row.sensorStatus === 'drop_alert') variant = 'red';

        return <Badge variant={variant}>{row.statusLabel}</Badge>;
      },
    },
    {
      key: 'id',
      title: 'HÀNH ĐỘNG',
      render: (row) => (
        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="outline"
            size="sm"
            className="h-7 px-2 text-[10px]"
            onClick={() => setSelectedVehicle(row)}
          >
            Đồ thị dầu
          </Button>
          {row.sensorStatus === 'low' && (
            <Button
              variant="primary"
              size="sm"
              className="h-7 px-2 text-[10px]"
              onClick={() => {
                setSelectedVehicle(row);
                setShowAddVoucherModal(true);
              }}
            >
              ⚡ Cấp dầu
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 font-heading tracking-tight">
            Mức dầu trong bình 128 xe cơ giới (Que đo GPS Realtime)
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-1.5" />
            Xuất báo cáo mức dầu
          </Button>
          <Button variant="primary" size="sm" onClick={() => setShowAddVoucherModal(true)}>
            <Plus className="w-4 h-4 mr-1.5" />
            Lập lệnh cấp dầu lưu động
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <FilterBar
        searchPlaceholder="Tìm biển số xe, mã xe, tài xế, đội xe..."
        extraFilters={
          <div className="flex items-center gap-2 text-xs font-semibold text-[#1f7a55]">
            <span className="w-2 h-2 rounded-full bg-[#35a56f] animate-pulse" />
            <span>128 xe đã kết nối que đo GPS realtime</span>
          </div>
        }
      />

      {/* 4 Stats Cards matching Requirements */}
      <KPIGrid cols={4}>
        <StatCard
          label="Tổng lượng dầu trong bình"
          value={`${dataList.reduce((acc, v) => acc + (v.currentFuelLiters || 0), 0).toLocaleString('vi-VN')} Lít`}
          subValue={`Dung tích tổng: ${dataList.reduce((acc, v) => acc + (v.tankCapacity || 0), 0).toLocaleString('vi-VN')} Lít`}
          icon={<Fuel className="w-5 h-5" />}
          iconBgColor="bg-emerald-50"
          iconColor="text-primary"
        />
        <StatCard
          label="Mức dầu an toàn (>30% bình)"
          value={`${dataList.filter((v) => v.fillPercent >= 30).length} xe`}
          subValue="Đủ nhiên liệu vận hành"
          icon={<CheckCircle2 className="w-5 h-5" />}
          iconBgColor="bg-emerald-50"
          iconColor="text-emerald-700"
        />
        <StatCard
          label="Sắp cạn dầu (<20% bình)"
          value={`${dataList.filter((v) => v.fillPercent < 20).length} xe`}
          subValue="Cần điều xe téc cấp dầu"
          icon={<AlertTriangle className="w-5 h-5" />}
          iconBgColor="bg-amber-50"
          iconColor="text-amber-600"
        />
        <StatCard
          label="Cảnh báo sụt dầu / Bất thường"
          value={`${dataList.filter((v) => v.sensorStatus === 'drop_alert').length} xe`}
          subValue="Sụt giảm nhanh hoặc rò rỉ"
          icon={<Activity className="w-5 h-5" />}
          iconBgColor="bg-rose-50"
          iconColor="text-rose-600"
        />
      </KPIGrid>

      {/* DataTable */}
      <DataTable
        title="Danh Sách Mức Nhiên Liệu Trong Bình Từng Xe Cơ Giới (Que Đo GPS Realtime)"
        subtitle="Giám sát trực tiếp que đo cảm biến DUT-E, đo mức tiêu hao L/h (máy cày) & L/km (xe tải) theo lệnh sản xuất"
        columns={columns}
        data={dataList}
        isLoading={loading}
        onRowClick={(row) => setSelectedVehicle(row)}
      />

      {/* Detail Modal */}
      {selectedVehicle && (
        <Modal
          isOpen={!!selectedVehicle}
          onClose={() => setSelectedVehicle(null)}
          title={`Chi Tiết Mức Nhiên Liệu: ${selectedVehicle.plateNumber}`}
          subtitle={`${selectedVehicle.vehicleName} · ${selectedVehicle.teamUnit}`}
          size="lg"
        >
          <div className="space-y-4 text-xs text-slate-700">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div>
                <span className="text-slate-500 block mb-1">Dung tích bình dầu:</span>
                <strong className="text-sm text-slate-900">{selectedVehicle.tankCapacity} Lít</strong>
              </div>
              <div>
                <span className="text-slate-500 block mb-1">Lượng dầu thực tế đo bằng que đo:</span>
                <strong className="text-sm text-[#1f7a55]">
                  {selectedVehicle.currentFuelLiters} Lít ({selectedVehicle.fillPercent}%)
                </strong>
              </div>
              <div>
                <span className="text-slate-500 block mb-1">Lái xe vận hành:</span>
                <strong className="text-slate-900">{selectedVehicle.driverName}</strong>
              </div>
              <div>
                <span className="text-slate-500 block mb-1">Định mức khoán áp dụng:</span>
                <strong className="text-slate-900">{selectedVehicle.quotaRate}</strong>
              </div>
              <div>
                <span className="text-slate-500 block mb-1">Tiêu hao ca trực hôm nay:</span>
                <strong className="text-slate-900">{selectedVehicle.consumedToday}</strong>
              </div>
              <div>
                <span className="text-slate-500 block mb-1">Thời gian chạy còn lại dự kiến:</span>
                <strong className="text-slate-900">{selectedVehicle.remainingWorkHours}</strong>
              </div>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800">Đồ thị que đo dầu 24h qua (Cảm biến DUT-E)</span>
                <span className="text-[11px] text-slate-500">Cập nhật lúc: {selectedVehicle.lastUpdated}</span>
              </div>
              <div className="h-28 bg-slate-50 rounded-lg border border-slate-200 flex items-end p-2 gap-1.5">
                {[85, 83, 80, 78, 76, 73, 71, 68, 65, 62, 60, 58, 55, 52, 50, 48].map((pct, idx) => (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className="w-full bg-[#1f7a55] rounded-t"
                      style={{ height: `${pct * 0.9}px` }}
                      title={`${pct}% lúc ${idx + 1}h trước`}
                    />
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-slate-500 italic">
                * Cảm biến đo mức dầu siêu âm/que đo điện dung ghi nhận mỗi 30 giây, tự động phát hiện sụt dầu khi xe tắt máy hoặc tiêu hao vượt ngưỡng.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setSelectedVehicle(null)}>
                Đóng
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setShowAddVoucherModal(true);
                }}
              >
                ⚡ Lập phiếu cấp dầu cho xe này
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Add Voucher Modal */}
      <Modal
        isOpen={showAddVoucherModal}
        onClose={() => setShowAddVoucherModal(false)}
        title="Lập Phiếu Cấp Nhiên Liệu Lưu Động Tại Xe"
        subtitle="Cấp dầu từ xe bồn xitec đến bình dầu xe cơ giới tại Lô thửa"
        size="md"
      >
        <div className="space-y-3 text-xs">
          <div>
            <label className="font-bold text-slate-700 block mb-1">Xe nhận dầu:</label>
            <select
              className="w-full p-2 border border-slate-200 rounded-xl bg-slate-50"
              defaultValue={selectedVehicle?.plateNumber || 'XC-JD-024'}
            >
              {dataList.map((v) => (
                <option key={v.id} value={v.plateNumber}>
                  {v.plateNumber} - {v.vehicleName} (Hiện còn {v.currentFuelLiters}L / {v.tankCapacity}L)
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Nguồn cấp dầu:</label>
              <select className="w-full p-2 border border-slate-200 rounded-xl bg-slate-50">
                <option>Xe téc lưu động Dongfeng 5m³ (Biển: 51C-011.89)</option>
                <option>Trụ bơm cố định Kho Trung Tâm T1</option>
                <option>Cột bơm Nông Trường 2</option>
              </select>
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Số lít cấp (Lít):</label>
              <input
                type="number"
                defaultValue="100"
                className="w-full p-2 border border-slate-200 rounded-xl bg-slate-50 font-bold font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Giờ máy hiện tại:</label>
              <input
                type="text"
                defaultValue="2.485,5 giờ máy"
                className="w-full p-2 border border-slate-200 rounded-xl bg-slate-50"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Vị trí cấp (GPS Lô/Thửa):</label>
              <input
                type="text"
                defaultValue="Lô CN-A12 · XN Chuối 1"
                className="w-full p-2 border border-slate-200 rounded-xl bg-slate-50"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
            <Button variant="outline" size="sm" onClick={() => setShowAddVoucherModal(false)}>
              Hủy
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                alert('Đã phát hành lệnh cấp dầu lưu động thành công!');
                setShowAddVoucherModal(false);
              }}
            >
              ✓ Xác nhận & Cấp dầu
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
export default FuelTanksInventoryPage;
