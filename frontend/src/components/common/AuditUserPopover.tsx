import React, { useState, useRef, useEffect } from 'react';
import { ExternalLink } from 'lucide-react';

export interface AuditUserPopoverProps {
  createdDate?: string | Date | null;
  createdUser?: string | null;
  updatedDate?: string | Date | null;
  updatedUser?: string | null;
  title?: string;
  align?: 'left' | 'right';
  className?: string;
}

function formatDateString(val?: string | Date | null, fallback: string = '14-03-2026'): string {
  if (!val) return fallback;
  if (val instanceof Date) {
    return val.toISOString().slice(0, 10);
  }
  const str = String(val).trim();
  if (!str) return fallback;
  if (str.includes('T')) {
    return str.split('T')[0];
  }
  return str;
}

export const AuditUserPopover: React.FC<AuditUserPopoverProps> = ({
  createdDate,
  createdUser,
  updatedDate,
  updatedUser,
  title = 'Xem thông tin tạo/sửa',
  align = 'right',
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const displayCreatedDate = formatDateString(createdDate, '14-03-2026');
  const displayCreatedUser = createdUser || 'admin';
  const displayUpdatedDate = formatDateString(updatedDate, '01-08-2026');
  const displayUpdatedUser = updatedUser || 'admin';

  return (
    <div
      ref={containerRef}
      className={`relative inline-flex items-center justify-center ${className}`}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        title={title}
        className={`inline-flex items-center justify-center p-1 rounded transition-colors cursor-pointer ${
          isOpen
            ? 'border border-slate-800 bg-slate-100 text-slate-900 shadow-xs'
            : 'text-slate-600 hover:text-blue-600'
        }`}
      >
        <ExternalLink className="w-4 h-4" />
      </button>

      {isOpen && (
        <div
          className={`absolute top-8 ${
            align === 'left' ? 'left-0' : 'right-0'
          } z-50 w-[440px] bg-white rounded border border-slate-300 shadow-xl p-3 text-left animate-in fade-in zoom-in-95 duration-150 font-sans`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="grid grid-cols-4 gap-2 mb-2 text-xs">
            <div>
              <div className="text-center font-semibold text-slate-700 mb-1">Ngày tạo</div>
              <input
                type="text"
                readOnly
                value={displayCreatedDate}
                className="w-full border border-slate-300 rounded px-2 py-1 text-center bg-white text-slate-700 text-xs font-mono select-all"
              />
            </div>
            <div>
              <div className="text-center font-semibold text-slate-700 mb-1">Người tạo</div>
              <input
                type="text"
                readOnly
                value={displayCreatedUser}
                className="w-full border border-slate-300 rounded px-2 py-1 text-center bg-white text-slate-700 text-xs font-bold select-all"
              />
            </div>
            <div>
              <div className="text-center font-semibold text-slate-700 mb-1">Ngày sửa</div>
              <input
                type="text"
                readOnly
                value={displayUpdatedDate}
                className="w-full border border-slate-300 rounded px-2 py-1 text-center bg-white text-slate-700 text-xs font-mono select-all"
              />
            </div>
            <div>
              <div className="text-center font-semibold text-slate-700 mb-1">Người sửa</div>
              <input
                type="text"
                readOnly
                value={displayUpdatedUser}
                className="w-full border border-slate-300 rounded px-2 py-1 text-center bg-white text-slate-700 text-xs font-bold select-all"
              />
            </div>
          </div>

          <div className="text-right pt-1 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-xs text-slate-800 hover:text-red-600 font-semibold cursor-pointer"
            >
              [ Đóng lại ]
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
