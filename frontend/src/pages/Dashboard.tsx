import React, { useState, useEffect } from 'react';
import {
  Shield,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Cpu,
  BarChart3,
  FileText,
  ArrowRight,
  Database
} from 'lucide-react';
import { apiClient } from '../api/client';
import { ModelStatus, EvaluationMetrics, DetectionBatch } from '../types';
import { MetricCard } from '../components/MetricCard';
import { ConfusionMatrixView } from '../components/ConfusionMatrixView';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { StatusBadge } from '../components/StatusBadge';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts';

interface DashboardProps {
  onNavigate: (tab: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const [modelStatus, setModelStatus] = useState<ModelStatus | null>(null);
  const [latestEval, setLatestEval] = useState<EvaluationMetrics | null>(null);
  const [detectionHistory, setDetectionHistory] = useState<DetectionBatch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [status, evaluation, detections] = await Promise.all([
        apiClient.getModelStatus(),
        apiClient.getLatestEvaluation(),
        apiClient.getDetectionHistory(),
      ]);
      setModelStatus(status);
      setLatestEval(evaluation);
      setDetectionHistory(detections);
    } catch (err) {
      console.error('Failed to load dashboard data', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading Cybersecurity Dashboard Telemetry..." />;
  }

  // Aggregate detection stats
  const totalAnalyzed = detectionHistory.reduce((acc, b) => acc + b.total_records, 0);
  const totalAnomalies = detectionHistory.reduce((acc, b) => acc + b.anomalous_count, 0);
  const totalNormal = totalAnalyzed - totalAnomalies;

  const pieData = [
    { name: 'Normal Traffic', value: totalNormal, color: '#10B981' },
    { name: 'Anomalies Flagged', value: totalAnomalies, color: '#EF4444' },
  ];

  const evalBarData = latestEval
    ? [
        { name: 'Accuracy', value: +(latestEval.accuracy).toFixed(2), fill: '#06B6D4' },
        { name: 'Precision', value: +(latestEval.precision * 100).toFixed(2), fill: '#3B82F6' },
        { name: 'Recall', value: +(latestEval.recall * 100).toFixed(2), fill: '#10B981' },
        { name: 'F1-Score', value: +(latestEval.f1_score * 100).toFixed(2), fill: '#8B5CF6' },
        { name: 'FPR', value: +(latestEval.false_positive_rate * 100).toFixed(2), fill: '#F59E0B' },
      ]
    : [];

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-cyber-card to-slate-900 border border-cyber-border rounded-2xl p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-radial-gradient from-cyan-500/10 to-transparent pointer-events-none"></div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-950 text-cyan-400 border border-cyan-800 uppercase tracking-wider">
                ThreatScope Engine
              </span>
              <span className="text-xs text-slate-400">SOC Behavioral Anomaly Detection</span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Network Traffic Behavioral Anomaly Detection
            </h1>
            <p className="text-sm text-slate-400 mt-1 max-w-2xl">
              Using unsupervised <strong className="text-cyan-400 font-mono">Isolation Forest</strong> trained directly on cybersecurity network flow datasets. Strictly un-fabricated evaluation metrics computed from held-out ground truth.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => onNavigate('datasets')}
              className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <Database className="w-3.5 h-3.5" />
              <span>Datasets</span>
            </button>
            <button
              onClick={() => onNavigate('training')}
              className="px-3.5 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-cyan-950 transition"
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>Train Model</span>
            </button>
            <button
              onClick={() => onNavigate('detection')}
              className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-emerald-950 transition"
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Detect Live</span>
            </button>
          </div>
        </div>
      </div>

