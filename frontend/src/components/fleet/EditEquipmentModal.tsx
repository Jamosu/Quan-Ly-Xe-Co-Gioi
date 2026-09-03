import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { SearchableSelect } from '../common/SearchableSelect';
import { apiService } from '../../api/client';
import { ImplementItem } from '../../pages/fleet/EquipmentPage';
import {
  Tag,
  Building2,
  Gauge,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Save,
  X,
  Tractor,
  Layers,
  MapPin,
  UserCheck,
  Phone,
  Wrench,
  Package,
  RefreshCw,
} from 'lucide-react';

interface EditEquipmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  equipment: ImplementItem | null;
  onSuccess: (updated: ImplementItem) => void;
  isCreate?: boolean;
}

type EditTab = 'identity' | 'location' | 'technical';

const CATEGORY_OPTIONS = [
  { value: 'DAN_CAY', label: 'Dàn cày nông nghiệp (3 chảo, 4 chảo, cày ngầm)' },
  { value: 'DAN_BUA', label: 'Dàn bừa đĩa (7, 8, 24, 32 chảo)' },
  { value: 'DAN_XOI', label: 'Dàn xới đất, phay đất, rạch luống' },
  { value: 'DAN_RAI_PHAN', label: 'Dàn rải phân, bón phân, phun vôi' },
  { value: 'RO_MOOC', label: 'Rơ-moóc thu hoạch, moóc ben, moóc kéo' },
  { value: 'DAN_PHUN_THUOC', label: 'Dàn phun thuốc BVTV, khử khuẩn' },
];

const UNIT_OPTIONS = [
  { value: 'CGLĐ DP', label: 'Cơ giới làm đất Daun Penh (CGLĐ DP)' },
  { value: 'CGTC DP', label: 'Cơ giới thi công Daun Penh (CGTC DP)' },
  { value: 'CGLĐ LP', label: 'Cơ giới làm đất Lumphat (CGLĐ LP)' },
  { value: 'CGTC LP', label: 'Cơ giới thi công Lumphat (CGTC LP)' },
  { value: 'CGTC AD', label: 'Cơ giới thi công Andong Meas (CGTC AD)' },
  { value: 'XN Chuối DP1', label: 'Xí nghiệp Chuối DP1' },
  { value: 'XN Chuối DP2', label: 'Xí nghiệp Chuối DP2' },
  { value: 'XN Chuối DP3', label: 'Xí nghiệp Chuối DP3' },
  { value: 'XN Chuối DP4', label: 'Xí nghiệp Chuối DP4' },
  { value: 'XN Chuối LP1', label: 'Xí nghiệp Chuối LP1' },
  { value: 'XN Chuối LP2', label: 'Xí nghiệp Chuối LP2' },
  { value: 'XN Chuối LP3', label: 'Xí nghiệp Chuối LP3' },
  { value: 'XN Bò AD', label: 'Xí nghiệp Chăn nuôi Bò AD' },
  { value: 'TT BTSC', label: 'Trung tâm Bảo dưỡng Sửa chữa (TT BTSC)' },
  { value: 'Ban Cơ Giới', label: 'Ban Cơ Giới KLH Koun Mom' },
];

