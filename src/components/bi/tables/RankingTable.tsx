import { Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency } from '../utils/formatters';

export interface RankingTableRow { label: string; valor: number }

export function RankingTable({
  data, valueFormatter = formatCurrency, topN = 10, onItemClick,
}: { data: RankingTableRow[]; valueFormatter?: (v: number) => string; topN?: number; onItemClick?: (r: RankingTableRow) => void }) {
  const sorted = [...(data || [])].sort((a, b) => b.valor - a.valor).slice(0, topN);
  const total = sorted.reduce((s, d) => s + d.valor, 0);
  return (
    <div className="overflow-hidden rounded-md border bg-card">
      <table className="w-full text-xs">
        <thead className="bg-muted/60 text-[11px] uppercase tracking-wider text-muted-foreground">
          <tr>
            <th className="w-10 px-2 py-1.5 text-left">#</th>
            <th className="px-2 py-1.5 text-left">Item</th>
            <th className="px-2 py-1.5 text-right">Valor</th>
            <th className="w-16 px-2 py-1.5 text-right">%</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((d, i) => {
            const pct = total > 0 ? (d.valor / total) * 100 : 0;
            return (
              <tr key={d.label + i}
                className={cn('border-t hover:bg-accent/30', onItemClick && 'cursor-pointer')}
                onClick={() => onItemClick?.(d)}
              >
                <td className="px-2 py-1.5">
                  {i < 3 ? <Trophy className={cn('h-3.5 w-3.5',
                    i === 0 && 'text-[hsl(38,92%,50%)]',
                    i === 1 && 'text-[hsl(0,0%,60%)]',
                    i === 2 && 'text-[hsl(30,80%,55%)]')} /> : <span className="text-muted-foreground">{i + 1}</span>}
                </td>
                <td className="px-2 py-1.5 font-medium">{d.label}</td>
                <td className="px-2 py-1.5 text-right font-semibold tabular-nums">{valueFormatter(d.valor)}</td>
                <td className="px-2 py-1.5 text-right text-muted-foreground tabular-nums">{pct.toFixed(1)}%</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
