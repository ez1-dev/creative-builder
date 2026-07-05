import { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, LabelList } from 'recharts';
import { ChartCardShell, ChartCardShellProps } from './ChartCardShell';
import { formatCurrency } from '../utils/formatters';
import { tickCurrencyAbbrev } from '../utils/chartHelpers';
import { BarChartDatum } from './BarChartCard';
import { mergeVisualConfig, formatDataLabel, formatRichLabel, legendPositionProps, fontFamilyCss } from '@/lib/bi/visualConfig';

export interface AreaChartCardProps extends Omit<ChartCardShellProps, 'children' | 'isEmpty'> {
  data: BarChartDatum[];
  valueFormatter?: (v: number) => string;
  tickFormatter?: (v: number) => string;
  color?: string;
}

export function AreaChartCard({ data, valueFormatter = formatCurrency, tickFormatter = tickCurrencyAbbrev, color = 'hsl(var(--primary))', height = 280, visualConfig, ...shell }: AreaChartCardProps) {
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
        <AreaChart data={data} margin={{ top: rich ? 32 : 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="bi-area-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.6} />
              <stop offset="100%" stopColor={color} stopOpacity={0.05} />
            </linearGradient>
          </defs>
          {vc.grid.visible && <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />}
          {vc.axis.xVisible && <XAxis dataKey="label" tick={{ fontSize: vc.axis.fontSize, fontFamily: fontFamilyCss(vc.axis.fontFamily) }} />}
          {vc.axis.yVisible && <YAxis tickFormatter={tickCurrencyAbbrev} tick={{ fontSize: vc.axis.fontSize, fontFamily: fontFamilyCss(vc.axis.fontFamily) }} />}
          {vc.tooltip.visible && (
            <Tooltip formatter={(v: number) => vc.dataLabels.visible ? fmtLabel(v) : valueFormatter(v)}
              contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 6, fontSize: 12 }} />
          )}
          {vc.legend.visible && <Legend {...legendPositionProps(vc.legend.position)} wrapperStyle={{ fontSize: vc.legend.fontSize, fontFamily: fontFamilyCss(vc.legend.fontFamily) }} />}
          <Area type="monotone" dataKey="valor" name={seriesLabel} stroke={color} fill="url(#bi-area-grad)" strokeWidth={2}>
            {vc.dataLabels.visible && (
              rich
                ? <LabelList dataKey="valor" content={renderRichPointLabel as any} />
                : <LabelList dataKey="valor" position={vc.dataLabels.position as any}
                    style={{ fontSize: vc.dataLabels.fontSize, fontFamily, fill: 'hsl(var(--foreground))' }}
                    formatter={fmtLabel as any} />
            )}
          </Area>
        </AreaChart>
      </ResponsiveContainer>
    </ChartCardShell>
  );
}
