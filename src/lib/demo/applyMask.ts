/**
 * Aplica mascaramento recursivo em objetos/arrays de dados.
 * Zero-custo quando o modo apresentação está desligado.
 */
import { MASKING_SCHEMAS, type FieldSpec, type SchemaKey } from './maskingSchema';
import type { MaskDocKind, MaskNameKind } from '@/contexts/DemoModeContext';

export interface MaskFns {
  active: boolean;
  presentationActive: boolean;
  maskName: (kind: MaskNameKind, v: string | null | undefined) => string;
  maskDoc: (kind: MaskDocKind, v: string | null | undefined) => string;
  maskCurrency: (v: number | null | undefined) => number | null;
  applyText: (v: string | null | undefined) => string;
}

function transformRow(row: any, spec: FieldSpec, fns: MaskFns): any {
  if (row == null || typeof row !== 'object') return row;
  const out: any = Array.isArray(row) ? [...row] : { ...row };

  if (spec.names) {
    for (const [key, kind] of Object.entries(spec.names)) {
      if (out[key] != null && typeof out[key] === 'string' && kind) {
        out[key] = fns.maskName(kind as MaskNameKind, out[key]);
      }
    }
  }
  if (spec.docs) {
    for (const [key, kind] of Object.entries(spec.docs)) {
      if (out[key] != null && typeof out[key] === 'string' && kind) {
        out[key] = fns.maskDoc(kind as MaskDocKind, out[key]);
      }
    }
  }
  if (spec.money) {
    for (const key of spec.money) {
      if (typeof out[key] === 'number') {
        const v = fns.maskCurrency(out[key]);
        out[key] = v == null || Number.isNaN(v) ? out[key] : v;
      }
    }
  }
  return out;
}

/**
 * Aplica o schema em um dado (linha, array de linhas, ou objeto agregado).
 * Retorna a mesma referência se o modo estiver desligado.
 */
export function applyMask<T = any>(data: T, schemaKey: SchemaKey, fns: MaskFns): T {
  if (!fns.active && !fns.presentationActive) return data;
  const spec = MASKING_SCHEMAS[schemaKey];
  if (!spec) return data;

  if (Array.isArray(data)) {
    return (data as any[]).map((r) => transformRow(r, spec, fns)) as any;
  }
  if (data && typeof data === 'object') {
    return transformRow(data, spec, fns) as any;
  }
  return data;
}
