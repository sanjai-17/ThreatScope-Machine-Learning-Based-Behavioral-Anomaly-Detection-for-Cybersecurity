import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from 'recharts';
import { ThresholdComparison } from '../types';

interface ThresholdComparisonChartProps {
  comparisons: ThresholdComparison[];
}

export const ThresholdComparisonChart: React.FC<ThresholdComparisonChartProps> = ({
  comparisons,
}) => {
  if (!comparisons || comparisons.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-500 text-sm">
        No comparison data available.
      </div>
    );
  }

  const chartData = comparisons.map((c) => ({
    metric: c.metric_name.replace(' (%)', ''),
    'Fixed Threshold': c.metric_name.includes('Accuracy') ? +(c.fixed_value / 100).toFixed(4) : c.fixed_value,
    'Adaptive Threshold': c.metric_name.includes('Accuracy') ? +(c.adaptive_value / 100).toFixed(4) : c.adaptive_value,
  }));

  return (
    <div className="w-full h-80">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" vertical={false} />
          <XAxis dataKey="metric" stroke="#9CA3AF" fontSize={12} tickLine={false} />
          <YAxis stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} domain={[0, 1]} />
          <Tooltip
            contentStyle={{
              backgroundColor: '#111827',
              borderColor: '#374151',
              borderRadius: '0.5rem',
              color: '#F9FAFB',
              fontSize: '12px'
            }}
            formatter={(value: any) => [typeof value === 'number' ? value.toFixed(4) : value, '']}
          />
          <Legend verticalAlign="top" align="right" wrapperStyle={{ paddingBottom: '12px', fontSize: '12px' }} />
          <Bar dataKey="Fixed Threshold" fill="#6B7280" radius={[4, 4, 0, 0]} />
          <Bar dataKey="Adaptive Threshold" fill="#06B6D4" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
