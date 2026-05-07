import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { ChartCardShell, ChartCardShellProps } from './ChartCardShell';
import { formatCurrency } from '../utils/formatters';
import { tickCurrencyAbbrev, BI_PALETTE } from '../utils/chartHelpers';

export interface StackedBarSeries { dataKey: string; label: string; color?: string }

export interface StackedBarChartCardProps extends Omit<ChartCardShellProps, 'children' | 'isEmpty'> {
  data: any[];
  series: StackedBarSeries[];
  xKey?: string;
  valueFormatter?: (v: number) => string;
}

export function StackedBarChartCard({
  data, series, xKey = 'label', valueFormatter = formatCurrency, height = 280, ...shell
}: StackedBarChartCardProps) {
  return (
    <ChartCardShell {...shell} height={height} isEmpty={!data?.length}>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis dataKey={xKey} tick={{ fontSize: 10 }} />
          <YAxis tickFormatter={tickCurrencyAbbrev} tick={{ fontSize: 10 }} />
          <Tooltip formatter={(v: number) => valueFormatter(v)}
            contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 6, fontSize: 12 }} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {series.map((s, i) => (
            <Bar key={s.dataKey} dataKey={s.dataKey} name={s.label} stackId="a" fill={s.color || BI_PALETTE[i % BI_PALETTE.length]} radius={i === series.length - 1 ? [4, 4, 0, 0] : 0} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </ChartCardShell>
  );
}
