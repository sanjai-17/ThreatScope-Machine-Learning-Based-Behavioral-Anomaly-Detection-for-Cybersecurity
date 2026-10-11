import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
  Legend
} from 'recharts';
import { AnomalyScoreHistogramBin } from '../types';

interface ScoreDistributionChartProps {
  histogram: AnomalyScoreHistogramBin[];
  threshold: number;
}

export const ScoreDistributionChart: React.FC<ScoreDistributionChartProps> = ({
  histogram,
  threshold,
}) => {
  if (!histogram || histogram.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-500 text-sm">
        No score distribution data available.
      </div>
    );
  }

  const chartData = histogram.map((bin) => ({
    range: `${bin.bin_start.toFixed(2)}`,
    Normal: bin.normal_count,
    Anomalous: bin.anomaly_count,
    total: bin.count,
  }));

  return (
    <div className="w-full h-72">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" vertical={false} />
          <XAxis
            dataKey="range"
            stroke="#9CA3AF"
            fontSize={11}
            tickLine={false}
            label={{ value: 'Anomaly Score', position: 'insideBottom', offset: -10, fill: '#6B7280', fontSize: 12 }}
          />
          <YAxis
            stroke="#9CA3AF"
            fontSize={11}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#111827',
              borderColor: '#374151',
              borderRadius: '0.5rem',
              color: '#F9FAFB',
              fontSize: '12px'
            }}
          />
          <Legend
            verticalAlign="top"
            align="right"
            wrapperStyle={{ paddingBottom: '10px', fontSize: '12px' }}
          />
          <Bar dataKey="Normal" stackId="a" fill="#10B981" radius={[0, 0, 0, 0]} />
          <Bar dataKey="Anomalous" stackId="a" fill="#EF4444" radius={[4, 4, 0, 0]} />
          <ReferenceLine
            x={`${threshold.toFixed(2)}`}
            stroke="#06B6D4"
            strokeWidth={2}
            strokeDasharray="4 4"
            label={{
              value: `Threshold (${threshold.toFixed(2)})`,
              fill: '#06B6D4',
              fontSize: 11,
              position: 'top'
            }}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
