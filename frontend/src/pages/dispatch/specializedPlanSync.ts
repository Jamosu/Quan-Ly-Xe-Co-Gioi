import { apiClient } from '../../api/client';
import type {
  SpecializedWeeklyPlan,
  SpecializedTaskItem,
  SpecializedPlanKind,
} from './SpecializedPlansPage';
import {
  parseScheduledDays,
  getDaysInRange,
  getDayActualDate,
  DAYS_OF_WEEK,
} from './CreateProductionPlanPage';
import { getWeekNumber } from './ProductionPlanPage';

export const STORAGE_KEYS: Record<SpecializedPlanKind, string> = {
  CONSTRUCTION: 'thaco_weekly_construction_plans_v3',
  TRANSPORT: 'thaco_weekly_transport_plans_v3',
};

/**
 * Đồng bộ tất cả nhiệm vụ của 1 kế hoạch chuyên dùng (Công trình hoặc Vận chuyển) sang Lệnh điều xe.
 * Đảm bảo mỗi task và mỗi ngày có mã lệnh unique độc lập (không bị đè hay sót lệnh).
 */
export const syncSpecializedPlanTasksToDispatch = (
  plan: SpecializedWeeklyPlan,
  taskList: SpecializedTaskItem[],
  kind?: SpecializedPlanKind
) => {
  try {
    const isCt = kind === 'CONSTRUCTION' || plan.code?.includes('CT') || plan.categoryCode?.includes('CONSTRUCTION');
    const storageKey = 'thaco_all_dispatch_orders_master_v4';
    const existingRaw = localStorage.getItem(storageKey);
    let existing: any[] = existingRaw ? JSON.parse(existingRaw) : [];

    const planYear = plan.startDate ? new Date(plan.startDate).getFullYear() : new Date().getFullYear();
    const planWeek = plan.weekNumber || getWeekNumber(plan.startDate || new Date());
    const cleanPlanCode = (plan.code || '')
      .replace(/^KH-/, '')
      .replace(/^(20\d\d-)?W\d+-?/, '')
      .replace(/KOUN_MOM/g, 'KM')
      .replace(/SNOUL/g, 'SN')
      .replace(/NAM_LAO/g, 'NL')
      .replace(/-+/g, '-');
    const planIdPart = cleanPlanCode || (plan.id ? String(plan.id).replace(/^PLAN-/, '').slice(-4) : '0001');

    // Xóa các lệnh cũ của chính kế hoạch này trong storage để nạp lại chuẩn xác
    const orderPrefix = `LDX-${isCt ? 'CT' : 'VC'}-${planYear}-W${planWeek}`;
    existing = existing.filter((e: any) => {
      if (e.code && e.code.startsWith(orderPrefix) && (e.code.includes(planIdPart) || e.notes?.includes(plan.code))) {
        return false;
      }
      return true;
    });

    const created: any[] = [];

    taskList.forEach((task, tIdx) => {
      const count = Math.max(1, task.assignedVehiclesCount || 1);
      const { fromDay, toDay } = parseScheduledDays(task.scheduledDays);
      const days = getDaysInRange(fromDay, toDay);
      const totalDays = days.length;
      const taskSeq = String(tIdx + 1).padStart(2, '0');

      days.forEach((dayName, dayIdx) => {
        const dayOrderIdx = DAYS_OF_WEEK.findIndex((d) => dayName.startsWith(d));
        const dayDate = getDayActualDate(dayName, plan.startDate);
        const dayDateStr = dayDate.toISOString().slice(0, 10);
        const dayDateDisplay = `${String(dayDate.getDate()).padStart(2, '0')}/${String(dayDate.getMonth() + 1).padStart(2, '0')}`;
        const dayNumber = dayOrderIdx !== -1 ? dayOrderIdx + 1 : dayIdx + 1;

        for (let index = 1; index <= count; index++) {
          const code = `LDX-${isCt ? 'CT' : 'VC'}-${planYear}-W${planWeek}-${planIdPart}-${taskSeq}-D${dayNumber}-${index}`;
          if (created.some((e: any) => e.code === code)) continue;

          const newOrder = {
            id: Date.now() + created.length + tIdx * 100 + dayIdx * 10 + index,
            code,
            orderCategory: isCt ? 'CONG_TRINH' : 'VAN_CHUYEN',
            categoryLabel: isCt ? 'Công trình' : 'Vận chuyển',
            sourceType: isCt ? 'CONSTRUCTION_ORDER' : 'TRANSPORT_ORDER',
            unit: plan.farmName || plan.enterpriseName || (isCt ? 'Đội xe công trình' : 'Đội vận chuyển'),
            purpose: totalDays > 1
              ? `${task.jobName || (isCt ? 'Thi công công trình' : 'Vận chuyển hàng hóa')} (Xe ${index}/${count}) - ${dayName} (${dayDateDisplay} • Ngày ${dayIdx + 1}/${totalDays})`
              : `${task.jobName || (isCt ? 'Thi công công trình' : 'Vận chuyển hàng hóa')} (Xe ${index}/${count}) - ${dayName} (${dayDateDisplay})`,
            origin: isCt ? `Bãi máy ${plan.enterpriseName || plan.complexName}` : (task.origin || 'Kho xuất phát'),
            destination: isCt ? (task.location || 'Khu vực thi công') : (task.destination || task.location || 'Điểm giao'),
            departureTime: new Date(`${dayDateStr}T06:30:00.000Z`).toISOString(),
            plannedEndTime: new Date(`${dayDateStr}T17:30:00.000Z`).toISOString(),
            status: 'CHO_PHAN_CONG',
            isDelayed: false,
            workVolumeTarget: isCt
              ? (totalDays > 1 ? Math.round(((Number(task.durationHours) || 0) / totalDays) * 10) / 10 : Number(task.durationHours) || 0)
              : (totalDays > 1 ? Math.round(((Number(task.targetQuantity) || 0) / totalDays) * 10) / 10 : Number(task.targetQuantity) || 0),
            workVolumeUnit: isCt ? 'Giờ' : (task.targetUnit || 'Tấn'),
            notes: task.notes || `Nạp tự động từ Kế hoạch ${isCt ? 'Công trình' : 'Vận chuyển'} ${plan.code} Tuần ${plan.weekNumber}`,
          };

          created.push(newOrder);

          // Lưu bất đồng bộ xuống CSDL backend MySQL
          try {
            apiClient.post('/dispatch-orders', {
              code,
              unit: 'NT1',
              purpose: isCt ? (task.jobName || 'Thi công công trình') : (task.jobName || 'Vận chuyển nội bộ'),
              origin: isCt ? `Bãi máy ${plan.enterpriseName || plan.complexName}` : (task.origin || 'Kho xuất phát'),
              destination: isCt ? (task.location || 'Khu vực thi công') : (task.destination || task.location || 'Điểm giao'),
              sourceType: 'PRODUCTION_ORDER',
              departureTime: new Date(`${dayDateStr}T06:30:00.000Z`).toISOString(),
              plannedEndTime: new Date(`${dayDateStr}T17:30:00.000Z`).toISOString(),
              notes: task.notes || `Nạp tự động từ Kế hoạch ${isCt ? 'Công trình' : 'Vận chuyển'} ${plan.code} Tuần ${plan.weekNumber}`,
            }).catch(() => {});
          } catch {}
        }
      });
    });

    if (created.length > 0) {
      localStorage.setItem(storageKey, JSON.stringify([...created, ...existing]));
    }
  } catch (err) {
    console.warn('Sync specialized plan to dispatch master failed:', err);
  }
};

/**
 * Tự động quét và đồng bộ tất cả các kế hoạch đã duyệt (Công trình & Vận chuyển) sang Lệnh điều xe.
 */
export const syncAllApprovedSpecializedPlans = () => {
  try {
    (['CONSTRUCTION', 'TRANSPORT'] as SpecializedPlanKind[]).forEach((kind) => {
      const cached = localStorage.getItem(STORAGE_KEYS[kind]);
      if (cached) {
        const plans: SpecializedWeeklyPlan[] = JSON.parse(cached);
        if (Array.isArray(plans)) {
          plans
            .filter((p) => (p.status === 'APPROVED' || p.status === 'IN_PROGRESS') && Array.isArray(p.tasks) && p.tasks.length > 0)
            .forEach((p) => {
              syncSpecializedPlanTasksToDispatch(p, p.tasks, kind);
            });
        }
      }
    });
  } catch (err) {
    console.warn('Auto sync approved specialized plans failed:', err);
  }
};
