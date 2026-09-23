# Master Data Table Convention (Quy Chuẩn Cố Định Bảng Danh Mục)

Tất cả các bảng dữ liệu Danh mục Hệ thống (Master Data / Catalogs) trong toàn bộ ứng dụng Fleet Management **BẮT BUỘC** phải tuân thủ thiết kế cố định sau:

---

## 1. Ba cột kết thúc bảng luôn cố định (Strict Ending Columns)

Mọi bảng danh mục khi hiển thị danh sách phải luôn luôn kết thúc bằng **3 cột** theo đúng thứ tự và quy cách sau:

| STT | Tên cột | Align | Width | Component / Renderer | Mô tả hiển thị |
|---|---|---|---|---|---|
| **1** | **TRẠNG THÁI** | `center` | `120px` - `130px` | `renderMasterDataStatusBadge(status)` | Pill badge bo tròn hoàn toàn (`rounded-full px-3 py-1 text-xs font-semibold`) <br/>- Còn hoạt động: `bg-emerald-100 text-emerald-800 border border-emerald-200/80`<br/>- Chờ bổ nhiệm / Chờ duyệt: `bg-amber-100 text-amber-800 border border-amber-200`<br/>- Ngưng hoạt động / Tạm dừng: `bg-slate-100 text-slate-600 border border-slate-200` |
| **2** | **USER** | `center` | `70px` | `<AuditUserPopover />` | Nút icon `ExternalLink` (`w-4 h-4 text-slate-500 hover:text-slate-800`). Khi click mở Popover xem đầy đủ thông tin Audit: **Ngày tạo**, **Người tạo**, **Ngày sửa**, **Người sửa**. |
| **3** | **TÁC VỤ** | `center` | `110px` | `<TableRowActions requireAdminToDelete={false} />` | Cụm 3 icon hành động ngang không đóng khung hộp rườm rà:<br/>1. `Eye` (Xem chi tiết hồ sơ / bản ghi)<br/>2. `PenSquare` / `Edit` (Chỉnh sửa thông tin)<br/>3. `Trash2` màu đỏ (Xóa bản ghi) |

---

## 2. Mã nguồn mẫu chuẩn (Standard Code Pattern)

```tsx
import { TableRowActions } from '../../components/common/TableRowActions';
import { AuditUserPopover } from '../../components/common/AuditUserPopover';

// 1. Helper render Badge trạng thái
const renderMasterDataStatusBadge = (status?: string | boolean) => {
  const isInactive =
    status === 'inactive' ||
    status === 'TAM_DUNG' ||
    status === 'NGUNG_HOAT_DONG' ||
    status === 'ENDED' ||
    status === false;
  const isPending = status === 'PENDING_LINK' || status === 'PLANNED';

  if (isPending) {
    return (
      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
        Chờ bổ nhiệm
      </span>
    );
  }
  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
        isInactive
          ? 'bg-slate-100 text-slate-600 border border-slate-200'
          : 'bg-emerald-100 text-emerald-800 border border-emerald-200/80'
      }`}
    >
      {isInactive ? 'Ngưng hoạt động' : 'Còn hoạt động'}
    </span>
  );
};

// 2. Định nghĩa 3 cột cuối trong Columns array:
const columns: Column<MyItem>[] = [
  // ... các cột dữ liệu nghiệp vụ phía trước ...
  {
    key: 'status',
    title: 'Trạng thái',
    align: 'center',
    width: '130px',
    render: (row) => renderMasterDataStatusBadge(row.status),
  },
  {
    key: 'user',
    title: 'User',
    align: 'center',
    width: '70px',
    render: (row) => (
      <AuditUserPopover
        createdDate={row.createdDate || '14-03-2026'}
        createdUser={row.createdUser || 'admin'}
        updatedDate={row.updatedDate || '01-08-2026'}
        updatedUser={row.username || row.updatedUser || 'admin'}
        title={`Xem thông tin tạo/sửa của ${row.name}`}
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
        onView={() => handleView(row)}
        onEdit={() => handleEdit(row)}
        onDelete={() => handleDelete(row.id)}
        viewTitle="Xem chi tiết"
        editTitle="Sửa thông tin"
        deleteTitle="Xóa bản ghi"
        requireAdminToDelete={false}
      />
    ),
  },
];
```

---

## 3. Quy định về dữ liệu và vai trò Quản lý Cơ giới (`/danh-muc/quan-ly-co-gioi`)

- **Dữ liệu thực tế**: 100% nhân sự thuộc KLH Koun Mom với đầy đủ Họ tên, Số điện thoại/Zalo, username, Xí nghiệp, Cụm địa bàn, Bãi xe/Lô tập kết.
- **Định danh vai trò chính thức**:
  - **Quản lý các Đội trưởng Xe Cơ Giới** (`roleScope: 'Quản lý các Đội trưởng Xe Cơ Giới'`).
  - Nhiệm vụ trọng tâm:
    1. Quản lý, điều hành trực tiếp các Đội trưởng xe cơ giới tại xí nghiệp / khu vực.
    2. Quản lý 100% xe cơ giới, máy nông cụ & trang thiết bị thi công trên địa bàn.
    3. Quản lý, phân công và giám sát toàn bộ đội ngũ tài xế & thợ máy vận hành.
    4. Trực tiếp ký duyệt và lập Lệnh Điều Xe sản xuất nông nghiệp / vận chuyển.
    5. Ký duyệt cấp phát nhiên liệu & theo dõi chu kỳ bảo dưỡng định kỳ 250 giờ.
