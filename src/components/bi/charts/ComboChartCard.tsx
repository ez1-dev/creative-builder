import { ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, LabelList } from 'recharts';
import { ChartCardShell, ChartCardShellProps } from './ChartCardShell';
import { formatCurrency } from '../utils/formatters';
import { tickCurrencyAbbrev } from '../utils/chartHelpers';
import { mergeVisualConfig, formatDataLabel, legendPositionProps } from '@/lib/bi/visualConfig';

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
  onItemClick?: (d: any) => void;
}

export function ComboChartCard({
  data, xKey = 'label', barKey, barLabel, lineKey, lineLabel,
  barColor = 'hsl(var(--primary))', lineColor = 'hsl(var(--warning))',
  valueFormatter = formatCurrency, height = 280, onItemClick, visualConfig, ...shell
}: ComboChartCardProps) {
  const vc = mergeVisualConfig(visualConfig);
  const barName = vc.legend.seriesLabels[barKey] ?? (barLabel || barKey);
  const lineName = vc.legend.seriesLabels[lineKey] ?? (lineLabel || lineKey);
  const fmtLabel = (v: any) => formatDataLabel(v, vc.dataLabels);
  return (
    <ChartCardShell {...shell} height={height} isEmpty={!data?.length} visualConfig={visualConfig}>
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          {vc.grid.visible && <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />}
          {vc.axis.xVisible && <XAxis dataKey={xKey} tick={{ fontSize: vc.axis.fontSize, fontFamily: fontFamilyCss(vc.axis.fontFamily) }} />}
          {vc.axis.yVisible && <YAxis tickFormatter={tickCurrencyAbbrev} tick={{ fontSize: vc.axis.fontSize, fontFamily: fontFamilyCss(vc.axis.fontFamily) }} />}
          {vc.tooltip.visible && (
            <Tooltip formatter={(v: number) => vc.dataLabels.visible ? fmtLabel(v) : valueFormatter(v)}
              contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 6, fontSize: 12 }} />
          )}
          {vc.legend.visible && <Legend {...legendPositionProps(vc.legend.position)} wrapperStyle={{ fontSize: vc.legend.fontSize, fontFamily: fontFamilyCss(vc.legend.fontFamily) }} />}
          <Bar dataKey={barKey} name={barName} fill={barColor} radius={[4, 4, 0, 0]}
            cursor={onItemClick ? 'pointer' : undefined}
            onClick={(d: any) => onItemClick?.(d?.payload ?? d)}>
            {vc.dataLabels.visible && (
              <LabelList dataKey={barKey} position={vc.dataLabels.position as any}
                style={{ fontSize: vc.dataLabels.fontSize, fontFamily: fontFamilyCss(vc.dataLabels.fontFamily), fill: 'hsl(var(--foreground))' }}
                formatter={fmtLabel as any} />
            )}
          </Bar>
          <Line type="monotone" dataKey={lineKey} name={lineName} stroke={lineColor} strokeWidth={2} dot={{ r: 3 }} />
        </ComposedChart>
      </ResponsiveContainer>
    </ChartCardShell>
  );
}
