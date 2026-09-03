import React from 'react';
import { clsx } from 'clsx';
import { TrendingUp, TrendingDown } from 'lucide-react';

export interface StatCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  trend?: {
    value: string;
    isUp?: boolean;
    label?: string;
    type?: 'success' | 'danger' | 'neutral' | 'warning';
  };
  pillText?: string;
  pillVariant?: 'success' | 'danger' | 'neutral' | 'warning' | 'gray';
  icon?: React.ReactNode;
  iconBgColor?: string;
  iconColor?: string;
  onClick?: () => void;
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  subValue,
  trend,
  pillText,
  pillVariant,
  icon,
  onClick,
  className,
}) => {
  const displayPill = pillText || (trend ? trend.value : null);
  const isUp = trend?.isUp;
  const isDown = trend && trend.isUp === false;

  return (
    <div
      onClick={onClick}
      className={clsx(
        'bg-white rounded-xl p-4 border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between',
        onClick && 'cursor-pointer hover:border-emerald-600',
        className
      )}
    >
      <div className="flex items-center justify-between gap-2">
        {displayPill ? (
          <span
            className={clsx(
              'inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold tracking-tight',
              pillVariant === 'success' || (trend && isUp && !pillVariant)
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                : pillVariant === 'danger' || (trend && isDown && !pillVariant)
                ? 'bg-rose-50 text-rose-700 border border-rose-200/60'
                : pillVariant === 'warning'
                ? 'bg-amber-50 text-amber-700 border border-amber-200/60'
                : 'bg-slate-100 text-slate-600 border border-slate-200/60'
            )}
          >
            {trend && isUp !== undefined && (
              isUp ? <TrendingUp className="w-2.5 h-2.5 mr-1" /> : <TrendingDown className="w-2.5 h-2.5 mr-1" />
            )}
            {displayPill}
          </span>
        ) : (
          <span className="text-xs font-semibold text-slate-500 line-clamp-1">{label}</span>
        )}

        {icon && (
          <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-slate-400 bg-slate-50 border border-slate-100">
            {icon}
          </div>
        )}
      </div>

      <div className="mt-2.5">
        <div className="text-2xl font-extrabold text-slate-900 font-heading tracking-tight leading-none">{value}</div>
        <div className="text-xs text-slate-500 font-medium mt-1.5 line-clamp-2 leading-relaxed">
          {subValue || label}
        </div>
      </div>
    </div>
  );
};

