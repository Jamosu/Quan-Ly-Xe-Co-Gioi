import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useMemo, useState } from 'react';
import {
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EmptyState, OfflineBanner, SyncIndicator, TaskCard } from '../components';
import { useAppStore } from '../store';
import { LocalOrder } from '../types';
import { syncNow } from '../syncEngine';
import { colors, shadow } from '../theme';
import { TasksStackParams } from '../navigationTypes';

type PeriodMode = 'WEEK' | 'ALL';

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
  const dateStr = order.planned_start || order.planned_end || order.actual_start || order.actual_end || order.server_updated_at;
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
}

export function HomeScreen({ navigation }: NativeStackScreenProps<TasksStackParams, 'Tasks'>) {
  const [tab, setTab] = useState<'today' | 'upcoming'>('today');
  const [upcomingMode, setUpcomingMode] = useState<PeriodMode>('WEEK');
  const [upcomingWeekOffset, setUpcomingWeekOffset] = useState<number>(0);

  const { today, upcoming, online, syncing, stats, session, setSyncing, refreshLocal } = useAppStore();

  const currentUpcomingWeek = useMemo(() => getWeekRange(upcomingWeekOffset), [upcomingWeekOffset]);

  const filteredUpcoming = useMemo(() => {
    if (upcomingMode === 'ALL') return upcoming;
    return upcoming.filter(item => {
      const orderDate = getOrderDate(item);
      if (!orderDate) return true;
      return orderDate >= currentUpcomingWeek.start && orderDate <= currentUpcomingWeek.end;
    });
  }, [upcoming, upcomingMode, currentUpcomingWeek]);

  const upcomingSummary = useMemo(() => {
    let totalTons = 0;
    let totalHa = 0;

    for (const item of filteredUpcoming) {
      try {
        const raw = JSON.parse(item.raw_json || '{}');
        if (raw.tonnage) totalTons += Number(raw.tonnage);
        else if (raw.weightKg) totalTons += Number(raw.weightKg) / 1000;

        if (raw.areaHa) totalHa += Number(raw.areaHa);
        else if (raw.completedAreaHa) totalHa += Number(raw.completedAreaHa);
      } catch {}
    }

    return {
      totalCount: filteredUpcoming.length,
      totalTons: totalTons > 0 ? totalTons.toFixed(1).replace('.0', '') : '0',
      totalHa: totalHa > 0 ? totalHa.toFixed(1).replace('.0', '') : '0',
    };
  }, [filteredUpcoming]);

  const data = tab === 'today' ? today : filteredUpcoming;
  const hasActiveJob = today.some(t => ['WORKING', 'IN_TRANSIT'].includes(t.local_status));

  // Time-aware greeting
  const hour = new Date().getHours();
  const greetingPrefix = hour < 12 ? 'Chào buổi sáng' : hour < 18 ? 'Chào buổi chiều' : 'Chào buổi tối';
  const driverName = session?.user.fullName || 'Anh Nguyễn Văn Minh';
  const driverCode = session?.user.code || 'NV0234';
  const klhName = 'KLH KOUN MOM';

  // Driver presence status
  let statusColor = colors.brand;
  let statusText = 'Sẵn sàng';
  let statusDotColor = '#22C55E';
  if (!online) {
    statusColor = colors.warning;
    statusText = 'Đang Offline';
    statusDotColor = '#F59E0B';
  } else if (hasActiveJob) {
    statusColor = colors.info;
    statusText = 'Đang thực hiện';
    statusDotColor = '#3B82F6';
  }

  const refresh = useCallback(async () => {
    setSyncing(true);
    try {
      if (online) await syncNow();
      await refreshLocal();
    } finally {
      setSyncing(false);
    }
  }, [online, refreshLocal, setSyncing]);

  const upcomingWeekNum = useMemo(() => getWeekNumber(currentUpcomingWeek.start), [currentUpcomingWeek]);
  const upcomingRangeLabel = useMemo(() => {
    if (upcomingMode === 'WEEK') {
      return `Tuần ${upcomingWeekNum} • ${fmtDate(currentUpcomingWeek.start)} – ${fmtDate(currentUpcomingWeek.end)}/${currentUpcomingWeek.start.getFullYear()}`;
    }
    return 'Toàn bộ kế hoạch sắp tới';
  }, [upcomingMode, upcomingWeekNum, currentUpcomingWeek]);

  const upcomingSubLabel = useMemo(() => {
    if (upcomingMode === 'WEEK') {
      if (upcomingWeekOffset === 0) return 'Từ Thứ Hai đến Chủ Nhật tuần này';
      if (upcomingWeekOffset === 1) return 'Kế hoạch tuần tới (Thứ Hai – Chủ Nhật)';
      if (upcomingWeekOffset === 2) return 'Kế hoạch 2 tuần tới';
      return `Từ ${fmtDateWithYear(currentUpcomingWeek.start)} đến ${fmtDateWithYear(currentUpcomingWeek.end)}`;
    }
    return `Tất cả ${upcoming.length} lệnh sắp tới đã lưu trên thiết bị`;
  }, [upcomingMode, upcomingWeekOffset, currentUpcomingWeek, upcoming.length]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <OfflineBanner online={online} />

      <FlatList
        data={data}
        keyExtractor={item => item.local_key}
        renderItem={({ item }: { item: LocalOrder }) => (
          <TaskCard
            order={item}
            onPress={() => navigation.navigate('TaskDetail', { localKey: item.local_key })}
          />
        )}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={syncing}
            onRefresh={refresh}
            tintColor={colors.brand}
            colors={[colors.brand]}
          />
        }
        ListHeaderComponent={
          <>
            {/* Main Driver Header Card */}
            <View style={styles.headerCard}>
              <View style={styles.headerTop}>
                {/* Left: Driver Name & Unit */}
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={styles.greetingText}>{greetingPrefix},</Text>
                  <Text style={styles.driverNameText} numberOfLines={1}>{driverName}</Text>
                  <Text style={styles.unitSubtext}>{driverCode} • {klhName}</Text>
                </View>

                {/* Right: Driver Avatar & Status Badge */}
                <View style={styles.avatarBox}>
                  {session?.user.avatarUrl ? (
                    <Image source={{ uri: session.user.avatarUrl }} style={styles.avatarImage} />
                  ) : (
                    <View style={styles.avatarPlaceholder}>
                      <Text style={styles.avatarInitials}>
                        {driverName.split(' ').map(p => p[0]).slice(-2).join('')}
                      </Text>
                    </View>
                  )}
                  <View style={[styles.statusDot, { backgroundColor: statusDotColor }]} />
                </View>
              </View>

              {/* Bottom Strip: Live Shift Status + Small Sync Indicator */}
              <View style={styles.headerFooter}>
                <View style={[styles.statusPill, { backgroundColor: `${statusColor}18` }]}>
                  <View style={[styles.microDot, { backgroundColor: statusColor }]} />
                  <Text style={[styles.statusPillText, { color: statusColor }]}>{statusText}</Text>
                </View>

                <SyncIndicator
                  online={online}
                  syncing={syncing}
                  pendingCount={stats.pending}
                  failedCount={stats.failed}
                />
              </View>
            </View>

            {/* Filter Tabs: Hôm nay | Sắp tới */}
            <View style={styles.tabs}>
              <TouchableOpacity
                style={[styles.tab, tab === 'today' && styles.tabActive]}
                onPress={() => setTab('today')}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="calendar-outline"
                  size={16}
                  color={tab === 'today' ? colors.brand : colors.muted}
                />
                <Text style={[styles.tabText, tab === 'today' && styles.tabTextActive]}>
                  Hôm nay
                </Text>
                <View style={[styles.count, tab === 'today' && styles.countActive]}>
                  <Text style={[styles.countText, tab === 'today' && styles.countTextActive]}>
                    {today.length}
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tab, tab === 'upcoming' && styles.tabActive]}
                onPress={() => setTab('upcoming')}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="time-outline"
                  size={16}
                  color={tab === 'upcoming' ? colors.brand : colors.muted}
                />
                <Text style={[styles.tabText, tab === 'upcoming' && styles.tabTextActive]}>
                  Sắp tới
                </Text>
                <View style={[styles.count, tab === 'upcoming' && styles.countActive]}>
                  <Text style={[styles.countText, tab === 'upcoming' && styles.countTextActive]}>
                    {upcoming.length}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* Week Filter for Upcoming Tasks */}
            {tab === 'upcoming' && (
              <View style={styles.upcomingFilterContainer}>
                {/* Presets: Tuần này | Tuần tới | 2 tuần tới | Tất cả */}
                <View style={styles.presetRow}>
                  <TouchableOpacity
                    style={[styles.presetChip, upcomingMode === 'WEEK' && upcomingWeekOffset === 0 && styles.presetChipActive]}
                    onPress={() => {
                      setUpcomingMode('WEEK');
                      setUpcomingWeekOffset(0);
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.presetText, upcomingMode === 'WEEK' && upcomingWeekOffset === 0 && styles.presetTextActive]}>
                      Tuần này
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.presetChip, upcomingMode === 'WEEK' && upcomingWeekOffset === 1 && styles.presetChipActive]}
                    onPress={() => {
                      setUpcomingMode('WEEK');
                      setUpcomingWeekOffset(1);
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.presetText, upcomingMode === 'WEEK' && upcomingWeekOffset === 1 && styles.presetTextActive]}>
                      Tuần tới
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.presetChip, upcomingMode === 'WEEK' && upcomingWeekOffset === 2 && styles.presetChipActive]}
                    onPress={() => {
                      setUpcomingMode('WEEK');
                      setUpcomingWeekOffset(2);
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.presetText, upcomingMode === 'WEEK' && upcomingWeekOffset === 2 && styles.presetTextActive]}>
                      2 tuần tới
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.presetChip, upcomingMode === 'ALL' && styles.presetChipActive]}
                    onPress={() => {
                      setUpcomingMode('ALL');
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.presetText, upcomingMode === 'ALL' && styles.presetTextActive]}>
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
                        setUpcomingMode('WEEK');
                        setUpcomingWeekOffset(w => w - 1);
                      }}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="chevron-back" size={20} color={colors.brand} />
                    </TouchableOpacity>

                    <View style={styles.weekCenterInfo}>
                      <View style={styles.weekTitleRow}>
                        <Ionicons name="calendar" size={15} color={colors.brand} style={{ marginRight: 6 }} />
                        <Text style={styles.weekTitleText}>{upcomingRangeLabel}</Text>
                      </View>
                      <Text style={styles.weekSubText}>{upcomingSubLabel}</Text>
                    </View>

                    <TouchableOpacity
                      style={styles.weekArrowBtn}
                      onPress={() => {
                        setUpcomingMode('WEEK');
                        setUpcomingWeekOffset(w => w + 1);
                      }}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="chevron-forward" size={20} color={colors.brand} />
                    </TouchableOpacity>
                  </View>

                  {upcomingMode === 'WEEK' && upcomingWeekOffset !== 0 && (
                    <TouchableOpacity
                      style={styles.returnThisWeekBtn}
                      onPress={() => setUpcomingWeekOffset(0)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="today-outline" size={13} color={colors.brand} style={{ marginRight: 4 }} />
                      <Text style={styles.returnThisWeekText}>Về tuần này</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Upcoming Summary Box */}
                <View style={styles.summaryContainer}>
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryValue}>{upcomingSummary.totalCount}</Text>
                    <Text style={styles.summaryLabel}>Kế hoạch</Text>
                  </View>
                  <View style={styles.summaryDivider} />
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryValue}>{upcomingSummary.totalTons} tấn</Text>
                    <Text style={styles.summaryLabel}>Dự kiến chở</Text>
                  </View>
                  <View style={styles.summaryDivider} />
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryValue}>{upcomingSummary.totalHa} ha</Text>
                    <Text style={styles.summaryLabel}>Dự kiến cày</Text>
                  </View>
                </View>
              </View>
            )}

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionLabel}>
                {tab === 'today' ? 'NHIỆM VỤ TRONG NGÀY' : 'KẾ HOẠCH SẮP TỚI ĐÃ LỌC'}
              </Text>
              <Text style={styles.sectionCount}>
                {data.length} lệnh
              </Text>
            </View>
          </>
        }
        ListEmptyComponent={
          <EmptyState
            icon="calendar-outline"
            title={tab === 'today' ? 'Hôm nay chưa có nhiệm vụ' : 'Chưa có kế hoạch tuần này'}
            text={
              tab === 'today'
                ? (online ? 'Kéo xuống để kiểm tra lệnh điều phối mới nhất.' : 'Ứng dụng đang chạy offline. Khi có mạng sẽ tự động đồng bộ.')
                : 'Chưa có lệnh phân công trong khoảng thời gian đã chọn. Bấm "Tuần tới" hoặc "Tất cả" để xem thêm.'
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
    paddingBottom: 40,
  },
  headerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    marginTop: 10,
    borderWidth: 1,
    borderColor: colors.line,
    ...shadow,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  greetingText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '700',
  },
  driverNameText: {
    color: colors.ink,
    fontSize: 20,
    fontWeight: '900',
    marginTop: 2,
  },
  unitSubtext: {
    color: colors.brand,
    fontSize: 12,
    fontWeight: '800',
    marginTop: 3,
    letterSpacing: 0.5,
  },
  avatarBox: {
    position: 'relative',
  },
  avatarImage: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: colors.brand,
  },
  avatarPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.brandLight,
    borderWidth: 2,
    borderColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    color: colors.brand,
    fontSize: 18,
    fontWeight: '900',
  },
  statusDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  headerFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.lineLight,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  microDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: '800',
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#E5ECE8',
    padding: 4,
    borderRadius: 14,
    marginTop: 14,
  },
  tab: {
    flex: 1,
    height: 44,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  tabActive: {
    backgroundColor: '#FFFFFF',
    ...shadow,
  },
  tabText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '700',
  },
  tabTextActive: {
    color: colors.brand,
    fontWeight: '900',
  },
  count: {
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    borderRadius: 10,
    backgroundColor: '#D4DED8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  countActive: {
    backgroundColor: colors.brandLight,
  },
  countText: {
    fontSize: 11,
    color: colors.muted,
    fontWeight: '800',
  },
  countTextActive: {
    color: colors.brand,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 18,
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  sectionLabel: {
    color: colors.muted,
    fontSize: 11,
    letterSpacing: 0.8,
    fontWeight: '900',
  },
  sectionCount: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '700',
  },
  upcomingFilterContainer: {
    marginTop: 14,
  },
  presetRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  presetChip: {
    flex: 1,
    paddingVertical: 7,
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
    fontSize: 11,
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
    marginBottom: 10,
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
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.brandLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekCenterInfo: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  weekTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  weekTitleText: {
    fontSize: 13,
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
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: colors.line,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.brand,
    marginBottom: 2,
  },
  summaryLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.muted,
  },
  summaryDivider: {
    width: 1,
    height: 22,
    backgroundColor: colors.line,
  },
});
