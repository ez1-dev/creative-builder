import { useMemo, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { ChartCardShell, ChartCardShellProps } from './ChartCardShell';
import { BI_PALETTE } from '../utils/chartHelpers';
import { formatCurrency } from '../utils/formatters';
import { BarChartDatum } from './BarChartCard';
import { cn } from '@/lib/utils';

export interface DonutSideLegendCardProps
  extends Omit<ChartCardShellProps, 'children' | 'isEmpty'> {
  data: BarChartDatum[];
  valueFormatter?: (v: number) => string;
  centerLabel?: string;
  onItemClick?: (d: BarChartDatum) => void;
}

/**
 * Donut moderno com legenda lateral rica (padrão Stripe/Tremor/Linear).
 * - Rosca à esquerda com total no centro.
 * - Legenda à direita: bolinha colorida, nome, valor, %.
 * - Hover cruzado (donut ↔ legenda) e clique para filtrar.
 */
export function DonutSideLegendCard({
  data,
  valueFormatter = formatCurrency,
  centerLabel = 'Total',
  onItemClick,
  height = 360,
  ...shell
}: DonutSideLegendCardProps) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const sorted = useMemo(
    () => [...(data ?? [])].sort((a, b) => Number(b?.valor || 0) - Number(a?.valor || 0)),
    [data],
  );

  const total = useMemo(
    () => sorted.reduce((s, d) => s + Number(d?.valor || 0), 0),
    [sorted],
  );

  const isEmpty = !sorted.length || total === 0;

  return (
    <ChartCardShell {...shell} height={height} isEmpty={isEmpty}>
      <div
        className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]"
        style={{ minHeight: height }}
      >
        {/* Donut */}
        <div className="relative min-w-0" style={{ height }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
              <Pie
                data={sorted}
                dataKey="valor"
                nameKey="label"
                cx="50%"
                cy="50%"
                innerRadius="62%"
                outerRadius="92%"
                paddingAngle={2}
                stroke="hsl(var(--card))"
                strokeWidth={2}
                isAnimationActive={false}
                cursor={onItemClick ? 'pointer' : undefined}
                onClick={(d: any, i: number) => {
                  const item = sorted[i];
                  if (item) onItemClick?.(item);
                }}
                onMouseEnter={(_: any, i: number) => setHoverIdx(i)}
                onMouseLeave={() => setHoverIdx(null)}
              >
                {sorted.map((_, i) => (
                  <Cell
                    key={i}
                    fill={BI_PALETTE[i % BI_PALETTE.length]}
                    fillOpacity={hoverIdx === null || hoverIdx === i ? 1 : 0.35}
                  />
                ))}
              </Pie>
              <Tooltip
                cursor={false}
                formatter={(v: any, _n: any, entry: any) => {
                  const val = Number(v || 0);
                  const pct = total > 0 ? (val / total) * 100 : 0;
                  const pctStr = pct.toLocaleString('pt-BR', {
                    minimumFractionDigits: 1,
                    maximumFractionDigits: 1,
                  });
                  return [
                    `${valueFormatter(val)} (${pctStr}%)`,
                    entry?.payload?.label ?? '',
                  ];
                }}
                contentStyle={{
                  background: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: 6,
                  fontSize: 12,
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
              {centerLabel}
            </span>
            <span className="text-xl font-bold tabular-nums text-foreground">
              {valueFormatter(total)}
            </span>
            <span className="text-[10px] text-muted-foreground">
              {sorted.length} {sorted.length === 1 ? 'item' : 'itens'}
            </span>
          </div>
        </div>

        {/* Legenda lateral */}
        <div
          className="min-w-0 overflow-y-auto pr-1"
          style={{ maxHeight: height }}
        >
          <ul className="flex flex-col gap-1">
            {sorted.map((d, i) => {
              const val = Number(d?.valor || 0);
              const pct = total > 0 ? (val / total) * 100 : 0;
              const pctStr = pct.toLocaleString('pt-BR', {
                minimumFractionDigits: 1,
                maximumFractionDigits: 1,
              });
              const active = hoverIdx === i;
              const dim = hoverIdx !== null && !active;
              const color = BI_PALETTE[i % BI_PALETTE.length];
              return (
                <li key={`${d?.label}-${i}`}>
                  <button
                    type="button"
                    onMouseEnter={() => setHoverIdx(i)}
                    onMouseLeave={() => setHoverIdx(null)}
                    onClick={() => onItemClick?.(d)}
                    className={cn(
                      'group flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left transition-colors',
                      'hover:bg-muted/60',
                      active && 'bg-muted/70',
                      dim && 'opacity-50',
                    )}
                  >
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: color }}
                      aria-hidden
                    />
                    <span
                      className="min-w-0 flex-1 truncate text-xs font-medium text-foreground"
                      title={String(d?.label ?? '')}
                    >
                      {d?.label}
                    </span>
                    <span className="shrink-0 text-right text-xs tabular-nums text-foreground">
                      {valueFormatter(val)}
                    </span>
                    <span className="w-12 shrink-0 text-right text-[11px] tabular-nums text-muted-foreground">
                      {pctStr}%
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </ChartCardShell>
  );
}
