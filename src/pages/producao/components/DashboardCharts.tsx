import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import type { DashboardData } from '../ProducaoDashboardPage';

const CHART_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--success, 142 76% 36%))',
  'hsl(var(--warning, 38 92% 50%))',
  'hsl(var(--destructive))',
  'hsl(var(--muted-foreground))',
];

export function DashboardCharts({ data }: { data: DashboardData }) {
  const resumo = data.resumo;

  const statusChartData = useMemo(() => {
    if (!resumo) return [];
    return [
      { name: 'Aguardando', value: resumo.projetos_aguardando_producao },
      { name: 'Em Produção', value: resumo.projetos_em_producao },
      { name: 'Parcial', value: resumo.projetos_parcialmente_expedidos },
      { name: 'Expedidos', value: resumo.projetos_expedidos },
    ].filter(d => d.value > 0);
  }, [resumo]);

  const topPatioData = useMemo(() => {
    if (!data.top_projetos_patio?.length) return [];
    return data.top_projetos_patio.slice(0, 10).map(p => ({
      name: `${p.numero_projeto}-${p.numero_desenho}`,
      kg_patio: Math.round(p.kg_patio || 0),
    }));
  }, [data.top_projetos_patio]);

  if (!data.cargas_por_mes?.length && !statusChartData.length && !topPatioData.length) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {data.cargas_por_mes && data.cargas_por_mes.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Cargas por Período</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={data.cargas_por_mes}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="periodo" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                <Tooltip />
                <Bar dataKey="quantidade_cargas" name="Cargas" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {statusChartData.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Status dos Projetos</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={statusChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                  {statusChartData.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {topPatioData.length > 0 && (
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Top Projetos com Maior Saldo em Pátio (Kg)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topPatioData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis type="number" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                <Tooltip />
                <Bar dataKey="kg_patio" name="Kg Pátio" fill="hsl(var(--warning, 38 92% 50%))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
