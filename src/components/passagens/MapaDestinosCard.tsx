import { useMemo, useState } from 'react';
import { ComposableMap, Geographies, Geography } from 'react-simple-maps';
import { geoCentroid } from 'd3-geo';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin } from 'lucide-react';
import { formatCurrency } from '@/lib/format';
import { geocodeCidade, nomeNormalizado } from './cidadesBrasil';
import type { Passagem } from './PassagensDashboard';

const GEO_URL = '/geo/brasil-uf.json';

// Código IBGE (2 dígitos) -> sigla UF
const COD_TO_UF: Record<string, string> = {
  '11': 'RO', '12': 'AC', '13': 'AM', '14': 'RR', '15': 'PA', '16': 'AP', '17': 'TO',
  '21': 'MA', '22': 'PI', '23': 'CE', '24': 'RN', '25': 'PB', '26': 'PE', '27': 'AL', '28': 'SE', '29': 'BA',
  '31': 'MG', '32': 'ES', '33': 'RJ', '35': 'SP',
  '41': 'PR', '42': 'SC', '43': 'RS',
  '50': 'MS', '51': 'MT', '52': 'GO', '53': 'DF',
};

const UF_NOME: Record<string, string> = {
  AC: 'Acre', AL: 'Alagoas', AP: 'Amapá', AM: 'Amazonas', BA: 'Bahia', CE: 'Ceará',
  DF: 'Distrito Federal', ES: 'Espírito Santo', GO: 'Goiás', MA: 'Maranhão',
  MT: 'Mato Grosso', MS: 'Mato Grosso do Sul', MG: 'Minas Gerais', PA: 'Pará',
  PB: 'Paraíba', PR: 'Paraná', PE: 'Pernambuco', PI: 'Piauí', RJ: 'Rio de Janeiro',
  RN: 'Rio Grande do Norte', RS: 'Rio Grande do Sul', RO: 'Rondônia', RR: 'Roraima',
  SC: 'Santa Catarina', SP: 'São Paulo', SE: 'Sergipe', TO: 'Tocantins',
};

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
}

// Faixas discretas de cor (estilo heatmap do exemplo)
function colorForQtd(qtd: number, max: number): string {
  if (!qtd || qtd <= 0) return 'hsl(220, 14%, 92%)'; // cinza claro neutro
  if (max <= 0) return 'hsl(220, 14%, 92%)';
  const ratio = qtd / max;
  if (ratio <= 0.2) return 'hsl(150, 35%, 70%)';   // verde claro - baixo
  if (ratio <= 0.45) return 'hsl(205, 70%, 70%)';  // azul claro - médio
  if (ratio <= 0.7) return 'hsl(45, 90%, 60%)';    // amarelo - médio-alto
  return 'hsl(0, 70%, 52%)';                       // vermelho - alto
}

