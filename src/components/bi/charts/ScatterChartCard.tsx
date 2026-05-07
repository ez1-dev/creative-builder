import { ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ZAxis } from 'recharts';
import { ChartCardShell, ChartCardShellProps } from './ChartCardShell';

export interface ScatterDatum { x: number; y: number; z?: number; label?: string }

export interface ScatterChartCardProps extends Omit<ChartCardShellProps, 'children' | 'isEmpty'> {
  data: ScatterDatum[];
  xLabel?: string;
  yLabel?: string;
  color?: string;
}

export function ScatterChartCard({ data, xLabel, yLabel, color = 'hsl(var(--primary))', height = 280, ...shell }: ScatterChartCardProps) {
  const isEmpty = !data?.length;
  return (
    <ChartCardShell {...shell} height={height} isEmpty={isEmpty}>
      <ResponsiveContainer width="100%" height={height}>
        <ScatterChart margin={{ top: 10, right: 10, bottom: 10, left: 0 }}>
          <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
          <XAxis type="number" dataKey="x" name={xLabel} tick={{ fontSize: 10 }} />
          <YAxis type="number" dataKey="y" name={yLabel} tick={{ fontSize: 10 }} />
          <ZAxis type="number" dataKey="z" range={[40, 240]} />
          <Tooltip cursor={{ strokeDasharray: '3 3' }}
            contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 6, fontSize: 12 }} />
          <Scatter data={data} fill={color} />
        </ScatterChart>
      </ResponsiveContainer>
    </ChartCardShell>
  );
}