export const EditEquipmentModal: React.FC<EditEquipmentModalProps> = ({
  isOpen,
  onClose,
  equipment,
  onSuccess,
  isCreate = false,
}) => {
  const isCreateMode = isCreate || !equipment;
  const [activeTab, setActiveTab] = useState<EditTab>('identity');
  const [saving, setSaving] = useState(false);
  const [generatingCode, setGeneratingCode] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Helper trích xuất thông tin
  const getProp = (text: string | null | undefined, prefix: string): string => {
    if (!text) return '';
    const match = text.match(new RegExp(`${prefix}:\\s*([^·]+)`));
    return match ? match[1].trim() : '';
  };

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    category: 'DAN_CAY',
    purchaseCondition: 'ĐQSD',
    brand: '',
    model: '',
    year: '',
    origin: '',
    unit: 'CGLĐ DP',
    gatheringLocation: '',
    managerName: '',
    managerPhone: '',
    technicalCondition: 'GOOD',
    status: 'IN_DEPOT',
    notes: '',
  });

  const generateEquipmentCode = async (category: string) => {
    const PREFIX_MAP: Record<string, string> = {
      DAN_CAY: 'DCA',
      DAN_BUA: 'DBU',
      DAN_XOI: 'DXO',
      DAN_RAI_PHAN: 'DRP',
      RO_MOOC: 'RMK',
      DAN_PHUN_THUOC: 'DPT',
    };
    const pfx = PREFIX_MAP[category] || 'NCG';
    try {
      setGeneratingCode(true);
      const all = await apiService.getAllImplements();
      const items = (all && all.items) || [];
      let maxNum = 0;
      for (const it of items) {
        if (it.category === category || (it.code && it.code.includes(pfx))) {
          const match = it.code.match(/(\d+)$/);
          if (match) {
            const n = parseInt(match[1], 10);
            if (n > maxNum && n < 10000) maxNum = n;
          }
        }
      }
      const nextCode = `${pfx}-${String(maxNum + 1).padStart(3, '0')}`;
      setFormData((prev) => ({ ...prev, code: nextCode }));
    } catch {
      setFormData((prev) => ({ ...prev, code: `${pfx}-001` }));
    } finally {
      setGeneratingCode(false);
    }
  };

  useEffect(() => {
    if (equipment) {
      const p = equipment.standardPurpose || '';
      setFormData({
        code: equipment.code || '',
        name: equipment.name || '',
        category: equipment.category || 'DAN_CAY',
        purchaseCondition: getProp(p, 'Tình trạng mua') || 'ĐQSD',
        brand: getProp(p, 'Hãng') || '',
        model: getProp(p, 'Model') || '',
        year: getProp(p, 'Năm SX') || '',
        origin: getProp(p, 'Xuất xứ') || 'Trung Quốc / Việt Nam',
        unit: getProp(p, 'Đơn vị') || equipment.unit || 'CGLĐ DP',
        gatheringLocation: equipment.gatheringLocation || getProp(p, 'Nơi tập kết') || 'Lô 85 DP4',
        managerName: equipment.managerName || getProp(p, 'Quản lý') || 'Nguyễn Tấn Triều',
        managerPhone: equipment.managerPhone || getProp(p, 'Zalo/SĐT') || '05974160290',
        technicalCondition: equipment.technicalCondition || 'GOOD',
        status: equipment.status || 'IN_DEPOT',
        notes: getProp(p, 'Ghi chú') || '',
      });
      setErrorMessage(null);
      setSuccessMessage(null);
    } else if (isCreateMode) {
      setFormData({
        code: '',
        name: '',
        category: 'DAN_CAY',
        purchaseCondition: 'MUA MỚI',
        brand: 'KUBOTA',
        model: '',
        year: String(new Date().getFullYear()),
        origin: 'Việt Nam',
        unit: 'CGLĐ DP',
        gatheringLocation: 'Lô 85 DP4',
        managerName: 'Nguyễn Tấn Triều',
        managerPhone: '05974160290',
        technicalCondition: 'GOOD',
        status: 'IN_DEPOT',
        notes: '',
      });
      setErrorMessage(null);
      setSuccessMessage(null);
      void generateEquipmentCode('DAN_CAY');
    }
  }, [equipment, isCreateMode, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.code.trim()) {
      setErrorMessage('Vui lòng nhập Mã nông cụ / MMTB mới.');
      setActiveTab('identity');
      return;
    }

    if (!formData.name.trim()) {
      setErrorMessage('Vui lòng nhập Tên thiết bị.');
      setActiveTab('identity');
      return;
    }

    setSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      // Xây dựng lại standardPurpose chuẩn
      const purposeParts: string[] = [
        `Đơn vị: ${formData.unit}`,
        formData.brand ? `Hãng: ${formData.brand}` : '',
        formData.model ? `Model: ${formData.model}` : '',
        `Tình trạng mua: ${formData.purchaseCondition}`,
        formData.year ? `Năm SX: ${formData.year}` : '',
        formData.origin ? `Xuất xứ: ${formData.origin}` : '',
        formData.gatheringLocation ? `Nơi tập kết: ${formData.gatheringLocation}` : '',
        formData.managerName ? `Quản lý: ${formData.managerName}` : '',
        formData.managerPhone ? `Zalo/SĐT: ${formData.managerPhone}` : '',
        formData.notes ? `Ghi chú: ${formData.notes}` : '',
      ].filter(Boolean);

      const payload = {
        code: formData.code.trim().toUpperCase(),
        name: formData.name.trim(),
        category: formData.category,
        unit: 'BAN_CO_GIOI' as any,
        managerName: formData.managerName.trim() || undefined,
        gatheringLocation: formData.gatheringLocation.trim() || undefined,
        managerPhone: formData.managerPhone.trim() || undefined,
        technicalCondition: formData.technicalCondition as any,
        status: formData.status as any,
        standardPurpose: purposeParts.join(' · '),
      };

      if (isCreateMode) {
        const created = await apiService.createImplement(payload);
        setSuccessMessage('Thêm mới nông cụ thành công!');
        const newItem: ImplementItem = {
          id: created.id || Date.now(),
          code: payload.code,
          name: payload.name,
          category: payload.category as any,
          unit: formData.unit,
          managerName: payload.managerName,
          gatheringLocation: payload.gatheringLocation,
          managerPhone: payload.managerPhone,
          technicalCondition: payload.technicalCondition,
          status: payload.status,
          standardPurpose: payload.standardPurpose,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        setTimeout(() => {
          onSuccess(newItem);
          onClose();
        }, 700);
      } else {
        const res = await apiService.updateImplement(equipment!.id, payload);
        setSuccessMessage('Cập nhật thông tin nông cụ thành công!');

        const updatedItem: ImplementItem = {
          ...equipment!,
          ...payload,
          name: formData.name,
          category: formData.category as any,
          managerName: formData.managerName,
          gatheringLocation: formData.gatheringLocation,
          managerPhone: formData.managerPhone,
          technicalCondition: formData.technicalCondition as any,
          status: formData.status as any,
          standardPurpose: purposeParts.join(' · '),
        };

        setTimeout(() => {
          onSuccess(updatedItem);
          onClose();
        }, 700);
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Lỗi khi lưu thông tin nông cụ.';
      setErrorMessage(Array.isArray(msg) ? msg.join(', ') : msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isCreateMode ? 'Thêm mới thiết bị đính kèm & Nông cụ' : `Cập nhật thông tin nông cụ: ${equipment?.code} - ${equipment?.name}`}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Header summary banner */}
        <div className="rounded-xl border border-emerald-200 bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 p-3.5">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-mono text-sm font-black text-emerald-900">
                {formData.code ? formData.code : isCreateMode ? 'TẠO MÃ MỚI' : equipment?.code}
              </span>
              <h4 className="text-xs font-bold text-slate-800">
                {formData.name || (isCreateMode ? 'Khai báo thiết bị & nông cụ mới' : equipment?.name)}
              </h4>
            </div>
            <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-800">
              {isCreateMode ? 'Tạo mới MMTB' : '100% Dữ liệu thực tế'}
            </span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200">
          {[
            { key: 'identity', label: '1. Định danh & Mua sắm', icon: Tag },
            { key: 'location', label: '2. Phân bổ & Bãi tập kết', icon: Building2 },
            { key: 'technical', label: '3. Tình trạng kỹ thuật & Sửa chữa', icon: Wrench },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key as EditTab)}
                className={`flex items-center gap-1.5 border-b-2 px-3.5 py-2 text-xs font-bold transition-all ${
                  active
                    ? 'border-primary text-primary bg-primary-50/50'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Contents: Cố định min-height 320px */}
        <div className="min-h-[320px] pt-1">
          {/* TAB 1: ĐỊNH DANH & MUA SẮM */}
          {activeTab === 'identity' && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">
                    Mã nông cụ {isCreateMode ? <span className="text-rose-500">*</span> : '(Cố định):'}
                  </label>
                  {isCreateMode && (
                    <button
                      type="button"
                      onClick={() => void generateEquipmentCode(formData.category)}
                      className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 hover:text-emerald-800 hover:underline"
                      title="Tự động tạo mã tiếp theo theo chủng loại nông cụ"
                    >
                      <RefreshCw className={`h-2.5 w-2.5 ${generatingCode ? 'animate-spin' : ''}`} />
                      Tự sinh mã
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    disabled={!isCreateMode}
                    placeholder={isCreateMode ? 'VD: DCA-048...' : ''}
                    className={`h-9 w-full rounded-xl border border-slate-200 px-3 text-xs font-mono font-bold text-slate-900 outline-none focus:border-primary focus:bg-white ${
                      !isCreateMode ? 'bg-slate-100 text-slate-600 cursor-not-allowed' : 'bg-slate-50 pr-20'
                    }`}
                    required
                  />
                  {isCreateMode && (
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 rounded bg-emerald-100 px-1.5 py-0.5 text-[9px] font-extrabold text-emerald-800 pointer-events-none">
                      Tự tăng dần
                    </span>
                  )}
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">Tên thiết bị & nông cụ: *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ví dụ: Thiết bị cày 3 chảo Kubota..."
                  className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-bold text-slate-800 outline-none focus:border-primary focus:bg-white"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">Chủng loại hệ thống: *</label>
                <select
                  value={formData.category}
                  onChange={(e) => {
                    const newCat = e.target.value;
                    setFormData((prev) => ({ ...prev, category: newCat as any }));
                    if (isCreateMode) {
                      void generateEquipmentCode(newCat);
                    }
                  }}
                  className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-800 outline-none focus:border-primary focus:bg-white"
                >
                  {CATEGORY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">Tình trạng mua:</label>
                <select
                  value={formData.purchaseCondition}
                  onChange={(e) => setFormData({ ...formData, purchaseCondition: e.target.value })}
                  className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-800 outline-none focus:border-primary focus:bg-white"
                >
                  <option value="MUA MỚI">Mua mới 100%</option>
                  <option value="ĐQSD">Đã qua sử dụng (ĐQSD)</option>
                  <option value="ĐIỀU CHUYỂN">Điều chuyển nội bộ</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">Thương hiệu / Nhãn hiệu:</label>
                <input
                  type="text"
                  value={formData.brand}
                  onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                  placeholder="KUBOTA, EVERDIGM, TRUNG QUỐC, THACO AGRI..."
                  className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-800 outline-none focus:border-primary focus:bg-white"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">Model:</label>
                <input
                  type="text"
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  placeholder="3 chảo, 4 chảo, 16m, EDT2000..."
                  className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-mono font-medium text-slate-800 outline-none focus:border-primary focus:bg-white"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">Năm sản xuất:</label>
                <input
                  type="text"
                  value={formData.year}
                  onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                  placeholder="2020, 2021, 2022..."
                  className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-mono font-medium text-slate-800 outline-none focus:border-primary focus:bg-white"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">Xuất xứ:</label>
                <input
                  type="text"
                  value={formData.origin}
                  onChange={(e) => setFormData({ ...formData, origin: e.target.value })}
                  placeholder="Việt Nam, Trung Quốc, Nhật Bản, Hàn Quốc..."
                  className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-800 outline-none focus:border-primary focus:bg-white"
                />
              </div>
            </div>
          )}

          {/* TAB 2: PHÂN BỔ & BÃI TẬP KẾT */}
          {activeTab === 'location' && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">Đơn vị quản lý sử dụng: *</label>
                <select
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-bold text-slate-800 outline-none focus:border-primary focus:bg-white"
                >
                  {UNIT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-emerald-800 flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 text-emerald-600" />
                  Địa chỉ (Nơi tập kết): *
                </label>
                <input
                  type="text"
                  required
                  value={formData.gatheringLocation}
                  onChange={(e) => setFormData({ ...formData, gatheringLocation: e.target.value })}
                  placeholder="Lô 85 DP4, LP3.5-LP3, Lô 21 DP1, Bãi xe Trung tâm..."
                  className="h-9 w-full rounded-xl border border-emerald-300 bg-emerald-50/50 px-3 text-xs font-bold text-emerald-900 outline-none focus:border-emerald-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-blue-800 flex items-center gap-1">
                  <UserCheck className="h-3.5 w-3.5 text-blue-600" />
                  Nhân sự quản lý phụ trách: *
                </label>
                <input
                  type="text"
                  required
                  value={formData.managerName}
                  onChange={(e) => setFormData({ ...formData, managerName: e.target.value })}
                  placeholder="Nguyễn Tấn Triều, Phạm Ngọc Hải, Thái Cao Lưu..."
                  className="h-9 w-full rounded-xl border border-blue-300 bg-blue-50/50 px-3 text-xs font-bold text-blue-900 outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-blue-800 flex items-center gap-1">
                  <Phone className="h-3.5 w-3.5 text-blue-600" />
                  Số liên lạc (Zalo / SĐT):
                </label>
                <input
                  type="text"
                  value={formData.managerPhone}
                  onChange={(e) => setFormData({ ...formData, managerPhone: e.target.value })}
                  placeholder="05974160290, 0825456565, 0387783316..."
                  className="h-9 w-full rounded-xl border border-blue-300 bg-blue-50/50 px-3 text-xs font-mono font-bold text-blue-900 outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-bold text-slate-700">Ghi chú điều chuyển / Vị trí:</label>
                <input
                  type="text"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Ghi chú vị trí hoặc lịch sử chuyển bãi..."
                  className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-800 outline-none focus:border-primary focus:bg-white"
                />
              </div>
            </div>
          )}

          {/* TAB 3: TÌNH TRẠNG KỸ THUẬT & SỬA CHỮA */}
          {activeTab === 'technical' && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">Tình trạng kỹ thuật: *</label>
                <select
                  value={formData.technicalCondition}
                  onChange={(e) => {
                    const tc = e.target.value;
                    setFormData({
                      ...formData,
                      technicalCondition: tc,
                      status: tc === 'NEED_REPAIR' ? 'MAINTENANCE' : formData.status === 'MAINTENANCE' ? 'IN_DEPOT' : formData.status,
                    });
                  }}
                  className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-bold text-slate-800 outline-none focus:border-primary focus:bg-white"
                >
                  <option value="GOOD">Bình thường (Sẵn sàng hoạt động)</option>
                  <option value="NEED_REPAIR">Hư hỏng (Cần đưa vào Xưởng BTSC sửa chữa)</option>
                  <option value="WORN_OUT">Mòn chảo / Hao mòn cơ khí</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">Trạng thái hệ thống: *</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-bold text-slate-800 outline-none focus:border-primary focus:bg-white"
                >
                  <option value="IN_DEPOT">Sẵn sàng tại bãi đội (Chưa gắn xe)</option>
                  <option value="ATTACHED">Đang gắn trên xe cơ giới</option>
                  <option value="MAINTENANCE">Đang bảo dưỡng / Sửa chữa (BTSC)</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <div className={`p-3 rounded-xl border text-xs ${
                  formData.technicalCondition === 'NEED_REPAIR' || formData.status === 'MAINTENANCE'
                    ? 'border-rose-200 bg-rose-50 text-rose-800'
                    : 'border-emerald-200 bg-emerald-50 text-emerald-800'
                }`}>
                  <div className="font-bold flex items-center gap-1.5 mb-1">
                    {formData.technicalCondition === 'NEED_REPAIR' ? (
                      <AlertTriangle className="h-4 w-4 text-rose-600" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    )}
                    <span>
                      {formData.technicalCondition === 'NEED_REPAIR'
                        ? 'Thiết bị đang được đánh dấu Hư hỏng / Chờ sửa chữa tại Xưởng BTSC'
                        : 'Thiết bị trong tình trạng Bình thường, sẵn sàng điều động'}
                    </span>
                  </div>
                  <p className="text-[11px] opacity-90">
                    Khi cập nhật tình trạng kỹ thuật sang "Hư hỏng", hệ thống sẽ chuyển nông cụ sang tab "Đang sửa chữa / Bảo dưỡng" và hiển thị trong danh sách theo dõi của Trung tâm BTSC.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Notifications */}
        {errorMessage && (
          <div className="p-2.5 rounded-lg text-xs font-bold bg-rose-100 text-rose-800 flex items-center gap-1.5">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-2.5 rounded-lg text-xs font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
          <Button variant="outline" size="sm" onClick={onClose} disabled={saving}>
            <X className="h-3.5 w-3.5 mr-1" />
            Hủy bỏ
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={saving}
            className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold"
          >
            {saving ? (
              <>
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                Đang lưu...
              </>
            ) : (
              <>
                <Save className="h-3.5 w-3.5 mr-1.5" />
                {isCreateMode ? 'Thêm mới thiết bị' : 'Lưu thay đổi'}
              </>
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
export default EditEquipmentModal;
