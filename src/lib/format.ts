export function formatNumber(value: number | null | undefined, decimals = 2): string {
  if (value === null || value === undefined) return '-';
  return value.toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined) return '-';
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function formatCompactCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '-';
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  if (abs >= 1_000_000_000) return `${sign}R$ ${(abs / 1_000_000_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}B`;
  if (abs >= 1_000_000) return `${sign}R$ ${(abs / 1_000_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}M`;
  if (abs >= 1_000) return `${sign}R$ ${(abs / 1_000).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}k`;
  return `${sign}R$ ${abs.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`;
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

/** Formata data ISO/UTC em pt-BR sem depender do timezone do browser quando o valor é `YYYY-MM-DD`. */
export function formatDateBR(value: string | null | undefined): string {
  if (!value) return '-';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  try { return new Date(value).toLocaleDateString('pt-BR'); } catch { return value; }
}

/** Formata data+hora ISO em pt-BR. */
export function formatDateTimeBR(value: string | null | undefined): string {
  if (!value) return '-';
  try { return new Date(value).toLocaleString('pt-BR'); } catch { return value; }
}

/** Formata número inteiro/decimal em pt-BR. */
export function formatNumberBR(value: number | null | undefined, decimals = 0): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '-';
  return Number(value).toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}


export function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined) return '-';
  return `${formatNumber(value, 1)}%`;
}

/** Uppercase respeitando acentuação PT-BR. */
export function toUpperPt(value: string | null | undefined): string {
  if (value == null) return '';
  return String(value).toLocaleUpperCase('pt-BR');
}

const LEGAL_SUFFIX_RE =
  /\s*[-–—]?\s*\b(LTDA\.?|S\/?\.?A\.?|SA|EIRELI|ME|EPP|CIA|COMPANHIA|INDUSTRIA|IND[ÚU]STRIA|COMERCIO|COM[ÉE]RCIO|IMPORTACAO|IMPORTA[ÇC][ÃA]O|EXPORTACAO|EXPORTA[ÇC][ÃA]O)\b\.?\s*$/i;

/** Remove sufixos jurídicos redundantes no final do nome. */
export function stripLegalSuffixes(value: string): string {
  let s = String(value ?? '');
  // remove até 3 sufixos empilhados (ex.: "... COMERCIO LTDA")
  for (let i = 0; i < 3; i++) {
    const next = s.replace(LEGAL_SUFFIX_RE, '');
    if (next === s) break;
    s = next;
  }
  return s.replace(/\s{2,}/g, ' ').trim();
}

function truncate(s: string, max: number): string {
  return s.length > max ? `${s.slice(0, Math.max(1, max - 1))}…` : s;
}

/** Label de fornecedor em CAIXA ALTA e abreviado para uso em eixos/barras de gráficos. */
export function formatFornecedorLabel(value: string | null | undefined, max = 28): string {
  const upper = toUpperPt(value);
  if (!upper) return '';
  const stripped = stripLegalSuffixes(upper) || upper;
  return truncate(stripped, max);
}

/** Label de projeto em CAIXA ALTA e abreviado. Aceita "123 - NOME" ou apenas nome/código. */
export function formatProjetoLabel(value: string | number | null | undefined, max = 24): string {
  const upper = toUpperPt(value == null ? '' : String(value));
  if (!upper) return '';
  return truncate(upper.replace(/\s{2,}/g, ' ').trim(), max);
}
