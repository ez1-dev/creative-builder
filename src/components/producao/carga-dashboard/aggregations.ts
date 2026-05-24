import type { CargaCentroRow } from '@/lib/producao/cargaApi';

export interface RecursoAgg {
  codcre: string;
  descre: string;
  codccu: string;
  unidade_negocio: string;
  tipo_recurso: string;
  qtd_ops: number;
  qtd_operacoes: number;
  carga_prevista_min: number;
  carga_prevista_horas: number;
}

export function aggByRecurso(rows: CargaCentroRow[]): RecursoAgg[] {
  const map = new Map<string, RecursoAgg>();
  for (const r of rows) {
    const key = `${r.codcre}|${r.codccu}`;
    const cur = map.get(key);
    if (cur) {
      cur.qtd_operacoes += 1;
      cur.qtd_ops += r.qtd_ops ?? 0;
      cur.carga_prevista_min += r.carga_prevista_min ?? 0;
      cur.carga_prevista_horas += r.carga_prevista_horas ?? 0;
    } else {
      map.set(key, {
        codcre: r.codcre,
        descre: r.descre,
        codccu: r.codccu,
        unidade_negocio: r.unidade_negocio,
        tipo_recurso: r.tipo_recurso,
        qtd_operacoes: 1,
        qtd_ops: r.qtd_ops ?? 0,
        carga_prevista_min: r.carga_prevista_min ?? 0,
        carga_prevista_horas: r.carga_prevista_horas ?? 0,
      });
    }
  }
  return Array.from(map.values()).sort((a, b) => b.carga_prevista_horas - a.carga_prevista_horas);
}

export function aggByKey<T extends string>(rows: CargaCentroRow[], key: keyof CargaCentroRow) {
  const map = new Map<T, { name: T; carga_min: number; carga_horas: number; qtd_ops: number }>();
  for (const r of rows) {
    const k = (r[key] || 'N/D') as T;
    const cur = map.get(k);
    if (cur) {
      cur.carga_min += r.carga_prevista_min ?? 0;
      cur.carga_horas += r.carga_prevista_horas ?? 0;
      cur.qtd_ops += r.qtd_ops ?? 0;
    } else {
      map.set(k, {
        name: k,
        carga_min: r.carga_prevista_min ?? 0,
        carga_horas: r.carga_prevista_horas ?? 0,
        qtd_ops: r.qtd_ops ?? 0,
      });
    }
  }
  return Array.from(map.values()).sort((a, b) => b.carga_min - a.carga_min);
}

export const fmtNum = (n?: number) => (n ?? 0).toLocaleString('pt-BR', { maximumFractionDigits: 0 });
export const fmtDec = (n?: number) => (n ?? 0).toLocaleString('pt-BR', { maximumFractionDigits: 1 });
