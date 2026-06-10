import { useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend, LabelList } from 'recharts';
import { ChartCardShell, ChartCardShellProps } from './ChartCardShell';
import { formatCurrency } from '../utils/formatters';
import { BI_PALETTE } from '../utils/chartHelpers';
import { BarChartDatum } from './BarChartCard';
import { mergeVisualConfig, formatDataLabel, formatRichLabel, legendPositionProps, fontFamilyCss } from '@/lib/bi/visualConfig';

export interface PieChartCardProps extends Omit<ChartCardShellProps, 'children' | 'isEmpty'> {
  data: BarChartDatum[];
  valueFormatter?: (v: number) => string;
  donut?: boolean;
  centerLabel?: string;
  centerValue?: string;
  onItemClick?: (d: BarChartDatum) => void;
}

export function PieChartCard({
  data, valueFormatter = formatCurrency, donut, centerLabel, centerValue, onItemClick, height = 280, visualConfig, ...shell
}: PieChartCardProps) {
  const vc = mergeVisualConfig(visualConfig);
  const fmtLabel = (v: any) => formatDataLabel(v, vc.dataLabels);
  const total = useMemo(() => (data ?? []).reduce((s, d) => s + Number(d?.valor || 0), 0), [data]);
  const rich = vc.dataLabels.visible && !!vc.dataLabels.richLabel;
  const fontFamily = fontFamilyCss(vc.dataLabels.fontFamily);

  const richLabelRenderer = (e: any) => {
    const RADIAN = Math.PI / 180;
    const radius = (e.outerRadius ?? 90) + 22;
    const x = e.cx + radius * Math.cos(-e.midAngle * RADIAN);
    const y = e.cy + radius * Math.sin(-e.midAngle * RADIAN);
    const { line1, line2 } = formatRichLabel({ name: e.name, value: Number(e.value || 0), total, cfg: vc.dataLabels });
    const anchor = x > e.cx ? 'start' : 'end';
    return (
      <text x={x} y={y} fill="hsl(var(--foreground))" textAnchor={anchor} fontSize={vc.dataLabels.fontSize} style={{ fontFamily }}>
        {line1 && <tspan x={x} dy="-0.3em">{line1}</tspan>}
        {line2 && <tspan x={x} dy={line1 ? '1.15em' : '0'} fill="hsl(var(--muted-foreground))">{line2}</tspan>}
      </text>
    );
  };

  return (
    <ChartCardShell {...shell} height={height} isEmpty={!data?.length} visualConfig={visualConfig}>
      <div className="relative">
        <ResponsiveContainer width="100%" height={height}>
          <PieChart>
            <Pie data={data} dataKey="valor" nameKey="label" cx="50%" cy="50%"
              innerRadius={donut ? 55 : 0} outerRadius={90} paddingAngle={donut ? 2 : 0}
              cursor={onItemClick ? 'pointer' : undefined}
              onClick={(d: any) => onItemClick?.(d as BarChartDatum)}
              label={rich ? richLabelRenderer : undefined}
              labelLine={rich ? { stroke: 'hsl(var(--muted-foreground))', strokeWidth: 1 } : false}
            >
              {data.map((_, i) => <Cell key={i} fill={BI_PALETTE[i % BI_PALETTE.length]} />)}
              {vc.dataLabels.visible && !rich && (
                <LabelList dataKey="valor" position={vc.dataLabels.position === 'inside' ? 'inside' : 'outside'}
                  style={{ fontSize: vc.dataLabels.fontSize, fontFamily, fill: 'hsl(var(--foreground))' }}
                  formatter={fmtLabel as any} />
              )}
            </Pie>
            {vc.tooltip.visible && (
              <Tooltip formatter={(v: number) => vc.dataLabels.visible ? fmtLabel(v) : valueFormatter(v)}
                contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 6, fontSize: 12 }} />
            )}
            {vc.legend.visible && (
              <Legend {...legendPositionProps(vc.legend.position)} wrapperStyle={{ fontSize: vc.legend.fontSize, fontFamily: fontFamilyCss(vc.legend.fontFamily) }} />
            )}
          </PieChart>
        </ResponsiveContainer>
        {donut && (centerLabel || centerValue) && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center pb-10">
            {centerLabel && <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{centerLabel}</span>}
            {centerValue && <span className="text-sm font-bold tabular-nums">{centerValue}</span>}
          </div>
        )}
      </div>
    </ChartCardShell>
  );
}
