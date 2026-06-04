/**
 * Chips clicáveis acima de um gráfico multi-série para alternar visibilidade
 * (estado visual; não persiste).
 */
import { Badge } from '@/components/ui/badge';
import type { ResolvedMetric } from '@/lib/bi/comercialMetrics';

interface Props {
  series: ResolvedMetric[];
  hidden: Set<number>;
  onToggle: (i: number) => void;
}

export function SeriesChips({ series, hidden, onToggle }: Props) {
  if (series.length < 2) return null;
  return (
    <div className="mb-2 flex flex-wrap items-center gap-1">
      {series.map((s, i) => {
        const off = hidden.has(i);
        return (
          <Badge
            key={i}
            variant={off ? 'outline' : 'secondary'}
            className="cursor-pointer gap-1.5 text-[11px]"
            onClick={() => onToggle(i)}
            style={off ? undefined : { borderLeft: `3px solid ${s.color}` }}
          >
            <span className={off ? 'line-through opacity-60' : ''}>{s.label}</span>
          </Badge>
        );
      })}
    </div>
  );
}
