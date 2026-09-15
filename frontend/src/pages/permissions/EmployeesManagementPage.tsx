import React, { useState, useEffect, useMemo } from 'react';
import { DataTable, Column } from '../../components/data-display/DataTable';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { TableRowActions } from '../../components/common/TableRowActions';
import { AuditUserPopover } from '../../components/common/AuditUserPopover';
import { KPIGrid } from '../../components/data-display/KPIGrid';
import { StatCard } from '../../components/data-display/StatCard';
import { apiService } from '../../api/client';
import {
  Users,
  Plus,
  Search,
  Building2,
  MapPin,
  Phone,
  Mail,
  Award,
  Edit,
  Trash2,
  Eye,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  UserCheck,
  Calendar,
  CreditCard,
  Save,
  Loader2,
  SlidersHorizontal,
  X,
  Smartphone,
  Shield,
  Truck,
} from 'lucide-react';

export interface EmployeeRecord {
  id: number;
  empCode: string;
  fullName: string;
  businessUnit?: string | null;
  complex?: string | null;
  enterprise?: string | null;
  farm?: string | null;
  team?: string | null;
  position?: string | null;
  licenseClass?: string | null;
  licenseNumber?: string | null;
  licenseExpiryDate?: string | null;
  healthCheckExpiryDate?: string | null;
  status: string;
  username?: string | null;
  phone?: string | null;
  email?: string | null;
  joinedDate?: string | null;
  idCardNumber?: string | null;
  idCardIssueDate?: string | null;
  idCardIssuePlace?: string | null;
  taxCode?: string | null;
  bankAccount?: string | null;
  bankName?: string | null;
  salaryGrade?: string | null;
  baseSalary?: number | null;
  coefficients?: number | null;
  insuranceSalary?: number | null;
  createdAt?: string;
  updatedAt?: string;
}

const ALL = 'ALL';

const UNIT_OPTIONS = [
  'XN Chuối DP1',
  'XN Chuối DP2',
  'XN Chuối DP3',
  'XN Chuối LP1',
  'XN Chuối LP3',
  'XN Bò AD',
  'CGLĐ XN Bò',
  'CGLĐ LP',
  'CGTC DP',
  'CGTC LP',
  'CGTC AD',
  'Trạm trộn bê tông',
  'Hành chính KLH',
  'Bưởi AD',
  'Xoài DP',
  'Ban điện nước',
  'Phòng GNVC',
  'Tổng kho',
  'NM NHỰA -XỐP DP',
];

const POSITION_OPTIONS = [
  'Đội trưởng Cơ giới Làm đất',
  'Đội trưởng Cơ giới Thi công',
  'Quản lý Cơ giới XN Chuối DP1',
  'Quản lý Cơ giới XN Chuối DP2',
  'Quản lý Cơ giới XN Chuối DP3',
  'Quản lý Cơ giới XN Chuối LP1',
  'Quản lý Cơ giới XN Chuối LP3',
  'Quản lý Cơ giới Xí nghiệp Bò',
  'Trưởng Trạm trộn Bê tông',
  'Chuyên viên Quản lý Xe Công vụ',
  'Quản lý Cơ giới & Vườn cây Bưởi AD',
  'Quản lý Cơ giới & Vườn cây Xoài DP',
  'Phụ trách Ban Cơ điện & Máy bơm tưới',
  'Phụ trách Giao nhận & Vận tải Tổng kho',
  'Quản lý Đội xe Nhà máy Nhựa & Xốp',
];

const LICENSE_CLASS_LABELS: Record<string, string> = {
  HANG_A: 'Hạng A (Mô tô >125CC)',
  HANG_B1: 'Hạng B1 (Xe con ≤3.5T, tự động)',
  HANG_B2: 'Hạng B2 (Máy cày, ô tô con <9 chỗ, tải ≤3.5T)',
  HANG_C: 'Hạng C (Xe tải >3.5T)',
  HANG_CE: 'Hạng CE (Đầu kéo Container / Rơ-móc)',
  HANG_D1: 'Hạng D1 (Xe chở người ≤20 chỗ)',
  HANG_D2: 'Hạng D2 (Xe chở người >20 chỗ)',
};

const SHORT_LICENSE_LABELS: Record<string, string> = {
  HANG_A: 'Hạng A',
  HANG_B1: 'Hạng B1',
  HANG_B2: 'Hạng B2',
  HANG_C: 'Hạng C',
  HANG_CE: 'Hạng CE',
  HANG_D1: 'Hạng D1',
  HANG_D2: 'Hạng D2',
};

