/**
 * Catálogo declarativo dos gráficos fixos do Painel de Compras.
 *
 * Serve para:
 *  - identificar cada gráfico fixo por uma chave estável
 *  - permitir "esconder" um gráfico fixo em favor de um widget da Biblioteca BI
 *    aplicado via UserWidgetsSlot (que já usa pageKey="painel-compras")
 *
 * A troca em si ocorre pela Biblioteca BI: o usuário aplica um widget na página,
 * e — se quiser — esconde o gráfico fixo correspondente pelo toggle de edição.
 */

export type ComprasWidgetKind = 'bar' | 'line' | 'donut' | 'pie';

export interface ComprasWidgetDef {
  /** Chave estável usada no localStorage de "esconder". */
  key: string;
  /** Rótulo humano exibido no toggle de edição. */
  title: string;
  kind: ComprasWidgetKind;
  /** Série exposta em PageDataContext (quando aplicável). */
  seriesKey?: string;
  /** IDs de componentes da Biblioteca BI recomendados como substituição. */
  libraryComponentIds: string[];
}

const LIB_CHART_IDS = [
  'bar-chart','horizontal-bar-chart','line-chart','area-chart',
  'donut-chart','pie-chart','ranking-chart','treemap-chart',
  'stacked-bar-chart',
];

export const COMPRAS_WIDGETS: Record<string, ComprasWidgetDef> = {
  'top_fornecedores':   { key: 'top_fornecedores',   title: 'Top Fornecedores',           kind: 'bar',   seriesKey: 'top_fornecedores',   libraryComponentIds: LIB_CHART_IDS },
  'situacoes':          { key: 'situacoes',          title: 'Situação das OCs',           kind: 'donut', seriesKey: 'situacoes',          libraryComponentIds: LIB_CHART_IDS },
  'tipos_item':         { key: 'tipos_item',         title: 'Produtos × Serviços',        kind: 'donut', seriesKey: 'tipos_item',         libraryComponentIds: LIB_CHART_IDS },
  'entregas_por_mes':   { key: 'entregas_por_mes',   title: 'Entregas por Mês',           kind: 'bar',   seriesKey: 'entregas_por_mes',   libraryComponentIds: LIB_CHART_IDS },
  'top_familias':       { key: 'top_familias',       title: 'Top Famílias',               kind: 'bar',   seriesKey: 'top_familias',       libraryComponentIds: LIB_CHART_IDS },
  'top_origens':        { key: 'top_origens',        title: 'Top Origens',                kind: 'bar',   seriesKey: 'top_origens',        libraryComponentIds: LIB_CHART_IDS },
  'compras_por_mes':    { key: 'compras_por_mes',    title: 'Compras por Mês',            kind: 'line',  seriesKey: 'compras_por_mes',    libraryComponentIds: LIB_CHART_IDS },
  'por_tipo_despesa':   { key: 'por_tipo_despesa',   title: 'Compras por Tipo de Despesa', kind: 'donut', seriesKey: 'tipos_despesa',     libraryComponentIds: LIB_CHART_IDS },
  'por_centro_custo':   { key: 'por_centro_custo',   title: 'Top Centros de Custo',       kind: 'bar',   seriesKey: 'por_centro_custo',   libraryComponentIds: LIB_CHART_IDS },
  'por_projeto':        { key: 'por_projeto',        title: 'Top Projetos',               kind: 'bar',   seriesKey: 'por_projeto',        libraryComponentIds: LIB_CHART_IDS },
};

const STORAGE_KEY = 'painel-compras.hiddenCharts';

export function loadHiddenCharts(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
  } catch {
    return {};
  }
}

export function saveHiddenCharts(map: Record<string, boolean>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch { /* ignore */ }
}
