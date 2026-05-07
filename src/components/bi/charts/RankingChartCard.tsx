import { ChartCardShell, ChartCardShellProps } from './ChartCardShell';
import { formatCurrency } from '../utils/formatters';
import { cn } from '@/lib/utils';
import { Trophy } from 'lucide-react';
import { BarChartDatum } from './BarChartCard';

export interface RankingChartCardProps extends Omit<ChartCardShellProps, 'children' | 'isEmpty'> {
  data: BarChartDatum[];
  valueFormatter?: (v: number) => string;
  topN?: number;
  onItemClick?: (d: BarChartDatum) => void;
}

const MEDALS = ['text-[hsl(38,92%,50%)]', 'text-[hsl(0,0%,60%)]', 'text-[hsl(30,80%,55%)]'];

export function RankingChartCard({
  data, valueFormatter = formatCurrency, topN = 10, onItemClick, height = 320, ...shell
}: RankingChartCardProps) {
  const sorted = [...(data || [])].sort((a, b) => b.valor - a.valor).slice(0, topN);
  const max = sorted[0]?.valor ?? 0;
  return (
    <ChartCardShell {...shell} height={height} isEmpty={!sorted.length}>
      <ol className="space-y-1.5">
        {sorted.map((d, i) => {
          const pct = max > 0 ? (d.valor / max) * 100 : 0;
          return (
            <li
              key={d.label + i}
              className={cn(
                'group relative flex items-center gap-2 rounded-md border bg-card px-2 py-1.5 text-xs',
                onItemClick && 'cursor-pointer hover:bg-accent/40',
              )}
              onClick={() => onItemClick?.(d)}
            >
              <div className="absolute inset-y-0 left-0 rounded-md bg-[hsl(var(--primary))]/10" style={{ width: `${pct}%` }} />
              <div className="relative z-10 flex w-6 shrink-0 items-center justify-center font-bold tabular-nums">
                {i < 3 ? <Trophy className={cn('h-3.5 w-3.5', MEDALS[i])} /> : <span className="text-muted-foreground">{i + 1}</span>}
              </div>
              <div className="relative z-10 flex-1 truncate font-medium">{d.label}</div>
              <div className="relative z-10 shrink-0 text-right font-semibold tabular-nums">{valueFormatter(d.valor)}</div>
            </li>
          );
        })}
      </ol>
    </ChartCardShell>
  );
}
