import React from 'react';
import { ShieldCheck, AlertOctagon, CheckCircle2, AlertTriangle } from 'lucide-react';

interface ConfusionMatrixViewProps {
  tn: number;
  fp: number;
  fn: number;
  tp: number;
  total: number;
}

export const ConfusionMatrixView: React.FC<ConfusionMatrixViewProps> = ({
  tn,
  fp,
  fn,
  tp,
  total,
}) => {
  const getPct = (val: number) => (total > 0 ? ((val / total) * 100).toFixed(1) : '0.0');

  return (
    <div className="bg-cyber-card border border-cyber-border rounded-xl p-6 shadow-xl">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-cyber-border">
        <div>
          <h3 className="text-base font-semibold text-white flex items-center gap-2">
            <span>Evaluation Confusion Matrix</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Verified ground-truth vs. Isolation Forest anomaly decisions ({total.toLocaleString()} total evaluated)
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 max-w-xl mx-auto">
        {/* Top-Left: TN */}
        <div className="bg-emerald-950/30 border border-emerald-500/40 rounded-xl p-4 flex flex-col justify-between transition hover:border-emerald-500/70">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" />
              True Negative (TN)
            </span>
            <span className="text-xs font-mono text-emerald-400/80 bg-emerald-900/40 px-2 py-0.5 rounded">
              {getPct(tn)}%
            </span>
          </div>
          <div className="my-3">
            <span className="text-3xl font-bold font-mono text-white">{tn.toLocaleString()}</span>
          </div>
          <p className="text-xs text-slate-400">
            Actual Normal correctly identified as Normal.
          </p>
        </div>

        {/* Top-Right: FP */}
        <div className="bg-amber-950/30 border border-amber-500/40 rounded-xl p-4 flex flex-col justify-between transition hover:border-amber-500/70">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4" />
              False Positive (FP)
            </span>
            <span className="text-xs font-mono text-amber-400/80 bg-amber-900/40 px-2 py-0.5 rounded">
              {getPct(fp)}%
            </span>
          </div>
          <div className="my-3">
            <span className="text-3xl font-bold font-mono text-white">{fp.toLocaleString()}</span>
          </div>
          <p className="text-xs text-slate-400">
            False Alarm: Normal traffic incorrectly flagged as Anomaly.
          </p>
        </div>

        {/* Bottom-Left: FN */}
        <div className="bg-rose-950/40 border border-rose-500/40 rounded-xl p-4 flex flex-col justify-between transition hover:border-rose-500/70">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
              <AlertOctagon className="w-4 h-4" />
              False Negative (FN)
            </span>
            <span className="text-xs font-mono text-rose-400/80 bg-rose-900/40 px-2 py-0.5 rounded">
              {getPct(fn)}%
            </span>
          </div>
          <div className="my-3">
            <span className="text-3xl font-bold font-mono text-white">{fn.toLocaleString()}</span>
          </div>
          <p className="text-xs text-slate-400">
            Missed Attack: Actual attack incorrectly passed as Normal.
          </p>
        </div>

        {/* Bottom-Right: TP */}
        <div className="bg-cyan-950/40 border border-cyan-500/40 rounded-xl p-4 flex flex-col justify-between transition hover:border-cyan-500/70">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              True Positive (TP)
            </span>
            <span className="text-xs font-mono text-cyan-400/80 bg-cyan-900/40 px-2 py-0.5 rounded">
              {getPct(tp)}%
            </span>
          </div>
          <div className="my-3">
            <span className="text-3xl font-bold font-mono text-white">{tp.toLocaleString()}</span>
          </div>
          <p className="text-xs text-slate-400">
            Actual Attack successfully detected as Anomaly.
          </p>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-cyber-border text-center text-xs text-slate-400">
        Matrix orientation: Rows represent Actual ground truth [Normal, Attack], Columns represent Predicted [Normal, Anomaly].
      </div>
    </div>
  );
};
