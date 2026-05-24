import { Card } from '@/components/ui/card';
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { RecursoAgg } from './aggregations';
import { fmtDec } from './aggregations';

function colorFor(h: number, max: number) {
  const r = max > 0 ? h / max : 0;
  if (r >= 0.85) return 'hsl(var(--destructive))';
  if (r >= 0.6) return 'hsl(38 92% 50%)';
  if (r >= 0.35) return 'hsl(48 96% 53%)';
  return 'hsl(142 71% 45%)';
}

export function TopRecursosChart({
  rows,
  onSelect,
}: {
  rows: RecursoAgg[];
  onSelect?: (r: RecursoAgg) => void;
}) {
  const top = rows.slice(0, 10).map((r) => ({
    name: r.descre || r.codcre,
    horas: Number(r.carga_prevista_horas.toFixed(2)),
    _raw: r,
  }));
  const max = top.reduce((a, b) => Math.max(a, b.horas), 0);
  return (
    <Card className="p-3 md:p-4 rounded-2xl shadow-sm border h-full">
      <div className="flex items-center justify-between mb-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold truncate">1. Top 10 recursos por carga (h)</div>
          <div className="text-[11px] text-muted-foreground">
            {onSelect ? 'Clique numa barra para detalhar' : 'Cor por quartil da própria amostra'}
          </div>
        </div>
      </div>
      <div className="h-[280px] md:h-[340px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={top} layout="vertical" margin={{ top: 4, right: 24, left: 8, bottom: 4 }}>
            <XAxis type="number" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
            <YAxis
              dataKey="name"
              type="category"
              width={140}
              tick={{ fontSize: 11 }}
              stroke="hsl(var(--muted-foreground))"
            />
            <Tooltip
              contentStyle={{
                background: 'hsl(var(--popover))',
                border: '1px solid hsl(var(--border))',
                borderRadius: 8,
                fontSize: 12,
              }}
              formatter={(v: any) => [`${fmtDec(Number(v))} h`, 'Carga']}
            />
            <Bar
              dataKey="horas"
              radius={[0, 6, 6, 0]}
              cursor={onSelect ? 'pointer' : 'default'}
              onClick={(d: any) => onSelect?.(d?.payload?._raw)}
            >
              {top.map((d, i) => (
                <Cell key={i} fill={colorFor(d.horas, max)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
