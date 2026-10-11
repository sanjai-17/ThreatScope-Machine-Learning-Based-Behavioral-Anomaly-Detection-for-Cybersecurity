import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  FileCheck,
  Tag,
  Sliders,
  Shield,
  Layers,
  BarChart3,
  RefreshCw,
  Info
} from 'lucide-react';
import { apiClient } from '../api/client';
import { Dataset, ModelStatus, EvaluationMetrics, LabelValueCount } from '../types';
import { ConfusionMatrixView } from '../components/ConfusionMatrixView';
import { MetricCard } from '../components/MetricCard';
import { LoadingSpinner } from '../components/LoadingSpinner';

interface ModelEvaluationProps {
  initialModelId?: number | null;
}

export const ModelEvaluation: React.FC<ModelEvaluationProps> = ({ initialModelId }) => {
  const [modelStatus, setModelStatus] = useState<ModelStatus | null>(null);
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState<number | null>(null);
  const [targetColumn, setTargetColumn] = useState<string>('');
  const [threshold, setThreshold] = useState<number>(0.0);

  // Label Mapping
  const [labelCounts, setLabelCounts] = useState<LabelValueCount[]>([]);
  const [labelMapping, setLabelMapping] = useState<Record<string, string>>({});

  // Results
  const [evaluation, setEvaluation] = useState<EvaluationMetrics | null>(null);
  const [evaluating, setEvaluating] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      const [status, dsList, latest] = await Promise.all([
        apiClient.getModelStatus(),
        apiClient.getDatasets(),
        apiClient.getLatestEvaluation(),
      ]);
      setModelStatus(status);
      setDatasets(dsList);
      if (latest) setEvaluation(latest);

      // Default select test dataset if exists
      const testDs = dsList.find((d) => d.filename.toLowerCase().includes('test'));
      if (testDs) {
        handleTestDatasetChange(testDs);
      } else if (dsList.length > 0) {
        handleTestDatasetChange(dsList[0]);
      }
    } catch (err) {
      console.error('Failed to load evaluation setup', err);
    }
  };

  const handleTestDatasetChange = async (dataset: Dataset) => {
    setSelectedDatasetId(dataset.id);

    // Auto-detect target column
    const labelCol = dataset.columns.find((c) =>
      ['label', 'class', 'target', 'attack'].some((k) => c.toLowerCase().includes(k))
    ) || dataset.columns[dataset.columns.length - 1];

    setTargetColumn(labelCol);
    if (labelCol) {
      loadLabelValues(dataset.id, labelCol);
    }
  };

  const loadLabelValues = async (datasetId: number, colName: string) => {
    try {
      const counts = await apiClient.getLabelValues(datasetId, colName);
      setLabelCounts(counts);

      const mapping: Record<string, string> = {};
      counts.forEach((item) => {
        mapping[item.label] = item.suggested_mapping;
      });
      setLabelMapping(mapping);
    } catch (err) {
      console.error('Failed to fetch label values', err);
    }
  };

  const handleTargetColumnChange = (colName: string) => {
    setTargetColumn(colName);
    if (selectedDatasetId && colName) {
      loadLabelValues(selectedDatasetId, colName);
    }
  };

  const updateLabelMapping = (rawLabel: string, mappedValue: string) => {
    setLabelMapping((prev) => ({
      ...prev,
      [rawLabel]: mappedValue,
    }));
  };

  const handleRunEvaluation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDatasetId) {
      setErrorMessage('Please select a test dataset.');
      return;
    }
    if (!targetColumn) {
      setErrorMessage('Please specify the ground-truth label column in the test dataset.');
      return;
    }

    setEvaluating(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const result = await apiClient.evaluateModel({
        model_id: initialModelId || (modelStatus?.active_model?.id ?? null),
        test_dataset_id: selectedDatasetId,
        target_column: targetColumn,
        label_mapping: labelMapping,
        threshold: threshold,
      });

      setEvaluation(result);
      setSuccessMessage(
        `Held-out test evaluation completed: Accuracy calculated at ${result.accuracy.toFixed(2)}%!`
      );
    } catch (err: any) {
      setErrorMessage(err.response?.data?.detail || 'Test evaluation failed.');
    } finally {
      setEvaluating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="pb-4 border-b border-cyber-border">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-950 text-emerald-400 border border-emerald-800 uppercase">
            Mandatory Metric Calculation
          </span>
          <span className="text-xs text-slate-400">Strictly Calculated From Actual Test Data</span>
        </div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2 mt-1">
          <CheckCircle2 className="w-6 h-6 text-emerald-400" />
          Model Evaluation & Accuracy Verification
        </h1>
        <p className="text-xs text-slate-400 mt-1 max-w-3xl">
          Evaluates the active Isolation Forest model on a separate held-out labeled test dataset. Calculates actual accuracy, precision, recall, F1-score, false-positive rate, and confusion matrix. Metrics are never fabricated or calculated from training data.
        </p>
      </div>

      {/* Notifications */}
      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-rose-950/80 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
          <span>{errorMessage}</span>
        </div>
      )}
      {successMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-400" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Configuration Form */}
      <form onSubmit={handleRunEvaluation} className="bg-cyber-card border border-cyber-border rounded-xl p-5 shadow-xl space-y-5">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2">
          <FileCheck className="w-4 h-4 text-cyan-400" />
          1. Test Dataset & Target Configuration
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Held-Out Test Dataset
            </label>
            <select
              value={selectedDatasetId || ''}
              onChange={(e) => {
                const id = Number(e.target.value);
                const ds = datasets.find((d) => d.id === id);
                if (ds) handleTestDatasetChange(ds);
              }}
              disabled={evaluating}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
            >
              {datasets.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.filename} ({d.total_rows.toLocaleString()} flows)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Target Ground-Truth Column
            </label>
            <select
              value={targetColumn}
              onChange={(e) => handleTargetColumnChange(e.target.value)}
              disabled={evaluating}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
            >
              {datasets
                .find((d) => d.id === selectedDatasetId)
                ?.columns.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Anomaly Score Threshold
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="0.01"
                value={threshold}
                onChange={(e) => setThreshold(Number(e.target.value))}
                disabled={evaluating}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
              />
              <span className="text-[10px] text-slate-500 font-mono whitespace-nowrap">Default: 0.0</span>
            </div>
          </div>
        </div>

        {/* Explicit Label Mapping Configuration */}
        {labelCounts.length > 0 && (
          <div className="p-4 bg-slate-900/80 rounded-xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-cyan-400" />
                Explicit Label Mapping (Normal vs. Attack)
              </span>
              <span className="text-[11px] text-slate-400">
                Confirm mapping to binary classes before calculating metrics
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {labelCounts.map((item) => (
                <div
                  key={item.label}
                  className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 flex items-center justify-between"
                >
                  <div>
                    <div className="text-xs font-mono font-semibold text-slate-200">{item.label}</div>
                    <div className="text-[10px] text-slate-500 font-mono">{item.count.toLocaleString()} records</div>
                  </div>
                  <select
                    value={labelMapping[item.label] || 'Attack'}
                    onChange={(e) => updateLabelMapping(item.label, e.target.value)}
                    disabled={evaluating}
                    className="px-2 py-1 bg-slate-900 border border-slate-700 rounded text-xs text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="Normal">Normal (0)</option>
                    <option value="Attack">Attack (1)</option>
                  </select>
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={evaluating || !selectedDatasetId || !targetColumn}
          className="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-600 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-950 transition"
        >
          {evaluating ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Computing Test Metrics & Confusion Matrix...</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4" />
              <span>Run Held-Out Test Evaluation</span>
            </>
          )}
        </button>
      </form>

      {/* Evaluation Results Section */}
      {evaluating && (
        <div className="bg-cyber-card border border-cyber-border rounded-xl p-8 shadow-xl">
          <LoadingSpinner message="Transforming test flows, generating anomaly scores, and evaluating metrics..." />
        </div>
      )}

      {evaluation && !evaluating && (
        <div className="space-y-6">
          {/* Top 5 Verified Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <MetricCard
              title="Actual Accuracy"
              value={`${evaluation.accuracy.toFixed(2)}%`}
              subtitle="(TP + TN) / Total"
              icon={<CheckCircle2 className="w-5 h-5" />}
              accent="cyan"
            />
            <MetricCard
              title="Precision"
              value={`${(evaluation.precision * 100).toFixed(2)}%`}
              subtitle="TP / (TP + FP)"
              icon={<Shield className="w-5 h-5" />}
              accent="indigo"
            />
            <MetricCard
              title="Recall"
              value={`${(evaluation.recall * 100).toFixed(2)}%`}
              subtitle="TP / (TP + FN)"
              icon={<CheckCircle2 className="w-5 h-5" />}
              accent="emerald"
            />
            <MetricCard
              title="F1-Score"
              value={`${(evaluation.f1_score * 100).toFixed(2)}%`}
              subtitle="2 * (P * R) / (P + R)"
              icon={<BarChart3 className="w-5 h-5" />}
              accent="indigo"
            />
            <MetricCard
              title="False Positive Rate"
              value={`${(evaluation.false_positive_rate * 100).toFixed(2)}%`}
              subtitle="FP / (FP + TN)"
              icon={<AlertCircle className="w-5 h-5" />}
              accent="amber"
            />
          </div>

          {/* Confusion Matrix Visualizer */}
          <ConfusionMatrixView
            tn={evaluation.true_negatives}
            fp={evaluation.false_positives}
            fn={evaluation.false_negatives}
            tp={evaluation.true_positives}
            total={evaluation.total_evaluated}
          />

          {/* Audit Trail & Breakdown Table */}
          <div className="bg-cyber-card border border-cyber-border rounded-xl p-5 shadow-xl">
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <Info className="w-4 h-4 text-cyan-400" />
              Evaluation Run Audit Metadata
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono text-slate-300">
              <div>
                <span className="text-slate-500 uppercase block text-[10px]">Model Version</span>
                <span className="text-cyan-400 font-bold">{evaluation.model_version}</span>
              </div>
              <div>
                <span className="text-slate-500 uppercase block text-[10px]">Test Dataset</span>
                <span className="text-white font-bold">{evaluation.dataset_name}</span>
              </div>
              <div>
                <span className="text-slate-500 uppercase block text-[10px]">Ground Truth Counts</span>
                <span>Normal: {evaluation.normal_count} | Attack: {evaluation.attack_count}</span>
              </div>
              <div>
                <span className="text-slate-500 uppercase block text-[10px]">Evaluated Timestamp</span>
                <span>{evaluation.evaluated_at ? new Date(evaluation.evaluated_at).toLocaleString() : 'N/A'}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
