/**
 * Catálogo de widgets do BI Comercial.
 *
 * Cada entrada define:
 *  - type: chave do widget (idem dashboard_widgets.type)
 *  - title: rótulo padrão
 *  - kind: 'kpi' | 'serie-mensal' | 'serie' | 'ranking' | 'map' | 'table'
 *  - variants: variantes built-in (quando aplicável)
 *  - libraryComponentIds: ids do COMPONENT_REGISTRY compatíveis para substituição via dialog
 *
 * O render efetivo é resolvido no ComercialPage através de um switch (data está
 * acoplada à página). Este catálogo apenas declara o que é trocável.
 */

export type WidgetKind = 'kpi' | 'serie-mensal' | 'serie' | 'ranking' | 'map' | 'table';

export interface ComercialWidgetDef {
  type: string;
  title: string;
  kind: WidgetKind;
  /** Chave do KPI na resposta de fetchComercialKpis (para widgets KPI). */
  kpiKey?: string;
  /** Variantes built-in disponíveis no Configure. */
  variants: { value: string; label: string }[];
  /** Componente padrão do COMPONENT_REGISTRY usado quando o usuário troca via "Biblioteca". */
  libraryComponentIds: string[];
}

const KPI_VARIANTS = [
  { value: 'number', label: 'Número' },
  { value: 'variation', label: 'Número + variação' },
  { value: 'sparkline', label: 'Número + sparkline' },
  { value: 'target', label: 'Número vs Meta' },
];

const SERIE_MENSAL_VARIANTS = [
  { value: 'combo', label: 'Combo (barra + linha)' },
  { value: 'bar', label: 'Barras' },
  { value: 'line', label: 'Linha' },
  { value: 'area', label: 'Área' },
  { value: 'table', label: 'Tabela' },
];

const SERIE_VARIANTS = [
  { value: 'donut', label: 'Rosca' },
  { value: 'pie', label: 'Pizza' },
  { value: 'bar', label: 'Barras' },
  { value: 'horizontal-bar', label: 'Barras horizontais' },
  { value: 'ranking', label: 'Ranking' },
  { value: 'treemap', label: 'Treemap' },
  { value: 'table', label: 'Tabela' },
];

const RANKING_VARIANTS = [
  { value: 'ranking', label: 'Ranking' },
  { value: 'horizontal-bar', label: 'Barras horizontais' },
  { value: 'treemap', label: 'Treemap' },
  { value: 'bar', label: 'Barras' },
  { value: 'table', label: 'Tabela' },
];

const MAP_VARIANTS = [
  { value: 'map', label: 'Mapa do Brasil' },
  { value: 'horizontal-bar', label: 'Barras horizontais' },
  { value: 'ranking', label: 'Ranking' },
  { value: 'table', label: 'Tabela' },
];

const LIB_CHART_IDS = [
  'bar-chart','horizontal-bar-chart','line-chart','area-chart',
  'donut-chart','pie-chart','ranking-chart','funnel-chart',
  'treemap-chart','radar-chart','sparkline','combo-chart',
  'stacked-bar-chart','progress-chart',
];

const LIB_KPI_IDS = ['kpi-card','kpi-sparkline','kpi-target','kpi-variation','kpi-comparison','kpi-status'];

const LIB_TABLE_IDS = ['data-table'];

