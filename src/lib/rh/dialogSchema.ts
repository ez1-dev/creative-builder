/**
 * Helpers compartilhados pelos diálogos RH (`AddRhBiWidgetDialog`,
 * `ConfigureRhWidgetDialog`) e pelo `RhDashboardGrid` para montar
 * `kpis`/`series` a partir de dados **reais** disponíveis no
 * `PageDataContext`, usando o schema declarado apenas como fallback e
 * como fonte de rótulos.
 *
 * Motivação: os dropdowns não podem oferecer chaves que não têm dados —
 * caso contrário o preview e o widget salvos ficam vazios.
 */
import type { PageDataSchema } from '@/lib/bi/pageRegistry';
import type { ComponentDef } from '@/lib/bi/componentRegistry';

export interface Option { key: string; label: string }

const toLabel = (key: string) => key
  .replace(/[_-]+/g, ' ')
  .replace(/\b\w/g, (c) => c.toUpperCase());

const labelFromSchema = (
  key: string,
  schema: readonly Option[] | undefined,
) => schema?.find((s) => s.key === key)?.label ?? toLabel(key);

export function buildKpisOpts(
  ctxKpis: Record<string, any> | null | undefined,
  schemaKpis: readonly (Option & { format?: string })[] | undefined,
): Option[] {
  const realKeys = Object.keys(ctxKpis ?? {});
  if (realKeys.length) {
    return realKeys.map((key) => ({ key, label: labelFromSchema(key, schemaKpis) }));
  }
  return (schemaKpis ?? []).map(({ key, label }) => ({ key, label }));
}

export function buildSeriesOpts(
  ctxSeries: Record<string, any> | null | undefined,
  ctxSeriesCatalog: readonly Option[] | null | undefined,
  schemaSeries: readonly Option[] | undefined,
): Option[] {
  const out: Option[] = [];
  const seen = new Set<string>();
  const push = (o: Option) => {
    if (!o?.key || seen.has(o.key)) return;
    seen.add(o.key);
    out.push(o);
  };
  (ctxSeriesCatalog ?? []).forEach((o) => push({ key: o.key, label: o.label || labelFromSchema(o.key, schemaSeries) }));
  Object.keys(ctxSeries ?? {}).forEach((key) => push({ key, label: labelFromSchema(key, schemaSeries) }));
  if (!out.length) (schemaSeries ?? []).forEach(push);
  return out;
}

export function buildEffectiveSchema(
  page: { schema?: PageDataSchema } | undefined,
  ctx: {
    kpis?: Record<string, any> | null;
    series?: Record<string, any> | null;
    seriesCatalog?: readonly Option[] | null;
    rows?: any[] | null;
  } | null | undefined,
): PageDataSchema {
  const schema = page?.schema ?? ({} as PageDataSchema);
  const kpis = buildKpisOpts(ctx?.kpis, schema.kpis);
  const series = buildSeriesOpts(ctx?.series, ctx?.seriesCatalog, schema.series);
  const rows = schema.rows ?? (Array.isArray(ctx?.rows) && ctx!.rows!.length
    ? { key: 'dados', label: 'Dados da página', fields: Object.keys(ctx!.rows![0] ?? {}) }
    : undefined);
  return { ...schema, kpis, series, rows };
}

/**
 * Verifica se todo mapping obrigatório aponta para chaves que existem no
 * schema efetivo (com dados). Retorna `true` se algum input obrigatório
 * estiver "órfão" e precisa ser remapeado.
 */
export function mappingHasOrphans(
  def: ComponentDef,
  mapping: Record<string, string> | null | undefined,
  effectiveSchema: PageDataSchema,
): boolean {
  const kpiKeys = new Set((effectiveSchema.kpis ?? []).map((o) => o.key));
  const seriesKeys = new Set((effectiveSchema.series ?? []).map((o) => o.key));
  return def.inputs.some((inp) => {
    const val = mapping?.[inp.key];
    if (!val) return !!inp.required;
    if (inp.source === 'kpis' && !kpiKeys.has(val)) return true;
    if (inp.source === 'series' && !seriesKeys.has(val)) return true;
    return false;
  });
}
