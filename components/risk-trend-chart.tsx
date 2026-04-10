import { RiskTrend } from '@/lib/types';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface RiskTrendChartProps {
  data: RiskTrend[];
  height?: number;
}

export function RiskTrendChart({ data, height = 300 }: RiskTrendChartProps) {
  if (data.length === 0) {
    return (
      <div className="w-full h-96 flex items-center justify-center bg-muted rounded-lg">
        <p className="text-muted-foreground">No risk trend data available</p>
      </div>
    );
  }

  const getColor = (score: number) => {
    if (score < 40) return '#22c55e'; // Green - Low
    if (score < 70) return '#eab308'; // Yellow - Medium
    return '#ef4444'; // Red - High
  };

  // Use the color of the most recent data point
  const latestScore = data[data.length - 1].score;
  const lineColor = getColor(latestScore);

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis
          dataKey="week"
          stroke="var(--muted-foreground)"
          label={{ value: 'Week', position: 'insideBottomRight', offset: -5 }}
        />
        <YAxis
          stroke="var(--muted-foreground)"
          domain={[0, 100]}
          label={{ value: 'Risk Score', angle: -90, position: 'insideLeft' }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
          }}
          formatter={(value: number) => [`${value}/100`, 'Risk Score']}
          labelFormatter={(label) => `Week ${label}`}
        />
        <Line
          type="monotone"
          dataKey="score"
          stroke={lineColor}
          strokeWidth={3}
          dot={{ fill: lineColor, r: 5 }}
          activeDot={{ r: 7 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
