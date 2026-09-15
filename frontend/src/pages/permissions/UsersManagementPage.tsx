import React, { useState, useEffect, useMemo } from 'react';
import { FilterBar } from '../../components/filters/FilterBar';
import { DataTable, Column } from '../../components/data-display/DataTable';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { TableRowActions } from '../../components/common/TableRowActions';
import { AuditUserPopover } from '../../components/common/AuditUserPopover';
import { StatCard } from '../../components/data-display/StatCard';
import { KPIGrid } from '../../components/data-display/KPIGrid';
import { apiClient } from '../../api/client';
import {
  Users,
  Plus,
  Download,
  ShieldCheck,
  Shield,
  Truck,
  UserCheck,
  Search,
  CheckCircle2,
  Lock,
  Smartphone,
  AlertTriangle,
  Building2,
  Wifi,
  WifiOff,
  Power,
  UserX,
} from 'lucide-react';

export interface SystemUserRecord {
  id: string;
  rawId?: number;
  username: string;
  employeeCode: string;
  fullName: string;
  phone: string;
  enterpriseEmail: string;
  roleCategory: 'ADMIN' | 'MANAGER' | 'DRIVER';
  rawRole: string;
  roleName: string;
  workUnit: string;
  klhName: 'KLH Koun Mom' | 'KLH Snoul' | 'KLH Nam Lào' | 'Toàn bộ 3 Khu Liên Hợp';
  lastLogin: string;
  isActive: boolean; // Còn hoạt động (true) / Ngưng hoạt động (false)
  isOnline: boolean; // Đang Online (true) / Offline (false)
  employmentStatus?: 'DANG_LAM_VIEC' | 'DA_NGHI_VIEC';
  driverCode?: string;
  licenseClass?: string;
}

