import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from 'recharts';
import { ChartCardShell, ChartCardShellProps } from './ChartCardShell';
import { formatCurrency } from '../utils/formatters';
import { tickCurrencyAbbrev } from '../utils/chartHelpers';

export interface WaterfallDatum { label: string; value: number; isTotal?: boolean }

export interface WaterfallChartCardProps extends Omit<ChartCardShellProps, 'children' | 'isEmpty'> {
  data: WaterfallDatum[];
  valueFormatter?: (v: number) => string;
}

export function WaterfallChartCard({ data, valueFormatter = formatCurrency, height = 280, ...shell }: WaterfallChartCardProps) {
  const isEmpty = !data?.length;
  let cum = 0;
  const computed = data.map((d) => {
    if (d.isTotal) {
      const item = { ...d, base: 0, delta: cum };
      return item;
    }
    const base = d.value >= 0 ? cum : cum + d.value;
    const delta = Math.abs(d.value);
    cum += d.value;
    return { ...d, base, delta };
  });

  return (
    <ChartCardShell {...shell} height={height} isEmpty={isEmpty}>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={computed} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 10 }} />
          <YAxis tickFormatter={tickCurrencyAbbrev} tick={{ fontSize: 10 }} />
          <Tooltip
            formatter={(_v: number, _n, p: any) => valueFormatter(p?.payload?.value ?? 0)}
            contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 6, fontSize: 12 }}
          />
          <Bar dataKey="base" stackId="a" fill="transparent" />
          <Bar dataKey="delta" stackId="a" radius={[4, 4, 0, 0]}>
            {computed.map((d, i) => (
              <Cell key={i} fill={d.isTotal ? 'hsl(var(--primary))' : d.value >= 0 ? 'hsl(142,70%,40%)' : 'hsl(0,72%,51%)'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCardShell>
  );
}
