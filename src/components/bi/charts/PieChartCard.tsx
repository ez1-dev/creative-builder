import { useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend, LabelList, Customized } from 'recharts';
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

interface RichItem {
  side: 'left' | 'right';
  y: number;
  labelX: number;
  line1: string;
  line2: string;
  color: string;
}


function resolveCollisions(items: RichItem[], minGap: number, top: number, bottom: number) {
  // Empurra para baixo
  items.sort((a, b) => a.y - b.y);
  for (let i = 1; i < items.length; i++) {
    const prev = items[i - 1];
    const cur = items[i];
    if (cur.y - prev.y < minGap) cur.y = prev.y + minGap;
  }
  // Empurra para cima se estourou
  if (items.length && items[items.length - 1].y > bottom) {
    items[items.length - 1].y = bottom;
    for (let i = items.length - 2; i >= 0; i--) {
      if (items[i + 1].y - items[i].y < minGap) items[i].y = items[i + 1].y - minGap;
    }
  }
  // Garante topo
  if (items.length && items[0].y < top) {
    items[0].y = top;
    for (let i = 1; i < items.length; i++) {
      if (items[i].y - items[i - 1].y < minGap) items[i].y = items[i - 1].y + minGap;
    }
  }
}

export function PieChartCard({
  data, valueFormatter = formatCurrency, donut, centerLabel, centerValue, onItemClick, height = 280, visualConfig, ...shell
}: PieChartCardProps) {
  const vc = mergeVisualConfig(visualConfig);
  const fmtLabel = (v: any) => formatDataLabel(v, vc.dataLabels);
  const total = useMemo(() => (data ?? []).reduce((s, d) => s + Number(d?.valor || 0), 0), [data]);
  const rich = vc.dataLabels.visible && !!vc.dataLabels.richLabel;
  const fontFamily = fontFamilyCss(vc.dataLabels.fontFamily);
  const fs = vc.dataLabels.fontSize;
  const outerRadius = rich ? 82 : 90;
  const innerRadius = donut ? (rich ? 50 : 55) : 0;

  const RichLabelsLayer = (props: any) => {
    if (!rich || !data?.length) return null;
    const { width: cw, height: ch } = props;
    if (!cw || !ch) return null;
    const cx = cw / 2;
    const cy = ch / 2;
    const RADIAN = Math.PI / 180;
    const layerFs = data.length > 6 ? Math.max(9, fs - 1) : fs;
    const lineH = layerFs * 1.2;
    const blockH = lineH * 2;
    const minGap = blockH + 2;
    const labelR = outerRadius + 18;

    let startAngle = 90;
    const left: RichItem[] = [];
    const right: RichItem[] = [];
    data.forEach((d, i) => {
      const v = Number(d?.valor || 0);
      const pct = total > 0 ? v / total : 0;
      const sweep = pct * 360;
      const mid = startAngle - sweep / 2;
      startAngle -= sweep;
      const { line1, line2 } = formatRichLabel({ name: d?.label, value: v, total, cfg: vc.dataLabels });
      const cosA = Math.cos(-mid * RADIAN);
      const sinA = Math.sin(-mid * RADIAN);
      const lx = cx + labelR * cosA;
      const ly = cy + labelR * sinA;
      const side: 'left' | 'right' = lx >= cx ? 'right' : 'left';
      const item: RichItem = {
        side, y: ly, labelX: lx,
        line1, line2,
        color: BI_PALETTE[i % BI_PALETTE.length],
      };
      (side === 'right' ? right : left).push(item);
    });

    const top = blockH / 2 + 2;
    const bot = ch - blockH / 2 - 2;
    resolveCollisions(right, minGap, top, bot);
    resolveCollisions(left, minGap, top, bot);

    const renderItem = (it: RichItem, k: number) => {
      const anchor = it.side === 'right' ? 'start' : 'end';
      const textX = it.labelX;
      return (
        <g key={`${it.side}-${k}`} style={{ pointerEvents: 'none' }}>
          <text
            x={textX}
            y={it.y}
            textAnchor={anchor}
            fontSize={layerFs}
            fill="hsl(var(--foreground))"
            style={{ fontFamily }}
          >
            {it.line1 && <tspan x={textX} dy="-0.25em" fill="hsl(var(--foreground))" style={{ fontWeight: 600 }}>{it.line1}</tspan>}
            {it.line2 && <tspan x={textX} dy={it.line1 ? '1.15em' : '0'} fill="hsl(var(--muted-foreground))">{it.line2}</tspan>}
          </text>
        </g>
      );

    };

    return <g>{right.map(renderItem)}{left.map(renderItem)}</g>;
  };



  return (
    <ChartCardShell {...shell} height={height} isEmpty={!data?.length} visualConfig={visualConfig}>
      <div className="relative">
        <ResponsiveContainer width="100%" height={height}>
          <PieChart margin={rich ? { top: 8, right: 24, bottom: 8, left: 24 } : undefined}>
            <Pie data={data} dataKey="valor" nameKey="label" cx="50%" cy="50%"
              innerRadius={innerRadius} outerRadius={outerRadius} paddingAngle={donut ? 2 : 0}
              cursor={onItemClick ? 'pointer' : undefined}
              onClick={(d: any) => onItemClick?.(d as BarChartDatum)}
              labelLine={false}
              isAnimationActive={false}
            >
              {data.map((_, i) => <Cell key={i} fill={BI_PALETTE[i % BI_PALETTE.length]} />)}
              {vc.dataLabels.visible && !rich && (
                <LabelList dataKey="valor" position={vc.dataLabels.position === 'inside' ? 'inside' : 'outside'}
                  style={{ fontSize: vc.dataLabels.fontSize, fontFamily, fill: 'hsl(var(--foreground))' }}
                  formatter={fmtLabel as any} />
              )}
            </Pie>
            {rich && <Customized component={RichLabelsLayer as any} />}
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
