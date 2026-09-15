import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { colors, shadow, shadowLg } from './theme';
import { LocalOrder, SyncStatus } from './types';

// ==========================================
// 1. BANNERS: OFFLINE & RECONNECT
// ==========================================

export function OfflineBanner({ online }: { online: boolean }) {
  if (online) return null;
  return (
    <View style={styles.offline}>
      <View style={styles.offlineIcon}>
        <Ionicons name="cloud-offline" size={20} color="#B45309" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.offlineTitle}>Bạn đang Offline</Text>
        <Text style={styles.offlineText}>
          Bạn vẫn có thể làm việc bình thường. Dữ liệu sẽ tự động đồng bộ khi có mạng.
        </Text>
      </View>
    </View>
  );
}

export function ReconnectBanner({ visible, syncing }: { visible: boolean; syncing: boolean }) {
  if (!visible) return null;
  return (
    <View style={[styles.reconnectBanner, !syncing && styles.reconnectSuccess]}>
      <Ionicons
        name={syncing ? 'sync' : 'checkmark-circle'}
        size={18}
        color={syncing ? colors.info : colors.brand}
      />
      <View style={{ flex: 1 }}>
        <Text style={[styles.reconnectTitle, !syncing && { color: colors.brand }]}>
          {syncing ? 'Đã có kết nối' : 'Đã đồng bộ'}
        </Text>
        <Text style={styles.reconnectText}>
          {syncing ? 'Đang tự động đồng bộ thay đổi lên hệ thống...' : 'Tất cả dữ liệu đã được cập nhật an toàn.'}
        </Text>
      </View>
    </View>
  );
}

// ==========================================
// 2. SYNC INDICATORS & PILLS
// ==========================================

export function SyncIndicator({
  online,
  syncing,
  pendingCount = 0,
  failedCount = 0,
}: {
  online: boolean;
  syncing: boolean;
  pendingCount?: number;
  failedCount?: number;
}) {
  if (syncing) {
    return (
      <View style={[styles.indicatorPill, { backgroundColor: colors.infoSoft }]}>
        <Ionicons name="sync" size={13} color={colors.info} />
        <Text style={[styles.indicatorText, { color: colors.info }]}>
          Đang đồng bộ {pendingCount ? `${pendingCount} thay đổi` : ''}
        </Text>
      </View>
    );
  }

  if (!online) {
    return (
      <View style={[styles.indicatorPill, { backgroundColor: colors.warningSoft }]}>
        <Ionicons name="cloud-offline" size={13} color={colors.warning} />
        <Text style={[styles.indicatorText, { color: colors.warning }]}>
          {pendingCount > 0 ? `Offline • ${pendingCount} chờ gửi` : 'Offline'}
        </Text>
      </View>
    );
  }

  if (failedCount > 0) {
    return (
      <View style={[styles.indicatorPill, { backgroundColor: colors.dangerSoft }]}>
        <Ionicons name="alert-circle" size={13} color={colors.danger} />
        <Text style={[styles.indicatorText, { color: colors.danger }]}>
          {failedCount} dữ liệu chưa đồng bộ
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.indicatorPill, { backgroundColor: colors.brandLight }]}>
      <View style={[styles.dot, { backgroundColor: colors.brand }]} />
      <Text style={[styles.indicatorText, { color: colors.brand }]}>Đã đồng bộ</Text>
    </View>
  );
}

export function SyncPill({ status }: { status: SyncStatus }) {
  const map: Record<SyncStatus, [keyof typeof Ionicons.glyphMap, string, string, string]> = {
    SYNCED: ['checkmark-circle', 'Đã đồng bộ', colors.brand, colors.brandLight],
    PENDING: ['time', 'Chưa đồng bộ', colors.warning, colors.warningSoft],
    SYNCING: ['sync', 'Đang đồng bộ', colors.info, colors.infoSoft],
    FAILED: ['alert-circle', 'Đồng bộ lỗi', colors.danger, colors.dangerSoft],
    CONFLICT: ['git-compare', 'Cần kiểm tra', colors.danger, colors.dangerSoft],
  };
  const [icon, label, color, backgroundColor] = map[status] || map.SYNCED;
  return (
    <View style={[styles.pill, { backgroundColor }]}>
      <Ionicons name={icon} size={13} color={color} />
      <Text style={[styles.pillText, { color }]}>{label}</Text>
    </View>
  );
}

