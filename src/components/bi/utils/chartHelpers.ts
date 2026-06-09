// BI lib — paleta e helpers de gráficos.
import { getNumberRoundingMode } from '@/lib/bi/numberFormatMode';

export const BI_PALETTE = [
  'hsl(215,70%,45%)',
  'hsl(142,70%,40%)',
  'hsl(38,92%,50%)',
  'hsl(0,72%,51%)',
  'hsl(199,89%,48%)',
  'hsl(280,60%,50%)',
  'hsl(160,60%,40%)',
  'hsl(30,80%,55%)',
  'hsl(340,75%,55%)',
  'hsl(190,70%,45%)',
];

export const tickCurrencyAbbrev = (v: number) => {
  if (getNumberRoundingMode() === 'millions') {
    return `R$ ${(v / 1_000_000).toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} mi`;
  }
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `R$ ${(v / 1_000).toFixed(0)}k`;
  return `R$ ${v.toFixed(0)}`;
};

export function topN<T>(arr: T[], n: number, key: (t: T) => number): T[] {
  return [...arr].sort((a, b) => key(b) - key(a)).slice(0, n);
}

export function sortBy<T>(arr: T[], key: (t: T) => number | string, dir: 'asc' | 'desc' = 'desc'): T[] {
  return [...arr].sort((a, b) => {
    const ka = key(a), kb = key(b);
    if (ka < kb) return dir === 'asc' ? -1 : 1;
    if (ka > kb) return dir === 'asc' ? 1 : -1;
    return 0;
  });
}