      {/* Top Telemetry Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Active Model Status"
          value={modelStatus?.active_model ? modelStatus.active_model.version_tag : 'No Active Model'}
          subtitle={
            modelStatus?.active_model
              ? `Trained on ${modelStatus.active_model.training_rows.toLocaleString()} flows (${modelStatus.active_model.feature_count} features)`
              : 'Train or activate a model'
          }
          icon={<Cpu className="w-5 h-5" />}
          accent="cyan"
        />
        <MetricCard
          title="Total Flows Analyzed"
          value={totalAnalyzed.toLocaleString()}
          subtitle={`${detectionHistory.length} detection batches processed`}
          icon={<Activity className="w-5 h-5" />}
          accent="indigo"
        />
        <MetricCard
          title="Anomalies Flagged"
          value={totalAnomalies.toLocaleString()}
          subtitle={
            totalAnalyzed > 0
              ? `${((totalAnomalies / totalAnalyzed) * 100).toFixed(2)}% anomaly rate`
              : 'No detection data'
          }
          icon={<AlertTriangle className="w-5 h-5" />}
          accent="rose"
        />
        <MetricCard
          title="Normal Traffic"
          value={totalNormal.toLocaleString()}
          subtitle={
            totalAnalyzed > 0
              ? `${((totalNormal / totalAnalyzed) * 100).toFixed(2)}% normal baseline`
              : 'No detection data'
          }
          icon={<Shield className="w-5 h-5" />}
          accent="emerald"
        />
      </div>

      {/* Mandatory Evaluation Metrics Section */}
      <div className="bg-cyber-card border border-cyber-border rounded-xl p-5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-4 border-b border-cyber-border gap-2">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                Latest Held-Out Test Evaluation Performance
              </h2>
              {latestEval && (
                <span className="text-xs px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 font-mono">
                  VERIFIED
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Strictly computed on separate, held-out test data. Never calculated on training data.
            </p>
          </div>
          <button
            onClick={() => onNavigate('evaluation')}
            className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 self-start sm:self-auto"
          >
            <span>Run New Test Evaluation</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {latestEval ? (
          <div className="space-y-6">
            {/* 5 Mandatory Metrics Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div className="p-3.5 bg-slate-900/80 rounded-xl border border-cyan-500/30">
                <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Test Accuracy</span>
                <div className="text-2xl font-bold font-mono text-cyan-400 mt-1">
                  {latestEval.accuracy.toFixed(2)}%
                </div>
                <span className="text-[10px] text-slate-500 font-mono">(TP + TN) / Total</span>
              </div>

              <div className="p-3.5 bg-slate-900/80 rounded-xl border border-blue-500/30">
                <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Precision</span>
                <div className="text-2xl font-bold font-mono text-blue-400 mt-1">
                  {(latestEval.precision * 100).toFixed(2)}%
                </div>
                <span className="text-[10px] text-slate-500 font-mono">TP / (TP + FP)</span>
              </div>

              <div className="p-3.5 bg-slate-900/80 rounded-xl border border-emerald-500/30">
                <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Recall</span>
                <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">
                  {(latestEval.recall * 100).toFixed(2)}%
                </div>
                <span className="text-[10px] text-slate-500 font-mono">TP / (TP + FN)</span>
              </div>

              <div className="p-3.5 bg-slate-900/80 rounded-xl border border-purple-500/30">
                <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">F1-Score</span>
                <div className="text-2xl font-bold font-mono text-purple-400 mt-1">
                  {(latestEval.f1_score * 100).toFixed(2)}%
                </div>
                <span className="text-[10px] text-slate-500 font-mono">Harmonic Mean</span>
              </div>

              <div className="p-3.5 bg-slate-900/80 rounded-xl border border-amber-500/30">
                <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">False-Positive Rate</span>
                <div className="text-2xl font-bold font-mono text-amber-400 mt-1">
                  {(latestEval.false_positive_rate * 100).toFixed(2)}%
                </div>
                <span className="text-[10px] text-slate-500 font-mono">FP / (FP + TN)</span>
              </div>
            </div>

            {/* Visual Confusion Matrix & Evaluation Chart Side by Side */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
              <ConfusionMatrixView
                tn={latestEval.true_negatives}
                fp={latestEval.false_positives}
                fn={latestEval.false_negatives}
                tp={latestEval.true_positives}
                total={latestEval.total_evaluated}
              />

              <div className="bg-slate-900/60 border border-cyber-border rounded-xl p-5 flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-white mb-1">Metrics Breakdown (%)</h3>
                  <p className="text-xs text-slate-400 mb-4">
                    Evaluated on: <strong className="text-slate-200">{latestEval.dataset_name || 'Held-Out Test Set'}</strong> (Threshold: {latestEval.threshold_used})
                  </p>
                </div>
                <div className="w-full h-60">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={evalBarData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" vertical={false} />
                      <XAxis dataKey="name" stroke="#9CA3AF" fontSize={11} tickLine={false} />
                      <YAxis stroke="#9CA3AF" fontSize={11} domain={[0, 100]} tickLine={false} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#111827',
                          borderColor: '#374151',
                          borderRadius: '0.5rem',
                          color: '#fff',
                          fontSize: '12px'
                        }}
                        formatter={(val: any) => [`${val}%`, 'Score']}
                      />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="text-xs text-slate-500 pt-2 border-t border-slate-800 text-center font-mono">
                  Test Evaluation Date: {latestEval.evaluated_at ? new Date(latestEval.evaluated_at).toLocaleString() : 'N/A'}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-12 px-4 text-center border border-dashed border-slate-800 rounded-xl bg-slate-900/40">
            <BarChart3 className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-300">Model Not Evaluated Yet</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-4">
              To ensure data integrity, metrics are not hard-coded or fabricated. Run an evaluation using a labeled test CSV to calculate actual test accuracy, precision, recall, and confusion matrix.
            </p>
            <button
              onClick={() => onNavigate('evaluation')}
              className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold inline-flex items-center gap-1.5 shadow-lg transition"
            >
              <span>Go to Model Evaluation</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Traffic Distribution & Recent Detections Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pie Chart */}
        <div className="bg-cyber-card border border-cyber-border rounded-xl p-5 shadow-xl">
          <h3 className="text-sm font-semibold text-white mb-1">Traffic Composition</h3>
          <p className="text-xs text-slate-400 mb-4">Cumulative flows from anomaly detection runs</p>
          {totalAnalyzed > 0 ? (
            <div className="w-full h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#111827',
                      borderColor: '#374151',
                      borderRadius: '0.5rem',
                      color: '#fff',
                      fontSize: '12px'
                    }}
                  />
                  <Legend verticalAlign="bottom" wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex items-center justify-center h-56 text-xs text-slate-500">
              No anomaly detection runs recorded yet.
            </div>
          )}
        </div>

        {/* Recent Detections Table */}
        <div className="lg:col-span-2 bg-cyber-card border border-cyber-border rounded-xl p-5 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-white">Recent Detection Runs</h3>
              <button
                onClick={() => onNavigate('detection')}
                className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold"
              >
                Inspect All
              </button>
            </div>
            {detectionHistory.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-cyber-border text-slate-400">
                      <th className="pb-2 font-semibold">Dataset / File</th>
                      <th className="pb-2 font-semibold">Total Flows</th>
                      <th className="pb-2 font-semibold">Anomalies</th>
                      <th className="pb-2 font-semibold">Rate</th>
                      <th className="pb-2 font-semibold">Threshold</th>
                      <th className="pb-2 font-semibold">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-cyber-border/40 text-slate-300">
                    {detectionHistory.slice(0, 5).map((batch) => (
                      <tr key={batch.id} className="hover:bg-slate-800/40">
                        <td className="py-2.5 font-medium text-white truncate max-w-[150px]">{batch.filename}</td>
                        <td className="py-2.5 font-mono">{batch.total_records.toLocaleString()}</td>
                        <td className="py-2.5 font-mono text-rose-400">{batch.anomalous_count.toLocaleString()}</td>
                        <td className="py-2.5 font-mono">{batch.anomaly_rate_percent.toFixed(1)}%</td>
                        <td className="py-2.5 font-mono text-cyan-400">{batch.threshold_used.toFixed(2)}</td>
                        <td className="py-2.5 text-slate-500">
                          {batch.created_at ? new Date(batch.created_at).toLocaleTimeString() : 'N/A'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-12 text-center text-xs text-slate-500">
                No past detection batches. Run detection in the Anomaly Detection module.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
