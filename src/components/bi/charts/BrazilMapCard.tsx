import { ChartCardShell, ChartCardShellProps } from './ChartCardShell';
import { formatCurrency } from '../utils/formatters';
import { cn } from '@/lib/utils';

export interface BrazilMapDatum {
  uf: string;
  valor: number;
  label?: string;
}

export interface BrazilMapCardProps extends Omit<ChartCardShellProps, 'children' | 'isEmpty'> {
  data: BrazilMapDatum[];
  /** cor base (HSL string como `var(--primary)` sem prefixo `hsl()`) */
  colorVar?: string;
  valueFormatter?: (v: number) => string;
}

// Cartograma de UF — posição (row, col) aproximada para cada estado.
const UF_GRID: Record<string, [number, number]> = {
  RR: [0, 4], AP: [0, 6],
  AM: [1, 3], PA: [1, 5], MA: [1, 6], CE: [1, 7], RN: [1, 8],
  AC: [2, 2], RO: [2, 3], TO: [2, 5], PI: [2, 6], PB: [2, 8],
  MT: [3, 4], BA: [3, 6], PE: [3, 7], AL: [3, 8],
  DF: [4, 4], GO: [4, 5], MG: [4, 6], SE: [4, 7], ES: [4, 8],
  MS: [5, 4], SP: [5, 5], RJ: [5, 6],
  PR: [6, 5], SC: [6, 6],
  RS: [7, 5],
};

const ROWS = 8;
const COLS = 9;

export function BrazilMapCard({
  data,
  colorVar = '--primary',
  valueFormatter = formatCurrency,
  height = 320,
  ...shell
}: BrazilMapCardProps) {
  const isEmpty = !data?.length;
  const map = new Map<string, BrazilMapDatum>();
  data?.forEach((d) => {
    if (d.uf) map.set(String(d.uf).toUpperCase(), d);
  });
  const max = Math.max(1, ...data.map((d) => d.valor || 0));

  const cell = Math.min(Math.floor(height / ROWS), 44);
  const gap = 4;
  const widthPx = COLS * (cell + gap);

  return (
    <ChartCardShell {...shell} height={height} isEmpty={isEmpty}>
      <div className="flex h-full w-full items-center justify-center">
        <div
          className="grid"
          style={{
            gridTemplateColumns: `repeat(${COLS}, ${cell}px)`,
            gridTemplateRows: `repeat(${ROWS}, ${cell}px)`,
            gap: `${gap}px`,
            width: widthPx,
          }}
        >
          {Object.entries(UF_GRID).map(([uf, [r, c]]) => {
            const d = map.get(uf);
            const v = d?.valor ?? 0;
            const intensity = max > 0 ? Math.max(0.12, v / max) : 0.12;
            const hasData = !!d && v > 0;
            return (
              <div
                key={uf}
                title={d ? `${uf}: ${valueFormatter(v)}` : `${uf}: sem dados`}
                className={cn(
                  'flex items-center justify-center rounded text-[10px] font-semibold tabular-nums',
                  'border border-border/60',
                  hasData ? 'text-white' : 'text-muted-foreground',
                )}
                style={{
                  gridRow: r + 1,
                  gridColumn: c + 1,
                  backgroundColor: hasData
                    ? `hsl(var(${colorVar}) / ${intensity.toFixed(2)})`
                    : 'hsl(var(--muted))',
                }}
              >
                {uf}
              </div>
            );
          })}
        </div>
      </div>
    </ChartCardShell>
  );
}
