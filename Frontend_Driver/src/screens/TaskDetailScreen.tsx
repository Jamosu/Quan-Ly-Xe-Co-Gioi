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
  formatDateOnly,
  formatDayDate,
  isTodayDate,
  calculateDurationText,
  statusLabel,
} from '../components';
import { addAttachment, enqueueEvent, getOrder, getOrderEvents } from '../database';
import { capturePrivatePhoto, currentCoordinates } from '../deviceEvidence';
import { TasksStackParams } from '../navigationTypes';
import { useAppStore } from '../store';
import { syncNow } from '../syncEngine';
import { colors, shadow, shadowLg } from '../theme';
import { ReportInputMode, resolveDailyReportQuantity } from '../reportProgress';
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
  const [reportInputMode, setReportInputMode] = useState<ReportInputMode>('QUANTITY');
  const [reportNote, setReportNote] = useState('');
  const [reportWorkCompleted, setReportWorkCompleted] = useState(false);
  const [reportPhotoPath, setReportPhotoPath] = useState<string>();
  const [nowMs, setNowMs] = useState(Date.now());

  const { online, refreshLocal } = useAppStore();

  const load = useCallback(async () => {
    const next = await getOrder(route.params.localKey);
    setOrder(next);
    if (next) {
      try {
        const report = JSON.parse(next.raw_json || '{}').dailyReport;
        const raw = JSON.parse(next.raw_json || '{}');
        const work = raw.operationalWorkOrder ?? {};
        const construction = work.category === 'CONSTRUCTION';
        setReportInputMode(construction ? 'PERCENT' : 'QUANTITY');
        if (report) {
          const target = Number(work.targetQuantity ?? 0);
          const completed = Number(work.completedQuantity ?? 0);
          setReportQuantity(construction && target > 0
            ? String(Number(((completed + Number(report.quantityToday ?? 0)) / target * 100).toFixed(2)))
            : String(report.quantityToday ?? ''));
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

  useEffect(() => {
    const interval = setInterval(() => setNowMs(Date.now()), 60_000);
    return () => clearInterval(interval);
  }, []);

  const act = async (eventType: MobileEventType, payload: Record<string, unknown> = {}, actionNote?: string) => {
    if (!order) return;
    if (isPastWorkDay && ['BREAK_STARTED', 'BREAK_ENDED', 'WORK_PAUSED', 'WORK_RESUMED', 'PROGRESS_UPDATED', 'WORK_SESSION_ENDED'].includes(eventType)) {
      Alert.alert('Lệnh thuộc ngày trước', 'Không thể ghi thao tác làm việc của hôm nay vào lệnh cũ. Quản lý cần đối soát phiên cũ và giao lệnh ngày mới.');
      return;
    }
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
  const isWorking = ['WORKING', 'IN_TRANSIT'].includes(order.local_status);
  const isPaused = order.local_status === 'PAUSED';
  const isOnBreak = order.local_status === 'ON_BREAK';
  const isDone = ['DELIVERED', 'CLOSED', 'CANCELLED'].includes(order.local_status);
  const rawOrder = (() => { try { return JSON.parse(order.raw_json || '{}'); } catch { return {}; } })();
  const operationalWorkOrder = rawOrder.operationalWorkOrder ?? {};
  const journeyLegs = Array.isArray(operationalWorkOrder.journeyLegs) ? operationalWorkOrder.journeyLegs : [];
  const workEvents = Array.isArray(operationalWorkOrder.events) ? operationalWorkOrder.events : [];
  const assignedDate = rawOrder.assignedAt || rawOrder.createdAt || null;
  const acceptedDate = rawOrder.driverAcceptedAt || events.find((e) => e.event_type === 'ORDER_ACCEPTED')?.occurred_at || null;
  const dispatcherName = rawOrder.requester?.fullName || (rawOrder.assignedBy ? rawOrder.assignedBy.fullName : 'Bộ phận Điều độ');
  const unitName = rawOrder.unit ? (rawOrder.unit === 'KOUN_MOM' ? 'KLH Koun Mom' : rawOrder.unit) : 'KLH Koun Mom';
  const workDateText = formatDayDate(order.planned_start);
  const isTodayWork = isTodayDate(order.planned_start);
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const isPastWorkDay = Boolean(order.planned_start && new Date(order.planned_start).getTime() < startOfToday.getTime() && !isDone);
  const plannedTimeRange = `${formatDate(order.planned_start)} – ${formatDate(order.planned_end)}`;
  const durationText = calculateDurationText(order.planned_start, order.planned_end, rawOrder.workDurationMinutes);
  const actualStartTime = order.actual_start ? formatDate(order.actual_start, true, true) : null;
  const actualEndTime = order.actual_end ? formatDate(order.actual_end, true, true) : null;
  const implementDisplay = rawOrder.implement?.name || rawOrder.implement?.code || rawOrder.implementName || rawOrder.operationalWorkOrder?.implementName || null;
  const reportDeadlineAt = rawOrder.reportDeadlineAt ? new Date(rawOrder.reportDeadlineAt).getTime() : undefined;
  const reportStatus = rawOrder.dailyReport?.status as string | undefined;
  const dailyReport = rawOrder.dailyReport as {
    quantityToday?: number; unit?: string; note?: string; workCompleted?: boolean;
    evidenceUrls?: string[]; submittedByType?: string; submittedBy?: { fullName?: string };
    managerReason?: string; reportSubmittedAt?: string;
  } | undefined;
  const hasArrivedWorksite = ['AT_WORKSITE', 'WORKING', 'SHIFT_FINISHED', 'WAITING_REPORT', 'WAITING_REVIEW', 'RETURNING_TO_DEPOT', 'COMPLETED', 'ACCEPTED', 'CLOSED'].includes(order.local_status)
    || journeyLegs.some((leg: any) => ['AT_DELIVERY', 'WORKING', 'COMPLETED', 'RETURNING_TO_DEPOT', 'AT_DEPOT'].includes(leg.status));
  const reportCanOpen = order.order_type === 'DISPATCH' && hasArrivedWorksite;
  const reportMinutesLeft = reportDeadlineAt !== undefined ? Math.max(0, Math.ceil((reportDeadlineAt - nowMs) / 60_000)) : undefined;
  const reportIsLate = reportDeadlineAt !== undefined && nowMs > reportDeadlineAt;
  const reportSubmitted = ['SUBMITTED_ON_TIME', 'LATE', 'SUBMITTED_BY_MANAGER', 'ACCEPTED'].includes(reportStatus ?? '');
  const proxyAcceptEvent = workEvents.find((event: any) => event.action === 'PROXY_DRIVER_ACCEPT');
  const acceptedByText = proxyAcceptEvent?.actor?.fullName ? `Ghi nhận thay bởi ${proxyAcceptEvent.actor.fullName}` : undefined;

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
    void runJourneyEvent('WORK_FINISHED', true);
    return true;
  };

  const captureReportPhoto = async () => {
    const localPath = await capturePrivatePhoto();
    if (localPath) setReportPhotoPath(localPath);
  };

  const saveDailyReport = async (submit: boolean) => {
    if (!order) return;
    const enteredValue = Number(reportQuantity || 0);
    if (!Number.isFinite(enteredValue) || enteredValue < 0) {
      Alert.alert('Khối lượng không hợp lệ', 'Vui lòng nhập số lớn hơn hoặc bằng 0.');
      return;
    }
    const completed = Number(rawOrder.operationalWorkOrder?.completedQuantity ?? 0);
    const target = Number(rawOrder.operationalWorkOrder?.targetQuantity ?? 0);
    const remaining = Math.max(0, Number((target - completed).toFixed(6)));
    const resolved = resolveDailyReportQuantity(enteredValue, reportInputMode, completed, target);
    const quantityToday = Number(resolved.quantityToday.toFixed(6));
    if (!resolved.valid) {
      const approvedPercent = target > 0 ? Number((completed / target * 100).toFixed(2)) : 0;
      Alert.alert(
        reportInputMode === 'PERCENT' ? 'Phần trăm không hợp lệ' : 'Vượt khối lượng còn lại',
        reportInputMode === 'PERCENT'
          ? `Hãy nhập tiến độ lũy kế từ ${approvedPercent}% đến 100%.`
          : `Còn tối đa ${remaining} ${rawOrder.operationalWorkOrder?.targetUnit ?? ''}.`,
      );
      return;
    }
    if (submit && !reportNote.trim()) {
      Alert.alert('Thiếu nội dung công việc', 'Vui lòng ghi rõ hôm nay đã thực hiện những việc gì.');
      return;
    }
    if (submit && !reportPhotoPath && !dailyReport?.evidenceUrls?.length) {
      Alert.alert('Thiếu ảnh minh chứng', 'Vui lòng chụp ít nhất một ảnh hiện trường trước khi gửi báo cáo.');
      return;
    }
    setBusy(true);
    try {
      const gps = await currentCoordinates().catch(() => ({}));
      const eventId = await enqueueEvent({
        eventType: submit ? 'DAILY_REPORT_SUBMITTED' : 'DAILY_REPORT_DRAFT_SAVED',
        order,
        payload: {
          quantityToday,
          unit: rawOrder.operationalWorkOrder?.targetUnit,
          startOdoKm: startOdo ? Number(startOdo) : undefined,
          endOdoKm: finishOdo ? Number(finishOdo) : undefined,
          note: reportNote.trim(),
          workCompleted: reportWorkCompleted,
          evidenceUrls: dailyReport?.evidenceUrls ?? [],
          vehicleId: order.vehicle_id,
          driverId: useAppStore.getState().session?.user.id,
        },
        ...gps,
        note: reportNote.trim(),
      });
      if (reportPhotoPath) {
        await addAttachment({ eventId, orderKey: order.local_key, localPath: reportPhotoPath, type: 'DAILY_REPORT_EVIDENCE', ...gps });
      }
      if (online) await syncNow();
      await Promise.all([load(), refreshLocal()]);
      if (submit) {
        setShowDailyReport(false);
        setReportPhotoPath(undefined);
      }
    } catch (error) {
      Alert.alert('Chưa thể lưu báo cáo', error instanceof Error ? error.message : 'Vui lòng thử lại.');
    } finally {
      setBusy(false);
    }
  };

  const runJourneyEvent = async (eventType: MobileEventType, requirePhoto = false) => {
    if (!order) return;
    if (isPastWorkDay) {
      Alert.alert('Lệnh thuộc ngày trước', 'Không thể ghi hành trình ngày hôm nay vào lệnh cũ. Quản lý cần đối soát và giao lệnh ngày mới.');
      return;
    }
    setBusy(true);
    try {
      const localPath = requirePhoto ? await capturePrivatePhoto() : undefined;
      if (requirePhoto && !localPath) return;
      const gps = await currentCoordinates().catch(() => ({}));
      const eventId = await enqueueEvent({
        eventType,
        order,
        payload: {
          odoKm: finishOdo ? Number(finishOdo) : startOdo ? Number(startOdo) : undefined,
          note: eventType === 'WORK_FINISHED' ? completionNotes.trim() : undefined,
          vehicleId: order.vehicle_id,
          driverId: useAppStore.getState().session?.user.id,
        },
        ...gps,
      });
      if (localPath) await addAttachment({ eventId, orderKey: order.local_key, localPath, type: 'JOURNEY_EVIDENCE', ...gps });
      if (online) await syncNow();
      await Promise.all([load(), refreshLocal()]);
    } catch (error) {
      Alert.alert('Chưa thể cập nhật tiến độ', error instanceof Error ? error.message : 'Vui lòng thử lại.');
    } finally {
      setBusy(false);
    }
  };

  // Compute work progress from quantities accepted by management.
  const isTransport = order.order_type === 'TRANSPORT';
  const approvedQuantity = Number(operationalWorkOrder.completedQuantity ?? 0);
  const targetQuantity = Number(operationalWorkOrder.targetQuantity ?? 0);
  const quantityUnit = operationalWorkOrder.targetUnit ?? '';
  const isConstructionWork = operationalWorkOrder.category === 'CONSTRUCTION';
  const remainingQuantity = Math.max(0, Number((targetQuantity - approvedQuantity).toFixed(6)));
  const enteredReportQuantity = Number(reportQuantity || 0);
  const resolvedReportProgress = resolveDailyReportQuantity(enteredReportQuantity, reportInputMode, approvedQuantity, targetQuantity);
  const reportQuantityExceedsRemaining = targetQuantity > 0 && Number.isFinite(enteredReportQuantity) && !resolvedReportProgress.valid;
  const canConfirmWorkCompleted = targetQuantity <= 0 || (resolvedReportProgress.valid && resolvedReportProgress.projectedPercent + 1e-9 >= 100);
  const pendingQuantity = dailyReport && reportStatus !== 'ACCEPTED' ? Number(dailyReport.quantityToday ?? 0) : 0;
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
      let areaHa = Number(operationalWorkOrder.targetQuantity || raw.areaHa || 0) || null;
      let completedAreaHa = Number(operationalWorkOrder.completedQuantity ?? raw.completedAreaHa ?? 0);

      if (!areaHa && raw.notes) {
        const matchArea = String(raw.notes).match(/Diện tích:\s*([\d.]+)\s*ha/i);
        if (matchArea) areaHa = parseFloat(matchArea[1]);
        const matchDone = String(raw.notes).match(/hoàn thành\s*([\d.]+)\s*ha/i);
        if (matchDone) completedAreaHa = parseFloat(matchDone[1]);
      }

      if (areaHa && areaHa > 0) {
        const doneHa = completedAreaHa !== null ? completedAreaHa : 0;
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
  const outboundLeg = journeyLegs.find((leg: any) => leg.type === 'OUTBOUND') ?? journeyLegs[0];
  const returnLeg = [...journeyLegs].reverse().find((leg: any) => leg.type === 'REPOSITION');
  const outboundStatus = outboundLeg?.status;
  const returnStatus = returnLeg?.status;
  const workflowSteps = [
    { label: 'Tạo lệnh', time: assignedDate, done: true },
    { label: 'Nhận lệnh', time: acceptedDate, done: Boolean(acceptedDate) },
    { label: 'Đến điểm làm việc', time: outboundLeg?.deliveryAt, done: ['AT_DELIVERY', 'WORKING', 'COMPLETED'].includes(outboundLeg?.status) || Boolean(outboundLeg?.deliveryAt) },
    { label: 'Làm việc', time: rawOrder.actualStartTime, done: Boolean(rawOrder.actualStartTime) },
    { label: 'Báo cáo ngày', time: dailyReport?.reportSubmittedAt, done: reportSubmitted },
    { label: 'Trở về bãi', time: rawOrder.returnTime ?? returnLeg?.completedAt, done: Boolean(rawOrder.returnTime) || returnLeg?.status === 'AT_DEPOT' },
  ];

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
              <Text style={styles.progressLabel}>Đã nghiệm thu lũy kế</Text>
              <Text style={styles.progressValueText}>{progressText} ({progressPercent}%)</Text>
            </View>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
            </View>
            {!isTransport && targetQuantity > 0 && pendingQuantity > 0 && (
              <Text style={styles.pendingProgressText}>Báo cáo hôm nay +{pendingQuantity} {quantityUnit} đang chờ duyệt; lũy kế vẫn là {approvedQuantity}/{targetQuantity} {quantityUnit}.</Text>
            )}
          </View>
        </View>

        <View style={styles.workflowCard}>
          <View style={styles.workflowHeader}>
            <Text style={styles.detailSectionTitle}>TIẾN ĐỘ CÔNG VIỆC</Text>
            <Text style={styles.workflowProgress}>{workflowSteps.filter(step => step.done).length}/6 bước</Text>
          </View>
          {workflowSteps.map((step, index) => (
            <View key={step.label} style={styles.workflowRow}>
              <View style={[styles.workflowDot, step.done && styles.workflowDotDone]}>
                {step.done ? <Ionicons name="checkmark" size={13} color="#FFFFFF" /> : <Text style={styles.workflowDotText}>{index + 1}</Text>}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.workflowLabel, step.done && styles.workflowLabelDone]}>{step.label}</Text>
                <Text style={styles.workflowTime}>{step.time ? formatDate(step.time, true, true) : 'Chưa ghi nhận'}</Text>
                {index === 1 && acceptedByText && <Text style={styles.workflowProxy}>{acceptedByText}</Text>}
              </View>
            </View>
          ))}
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

        {/* Card 1: Ngày nhận lệnh & Thông tin phân công */}
        <View style={styles.detailSectionCard}>
          <View style={styles.detailSectionHeader}>
            <Ionicons name="clipboard-outline" size={18} color={colors.brand} />
            <Text style={styles.detailSectionTitle}>THÔNG TIN GIAO & NHẬN LỆNH</Text>
          </View>

          {/* Thời điểm giao lệnh */}
          <View style={styles.detailRow}>
            <View style={styles.detailIconBox}>
              <Ionicons name="paper-plane-outline" size={16} color={colors.brand} />
            </View>
            <View style={styles.detailTextBox}>
              <Text style={styles.detailItemLabel}>Thời điểm điều phối giao lệnh:</Text>
              <Text style={styles.detailItemValue}>
                {assignedDate ? formatDate(assignedDate, true, true) : 'Theo kế hoạch sản xuất'}
              </Text>
            </View>
          </View>

          {/* Thời điểm tài xế nhận việc */}
          <View style={styles.detailRow}>
            <View style={styles.detailIconBox}>
              <Ionicons
                name={acceptedDate ? 'checkmark-circle' : 'time-outline'}
                size={16}
                color={acceptedDate ? colors.brand : colors.warning}
              />
            </View>
            <View style={styles.detailTextBox}>
              <Text style={styles.detailItemLabel}>Thời điểm tài xế nhận việc:</Text>
              {acceptedDate ? (
                <View style={styles.acceptedRow}>
                  <Text style={styles.detailItemValueBold}>
                    {formatDate(acceptedDate, true, true)}
                  </Text>
                  <View style={styles.receivedBadge}>
                    <Text style={styles.receivedBadgeText}>ĐÃ TIẾP NHẬN</Text>
                  </View>
                </View>
              ) : (
                <View style={styles.waitingBadge}>
                  <Text style={styles.waitingBadgeText}>Chờ tài xế xác nhận nhận nhiệm vụ</Text>
                </View>
              )}
            </View>
          </View>

          {/* Người giao việc & Đơn vị */}
          <View style={[styles.detailRow, { borderBottomWidth: 0 }]}>
            <View style={styles.detailIconBox}>
              <Ionicons name="person-circle-outline" size={16} color={colors.muted} />
            </View>
            <View style={styles.detailTextBox}>
              <Text style={styles.detailItemLabel}>Người giao lệnh / Đơn vị quản lý:</Text>
              <Text style={styles.detailItemValue}>
                {dispatcherName} • {unitName}
              </Text>
            </View>
          </View>
        </View>

        {/* Card 2: Kế hoạch ngày & giờ công việc */}
        <View style={styles.detailSectionCard}>
          <View style={styles.detailSectionHeader}>
            <Ionicons name="calendar-outline" size={18} color={colors.brand} />
            <Text style={styles.detailSectionTitle}>NGÀY & GIỜ CÔNG VIỆC</Text>
          </View>

          {/* Ngày công việc */}
          <View style={styles.detailRow}>
            <View style={styles.detailIconBox}>
              <Ionicons name="calendar" size={16} color={colors.brand} />
            </View>
            <View style={styles.detailTextBox}>
              <Text style={styles.detailItemLabel}>Ngày thực hiện công việc:</Text>
              <View style={styles.acceptedRow}>
                <Text style={styles.detailItemHighlight}>{workDateText}</Text>
                {isTodayWork && (
                  <View style={styles.todayPillDetail}>
                    <Text style={styles.todayPillDetailText}>HÔM NAY</Text>
                  </View>
                )}
              </View>
            </View>
          </View>

          {/* Khung giờ kế hoạch */}
          <View style={styles.detailRow}>
            <View style={styles.detailIconBox}>
              <Ionicons name="time" size={16} color={colors.brand} />
            </View>
            <View style={styles.detailTextBox}>
              <Text style={styles.detailItemLabel}>Khung giờ ca làm việc theo kế hoạch:</Text>
              <Text style={styles.detailItemValueBold}>
                {plannedTimeRange}
                {durationText ? ` (${durationText})` : ''}
              </Text>
            </View>
          </View>

          {/* Giờ tác nghiệp thực tế (nếu có) */}
          {(actualStartTime || isWorking || isDone) && (
            <View style={styles.actualTimeContainer}>
              <Text style={styles.actualTimeTitle}>THỜI GIAN TÁC NGHIỆP THỰC TẾ:</Text>
              <View style={styles.actualTimeRow}>
                <Text style={styles.actualTimeLabel}>Bắt đầu thực tế:</Text>
                <Text style={styles.actualTimeValue}>{actualStartTime || 'Chưa ghi nhận'}</Text>
              </View>
              <View style={styles.actualTimeRow}>
                <Text style={styles.actualTimeLabel}>Kết thúc thực tế:</Text>
                <Text style={styles.actualTimeValue}>
                  {actualEndTime || (isWorking ? 'Đang tác nghiệp...' : 'Chưa kết thúc')}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Card 3: Phương tiện & Thiết bị được giao */}
        <View style={styles.detailSectionCard}>
          <View style={styles.detailSectionHeader}>
            <Ionicons name="car-outline" size={18} color={colors.brand} />
            <Text style={styles.detailSectionTitle}>PHƯƠNG TIỆN & THIẾT BỊ ĐƯỢC GIAO</Text>
          </View>

          <View style={styles.detailRow}>
            <View style={styles.detailIconBox}>
              <Ionicons name="car" size={16} color={colors.brand} />
            </View>
            <View style={styles.detailTextBox}>
              <Text style={styles.detailItemLabel}>Phương tiện cơ giới:</Text>
              <Text style={styles.detailItemValueBold}>
                {order.vehicle_code || 'Chưa gán xe'}{order.vehicle_name ? ` • ${order.vehicle_name}` : ''}
              </Text>
              {order.vehicle_plate && (
                <Text style={styles.detailItemSub}>Biển số: {order.vehicle_plate}</Text>
              )}
            </View>
          </View>

          {implementDisplay && (
            <View style={[styles.detailRow, { borderBottomWidth: 0 }]}>
              <View style={styles.detailIconBox}>
                <Ionicons name="construct-outline" size={16} color={colors.brand} />
              </View>
              <View style={styles.detailTextBox}>
                <Text style={styles.detailItemLabel}>Nông cụ / Thiết bị phụ trợ:</Text>
                <Text style={styles.detailItemValueBold}>{implementDisplay}</Text>
              </View>
            </View>
          )}
        </View>

        {/* Action Buttons Section */}
        {isPastWorkDay && (
          <View style={[styles.reportStatusCard, { borderColor: colors.danger, backgroundColor: '#FFF1F2' }]}>
            <Text style={[styles.completeBoxTitle, { color: colors.danger }]}>Lệnh tồn đọng từ {workDateText}</Text>
            <Text style={styles.completeBoxSubtitle}>Hôm nay không được ghi tiếp hành trình, nghỉ ca hoặc tiến độ vào lệnh này. Quản lý phải đối soát phiên cũ và phát hành lệnh ngày mới.</Text>
          </View>
        )}

        {!isDone && !isPastWorkDay && (
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

              {order.local_status === 'DRIVER_ACCEPTED' && (!outboundStatus || outboundStatus === 'PLANNED') && (
                <View style={styles.startWorkBox}>
                  <TextInput
                    style={styles.completeInput}
                    placeholder="ODO / giờ máy khi xuất bãi"
                    placeholderTextColor="#94A3B8"
                    keyboardType="decimal-pad"
                    value={startOdo}
                    onChangeText={setStartOdo}
                  />
                  <TouchableOpacity
                    style={[styles.bigActionBtn, styles.bigActionPrimary, { width: '100%' }]}
                    onPress={() => void runJourneyEvent('DEPART_TO_WORK')}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="navigate" size={22} color="#FFFFFF" />
                    <Text style={styles.bigActionTextPrimary}>Bắt đầu đến điểm làm việc</Text>
                  </TouchableOpacity>
                </View>
              )}

              {outboundStatus === 'EN_ROUTE_TO_PICKUP' && (
                <TouchableOpacity style={[styles.bigActionBtn, styles.bigActionPrimary]} onPress={() => void runJourneyEvent('ARRIVED_WORKSITE', true)} activeOpacity={0.8}>
                  <Ionicons name="location" size={22} color="#FFFFFF" />
                  <Text style={styles.bigActionTextPrimary}>Đã đến điểm làm việc</Text>
                </TouchableOpacity>
              )}

              {outboundStatus === 'AT_DELIVERY' && (
                <TouchableOpacity style={[styles.bigActionBtn, styles.bigActionPrimary]} onPress={() => void runJourneyEvent('WORK_STARTED')} activeOpacity={0.8}>
                  <Ionicons name="play" size={22} color="#FFFFFF" />
                  <Text style={styles.bigActionTextPrimary}>Bắt đầu làm việc</Text>
                </TouchableOpacity>
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

            {(outboundStatus === 'WORKING' || isWorking) && (
              <TouchableOpacity
                style={styles.completeBtn}
                onPress={() => setShowCompleteDialog(true)}
                activeOpacity={0.85}
              >
                <Ionicons name="moon-outline" size={22} color="#FFFFFF" />
                <Text style={styles.completeBtnText}>KẾT THÚC VIỆC TRONG NGÀY</Text>
              </TouchableOpacity>
            )}

            {outboundStatus === 'COMPLETED' && !returnLeg && (
              <TouchableOpacity style={styles.completeBtn} onPress={() => void runJourneyEvent('RETURN_TO_DEPOT')} activeOpacity={0.85}>
                <Ionicons name="return-down-back" size={22} color="#FFFFFF" />
                <Text style={styles.completeBtnText}>BẮT ĐẦU TRỞ VỀ BÃI</Text>
              </TouchableOpacity>
            )}

            {returnStatus === 'RETURNING_TO_DEPOT' && (
              <TouchableOpacity style={styles.completeBtn} onPress={() => void runJourneyEvent('ARRIVED_DEPOT', true)} activeOpacity={0.85}>
                <Ionicons name="home" size={22} color="#FFFFFF" />
                <Text style={styles.completeBtnText}>XÁC NHẬN ĐÃ VỀ BÃI</Text>
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

        {reportCanOpen && dailyReport && (
          <View style={styles.reportStatusCard}>
            <View style={styles.managerReportHeader}>
              <Ionicons name={reportStatus === 'ACCEPTED' ? 'checkmark-circle' : reportStatus === 'REVISION_REQUESTED' ? 'refresh-circle' : 'time'} size={22} color={reportStatus === 'ACCEPTED' ? colors.success : reportStatus === 'REVISION_REQUESTED' ? colors.danger : colors.warning} />
              <View style={{ flex: 1 }}>
                <Text style={styles.completeBoxTitle}>Báo cáo ngày: {statusLabel(reportStatus ?? 'DRAFT')}</Text>
                <Text style={styles.completeBoxSubtitle}>{dailyReport.quantityToday ?? 0} {dailyReport.unit ?? operationalWorkOrder.targetUnit ?? ''}{dailyReport.reportSubmittedAt ? ` · gửi ${formatDate(dailyReport.reportSubmittedAt, true)}` : ''}</Text>
              </View>
            </View>
            {reportStatus === 'REVISION_REQUESTED' && <Text style={styles.revisionText}>Quản lý yêu cầu sửa: {rawOrder.dailyReport?.revisionReason ?? 'Vui lòng kiểm tra lại báo cáo.'}</Text>}
          </View>
        )}

        {reportCanOpen && (!reportSubmitted || ['MISSING', 'REVISION_REQUESTED', 'DRAFT'].includes(reportStatus ?? '')) && (
          <TouchableOpacity style={styles.completeBtn} onPress={() => setShowDailyReport(value => !value)} activeOpacity={0.85}>
            <Ionicons name="document-text-outline" size={22} color="#FFFFFF" />
            <Text style={styles.completeBtnText}>{reportIsLate || reportStatus === 'MISSING' ? 'GỬI BÁO CÁO NGÀY TRỄ' : reportStatus === 'REVISION_REQUESTED' ? 'SỬA BÁO CÁO NGÀY' : 'GHI BÁO CÁO NGÀY'}</Text>
          </TouchableOpacity>
        )}
        {reportCanOpen && reportMinutesLeft !== undefined && !rawOrder.dailyReport?.reportSubmittedAt && <Text style={{ marginHorizontal: 16, marginTop: 8, color: reportIsLate || reportMinutesLeft <= 5 ? colors.danger : colors.warning, fontWeight: '700' }}>{reportIsLate ? 'Đã quá hạn báo cáo; báo cáo gửi lúc này sẽ được ghi nhận trễ.' : `Còn ${reportMinutesLeft} phút để gửi báo cáo đúng hạn`}</Text>}

        {showDailyReport && (
          <View style={styles.completeBox}>
            <Text style={styles.completeBoxTitle}>Báo cáo cho ngày {formatDateOnly(order.planned_start)}</Text>
            {targetQuantity > 0 && <Text style={styles.completeBoxSubtitle}>Đã nghiệm thu: {approvedQuantity}/{targetQuantity} {quantityUnit}. Còn tối đa {remainingQuantity} {quantityUnit}; khối lượng chỉ được cộng sau khi quản lý duyệt.</Text>}
            {!isConstructionWork && <View style={styles.reportModeRow}>
              <TouchableOpacity style={[styles.reportModeButton, reportInputMode === 'QUANTITY' && styles.reportModeButtonActive]} onPress={() => { setReportInputMode('QUANTITY'); setReportQuantity(''); }}><Text style={[styles.reportModeText, reportInputMode === 'QUANTITY' && styles.reportModeTextActive]}>{quantityUnit || 'Đơn vị'}</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.reportModeButton, reportInputMode === 'PERCENT' && styles.reportModeButtonActive]} onPress={() => { setReportInputMode('PERCENT'); setReportQuantity(''); }}><Text style={[styles.reportModeText, reportInputMode === 'PERCENT' && styles.reportModeTextActive]}>%</Text></TouchableOpacity>
            </View>}
            <Text style={styles.detailItemLabel}>{reportInputMode === 'PERCENT' ? 'Tiến độ hoàn thành lũy kế (%)' : `Khối lượng hoàn thành trong ngày (${quantityUnit || 'đơn vị'})`}</Text>
            <TextInput style={[styles.completeInput, reportQuantityExceedsRemaining && { borderColor: colors.danger }]} placeholder={reportInputMode === 'PERCENT' ? 'Nhập từ tiến độ đã duyệt đến 100%' : `Tối đa ${remainingQuantity} ${quantityUnit}`} placeholderTextColor="#94A3B8" keyboardType="decimal-pad" value={reportQuantity} onChangeText={setReportQuantity} accessibilityLabel={reportInputMode === 'PERCENT' ? 'Phần trăm hoàn thành lũy kế' : `Khối lượng hoàn thành trong ngày, đơn vị ${quantityUnit || 'đơn vị'}`} />
            {reportInputMode === 'PERCENT' && resolvedReportProgress.valid && enteredReportQuantity >= 0 && <Text style={styles.completionHint}>Tương ứng hôm nay: {Number(resolvedReportProgress.quantityToday.toFixed(2))} {quantityUnit}; sau khi duyệt đạt {Number(resolvedReportProgress.projectedPercent.toFixed(2))}%.</Text>}
            {reportQuantityExceedsRemaining && <Text style={{ color: colors.danger, fontWeight: '700' }}>{reportInputMode === 'PERCENT' ? `Tiến độ phải từ ${targetQuantity > 0 ? Number((approvedQuantity / targetQuantity * 100).toFixed(2)) : 0}% đến 100%.` : `Giá trị ${reportQuantity} ${quantityUnit} vượt phần còn lại ${remainingQuantity} ${quantityUnit}.`}</Text>}
            <TextInput style={[styles.completeInput, { minHeight: 76, textAlignVertical: 'top' }]} placeholder="Hôm nay đã làm những gì?" placeholderTextColor="#94A3B8" value={reportNote} onChangeText={setReportNote} multiline />
            <TouchableOpacity style={styles.photoReportButton} onPress={() => void captureReportPhoto()}><Ionicons name="camera" size={20} color={colors.brand} /><Text style={styles.photoReportText}>{reportPhotoPath ? 'Chụp lại ảnh minh chứng' : 'Chụp ảnh minh chứng bắt buộc'}</Text></TouchableOpacity>
            {reportPhotoPath && <Image source={{ uri: reportPhotoPath }} style={styles.reportPreview} />}
            {!reportPhotoPath && !!dailyReport?.evidenceUrls?.length && <Image source={{ uri: dailyReport.evidenceUrls[0] }} style={styles.reportPreview} />}
            <TouchableOpacity disabled={!canConfirmWorkCompleted} style={[styles.subActionBtn, !canConfirmWorkCompleted && { opacity: 0.45 }]} onPress={() => setReportWorkCompleted(value => !value)}><Ionicons name={reportWorkCompleted ? 'checkmark-circle' : 'ellipse-outline'} size={18} color={reportWorkCompleted ? colors.success : colors.inkLight} /><Text style={styles.subActionText}>Tôi xác nhận đã hoàn thành đủ {targetQuantity} {quantityUnit}</Text></TouchableOpacity>
            <Text style={styles.completionHint}>Chỉ xác nhận khi tổng khối lượng đã đạt {operationalWorkOrder.targetQuantity ?? 0} {operationalWorkOrder.targetUnit ?? ''}. Quản lý sẽ duyệt nghiệm thu cuối.</Text>
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
  pendingProgressText: {
    marginTop: 7,
    color: colors.warning,
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 16,
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
  detailSectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: colors.line,
    ...shadow,
  },
  detailSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingBottom: 10,
    marginBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.lineLight,
  },
  detailSectionTitle: {
    color: colors.brandDark,
    fontSize: 12.5,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  detailIconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  detailTextBox: {
    flex: 1,
  },
  detailItemLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 2,
  },
  detailItemValue: {
    color: colors.inkLight,
    fontSize: 13,
    fontWeight: '600',
  },
  detailItemValueBold: {
    color: colors.ink,
    fontSize: 13.5,
    fontWeight: '800',
  },
  detailItemHighlight: {
    color: colors.brand,
    fontSize: 14,
    fontWeight: '800',
  },
  detailItemSub: {
    color: colors.muted,
    fontSize: 11.5,
    marginTop: 2,
  },
  acceptedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  receivedBadge: {
    backgroundColor: colors.brandLight,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  receivedBadgeText: {
    color: colors.brand,
    fontSize: 10,
    fontWeight: '800',
  },
  waitingBadge: {
    backgroundColor: colors.warningSoft,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  waitingBadgeText: {
    color: colors.warning,
    fontSize: 11.5,
    fontWeight: '700',
  },
  todayPillDetail: {
    backgroundColor: colors.brand,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  todayPillDetailText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  actualTimeContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    marginTop: 8,
    gap: 4,
    borderWidth: 1,
    borderColor: colors.lineLight,
  },
  actualTimeTitle: {
    color: colors.muted,
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  actualTimeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  actualTimeLabel: {
    color: colors.inkLight,
    fontSize: 12,
    fontWeight: '600',
  },
  actualTimeValue: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: '700',
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
  workflowCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginTop: 14,
    borderWidth: 1,
    borderColor: colors.line,
    ...shadow,
  },
  workflowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  workflowProgress: {
    color: colors.brand,
    fontSize: 12,
    fontWeight: '800',
  },
  workflowRow: {
    flexDirection: 'row',
    gap: 11,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: colors.lineLight,
  },
  workflowDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E2E8F0',
  },
  workflowDotDone: { backgroundColor: colors.brand },
  workflowDotText: { color: colors.muted, fontSize: 11, fontWeight: '800' },
  workflowLabel: { color: colors.muted, fontSize: 13, fontWeight: '700' },
  workflowLabelDone: { color: colors.ink },
  workflowTime: { color: colors.muted, fontSize: 11, marginTop: 2 },
  workflowProxy: { color: colors.info, fontSize: 11, marginTop: 2, fontWeight: '700' },
  reportStatusCard: {
    backgroundColor: '#FFF7ED',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FED7AA',
    padding: 14,
    marginTop: 14,
  },
  revisionText: { color: colors.danger, fontSize: 12, fontWeight: '700', marginTop: 8 },
  photoReportButton: {
    minHeight: 46,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.brand,
    backgroundColor: colors.brandLight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 8,
  },
  photoReportText: { color: colors.brandDark, fontSize: 13, fontWeight: '800' },
  reportPreview: { width: '100%', height: 170, borderRadius: 12, marginBottom: 8, backgroundColor: '#E2E8F0' },
  completionHint: { color: colors.muted, fontSize: 11, lineHeight: 16, marginTop: 6 },
  reportModeRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  reportModeButton: { minWidth: 72, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1, borderColor: colors.line, backgroundColor: '#FFFFFF', alignItems: 'center' },
  reportModeButtonActive: { borderColor: colors.brand, backgroundColor: colors.brandLight },
  reportModeText: { color: colors.muted, fontSize: 13, fontWeight: '800' },
  reportModeTextActive: { color: colors.brandDark },
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
