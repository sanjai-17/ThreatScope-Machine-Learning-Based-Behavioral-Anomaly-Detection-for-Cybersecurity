import React, { useState, useEffect } from 'react';
import {
  Cpu,
  Sliders,
  CheckSquare,
  Square,
  AlertCircle,
  CheckCircle2,
  Clock,
  Layers,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  FolderLock
} from 'lucide-react';
import { apiClient } from '../api/client';
import { Dataset, TrainedModel } from '../types';
import { LoadingSpinner } from '../components/LoadingSpinner';

interface ModelTrainingProps {
  initialDatasetId?: number | null;
  onNavigateToEvaluation?: (modelId: number) => void;
}

export const ModelTraining: React.FC<ModelTrainingProps> = ({
  initialDatasetId,
  onNavigateToEvaluation,
}) => {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState<number | null>(initialDatasetId || null);
  const [selectedDataset, setSelectedDataset] = useState<Dataset | null>(null);

  // Hyperparameters
  const [nEstimators, setNEstimators] = useState<number>(100);
  const [contamination, setContamination] = useState<number>(0.05);
  const [randomSeed, setRandomSeed] = useState<number>(42);
  const [versionTag, setVersionTag] = useState<string>('');

  // Feature Selection & Target Exclusion
  const [targetColumn, setTargetColumn] = useState<string>('');
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);

  // State
  const [training, setTraining] = useState<boolean>(false);
  const [latestTrained, setLatestTrained] = useState<TrainedModel | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    loadDatasets();
  }, []);

  useEffect(() => {
    if (selectedDatasetId && datasets.length > 0) {
      const found = datasets.find((d) => d.id === selectedDatasetId);
      if (found) {
        handleDatasetChange(found);
      }
    }
  }, [selectedDatasetId, datasets]);

  const loadDatasets = async () => {
    try {
      const data = await apiClient.getDatasets();
      setDatasets(data);
      if (data.length > 0 && !selectedDatasetId) {
        handleDatasetChange(data[0]);
      }
    } catch (err) {
      console.error('Failed to load datasets', err);
    }
  };

  const handleDatasetChange = (dataset: Dataset) => {
    setSelectedDataset(dataset);
    setSelectedDatasetId(dataset.id);

    // Auto-detect target column (e.g. 'Label' or 'class')
    const potentialLabel = dataset.columns.find((c) =>
      ['label', 'class', 'target', 'attack'].some((k) => c.toLowerCase().includes(k))
    );
    const labelCol = potentialLabel || '';
    setTargetColumn(labelCol);

    // Initial feature selection: all columns except target label
    const initialFeatures = dataset.columns.filter((c) => c !== labelCol);
    setSelectedFeatures(initialFeatures);

    // Suggest default version tag
    setVersionTag(`ThreatScope-IF-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`);
  };

  const toggleFeature = (col: string) => {
    if (selectedFeatures.includes(col)) {
      setSelectedFeatures(selectedFeatures.filter((c) => c !== col));
    } else {
      setSelectedFeatures([...selectedFeatures, col]);
    }
  };

  const selectAllFeatures = () => {
    if (!selectedDataset) return;
    const allExceptTarget = selectedDataset.columns.filter((c) => c !== targetColumn);
    setSelectedFeatures(allExceptTarget);
  };

  const deselectAllFeatures = () => {
    setSelectedFeatures([]);
  };

  const handleTrain = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDatasetId) {
      setErrorMessage('Please select a dataset to train on.');
      return;
    }
    if (selectedFeatures.length === 0) {
      setErrorMessage('You must select at least one feature column for training.');
      return;
    }

    setTraining(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    setLatestTrained(null);

    try {
      const model = await apiClient.trainModel({
        dataset_id: selectedDatasetId,
        features: selectedFeatures,
        target_column: targetColumn || null,
        version_tag: versionTag.trim() || undefined,
        n_estimators: nEstimators,
        contamination: contamination,
        random_state: randomSeed,
      });

      setLatestTrained(model);
      setSuccessMessage(
        `Isolation Forest model (${model.version_tag}) trained successfully in ${model.training_duration_seconds}s!`
      );
    } catch (err: any) {
      setErrorMessage(err.response?.data?.detail || 'Model training failed.');
    } finally {
      setTraining(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="pb-4 border-b border-cyber-border">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-950 text-cyan-400 border border-cyan-800 uppercase">
            From Scratch Training
          </span>
          <span className="text-xs text-slate-400">Pure Scikit-Learn Isolation Forest</span>
        </div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2 mt-1">
          <Cpu className="w-6 h-6 text-cyan-400" />
          Train Isolation Forest Model
        </h1>
        <p className="text-xs text-slate-400 mt-1 max-w-3xl">
          Trains an unsupervised Isolation Forest model on your selected network traffic flows. Target labels and attack categories are strictly excluded from model inputs. Artifacts are versioned and stored using Joblib.
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

      {/* Form Grid */}
      <form onSubmit={handleTrain} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Dataset & Hyperparameters */}
        <div className="space-y-6">
          {/* Dataset Selector Card */}
          <div className="bg-cyber-card border border-cyber-border rounded-xl p-5 shadow-xl space-y-4">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-400" />
              1. Training Dataset & Target Exclusion
            </h2>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Select Training Dataset</label>
              <select
                value={selectedDatasetId || ''}
                onChange={(e) => {
                  const id = Number(e.target.value);
                  const found = datasets.find((d) => d.id === id);
                  if (found) handleDatasetChange(found);
                }}
                disabled={training}
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
                Target / Ground-Truth Label Column
                <span className="text-slate-500 text-[11px] ml-1">(Excluded from model)</span>
              </label>
              <select
                value={targetColumn}
                onChange={(e) => {
                  const newTarget = e.target.value;
                  setTargetColumn(newTarget);
                  // Remove from selected features
                  setSelectedFeatures(selectedFeatures.filter((f) => f !== newTarget));
                }}
                disabled={training}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
              >
                <option value="">None (Unlabeled traffic capture)</option>
                {selectedDataset?.columns.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Model Version Tag</label>
              <input
                type="text"
                value={versionTag}
                onChange={(e) => setVersionTag(e.target.value)}
                placeholder="e.g. ThreatScope-IF-v1"
                disabled={training}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
              />
            </div>
          </div>

          {/* Hyperparameters Card */}
          <div className="bg-cyber-card border border-cyber-border rounded-xl p-5 shadow-xl space-y-4">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-cyan-400" />
              2. Isolation Forest Hyperparameters
            </h2>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-300 font-medium">Number of Estimators (Trees)</span>
                <span className="font-mono text-cyan-400">{nEstimators}</span>
              </div>
              <input
                type="range"
                min="20"
                max="500"
                step="10"
                value={nEstimators}
                onChange={(e) => setNEstimators(Number(e.target.value))}
                disabled={training}
                className="w-full accent-cyan-400"
              />
              <span className="text-[10px] text-slate-500">Number of base isolation trees in the ensemble.</span>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-300 font-medium">Contamination Parameter</span>
                <span className="font-mono text-cyan-400">{contamination.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0.01"
                max="0.30"
                step="0.01"
                value={contamination}
                onChange={(e) => setContamination(Number(e.target.value))}
                disabled={training}
                className="w-full accent-cyan-400"
              />
              <span className="text-[10px] text-slate-500">Expected proportion of anomalous outliers in training traffic.</span>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Random Seed (Reproducibility)</label>
              <input
                type="number"
                value={randomSeed}
                onChange={(e) => setRandomSeed(Number(e.target.value))}
                disabled={training}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
              />
            </div>

            <button
              type="submit"
              disabled={training || !selectedDatasetId || selectedFeatures.length === 0}
              className="w-full py-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-800 disabled:text-slate-600 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-cyan-950 transition"
            >
              {training ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Fitting Isolation Forest...</span>
                </>
              ) : (
                <>
                  <Cpu className="w-4 h-4" />
                  <span>Start Model Training</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Columns: Feature Selection Checkboxes & Training Results */}
        <div className="lg:col-span-2 space-y-6">
          {/* Feature Selector */}
          <div className="bg-cyber-card border border-cyber-border rounded-xl p-5 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-3 border-b border-cyber-border gap-2">
              <div>
                <h2 className="text-sm font-semibold text-white">
                  3. Feature Selection ({selectedFeatures.length} / {selectedDataset?.columns.filter(c => c !== targetColumn).length || 0} selected)
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Select network flow metrics to feed into the Isolation Forest.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={selectAllFeatures}
                  disabled={training}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 transition"
                >
                  Select All
                </button>
                <button
                  type="button"
                  onClick={deselectAllFeatures}
                  disabled={training}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 transition"
                >
                  Deselect All
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-80 overflow-y-auto pr-1">
              {selectedDataset?.columns
                .filter((col) => col !== targetColumn)
                .map((col) => {
                  const isChecked = selectedFeatures.includes(col);
                  return (
                    <div
                      key={col}
                      onClick={() => !training && toggleFeature(col)}
                      className={`p-2 rounded-lg border cursor-pointer text-xs flex items-center justify-between transition ${
                        isChecked
                          ? 'bg-cyan-950/40 border-cyan-500/40 text-cyan-300'
                          : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <span className="truncate mr-2 font-mono">{col}</span>
                      {isChecked ? (
                        <CheckSquare className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-600 flex-shrink-0" />
                      )}
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Training Results Card */}
          {training && (
            <div className="bg-cyber-card border border-cyan-500/40 rounded-xl p-8 shadow-xl">
              <LoadingSpinner message="Pre-processing data, scaling features, and fitting Isolation Forest trees..." />
            </div>
          )}

          {latestTrained && !training && (
            <div className="bg-gradient-to-br from-cyber-card to-slate-900 border border-emerald-500/40 rounded-xl p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-cyber-border">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-6 h-6 text-emerald-400" />
                  <div>
                    <h3 className="text-base font-bold text-white">
                      Model Trained Successfully: {latestTrained.version_tag}
                    </h3>
                    <p className="text-xs text-slate-400">
                      Artifact saved and registered as current active model
                    </p>
                  </div>
                </div>

                {onNavigateToEvaluation && (
                  <button
                    type="button"
                    onClick={() => onNavigateToEvaluation(latestTrained.id)}
                    className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-emerald-950 transition"
                  >
                    <span>Proceed to Test Evaluation</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Training Telemetry */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 bg-slate-900/80 rounded-lg border border-slate-800">
                  <span className="text-slate-400 uppercase font-semibold text-[10px]">Training Records</span>
                  <div className="text-lg font-bold font-mono text-white mt-0.5">
                    {latestTrained.training_rows.toLocaleString()}
                  </div>
                </div>
                <div className="p-3 bg-slate-900/80 rounded-lg border border-slate-800">
                  <span className="text-slate-400 uppercase font-semibold text-[10px]">Features Fitted</span>
                  <div className="text-lg font-bold font-mono text-cyan-400 mt-0.5">
                    {latestTrained.feature_count}
                  </div>
                </div>
                <div className="p-3 bg-slate-900/80 rounded-lg border border-slate-800">
                  <span className="text-slate-400 uppercase font-semibold text-[10px]">Training Duration</span>
                  <div className="text-lg font-bold font-mono text-emerald-400 mt-0.5">
                    {latestTrained.training_duration_seconds}s
                  </div>
                </div>
                <div className="p-3 bg-slate-900/80 rounded-lg border border-slate-800">
                  <span className="text-slate-400 uppercase font-semibold text-[10px]">Contamination</span>
                  <div className="text-lg font-bold font-mono text-amber-400 mt-0.5">
                    {latestTrained.contamination}
                  </div>
                </div>
              </div>

              <div className="text-xs text-slate-400 bg-slate-900/50 p-3 rounded-lg border border-slate-800 font-mono space-y-1">
                <div>Algorithm: <span className="text-white">scikit-learn IsolationForest</span></div>
                <div>Trees: <span className="text-white">{latestTrained.n_estimators} estimators</span> | Random Seed: <span className="text-white">{latestTrained.random_state}</span></div>
                <div>Started: <span className="text-white">{latestTrained.training_start_time ? new Date(latestTrained.training_start_time).toLocaleTimeString() : 'N/A'}</span> | Finished: <span className="text-white">{latestTrained.training_end_time ? new Date(latestTrained.training_end_time).toLocaleTimeString() : 'N/A'}</span></div>
              </div>
            </div>
          )}
        </div>
      </form>
    </div>
  );
};
