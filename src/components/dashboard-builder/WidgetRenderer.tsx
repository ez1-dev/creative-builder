import { useMemo, Fragment } from 'react';
import { aggregate, singleMetric } from './aggregations';
import type { CrossFilter, DashboardWidget } from './types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/format';
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell,
  Treemap, ScatterChart, Scatter, ResponsiveContainer, XAxis, YAxis, Tooltip as RTooltip, CartesianGrid, Legend, LabelList,
} from 'recharts';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { formatDate } from '@/lib/format';

// Paleta inspirada em Power BI
const COLORS = ['#2E9BFF', '#1F3A93', '#F58220', '#7B2CBF', '#E91E63', '#FFC107', '#00BCD4', '#10B981', '#EF4444', '#8B5CF6'];
const PRIMARY_BLUE = '#2E9BFF';

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

function fmtShort(v: number, format?: string) {
  const n = Number(v) || 0;
  const abs = Math.abs(n);
  if (format === 'currency' || format === undefined) {
    if (abs >= 1_000_000) return `R$${(n / 1_000_000).toFixed(1).replace('.', ',')} Mi`;
    if (abs >= 1_000) return `R$${Math.round(n / 1_000)} Mil`;
    return `R$${Math.round(n)}`;
  }
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace('.', ',')} Mi`;
  if (abs >= 1_000) return `${Math.round(n / 1_000)} Mil`;
  return String(Math.round(n));
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
      <Card className="h-full border-border/60 shadow-sm bg-card overflow-hidden">
        <CardContent className="h-full flex flex-col items-center justify-center p-3 text-center min-w-0">
          <div className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-semibold tracking-tight text-foreground leading-none truncate max-w-full">
            {fmtShort(value, config.format)}
          </div>
          <div className="text-xs sm:text-sm text-muted-foreground mt-2 sm:mt-3 font-normal truncate max-w-full">{title}</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col border-border/60 shadow-sm bg-card overflow-hidden">
      <CardHeader className="pb-2 pt-3 px-4 flex-shrink-0 min-w-0">
        <CardTitle className="text-xs font-semibold uppercase tracking-wide text-foreground/80 truncate">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 min-w-0 pt-0 px-3 pb-3 overflow-hidden">
        {type === 'bar' && (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={series} margin={{ top: 24, right: 16, left: 8, bottom: 8 }}
              onClick={(e: any) => handleClick(e?.activePayload?.[0]?.payload)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6b7280' }} interval={0} axisLine={{ stroke: '#e5e7eb' }} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} tickFormatter={(v) => fmtShort(v, config.format)} axisLine={false} tickLine={false} />
              <RTooltip formatter={(v: any) => fmt(Number(v), config.format)} contentStyle={{ fontSize: 12, borderRadius: 6 }} />
              <Bar dataKey="value" fill={PRIMARY_BLUE} cursor="pointer" radius={[2, 2, 0, 0]}
                onDoubleClick={(d: any) => handleDouble(d?.payload)}>
                <LabelList dataKey="value" position="top" formatter={(v: number) => fmtShort(v, config.format)} style={{ fontSize: 11, fill: '#374151', fontWeight: 500 }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
        {type === 'line' && (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={series} margin={{ top: 16, right: 16, left: 8, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={{ stroke: '#e5e7eb' }} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} tickFormatter={(v) => fmtShort(v, config.format)} axisLine={false} tickLine={false} />
              <RTooltip formatter={(v: any) => fmt(Number(v), config.format)} contentStyle={{ fontSize: 12, borderRadius: 6 }} />
              <Line type="monotone" dataKey="value" stroke={PRIMARY_BLUE} strokeWidth={2.5} dot={{ r: 3, fill: PRIMARY_BLUE }} />
            </LineChart>
          </ResponsiveContainer>
        )}
        {type === 'area' && (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={series} margin={{ top: 16, right: 16, left: 8, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={{ stroke: '#e5e7eb' }} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} tickFormatter={(v) => fmtShort(v, config.format)} axisLine={false} tickLine={false} />
              <RTooltip formatter={(v: any) => fmt(Number(v), config.format)} contentStyle={{ fontSize: 12, borderRadius: 6 }} />
              <Area type="monotone" dataKey="value" stroke={PRIMARY_BLUE} fill={PRIMARY_BLUE} fillOpacity={0.25} strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        )}
        {type === 'pie' && (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
              <Pie
                data={series}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius="60%"
                labelLine={{ stroke: '#9ca3af', strokeWidth: 1 }}
                label={({ name, value, percent }: any) => {
                  const n = String(name ?? '');
                  const short = n.length > 22 ? n.slice(0, 21) + '…' : n;
                  return `${short} ${fmtShort(Number(value), config.format)} (${(percent * 100).toFixed(2).replace('.', ',')}%)`;
                }}
                onClick={(e: any) => handleClick(e)}
                style={{ fontSize: 11 }}
              >
                {series.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <RTooltip formatter={(v: any) => fmt(Number(v), config.format)} contentStyle={{ fontSize: 12, borderRadius: 6 }} />
            </PieChart>
          </ResponsiveContainer>
        )}
        {type === 'treemap' && (
          <ResponsiveContainer width="100%" height="100%">
            <Treemap data={series} dataKey="value" stroke="#fff" fill={PRIMARY_BLUE} />
          </ResponsiveContainer>
        )}
        {type === 'scatter' && (
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart>
              <CartesianGrid stroke="#e5e7eb" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6b7280' }} />
              <YAxis dataKey="value" tick={{ fontSize: 11, fill: '#6b7280' }} />
              <RTooltip />
              <Scatter data={series} fill={PRIMARY_BLUE} />
            </ScatterChart>
          </ResponsiveContainer>
        )}
        {type === 'table' && (() => {
          const groupBy = config.groupBy;
          // Modo compacto: 2 colunas (chave | total) + linha Total
          if (groupBy && config.compact) {
            const groups = new Map<string, number>();
            for (const r of rows) {
              const v = r[groupBy];
              const key = v == null || v === '' ? '(sem valor)' : String(v);
              groups.set(key, (groups.get(key) ?? 0) + Number(r.valor || 0));
            }
            const sorted = Array.from(groups.entries())
              .map(([k, total]) => ({ key: k, total }))
              .sort((a, b) => b.total - a.total);
            const totalGeral = sorted.reduce((s, g) => s + g.total, 0);
            return (
              <div className="h-full overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">&nbsp;</TableHead>
                      <TableHead className="text-xs text-right">Soma de TOTAL</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sorted.map((g) => (
                      <TableRow key={g.key}>
                        <TableCell className="text-xs py-1.5">{g.key}</TableCell>
                        <TableCell className="text-xs text-right py-1.5">{formatCurrency(g.total)}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="border-t-2 border-[#2E9BFF] bg-muted/40 font-bold">
                      <TableCell className="text-xs">Total</TableCell>
                      <TableCell className="text-xs text-right">{formatCurrency(totalGeral)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            );
          }
          if (!groupBy) {
            const visibleRows = rows.slice(0, 200);
            const totalGeral = rows.reduce((s, r) => s + Number(r.valor || 0), 0);
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
                    {visibleRows.map((r) => (
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
                    <TableRow className="border-t-2 border-primary/40 bg-muted/40 font-bold">
                      <TableCell colSpan={6} className="text-xs">Total</TableCell>
                      <TableCell className="text-xs text-right">{formatCurrency(totalGeral)}</TableCell>
                    </TableRow>
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
          const totalGeral = sorted.reduce((s, g) => s + g.total, 0);
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
                    <Fragment key={`g-${g.key}`}>
                      <TableRow className="bg-muted/60 font-semibold">
                        <TableCell colSpan={5} className="text-xs">
                          {g.key} <span className="text-muted-foreground font-normal">({g.items.length} reg.)</span>
                        </TableCell>
                        <TableCell className="text-xs text-right">{formatCurrency(g.total)}</TableCell>
                      </TableRow>
                      {g.items.slice(0, 100).map((r) => (
                        <TableRow key={r.id}>
                          <TableCell className="text-xs pl-6">{formatDate(r.data_registro)}</TableCell>
                          <TableCell className="text-xs">{r.colaborador}</TableCell>
                          <TableCell className="text-xs">{r.tipo_despesa}</TableCell>
                          <TableCell className="text-xs">{r.origem ?? '-'}</TableCell>
                          <TableCell className="text-xs">{r.destino ?? '-'}</TableCell>
                          <TableCell className="text-xs text-right">{formatCurrency(Number(r.valor || 0))}</TableCell>
                        </TableRow>
                      ))}
                    </Fragment>
                  ))}
                  <TableRow className="border-t-2 border-primary/40 bg-muted/40 font-bold">
                    <TableCell colSpan={5} className="text-xs">Total</TableCell>
                    <TableCell className="text-xs text-right">{formatCurrency(totalGeral)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          );
        })()}
      </CardContent>
    </Card>
  );
}
