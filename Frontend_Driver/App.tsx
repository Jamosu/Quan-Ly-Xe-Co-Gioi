import { Ionicons } from '@expo/vector-icons';
import NetInfo from '@react-native-community/netinfo';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  AppState,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { TasksStackParams } from './src/navigationTypes';
import { registerBackgroundSync } from './src/backgroundSync';
import { AlertsScreen } from './src/screens/AlertsScreen';
import { HistoryScreen } from './src/screens/HistoryScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { KpiScreen } from './src/screens/KpiScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { SyncCenterScreen } from './src/screens/SyncCenterScreen';
import { TaskDetailScreen } from './src/screens/TaskDetailScreen';
import {
  FloatingSOSButton,
  ReconnectBanner,
  SOSModal,
} from './src/components';
import { enqueueEvent } from './src/database';
import { currentCoordinates } from './src/deviceEvidence';
import { useAppStore } from './src/store';
import { syncNow } from './src/syncEngine';
import { colors, shadow } from './src/theme';
import { api } from './src/api';

const Stack = createNativeStackNavigator<TasksStackParams>();
const Tabs = createBottomTabNavigator();

function TasksStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Tasks" component={HomeScreen} />
      <Stack.Screen name="TaskDetail" component={TaskDetailScreen} />
      <Stack.Screen name="SyncCenter" component={SyncCenterScreen} />
    </Stack.Navigator>
  );
}

function MainTabs() {
  return (
    <Tabs.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.inactive,
        tabBarStyle: {
          height: 64,
          paddingTop: 4,
          paddingBottom: 6,
          borderTopColor: colors.line,
          backgroundColor: '#FFFFFF',
          ...shadow,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
          marginTop: 1,
        },
        tabBarIconStyle: {
          marginTop: 0,
        },
        tabBarIcon: ({ color, focused }) => {
          const icons: Record<
            string,
            { focused: keyof typeof Ionicons.glyphMap; unfocused: keyof typeof Ionicons.glyphMap }
          > = {
            TasksTab: { focused: 'clipboard', unfocused: 'clipboard-outline' },
            History: { focused: 'time', unfocused: 'time-outline' },
            Alerts: { focused: 'notifications', unfocused: 'notifications-outline' },
            Kpi: { focused: 'stats-chart', unfocused: 'stats-chart-outline' },
            Profile: { focused: 'person', unfocused: 'person-outline' },
          };
          const iconPair = icons[route.name] || { focused: 'ellipse', unfocused: 'ellipse-outline' };
          const iconName = focused ? iconPair.focused : iconPair.unfocused;
          return <Ionicons name={iconName} color={color} size={24} />;
        },
      })}
    >
      <Tabs.Screen
        name="TasksTab"
        component={TasksStack}
        options={{ title: 'Nhiệm vụ' }}
      />
      <Tabs.Screen
        name="History"
        component={HistoryScreen}
        options={{ title: 'Lịch sử' }}
      />
      <Tabs.Screen
        name="Alerts"
        component={AlertsScreen}
        options={{
          title: 'Cảnh báo',
          tabBarBadge: 3,
          tabBarBadgeStyle: {
            backgroundColor: colors.danger,
            fontSize: 10,
            fontWeight: '900',
            color: '#FFFFFF',
          },
        }}
      />
      <Tabs.Screen
        name="Kpi"
        component={KpiScreen}
        options={{ title: 'KPI' }}
      />
      <Tabs.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ title: 'Cá nhân' }}
      />
    </Tabs.Navigator>
  );
}

export default function App() {
  const { ready, session, offlineUnlocked, bootstrap, online, setOnline, refreshLocal } = useAppStore();
  const previousOnline = useRef<boolean | null>(null);

  // Reconnect banner states
  const [reconnectVisible, setReconnectVisible] = useState(false);
  const [reconnectSyncing, setReconnectSyncing] = useState(false);

  // Global SOS Modal
  const [showSOSModal, setShowSOSModal] = useState(false);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  // Network listener & Auto-sync trigger
  useEffect(() => {
    return NetInfo.addEventListener(state => {
      const isConnected = Boolean(state.isConnected && state.isInternetReachable !== false);
      setOnline(isConnected);

      // Transition from Offline -> Online
      if (isConnected && previousOnline.current === false && useAppStore.getState().session) {
        setReconnectVisible(true);
        setReconnectSyncing(true);

        syncNow()
          .finally(() => {
            refreshLocal();
            setReconnectSyncing(false);
            // Hide banner after 3.5 seconds
            setTimeout(() => {
              setReconnectVisible(false);
            }, 3500);
          });
      }

      previousOnline.current = isConnected;
    });
  }, [refreshLocal, setOnline]);

  useEffect(() => {
    if (!session) return;
    registerBackgroundSync().catch(() => undefined);
    syncNow().finally(refreshLocal);

    // Mobile heartbeat to keep presence live
    const sendMobileHeartbeat = () => {
      api.post('/auth/heartbeat', { platform: 'MOBILE' }).catch(() => {});
    };
    sendMobileHeartbeat();
    const heartbeatTimer = setInterval(sendMobileHeartbeat, 30000);

    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') {
        sendMobileHeartbeat();
        syncNow().finally(refreshLocal);
      }
    });

    return () => {
      clearInterval(heartbeatTimer);
      subscription.remove();
    };
  }, [session, refreshLocal]);

  // Global SOS Submission handler
  const handleGlobalSOS = async (type: string, desc: string) => {
    const isOnline = useAppStore.getState().online;
    try {
      const gps = await currentCoordinates().catch(() => ({}));
      await enqueueEvent({
        eventType: 'SOS_CREATED',
        payload: {
          vehicleId: session?.user?.assignedVehicleId || 1,
          emergencyType: type,
          description: desc || 'Tài xế kích hoạt SOS khẩn cấp ngoài hiện trường.',
          lotLocation: 'Vị trí hiện trường KLH Koun Mom',
        },
        ...gps,
        note: `SOS: ${desc || type}`,
      });

      Alert.alert(
        'Tín hiệu SOS đã ghi nhận',
        isOnline
          ? 'Đội cứu hộ cơ động TT BTSC đã tiếp nhận điều phối.'
          : '🔴 SOS đã được lưu trên thiết bị.\nChưa thể gửi tới Trung tâm vì hiện không có Internet.\nHệ thống sẽ tự động gửi ngay khi có kết nối.'
      );

      if (isOnline) await syncNow();
      await refreshLocal();
    } catch (error) {
      Alert.alert('Lỗi', 'Chưa thể ghi nhận SOS. Vui lòng thử lại.');
    }
  };

  if (!ready) {
    return (
      <SafeAreaProvider>
        <StatusBar style="light" />
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={colors.lime} />
        </View>
      </SafeAreaProvider>
    );
  }

  const authenticated = Boolean(session && offlineUnlocked);

  return (
    <SafeAreaProvider>
      <StatusBar style={authenticated ? 'dark' : 'light'} />
      <NavigationContainer>
        {authenticated ? (
          <View style={styles.flex}>
            <ReconnectBanner visible={reconnectVisible} syncing={reconnectSyncing} />
            <MainTabs />

            {/* Global Floating Red SOS Button */}
            <FloatingSOSButton onPress={() => setShowSOSModal(true)} />

            {/* Emergency SOS Dialog */}
            <SOSModal
              visible={showSOSModal}
              online={online}
              onClose={() => setShowSOSModal(false)}
              onSubmit={handleGlobalSOS}
            />
          </View>
        ) : (
          <LoginScreen />
        )}
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  loading: {
    flex: 1,
    backgroundColor: colors.brandDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
