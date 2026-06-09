import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, LabelList } from 'recharts';
import { ChartCardShell, ChartCardShellProps } from './ChartCardShell';
import { formatCurrency } from '../utils/formatters';
import { tickCurrencyAbbrev, BI_PALETTE } from '../utils/chartHelpers';
import { mergeVisualConfig, formatDataLabel, legendPositionProps, fontFamilyCss } from '@/lib/bi/visualConfig';

export interface StackedBarSeries { dataKey: string; label: string; color?: string }

export interface StackedBarChartCardProps extends Omit<ChartCardShellProps, 'children' | 'isEmpty'> {
  data: any[];
  series: StackedBarSeries[];
  xKey?: string;
  valueFormatter?: (v: number) => string;
}

export function StackedBarChartCard({
  data, series, xKey = 'label', valueFormatter = formatCurrency, height = 280, visualConfig, ...shell
}: StackedBarChartCardProps) {
  const vc = mergeVisualConfig(visualConfig);
  const fmtLabel = (v: any) => formatDataLabel(v, vc.dataLabels);
  return (
    <ChartCardShell {...shell} height={height} isEmpty={!data?.length} visualConfig={visualConfig}>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          {vc.grid.visible && <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />}
          {vc.axis.xVisible && <XAxis dataKey={xKey} tick={{ fontSize: vc.axis.fontSize, fontFamily: fontFamilyCss(vc.axis.fontFamily) }} />}
          {vc.axis.yVisible && <YAxis tickFormatter={tickCurrencyAbbrev} tick={{ fontSize: vc.axis.fontSize, fontFamily: fontFamilyCss(vc.axis.fontFamily) }} />}
          {vc.tooltip.visible && (
            <Tooltip formatter={(v: number) => vc.dataLabels.visible ? fmtLabel(v) : valueFormatter(v)}
              contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 6, fontSize: 12 }} />
          )}
          {vc.legend.visible && <Legend {...legendPositionProps(vc.legend.position)} wrapperStyle={{ fontSize: vc.legend.fontSize, fontFamily: fontFamilyCss(vc.legend.fontFamily) }} />}
          {series.map((s, i) => {
            const name = vc.legend.seriesLabels[s.dataKey] ?? s.label;
            const last = i === series.length - 1;
            return (
              <Bar key={s.dataKey} dataKey={s.dataKey} name={name} stackId="a" fill={s.color || BI_PALETTE[i % BI_PALETTE.length]} radius={last ? [4, 4, 0, 0] : 0}>
                {vc.dataLabels.visible && last && (
                  <LabelList dataKey={s.dataKey} position={vc.dataLabels.position as any}
                    style={{ fontSize: vc.dataLabels.fontSize, fontFamily: fontFamilyCss(vc.dataLabels.fontFamily), fill: 'hsl(var(--foreground))' }}
                    formatter={fmtLabel as any} />
                )}
              </Bar>
            );
          })}
        </BarChart>
      </ResponsiveContainer>
    </ChartCardShell>
  );
}
