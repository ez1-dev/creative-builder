import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Tooltip, Legend } from 'recharts';
import { ChartCardShell, ChartCardShellProps } from './ChartCardShell';
import { BI_PALETTE } from '../utils/chartHelpers';

export interface RadarDatum { axis: string; [series: string]: number | string }

export interface RadarChartCardProps extends Omit<ChartCardShellProps, 'children' | 'isEmpty'> {
  data: RadarDatum[];
  series: { dataKey: string; label: string; color?: string }[];
}

export function RadarChartCard({ data, series, height = 280, ...shell }: RadarChartCardProps) {
  const isEmpty = !data?.length;
  return (
    <ChartCardShell {...shell} height={height} isEmpty={isEmpty}>
      <ResponsiveContainer width="100%" height={height}>
        <RadarChart data={data}>
          <PolarGrid stroke="hsl(var(--border))" />
          <PolarAngleAxis dataKey="axis" tick={{ fontSize: 10 }} />
          <PolarRadiusAxis tick={{ fontSize: 9 }} />
          {series.map((s, i) => (
            <Radar key={s.dataKey} name={s.label} dataKey={s.dataKey}
              stroke={s.color ?? BI_PALETTE[i % BI_PALETTE.length]}
              fill={s.color ?? BI_PALETTE[i % BI_PALETTE.length]}
              fillOpacity={0.3} />
          ))}
          <Tooltip contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 6, fontSize: 12 }} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
        </RadarChart>
      </ResponsiveContainer>
    </ChartCardShell>
  );
}
