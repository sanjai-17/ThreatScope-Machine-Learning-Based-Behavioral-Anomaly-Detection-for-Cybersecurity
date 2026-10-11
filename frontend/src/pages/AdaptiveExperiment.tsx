import React, { useState, useEffect } from 'react';
import {
  Sliders,
  FlaskConical,
  AlertCircle,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Info,
  RefreshCw,
  FileCheck
} from 'lucide-react';
import { apiClient } from '../api/client';
import { Dataset, ModelStatus, AdaptiveExperimentResult, LabelValueCount } from '../types';
import { ThresholdComparisonChart } from '../components/ThresholdComparisonChart';
import { LoadingSpinner } from '../components/LoadingSpinner';

export const AdaptiveExperiment: React.FC = () => {
  const [modelStatus, setModelStatus] = useState<ModelStatus | null>(null);
  const [datasets, setDatasets] = useState<Dataset[]>([]);

  // Experiment parameters
  const [valDatasetId, setValDatasetId] = useState<number | null>(null);
  const [testDatasetId, setTestDatasetId] = useState<number | null>(null);
  const [targetColumn, setTargetColumn] = useState<string>('Label');
  const [objective, setObjective] = useState<string>('f1');
  const [targetRecall, setTargetRecall] = useState<number>(0.85);

  // Label Mapping
  const [labelMapping, setLabelMapping] = useState<Record<string, string>>({});
  const [labelCounts, setLabelCounts] = useState<LabelValueCount[]>([]);

  // Experiment Execution State
  const [running, setRunning] = useState<boolean>(false);
  const [result, setResult] = useState<AdaptiveExperimentResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    loadSetup();
  }, []);

  const loadSetup = async () => {
    try {
      const [status, dsList] = await Promise.all([
        apiClient.getModelStatus(),
        apiClient.getDatasets(),
      ]);
      setModelStatus(status);
      setDatasets(dsList);

      // Auto-assign validation and test datasets if named appropriately
      const valDs = dsList.find((d) => d.filename.toLowerCase().includes('val'));
      const testDs = dsList.find((d) => d.filename.toLowerCase().includes('test'));

      if (valDs) setValDatasetId(valDs.id);
      else if (dsList.length > 0) setValDatasetId(dsList[0].id);

      if (testDs) {
        setTestDatasetId(testDs.id);
        loadLabelsForDataset(testDs.id, 'Label');
      } else if (dsList.length > 1) {
        setTestDatasetId(dsList[1].id);
        loadLabelsForDataset(dsList[1].id, 'Label');
      }
    } catch (err) {
      console.error('Failed to load experiment setup', err);
    }
  };

  const loadLabelsForDataset = async (datasetId: number, col: string) => {
    try {
      const counts = await apiClient.getLabelValues(datasetId, col);
      setLabelCounts(counts);
      const mapping: Record<string, string> = {};
      counts.forEach((c) => {
        mapping[c.label] = c.suggested_mapping;
      });
      setLabelMapping(mapping);
    } catch (err) {
      console.error('Failed to fetch labels for experiment', err);
    }
  };

  const handleRunExperiment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modelStatus?.active_model) {
      setErrorMessage('No active trained model available. Please train a model first.');
      return;
    }
    if (!valDatasetId || !testDatasetId) {
      setErrorMessage('Please select both a Validation dataset and a separate Test dataset.');
      return;
    }
    if (valDatasetId === testDatasetId) {
      setErrorMessage('Validation dataset and Test dataset must be separate to prevent evaluation leakage.');
      return;
    }

    setRunning(true);
    setErrorMessage(null);

    try {
      const res = await apiClient.runAdaptiveExperiment({
        model_id: modelStatus.active_model.id,
        validation_dataset_id: valDatasetId,
        test_dataset_id: testDatasetId,
        target_column: targetColumn,
        label_mapping: labelMapping,
        target_recall: targetRecall,
        optimization_metric: objective,
      });
      setResult(res);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.detail || 'Adaptive experiment failed.');
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="pb-4 border-b border-cyber-border">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-indigo-950 text-indigo-400 border border-indigo-800 uppercase">
            Controlled Research Experiment
          </span>
          <span className="text-xs text-slate-400">Strict Validation-Only Threshold Tuning</span>
        </div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2 mt-1">
          <FlaskConical className="w-6 h-6 text-indigo-400" />
          Adaptive Threshold vs. Fixed Threshold Experiment
        </h1>
        <p className="text-xs text-slate-400 mt-1 max-w-3xl">
          Empirically tests whether optimizing the Isolation Forest decision threshold using a dedicated validation dataset improves held-out test performance compared to the default fixed threshold (0.0). Test labels are strictly never accessed during threshold search.
        </p>
      </div>

      {/* Notifications */}
      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-rose-950/80 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Methodology Guardrails */}
      <div className="p-3.5 bg-slate-900/90 border border-indigo-500/30 rounded-xl text-xs text-slate-300 flex items-start gap-2.5 shadow-lg">
        <Info className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
        <div>
          <strong className="text-indigo-400">Experimental Protocol: </strong>
          1. Validation anomaly scores are computed. 2. Optimal cutoff is found according to objective and FROZEN. 3. Both cutoffs are evaluated on identical held-out test records. 4. Empirical differences are reported transparently without claiming artificial superiority.
        </div>
      </div>

      {/* Setup Form */}
      <form onSubmit={handleRunExperiment} className="bg-cyber-card border border-cyber-border rounded-xl p-5 shadow-xl space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Validation Dataset (Threshold Search)
            </label>
            <select
              value={valDatasetId || ''}
              onChange={(e) => setValDatasetId(Number(e.target.value))}
              disabled={running}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
            >
              {datasets.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.filename}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Held-Out Test Dataset (Final Evaluation)
            </label>
            <select
              value={testDatasetId || ''}
              onChange={(e) => {
                const id = Number(e.target.value);
                setTestDatasetId(id);
                loadLabelsForDataset(id, targetColumn);
              }}
              disabled={running}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
            >
              {datasets.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.filename}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Optimization Objective
            </label>
            <select
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
              disabled={running}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
            >
              <option value="f1">Maximize Validation F1-Score</option>
              <option value="precision_at_recall">Maximize Precision @ Recall Target</option>
              <option value="fpr_min">Minimize FPR @ Recall Target</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Target Recall ({targetRecall * 100}%)
            </label>
            <input
              type="number"
              step="0.05"
              min="0.5"
              max="0.99"
              value={targetRecall}
              onChange={(e) => setTargetRecall(Number(e.target.value))}
              disabled={running}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={running || !valDatasetId || !testDatasetId || valDatasetId === testDatasetId}
          className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-600 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-indigo-950 transition"
        >
          {running ? (
            <LoadingSpinner message="Searching optimal threshold on validation set and evaluating on test set..." />
          ) : (
            <>
              <FlaskConical className="w-4 h-4" />
              <span>Run Adaptive Threshold Experiment</span>
            </>
          )}
        </button>
      </form>

      {/* Results View */}
      {result && !running && (
        <div className="space-y-6">
          {/* Analysis Summary Card */}
          <div className="bg-cyber-card border border-indigo-500/40 rounded-xl p-5 shadow-xl space-y-3">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <FlaskConical className="w-5 h-5 text-indigo-400" />
              Empirical Findings: {result.model_version}
            </h2>
            <p className="text-xs text-slate-300 font-mono bg-slate-900/80 p-3 rounded-lg border border-slate-800">
              {result.analysis_summary}
            </p>
            <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-slate-400 pt-1">
              <span>Validation Records: <strong className="text-white">{result.validation_rows}</strong></span>
              <span>•</span>
              <span>Test Records: <strong className="text-white">{result.test_rows}</strong></span>
              <span>•</span>
              <span>Fixed Cutoff: <strong className="text-slate-300">{result.fixed_threshold.toFixed(4)}</strong></span>
              <span>•</span>
              <span>Adaptive Cutoff: <strong className="text-cyan-400">{result.adaptive_threshold.toFixed(4)}</strong></span>
            </div>
          </div>

          {/* Metric Comparison Table */}
          <div className="bg-cyber-card border border-cyber-border rounded-xl p-5 shadow-xl">
            <h3 className="text-sm font-semibold text-white mb-3">
              Performance Metric Comparison (Held-Out Test Data)
            </h3>

            <div className="overflow-x-auto border border-slate-800 rounded-lg">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-900 border-b border-slate-800 text-slate-400">
                  <tr>
                    <th className="py-2.5 px-4 font-semibold font-sans">Evaluation Metric</th>
                    <th className="py-2.5 px-4 font-semibold">Fixed Threshold (0.0)</th>
                    <th className="py-2.5 px-4 font-semibold text-cyan-400">Adaptive Threshold ({result.adaptive_threshold.toFixed(4)})</th>
                    <th className="py-2.5 px-4 font-semibold">Difference (Δ)</th>
                    <th className="py-2.5 px-4 font-semibold font-sans">Outcome</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-200">
                  {result.comparisons.map((c) => {
                    const isAcc = c.metric_name.includes('Accuracy');
                    const isFpr = c.metric_name.includes('Rate');
                    const fixStr = isAcc ? `${c.fixed_value.toFixed(2)}%` : isFpr ? `${(c.fixed_value * 100).toFixed(2)}%` : c.fixed_value.toFixed(4);
                    const adaStr = isAcc ? `${c.adaptive_value.toFixed(2)}%` : isFpr ? `${(c.adaptive_value * 100).toFixed(2)}%` : c.adaptive_value.toFixed(4);
                    const diffStr = isAcc ? `${c.difference > 0 ? '+' : ''}${c.difference.toFixed(2)}%` : `${c.difference > 0 ? '+' : ''}${c.difference.toFixed(4)}`;

                    return (
                      <tr key={c.metric_name} className="hover:bg-slate-800/40">
                        <td className="py-3 px-4 font-sans font-medium text-white">{c.metric_name}</td>
                        <td className="py-3 px-4 text-slate-400">{fixStr}</td>
                        <td className="py-3 px-4 text-cyan-400 font-bold">{adaStr}</td>
                        <td className={`py-3 px-4 font-bold ${c.improvement ? 'text-emerald-400' : 'text-slate-400'}`}>
                          {diffStr}
                        </td>
                        <td className="py-3 px-4 font-sans">
                          {c.improvement ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded">
                              <TrendingUp className="w-3 h-3" /> Improved
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded">
                              Similar / Baseline
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Visual Bar Comparison Chart */}
          <div className="bg-cyber-card border border-cyber-border rounded-xl p-5 shadow-xl">
            <h3 className="text-sm font-semibold text-white mb-2">
              Visual Metric Comparison
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Normalized comparison on the held-out test dataset across all metrics.
            </p>
            <ThresholdComparisonChart comparisons={result.comparisons} />
          </div>
        </div>
      )}
    </div>
  );
};
