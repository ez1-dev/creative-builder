import { useMemo } from 'react';
import { ResponsiveContainer, Treemap, Tooltip } from 'recharts';
import { ChartCardShell, ChartCardShellProps } from './ChartCardShell';
import { BI_PALETTE } from '../utils/chartHelpers';
import { formatCurrency } from '../utils/formatters';
import { mergeVisualConfig, fontFamilyCss } from '@/lib/bi/visualConfig';

export interface TreemapDatum { name: string; value: number; children?: TreemapDatum[] }

export interface TreemapChartCardProps extends Omit<ChartCardShellProps, 'children' | 'isEmpty'> {
  data: TreemapDatum[];
  valueFormatter?: (v: number) => string;
  onItemClick?: (d: TreemapDatum) => void;
}

function formatCompactCurrency(v: number): string {
  const abs = Math.abs(v);
  const sign = v < 0 ? '-' : '';
  if (abs >= 1_000_000_000) return `${sign}R$ ${(abs / 1_000_000_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} bi`;
  if (abs >= 1_000_000) return `${sign}R$ ${(abs / 1_000_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mi`;
  if (abs >= 1_000) return `${sign}R$ ${(abs / 1_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mil`;
  return `${sign}R$ ${abs.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`;
}

// Cores hex do BI_PALETTE → contrast text
function pickTextColor(bg: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(bg);
  if (!m) return '#fff';
  const r = parseInt(m[1].slice(0, 2), 16);
  const g = parseInt(m[1].slice(2, 4), 16);
  const b = parseInt(m[1].slice(4, 6), 16);
  // luminance perceptual
  const L = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return L > 0.62 ? '#111827' : '#ffffff';
}

function truncateToWidth(label: string, maxChars: number) {
  if (label.length <= maxChars) return label;
  if (maxChars <= 1) return '…';
  return `${label.slice(0, Math.max(1, maxChars - 1))}…`;
}

export function TreemapChartCard({ data, valueFormatter = formatCurrency, height = 280, onItemClick, visualConfig, ...shell }: TreemapChartCardProps) {
  const isEmpty = !data?.length;
  const total = useMemo(() => (data ?? []).reduce((s, d) => s + Number(d?.value || 0), 0), [data]);
  const vc = mergeVisualConfig(visualConfig);
  const labelFontFamily = fontFamilyCss(vc.dataLabels.fontFamily);
  return (
    <ChartCardShell {...shell} height={height} isEmpty={isEmpty} visualConfig={visualConfig}>
      <ResponsiveContainer width="100%" height={height}>
        <Treemap
          data={data}
          dataKey="value"
          stroke="hsl(var(--background))"
          fill="hsl(var(--primary))"
          content={<CustomCell onItemClick={onItemClick} total={total} fontFamily={labelFontFamily} />}
        >
          <Tooltip
            cursor={{ fill: 'transparent' }}
            formatter={(v: number) => {
              const pct = total > 0 ? ((v / total) * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) : '0';
              return [`${valueFormatter(v)} (${pct}%)`, ''] as any;
            }}
            contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 6, fontSize: 12, fontFamily: labelFontFamily }}
          />
        </Treemap>
      </ResponsiveContainer>
    </ChartCardShell>
  );
}

function CustomCell(props: any) {
  const { x, y, width, height, index, name, value, onItemClick, total, fontFamily } = props;
  if (!width || !height || width < 2 || height < 2) return null;
  const color = BI_PALETTE[index % BI_PALETTE.length];
  const textColor = pickTextColor(color);
  const mutedColor = textColor === '#ffffff' ? 'rgba(255,255,255,0.85)' : 'rgba(17,24,39,0.7)';
  const clickable = !!onItemClick;

  // tamanho de fonte adaptativo pela área
  const area = width * height;
  const baseFs = Math.max(10, Math.min(20, Math.sqrt(area) / 9));
  const nameFs = Math.round(baseFs);
  const valueFs = Math.max(9, Math.round(baseFs * 0.85));
  const pctFs = Math.max(9, Math.round(baseFs * 0.75));

  const pad = 6;
  const innerW = width - pad * 2;
  const innerH = height - pad * 2;

  // estimativa de caracteres que cabem
  const charPx = nameFs * 0.55;
  const maxChars = Math.max(1, Math.floor(innerW / charPx));

  const showName = innerW >= 28 && innerH >= 14;
  const showValue = showName && innerH >= nameFs + valueFs + 6 && innerW >= 50;
  const showPct = showValue && total > 0 && innerH >= nameFs + valueFs + pctFs + 8 && innerW >= 60;

  const pct = total > 0 ? (Number(value || 0) / total) * 100 : 0;
  const pctStr = `${pct.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;

  return (
    <g
      style={{ cursor: clickable ? 'pointer' : undefined }}
      onClick={clickable ? () => onItemClick({ name, value }) : undefined}
    >
      <rect x={x} y={y} width={width} height={height} fill={color} stroke="hsl(var(--background))" />
      {showName && (
        <text
          x={x + pad}
          y={y + pad + nameFs}
          fill={textColor}
          fontSize={nameFs}
          fontWeight={700}
          style={{ pointerEvents: 'none', fontFamily }}
        >
          {truncateToWidth(String(name ?? ''), maxChars)}
        </text>
      )}
      {showValue && (
        <text
          x={x + pad}
          y={y + pad + nameFs + valueFs + 2}
          fill={textColor}
          fontSize={valueFs}
          fontWeight={500}
          style={{ pointerEvents: 'none', fontFamily }}
        >
          {formatCompactCurrency(Number(value || 0))}
        </text>
      )}
      {showPct && (
        <text
          x={x + pad}
          y={y + pad + nameFs + valueFs + pctFs + 6}
          fill={mutedColor}
          fontSize={pctFs}
          fontWeight={500}
          style={{ pointerEvents: 'none', fontFamily }}
        >
          {pctStr}
        </text>
      )}
    </g>
  );
}
