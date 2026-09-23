import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EmptyState, OfflineBanner, ScreenTitle, formatDate } from '../components';
import { api } from '../api';
import { useAppStore } from '../store';
import { colors, shadow } from '../theme';

interface AlertItem {
  id: string;
  type: 'CRITICAL' | 'WARNING' | 'INFO' | 'SUCCESS';
  title: string;
  message: string;
  time: string;
  read: boolean;
  category: 'ALL' | 'EMERGENCY' | 'OPERATION' | 'SYSTEM';
}

const INITIAL_ALERTS: AlertItem[] = [];

export function AlertsScreen() {
  const { online, setUnreadAlertsCount } = useAppStore();
  const [filter, setFilter] = useState<'ALL' | 'EMERGENCY' | 'OPERATION' | 'SYSTEM'>('ALL');
  const [alertList, setAlertList] = useState<AlertItem[]>(INITIAL_ALERTS);
  const [refreshing, setRefreshing] = useState(false);

  const loadAlerts = useCallback(async () => {
    try {
      const res = (await api.get('/mobile/driver/alerts')) as any;
      if (Array.isArray(res)) {
        const mapped: AlertItem[] = res.map((item: any) => ({
          id: String(item.id),
          type: item.type || 'INFO',
          title: item.title,
          message: item.message,
          time: item.time ? formatDate(item.time, true) : 'Vừa xong',
          read: Boolean(item.read),
          category: item.category || 'SYSTEM',
        }));
        setAlertList(mapped);
        setUnreadAlertsCount(mapped.filter(i => !i.read).length);
      } else {
        setAlertList([]);
        setUnreadAlertsCount(0);
      }
    } catch {
      // Offline / error: giữ danh sách hiện tại
    }
  }, [setUnreadAlertsCount]);

  useEffect(() => {
    loadAlerts();
  }, [loadAlerts]);

  const filtered = alertList.filter(item => filter === 'ALL' || item.category === filter);

  const markAllAsRead = () => {
    setAlertList(list => list.map(item => ({ ...item, read: true })));
    setUnreadAlertsCount(0);
  };

  const markAsRead = (id: string) => {
    setAlertList(list => {
      const next = list.map(item => (item.id === id ? { ...item, read: true } : item));
      setUnreadAlertsCount(next.filter(i => !i.read).length);
      return next;
    });
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAlerts();
    setRefreshing(false);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <OfflineBanner online={online} />

      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} />}
        ListHeaderComponent={
          <>
            <ScreenTitle
              eyebrow="Thông báo hệ thống"
              title="Cảnh báo & Tin nhắn"
              right={
                <TouchableOpacity onPress={markAllAsRead} style={styles.readAllBtn}>
                  <Text style={styles.readAllText}>Đã đọc hết</Text>
                </TouchableOpacity>
              }
            />

            {/* Filter Chips with Light Green Active State */}
            <View style={styles.chipRow}>
              <FilterChip
                label="Tất cả"
                active={filter === 'ALL'}
                count={alertList.length}
                onPress={() => setFilter('ALL')}
              />
              <FilterChip
                label="Khẩn cấp"
                active={filter === 'EMERGENCY'}
                count={alertList.filter(a => a.category === 'EMERGENCY').length}
                tone="danger"
                onPress={() => setFilter('EMERGENCY')}
              />
              <FilterChip
                label="Vận hành"
                active={filter === 'OPERATION'}
                count={alertList.filter(a => a.category === 'OPERATION').length}
                onPress={() => setFilter('OPERATION')}
              />
              <FilterChip
                label="Hệ thống"
                active={filter === 'SYSTEM'}
                count={alertList.filter(a => a.category === 'SYSTEM').length}
                onPress={() => setFilter('SYSTEM')}
              />
            </View>
          </>
        }
        renderItem={({ item }: { item: AlertItem }) => (
          <AlertCard item={item} onPress={() => markAsRead(item.id)} />
        )}
        ListEmptyComponent={
          <EmptyState
            icon="notifications-off-outline"
            title="Không có thông báo"
            text="Bạn đã xem hết tất cả cảnh báo trong danh mục này."
          />
        }
      />
    </SafeAreaView>
  );
}

function FilterChip({
  label,
  active,
  count,
  tone,
  onPress,
}: {
  label: string;
  active: boolean;
  count: number;
  tone?: 'danger';
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.chip,
        active && styles.chipActive,
        active && tone === 'danger' && styles.chipDangerActive,
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text
        style={[
          styles.chipText,
          active && styles.chipTextActive,
          active && tone === 'danger' && { color: colors.danger },
        ]}
      >
        {label}
      </Text>
      {count > 0 && (
        <View
          style={[
            styles.countBadge,
            active && styles.countBadgeActive,
            tone === 'danger' && { backgroundColor: '#FEE2E2' },
          ]}
        >
          <Text
            style={[
              styles.countText,
              active && styles.countTextActive,
              tone === 'danger' && { color: colors.danger },
            ]}
          >
            {count}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

function AlertCard({ item, onPress }: { item: AlertItem; onPress?: () => void }) {
  const typeConfig: Record<
    AlertItem['type'],
    { icon: keyof typeof Ionicons.glyphMap; color: string; bg: string; border: string }
  > = {
    CRITICAL: {
      icon: 'alert-circle',
      color: colors.danger,
      bg: colors.dangerSoft,
      border: '#FCA5A5',
    },
    WARNING: {
      icon: 'warning',
      color: colors.warning,
      bg: colors.warningSoft,
      border: '#FCD34D',
    },
    INFO: {
      icon: 'information-circle',
      color: colors.info,
      bg: colors.infoSoft,
      border: '#BAE6FD',
    },
    SUCCESS: {
      icon: 'checkmark-circle',
      color: colors.brand,
      bg: colors.brandLight,
      border: '#BBF7D0',
    },
  };

  const cfg = typeConfig[item.type];

  return (
    <TouchableOpacity
      style={[styles.alertCard, !item.read && { borderColor: cfg.color, borderLeftWidth: 4 }]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={styles.cardHeader}>
        <View style={[styles.iconBox, { backgroundColor: cfg.bg }]}>
          <Ionicons name={cfg.icon} size={20} color={cfg.color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.alertTitle}>{item.title}</Text>
          <Text style={styles.alertTime}>{item.time}</Text>
        </View>
        {!item.read && <View style={[styles.unreadDot, { backgroundColor: cfg.color }]} />}
      </View>
      <Text style={styles.alertMessage}>{item.message}</Text>
    </TouchableOpacity>
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
  readAllBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.line,
  },
  readAllText: {
    color: colors.brand,
    fontWeight: '700',
    fontSize: 12,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
    marginBottom: 16,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.line,
  },
  chipActive: {
    backgroundColor: colors.brandLight,
    borderColor: colors.brand,
  },
  chipDangerActive: {
    backgroundColor: colors.dangerSoft,
    borderColor: colors.danger,
  },
  chipText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '700',
  },
  chipTextActive: {
    color: colors.brand,
    fontWeight: '800',
  },
  countBadge: {
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  countBadgeActive: {
    backgroundColor: '#C8E6C9',
  },
  countText: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '800',
  },
  countTextActive: {
    color: colors.brand,
  },
  alertCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.line,
    ...shadow,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertTitle: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: '800',
  },
  alertTime: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 2,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  alertMessage: {
    color: colors.inkLight,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 10,
    paddingLeft: 50,
  },
});
