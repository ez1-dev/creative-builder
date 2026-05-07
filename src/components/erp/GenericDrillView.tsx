import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronRight, ArrowLeft, X, ChevronDown } from 'lucide-react';
import { formatCurrency, formatNumber } from '@/lib/format';

export type DrillNivel = { key: string; label: string };

export type DrillMetric = {
  key: string;
  label: string;
  format: 'currency' | 'number';
  /** rowAccessor: como derivar o valor por linha */
  accessor: (row: any) => number;
  /** distinctOf: opcional — em vez de somar, conta valores distintos da chave */
  distinctOf?: (row: any) => any;
};

export type DrillSeed = { nivel: string; chave: string; label: string; nonce?: number } | null;

interface Props {
  dados: any[];
  niveis: DrillNivel[];
  metrics: DrillMetric[];
  primaryMetricKey?: string;
  /** Quando muda, posiciona o drill iniciando neste nível/valor. */
  seed?: DrillSeed;
}

type Step = { nivel: string; chave: string; label: string };

export function GenericDrillView({ dados, niveis, metrics, primaryMetricKey, seed }: Props) {
  const [stack, setStack] = useState<Step[]>([]);
  const lastSeedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!seed) return;
    if (!niveis.some((n) => n.key === seed.nivel)) return;
    const sig = `${seed.nivel}::${seed.chave}::${seed.nonce ?? ''}`;
    if (lastSeedRef.current === sig) return;
    lastSeedRef.current = sig;
    setStack([{ nivel: seed.nivel, chave: seed.chave, label: seed.label }]);
  }, [seed, niveis]);

  const filtrados = useMemo(() => {
    return dados.filter((d) => stack.every((s) => String(d[s.nivel] ?? '') === s.chave));
  }, [dados, stack]);

  const nivelAtualIdx = stack.length;
  const nivelAtual = niveis[nivelAtualIdx];
  const primary = primaryMetricKey ?? metrics[0]?.key;

  const grupos = useMemo(() => {
    if (!nivelAtual) return [];
    const map = new Map<string, { label: string; rows: any[] }>();
    filtrados.forEach((d) => {
      const chave = String(d[nivelAtual.key] ?? '—');
      const cur = map.get(chave) || { label: chave, rows: [] };
      cur.rows.push(d);
      map.set(chave, cur);
    });
    const list = [...map.entries()].map(([chave, v]) => {
      const values: Record<string, number> = {};
      metrics.forEach((m) => {
        if (m.distinctOf) {
          const set = new Set();
          v.rows.forEach((r) => set.add(m.distinctOf!(r)));
          values[m.key] = set.size;
        } else {
          values[m.key] = v.rows.reduce((s, r) => s + (m.accessor(r) || 0), 0);
        }
      });
      return { chave, label: v.label, values };
    });
    list.sort((a, b) => (b.values[primary] || 0) - (a.values[primary] || 0));
    return list;
  }, [filtrados, nivelAtual, metrics, primary]);

  const totals = useMemo(() => {
    const t: Record<string, number> = {};
    metrics.forEach((m) => {
      if (m.distinctOf) {
        const set = new Set();
        filtrados.forEach((r) => set.add(m.distinctOf!(r)));
        t[m.key] = set.size;
      } else {
        t[m.key] = filtrados.reduce((s, r) => s + (m.accessor(r) || 0), 0);
      }
    });
    return t;
  }, [filtrados, metrics]);

  const drillIn = (g: { chave: string; label: string }) => {
    if (!nivelAtual) return;
    setStack((s) => [...s, { nivel: nivelAtual.key, chave: g.chave, label: g.label }]);
  };
  const goTo = (idx: number) => setStack((s) => s.slice(0, idx));

  const fmt = (m: DrillMetric, v: number) => (m.format === 'currency' ? formatCurrency(v) : formatNumber(v, 0));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 rounded-md border bg-card p-2">
        <button type="button" onClick={() => goTo(0)} className="rounded px-2 py-1 text-xs font-medium hover:bg-accent">
          Início
        </button>
        {stack.map((s, i) => (
          <div key={i} className="flex items-center gap-1">
            <ChevronRight className="h-3 w-3 text-muted-foreground" />
            <button type="button" onClick={() => goTo(i + 1)} className="rounded px-2 py-1 text-xs hover:bg-accent">
              <span className="text-muted-foreground">{niveis.find((n) => n.key === s.nivel)?.label}:</span>{' '}
              <span className="font-medium">{s.label}</span>
            </button>
          </div>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => setStack((s) => s.slice(0, -1))} disabled={stack.length === 0}>
            <ArrowLeft className="mr-1 h-3 w-3" /> Voltar nível
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setStack([])} disabled={stack.length === 0}>
            <X className="mr-1 h-3 w-3" /> Limpar drill
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-muted-foreground">
        <div>
          Agrupando por: <span className="font-semibold text-foreground">{nivelAtual?.label ?? 'Detalhe'}</span>
          {' · '}
          {grupos.length} {grupos.length === 1 ? 'grupo' : 'grupos'}
          {' · '}
          {filtrados.length} linhas
        </div>
        <div className="flex flex-wrap gap-3">
          {metrics.map((m) => (
            <span key={m.key}>
              {m.label}: <span className="font-semibold text-foreground">{fmt(m, totals[m.key] || 0)}</span>
            </span>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto rounded-md border bg-card">
        <table className="w-full text-xs">
          <thead className="bg-muted/40 text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left">{nivelAtual?.label ?? 'Detalhe'}</th>
              {metrics.map((m) => (
                <th key={m.key} className="px-3 py-2 text-right">{m.label}</th>
              ))}
              <th className="px-3 py-2 text-center w-10"></th>
            </tr>
          </thead>
          <tbody>
            {grupos.length === 0 && (
              <tr>
                <td colSpan={metrics.length + 2} className="px-3 py-6 text-center text-muted-foreground">
                  Nenhum dado para os filtros aplicados.
                </td>
              </tr>
            )}
            {grupos.map((g) => {
              const podeDrill = nivelAtualIdx < niveis.length - 1;
              return (
                <tr
                  key={g.chave}
                  className={`border-t ${podeDrill ? 'cursor-pointer hover:bg-accent/40' : ''}`}
                  onClick={() => podeDrill && drillIn(g)}
                >
                  <td className="px-3 py-2 font-medium">{g.label || '—'}</td>
                  {metrics.map((m) => (
                    <td key={m.key} className="px-3 py-2 text-right">{fmt(m, g.values[m.key] || 0)}</td>
                  ))}
                  <td className="px-3 py-2 text-center text-muted-foreground">
                    {podeDrill ? <ChevronDown className="inline h-3 w-3 -rotate-90" /> : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
