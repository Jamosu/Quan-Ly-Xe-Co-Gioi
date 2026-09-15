import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { OfflineBanner, ScreenTitle, formatDate } from '../components';
import { clearSession } from '../session';
import { useAppStore } from '../store';
import { colors, shadow } from '../theme';

export function ProfileScreen({ navigation }: any) {
  const { session, online, lastSyncAt, setSession } = useAppStore();
  const user = session?.user;

  const driverName = user?.fullName || 'Nguyễn Văn Minh';
  const driverCode = user?.code || 'NV0234';
  const klhName = 'KLH KOUN MOM';

  const logout = () => {
    Alert.alert(
      'Đăng xuất khỏi thiết bị?',
      'Dữ liệu công việc và nhật ký thao tác đã cache vẫn được lưu an toàn trên máy.',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Đăng xuất',
          style: 'destructive',
          onPress: async () => {
            await clearSession();
            await setSession(null);
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <OfflineBanner online={online} />

      <ScrollView contentContainerStyle={styles.content}>
        <ScreenTitle eyebrow="Tài khoản & Thiết bị" title="Hồ sơ cá nhân" />

        {/* Profile Header Card */}
        <View style={styles.card}>
          <View style={styles.avatar}>
            {user?.avatarUrl ? (
              <Image source={{ uri: user.avatarUrl }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarText}>
                {driverName.split(' ').map(item => item[0]).slice(-2).join('')}
              </Text>
            )}
          </View>

          <Text style={styles.name}>{driverName}</Text>
          <Text style={styles.code}>{driverCode} • {klhName}</Text>

          <View style={styles.badgeRow}>
            <View style={styles.activePill}>
              <View style={styles.dot} />
              <Text style={styles.activeText}>Đang làm việc</Text>
            </View>
            <View style={[styles.activePill, !online && { backgroundColor: '#FFFFFF15' }]}>
              <View style={[styles.dot, !online && { backgroundColor: colors.warning }]} />
              <Text style={styles.activeText}>{online ? 'Online' : 'Offline'}</Text>
            </View>
          </View>
        </View>

        {/* Driver Details List */}
        <View style={styles.details}>
          <Row icon="person-outline" label="Tên tài khoản" value={user?.username || 'minh.nv'} />
          <Row icon="call-outline" label="Số điện thoại" value={user?.phone || '0988 123 456'} />
          <Row icon="card-outline" label="Giấy phép lái xe (GPLX)" value="Hạng FC · Bằng lái máy kéo A4" />
          <Row icon="car-outline" label="Phương tiện phụ trách" value="MK-023 · John Deere 6120" />
          <Row icon="business-outline" label="Đơn vị trực thuộc" value={klhName} />
          <Row icon="people-outline" label="Đội/Tổ công tác" value="Độc lập" />
          <Row
            icon="cloud-done-outline"
            label="Lần đồng bộ cuối"
            value={lastSyncAt ? formatDate(lastSyncAt, true, true) : 'Chưa đồng bộ'}
          />
        </View>

        {/* Sync Center Navigation Button */}
        <TouchableOpacity
          style={styles.syncBtn}
          onPress={() => navigation.navigate('Sync')}
          activeOpacity={0.8}
        >
          <View style={styles.syncIconBox}>
            <Ionicons name="sync" size={20} color={colors.brand} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.syncTitle}>Trạng thái đồng bộ dữ liệu</Text>
            <Text style={styles.syncSub}>Xem chi tiết hàng đợi thao tác và ảnh chờ</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.muted} />
        </TouchableOpacity>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logout} onPress={logout} activeOpacity={0.8}>
          <Ionicons name="log-out-outline" size={20} color={colors.danger} />
          <Text style={styles.logoutText}>Đăng xuất tài khoản</Text>
        </TouchableOpacity>

        <Text style={styles.version}>THACO AGRI Fleet Management · Driver App v1.2.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.rowIcon}>
        <Ionicons name={icon} size={20} color={colors.brand} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>{value}</Text>
      </View>
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
  card: {
    backgroundColor: colors.brand,
    borderRadius: 22,
    padding: 22,
    alignItems: 'center',
    ...shadow,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.brandLight,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarText: {
    color: colors.brandDark,
    fontSize: 26,
    fontWeight: '900',
  },
  name: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
    marginTop: 12,
  },
  code: {
    color: '#C8E6C9',
    marginTop: 4,
    fontWeight: '800',
    fontSize: 13,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
  },
  activePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: '#FFFFFF22',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#86EFAC',
  },
  activeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  details: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    marginTop: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: colors.line,
    ...shadow,
  },
  row: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.lineLight,
  },
  rowIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.brandLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '700',
  },
  value: {
    color: colors.ink,
    fontWeight: '800',
    fontSize: 13,
    marginTop: 2,
  },
  syncBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginTop: 14,
    borderWidth: 1,
    borderColor: colors.line,
    ...shadow,
  },
  syncIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.brandLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  syncTitle: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: '800',
  },
  syncSub: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 2,
  },
  logout: {
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    backgroundColor: colors.dangerSoft,
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  logoutText: {
    color: colors.danger,
    fontWeight: '900',
    fontSize: 14,
  },
  version: {
    color: colors.muted,
    textAlign: 'center',
    marginTop: 18,
    fontSize: 12,
  },
});
