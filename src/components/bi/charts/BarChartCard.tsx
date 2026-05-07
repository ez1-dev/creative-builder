import { ReactNode } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from 'recharts';
import { ChartCardShell, ChartCardShellProps } from './ChartCardShell';
import { formatCurrency } from '../utils/formatters';
import { tickCurrencyAbbrev } from '../utils/chartHelpers';

export interface BarChartDatum { label: string; valor: number; [k: string]: any }

export interface BarChartCardProps extends Omit<ChartCardShellProps, 'children' | 'isEmpty'> {
  data: BarChartDatum[];
  valueFormatter?: (v: number) => string;
  color?: string;
  showAverage?: boolean;
  onItemClick?: (d: BarChartDatum) => void;
}

export function BarChartCard({
  data, valueFormatter = formatCurrency, color = 'hsl(var(--primary))', showAverage, onItemClick, height = 280, ...shell
}: BarChartCardProps) {
  const isEmpty = !data?.length;
  const avg = showAverage && data.length ? data.reduce((s, d) => s + d.valor, 0) / data.length : 0;
  return (
    <ChartCardShell {...shell} height={height} isEmpty={isEmpty}>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="bi-bar-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.95} />
              <stop offset="100%" stopColor={color} stopOpacity={0.55} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 10 }} />
          <YAxis tickFormatter={tickCurrencyAbbrev} tick={{ fontSize: 10 }} />
          <Tooltip
            formatter={(v: number) => valueFormatter(v)}
            contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 6, fontSize: 12 }}
          />
          {showAverage && avg > 0 && (
            <ReferenceLine y={avg} stroke="hsl(var(--muted-foreground))" strokeDasharray="4 4"
              label={{ value: `Média ${valueFormatter(avg)}`, fontSize: 10, fill: 'hsl(var(--muted-foreground))', position: 'insideTopRight' }} />
          )}
          <Bar dataKey="valor" fill="url(#bi-bar-grad)" radius={[6, 6, 0, 0]}
            cursor={onItemClick ? 'pointer' : undefined}
            onClick={(d: any) => onItemClick?.(d as BarChartDatum)} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCardShell>
  );
}
