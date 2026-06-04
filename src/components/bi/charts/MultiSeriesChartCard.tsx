/**
 * Gráfico multi-série com eixos Y duplos automáticos.
 *
 * Aceita N séries (linha/barra/área) sobre o mesmo eixo X categórico.
 * As cores, formatos e eixo (Y1/Y2) vêm de ResolvedMetric.
 */
import { useMemo } from 'react';
import {
  ComposedChart, Bar, Line, Area, XAxis, YAxis, Tooltip, Legend, CartesianGrid, ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { type ResolvedMetric, formatMetricValue } from '@/lib/bi/comercialMetrics';

interface Props {
  title?: string;
  /** Linhas de dado já normalizadas (geralmente as rows mensais). */
  rows: any[];
  /** Chave do eixo X — campo da row usado como label. */
  xKey?: string;
  /** Séries resolvidas a renderizar. */
  series: ResolvedMetric[];
  /** Click handler em um ponto/coluna (recebe a row do data). */
  onItemClick?: (row: any) => void;
  height?: number;
}

export function MultiSeriesChartCard({
  title, rows, xKey = 'label', series, onItemClick, height = 320,
}: Props) {
  const data = useMemo(() => {
    return rows.map((r) => {
      const out: Record<string, any> = { ...r };
      out[xKey] = r[xKey] ?? r.label ?? r.anomes_emissao ?? '';
      series.forEach((s, i) => {
        out[`s_${i}`] = s.compute(r);
      });
      return out;
    });
  }, [rows, series, xKey]);

  const hasPrimary = series.some((s) => s.axis === 'primary');
  const hasSecondary = series.some((s) => s.axis === 'secondary');

  return (
    <Card className="h-full flex flex-col">
      {title && (
        <CardHeader className="pb-2"><CardTitle className="text-sm">{title}</CardTitle></CardHeader>
      )}
      <CardContent className="flex-1 pt-2">
        <div style={{ width: '100%', height }}>
          <ResponsiveContainer>
            <ComposedChart
              data={data}
              margin={{ top: 8, right: 16, left: 8, bottom: 8 }}
              onClick={(e: any) => {
                if (!onItemClick) return;
                const p = e?.activePayload?.[0]?.payload;
                if (p) onItemClick(p);
              }}
            >
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey={xKey} tick={{ fontSize: 11 }} />
              {hasPrimary && (
                <YAxis yAxisId="left" tick={{ fontSize: 11 }} tickFormatter={(v) => abbr(v)} />
              )}
              {hasSecondary && (
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} tickFormatter={(v) => abbr(v)} />
              )}
              <Tooltip
                formatter={(value: any, name: any, payload: any) => {
                  const idx = Number(String(payload?.dataKey ?? '').replace('s_', ''));
                  const s = series[idx];
                  if (!s) return [String(value), String(name)];
                  return [formatMetricValue(Number(value), s.format), s.label];
                }}
                labelFormatter={(l) => String(l)}
              />
              <Legend
                wrapperStyle={{ fontSize: 12 }}
                formatter={(value: any) => {
                  const idx = Number(String(value).replace('s_', ''));
                  return series[idx]?.label ?? String(value);
                }}
              />
              {series.map((s, i) => {
                const axisId = s.axis === 'secondary' ? 'right' : 'left';
                const common = { key: `s_${i}`, dataKey: `s_${i}`, name: `s_${i}`, yAxisId: axisId };
                if (s.chartType === 'line') {
                  return <Line {...common} type="monotone" stroke={s.color} strokeWidth={2} dot={{ r: 3 }} />;
                }
                if (s.chartType === 'area') {
                  return <Area {...common} type="monotone" stroke={s.color} fill={s.color} fillOpacity={0.25} />;
                }
                return <Bar {...common} fill={s.color} radius={[4,4,0,0]} cursor={onItemClick ? 'pointer' : 'default'} />;
              })}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

function abbr(v: number): string {
  const n = Number(v);
  if (!Number.isFinite(n)) return '';
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + 'B';
  if (abs >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (abs >= 1_000) return (n / 1_000).toFixed(1) + 'k';
  return String(n);
}
