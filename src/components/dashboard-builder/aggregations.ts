import type { WidgetConfig } from './types';

const NULL_LABEL = '(sem valor)';

function getValue(row: any, key?: string): any {
  if (!key) return null;
  const v = row[key];
  if (v === null || v === undefined || v === '') return null;
  return v;
}

function bucketDate(iso: string, granularity: 'day' | 'month' | 'year'): string {
  const s = String(iso).slice(0, 10);
  if (granularity === 'year') return s.slice(0, 4);
  if (granularity === 'month') return s.slice(0, 7);
  return s;
}

export function aggregate(rows: any[], cfg: WidgetConfig): { name: string; value: number }[] {
  const dim = cfg.dimension;
  if (!dim) return [];

  const granularity = cfg.granularity;
  const groups = new Map<string, number[]>();

  for (const r of rows) {
    let key: string;
    const raw = getValue(r, dim);
    if (granularity && raw) key = bucketDate(raw, granularity);
    else key = raw == null ? NULL_LABEL : String(raw);

    const num = cfg.field ? Number(getValue(r, cfg.field) ?? 0) : 1;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(num);
  }

  const metric = cfg.metric ?? 'sum';
  const result: { name: string; value: number }[] = [];
  for (const [name, arr] of groups) {
    let value = 0;
    if (metric === 'count') value = arr.length;
    else if (metric === 'avg') value = arr.reduce((a, b) => a + b, 0) / (arr.length || 1);
    else if (metric === 'min') value = Math.min(...arr);
    else if (metric === 'max') value = Math.max(...arr);
    else value = arr.reduce((a, b) => a + b, 0); // sum
    result.push({ name, value });
  }

  result.sort((a, b) => b.value - a.value);
  if (granularity) result.sort((a, b) => a.name.localeCompare(b.name));
  if (cfg.limit && cfg.limit > 0) return result.slice(0, cfg.limit);
  return result;
}

export function singleMetric(rows: any[], cfg: WidgetConfig): number {
  const metric = cfg.metric ?? 'sum';
  if (metric === 'count') return rows.length;
  if (metric === 'distinct' && cfg.field) {
    return new Set(rows.map((r) => getValue(r, cfg.field!)).filter((v) => v != null)).size;
  }
  const vals = rows.map((r) => Number(getValue(r, cfg.field!) ?? 0));
  if (!vals.length) return 0;
  if (metric === 'avg') return vals.reduce((a, b) => a + b, 0) / vals.length;
  if (metric === 'min') return Math.min(...vals);
  if (metric === 'max') return Math.max(...vals);
  return vals.reduce((a, b) => a + b, 0);
}
