import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EmptyState, HistoryCard, OfflineBanner, ScreenTitle } from '../components';
import { useAppStore } from '../store';
import { LocalOrder } from '../types';
import { colors, shadow } from '../theme';

type PeriodMode = 'WEEK' | 'MONTH' | 'ALL';

function getWeekRange(offsetWeeks = 0, baseDate = new Date()) {
  const date = new Date(baseDate);
  const day = date.getDay();
  const diffToMonday = (day === 0 ? -6 : 1) - day;
  const monday = new Date(date);
  monday.setDate(date.getDate() + diffToMonday + offsetWeeks * 7);
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  return { start: monday, end: sunday };
}

function getMonthRange(baseDate = new Date()) {
  const start = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1, 0, 0, 0, 0);
  const end = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

function fmtDate(d: Date) {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}`;
}

function fmtDateWithYear(d: Date) {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function getWeekNumber(d: Date) {
  const target = new Date(d.valueOf());
  const dayNr = (d.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
  }
  return 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
}

function getOrderDate(order: LocalOrder): Date | null {
  const dateStr = order.actual_end || order.planned_end || order.actual_start || order.planned_start || order.server_updated_at;
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
}

export function HistoryScreen({ navigation }: any) {
  const { history, online } = useAppStore();
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'COMPLETED' | 'CANCELLED'>('ALL');
  const [periodMode, setPeriodMode] = useState<PeriodMode>('WEEK');
  const [weekOffset, setWeekOffset] = useState<number>(0);

  // Calculate current date bounds
  const currentWeek = useMemo(() => getWeekRange(weekOffset), [weekOffset]);
  const currentMonth = useMemo(() => getMonthRange(), []);

  // Filter orders by date period
  const periodOrders = useMemo(() => {
    if (periodMode === 'ALL') return history;

    const bounds = periodMode === 'WEEK' ? currentWeek : currentMonth;
    return history.filter(item => {
      const orderDate = getOrderDate(item);
      if (!orderDate) return true;
      return orderDate >= bounds.start && orderDate <= bounds.end;
    });
  }, [history, periodMode, currentWeek, currentMonth]);

  // Filter orders by status
  const filtered = useMemo(() => {
    return periodOrders.filter(item => {
      if (statusFilter === 'COMPLETED') return ['COMPLETED', 'DELIVERED', 'ACCEPTED', 'CLOSED'].includes(item.local_status);
      if (statusFilter === 'CANCELLED') return item.local_status === 'CANCELLED';
      return true;
    });
  }, [periodOrders, statusFilter]);

  // Aggregate stats in current period
  const summary = useMemo(() => {
    let totalTons = 0;
    let totalHa = 0;
    let completedCount = 0;

    for (const item of periodOrders) {
      const isDone = ['COMPLETED', 'DELIVERED', 'ACCEPTED', 'CLOSED'].includes(item.local_status);
      if (isDone) completedCount++;

      try {
        const raw = JSON.parse(item.raw_json || '{}');
        if (raw.tonnage) totalTons += Number(raw.tonnage);
        else if (raw.weightKg) totalTons += Number(raw.weightKg) / 1000;

        if (raw.areaHa) totalHa += Number(raw.areaHa);
        else if (raw.completedAreaHa) totalHa += Number(raw.completedAreaHa);
      } catch {}
    }

    return {
      totalCount: periodOrders.length,
      completedCount,
      totalTons: totalTons > 0 ? totalTons.toFixed(1).replace('.0', '') : '0',
      totalHa: totalHa > 0 ? totalHa.toFixed(1).replace('.0', '') : '0',
    };
  }, [periodOrders]);

  // Header date label
  const currentWeekNum = useMemo(() => getWeekNumber(currentWeek.start), [currentWeek]);
  const rangeLabel = useMemo(() => {
    if (periodMode === 'WEEK') {
      return `${fmtDate(currentWeek.start)} – ${fmtDate(currentWeek.end)}/${currentWeek.start.getFullYear()}`;
    }
    if (periodMode === 'MONTH') {
      return `Tháng ${currentMonth.start.getMonth() + 1}/${currentMonth.start.getFullYear()}`;
    }
    return 'Toàn bộ thời gian';
  }, [periodMode, currentWeek, currentMonth]);

  const subLabel = useMemo(() => {
    if (periodMode === 'WEEK') {
      if (weekOffset === 0) return 'Từ Thứ Hai đến Chủ Nhật tuần này';
      if (weekOffset === -1) return 'Từ Thứ Hai đến Chủ Nhật tuần trước';
      return `Từ ${fmtDateWithYear(currentWeek.start)} đến ${fmtDateWithYear(currentWeek.end)}`;
    }
    if (periodMode === 'MONTH') {
      return `Từ ${fmtDateWithYear(currentMonth.start)} đến ${fmtDateWithYear(currentMonth.end)}`;
    }
    return `Tất cả ${history.length} nhiệm vụ lưu trên thiết bị`;
  }, [periodMode, weekOffset, currentWeek, currentMonth, history.length]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <OfflineBanner online={online} />

      <FlatList
        data={filtered}
        keyExtractor={item => item.local_key}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <>
            <ScreenTitle eyebrow="Dữ liệu đã lưu ngoại tuyến" title="Lịch sử nhiệm vụ" />

            {/* Quick Period Presets */}
            <View style={styles.presetRow}>
              <TouchableOpacity
                style={[styles.presetChip, periodMode === 'WEEK' && weekOffset === 0 && styles.presetChipActive]}
                onPress={() => {
                  setPeriodMode('WEEK');
                  setWeekOffset(0);
                }}
                activeOpacity={0.8}
              >
                <Text style={[styles.presetText, periodMode === 'WEEK' && weekOffset === 0 && styles.presetTextActive]}>
                  Tuần này
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.presetChip, periodMode === 'WEEK' && weekOffset === -1 && styles.presetChipActive]}
                onPress={() => {
                  setPeriodMode('WEEK');
                  setWeekOffset(-1);
                }}
                activeOpacity={0.8}
              >
                <Text style={[styles.presetText, periodMode === 'WEEK' && weekOffset === -1 && styles.presetTextActive]}>
                  Tuần trước
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.presetChip, periodMode === 'MONTH' && styles.presetChipActive]}
                onPress={() => {
                  setPeriodMode('MONTH');
                }}
                activeOpacity={0.8}
              >
                <Text style={[styles.presetText, periodMode === 'MONTH' && styles.presetTextActive]}>
                  Tháng này
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.presetChip, periodMode === 'ALL' && styles.presetChipActive]}
                onPress={() => {
                  setPeriodMode('ALL');
                }}
                activeOpacity={0.8}
              >
                <Text style={[styles.presetText, periodMode === 'ALL' && styles.presetTextActive]}>
                  Tất cả
                </Text>
              </TouchableOpacity>
            </View>

            {/* Week Stepper Card */}
            <View style={styles.weekCard}>
              <View style={styles.weekHeader}>
                <TouchableOpacity
                  style={styles.weekArrowBtn}
                  onPress={() => {
                    setPeriodMode('WEEK');
                    setWeekOffset(w => w - 1);
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="chevron-back" size={20} color={colors.brand} />
                </TouchableOpacity>

                <View style={styles.weekCenterInfo}>
                  <View style={styles.weekTitleRow}>
                    <Ionicons name="calendar" size={16} color={colors.brand} style={{ marginRight: 6 }} />
                    <Text style={styles.weekTitleText}>
                      {periodMode === 'WEEK' ? `Tuần ${currentWeekNum} • ${rangeLabel}` : rangeLabel}
                    </Text>
                  </View>
                  <Text style={styles.weekSubText}>{subLabel}</Text>
                </View>

                <TouchableOpacity
                  style={styles.weekArrowBtn}
                  onPress={() => {
                    setPeriodMode('WEEK');
                    setWeekOffset(w => w + 1);
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="chevron-forward" size={20} color={colors.brand} />
                </TouchableOpacity>
              </View>

              {/* Back to This Week pill if looking at past/future */}
              {periodMode === 'WEEK' && weekOffset !== 0 && (
                <TouchableOpacity
                  style={styles.returnThisWeekBtn}
                  onPress={() => setWeekOffset(0)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="today-outline" size={14} color={colors.brand} style={{ marginRight: 4 }} />
                  <Text style={styles.returnThisWeekText}>Trở về tuần này</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Performance Summary Box */}
            <View style={styles.summaryContainer}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>{summary.totalCount}</Text>
                <Text style={styles.summaryLabel}>Nhiệm vụ</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>{summary.totalTons} tấn</Text>
                <Text style={styles.summaryLabel}>Vận chuyển</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>{summary.totalHa} ha</Text>
                <Text style={styles.summaryLabel}>Làm đất</Text>
              </View>
            </View>

            {/* Status Filter Chips */}
            <View style={styles.chipRow}>
              <TouchableOpacity
                style={[styles.chip, statusFilter === 'ALL' && styles.chipActive]}
                onPress={() => setStatusFilter('ALL')}
                activeOpacity={0.8}
              >
                <Text style={[styles.chipText, statusFilter === 'ALL' && styles.chipTextActive]}>
                  Tất cả ({periodOrders.length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.chip, statusFilter === 'COMPLETED' && styles.chipActive]}
                onPress={() => setStatusFilter('COMPLETED')}
                activeOpacity={0.8}
              >
                <Text style={[styles.chipText, statusFilter === 'COMPLETED' && styles.chipTextActive]}>
                  Hoàn thành ({summary.completedCount})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.chip, statusFilter === 'CANCELLED' && styles.chipActive]}
                onPress={() => setStatusFilter('CANCELLED')}
                activeOpacity={0.8}
              >
                <Text style={[styles.chipText, statusFilter === 'CANCELLED' && styles.chipTextActive]}>
                  Đã hủy ({periodOrders.filter(h => h.local_status === 'CANCELLED').length})
                </Text>
              </TouchableOpacity>
            </View>
          </>
        }
        renderItem={({ item }: { item: LocalOrder }) => (
          <HistoryCard
            order={item}
            onPress={() =>
              navigation.navigate('TasksTab', {
                screen: 'TaskDetail',
                params: { localKey: item.local_key },
              })
            }
          />
        )}
        ListEmptyComponent={
          <EmptyState
            icon="time-outline"
            title="Không có nhiệm vụ"
            text={
              periodMode === 'WEEK' && weekOffset === 0
                ? "Chưa có nhiệm vụ hoàn thành trong tuần này. Hãy bấm 'Tuần trước' để xem lịch sử tuần qua."
                : "Không tìm thấy nhiệm vụ nào trong khoảng thời gian đã chọn."
            }
          />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 36,
  },
  presetRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  presetChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetChipActive: {
    backgroundColor: colors.brand,
    borderColor: colors.brand,
  },
  presetText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.muted,
  },
  presetTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  weekCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.line,
    ...shadow,
  },
  weekHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  weekArrowBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.brandLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekCenterInfo: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  weekTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  weekTitleText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.ink,
  },
  weekSubText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.muted,
  },
  returnThisWeekBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginTop: 8,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: colors.brandLight,
  },
  returnThisWeekText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.brand,
  },
  summaryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 8,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.line,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.brand,
    marginBottom: 2,
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.muted,
  },
  summaryDivider: {
    width: 1,
    height: 24,
    backgroundColor: colors.line,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.line,
  },
  chipActive: {
    backgroundColor: colors.brandLight,
    borderColor: colors.brand,
  },
  chipText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
  },
  chipTextActive: {
    color: colors.brand,
    fontWeight: '800',
  },
});
