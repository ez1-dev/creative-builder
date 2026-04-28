import { useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LineChart,
  Line,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatNumber } from '@/lib/format';

export interface RelatorioRow {
  obra?: string;
  cliente?: string;
  cidade?: string;
  numero_projeto?: string | number;
  data_inicial?: string;
  data_final?: string;
  quantidade_cargas?: number;
  quantidade_pecas?: number;
  quantidade_expedida?: number;
  peso_total?: number;
}

interface Props {
  rows: RelatorioRow[];
  loading: boolean;
  onObraClick?: (obra: string) => void;
}

const PALETTE = [
  'hsl(var(--primary))',
  'hsl(var(--info))',
  'hsl(var(--success))',
  'hsl(var(--warning))',
  'hsl(var(--destructive))',
  'hsl(var(--accent-foreground))',
  'hsl(var(--secondary-foreground))',
  'hsl(var(--muted-foreground))',
];

export function obraLabel(r: RelatorioRow): string {
  if (r.obra) return String(r.obra);
  const c = r.cliente || '';
  const ci = r.cidade || '';
  if (c || ci) return `${c}${c && ci ? ' - ' : ''}${ci}`;
  return '—';
}

export function topByMetric(
  rows: RelatorioRow[],
  keyFn: (r: RelatorioRow) => string,
  metricFn: (r: RelatorioRow) => number,
  n = 10,
) {
  const map = new Map<string, number>();
  for (const r of rows) {
    const k = keyFn(r);
    if (!k || k === '—') continue;
    map.set(k, (map.get(k) || 0) + (Number(metricFn(r)) || 0));
  }
  return Array.from(map.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, n);
}

