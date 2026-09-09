import React, { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Plus, Trash2, X } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
  subLabel?: string;
}

interface SearchableSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: (SelectOption | string)[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  inputClassName?: string;
  allowCustomInput?: boolean;
  icon?: React.ReactNode;
  heightClass?: string;
  roundedClass?: string;
  bgClass?: string;
  emptyOptionLabel?: string;
  emptyValue?: string;
  onDeleteOption?: (value: string, e: React.MouseEvent) => void;
  onAddOption?: (newVal: string) => void;
}

/**
 * SearchableSelect Component (Combo-box: Input text + Select Dropdown)
 * Cho phép vừa nhập text tự do, vừa tìm kiếm và chọn từ danh sách gợi ý dropdown.
 * Sử dụng React Portal & synchronous coordinate calculation để dropdown mượt mà, không bị giật/nhảy vị trí.
 */
export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  value,
  onChange,
  options,
  placeholder = '',
  disabled = false,
  className = '',
  inputClassName = '',
  allowCustomInput = true,
  icon,
  heightClass = 'h-9',
  roundedClass = 'rounded-xl',
  bgClass = 'bg-slate-50',
  emptyOptionLabel = '-- Bỏ trống --',
  emptyValue = 'ALL',
  onDeleteOption,
  onAddOption,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [coords, setCoords] = useState<{
    top: number;
    left: number;
    right: number;
    width: number;
    minWidth: number;
    maxWidth: number;
    alignRight: boolean;
    placeUp: boolean;
  }>({
    top: 0,
    left: 0,
    right: 0,
    width: 0,
    minWidth: 0,
    maxWidth: 0,
    alignRight: false,
    placeUp: false,
  });

  // Calculate dropdown coordinates relative to viewport
  const updatePosition = useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const placeUp = spaceBelow < 280 && rect.top > 280;

    const viewportWidth = window.innerWidth;
    const triggerWidth = rect.width;

    // Chiều rộng tối thiểu: tối thiểu bằng ô input hoặc 320px để hiển thị đầy đủ data dài
    const idealMinWidth = Math.max(triggerWidth, 320);

    // Kiểm tra khoảng trống 2 bên mép màn hình
    const spaceToRight = viewportWidth - rect.left - 16;
    const spaceToLeft = rect.right - 16;

    // Tự động canh theo lề phải nếu lề phải màn hình hẹp hơn
    const alignRight = spaceToRight < idealMinWidth && spaceToLeft > spaceToRight;

    const maxAvailableWidth = alignRight ? spaceToLeft : spaceToRight;
    // Cho phép menu mở rộng tối đa lên đến 680px để thấy trọn vẹn toàn bộ data
    const maxWidth = Math.max(triggerWidth, Math.min(maxAvailableWidth, 680));
    const minWidth = Math.min(idealMinWidth, maxWidth);

    setCoords({
      top: placeUp ? rect.top : rect.bottom + 4,
      left: Math.max(12, rect.left),
      right: Math.max(12, viewportWidth - rect.right),
      width: triggerWidth,
      minWidth: Math.max(triggerWidth, minWidth),
      maxWidth: Math.max(triggerWidth, maxWidth),
      alignRight,
      placeUp,
    });
  }, []);

  // Compute position immediately before browser paint
  useLayoutEffect(() => {
    if (isOpen) {
      updatePosition();
      const handleScrollOrResize = () => {
        updatePosition();
      };
      window.addEventListener('scroll', handleScrollOrResize, true);
      window.addEventListener('resize', handleScrollOrResize);
      return () => {
        window.removeEventListener('scroll', handleScrollOrResize, true);
        window.removeEventListener('resize', handleScrollOrResize);
      };
    }
  }, [isOpen, updatePosition]);

  // Normalize options to SelectOption format & strictly deduplicate by value
  const normalizedOptions: SelectOption[] = React.useMemo(() => {
    const map = new Map<string, SelectOption>();
    options.forEach((opt) => {
      const item: SelectOption = typeof opt === 'string' ? { value: opt, label: opt } : opt;
      if (item && item.value !== undefined && !map.has(item.value)) {
        map.set(item.value, item);
      }
    });
    return Array.from(map.values());
  }, [options]);

  // Find label of currently selected value
  const selectedOption = normalizedOptions.find((opt) => opt.value === value);
  const isDefaultEmptyValue =
    value === '' ||
    value === 'ALL' ||
    (selectedOption && (selectedOption.value === '' || selectedOption.value === 'ALL'));

  const displayLabel = !isDefaultEmptyValue && selectedOption
    ? selectedOption.label
    : !isDefaultEmptyValue && value !== undefined && value !== null
    ? value
    : '';

  const effectiveEmptyLabel = emptyOptionLabel || '-- Bỏ trống --';

  // Filter options by search term (excluding empty value so it does not duplicate with the top clear item)
  const filteredOptions = React.useMemo(() => {
    const listWithoutEmpty = normalizedOptions.filter(
      (opt) => opt.value !== '' && opt.value !== 'ALL' && opt.value !== emptyValue
    );
    const term = (isTyping ? searchTerm : '').toLowerCase().trim();
    if (!term) return listWithoutEmpty;
    return listWithoutEmpty.filter(
      (opt) =>
        opt.label.toLowerCase().includes(term) ||
        opt.value.toLowerCase().includes(term) ||
        (opt.subLabel && opt.subLabel.toLowerCase().includes(term))
    );
  }, [normalizedOptions, searchTerm, isTyping, emptyValue]);

  // Handle clicking outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        containerRef.current &&
        !containerRef.current.contains(target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(target)
      ) {
        setIsOpen(false);
        setIsTyping(false);
        setSearchTerm('');
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelect = (val: string) => {
    onChange(val);
    setIsTyping(false);
    setSearchTerm('');
    setIsOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setIsTyping(true);
    setSearchTerm(val);
    if (allowCustomInput) {
      onChange(val);
    }
    if (!isOpen) {
      updatePosition();
      setIsOpen(true);
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const clearVal = emptyValue === 'ALL' && allowCustomInput ? '' : emptyValue !== undefined ? emptyValue : '';
    onChange(clearVal);
    setIsTyping(false);
    setSearchTerm('');
    if (inputRef.current) {
      inputRef.current.value = '';
    }
    setIsOpen(false);
  };

  const isSelectedActive =
    (value !== undefined && value !== null && value !== '' && value !== 'ALL' && value !== emptyValue) ||
    (isTyping && searchTerm !== '');

  return (
    <div ref={containerRef} className={`relative flex-1 ${className}`}>
      {/* Input box with dropdown trigger */}
      <div
        title={displayLabel || placeholder}
        className={`w-full ${heightClass} flex items-center justify-between border ${roundedClass} px-3 text-xs ${bgClass} text-slate-800 transition-all ${
          disabled
            ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
            : isOpen
            ? 'border-primary bg-white ring-2 ring-primary/15 shadow-sm'
            : isSelectedActive
            ? 'border-primary/40 bg-white font-semibold text-slate-900'
            : 'border-slate-200 hover:border-slate-300'
        } ${inputClassName}`}
      >
        {icon && <div className="shrink-0 mr-2 text-slate-400">{icon}</div>}

        <input
          ref={inputRef}
          type="text"
          disabled={disabled}
          value={isTyping ? searchTerm : displayLabel}
          onChange={handleInputChange}
          onFocus={() => {
            if (!disabled) {
              updatePosition();
              setIsOpen(true);
            }
          }}
          placeholder={placeholder}
          title={displayLabel || placeholder}
          className="w-full bg-transparent text-xs font-semibold text-slate-700 placeholder:text-slate-400 placeholder:font-normal focus:outline-none"
        />

        <div className="flex items-center gap-1 shrink-0 ml-1">
          {isSelectedActive && !disabled && (
            <button
              type="button"
              tabIndex={-1}
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onClick={handleClear}
              className="p-0.5 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
              title="Xóa lựa chọn / xóa text"
            >
              <X className="h-3 w-3" />
            </button>
          )}

          <button
            type="button"
            tabIndex={-1}
            disabled={disabled}
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onClick={(e) => {
              e.stopPropagation();
              if (!disabled) {
                if (!isOpen) {
                  updatePosition();
                  setSearchTerm('');
                  setIsOpen(true);
                  inputRef.current?.focus();
                } else {
                  setIsOpen(false);
                }
              }
            }}
            className="text-slate-400 hover:text-slate-700 cursor-pointer focus:outline-none transition-transform"
          >
            <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-150 ${isOpen ? 'rotate-180 text-primary' : ''}`} />
          </button>
        </div>
      </div>

      {/* Dropdown Options List rendered via Portal to escape table/overflow containers */}
      {isOpen && !disabled && typeof document !== 'undefined' && coords.width > 0 && createPortal(
        <div
          ref={dropdownRef}
          style={{
            position: 'fixed',
            left: coords.alignRight ? 'auto' : `${coords.left}px`,
            right: coords.alignRight ? `${coords.right}px` : 'auto',
            top: coords.placeUp ? 'auto' : `${coords.top}px`,
            bottom: coords.placeUp ? `${window.innerHeight - coords.top + 4}px` : 'auto',
            minWidth: `${coords.minWidth}px`,
            maxWidth: `${coords.maxWidth}px`,
            width: 'max-content',
            zIndex: 9999,
          }}
          className="bg-white border border-slate-200/95 rounded-xl shadow-2xl p-1.5 space-y-1 max-h-72 overflow-y-auto overflow-x-hidden animate-in fade-in-50 duration-100 ease-out text-xs"
        >
          {/* Option to clear */}
          <div
            onClick={() => handleSelect(emptyValue)}
            className="px-3 py-2 hover:bg-slate-100 cursor-pointer text-slate-500 italic text-xs rounded-lg transition-colors flex items-center justify-between"
          >
            <span className="whitespace-normal break-words font-medium">{effectiveEmptyLabel}</span>
            {(!value || value === 'ALL' || value === emptyValue) && (
              <span className="text-emerald-700 font-bold text-xs shrink-0 ml-2">✓</span>
            )}
          </div>

          {filteredOptions.length === 0 && !onAddOption ? (
            <div className="px-3 py-4 text-center text-slate-400 italic text-xs">
              Không tìm thấy gợi ý trùng khớp
            </div>
          ) : (
            filteredOptions.map((opt, idx) => {
              const isSelected = value === opt.value;
              return (
                <div
                  key={opt.value || idx}
                  onClick={() => handleSelect(opt.value)}
                  title={opt.label}
                  className={`group/opt-item px-3 py-2 hover:bg-emerald-50/90 hover:text-emerald-900 cursor-pointer text-xs rounded-lg transition-colors flex items-center justify-between gap-2.5 ${
                    isSelected ? 'bg-emerald-50 font-bold text-emerald-800' : 'text-slate-700'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-xs leading-relaxed whitespace-normal break-words font-medium">
                      {opt.label}
                    </div>
                    {opt.subLabel && (
                      <div className="text-[11px] text-slate-400 mt-0.5 leading-normal whitespace-normal break-words font-normal">
                        {opt.subLabel}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {isSelected && (
                      <span className="text-emerald-700 font-bold text-xs shrink-0">
                        ✓
                      </span>
                    )}
                    {onDeleteOption && (
                      <button
                        type="button"
                        title={`Xóa "${opt.label}" khỏi danh sách`}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          onDeleteOption(opt.value, e);
                        }}
                        className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors opacity-70 group-hover/opt-item:opacity-100"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}

          {/* Option to automatically add typed text if not found */}
          {onAddOption &&
            isTyping &&
            searchTerm.trim() !== '' &&
            !normalizedOptions.some(
              (opt) =>
                opt.value.toLowerCase() === searchTerm.trim().toLowerCase() ||
                opt.label.toLowerCase() === searchTerm.trim().toLowerCase()
            ) && (
              <div
                onClick={() => {
                  const newTerm = searchTerm.trim();
                  onAddOption(newTerm);
                  handleSelect(newTerm);
                }}
                className="px-3 py-2 hover:bg-emerald-100/90 hover:text-emerald-900 cursor-pointer text-xs rounded-lg transition-colors flex items-center gap-2 text-emerald-700 font-bold border-t border-dashed border-emerald-200 mt-1"
              >
                <Plus className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                <span className="truncate">Thêm "{searchTerm.trim()}" vào danh sách gợi ý</span>
              </div>
            )}
        </div>,
        document.body
      )}
    </div>
  );
};

