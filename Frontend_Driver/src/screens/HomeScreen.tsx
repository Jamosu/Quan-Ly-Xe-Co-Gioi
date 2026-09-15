import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useState } from 'react';
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
import { LocalOrder } from '../offline/db';
import { syncNow } from '../syncEngine';
import { colors, shadow } from '../theme';
import { TasksStackParams } from '../navigationTypes';

export function HomeScreen({ navigation }: NativeStackScreenProps<TasksStackParams, 'Tasks'>) {
  const [tab, setTab] = useState<'today' | 'upcoming'>('today');
  const { today, upcoming, online, syncing, stats, session, setSyncing, refreshLocal } = useAppStore();

  const data = tab === 'today' ? today : upcoming;
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

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionLabel}>
                {tab === 'today' ? 'NHIỆM VỤ TRONG NGÀY' : 'LỊCH ĐÃ TẢI TRÊN THIẾT BỊ'}
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
            title={tab === 'today' ? 'Hôm nay chưa có nhiệm vụ' : 'Chưa có lịch sắp tới'}
            text={
              online
                ? 'Kéo xuống để kiểm tra lệnh điều phối mới nhất.'
                : 'Ứng dụng đã lưu dữ liệu trên máy. Khi có mạng sẽ tự động tải trước 7 ngày.'
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
});