export function MapaDestinosCard({ data, selectedDestino, onSelectDestino }: Props) {
  const [tooltip, setTooltip] = useState<
    { x: number; y: number; uf: string; qtd: number; total: number } | null
  >(null);

  const { porCidade, porUF, semGeo, totalSemGeo, maxQtdUF } = useMemo(() => {
    const cidadeMap = new Map<string, { qtd: number; total: number; nomeOriginal: string }>();
    const sem = new Set<string>();
    let semCount = 0;

    for (const r of data) {
      if (!r.destino) continue;
      const key = nomeNormalizado(r.destino);
      const cur = cidadeMap.get(key) ?? { qtd: 0, total: 0, nomeOriginal: r.destino };
      cur.qtd += 1;
      cur.total += Number(r.valor || 0);
      cidadeMap.set(key, cur);
    }

    const cidades: AggregadoCidade[] = [];
    const ufMap = new Map<string, AggregadoUF>();

    for (const [, val] of cidadeMap.entries()) {
      const coord = geocodeCidade(nomeNormalizado(val.nomeOriginal));
      if (!coord) {
        sem.add(val.nomeOriginal);
        semCount += val.qtd;
        continue;
      }
      cidades.push({
        cidade: val.nomeOriginal,
        qtd: val.qtd,
        total: val.total,
        uf: coord.uf,
      });
      const ufCur = ufMap.get(coord.uf) ?? { uf: coord.uf, qtd: 0, total: 0 };
      ufCur.qtd += val.qtd;
      ufCur.total += val.total;
      ufMap.set(coord.uf, ufCur);
    }

    cidades.sort((a, b) => b.qtd - a.qtd);
    const ufs = Array.from(ufMap.values());
    const max = ufs.reduce((m, u) => Math.max(m, u.qtd), 0);

    return {
      porCidade: cidades,
      porUF: ufMap,
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

  const legenda = useMemo(() => {
    if (maxQtdUF <= 0) return [];
    return [
      { label: 'Sem registros', color: 'hsl(220, 14%, 92%)' },
      { label: 'Baixo', color: 'hsl(150, 35%, 70%)' },
      { label: 'Médio', color: 'hsl(205, 70%, 70%)' },
      { label: 'Médio-alto', color: 'hsl(45, 90%, 60%)' },
      { label: `Alto (até ${maxQtdUF})`, color: 'hsl(0, 70%, 52%)' },
    ];
  }, [maxQtdUF]);

  // Offsets manuais (em graus) para sobrepor siglas dos estados pequenos no NE
  const labelOffset: Record<string, [number, number]> = {
    RN: [2.4, 0.0],
    PB: [2.8, 0.7],
    PE: [3.0, 1.4],
    AL: [2.6, 2.0],
    SE: [2.4, 2.6],
    ES: [2.0, 0.0],
    DF: [0, 0],
  };

  return (
    <Card className="lg:col-span-2">
      <CardHeader className="flex flex-col gap-2 pb-2 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-primary" />
          <CardTitle className="text-sm">
            Mapa de Destinos
            {liderUF && (
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                — Maior incidência:{' '}
                <strong className="text-foreground">{UF_NOME[liderUF.uf] ?? liderUF.uf}</strong>{' '}
                ({liderUF.qtd})
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
          {/* Mapa - centralizado */}
          <div
            className="relative flex items-center justify-center lg:col-span-2"
            onMouseLeave={() => setTooltip(null)}
          >
            <div className="mx-auto w-full max-w-[560px]">
              <ComposableMap
                projection="geoMercator"
                projectionConfig={{ scale: 780, center: [-54, -15] }}
                width={600}
                height={560}
                style={{ width: '100%', height: 'auto', display: 'block' }}
              >
                {/* Camada 1: fills das UFs com cor por intensidade */}
                <Geographies geography={GEO_URL}>
                  {({ geographies }) =>
                    geographies.map((geo) => {
                      const cod = String(geo.properties?.codarea ?? '');
                      const uf = COD_TO_UF[cod] ?? '';
                      const agg = porUF.get(uf);
                      const qtd = agg?.qtd ?? 0;
                      const total = agg?.total ?? 0;
                      const fill = colorForQtd(qtd, maxQtdUF);
                      return (
                        <Geography
                          key={`fill-${geo.rsmKey}`}
                          geography={geo}
                          fill={fill}
                          stroke="hsl(0, 0%, 100%)"
                          strokeWidth={0.8}
                          style={{
                            default: { outline: 'none', transition: 'opacity 150ms' },
                            hover: {
                              outline: 'none',
                              fill,
                              opacity: 0.82,
                              cursor: qtd > 0 ? 'pointer' : 'default',
                            },
                            pressed: { outline: 'none' },
                          }}
                          onMouseEnter={(e) => {
                            const rect = (
                              e.currentTarget.ownerSVGElement?.parentElement as HTMLElement
                            )?.getBoundingClientRect();
                            if (rect) {
                              setTooltip({
                                x: e.clientX - rect.left,
                                y: e.clientY - rect.top,
                                uf,
                                qtd,
                                total,
                              });
                            }
                          }}
                          onMouseMove={(e) => {
                            const rect = (
                              e.currentTarget.ownerSVGElement?.parentElement as HTMLElement
                            )?.getBoundingClientRect();
                            if (rect) {
                              setTooltip({
                                x: e.clientX - rect.left,
                                y: e.clientY - rect.top,
                                uf,
                                qtd,
                                total,
                              });
                            }
                          }}
                          onMouseLeave={() => setTooltip(null)}
                        />
                      );
                    })
                  }
                </Geographies>

                {/* Camada 2: bordas mais marcadas por cima */}
                <Geographies geography={GEO_URL}>
                  {({ geographies }) =>
                    geographies.map((geo) => (
                      <Geography
                        key={`stroke-${geo.rsmKey}`}
                        geography={geo}
                        fill="none"
                        stroke="hsl(220, 18%, 55%)"
                        strokeWidth={0.5}
                        strokeOpacity={0.55}
                        style={{
                          default: { outline: 'none', pointerEvents: 'none' },
                          hover: { outline: 'none', pointerEvents: 'none' },
                          pressed: { outline: 'none', pointerEvents: 'none' },
                        }}
                      />
                    ))
                  }
                </Geographies>

                {/* Camada 3: siglas das UFs */}
                <Geographies geography={GEO_URL}>
                  {({ geographies }) =>
                    geographies.map((geo) => {
                      const cod = String(geo.properties?.codarea ?? '');
                      const uf = COD_TO_UF[cod] ?? '';
                      if (!uf) return null;
                      const [cx, cy] = geoCentroid(geo);
                      const [dx, dy] = labelOffset[uf] ?? [0, 0];
                      const lx = cx + dx;
                      const ly = cy + dy;
                      const hasOffset = dx !== 0 || dy !== 0;
                      return (
                        <g key={`label-${geo.rsmKey}`} pointerEvents="none">
                          {hasOffset && (
                            <line
                              x1={cx}
                              y1={cy}
                              x2={lx}
                              y2={ly}
                              stroke="hsl(220, 18%, 45%)"
                              strokeWidth={0.35}
                              strokeOpacity={0.6}
                            />
                          )}
                          <text
                            x={lx}
                            y={ly}
                            textAnchor="middle"
                            dominantBaseline="central"
                            style={{
                              fontFamily: 'inherit',
                              fontSize: 10,
                              fontWeight: 700,
                              fill: 'hsl(220, 25%, 18%)',
                              paintOrder: 'stroke',
                              stroke: 'hsl(0, 0%, 100%)',
                              strokeWidth: 2.5,
                              strokeLinejoin: 'round',
                            }}
                          >
                            {uf}
                          </text>
                        </g>
                      );
                    })
                  }
                </Geographies>
              </ComposableMap>
            </div>

            {tooltip && (
              <div
                className="pointer-events-none absolute z-10 rounded-md border bg-popover px-2.5 py-1.5 text-xs text-popover-foreground shadow-md"
                style={{
                  left: tooltip.x + 12,
                  top: tooltip.y + 12,
                }}
              >
                <div className="font-semibold">
                  {UF_NOME[tooltip.uf] ?? tooltip.uf || '—'}
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
              </div>
            )}

            {porCidade.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
                Sem destinos para exibir
              </div>
            )}
          </div>

          {/* Sidebar: Top 5 + Legenda */}
          <div className="space-y-4">
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
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
