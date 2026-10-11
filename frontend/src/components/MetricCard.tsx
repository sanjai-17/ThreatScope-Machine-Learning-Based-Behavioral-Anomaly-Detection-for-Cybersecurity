import React from 'react';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  accent?: 'cyan' | 'emerald' | 'rose' | 'amber' | 'indigo';
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  accent = 'cyan',
}) => {
  const accentBorder = {
    cyan: 'border-cyan-500/30 hover:border-cyan-500/60 shadow-cyan-950/20',
    emerald: 'border-emerald-500/30 hover:border-emerald-500/60 shadow-emerald-950/20',
    rose: 'border-rose-500/30 hover:border-rose-500/60 shadow-rose-950/20',
    amber: 'border-amber-500/30 hover:border-amber-500/60 shadow-amber-950/20',
    indigo: 'border-indigo-500/30 hover:border-indigo-500/60 shadow-indigo-950/20',
  }[accent];

  const iconBg = {
    cyan: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
    emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    rose: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    indigo: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  }[accent];

  return (
    <div
      className={`relative bg-cyber-card rounded-xl p-5 border ${accentBorder} shadow-lg transition-all duration-200 flex flex-col justify-between`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          {title}
        </span>
        <div className={`p-2 rounded-lg border ${iconBg}`}>
          {icon}
        </div>
      </div>
      <div className="mt-4">
        <div className="text-2xl font-bold tracking-tight text-white font-mono">
          {value}
        </div>
        {subtitle && (
          <p className="mt-1 text-xs text-slate-400 truncate">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
};
