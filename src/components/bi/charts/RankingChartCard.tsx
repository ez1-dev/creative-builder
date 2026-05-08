import { useEffect, useState } from 'react';
import { ChartCardShell, ChartCardShellProps } from './ChartCardShell';
import { formatCurrency } from '../utils/formatters';
import { cn } from '@/lib/utils';
import { Trophy, ChevronDown, ChevronUp } from 'lucide-react';
import { BarChartDatum } from './BarChartCard';

export interface RankingChartCardProps extends Omit<ChartCardShellProps, 'children' | 'isEmpty'> {
  data: BarChartDatum[];
  valueFormatter?: (v: number) => string;
  topN?: number;
  step?: number;
  expandable?: boolean;
  onItemClick?: (d: BarChartDatum) => void;
}

const MEDALS = ['text-[hsl(38,92%,50%)]', 'text-[hsl(0,0%,60%)]', 'text-[hsl(30,80%,55%)]'];

export function RankingChartCard({
  data,
  valueFormatter = formatCurrency,
  topN = 10,
  step,
  expandable = true,
  onItemClick,
  height = 320,
  ...shell
}: RankingChartCardProps) {
  const sorted = [...(data || [])].sort((a, b) => b.valor - a.valor);
  const total = sorted.length;
  const initial = Math.min(topN, total);
  const chunk = step ?? topN ?? 10;

  const [visibleCount, setVisibleCount] = useState(initial);

  useEffect(() => {
    setVisibleCount(Math.min(topN, total));
  }, [total, topN]);

  const visible = sorted.slice(0, visibleCount);
  const max = visible[0]?.valor ?? 0;
  const remaining = total - visibleCount;
  const isExpanded = visibleCount >= total && total > initial;
  const showToggle = expandable && total > initial;

  return (
    <ChartCardShell {...shell} height={height} isEmpty={!visible.length}>
      <ol className="space-y-1.5">
        {visible.map((d, i) => {
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
      {showToggle && (
        <div className="mt-2 flex justify-center">
          <button
            type="button"
            aria-expanded={isExpanded}
            onClick={(e) => {
              e.stopPropagation();
              if (isExpanded) {
                setVisibleCount(initial);
              } else {
                setVisibleCount((c) => Math.min(c + chunk, total));
              }
            }}
            className="inline-flex items-center gap-1 rounded-md border bg-card px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="h-3.5 w-3.5" />
                Ver menos
              </>
            ) : (
              <>
                <ChevronDown className="h-3.5 w-3.5" />
                Ver mais (+{Math.min(chunk, remaining)} de {remaining})
              </>
            )}
          </button>
        </div>
      )}
    </ChartCardShell>
  );
}
