import { Card } from '@/components/ui/card';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { RecursoAgg } from './aggregations';
import { fmtDec, fmtNum } from './aggregations';

export function CargaQtdOpsChart({ rows }: { rows: RecursoAgg[] }) {
  const top = rows.slice(0, 10).map((r) => ({
    name: r.descre || r.codcre,
    horas: Number(r.carga_prevista_horas.toFixed(2)),
    ops: r.qtd_ops,
  }));
  return (
    <Card className="p-4 rounded-2xl shadow-sm border h-full">
      <div className="text-sm font-semibold mb-3">Carga (h) × Qtd OPs por recurso</div>
      <div className="h-[340px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={top} margin={{ top: 4, right: 12, left: 0, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-30} textAnchor="end" stroke="hsl(var(--muted-foreground))" />
            <YAxis yAxisId="l" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
            <YAxis yAxisId="r" orientation="right" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
            <Tooltip
              contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
              formatter={(v: any, n: string) => n === 'horas' ? [`${fmtDec(Number(v))} h`, 'Carga'] : [fmtNum(Number(v)), 'Qtd OPs']}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar yAxisId="l" dataKey="horas" name="Carga (h)" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            <Bar yAxisId="r" dataKey="ops" name="Qtd OPs" fill="hsl(var(--primary) / 0.4)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
