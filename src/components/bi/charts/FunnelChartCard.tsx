import { ResponsiveContainer, FunnelChart, Funnel, LabelList, Tooltip } from 'recharts';
import { ChartCardShell, ChartCardShellProps } from './ChartCardShell';
import { BI_PALETTE } from '../utils/chartHelpers';

export interface FunnelDatum { name: string; value: number; fill?: string }

export interface FunnelChartCardProps extends Omit<ChartCardShellProps, 'children' | 'isEmpty'> {
  data: FunnelDatum[];
}

export function FunnelChartCard({ data, height = 280, ...shell }: FunnelChartCardProps) {
  const isEmpty = !data?.length;
  const colored = data.map((d, i) => ({ ...d, fill: d.fill ?? BI_PALETTE[i % BI_PALETTE.length] }));
  return (
    <ChartCardShell {...shell} height={height} isEmpty={isEmpty}>
      <ResponsiveContainer width="100%" height={height}>
        <FunnelChart>
          <Tooltip contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 6, fontSize: 12 }} />
          <Funnel dataKey="value" data={colored} isAnimationActive>
            <LabelList position="right" fill="hsl(var(--foreground))" stroke="none" dataKey="name" fontSize={11} />
          </Funnel>
        </FunnelChart>
      </ResponsiveContainer>
    </ChartCardShell>
  );
}
