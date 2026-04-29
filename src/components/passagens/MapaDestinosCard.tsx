import { useMemo, useState } from 'react';
import { ComposableMap, Geographies, Geography, Marker } from 'react-simple-maps';
import { scaleSqrt } from 'd3-scale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin } from 'lucide-react';
import { formatCurrency } from '@/lib/format';
import { geocodeCidade, nomeNormalizado } from './cidadesBrasil';
import type { Passagem } from './PassagensDashboard';

const GEO_URL = '/geo/brasil-uf.json';

interface Aggregated {
  cidade: string;
  qtd: number;
  total: number;
  lat: number;
  lng: number;
  uf: string;
}

interface Props {
  data: Passagem[];
  selectedDestino?: string | null;
  onSelectDestino?: (cidade: string | null) => void;
}

export function MapaDestinosCard({ data, selectedDestino, onSelectDestino }: Props) {
  const [hover, setHover] = useState<Aggregated | null>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; data: Aggregated } | null>(null);

  const { pontos, semGeo, totalSemGeo } = useMemo(() => {
    const map = new Map<string, { qtd: number; total: number; nomeOriginal: string }>();
    const sem = new Set<string>();
    let semCount = 0;

    for (const r of data) {
      if (!r.destino) continue;
      const key = nomeNormalizado(r.destino);
      const cur = map.get(key) ?? { qtd: 0, total: 0, nomeOriginal: r.destino };
      cur.qtd += 1;
      cur.total += Number(r.valor || 0);
      map.set(key, cur);
    }

    const pts: Aggregated[] = [];
    for (const [key, val] of map.entries()) {
      const coord = geocodeCidade(key);
      if (!coord) {
        sem.add(val.nomeOriginal);
        semCount += val.qtd;
        continue;
      }
      pts.push({
        cidade: val.nomeOriginal,
        qtd: val.qtd,
        total: val.total,
        lat: coord.lat,
        lng: coord.lng,
        uf: coord.uf,
      });
    }
    pts.sort((a, b) => b.qtd - a.qtd);
    return { pontos: pts, semGeo: Array.from(sem), totalSemGeo: semCount };
  }, [data]);

  const maxQtd = pontos[0]?.qtd ?? 1;
  const radius = scaleSqrt<number, number>().domain([0, maxQtd]).range([3, 22]);

  const top5 = pontos.slice(0, 5);
  const lider = pontos[0];

  return (
    <Card className="lg:col-span-2">
      <CardHeader className="flex flex-col gap-2 pb-2 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-primary" />
          <CardTitle className="text-sm">
            Mapa de Destinos
            {lider && (
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                — Maior incidência: <strong className="text-foreground">{lider.cidade}</strong> ({lider.qtd})
              </span>
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
            className="relative lg:col-span-2"
            onMouseLeave={() => setTooltip(null)}
          >
            <ComposableMap
              projection="geoMercator"
              projectionConfig={{ scale: 850, center: [-54, -14] }}
              width={600}
              height={520}
              style={{ width: '100%', height: 'auto' }}
            >
              <Geographies geography={GEO_URL}>
                {({ geographies }) =>
                  geographies.map((geo) => (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      style={{
                        default: {
                          fill: 'hsl(var(--secondary))',
                          stroke: 'hsl(var(--primary))',
                          strokeWidth: 0.7,
                          strokeOpacity: 0.85,
                          outline: 'none',
                        },
                        hover: {
                          fill: 'hsl(var(--accent))',
                          stroke: 'hsl(var(--primary))',
                          strokeWidth: 1,
                          strokeOpacity: 1,
                          outline: 'none',
                        },
                        pressed: {
                          fill: 'hsl(var(--secondary))',
                          stroke: 'hsl(var(--primary))',
                          strokeWidth: 0.7,
                          strokeOpacity: 0.85,
                          outline: 'none',
                        },
                      }}
                    />
                  ))
                }
              </Geographies>
              {pontos.map((p) => {
                const isSelected = selectedDestino && nomeNormalizado(selectedDestino) === nomeNormalizado(p.cidade);
                const isDimmed = selectedDestino && !isSelected;
                return (
                  <Marker key={p.cidade} coordinates={[p.lng, p.lat]}>
                    <circle
                      r={radius(p.qtd)}
                      fill="hsl(var(--primary))"
                      fillOpacity={isDimmed ? 0.2 : 0.6}
                      stroke="hsl(var(--primary))"
                      strokeWidth={isSelected ? 2 : 1}
                      style={{ cursor: 'pointer', transition: 'all 150ms' }}
                      onMouseEnter={(e) => {
                        setHover(p);
                        const rect = (e.currentTarget.ownerSVGElement?.parentElement as HTMLElement)?.getBoundingClientRect();
                        if (rect) {
                          setTooltip({
                            x: e.clientX - rect.left,
                            y: e.clientY - rect.top,
                            data: p,
                          });
                        }
                      }}
                      onMouseMove={(e) => {
                        const rect = (e.currentTarget.ownerSVGElement?.parentElement as HTMLElement)?.getBoundingClientRect();
                        if (rect) {
                          setTooltip({
                            x: e.clientX - rect.left,
                            y: e.clientY - rect.top,
                            data: p,
                          });
                        }
                      }}
                      onMouseLeave={() => {
                        setHover(null);
                        setTooltip(null);
                      }}
                      onClick={() =>
                        onSelectDestino?.(isSelected ? null : p.cidade)
                      }
                    />
                  </Marker>
                );
              })}
            </ComposableMap>
            {tooltip && (
              <div
                className="pointer-events-none absolute z-10 rounded-md border bg-popover px-2.5 py-1.5 text-xs text-popover-foreground shadow-md"
                style={{
                  left: tooltip.x + 12,
                  top: tooltip.y + 12,
                }}
              >
                <div className="font-semibold">
                  {tooltip.data.cidade}{' '}
                  <span className="text-muted-foreground">({tooltip.data.uf})</span>
                </div>
                <div>{tooltip.data.qtd} passagem{tooltip.data.qtd === 1 ? '' : 's'}</div>
                <div>{formatCurrency(tooltip.data.total)}</div>
              </div>
            )}
            {pontos.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
                Sem destinos para exibir
              </div>
            )}
          </div>

          {/* Top 5 lateral */}
          <div className="space-y-2">
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Top 5 destinos
            </div>
            <div className="space-y-1.5">
              {top5.map((p, i) => {
                const isSelected = selectedDestino && nomeNormalizado(selectedDestino) === nomeNormalizado(p.cidade);
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
                        <div className="text-[10px] text-muted-foreground">{p.uf} · {formatCurrency(p.total)}</div>
                      </div>
                    </div>
                    <Badge variant="secondary" className="shrink-0 text-[10px]">{p.qtd}</Badge>
                  </button>
                );
              })}
              {top5.length === 0 && (
                <div className="text-xs text-muted-foreground">Sem dados</div>
              )}
            </div>
            {hover && (
              <div className="mt-3 rounded-md border border-dashed border-primary/40 bg-primary/5 px-2.5 py-2 text-xs">
                <div className="font-semibold">{hover.cidade} <span className="text-muted-foreground">({hover.uf})</span></div>
                <div className="text-muted-foreground">{hover.qtd} passagens · {formatCurrency(hover.total)}</div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
