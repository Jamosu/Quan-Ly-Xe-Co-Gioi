import { Ionicons } from '@expo/vector-icons';
import NetInfo from '@react-native-community/netinfo';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { friendlyApiError, loginDriver } from '../api';
import { initialPull } from '../syncEngine';
import { colors, shadow } from '../theme';
import { useAppStore } from '../store';

export function LoginScreen() {
  const [username, setUsername] = useState('minh.nv');
  const [password, setPassword] = useState('Thaco@1234$');
  const [secure, setSecure] = useState(true);
  const [busy, setBusy] = useState(false);
  const [focusedField, setFocusedField] = useState<'username' | 'password' | null>(null);

  const setSession = useAppStore(state => state.setSession);
  const refreshLocal = useAppStore(state => state.refreshLocal);

  const submit = async () => {
    if (!username.trim() || password.length < 3) {
      return Alert.alert('Thiếu thông tin', 'Vui lòng nhập tài khoản và mật khẩu.');
    }
    const network = await NetInfo.fetch();
    if (!network.isConnected) {
      return Alert.alert('Không có mạng', 'Đăng nhập lần đầu cần kết nối máy chủ backend.');
    }
    setBusy(true);
    try {
      const session = await loginDriver(username.trim(), password);
      await setSession(session);
      await initialPull();
      await refreshLocal();
    } catch (error) {
      Alert.alert('Không thể đăng nhập', friendlyApiError(error));
    } finally {
      setBusy(false);
    }
  };

  const fillSample = (u: string) => {
    setUsername(u);
    setPassword('Thaco@1234$');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Centered Login Card Container */}
          <View style={styles.card}>
            {/* THACO AGRI Logo */}
            <View style={styles.logoHeader}>
              <Image
                source={require('../../assets/logo-text-sym.png')}
                style={styles.logoImage}
                resizeMode="contain"
              />
            </View>

            <Text style={styles.cardTitle}>Đăng nhập tài xế</Text>

            {/* Quick Sample Account Selector */}
            <View style={styles.sampleContainer}>
              <Text style={styles.sampleLabel}>Gợi ý tài khoản test nhanh:</Text>
              <View style={styles.chipRow}>
                <TouchableOpacity
                  style={[styles.chip, username === 'minh.nv' && styles.chipActive]}
                  onPress={() => fillSample('minh.nv')}
                >
                  <Text style={[styles.chipText, username === 'minh.nv' && styles.chipTextActive]}>
                    minh.nv (Nguyễn Văn Minh)
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.chip, username === 'driver.trong' && styles.chipActive]}
                  onPress={() => fillSample('driver.trong')}
                >
                  <Text style={[styles.chipText, username === 'driver.trong' && styles.chipTextActive]}>
                    driver.trong
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Username Input Field */}
            <Text style={styles.label}>Tài khoản</Text>
            <View
              style={[
                styles.field,
                focusedField === 'username' && styles.fieldFocused,
              ]}
            >
              <Ionicons
                name="person-outline"
                size={20}
                color={focusedField === 'username' ? colors.brand : colors.muted}
              />
              <TextInput
                value={username}
                onChangeText={setUsername}
                onFocus={() => setFocusedField('username')}
                onBlur={() => setFocusedField(null)}
                autoCapitalize="none"
                autoCorrect={false}
                placeholder="Nhập tên đăng nhập (VD: minh.nv)"
                placeholderTextColor="#94A3B8"
                style={styles.input}
                selectionColor={colors.brand}
              />
              {username.length > 0 && (
                <TouchableOpacity
                  onPress={() => setUsername('')}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="close-circle" size={18} color="#CBD5E1" />
                </TouchableOpacity>
              )}
            </View>

            {/* Password Input Field */}
            <Text style={styles.label}>Mật khẩu</Text>
            <View
              style={[
                styles.field,
                focusedField === 'password' && styles.fieldFocused,
              ]}
            >
              <Ionicons
                name="lock-closed-outline"
                size={20}
                color={focusedField === 'password' ? colors.brand : colors.muted}
              />
              <TextInput
                value={password}
                onChangeText={setPassword}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
                secureTextEntry={secure}
                placeholder="Nhập mật khẩu (Mặc định: Thaco@1234$)"
                placeholderTextColor="#94A3B8"
                style={styles.input}
                selectionColor={colors.brand}
              />
              <TouchableOpacity
                onPress={() => setSecure(value => !value)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons
                  name={secure ? 'eye-outline' : 'eye-off-outline'}
                  size={21}
                  color={colors.muted}
                />
              </TouchableOpacity>
            </View>

            {/* Login Submit Button */}
            <TouchableOpacity
              style={[styles.button, busy && { opacity: 0.7 }]}
              onPress={submit}
              disabled={busy}
              activeOpacity={0.8}
            >
              {busy ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Text style={styles.buttonText}>Vào ứng dụng tài xế</Text>
                  <Ionicons name="arrow-forward" size={20} color="#fff" />
                </>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.brandDark,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 30,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    paddingVertical: 28,
    ...shadow,
  },
  logoHeader: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    paddingTop: 8,
  },
  logoImage: {
    width: 220,
    height: 54,
  },
  cardTitle: {
    color: '#0F172A',
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 16,
  },
  sampleContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sampleLabel: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    backgroundColor: '#EDF2F7',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  chipActive: {
    backgroundColor: '#ECFDF5',
    borderColor: colors.brand,
  },
  chipText: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '600',
  },
  chipTextActive: {
    color: colors.brand,
    fontWeight: '800',
  },
  label: {
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '800',
    marginTop: 8,
    marginBottom: 6,
  },
  field: {
    height: 54,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F8FAFC',
  },
  fieldFocused: {
    borderColor: colors.brand,
    backgroundColor: '#ffffff',
  },
  input: {
    flex: 1,
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '600',
  },
  button: {
    height: 54,
    borderRadius: 14,
    backgroundColor: colors.brand,
    marginTop: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    ...shadow,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '900',
  },
});
