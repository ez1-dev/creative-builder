import { useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend, LabelList, Customized } from 'recharts';
import { ChartCardShell, ChartCardShellProps } from './ChartCardShell';
import { formatCurrency } from '../utils/formatters';
import { BI_PALETTE } from '../utils/chartHelpers';
import { BarChartDatum } from './BarChartCard';
import { mergeVisualConfig, formatDataLabel, formatRichLabel, fontFamilyCss } from '@/lib/bi/visualConfig';

export interface PieChartCardProps extends Omit<ChartCardShellProps, 'children' | 'isEmpty'> {
  data: BarChartDatum[];
  valueFormatter?: (v: number) => string;
  donut?: boolean;
  centerLabel?: string;
  centerValue?: string;
  onItemClick?: (d: BarChartDatum) => void;
}

// Pizza/Rosca: adaptive labels.
// - Compacto (card pequeno ou muitas categorias): % dentro das fatias grandes.
// - Externo (apenas com folga real e rótulos enriquecidos): leader-lines, top 6, ≥4%.
export const COMPACT_PIE_WIDTH = 760;
export const COMPACT_PIE_HEIGHT = 360;
export const MAX_EXTERNAL_PIE_LABELS = 6;
export const MIN_EXTERNAL_LABEL_PERCENT = 4;
export const MIN_INSIDE_LABEL_PERCENT = 6;
export const MAX_DATA_FOR_EXTERNAL = 8;
export const MAX_LABEL_CHARS = 18;

function truncateLabel(v: string, max = MAX_LABEL_CHARS) {
  if (!v) return '';
  return v.length > max ? `${v.slice(0, max - 1)}…` : v;
}

interface RichItem {
  side: 'left' | 'right';
  y: number;
  labelX: number;
  anchorX: number;
  anchorY: number;
  line1: string;
  line2: string;
  color: string;
}

