/**
 * Builds preview ctx for ApplyComponentDialog.
 * Uses live PageDataContext when available; otherwise generates deterministic mock
 * data derived from the page schema, so the user always sees something realistic.
 */
import type { BiPageDef } from './pageRegistry';
import type { PageDataValue } from './PageDataContext';

export type PreviewSource = 'live' | 'mock';

export interface PreviewCtx {
  kpis: Record<string, any>;
  series: Record<string, any>;
  rows: any[];
  filtros: Record<string, any>;
  source: PreviewSource;
}

function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function mockKpiValue(key: string, format?: string): number {
  const base = (hash(key) % 9000) + 1000;
  if (format === 'percent') return (hash(key) % 100);
  if (format === 'number') return base;
  return base * 100; // currency-ish
}

function mockSeries(key: string): { label: string; valor: number }[] {
  const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'];
  return meses.map((m, i) => ({
    label: m,
    valor: ((hash(key + i) % 900) + 100),
  }));
}

function mockRows(fields: string[]): any[] {
  return Array.from({ length: 5 }).map((_, i) => {
    const row: any = {};
    fields.forEach((f) => {
      row[f] = f.includes('valor') ? (hash(f + i) % 9000) + 1000 : `${f}_${i + 1}`;
    });
    return row;
  });
}

export function buildPreviewCtx(page: BiPageDef, liveCtx: PageDataValue | null): PreviewCtx {
  if (liveCtx && liveCtx.pageKey === page.key && (
    Object.keys(liveCtx.kpis ?? {}).length || Object.keys(liveCtx.series ?? {}).length || (liveCtx.rows?.length ?? 0) > 0
  )) {
    return {
      kpis: liveCtx.kpis,
      series: liveCtx.series,
      rows: liveCtx.rows,
      filtros: liveCtx.filtros,
      source: 'live',
    };
  }
  const kpis: Record<string, number> = {};
  (page.schema.kpis ?? []).forEach((k) => { kpis[k.key] = mockKpiValue(k.key, k.format); });
  const series: Record<string, any> = {};
  (page.schema.series ?? []).forEach((s) => { series[s.key] = mockSeries(s.key); });
  const rows = page.schema.rows ? mockRows(page.schema.rows.fields) : [];
  return { kpis, series, rows, filtros: {}, source: 'mock' };
}

export function describeMappedValue(
  source: 'kpis' | 'series' | 'rows',
  fieldKey: string,
  ctx: PreviewCtx,
  format?: string,
): string {
  if (!fieldKey) return '—';
  if (source === 'kpis') {
    const v = ctx.kpis?.[fieldKey];
    if (v == null) return '—';
    if (format === 'currency') return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
    if (format === 'percent') return `${Number(v).toFixed(1)}%`;
    return Number(v).toLocaleString('pt-BR');
  }
  if (source === 'series') {
    const arr = ctx.series?.[fieldKey];
    return Array.isArray(arr) ? `${arr.length} pontos` : '—';
  }
  if (source === 'rows') {
    return `${ctx.rows?.length ?? 0} registros`;
  }
  return '—';
}
