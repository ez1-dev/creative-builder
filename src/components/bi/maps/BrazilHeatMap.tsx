/**
 * BrazilHeatMap
 *
 * Mapa coroplético do Brasil por UF (react-simple-maps) com escala de calor
 * multi-cor (azul → amarelo → vermelho), siglas dentro dos estados e legenda
 * vertical à esquerda.
 */
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ComposableMap, Geographies, Geography, Marker } from 'react-simple-maps';
import { geoCentroid } from 'd3-geo';
import { ChartCardShell, type ChartCardShellProps } from '@/components/bi/charts/ChartCardShell';
import { formatCurrency } from '@/components/bi/utils/formatters';
import { formatEstadoLabel } from '@/lib/bi/ufLabels';
import { buildUfValueMap, heatColor, HEAT_COLOR_STOPS } from '@/lib/bi/mapUtils';

export interface BrazilHeatMapDatum {
  uf: string;
  valor: number;
  label?: string;
}

export interface BrazilHeatMapProps
  extends Omit<ChartCardShellProps, 'children' | 'isEmpty'> {
  data: BrazilHeatMapDatum[];
  /** Mantido por compat — não usado mais (paleta é fixa multi-cor). */
  colorVar?: string;
  valueFormatter?: (v: number) => string;
  geoUrl?: string;
  showLegend?: boolean;
  legendTitle?: string;
  onStateClick?: (uf: string, datum?: BrazilHeatMapDatum) => void;
  selectedUf?: string | null;
}

const DEFAULT_GEO_URL = '/maps/brasil-estados.geojson';

export function BrazilHeatMap({
  data,
  valueFormatter = formatCurrency,
  geoUrl = DEFAULT_GEO_URL,
  height = 360,
  showLegend = true,
  legendTitle = 'Fat. (R$)',
  onStateClick,
  selectedUf = null,
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

  const isEmpty = !data?.length;
  const loading = shell.loading || geoQuery.isLoading;
  const error =
    shell.error ?? (geoQuery.isError ? (geoQuery.error as Error)?.message ?? 'Erro ao carregar mapa' : null);

  const mapHeight = Math.max(240, height - 40);

  // Gradiente vertical da legenda (top = max, bottom = 0)
  const legendGradient = `linear-gradient(to top, ${HEAT_COLOR_STOPS.join(', ')})`;

  return (
    <ChartCardShell
      {...shell}
      height={height}
      isEmpty={isEmpty}
      loading={loading}
      error={error}
    >
      <div className="flex h-full w-full items-center justify-center gap-4">
        {/* Legenda vertical à esquerda */}
        {showLegend && max > 0 && (
          <div className="flex h-full flex-col items-start justify-center gap-1" style={{ minWidth: 90 }}>
            <span className="text-[11px] font-medium text-muted-foreground leading-tight whitespace-pre-line">
              {legendTitle}
            </span>
            <div className="flex items-stretch gap-2" style={{ height: mapHeight * 0.7 }}>
              <div
                className="w-3 rounded border border-border/60"
                style={{ background: legendGradient }}
                aria-hidden
              />
              <div className="flex flex-col justify-between text-[10px] tabular-nums text-muted-foreground">
                <span>{valueFormatter(max)}</span>
                <span>0</span>
              </div>
            </div>
          </div>
        )}

        {/* Mapa centralizado */}
        <div className="flex-1 flex items-center justify-center" style={{ maxWidth: 560 }}>
          {geoQuery.data && (
            <ComposableMap
              projection="geoMercator"
              projectionConfig={{ center: [-54, -15], scale: 820 }}
              width={520}
              height={mapHeight}
              style={{ width: '100%', height: 'auto' }}
            >
              <Geographies geography={geoQuery.data}>
                {({ geographies }) => (
                  <>
                    {geographies.map((geo) => {
                      const uf = String(geo.properties?.sigla ?? '').toUpperCase();
                      const datum = byUf.get(uf);
                      const v = datum?.valor ?? 0;
                      const hasData = !!datum && v > 0;
                      const clickable = !!onStateClick && hasData;
                      const labelFull = formatEstadoLabel(uf);
                      const selUf = selectedUf ? String(selectedUf).toUpperCase() : null;
                      const isSelected = !!selUf && selUf === uf;
                      const dimmed = !!selUf && !isSelected;
                      const tooltip = hasData
                        ? `${labelFull}: ${valueFormatter(v)}${clickable ? ' — Clique para detalhar' : ''}`
                        : `${labelFull}: sem dados`;
                      const fill = hasData ? heatColor(v / max) : 'hsl(var(--muted))';
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
                              stroke: isSelected ? 'hsl(var(--ring))' : 'hsl(var(--border))',
                              strokeWidth: isSelected ? 2 : 0.6,
                              opacity: dimmed ? 0.55 : 1,
                              outline: 'none',
                              cursor: clickable ? 'pointer' : 'default',
                              transition: 'fill 120ms ease, opacity 120ms ease',
                            },
                            hover: {
                              fill,
                              stroke: 'hsl(var(--ring))',
                              strokeWidth: isSelected ? 2 : clickable ? 1.4 : 0.8,
                              opacity: dimmed ? 0.75 : clickable ? 0.85 : 1,
                              outline: 'none',
                            },
                            pressed: { fill, outline: 'none' },
                          }}
                        >
                          <title>{tooltip}</title>
                        </Geography>
                      );
                    })}
                    {geographies.map((geo) => {
                      const uf = String(geo.properties?.sigla ?? '').toUpperCase();
                      if (!uf) return null;
                      let centroid: [number, number];
                      try {
                        centroid = geoCentroid(geo) as [number, number];
                      } catch {
                        return null;
                      }
                      if (!centroid || !Number.isFinite(centroid[0])) return null;
                      return (
                        <Marker key={`lbl-${geo.rsmKey}`} coordinates={centroid}>
                          <text
                            textAnchor="middle"
                            y={3}
                            style={{
                              fontFamily: 'inherit',
                              fontSize: 9,
                              fontWeight: 600,
                              fill: '#111',
                              pointerEvents: 'none',
                            }}
                          >
                            {uf}
                          </text>
                        </Marker>
                      );
                    })}
                  </>
                )}
              </Geographies>
            </ComposableMap>
          )}
        </div>
      </div>
    </ChartCardShell>
  );
}

export default BrazilHeatMap;
