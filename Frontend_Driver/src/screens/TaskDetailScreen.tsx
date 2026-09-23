import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  IncidentModal,
  OfflineBanner,
  ProgressModal,
  ScheduleChangeModal,
  SyncPill,
  formatDate,
  statusLabel,
} from '../components';
import { addAttachment, enqueueEvent, getOrder, getOrderEvents } from '../database';
import { capturePrivatePhoto, currentCoordinates } from '../deviceEvidence';
import { TasksStackParams } from '../navigationTypes';
import { useAppStore } from '../store';
import { syncNow } from '../syncEngine';
import { colors, shadow, shadowLg } from '../theme';
import { LocalOrder, MobileEventType } from '../types';

export function TaskDetailScreen({ route, navigation }: NativeStackScreenProps<TasksStackParams, 'TaskDetail'>) {
  const [order, setOrder] = useState<LocalOrder | null>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [timerString, setTimerString] = useState('01:42:18');

  // Modal visibility states
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [showIncidentModal, setShowIncidentModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [startOdo, setStartOdo] = useState('');
  const [finishOdo, setFinishOdo] = useState('');
  const [completionNotes, setCompletionNotes] = useState('');
  const [showDailyReport, setShowDailyReport] = useState(false);
  const [reportQuantity, setReportQuantity] = useState('');
  const [reportNote, setReportNote] = useState('');
  const [reportWorkCompleted, setReportWorkCompleted] = useState(false);

  const { online, refreshLocal } = useAppStore();

  const load = useCallback(async () => {
    const next = await getOrder(route.params.localKey);
    setOrder(next);
    if (next) {
      try {
        const report = JSON.parse(next.raw_json || '{}').dailyReport;
        if (report) {
          setReportQuantity(String(report.quantityToday ?? ''));
          setReportNote(report.note ?? '');
          setReportWorkCompleted(Boolean(report.workCompleted));
        }
      } catch {
        // Keep the local form values when an old cached payload is malformed.
      }
    }
    setEvents(await getOrderEvents(route.params.localKey));
  }, [route.params.localKey]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  // Live work timer when status is WORKING or IN_TRANSIT
  useEffect(() => {
    if (!order?.actual_start || !['WORKING', 'IN_TRANSIT'].includes(order.local_status)) return;
    const interval = setInterval(() => {
      const startMs = new Date(order.actual_start!).getTime();
      const diffSec = Math.max(0, Math.floor((Date.now() - startMs) / 1000));
      const hours = Math.floor(diffSec / 3600);
      const mins = Math.floor((diffSec % 3600) / 60);
      const secs = diffSec % 60;
      setTimerString(
        `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
      );
    }, 1000);
    return () => clearInterval(interval);
  }, [order?.actual_start, order?.local_status]);

  const act = async (eventType: MobileEventType, payload: Record<string, unknown> = {}, actionNote?: string) => {
    if (!order) return;
    setBusy(true);
    try {
      const gps = await currentCoordinates().catch(() => ({}));
      await enqueueEvent({
        eventType,
        order,
        payload: { ...payload, vehicleId: order.vehicle_id, driverId: useAppStore.getState().session?.user.id },
        ...gps,
        note: actionNote,
      });

      if (online) await syncNow();
      await Promise.all([load(), refreshLocal()]);
    } catch (error) {
      Alert.alert('Chưa thể lưu thao tác', error instanceof Error ? error.message : 'Vui lòng thử lại.');
    } finally {
      setBusy(false);
    }
  };

  // Photo capture for evidence
  const takeEvidencePhoto = async () => {
    if (!order) return;
    setBusy(true);
    try {
      const localPath = await capturePrivatePhoto();
      if (!localPath) return;
      const gps = await currentCoordinates().catch(() => ({}));
      const eventId = await enqueueEvent({
        eventType: 'PHOTO_ADDED',
        order,
        payload: { vehicleId: order.vehicle_id, photoType: 'WORK_EVIDENCE' },
        ...gps,
        note: 'Ảnh hiện trường nghiệm thu',
      });
      await addAttachment({
        eventId,
        orderKey: order.local_key,
        localPath,
        type: 'WORK_EVIDENCE',
        ...gps,
      });

      Alert.alert(
        'Đã lưu ảnh hiện trường',
        online
          ? 'Ảnh đã được lưu và hệ thống đang tự động tải lên máy chủ.'
          : 'Ảnh đang được bảo mật trên máy. Sẽ tự động tải lên khi có mạng.'
      );

      if (online) await syncNow();
      await Promise.all([load(), refreshLocal()]);
    } catch (error) {
      Alert.alert('Không thể lưu ảnh', error instanceof Error ? error.message : 'Vui lòng thử lại.');
    } finally {
      setBusy(false);
    }
  };

  // Emergency SOS signal
  const triggerSOS = () => {
    Alert.alert(
      'Gửi tín hiệu SOS khẩn cấp?',
      'SOS được lưu ngay trên thiết bị và luôn đứng đầu danh sách đồng bộ.',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'GỬI SOS NGAY',
          style: 'destructive',
          onPress: async () => {
            if (!order?.vehicle_id) {
              return Alert.alert('Chưa có xe', 'Nhiệm vụ này chưa được gán phương tiện.');
            }
            setBusy(true);
            try {
              const gps = await currentCoordinates().catch(() => ({}));
              await enqueueEvent({
                eventType: 'SOS_CREATED',
                order,
                payload: {
                  vehicleId: order.vehicle_id,
                  emergencyType: 'HONG_MAY',
                  description: 'Tài xế yêu cầu cứu hộ khẩn cấp tại hiện trường.',
                  lotLocation: order.destination || order.origin || 'Vị trí hiện trường',
                },
                ...gps,
                note: 'SOS',
              });

              Alert.alert(
                'Tín hiệu SOS đã được ghi nhận',
                online
                  ? 'Đội cứu hộ cơ động TT BTSC đã tiếp nhận điều phối.'
                  : '🔴 Đã lưu an toàn trên máy. Hệ thống sẽ tự động gửi ngay khi có kết nối.'
              );

              if (online) await syncNow();
              await Promise.all([load(), refreshLocal()]);
            } finally {
              setBusy(false);
            }
          },
        },
      ]
    );
  };

  if (!order) {
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator color={colors.brand} style={{ marginTop: 80 }} size="large" />
      </SafeAreaView>
    );
  }

  const isAssigned = order.local_status === 'ASSIGNED';
  const isAccepted = order.local_status === 'DRIVER_ACCEPTED';
  const canStart = ['DRIVER_ACCEPTED', 'VEHICLE_RECEIVED', 'DEPARTED', 'AT_WORKSITE', 'READY_TO_CONTINUE'].includes(order.local_status);
  const isWorking = ['WORKING', 'IN_TRANSIT'].includes(order.local_status);
  const isPaused = order.local_status === 'PAUSED';
  const isOnBreak = order.local_status === 'ON_BREAK';
  const isDone = ['COMPLETED', 'DELIVERED', 'ACCEPTED', 'CLOSED', 'SUBMITTED_FOR_ACCEPTANCE'].includes(order.local_status);
  const hasProgressToday = events.some((event) => event.event_type === 'PROGRESS_UPDATED' && new Date(event.occurred_at).toDateString() === new Date().toDateString());
  const rawOrder = (() => { try { return JSON.parse(order.raw_json || '{}'); } catch { return {}; } })();
  const reportOpenAt = rawOrder.reportOpenAt ? new Date(rawOrder.reportOpenAt).getTime() : undefined;
  const reportDeadlineAt = rawOrder.reportDeadlineAt ? new Date(rawOrder.reportDeadlineAt).getTime() : undefined;
  const reportStatus = rawOrder.dailyReport?.status as string | undefined;
  const dailyReport = rawOrder.dailyReport as {
    quantityToday?: number; unit?: string; note?: string; workCompleted?: boolean;
    evidenceUrls?: string[]; submittedByType?: string; submittedBy?: { fullName?: string };
    managerReason?: string; reportSubmittedAt?: string;
  } | undefined;
  const reportCanOpen = reportOpenAt !== undefined && Date.now() >= reportOpenAt;
  const reportMinutesLeft = reportDeadlineAt !== undefined ? Math.max(0, Math.ceil((reportDeadlineAt - Date.now()) / 60_000)) : undefined;

  const startWork = async () => {
    const value = Number(startOdo);
    if (!startOdo.trim() || !Number.isFinite(value) || value < 0) {
      Alert.alert('Thiếu ODO / giờ máy', 'Vui lòng nhập chỉ số bắt đầu hợp lệ.');
      return;
    }
    await act('JOB_STARTED', { startOdoKm: value });
  };

  const pauseWork = () => Alert.alert('Lý do tạm dừng', 'Chọn nguyên nhân gián đoạn công việc.', [
    { text: 'Thời tiết', onPress: () => void act('WORK_PAUSED', { reason: 'WEATHER' }, 'Tạm dừng do thời tiết') },
    { text: 'Chờ vật tư', onPress: () => void act('WORK_PAUSED', { reason: 'WAITING_MATERIAL' }, 'Chờ vật tư') },
    { text: 'Chờ điều độ', onPress: () => void act('WORK_PAUSED', { reason: 'WAITING_DISPATCH' }, 'Chờ điều độ') },
    { text: 'Sự cố xe', onPress: () => void act('WORK_PAUSED', { reason: 'VEHICLE_ISSUE' }, 'Sự cố phương tiện') },
    { text: 'Hủy', style: 'cancel' },
  ]);

  const requestEndDay = () => {
    if (!finishOdo.trim() || !Number.isFinite(Number(finishOdo)) || Number(finishOdo) < 0) {
      Alert.alert('Thiếu ODO / giờ máy', 'Vui lòng nhập chỉ số kết thúc hợp lệ.');
      return false;
    }
    const submit = (confirmNoProgress: boolean) => void act('WORK_SESSION_ENDED', { finishOdoKm: Number(finishOdo), completionNotes, confirmNoProgress }, completionNotes);
    if (hasProgressToday) submit(false);
    else Alert.alert('Chưa báo cáo tiến độ', 'Hôm nay không phát sinh khối lượng hay bạn chưa nhập báo cáo?', [
      { text: 'Quay lại báo cáo', style: 'cancel' },
      { text: 'Không phát sinh', onPress: () => submit(true) },
    ]);
    return true;
  };

  const saveDailyReport = async (submit: boolean) => {
    const quantityToday = Number(reportQuantity || 0);
    if (!Number.isFinite(quantityToday) || quantityToday < 0) {
      Alert.alert('Khối lượng không hợp lệ', 'Vui lòng nhập số lớn hơn hoặc bằng 0.');
      return;
    }
    await act(submit ? 'DAILY_REPORT_SUBMITTED' : 'DAILY_REPORT_DRAFT_SAVED', {
      quantityToday,
      unit: rawOrder.operationalWorkOrder?.targetUnit,
      startOdoKm: startOdo ? Number(startOdo) : undefined,
      endOdoKm: finishOdo ? Number(finishOdo) : undefined,
      note: reportNote,
      workCompleted: reportWorkCompleted,
    }, reportNote);
    if (submit) setShowDailyReport(false);
  };

  // Compute work progress
  const isTransport = order.order_type === 'TRANSPORT';
  let progressText = '';
  let progressPercent = 0;
  try {
    const raw = JSON.parse(order.raw_json || '{}');
    if (isTransport) {
      const tonnage = Number(raw.tonnage || 0);
      const doneTonnage = Number(raw.completedTonnage || 0);
      if (tonnage > 0) {
        if (doneTonnage > 0) {
          progressText = `${doneTonnage} / ${tonnage} tấn`;
          progressPercent = Math.min(100, Math.round((doneTonnage / tonnage) * 100));
        } else {
          progressText = statusLabel(order.local_status);
          progressPercent = isDone ? 100 : isWorking ? 60 : isAssigned ? 0 : 30;
        }
      } else {
        progressText = statusLabel(order.local_status);
        progressPercent = isDone ? 100 : isWorking ? 60 : isAssigned ? 0 : 30;
      }
    } else {
      let areaHa = raw.areaHa ? Number(raw.areaHa) : null;
      let completedAreaHa = raw.completedAreaHa ? Number(raw.completedAreaHa) : null;

      if (!areaHa && raw.notes) {
        const matchArea = String(raw.notes).match(/Diện tích:\s*([\d.]+)\s*ha/i);
        if (matchArea) areaHa = parseFloat(matchArea[1]);
        const matchDone = String(raw.notes).match(/hoàn thành\s*([\d.]+)\s*ha/i);
        if (matchDone) completedAreaHa = parseFloat(matchDone[1]);
      }

      if (areaHa && areaHa > 0) {
        const doneHa = completedAreaHa !== null ? completedAreaHa : (isDone ? areaHa : isWorking ? Number((areaHa * 0.5).toFixed(1)) : 0);
        progressText = `${doneHa} / ${areaHa} ha`;
        progressPercent = Math.min(100, Math.round((Number(doneHa) / areaHa) * 100));
      } else {
        progressText = statusLabel(order.local_status);
        progressPercent = isDone ? 100 : isWorking ? 60 : isAssigned ? 0 : 30;
      }
    }
  } catch {
    progressText = statusLabel(order.local_status);
    progressPercent = isDone ? 100 : 0;
  }
  if (isDone) {
    progressPercent = 100;
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <OfflineBanner online={online} />

      {/* Navigation Top Bar */}
      <View style={styles.nav}>
        <TouchableOpacity onPress={navigation.goBack} style={styles.backBtn} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={22} color={colors.ink} />
        </TouchableOpacity>
        <View style={styles.navCenter}>
          <Text style={styles.navCode}>{order.code}</Text>
          <Text style={styles.navTitle}>Chi tiết nhiệm vụ</Text>
        </View>
        <TouchableOpacity style={styles.sosButtonTop} onPress={triggerSOS} activeOpacity={0.8}>
          <Ionicons name="warning" size={14} color="#FFFFFF" />
          <Text style={styles.sosTextTop}>SOS</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Hero Card: Focus Mode */}
        <View style={styles.heroCard}>
          <View style={styles.heroTop}>
            <View style={styles.badgeRow}>
              <View
                style={[
                  styles.statusBadge,
                  isWorking && { backgroundColor: colors.infoSoft },
                  isDone && { backgroundColor: colors.brandLight },
                ]}
              >
                <View
                  style={[
                    styles.statusDot,
                    { backgroundColor: isWorking ? colors.info : isDone ? colors.brand : colors.warning },
                  ]}
                />
                <Text
                  style={[
                    styles.statusText,
                    { color: isWorking ? colors.info : isDone ? colors.brand : colors.warning },
                  ]}
                >
                  {statusLabel(order.local_status).toUpperCase()}
                </Text>
              </View>
            </View>
            <SyncPill status={order.sync_status} />
          </View>

          <Text style={styles.heroTitle}>{order.title}</Text>

          {/* Active Work Timer */}
          {isWorking && (
            <View style={styles.timerContainer}>
              <View style={styles.timerIconBox}>
                <Ionicons name="timer-outline" size={20} color={colors.brand} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.timerLabel}>THỜI GIAN LÀM VIỆC LIÊN TỤC</Text>
                <Text style={styles.timerValue}>{timerString}</Text>
              </View>
            </View>
          )}

          {/* Progress Bar (Green) */}
          <View style={styles.progressContainer}>
            <View style={styles.progressTop}>
              <Text style={styles.progressLabel}>Tiến độ thực hiện</Text>
              <Text style={styles.progressValueText}>{progressText} ({progressPercent}%)</Text>
            </View>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
            </View>
          </View>
        </View>

        {/* Location Route Card */}
        <View style={styles.infoCard}>
          <View style={styles.routeRow}>
            <Ionicons name="radio-button-on" size={18} color={colors.muted} />
            <View style={{ flex: 1 }}>
              <Text style={styles.infoLabel}>Điểm xuất phát / Bãi xe</Text>
              <Text style={styles.infoValue}>{order.origin || 'Chưa cập nhật điểm xuất phát'}</Text>
            </View>
          </View>
          <View style={styles.routeLine} />
          <View style={styles.routeRow}>
            <Ionicons name="location" size={18} color={colors.brand} />
            <View style={{ flex: 1 }}>
              <Text style={styles.infoLabel}>Điểm thực hiện / Lô thửa</Text>
              <Text style={styles.infoValueBold}>{order.destination || 'Chưa cập nhật điểm đến'}</Text>
            </View>
          </View>
        </View>

        {/* Vehicle & Time Grid */}
        <View style={styles.metaGrid}>
          <View style={styles.metaBox}>
            <Ionicons name="time-outline" size={18} color={colors.brand} />
            <Text style={styles.metaBoxLabel}>Thời gian kế hoạch</Text>
            <Text style={styles.metaBoxValue}>
              {formatDate(order.planned_start, true)}
            </Text>
            <Text style={styles.metaBoxSub}>đến {formatDate(order.planned_end, true)}</Text>
          </View>
          <View style={styles.metaBox}>
            <Ionicons name="car-outline" size={18} color={colors.brand} />
            <Text style={styles.metaBoxLabel}>Phương tiện được giao</Text>
            <Text style={styles.metaBoxValue}>
              {order.vehicle_code || 'Chưa gán xe'}
            </Text>
            <Text style={styles.metaBoxSub}>{order.vehicle_plate || (order.vehicle_name ? order.vehicle_name : '')}</Text>
          </View>
        </View>

        {/* Action Buttons Section */}
        {!isDone && (
          <>
            <Text style={styles.sectionTitle}>THAO TÁC NGOÀI HIỆN TRƯỜNG</Text>

            <View style={styles.actionGrid}>
              {/* Primary workflow actions */}
              {isAssigned && (
                <TouchableOpacity
                  style={[styles.bigActionBtn, styles.bigActionPrimary]}
                  onPress={() => act('ORDER_ACCEPTED')}
                  activeOpacity={0.8}
                >
                  <Ionicons name="checkmark-circle" size={22} color="#FFFFFF" />
                  <Text style={styles.bigActionTextPrimary}>Nhận nhiệm vụ</Text>
                </TouchableOpacity>
              )}

              {isAccepted && (
                <TouchableOpacity
                  style={[styles.bigActionBtn, styles.bigActionPrimary]}
                  onPress={() => act('VEHICLE_RECEIVED')}
                  activeOpacity={0.8}
                >
                  <Ionicons name="key" size={22} color="#FFFFFF" />
                  <Text style={styles.bigActionTextPrimary}>Xác nhận nhận xe</Text>
                </TouchableOpacity>
              )}

              {canStart && !isWorking && (
                <View style={styles.startWorkBox}>
                  <TextInput
                    style={styles.completeInput}
                    placeholder="ODO / giờ máy bắt đầu"
                    placeholderTextColor="#94A3B8"
                    keyboardType="decimal-pad"
                    value={startOdo}
                    onChangeText={setStartOdo}
                  />
                  <TouchableOpacity
                    style={[styles.bigActionBtn, styles.bigActionPrimary, { width: '100%' }]}
                    onPress={startWork}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="play" size={22} color="#FFFFFF" />
                    <Text style={styles.bigActionTextPrimary}>
                      {order.local_status === 'READY_TO_CONTINUE' ? 'Tiếp tục lệnh' : 'Bắt đầu công việc'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {isWorking && (
                <>
                  {/* Primary Green Action */}
                  <TouchableOpacity
                    style={[styles.bigActionBtn, styles.bigActionPrimary]}
                    onPress={() => setShowProgressModal(true)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="speedometer" size={22} color="#FFFFFF" />
                    <Text style={styles.bigActionTextPrimary}>Cập nhật tiến độ</Text>
                  </TouchableOpacity>

                  {/* Secondary Outline Action */}
                  <TouchableOpacity
                    style={[styles.bigActionBtn, styles.bigActionNeutral]}
                    onPress={() => act('BREAK_STARTED', { type: 'LUNCH' }, 'Nghỉ giữa ca')}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="cafe-outline" size={22} color={colors.ink} />
                    <Text style={styles.bigActionTextNeutral}>Nghỉ giữa ca</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.bigActionBtn, styles.bigActionNeutral]}
                    onPress={pauseWork}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="pause" size={22} color={colors.ink} />
                    <Text style={styles.bigActionTextNeutral}>Tạm dừng có lý do</Text>
                  </TouchableOpacity>
                </>
              )}

              {isOnBreak && (
                <TouchableOpacity
                  style={[styles.bigActionBtn, styles.bigActionPrimary]}
                  onPress={() => act('BREAK_ENDED')}
                  activeOpacity={0.8}
                >
                  <Ionicons name="play" size={22} color="#FFFFFF" />
                  <Text style={styles.bigActionTextPrimary}>Kết thúc nghỉ</Text>
                </TouchableOpacity>
              )}

              {isPaused && (
                <TouchableOpacity
                  style={[styles.bigActionBtn, styles.bigActionPrimary]}
                  onPress={() => act('WORK_RESUMED')}
                  activeOpacity={0.8}
                >
                  <Ionicons name="play" size={22} color="#FFFFFF" />
                  <Text style={styles.bigActionTextPrimary}>Tiếp tục công việc</Text>
                </TouchableOpacity>
              )}

              {/* Camera Evidence Button */}
              <TouchableOpacity
                style={[styles.bigActionBtn, styles.bigActionNeutral]}
                onPress={takeEvidencePhoto}
                activeOpacity={0.8}
              >
                <Ionicons name="camera" size={22} color={colors.brand} />
                <Text style={[styles.bigActionTextNeutral, { color: colors.brand }]}>Chụp ảnh nghiệm thu</Text>
              </TouchableOpacity>

              {/* Incident Button (Orange Outline) */}
              <TouchableOpacity
                style={[styles.bigActionBtn, styles.bigActionWarning]}
                onPress={() => setShowIncidentModal(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="warning-outline" size={22} color={colors.warning} />
                <Text style={styles.bigActionTextWarning}>Báo sự cố</Text>
              </TouchableOpacity>
            </View>

            {/* Adjustment & Transfer Secondary Row */}
            <View style={styles.subActionRow}>
              <TouchableOpacity
                style={styles.subActionBtn}
                onPress={() => setShowScheduleModal(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="calendar-outline" size={16} color={colors.inkLight} />
                <Text style={styles.subActionText}>Xin điều chỉnh lịch</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.subActionBtn}
                onPress={() =>
                  act('TRANSFER_REQUESTED', { reason: 'Xin chuyển việc cho tài xế khác' }, 'Yêu cầu chuyển nhiệm vụ')
                }
                activeOpacity={0.8}
              >
                <Ionicons name="swap-horizontal-outline" size={16} color={colors.inkLight} />
                <Text style={styles.subActionText}>Yêu cầu chuyển việc</Text>
              </TouchableOpacity>
            </View>

            {isWorking && (
              <TouchableOpacity
                style={styles.completeBtn}
                onPress={() => setShowCompleteDialog(true)}
                activeOpacity={0.85}
              >
                <Ionicons name="moon-outline" size={22} color="#FFFFFF" />
                <Text style={styles.completeBtnText}>KẾT THÚC NGÀY LÀM VIỆC</Text>
              </TouchableOpacity>
            )}

            {order.local_status === 'READY_TO_CONTINUE' && (
              <TouchableOpacity
                style={styles.completeBtn}
                onPress={() => Alert.alert(
                  'Báo hoàn thành toàn bộ công việc?',
                  'Lệnh sẽ được gửi quản lý nghiệm thu. Đây không phải thao tác kết thúc ngày.',
                  [
                    { text: 'Hủy', style: 'cancel' },
                    { text: 'Gửi nghiệm thu', onPress: () => void act('ORDER_COMPLETION_REQUESTED') },
                  ],
                )}
                activeOpacity={0.85}
              >
                <Ionicons name="checkmark-done" size={22} color="#FFFFFF" />
                <Text style={styles.completeBtnText}>BÁO HOÀN THÀNH CÔNG VIỆC</Text>
              </TouchableOpacity>
            )}
          </>
        )}

        {dailyReport?.submittedByType === 'MANAGER' && (
          <View style={styles.managerReportCard}>
            <View style={styles.managerReportHeader}>
              <Ionicons name="cloud-done-outline" size={22} color={colors.brand} />
              <View style={{ flex: 1 }}>
                <Text style={styles.completeBoxTitle}>Đã đồng bộ báo cáo đội trưởng nhập hộ</Text>
                <Text style={styles.completeBoxSubtitle}>
                  {dailyReport.submittedBy?.fullName ?? 'Đội trưởng'} nhập thay cho tài xế
                  {dailyReport.reportSubmittedAt ? ` · ${formatDate(dailyReport.reportSubmittedAt, true)}` : ''}
                </Text>
              </View>
            </View>
            <Text style={styles.managerReportValue}>Tiến độ: {dailyReport.quantityToday ?? 0} {dailyReport.unit ?? rawOrder.operationalWorkOrder?.targetUnit ?? ''}</Text>
            {!!dailyReport.note && <Text style={styles.managerReportText}>Ghi chú: {dailyReport.note}</Text>}
            {!!dailyReport.managerReason && <Text style={styles.managerReportText}>Lý do nhập hộ: {dailyReport.managerReason}</Text>}
            <Text style={styles.managerReportText}>Công việc tổng: {dailyReport.workCompleted ? 'Đã báo hoàn thành' : 'Chưa hoàn thành, tiếp tục theo điều phối'}</Text>
            {!!dailyReport.evidenceUrls?.length && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
                {dailyReport.evidenceUrls.map((url) => <Image key={url} source={{ uri: url }} style={styles.reportImage} />)}
              </ScrollView>
            )}
          </View>
        )}

        {reportCanOpen && !['ACCEPTED', 'SUBMITTED_ON_TIME', 'SUBMITTED_BY_MANAGER'].includes(reportStatus ?? '') && (
          <TouchableOpacity style={styles.completeBtn} onPress={() => setShowDailyReport(value => !value)} activeOpacity={0.85}>
            <Ionicons name="document-text-outline" size={22} color="#FFFFFF" />
            <Text style={styles.completeBtnText}>{reportStatus === 'MISSING' ? 'GỬI BÁO CÁO TRỄ' : 'NHẬP TIẾN ĐỘ CUỐI NGÀY'}</Text>
          </TouchableOpacity>
        )}
        {reportCanOpen && reportMinutesLeft !== undefined && !rawOrder.dailyReport?.reportSubmittedAt && <Text style={{ marginHorizontal: 16, marginTop: 8, color: reportMinutesLeft <= 5 ? colors.danger : colors.warning, fontWeight: '700' }}>Còn {reportMinutesLeft} phút để gửi báo cáo đúng hạn</Text>}

        {showDailyReport && (
          <View style={styles.completeBox}>
            <Text style={styles.completeBoxTitle}>Báo cáo cuối ngày</Text>
            <TextInput style={styles.completeInput} placeholder="Khối lượng hoàn thành hôm nay" placeholderTextColor="#94A3B8" keyboardType="decimal-pad" value={reportQuantity} onChangeText={setReportQuantity} />
            <TextInput style={[styles.completeInput, { minHeight: 60, textAlignVertical: 'top' }]} placeholder="Ghi chú hiện trường" placeholderTextColor="#94A3B8" value={reportNote} onChangeText={setReportNote} multiline />
            <TouchableOpacity style={styles.subActionBtn} onPress={() => setReportWorkCompleted(value => !value)}><Ionicons name={reportWorkCompleted ? 'checkmark-circle' : 'ellipse-outline'} size={18} color={reportWorkCompleted ? colors.success : colors.inkLight} /><Text style={styles.subActionText}>Đã hoàn thành công việc tổng</Text></TouchableOpacity>
            <View style={styles.completeActions}><TouchableOpacity style={styles.completeCancelBtn} onPress={() => void saveDailyReport(false)}><Text style={styles.completeCancelText}>LƯU NHÁP</Text></TouchableOpacity><TouchableOpacity style={styles.completeConfirmBtn} onPress={() => void saveDailyReport(true)}><Text style={styles.completeConfirmText}>{reportStatus === 'MISSING' ? 'GỬI TRỄ' : 'GỬI BÁO CÁO'}</Text></TouchableOpacity></View>
          </View>
        )}

        {/* Completion input modal / block */}
        {showCompleteDialog && (
          <View style={styles.completeBox}>
            <Text style={styles.completeBoxTitle}>Kết thúc ngày làm việc</Text>
            <Text style={styles.completeBoxSubtitle}>
              Nhập chỉ số ODO hoặc giờ máy kết thúc ca làm việc:
            </Text>
            <TextInput
              style={styles.completeInput}
              placeholder="VD: 12510 (km hoặc giờ)"
              placeholderTextColor="#94A3B8"
              keyboardType="decimal-pad"
              value={finishOdo}
              onChangeText={setFinishOdo}
            />
            <TextInput
              style={[styles.completeInput, { minHeight: 60, textAlignVertical: 'top' }]}
              placeholder="Ghi chú hoàn thành (tùy chọn)..."
              placeholderTextColor="#94A3B8"
              value={completionNotes}
              onChangeText={setCompletionNotes}
              multiline
            />
            <View style={styles.completeActions}>
              <TouchableOpacity
                style={styles.completeCancelBtn}
                onPress={() => setShowCompleteDialog(false)}
              >
                <Text style={styles.completeCancelText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.completeConfirmBtn}
                onPress={() => {
                  if (requestEndDay()) setShowCompleteDialog(false);
                }}
              >
                <Text style={styles.completeConfirmText}>KẾT THÚC PHIÊN HÔM NAY</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Event Timeline on Device */}
        <Text style={styles.sectionTitle}>NHẬT KÝ THAO TÁC TRÊN THIẾT BỊ</Text>
        <View style={styles.timelineCard}>
          {events.length ? (
            events.map(ev => (
              <View style={styles.timelineItem} key={ev.event_id}>
                <View
                  style={[
                    styles.timelineDot,
                    ev.sync_status === 'SYNCED' ? styles.dotSynced : styles.dotPending,
                  ]}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.timelineType}>{statusLabel(ev.event_type)}</Text>
                  <Text style={styles.timelineMeta}>
                    {formatDate(ev.occurred_at, true)} ·{' '}
                    {ev.sync_status === 'SYNCED' ? '🟢 Đã đồng bộ' : '🟠 Lưu trên máy'}
                  </Text>
                  {ev.note && <Text style={styles.timelineNote}>{ev.note}</Text>}
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.noEventsText}>Chưa có thao tác nào trên thiết bị này.</Text>
          )}
        </View>
      </ScrollView>

      {/* Action Modals */}
      <ProgressModal
        visible={showProgressModal}
        onClose={() => setShowProgressModal(false)}
        onSubmit={async (p, n) => {
          await act('PROGRESS_UPDATED', { quantityToday: p, note: n }, n);
        }}
      />

      <IncidentModal
        visible={showIncidentModal}
        onClose={() => setShowIncidentModal(false)}
        onSubmit={async d => {
          await act('INCIDENT_REPORTED', { description: d }, d);
        }}
      />

      <ScheduleChangeModal
        visible={showScheduleModal}
        currentStart={order.planned_start}
        currentEnd={order.planned_end}
        onClose={() => setShowScheduleModal(false)}
        onSubmit={async (reason, newTime) => {
          await act('SCHEDULE_CHANGE_REQUESTED', { reason, newTime }, reason);
        }}
      />

      {/* Busy Overlay */}
      {busy && (
        <View style={styles.busyOverlay}>
          <ActivityIndicator color="#FFFFFF" size="large" />
          <Text style={styles.busyText}>Đang lưu an toàn vào thiết bị...</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  nav: {
    height: 56,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navCenter: {
    flex: 1,
    alignItems: 'center',
  },
  navCode: {
    color: colors.brand,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  navTitle: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: '800',
  },
  sosButtonTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.danger,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  sosTextTop: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 11,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.line,
    ...shadow,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: colors.brandLight,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '800',
  },
  heroTitle: {
    color: colors.ink,
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '900',
    marginTop: 10,
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.brandLight,
    padding: 12,
    borderRadius: 14,
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  timerIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerLabel: {
    color: colors.brandDark,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  timerValue: {
    color: colors.brand,
    fontSize: 22,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  progressContainer: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.lineLight,
  },
  progressTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  progressValueText: {
    color: colors.brand,
    fontSize: 12,
    fontWeight: '800',
  },
  progressBarBg: {
    height: 10,
    borderRadius: 5,
    backgroundColor: '#E2E8F0',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 5,
    backgroundColor: colors.brand,
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: colors.line,
    ...shadow,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  routeLine: {
    width: 2,
    height: 20,
    backgroundColor: '#CBD5E1',
    marginLeft: 8,
    marginVertical: 4,
  },
  infoLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '700',
  },
  infoValue: {
    color: colors.inkLight,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  infoValueBold: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: '800',
    marginTop: 2,
  },
  metaGrid: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  metaBox: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.line,
    gap: 3,
    ...shadow,
  },
  metaBoxLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 4,
  },
  metaBoxValue: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: '800',
    marginTop: 2,
  },
  metaBoxSub: {
    color: colors.muted,
    fontSize: 11,
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
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  startWorkBox: {
    width: '100%',
  },
  bigActionBtn: {
    width: '48.5%',
    height: 64,
    borderRadius: 14,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    ...shadow,
  },
  bigActionPrimary: {
    backgroundColor: colors.brand,
  },
  bigActionTextPrimary: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  bigActionNeutral: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.line,
  },
  bigActionTextNeutral: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: '800',
  },
  bigActionWarning: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.warning,
  },
  bigActionTextWarning: {
    color: colors.warning,
    fontSize: 13,
    fontWeight: '800',
  },
  subActionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  subActionBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.line,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  subActionText: {
    color: colors.inkLight,
    fontSize: 12,
    fontWeight: '700',
  },
  completeBtn: {
    height: 56,
    borderRadius: 16,
    backgroundColor: colors.brand,
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    ...shadowLg,
  },
  completeBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  completeBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: colors.line,
    ...shadow,
  },
  managerReportCard: {
    backgroundColor: '#ECFDF5',
    borderRadius: 16,
    padding: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  managerReportHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  managerReportValue: {
    color: colors.brandDark,
    fontSize: 14,
    fontWeight: '800',
    marginTop: 10,
  },
  managerReportText: {
    color: colors.inkLight,
    fontSize: 13,
    marginTop: 5,
  },
  reportImage: {
    width: 108,
    height: 82,
    borderRadius: 10,
    marginRight: 8,
    backgroundColor: '#D1FAE5',
  },
  completeBoxTitle: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: '800',
  },
  completeBoxSubtitle: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 2,
    marginBottom: 10,
  },
  completeInput: {
    height: 46,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    marginBottom: 8,
    color: colors.ink,
  },
  completeActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  completeCancelBtn: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  completeCancelText: {
    color: colors.muted,
    fontWeight: '700',
  },
  completeConfirmBtn: {
    flex: 2,
    height: 44,
    borderRadius: 10,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  completeConfirmText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },
  timelineCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.line,
    ...shadow,
  },
  timelineItem: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.lineLight,
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 4,
  },
  dotSynced: {
    backgroundColor: colors.brand,
  },
  dotPending: {
    backgroundColor: colors.warning,
  },
  timelineType: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: '800',
  },
  timelineMeta: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 2,
  },
  timelineNote: {
    color: colors.brandDark,
    fontSize: 12,
    marginTop: 3,
  },
  noEventsText: {
    color: colors.muted,
    textAlign: 'center',
    paddingVertical: 12,
    fontSize: 13,
  },
  busyOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#00000060',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  busyText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
});
