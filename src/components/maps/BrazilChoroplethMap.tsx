import { useEffect, useMemo, useState } from 'react';
import { ComposableMap, Geographies, Geography } from 'react-simple-maps';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Map as MapIcon } from 'lucide-react';

const UF_BY_CODE: Record<string, string> = {
  '11':'RO','12':'AC','13':'AM','14':'RR','15':'PA','16':'AP','17':'TO',
  '21':'MA','22':'PI','23':'CE','24':'RN','25':'PB','26':'PE','27':'AL','28':'SE','29':'BA',
  '31':'MG','32':'ES','33':'RJ','35':'SP',
  '41':'PR','42':'SC','43':'RS',
  '50':'MS','51':'MT','52':'GO','53':'DF',
};

const NOME_UF: Record<string, string> = {
  RO:'Rondônia', AC:'Acre', AM:'Amazonas', RR:'Roraima', PA:'Pará', AP:'Amapá', TO:'Tocantins',
  MA:'Maranhão', PI:'Piauí', CE:'Ceará', RN:'Rio Grande do Norte', PB:'Paraíba', PE:'Pernambuco',
  AL:'Alagoas', SE:'Sergipe', BA:'Bahia',
  MG:'Minas Gerais', ES:'Espírito Santo', RJ:'Rio de Janeiro', SP:'São Paulo',
  PR:'Paraná', SC:'Santa Catarina', RS:'Rio Grande do Sul',
  MS:'Mato Grosso do Sul', MT:'Mato Grosso', GO:'Goiás', DF:'Distrito Federal',
};

export interface BrazilChoroplethDatum {
  uf: string;
  estado?: string;
  valor: number;
}

export interface BrazilChoroplethMapProps {
  dados: BrazilChoroplethDatum[];
  title?: string;
  valueFormatter?: (v: number) => string;
  height?: number;
  geoUrl?: string;
  onSelectUF?: (uf: string) => void;
  selectedUF?: string[];
}

/**
 * Mapa coroplético do Brasil por UF — escala automática usando token --primary.
 * Estados sem dado ficam em --muted. Reutilizável em qualquer dashboard.
 */
export function BrazilChoroplethMap({
  dados,
  title = 'Mapa do Brasil por Estado',
  valueFormatter = (v) => String(v),
  height = 520,
  geoUrl = '/geo/brasil-uf.json',
  onSelectUF,
  selectedUF = [],
}: BrazilChoroplethMapProps) {
  const [geo, setGeo] = useState<any>(null);

  useEffect(() => {
    fetch(geoUrl).then((r) => r.json()).then(setGeo).catch(() => setGeo(null));
  }, [geoUrl]);

  const { byUF, min, max } = useMemo(() => {
    const m = new Map<string, BrazilChoroplethDatum>();
    dados.forEach((d) => m.set((d.uf || '').toUpperCase(), d));
    const valores = dados.map((d) => d.valor);
    return {
      byUF: m,
      min: valores.length ? Math.min(...valores) : 0,
      max: valores.length ? Math.max(...valores) : 1,
    };
  }, [dados]);

  const fillFor = (uf: string) => {
    const item = byUF.get(uf);
    if (!item) return 'hsl(var(--muted))';
    const range = max - min || 1;
    const pct = (item.valor - min) / range;
    const opacity = 0.18 + pct * 0.7;
    return `hsl(var(--primary) / ${opacity.toFixed(3)})`;
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <MapIcon className="h-4 w-4 text-primary" />
          {title}
        </CardTitle>
        <span className="hidden text-[11px] text-muted-foreground sm:inline">
          {dados.length} {dados.length === 1 ? 'estado' : 'estados'} com dado
        </span>
      </CardHeader>
      <CardContent>
        <div className="relative w-full" style={{ height }}>
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
                    const uf = (UF_BY_CODE[code] ?? code).toUpperCase();
                    const item = byUF.get(uf);
                    const isSel = selectedUF.includes(uf);
                    const nome = item?.estado ?? NOME_UF[uf] ?? uf;
                    return (
                      <Geography
                        key={g.rsmKey}
                        geography={g}
                        onClick={() => onSelectUF?.(uf)}
                        style={{
                          default: {
                            fill: fillFor(uf),
                            stroke: isSel ? 'hsl(var(--primary))' : 'hsl(var(--background))',
                            strokeWidth: isSel ? 1.6 : 0.6,
                            outline: 'none',
                          },
                          hover: {
                            fill: 'hsl(var(--primary) / 0.85)',
                            outline: 'none',
                            cursor: onSelectUF ? 'pointer' : 'default',
                          },
                          pressed: { outline: 'none' },
                        }}
                      >
                        <title>
                          {item
                            ? `${nome} (${uf}): ${valueFormatter(item.valor)}`
                            : `${nome} (${uf}): sem dados`}
                        </title>
                      </Geography>
                    );
                  })
                }
              </Geographies>
            </ComposableMap>
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
              Carregando mapa…
            </div>
          )}
        </div>
        <div className="mt-3 flex items-center gap-3 text-[11px] text-muted-foreground">
          <span>{valueFormatter(min)}</span>
          <div
            className="h-2 flex-1 rounded-full"
            style={{
              background:
                'linear-gradient(to right, hsl(var(--primary) / 0.18), hsl(var(--primary) / 0.88))',
            }}
          />
          <span>{valueFormatter(max)}</span>
          <span className="ml-2 inline-flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full bg-muted" />
            sem dados
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
