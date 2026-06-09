/**
 * BrazilHeatMap
 *
 * Mapa coroplético (geográfico real) do Brasil por UF usando react-simple-maps.
 * - GeoJSON local em /maps/brasil-estados.geojson com properties.sigla.
 * - Intensidade via token semântico hsl(var(--primary) / x). Sem cor hardcoded.
 * - Tooltip nativo (atributo title) com "UF - Nome: valor formatado".
 * - Click chama onStateClick(uf, datum) apenas quando há dado.
 *
 * Não altera o widget cartograma existente (BrazilStateMapWidget).
 */
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ComposableMap, Geographies, Geography } from 'react-simple-maps';
import { ChartCardShell, type ChartCardShellProps } from '@/components/bi/charts/ChartCardShell';
import { formatCurrency } from '@/components/bi/utils/formatters';
import { formatEstadoLabel } from '@/lib/bi/ufLabels';
import { buildUfValueMap, getHeatIntensity } from '@/lib/bi/mapUtils';
import { cn } from '@/lib/utils';

export interface BrazilHeatMapDatum {
  uf: string;
  valor: number;
  label?: string;
}

export interface BrazilHeatMapProps
  extends Omit<ChartCardShellProps, 'children' | 'isEmpty'> {
  data: BrazilHeatMapDatum[];
  /** Variável CSS para a cor base (sem prefixo `hsl()`). Default: `--primary`. */
  colorVar?: string;
  valueFormatter?: (v: number) => string;
  /** Caminho público do GeoJSON. Default: `/maps/brasil-estados.geojson`. */
  geoUrl?: string;
  showLegend?: boolean;
  onStateClick?: (uf: string, datum?: BrazilHeatMapDatum) => void;
}

const DEFAULT_GEO_URL = '/maps/brasil-estados.geojson';

export function BrazilHeatMap({
  data,
  colorVar = '--primary',
  valueFormatter = formatCurrency,
  geoUrl = DEFAULT_GEO_URL,
  height = 360,
  showLegend = true,
  onStateClick,
  ...shell
}: BrazilHeatMapProps) {
  const geoQuery = useQuery({
    queryKey: ['geo-brasil-uf', geoUrl],
    queryFn: async () => {
      const res = await fetch(geoUrl);
      if (!res.ok) throw new Error(`Falha ao carregar mapa (${res.status})`);
      return (await res.json()) as any;
    },
    staleTime: Infinity,
    gcTime: Infinity,
    retry: 1,
  });

  const byUf = useMemo(() => buildUfValueMap(data ?? []), [data]);
  const valores = (data ?? []).map((d) => d.valor).filter((v) => v > 0);
  const max = valores.length ? Math.max(...valores) : 0;
  const min = valores.length ? Math.min(...valores) : 0;

  const isEmpty = !data?.length;
  const loading = shell.loading || geoQuery.isLoading;
  const error =
    shell.error ?? (geoQuery.isError ? (geoQuery.error as Error)?.message ?? 'Erro ao carregar mapa' : null);

  return (
    <ChartCardShell
      {...shell}
      height={height}
      isEmpty={isEmpty}
      loading={loading}
      error={error}
    >
      <div className="flex h-full w-full flex-col items-center justify-center gap-3">
        <div className="w-full" style={{ maxWidth: 560 }}>
          {geoQuery.data && (
            <ComposableMap
              projection="geoMercator"
              projectionConfig={{ center: [-54, -14], scale: 750 }}
              width={560}
              height={Math.max(240, height - 60)}
              style={{ width: '100%', height: 'auto' }}
            >
              <Geographies geography={geoQuery.data}>
                {({ geographies }) =>
                  geographies.map((geo) => {
                    const uf = String(geo.properties?.sigla ?? '').toUpperCase();
                    const datum = byUf.get(uf);
                    const v = datum?.valor ?? 0;
                    const intensity = getHeatIntensity(v, max);
                    const hasData = !!datum && v > 0;
                    const clickable = !!onStateClick && hasData;
                    const labelFull = formatEstadoLabel(uf);
                    const tooltip = hasData
                      ? `${labelFull}: ${valueFormatter(v)}${clickable ? ' — Clique para detalhar' : ''}`
                      : `${labelFull}: sem dados`;
                    const fill = hasData
                      ? `hsl(var(${colorVar}) / ${intensity.toFixed(2)})`
                      : 'hsl(var(--muted))';
                    return (
                      <Geography
                        key={geo.rsmKey}
                        geography={geo}
                        onClick={() => clickable && onStateClick!(uf, datum)}
                        role={clickable ? 'button' : undefined}
                        aria-label={tooltip}
                        tabIndex={clickable ? 0 : -1}
                        style={{
                          default: {
                            fill,
                            stroke: 'hsl(var(--border))',
                            strokeWidth: 0.6,
                            outline: 'none',
                            cursor: clickable ? 'pointer' : 'default',
                            transition: 'fill 120ms ease, opacity 120ms ease',
                          },
                          hover: {
                            fill,
                            stroke: 'hsl(var(--ring))',
                            strokeWidth: clickable ? 1.4 : 0.8,
                            opacity: clickable ? 0.85 : 1,
                            outline: 'none',
                          },
                          pressed: {
                            fill,
                            outline: 'none',
                          },
                        }}
                      >
                        <title>{tooltip}</title>
                      </Geography>
                    );
                  })
                }
              </Geographies>
            </ComposableMap>
          )}
        </div>

        {showLegend && valores.length > 0 && (
          <div className="flex w-full max-w-md items-center gap-2 px-2">
            <span className="text-[10px] tabular-nums text-muted-foreground">
              {valueFormatter(min)}
            </span>
            <div
              className={cn('h-2 flex-1 rounded')}
              style={{
                background: `linear-gradient(to right, hsl(var(${colorVar}) / 0.12), hsl(var(${colorVar})))`,
              }}
              aria-hidden
            />
            <span className="text-[10px] tabular-nums text-muted-foreground">
              {valueFormatter(max)}
            </span>
          </div>
        )}
      </div>
    </ChartCardShell>
  );
}

export default BrazilHeatMap;
