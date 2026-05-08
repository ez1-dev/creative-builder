import { useEffect, useMemo, useState } from 'react';
import { ComposableMap, Geographies, Geography, Marker } from 'react-simple-maps';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Map as MapIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/format';
import { geocodeCidade, nomeNormalizado } from './cidadesBrasil';
import type { Passagem } from './PassagensDashboard';

const UF_BY_CODE: Record<string, string> = {
  '11':'RO','12':'AC','13':'AM','14':'RR','15':'PA','16':'AP','17':'TO',
  '21':'MA','22':'PI','23':'CE','24':'RN','25':'PB','26':'PE','27':'AL','28':'SE','29':'BA',
  '31':'MG','32':'ES','33':'RJ','35':'SP',
  '41':'PR','42':'SC','43':'RS',
  '50':'MS','51':'MT','52':'GO','53':'DF',
};

interface CidadeAgg { cidade: string; key: string; uf: string; qtd: number; valor: number; lat: number; lng: number }

interface Props {
  data: Passagem[];
  selectedDestino?: string[];
  selectedUF?: string[];
  onSelectDestino?: (cidade: string) => void;
  onSelectUF?: (uf: string) => void;
}

export function MapaCidadesViagens({ data, selectedDestino = [], selectedUF = [], onSelectDestino, onSelectUF }: Props) {
  const [metrica, setMetrica] = useState<'qtd' | 'valor'>('valor');
  const [geo, setGeo] = useState<any>(null);

  useEffect(() => {
    fetch('/geo/brasil-uf.json').then((r) => r.json()).then(setGeo).catch(() => setGeo(null));
  }, []);

  const { cidades, porUF, semCoords, totalQtd, totalValor } = useMemo(() => {
    const map = new Map<string, CidadeAgg>();
    const ufMap = new Map<string, { qtd: number; valor: number }>();
    let semCoordsCount = 0;
    let qtdT = 0;
    let valorT = 0;

    data.forEach((p) => {
      const raw = (p.destino ?? '').trim();
      if (!raw) return;
      const key = nomeNormalizado(raw);
      const coord = geocodeCidade(raw);
      const uf = (coord?.uf ?? p.uf_destino ?? '').toUpperCase();
      const valor = Number(p.valor || 0);
      qtdT += 1;
      valorT += valor;

      if (uf) {
        const u = ufMap.get(uf) ?? { qtd: 0, valor: 0 };
        u.qtd += 1;
        u.valor += valor;
        ufMap.set(uf, u);
      }

      if (!coord) {
        semCoordsCount += 1;
        return;
      }
      const cur = map.get(key) ?? { cidade: raw, key, uf, qtd: 0, valor: 0, lat: coord.lat, lng: coord.lng };
      cur.qtd += 1;
      cur.valor += valor;
      map.set(key, cur);
    });

    return {
      cidades: Array.from(map.values()).sort((a, b) => b.valor - a.valor),
      porUF: ufMap,
      semCoords: semCoordsCount,
      totalQtd: qtdT,
      totalValor: valorT,
    };
  }, [data]);

  const maxCidade = Math.max(...cidades.map((c) => (metrica === 'valor' ? c.valor : c.qtd)), 1);
  const maxUF = Math.max(...Array.from(porUF.values()).map((u) => (metrica === 'valor' ? u.valor : u.qtd)), 1);

  const radius = (c: CidadeAgg) => {
    const v = metrica === 'valor' ? c.valor : c.qtd;
    return 4 + 18 * Math.sqrt(v / maxCidade);
  };

  const formatMetric = (v: number) => (metrica === 'valor' ? formatCurrency(v) : `${v}`);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <MapIcon className="h-4 w-4 text-primary" />
          Mapa de viagens por cidade
        </CardTitle>
        <div className="flex items-center gap-2">
          <span className="hidden text-[11px] text-muted-foreground sm:inline">
            {cidades.length} cidades · {totalQtd} viagens · {formatCurrency(totalValor)}
          </span>
          <div className="inline-flex rounded-md border bg-background p-0.5">
            <Button
              type="button"
              size="sm"
              variant={metrica === 'valor' ? 'default' : 'ghost'}
              className="h-6 px-2 text-[11px]"
              onClick={() => setMetrica('valor')}
            >
              Por valor
            </Button>
            <Button
              type="button"
              size="sm"
              variant={metrica === 'qtd' ? 'default' : 'ghost'}
              className="h-6 px-2 text-[11px]"
              onClick={() => setMetrica('qtd')}
            >
              Por qtd
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative w-full" style={{ height: 420 }}>
          {geo ? (
            <ComposableMap
              projection="geoMercator"
              projectionConfig={{ center: [-54, -15], scale: 700 }}
              style={{ width: '100%', height: '100%' }}
            >
              <Geographies geography={geo}>
                {({ geographies }: any) =>
                  geographies.map((g: any) => {
                    const code = String(g.properties?.codarea ?? g.properties?.sigla ?? '');
                    const uf = UF_BY_CODE[code] ?? code;
                    const item = porUF.get(uf.toUpperCase());
                    const v = item ? (metrica === 'valor' ? item.valor : item.qtd) : 0;
                    const intensity = item ? v / maxUF : 0;
                    const isSelected = selectedUF.includes(uf.toUpperCase());
                    return (
                      <Geography
                        key={g.rsmKey}
                        geography={g}
                        onClick={() => onSelectUF?.(uf.toUpperCase())}
                        style={{
                          default: {
                            fill: item
                              ? `hsl(var(--primary) / ${0.12 + intensity * 0.55})`
                              : 'hsl(var(--muted))',
                            stroke: isSelected ? 'hsl(var(--primary))' : 'hsl(var(--background))',
                            strokeWidth: isSelected ? 1.4 : 0.5,
                            outline: 'none',
                          },
                          hover: { fill: 'hsl(var(--primary) / 0.7)', outline: 'none', cursor: item ? 'pointer' : 'default' },
                          pressed: { outline: 'none' },
                        }}
                      >
                        <title>
                          {`${uf}${item ? ` — ${item.qtd} viagens · ${formatCurrency(item.valor)}` : ''}`}
                        </title>
                      </Geography>
                    );
                  })
                }
              </Geographies>
              {cidades.map((c) => {
                const norm = c.key;
                const isSel = selectedDestino.some((d) => nomeNormalizado(d) === norm);
                const r = radius(c);
                return (
                  <Marker
                    key={c.key}
                    coordinates={[c.lng, c.lat]}
                    onClick={() => onSelectDestino?.(c.cidade)}
                    style={{
                      default: { cursor: 'pointer' },
                      hover: { cursor: 'pointer' },
                      pressed: { cursor: 'pointer' },
                    }}
                  >
                    <circle
                      r={r}
                      fill="hsl(var(--primary))"
                      fillOpacity={isSel ? 0.9 : 0.55}
                      stroke="hsl(var(--background))"
                      strokeWidth={isSel ? 2.5 : 1}
                    />
                    <title>{`${c.cidade} · ${c.uf} — ${c.qtd} viagens · ${formatCurrency(c.valor)}`}</title>
                  </Marker>
                );
              })}
            </ComposableMap>
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
              Carregando mapa…
            </div>
          )}
        </div>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <span className={cn('inline-block rounded-full bg-primary/30')} style={{ width: 8, height: 8 }} />
              Mín
            </span>
            <span className="flex items-center gap-1">
              <span className={cn('inline-block rounded-full bg-primary/60')} style={{ width: 14, height: 14 }} />
              Médio
            </span>
            <span className="flex items-center gap-1">
              <span className={cn('inline-block rounded-full bg-primary')} style={{ width: 22, height: 22 }} />
              Máx ({formatMetric(metrica === 'valor' ? maxCidade : maxCidade)})
            </span>
          </div>
          {semCoords > 0 && (
            <span>{semCoords} {semCoords === 1 ? 'viagem sem coordenadas' : 'viagens sem coordenadas'}</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
