import React from 'react';
import { ShieldCheck, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';

interface StatusBadgeProps {
  status: 'Normal' | 'Anomalous' | 'Active' | 'Inactive' | 'Attack' | 'Benign';
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const isSm = size === 'sm';
  const padding = isSm ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm font-medium';

  switch (status) {
    case 'Normal':
    case 'Benign':
      return (
        <span className={`inline-flex items-center gap-1.5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-500/30 ${padding}`}>
          <ShieldCheck className={isSm ? 'w-3 h-3' : 'w-4 h-4'} />
          <span>{status}</span>
        </span>
      );
    case 'Anomalous':
    case 'Attack':
      return (
        <span className={`inline-flex items-center gap-1.5 rounded-full bg-rose-950/80 text-rose-400 border border-rose-500/30 ${padding}`}>
          <AlertTriangle className={isSm ? 'w-3 h-3' : 'w-4 h-4'} />
          <span>{status}</span>
        </span>
      );
    case 'Active':
      return (
        <span className={`inline-flex items-center gap-1.5 rounded-full bg-cyan-950/80 text-cyan-400 border border-cyan-500/30 ${padding}`}>
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
          <span>Active</span>
        </span>
      );
    case 'Inactive':
      return (
        <span className={`inline-flex items-center gap-1.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 ${padding}`}>
          <Clock className={isSm ? 'w-3 h-3' : 'w-4 h-4'} />
          <span>Inactive</span>
        </span>
      );
    default:
      return (
        <span className={`inline-flex items-center rounded-full bg-slate-800 text-slate-300 ${padding}`}>
          {status}
        </span>
      );
  }
};