function startOfWeek(d: Date) {
  const x = new Date(d);
  const day = x.getDay(); // 0=dom
  const diff = (day === 0 ? -6 : 1 - day);
  x.setDate(x.getDate() + diff);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function groupByWeek(rows: RelatorioRow[]) {
  const map = new Map<string, { week: string; peso: number; pecas: number; cargas: number; ts: number }>();
  for (const r of rows) {
    if (!r.data_inicial) continue;
    const d = new Date(r.data_inicial);
    if (Number.isNaN(d.getTime())) continue;
    const w = startOfWeek(d);
    const key = w.toISOString().slice(0, 10);
    const label = w.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    const cur = map.get(key) || { week: label, peso: 0, pecas: 0, cargas: 0, ts: w.getTime() };
    cur.peso += Number(r.peso_total) || 0;
    cur.pecas += Number(r.quantidade_pecas) || 0;
    cur.cargas += Number(r.quantidade_cargas) || 0;
    map.set(key, cur);
  }
  return Array.from(map.values()).sort((a, b) => a.ts - b.ts);
}

export function clientShare(rows: RelatorioRow[], topN = 8) {
  const map = new Map<string, number>();
  for (const r of rows) {
    const k = (r.cliente || '').trim();
    if (!k) continue;
    map.set(k, (map.get(k) || 0) + (Number(r.peso_total) || 0));
  }
  const sorted = Array.from(map.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
  const top = sorted.slice(0, topN);
  const rest = sorted.slice(topN);
  if (rest.length > 0) {
    const outros = rest.reduce((acc, x) => acc + x.value, 0);
    if (outros > 0) top.push({ name: 'Outros', value: outros });
  }
  return top;
}

const tooltipStyle = {
  backgroundColor: 'hsl(var(--popover))',
  border: '1px solid hsl(var(--border))',
  borderRadius: 6,
  fontSize: 12,
  color: 'hsl(var(--popover-foreground))',
};

function ChartCard({ title, children, hint, chartId }: { title: string; children: React.ReactNode; hint?: string; chartId?: string }) {
  return (
    <Card data-chart-id={chartId}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">{title}</CardTitle>
        {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
      </CardHeader>
      <CardContent className="h-[280px] pt-0">{children}</CardContent>
    </Card>
  );
}

export function pesoMedioCargaTop(rows: RelatorioRow[], n = 10) {
  const map = new Map<string, { peso: number; cargas: number }>();
  for (const r of rows) {
    const k = obraLabel(r);
    if (!k || k === '—') continue;
    const cur = map.get(k) || { peso: 0, cargas: 0 };
    cur.peso += Number(r.peso_total) || 0;
    cur.cargas += Number(r.quantidade_cargas) || 0;
    map.set(k, cur);
  }
  return Array.from(map.entries())
    .filter(([, v]) => v.cargas > 0)
    .map(([name, v]) => ({ name, value: v.peso / v.cargas }))
    .sort((a, b) => b.value - a.value)
    .slice(0, n);
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
      {message}
    </div>
  );
}

export function RelatorioSemanalObraCharts({ rows, loading, onObraClick }: Props) {
  const topPeso = useMemo(() => topByMetric(rows, obraLabel, (r) => r.peso_total || 0), [rows]);
  const topPecas = useMemo(() => topByMetric(rows, obraLabel, (r) => r.quantidade_pecas || 0), [rows]);
  const topCargas = useMemo(() => topByMetric(rows, obraLabel, (r) => r.quantidade_cargas || 0), [rows]);
  const evolucao = useMemo(() => groupByWeek(rows), [rows]);
  const pieClientes = useMemo(() => clientShare(rows), [rows]);
  const pesoMedioCarga = useMemo(() => {
    const map = new Map<string, { peso: number; cargas: number }>();
    for (const r of rows) {
      const k = obraLabel(r);
      if (!k || k === '—') continue;
      const cur = map.get(k) || { peso: 0, cargas: 0 };
      cur.peso += Number(r.peso_total) || 0;
      cur.cargas += Number(r.quantidade_cargas) || 0;
      map.set(k, cur);
    }
    return Array.from(map.entries())
      .filter(([, v]) => v.cargas > 0)
      .map(([name, v]) => ({ name, value: v.peso / v.cargas }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [rows]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Calculando gráficos...</CardTitle>
            </CardHeader>
            <CardContent className="h-[280px] flex items-center justify-center">
              <div className="h-full w-full animate-pulse rounded bg-muted/40" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!rows || rows.length === 0) return null;

  const handleBarClick = (data: any) => {
    if (onObraClick && data?.name) onObraClick(String(data.name));
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <ChartCard title="Top 10 Obras por Peso (kg)" hint="Clique em uma barra para filtrar pela obra">
        {topPeso.length === 0 ? <EmptyState message="Sem dados." /> : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={topPeso} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(v) => formatNumber(v, 0)} />
              <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => `${formatNumber(Number(v), 2)} kg`} />
              <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} cursor="pointer" onClick={handleBarClick} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      <ChartCard title="Top 10 Obras por Peças" hint="Clique em uma barra para filtrar pela obra">
        {topPecas.length === 0 ? <EmptyState message="Sem dados." /> : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={topPecas} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(v) => formatNumber(v, 0)} />
              <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => formatNumber(Number(v), 0)} />
              <Bar dataKey="value" fill="hsl(var(--info))" radius={[0, 4, 4, 0]} cursor="pointer" onClick={handleBarClick} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      <ChartCard title="Top 10 Obras por Cargas">
        {topCargas.length === 0 ? <EmptyState message="Sem dados." /> : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={topCargas} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(v) => formatNumber(v, 0)} />
              <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => formatNumber(Number(v), 0)} />
              <Bar dataKey="value" fill="hsl(var(--warning))" radius={[0, 4, 4, 0]} cursor="pointer" onClick={handleBarClick} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      <ChartCard title="Evolução Semanal" hint="Agrupado pela semana da data inicial">
        {evolucao.length === 0 ? <EmptyState message="Sem dados de data." /> : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={evolucao} margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="week" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis yAxisId="left" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(v) => formatNumber(v, 0)} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(v) => formatNumber(v, 0)} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: any, n: any) => [formatNumber(Number(v), n === 'Peso (kg)' ? 2 : 0), n]} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line yAxisId="left" type="monotone" dataKey="peso" name="Peso (kg)" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
              <Line yAxisId="right" type="monotone" dataKey="pecas" name="Peças" stroke="hsl(var(--info))" strokeWidth={2} dot={false} />
              <Line yAxisId="right" type="monotone" dataKey="cargas" name="Cargas" stroke="hsl(var(--warning))" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      <ChartCard title="Peso Médio por Carga (Top 10 Obras)" hint="Eficiência logística (kg/carga)">
        {pesoMedioCarga.length === 0 ? <EmptyState message="Sem dados." /> : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={pesoMedioCarga} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(v) => formatNumber(v, 0)} />
              <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => `${formatNumber(Number(v), 2)} kg/carga`} />
              <Bar dataKey="value" fill="hsl(var(--success))" radius={[0, 4, 4, 0]} cursor="pointer" onClick={handleBarClick} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      <ChartCard title="Participação por Cliente (Peso)" hint="Top 8 clientes + Outros">
        {pieClientes.length === 0 ? <EmptyState message="Sem dados de cliente." /> : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => `${formatNumber(Number(v), 2)} kg`} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Pie data={pieClientes} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} paddingAngle={2}>
                {pieClientes.map((_, i) => (
                  <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        )}
      </ChartCard>
    </div>
  );
}
