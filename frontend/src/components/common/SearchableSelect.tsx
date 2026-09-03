import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, X } from 'lucide-react';

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
}

/**
 * SearchableSelect Component (Combo-box: Input text + Select Dropdown)
 * Cho phép vừa nhập text tự do, vừa tìm kiếm và chọn từ danh sách gợi ý dropdown.
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
  emptyOptionLabel = '-- Tất cả / Bỏ chọn --',
  emptyValue = 'ALL',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Normalize options to SelectOption format
  const normalizedOptions: SelectOption[] = React.useMemo(() => {
    return options.map((opt) => {
      if (typeof opt === 'string') {
        return { value: opt, label: opt };
      }
      return opt;
    });
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

  const effectiveEmptyLabel = emptyOptionLabel || placeholder || '-- Tất cả --';

  // Filter options by search term (excluding empty value so it does not duplicate with the top clear item)
  const filteredOptions = React.useMemo(() => {
    const listWithoutEmpty = normalizedOptions.filter(
      (opt) => opt.value !== '' && opt.value !== 'ALL' && opt.value !== emptyValue
    );
    const term = (searchTerm || '').toLowerCase().trim();
    if (!term) return listWithoutEmpty;
    return listWithoutEmpty.filter(
      (opt) =>
        opt.label.toLowerCase().includes(term) ||
        opt.value.toLowerCase().includes(term) ||
        (opt.subLabel && opt.subLabel.toLowerCase().includes(term))
    );
  }, [normalizedOptions, searchTerm, emptyValue]);

  // Handle clicking outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
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
    setSearchTerm('');
    setIsOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchTerm(val);
    if (allowCustomInput) {
      onChange(val);
    }
    if (!isOpen) setIsOpen(true);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(emptyValue);
    setSearchTerm('');
    if (isOpen) setIsOpen(false);
  };

  const isSelectedActive = value && value !== 'ALL' && value !== '';

  return (
    <div ref={containerRef} className={`relative flex-1 ${className}`}>
      {/* Input box with dropdown trigger */}
      <div
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
          value={isOpen && searchTerm !== '' ? searchTerm : displayLabel}
          onChange={handleInputChange}
          onFocus={() => {
            if (!disabled) {
              setSearchTerm('');
              setIsOpen(true);
            }
          }}
          placeholder={placeholder}
          className="w-full bg-transparent text-xs font-semibold text-slate-700 placeholder:text-slate-400 placeholder:font-normal focus:outline-none truncate"
        />

        <div className="flex items-center gap-1 shrink-0 ml-1">
          {isSelectedActive && !disabled && (
            <button
              type="button"
              tabIndex={-1}
              onClick={handleClear}
              className="p-0.5 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition-colors"
              title="Xóa lựa chọn"
            >
              <X className="h-3 w-3" />
            </button>
          )}

          <button
            type="button"
            tabIndex={-1}
            disabled={disabled}
            onClick={(e) => {
              e.stopPropagation();
              if (!disabled) {
                setIsOpen(!isOpen);
                if (!isOpen) {
                  setSearchTerm('');
                  inputRef.current?.focus();
                }
              }
            }}
            className="text-slate-400 hover:text-slate-700 cursor-pointer focus:outline-none transition-transform"
          >
            <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-150 ${isOpen ? 'rotate-180 text-primary' : ''}`} />
          </button>
        </div>
      </div>

      {/* Dropdown Options List */}
      {isOpen && !disabled && (
        <div className="absolute z-50 left-0 top-full mt-1 w-full min-w-[200px] max-w-[360px] bg-white border border-slate-200 rounded-xl shadow-xl p-1 space-y-0.5 animate-in fade-in duration-100 max-h-60 overflow-y-auto">
          {/* Option to clear */}
          <div
            onClick={() => handleSelect(emptyValue)}
            className="px-2.5 py-1.5 hover:bg-slate-100 cursor-pointer text-slate-500 italic text-[11px] rounded-lg transition-colors flex items-center justify-between"
          >
            <span>{effectiveEmptyLabel}</span>
            {(!value || value === 'ALL' || value === emptyValue) && <span className="text-emerald-700 font-bold text-xs">✓</span>}
          </div>

          {filteredOptions.length === 0 ? (
            <div className="px-3 py-3 text-center text-slate-400 italic text-[11px]">
              Không tìm thấy gợi ý trùng khớp
            </div>
          ) : (
            filteredOptions.map((opt, idx) => {
              const isSelected = value === opt.value;
              return (
                <div
                  key={opt.value || idx}
                  onClick={() => handleSelect(opt.value)}
                  className={`px-2.5 py-1.5 hover:bg-primary-50 hover:text-primary cursor-pointer text-xs rounded-lg transition-colors flex items-center justify-between ${
                    isSelected ? 'bg-primary-50 font-bold text-primary' : 'text-slate-700'
                  }`}
                >
                  <div className="truncate pr-2">
                    <div className="truncate text-xs">{opt.label}</div>
                    {opt.subLabel && <div className="text-[10px] text-slate-400 truncate">{opt.subLabel}</div>}
                  </div>
                  {isSelected && <span className="text-primary font-bold text-xs shrink-0">✓</span>}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

