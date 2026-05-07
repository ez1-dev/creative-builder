import { Card, CardContent } from '@/components/ui/card';
import { SparklineCard } from '../charts/SparklineCard';
import { formatCurrency, formatNumber } from '../utils/formatters';
import { TrendingUp, TrendingDown } from 'lucide-react';

export interface KpiSparklineCardProps {
  title: string;
  value: number;
  format?: 'currency' | 'number' | 'percent';
  trend?: number;
  series: number[];
  color?: string;
}

export function KpiSparklineCard({ title, value, format = 'number', trend, series, color }: KpiSparklineCardProps) {
  const formatted = format === 'currency' ? formatCurrency(value) : format === 'percent' ? `${value.toFixed(1)}%` : formatNumber(value);
  const positive = (trend ?? 0) >= 0;
  return (
    <Card>
      <CardContent className="p-3 space-y-1">
        <div className="text-[11px] text-muted-foreground">{title}</div>
        <div className="flex items-end justify-between gap-2">
          <div className="text-xl font-bold">{formatted}</div>
          {trend != null && (
            <div className={`flex items-center text-[11px] font-medium ${positive ? 'text-emerald-600' : 'text-rose-600'}`}>
              {positive ? <TrendingUp className="h-3 w-3 mr-0.5" /> : <TrendingDown className="h-3 w-3 mr-0.5" />}
              {Math.abs(trend).toFixed(1)}%
            </div>
          )}
        </div>
        <SparklineCard data={series} color={color} height={32} />
      </CardContent>
    </Card>
  );
}