function resolveCollisions(items: RichItem[], minGap: number, top: number, bottom: number) {
  items.sort((a, b) => a.y - b.y);
  for (let i = 1; i < items.length; i++) {
    const prev = items[i - 1];
    const cur = items[i];
    if (cur.y - prev.y < minGap) cur.y = prev.y + minGap;
  }
  if (items.length && items[items.length - 1].y > bottom) {
    items[items.length - 1].y = bottom;
    for (let i = items.length - 2; i >= 0; i--) {
      if (items[i + 1].y - items[i].y < minGap) items[i].y = items[i + 1].y - minGap;
    }
  }
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

  // Layout responsivo (percentuais) para não cortar em cards pequenos.
  const outerRadius: number | string = rich ? '58%' : '78%';
  const innerRadius: number | string = donut ? (rich ? '35%' : '55%') : 0;
  const cy = '46%';

  const PieLabelsLayer = (props: any) => {
    const { width: cw, height: ch } = props;
    if (!cw || !ch || !total || !data?.length) return null;

    const isCompact = cw < COMPACT_PIE_WIDTH || ch < COMPACT_PIE_HEIGHT || data.length > MAX_DATA_FOR_EXTERNAL;
    const allowExternal = rich && !isCompact && data.length <= MAX_DATA_FOR_EXTERNAL;

    const cx = cw / 2;
    const cyPx = ch * 0.46;
    const RADIAN = Math.PI / 180;
    const rPx = Math.min(cw, ch) * 0.34;



    // Geometria das fatias.
    let startAngle = 90;
    const slices = (data ?? []).map((d, i) => {
      const v = Number(d?.valor || 0);
      const pct = total > 0 ? v / total : 0;
      const sweep = pct * 360;
      const mid = startAngle - sweep / 2;
      startAngle -= sweep;
      return { i, d, v, pct, mid };
    });

    if (allowExternal) {
      // Seleciona top N por valor com pct >= MIN_EXTERNAL_LABEL_PERCENT
      const eligibleSet = new Set(
        [...slices]
          .filter((s) => s.pct * 100 >= MIN_EXTERNAL_LABEL_PERCENT)
          .sort((a, b) => b.v - a.v)
          .slice(0, MAX_EXTERNAL_PIE_LABELS)
          .map((s) => s.i),
      );

      const lineH = fs * 1.2;
      const blockH = lineH * 2;
      const minGap = blockH + 4;
      const anchorR = rPx + 4;
      const labelR = rPx + 18;

      const left: RichItem[] = [];
      const right: RichItem[] = [];
      slices.forEach(({ i, d, v, mid }) => {
        if (!eligibleSet.has(i)) return;
        const { line1, line2 } = formatRichLabel({ name: d?.label, value: v, total, cfg: vc.dataLabels });
        const cosA = Math.cos(-mid * RADIAN);
        const sinA = Math.sin(-mid * RADIAN);
        const ax = cx + anchorR * cosA;
        const ay = cyPx + anchorR * sinA;
        const lx = cx + labelR * cosA;
        const ly = cyPx + labelR * sinA;
        const side: 'left' | 'right' = lx >= cx ? 'right' : 'left';
        const labelX = side === 'right' ? cx + cw * 0.42 : cx - cw * 0.42;
        (side === 'right' ? right : left).push({
          side, y: ly, labelX,
          anchorX: ax, anchorY: ay,
          line1: truncateLabel(line1), line2,
          color: BI_PALETTE[i % BI_PALETTE.length],
        });
      });

      const top = blockH / 2 + 2;
      const bot = ch - blockH / 2 - 2;
      resolveCollisions(right, minGap, top, bot);
      resolveCollisions(left, minGap, top, bot);

      const renderItem = (it: RichItem, k: number) => {
        const anchor = it.side === 'right' ? 'start' : 'end';
        const elbowX = it.side === 'right' ? it.labelX - 8 : it.labelX + 8;
        return (
          <g key={`${it.side}-${k}`} style={{ pointerEvents: 'none' }}>
            <polyline
              points={`${it.anchorX},${it.anchorY} ${elbowX},${it.y} ${it.labelX},${it.y}`}
              fill="none"
              stroke={it.color}
              strokeOpacity={0.5}
              strokeWidth={1}
            />
            <text
              x={it.labelX}
              y={it.y}
              textAnchor={anchor}
              fontSize={fs}
              fill="hsl(var(--foreground))"
              style={{ fontFamily }}
            >
              {it.line1 && <tspan x={it.labelX} dy="-0.25em" fill="hsl(var(--foreground))" style={{ fontWeight: 600 }}>{it.line1}</tspan>}
              {it.line2 && <tspan x={it.labelX} dy={it.line1 ? '1.15em' : '0'} fill="hsl(var(--muted-foreground))">{it.line2}</tspan>}
            </text>
          </g>
        );
      };

      return <g>{right.map(renderItem)}{left.map(renderItem)}</g>;
    }

    // Modo compacto: só % dentro das fatias grandes.
    if (!vc.dataLabels.visible) return null;
    const insideR = donut
      ? (Number(String(outerRadius).replace('%','')) / 100 + Number(String(innerRadius).replace('%','')) / 100) / 2 * Math.min(cw, ch) * 0.95
      : rPx * 0.62;

    return (
      <g style={{ pointerEvents: 'none' }}>
        {slices.map(({ i, d, v, pct, mid }) => {
          if (pct * 100 < MIN_INSIDE_LABEL_PERCENT) return null;
          const cosA = Math.cos(-mid * RADIAN);
          const sinA = Math.sin(-mid * RADIAN);
          const x = cx + insideR * cosA;
          const y = cyPx + insideR * sinA;
          const pctStr = (pct * 100).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
          const valStr = fmtLabel(v);
          return (
            <text
              key={i}
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={fs}
              fill="#fff"
              style={{ fontFamily, fontWeight: 600, paintOrder: 'stroke', stroke: 'rgba(0,0,0,0.45)', strokeWidth: 2 }}
            >
              <tspan x={x} dy="-0.35em">{pctStr}%</tspan>
              <tspan x={x} dy="1.15em" fontWeight={500} fontSize={Math.max(10, fs - 1)}>{valStr}</tspan>
            </text>
          );
        })}
      </g>
    );
  };


  // Tooltip enriquecido: nome + valor + %.
  const tooltipFormatter = (v: number, _name: any, entry: any) => {
    const pct = total > 0 ? (Number(v || 0) / total) * 100 : 0;
    const pctStr = pct.toLocaleString('pt-BR', { maximumFractionDigits: 1, minimumFractionDigits: 1 });
    const valStr = vc.dataLabels.visible ? fmtLabel(v) : valueFormatter(v);
    const fullName = entry?.payload?.label ?? '';
    return [`${valStr} (${pctStr}%)`, fullName];
  };

  const legendFormatter = (value: any, entry: any) => {
    const v = Number(entry?.payload?.valor ?? entry?.payload?.value ?? 0);
    const name = truncateLabel(String(value ?? ''), 22);
    if (!total) return name;
    const pct = (v / total) * 100;
    const pctStr = pct.toLocaleString('pt-BR', { maximumFractionDigits: pct >= 10 ? 0 : 1 });
    return `${name} · ${valueFormatter(v)} (${pctStr}%)`;
  };


  // Quando rich e visível, suprimimos o LabelList simples (o layer cuida).
  const useSimpleLabelList = vc.dataLabels.visible && !rich;

  return (
    <ChartCardShell {...shell} height={height} isEmpty={!data?.length} visualConfig={visualConfig}>
      <div className="relative">
        <ResponsiveContainer width="100%" height={height}>
          <PieChart margin={{ top: 16, right: 20, bottom: 56, left: 20 }}>
            <Pie data={data} dataKey="valor" nameKey="label" cx="50%" cy={cy}
              innerRadius={innerRadius} outerRadius={outerRadius} paddingAngle={donut ? 2 : 0}
              cursor={onItemClick ? 'pointer' : undefined}
              onClick={(d: any) => onItemClick?.(d as BarChartDatum)}
              labelLine={false}
              isAnimationActive={false}
            >
              {data.map((_, i) => <Cell key={i} fill={BI_PALETTE[i % BI_PALETTE.length]} />)}
              {useSimpleLabelList && (
                <LabelList dataKey="valor" position={vc.dataLabels.position === 'inside' ? 'inside' : 'outside'}
                  style={{ fontSize: vc.dataLabels.fontSize, fontFamily, fill: 'hsl(var(--foreground))' }}
                  formatter={fmtLabel as any} />
              )}
            </Pie>
            {vc.dataLabels.visible && <Customized component={PieLabelsLayer as any} />}
            {vc.tooltip.visible && (
              <Tooltip formatter={tooltipFormatter as any}
                contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 6, fontSize: 12 }} />
            )}
            {vc.legend.visible && (
              <Legend
                verticalAlign="bottom"
                align="center"
                layout="horizontal"
                formatter={legendFormatter}
                wrapperStyle={{
                  fontSize: 12,
                  lineHeight: '16px',
                  fontFamily: fontFamilyCss(vc.legend.fontFamily),
                  paddingTop: 8,
                  maxHeight: 56,
                  overflowY: 'auto',
                  width: '100%',
                }}
              />
            )}
          </PieChart>
        </ResponsiveContainer>
        {donut && (() => {
          const label = centerLabel ?? (centerValue ? undefined : 'Total');
          const value = centerValue ?? (total ? new Intl.NumberFormat('pt-BR').format(total) : undefined);
          if (!label && !value) return null;
          return (
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center pb-16">
              {label && <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>}
              {value && <span className="text-lg font-bold tabular-nums">{value}</span>}
            </div>
          );
        })()}

      </div>
    </ChartCardShell>
  );
}
