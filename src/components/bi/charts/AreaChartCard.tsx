import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { ChartCardShell, ChartCardShellProps } from './ChartCardShell';
import { formatCurrency } from '../utils/formatters';
import { tickCurrencyAbbrev } from '../utils/chartHelpers';
import { BarChartDatum } from './BarChartCard';

export interface AreaChartCardProps extends Omit<ChartCardShellProps, 'children' | 'isEmpty'> {
  data: BarChartDatum[];
  valueFormatter?: (v: number) => string;
  color?: string;
}

export function AreaChartCard({ data, valueFormatter = formatCurrency, color = 'hsl(var(--primary))', height = 280, ...shell }: AreaChartCardProps) {
  return (
    <ChartCardShell {...shell} height={height} isEmpty={!data?.length}>
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="bi-area-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.6} />
              <stop offset="100%" stopColor={color} stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 10 }} />
          <YAxis tickFormatter={tickCurrencyAbbrev} tick={{ fontSize: 10 }} />
          <Tooltip formatter={(v: number) => valueFormatter(v)}
            contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 6, fontSize: 12 }} />
          <Area type="monotone" dataKey="valor" stroke={color} fill="url(#bi-area-grad)" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </ChartCardShell>
  );
}
