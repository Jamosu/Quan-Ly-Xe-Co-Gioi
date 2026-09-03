import React from 'react';
import { clsx } from 'clsx';

export interface KPIGridProps {
  children: React.ReactNode;
  cols?: 2 | 3 | 4 | 5;
  className?: string;
}

export const KPIGrid: React.FC<KPIGridProps> = ({ children, cols = 4, className }) => {
  const colClasses = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
    5: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5',
  };

  return (
    <div className={clsx('grid gap-3.5 mb-5', colClasses[cols], className)}>
      {children}
    </div>
  );
};