const getCleanKlh = (emp?: {
  complex?: string | null;
  businessUnit?: string | null;
  enterprise?: string | null;
  farm?: string | null;
  empCode?: string | null;
} | null): string => {
  if (!emp) return 'KLH Koun Mom';
  const code = (emp.empCode || '').toUpperCase();
  if (code === 'ADMIN-001') return 'Toàn bộ 3 Khu Liên Hợp';
  const text = `${emp.complex || ''} ${emp.businessUnit || ''} ${emp.enterprise || ''} ${emp.farm || ''} ${code}`.toUpperCase();
  if (text.includes('TOÀN') || text.includes('TOAN') || text.includes('VĂN PHÒNG ĐIỀU HÀNH')) return 'Toàn bộ 3 Khu Liên Hợp';
  if (text.includes('SNOUL') || text.includes('SN-') || text.includes('SN_')) return 'KLH Snoul';
  if (text.includes('NAM LÀO') || text.includes('NAM LAO') || text.includes('NAMLAO') || text.includes('ATTAPEU') || text.includes('NL-') || text.includes('NL_')) return 'KLH Nam Lào';
  return 'KLH Koun Mom';
};

export const EmployeesManagementPage: React.FC = () => {
  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeRecord | null>(null);
  const [detailTab, setDetailTab] = useState<'info' | 'unit' | 'license' | 'salary'>('info');

  // Modal Thêm mới / Chỉnh sửa
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<EmployeeRecord | null>(null);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form State (CHỈ TẬP TRUNG VÀO THÔNG TIN NHÂN VIÊN & HẠN GPLX)
  const [formData, setFormData] = useState({
    empCode: '',
    fullName: '',
    businessUnit: 'KLH Koun Mom',
    complex: 'KLH Koun Mom',
    enterprise: 'KLH Koun Mom',
    farm: 'KLH Koun Mom',
    team: '',
    position: 'Lái xe cơ giới',
    licenseClass: 'HANG_B2',
    licenseNumber: '',
    licenseExpiryDate: '2028-12-31',
    healthCheckExpiryDate: '2026-12-31',
    status: 'Đang làm việc',
    phone: '',
    email: '',
    joinedDate: new Date().toISOString().slice(0, 10),
    idCardNumber: '',
    idCardIssueDate: '',
    idCardIssuePlace: 'Cục CS QLHC về TTXH',
    taxCode: '',
    bankAccount: '',
    bankName: '',
    salaryGrade: 'Bậc 4/7',
    baseSalary: 15000000,
    coefficients: 2.4,
  });

  const [searchName, setSearchName] = useState('');
  const [selectedUnit, setSelectedUnit] = useState(ALL);
  const [selectedPosition, setSelectedPosition] = useState(ALL);
  const [searchPhone, setSearchPhone] = useState('');
  const [selectedLicense, setSelectedLicense] = useState(ALL);
  const [selectedStatus, setSelectedStatus] = useState(ALL);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  const hasActiveFilters =
    searchName.trim() !== '' ||
    selectedUnit !== ALL ||
    selectedPosition !== ALL ||
    searchPhone.trim() !== '' ||
    selectedLicense !== ALL ||
    selectedStatus !== ALL;

  const resetFilters = () => {
    setSearchName('');
    setSelectedUnit(ALL);
    setSelectedPosition(ALL);
    setSearchPhone('');
    setSelectedLicense(ALL);
    setSelectedStatus(ALL);
  };

  const loadEmployees = async () => {
    setLoading(true);
    try {
      const data = await apiService.getEmployees();
      const list = Array.isArray(data) ? [...data] : [];
      // Pin key synced employees and driver profiles at the top
      const priorityCodes = ['ADMIN-001', 'CB-QL-KM01', 'TX-KM-001', 'TX-SN-001', 'TX-NL-001', 'TX-NT1-001'];
      list.sort((a: EmployeeRecord, b: EmployeeRecord) => {
        const idxA = priorityCodes.indexOf(a.empCode);
        const idxB = priorityCodes.indexOf(b.empCode);
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;
        return 0;
      });
      setEmployees(list);
    } catch (err) {
      console.error('Failed to load employees:', err);
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadEmployees();
  }, []);

  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      if (searchName.trim()) {
        const query = searchName.toLowerCase().trim();
        const matchName = emp.fullName?.toLowerCase().includes(query);
        const matchCode = emp.empCode?.toLowerCase().includes(query);
        if (!matchName && !matchCode) return false;
      }
      if (searchPhone.trim()) {
        const query = searchPhone.toLowerCase().trim();
        if (!emp.phone?.toLowerCase().includes(query)) return false;
      }
      if (selectedUnit !== ALL) {
        const klh = getCleanKlh(emp);
        if (selectedUnit === 'KOUN_MOM' && klh !== 'KLH Koun Mom' && klh !== 'Toàn bộ 3 Khu Liên Hợp') return false;
        if (selectedUnit === 'SNOUL' && klh !== 'KLH Snoul' && klh !== 'Toàn bộ 3 Khu Liên Hợp') return false;
        if (selectedUnit === 'NAM_LAO' && klh !== 'KLH Nam Lào' && klh !== 'Toàn bộ 3 Khu Liên Hợp') return false;
      }
      if (selectedPosition !== ALL && emp.position !== selectedPosition) {
        return false;
      }
      if (selectedLicense !== ALL && emp.licenseClass !== selectedLicense) {
        return false;
      }
      if (selectedStatus !== ALL && emp.status !== selectedStatus) {
        return false;
      }
      return true;
    });
  }, [employees, searchName, searchPhone, selectedUnit, selectedPosition, selectedLicense, selectedStatus]);

  const totalEmployees = employees.length;
  const activeEmployees = employees.filter((e) => e.status === 'Đang làm việc' || e.status === 'Hoạt động').length;
  const driverEmployees = employees.filter((e) => e.licenseClass && e.licenseClass.trim().length > 0).length;
  const expiringLicenseEmployees = employees.filter((e) => e.licenseExpiryDate && e.licenseExpiryDate.trim().length > 0).length;

  const handleOpenCreate = () => {
    setEditingItem(null);
    setFormData({
      empCode: `TX-KM-${String(employees.length + 1).padStart(3, '0')}`,
      fullName: '',
      businessUnit: 'KLH Koun Mom',
      complex: 'KLH Koun Mom',
      enterprise: 'KLH Koun Mom',
      farm: 'Đội Cơ giới Làm đất',
      team: 'Tổ Vận hành Cơ giới',
      position: 'Đội trưởng Cơ giới Làm đất',
      licenseClass: 'HANG_B2',
      licenseNumber: '',
      licenseExpiryDate: '2028-12-31',
      healthCheckExpiryDate: '2026-12-31',
      status: 'Đang làm việc',
      phone: '',
      email: '',
      joinedDate: new Date().toISOString().slice(0, 10),
      idCardNumber: '',
      idCardIssueDate: '',
      idCardIssuePlace: 'Cục CS QLHC về TTXH',
      taxCode: '',
      bankAccount: '',
      bankName: '',
      salaryGrade: 'Bậc 4/7',
      baseSalary: 15000000,
      coefficients: 2.4,
    });
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (emp: EmployeeRecord) => {
    setEditingItem(emp);
    setFormData({
      empCode: emp.empCode || '',
      fullName: emp.fullName || '',
      businessUnit: emp.businessUnit || 'KLH Koun Mom',
      complex: emp.complex || 'KLH Koun Mom',
      enterprise: emp.enterprise || 'KLH Koun Mom',
      farm: emp.farm || '',
      team: emp.team || '',
      position: emp.position || '',
      licenseClass: emp.licenseClass || 'HANG_B2',
      licenseNumber: emp.licenseNumber || '',
      licenseExpiryDate: emp.licenseExpiryDate || '2028-12-31',
      healthCheckExpiryDate: emp.healthCheckExpiryDate || '2026-12-31',
      status: emp.status || 'Đang làm việc',
      phone: emp.phone || '',
      email: emp.email || '',
      joinedDate: emp.joinedDate || '',
      idCardNumber: emp.idCardNumber || '',
      idCardIssueDate: emp.idCardIssueDate || '',
      idCardIssuePlace: emp.idCardIssuePlace || '',
      taxCode: emp.taxCode || '',
      bankAccount: emp.bankAccount || '',
      bankName: emp.bankName || '',
      salaryGrade: emp.salaryGrade || 'Bậc 4/7',
      baseSalary: emp.baseSalary || 15000000,
      coefficients: emp.coefficients || 2.4,
    });
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.empCode.trim() || !formData.fullName.trim()) {
      setErrorMessage('Vui lòng nhập đầy đủ Mã nhân viên và Họ tên.');
      return;
    }
    try {
      setSaving(true);
      setErrorMessage(null);
      setSuccessMessage(null);
      if (editingItem) {
        await apiService.updateEmployee(editingItem.id, formData);
        setSuccessMessage('Đã cập nhật hồ sơ nhân viên thành công!');
      } else {
        await apiService.createEmployee(formData);
        setSuccessMessage('Đã thêm mới hồ sơ nhân viên thành công!');
      }
      setTimeout(() => {
        setIsModalOpen(false);
        void loadEmployees();
      }, 700);
    } catch (err: any) {
      console.error('Save employee error:', err);
      setErrorMessage(err?.response?.data?.message || 'Có lỗi xảy ra khi lưu thông tin nhân viên.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!window.confirm(`XÁC NHẬN XÓA:\n\nBạn có chắc chắn muốn xóa hồ sơ nhân viên "${name}" khỏi hệ thống không?`)) return;
    try {
      await apiService.deleteEmployee(id);
      void loadEmployees();
    } catch (err) {
      alert('Không thể xóa nhân viên này.');
    }
  };

  const columns: Column<EmployeeRecord>[] = [
    {
      key: 'empCode',
      title: 'MÃ NV & HỌ TÊN',
      sortable: true,
      width: '160px',
      render: (row) => (
        <div>
          <span className="font-semibold text-slate-900 text-xs block">
            {row.fullName}
          </span>
          <span className="font-mono text-[11px] text-slate-500">{row.empCode}</span>
        </div>
      ),
      filterElement: (
        <input
          type="text"
          value={searchName}
          onChange={(e) => setSearchName(e.target.value)}
          placeholder="Lọc tên/mã..."
          className="h-7 w-full rounded border border-slate-300 bg-white px-1.5 text-[11px] text-slate-800 outline-none focus:border-slate-500"
        />
      ),
    },
    {
      key: 'position',
      title: 'CHỨC DANH / VỊ TRÍ',
      sortable: true,
      width: '200px',
      render: (row) => (
        <span className="text-xs text-slate-800">
          {row.position || 'Quản lý cơ giới'}
        </span>
      ),
      filterElement: (
        <select
          value={selectedPosition}
          onChange={(e) => setSelectedPosition(e.target.value)}
          className="h-7 w-full rounded border border-slate-300 bg-white px-1 text-[11px] text-slate-800 outline-none focus:border-slate-500"
        >
          <option value={ALL}>Tất cả chức danh</option>
          {POSITION_OPTIONS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      ),
    },
    {
      key: 'businessUnit',
      title: 'KHU LIÊN HỢP PHỤ TRÁCH',
      sortable: true,
      width: '180px',
      render: (row) => (
        <span className="text-xs text-slate-800">
          {getCleanKlh(row)}
        </span>
      ),
      filterElement: (
        <select
          value={selectedUnit}
          onChange={(e) => setSelectedUnit(e.target.value)}
          className="h-7 w-full rounded border border-slate-300 bg-white px-1 text-[11px] text-slate-800 outline-none focus:border-slate-500"
        >
          <option value={ALL}>Tất cả Khu liên hợp</option>
          <option value="KOUN_MOM">KLH Koun Mom</option>
          <option value="SNOUL">KLH Snoul</option>
          <option value="NAM_LAO">KLH Nam Lào</option>
        </select>
      ),
    },
    {
      key: 'phone',
      title: 'SỐ ZALO / SĐT',
      width: '120px',
      render: (row) => (
        <span className="font-mono text-xs text-slate-800">
          {row.phone || '—'}
        </span>
      ),
      filterElement: (
        <input
          type="text"
          value={searchPhone}
          onChange={(e) => setSearchPhone(e.target.value)}
          placeholder="Lọc SĐT..."
          className="h-7 w-full rounded border border-slate-300 bg-white px-1.5 text-[11px] font-mono text-slate-800 outline-none focus:border-slate-500"
        />
      ),
    },
    {
      key: 'licenseClass',
      title: 'GIẤY PHÉP LÁI XE',
      width: '160px',
      render: (row) => (
        <div className="text-xs text-slate-800 space-y-0.5">
          <div>{SHORT_LICENSE_LABELS[row.licenseClass || ''] || row.licenseClass || 'Máy Nông Nghiệp'}</div>
          <div className="text-[11px] text-slate-500 font-mono">
            Hạn: {row.licenseExpiryDate || '2028-12-31'}
          </div>
        </div>
      ),
      filterElement: (
        <select
          value={selectedLicense}
          onChange={(e) => setSelectedLicense(e.target.value)}
          className="h-7 w-full rounded border border-slate-300 bg-white px-1 text-[11px] text-slate-800 outline-none focus:border-slate-500"
        >
          <option value={ALL}>Tất cả bằng</option>
          {Object.entries(SHORT_LICENSE_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      ),
    },
    {
      key: 'username',
      title: 'TÀI KHOẢN & PHÂN QUYỀN',
      width: '200px',
      render: (row) => {
        const isDriver =
          row.empCode?.startsWith('TX-') ||
          row.empCode?.includes('TX') ||
          row.licenseClass ||
          row.position?.toLowerCase().includes('lái xe') ||
          row.position?.toLowerCase().includes('vận hành');
        const isAdmin = row.empCode === 'ADMIN-001' || row.position?.toLowerCase().includes('admin');

        const autoUser =
          row.username ||
          (row.empCode === 'TX-KM-001' || row.empCode === 'TX-NT1-001'
            ? 'tx.kounmom'
            : row.empCode === 'TX-SN-001'
            ? 'tx.snoul'
            : row.empCode === 'TX-NL-001'
            ? 'tx.namlao'
            : row.empCode.toLowerCase().replace('-', '.'));

        const roleLabel = isAdmin
          ? 'Quản trị (Web toàn quyền)'
          : isDriver
          ? 'Chỉ App Mobile (Chặn Web)'
          : 'Nhân sự quản lý (Web KLH)';

        return (
          <div className="space-y-0.5">
            <span className="font-mono text-xs font-semibold text-slate-900 block">
              {isAdmin ? (row.username || 'admin') : isDriver ? autoUser : (row.username || row.empCode.toLowerCase())}
            </span>
            <span className="text-[11px] text-slate-500 block">
              {roleLabel}
            </span>
          </div>
        );
      },
    },
    {
      key: 'status',
      title: 'Trạng thái',
      sortable: true,
      width: '110px',
      render: (row) => (
        <span className="text-xs text-slate-800">
          {row.status || 'Đang làm việc'}
        </span>
      ),
      filterElement: (
        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="h-7 w-full rounded border border-slate-300 bg-white px-1 text-[11px] text-slate-800 outline-none focus:border-slate-500"
        >
          <option value={ALL}>Tất cả</option>
          <option value="Đang làm việc">Đang làm việc</option>
          <option value="Tạm nghỉ">Tạm nghỉ</option>
        </select>
      ),
    },
    {
      key: 'user',
      title: 'User',
      align: 'center',
      width: '70px',
      render: (row) => (
        <AuditUserPopover
          createdDate={row.createdAt ? new Date(row.createdAt).toLocaleDateString('vi-VN') : '14-03-2026'}
          createdUser="admin"
          updatedDate={row.updatedAt ? new Date(row.updatedAt).toLocaleDateString('vi-VN') : '01-08-2026'}
          updatedUser="admin"
          title={`Xem thông tin tạo/sửa của ${row.fullName}`}
        />
      ),
    },
    {
      key: 'id',
      title: 'Tác vụ',
      align: 'center',
      width: '110px',
      render: (row) => (
        <TableRowActions
          onView={() => {
            setSelectedEmployee(row);
            setDetailTab('info');
          }}
          onEdit={() => handleOpenEdit(row)}
          onDelete={() => handleDelete(row.id, row.fullName)}
          viewTitle="Xem lý lịch"
          editTitle="Sửa thông tin"
          deleteTitle="Xóa nhân viên"
        />
      ),
      filterElement: hasActiveFilters ? (
        <button
          type="button"
          onClick={resetFilters}
          className="inline-flex items-center justify-center rounded bg-slate-100 px-1.5 py-1 text-[10px] font-semibold text-slate-700 hover:bg-slate-200 border border-slate-300 w-full transition-colors"
          title="Xóa toàn bộ lọc cột"
        >
          Đặt lại
        </button>
      ) : null,
    },
  ];

  return (
    <div className="space-y-4">


      {/* 2. STATS OVERVIEW CARDS */}
      <KPIGrid cols={4}>
        <StatCard
          label="Tổng quy mô nhân sự"
          value={`${totalEmployees.toLocaleString('vi-VN')} nhân sự`}
          subValue="Đã lưu hồ sơ trên hệ thống"
          icon={<Users className="w-5 h-5" />}
          iconBgColor="bg-emerald-50"
          iconColor="text-[#1B4D20]"
        />
        <StatCard
          label="Đang làm việc"
          value={`${activeEmployees.toLocaleString('vi-VN')} nhân sự`}
          subValue="Trạng thái hoạt động bình thường"
          icon={<UserCheck className="w-5 h-5" />}
          iconBgColor="bg-sky-50"
          iconColor="text-sky-600"
        />
        <StatCard
          label="Lái xe & Vận hành máy"
          value={`${driverEmployees.toLocaleString('vi-VN')} tài xế`}
          subValue="Đã đăng ký chứng chỉ & GPLX"
          icon={<Award className="w-5 h-5" />}
          iconBgColor="bg-amber-50"
          iconColor="text-amber-600"
        />
        <StatCard
          label="Thời hạn GPLX đã quản lý"
          value={`${expiringLicenseEmployees.toLocaleString('vi-VN')} bằng lái`}
          subValue="Có đầy đủ ngày/năm hết hạn"
          icon={<Calendar className="w-5 h-5" />}
          iconBgColor="bg-purple-50"
          iconColor="text-purple-600"
        />
      </KPIGrid>



      {/* 3. THANH TÌM KIẾM & QUẢN LÝ NHÂN SỰ */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
        {/* ROW 1: HEADER ACTION BUTTONS */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <span className="font-heading text-sm font-extrabold text-slate-800 uppercase tracking-wide">
              Danh bạ Nhân sự & Tài xế
            </span>
            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
              {totalEmployees.toLocaleString('vi-VN')} nhân sự
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleOpenCreate}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-primary bg-primary px-3.5 text-xs font-black text-white shadow-xs transition-all hover:bg-primary-600 hover:scale-[1.01]"
            >
              <Plus className="h-4 w-4 stroke-[3]" />
              Thêm mới nhân viên
            </button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => void loadEmployees()}
              className="h-9 border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 text-xs font-bold"
            >
              <RotateCcw className={`mr-1.5 h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              Làm mới
            </Button>
          </div>
        </div>

        {/* ROW 2: SEARCH INPUT & ADVANCED FILTER TOGGLE */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center justify-between">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                placeholder="Nhập tên cán bộ, tài xế, mã NV, số điện thoại, CCCD, GPLX..."
                className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-9 text-xs font-medium text-slate-900 outline-none transition focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/15"
              />
              {searchName && (
                <button
                  type="button"
                  onClick={() => setSearchName('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={`inline-flex h-10 items-center gap-1.5 rounded-xl border px-3.5 text-xs font-bold transition-all ${
                showAdvancedFilters || hasActiveFilters
                  ? 'border-primary bg-primary-50 text-primary'
                  : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Bộ lọc nâng cao
              {hasActiveFilters && (
                <span className="rounded-full bg-primary px-1.5 py-0.2 text-[10px] text-white">
                  Đang lọc
                </span>
              )}
            </button>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex h-10 items-center gap-1 rounded-xl border border-rose-200 bg-rose-50 px-3 text-xs font-bold text-rose-700 hover:bg-rose-100"
                title="Xóa toàn bộ bộ lọc"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Đặt lại
              </button>
            )}
          </div>
        </div>

        {/* CÁC DROPDOWN BỘ LỌC NÂNG CAO KHI MỞ RỘNG */}
        {showAdvancedFilters && (
          <div className="grid grid-cols-1 gap-3 border-t border-slate-100 pt-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                Đơn vị công tác ({UNIT_OPTIONS.length} đơn vị)
              </label>
              <select
                value={selectedUnit}
                onChange={(e) => setSelectedUnit(e.target.value)}
                className="h-8.5 w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-xs font-bold text-slate-800 outline-none focus:border-primary focus:bg-white"
              >
                <option value={ALL}>Tất cả đơn vị ({UNIT_OPTIONS.length})</option>
                {UNIT_OPTIONS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                Chức danh / Vị trí ({POSITION_OPTIONS.length} vị trí)
              </label>
              <select
                value={selectedPosition}
                onChange={(e) => setSelectedPosition(e.target.value)}
                className="h-8.5 w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-xs font-bold text-slate-800 outline-none focus:border-primary focus:bg-white"
              >
                <option value={ALL}>Tất cả chức danh</option>
                {POSITION_OPTIONS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                Bằng lái / Chứng chỉ
              </label>
              <select
                value={selectedLicense}
                onChange={(e) => setSelectedLicense(e.target.value)}
                className="h-8.5 w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-xs font-bold text-slate-800 outline-none focus:border-primary focus:bg-white"
              >
                <option value={ALL}>Tất cả bằng lái</option>
                {Object.entries(LICENSE_CLASS_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                Trạng thái làm việc
              </label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="h-8.5 w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-xs font-bold text-slate-800 outline-none focus:border-primary focus:bg-white"
              >
                <option value={ALL}>Tất cả trạng thái</option>
                <option value="Đang làm việc">Đang làm việc</option>
                <option value="Tạm nghỉ / Đang nghỉ phép">Tạm nghỉ / Đang nghỉ phép</option>
                <option value="Đã nghỉ việc">Đã nghỉ việc</option>
              </select>
            </div>
          </div>
        )}
      </section>

      {/* 4. BẢNG DANH SÁCH NHÂN VIÊN */}
      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 bg-slate-50/70">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-sm text-slate-900">Danh sách Cán bộ Nhân viên KLH</span>
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800">
              {filteredEmployees.length} nhân sự
            </span>
          </div>
        </div>

        <DataTable
          columns={columns}
          data={filteredEmployees}
          isLoading={loading}
          pageSize={20}
          showSearch={false}
        />
      </section>

      {/* 5. MODAL XEM CHI TIẾT HỒ SƠ NHÂN VIÊN */}
      {selectedEmployee && (
        <Modal
          isOpen={Boolean(selectedEmployee)}
          onClose={() => setSelectedEmployee(null)}
          title={`Hồ sơ Nhân viên: ${selectedEmployee.empCode} - ${selectedEmployee.fullName}`}
          size="lg"
          footer={
            <div className="flex items-center justify-end gap-2 w-full">
              <Button variant="outline" size="sm" onClick={() => setSelectedEmployee(null)}>
                Đóng
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  const emp = selectedEmployee;
                  setSelectedEmployee(null);
                  handleOpenEdit(emp);
                }}
                className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold"
              >
                <Edit className="h-3.5 w-3.5 mr-1.5" />
                Chỉnh sửa hồ sơ
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            {/* Header Hero Banner */}
            <div className="rounded-xl border border-emerald-200 bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-slate-900">{selectedEmployee.fullName}</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="font-mono text-xs font-bold text-emerald-800">{selectedEmployee.empCode}</span>
                    <span className="text-slate-300">•</span>
                    <span className="text-xs font-semibold text-slate-600">{selectedEmployee.position}</span>
                  </div>
                </div>
                <span className="rounded-md bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800">
                  {selectedEmployee.status || 'Đang làm việc'}
                </span>
              </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex border-b border-slate-200">
              {[
                { key: 'info', label: '1. Thông tin cá nhân', icon: UserCheck },
                { key: 'unit', label: '2. Phân bổ công tác', icon: Building2 },
                { key: 'license', label: '3. Bằng lái & Thời hạn', icon: Award },
                { key: 'salary', label: '4. Lương & Ngân hàng', icon: CreditCard },
              ].map((tab) => {
                const Icon = tab.icon;
                const active = detailTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setDetailTab(tab.key as any)}
                    className={`flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-bold transition-all ${
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

            {/* Tab Contents */}
            <div className="min-h-[220px] pt-1">
              {detailTab === 'info' && (
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                    <span className="text-slate-400 block text-[10px] font-bold uppercase">Số CCCD / CMND</span>
                    <span className="font-mono font-bold text-slate-900 text-xs">
                      {selectedEmployee.idCardNumber || '—'}
                    </span>
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                    <span className="text-slate-400 block text-[10px] font-bold uppercase">Ngày cấp & Nơi cấp</span>
                    <span className="font-semibold text-slate-900 text-xs">
                      {selectedEmployee.idCardIssueDate || '—'} ({selectedEmployee.idCardIssuePlace || '—'})
                    </span>
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                    <span className="text-slate-400 block text-[10px] font-bold uppercase">Số điện thoại liên lạc</span>
                    <span className="font-mono font-bold text-emerald-800 text-xs">
                      {selectedEmployee.phone || '—'}
                    </span>
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                    <span className="text-slate-400 block text-[10px] font-bold uppercase">Email doanh nghiệp</span>
                    <span className="font-mono font-medium text-slate-900 text-xs">
                      {selectedEmployee.email || '—'}
                    </span>
                  </div>
                </div>
              )}

              {detailTab === 'unit' && (
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                    <span className="text-slate-400 block text-[10px] font-bold uppercase">Khu liên hợp phụ trách</span>
                    <span className="font-bold text-slate-900 text-xs">{getCleanKlh(selectedEmployee)}</span>
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                    <span className="text-slate-400 block text-[10px] font-bold uppercase">Đơn vị công tác</span>
                    <span className="font-bold text-emerald-800 text-xs">
                      {getCleanKlh(selectedEmployee)}
                    </span>
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                    <span className="text-slate-400 block text-[10px] font-bold uppercase">Đội ngũ vận hành</span>
                    <span className="font-semibold text-slate-900 text-xs">
                      {selectedEmployee.team ? selectedEmployee.team.replace(/NT[12]|Ban Cơ Giới/gi, 'KLH') : 'Đội xe KLH'}
                    </span>
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                    <span className="text-slate-400 block text-[10px] font-bold uppercase">Ngày gia nhập THACO AGRI</span>
                    <span className="font-mono font-semibold text-slate-900 text-xs">
                      {selectedEmployee.joinedDate || '—'}
                    </span>
                  </div>
                </div>
              )}

              {detailTab === 'license' && (
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                    <span className="text-slate-400 block text-[10px] font-bold uppercase">Hạng giấy phép lái xe</span>
                    <span className="font-bold text-sky-800 text-xs">
                      {selectedEmployee.licenseClass
                        ? LICENSE_CLASS_LABELS[selectedEmployee.licenseClass] || selectedEmployee.licenseClass
                        : 'Chưa khai báo'}
                    </span>
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                    <span className="text-slate-400 block text-[10px] font-bold uppercase">Số GPLX / Chứng chỉ</span>
                    <span className="font-mono font-bold text-slate-900 text-xs">
                      {selectedEmployee.licenseNumber || '—'}
                    </span>
                  </div>
                  <div className="rounded-xl border border-amber-100 bg-amber-50/70 p-3">
                    <span className="text-amber-700 block text-[10px] font-bold uppercase">Thời hạn Hết hạn GPLX</span>
                    <span className="font-mono font-black text-amber-900 text-xs">
                      {selectedEmployee.licenseExpiryDate || 'Không thời hạn'}
                    </span>
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                    <span className="text-slate-400 block text-[10px] font-bold uppercase">Hạn khám sức khỏe định kỳ</span>
                    <span className="font-mono font-semibold text-slate-900 text-xs">
                      {selectedEmployee.healthCheckExpiryDate || '—'}
                    </span>
                  </div>
                </div>
              )}

              {detailTab === 'salary' && (
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                    <span className="text-slate-400 block text-[10px] font-bold uppercase">Bậc lương & Hệ số</span>
                    <span className="font-semibold text-slate-900 text-xs">
                      {selectedEmployee.salaryGrade || 'Bậc 4/7'} (Hệ số: {selectedEmployee.coefficients || 2.4})
                    </span>
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                    <span className="text-slate-400 block text-[10px] font-bold uppercase">Lương cơ bản</span>
                    <span className="font-mono font-bold text-slate-900 text-xs">
                      {selectedEmployee.baseSalary ? `${selectedEmployee.baseSalary.toLocaleString('vi-VN')} VNĐ` : '—'}
                    </span>
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 col-span-2">
                    <span className="text-slate-400 block text-[10px] font-bold uppercase">Số tài khoản & Ngân hàng nhận lương</span>
                    <span className="font-mono font-semibold text-slate-900 text-xs">
                      {selectedEmployee.bankAccount || '—'} ({selectedEmployee.bankName || 'Vietcombank'})
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* 6. MODAL THÊM MỚI / CHỈNH SỬA NHÂN VIÊN */}
      {isModalOpen && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={editingItem ? `Chỉnh sửa hồ sơ nhân viên: ${editingItem.empCode}` : 'Thêm mới Hồ sơ Cán bộ Nhân viên'}
          size="lg"
          footer={
            <div className="flex items-center justify-end gap-2 w-full">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsModalOpen(false)} disabled={saving}>
                <X className="h-3.5 w-3.5 mr-1" />
                Hủy bỏ
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleSubmit}
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
                    {editingItem ? 'Lưu thay đổi' : 'Thêm mới nhân viên'}
                  </>
                )}
              </Button>
            </div>
          }
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Header summary banner */}
            <div className="rounded-xl border border-emerald-200 bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 p-3.5">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-mono text-sm font-black text-emerald-900">{formData.empCode}</span>
                  <h4 className="text-xs font-bold text-slate-800">
                    {formData.fullName || (editingItem ? editingItem.fullName : 'Khai báo nhân sự mới')}
                  </h4>
                </div>
                <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-800">
                  {editingItem ? 'Cập nhật nhân sự' : 'Tạo mới hồ sơ'}
                </span>
              </div>
            </div>

            {/* Alerts */}
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

            {/* Form Fields */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">Mã nhân viên: *</label>
                <input
                  type="text"
                  required
                  value={formData.empCode}
                  onChange={(e) => setFormData({ ...formData, empCode: e.target.value })}
                  placeholder="VD: THA-KM-015"
                  className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-mono font-bold text-slate-900 outline-none focus:border-primary focus:bg-white"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">Họ và tên: *</label>
                <input
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  placeholder="VD: Nguyễn Văn A..."
                  className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-bold text-slate-900 outline-none focus:border-primary focus:bg-white"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">Khu liên hợp phụ trách: *</label>
                <select
                  value={formData.complex}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      complex: e.target.value,
                      businessUnit: e.target.value,
                      enterprise: e.target.value,
                    })
                  }
                  className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-bold text-slate-800 outline-none focus:border-primary focus:bg-white"
                >
                  <option value="KLH Koun Mom">KLH Koun Mom (Campuchia)</option>
                  <option value="KLH Snoul">KLH Snoul (Campuchia)</option>
                  <option value="KLH Nam Lào">KLH Nam Lào (Lào)</option>
                  <option value="Toàn bộ 3 Khu Liên Hợp">Toàn bộ 3 Khu Liên Hợp</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">Chức danh / Vị trí: *</label>
                <select
                  value={formData.position}
                  onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-bold text-slate-800 outline-none focus:border-primary focus:bg-white"
                >
                  {POSITION_OPTIONS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">Số điện thoại liên lạc:</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="VD: 0912345678"
                  className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-mono text-slate-900 outline-none focus:border-primary focus:bg-white"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">Email doanh nghiệp:</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="VD: nv@thacoagri.com.vn"
                  className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-mono text-slate-900 outline-none focus:border-primary focus:bg-white"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">Hạng giấy phép lái xe:</label>
                <select
                  value={formData.licenseClass}
                  onChange={(e) => setFormData({ ...formData, licenseClass: e.target.value })}
                  className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-bold text-slate-800 outline-none focus:border-primary focus:bg-white"
                >
                  <option value="">Không có / Chưa khai báo</option>
                  {Object.entries(LICENSE_CLASS_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">Số GPLX / Chứng chỉ:</label>
                <input
                  type="text"
                  value={formData.licenseNumber}
                  onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
                  placeholder="VD: GPLX-70-2023-..."
                  className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-mono text-slate-900 outline-none focus:border-primary focus:bg-white"
                />
              </div>

              {/* NGÀY/NĂM HẾT HẠN GIẤY PHÉP LÁI XE */}
              <div>
                <label className="mb-1 block text-xs font-bold text-amber-800">
                  Hạn hết hạn GPLX (Thời hạn GPLX): *
                </label>
                <input
                  type="date"
                  value={formData.licenseExpiryDate}
                  onChange={(e) => setFormData({ ...formData, licenseExpiryDate: e.target.value })}
                  className="h-9 w-full rounded-xl border border-amber-300 bg-amber-50/50 px-3 text-xs font-mono font-bold text-amber-900 outline-none focus:border-primary focus:bg-white"
                />
              </div>

              {/* HẠN KHÁM SỨC KHỎE */}
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">Hạn khám sức khỏe định kỳ:</label>
                <input
                  type="date"
                  value={formData.healthCheckExpiryDate}
                  onChange={(e) => setFormData({ ...formData, healthCheckExpiryDate: e.target.value })}
                  className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-mono text-slate-900 outline-none focus:border-primary focus:bg-white"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">Số CCCD / CMND:</label>
                <input
                  type="text"
                  value={formData.idCardNumber}
                  onChange={(e) => setFormData({ ...formData, idCardNumber: e.target.value })}
                  placeholder="VD: 070089001234"
                  className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-mono text-slate-900 outline-none focus:border-primary focus:bg-white"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">Ngày gia nhập công ty:</label>
                <input
                  type="date"
                  value={formData.joinedDate}
                  onChange={(e) => setFormData({ ...formData, joinedDate: e.target.value })}
                  className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-mono text-slate-900 outline-none focus:border-primary focus:bg-white"
                />
              </div>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
export default EmployeesManagementPage;
