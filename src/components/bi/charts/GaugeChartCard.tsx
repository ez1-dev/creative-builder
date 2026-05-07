import { RadialBarChart, RadialBar, ResponsiveContainer, PolarAngleAxis } from 'recharts';
import { ChartCardShell, ChartCardShellProps } from './ChartCardShell';
import { formatPercent } from '../utils/formatters';

export interface GaugeChartCardProps extends Omit<ChartCardShellProps, 'children' | 'isEmpty'> {
  value: number;
  max?: number;
  label?: string;
  color?: string;
}

export function GaugeChartCard({ value, max = 100, label, color = 'hsl(var(--primary))', height = 220, ...shell }: GaugeChartCardProps) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const data = [{ name: 'val', value: pct, fill: color }];
  return (
    <ChartCardShell {...shell} height={height} isEmpty={value === undefined || value === null}>
      <div className="relative">
        <ResponsiveContainer width="100%" height={height}>
          <RadialBarChart innerRadius="70%" outerRadius="100%" data={data} startAngle={180} endAngle={0}>
            <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
            <RadialBar dataKey="value" cornerRadius={10} background={{ fill: 'hsl(var(--muted))' }} />
          </RadialBarChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center pb-6">
          <span className="text-2xl font-bold tabular-nums">{formatPercent(pct, 1)}</span>
          {label && <span className="text-[11px] text-muted-foreground">{label}</span>}
        </div>
      </div>
    </ChartCardShell>
  );
}
