import axios from 'axios';
import {
  Dataset,
  DatasetProfile,
  LabelValueCount,
  TrainedModel,
  ModelStatus,
  EvaluationMetrics,
  DetectionBatch,
  ScoreDistribution,
  AdaptiveExperimentResult
} from '../types';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

export const apiClient = {
  // Datasets
  async getDatasets(): Promise<Dataset[]> {
    const res = await api.get<Dataset[]>('/datasets');
    return res.data;
  },

  async getDataset(id: number): Promise<Dataset> {
    const res = await api.get<Dataset>(`/datasets/${id}`);
    return res.data;
  },

  async uploadDataset(file: File): Promise<Dataset> {
    const formData = new FormData();
    formData.append('file', file);
    const res = await api.post<Dataset>('/datasets/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  async getDatasetProfile(id: number): Promise<DatasetProfile> {
    const res = await api.get<DatasetProfile>(`/datasets/${id}/profile`);
    return res.data;
  },

  async getDatasetPreview(id: number, limit = 20): Promise<any> {
    const res = await api.get(`/datasets/${id}/preview?limit=${limit}`);
    return res.data;
  },

  async getLabelValues(id: number, column: string): Promise<LabelValueCount[]> {
    const res = await api.get<LabelValueCount[]>(`/datasets/${id}/label-values?column=${encodeURIComponent(column)}`);
    return res.data;
  },

  async generateSampleDatasets(): Promise<{ message: string; datasets: Dataset[] }> {
    const res = await api.post('/datasets/generate-sample');
    return res.data;
  },

  // Model
  async trainModel(params: {
    dataset_id: number;
    features: string[];
    target_column?: string | null;
    version_tag?: string;
    n_estimators?: number;
    contamination?: number;
    random_state?: number;
  }): Promise<TrainedModel> {
    const res = await api.post<TrainedModel>('/model/train', params);
    return res.data;
  },

  async getModelStatus(): Promise<ModelStatus> {
    const res = await api.get<ModelStatus>('/model/status');
    return res.data;
  },

  async getModelHistory(): Promise<TrainedModel[]> {
    const res = await api.get<TrainedModel[]>('/model/history');
    return res.data;
  },

  async activateModel(id: number): Promise<TrainedModel> {
    const res = await api.post<TrainedModel>(`/model/${id}/activate`);
    return res.data;
  },

  // Evaluation
  async evaluateModel(params: {
    model_id?: number | null;
    test_dataset_id: number;
    target_column: string;
    label_mapping: Record<string, string>;
    threshold?: number | null;
  }): Promise<EvaluationMetrics> {
    const res = await api.post<EvaluationMetrics>('/evaluation/run', params);
    return res.data;
  },

  async getLatestEvaluation(): Promise<EvaluationMetrics | null> {
    const res = await api.get<EvaluationMetrics | null>('/evaluation/latest');
    return res.data;
  },

  async getEvaluationHistory(modelId?: number): Promise<EvaluationMetrics[]> {
    const url = modelId ? `/evaluation/history?model_id=${modelId}` : '/evaluation/history';
    const res = await api.get<EvaluationMetrics[]>(url);
    return res.data;
  },

  // Detection
  async predictAnomalies(options: {
    dataset_id?: number;
    threshold?: number;
    file?: File;
  }): Promise<DetectionBatch> {
    if (options.file) {
      const formData = new FormData();
      formData.append('file', options.file);
      const params = new URLSearchParams();
      if (options.threshold !== undefined) params.append('threshold', options.threshold.toString());
      const res = await api.post<DetectionBatch>(`/detection/predict?${params.toString()}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data;
    } else {
      const params = new URLSearchParams();
      if (options.dataset_id) params.append('dataset_id', options.dataset_id.toString());
      if (options.threshold !== undefined) params.append('threshold', options.threshold.toString());
      const res = await api.post<DetectionBatch>(`/detection/predict?${params.toString()}`);
      return res.data;
    }
  },

  async getDetectionHistory(): Promise<DetectionBatch[]> {
    const res = await api.get<DetectionBatch[]>('/detection/history');
    return res.data;
  },

  async getBatchItems(params: {
    batch_id: number;
    status_filter?: string;
    skip?: number;
    limit?: number;
    sort_by?: string;
    sort_dir?: string;
  }): Promise<any> {
    const p = new URLSearchParams();
    if (params.status_filter) p.append('status_filter', params.status_filter);
    if (params.skip !== undefined) p.append('skip', params.skip.toString());
    if (params.limit !== undefined) p.append('limit', params.limit.toString());
    if (params.sort_by) p.append('sort_by', params.sort_by);
    if (params.sort_dir) p.append('sort_dir', params.sort_dir);
    const res = await api.get(`/detection/batch/${params.batch_id}/items?${p.toString()}`);
    return res.data;
  },

  async getScoreDistribution(batchId: number): Promise<ScoreDistribution> {
    const res = await api.get<ScoreDistribution>(`/detection/batch/${batchId}/distribution`);
    return res.data;
  },

  getExportUrl(batchId: number): string {
    return `/api/detection/batch/${batchId}/export`;
  },

  // Adaptive Threshold Experiment
  async runAdaptiveExperiment(params: {
    model_id?: number | null;
    validation_dataset_id: number;
    test_dataset_id: number;
    target_column: string;
    label_mapping: Record<string, string>;
    target_recall?: number;
    optimization_metric?: string;
  }): Promise<AdaptiveExperimentResult> {
    const res = await api.post<AdaptiveExperimentResult>('/experiment/adaptive-threshold', params);
    return res.data;
  },

  // Health
  async checkHealth(): Promise<any> {
    const res = await api.get('/health');
    return res.data;
  }
};
