/**
 * Helpers do Dashboard Geral — normalização de números, cálculo de deltas
 * e construção de séries a partir das respostas dos endpoints existentes.
 */

export type Periodo = 'mes_atual' | 'mes_anterior' | 'ytd' | 'ult_12m';

export interface RangeAnomes {
  ini: string;
  fim: string;
  label: string;
}

const pad2 = (n: number) => String(n).padStart(2, '0');
const toAno = (d: Date) => `${d.getFullYear()}${pad2(d.getMonth() + 1)}`;

export function rangeFor(periodo: Periodo, ref: Date = new Date()): RangeAnomes {
  const y = ref.getFullYear();
  const m = ref.getMonth();
  switch (periodo) {
    case 'mes_atual': {
      const a = toAno(new Date(y, m, 1));
      return { ini: a, fim: a, label: 'Mês atual' };
    }
    case 'mes_anterior': {
      const a = toAno(new Date(y, m - 1, 1));
      return { ini: a, fim: a, label: 'Mês anterior' };
    }
    case 'ytd':
      return { ini: toAno(new Date(y, 0, 1)), fim: toAno(ref), label: 'YTD' };
    case 'ult_12m':
      return { ini: toAno(new Date(y, m - 11, 1)), fim: toAno(ref), label: 'Últimos 12 meses' };
  }
}

export const num = (v: any): number => {
  if (v == null || v === '') return 0;
  const n = typeof v === 'number' ? v : Number(String(v).replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
};

export const delta = (atual: number, anterior: number): number => {
  if (!anterior) return 0;
  return (atual - anterior) / Math.abs(anterior);
};

/** Formata "YYYYMM" -> "MMM/YY" */
export const labelAnomes = (a: string): string => {
  if (!a || a.length < 6) return a || '';
  const y = a.slice(2, 4);
  const m = Number(a.slice(4, 6)) - 1;
  const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return `${meses[m] ?? '??'}/${y}`;
};
