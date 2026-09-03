import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface BadgeProps {
  variant?: 'green' | 'amber' | 'red' | 'blue' | 'gray' | 'purple';
  size?: 'sm' | 'md';
  dot?: boolean;
  children: React.ReactNode;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'green',
  size = 'md',
  dot = false,
  children,
  className,
}) => {
  const baseClasses = 'inline-flex items-center font-medium rounded-full';

  const sizeClasses = {
    sm: 'text-[10px] px-2 py-0.5 gap-1 leading-tight',
    md: 'text-xs px-2.5 py-1 gap-1.5 leading-normal',
  };

  const variantClasses = {
    green: 'bg-emerald-50 text-emerald-700 border border-emerald-200/60',
    amber: 'bg-amber-50 text-amber-800 border border-amber-200/60',
    red: 'bg-rose-50 text-rose-700 border border-rose-200/60',
    blue: 'bg-sky-50 text-sky-700 border border-sky-200/60',
    gray: 'bg-slate-100 text-slate-700 border border-slate-200/60',
    purple: 'bg-purple-50 text-purple-700 border border-purple-200/60',
  };

  const dotClasses = {
    green: 'bg-emerald-500',
    amber: 'bg-amber-500',
    red: 'bg-rose-500',
    blue: 'bg-sky-500',
    gray: 'bg-slate-400',
    purple: 'bg-purple-500',
  };

  return (
    <span className={twMerge(clsx(baseClasses, sizeClasses[size], variantClasses[variant], className))}>
      {dot && <span className={clsx('w-1.5 h-1.5 rounded-full shrink-0 animate-pulse', dotClasses[variant])} />}
      {children}
    </span>
  );
};
