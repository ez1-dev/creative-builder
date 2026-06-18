import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { formatCurrency } from '@/components/bi';
import { tickCurrencyAbbrev } from '@/components/bi/utils/chartHelpers';
import type { DreRealizadoMensalRow } from '@/lib/bi/dreConfiguravelTypes';

function formatAnomes(anomes: string): string {
  if (!anomes || anomes.length < 6) return anomes || '-';
  return `${anomes.slice(4, 6)}/${anomes.slice(0, 4)}`;
}

export function DreMensalChart({ data }: { data: DreRealizadoMensalRow[] }) {
  const series = useMemo(
    () =>
      (data ?? []).map((r) => ({
        mes: formatAnomes(r.anomes),
        'Receita Operacional': r.receita_operacional,
        Custos: r.custos,
        Despesas: r.despesas,
        'Resultado DRE': r.resultado_dre,
      })),
    [data],
  );

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Resultado mensal</CardTitle>
      </CardHeader>
      <CardContent>
        <div style={{ width: '100%', height: 320 }}>
          <ResponsiveContainer>
            <LineChart data={series} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={tickCurrencyAbbrev} tick={{ fontSize: 11 }} />
              <Tooltip
                formatter={(v: number) => formatCurrency(v)}
                contentStyle={{
                  background: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: 6,
                  fontSize: 12,
                }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="Receita Operacional" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="Custos" stroke="hsl(var(--warning, 38 92% 50%))" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="Despesas" stroke="hsl(var(--destructive))" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="Resultado DRE" stroke="hsl(var(--success, 142 71% 45%))" strokeWidth={2.5} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