export const COMERCIAL_WIDGETS: Record<string, ComercialWidgetDef> = {
  // ===== KPIs =====
  'kpi-faturamento': { type:'kpi-faturamento', title:'Faturamento',  kind:'kpi', kpiKey:'faturamento',     variants:KPI_VARIANTS, libraryComponentIds:LIB_KPI_IDS },
  'kpi-liquido':     { type:'kpi-liquido',     title:'Líquido',      kind:'kpi', kpiKey:'fat_liquido',     variants:KPI_VARIANTS, libraryComponentIds:LIB_KPI_IDS },
  'kpi-impostos':    { type:'kpi-impostos',    title:'Impostos',     kind:'kpi', kpiKey:'impostos',        variants:KPI_VARIANTS, libraryComponentIds:LIB_KPI_IDS },
  'kpi-devolucao':   { type:'kpi-devolucao',   title:'Devolução',    kind:'kpi', kpiKey:'devolucao',       variants:KPI_VARIANTS, libraryComponentIds:LIB_KPI_IDS },
  'kpi-vendas':      { type:'kpi-vendas',      title:'Nº Vendas',    kind:'kpi', kpiKey:'numero_vendas',   variants:KPI_VARIANTS, libraryComponentIds:LIB_KPI_IDS },
  'kpi-clientes':    { type:'kpi-clientes',    title:'Nº Clientes',  kind:'kpi', kpiKey:'numero_clientes', variants:KPI_VARIANTS, libraryComponentIds:LIB_KPI_IDS },
  'kpi-estados':     { type:'kpi-estados',     title:'Nº Estados',   kind:'kpi', kpiKey:'numero_estados',  variants:KPI_VARIANTS, libraryComponentIds:LIB_KPI_IDS },
  'kpi-ticket':      { type:'kpi-ticket',      title:'Ticket Médio', kind:'kpi', kpiKey:'ticket_medio',    variants:KPI_VARIANTS, libraryComponentIds:LIB_KPI_IDS },
  'kpi-preco-medio': { type:'kpi-preco-medio', title:'Preço Médio',  kind:'kpi', kpiKey:'preco_medio',     variants:KPI_VARIANTS, libraryComponentIds:LIB_KPI_IDS },
  'kpi-quantidade':  { type:'kpi-quantidade',  title:'Quantidade',   kind:'kpi', kpiKey:'quantidade',      variants:KPI_VARIANTS, libraryComponentIds:LIB_KPI_IDS },
  'kpi-meta':        { type:'kpi-meta',        title:'Meta',         kind:'kpi', kpiKey:'meta',            variants:KPI_VARIANTS, libraryComponentIds:LIB_KPI_IDS },
  'kpi-diferenca':   { type:'kpi-diferenca',   title:'Diferença vs Meta', kind:'kpi', kpiKey:'diferenca', variants:KPI_VARIANTS, libraryComponentIds:LIB_KPI_IDS },

  // ===== Compostos / visuais fixos =====
  'resumo-faturamento': { type:'resumo-faturamento', title:'Resumo Faturamento', kind:'kpi', variants:[], libraryComponentIds:[] },
  'gauge-atingimento':  { type:'gauge-atingimento',  title:'% Atingimento',      kind:'kpi', variants:[], libraryComponentIds:[] },


  // ===== Séries =====
  'serie-mensal':    { type:'serie-mensal', title:'Faturamento mensal x Meta', kind:'serie-mensal', variants:SERIE_MENSAL_VARIANTS, libraryComponentIds:LIB_CHART_IDS },
  'mix':             { type:'mix',          title:'Mix acumulado',             kind:'serie',        variants:SERIE_VARIANTS,        libraryComponentIds:LIB_CHART_IDS },
  'estados':         { type:'estados',      title:'Top estados',               kind:'map',          variants:MAP_VARIANTS,          libraryComponentIds:LIB_CHART_IDS },
  'revendas':        { type:'revendas',     title:'Ranking de revendas',       kind:'ranking',      variants:RANKING_VARIANTS,      libraryComponentIds:LIB_CHART_IDS },
  'obras':           { type:'obras',        title:'Faturamento por obra',      kind:'ranking',      variants:RANKING_VARIANTS,      libraryComponentIds:LIB_CHART_IDS },

  // ===== Tabela =====
  'table-mensal':    { type:'table-mensal', title:'Tabela mensal', kind:'table', variants:[{value:'table',label:'Tabela'}], libraryComponentIds:LIB_TABLE_IDS },
};

export const KPI_CATALOG = Object.values(COMERCIAL_WIDGETS).filter((w) => w.kind === 'kpi');
export const NON_KPI_CATALOG = Object.values(COMERCIAL_WIDGETS).filter((w) => w.kind !== 'kpi');
