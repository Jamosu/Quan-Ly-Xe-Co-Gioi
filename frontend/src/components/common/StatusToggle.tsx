import React from 'react';

export interface StatusToggleProps<T extends string = string> {
  label?: string;
  value: T;
  onChange: (value: T) => void;
  activeValue?: T;
  inactiveValue?: T;
  activeLabel?: string;
  inactiveLabel?: string;
  disabled?: boolean;
  className?: string;
}

export const StatusToggle = <T extends string = string>({
  label = 'Trạng thái hoạt động',
  value,
  onChange,
  activeValue = 'ACTIVE' as T,
  inactiveValue = 'INACTIVE' as T,
  activeLabel = 'Hoạt động',
  inactiveLabel = 'Không hoạt động',
  disabled = false,
  className = '',
}: StatusToggleProps<T>) => {
  const isActive = value === activeValue;
  const isInactive = value === inactiveValue;

  return (
    <div className={className}>
      {label && <label className="block font-semibold text-slate-700 mb-1.5">{label}</label>}
      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange(activeValue)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
            isActive
              ? 'bg-emerald-50 text-emerald-700 border-emerald-500 shadow-xs ring-1 ring-emerald-500 font-bold'
              : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50 disabled:opacity-50'
          }`}
        >
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              isActive ? 'bg-emerald-500 ring-2 ring-emerald-200' : 'bg-slate-300'
            }`}
          />
          {activeLabel}
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange(inactiveValue)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
            isInactive
              ? 'bg-rose-50 text-rose-700 border-rose-500 shadow-xs ring-1 ring-rose-500 font-bold'
              : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50 disabled:opacity-50'
          }`}
        >
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              isInactive ? 'bg-rose-500 ring-2 ring-rose-200' : 'bg-slate-300'
            }`}
          />
          {inactiveLabel}
        </button>
      </div>
    </div>
  );
};

export default StatusToggle;
