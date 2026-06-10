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

// Limites internos para legibilidade dos rótulos externos em Pizza/Rosca.
// Exportados para futura exposição no VisualConfigEditor.
export const MIN_PIE_LABEL_PERCENT = 3;   // fatias < 3% não recebem rótulo externo
export const MAX_VISIBLE_PIE_LABELS = 6;  // no máximo 6 rótulos externos
export const MAX_LABEL_CHARS = 18;        // truncamento de nome longo

function truncateLabel(v: string, max = MAX_LABEL_CHARS) {
  if (!v) return '';
  return v.length > max ? `${v.slice(0, max - 1)}…` : v;
}

/**
 * Seleciona quais fatias podem mostrar rótulo externo:
 *  - exclui fatias abaixo de MIN_PIE_LABEL_PERCENT;
 *  - limita a MAX_VISIBLE_PIE_LABELS, priorizando as maiores.
 * Estrutura pronta para evoluir para "Agrupar em Outros".
 */
function pickLabeledSlices(data: BarChartDatum[], total: number): Set<number> {
  if (!data?.length || total <= 0) return new Set();
  const eligible = data
    .map((d, i) => ({ i, v: Number(d?.valor || 0) }))
    .filter(({ v }) => (v / total) * 100 >= MIN_PIE_LABEL_PERCENT)
    .sort((a, b) => b.v - a.v)
    .slice(0, MAX_VISIBLE_PIE_LABELS);
  return new Set(eligible.map((e) => e.i));
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

  const labeledIdx = useMemo(
    () => (rich ? pickLabeledSlices(data ?? [], total) : new Set<number>()),
    [rich, data, total],
  );
  const hasExternal = rich && labeledIdx.size > 0;

  // Raios — % quando há rótulos externos para liberar margem; px no modo simples.
  const outerRadius: number | string = hasExternal ? '58%' : (rich ? 82 : 90);
  const innerRadius: number | string = donut ? (hasExternal ? '38%' : (rich ? 50 : 55)) : 0;
  const cy = hasExternal ? '46%' : '50%';

  const RichLabelsLayer = (props: any) => {
    if (!hasExternal) return null;
    const { width: cw, height: ch } = props;
    if (!cw || !ch) return null;
    const cx = cw / 2;
    const cyPx = ch * (hasExternal ? 0.46 : 0.5);
    const RADIAN = Math.PI / 180;
    const lineH = fs * 1.2;
    const blockH = lineH * 2;
    const minGap = blockH + 4;
    // raio aproximado em px (58% da menor dimensão da área plotada)
    const rPx = Math.min(cw, ch) * 0.29;
    const anchorR = rPx + 4;
    const labelR = rPx + 18;

    let startAngle = 90;
    const left: RichItem[] = [];
    const right: RichItem[] = [];
    (data ?? []).forEach((d, i) => {
      const v = Number(d?.valor || 0);
      const pct = total > 0 ? v / total : 0;
      const sweep = pct * 360;
      const mid = startAngle - sweep / 2;
      startAngle -= sweep;
      if (!labeledIdx.has(i)) return;
      const { line1, line2 } = formatRichLabel({ name: d?.label, value: v, total, cfg: vc.dataLabels });
      const cosA = Math.cos(-mid * RADIAN);
      const sinA = Math.sin(-mid * RADIAN);
      const ax = cx + anchorR * cosA;
      const ay = cyPx + anchorR * sinA;
      const lx = cx + labelR * cosA;
      const ly = cyPx + labelR * sinA;
      const side: 'left' | 'right' = lx >= cx ? 'right' : 'left';
      const labelX = side === 'right' ? cx + cw * 0.42 : cx - cw * 0.42;
      right; left; // noop
      const item: RichItem = {
        side, y: ly, labelX,
        anchorX: ax, anchorY: ay,
        line1: truncateLabel(line1), line2,
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
      const elbowX = it.side === 'right' ? it.labelX - 8 : it.labelX + 8;
      const textX = it.labelX;
      return (
        <g key={`${it.side}-${k}`} style={{ pointerEvents: 'none' }}>
          <polyline
            points={`${it.anchorX},${it.anchorY} ${elbowX},${it.y} ${textX},${it.y}`}
            fill="none"
            stroke={it.color}
            strokeOpacity={0.5}
            strokeWidth={1}
          />
          <text
            x={textX}
            y={it.y}
            textAnchor={anchor}
            fontSize={fs}
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

  // Tooltip enriquecido: nome + valor + %.
  const tooltipFormatter = (v: number, _name: any, entry: any) => {
    const pct = total > 0 ? (Number(v || 0) / total) * 100 : 0;
    const pctStr = pct.toLocaleString('pt-BR', { maximumFractionDigits: 1, minimumFractionDigits: 1 });
    const valStr = vc.dataLabels.visible ? fmtLabel(v) : valueFormatter(v);
    const fullName = entry?.payload?.label ?? '';
    return [`${valStr} (${pctStr}%)`, fullName];
  };

  const legendFormatter = (value: any) => truncateLabel(String(value ?? ''), 22);

  return (
    <ChartCardShell {...shell} height={height} isEmpty={!data?.length} visualConfig={visualConfig}>
      <div className="relative">
        <ResponsiveContainer width="100%" height={height}>
          <PieChart margin={hasExternal ? { top: 8, right: 32, bottom: 28, left: 32 } : (rich ? { top: 8, right: 24, bottom: 8, left: 24 } : undefined)}>
            <Pie data={data} dataKey="valor" nameKey="label" cx="50%" cy={cy}
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
            {hasExternal && <Customized component={RichLabelsLayer as any} />}
            {vc.tooltip.visible && (
              <Tooltip formatter={tooltipFormatter as any}
                contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 6, fontSize: 12 }} />
            )}
            {vc.legend.visible && (
              <Legend
                {...(hasExternal
                  ? { verticalAlign: 'bottom' as const, align: 'center' as const, layout: 'horizontal' as const }
                  : legendPositionProps(vc.legend.position))}
                formatter={legendFormatter}
                wrapperStyle={{
                  fontSize: hasExternal ? 12 : vc.legend.fontSize,
                  lineHeight: '16px',
                  fontFamily: fontFamilyCss(vc.legend.fontFamily),
                  ...(hasExternal ? { paddingTop: 8, maxHeight: 40, overflow: 'hidden' } : {}),
                }}
              />
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
