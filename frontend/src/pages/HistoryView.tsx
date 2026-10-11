import React, { useState, useEffect } from 'react';
import {
  History,
  Cpu,
  CheckCircle2,
  Activity,
  Layers,
  Clock,
  Shield,
  ArrowRight
} from 'lucide-react';
import { apiClient } from '../api/client';
import { TrainedModel, EvaluationMetrics, DetectionBatch } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { LoadingSpinner } from '../components/LoadingSpinner';

export const HistoryView: React.FC = () => {
  const [models, setModels] = useState<TrainedModel[]>([]);
  const [evaluations, setEvaluations] = useState<EvaluationMetrics[]>([]);
  const [detections, setDetections] = useState<DetectionBatch[]>([]);
  const [activeTab, setActiveTab] = useState<'models' | 'evaluations' | 'detections'>('models');
  const [loading, setLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  useEffect(() => {
    loadAllHistory();
  }, []);

  const loadAllHistory = async () => {
    setLoading(true);
    try {
      const [mList, eList, dList] = await Promise.all([
        apiClient.getModelHistory(),
        apiClient.getEvaluationHistory(),
        apiClient.getDetectionHistory(),
      ]);
      setModels(mList);
      setEvaluations(eList);
      setDetections(dList);
    } catch (err) {
      console.error('Failed to load history', err);
    } finally {
      setLoading(false);
    }
  };

  const handleActivateModel = async (modelId: number) => {
    try {
      const activated = await apiClient.activateModel(modelId);
      setActionMessage(`Model version ${activated.version_tag} is now active.`);
      await loadAllHistory();
    } catch (err) {
      console.error('Failed to activate model', err);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Retrieving historical training, evaluation, and detection logs..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="pb-4 border-b border-cyber-border">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <History className="w-6 h-6 text-cyan-400" />
          System Execution & Model Version History
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Complete audit trail of all trained Isolation Forest model versions, held-out test evaluations, and detection batches.
        </p>
      </div>

      {actionMessage && (
        <div className="p-3.5 rounded-xl bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-cyan-400" />
          <span>{actionMessage}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-cyber-border gap-2">
        <button
          onClick={() => setActiveTab('models')}
          className={`pb-3 px-4 text-xs font-semibold flex items-center gap-2 border-b-2 transition ${
            activeTab === 'models'
              ? 'border-cyan-400 text-cyan-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Cpu className="w-4 h-4" />
          <span>Trained Model Versions ({models.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('evaluations')}
          className={`pb-3 px-4 text-xs font-semibold flex items-center gap-2 border-b-2 transition ${
            activeTab === 'evaluations'
              ? 'border-cyan-400 text-cyan-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>Test Evaluations ({evaluations.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('detections')}
          className={`pb-3 px-4 text-xs font-semibold flex items-center gap-2 border-b-2 transition ${
            activeTab === 'detections'
              ? 'border-cyan-400 text-cyan-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Detection Batches ({detections.length})</span>
        </button>
      </div>

      {/* Models Table */}
      {activeTab === 'models' && (
        <div className="bg-cyber-card border border-cyber-border rounded-xl p-5 shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-cyber-border text-slate-400">
                <tr>
                  <th className="pb-3 font-semibold">Version Tag</th>
                  <th className="pb-3 font-semibold">Status</th>
                  <th className="pb-3 font-semibold">Dataset</th>
                  <th className="pb-3 font-semibold">Flows</th>
                  <th className="pb-3 font-semibold">Features</th>
                  <th className="pb-3 font-semibold">Trees</th>
                  <th className="pb-3 font-semibold">Contamination</th>
                  <th className="pb-3 font-semibold">Duration</th>
                  <th className="pb-3 font-semibold">Created</th>
                  <th className="pb-3 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cyber-border/40 font-mono text-slate-300">
                {models.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-800/40">
                    <td className="py-3 font-sans font-bold text-white">{m.version_tag}</td>
                    <td className="py-3">
                      <StatusBadge status={m.is_active ? 'Active' : 'Inactive'} size="sm" />
                    </td>
                    <td className="py-3 font-sans text-slate-400 truncate max-w-[120px]">{m.dataset_name || 'N/A'}</td>
                    <td className="py-3">{m.training_rows.toLocaleString()}</td>
                    <td className="py-3 text-cyan-400">{m.feature_count}</td>
                    <td className="py-3">{m.n_estimators}</td>
                    <td className="py-3 text-amber-400">{m.contamination}</td>
                    <td className="py-3">{m.training_duration_seconds}s</td>
                    <td className="py-3 text-slate-500 font-sans">
                      {m.created_at ? new Date(m.created_at).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="py-3 font-sans">
                      {!m.is_active && (
                        <button
                          onClick={() => handleActivateModel(m.id)}
                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700 text-xs font-semibold"
                        >
                          Activate
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Evaluations Table */}
      {activeTab === 'evaluations' && (
        <div className="bg-cyber-card border border-cyber-border rounded-xl p-5 shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="border-b border-cyber-border text-slate-400 font-sans">
                <tr>
                  <th className="pb-3 font-semibold">Model Version</th>
                  <th className="pb-3 font-semibold">Test Dataset</th>
                  <th className="pb-3 font-semibold text-cyan-400">Accuracy</th>
                  <th className="pb-3 font-semibold">Precision</th>
                  <th className="pb-3 font-semibold">Recall</th>
                  <th className="pb-3 font-semibold">F1-Score</th>
                  <th className="pb-3 font-semibold text-amber-400">FPR</th>
                  <th className="pb-3 font-semibold">Threshold</th>
                  <th className="pb-3 font-semibold">Evaluated At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cyber-border/40 text-slate-300">
                {evaluations.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-800/40">
                    <td className="py-3 font-sans font-bold text-white">{e.model_version}</td>
                    <td className="py-3 font-sans text-slate-400">{e.dataset_name}</td>
                    <td className="py-3 text-cyan-400 font-bold">{e.accuracy.toFixed(2)}%</td>
                    <td className="py-3">{(e.precision * 100).toFixed(2)}%</td>
                    <td className="py-3">{(e.recall * 100).toFixed(2)}%</td>
                    <td className="py-3">{(e.f1_score * 100).toFixed(2)}%</td>
                    <td className="py-3 text-amber-400">{(e.false_positive_rate * 100).toFixed(2)}%</td>
                    <td className="py-3">{e.threshold_used}</td>
                    <td className="py-3 text-slate-500 font-sans">
                      {e.evaluated_at ? new Date(e.evaluated_at).toLocaleString() : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detections Table */}
      {activeTab === 'detections' && (
        <div className="bg-cyber-card border border-cyber-border rounded-xl p-5 shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="border-b border-cyber-border text-slate-400 font-sans">
                <tr>
                  <th className="pb-3 font-semibold">Batch ID</th>
                  <th className="pb-3 font-semibold">Model Version</th>
                  <th className="pb-3 font-semibold">File / Stream</th>
                  <th className="pb-3 font-semibold">Total Records</th>
                  <th className="pb-3 font-semibold text-emerald-400">Normal</th>
                  <th className="pb-3 font-semibold text-rose-400">Anomalous</th>
                  <th className="pb-3 font-semibold">Rate</th>
                  <th className="pb-3 font-semibold">Threshold</th>
                  <th className="pb-3 font-semibold font-sans">Executed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cyber-border/40 text-slate-300">
                {detections.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-800/40">
                    <td className="py-3 text-slate-400">#{d.id}</td>
                    <td className="py-3 font-sans font-bold text-white">{d.model_version}</td>
                    <td className="py-3 font-sans text-slate-400">{d.filename}</td>
                    <td className="py-3">{d.total_records.toLocaleString()}</td>
                    <td className="py-3 text-emerald-400">{d.normal_count.toLocaleString()}</td>
                    <td className="py-3 text-rose-400 font-bold">{d.anomalous_count.toLocaleString()}</td>
                    <td className="py-3">{d.anomaly_rate_percent.toFixed(2)}%</td>
                    <td className="py-3 text-cyan-400">{d.threshold_used}</td>
                    <td className="py-3 text-slate-500 font-sans">
                      {d.created_at ? new Date(d.created_at).toLocaleString() : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
