// BI lib — formatadores padronizados (BR-pt). Reaproveita src/lib/format.ts onde aplicável.
//
// As funções de moeda e número respeitam o modo de arredondamento global
// definido em `src/lib/bi/numberFormatMode.ts` (Completo / Sem decimais /
// Abreviado). Componentes da biblioteca BI consomem essas funções sem
// precisar conhecer o modo — basta o Provider configurar o singleton.

import { getNumberRoundingMode } from '@/lib/bi/numberFormatMode';

function formatMillions(value: number, currency: boolean): string {
  const n = value / 1_000_000;
  const formatted = n.toLocaleString('pt-BR', {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  });
  return `${currency ? 'R$ ' : ''}${formatted} mi`;
}

export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '-';
  const mode = getNumberRoundingMode();
  if (mode === 'millions') return formatMillions(value, true);
  if (mode === 'abbreviated') return abbreviateNumber(value, true);
  if (mode === 'no-decimals') {
    return value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  }
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function formatNumber(value: number | null | undefined, decimals = 0): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '-';
  const mode = getNumberRoundingMode();
  if (mode === 'millions') return formatMillions(value, false);
  if (mode === 'abbreviated') return abbreviateNumber(value, false);
  const effDecimals = mode === 'no-decimals' ? 0 : decimals;
  return value.toLocaleString('pt-BR', {
    minimumFractionDigits: effDecimals,
    maximumFractionDigits: effDecimals,
  });
}

export function formatPercent(value: number | null | undefined, decimals = 2): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '-';
  // Percentual NÃO é afetado pelo modo de arredondamento global — usuário pediu para preservar.
  return `${value.toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}%`;
}

export function formatQuantity(value: number | null | undefined, suffix = ''): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '-';
  const mode = getNumberRoundingMode();
  if (mode === 'millions') {
    const n = formatMillions(value, false);
    return suffix ? `${n} ${suffix}` : n;
  }
  if (mode === 'abbreviated') {
    const n = abbreviateNumber(value, false);
    return suffix ? `${n} ${suffix}` : n;
  }
  const decimals = mode === 'no-decimals' ? 0 : (value % 1 === 0 ? 0 : 2);
  const n = value.toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  return suffix ? `${n} ${suffix}` : n;
}

export function formatDateBR(value: string | Date | null | undefined): string {
  if (!value) return '-';
  try {
    const d = typeof value === 'string' ? new Date(value) : value;
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleDateString('pt-BR');
  } catch {
    return String(value);
  }
}

export function abbreviateNumber(value: number | null | undefined, currency = false): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '-';
  const abs = Math.abs(value);
  const prefix = currency ? 'R$ ' : '';
  const sign = value < 0 ? '-' : '';
  if (abs >= 1_000_000_000) return `${sign}${prefix}${(abs / 1_000_000_000).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} bi`;
  if (abs >= 1_000_000) return `${sign}${prefix}${(abs / 1_000_000).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} mi`;
  if (abs >= 1_000) return `${sign}${prefix}${(abs / 1_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mil`;
  // valores pequenos: sem abreviação
  return currency
    ? value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 })
    : value.toLocaleString('pt-BR', { maximumFractionDigits: 0 });
}

export function percentVariation(current: number, previous: number): number {
  if (!previous) return current === 0 ? 0 : 100;
  return ((current - previous) / Math.abs(previous)) * 100;
}

export type KpiFormat = 'currency' | 'number' | 'percent' | 'quantity' | 'raw';

export function formatByKind(value: number | string | null | undefined, format: KpiFormat = 'raw'): string {
  if (value === null || value === undefined) return '-';
  if (typeof value === 'string') return value;
  switch (format) {
    case 'currency': return formatCurrency(value);
    case 'number':   return formatNumber(value);
    case 'percent':  return formatPercent(value);
    case 'quantity': return formatQuantity(value);
    default:         return String(value);
  }
}
