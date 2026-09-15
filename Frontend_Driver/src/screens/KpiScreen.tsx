import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { OfflineBanner, ScreenTitle } from '../components';
import { useAppStore } from '../store';
import { colors, shadow, shadowLg } from '../theme';

export function KpiScreen() {
  const { online, session } = useAppStore();
  const [month, setMonth] = useState('09/2026');

  // KPI Metrics (92/100 Total - Rank A - Per BRD Table 10)
  const totalScore = 92.0;
  const rank = 'Hạng A — Xuất sắc';
  const bonusVnd = '1.800.000 đ';

  const criteria = [
    {
      id: 'trips',
      title: 'Tỷ lệ hoàn thành đúng hạn',
      weight: 'Trọng số 25%',
      score: 24.0,
      maxScore: 25.0,
      percent: 96,
      detail: '24 / 25 chuyến đúng giờ (96%)',
      icon: 'time-outline' as const,
      color: colors.brand,
    },
    {
      id: 'distance',
      title: 'Khối lượng / Diện tích thực hiện',
      weight: 'Trọng số 25%',
      score: 23.0,
      maxScore: 25.0,
      percent: 92,
      detail: '184 / 200 ha hoàn thành (92%)',
      icon: 'speedometer-outline' as const,
      color: colors.brand,
    },
    {
      id: 'hours',
      title: 'Giờ máy vận hành an toàn',
      weight: 'Trọng số 25%',
      score: 24.0,
      maxScore: 25.0,
      percent: 96,
      detail: '192 giờ máy • 0 lỗi an toàn',
      icon: 'construct-outline' as const,
      color: colors.brand,
    },
    {
      id: 'fuel',
      title: 'Tiết kiệm định mức nhiên liệu',
      weight: 'Trọng số 25%',
      score: 21.0,
      maxScore: 25.0,
      percent: 84,
      detail: 'Tiêu hao 14,2 L/ha (Định mức 15,0 L/ha)',
      icon: 'water-outline' as const,
      color: colors.warning,
    },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <OfflineBanner online={online} />

      <ScrollView contentContainerStyle={styles.content}>
        <ScreenTitle
          eyebrow="Đánh giá hiệu suất lái xe"
          title="KPI & Thi Đua"
          right={
            <View style={styles.monthBadge}>
              <Ionicons name="calendar-outline" size={14} color={colors.brand} />
              <Text style={styles.monthText}>Tháng {month}</Text>
            </View>
          }
        />

        {/* Big Score Card */}
        <View style={styles.heroCard}>
          <View style={styles.scoreTop}>
            <View>
              <Text style={styles.heroLabel}>TỔNG ĐIỂM THI ĐUA</Text>
              <View style={styles.scoreRow}>
                <Text style={styles.bigScore}>{totalScore.toFixed(1)}</Text>
                <Text style={styles.maxScore}>/ 100</Text>
              </View>
            </View>
            <View style={styles.rankPill}>
              <Ionicons name="ribbon" size={20} color={colors.brandDark} />
              <Text style={styles.rankText}>{rank}</Text>
            </View>
          </View>

          {/* Bonus Estimate */}
          <View style={styles.bonusRow}>
            <View style={styles.bonusIcon}>
              <Ionicons name="gift-outline" size={20} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.bonusLabel}>Thưởng thi đua dự kiến</Text>
              <Text style={styles.bonusValue}>+{bonusVnd}</Text>
            </View>
            <View style={styles.statusPill}>
              <Text style={styles.statusPillText}>ĐẠT CHỈ TIÊU</Text>
            </View>
          </View>
        </View>

        {/* 4 Criteria Breakdown (25% each) */}
        <Text style={styles.sectionTitle}>CHI TIẾT 4 TIÊU CHÍ ĐÁNH GIÁ (25%)</Text>

        <View style={styles.criteriaList}>
          {criteria.map(item => (
            <View style={styles.criteriaCard} key={item.id}>
              <View style={styles.critHeader}>
                <View style={[styles.critIconBox, { backgroundColor: item.color === colors.brand ? colors.brandLight : colors.warningSoft }]}>
                  <Ionicons name={item.icon} size={20} color={item.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.critTitle}>{item.title}</Text>
                  <Text style={styles.critWeight}>{item.weight} · {item.detail}</Text>
                </View>
                <View style={styles.critScoreBox}>
                  <Text style={[styles.critScore, { color: item.color }]}>
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
                      { width: `${item.percent}%`, backgroundColor: item.color },
                    ]}
                  />
                </View>
                <Text style={[styles.percentText, { color: item.color }]}>
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
              <Text style={styles.infoTitle}>An toàn lao động tuyệt đối</Text>
              <Text style={styles.infoDesc}>
                100% tuân thủ tốc độ nông trường, không có sự cố va chạm hoặc vi phạm kỷ luật.
              </Text>
            </View>
          </View>
        </View>

        <Text style={styles.ruleNote}>
          * Bảng điểm được tính tự động từ dữ liệu GPS, ODO hoàn thành chuyến và định mức nhiên liệu thực tế.
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
  monthBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
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
    fontSize: 12,
  },
  heroCard: {
    backgroundColor: colors.brand,
    borderRadius: 22,
    padding: 20,
    marginTop: 6,
    ...shadowLg,
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
  rankPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#C8E6C9',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
  },
  rankText: {
    color: colors.brandDark,
    fontSize: 13,
    fontWeight: '900',
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
  bonusIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#FFFFFF20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bonusLabel: {
    color: '#E8F5E9',
    fontSize: 12,
    fontWeight: '600',
  },
  bonusValue: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
    marginTop: 2,
  },
  statusPill: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
  },
  statusPillText: {
    color: colors.brand,
    fontSize: 10,
    fontWeight: '900',
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
