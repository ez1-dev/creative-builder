import { ChartCardShell, ChartCardShellProps } from './ChartCardShell';
import { Progress } from '@/components/ui/progress';
import { formatPercent, formatByKind, KpiFormat } from '../utils/formatters';

export interface ProgressItem { label: string; value: number; target: number; format?: KpiFormat }

export interface ProgressChartCardProps extends Omit<ChartCardShellProps, 'children' | 'isEmpty'> {
  items: ProgressItem[];
}

export function ProgressChartCard({ items, height = 220, ...shell }: ProgressChartCardProps) {
  return (
    <ChartCardShell {...shell} height={height} isEmpty={!items?.length}>
      <div className="space-y-3">
        {items.map((it) => {
          const pct = it.target > 0 ? Math.min(100, (it.value / it.target) * 100) : 0;
          return (
            <div key={it.label} className="space-y-1">
              <div className="flex items-baseline justify-between text-xs">
                <span className="font-medium">{it.label}</span>
                <span className="tabular-nums text-muted-foreground">
                  <span className="font-semibold text-foreground">{formatByKind(it.value, it.format ?? 'currency')}</span>
                  {' / '}
                  {formatByKind(it.target, it.format ?? 'currency')}
                  {' · '}
                  {formatPercent(pct, 1)}
                </span>
              </div>
              <Progress value={pct} className="h-2" />
            </div>
          );
        })}
      </div>
    </ChartCardShell>
  );
}
