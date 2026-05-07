import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatByKind, KpiFormat, percentVariation, formatPercent } from '../utils/formatters';

export interface ComparisonRow { label: string; current: number; previous: number; format?: KpiFormat }

export function ComparisonTable({
  rows, currentLabel = 'Atual', previousLabel = 'Anterior',
}: { rows: ComparisonRow[]; currentLabel?: string; previousLabel?: string }) {
  return (
    <div className="overflow-hidden rounded-md border bg-card">
      <table className="w-full text-xs">
        <thead className="bg-muted/60 text-[11px] uppercase tracking-wider text-muted-foreground">
          <tr>
            <th className="px-3 py-1.5 text-left">Métrica</th>
            <th className="px-3 py-1.5 text-right">{currentLabel}</th>
            <th className="px-3 py-1.5 text-right">{previousLabel}</th>
            <th className="px-3 py-1.5 text-right">Variação</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const v = percentVariation(r.current, r.previous);
            const up = v > 0, down = v < 0;
            return (
              <tr key={i} className="border-t">
                <td className="px-3 py-1.5">{r.label}</td>
                <td className="px-3 py-1.5 text-right font-semibold tabular-nums">{formatByKind(r.current, r.format ?? 'currency')}</td>
                <td className="px-3 py-1.5 text-right tabular-nums text-muted-foreground">{formatByKind(r.previous, r.format ?? 'currency')}</td>
                <td className={cn('px-3 py-1.5 text-right text-xs font-medium tabular-nums',
                  up && 'text-[hsl(var(--success))]',
                  down && 'text-[hsl(var(--destructive))]',
                  !up && !down && 'text-muted-foreground',
                )}>
                  <span className="inline-flex items-center gap-0.5">
                    {up ? <TrendingUp className="h-3 w-3" /> : down ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                    {formatPercent(Math.abs(v), 1)}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
