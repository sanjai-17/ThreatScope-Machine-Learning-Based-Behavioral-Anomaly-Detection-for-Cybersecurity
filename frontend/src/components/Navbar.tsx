import React from 'react';
import {
  Shield,
  LayoutDashboard,
  Database,
  Cpu,
  CheckCircle2,
  AlertTriangle,
  Sliders,
  History,
  Settings,
  Activity
} from 'lucide-react';
import { ModelStatus } from '../types';

interface NavbarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  modelStatus: ModelStatus | null;
  backendHealthy: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setCurrentTab,
  modelStatus,
  backendHealthy,
}) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'datasets', label: 'Datasets', icon: Database },
    { id: 'training', label: 'Model Training', icon: Cpu },
    { id: 'evaluation', label: 'Evaluation', icon: CheckCircle2 },
    { id: 'detection', label: 'Anomaly Detection', icon: AlertTriangle },
    { id: 'experiment', label: 'Threshold Lab', icon: Sliders },
    { id: 'history', label: 'History', icon: History },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <header className="bg-cyber-card/90 backdrop-blur-md border-b border-cyber-border sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setCurrentTab('dashboard')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-emerald-500 flex items-center justify-center shadow-lg shadow-cyan-900/40">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold tracking-wider text-white">THREAT<span className="text-cyan-400">SCOPE</span></span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">
                  IF-ML
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">Behavioral Anomaly Detection</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentTab(item.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Right Status Badges */}
          <div className="flex items-center gap-3">
            {/* Active Model Indicator */}
            <div className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-xs">
              <span className="text-slate-400">Active Model:</span>
              {modelStatus?.active_model ? (
                <span className="font-mono text-cyan-400 font-semibold truncate max-w-[150px]">
                  {modelStatus.active_model.version_tag}
                </span>
              ) : (
                <span className="text-amber-400 font-mono">None</span>
              )}
            </div>

            {/* Backend Health Dot */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono">
              <span
                className={`w-2 h-2 rounded-full ${
                  backendHealthy ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'
                }`}
              ></span>
              <span className="text-slate-300">{backendHealthy ? 'ONLINE' : 'OFFLINE'}</span>
            </div>
          </div>
        </div>

        {/* Mobile Nav Bar */}
        <div className="flex md:hidden overflow-x-auto py-2 gap-1 border-t border-cyber-border scrollbar-none">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentTab(item.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
