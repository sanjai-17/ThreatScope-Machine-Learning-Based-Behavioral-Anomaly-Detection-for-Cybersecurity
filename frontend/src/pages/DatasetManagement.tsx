import React, { useState, useEffect } from 'react';
import {
  Upload,
  Database,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Info,
  ChevronRight,
  Eye,
  BarChart2
} from 'lucide-react';
import { apiClient } from '../api/client';
import { Dataset, DatasetProfile } from '../types';
import { LoadingSpinner } from '../components/LoadingSpinner';

interface DatasetManagementProps {
  onDatasetSelect?: (dataset: Dataset) => void;
  onNavigateToTraining?: (datasetId: number) => void;
}

export const DatasetManagement: React.FC<DatasetManagementProps> = ({
  onNavigateToTraining,
}) => {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [selectedDataset, setSelectedDataset] = useState<Dataset | null>(null);
  const [profile, setProfile] = useState<DatasetProfile | null>(null);
  const [previewRecords, setPreviewRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchDatasets();
  }, []);

  const fetchDatasets = async () => {
    try {
      const data = await apiClient.getDatasets();
      setDatasets(data);
      if (data.length > 0 && !selectedDataset) {
        selectDataset(data[0]);
      }
    } catch (err: any) {
      console.error('Failed to load datasets', err);
    }
  };

  const selectDataset = async (dataset: Dataset) => {
    setSelectedDataset(dataset);
    setLoading(true);
    setErrorMessage(null);
    try {
      const [profData, prevData] = await Promise.all([
        apiClient.getDatasetProfile(dataset.id),
        apiClient.getDatasetPreview(dataset.id, 20),
      ]);
      setProfile(profData);
      setPreviewRecords(prevData.records || []);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.detail || 'Failed to inspect dataset');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.csv')) {
      setErrorMessage('Invalid file format. Please upload a CSV file (.csv).');
      return;
    }

    setUploading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const uploaded = await apiClient.uploadDataset(file);
      setSuccessMessage(`Dataset "${uploaded.filename}" uploaded and analyzed successfully.`);
      await fetchDatasets();
      selectDataset(uploaded);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.detail || 'Upload failed. Ensure CSV format is valid.');
    } finally {
      setUploading(false);
      // Reset input
      e.target.value = '';
    }
  };

  const handleGenerateSamples = async () => {
    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const res = await apiClient.generateSampleDatasets();
      setSuccessMessage('Standard CIC-IDS2017 & UNSW-NB15 flow datasets generated and registered!');
      await fetchDatasets();
      if (res.datasets && res.datasets.length > 0) {
        selectDataset(res.datasets[0]);
      }
    } catch (err: any) {
      setErrorMessage(err.response?.data?.detail || 'Failed to generate sample datasets');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-cyber-border gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <Database className="w-6 h-6 text-cyan-400" />
            Dataset Upload and Quality Management
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Upload CSV captures (compatible with CIC-IDS2017, UNSW-NB15), inspect missing/inf values, and review feature profiles.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleGenerateSamples}
            disabled={loading || uploading}
            className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-cyan-800/60 text-xs font-semibold flex items-center gap-1.5 transition shadow"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Load Sample Datasets</span>
          </button>

          <label className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-lg shadow-cyan-950 transition">
            <Upload className="w-3.5 h-3.5" />
            <span>{uploading ? 'Analyzing CSV...' : 'Upload New CSV'}</span>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              disabled={uploading}
              className="hidden"
            />
          </label>
        </div>
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

      {/* Main Grid: Dataset List + Details Profile */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Datasets List */}
        <div className="bg-cyber-card border border-cyber-border rounded-xl p-4 shadow-xl">
          <h2 className="text-sm font-semibold text-white mb-3 flex items-center justify-between">
            <span>Available Datasets</span>
            <span className="text-xs font-mono text-cyan-400 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-800">
              {datasets.length} files
            </span>
          </h2>

          {datasets.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-lg">
              No datasets uploaded yet. Click "Load Sample Datasets" or upload your CSV.
            </div>
          ) : (
            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
              {datasets.map((d) => {
                const isSelected = selectedDataset?.id === d.id;
                return (
                  <div
                    key={d.id}
                    onClick={() => selectDataset(d)}
                    className={`p-3 rounded-lg border cursor-pointer transition flex items-center justify-between ${
                      isSelected
                        ? 'bg-cyan-950/50 border-cyan-500/50 text-white'
                        : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="truncate mr-2">
                      <div className="font-semibold text-xs truncate flex items-center gap-1.5">
                        <FileSpreadsheet className={`w-3.5 h-3.5 ${isSelected ? 'text-cyan-400' : 'text-slate-400'}`} />
                        <span>{d.filename}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1 font-mono">
                        {d.total_rows.toLocaleString()} rows • {d.total_columns} columns
                      </div>
                    </div>
                    <ChevronRight className={`w-4 h-4 flex-shrink-0 ${isSelected ? 'text-cyan-400' : 'text-slate-600'}`} />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Dataset Quality & Profile Inspection */}
        <div className="lg:col-span-2 space-y-6">
          {selectedDataset ? (
            <>
              {/* Quality Overview Cards */}
              <div className="bg-cyber-card border border-cyber-border rounded-xl p-5 shadow-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-4 border-b border-cyber-border gap-2">
                  <div>
                    <h2 className="text-base font-bold text-white flex items-center gap-2">
                      <span>{selectedDataset.filename}</span>
                      <span className="text-[11px] font-mono text-cyan-400 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-800">
                        {(selectedDataset.file_size_bytes / 1024).toFixed(1)} KB
                      </span>
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Uploaded on {selectedDataset.uploaded_at ? new Date(selectedDataset.uploaded_at).toLocaleString() : 'N/A'}
                    </p>
                  </div>
                  {onNavigateToTraining && (
                    <button
                      onClick={() => onNavigateToTraining(selectedDataset.id)}
                      className="px-3.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center gap-1.5 transition self-start sm:self-auto"
                    >
                      <span>Train Isolation Forest with this Dataset</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Quality Metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
                    <span className="text-[11px] text-slate-400 uppercase font-semibold">Total Records</span>
                    <div className="text-lg font-bold font-mono text-white mt-0.5">
                      {selectedDataset.total_rows.toLocaleString()}
                    </div>
                  </div>
                  <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
                    <span className="text-[11px] text-slate-400 uppercase font-semibold">Total Features</span>
                    <div className="text-lg font-bold font-mono text-cyan-400 mt-0.5">
                      {selectedDataset.total_columns}
                    </div>
                  </div>
                  <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
                    <span className="text-[11px] text-slate-400 uppercase font-semibold">Duplicate Rows</span>
                    <div className={`text-lg font-bold font-mono mt-0.5 ${selectedDataset.duplicate_rows > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                      {selectedDataset.duplicate_rows}
                    </div>
                  </div>
                  <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
                    <span className="text-[11px] text-slate-400 uppercase font-semibold">Suggested Features</span>
                    <div className="text-lg font-bold font-mono text-emerald-400 mt-0.5">
                      {profile?.suggested_features.length ?? 0}
                    </div>
                  </div>
                </div>

                {/* Potential Label Columns Info */}
                {profile?.potential_label_columns && profile.potential_label_columns.length > 0 && (
                  <div className="mt-4 p-3 bg-cyan-950/30 border border-cyan-800/40 rounded-lg text-xs text-slate-300 flex items-start gap-2">
                    <Info className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-cyan-400">Detected Potential Ground-Truth Label Columns: </strong>
                      <span className="font-mono text-slate-200">{profile.potential_label_columns.join(', ')}</span>.
                      <span className="text-slate-400 ml-1">
                        These will be strictly excluded from model feature inputs during training to prevent target leakage.
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Column-by-Column Profiling Table */}
              <div className="bg-cyber-card border border-cyber-border rounded-xl p-5 shadow-xl">
                <h3 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
                  <BarChart2 className="w-4 h-4 text-cyan-400" />
                  Feature Columns & Data Quality Profile
                </h3>
                <p className="text-xs text-slate-400 mb-4">
                  Sanitization checks: missing values, positive/negative infinities, and data types.
                </p>

                <div className="overflow-x-auto max-h-72 border border-slate-800 rounded-lg">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-900 sticky top-0 border-b border-slate-800 text-slate-400">
                      <tr>
                        <th className="py-2.5 px-3 font-semibold">Column Name</th>
                        <th className="py-2.5 px-3 font-semibold">Data Type</th>
                        <th className="py-2.5 px-3 font-semibold">Missing (NaN)</th>
                        <th className="py-2.5 px-3 font-semibold">Infinite (±Inf)</th>
                        <th className="py-2.5 px-3 font-semibold">Role Recommendation</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300">
                      {selectedDataset.columns.map((col) => {
                        const dtype = selectedDataset.dtypes[col] || 'unknown';
                        const missingCount = selectedDataset.missing_counts[col] || 0;
                        const infCount = selectedDataset.infinite_counts[col] || 0;
                        const isLabel = profile?.potential_label_columns.includes(col);
                        const isSuggested = profile?.suggested_features.includes(col);

                        return (
                          <tr key={col} className="hover:bg-slate-800/40">
                            <td className="py-2 px-3 font-sans font-medium text-white">{col}</td>
                            <td className="py-2 px-3 text-slate-400 text-[11px]">{dtype}</td>
                            <td className={`py-2 px-3 ${missingCount > 0 ? 'text-amber-400 font-bold' : 'text-slate-500'}`}>
                              {missingCount}
                            </td>
                            <td className={`py-2 px-3 ${infCount > 0 ? 'text-rose-400 font-bold' : 'text-slate-500'}`}>
                              {infCount}
                            </td>
                            <td className="py-2 px-3 font-sans">
                              {isLabel ? (
                                <span className="px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800 text-[10px]">
                                  Ground Truth Label
                                </span>
                              ) : isSuggested ? (
                                <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px]">
                                  Numerical Feature
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 text-[10px]">
                                  Metadata / Categorical
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

              {/* Data Preview Table (First 20 Records) */}
              <div className="bg-cyber-card border border-cyber-border rounded-xl p-5 shadow-xl">
                <h3 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
                  <Eye className="w-4 h-4 text-cyan-400" />
                  Dataset Preview (First {previewRecords.length} Records)
                </h3>
                <p className="text-xs text-slate-400 mb-4">
                  Raw flow records from uploaded CSV.
                </p>

                {previewRecords.length > 0 ? (
                  <div className="overflow-x-auto max-h-80 border border-slate-800 rounded-lg">
                    <table className="w-full text-left text-xs whitespace-nowrap">
                      <thead className="bg-slate-900 sticky top-0 border-b border-slate-800 text-slate-400">
                        <tr>
                          <th className="py-2 px-3 font-semibold text-cyan-400">#</th>
                          {selectedDataset.columns.map((col) => (
                            <th key={col} className="py-2 px-3 font-semibold">{col}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300">
                        {previewRecords.map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-800/30">
                            <td className="py-1.5 px-3 text-cyan-500 font-bold">{idx + 1}</td>
                            {selectedDataset.columns.map((col) => (
                              <td key={col} className="py-1.5 px-3">
                                {row[col] !== null && row[col] !== undefined ? String(row[col]) : <span className="text-slate-600">null</span>}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="py-8 text-center text-xs text-slate-500">
                    No preview records available.
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="bg-cyber-card border border-cyber-border rounded-xl p-12 text-center text-slate-500 shadow-xl">
              <Database className="w-12 h-12 mx-auto mb-3 text-slate-600" />
              Select a dataset from the left panel or upload a new network traffic capture to inspect quality and records.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
