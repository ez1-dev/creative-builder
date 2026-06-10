/**
 * BrazilHeatMap
 *
 * Mapa coroplético do Brasil por UF (react-simple-maps) com:
 * - escala de calor multi-cor (azul → ciano → amarelo → laranja → vermelho)
 * - siglas dentro dos estados (contorno branco p/ legibilidade)
 * - legenda vertical à esquerda
 * - zoom/pan com botões (+, −, reset)
 * - tooltip nativo com nome, UF, faturamento e participação %
 */
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ComposableMap, Geographies, Geography, Marker, ZoomableGroup } from 'react-simple-maps';
import { geoCentroid } from 'd3-geo';
import { Plus, Minus, RotateCcw } from 'lucide-react';
import { ChartCardShell, type ChartCardShellProps } from '@/components/bi/charts/ChartCardShell';
import { formatCurrency, formatPercent } from '@/components/bi/utils/formatters';
import { formatEstadoLabel } from '@/lib/bi/ufLabels';
import { buildUfValueMap, heatColorFromValue, HEAT_COLOR_STOPS } from '@/lib/bi/mapUtils';
import { InteractiveHeatLegend } from './InteractiveHeatLegend';

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
  /** Stops da paleta de calor (5 cores: mín → máx). */
  colorStops?: string[];
  valueFormatter?: (v: number) => string;
  geoUrl?: string;
  showLegend?: boolean;
  legendTitle?: string;
  /** Conteúdo extra renderizado ao lado do título da legenda (ex.: editor de paleta). */
  legendExtras?: React.ReactNode;
  onStateClick?: (uf: string, datum?: BrazilHeatMapDatum) => void;
  selectedUf?: string | null;
  /** Se definido, habilita stops clicáveis sobre a barra da legenda. */
  onColorStopsChange?: (next: string[]) => void;
  /** Se definido, mostra botão "Aplicar" quando uma faixa estiver selecionada. */
  onRangeApply?: (payload: { cd_estado_in: string[]; valor_min: number; valor_max: number }) => void;
}

const DEFAULT_GEO_URL = '/maps/brasil-estados.geojson';
const DEFAULT_CENTER: [number, number] = [-54, -14];
const SMALL_UFS = new Set(['DF', 'SE', 'AL', 'PB', 'RN', 'PE', 'ES', 'RJ']);

