import { useEffect, useState, useMemo } from 'react';
import { ComposableMap, Geographies, Geography } from 'react-simple-maps';
import { ChartCardShell, ChartCardShellProps } from '../ChartCardShell';

export interface BrazilMapDatum { uf: string; valor: number; label?: string }

export interface BrazilMapCardProps extends Omit<ChartCardShellProps, 'children' | 'isEmpty'> {
  data: BrazilMapDatum[];
  valueFormatter?: (v: number) => string;
  geoUrl?: string;
}

export function BrazilMapCard({ data, valueFormatter = (v) => String(v), geoUrl = '/geo/brasil-uf.json', height = 360, ...shell }: BrazilMapCardProps) {
  const [geo, setGeo] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetch(geoUrl).then((r) => r.json()).then(setGeo).catch((e) => setErr(String(e)));
  }, [geoUrl]);

  const map = useMemo(() => {
    const m = new Map<string, BrazilMapDatum>();
    data.forEach((d) => m.set(d.uf.toUpperCase(), d));
    return m;
  }, [data]);
  const max = Math.max(...data.map((d) => d.valor), 1);
  const isEmpty = !data?.length;

  return (
    <ChartCardShell {...shell} height={height} isEmpty={isEmpty} error={err}>
      {geo && (
        <div style={{ height }}>
          <ComposableMap projection="geoMercator" projectionConfig={{ center: [-54, -15], scale: 700 }} style={{ width: '100%', height: '100%' }}>
            <Geographies geography={geo}>
              {({ geographies }: any) =>
                geographies.map((g: any) => {
                  const uf = g.properties?.sigla || g.properties?.SIGLA_UF || g.properties?.UF || '';
                  const item = map.get(String(uf).toUpperCase());
                  const intensity = item ? item.valor / max : 0;
                  return (
                    <Geography
                      key={g.rsmKey}
                      geography={g}
                      style={{
                        default: {
                          fill: item ? `hsl(var(--primary) / ${0.15 + intensity * 0.75})` : 'hsl(var(--muted))',
                          stroke: 'hsl(var(--background))',
                          strokeWidth: 0.5,
                          outline: 'none',
                        },
                        hover: { fill: 'hsl(var(--primary))', outline: 'none', cursor: item ? 'pointer' : 'default' },
                        pressed: { outline: 'none' },
                      }}
                    >
                      <title>{`${uf}${item ? `: ${valueFormatter(item.valor)}` : ''}`}</title>
                    </Geography>
                  );
                })
              }
            </Geographies>
          </ComposableMap>
        </div>
      )}
    </ChartCardShell>
  );
}
