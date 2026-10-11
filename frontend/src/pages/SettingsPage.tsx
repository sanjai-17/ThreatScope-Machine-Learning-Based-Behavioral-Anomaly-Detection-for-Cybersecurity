import React, { useState, useEffect } from 'react';
import {
  Settings,
  Shield,
  Server,
  HardDrive,
  Database,
  Lock,
  CheckCircle2,
  AlertTriangle,
  Info,
  RefreshCw
} from 'lucide-react';
import { apiClient } from '../api/client';

export const SettingsPage: React.FC = () => {
  const [healthStatus, setHealthStatus] = useState<any>(null);
  const [checking, setChecking] = useState<boolean>(false);

  useEffect(() => {
    checkHealth();
  }, []);

  const checkHealth = async () => {
    setChecking(true);
    try {
      const data = await apiClient.checkHealth();
      setHealthStatus(data);
    } catch (err: any) {
      setHealthStatus({ status: 'unhealthy', error: err.message });
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="pb-4 border-b border-cyber-border">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Settings className="w-6 h-6 text-cyan-400" />
          Settings & System Diagnostics
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          ThreatScope platform architecture, health monitoring, and security configuration.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Backend Status Card */}
        <div className="bg-cyber-card border border-cyber-border rounded-xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-cyber-border">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <Server className="w-4 h-4 text-cyan-400" />
              API & Engine Telemetry
            </h2>
            <button
              onClick={checkHealth}
              disabled={checking}
              className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${checking ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>

          <div className="p-4 bg-slate-900 rounded-xl border border-slate-800 flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-slate-300">FastAPI Backend Service</div>
              <div className="text-[11px] text-slate-500 font-mono">http://localhost:8000/api</div>
            </div>
            {healthStatus?.status === 'healthy' ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-950 text-emerald-400 border border-emerald-800">
                <CheckCircle2 className="w-3.5 h-3.5" />
                ONLINE (Healthy)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-950 text-rose-400 border border-rose-800">
                <AlertTriangle className="w-3.5 h-3.5" />
                DISCONNECTED
              </span>
            )}
          </div>

          <div className="space-y-2 text-xs font-mono text-slate-300 bg-slate-900/60 p-3 rounded-lg border border-slate-800">
            <div className="flex justify-between">
              <span className="text-slate-500">Framework:</span>
              <span>FastAPI (Uvicorn ASGI)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">ML Engine:</span>
              <span className="text-cyan-400">Scikit-Learn IsolationForest</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Persistence:</span>
              <span>Joblib (.joblib serialization)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Database:</span>
              <span>SQLite + SQLAlchemy ORM</span>
            </div>
          </div>
        </div>

        {/* Security & Data Safeguards */}
        <div className="bg-cyber-card border border-cyber-border rounded-xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-cyber-border">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <Lock className="w-4 h-4 text-emerald-400" />
              Security Safeguards & Integrity Guardrails
            </h2>
          </div>

          <ul className="space-y-3 text-xs text-slate-300">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="text-white">Strict Leakage Prevention: </strong>
                Feature preprocessing is fitted strictly on training data. Transformation parameters are frozen and reapplied cleanly during testing and detection.
              </div>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="text-white">Zero Result Fabrication: </strong>
                All metrics (Accuracy, Precision, Recall, F1, FPR, Confusion Matrix) are computed live from actual test data. No metrics are simulated.
              </div>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="text-white">File Upload Security: </strong>
                CSV validation checks file extension, limits upload payload to 100MB, sanitizes filenames, and treats records purely as data without code execution.
              </div>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="text-white">Target Isolation: </strong>
                Dataset labels and attack names are automatically removed from model feature vectors to prevent label leakage.
              </div>
            </li>
          </ul>
        </div>
      </div>

      {/* System Guidelines Alert */}
      <div className="bg-slate-900 border border-cyber-border rounded-xl p-5 text-xs text-slate-400 space-y-2">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <Info className="w-4 h-4 text-cyan-400" />
          Cybersecurity System Scope & Operation
        </h3>
        <p>
          ThreatScope is an intelligent behavioral anomaly detection engine designed for security operations center (SOC) analysts. Isolation Forest isolates anomalies based on feature space deviations rather than static signature matching.
        </p>
        <p>
          Anomalous records should be prioritized for incident response investigations. It is not an active firewall or automated blocking tool, but rather a high-fidelity behavioral detection instrument.
        </p>
      </div>
    </div>
  );
};
