import React, { useState } from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EmptyState, OfflineBanner, ScreenTitle, TaskCard } from '../components';
import { useAppStore } from '../store';
import { LocalOrder } from '../offline/db';
import { colors } from '../theme';

export function HistoryScreen({ navigation }: any) {
  const { history, online } = useAppStore();
  const [filter, setFilter] = useState<'ALL' | 'COMPLETED' | 'CANCELLED'>('ALL');

  const filtered = history.filter(item => {
    if (filter === 'COMPLETED') return ['COMPLETED', 'DELIVERED', 'ACCEPTED', 'CLOSED'].includes(item.local_status);
    if (filter === 'CANCELLED') return item.local_status === 'CANCELLED';
    return true;
  });

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

            {/* Filter Chips with Light Green Active State */}
            <View style={styles.chipRow}>
              <TouchableOpacity
                style={[styles.chip, filter === 'ALL' && styles.chipActive]}
                onPress={() => setFilter('ALL')}
                activeOpacity={0.8}
              >
                <Text style={[styles.chipText, filter === 'ALL' && styles.chipTextActive]}>
                  Tất cả ({history.length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.chip, filter === 'COMPLETED' && styles.chipActive]}
                onPress={() => setFilter('COMPLETED')}
                activeOpacity={0.8}
              >
                <Text style={[styles.chipText, filter === 'COMPLETED' && styles.chipTextActive]}>
                  Đã hoàn thành ({history.filter(h => ['COMPLETED', 'DELIVERED', 'ACCEPTED', 'CLOSED'].includes(h.local_status)).length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.chip, filter === 'CANCELLED' && styles.chipActive]}
                onPress={() => setFilter('CANCELLED')}
                activeOpacity={0.8}
              >
                <Text style={[styles.chipText, filter === 'CANCELLED' && styles.chipTextActive]}>
                  Đã hủy
                </Text>
              </TouchableOpacity>
            </View>
          </>
        }
        renderItem={({ item }: { item: LocalOrder }) => (
          <TaskCard
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
            title="Chưa có lịch sử"
            text="Các nhiệm vụ đã hoàn thành hoặc kết thúc ca sẽ được lưu an toàn tại đây để tra cứu offline."
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
  chipRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  chip: {
    paddingHorizontal: 14,
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
  chipText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '700',
  },
  chipTextActive: {
    color: colors.brand,
    fontWeight: '800',
  },
});
