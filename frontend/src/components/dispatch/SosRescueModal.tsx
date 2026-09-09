import React, { useState } from 'react';
import {
  AlertTriangle,
  Compass,
  MapPin,
  Phone,
  ShieldAlert,
  Tractor,
  Truck,
  User,
  Wrench,
  X,
  CheckCircle2,
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { useAppStore } from '../../store/useAppStore';

export interface EmergencyRescueRecord {
  id: string;
  code: string;
  incidentType: 'SA_LAY_RUONG' | 'LAT_XE_MUONG' | 'CHET_MAY_KET_LAP' | 'SU_CO_MOOC' | 'KHAC';
  incidentTypeName: string;
  incidentVehicle: string;
  incidentDriver: string;
  incidentPhone: string;
  locationPlot: string;
  coordinates?: string;
  urgencyLevel: 'KHAN_CAP_TOI_CAO' | 'KHAN_CAP' | 'CAN_HO_TRO';
  rescueVehicle: string;
  rescueLeader: string;
  equipmentAssigned: string[];
  notes: string;
  status: 'DANG_CUU_HO' | 'DA_TIEP_CAN' | 'HOAN_THANH';
  dispatchedAt: string;
}

interface SosRescueModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultPlot?: string;
  onSuccess?: (record: EmergencyRescueRecord) => void;
}

const INCIDENT_TYPES = [
  { value: 'SA_LAY_RUONG', label: 'Sa lầy bùn đất sâu (Lô ruộng chuối / Đất ngập nước)' },
  { value: 'LAT_XE_MUONG', label: 'Lật nghiêng / Rơi xuống mép mương, kênh tiêu nước' },
  { value: 'CHET_MAY_KET_LAP', label: 'Chết máy kéo giữa đồng / Kẹt cầu / Đứt láp truyền động' },
  { value: 'SU_CO_MOOC', label: 'Sự cố gãy chốt kéo / Lật cụm rơ-moóc chở buồng chuối' },
  { value: 'KHAC', label: 'Sự cố cơ giới khẩn cấp khác cần máy kéo công suất lớn ứng cứu' },
];

const RESCUE_VEHICLES = [
  { code: 'MK-110-01', name: 'Máy kéo New Holland TD5.110 (110HP - Tời thủy lực)', status: 'Sẵn sàng' },
  { code: 'MK-110-02', name: 'Máy kéo John Deere 6110M (110HP - Hai cầu)', status: 'Sẵn sàng' },
  { code: 'MX-08', name: 'Máy xúc bánh xích Komatsu PC200 (Cần với 9.8m)', status: 'Sẵn sàng' },
  { code: 'MUI-04', name: 'Máy ủi Caterpillar D6 (Bánh xích đầm lầy)', status: 'Đang trực chiến' },
];

