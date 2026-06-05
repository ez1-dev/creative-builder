import type { UnidadeNegocio } from '@/lib/bi/comercialFilters';

export interface UnidadeTheme {
  pageBackground: string;
  primary: string;
  accent: string;
  cardBorder: string;
  chipBg: string;
  chipText: string;
}

export const unidadeThemes: Record<UnidadeNegocio, UnidadeTheme> = {
  GENIUS: {
    pageBackground: 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)',
    primary: '#f97316',
    accent: '#fb923c',
    cardBorder: 'rgba(249, 115, 22, 0.25)',
    chipBg: 'rgba(249, 115, 22, 0.15)',
    chipText: '#c2410c',
  },
  'ESTRUTURAL ZORTEA': {
    pageBackground: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
    primary: '#2563eb',
    accent: '#60a5fa',
    cardBorder: 'rgba(37, 99, 235, 0.25)',
    chipBg: 'rgba(37, 99, 235, 0.15)',
    chipText: '#1d4ed8',
  },
  CONSOLIDADO: {
    pageBackground: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
    primary: '#475569',
    accent: '#7c3aed',
    cardBorder: 'rgba(71, 85, 105, 0.25)',
    chipBg: 'rgba(71, 85, 105, 0.15)',
    chipText: '#334155',
  },
};

export function getUnidadeTheme(unidade: UnidadeNegocio): UnidadeTheme {
  return unidadeThemes[unidade] ?? unidadeThemes.CONSOLIDADO;
}
