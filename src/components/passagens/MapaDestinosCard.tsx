import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Plus, Minus } from 'lucide-react';
import { formatCurrency } from '@/lib/format';
import { geocodeCidade, nomeNormalizado } from './cidadesBrasil';
import type { Passagem } from './PassagensDashboard';

interface AggregadoCidade {
  cidade: string;
  qtd: number;
  total: number;
  uf: string;
}

interface Props {
  data: Passagem[];
  selectedDestino?: string[];
  onSelectDestino?: (cidade: string) => void;
}

const TOP_INITIAL = 5;

export function MapaDestinosCard({ data, selectedDestino = [], onSelectDestino }: Props) {
  const [topLimit, setTopLimit] = useState(TOP_INITIAL);

  const porCidade = useMemo<AggregadoCidade[]>(() => {
    const map = new Map<string, AggregadoCidade>();
    data.forEach((p) => {
      const cidadeRaw = (p.destino ?? '').trim();
      if (!cidadeRaw) return;
      const key = nomeNormalizado(cidadeRaw);
      const geo = geocodeCidade(key);
      const cur = map.get(key) ?? {
        cidade: cidadeRaw,
        qtd: 0,
        total: 0,
        uf: geo?.uf ?? (p.uf_destino ?? '-'),
      };
      cur.qtd += 1;
      cur.total += Number(p.valor || 0);
      map.set(key, cur);
    });
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [data]);

  const topDestinos = porCidade.slice(0, topLimit);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <MapPin className="h-4 w-4 text-primary" />
            Top destinos por valor
          </CardTitle>
          {porCidade.length > 0 && (
            <span className="text-[11px] text-muted-foreground">
              {topDestinos.length} de {porCidade.length}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-1.5">
          {topDestinos.map((p, i) => {
            const isSelected =
              !!selectedDestino &&
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
                      {p.uf} · {p.qtd} {p.qtd === 1 ? 'passagem' : 'passagens'}
                    </div>
                  </div>
                </div>
                <Badge variant="secondary" className="shrink-0 text-[10px]">
                  {formatCurrency(p.total)}
                </Badge>
              </button>
            );
          })}
          {topDestinos.length === 0 && (
            <div className="text-xs text-muted-foreground">Sem dados</div>
          )}
          {(porCidade.length > topLimit || topLimit > TOP_INITIAL) && (
            <div className="flex gap-1.5 pt-1">
              {porCidade.length > topLimit && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 flex-1 text-[11px]"
                  onClick={() =>
                    setTopLimit((n) => Math.min(n + 5, porCidade.length))
                  }
                >
                  <Plus className="h-3 w-3 mr-1" /> Mostrar mais
                </Button>
              )}
              {topLimit > TOP_INITIAL && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 flex-1 text-[11px]"
                  onClick={() => setTopLimit(TOP_INITIAL)}
                >
                  <Minus className="h-3 w-3 mr-1" /> Mostrar menos
                </Button>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
