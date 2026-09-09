import React from 'react';
import type { ScheduleInterval } from '../../api/scheduling';

const intervalColors: Record<string, string> = {
  MAINTENANCE: 'bg-amber-500',
  REPAIR: 'bg-rose-500',
  ACTIVE_EXECUTION: 'bg-violet-600',
  LEAVE: 'bg-sky-500',
  MEDICAL: 'bg-cyan-600',
  WORK_ORDER: 'bg-blue-600',
  MERGED_BUSY: 'bg-slate-600',
};

export const ResourceTimeline: React.FC<{ from: string; to: string; intervals: ScheduleInterval[] }> = ({ from, to, intervals }) => {
  const start = new Date(from).getTime();
  const end = new Date(to).getTime();
  const span = Math.max(1, end - start);
  return (
    <div className="relative h-8 overflow-hidden rounded-lg border border-slate-200 bg-emerald-50" title="Nền xanh là thời gian trống">
      {intervals.map((interval, index) => {
        const left = Math.max(0, ((new Date(interval.startTime).getTime() - start) / span) * 100);
        const right = Math.min(100, ((new Date(interval.endTime).getTime() - start) / span) * 100);
        return <div key={`${interval.type}-${interval.relatedId ?? index}-${index}`} className={`absolute inset-y-0 ${intervalColors[interval.type] ?? 'bg-slate-500'}`} style={{ left: `${left}%`, width: `${Math.max(1, right - left)}%` }} title={`${interval.type}: ${new Date(interval.startTime).toLocaleString('vi-VN')} → ${new Date(interval.endTime).toLocaleString('vi-VN')}`} />;
      })}
    </div>
  );
};