// ==========================================
// 3. STATUS LABELS & FORMATTERS
// ==========================================

const STATUS_LABEL: Record<string, string> = {
  ASSIGNED: 'Chờ nhận lệnh',
  DRIVER_ACCEPTED: 'Đã nhận lệnh',
  VEHICLE_RECEIVED: 'Đã nhận xe',
  WORKING: 'Đang thực hiện',
  IN_TRANSIT: 'Đang vận chuyển',
  PAUSED: 'Tạm dừng',
  COMPLETED: 'Hoàn thành',
  DELIVERED: 'Đã giao hàng',
  CANCELLED: 'Đã hủy',
  RETURNING_TO_DEPOT: 'Đang về bãi',
};

export function statusLabel(value: string) {
  return STATUS_LABEL[value] ?? value.replaceAll('_', ' ');
}

export function formatDate(value: string | null, withDate = false, withYear = false) {
  if (!value) return '--:--';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '--:--';
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  if (!withDate) return `${hh}:${mm}`;
  const dd = String(d.getDate()).padStart(2, '0');
  const MM = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  if (withYear) {
    return `${hh}:${mm} ${dd}/${MM}/${yyyy}`;
  }
  return `${hh}:${mm} ${dd}/${MM}`;
}

// ==========================================
// 4. TASK CARD
// ==========================================

