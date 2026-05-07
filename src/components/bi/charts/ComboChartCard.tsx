import { ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { ChartCardShell, ChartCardShellProps } from './ChartCardShell';
import { formatCurrency } from '../utils/formatters';
import { tickCurrencyAbbrev } from '../utils/chartHelpers';

export interface ComboChartCardProps extends Omit<ChartCardShellProps, 'children' | 'isEmpty'> {
  data: any[];
  xKey?: string;
  barKey: string;
  barLabel?: string;
  lineKey: string;
  lineLabel?: string;
  barColor?: string;
  lineColor?: string;
  valueFormatter?: (v: number) => string;
}

export function ComboChartCard({
  data, xKey = 'label', barKey, barLabel, lineKey, lineLabel,
  barColor = 'hsl(var(--primary))', lineColor = 'hsl(var(--warning))',
  valueFormatter = formatCurrency, height = 280, ...shell
}: ComboChartCardProps) {
  return (
    <ChartCardShell {...shell} height={height} isEmpty={!data?.length}>
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis dataKey={xKey} tick={{ fontSize: 10 }} />
          <YAxis tickFormatter={tickCurrencyAbbrev} tick={{ fontSize: 10 }} />
          <Tooltip formatter={(v: number) => valueFormatter(v)}
            contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 6, fontSize: 12 }} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Bar dataKey={barKey} name={barLabel || barKey} fill={barColor} radius={[4, 4, 0, 0]} />
          <Line type="monotone" dataKey={lineKey} name={lineLabel || lineKey} stroke={lineColor} strokeWidth={2} dot={{ r: 3 }} />
        </ComposedChart>
      </ResponsiveContainer>
    </ChartCardShell>
  );
}
