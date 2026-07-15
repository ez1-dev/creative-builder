/**
 * Utilitários compartilhados pelos hooks das abas do Dashboard Geral.
 * Cada aba usa `useQueries` com `enabled` para lazy-fetch e retry: 0.
 */
import { rangeFor, num, delta, labelAnomes, type Periodo } from '@/lib/dashboardGeral/aggregator';

export type ModStatus = 'ok' | 'erro' | 'carregando' | 'idle';

export function statusFrom(q: { isLoading: boolean; isError: boolean; isFetching: boolean; data: unknown }, enabled = true): ModStatus {
  if (!enabled) return 'idle';
  if (q.isLoading || q.isFetching) return 'carregando';
  if (q.isError) return 'erro';
  if (!q.data) return 'erro';
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
