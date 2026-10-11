import React, { useState, useEffect } from 'react';
import {
  Activity,
  AlertTriangle,
  ShieldCheck,
  Download,
  Filter,
  Search,
  Upload,
  ArrowUpDown,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  BarChart2,
  Info
} from 'lucide-react';
import { apiClient } from '../api/client';
import { Dataset, ModelStatus, DetectionBatch, ScoreDistribution, DetectionItem } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { ScoreDistributionChart } from '../components/ScoreDistributionChart';
import { LoadingSpinner } from '../components/LoadingSpinner';

export const AnomalyDetection: React.FC = () => {
  const [modelStatus, setModelStatus] = useState<ModelStatus | null>(null);
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState<number | null>(null);
  const [thresholdOverride, setThresholdOverride] = useState<number>(0.0);

  // File upload state
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  // Execution & results
  const [running, setRunning] = useState<boolean>(false);
  const [currentBatch, setCurrentBatch] = useState<DetectionBatch | null>(null);
  const [distribution, setDistribution] = useState<ScoreDistribution | null>(null);

  // Table items & filters
  const [items, setItems] = useState<DetectionItem[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [sortBy, setSortBy] = useState<string>('row_index');
  const [sortDir, setSortDir] = useState<string>('asc');
  const [page, setPage] = useState<number>(0);
  const [totalFiltered, setTotalFiltered] = useState<number>(0);
  const pageSize = 25;

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    loadSetup();
  }, []);

  useEffect(() => {
    if (currentBatch) {
      loadBatchItems(currentBatch.id);
    }
  }, [currentBatch, statusFilter, sortBy, sortDir, page]);

  const loadSetup = async () => {
    try {
      const [status, dsList] = await Promise.all([
        apiClient.getModelStatus(),
        apiClient.getDatasets(),
      ]);
      setModelStatus(status);
      setDatasets(dsList);

      // Default select detect dataset if available
      const detectDs = dsList.find((d) => d.filename.toLowerCase().includes('detect'));
      if (detectDs) {
        setSelectedDatasetId(detectDs.id);
      } else if (dsList.length > 0) {
        setSelectedDatasetId(dsList[0].id);
      }
    } catch (err) {
      console.error('Failed to load detection setup', err);
    }
  };

  const handleRunDetection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modelStatus?.active_model) {
      setErrorMessage('No active trained model available. Please train or activate a model first.');
      return;
    }

    setRunning(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      let batch: DetectionBatch;
      if (uploadedFile) {
        batch = await apiClient.predictAnomalies({
          file: uploadedFile,
          threshold: thresholdOverride,
        });
      } else if (selectedDatasetId) {
        batch = await apiClient.predictAnomalies({
          dataset_id: selectedDatasetId,
          threshold: thresholdOverride,
        });
      } else {
        setErrorMessage('Select an existing dataset or upload a CSV file.');
        setRunning(false);
        return;
      }

      setCurrentBatch(batch);
      setPage(0);
      setSuccessMessage(
        `Analysis complete: Analyzed ${batch.total_records.toLocaleString()} network flows. Identified ${batch.anomalous_count} anomalous events (${batch.anomaly_rate_percent}%).`
      );

      // Load histogram distribution
      const dist = await apiClient.getScoreDistribution(batch.id);
      setDistribution(dist);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.detail || 'Detection failed.');
    } finally {
      setRunning(false);
    }
  };

  const loadBatchItems = async (batchId: number) => {
    try {
      const filterVal = statusFilter === 'All' ? undefined : statusFilter;
      const data = await apiClient.getBatchItems({
        batch_id: batchId,
        status_filter: filterVal,
        skip: page * pageSize,
        limit: pageSize,
        sort_by: sortBy,
        sort_dir: sortDir,
      });
      setItems(data.items || []);
      setTotalFiltered(data.total_filtered || 0);
    } catch (err) {
      console.error('Failed to load items', err);
    }
  };

  const handleSortToggle = (col: string) => {
    if (sortBy === col) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(col);
      setSortDir('asc');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="pb-4 border-b border-cyber-border">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-950 text-cyan-400 border border-cyan-800 uppercase">
            Live Anomaly Scoring
          </span>
          <span className="text-xs text-slate-400">Model: {modelStatus?.active_model?.version_tag || 'None'}</span>
        </div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2 mt-1">
          <Activity className="w-6 h-6 text-cyan-400" />
          Network Traffic Anomaly Detection
        </h1>
        <p className="text-xs text-slate-400 mt-1 max-w-3xl">
          Upload network traffic captures or stream registered flows through the active Isolation Forest model. Inspect anomaly scores, filter by behavioral state, and export reports.
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

      {/* Disclaimer Alert */}
      <div className="p-3.5 bg-slate-900/90 border border-amber-500/30 rounded-xl text-xs text-slate-300 flex items-start gap-2.5 shadow-lg">
        <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
        <div>
          <strong className="text-amber-400">Important Cybersecurity Note: </strong>
          Isolation Forest anomaly scores represent statistical deviations in network behavior, not calibrated attack probabilities. An anomalous flow is an outlier requiring SOC investigation, which may include novel attacks or legitimate unusual system traffic.
        </div>
      </div>

      {/* Trigger Form */}
      <form onSubmit={handleRunDetection} className="bg-cyber-card border border-cyber-border rounded-xl p-5 shadow-xl space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Select Dataset for Anomaly Scoring
            </label>
            <select
              value={selectedDatasetId || ''}
              onChange={(e) => {
                setSelectedDatasetId(Number(e.target.value));
                setUploadedFile(null);
              }}
              disabled={running || uploadedFile !== null}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-cyan-500 font-mono disabled:opacity-50"
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
              OR Upload New Traffic Capture (CSV)
            </label>
            <input
              type="file"
              accept=".csv"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) {
                  setUploadedFile(f);
                  setSelectedDatasetId(null);
                }
              }}
              disabled={running}
              className="w-full text-xs text-slate-400 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-cyan-400 hover:file:bg-slate-700 cursor-pointer"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Decision Threshold (Score Cutoff)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="0.01"
                value={thresholdOverride}
                onChange={(e) => setThresholdOverride(Number(e.target.value))}
                disabled={running}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
              />
              <span className="text-[10px] text-slate-500 font-mono whitespace-nowrap">Default: 0.0</span>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={running || !modelStatus?.has_active_model || (!selectedDatasetId && !uploadedFile)}
          className="w-full py-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-800 disabled:text-slate-600 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-cyan-950 transition"
        >
          {running ? (
            <LoadingSpinner message="Scanning flows..." />
          ) : (
            <>
              <Activity className="w-4 h-4" />
              <span>Execute Behavioral Anomaly Detection</span>
            </>
          )}
        </button>
      </form>

      {/* Detection Results & Histogram Section */}
      {currentBatch && (
        <div className="space-y-6">
          {/* Summary Banner */}
          <div className="bg-cyber-card border border-cyber-border rounded-xl p-5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>Analysis Complete: {currentBatch.filename}</span>
                <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 font-mono">
                  Batch #{currentBatch.id}
                </span>
              </h2>
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mt-1 font-mono">
                <span>Total Flows: <strong className="text-white">{currentBatch.total_records.toLocaleString()}</strong></span>
                <span>•</span>
                <span>Normal: <strong className="text-emerald-400">{currentBatch.normal_count.toLocaleString()}</strong></span>
                <span>•</span>
                <span>Anomalies: <strong className="text-rose-400">{currentBatch.anomalous_count.toLocaleString()}</strong></span>
                <span>•</span>
                <span>Threshold: <strong className="text-cyan-400">{currentBatch.threshold_used}</strong></span>
              </div>
            </div>

            <a
              href={apiClient.getExportUrl(currentBatch.id)}
              download
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-cyan-800 text-xs font-semibold flex items-center gap-1.5 transition shadow"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Predictions CSV</span>
            </a>
          </div>

          {/* Anomaly Score Distribution Histogram */}
          {distribution && (
            <div className="bg-cyber-card border border-cyber-border rounded-xl p-5 shadow-xl">
              <h3 className="text-sm font-semibold text-white mb-1 flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-cyan-400" />
                Continuous Anomaly Score Distribution
              </h3>
              <p className="text-xs text-slate-400 mb-4">
                Higher scores indicate greater deviation from learned baseline network traffic. Scores exceeding the threshold ({distribution.threshold}) are flagged as Anomalous.
              </p>
              <ScoreDistributionChart histogram={distribution.histogram} threshold={distribution.threshold} />
            </div>
          )}

          {/* Records Table with Search and Filters */}
          <div className="bg-cyber-card border border-cyber-border rounded-xl p-5 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-cyber-border gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-white">Filter Status:</span>
                {(['All', 'Anomalous', 'Normal'] as const).map((status) => (
                  <button
                    key={status}
                    onClick={() => {
                      setStatusFilter(status);
                      setPage(0);
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                      statusFilter === status
                        ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                        : 'bg-slate-900 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>

              <span className="text-xs text-slate-400 font-mono">
                Showing {totalFiltered > 0 ? page * pageSize + 1 : 0} -{' '}
                {Math.min((page + 1) * pageSize, totalFiltered)} of {totalFiltered} records
              </span>
            </div>

            {/* Table */}
            <div className="overflow-x-auto border border-slate-800 rounded-lg max-h-96">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className="bg-slate-900 sticky top-0 border-b border-slate-800 text-slate-400">
                  <tr>
                    <th
                      className="py-2.5 px-3 font-semibold cursor-pointer hover:text-white"
                      onClick={() => handleSortToggle('row_index')}
                    >
                      <div className="flex items-center gap-1">
                        <span>Record #</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th className="py-2.5 px-3 font-semibold">Predicted Status</th>
                    <th
                      className="py-2.5 px-3 font-semibold cursor-pointer hover:text-white"
                      onClick={() => handleSortToggle('anomaly_score')}
                    >
                      <div className="flex items-center gap-1">
                        <span>Anomaly Score</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th className="py-2.5 px-3 font-semibold">Key Feature Measurements</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300">
                  {items.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-800/30">
                      <td className="py-2 px-3 text-cyan-500 font-bold">{item.row_index + 1}</td>
                      <td className="py-2 px-3">
                        <StatusBadge status={item.status} size="sm" />
                      </td>
                      <td className={`py-2 px-3 font-bold ${item.is_anomaly ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {item.anomaly_score.toFixed(4)}
                      </td>
                      <td className="py-2 px-3 text-slate-400 font-sans text-[11px] truncate max-w-md">
                        {Object.entries(item.features)
                          .slice(0, 4)
                          .map(([k, v]) => `${k}: ${v !== null ? v : 'null'}`)
                          .join(' | ')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="px-3 py-1.5 rounded bg-slate-900 border border-slate-800 text-xs text-slate-300 disabled:opacity-40"
              >
                Previous Page
              </button>
              <span className="text-xs text-slate-500 font-mono">
                Page {page + 1} of {Math.max(1, Math.ceil(totalFiltered / pageSize))}
              </span>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={(page + 1) * pageSize >= totalFiltered}
                className="px-3 py-1.5 rounded bg-slate-900 border border-slate-800 text-xs text-slate-300 disabled:opacity-40"
              >
                Next Page
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
