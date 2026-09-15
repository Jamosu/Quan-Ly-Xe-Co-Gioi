import React from 'react';
import { Eye, PenSquare, Trash2 } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

export interface TableRowActionsProps {
  onView?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  viewTitle?: string;
  editTitle?: string;
  deleteTitle?: string;
  disabledView?: boolean;
  disabledEdit?: boolean;
  disabledDelete?: boolean;
  className?: string;
  /** Mặc định true: Chỉ tài khoản Admin mới thấy và thực thi nút Xóa */
  requireAdminToDelete?: boolean;
}

export const TableRowActions: React.FC<TableRowActionsProps> = ({
  onView,
  onEdit,
  onDelete,
  viewTitle = 'Xem chi tiết',
  editTitle = 'Chỉnh sửa',
  deleteTitle = 'Xóa',
  disabledView = false,
  disabledEdit = false,
  disabledDelete = false,
  className = '',
  requireAdminToDelete = true,
}) => {
  const currentUser = useAppStore((state) => state.currentUser);
  const isAdmin = currentUser?.role === 'SUPER_ADMIN' || currentUser?.username === 'admin';
  const canDelete = !requireAdminToDelete || isAdmin;

  return (
    <div
      className={`flex items-center justify-center gap-2 ${className}`}
      onClick={(e) => e.stopPropagation()}
    >
      {onView && (
        <button
          type="button"
          onClick={onView}
          disabled={disabledView}
          title={viewTitle}
          className="p-1 hover:bg-slate-100 text-slate-700 rounded transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <Eye className="w-3.5 h-3.5" />
        </button>
      )}
      {onEdit && (
        <button
          type="button"
          onClick={onEdit}
          disabled={disabledEdit}
          title={editTitle}
          className="p-1 hover:bg-slate-100 text-slate-700 rounded transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <PenSquare className="w-3.5 h-3.5" />
        </button>
      )}
      {onDelete && canDelete && (
        <button
          type="button"
          onClick={onDelete}
          disabled={disabledDelete}
          title={deleteTitle}
          className="p-1 hover:bg-red-50 text-red-600 rounded transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};

export default TableRowActions;
