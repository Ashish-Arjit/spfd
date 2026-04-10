import { RiskLevel } from '@/lib/types';

export function getRiskLevel(score: number): RiskLevel {
  if (score < 40) {
    return { level: 'low', score };
  } else if (score < 70) {
    return { level: 'medium', score };
  } else {
    return { level: 'high', score };
  }
}

interface RiskLevelBadgeProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
}

export function RiskLevelBadge({ score, size = 'md' }: RiskLevelBadgeProps) {
  const risk = getRiskLevel(score);

  const colorMap = {
    low: 'bg-green-500/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-700',
    medium: 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-700',
    high: 'bg-red-500/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-700',
  };

  const sizeMap = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base',
  };

  const labelMap = {
    low: 'Low Risk',
    medium: 'Medium Risk',
    high: 'High Risk',
  };

  return (
    <div className={`inline-flex items-center border rounded-lg font-medium ${colorMap[risk.level]} ${sizeMap[size]}`}>
      <span className="mr-1">●</span>
      {labelMap[risk.level]}
    </div>
  );
}
