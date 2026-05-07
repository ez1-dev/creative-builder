import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { formatCurrency, formatNumber } from '../utils/formatters';

export interface KpiTargetCardProps {
  title: string;
  value: number;
  target: number;
  format?: 'currency' | 'number' | 'percent';
  subtitle?: string;
}

export function KpiTargetCard({ title, value, target, format = 'currency', subtitle }: KpiTargetCardProps) {
  const pct = target > 0 ? Math.min(100, (value / target) * 100) : 0;
  const fmt = (v: number) => format === 'currency' ? formatCurrency(v) : format === 'percent' ? `${v.toFixed(1)}%` : formatNumber(v);
  return (
    <Card>
      <CardContent className="p-3 space-y-2">
        <div className="flex items-baseline justify-between">
          <div className="text-[11px] text-muted-foreground">{title}</div>
          <div className="text-[11px] font-semibold">{pct.toFixed(0)}%</div>
        </div>
        <div className="text-lg font-bold">{fmt(value)}</div>
        <Progress value={pct} className="h-1.5" />
        <div className="text-[10px] text-muted-foreground flex justify-between">
          <span>{subtitle ?? 'Meta'}</span>
          <span>{fmt(target)}</span>
        </div>
      </CardContent>
    </Card>
  );
}
