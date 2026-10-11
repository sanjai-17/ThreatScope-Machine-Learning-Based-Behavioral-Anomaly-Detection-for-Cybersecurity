import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Dashboard } from './pages/Dashboard';
import { DatasetManagement } from './pages/DatasetManagement';
import { ModelTraining } from './pages/ModelTraining';
import { ModelEvaluation } from './pages/ModelEvaluation';
import { AnomalyDetection } from './pages/AnomalyDetection';
import { AdaptiveExperiment } from './pages/AdaptiveExperiment';
import { HistoryView } from './pages/HistoryView';
import { SettingsPage } from './pages/SettingsPage';
import { apiClient } from './api/client';
import { ModelStatus } from './types';

export function App() {
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [modelStatus, setModelStatus] = useState<ModelStatus | null>(null);
  const [backendHealthy, setBackendHealthy] = useState<boolean>(true);
  const [trainingDatasetId, setTrainingDatasetId] = useState<number | null>(null);
  const [evaluationModelId, setEvaluationModelId] = useState<number | null>(null);

  useEffect(() => {
    refreshStatus();
    const interval = setInterval(refreshStatus, 15000); // 15s heartbeat
    return () => clearInterval(interval);
  }, []);

  const refreshStatus = async () => {
    try {
      const [status, health] = await Promise.all([
        apiClient.getModelStatus(),
        apiClient.checkHealth(),
      ]);
      setModelStatus(status);
      setBackendHealthy(health?.status === 'healthy');
    } catch {
      setBackendHealthy(false);
    }
  };

  const handleNavigateToTraining = (datasetId: number) => {
    setTrainingDatasetId(datasetId);
    setCurrentTab('training');
  };

  const handleNavigateToEvaluation = (modelId: number) => {
    setEvaluationModelId(modelId);
    setCurrentTab('evaluation');
  };

  return (
    <div className="min-h-screen bg-cyber-dark text-slate-100 flex flex-col">
      {/* Header Navigation */}
      <Navbar
        currentTab={currentTab}
        setCurrentTab={(tab) => {
          setCurrentTab(tab);
          refreshStatus();
        }}
        modelStatus={modelStatus}
        backendHealthy={backendHealthy}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {currentTab === 'dashboard' && <Dashboard onNavigate={setCurrentTab} />}
        {currentTab === 'datasets' && (
          <DatasetManagement onNavigateToTraining={handleNavigateToTraining} />
        )}
        {currentTab === 'training' && (
          <ModelTraining
            initialDatasetId={trainingDatasetId}
            onNavigateToEvaluation={handleNavigateToEvaluation}
          />
        )}
        {currentTab === 'evaluation' && (
          <ModelEvaluation initialModelId={evaluationModelId} />
        )}
        {currentTab === 'detection' && <AnomalyDetection />}
        {currentTab === 'experiment' && <AdaptiveExperiment />}
        {currentTab === 'history' && <HistoryView />}
        {currentTab === 'settings' && <SettingsPage />}
      </main>

      {/* Footer */}
      <footer className="border-t border-cyber-border/80 bg-cyber-card/40 py-4 text-center text-xs text-slate-500 font-mono">
        ThreatScope v1.0 • Behavioral Anomaly Detection for Cybersecurity • Isolation Forest Only • Unsupervised ML Engine
      </footer>
    </div>
  );
}

export default App;
