import { useMemo, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ComposableMap, Geographies, Geography, Marker } from 'react-simple-maps';
import { geoCentroid, geoMercator } from 'd3-geo';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Plus, Minus, RotateCcw, ChevronLeft } from 'lucide-react';
import { formatCurrency } from '@/lib/format';
import { geocodeCidade, nomeNormalizado } from './cidadesBrasil';
import { COD_TO_UF, UF_NOME, LABEL_OFFSET, makeColorScale, GEO_URL, HEAT_COLORS } from './mapaUtils';
import type { Passagem } from './PassagensDashboard';

interface AggregadoCidade {
  cidade: string;
  qtd: number;
  total: number;
  uf: string;
}

interface AggregadoUF {
  uf: string;
  qtd: number;
  total: number;
}

interface Props {
  data: Passagem[];
  selectedDestino?: string | null;
  onSelectDestino?: (cidade: string | null) => void;
  selectedUF?: string | null;
  onSelectUF?: (uf: string | null) => void;
}

const DEFAULT_ZOOM = 1;
const DEFAULT_CENTER: [number, number] = [-54, -15];
const FOCUS_ZOOM = 3;
const MAX_ZOOM = 8;
const MIN_ZOOM = 1;

export function MapaDestinosCard({
  data,
  selectedDestino,
  onSelectDestino,
  selectedUF: selectedUFProp,
  onSelectUF,
}: Props) {
  const [tooltip, setTooltip] = useState<
    { x: number; y: number; uf: string; qtd: number; total: number } | null
  >(null);

  // Estado de UF interno se não for controlado por fora
  const [internalUF, setInternalUF] = useState<string | null>(null);
  const selectedUF = selectedUFProp !== undefined ? selectedUFProp : internalUF;

  const setSelectedUF = useCallback(
    (uf: string | null) => {
      if (selectedUFProp === undefined) setInternalUF(uf);
      onSelectUF?.(uf);
    },
    [selectedUFProp, onSelectUF],
  );

  // Zoom e pan (panOffset em pixels SVG, relativo ao centro 300x280)
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Agregação
  const { porCidade, porUF, semGeo, totalSemGeo, maxQtdUF } = useMemo(() => {
    const cidadeMap = new Map<
      string,
      { qtd: number; total: number; nomeOriginal: string; ufRegistro: string | null }
    >();
    const sem = new Set<string>();
    let semCount = 0;
    const ufDirectMap = new Map<string, AggregadoUF>();

    for (const r of data) {
      const ufReg =
        r.uf_destino && /^[A-Z]{2}$/.test(r.uf_destino.toUpperCase())
          ? r.uf_destino.toUpperCase()
          : null;

      if (ufReg) {
        const cur = ufDirectMap.get(ufReg) ?? { uf: ufReg, qtd: 0, total: 0 };
        cur.qtd += 1;
        cur.total += Number(r.valor || 0);
        ufDirectMap.set(ufReg, cur);
      }

      if (!r.destino) continue;
      const key = nomeNormalizado(r.destino);
      const cur =
        cidadeMap.get(key) ??
        { qtd: 0, total: 0, nomeOriginal: r.destino, ufRegistro: ufReg };
      cur.qtd += 1;
      cur.total += Number(r.valor || 0);
      if (!cur.ufRegistro && ufReg) cur.ufRegistro = ufReg;
      cidadeMap.set(key, cur);
    }

    const cidades: AggregadoCidade[] = [];
    for (const [, val] of cidadeMap.entries()) {
      const coord = geocodeCidade(nomeNormalizado(val.nomeOriginal));
      const ufFinal = val.ufRegistro ?? coord?.uf ?? null;
      if (!ufFinal) {
        sem.add(val.nomeOriginal);
        semCount += val.qtd;
        continue;
      }
      cidades.push({ cidade: val.nomeOriginal, qtd: val.qtd, total: val.total, uf: ufFinal });
    }
    cidades.sort((a, b) => b.qtd - a.qtd);

    let porUFMap: Map<string, AggregadoUF>;
    if (ufDirectMap.size > 0) {
      porUFMap = ufDirectMap;
    } else {
      porUFMap = new Map();
      for (const c of cidades) {
        const cur = porUFMap.get(c.uf) ?? { uf: c.uf, qtd: 0, total: 0 };
        cur.qtd += c.qtd;
        cur.total += c.total;
        porUFMap.set(c.uf, cur);
      }
    }
    const max = Array.from(porUFMap.values()).reduce((m, u) => Math.max(m, u.qtd), 0);

    return {
      porCidade: cidades,
      porUF: porUFMap,
      semGeo: Array.from(sem),
      totalSemGeo: semCount,
      maxQtdUF: max,
    };
  }, [data]);

  const top5 = porCidade.slice(0, 5);

  const liderUF = useMemo(() => {
    let best: AggregadoUF | null = null;
    porUF.forEach((u) => {
      if (!best || u.qtd > best.qtd) best = u;
    });
    return best;
  }, [porUF]);

  const cidadesDoUF = useMemo(() => {
    if (!selectedUF) return [];
    return porCidade.filter((c) => c.uf === selectedUF);
  }, [porCidade, selectedUF]);

  const aggUFSelected = selectedUF ? porUF.get(selectedUF) : null;

  const colorScale = useMemo(
    () => makeColorScale(Array.from(porUF.values()).map((u) => u.qtd)),
    [porUF],
  );

  const legenda = useMemo(() => {
    if (maxQtdUF <= 0) return [];
    return [
      { label: 'Sem registros', color: HEAT_COLORS.empty },
      { label: 'Baixo', color: HEAT_COLORS.low },
      { label: 'Médio', color: HEAT_COLORS.mid },
      { label: 'Médio-alto', color: HEAT_COLORS.high },
      { label: `Alto (até ${maxQtdUF})`, color: HEAT_COLORS.top },
    ];
  }, [maxQtdUF]);

  // Projeção igual à do ComposableMap, para converter lat/lon em pixel SVG
  const projection = useMemo(
    () => geoMercator().scale(780).center(DEFAULT_CENTER).translate([300, 280]),
    [],
  );

  // Zoom helpers
  const handleZoomIn = () => setZoom((z) => Math.min(z * 1.5, MAX_ZOOM));
  const handleZoomOut = () => setZoom((z) => Math.max(z / 1.5, MIN_ZOOM));
  const handleResetView = () => {
    setZoom(DEFAULT_ZOOM);
    setPanOffset({ x: 0, y: 0 });
  };

  const handleSelectUF = useCallback(
    (uf: string, centroid: [number, number]) => {
      if (selectedUF === uf) {
        setSelectedUF(null);
        handleResetView();
        return;
      }
      setSelectedUF(uf);
      const projected = projection(centroid);
      if (projected) {
        // pan = (centroide projetado - centro do svg)
        setPanOffset({ x: projected[0] - 300, y: projected[1] - 280 });
      }
      setZoom(FOCUS_ZOOM);
    },
    [selectedUF, setSelectedUF, projection],
  );

  const handleClearUF = () => {
    setSelectedUF(null);
    handleResetView();
  };

  // Esconde labels quando zoom alto (exceto UF selecionado)
  const showLabel = (uf: string) => zoom <= 2 || uf === selectedUF;

  return (
    <Card className="lg:col-span-2">
      <CardHeader className="flex flex-col gap-2 pb-2 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-primary" />
          <CardTitle className="text-sm">
            Mapa de Destinos
            {selectedUF && aggUFSelected ? (
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                — Foco:{' '}
                <strong className="text-foreground">{UF_NOME[selectedUF] ?? selectedUF}</strong>{' '}
                ({aggUFSelected.qtd} passagem{aggUFSelected.qtd === 1 ? '' : 's'})
              </span>
            ) : (
              liderUF && (
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  — Maior incidência:{' '}
                  <strong className="text-foreground">{UF_NOME[liderUF.uf] ?? liderUF.uf}</strong>{' '}
                  ({liderUF.qtd})
                </span>
              )
            )}
          </CardTitle>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {selectedDestino && (
            <Badge
              variant="secondary"
              className="cursor-pointer text-xs"
              onClick={() => onSelectDestino?.(null)}
            >
              Destino: {selectedDestino} ✕
            </Badge>
          )}
          {selectedUF && (
            <Button variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={handleClearUF}>
              <ChevronLeft className="h-3 w-3" />
              Voltar
            </Button>
          )}
          {totalSemGeo > 0 && (
            <Badge variant="outline" className="text-xs">
              {semGeo.length} cidade{semGeo.length === 1 ? '' : 's'} sem geo ({totalSemGeo} reg.)
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Mapa */}
          <div
            className="relative flex items-center justify-center lg:col-span-2 animate-fade-in"
            onMouseLeave={() => setTooltip(null)}
          >
            <div className="relative mx-auto w-full max-w-[560px]">
              {/* Controles de zoom */}
              <div className="absolute right-2 top-2 z-10 flex flex-col gap-1 rounded-md border bg-background/80 p-1 shadow-sm backdrop-blur">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={handleZoomIn}
                  disabled={zoom >= MAX_ZOOM}
                  title="Aproximar"
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={handleZoomOut}
                  disabled={zoom <= MIN_ZOOM}
                  title="Afastar"
                >
                  <Minus className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={handleResetView}
                  disabled={zoom === DEFAULT_ZOOM && panOffset.x === 0 && panOffset.y === 0}
                  title="Resetar vista"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </Button>
              </div>

              <ComposableMap
                projection="geoMercator"
                projectionConfig={{ scale: 780, center: DEFAULT_CENTER }}
                width={600}
                height={560}
                style={{ width: '100%', height: 'auto', display: 'block' }}
              >
                <g
                  transform={`translate(300 280) scale(${zoom}) translate(${-300 - panOffset.x} ${-280 - panOffset.y})`}
                  style={{ transition: 'transform 250ms ease' }}
                >
                  {/* Camada 1: fills + interação */}
                  <Geographies geography={GEO_URL}>
                    {({ geographies }) =>
                      geographies.map((geo) => {
                        const cod = String(geo.properties?.codarea ?? '');
                        const uf = COD_TO_UF[cod] ?? '';
                        const agg = porUF.get(uf);
                        const qtd = agg?.qtd ?? 0;
                        const total = agg?.total ?? 0;
                        const fill = colorForQtd(qtd, maxQtdUF);
                        const isSelected = selectedUF === uf;
                        const isDimmed = !!selectedUF && !isSelected;
                        const opacity = isDimmed ? 0.3 : 1;
                        const centroid = geoCentroid(geo) as [number, number];

                        return (
                          <Geography
                            key={`fill-${geo.rsmKey}`}
                            geography={geo}
                            style={{
                              default: {
                                fill,
                                stroke: isSelected ? 'hsl(var(--primary))' : 'hsl(0, 0%, 100%)',
                                strokeWidth: isSelected ? 2 : 0.8,
                                outline: 'none',
                                opacity,
                                transition: 'opacity 250ms ease, fill 350ms ease, stroke-width 200ms ease',
                              },
                              hover: {
                                fill,
                                stroke: 'hsl(var(--primary))',
                                strokeWidth: 1.5,
                                outline: 'none',
                                opacity: Math.max(opacity, 0.85),
                                cursor: 'pointer',
                              },
                              pressed: {
                                fill,
                                stroke: 'hsl(var(--primary))',
                                strokeWidth: 2,
                                outline: 'none',
                                opacity,
                              },
                            }}
                            onClick={() => handleSelectUF(uf, centroid)}
                            onMouseEnter={(e) => {
                              const rect = (
                                e.currentTarget.ownerSVGElement?.parentElement as HTMLElement
                              )?.getBoundingClientRect();
                              if (rect) {
                                setTooltip({
                                  x: e.clientX,
                                  y: e.clientY,
                                  uf,
                                  qtd,
                                  total,
                                });
                              }
                            }}
                            onMouseMove={(e) => {
                              setTooltip({
                                x: e.clientX,
                                y: e.clientY,
                                uf,
                                qtd,
                                total,
                              });
                            }}
                            onMouseLeave={() => setTooltip(null)}
                          />
                        );
                      })
                    }
                  </Geographies>

                  {/* Camada 2: bordas reforçadas */}
                  <Geographies geography={GEO_URL}>
                    {({ geographies }) =>
                      geographies.map((geo) => (
                        <Geography
                          key={`stroke-${geo.rsmKey}`}
                          geography={geo}
                          fill="none"
                          stroke="hsl(220, 18%, 55%)"
                          strokeWidth={0.5}
                          strokeOpacity={0.45}
                          style={{
                            default: { outline: 'none', pointerEvents: 'none' },
                            hover: { outline: 'none', pointerEvents: 'none' },
                            pressed: { outline: 'none', pointerEvents: 'none' },
                          }}
                        />
                      ))
                    }
                  </Geographies>

                  {/* Camada 3: siglas via Marker (projetadas corretamente) */}
                  <Geographies geography={GEO_URL}>
                    {({ geographies }) =>
                      geographies.map((geo) => {
                        const cod = String(geo.properties?.codarea ?? '');
                        const uf = COD_TO_UF[cod] ?? '';
                        if (!uf) return null;
                        if (!showLabel(uf)) return null;
                        const [cx, cy] = geoCentroid(geo);
                        const [dx, dy] = LABEL_OFFSET[uf] ?? [0, 0];
                        const labelCoord: [number, number] = [cx + dx, cy + dy];
                        // Tamanho da fonte compensa o zoom
                        const fontSize = Math.max(7, 10 / zoom);
                        const strokeW = Math.max(1.5, 2.5 / zoom);
                        return (
                          <Marker key={`label-${geo.rsmKey}`} coordinates={labelCoord}>
                            <text
                              textAnchor="middle"
                              dominantBaseline="central"
                              style={{
                                fontFamily: 'inherit',
                                fontSize,
                                fontWeight: 700,
                                fill: 'hsl(220, 25%, 18%)',
                                paintOrder: 'stroke',
                                stroke: 'hsl(0, 0%, 100%)',
                                strokeWidth: strokeW,
                                strokeLinejoin: 'round',
                                pointerEvents: 'none',
                              }}
                            >
                              {uf}
                            </text>
                          </Marker>
                        );
                      })
                    }
                  </Geographies>
                </g>
              </ComposableMap>
            </div>

            {tooltip &&
              createPortal(
                <div
                  className="pointer-events-none fixed z-[60] rounded-md border bg-popover px-2.5 py-1.5 text-xs text-popover-foreground shadow-md animate-fade-in"
                  style={{
                    left: tooltip.x + 12,
                    top: tooltip.y + 12,
                  }}
                >
                  <div className="font-semibold">
                    {UF_NOME[tooltip.uf] ?? (tooltip.uf || '—')}
                  </div>
                  {tooltip.qtd > 0 ? (
                    <>
                      <div>
                        {tooltip.qtd} passagem{tooltip.qtd === 1 ? '' : 's'}
                      </div>
                      <div>{formatCurrency(tooltip.total)}</div>
                    </>
                  ) : (
                    <div className="text-muted-foreground">Sem registros</div>
                  )}
                  <div className="mt-1 text-[10px] text-muted-foreground">
                    Clique para {selectedUF === tooltip.uf ? 'voltar' : 'focar'}
                  </div>
                </div>,
                document.body,
              )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {selectedUF ? (
              // Modo drill-down: cidades do estado selecionado
              <div className="space-y-2 animate-fade-in">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Cidades em {UF_NOME[selectedUF] ?? selectedUF}
                  </div>
                  <Badge variant="secondary" className="text-[10px]">
                    {cidadesDoUF.length}
                  </Badge>
                </div>
                <div className="max-h-[420px] space-y-1.5 overflow-y-auto pr-1">
                  {cidadesDoUF.length === 0 && (
                    <div className="text-xs text-muted-foreground">
                      Sem cidades resolvidas para este estado.
                    </div>
                  )}
                  {cidadesDoUF.map((p, i) => {
                    const isSelected =
                      selectedDestino &&
                      nomeNormalizado(selectedDestino) === nomeNormalizado(p.cidade);
                    return (
                      <button
                        key={p.cidade}
                        type="button"
                        onClick={() => onSelectDestino?.(isSelected ? null : p.cidade)}
                        className={`flex w-full items-center justify-between gap-2 rounded-md border px-2.5 py-2 text-left text-xs transition-colors animate-fade-in ${
                          isSelected
                            ? 'border-primary bg-primary/10'
                            : 'border-border hover:bg-accent/40'
                        }`}
                      >
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[10px] font-semibold text-primary">
                            {i + 1}
                          </span>
                          <div className="min-w-0">
                            <div className="truncate font-medium">{p.cidade}</div>
                            <div className="text-[10px] text-muted-foreground">
                              {formatCurrency(p.total)}
                            </div>
                          </div>
                        </div>
                        <Badge variant="secondary" className="shrink-0 text-[10px]">
                          {p.qtd}
                        </Badge>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              // Modo padrão: Top 5 + legenda
              <>
                <div className="space-y-2">
                  <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Top 5 destinos
                  </div>
                  <div className="space-y-1.5">
                    {top5.map((p, i) => {
                      const isSelected =
                        selectedDestino &&
                        nomeNormalizado(selectedDestino) === nomeNormalizado(p.cidade);
                      return (
                        <button
                          key={p.cidade}
                          type="button"
                          onClick={() => onSelectDestino?.(isSelected ? null : p.cidade)}
                          className={`flex w-full items-center justify-between gap-2 rounded-md border px-2.5 py-2 text-left text-xs transition-colors ${
                            isSelected
                              ? 'border-primary bg-primary/10'
                              : 'border-border hover:bg-accent/40'
                          }`}
                        >
                          <div className="flex min-w-0 items-center gap-2">
                            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[10px] font-semibold text-primary">
                              {i + 1}
                            </span>
                            <div className="min-w-0">
                              <div className="truncate font-medium">{p.cidade}</div>
                              <div className="text-[10px] text-muted-foreground">
                                {p.uf} · {formatCurrency(p.total)}
                              </div>
                            </div>
                          </div>
                          <Badge variant="secondary" className="shrink-0 text-[10px]">
                            {p.qtd}
                          </Badge>
                        </button>
                      );
                    })}
                    {top5.length === 0 && (
                      <div className="text-xs text-muted-foreground">Sem dados</div>
                    )}
                  </div>
                </div>

                {legenda.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Intensidade por estado
                    </div>
                    <div className="space-y-1">
                      {legenda.map((l) => (
                        <div key={l.label} className="flex items-center gap-2 text-[11px]">
                          <span
                            className="inline-block h-3 w-5 rounded-sm border border-border"
                            style={{ backgroundColor: l.color }}
                          />
                          <span className="text-muted-foreground">{l.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="rounded-md border border-dashed border-border bg-muted/30 px-2.5 py-2 text-[10px] text-muted-foreground">
                  Dica: clique num estado para ver as cidades. Use scroll ou os botões para dar zoom.
                </div>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
