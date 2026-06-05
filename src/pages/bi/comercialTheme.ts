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

// ---- Background override (per unidade, localStorage) ----

const BG_KEY = (u: UnidadeNegocio) => `bi-comercial:bg-color:${u}`;

export function getBgOverride(unidade: UnidadeNegocio): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(BG_KEY(unidade));
  } catch {
    return null;
  }
}

export function setBgOverride(unidade: UnidadeNegocio, color: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(BG_KEY(unidade), color);
  } catch {}
}

export function clearBgOverride(unidade: UnidadeNegocio): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(BG_KEY(unidade));
  } catch {}
}

export function getUnidadeTheme(unidade: UnidadeNegocio): UnidadeTheme {
  return unidadeThemes[unidade] ?? unidadeThemes.CONSOLIDADO;
}

/** Tema efetivo: base da unidade + override de fundo (se houver). */
export function getEffectiveTheme(unidade: UnidadeNegocio): UnidadeTheme {
  const base = getUnidadeTheme(unidade);
  const override = getBgOverride(unidade);
  if (!override) return base;
  return { ...base, pageBackground: override };
}

export const SUGGESTED_BG_COLORS: { label: string; value: string }[] = [
  { label: 'Laranja claro', value: '#fff7ed' },
  { label: 'Azul claro', value: '#eff6ff' },
  { label: 'Verde claro', value: '#ecfdf5' },
  { label: 'Roxo claro', value: '#f5f3ff' },
  { label: 'Rosa claro', value: '#fdf2f8' },
  { label: 'Amarelo claro', value: '#fefce8' },
  { label: 'Cinza claro', value: '#f8fafc' },
  { label: 'Branco', value: '#ffffff' },
];
