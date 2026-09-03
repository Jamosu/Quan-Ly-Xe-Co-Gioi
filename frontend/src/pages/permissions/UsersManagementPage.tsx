import React, { useState, useEffect } from 'react';
import { FilterBar } from '../../components/filters/FilterBar';
import { DataTable, Column } from '../../components/data-display/DataTable';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { StatCard } from '../../components/data-display/StatCard';
import { KPIGrid } from '../../components/data-display/KPIGrid';
import { apiClient } from '../../api/client';
import {
  Users,
  Plus,
  Download,
  ShieldCheck,
  KeyRound,
  Lock,
} from 'lucide-react';

interface SystemUserRecord {
  id: string;
  username: string;
  employeeCode: string;
  fullName: string;
  jobTitle: string;
  enterpriseEmail: string;
  accessRole: string;
  workUnit: string;
  lastLogin: string;
  ipAddress: string;
  status: 'online' | 'offline';
}

export const UsersManagementPage: React.FC = () => {
  const [selectedUser, setSelectedUser] = useState<SystemUserRecord | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [usersList, setUsersList] = useState<SystemUserRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      try {
        const res = await apiClient.get('/users', { params: { limit: 100 } });
        const items = res.data?.data?.items || res.data?.items || res.data || [];
        if (Array.isArray(items) && items.length > 0) {
          setUsersList(
            items.map((u: any) => ({
              id: `USR-${u.id}`,
              username: u.username || u.email?.split('@')[0] || `user_${u.id}`,
              employeeCode: u.employeeCode || `NV-${u.id}`,
              fullName: u.fullName || u.username,
              jobTitle: u.role || 'Nhân viên',
              enterpriseEmail: u.email || `${u.username}@thacoagri.com.vn`,
              accessRole: u.role || 'Nhân viên',
              workUnit: u.unit || 'KLH Koun Mom',
              lastLogin: u.updatedAt ? new Date(u.updatedAt).toLocaleString('vi-VN') : '—',
              ipAddress: '—',
              status: u.isActive !== false ? 'online' : 'offline',
            }))
          );
        } else {
          setUsersList([]);
        }
      } catch (err) {
        setUsersList([]);
      } finally {
        setLoading(false);
      }
    };
    void fetchUsers();
  }, []);

  const columns: Column<SystemUserRecord>[] = [
    {
      key: 'username',
      title: 'MÃ NV / USERNAME',
      sortable: true,
      render: (row) => (
        <div>
          <strong className="text-primary font-bold block text-xs">{row.username}</strong>
          <span className="text-[10px] text-slate-500 font-mono">{row.employeeCode}</span>
        </div>
      ),
    },
    {
      key: 'fullName',
      title: 'HỌ VÀ TÊN',
      sortable: true,
      render: (row) => (
        <div>
          <strong className="text-slate-900 block text-xs">{row.fullName}</strong>
          <span className="text-[10px] text-slate-500">{row.jobTitle}</span>
        </div>
      ),
    },
    { key: 'enterpriseEmail', title: 'EMAIL DOANH NGHIỆP', render: (row) => <span className="text-xs text-slate-700 font-mono">{row.enterpriseEmail}</span> },
    {
      key: 'accessRole',
      title: 'VAI TRÒ TRUY CẬP',
      render: (row) => (
        <span className={`text-xs font-bold ${row.accessRole.includes('Admin') ? 'text-emerald-700' : 'text-slate-800'}`}>
          {row.accessRole}
        </span>
      ),
    },
    { key: 'workUnit', title: 'ĐƠN VỊ CÔNG TÁC', render: (row) => <span className="text-xs text-slate-700">{row.workUnit}</span> },
    { key: 'lastLogin', title: 'ĐĂNG NHẬP CUỐI', sortable: true, render: (row) => <span className="text-xs text-slate-600 font-mono">{row.lastLogin}</span> },
    { key: 'ipAddress', title: 'IP TRUY CẬP', render: (row) => <span className="text-xs font-mono text-slate-500">{row.ipAddress}</span> },
    {
      key: 'status',
      title: 'TRẠNG THÁI',
      render: (row) => row.status === 'online' ? (
        <Badge variant="green" dot>Online</Badge>
      ) : (
        <Badge variant="gray">Offline</Badge>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 font-heading">
            Quản lý Người dùng & Tài khoản SSO
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Quản lý danh sách tài khoản cán bộ, quản đốc, điều độ viên; hỗ trợ tích hợp SSO/LDAP THACO AGRI.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="md" icon={<Download className="w-4 h-4" />}>
            Xuất danh sách
          </Button>
          <Button variant="primary" size="md" icon={<Plus className="w-4 h-4" />} onClick={() => setShowAddModal(true)}>
            Thêm người dùng mới
          </Button>
        </div>
      </div>

      {/* Global FilterBar */}
      <FilterBar
        extraFilters={
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Tất cả 45 tài khoản · Đơn vị: KLH Koun Mom</span>
          </div>
        }
      />

      {/* 4 Stats Cards matching Mockup */}
      <KPIGrid cols={4}>
        <StatCard
          label="Tổng tài khoản hệ thống"
          value={`${usersList.length} tài khoản`}
          subValue="Xác thực hệ thống"
          icon={<Users className="w-5 h-5" />}
          iconBgColor="bg-emerald-50"
          iconColor="text-primary"
        />
        <StatCard
          label="Đang hoạt động"
          value={`${usersList.filter((u) => u.status === 'online').length} tài khoản`}
          subValue="Đang kích hoạt"
          icon={<ShieldCheck className="w-5 h-5" />}
          iconBgColor="bg-sky-50"
          iconColor="text-sky-600"
        />
        <StatCard
          label="Tài khoản quản trị"
          value={`${usersList.filter((u) => u.accessRole.toLowerCase().includes('admin') || u.accessRole.toLowerCase().includes('quản')).length} tài khoản`}
          subValue="Quyền quản trị / điều hành"
          icon={<KeyRound className="w-5 h-5" />}
          iconBgColor="bg-amber-50"
          iconColor="text-amber-600"
        />
        <StatCard
          label="Bảo mật tài khoản"
          value="JWT / RBAC"
          subValue="Phân quyền theo vai trò"
          icon={<Lock className="w-5 h-5" />}
          iconBgColor="bg-emerald-50"
          iconColor="text-emerald-700"
        />
      </KPIGrid>

      {/* DataTable */}
      <DataTable
        title="Danh Sách Tài Khoản Người Dùng & Phân Quyền Truy Cập Hệ Thống"
        subtitle="Đồng bộ tự động từ thư mục người dùng tập trung Active Directory / LDAP THACO Group"
        columns={columns}
        data={usersList}
        isLoading={loading}
        onRowClick={(row) => setSelectedUser(row)}
      />

      {/* Detail Modal */}
      {selectedUser && (
        <Modal
          isOpen={!!selectedUser}
          onClose={() => setSelectedUser(null)}
          title={`Người Dùng: ${selectedUser.fullName}`}
          subtitle={`Username: ${selectedUser.username} | ${selectedUser.employeeCode}`}
          size="md"
        >
          <div className="space-y-3.5 text-xs text-slate-700">
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
              <div className="flex justify-between"><span>Email:</span> <b className="font-mono text-primary">{selectedUser.enterpriseEmail}</b></div>
              <div className="flex justify-between"><span>Vai trò truy cập:</span> <strong className="text-emerald-700">{selectedUser.accessRole}</strong></div>
              <div className="flex justify-between"><span>Đơn vị công tác:</span> <span>{selectedUser.workUnit}</span></div>
              <div className="flex justify-between"><span>Đăng nhập cuối:</span> <span className="font-mono">{selectedUser.lastLogin} (IP: {selectedUser.ipAddress})</span></div>
            </div>
            <div className="flex justify-end pt-2">
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
        title="Thêm Người Dùng / Cán Bộ Mới"
        subtitle="Cấp phát tài khoản đăng nhập hệ thống quản lý xe cơ giới"
        size="md"
      >
        <div className="space-y-3 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Mã nhân sự (ERP):</label>
              <input type="text" placeholder="Ví dụ: NV-0985" className="w-full p-2 border border-slate-200 rounded-xl bg-slate-50 font-bold" />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Họ và tên cán bộ:</label>
              <input type="text" placeholder="Ví dụ: Nguyễn Văn Hùng" className="w-full p-2 border border-slate-200 rounded-xl bg-slate-50 font-bold" />
            </div>
          </div>
          <div>
            <label className="font-bold text-slate-700 block mb-1">Email doanh nghiệp:</label>
            <input type="email" placeholder="hung.nguyenvan@thacoagri.com.vn" className="w-full p-2 border border-slate-200 rounded-xl bg-slate-50 font-mono" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Vai trò truy cập:</label>
              <select className="w-full p-2 border border-slate-200 rounded-xl bg-slate-50">
                <option>Quản đốc Nông trường</option>
                <option>Điều phối viên Vận tải</option>
                <option>Thủ kho Nhiên liệu</option>
                <option>Trưởng xưởng BTSC</option>
                <option>Ban Giám Đốc KLH</option>
              </select>
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Đơn vị công tác:</label>
              <select className="w-full p-2 border border-slate-200 rounded-xl bg-slate-50">
                <option>Xí nghiệp Chuối 1</option>
                <option>Xí nghiệp Chuối 2</option>
                <option>Xí nghiệp Cây ăn trái</option>
                <option>Xưởng BTSC Trung tâm</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-3">
            <Button variant="outline" size="sm" onClick={() => setShowAddModal(false)}>Hủy</Button>
            <Button variant="primary" size="sm" onClick={() => setShowAddModal(false)}>Tạo Tài Khoản</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
