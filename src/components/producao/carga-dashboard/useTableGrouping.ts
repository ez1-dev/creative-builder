import { useMemo } from 'react';

export type GroupField = 'unidade_negocio' | 'tipo_recurso' | 'codccu' | 'codcre';

export const GROUP_FIELD_LABELS: Record<GroupField, string> = {
  unidade_negocio: 'Unidade',
  tipo_recurso: 'Tipo',
  codccu: 'CCusto',
  codcre: 'Recurso',
};

export interface GroupNode<T> {
  key: string;
  field: GroupField;
  value: string;
  label: string; // valor exibido: "<código> — <descrição>" quando aplicável
  level: number;
  count: number;
  totals: Record<string, number>;
  children: GroupNode<T>[];
  rows: T[]; // só preenchido no último nível
}

const DESCRIPTION_KEY: Partial<Record<GroupField, string>> = {
  codcre: 'descre',
  // codccu não tem descrição no backend; unidade_negocio/tipo_recurso já são rótulos.
};


function emptyTotals(keys: string[]): Record<string, number> {
  const o: Record<string, number> = {};
  for (const k of keys) o[k] = 0;
  return o;
}

function buildTree<T extends Record<string, any>>(
  rows: T[],
  fields: GroupField[],
  numericKeys: string[],
  level = 0,
  parentKey = '',
): GroupNode<T>[] {
  if (level >= fields.length) return [];
  const field = fields[level];
  const buckets = new Map<string, T[]>();
  for (const r of rows) {
    const v = (r[field] ?? '—').toString() || '—';
    const arr = buckets.get(v);
    if (arr) arr.push(r);
    else buckets.set(v, [r]);
  }
  const out: GroupNode<T>[] = [];
  for (const [value, bucketRows] of buckets) {
    const key = parentKey ? `${parentKey}|${value}` : value;
    const totals = emptyTotals(numericKeys);
    for (const r of bucketRows) {
      for (const k of numericKeys) totals[k] += Number(r[k] ?? 0);
    }
    const isLeaf = level === fields.length - 1;
    const descKey = DESCRIPTION_KEY[field];
    let label = value;
    if (descKey) {
      const desc = String(bucketRows[0]?.[descKey] ?? '').trim();
      if (desc && desc !== value) label = `${value} — ${desc}`;
    }
    out.push({
      key,
      field,
      value,
      label,
      level,
      count: bucketRows.length,
      totals,
      children: isLeaf ? [] : buildTree(bucketRows, fields, numericKeys, level + 1, key),
      rows: isLeaf ? bucketRows : [],
    });

  }
  // ordenar por carga_prevista_horas desc se existir, senão pelo primeiro numeric
  const sortKey = numericKeys.find((k) => k.includes('horas')) ?? numericKeys[0];
  if (sortKey) out.sort((a, b) => (b.totals[sortKey] ?? 0) - (a.totals[sortKey] ?? 0));
  return out;
}

export function useTableGrouping<T extends Record<string, any>>(
  rows: T[],
  groupFields: GroupField[],
  numericKeys: string[],
) {
  return useMemo(() => {
    if (groupFields.length === 0) return [];
    return buildTree(rows, groupFields, numericKeys);
  }, [rows, groupFields.join('|'), numericKeys.join('|')]);
}

export function collectAllGroupKeys<T>(nodes: GroupNode<T>[]): string[] {
  const out: string[] = [];
  const walk = (n: GroupNode<T>) => {
    out.push(n.key);
    n.children.forEach(walk);
  };
  nodes.forEach(walk);
  return out;
}
