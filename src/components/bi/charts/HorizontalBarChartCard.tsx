import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, LabelList } from 'recharts';
import { ChartCardShell, ChartCardShellProps } from './ChartCardShell';
import { formatCurrency } from '../utils/formatters';
import { tickCurrencyAbbrev } from '../utils/chartHelpers';
import { BarChartDatum } from './BarChartCard';
import { mergeVisualConfig, formatDataLabel, legendPositionProps } from '@/lib/bi/visualConfig';

export interface HorizontalBarChartCardProps extends Omit<ChartCardShellProps, 'children' | 'isEmpty'> {
  data: BarChartDatum[];
  valueFormatter?: (v: number) => string;
  color?: string;
  yWidth?: number;
  onItemClick?: (d: BarChartDatum) => void;
}

export function HorizontalBarChartCard({
  data, valueFormatter = formatCurrency, color = 'hsl(var(--success))', yWidth = 130, onItemClick, height = 280, visualConfig, ...shell
}: HorizontalBarChartCardProps) {
  const vc = mergeVisualConfig(visualConfig);
  const seriesLabel = vc.legend.seriesLabels['valor'] ?? 'Valor';
  const fmtLabel = (v: any) => formatDataLabel(v, vc.dataLabels);
  return (
    <ChartCardShell {...shell} height={height} isEmpty={!data?.length} visualConfig={visualConfig}>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 10, left: 0, bottom: 0 }}>
          {vc.grid.visible && <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />}
          {vc.axis.xVisible && <XAxis type="number" tickFormatter={tickCurrencyAbbrev} tick={{ fontSize: vc.axis.fontSize }} />}
          {vc.axis.yVisible && <YAxis type="category" dataKey="label" width={yWidth} tick={{ fontSize: vc.axis.fontSize }} />}
          {vc.tooltip.visible && (
            <Tooltip formatter={(v: number) => vc.dataLabels.visible ? fmtLabel(v) : valueFormatter(v)}
              contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 6, fontSize: 12 }} />
          )}
          {vc.legend.visible && <Legend {...legendPositionProps(vc.legend.position)} wrapperStyle={{ fontSize: vc.legend.fontSize }} />}
          <Bar dataKey="valor" name={seriesLabel} fill={color} radius={[0, 4, 4, 0]}
            cursor={onItemClick ? 'pointer' : undefined}
            onClick={(d: any) => onItemClick?.(d as BarChartDatum)}>
            {vc.dataLabels.visible && (
              <LabelList dataKey="valor" position={vc.dataLabels.position as any}
                style={{ fontSize: vc.dataLabels.fontSize, fill: 'hsl(var(--foreground))' }}
                formatter={fmtLabel as any} />
            )}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCardShell>
  );
}
