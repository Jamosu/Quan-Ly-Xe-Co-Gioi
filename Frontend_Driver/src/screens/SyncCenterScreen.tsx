import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { OfflineBanner, ScreenTitle, formatDate } from '../components';
import { useAppStore } from '../store';
import { syncNow } from '../syncEngine';
import { colors, shadow } from '../theme';

export function SyncCenterScreen({ navigation }: any) {
  const { online, stats, lastSyncAt, refreshLocal } = useAppStore();
  const [busy, setBusy] = useState(false);

  const retry = async () => {
    if (!online) {
      return Alert.alert(
        'Đang Offline',
        'Các thao tác vẫn an toàn trên thiết bị. Ứng dụng sẽ tự động gửi ngay khi có kết nối trở lại.'
      );
    }
    setBusy(true);
    try {
      await syncNow();
      await refreshLocal();
    } finally {
      setBusy(false);
    }
  };

  const allSynced = stats.pending === 0 && stats.photos === 0 && stats.failed === 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <OfflineBanner online={online} />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.topRow}>
          {navigation?.canGoBack?.() && (
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={22} color={colors.ink} />
            </TouchableOpacity>
          )}
          <View style={{ flex: 1 }}>
            <ScreenTitle eyebrow="Offline First" title="Trạng thái đồng bộ" />
          </View>
        </View>

        {/* State Card */}
        <View style={styles.stateCard}>
          <View
            style={[
              styles.bigIcon,
              { backgroundColor: online ? colors.brandLight : colors.warningSoft },
            ]}
          >
            <Ionicons
              name={online ? 'cloud-done' : 'cloud-offline'}
              size={36}
              color={online ? colors.brand : colors.warning}
            />
          </View>

          <Text style={styles.stateTitle}>
            {online ? 'Thiết bị đang Online' : 'Thiết bị đang Offline'}
          </Text>

          <Text style={styles.stateText}>
            {allSynced
              ? 'Tất cả dữ liệu đã được đồng bộ hoàn toàn với máy chủ.'
              : `${stats.pending + stats.photos} dữ liệu đang nằm an toàn trong SQLite chờ gửi.`}
          </Text>

          {/* Last sync time */}
          <View style={styles.lastSyncBox}>
            <Text style={styles.lastSyncLabel}>LẦN ĐỒNG BỘ CUỐI</Text>
            <Text style={styles.lastSyncValue}>
              {lastSyncAt ? formatDate(lastSyncAt, true, true) : 'Chưa đồng bộ'}
            </Text>
          </View>
        </View>

        {/* Sync Stats Grid */}
        <Text style={styles.sectionTitle}>CHI TIẾT HÀNG ĐỢI ĐỒNG BỘ (OFFLINE QUEUE)</Text>

        <View style={styles.statsList}>
          <StatRow
            icon="swap-vertical-outline"
            label="Thao tác đang chờ"
            value={stats.pending}
            tone={stats.pending > 0 ? 'warning' : 'neutral'}
          />
          <StatRow
            icon="images-outline"
            label="Ảnh đang chờ tải lên"
            value={stats.photos}
            tone={stats.photos > 0 ? 'warning' : 'neutral'}
          />
          <StatRow
            icon="warning-outline"
            label="SOS chưa gửi thành công"
            value={stats.sos}
            tone={stats.sos > 0 ? 'danger' : 'neutral'}
          />
          <StatRow
            icon="alert-circle-outline"
            label="Lỗi đồng bộ"
            value={stats.failed}
            tone={stats.failed > 0 ? 'danger' : 'neutral'}
          />
        </View>

        {/* Retry Fallback CTA */}
        <TouchableOpacity
          style={[styles.retryBtn, (!online || busy) && { opacity: 0.7 }]}
          onPress={retry}
          disabled={busy}
          activeOpacity={0.8}
        >
          {busy ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <>
              <Ionicons name="sync" size={20} color="#FFFFFF" />
              <Text style={styles.retryBtnText}>
                {allSynced ? 'KIỂM TRA ĐỒNG BỘ LẠI' : 'THỬ LẠI ĐỒNG BỘ NGAY'}
              </Text>
            </>
          )}
        </TouchableOpacity>

        {/* Policy Explainer */}
        <View style={styles.noteBox}>
          <Ionicons name="shield-checkmark-outline" size={20} color={colors.brand} />
          <Text style={styles.noteText}>
            Hệ thống tự động chạy đồng bộ 100% khi có mạng hoặc khi mở ứng dụng. Nút "Thử lại" chỉ dùng làm phương án dự phòng khi cần cưỡng chế gửi ngay.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatRow({
  icon,
  label,
  value,
  tone,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: number;
  tone?: 'warning' | 'danger' | 'neutral';
}) {
  let color = colors.brand;
  let bg = colors.brandLight;
  if (tone === 'danger') {
    color = colors.danger;
    bg = colors.dangerSoft;
  } else if (tone === 'warning') {
    color = colors.warning;
    bg = colors.warningSoft;
  } else if (value === 0) {
    color = colors.muted;
    bg = '#F3F4F6';
  }

  return (
    <View style={styles.statRow}>
      <View style={[styles.statIconBox, { backgroundColor: bg }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.statLabel}>{label}</Text>
        <Text style={styles.statHint}>
          {value > 0 ? (tone === 'danger' ? 'Cần chú ý' : 'Sẽ tự gửi khi có mạng') : 'Đã hoàn tất'}
        </Text>
      </View>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
    </View>
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
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  stateCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 22,
    borderWidth: 1,
    borderColor: colors.line,
    ...shadow,
  },
  bigIcon: {
    width: 70,
    height: 70,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stateTitle: {
    color: colors.ink,
    fontSize: 20,
    fontWeight: '900',
    marginTop: 14,
  },
  stateText: {
    color: colors.muted,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 19,
    fontSize: 13,
  },
  lastSyncBox: {
    width: '100%',
    backgroundColor: colors.canvas,
    borderRadius: 12,
    padding: 12,
    marginTop: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastSyncLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  lastSyncValue: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: '800',
  },
  sectionTitle: {
    color: colors.muted,
    fontSize: 11,
    letterSpacing: 0.8,
    fontWeight: '900',
    marginTop: 22,
    marginBottom: 10,
    marginLeft: 2,
  },
  statsList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: colors.line,
    ...shadow,
  },
  statRow: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.lineLight,
  },
  statIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statLabel: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: '800',
  },
  statHint: {
    color: colors.muted,
    fontSize: 11,
    marginTop: 2,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '900',
  },
  retryBtn: {
    backgroundColor: colors.brand,
    height: 52,
    borderRadius: 14,
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    ...shadow,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 14,
  },
  noteBox: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: colors.brandLight,
    padding: 14,
    borderRadius: 14,
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  noteText: {
    flex: 1,
    color: colors.brandDark,
    fontSize: 12,
    lineHeight: 18,
  },
});
