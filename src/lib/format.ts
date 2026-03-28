export function formatNumber(value: number | null | undefined, decimals = 2): string {
  if (value === null || value === undefined) return '-';
  return value.toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined) return '-';
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return '-';
  try {
    const date = new Date(value);
    return date.toLocaleDateString('pt-BR');
  } catch {
    return value;
  }
}

export function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined) return '-';
  return `${formatNumber(value, 1)}%`;
}