export const SosRescueModal: React.FC<SosRescueModalProps> = ({
  isOpen,
  onClose,
  defaultPlot,
  onSuccess,
}) => {
  const { setHeaderAlert, activeEmergencyCount, setEmergencyCount } = useAppStore();

  const [incidentType, setIncidentType] = useState('SA_LAY_RUONG');
  const [incidentVehicle, setIncidentVehicle] = useState('MK-042 - Máy kéo New Holland 75HP');
  const [incidentDriver, setIncidentDriver] = useState('Nguyễn Văn Tuấn');
  const [incidentPhone, setIncidentPhone] = useState('0987.654.321');
  const [locationPlot, setLocationPlot] = useState(defaultPlot || 'Lô B08 - Nông trường 2 (Vùng chuối B)');
  const [coordinates, setCoordinates] = useState('13.5892° N, 107.2145° E');
  const [urgencyLevel, setUrgencyLevel] = useState<'KHAN_CAP_TOI_CAO' | 'KHAN_CAP' | 'CAN_HO_TRO'>('KHAN_CAP_TOI_CAO');
  const [rescueVehicle, setRescueVehicle] = useState('MK-110-01');
  const [rescueLeader, setRescueLeader] = useState('Trần Văn Cường (Tổ trưởng cơ động)');
  const [notes, setNotes] = useState('Bùn ngập 2/3 bánh sau, gầm cạ bờ lô. Cần tiếp cận theo bờ kênh phía Nam.');

  // Equipment checkboxes
  const [equipCable30T, setEquipCable30T] = useState(true);
  const [equipHydraulicWinch, setEquipHydraulicWinch] = useState(true);
  const [equipShackles, setEquipShackles] = useState(true);
  const [equipNightLights, setEquipNightLights] = useState(false);

  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const equipments: string[] = [];
    if (equipCable30T) equipments.push('Cáp dù cứu hộ chuyên dụng 30 tấn');
    if (equipHydraulicWinch) equipments.push('Tời kéo thủy lực công suất lớn');
    if (equipShackles) equipments.push('Bộ ma-ní & xích neo chịu lực');
    if (equipNightLights) equipments.push('Đèn chiếu rọi cứu hộ ban đêm');

    const incidentTypeObj = INCIDENT_TYPES.find((t) => t.value === incidentType);

    const newRescueRecord: EmergencyRescueRecord = {
      id: `SOS-${Date.now()}`,
      code: `CH-SOS-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-${Date.now().toString().slice(-3)}`,
      incidentType: incidentType as any,
      incidentTypeName: incidentTypeObj?.label || 'Sa lầy bùn đất',
      incidentVehicle,
      incidentDriver,
      incidentPhone,
      locationPlot,
      coordinates,
      urgencyLevel,
      rescueVehicle: RESCUE_VEHICLES.find((v) => v.code === rescueVehicle)?.name || rescueVehicle,
      rescueLeader,
      equipmentAssigned: equipments,
      notes,
      status: 'DANG_CUU_HO',
      dispatchedAt: new Date().toISOString(),
    };

    // Lưu vào LocalStorage
    try {
      const existing = JSON.parse(localStorage.getItem('thaco_emergency_rescues_v1') || '[]');
      existing.unshift(newRescueRecord);
      localStorage.setItem('thaco_emergency_rescues_v1', JSON.stringify(existing));
    } catch {}

    // Tăng số lượng cảnh báo khẩn cấp
    setEmergencyCount(activeEmergencyCount + 1);

    // Bật thông báo khẩn cấp toàn hệ thống trên Topbar
    setHeaderAlert({
      type: 'error',
      message: `ĐÃ PHÁT LỆNH CỨU HỘ KHẨN CẤP: Điều động ${newRescueRecord.rescueVehicle} ứng cứu ${newRescueRecord.incidentVehicle} tại ${newRescueRecord.locationPlot}!`,
    });

    // Thông báo cho component cha nếu có
    if (onSuccess) {
      onSuccess(newRescueRecord);
    }

    setSubmitting(false);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="LỆNH ĐIỀU XE CỨU HỘ KHẨN CẤP (SOS - BYPASS DUYỆT)"
      size="xl"
      hideFooter={true}
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {/* Banner cảnh báo đặc thù BRD */}
        <div className="rounded-xl border border-red-300 bg-red-50 p-3 text-red-950 flex items-start gap-2.5">
          <ShieldAlert className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <h4 className="font-extrabold text-xs text-red-900 uppercase">
              Cơ chế phản ứng tức thời theo BRD THACO AGRI (Xuất phát khẩn cấp)
            </h4>
            <p className="text-[11px] text-red-800 leading-relaxed">
              Lệnh điều xe cứu hộ là lệnh độc lập, <b>bỏ qua quy trình phê duyệt thông thường (Bypass Approval)</b> để
              tiếp cận hiện trường giải cứu ngay lập tức. Đội cứu hộ được trang bị cáp dù 30T và phương tiện chuyên dụng.
            </p>
          </div>
        </div>

        {/* PHẦN 1: THÔNG TIN XE VÀ VỊ TRÍ GẶP SỰ CỐ */}
        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 space-y-3">
          <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
            <Tractor className="h-4 w-4 text-primary" />
            1. Phương tiện và Vị trí gặp sự cố cần giải cứu
          </h4>

          <div className="grid gap-3 sm:grid-cols-3">
            <label className="sm:col-span-2">
              <span className="mb-1 block font-bold text-slate-700">Loại sự cố hiện trường</span>
              <select
                value={incidentType}
                onChange={(e) => setIncidentType(e.target.value)}
                className="w-full rounded-xl border border-red-300 bg-white p-2 text-xs font-bold text-red-900 focus:border-red-500 focus:outline-none"
              >
                {INCIDENT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span className="mb-1 block font-bold text-slate-700">Mức độ khẩn cấp</span>
              <select
                value={urgencyLevel}
                onChange={(e) => setUrgencyLevel(e.target.value as any)}
                className="w-full rounded-xl border border-red-300 bg-white p-2 text-xs font-bold text-red-900 focus:border-red-500 focus:outline-none"
              >
                <option value="KHAN_CAP_TOI_CAO">Khẩn cấp tối cao (Có nguy cơ lật/hư hại nặng)</option>
                <option value="KHAN_CAP">Khẩn cấp (Sa lầy ngừng toàn bộ ca việc)</option>
                <option value="CAN_HO_TRO">Cần hỗ trợ kéo dắt thông thường</option>
              </select>
            </label>

            <label>
              <span className="mb-1 block font-bold text-slate-700">Phương tiện bị sự cố</span>
              <input
                type="text"
                value={incidentVehicle}
                onChange={(e) => setIncidentVehicle(e.target.value)}
                required
                placeholder="VD: MK-042, XTA-006..."
                className="w-full rounded-xl border border-slate-200 bg-white p-2 text-xs font-bold text-slate-900 focus:border-primary focus:outline-none"
              />
            </label>

            <label>
              <span className="mb-1 block font-bold text-slate-700">Lái xe gặp nạn</span>
              <input
                type="text"
                value={incidentDriver}
                onChange={(e) => setIncidentDriver(e.target.value)}
                required
                placeholder="Họ tên lái xe"
                className="w-full rounded-xl border border-slate-200 bg-white p-2 text-xs font-medium focus:border-primary focus:outline-none"
              />
            </label>

            <label>
              <span className="mb-1 block font-bold text-slate-700">Số điện thoại liên lạc</span>
              <input
                type="text"
                value={incidentPhone}
                onChange={(e) => setIncidentPhone(e.target.value)}
                required
                placeholder="SĐT tài xế"
                className="w-full rounded-xl border border-slate-200 bg-white p-2 text-xs font-medium focus:border-primary focus:outline-none"
              />
            </label>

            <label className="sm:col-span-2">
              <span className="mb-1 block font-bold text-slate-700">Vị trí Lô / Tuyến đường sự cố</span>
              <input
                type="text"
                value={locationPlot}
                onChange={(e) => setLocationPlot(e.target.value)}
                required
                placeholder="VD: Lô B08 - Nông trường 2..."
                className="w-full rounded-xl border border-slate-200 bg-white p-2 text-xs font-bold text-slate-900 focus:border-primary focus:outline-none"
              />
            </label>

            <label>
              <span className="mb-1 block font-bold text-slate-700">Tọa độ GPS hiện trường</span>
              <input
                type="text"
                value={coordinates}
                onChange={(e) => setCoordinates(e.target.value)}
                placeholder="Kinh độ, Vĩ độ GPS"
                className="w-full rounded-xl border border-slate-200 bg-white p-2 text-xs font-mono font-medium focus:border-primary focus:outline-none"
              />
            </label>
          </div>
        </div>

        {/* PHẦN 2: PHƯƠNG ÁN ĐIỀU XE CỨU HỘ VÀ TRANG THIẾT BỊ */}
        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 space-y-3">
          <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
            <Wrench className="h-4 w-4 text-primary" />
            2. Chỉ định Phương tiện Cứu hộ & Trang bị kỹ thuật kéo nặng
          </h4>

          <div className="grid gap-3 sm:grid-cols-2">
            <label>
              <span className="mb-1 block font-bold text-slate-700">Phương tiện cứu hộ chỉ định</span>
              <select
                value={rescueVehicle}
                onChange={(e) => setRescueVehicle(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white p-2 text-xs font-bold text-emerald-900 focus:border-primary focus:outline-none"
              >
                {RESCUE_VEHICLES.map((v) => (
                  <option key={v.code} value={v.code}>
                    [{v.code}] {v.name} ({v.status})
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span className="mb-1 block font-bold text-slate-700">Đội trưởng / Lái xe cứu hộ phụ trách</span>
              <input
                type="text"
                value={rescueLeader}
                onChange={(e) => setRescueLeader(e.target.value)}
                required
                className="w-full rounded-xl border border-slate-200 bg-white p-2 text-xs font-bold focus:border-primary focus:outline-none"
              />
            </label>

            <div className="sm:col-span-2 space-y-2">
              <span className="block font-bold text-slate-700">
                Trang thiết bị chuyên dụng mang theo (Bắt buộc kiểm tra trước khi lăn bánh):
              </span>
              <div className="grid gap-2 sm:grid-cols-2 bg-white rounded-xl border border-slate-200 p-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={equipCable30T}
                    onChange={(e) => setEquipCable30T(e.target.checked)}
                    className="h-4 w-4 rounded text-red-600 focus:ring-red-500"
                  />
                  <span className="font-bold text-slate-900">Cáp dù kéo chuyên dụng 30 tấn (Đạt chuẩn)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={equipHydraulicWinch}
                    onChange={(e) => setEquipHydraulicWinch(e.target.checked)}
                    className="h-4 w-4 rounded text-red-600 focus:ring-red-500"
                  />
                  <span className="font-semibold text-slate-800">Tời kéo thủy lực công suất lớn</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={equipShackles}
                    onChange={(e) => setEquipShackles(e.target.checked)}
                    className="h-4 w-4 rounded text-red-600 focus:ring-red-500"
                  />
                  <span className="font-semibold text-slate-800">Bộ ma-ní chịu lực 25T & xích neo</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={equipNightLights}
                    onChange={(e) => setEquipNightLights(e.target.checked)}
                    className="h-4 w-4 rounded text-red-600 focus:ring-red-500"
                  />
                  <span className="font-semibold text-slate-800">Đèn rọi cơ động cứu hộ ban đêm</span>
                </label>
              </div>
            </div>

            <label className="sm:col-span-2">
              <span className="mb-1 block font-bold text-slate-700">Ghi chú tình huống hiện trường & hướng tiếp cận</span>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="w-full rounded-xl border border-slate-200 bg-white p-2 text-xs focus:border-primary focus:outline-none"
              />
            </label>
          </div>
        </div>

        {/* Nút hành động */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-200">
          <span className="text-[11px] text-red-700 font-medium">
            Lệnh có hiệu lực ngay lập tức. Thông báo được gửi đến bộ phận cơ giới và trạm trực điều hành.
          </span>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Hủy bỏ
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="bg-red-600 hover:bg-red-700 text-white font-extrabold px-4 py-2 shadow-md hover:shadow-lg transition-all ring-2 ring-red-300"
              icon={<AlertTriangle className="h-4 w-4" />}
            >
              {submitting ? 'Đang kích hoạt...' : 'KÍCH HOẠT LỆNH CỨU HỘ (SOS)'}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
};
