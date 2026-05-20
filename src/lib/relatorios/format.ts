import { format as fmtDate, parseISO } from 'date-fns';
import type { ColunaTipo } from './types';

const NF = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 4 });
const NF_BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const NF_PCT = new Intl.NumberFormat('pt-BR', { style: 'percent', maximumFractionDigits: 2 });

export function toNumberSafe(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  const n = Number(String(v).replace(/\./g, '').replace(',', '.'));
  if (Number.isFinite(n)) return n;
  const n2 = Number(v);
  return Number.isFinite(n2) ? n2 : null;
}

function parseDateSafe(v: unknown): Date | null {
  if (!v) return null;
  if (v instanceof Date) return v;
  try {
    const d = typeof v === 'string' ? parseISO(v) : new Date(v as any);
    return Number.isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}

export function formatCellValue(
  value: unknown,
  tipo: ColunaTipo | string | null | undefined,
): string {
  if (value === null || value === undefined || value === '') return '—';
  switch (tipo) {
    case 'numero': {
      const n = toNumberSafe(value);
      return n === null ? String(value) : NF.format(n);
    }
    case 'moeda': {
      const n = toNumberSafe(value);
      return n === null ? String(value) : NF_BRL.format(n);
    }
    case 'percentual': {
      const n = toNumberSafe(value);
      if (n === null) return String(value);
      // Heurística: se valor entre -1 e 1, trata como fração; senão divide por 100.
      const frac = Math.abs(n) <= 1 ? n : n / 100;
      return NF_PCT.format(frac);
    }
    case 'data': {
      const d = parseDateSafe(value);
      return d ? fmtDate(d, 'dd/MM/yyyy') : String(value);
    }
    case 'data_hora':
    case 'datahora': {
      const d = parseDateSafe(value);
      return d ? fmtDate(d, 'dd/MM/yyyy HH:mm') : String(value);
    }
    case 'booleano':
      return value === true || value === 'true' || value === 1 || value === '1' ? 'Sim' : 'Não';
    case 'texto':
    default:
      return String(value);
  }
}

export function alignClass(a: 'esquerda' | 'centro' | 'direita' | null | undefined): string {
  if (a === 'centro') return 'text-center';
  if (a === 'direita') return 'text-right';
  return 'text-left';
}

export function inferTipoFromColuna(nome: string, sample?: unknown): ColunaTipo {
  const n = nome.toLowerCase();
  if (/(valor|vlr|preco|custo|total|saldo)/.test(n)) return 'moeda';
  if (/(perc|pct|percentual)/.test(n)) return 'percentual';
  if (/(data_hora|datahora|timestamp|emissao_hora)/.test(n)) return 'data_hora';
  if (/(data|dt_|^data)/.test(n)) return 'data';
  if (/(qtd|quantidade|num|numero|cod|codigo|seq|id_)/.test(n)) return 'numero';
  if (typeof sample === 'number') return 'numero';
  if (typeof sample === 'boolean') return 'booleano';
  return 'texto';
}

export function formatTempoMs(ms: number | null | undefined): string {
  if (ms === null || ms === undefined) return '—';
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}