const DEFAULT_USERS_DATA: SystemUserRecord[] = [
  {
    id: 'USR-01',
    rawId: 1,
    username: 'admin',
    employeeCode: 'ADMIN-001',
    fullName: 'Quản trị viên Hệ thống',
    phone: '0901 234 567',
    enterpriseEmail: 'admin@thacoagri.com.vn',
    roleCategory: 'ADMIN',
    rawRole: 'SUPER_ADMIN',
    roleName: 'Quản trị viên (Admin)',
    workUnit: 'Toàn bộ 3 Khu Liên Hợp',
    klhName: 'Toàn bộ 3 Khu Liên Hợp',
    lastLogin: 'Vừa xong (15:45)',
    isActive: true,
    isOnline: true,
    employmentStatus: 'DANG_LAM_VIEC',
  },
  {
    id: 'USR-02',
    rawId: 100,
    username: 'quanly.kounmom',
    employeeCode: 'CB-QL-KM01',
    fullName: 'Lê Văn Hùng',
    phone: '0912 345 678',
    enterpriseEmail: 'quanly.kounmom@thacoagri.com.vn',
    roleCategory: 'MANAGER',
    rawRole: 'FARM_MANAGER',
    roleName: 'Nhân sự quản lý (KLH Koun Mom)',
    workUnit: 'KLH Koun Mom',
    klhName: 'KLH Koun Mom',
    lastLogin: '12/9/2026',
    isActive: true,
    isOnline: false,
    employmentStatus: 'DANG_LAM_VIEC',
  },
  {
    id: 'USR-03',
    rawId: 10,
    username: 'minh.nv',
    employeeCode: 'TX-001',
    fullName: 'Nguyễn Văn Minh',
    phone: '0912 111 001',
    enterpriseEmail: 'minh.nv@thacoagri.com.vn',
    roleCategory: 'DRIVER',
    rawRole: 'DRIVER',
    roleName: 'Tài xế cơ giới',
    workUnit: 'KLH Koun Mom',
    klhName: 'KLH Koun Mom',
    lastLogin: 'Vừa xong (App Mobile)',
    isActive: true,
    isOnline: true,
    driverCode: 'TX-001',
    licenseClass: 'HANG_B2',
    employmentStatus: 'DANG_LAM_VIEC',
  },
  {
    id: 'USR-04',
    rawId: 102,
    username: 'tx.kounmom',
    employeeCode: 'TX-KM-001',
    fullName: 'Trần Đình Trọng',
    phone: '0988 123 456',
    enterpriseEmail: 'tx.kounmom@thacoagri.com.vn',
    roleCategory: 'DRIVER',
    rawRole: 'DRIVER',
    roleName: 'Tài xế cơ giới',
    workUnit: 'KLH Koun Mom',
    klhName: 'KLH Koun Mom',
    lastLogin: '12/9/2026',
    isActive: true,
    isOnline: false,
    driverCode: 'TX-KM-001',
    licenseClass: 'HANG_B2',
    employmentStatus: 'DANG_LAM_VIEC',
  },
  {
    id: 'USR-05',
    rawId: 103,
    username: 'tx.snoul',
    employeeCode: 'TX-SN-001',
    fullName: 'Phan Văn Đức',
    phone: '0977 234 567',
    enterpriseEmail: 'tx.snoul@thacoagri.com.vn',
    roleCategory: 'DRIVER',
    rawRole: 'DRIVER',
    roleName: 'Tài xế cơ giới (Chỉ App Mobile)',
    workUnit: 'KLH Snoul',
    klhName: 'KLH Snoul',
    lastLogin: 'Hôm nay 08:30',
    isActive: true,
    isOnline: false,
    driverCode: 'TX-SN-001',
    licenseClass: 'C',
    employmentStatus: 'DANG_LAM_VIEC',
  },
  {
    id: 'USR-06',
    rawId: 104,
    username: 'tx.namlao',
    employeeCode: 'TX-NL-001',
    fullName: 'Khamphou Somlith',
    phone: '0966 345 678',
    enterpriseEmail: 'tx.namlao@thacoagri.com.vn',
    roleCategory: 'DRIVER',
    rawRole: 'DRIVER',
    roleName: 'Tài xế cơ giới (Chỉ App Mobile)',
    workUnit: 'KLH Nam Lào',
    klhName: 'KLH Nam Lào',
    lastLogin: 'Hôm qua 17:10',
    isActive: true,
    isOnline: false,
    driverCode: 'TX-NL-001',
    licenseClass: 'B2',
    employmentStatus: 'DANG_LAM_VIEC',
  },
  {
    id: 'USR-07',
    rawId: 105,
    username: 'km_tx_001',
    employeeCode: 'KM-TX-001',
    fullName: 'Nguyễn Văn Hùng',
    phone: '0923 111 222',
    enterpriseEmail: 'hung.nv@thacoagri.com.vn',
    roleCategory: 'DRIVER',
    rawRole: 'DRIVER',
    roleName: 'Tài xế (KLH Koun Mom)',
    workUnit: 'KLH Koun Mom',
    klhName: 'KLH Koun Mom',
    lastLogin: 'Hôm nay 07:05',
    isActive: true,
    isOnline: false,
    driverCode: 'KM-TX-001',
    licenseClass: 'C',
    employmentStatus: 'DANG_LAM_VIEC',
  },
  {
    id: 'USR-08',
    rawId: 106,
    username: 'nl_tx_002',
    employeeCode: 'NL-TX-002',
    fullName: 'Bounmy Sisavath',
    phone: '0945 333 444',
    enterpriseEmail: 'bounmy.s@thacoagri.com.vn',
    roleCategory: 'DRIVER',
    rawRole: 'DRIVER',
    roleName: 'Tài xế (KLH Nam Lào)',
    workUnit: 'KLH Nam Lào',
    klhName: 'KLH Nam Lào',
    lastLogin: '28/08/2026 (Đã nghỉ)',
    isActive: false, // Ngưng hoạt động (Đã nghỉ việc)
    isOnline: false,
    driverCode: 'NL-TX-002',
    licenseClass: 'C',
    employmentStatus: 'DA_NGHI_VIEC',
  },
];

