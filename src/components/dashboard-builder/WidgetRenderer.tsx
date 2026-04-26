import { useMemo } from 'react';
import { aggregate, singleMetric } from './aggregations';
import type { CrossFilter, DashboardWidget } from './types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/format';
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell,
  Treemap, ScatterChart, Scatter, ResponsiveContainer, XAxis, YAxis, Tooltip as RTooltip, CartesianGrid, Legend,
} from 'recharts';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { formatDate } from '@/lib/format';

const COLORS = ['hsl(var(--primary))', '#1e3a8a', '#f97316', '#7c3aed', '#ec4899', '#eab308', '#06b6d4', '#10b981', '#ef4444', '#8b5cf6'];

interface RendererProps {
  widget: DashboardWidget;
  rows: any[];
  catalogCount?: number;
  onSelect?: (filter: CrossFilter) => void;
  onDrillDown?: (filter: CrossFilter) => void;
}

function fmt(v: number, format?: string) {
  if (format === 'currency') return formatCurrency(v);
  return new Intl.NumberFormat('pt-BR').format(Math.round(v));
}

export function WidgetRenderer({ widget, rows, catalogCount = 0, onSelect, onDrillDown }: RendererProps) {
  const { type, config, title } = widget;

  const series = useMemo(() => {
    if (['bar', 'line', 'area', 'pie', 'treemap', 'scatter'].includes(type)) {
      return aggregate(rows, config);
    }
    return [];
  }, [rows, config, type]);

  const handleClick = (entry: any) => {
    if (!onSelect || !config.dimension || !entry?.name) return;
    onSelect({ field: config.dimension, value: entry.name });
  };

  const handleDouble = (entry: any) => {
    if (!onDrillDown || !config.dimension || !entry?.name) return;
    onDrillDown({ field: config.dimension, value: entry.name });
  };

  if (type === 'kpi') {
    let value = 0;
    if (config.metric === 'catalog_count') value = catalogCount;
    else value = singleMetric(rows, config);
    return (
      <Card className="h-full">
        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle></CardHeader>
        <CardContent className="pt-0">
          <div className="text-2xl font-bold">{fmt(value, config.format)}</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2 flex-shrink-0"><CardTitle className="text-sm">{title}</CardTitle></CardHeader>
      <CardContent className="flex-1 min-h-0 pt-0">
        {type === 'bar' && (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={series} onClick={(e: any) => handleClick(e?.activePayload?.[0]?.payload)}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-25} textAnchor="end" height={60} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => fmt(v, config.format)} />
              <RTooltip formatter={(v: any) => fmt(Number(v), config.format)} />
              <Bar dataKey="value" fill={COLORS[0]} cursor="pointer"
                onDoubleClick={(d: any) => handleDouble(d?.payload)} />
            </BarChart>
          </ResponsiveContainer>
        )}
        {type === 'line' && (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={series}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => fmt(v, config.format)} />
              <RTooltip formatter={(v: any) => fmt(Number(v), config.format)} />
              <Line type="monotone" dataKey="value" stroke={COLORS[0]} strokeWidth={2} dot />
            </LineChart>
          </ResponsiveContainer>
        )}
        {type === 'area' && (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={series}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => fmt(v, config.format)} />
              <RTooltip formatter={(v: any) => fmt(Number(v), config.format)} />
              <Area type="monotone" dataKey="value" stroke={COLORS[0]} fill={COLORS[0]} fillOpacity={0.3} />
            </AreaChart>
          </ResponsiveContainer>
        )}
        {type === 'pie' && (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={series} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius="75%"
                onClick={(e: any) => handleClick(e)}>
                {series.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <RTooltip formatter={(v: any) => fmt(Number(v), config.format)} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        )}
        {type === 'treemap' && (
          <ResponsiveContainer width="100%" height="100%">
            <Treemap data={series} dataKey="value" stroke="#fff" fill={COLORS[0]} />
          </ResponsiveContainer>
        )}
        {type === 'scatter' && (
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart>
              <CartesianGrid />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis dataKey="value" tick={{ fontSize: 11 }} />
              <RTooltip />
              <Scatter data={series} fill={COLORS[0]} />
            </ScatterChart>
          </ResponsiveContainer>
        )}
        {type === 'table' && (() => {
          const groupBy = config.groupBy;
          if (!groupBy) {
            return (
              <div className="h-full overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Colaborador</TableHead>
                      <TableHead>C. Custo</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Origem</TableHead>
                      <TableHead>Destino</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.slice(0, 200).map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="text-xs">{formatDate(r.data_registro)}</TableCell>
                        <TableCell className="text-xs">{r.colaborador}</TableCell>
                        <TableCell className="text-xs">{r.centro_custo ?? '-'}</TableCell>
                        <TableCell className="text-xs">{r.tipo_despesa}</TableCell>
                        <TableCell className="text-xs">{r.origem ?? '-'}</TableCell>
                        <TableCell className="text-xs">{r.destino ?? '-'}</TableCell>
                        <TableCell className="text-xs text-right">{formatCurrency(Number(r.valor || 0))}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            );
          }
          const groups = new Map<string, any[]>();
          for (const r of rows) {
            const v = r[groupBy];
            const key = v == null || v === '' ? '(sem valor)' : String(v);
            if (!groups.has(key)) groups.set(key, []);
            groups.get(key)!.push(r);
          }
          const sorted = Array.from(groups.entries())
            .map(([k, v]) => ({ key: k, items: v, total: v.reduce((s, r) => s + Number(r.valor || 0), 0) }))
            .sort((a, b) => b.total - a.total);
          return (
            <div className="h-full overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Colaborador</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Origem</TableHead>
                    <TableHead>Destino</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sorted.map((g) => (
                    <FragmentGroup key={`g-${g.key}`} g={g} />
                  ))}
                </TableBody>
              </Table>
            </div>
          );
        })()}
      </CardContent>
    </Card>
  );
}
