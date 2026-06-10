import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, LabelList } from 'recharts';
import { ChartCardShell, ChartCardShellProps } from './ChartCardShell';
import { formatCurrency } from '../utils/formatters';
import { tickCurrencyAbbrev } from '../utils/chartHelpers';
import { BarChartDatum } from './BarChartCard';
import { mergeVisualConfig, formatDataLabel, formatRichLabel, legendPositionProps, fontFamilyCss } from '@/lib/bi/visualConfig';

export interface LineChartCardProps extends Omit<ChartCardShellProps, 'children' | 'isEmpty'> {
  data: BarChartDatum[];
  valueFormatter?: (v: number) => string;
  color?: string;
}

export function LineChartCard({ data, valueFormatter = formatCurrency, color = 'hsl(var(--primary))', height = 280, visualConfig, ...shell }: LineChartCardProps) {
  const vc = mergeVisualConfig(visualConfig);
  const seriesLabel = vc.legend.seriesLabels['valor'] ?? 'Valor';
  const fmtLabel = (v: any) => formatDataLabel(v, vc.dataLabels);
  const total = useMemo(() => (data ?? []).reduce((s, d) => s + Number(d?.valor || 0), 0), [data]);
  const rich = vc.dataLabels.visible && !!vc.dataLabels.richLabel;
  const fontFamily = fontFamilyCss(vc.dataLabels.fontFamily);

  const renderRichPointLabel = (props: any) => {
    const { x, y, value, index } = props;
    const row = data[index];
    const { line1, line2 } = formatRichLabel({ name: row?.label, value: Number(value || 0), total, cfg: vc.dataLabels });
    const cx = Number(x) || 0;
    const cy = (Number(y) || 0) - 8;
    const fs = vc.dataLabels.fontSize;
    return (
      <text x={cx} y={cy} textAnchor="middle" fontSize={fs} fill="hsl(var(--foreground))" style={{ fontFamily, pointerEvents: 'none' }}>
        {line1 && <tspan x={cx} dy="-0.6em">{line1}</tspan>}
        {line2 && <tspan x={cx} dy={line1 ? '1.1em' : '0'} fill="hsl(var(--muted-foreground))">{line2}</tspan>}
      </text>
    );
  };

  return (
    <ChartCardShell {...shell} height={height} isEmpty={!data?.length} visualConfig={visualConfig}>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: rich ? 32 : 10, right: 10, left: 0, bottom: 0 }}>
          {vc.grid.visible && <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />}
          {vc.axis.xVisible && <XAxis dataKey="label" tick={{ fontSize: vc.axis.fontSize, fontFamily: fontFamilyCss(vc.axis.fontFamily) }} />}
          {vc.axis.yVisible && <YAxis tickFormatter={tickCurrencyAbbrev} tick={{ fontSize: vc.axis.fontSize, fontFamily: fontFamilyCss(vc.axis.fontFamily) }} />}
          {vc.tooltip.visible && (
            <Tooltip formatter={(v: number) => vc.dataLabels.visible ? fmtLabel(v) : valueFormatter(v)}
              contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 6, fontSize: 12 }} />
          )}
          {vc.legend.visible && <Legend {...legendPositionProps(vc.legend.position)} wrapperStyle={{ fontSize: vc.legend.fontSize, fontFamily: fontFamilyCss(vc.legend.fontFamily) }} />}
          <Line type="monotone" dataKey="valor" name={seriesLabel} stroke={color} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }}>
            {vc.dataLabels.visible && (
              rich
                ? <LabelList dataKey="valor" content={renderRichPointLabel as any} />
                : <LabelList dataKey="valor" position={vc.dataLabels.position as any}
                    style={{ fontSize: vc.dataLabels.fontSize, fontFamily, fill: 'hsl(var(--foreground))' }}
                    formatter={fmtLabel as any} />
            )}
          </Line>
        </LineChart>
      </ResponsiveContainer>
    </ChartCardShell>
  );
}
