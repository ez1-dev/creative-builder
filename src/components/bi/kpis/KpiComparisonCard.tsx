import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { formatByKind, KpiFormat, percentVariation, formatPercent } from '../utils/formatters';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface KpiComparisonCardProps {
  title: string;
  current: number;
  previous: number;
  format?: KpiFormat;
  currentLabel?: string;
  previousLabel?: string;
}

export function KpiComparisonCard({
  title, current, previous, format = 'currency', currentLabel = 'Atual', previousLabel = 'Anterior',
}: KpiComparisonCardProps) {
  const variation = percentVariation(current, previous);
  const up = variation > 0, down = variation < 0;
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="text-xs font-medium text-muted-foreground">{title}</div>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-end justify-between gap-3">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{currentLabel}</div>
            <div className="text-xl font-bold tabular-nums">{formatByKind(current, format)}</div>
          </div>
          <div className="text-right opacity-70">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{previousLabel}</div>
            <div className="text-sm font-medium tabular-nums">{formatByKind(previous, format)}</div>
          </div>
        </div>
        <div className={cn(
          'flex items-center gap-1 text-xs font-medium',
          up && 'text-[hsl(var(--success))]',
          down && 'text-[hsl(var(--destructive))]',
          !up && !down && 'text-muted-foreground',
        )}>
          {up ? <TrendingUp className="h-3 w-3" /> : down ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
          {formatPercent(Math.abs(variation), 1)} vs anterior
        </div>
      </CardContent>
    </Card>
  );
}
