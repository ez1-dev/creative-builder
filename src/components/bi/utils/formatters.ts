// BI lib — formatadores padronizados (BR-pt). Reaproveita src/lib/format.ts onde aplicável.
export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '-';
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function formatNumber(value: number | null | undefined, decimals = 0): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '-';
  return value.toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export function formatPercent(value: number | null | undefined, decimals = 2): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '-';
  return `${value.toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}%`;
}

export function formatQuantity(value: number | null | undefined, suffix = ''): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '-';
  const n = formatNumber(value, value % 1 === 0 ? 0 : 2);
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
  return `${prefix}${formatNumber(value)}`;
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
