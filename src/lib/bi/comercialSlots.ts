/**
 * Catálogo de slots do BI Comercial — descreve cada bloco trocável.
 *
 * dataKind:
 *  - "serie-mensal"  → dados multi-key (label, faturamento, meta)
 *  - "serie"         → genérico {label, valor}
 *  - "ranking"       → {label, valor} (ordenado desc)
 *
 * builtinVariants → alternativas oferecidas no menu rápido do BiSlot.
 * libraryComponentIds → ids do componentRegistry compatíveis (filtro do diálogo).
 */
export type SlotDataKind = 'serie-mensal' | 'serie' | 'ranking';

export interface SlotDef {
  slotKey: string;
  title: string;
  dataKind: SlotDataKind;
  defaultVariant: string;
  /** série padrão exposta no PageDataContext que o slot usa */
  seriesKey: string;
  builtinVariants: { value: string; label: string }[];
  libraryComponentIds: string[];
}

const VARIANTS_SERIE: SlotDef['builtinVariants'] = [
  { value: 'bar', label: 'Barras' },
  { value: 'horizontal-bar', label: 'Barras horizontais' },
  { value: 'line', label: 'Linha' },
  { value: 'area', label: 'Área' },
  { value: 'donut', label: 'Rosca' },
  { value: 'pie', label: 'Pizza' },
  { value: 'ranking', label: 'Ranking' },
  { value: 'treemap', label: 'Treemap' },
  { value: 'table', label: 'Tabela' },
];

const VARIANTS_MENSAL: SlotDef['builtinVariants'] = [
  { value: 'combo', label: 'Combo (barra + linha)' },
  { value: 'bar', label: 'Barras (Faturamento)' },
  { value: 'line', label: 'Linha (Faturamento)' },
  { value: 'area', label: 'Área (Faturamento)' },
  { value: 'table', label: 'Tabela' },
];

const LIBRARY_CHART_IDS = [
  'bar-chart', 'horizontal-bar-chart', 'line-chart', 'area-chart',
  'donut-chart', 'pie-chart', 'ranking-chart', 'funnel-chart',
  'treemap-chart', 'radar-chart', 'sparkline', 'combo-chart',
  'stacked-bar-chart', 'progress-chart', 'waterfall-chart',
  'data-table', 'ranking-table', 'summary-table',
];

export const COMERCIAL_SLOTS: Record<string, SlotDef> = {
  mensal: {
    slotKey: 'mensal',
    title: 'Faturamento mensal x Meta',
    dataKind: 'serie-mensal',
    defaultVariant: 'combo',
    seriesKey: 'mensal',
    builtinVariants: VARIANTS_MENSAL,
    libraryComponentIds: LIBRARY_CHART_IDS,
  },
  mix: {
    slotKey: 'mix',
    title: 'Mix acumulado',
    dataKind: 'serie',
    defaultVariant: 'donut',
    seriesKey: 'mix',
    builtinVariants: VARIANTS_SERIE,
    libraryComponentIds: LIBRARY_CHART_IDS,
  },
  estados: {
    slotKey: 'estados',
    title: 'Top estados',
    dataKind: 'ranking',
    defaultVariant: 'horizontal-bar',
    seriesKey: 'estados',
    builtinVariants: VARIANTS_SERIE,
    libraryComponentIds: LIBRARY_CHART_IDS,
  },
  revendas: {
    slotKey: 'revendas',
    title: 'Ranking de revendas',
    dataKind: 'ranking',
    defaultVariant: 'ranking',
    seriesKey: 'revendas',
    builtinVariants: VARIANTS_SERIE,
    libraryComponentIds: LIBRARY_CHART_IDS,
  },
  obras: {
    slotKey: 'obras',
    title: 'Faturamento por obra',
    dataKind: 'ranking',
    defaultVariant: 'treemap',
    seriesKey: 'obras',
    builtinVariants: VARIANTS_SERIE,
    libraryComponentIds: LIBRARY_CHART_IDS,
  },
};