export function BrazilHeatMap({
  data,
  colorStops,
  valueFormatter = formatCurrency,
  geoUrl = DEFAULT_GEO_URL,
  height = 440,
  showLegend = true,
  legendTitle = 'Fat. (R$)',
  legendExtras,
  onStateClick,
  selectedUf = null,
  onColorStopsChange,
  onRangeApply,
  ...shell
}: BrazilHeatMapProps) {
  const stops = colorStops && colorStops.length >= 2 ? colorStops : HEAT_COLOR_STOPS;
  const [position, setPosition] = useState<{ coordinates: [number, number]; zoom: number }>({
    coordinates: DEFAULT_CENTER,
    zoom: 1,
  });
  const [selectedRange, setSelectedRange] = useState<[number, number] | null>(null);

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
  const total = valores.reduce((s, v) => s + v, 0);

  const ufsInRange = useMemo(() => {
    if (!selectedRange) return [] as string[];
    const [lo, hi] = selectedRange;
    return (data ?? [])
      .filter((d) => {
        const v = Number(d?.valor ?? 0);
        return v > 0 && v >= lo && v <= hi;
      })
      .map((d) => String(d.uf).toUpperCase());
  }, [data, selectedRange]);

  const isEmpty = !data?.length;
  const loading = shell.loading || geoQuery.isLoading;
  const error =
    shell.error ?? (geoQuery.isError ? (geoQuery.error as Error)?.message ?? 'Erro ao carregar mapa' : null);

  const mapHeight = Math.max(280, height - 40);
  const legendGradient = `linear-gradient(to top, ${stops.join(', ')})`;
  const legendHeight = Math.min(240, mapHeight * 0.75);

  const zoomIn = () =>
    setPosition((p) => ({ ...p, zoom: Math.min(8, p.zoom * 1.5) }));
  const zoomOut = () =>
    setPosition((p) => ({ ...p, zoom: Math.max(1, p.zoom / 1.5) }));
  const resetZoom = () => setPosition({ coordinates: DEFAULT_CENTER, zoom: 1 });

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
          <div className="flex items-center justify-center shrink-0">
            <InteractiveHeatLegend
              max={max}
              height={legendHeight}
              gradient={legendGradient}
              title={legendTitle}
              titleExtras={legendExtras}
              selectedRange={selectedRange}
              onRangeChange={setSelectedRange}
              onRangeApply={
                onRangeApply && selectedRange
                  ? () =>
                      onRangeApply({
                        cd_estado_in: ufsInRange,
                        valor_min: selectedRange[0],
                        valor_max: selectedRange[1],
                      })
                  : undefined
              }
              formatValue={valueFormatter}
              ufsInRange={ufsInRange}
            />
          </div>
        )}

        {/* Mapa centralizado */}
        <div
          className="relative flex-1 flex items-center justify-center h-full"
          style={{ maxWidth: 720 }}
        >
          {/* Controles de zoom */}
          {geoQuery.data && (
            <div className="absolute top-1 right-1 z-10 flex flex-col gap-1">
              <button
                type="button"
                onClick={zoomIn}
                className="h-7 w-7 inline-flex items-center justify-center rounded border border-border bg-background/90 text-foreground hover:bg-accent transition-colors"
                aria-label="Aumentar zoom"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={zoomOut}
                className="h-7 w-7 inline-flex items-center justify-center rounded border border-border bg-background/90 text-foreground hover:bg-accent transition-colors"
                aria-label="Diminuir zoom"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={resetZoom}
                className="h-7 w-7 inline-flex items-center justify-center rounded border border-border bg-background/90 text-foreground hover:bg-accent transition-colors"
                aria-label="Resetar zoom"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {geoQuery.data && (
            <ComposableMap
              projection="geoMercator"
              projectionConfig={{ scale: 620, center: DEFAULT_CENTER }}
              width={620}
              height={620}
              style={{ width: '100%', height: '100%', maxWidth: '720px', maxHeight: '100%' }}
            >
              <ZoomableGroup
                zoom={position.zoom}
                center={position.coordinates}
                onMoveEnd={(pos: any) =>
                  setPosition({ coordinates: pos.coordinates as [number, number], zoom: pos.zoom })
                }
                minZoom={1}
                maxZoom={8}
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
                        const pct = hasData && total > 0 ? (v / total) * 100 : 0;
                        const tooltip = hasData
                          ? `${labelFull}\nFaturamento: ${valueFormatter(v)}\nParticipação: ${formatPercent(pct, 1)}${clickable ? '\nClique para detalhar' : ''}`
                          : `${labelFull} — Sem faturamento no período`;
                        const fill = heatColorFromValue(v, max, stops);
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
                                stroke: isSelected ? '#111827' : '#ffffff',
                                strokeWidth: isSelected ? 2 : 0.6,
                                opacity: dimmed ? 0.55 : 1,
                                outline: 'none',
                                cursor: clickable ? 'pointer' : 'default',
                                transition: 'fill 120ms ease, opacity 120ms ease',
                              },
                              hover: {
                                fill,
                                stroke: '#111827',
                                strokeWidth: isSelected ? 2 : 1.4,
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
                        // Em zoom 1, oculta siglas de estados pequenos para não poluir
                        if (position.zoom <= 1 && SMALL_UFS.has(uf)) return null;
                        let centroid: [number, number];
                        try {
                          centroid = geoCentroid(geo) as [number, number];
                        } catch {
                          return null;
                        }
                        if (!centroid || !Number.isFinite(centroid[0])) return null;
                        const fontSize = position.zoom > 1 ? 8 : 9;
                        return (
                          <Marker key={`lbl-${geo.rsmKey}`} coordinates={centroid}>
                            <text
                              textAnchor="middle"
                              y={3}
                              style={{
                                fontFamily: 'inherit',
                                fontSize,
                                fontWeight: 600,
                                fill: '#111827',
                                stroke: '#ffffff',
                                strokeWidth: 2.5,
                                paintOrder: 'stroke',
                                pointerEvents: 'none',
                              } as any}
                            >
                              {uf}
                            </text>
                          </Marker>
                        );
                      })}
                    </>
                  )}
                </Geographies>
              </ZoomableGroup>
            </ComposableMap>
          )}
        </div>
      </div>
    </ChartCardShell>
  );
}

export default BrazilHeatMap;
