import React from 'react';
import { Shield } from 'lucide-react';

interface LoadingSpinnerProps {
  message?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ message = 'Processing Security Models...' }) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 space-y-4">
      <div className="relative flex items-center justify-center w-16 h-16">
        <div className="absolute w-full h-full rounded-full border-2 border-cyan-500/20 border-t-cyan-400 animate-spin"></div>
        <div className="absolute w-10 h-10 rounded-full border-2 border-emerald-500/20 border-b-emerald-400 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
        <Shield className="w-6 h-6 text-cyan-400" />
      </div>
      <p className="text-sm font-medium text-slate-400 tracking-wide">{message}</p>
    </div>
  );
};
