import React from 'react';
import { useLocation, NavLink } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

const PATH_NAMES: Record<string, string> = {
  dashboard: 'Dashboard Vận hành',
  gps: 'Giám sát GPS trực tuyến',
  realtime: 'Bản đồ GPS realtime',
  playback: 'Playback hành trình',
  geofence: 'Vùng giám sát (Geofence)',
  'speed-alert': 'Cảnh báo tốc độ & Vùng',
  'offline-logs': 'Nhật ký mất sóng offline',
  'doi-xe': 'Quản lý đội xe',
  'ho-so-xe': 'Xe cơ giới',
  'thiet-bi': 'Thiết bị & nông cụ',
  'phan-xe': 'Phân bổ xe đơn vị',
  'gps-cam-bien': 'Thiết bị GPS & Cảm biến',
  'lich-su': 'Lịch sử biến động xe',
  'lenh-dieu-xe': 'Lệnh điều xe & Vận hành',
  'ke-hoach': 'Kế hoạch sản xuất',
  'danh-sach': 'Lệnh điều xe',
  'van-chuyen': 'Lệnh vận chuyển nội bộ',
  'phieu-can': 'Xác nhận khối lượng & Cân',
  'lai-xe': 'Quản lý lái xe & KPI',
  'ho-so': 'Hồ sơ lái xe & Thợ máy',
  'phan-cong': 'Phân công lái xe theo ca',
  'quan-ly-gplx': 'Quản lý GPLX & Hạn SK',
  'vi-pham': 'Lịch sử vi phạm',
  kpi: 'Bảng xếp hạng KPI thi đua',
  'xuong-btsc': 'Xưởng BTSC',
  'yeu-cau': 'Tiếp nhận báo hỏng',
  'phieu-sua-chua': 'Phiếu sửa chữa & Vật tư',
  'tien-do': 'Tiến độ sửa chữa (Kanban)',
  'dang-kiem': 'Đăng kiểm & Bảo hiểm',
  'nhien-lieu': 'Quản lý nhiên liệu',
  'phieu-cap': 'Phiếu cấp nhiên liệu',
  'dinh-muc': 'Định mức tiêu hao khoán',
  'doi-chieu': 'Đối chiếu GPS vs Định mức',
  'ton-kho': 'Tồn kho bồn chứa xăng dầu',
  'canh-bao-sut-dau': 'Cảnh báo sụt dầu bất thường',
  'canh-bao': 'Cảnh báo & Thông báo',
  'chua-xu-ly': 'Cảnh báo chưa xử lý (SOS)',
  'cau-hinh': 'Cấu hình ngưỡng an toàn',
  'thong-ke': 'Thống kê tần suất vi phạm',
  'bao-cao': 'Báo cáo hợp nhất',
  'nang-suat': 'Báo cáo năng suất xe',
  'hanh-trinh-vi-pham': 'Báo cáo hành trình & vi phạm',
  'kpi-lai-xe': 'Báo cáo KPI lái xe',
  'chi-phi-btsc': 'Báo cáo chi phí BTSC',
  'so-sanh-klh': 'Báo cáo so sánh giữa các KLH',
  'danh-muc': 'Danh mục hệ thống',
  'don-vi': 'Đơn vị / KLH / Đội xe',
  'chuc-danh': 'Chức danh',
  'loai-xe': 'Chủng loại xe',
  'loai-cong-viec': 'Loại công việc & Loại lệnh',
  'lo-thua-tuyen-duong': 'Lô thửa & Tuyến đường',
  'vat-tu-phu-tung': 'Vật tư & Phụ tùng BTSC',
  'dinh-muc-ky-thuat': 'Định mức kỹ thuật',
  'phan-quyen': 'Phân quyền hệ thống',
  'nguoi-dung': 'Người dùng & Tài khoản',
  'vai-tro': 'Vai trò & Ma trận quyền',
  audit: 'Nhật ký hệ thống (Audit log)',
};

export const Breadcrumb: React.FC = () => {
  const location = useLocation();
  const pathSegments = location.pathname.split('/').filter(Boolean);

  return (
    <nav className="flex items-center gap-1.5 text-xs text-slate-500 mb-4 overflow-x-auto whitespace-nowrap">
      <NavLink to="/dashboard" className="flex items-center gap-1 hover:text-primary transition-colors">
        <Home className="w-3.5 h-3.5" />
        <span>Trang chủ</span>
      </NavLink>

      {pathSegments.map((segment, index) => {
        const path = `/${pathSegments.slice(0, index + 1).join('/')}`;
        const isLast = index === pathSegments.length - 1;
        const name = PATH_NAMES[segment] || segment;

        return (
          <React.Fragment key={path}>
            <ChevronRight className="w-3 h-3 text-slate-400 shrink-0" />
            {isLast ? (
              <span className="font-semibold text-slate-800">{name}</span>
            ) : (
              <NavLink to={path} className="hover:text-primary transition-colors">
                {name}
              </NavLink>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};
