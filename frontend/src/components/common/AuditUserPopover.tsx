import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
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
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  const updatePosition = useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const popoverWidth = 440;

    let left = align === 'left' ? rect.left : rect.right - popoverWidth;
    if (left < 8) left = 8;
    if (left + popoverWidth > window.innerWidth - 8) {
      left = Math.max(8, window.innerWidth - popoverWidth - 8);
    }

    let top = rect.bottom + 6;
    if (top + 160 > window.innerHeight && rect.top - 160 > 0) {
      top = rect.top - 160;
    }

    setCoords({ top, left });
  }, [align]);

  const toggleOpen = () => {
    if (!isOpen) {
      updatePosition();
    }
    setIsOpen(!isOpen);
  };

  useEffect(() => {
    if (!isOpen) return;

    updatePosition();

    const handleScrollOrResize = () => {
      updatePosition();
    };

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (buttonRef.current && buttonRef.current.contains(target)) {
        return;
      }
      if (popoverRef.current && !popoverRef.current.contains(target)) {
        setIsOpen(false);
      }
    };

    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, updatePosition]);

  const displayCreatedDate = formatDateString(createdDate, '14-03-2026');
  const displayCreatedUser = createdUser || 'admin';
  const displayUpdatedDate = formatDateString(updatedDate, '01-08-2026');
  const displayUpdatedUser = updatedUser || 'admin';

  return (
    <div
      className={`inline-flex items-center justify-center ${className}`}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        ref={buttonRef}
        type="button"
        onClick={toggleOpen}
        title={title}
        className={`inline-flex items-center justify-center p-1 rounded transition-colors cursor-pointer ${
          isOpen
            ? 'border border-slate-800 bg-slate-100 text-slate-900 shadow-xs'
            : 'text-slate-600 hover:text-blue-600'
        }`}
      >
        <ExternalLink className="w-4 h-4" />
      </button>

      {isOpen && typeof document !== 'undefined' && createPortal(
        <div
          ref={popoverRef}
          style={{
            position: 'fixed',
            top: `${coords.top}px`,
            left: `${coords.left}px`,
            zIndex: 99999,
          }}
          className="w-[440px] max-w-[calc(100vw-16px)] bg-white rounded-lg border border-slate-300 shadow-2xl p-3 text-left animate-in fade-in zoom-in-95 duration-150 font-sans"
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
        </div>,
        document.body
      )}
    </div>
  );
};