export function TaskCard({ order, onPress }: { order: LocalOrder; onPress: () => void }) {
  const isWorking = ['WORKING', 'IN_TRANSIT'].includes(order.local_status);
  const isPaused = order.local_status === 'PAUSED';
  const isCompleted = ['COMPLETED', 'DELIVERED', 'ACCEPTED', 'CLOSED'].includes(order.local_status);
  const isAssigned = order.local_status === 'ASSIGNED';

  // Parse work volume/area from raw_json or defaults
  let areaText = '8,5 ha';
  let progressText = '5,2 / 8,5 ha';
  let progressPercent = 61;

  try {
    const raw = JSON.parse(order.raw_json || '{}');
    if (raw.areaHa) {
      areaText = `${raw.areaHa} ha`;
      const doneHa = Number(raw.completedAreaHa || (raw.areaHa * 0.6).toFixed(1));
      progressText = `${doneHa} / ${raw.areaHa} ha`;
      progressPercent = Math.min(100, Math.round((doneHa / raw.areaHa) * 100));
    }
  } catch {
    // fallback
  }

  if (isCompleted) {
    progressPercent = 100;
    progressText = `${areaText} (100%)`;
  }

  // CTA button label
  let ctaText = 'Xem chi tiết';
  let ctaIcon: keyof typeof Ionicons.glyphMap = 'arrow-forward';
  if (isAssigned) {
    ctaText = 'Nhận nhiệm vụ';
    ctaIcon = 'checkmark-circle-outline';
  } else if (order.local_status === 'DRIVER_ACCEPTED') {
    ctaText = 'Nhận xe & Bắt đầu';
    ctaIcon = 'play-outline';
  } else if (isWorking) {
    ctaText = 'Tiếp tục thực hiện';
    ctaIcon = 'arrow-forward-circle-outline';
  } else if (isPaused) {
    ctaText = 'Tiếp tục';
    ctaIcon = 'play';
  }

  return (
    <TouchableOpacity
      style={[
        styles.card,
        isWorking && styles.activeCard,
        isCompleted && styles.completedCard,
      ]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      {/* Top row: Code + Sync Pill */}
      <View style={styles.cardTop}>
        <View style={styles.codeRow}>
          <Text style={styles.code}>{order.code}</Text>
          <View
            style={[
              styles.statusBadge,
              isWorking && { backgroundColor: colors.infoSoft },
              isCompleted && { backgroundColor: colors.brandLight },
              isPaused && { backgroundColor: colors.warningSoft },
            ]}
          >
            <Text
              style={[
                styles.statusText,
                isWorking && { color: colors.info },
                isCompleted && { color: colors.brand },
                isPaused && { color: colors.warning },
              ]}
            >
              {statusLabel(order.local_status).toUpperCase()}
            </Text>
          </View>
        </View>
        <SyncPill status={order.sync_status} />
      </View>

      {/* Task Title */}
      <Text style={styles.title}>{order.title}</Text>

      {/* Metadata Rows with clear outdoor icons */}
      <View style={styles.metaContainer}>
        {/* Location */}
        <View style={styles.metaRow}>
          <Ionicons name="location" size={17} color={colors.brand} />
          <Text style={styles.metaRowText} numberOfLines={1}>
            {order.destination || order.origin || 'Nông trường Ia Puch • Lô A12'}
          </Text>
        </View>

        {/* Time & Vehicle Grid */}
        <View style={styles.detailGrid}>
          <View style={styles.detailItem}>
            <Ionicons name="time-outline" size={16} color={colors.muted} />
            <Text style={styles.detailText}>
              {formatDate(order.planned_start)} – {formatDate(order.planned_end)}
            </Text>
          </View>
          <View style={styles.detailItem}>
            <Ionicons name="car-outline" size={16} color={colors.muted} />
            <Text style={styles.detailText} numberOfLines={1}>
              {order.vehicle_code || order.vehicle_plate || 'MK-023 • John Deere'}
            </Text>
          </View>
          <View style={styles.detailItem}>
            <Ionicons name="speedometer-outline" size={16} color={colors.muted} />
            <Text style={styles.detailText}>{areaText}</Text>
          </View>
        </View>
      </View>

      {/* Progress Bar (Green) */}
      <View style={styles.progressSection}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressLabel}>Tiến độ</Text>
          <Text style={styles.progressValue}>{progressText}</Text>
        </View>
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
        </View>
      </View>

      {/* Primary Action Button (Green #2E7D32) */}
      <TouchableOpacity
        style={[
          styles.ctaButton,
          isCompleted && styles.ctaButtonSecondary,
        ]}
        onPress={onPress}
        activeOpacity={0.8}
      >
        <Text style={[styles.ctaButtonText, isCompleted && { color: colors.ink }]}>
          {ctaText}
        </Text>
        <Ionicons
          name={ctaIcon}
          size={18}
          color={isCompleted ? colors.ink : '#FFFFFF'}
        />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

// ==========================================
// 5. FLOATING SOS BUTTON & SOS MODAL
// ==========================================

export function FloatingSOSButton({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity
      style={styles.floatingSOS}
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityLabel="Nút SOS khẩn cấp"
    >
      <View style={styles.sosInner}>
        <Ionicons name="warning" size={24} color="#FFFFFF" />
        <Text style={styles.sosText}>SOS</Text>
      </View>
    </TouchableOpacity>
  );
}

export function SOSModal({
  visible,
  online,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  online: boolean;
  onClose: () => void;
  onSubmit: (type: string, description: string) => Promise<void>;
}) {
  const [type, setType] = useState('HONG_MAY');
  const [desc, setDesc] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const types = [
    { id: 'HONG_MAY', label: 'Hỏng máy / Động cơ', icon: 'construct-outline' },
    { id: 'SU_CO_AN_TOAN', label: 'Sự cố an toàn / Lật xe', icon: 'alert-circle-outline' },
    { id: 'HET_NHIEN_LIEU', label: 'Hết nhiên liệu / Dầu thủy lực', icon: 'water-outline' },
    { id: 'LUN_LAY', label: 'Xe sa lầy / Cần kéo', icon: 'boat-outline' },
    { id: 'KHAC', label: 'Tình huống khẩn cấp khác', icon: 'help-buoy-outline' },
  ];

  const handleSend = async () => {
    setSubmitting(true);
    try {
      await onSubmit(type, desc);
      onClose();
      setDesc('');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.modalHeaderRed}>
            <View style={styles.redBadge}>
              <Ionicons name="warning" size={22} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.modalTitleRed}>PHÁT TÍN HIỆU CỨU HỘ SOS</Text>
              <Text style={styles.modalSubtitleRed}>
                {online ? 'Ưu tiên kết nối trực tiếp TT Cứu Hộ' : 'Offline • Lưu ưu tiên 1 vào thiết bị'}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
            <Text style={styles.inputLabel}>Chọn loại sự cố khẩn cấp:</Text>
            <View style={styles.typeGrid}>
              {types.map(item => (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.typePill, type === item.id && styles.typePillActive]}
                  onPress={() => setType(item.id)}
                >
                  <Ionicons
                    name={item.icon as any}
                    size={18}
                    color={type === item.id ? colors.danger : colors.muted}
                  />
                  <Text style={[styles.typeText, type === item.id && styles.typeTextActive]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabel}>Mô tả chi tiết vị trí & tình trạng:</Text>
            <TextInput
              style={styles.textArea}
              placeholder="VD: Xe bị bó cứng tay lái, kẹt lầy tại Lô A12, cần xe kéo cứu hộ gấp..."
              placeholderTextColor="#94A3B8"
              value={desc}
              onChangeText={setDesc}
              multiline
              numberOfLines={3}
            />

            <View style={styles.gpsNotice}>
              <Ionicons name="navigate-circle-outline" size={20} color={colors.brand} />
              <Text style={styles.gpsNoticeText}>
                Tọa độ GPS hiện trường sẽ tự động được đính kèm để đội cứu hộ xác định vị trí chính xác.
              </Text>
            </View>
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose} disabled={submitting}>
              <Text style={styles.cancelButtonText}>Hủy bỏ</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.sendSOSButton, submitting && { opacity: 0.7 }]}
              onPress={handleSend}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Ionicons name="warning" size={18} color="#FFFFFF" />
                  <Text style={styles.sendSOSButtonText}>GỬI TÍN HIỆU SOS</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ==========================================
// 6. ACTION MODALS FOR TASK DETAIL
// ==========================================

export function ProgressModal({
  visible,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  onClose: () => void;
  onSubmit: (progress: number, note: string) => Promise<void>;
}) {
  const [val, setVal] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSave = async () => {
    setBusy(true);
    try {
      await onSubmit(Number(val || 0), note);
      onClose();
      setVal('');
      setNote('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Cập nhật tiến độ công việc</Text>
            <TouchableOpacity onPress={onClose}><Ionicons name="close" size={22} color={colors.ink} /></TouchableOpacity>
          </View>
          <View style={styles.modalBody}>
            <Text style={styles.inputLabel}>Khối lượng / Diện tích hoàn thành (ha, tấn, %):</Text>
            <TextInput
              style={styles.input}
              placeholder="VD: 5.2"
              placeholderTextColor="#94A3B8"
              keyboardType="decimal-pad"
              value={val}
              onChangeText={setVal}
            />
            <Text style={styles.inputLabel}>Ghi chú hiện trường:</Text>
            <TextInput
              style={styles.textArea}
              placeholder="Ghi chú về lô, chất lượng đất, thời tiết..."
              placeholderTextColor="#94A3B8"
              value={note}
              onChangeText={setNote}
              multiline
            />
          </View>
          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}><Text style={styles.cancelButtonText}>Hủy</Text></TouchableOpacity>
            <TouchableOpacity style={styles.primaryButton} onPress={handleSave} disabled={busy}>
              {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Lưu tiến độ</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export function IncidentModal({
  visible,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  onClose: () => void;
  onSubmit: (desc: string) => Promise<void>;
}) {
  const [desc, setDesc] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSave = async () => {
    setBusy(true);
    try {
      await onSubmit(desc);
      onClose();
      setDesc('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Báo sự cố thiết bị / kỹ thuật</Text>
            <TouchableOpacity onPress={onClose}><Ionicons name="close" size={22} color={colors.ink} /></TouchableOpacity>
          </View>
          <View style={styles.modalBody}>
            <Text style={styles.inputLabel}>Mô tả sự cố gặp phải:</Text>
            <TextInput
              style={styles.textArea}
              placeholder="VD: Máy cày bị xì dầu ben, lưỡi cày bị mòn gãy..."
              placeholderTextColor="#94A3B8"
              value={desc}
              onChangeText={setDesc}
              multiline
            />
          </View>
          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}><Text style={styles.cancelButtonText}>Hủy</Text></TouchableOpacity>
            <TouchableOpacity style={[styles.primaryButton, { backgroundColor: colors.warning }]} onPress={handleSave} disabled={busy}>
              {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Gửi báo cáo sự cố</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export function ScheduleChangeModal({
  visible,
  currentStart,
  currentEnd,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  currentStart?: string | null;
  currentEnd?: string | null;
  onClose: () => void;
  onSubmit: (reason: string, newTime: string) => Promise<void>;
}) {
  const [reason, setReason] = useState('');
  const [newTime, setNewTime] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSave = async () => {
    setBusy(true);
    try {
      await onSubmit(reason, newTime);
      onClose();
      setReason('');
      setNewTime('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Xin điều chỉnh lịch công tác</Text>
            <TouchableOpacity onPress={onClose}><Ionicons name="close" size={22} color={colors.ink} /></TouchableOpacity>
          </View>
          <View style={styles.modalBody}>
            <View style={styles.timeBox}>
              <Text style={styles.timeBoxLabel}>Lịch hiện tại:</Text>
              <Text style={styles.timeBoxValue}>
                {formatDate(currentStart || null, true)} → {formatDate(currentEnd || null, true)}
              </Text>
            </View>
            <Text style={styles.inputLabel}>Thời gian đề xuất mới:</Text>
            <TextInput
              style={styles.input}
              placeholder="VD: Ngày mai 08:00 – 11:30"
              placeholderTextColor="#94A3B8"
              value={newTime}
              onChangeText={setNewTime}
            />
            <Text style={styles.inputLabel}>Lý do điều chỉnh:</Text>
            <TextInput
              style={styles.textArea}
              placeholder="VD: Thời tiết mưa lớn không thể cày đất ngoài lô..."
              placeholderTextColor="#94A3B8"
              value={reason}
              onChangeText={setReason}
              multiline
            />
          </View>
          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}><Text style={styles.cancelButtonText}>Hủy</Text></TouchableOpacity>
            <TouchableOpacity style={styles.primaryButton} onPress={handleSave} disabled={busy}>
              {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Gửi yêu cầu</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ==========================================
// 7. SCREEN TITLES & EMPTY STATES
// ==========================================

export function ScreenTitle({
  eyebrow,
  title,
  right,
}: {
  eyebrow?: string;
  title: string;
  right?: React.ReactNode;
}) {
  return (
    <View style={styles.screenTitle}>
      <View style={{ flex: 1 }}>
        {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
        <Text style={styles.screenTitleText}>{title}</Text>
      </View>
      {right}
    </View>
  );
}

export function EmptyState({
  icon = 'calendar-outline',
  title,
  text,
}: {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  text: string;
}) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Ionicons name={icon} size={32} color={colors.brand} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

// ==========================================
// STYLES
// ==========================================

const styles = StyleSheet.create({
  // Banners
  offline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFBEB',
    borderBottomWidth: 1,
    borderBottomColor: '#FDE68A',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  offlineIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  offlineTitle: {
    color: '#92400E',
    fontWeight: '800',
    fontSize: 13,
  },
  offlineText: {
    color: '#78350F',
    fontSize: 12,
    lineHeight: 16,
    marginTop: 1,
  },
  reconnectBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.infoSoft,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#BFDBFE',
  },
  reconnectSuccess: {
    backgroundColor: colors.brandLight,
    borderBottomColor: '#BBF7D0',
  },
  reconnectTitle: {
    color: colors.info,
    fontWeight: '800',
    fontSize: 13,
  },
  reconnectText: {
    color: colors.muted,
    fontSize: 12,
  },

  // Indicators
  indicatorPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  indicatorText: {
    fontSize: 12,
    fontWeight: '700',
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
  },
  pillText: {
    fontSize: 11,
    fontWeight: '700',
  },

  // Task Card
  card: {
    backgroundColor: colors.surface,
    marginBottom: 14,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.line,
    ...shadow,
  },
  activeCard: {
    borderColor: '#4ADE80',
    borderLeftWidth: 5,
    borderLeftColor: colors.brand,
  },
  completedCard: {
    backgroundColor: '#F9FBFA',
    borderColor: colors.line,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  code: {
    color: colors.brand,
    fontWeight: '900',
    fontSize: 13,
    letterSpacing: 0.5,
  },
  statusBadge: {
    backgroundColor: colors.brandLight,
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.brand,
  },
  title: {
    color: colors.ink,
    fontWeight: '800',
    fontSize: 17,
    lineHeight: 23,
    marginTop: 8,
  },
  metaContainer: {
    marginTop: 10,
    gap: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaRowText: {
    color: colors.inkLight,
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  detailGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingTop: 4,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  detailText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '600',
  },

  // Progress Bar
  progressSection: {
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.lineLight,
  },
  progressHeader: {
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
  progressValue: {
    color: colors.brand,
    fontSize: 12,
    fontWeight: '800',
  },
  progressBarBg: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E2E8F0',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: colors.brand,
  },

  // CTA Button
  ctaButton: {
    height: 46,
    borderRadius: 12,
    backgroundColor: colors.brand,
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    ...shadow,
  },
  ctaButtonSecondary: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  ctaButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },

  // Floating SOS Button
  floatingSOS: {
    position: 'absolute',
    bottom: 84,
    right: 18,
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
    ...shadowLg,
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  sosInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  sosText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 11,
    marginTop: -2,
    letterSpacing: 0.5,
  },

  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: '#00000080',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    overflow: 'hidden',
  },
  modalHeaderRed: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.danger,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  redBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF25',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitleRed: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },
  modalSubtitleRed: {
    color: '#FEE2E2',
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  modalTitle: {
    color: colors.ink,
    fontSize: 17,
    fontWeight: '800',
  },
  modalBody: {
    padding: 20,
  },
  inputLabel: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },
  typeGrid: {
    gap: 8,
    marginBottom: 16,
  },
  typePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: colors.line,
  },
  typePillActive: {
    borderColor: colors.danger,
    backgroundColor: colors.dangerSoft,
  },
  typeText: {
    color: colors.inkLight,
    fontSize: 13,
    fontWeight: '600',
  },
  typeTextActive: {
    color: colors.danger,
    fontWeight: '800',
  },
  input: {
    height: 48,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 14,
    color: colors.ink,
    fontSize: 15,
    marginBottom: 14,
  },
  textArea: {
    minHeight: 80,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: '#F8FAFC',
    padding: 12,
    color: colors.ink,
    fontSize: 14,
    textAlignVertical: 'top',
    marginBottom: 14,
  },
  gpsNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.brandLight,
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
  },
  gpsNoticeText: {
    flex: 1,
    color: colors.brandDark,
    fontSize: 12,
    lineHeight: 16,
  },
  timeBox: {
    backgroundColor: colors.canvas,
    padding: 12,
    borderRadius: 10,
    marginBottom: 14,
  },
  timeBoxLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '700',
  },
  timeBoxValue: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: '800',
    marginTop: 2,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    backgroundColor: '#FAFAFA',
  },
  cancelButton: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  cancelButtonText: {
    color: colors.muted,
    fontWeight: '700',
    fontSize: 14,
  },
  sendSOSButton: {
    flex: 2,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.danger,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    ...shadow,
  },
  sendSOSButtonText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 14,
  },
  primaryButton: {
    flex: 2,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },

  // Titles
  screenTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 13,
  },
  eyebrow: {
    color: colors.brand,
    fontWeight: '800',
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  screenTitleText: {
    color: colors.ink,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '900',
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 30,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 22,
    backgroundColor: colors.brandLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: '800',
    marginTop: 14,
  },
  emptyText: {
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 6,
  },
});
