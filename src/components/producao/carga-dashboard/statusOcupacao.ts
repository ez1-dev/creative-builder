import type { RecursoAgg } from './aggregations';

export type OcupacaoStatus = 'Crítico' | 'Alto' | 'Médio' | 'Normal';

/**
 * Como o backend ainda não fornece capacidade real por centro,
 * derivamos o status por ranking percentil da carga prevista no período.
 *
 *  Top 10% → Crítico
 *  Top 11–30% → Alto
 *  Top 31–60% → Médio
 *  Demais → Normal
 *
 * Se a lista tem ≤ 3 recursos, classifica direto pela posição.
 */
export function classifyOcupacao(rows: RecursoAgg[]): Map<string, OcupacaoStatus> {
  const map = new Map<string, OcupacaoStatus>();
  if (!rows.length) return map;
  const sorted = [...rows].sort((a, b) => b.carga_prevista_horas - a.carga_prevista_horas);
  const n = sorted.length;
  sorted.forEach((r, i) => {
    const rank = (i + 1) / n;
    let st: OcupacaoStatus;
    if (rank <= 0.1) st = 'Crítico';
    else if (rank <= 0.3) st = 'Alto';
    else if (rank <= 0.6) st = 'Médio';
    else st = 'Normal';
    map.set(`${r.codcre}|${r.codccu}`, st);
  });
  return map;
}

export const statusStyle: Record<OcupacaoStatus, { dot: string; text: string }> = {
  Crítico: { dot: 'bg-destructive', text: 'text-destructive' },
  Alto: { dot: 'bg-orange-500', text: 'text-orange-600 dark:text-orange-500' },
  Médio: { dot: 'bg-amber-400', text: 'text-amber-700 dark:text-amber-500' },
  Normal: { dot: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-500' },
};

export function countCriticos(rows: RecursoAgg[]): number {
  const cls = classifyOcupacao(rows);
  let n = 0;
  cls.forEach((s) => {
    if (s === 'Crítico') n += 1;
  });
  return n;
}
