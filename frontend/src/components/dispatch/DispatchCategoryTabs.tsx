import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Layers, Tractor, HardHat, Truck, ShieldAlert, XCircle } from 'lucide-react';
import { operationsApi } from '../../api/operations';

export type DispatchCategoryTabKey = 'ALL' | 'NONG_NGHIEP' | 'CONG_TRINH' | 'VAN_CHUYEN' | 'CUU_HO_SOS' | 'CANCELLED';

export interface DispatchCategoryCounts {
  ALL?: number;
  NONG_NGHIEP?: number;
  CONG_TRINH?: number;
  VAN_CHUYEN?: number;
  CUU_HO_SOS?: number;
  CANCELLED?: number;
}

interface DispatchCategoryTabsProps {
  activeTab?: DispatchCategoryTabKey;
  counts?: DispatchCategoryCounts;
  onTabChange?: (tab: DispatchCategoryTabKey) => void;
}

export const DispatchCategoryTabs: React.FC<DispatchCategoryTabsProps> = ({
  activeTab,
  counts: customCounts,
  onTabChange,
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  const [internalCounts, setInternalCounts] = useState<DispatchCategoryCounts>({
    ALL: 0,
    NONG_NGHIEP: 0,
    CONG_TRINH: 0,
    VAN_CHUYEN: 0,
    CUU_HO_SOS: 0,
    CANCELLED: 0,
  });

  // Xác định active tab từ URL nếu không truyền prop
  const currentTab: DispatchCategoryTabKey = activeTab || (() => {
    const path = location.pathname;
    const params = new URLSearchParams(location.search);
    if (params.get('status') === 'CANCELLED') return 'CANCELLED';
    if (params.get('category') === 'CUU_HO_SOS') return 'CUU_HO_SOS';
    if (path.includes('/lenh-nong-nghiep')) return 'NONG_NGHIEP';
    if (path.includes('/lenh-cong-trinh') || path.includes('/ca-may')) return 'CONG_TRINH';
    if (path.includes('/lenh-noi-bo') || path.includes('/van-chuyen')) return 'VAN_CHUYEN';
    return 'ALL';
  })();

  // Tự động load counts nếu caller không truyền hoặc truyền thiếu
  useEffect(() => {
    let isMounted = true;
    const loadCounts = async () => {
      try {
        const [dispatchRes, transportRes] = await Promise.allSettled([
          operationsApi.dispatchOrders({ limit: 1000, includeCancelled: true }),
          operationsApi.transportOrders({ limit: 1000, includeCancelled: true }),
        ]);

        let nongNghiepCount = 0;
        let congTrinhCount = 0;
        let vanChuyenCount = 0;
        let rescueCount = 0;
        let cancelledCount = 0;

        if (dispatchRes.status === 'fulfilled' && dispatchRes.value?.items) {
          dispatchRes.value.items.forEach((item: any) => {
            if (item.status === 'CANCELLED') {
              cancelledCount++;
              return;
            }
            if (item.sosAlertId) {
              rescueCount++;
              return;
            }
            const isConstruction = item.productionOrder?.plan?.planType === 'CONSTRUCTION' ||
              item.vehicle?.category === 'MAY_DAO' || item.vehicle?.category === 'MAY_UI' ||
              item.vehicle?.category === 'MAY_SAN' || item.vehicle?.category === 'MAY_LU';
            const isTransport = item.productionOrder?.plan?.planType === 'TRANSPORT' ||
              item.sourceType === 'TRANSPORT_ORDER';

            if (isConstruction) {
              congTrinhCount++;
            } else if (isTransport) {
              vanChuyenCount++;
            } else {
              nongNghiepCount++;
            }
          });
        }

        if (transportRes.status === 'fulfilled' && transportRes.value?.items) {
          transportRes.value.items.forEach((item: any) => {
            if (item.status === 'CANCELLED') {
              cancelledCount++;
            } else {
              vanChuyenCount++;
            }
          });
        }

        const totalCount = nongNghiepCount + congTrinhCount + vanChuyenCount + rescueCount;

        if (isMounted) {
          setInternalCounts({
            ALL: totalCount,
            NONG_NGHIEP: nongNghiepCount,
            CONG_TRINH: congTrinhCount,
            VAN_CHUYEN: vanChuyenCount,
            CUU_HO_SOS: rescueCount,
            CANCELLED: cancelledCount,
          });
        }
      } catch (err) {
        console.error('Failed to load dispatch category counts:', err);
      }
    };

    if (!customCounts) {
      void loadCounts();
    }
  }, [customCounts]);

  const counts = customCounts || internalCounts;

  const tabs: Array<{
    key: DispatchCategoryTabKey;
    label: string;
    count: number;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
    path: string;
  }> = [
    {
      key: 'ALL',
      label: 'Tất cả các loại lệnh',
      count: counts.ALL ?? 0,
      icon: Layers,
      color: 'text-amber-400',
      path: '/lenh-dieu-xe/danh-sach',
    },
    {
      key: 'CUU_HO_SOS',
      label: 'Cứu hộ SOS',
      count: counts.CUU_HO_SOS ?? 0,
      icon: ShieldAlert,
      color: 'text-rose-600',
      path: '/lenh-dieu-xe/danh-sach?category=CUU_HO_SOS',
    },
    {
      key: 'NONG_NGHIEP',
      label: 'Lệnh Nông nghiệp',
      count: counts.NONG_NGHIEP ?? 0,
      icon: Tractor,
      color: 'text-emerald-600',
      path: '/lenh-dieu-xe/lenh-nong-nghiep',
    },
    {
      key: 'CONG_TRINH',
      label: 'Lệnh Công trình ca máy',
      count: counts.CONG_TRINH ?? 0,
      icon: HardHat,
      color: 'text-amber-500',
      path: '/lenh-dieu-xe/lenh-cong-trinh',
    },
    {
      key: 'VAN_CHUYEN',
      label: 'Lệnh Vận chuyển nội bộ',
      count: counts.VAN_CHUYEN ?? 0,
      icon: Truck,
      color: 'text-blue-600',
      path: '/lenh-dieu-xe/lenh-noi-bo',
    },
    {
      key: 'CANCELLED',
      label: 'Lệnh đã hủy',
      count: counts.CANCELLED ?? 0,
      icon: XCircle,
      color: 'text-rose-500',
      path: '/lenh-dieu-xe/danh-sach?status=CANCELLED',
    },
  ];

  const handleTabClick = (tab: typeof tabs[0]) => {
    if (onTabChange) {
      onTabChange(tab.key);
    } else {
      navigate(tab.path);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xs">
      {tabs.map((tab) => {
        const isActive = currentTab === tab.key;
        const Icon = tab.icon;
        const isCancelledTab = tab.key === 'CANCELLED';

        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => handleTabClick(tab)}
            className={`group flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all duration-150 select-none cursor-pointer active:scale-95 ${
              isActive
                ? isCancelledTab
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-slate-900 text-white shadow-xs'
                : isCancelledTab
                ? 'text-rose-600 hover:bg-rose-50 hover:text-rose-700'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Icon
              className={`h-4 w-4 ${
                isActive
                  ? isCancelledTab
                    ? 'text-white'
                    : 'text-amber-400'
                  : tab.color
              }`}
            />
            <span>{tab.label}</span>
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                isActive
                  ? 'bg-white/20 text-white'
                  : isCancelledTab
                  ? 'bg-rose-100 text-rose-800'
                  : 'bg-slate-200 text-slate-700'
              }`}
            >
              {tab.count}
            </span>
          </button>
        );
      })}
    </div>
  );
};
