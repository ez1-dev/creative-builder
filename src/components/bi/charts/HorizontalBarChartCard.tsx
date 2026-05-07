import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { ChartCardShell, ChartCardShellProps } from './ChartCardShell';
import { formatCurrency } from '../utils/formatters';
import { tickCurrencyAbbrev } from '../utils/chartHelpers';
import { BarChartDatum } from './BarChartCard';

export interface HorizontalBarChartCardProps extends Omit<ChartCardShellProps, 'children' | 'isEmpty'> {
  data: BarChartDatum[];
  valueFormatter?: (v: number) => string;
  color?: string;
  yWidth?: number;
  onItemClick?: (d: BarChartDatum) => void;
}

export function HorizontalBarChartCard({
  data, valueFormatter = formatCurrency, color = 'hsl(var(--success))', yWidth = 130, onItemClick, height = 280, ...shell
}: HorizontalBarChartCardProps) {
  return (
    <ChartCardShell {...shell} height={height} isEmpty={!data?.length}>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
          <XAxis type="number" tickFormatter={tickCurrencyAbbrev} tick={{ fontSize: 10 }} />
          <YAxis type="category" dataKey="label" width={yWidth} tick={{ fontSize: 10 }} />
          <Tooltip formatter={(v: number) => valueFormatter(v)}
            contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 6, fontSize: 12 }} />
          <Bar dataKey="valor" fill={color} radius={[0, 4, 4, 0]}
            cursor={onItemClick ? 'pointer' : undefined}
            onClick={(d: any) => onItemClick?.(d as BarChartDatum)} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCardShell>
  );
}
