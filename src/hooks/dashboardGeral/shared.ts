/**
 * Utilitários compartilhados pelos hooks das abas do Dashboard Geral.
 * Cada aba usa `useQueries` com `enabled` para lazy-fetch e retry: 0.
 */
import { rangeFor, rangeAnteriorEquivalente, num, delta, labelAnomes, type Periodo } from '@/lib/dashboardGeral/aggregator';

export type ModStatus = 'ok' | 'erro' | 'carregando' | 'idle' | 'parcial';

export function statusFrom(
  q: { isLoading: boolean; isError: boolean; isFetching: boolean; data: unknown },
  enabled = true,
  partial = false,
): ModStatus {
  if (!enabled) return 'idle';
  // Só considera "carregando" na primeira carga (sem data). Refetch em background
  // mantém o status atual para evitar flicker de skeletons/cards.
  if (q.isLoading && !q.data) return 'carregando';
  if (q.isError && !q.data) return 'erro';
  if (!q.data) return 'erro';
  if (partial) return 'parcial';
  return 'ok';
}

export { rangeFor, num, delta, labelAnomes };
export type { Periodo };

export function anomesToDate(a: string, end = false): string {
  const y = a.slice(0, 4);
  const m = a.slice(4, 6);
  if (!end) return `${y}-${m}-01`;
  const last = new Date(Number(y), Number(m), 0).getDate();
  return `${y}-${m}-${String(last).padStart(2, '0')}`;
}

/** Divisão segura: retorna 0 quando denominador zerado ou resultado não finito. */
export function safeDiv(a: number, b: number): number {
  if (!b || !Number.isFinite(a) || !Number.isFinite(b)) return 0;
  const r = a / b;
  return Number.isFinite(r) ? r : 0;
}

/**
 * Normaliza percentuais que podem vir em escala 0–1 (decimal) ou 0–100.
 * Se |v| <= 1.5 assume decimal e multiplica por 100; senão devolve como está.
 */
export function pctDisplay(v: number | null | undefined): number {
  const n = num(v);
  if (!Number.isFinite(n)) return 0;
  return Math.abs(n) <= 1.5 ? n * 100 : n;
}
