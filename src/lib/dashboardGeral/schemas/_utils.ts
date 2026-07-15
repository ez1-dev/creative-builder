/**
 * Utilitários Zod para validação/normalização defensiva dos payloads da API
 * consumidos pelo Dashboard Geral. Focado em tolerância: campo ausente,
 * string numérica ("1.234,56"), null/undefined nunca quebra a aba.
 */
import { z } from 'zod';

const warned = new Set<string>();

function coerceNumber(v: unknown): number {
  if (v == null || v === '') return 0;
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  if (typeof v === 'boolean') return v ? 1 : 0;
  if (typeof v === 'string') {
    const s = v.trim().replace(/\s+/g, '');
    // "1.234,56" → "1234.56" | "1,234.56" → "1234.56"
    let n: number;
    if (/,\d{1,2}$/.test(s) && s.includes('.')) n = Number(s.replace(/\./g, '').replace(',', '.'));
    else if (/,\d{1,2}$/.test(s)) n = Number(s.replace(',', '.'));
    else n = Number(s.replace(/,/g, ''));
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

/** Aceita number | string | null | undefined → number seguro. */
export const zNum = z.preprocess(coerceNumber, z.number());

/** String tolerante com trim + limite opcional. */
export const zStr = (maxLen = 200) =>
  z.preprocess((v) => {
    if (v == null) return '';
    const s = String(v).trim();
    return s.length > maxLen ? s.slice(0, maxLen) : s;
  }, z.string());

/** Array defensivo: null / objeto vira []. */
export const zArr = <T extends z.ZodTypeAny>(item: T) =>
  z.preprocess((v) => (Array.isArray(v) ? v : []), z.array(item));

/**
 * safeParse com fallback e log único por módulo/path. Nunca lança.
 * Retorna também um flag `partial` quando o parse falhou e caiu no fallback.
 */
export function parseOrEmpty<S extends z.ZodTypeAny>(
  schema: S,
  data: unknown,
  fallback: z.infer<S>,
  moduleName: string,
): { data: z.infer<S>; partial: boolean } {
  if (data == null) return { data: fallback, partial: false };
  const r = schema.safeParse(data);
  if (r.success) return { data: r.data as z.infer<S>, partial: false };
  const firstIssue = r.error.issues[0];
  const key = `${moduleName}:${firstIssue?.path?.join('.') ?? '?'}:${firstIssue?.code ?? ''}`;
  if (!warned.has(key)) {
    warned.add(key);
    // eslint-disable-next-line no-console
    console.warn(
      `[dashboardGeral/${moduleName}] payload inválido em "${firstIssue?.path?.join('.') || '(root)'}": ${firstIssue?.message ?? 'parse failed'} — usando fallback.`,
    );
  }
  return { data: fallback, partial: true };
}