export const UsersManagementPage: React.FC = () => {
  const [selectedUser, setSelectedUser] = useState<SystemUserRecord | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [usersList, setUsersList] = useState<SystemUserRecord[]>(DEFAULT_USERS_DATA);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<'ALL' | 'ADMIN' | 'MANAGER' | 'DRIVER'>('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<'ALL' | 'ONLINE' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [selectedKlhFilter, setSelectedKlhFilter] = useState<'ALL' | 'KM' | 'SN' | 'NL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Add user modal state
  const [newUser, setNewUser] = useState({
    username: '',
    fullName: '',
    phone: '',
    roleCategory: 'DRIVER' as 'ADMIN' | 'MANAGER' | 'DRIVER',
    klh: 'KLH Koun Mom' as 'KLH Koun Mom' | 'KLH Snoul' | 'KLH Nam Lào',
    workUnit: 'Nông trường 1',
    password: '123',
    licenseClass: 'C',
  });

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/users', { params: { limit: 100 } });
      const items = res.data?.data || res.data?.items || (Array.isArray(res.data) ? res.data : []);
      if (Array.isArray(items) && items.length > 0) {
        const mapped: SystemUserRecord[] = items.map((u: any) => {
          const role = String(u.role || '').toUpperCase();
          let roleCategory: 'ADMIN' | 'MANAGER' | 'DRIVER' = 'DRIVER';
          let roleName = 'Tài xế cơ giới';

          if (role === 'SUPER_ADMIN' || u.username === 'admin') {
            roleCategory = 'ADMIN';
            roleName = 'Quản trị viên (Admin)';
          } else if (
            role.includes('MANAGER') ||
            role === 'DISPATCHER' ||
            role === 'WORKSHOP_MANAGER' ||
            role === 'FUEL_STOREKEEPER' ||
            u.username.includes('quanly')
          ) {
            roleCategory = 'MANAGER';
            roleName = 'Nhân sự quản lý';
          } else {
            roleCategory = 'DRIVER';
            roleName = 'Tài xế';
          }

          // Detect KLH
          const rawUnit = String(u.unit || u.code || u.username).toUpperCase();
          let klhName: 'KLH Koun Mom' | 'KLH Snoul' | 'KLH Nam Lào' | 'Toàn bộ 3 Khu Liên Hợp' = 'KLH Koun Mom';
          if (roleCategory === 'ADMIN') {
            klhName = 'Toàn bộ 3 Khu Liên Hợp';
          } else if (rawUnit.includes('SN') || rawUnit.includes('SNOUL')) {
            klhName = 'KLH Snoul';
          } else if (rawUnit.includes('NL') || rawUnit.includes('NAMLAO') || rawUnit.includes('LAO')) {
            klhName = 'KLH Nam Lào';
          } else {
            klhName = 'KLH Koun Mom';
          }

          const isResigned = u.employmentStatus === 'DA_NGHI_VIEC';
          const isActive = u.isActive !== false && !isResigned;

          // Real Online Status: Sourced 100% directly from Backend UserPresenceService
          const isOnline = isActive && Boolean(u.isOnline);

          return {
            id: `USR-${u.id}`,
            rawId: u.id,
            username: u.username || `user_${u.id}`,
            employeeCode: u.code || `NV-${u.id}`,
            fullName: u.fullName || u.username,
            phone: u.phone || '090x xxx xxx',
            enterpriseEmail: `${u.username}@thacoagri.com.vn`,
            roleCategory,
            rawRole: role,
            roleName: `${roleName} (${klhName})`,
            workUnit: klhName,
            klhName,
            lastLogin: u.lastSeenAt
              ? new Date(u.lastSeenAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) +
                ' ' +
                new Date(u.lastSeenAt).toLocaleDateString('vi-VN')
              : u.createdAt
              ? new Date(u.createdAt).toLocaleDateString('vi-VN')
              : 'Mới tạo',
            isActive,
            isOnline,
            employmentStatus: u.employmentStatus || (isResigned ? 'DA_NGHI_VIEC' : 'DANG_LAM_VIEC'),
            driverCode: roleCategory === 'DRIVER' ? u.code || `TX-${u.id}` : undefined,
            licenseClass: u.licenseClass || (roleCategory === 'DRIVER' ? 'C' : undefined),
          };
        });

        // Ensure key accounts pinned at top
        const priority = ['admin', 'quanly.kounmom', 'minh.nv', 'tx.kounmom', 'tx.snoul', 'tx.namlao'];
        mapped.sort((a, b) => {
          const idxA = priority.indexOf(a.username);
          const idxB = priority.indexOf(b.username);
          if (idxA !== -1 && idxB !== -1) return idxA - idxB;
          if (idxA !== -1) return -1;
          if (idxB !== -1) return 1;
          return 0;
        });

        setUsersList(mapped);
      } else {
        setUsersList(DEFAULT_USERS_DATA);
      }
    } catch (err) {
      setUsersList(DEFAULT_USERS_DATA);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchUsers();
    // Live Presence Polling: Auto-refresh online/offline status from backend every 15s
    const pollTimer = setInterval(() => {
      void fetchUsers();
    }, 15000);
    return () => clearInterval(pollTimer);
  }, []);

  // Toggle user active status
  const handleToggleActive = async (user: SystemUserRecord, e: React.MouseEvent) => {
    e.stopPropagation();
    const nextActive = !user.isActive;

    // Optimistic update
    setUsersList((prev) =>
      prev.map((u) =>
        u.id === user.id
          ? {
              ...u,
              isActive: nextActive,
              isOnline: nextActive ? u.isOnline : false, // Inactive users become offline
              employmentStatus: nextActive ? 'DANG_LAM_VIEC' : 'DA_NGHI_VIEC',
            }
          : u
      )
    );

    if (user.rawId) {
      try {
        await apiClient.patch(`/users/${user.rawId}`, {
          isActive: nextActive,
          employmentStatus: nextActive ? 'DANG_LAM_VIEC' : 'DA_NGHI_VIEC',
        });
      } catch (err) {
        // Rollback on error
        void fetchUsers();
      }
    }
  };

  // Filtered List
  const filteredUsers = useMemo(() => {
    return usersList.filter((user) => {
      // Role filter
      if (selectedRoleFilter !== 'ALL' && user.roleCategory !== selectedRoleFilter) {
        return false;
      }

      // Status filter
      if (selectedStatusFilter === 'ONLINE' && !user.isOnline) return false;
      if (selectedStatusFilter === 'ACTIVE' && !user.isActive) return false;
      if (selectedStatusFilter === 'INACTIVE' && user.isActive) return false;

      // KLH filter
      if (selectedKlhFilter === 'KM' && user.klhName !== 'KLH Koun Mom' && user.klhName !== 'Toàn bộ 3 Khu Liên Hợp') return false;
      if (selectedKlhFilter === 'SN' && user.klhName !== 'KLH Snoul' && user.klhName !== 'Toàn bộ 3 Khu Liên Hợp') return false;
      if (selectedKlhFilter === 'NL' && user.klhName !== 'KLH Nam Lào' && user.klhName !== 'Toàn bộ 3 Khu Liên Hợp') return false;

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        return (
          user.username.toLowerCase().includes(query) ||
          user.fullName.toLowerCase().includes(query) ||
          user.employeeCode.toLowerCase().includes(query) ||
          user.phone.toLowerCase().includes(query) ||
          user.workUnit.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [usersList, selectedRoleFilter, selectedStatusFilter, selectedKlhFilter, searchQuery]);

  // Counts
  const totalCount = usersList.length;
  const onlineCount = usersList.filter((u) => u.isOnline).length;
  const activeCount = usersList.filter((u) => u.isActive).length;
  const inactiveCount = usersList.filter((u) => !u.isActive).length;

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.username || !newUser.fullName) return;

    const roleMap: Record<string, string> = {
      ADMIN: 'SUPER_ADMIN',
      MANAGER: 'FARM_MANAGER',
      DRIVER: 'DRIVER',
    };

    try {
      await apiClient.post('/users', {
        username: newUser.username,
        fullName: newUser.fullName,
        phone: newUser.phone,
        password: newUser.password,
        role: roleMap[newUser.roleCategory],
        unit: 'TOAN_KLH',
        isActive: true,
      });
    } catch (err) {
      // Proceed with optimistic update
    }

    const assignedKlh = newUser.roleCategory === 'ADMIN' ? 'Toàn bộ 3 Khu Liên Hợp' : (newUser.klh as any);

    const createdRecord: SystemUserRecord = {
      id: `USR-${Date.now().toString().slice(-4)}`,
      username: newUser.username,
      employeeCode: `ACC-${newUser.roleCategory[0]}-${Date.now().toString().slice(-4)}`,
      fullName: newUser.fullName,
      phone: newUser.phone || '090x xxx xxx',
      enterpriseEmail: `${newUser.username}@thacoagri.com.vn`,
      roleCategory: newUser.roleCategory,
      rawRole: roleMap[newUser.roleCategory],
      roleName:
        newUser.roleCategory === 'ADMIN'
          ? 'Quản trị viên (Admin)'
          : newUser.roleCategory === 'MANAGER'
          ? `Nhân sự quản lý (${assignedKlh})`
          : `Tài xế (${assignedKlh})`,
      workUnit: assignedKlh,
      klhName: assignedKlh,
      lastLogin: 'Chưa đăng nhập',
      isActive: true,
      isOnline: false,
      employmentStatus: 'DANG_LAM_VIEC',
      licenseClass: newUser.roleCategory === 'DRIVER' ? newUser.licenseClass : undefined,
    };

    setUsersList([createdRecord, ...usersList]);
    setShowAddModal(false);
    setNewUser({
      username: '',
      fullName: '',
      phone: '',
      roleCategory: 'DRIVER',
      klh: 'KLH Koun Mom',
      workUnit: 'KLH Koun Mom',
      password: '123',
      licenseClass: 'C',
    });
  };

  const columns: Column<SystemUserRecord>[] = [
    {
      key: 'username',
      title: 'TÀI KHOẢN / MÃ NV',
      sortable: true,
      render: (row) => (
        <div>
          <span className="font-semibold text-slate-900 block text-xs font-mono">{row.username}</span>
          <span className="text-[11px] text-slate-500 font-mono">{row.employeeCode}</span>
        </div>
      ),
    },
    {
      key: 'fullName',
      title: 'HỌ VÀ TÊN',
      sortable: true,
      render: (row) => (
        <div>
          <span className="text-slate-900 font-semibold block text-xs">{row.fullName}</span>
          {row.driverCode && (
            <span className="text-[11px] text-slate-500 block">
              GPLX: {row.licenseClass || 'C'} ({row.driverCode})
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'roleCategory',
      title: 'VAI TRÒ',
      sortable: true,
      render: (row) => {
        const roleLabel =
          row.roleCategory === 'ADMIN'
            ? 'Quản trị viên (Admin)'
            : row.roleCategory === 'MANAGER'
            ? 'Nhân sự quản lý'
            : 'Tài xế cơ giới';
        return <span className="text-xs text-slate-800 font-medium">{roleLabel}</span>;
      },
    },
    {
      key: 'klhName',
      title: 'KHU LIÊN HỢP PHỤ TRÁCH',
      sortable: true,
      render: (row) => <span className="text-xs text-slate-800 font-medium">{row.klhName}</span>,
    },
    {
      key: 'phone',
      title: 'LIÊN HỆ',
      render: (row) => (
        <div>
          <span className="text-xs font-mono text-slate-800 block">{row.phone}</span>
          <span className="text-[11px] text-slate-500">{row.enterpriseEmail}</span>
        </div>
      ),
    },
    {
      key: 'lastLogin',
      title: 'ĐĂNG NHẬP GẦN NHẤT',
      sortable: true,
      render: (row) => <span className="text-xs text-slate-700">{row.lastLogin}</span>,
    },
    {
      key: 'isOnline',
      title: 'Kết nối (Online)',
      sortable: true,
      render: (row) => {
        if (!row.isActive) {
          return <span className="text-xs text-slate-400">Offline</span>;
        }
        return row.isOnline ? (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
            Online
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
            <span className="w-2 h-2 rounded-full bg-slate-300 inline-block" />
            Offline
          </span>
        );
      },
    },
    {
      key: 'isActive',
      title: 'Trạng thái',
      sortable: true,
      align: 'center',
      width: '110px',
      render: (row) => (
        <span
          className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
            row.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
          }`}
        >
          {row.isActive ? 'Hoạt động' : 'Ngưng'}
        </span>
      ),
    },
    {
      key: 'user',
      title: 'User',
      align: 'center',
      width: '70px',
      render: (row) => (
        <AuditUserPopover
          createdDate="14-03-2026"
          createdUser="admin"
          updatedDate="01-08-2026"
          updatedUser="admin"
          title={`Xem thông tin tạo/sửa của ${row.fullName}`}
        />
      ),
    },
    {
      key: 'actions',
      title: 'Tác vụ',
      align: 'center',
      width: '110px',
      render: (row) => (
        <TableRowActions
          onView={() => setSelectedUser(row)}
          onEdit={() => setSelectedUser(row)}
          onDelete={
            row.username === 'admin'
              ? undefined
              : async () => {
                  if (window.confirm(`Bạn có chắc chắn muốn ngưng hoạt động tài khoản "${row.fullName}"?`)) {
                    try {
                      if (row.rawId) {
                        await apiClient.patch(`/users/${row.rawId}`, {
                          isActive: false,
                          employmentStatus: 'DA_NGHI_VIEC',
                        });
                      }
                      setUsersList((prev) =>
                        prev.map((u) => (u.id === row.id ? { ...u, isActive: false, isOnline: false } : u))
                      );
                    } catch (e) {
                      alert('Không thể ngưng hoạt động tài khoản này.');
                    }
                  }
                }
          }
          viewTitle="Xem chi tiết tài khoản"
          editTitle="Sửa tài khoản"
          deleteTitle="Ngưng hoạt động"
        />
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 font-heading">
            Quản Lý Người Dùng & Trạng Thái Hoạt Động
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Quản lý tài khoản, trạng thái <b>Còn hoạt động / Ngưng hoạt động</b> và đánh giá thực tế kết nối <b>Online / Offline</b> theo hồ sơ nhân sự 3 Khu Liên Hợp.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            size="sm"
            onClick={() => setShowAddModal(true)}
            icon={<Plus className="w-4 h-4" />}
          >
            Thêm Tài Khoản
          </Button>
        </div>
      </div>

      {/* Info Callout */}
      <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-3.5 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs text-amber-900">
        <div className="flex items-center gap-2.5 min-w-0">
          <Smartphone className="w-4 h-4 text-amber-600 shrink-0" />
          <div className="leading-relaxed">
            <span className="font-bold mr-1">Chính sách tài khoản & trạng thái làm việc:</span>
            Khi lái xe/nhân viên chuyển trạng thái sang <b>"Đã nghỉ việc"</b>, tài khoản hệ thống sẽ tự động chuyển thành <b>"Ngưng hoạt động"</b> và bị chặn đăng nhập.
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
            Còn hoạt động: Được phép đăng nhập
          </span>
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
            Ngưng hoạt động: Khóa truy cập
          </span>
        </div>
      </div>

      {/* 4 Stats Cards */}
      <KPIGrid cols={4}>
        <StatCard
          label="Tổng tài khoản"
          value={`${totalCount} tài khoản`}
          subValue="Đã cấp phát trên hệ thống"
          icon={<Users className="w-5 h-5" />}
          iconBgColor="bg-slate-100"
          iconColor="text-slate-700"
        />
        <StatCard
          label="Đang Online"
          value={`${onlineCount} tài khoản`}
          subValue="Đang kết nối thực tế"
          icon={<Wifi className="w-5 h-5" />}
          iconBgColor="bg-emerald-50"
          iconColor="text-emerald-600"
        />
        <StatCard
          label="Còn hoạt động"
          value={`${activeCount} tài khoản`}
          subValue="Đang làm việc / Cho phép login"
          icon={<CheckCircle2 className="w-5 h-5" />}
          iconBgColor="bg-teal-50"
          iconColor="text-teal-700"
        />
        <StatCard
          label="Ngưng hoạt động"
          value={`${inactiveCount} tài khoản`}
          subValue="Đã nghỉ việc hoặc bị khóa"
          icon={<UserX className="w-5 h-5" />}
          iconBgColor="bg-rose-50"
          iconColor="text-rose-600"
        />
      </KPIGrid>

      {/* Actionable Filter Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-3 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* 3 Core Roles Switcher */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-500 uppercase mr-1">Nhóm quyền:</span>
            <button
              type="button"
              onClick={() => setSelectedRoleFilter('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedRoleFilter === 'ALL'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Tất cả ({usersList.length})
            </button>
            <button
              type="button"
              onClick={() => setSelectedRoleFilter('ADMIN')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                selectedRoleFilter === 'ADMIN'
                  ? 'bg-purple-700 text-white shadow-xs'
                  : 'bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              Admin
            </button>
            <button
              type="button"
              onClick={() => setSelectedRoleFilter('MANAGER')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                selectedRoleFilter === 'MANAGER'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              Quản lý
            </button>
            <button
              type="button"
              onClick={() => setSelectedRoleFilter('DRIVER')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                selectedRoleFilter === 'DRIVER'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
              }`}
            >
              <Truck className="w-3.5 h-3.5" />
              Tài xế
            </button>
          </div>

          {/* Status & KLH Dropdown Filter */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-slate-500 uppercase">Trạng thái:</span>
              <select
                value={selectedStatusFilter}
                onChange={(e) => setSelectedStatusFilter(e.target.value as any)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-700 focus:outline-none focus:border-primary"
              >
                <option value="ALL">Tất cả trạng thái</option>
                <option value="ONLINE">🟢 Đang Online ({onlineCount})</option>
                <option value="ACTIVE">✅ Còn hoạt động ({activeCount})</option>
                <option value="INACTIVE">⛔ Ngưng hoạt động ({inactiveCount})</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-slate-500 uppercase">Khu liên hợp:</span>
              <select
                value={selectedKlhFilter}
                onChange={(e) => setSelectedKlhFilter(e.target.value as any)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-700 focus:outline-none focus:border-primary"
              >
                <option value="ALL">Toàn bộ 3 Khu Liên Hợp</option>
                <option value="KM">KLH Koun Mom (Campuchia)</option>
                <option value="SN">KLH Snoul (Campuchia)</option>
                <option value="NL">KLH Nam Lào (Lào)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm kiếm theo tên tài khoản, họ tên, mã nhân sự, số điện thoại..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:bg-white focus:outline-none focus:border-primary transition-all"
          />
        </div>
      </div>

      {/* DataTable */}
      <DataTable
        title="Danh Sách Tài Khoản Người Dùng & Trạng Thái Hoạt Động"
        subtitle={`Hiển thị ${filteredUsers.length} / ${usersList.length} tài khoản · Cập nhật tự động từ hồ sơ nhân sự`}
        columns={columns}
        data={filteredUsers}
        isLoading={loading}
        showSearch={false}
        useGlobalFilters={false}
        onRowClick={(row) => setSelectedUser(row)}
      />

      {/* Detail Modal */}
      {selectedUser && (
        <Modal
          isOpen={!!selectedUser}
          onClose={() => setSelectedUser(null)}
          title={`Chi Tiết Tài Khoản: ${selectedUser.fullName}`}
          subtitle={`Username: ${selectedUser.username} · Mã NV: ${selectedUser.employeeCode}`}
          size="md"
        >
          <div className="space-y-3.5 text-xs text-slate-700">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2.5">
              <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                <span className="font-semibold text-slate-500">Trạng thái hoạt động:</span>
                <div className="flex items-center gap-2">
                  {selectedUser.isActive ? (
                    <span className="font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-200">
                      Còn hoạt động
                    </span>
                  ) : (
                    <span className="font-bold text-rose-800 bg-rose-100 px-2.5 py-0.5 rounded-full border border-rose-200">
                      Ngưng hoạt động
                    </span>
                  )}
                </div>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                <span className="font-semibold text-slate-500">Trạng thái kết nối:</span>
                <span className="font-bold text-slate-800">
                  {selectedUser.isOnline ? '🟢 Đang Online' : '⚪ Offline'}
                </span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                <span className="font-semibold text-slate-500">Vai trò chính:</span>
                <span className="font-bold text-slate-800">
                  {selectedUser.roleName}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold text-slate-500">Khu Liên Hợp phụ trách:</span>
                <b className="text-slate-900">{selectedUser.klhName}</b>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold text-slate-500">Số điện thoại:</span>
                <span className="font-mono text-slate-900">{selectedUser.phone}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold text-slate-500">Email doanh nghiệp:</span>
                <span className="font-mono text-primary">{selectedUser.enterpriseEmail}</span>
              </div>
              {selectedUser.driverCode && (
                <div className="flex justify-between pt-1 border-t border-slate-200">
                  <span className="font-semibold text-emerald-700">Hồ sơ lái xe liên kết:</span>
                  <b className="font-mono text-emerald-800">
                    Mã {selectedUser.driverCode} - GPLX Hạng {selectedUser.licenseClass}
                  </b>
                </div>
              )}
              <div className="flex justify-between">
                <span className="font-semibold text-slate-500">Lần đăng nhập cuối:</span>
                <span className="font-mono text-slate-600">{selectedUser.lastLogin}</span>
              </div>
            </div>

            <div className="flex justify-between items-center pt-2">
              <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                <Lock className="w-3.5 h-3.5 text-slate-400" />
                Mật khẩu mặc định: <code className="bg-slate-100 px-1 py-0.5 rounded font-mono font-bold">123456</code>
              </div>
              <Button variant="primary" size="sm" onClick={() => setSelectedUser(null)}>
                Đóng
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Add Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Thêm Tài Khoản Mới"
        subtitle="Cấp tài khoản cho 1 trong 3 nhóm vai trò hoặc liên kết hồ sơ lái xe"
        size="md"
      >
        <form onSubmit={handleCreateUser} className="space-y-3.5 text-xs">
          {/* Role selector: 3 Main Roles */}
          <div>
            <label className="font-bold text-slate-700 block mb-1.5">
              1. Chọn 1 trong 3 Nhóm quyền chính: <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              <label
                className={`p-2.5 rounded-xl border cursor-pointer text-center transition-all flex flex-col items-center gap-1 ${
                  newUser.roleCategory === 'ADMIN'
                    ? 'border-purple-600 bg-purple-50 text-purple-900 font-bold shadow-xs'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <input
                  type="radio"
                  name="roleCategory"
                  className="hidden"
                  checked={newUser.roleCategory === 'ADMIN'}
                  onChange={() => setNewUser({ ...newUser, roleCategory: 'ADMIN', klh: 'KLH Koun Mom' })}
                />
                <Shield className="w-4 h-4 text-purple-600" />
                <span>Quản trị viên</span>
              </label>

              <label
                className={`p-2.5 rounded-xl border cursor-pointer text-center transition-all flex flex-col items-center gap-1 ${
                  newUser.roleCategory === 'MANAGER'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-900 font-bold shadow-xs'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <input
                  type="radio"
                  name="roleCategory"
                  className="hidden"
                  checked={newUser.roleCategory === 'MANAGER'}
                  onChange={() => setNewUser({ ...newUser, roleCategory: 'MANAGER' })}
                />
                <UserCheck className="w-4 h-4 text-emerald-600" />
                <span>Nhân sự quản lý</span>
              </label>

              <label
                className={`p-2.5 rounded-xl border cursor-pointer text-center transition-all flex flex-col items-center gap-1 ${
                  newUser.roleCategory === 'DRIVER'
                    ? 'border-amber-600 bg-amber-50 text-amber-900 font-bold shadow-xs'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <input
                  type="radio"
                  name="roleCategory"
                  className="hidden"
                  checked={newUser.roleCategory === 'DRIVER'}
                  onChange={() => setNewUser({ ...newUser, roleCategory: 'DRIVER' })}
                />
                <Truck className="w-4 h-4 text-amber-600" />
                <span>Tài xế cơ giới</span>
              </label>
            </div>
          </div>

          {/* KLH selection */}
          <div>
            <label className="font-bold text-slate-700 block mb-1">
              2. Khu liên hợp phụ trách: <span className="text-rose-500">*</span>
            </label>
            <select
              value={newUser.klh}
              onChange={(e) => setNewUser({ ...newUser, klh: e.target.value as any })}
              disabled={newUser.roleCategory === 'ADMIN'}
              className="w-full p-2 border border-slate-200 rounded-xl bg-slate-50 font-bold text-slate-800 disabled:opacity-50"
            >
              <option value="KLH Koun Mom">KLH Koun Mom (Tỉnh Ratanakiri, Campuchia)</option>
              <option value="KLH Snoul">KLH Snoul (Tỉnh Kratie, Campuchia)</option>
              <option value="KLH Nam Lào">KLH Nam Lào (Tỉnh Attapeu, Lào)</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Tên đăng nhập (Username): <span className="text-rose-500">*</span></label>
              <input
                type="text"
                required
                placeholder="Ví dụ: tx.kounmom02"
                value={newUser.username}
                onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                className="w-full p-2 border border-slate-200 rounded-xl bg-slate-50 font-mono font-bold"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Họ và tên nhân sự / tài xế: <span className="text-rose-500">*</span></label>
              <input
                type="text"
                required
                placeholder="Ví dụ: Nguyễn Văn Hùng"
                value={newUser.fullName}
                onChange={(e) => setNewUser({ ...newUser, fullName: e.target.value })}
                className="w-full p-2 border border-slate-200 rounded-xl bg-slate-50 font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Số điện thoại liên hệ:</label>
              <input
                type="text"
                placeholder="09xx xxx xxx"
                value={newUser.phone}
                onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                className="w-full p-2 border border-slate-200 rounded-xl bg-slate-50 font-mono"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Mật khẩu khởi tạo:</label>
              <input
                type="text"
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                className="w-full p-2 border border-slate-200 rounded-xl bg-slate-50 font-mono font-bold"
              />
            </div>
          </div>

          {newUser.roleCategory === 'DRIVER' && (
            <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 space-y-2">
              <div>
                <label className="font-bold text-amber-900 block mb-1">Hạng Giấy Phép Lái Xe (GPLX):</label>
                <select
                  value={newUser.licenseClass}
                  onChange={(e) => setNewUser({ ...newUser, licenseClass: e.target.value })}
                  className="w-full p-2 border border-amber-300 rounded-xl bg-white font-bold text-xs"
                >
                  <option value="B2">Hạng B2 (Xe con & xe tải dưới 3.5T)</option>
                  <option value="C">Hạng C (Xe tải trên 3.5T, máy kéo nông nghiệp)</option>
                  <option value="D">Hạng D (Xe chở người)</option>
                  <option value="FC">Hạng FC (Đầu kéo Container / Rơ-mooc)</option>
                </select>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-amber-800 font-medium">
                <Smartphone className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>Tài khoản này chỉ có quyền đăng nhập trên <b>App Mobile Lái xe</b> (chặn vào Web).</span>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button variant="outline" size="sm" type="button" onClick={() => setShowAddModal(false)}>
              Hủy
            </Button>
            <Button variant="primary" size="sm" type="submit">
              Tạo Tài Khoản
            </Button>
          </div>
        </form>
      </Modal>

      {selectedUser && (
        <Modal
          isOpen={!!selectedUser}
          onClose={() => setSelectedUser(null)}
          title={`Chi tiết tài khoản: ${selectedUser.fullName}`}
          size="md"
        >
          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <span className="text-slate-500 block">Tên đăng nhập:</span>
                <span className="font-mono font-bold text-slate-800 text-sm">{selectedUser.username}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Mã nhân viên:</span>
                <span className="font-mono font-bold text-slate-800 text-sm">{selectedUser.employeeCode}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Họ và tên:</span>
                <span className="font-bold text-slate-800">{selectedUser.fullName}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Vai trò:</span>
                <span className="font-semibold text-primary">{selectedUser.roleName}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Số điện thoại:</span>
                <span className="font-mono text-slate-800">{selectedUser.phone}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Khu liên hợp:</span>
                <span className="font-semibold text-slate-800">{selectedUser.klhName}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Trạng thái:</span>
                <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold ${selectedUser.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                  {selectedUser.isActive ? 'Hoạt động' : 'Ngưng hoạt động'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Đăng nhập gần nhất:</span>
                <span className="text-slate-700">{selectedUser.lastLogin}</span>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button variant="outline" size="sm" onClick={() => setSelectedUser(null)}>
                Đóng lại
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
