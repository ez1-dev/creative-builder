import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine, Legend, LabelList } from 'recharts';
import { ChartCardShell, ChartCardShellProps } from './ChartCardShell';
import { formatCurrency } from '../utils/formatters';
import { tickCurrencyAbbrev } from '../utils/chartHelpers';
import { mergeVisualConfig, formatDataLabel, legendPositionProps, fontFamilyCss } from '@/lib/bi/visualConfig';

export interface BarChartDatum { label: string; valor: number; [k: string]: any }

export interface BarChartCardProps extends Omit<ChartCardShellProps, 'children' | 'isEmpty'> {
  data: BarChartDatum[];
  valueFormatter?: (v: number) => string;
  color?: string;
  showAverage?: boolean;
  onItemClick?: (d: BarChartDatum) => void;
}

export function BarChartCard({
  data, valueFormatter = formatCurrency, color = 'hsl(var(--primary))', showAverage, onItemClick, height = 280, visualConfig, ...shell
}: BarChartCardProps) {
  const vc = mergeVisualConfig(visualConfig);
  const isEmpty = !data?.length;
  const avg = showAverage && data.length ? data.reduce((s, d) => s + d.valor, 0) / data.length : 0;
  const seriesLabel = vc.legend.seriesLabels['valor'] ?? 'Valor';
  const fmtLabel = (v: any) => formatDataLabel(v, vc.dataLabels);
  return (
    <ChartCardShell {...shell} height={height} isEmpty={isEmpty} visualConfig={visualConfig}>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="bi-bar-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.95} />
              <stop offset="100%" stopColor={color} stopOpacity={0.55} />
            </linearGradient>
          </defs>
          {vc.grid.visible && <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />}
          {vc.axis.xVisible && (
            <XAxis dataKey="label" tick={{ fontSize: vc.axis.fontSize, fontFamily: fontFamilyCss(vc.axis.fontFamily) }}
              label={vc.axis.xLabel ? { value: vc.axis.xLabel, position: 'insideBottom', offset: -4, fontSize: vc.axis.fontSize, fontFamily: fontFamilyCss(vc.axis.fontFamily) } : undefined} />
          )}
          {vc.axis.yVisible && (
            <YAxis tickFormatter={tickCurrencyAbbrev} tick={{ fontSize: vc.axis.fontSize, fontFamily: fontFamilyCss(vc.axis.fontFamily) }}
              label={vc.axis.yLabel ? { value: vc.axis.yLabel, angle: -90, position: 'insideLeft', fontSize: vc.axis.fontSize, fontFamily: fontFamilyCss(vc.axis.fontFamily) } : undefined} />
          )}
          {vc.tooltip.visible && (
            <Tooltip
              formatter={(v: number) => vc.dataLabels.visible ? fmtLabel(v) : valueFormatter(v)}
              contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 6, fontSize: 12 }}
            />
          )}
          {vc.legend.visible && (
            <Legend {...legendPositionProps(vc.legend.position)} wrapperStyle={{ fontSize: vc.legend.fontSize, fontFamily: fontFamilyCss(vc.legend.fontFamily) }} />
          )}
          {showAverage && avg > 0 && (
            <ReferenceLine y={avg} stroke="hsl(var(--muted-foreground))" strokeDasharray="4 4"
              label={{ value: `Média ${valueFormatter(avg)}`, fontSize: 10, fill: 'hsl(var(--muted-foreground))', position: 'insideTopRight' }} />
          )}
          <Bar dataKey="valor" name={seriesLabel} fill="url(#bi-bar-grad)" radius={[6, 6, 0, 0]}
            cursor={onItemClick ? 'pointer' : undefined}
            onClick={(d: any) => onItemClick?.(d as BarChartDatum)}>
            {vc.dataLabels.visible && (
              <LabelList dataKey="valor" position={vc.dataLabels.position as any}
                style={{ fontSize: vc.dataLabels.fontSize, fontFamily: fontFamilyCss(vc.dataLabels.fontFamily), fill: 'hsl(var(--foreground))' }}
                formatter={fmtLabel as any} />
            )}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCardShell>
  );
}
