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
  Trophy,
  Award,
  Download,
  Fuel,
  Coins,
  ShieldCheck,
  Star,
  TrendingUp,
} from 'lucide-react';

interface KPIRankingItem {
  id: string;
  rankText: string;
  rankBadgeColor: string;
  driverName: string;
  driverCode: string;
  teamUnit: string;
  vehicleControlled: string;
  productionYield: string;
  fuelSaving: string;
  kpiScore: number;
  awardTitle: string;
}

export const DriverKPIRankingPage: React.FC = () => {
  const [rankingsList, setRankingsList] = useState<KPIRankingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDriver, setSelectedDriver] = useState<KPIRankingItem | null>(null);
  const [showRewardModal, setShowRewardModal] = useState(false);

  useEffect(() => {
    const fetchKPI = async () => {
      setLoading(true);
      try {
        const res = await apiClient.get('/driver-kpi');
        const items = res.data?.data?.items || res.data?.items || res.data || [];
        const validItems = Array.isArray(items) 
          ? items.filter((k: any) => (Number(k.totalScore) > 0 || Number(k.finalScore) > 0 || Number(k.kpiScore) > 0))
          : [];
        if (validItems.length > 0) {
          setRankingsList(
            validItems.map((k: any, idx: number) => ({
              id: `RK-${k.id || idx}`,
              rankText: idx === 0 ? '🥇 TOP 1' : idx === 1 ? '🥈 TOP 2' : idx === 2 ? '🥉 TOP 3' : `TOP ${idx + 1}`,
              rankBadgeColor: idx === 0 ? 'text-amber-500 font-extrabold text-sm' : idx === 1 ? 'text-slate-400 font-extrabold text-sm' : idx === 2 ? 'text-amber-700 font-extrabold text-sm' : 'text-slate-600 font-bold',
              driverName: k.driver?.fullName || k.driverName || 'Tài xế',
              driverCode: k.driver?.username || k.driverCode || `NV-${idx + 1}`,
              teamUnit: k.driver?.unit || k.unit || 'Đội xe nông trường',
              vehicleControlled: k.vehicleName || '—',
              productionYield: `${k.tripsCount || k.tripsCompleted || 0} chuyến hoàn thành`,
              fuelSaving: `${k.fuelScore || 0} điểm tiết kiệm`,
              kpiScore: Number(k.totalScore || k.finalScore || k.kpiScore || 0),
              awardTitle: k.rankGrade || k.rankTitle || 'Tài xế tiêu chuẩn',
            }))
          );
        } else {
          setRankingsList([]);
        }
      } catch (err) {
        setRankingsList([]);
      } finally {
        setLoading(false);
      }
    };
    void fetchKPI();
  }, []);

  const columns: Column<KPIRankingItem>[] = [
    {
      key: 'rankText',
      title: 'THỨ HẠNG',
      render: (row) => <span className={row.rankBadgeColor}>{row.rankText}</span>,
    },
    {
      key: 'driverName',
      title: 'HỌ VÀ TÊN / MÃ NV',
      sortable: true,
      render: (row) => (
        <div>
          <strong className="text-slate-900 block font-bold">{row.driverName}</strong>
          <span className="text-[10px] text-slate-500 font-mono">{row.driverCode}</span>
        </div>
      ),
    },
    { key: 'teamUnit', title: 'ĐỘI XE TRỰC THUỘC', render: (row) => <span className="font-semibold text-slate-800">{row.teamUnit}</span> },
    { key: 'vehicleControlled', title: 'XE ĐIỀU KHIỂN', render: (row) => <span className="font-medium text-primary text-xs">{row.vehicleControlled}</span> },
    { key: 'productionYield', title: 'SẢN LƯỢNG HOÀN THÀNH', render: (row) => <span className="text-xs text-slate-700 font-medium">{row.productionYield}</span> },
    {
      key: 'fuelSaving',
      title: 'TIẾT KIỆM NHIÊN LIỆU',
      render: (row) => <strong className="text-emerald-700 text-xs">{row.fuelSaving}</strong>,
    },
    {
      key: 'kpiScore',
      title: 'ĐIỂM KPI',
      sortable: true,
      render: (row) => <strong className="text-emerald-700 text-base">{row.kpiScore}</strong>,
    },
    {
      key: 'awardTitle',
      title: 'DANH HIỆU',
      render: (row) => <Badge variant="green">{row.awardTitle}</Badge>,
    },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 font-heading">
            Bảng xếp hạng thi đua Lái xe (KPI)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Tự động xếp hạng Top lái xe xuất sắc theo điểm KPI tháng từ dữ liệu GPS: 25% Chuyến + 25% Km + 25% Giờ máy + 25% Nhiên liệu.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="md" icon={<Download className="w-4 h-4" />}>
            Quyết định khen thưởng
          </Button>
          <Button variant="primary" size="md" icon={<Trophy className="w-4 h-4" />} onClick={() => setShowRewardModal(true)}>
            Trao thưởng tháng
          </Button>
        </div>
      </div>

      {/* Global FilterBar */}
      <FilterBar
        extraFilters={
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-700 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span>Bảng xếp hạng thi đua tháng</span>
          </div>
        }
      />

      {/* 4 Stats Cards matching Mockup */}
      <KPIGrid cols={4}>
        <StatCard
          label="Tổng lái xe xếp hạng"
          value={`${rankingsList.length} lái xe`}
          subValue="Đánh giá định kỳ"
          icon={<Trophy className="w-5 h-5" />}
          iconBgColor="bg-amber-50"
          iconColor="text-amber-600"
        />
        <StatCard
          label="Top 1 Dẫn đầu"
          value={rankingsList[0]?.driverName || '—'}
          subValue={rankingsList[0] ? `${rankingsList[0].kpiScore} Điểm` : 'Chưa có'}
          icon={<Fuel className="w-5 h-5" />}
          iconBgColor="bg-emerald-50"
          iconColor="text-emerald-700"
        />
        <StatCard
          label="Điểm thi đua trung bình"
          value={`${rankingsList.length > 0 ? (rankingsList.reduce((acc, d) => acc + (Number(d.kpiScore) || 0), 0) / rankingsList.length).toFixed(1) : 0} điểm`}
          subValue="Điểm toàn đội xe"
          icon={<Coins className="w-5 h-5" />}
          iconBgColor="bg-sky-50"
          iconColor="text-sky-600"
        />
        <StatCard
          label="Hệ số an toàn"
          value="100%"
          subValue="0 sự cố tai nạn"
          icon={<ShieldCheck className="w-5 h-5" />}
          iconBgColor="bg-emerald-50"
          iconColor="text-emerald-700"
        />
      </KPIGrid>

      {/* Podium Top 3 */}
      {rankingsList.length === 0 ? (
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm text-center text-xs text-slate-400">
          <Trophy className="w-10 h-10 mx-auto mb-2 opacity-30 text-amber-500" />
          <p className="font-bold text-slate-600">Chưa có dữ liệu xếp hạng thi đua trong kỳ này</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Điểm KPI sẽ tự động tổng hợp từ dữ liệu lệnh điều xe và nhật ký vận hành GPS.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {rankingsList[0] && (
            <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 p-4 rounded-2xl border border-amber-200 shadow-sm relative overflow-hidden">
              <div className="text-2xl mb-1">🥇</div>
              <div className="text-xs font-bold text-amber-800 uppercase tracking-wider">HẠNG NHẤT (QUÁN QUÂN)</div>
              <h3 className="text-base font-extrabold text-slate-900 mt-1">{rankingsList[0].driverName}</h3>
              <p className="text-xs text-slate-600">{rankingsList[0].teamUnit} · {rankingsList[0].vehicleControlled}</p>
              <div className="mt-3 flex items-center justify-between pt-2 border-t border-amber-200/80">
                <span className="text-xs font-semibold text-amber-900">Điểm KPI: <b>{rankingsList[0].kpiScore}</b></span>
                <span className="text-xs font-bold text-emerald-700">{rankingsList[0].fuelSaving}</span>
              </div>
            </div>
          )}

          {rankingsList[1] && (
            <div className="bg-gradient-to-br from-slate-50 to-slate-100 p-4 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
              <div className="text-2xl mb-1">🥈</div>
              <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">HẠNG NHÌ (Á QUÂN)</div>
              <h3 className="text-base font-extrabold text-slate-900 mt-1">{rankingsList[1].driverName}</h3>
              <p className="text-xs text-slate-600">{rankingsList[1].teamUnit} · {rankingsList[1].vehicleControlled}</p>
              <div className="mt-3 flex items-center justify-between pt-2 border-t border-slate-200">
                <span className="text-xs font-semibold text-slate-800">Điểm KPI: <b>{rankingsList[1].kpiScore}</b></span>
                <span className="text-xs font-bold text-emerald-700">{rankingsList[1].fuelSaving}</span>
              </div>
            </div>
          )}

          {rankingsList[2] && (
            <div className="bg-gradient-to-br from-amber-50/40 to-amber-100/30 p-4 rounded-2xl border border-amber-200/60 shadow-sm relative overflow-hidden">
              <div className="text-2xl mb-1">🥉</div>
              <div className="text-xs font-bold text-amber-900/80 uppercase tracking-wider">HẠNG BA (QUÝ QUÂN)</div>
              <h3 className="text-base font-extrabold text-slate-900 mt-1">{rankingsList[2].driverName}</h3>
              <p className="text-xs text-slate-600">{rankingsList[2].teamUnit} · {rankingsList[2].vehicleControlled}</p>
              <div className="mt-3 flex items-center justify-between pt-2 border-t border-amber-200/60">
                <span className="text-xs font-semibold text-slate-800">Điểm KPI: <b>{rankingsList[2].kpiScore}</b></span>
                <span className="text-xs font-bold text-emerald-700">{rankingsList[2].fuelSaving}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* DataTable */}
      <DataTable
        title="Bảng Vinh Danh Top Lái Xe Xuất Sắc"
        subtitle="Tổng hợp điểm thi đua hàng tháng làm căn cứ bình xét khen thưởng tài xế tiêu biểu"
        columns={columns}
        data={rankingsList}
        isLoading={loading}
        onRowClick={(row) => setSelectedDriver(row)}
      />

      {/* Detail Modal */}
      {selectedDriver && (
        <Modal
          isOpen={!!selectedDriver}
          onClose={() => setSelectedDriver(null)}
          title={`Vinh Danh: ${selectedDriver.driverName}`}
          subtitle={`${selectedDriver.awardTitle} | Điểm KPI: ${selectedDriver.kpiScore}`}
          size="md"
        >
          <div className="space-y-3.5 text-xs text-slate-700">
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
              <div className="flex justify-between"><span>Đơn vị:</span> <b>{selectedDriver.teamUnit}</b></div>
              <div className="flex justify-between"><span>Phương tiện phụ trách:</span> <strong className="text-primary">{selectedDriver.vehicleControlled}</strong></div>
              <div className="flex justify-between"><span>Sản lượng:</span> <b>{selectedDriver.productionYield}</b></div>
              <div className="flex justify-between"><span>Chỉ số tiết kiệm dầu:</span> <b className="text-emerald-700">{selectedDriver.fuelSaving}</b></div>
            </div>
            <div className="flex justify-end pt-2">
              <Button variant="primary" size="sm" onClick={() => setSelectedDriver(null)}>
                Đóng
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Reward Modal */}
      <Modal
        isOpen={showRewardModal}
        onClose={() => setShowRewardModal(false)}
        title="Quyết Định Khen Thưởng Thi Đua Tháng"
        subtitle="Chi trả thưởng hiệu quả và vinh danh Chiến sĩ thi đua cơ giới"
        size="md"
      >
        <div className="space-y-3 text-xs">
          <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200 text-emerald-900 space-y-1">
            <div className="font-bold">Tổng quỹ thưởng tháng 08/2026: 32.400.000 đ</div>
            <p className="text-[11px]">Đã duyệt danh sách cho 10 cá nhân xuất sắc nhất toàn đoàn.</p>
          </div>
          <div className="flex justify-end gap-2 pt-3">
            <Button variant="outline" size="sm" onClick={() => setShowRewardModal(false)}>Hủy</Button>
            <Button variant="primary" size="sm" onClick={() => setShowRewardModal(false)}>Xác Nhận Trao Thưởng</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

