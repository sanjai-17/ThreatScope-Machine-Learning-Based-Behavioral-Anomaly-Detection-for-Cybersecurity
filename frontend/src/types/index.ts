export interface Dataset {
  id: number;
  filename: string;
  file_size_bytes: number;
  total_rows: number;
  total_columns: number;
  columns: string[];
  dtypes: Record<string, string>;
  missing_counts: Record<string, number>;
  infinite_counts: Record<string, number>;
  duplicate_rows: number;
  preview: Record<string, any>[];
  uploaded_at: string | null;
}

export interface DatasetProfile {
  id: number;
  filename: string;
  total_rows: number;
  total_columns: number;
  columns: string[];
  dtypes: Record<string, string>;
  missing_counts: Record<string, number>;
  infinite_counts: Record<string, number>;
  duplicate_rows: number;
  summary_stats: Record<string, any>;
  suggested_features: string[];
  potential_label_columns: string[];
}

export interface LabelValueCount {
  label: string;
  count: number;
  suggested_mapping: 'Normal' | 'Attack';
}

export interface TrainedModel {
  id: number;
  version_tag: string;
  is_active: boolean;
  algorithm: string;
  dataset_id: number | null;
  dataset_name: string | null;
  features: string[];
  feature_count: number;
  target_column: string | null;
  n_estimators: number;
  contamination: number;
  random_state: number;
  max_samples: string;
  training_rows: number;
  removed_rows_preprocessing: number;
  training_start_time: string | null;
  training_end_time: string | null;
  training_duration_seconds: number;
  preprocessing_meta: Record<string, any>;
  created_at: string | null;
}

export interface ModelStatus {
  has_active_model: boolean;
  active_model: TrainedModel | null;
  total_models: number;
  total_evaluations: number;
  total_detections: number;
}

export interface EvaluationMetrics {
  id: number;
  model_id: number;
  model_version: string;
  test_dataset_id: number | null;
  dataset_name: string | null;
  total_evaluated: number;
  normal_count: number;
  attack_count: number;
  true_positives: number;
  true_negatives: number;
  false_positives: number;
  false_negatives: number;
  confusion_matrix: number[][]; // [[TN, FP], [FN, TP]]
  accuracy: number;             // percentage e.g. 92.45
  precision: number;            // 0.0 to 1.0
  recall: number;               // 0.0 to 1.0
  f1_score: number;             // 0.0 to 1.0
  false_positive_rate: number;  // 0.0 to 1.0
  threshold_used: number;
  threshold_type: string;
  label_mapping: Record<string, string>;
  evaluated_at: string | null;
}

export interface DetectionItem {
  id: number;
  row_index: number;
  anomaly_score: number;
  is_anomaly: boolean;
  status: 'Normal' | 'Anomalous';
  features: Record<string, any>;
}

export interface DetectionBatch {
  id: number;
  model_id: number;
  model_version: string;
  filename: string;
  total_records: number;
  normal_count: number;
  anomalous_count: number;
  anomaly_rate_percent: number;
  threshold_used: number;
  created_at: string | null;
  items_preview: DetectionItem[];
  items_count: number;
}

export interface AnomalyScoreHistogramBin {
  bin_start: number;
  bin_end: number;
  count: number;
  anomaly_count: number;
  normal_count: number;
}

export interface ScoreDistribution {
  batch_id: number;
  min_score: number;
  max_score: number;
  mean_score: number;
  threshold: number;
  histogram: AnomalyScoreHistogramBin[];
}

export interface ThresholdComparison {
  metric_name: string;
  fixed_value: number;
  adaptive_value: number;
  difference: number;
  improvement: boolean;
}

export interface AdaptiveExperimentResult {
  model_id: number;
  model_version: string;
  validation_rows: number;
  test_rows: number;
  fixed_threshold: number;
  adaptive_threshold: number;
  optimization_objective: string;
  fixed_metrics: EvaluationMetrics;
  adaptive_metrics: EvaluationMetrics;
  comparisons: ThresholdComparison[];
  analysis_summary: string;
}
