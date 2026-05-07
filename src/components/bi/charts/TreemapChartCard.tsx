import { ResponsiveContainer, Treemap, Tooltip } from 'recharts';
import { ChartCardShell, ChartCardShellProps } from './ChartCardShell';
import { BI_PALETTE } from '../utils/chartHelpers';
import { formatCurrency } from '../utils/formatters';

export interface TreemapDatum { name: string; value: number; children?: TreemapDatum[] }

export interface TreemapChartCardProps extends Omit<ChartCardShellProps, 'children' | 'isEmpty'> {
  data: TreemapDatum[];
  valueFormatter?: (v: number) => string;
}

export function TreemapChartCard({ data, valueFormatter = formatCurrency, height = 280, ...shell }: TreemapChartCardProps) {
  const isEmpty = !data?.length;
  return (
    <ChartCardShell {...shell} height={height} isEmpty={isEmpty}>
      <ResponsiveContainer width="100%" height={height}>
        <Treemap
          data={data}
          dataKey="value"
          stroke="hsl(var(--background))"
          fill="hsl(var(--primary))"
          content={<CustomCell />}
        >
          <Tooltip
            formatter={(v: number) => valueFormatter(v)}
            contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 6, fontSize: 12 }}
          />
        </Treemap>
      </ResponsiveContainer>
    </ChartCardShell>
  );
}

function CustomCell(props: any) {
  const { x, y, width, height, index, name } = props;
  const color = BI_PALETTE[index % BI_PALETTE.length];
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} fill={color} stroke="hsl(var(--background))" />
      {width > 60 && height > 24 && (
        <text x={x + 6} y={y + 16} fill="white" fontSize={11} fontWeight={600}>{name}</text>
      )}
    </g>
  );
}
