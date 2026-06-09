/**
 * BrazilStateMapWidget
 *
 * Mapa do Brasil por UF para o BI Comercial / Faturamento.
 * - Busca dados via /api/bi/comercial/estado respeitando todos os filtros ativos.
 * - Normaliza o payload (uf/cd_estado, nm_estado/estado_label, valor/faturamento/...).
 * - Renderiza um cartograma com intensidade por faturamento (cinza = sem valor).
 * - Tooltip "UF - Nome do Estado: R$ ..." em cada célula.
 * - Legenda horizontal com menor/maior valor.
 * - Click → onDrill({ dimensao:'estado', campo:'cd_estado', valor: 'SP', label: 'SP - São Paulo' }).
 *   O label é apenas visual; o filtro/drill sempre usa o código cru da UF.
 */
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChartCardShell } from '@/components/bi/charts/ChartCardShell';
import { fetchComercialEstado } from '@/lib/bi/comercialApi';
import type { BiComercialFilters } from '@/lib/bi/comercialFilters';
import { formatCurrency } from '@/components/bi/utils/formatters';
import { formatEstadoLabel, ufName } from '@/lib/bi/ufLabels';
import { cn } from '@/lib/utils';

export interface BrazilStateDrillPayload {
  dimensao: 'estado';
  campo: 'cd_estado';
  valor: string;
  label: string;
}

export interface BrazilStateMapWidgetProps {
  title?: string;
  subtitle?: string;
  filters: BiComercialFilters;
  height?: number;
  /** Disparado ao clicar em um estado. Use para empilhar drill no BI Comercial. */
  onDrill?: (payload: BrazilStateDrillPayload) => void;
}

// Cartograma de UF — mesma malha usada em BrazilMapCard.
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

interface NormalizedRow {
  uf: string;
  nome: string;
  valor: number;
}

function normalizeRow(row: any): NormalizedRow | null {
  const rawUf = row?.uf ?? row?.cd_estado ?? row?.estado ?? '';
  const code = String(rawUf).trim().toUpperCase();
  const m = code.match(/[A-Z]{2}/);
  const uf = m ? m[0] : '';
  if (!uf) return null;
  const nomeRaw =
    row?.nm_estado ?? row?.estado_nome ?? row?.estado_label ?? ufName(uf) ?? uf;
  const valor = Number(
    row?.valor ?? row?.faturamento ?? row?.vl_faturamento ?? row?.valor_faturamento ?? 0,
  );
  return { uf, nome: String(nomeRaw), valor: Number.isFinite(valor) ? valor : 0 };
}

export function BrazilStateMapWidget({
  title = 'Faturamento por Estado',
  subtitle,
  filters,
  height = 360,
  onDrill,
}: BrazilStateMapWidgetProps) {
  const query = useQuery({
    queryKey: ['bi-comercial-estado-mapa', filters],
    queryFn: () => fetchComercialEstado(filters),
    staleTime: 60_000,
  });

  const rows = useMemo<NormalizedRow[]>(() => {
    return (query.data ?? [])
      .map(normalizeRow)
      .filter((r): r is NormalizedRow => r != null);
  }, [query.data]);

  const map = useMemo(() => {
    const m = new Map<string, NormalizedRow>();
    rows.forEach((r) => m.set(r.uf, r));
    return m;
  }, [rows]);

  const valores = rows.map((r) => r.valor).filter((v) => v > 0);
  const max = valores.length ? Math.max(...valores) : 0;
  const min = valores.length ? Math.min(...valores) : 0;

  const cell = Math.min(Math.floor(height / (ROWS + 2)), 44);
  const gap = 4;
  const gridWidth = COLS * (cell + gap);

  return (
    <ChartCardShell
      title={title}
      subtitle={subtitle}
      height={height}
      loading={query.isLoading}
      error={query.isError ? (query.error as Error)?.message ?? 'Erro ao carregar' : null}
      isEmpty={!query.isLoading && rows.length === 0}
    >
      <div className="flex h-full w-full flex-col items-center justify-center gap-3">
        <div
          className="grid"
          style={{
            gridTemplateColumns: `repeat(${COLS}, ${cell}px)`,
            gridTemplateRows: `repeat(${ROWS}, ${cell}px)`,
            gap: `${gap}px`,
            width: gridWidth,
          }}
        >
          {Object.entries(UF_GRID).map(([uf, [r, c]]) => {
            const d = map.get(uf);
            const v = d?.valor ?? 0;
            const intensity = max > 0 ? Math.max(0.12, v / max) : 0.12;
            const hasData = !!d && v > 0;
            const clickable = !!onDrill && hasData;
            const labelFull = formatEstadoLabel(uf);
            const tooltip = hasData
              ? `${labelFull}: ${formatCurrency(v)}${clickable ? ' — Clique para detalhar' : ''}`
              : `${labelFull}: sem dados`;
            return (
              <button
                type="button"
                key={uf}
                disabled={!clickable}
                onClick={() =>
                  clickable &&
                  onDrill!({
                    dimensao: 'estado',
                    campo: 'cd_estado',
                    valor: uf,
                    label: labelFull,
                  })
                }
                title={tooltip}
                aria-label={tooltip}
                className={cn(
                  'flex items-center justify-center rounded text-[10px] font-semibold tabular-nums',
                  'border border-border/60 transition-transform',
                  clickable && 'cursor-pointer hover:scale-110 hover:ring-2 hover:ring-ring',
                  hasData ? 'text-primary-foreground' : 'text-muted-foreground',
                )}
                style={{
                  gridRow: r + 1,
                  gridColumn: c + 1,
                  backgroundColor: hasData
                    ? `hsl(var(--primary) / ${intensity.toFixed(2)})`
                    : 'hsl(var(--muted))',
                }}
              >
                {uf}
              </button>
            );
          })}
        </div>

        {/* Legenda horizontal: menor → maior */}
        {valores.length > 0 && (
          <div className="flex w-full max-w-md items-center gap-2 px-2">
            <span className="text-[10px] tabular-nums text-muted-foreground">
              {formatCurrency(min)}
            </span>
            <div
              className="h-2 flex-1 rounded"
              style={{
                background:
                  'linear-gradient(to right, hsl(var(--primary) / 0.12), hsl(var(--primary)))',
              }}
              aria-hidden
            />
            <span className="text-[10px] tabular-nums text-muted-foreground">
              {formatCurrency(max)}
            </span>
          </div>
        )}
      </div>
    </ChartCardShell>
  );
}

export default BrazilStateMapWidget;
