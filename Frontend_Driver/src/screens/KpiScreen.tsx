import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../api';
import { OfflineBanner, ScreenTitle } from '../components';
import { useAppStore } from '../store';
import { colors, shadow, shadowLg } from '../theme';

interface KpiData {
  id?: number;
  driverId: number;
  monthYear: string;
  totalScore: number;
  rankGrade?: 'HANG_A' | 'HANG_B' | 'HANG_C' | 'HANG_D' | null;
  tripsCount?: number;
  tripsScore?: number;
  distanceKm?: number;
  distanceScore?: number;
  machineHours?: number;
  hoursScore?: number;
  fuelSavedLiters?: number;
  fuelScore?: number;
  bonusAmountVnd?: number;
}

const MONTH_OPTIONS = ['09/2026', '08/2026', '07/2026'];

export function KpiScreen() {
  const { online } = useAppStore();
  const [month, setMonth] = useState('09/2026');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [kpiData, setKpiData] = useState<KpiData | null>(null);

  const fetchKpi = useCallback(async (targetMonth: string) => {
    try {
      setLoading(true);
      const res = (await api.get('/mobile/driver/my-kpi', {
        params: { monthYear: targetMonth },
      })) as any;
      if (res && res.totalScore != null) {
        setKpiData(res);
      } else {
        setKpiData(null);
      }
    } catch {
      setKpiData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchKpi(month);
  }, [fetchKpi, month]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchKpi(month);
    setRefreshing(false);
  };

  const handlePrevMonth = () => {
    const idx = MONTH_OPTIONS.indexOf(month);
    if (idx < MONTH_OPTIONS.length - 1) {
      setMonth(MONTH_OPTIONS[idx + 1]);
    }
  };

  const handleNextMonth = () => {
    const idx = MONTH_OPTIONS.indexOf(month);
    if (idx > 0) {
      setMonth(MONTH_OPTIONS[idx - 1]);
    }
  };

  const hasData = kpiData !== null && kpiData.totalScore != null;
  const totalScore = hasData ? Number(kpiData.totalScore) : 0;

  const rankLabel = (() => {
    if (!hasData || !kpiData.rankGrade) return 'Chưa có đánh giá';
    switch (kpiData.rankGrade) {
      case 'HANG_A':
        return 'Hạng A — Xuất sắc';
      case 'HANG_B':
        return 'Hạng B — Khá';
      case 'HANG_C':
        return 'Hạng C — Đạt';
      case 'HANG_D':
        return 'Hạng D — Cần cải thiện';
      default:
        return 'Chưa có đánh giá';
    }
  })();

  const bonusVnd =
    hasData && kpiData.bonusAmountVnd
      ? `${Number(kpiData.bonusAmountVnd).toLocaleString('vi-VN')} đ`
      : '0 đ';

  const tripsScore = hasData ? Number(kpiData.tripsScore || 0) : 0;
  const distanceScore = hasData ? Number(kpiData.distanceScore || 0) : 0;
  const hoursScore = hasData ? Number(kpiData.hoursScore || 0) : 0;
  const fuelScore = hasData ? Number(kpiData.fuelScore || 0) : 0;

  const criteria = [
    {
      id: 'trips',
      title: 'Tỷ lệ hoàn thành đúng hạn',
      weight: 'Trọng số 25%',
      score: tripsScore,
      maxScore: 25.0,
      percent: Math.min(100, Math.round((tripsScore / 25.0) * 100)),
      detail: hasData
        ? `${kpiData.tripsCount || 0} chuyến hoàn thành`
        : 'Chưa có chuyến ghi nhận',
      icon: 'time-outline' as const,
      color: colors.brand,
    },
    {
      id: 'distance',
      title: 'Khối lượng / Quãng đường vận hành',
      weight: 'Trọng số 25%',
      score: distanceScore,
      maxScore: 25.0,
      percent: Math.min(100, Math.round((distanceScore / 25.0) * 100)),
      detail: hasData
        ? `${kpiData.distanceKm || 0} km vận hành`
        : 'Chưa có dữ liệu quãng đường',
      icon: 'speedometer-outline' as const,
      color: colors.brand,
    },
    {
      id: 'hours',
      title: 'Giờ máy vận hành an toàn',
      weight: 'Trọng số 25%',
      score: hoursScore,
      maxScore: 25.0,
      percent: Math.min(100, Math.round((hoursScore / 25.0) * 100)),
      detail: hasData
        ? `${kpiData.machineHours || 0} giờ máy • 0 lỗi an toàn`
        : 'Chưa có dữ liệu giờ máy',
      icon: 'construct-outline' as const,
      color: colors.brand,
    },
    {
      id: 'fuel',
      title: 'Tiết kiệm định mức nhiên liệu',
      weight: 'Trọng số 25%',
      score: fuelScore,
      maxScore: 25.0,
      percent: Math.min(100, Math.round((fuelScore / 25.0) * 100)),
      detail: hasData
        ? kpiData.fuelSavedLiters != null
          ? kpiData.fuelSavedLiters >= 0
            ? `Tiết kiệm ${kpiData.fuelSavedLiters} L dầu`
            : `Vượt định mức ${Math.abs(kpiData.fuelSavedLiters)} L dầu`
          : 'Định mức tiêu chuẩn'
        : 'Chưa có đối soát tiêu hao',
      icon: 'water-outline' as const,
      color: hasData && (kpiData.fuelSavedLiters || 0) < 0 ? colors.danger : colors.warning,
    },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <OfflineBanner online={online} />

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.brand}
          />
        }
      >
        <ScreenTitle
          eyebrow="Đánh giá hiệu suất lái xe"
          title="KPI & Thi Đua"
          right={
            <View style={styles.monthSelector}>
              <TouchableOpacity
                onPress={handlePrevMonth}
                disabled={MONTH_OPTIONS.indexOf(month) >= MONTH_OPTIONS.length - 1}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons
                  name="chevron-back"
                  size={16}
                  color={
                    MONTH_OPTIONS.indexOf(month) >= MONTH_OPTIONS.length - 1
                      ? colors.inactive
                      : colors.brand
                  }
                />
              </TouchableOpacity>
              <Text style={styles.monthText}>{month}</Text>
              <TouchableOpacity
                onPress={handleNextMonth}
                disabled={MONTH_OPTIONS.indexOf(month) <= 0}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color={
                    MONTH_OPTIONS.indexOf(month) <= 0
                      ? colors.inactive
                      : colors.brand
                  }
                />
              </TouchableOpacity>
            </View>
          }
        />

        {loading && !refreshing ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color={colors.brand} />
            <Text style={styles.loadingText}>Đang tải dữ liệu thi đua...</Text>
          </View>
        ) : null}

        {/* Big Score Card */}
        <View style={[styles.heroCard, !hasData && styles.heroCardEmpty]}>
          <View style={styles.scoreTop}>
            <View>
              <Text style={[styles.heroLabel, !hasData && styles.heroLabelEmpty]}>
                TỔNG ĐIỂM THI ĐUA
              </Text>
              <View style={styles.scoreRow}>
                <Text style={styles.bigScore}>
                  {hasData ? totalScore.toFixed(1) : '—'}
                </Text>
                <Text style={[styles.maxScore, !hasData && styles.maxScoreEmpty]}>
                  / 100
                </Text>
              </View>
            </View>
            <View style={[styles.rankPill, !hasData && styles.rankPillEmpty]}>
              <Ionicons
                name={hasData ? 'ribbon' : 'time-outline'}
                size={18}
                color={hasData ? colors.brandDark : colors.muted}
              />
              <Text style={[styles.rankText, !hasData && styles.rankTextEmpty]}>
                {rankLabel}
              </Text>
            </View>
          </View>

          {/* Bonus Estimate */}
          <View style={[styles.bonusRow, !hasData && styles.bonusRowEmpty]}>
            <View style={[styles.bonusIcon, !hasData && styles.bonusIconEmpty]}>
              <Ionicons
                name="gift-outline"
                size={20}
                color={hasData ? '#FFFFFF' : colors.muted}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.bonusLabel, !hasData && styles.bonusLabelEmpty]}>
                Thưởng thi đua dự kiến
              </Text>
              <Text style={[styles.bonusValue, !hasData && styles.bonusValueEmpty]}>
                {bonusVnd}
              </Text>
            </View>
            <View style={[styles.statusPill, !hasData && styles.statusPillEmpty]}>
              <Text style={[styles.statusPillText, !hasData && styles.statusPillTextEmpty]}>
                {hasData ? 'ĐÃ ĐÁNH GIÁ' : 'CHƯA CHỐT KỲ'}
              </Text>
            </View>
          </View>
        </View>

        {!hasData && (
          <View style={styles.emptyNoticeCard}>
            <Ionicons name="information-circle-outline" size={22} color={colors.brand} />
            <View style={{ flex: 1 }}>
              <Text style={styles.emptyNoticeTitle}>Chưa có dữ liệu kỳ {month}</Text>
              <Text style={styles.emptyNoticeDesc}>
                Kỳ đánh giá KPI tháng {month} chưa được chốt hoặc chưa có dữ liệu chấm điểm từ hệ thống điều hành.
              </Text>
            </View>
          </View>
        )}

        {/* 4 Criteria Breakdown (25% each) */}
        <Text style={styles.sectionTitle}>CHI TIẾT 4 TIÊU CHÍ ĐÁNH GIÁ (25%)</Text>

        <View style={styles.criteriaList}>
          {criteria.map(item => (
            <View style={styles.criteriaCard} key={item.id}>
              <View style={styles.critHeader}>
                <View
                  style={[
                    styles.critIconBox,
                    {
                      backgroundColor: !hasData
                        ? '#F3F4F6'
                        : item.color === colors.brand
                        ? colors.brandLight
                        : item.color === colors.danger
                        ? colors.dangerSoft
                        : colors.warningSoft,
                    },
                  ]}
                >
                  <Ionicons
                    name={item.icon}
                    size={20}
                    color={!hasData ? colors.muted : item.color}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.critTitle}>{item.title}</Text>
                  <Text style={styles.critWeight}>
                    {item.weight} · {item.detail}
                  </Text>
                </View>
                <View style={styles.critScoreBox}>
                  <Text
                    style={[
                      styles.critScore,
                      { color: !hasData ? colors.muted : item.color },
                    ]}
                  >
                    {item.score.toFixed(1)}
                  </Text>
                  <Text style={styles.critMax}>/{item.maxScore.toFixed(0)}</Text>
                </View>
              </View>

              {/* Progress bar */}
              <View style={styles.barContainer}>
                <View style={styles.barBg}>
                  <View
                    style={[
                      styles.barFill,
                      {
                        width: `${item.percent}%`,
                        backgroundColor: !hasData ? colors.line : item.color,
                      },
                    ]}
                  />
                </View>
                <Text
                  style={[
                    styles.percentText,
                    { color: !hasData ? colors.muted : item.color },
                  ]}
                >
                  {item.percent}%
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Safety & Recognition */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Ionicons name="shield-checkmark" size={24} color={colors.brand} />
            <View style={{ flex: 1 }}>
              <Text style={styles.infoTitle}>An toàn lao động nông trường</Text>
              <Text style={styles.infoDesc}>
                Tuân thủ tốc độ nông trường, không có sự cố va chạm hoặc vi phạm kỷ luật vận hành.
              </Text>
            </View>
          </View>
        </View>

        <Text style={styles.ruleNote}>
          * Bảng điểm được tính tự động từ dữ liệu GPS, ODO hoàn thành chuyến và đối soát tiêu hao nhiên liệu thực tế.
        </Text>
      </ScrollView>
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
  monthSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    backgroundColor: colors.brandLight,
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  monthText: {
    color: colors.brand,
    fontWeight: '800',
    fontSize: 13,
  },
  loadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginVertical: 8,
  },
  loadingText: {
    color: colors.muted,
    fontSize: 12,
  },
  heroCard: {
    backgroundColor: colors.brand,
    borderRadius: 22,
    padding: 20,
    marginTop: 6,
    ...shadowLg,
  },
  heroCardEmpty: {
    backgroundColor: '#374151',
  },
  scoreTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  heroLabel: {
    color: '#C8E6C9',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  heroLabelEmpty: {
    color: '#9CA3AF',
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 4,
    gap: 4,
  },
  bigScore: {
    color: '#FFFFFF',
    fontSize: 48,
    fontWeight: '900',
    lineHeight: 52,
  },
  maxScore: {
    color: '#E8F5E9',
    fontSize: 18,
    fontWeight: '700',
  },
  maxScoreEmpty: {
    color: '#9CA3AF',
  },
  rankPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#C8E6C9',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
  },
  rankPillEmpty: {
    backgroundColor: '#4B5563',
  },
  rankText: {
    color: colors.brandDark,
    fontSize: 13,
    fontWeight: '900',
  },
  rankTextEmpty: {
    color: '#D1D5DB',
  },
  bonusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF18',
    borderRadius: 14,
    padding: 12,
    marginTop: 18,
    borderWidth: 1,
    borderColor: '#FFFFFF22',
  },
  bonusRowEmpty: {
    backgroundColor: '#1F293755',
    borderColor: '#4B556355',
  },
  bonusIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#FFFFFF20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bonusIconEmpty: {
    backgroundColor: '#4B5563',
  },
  bonusLabel: {
    color: '#E8F5E9',
    fontSize: 12,
    fontWeight: '600',
  },
  bonusLabelEmpty: {
    color: '#9CA3AF',
  },
  bonusValue: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
    marginTop: 2,
  },
  bonusValueEmpty: {
    color: '#E5E7EB',
  },
  statusPill: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
  },
  statusPillEmpty: {
    backgroundColor: '#4B5563',
  },
  statusPillText: {
    color: colors.brand,
    fontSize: 10,
    fontWeight: '900',
  },
  statusPillTextEmpty: {
    color: '#E5E7EB',
  },
  emptyNoticeCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#DCFCE7',
    borderRadius: 14,
    padding: 14,
    marginTop: 12,
  },
  emptyNoticeTitle: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 2,
  },
  emptyNoticeDesc: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 17,
  },
  sectionTitle: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
    marginTop: 22,
    marginBottom: 12,
    marginLeft: 2,
  },
  criteriaList: {
    gap: 10,
  },
  criteriaCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.line,
    ...shadow,
  },
  critHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  critIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  critTitle: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: '800',
  },
  critWeight: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 2,
  },
  critScoreBox: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  critScore: {
    fontSize: 18,
    fontWeight: '900',
  },
  critMax: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
  },
  barContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
  },
  barBg: {
    flex: 1,
    height: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
  percentText: {
    fontSize: 12,
    fontWeight: '800',
    width: 38,
    textAlign: 'right',
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginTop: 14,
    borderWidth: 1,
    borderColor: colors.line,
    ...shadow,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  infoTitle: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: '800',
  },
  infoDesc: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
  },
  ruleNote: {
    color: colors.muted,
    fontSize: 11,
    textAlign: 'center',
    marginTop: 18,
    lineHeight: 16,
  },
});
