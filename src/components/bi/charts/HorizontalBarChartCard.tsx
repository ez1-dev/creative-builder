import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, LabelList } from 'recharts';
import { ChartCardShell, ChartCardShellProps } from './ChartCardShell';
import { formatCurrency } from '../utils/formatters';
import { tickCurrencyAbbrev } from '../utils/chartHelpers';
import { BarChartDatum } from './BarChartCard';
import { mergeVisualConfig, formatDataLabel, formatRichLabel, legendPositionProps, fontFamilyCss } from '@/lib/bi/visualConfig';

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
  const total = useMemo(() => (data ?? []).reduce((s, d) => s + Number(d?.valor || 0), 0), [data]);
  const rich = vc.dataLabels.visible && !!vc.dataLabels.richLabel;
  const fontFamily = fontFamilyCss(vc.dataLabels.fontFamily);

  const renderRichBarLabel = (props: any) => {
    const { x, y, width, height: h, value, index } = props;
    const row = data[index];
    const { line1, line2 } = formatRichLabel({ name: row?.label, value: Number(value || 0), total, cfg: vc.dataLabels });
    const tx = (Number(x) || 0) + (Number(width) || 0) + 6;
    const cy = (Number(y) || 0) + (Number(h) || 0) / 2;
    const fs = vc.dataLabels.fontSize;
    return (
      <text x={tx} y={cy} textAnchor="start" dominantBaseline="middle" fontSize={fs} fill="hsl(var(--foreground))" style={{ fontFamily, pointerEvents: 'none' }}>
        {line1 && <tspan x={tx} dy="-0.3em">{line1}</tspan>}
        {line2 && <tspan x={tx} dy={line1 ? '1.1em' : '0'} fill="hsl(var(--muted-foreground))">{line2}</tspan>}
      </text>
    );
  };

  return (
    <ChartCardShell {...shell} height={height} isEmpty={!data?.length} visualConfig={visualConfig}>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: rich ? 100 : 10, left: 0, bottom: 0 }}>
          {vc.grid.visible && <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />}
          {vc.axis.xVisible && <XAxis type="number" tickFormatter={tickCurrencyAbbrev} tick={{ fontSize: vc.axis.fontSize, fontFamily: fontFamilyCss(vc.axis.fontFamily) }} />}
          {vc.axis.yVisible && <YAxis type="category" dataKey="label" width={yWidth} tick={{ fontSize: vc.axis.fontSize, fontFamily: fontFamilyCss(vc.axis.fontFamily) }} />}
          {vc.tooltip.visible && (
            <Tooltip formatter={(v: number) => vc.dataLabels.visible ? fmtLabel(v) : valueFormatter(v)}
              contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 6, fontSize: 12 }} />
          )}
          {vc.legend.visible && <Legend {...legendPositionProps(vc.legend.position)} wrapperStyle={{ fontSize: vc.legend.fontSize, fontFamily: fontFamilyCss(vc.legend.fontFamily) }} />}
          <Bar dataKey="valor" name={seriesLabel} fill={color} radius={[0, 4, 4, 0]}
            cursor={onItemClick ? 'pointer' : undefined}
            onClick={(d: any) => onItemClick?.(d as BarChartDatum)}>
            {vc.dataLabels.visible && (
              rich
                ? <LabelList dataKey="valor" content={renderRichBarLabel as any} />
                : <LabelList dataKey="valor" position={vc.dataLabels.position as any}
                    style={{ fontSize: vc.dataLabels.fontSize, fontFamily, fill: 'hsl(var(--foreground))' }}
                    formatter={fmtLabel as any} />
            )}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCardShell>
  );
}
