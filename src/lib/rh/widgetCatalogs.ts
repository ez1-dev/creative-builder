/**
 * Catálogo de widgets dos módulos RH — declarativo, per-módulo.
 * Cada entrada define o tipo (chave estável no dashboard_widgets), o título
 * padrão e as variantes/componentes de biblioteca compatíveis para futura
 * substituição via ConfigureBiWidgetDialog.
 */
import type { RhWidget } from '@/hooks/useRhModuleLayout';

export type RhWidgetKind = 'kpi' | 'chart' | 'table' | 'compound';

export interface RhWidgetDef {
  type: string;
  title: string;
  kind: RhWidgetKind;
  variants?: { value: string; label: string }[];
  libraryComponentIds?: string[];
}

const LIB_KPI_IDS = ['kpi-card', 'kpi-sparkline', 'kpi-target', 'kpi-variation', 'kpi-comparison', 'kpi-status'];
const LIB_CHART_IDS = [
  'bar-chart', 'horizontal-bar-chart', 'line-chart', 'area-chart',
  'donut-chart', 'pie-chart', 'ranking-chart', 'treemap-chart',
  'radar-chart', 'combo-chart', 'stacked-bar-chart', 'progress-chart', 'sparkline',
];
const LIB_TABLE_IDS = ['data-table'];

// ============ RESUMO FOLHA ============
export const RESUMO_FOLHA_DEFAULTS: RhWidget[] = [
  { id: 'kpis-resumo',   type: 'kpis-resumo',   title: 'Indicadores da Folha',        position: 0, layout: { x: 0, y: 0,  w: 12, h: 10 } },
  { id: 'mensal-chart',  type: 'mensal-chart',  title: 'Evolução Mensal do Custo',    position: 1, layout: { x: 0, y: 10, w: 12, h: 8  } },
  { id: 'mensal-table',  type: 'mensal-table',  title: 'Detalhamento Mensal',         position: 2, layout: { x: 0, y: 18, w: 12, h: 6  } },
  { id: 'proventos',     type: 'proventos',     title: 'Proventos e Vantagens',       position: 3, layout: { x: 0, y: 24, w: 8,  h: 10 } },
  { id: 'descontos',     type: 'descontos',     title: 'Descontos',                   position: 4, layout: { x: 8, y: 24, w: 4,  h: 10 } },
  { id: 'filial',        type: 'filial',        title: 'Custo por Filial',            position: 5, layout: { x: 0, y: 34, w: 9,  h: 10 } },
  { id: 'tipos-evento',  type: 'tipos-evento',  title: 'Tipos de Evento',             position: 6, layout: { x: 9, y: 34, w: 3,  h: 10 } },
];

export const RESUMO_FOLHA_CATALOG: Record<string, RhWidgetDef> = {
  'kpis-resumo':  { type: 'kpis-resumo',  title: 'Indicadores da Folha',     kind: 'compound' },
  'mensal-chart': { type: 'mensal-chart', title: 'Evolução Mensal do Custo', kind: 'chart', libraryComponentIds: LIB_CHART_IDS },
  'mensal-table': { type: 'mensal-table', title: 'Detalhamento Mensal',      kind: 'table', libraryComponentIds: LIB_TABLE_IDS },
  'proventos':    { type: 'proventos',    title: 'Proventos e Vantagens',    kind: 'table', libraryComponentIds: LIB_TABLE_IDS },
  'descontos':    { type: 'descontos',    title: 'Descontos',                kind: 'table', libraryComponentIds: LIB_TABLE_IDS },
  'filial':       { type: 'filial',       title: 'Custo por Filial',         kind: 'table', libraryComponentIds: LIB_TABLE_IDS },
  'tipos-evento': { type: 'tipos-evento', title: 'Tipos de Evento',          kind: 'chart', libraryComponentIds: LIB_CHART_IDS },
};

// ============ QUADRO COLABORADORES ============
export const QUADRO_DEFAULTS: RhWidget[] = [
  { id: 'kpis-quadro',    type: 'kpis-quadro',    title: 'Indicadores do Quadro',     position: 0, layout: { x: 0, y: 0,  w: 12, h: 6 } },
  { id: 'historico',      type: 'historico',      title: 'Histórico de Colaboradores', position: 1, layout: { x: 0, y: 6,  w: 12, h: 8 } },
  { id: 'breakdown-sex',  type: 'breakdown-sex',  title: 'Distribuição por Sexo',     position: 2, layout: { x: 0, y: 14, w: 4,  h: 8 } },
  { id: 'breakdown-sit',  type: 'breakdown-sit',  title: 'Situação / Afastamento',    position: 3, layout: { x: 4, y: 14, w: 4,  h: 8 } },
  { id: 'breakdown-vin',  type: 'breakdown-vin',  title: 'Tipo de Vínculo',           position: 4, layout: { x: 8, y: 14, w: 4,  h: 8 } },
  { id: 'breakdown-esc',  type: 'breakdown-esc',  title: 'Escolaridade',              position: 5, layout: { x: 0, y: 22, w: 6,  h: 8 } },
  { id: 'breakdown-fx',   type: 'breakdown-fx',   title: 'Faixa Etária',              position: 6, layout: { x: 6, y: 22, w: 6,  h: 8 } },
  { id: 'faixa-sexo',     type: 'faixa-sexo',     title: 'Faixa Etária por Sexo',     position: 7, layout: { x: 0, y: 30, w: 12, h: 8 } },
  { id: 'tempo-sexo',     type: 'tempo-sexo',     title: 'Tempo de Casa por Sexo',    position: 8, layout: { x: 0, y: 38, w: 12, h: 8 } },
  { id: 'tempo-filial',   type: 'tempo-filial',   title: 'Tempo de Casa por Filial',  position: 9, layout: { x: 0, y: 46, w: 12, h: 10 } },
  { id: 'empresa-grid',   type: 'empresa-grid',   title: 'Distribuição por Empresa',  position: 10, layout: { x: 0, y: 56, w: 12, h: 10 } },
  { id: 'drill-card',     type: 'drill-card',     title: 'Análise Multidimensional',  position: 11, layout: { x: 0, y: 66, w: 12, h: 10 } },
];

export const QUADRO_CATALOG: Record<string, RhWidgetDef> = {
  'kpis-quadro':   { type: 'kpis-quadro',   title: 'Indicadores do Quadro',    kind: 'compound' },
  'historico':     { type: 'historico',     title: 'Histórico de Colaboradores', kind: 'chart', libraryComponentIds: LIB_CHART_IDS },
  'breakdown-sex': { type: 'breakdown-sex', title: 'Distribuição por Sexo',    kind: 'chart', libraryComponentIds: LIB_CHART_IDS },
  'breakdown-sit': { type: 'breakdown-sit', title: 'Situação / Afastamento',   kind: 'chart', libraryComponentIds: LIB_CHART_IDS },
  'breakdown-vin': { type: 'breakdown-vin', title: 'Tipo de Vínculo',          kind: 'chart', libraryComponentIds: LIB_CHART_IDS },
  'breakdown-esc': { type: 'breakdown-esc', title: 'Escolaridade',             kind: 'chart', libraryComponentIds: LIB_CHART_IDS },
  'breakdown-fx':  { type: 'breakdown-fx',  title: 'Faixa Etária',             kind: 'chart', libraryComponentIds: LIB_CHART_IDS },
  'faixa-sexo':    { type: 'faixa-sexo',    title: 'Faixa Etária por Sexo',    kind: 'chart', libraryComponentIds: LIB_CHART_IDS },
  'tempo-sexo':    { type: 'tempo-sexo',    title: 'Tempo de Casa por Sexo',   kind: 'chart', libraryComponentIds: LIB_CHART_IDS },
  'tempo-filial':  { type: 'tempo-filial',  title: 'Tempo de Casa por Filial', kind: 'compound' },
  'empresa-grid':  { type: 'empresa-grid',  title: 'Distribuição por Empresa', kind: 'table', libraryComponentIds: LIB_TABLE_IDS },
  'drill-card':    { type: 'drill-card',    title: 'Análise Multidimensional', kind: 'compound' },
};

// ============ CONTRATOS EXPERIÊNCIA ============
export const CONTRATOS_EXP_DEFAULTS: RhWidget[] = [
  { id: 'kpi-qtde',              type: 'kpi-qtde',              title: 'Total de Contratos',        position: 0, layout: { x: 0,  y: 0, w: 3, h: 3 } },
  { id: 'kpi-vencidos-pendentes',type: 'kpi-vencidos-pendentes',title: 'Vencidos Pendentes',        position: 1, layout: { x: 3,  y: 0, w: 3, h: 3 } },
  { id: 'kpi-demitidos',         type: 'kpi-demitidos',         title: 'Demitidos até 30 Dias Após',position: 2, layout: { x: 6,  y: 0, w: 2, h: 3 } },
  { id: 'kpi-5dias',             type: 'kpi-5dias',             title: 'A Vencer em 5 Dias',        position: 3, layout: { x: 8,  y: 0, w: 2, h: 3 } },
  { id: 'kpi-10dias',            type: 'kpi-10dias',            title: 'A Vencer em 10 Dias',       position: 4, layout: { x: 10, y: 0, w: 2, h: 3 } },
  { id: 'vencimentos',           type: 'vencimentos',           title: 'Vencimentos de Contrato',   position: 5, layout: { x: 0,  y: 3, w: 12, h: 12 } },
];

export const CONTRATOS_EXP_CATALOG: Record<string, RhWidgetDef> = {
  'kpi-qtde':               { type: 'kpi-qtde',               title: 'Total de Contratos',         kind: 'kpi', libraryComponentIds: LIB_KPI_IDS },
  'kpi-vencidos-pendentes': { type: 'kpi-vencidos-pendentes', title: 'Vencidos Pendentes',         kind: 'kpi', libraryComponentIds: LIB_KPI_IDS },
  'kpi-demitidos':          { type: 'kpi-demitidos',          title: 'Demitidos até 30 Dias Após', kind: 'kpi', libraryComponentIds: LIB_KPI_IDS },
  'kpi-5dias':              { type: 'kpi-5dias',              title: 'A Vencer em 5 Dias',         kind: 'kpi', libraryComponentIds: LIB_KPI_IDS },
  'kpi-10dias':             { type: 'kpi-10dias',             title: 'A Vencer em 10 Dias',        kind: 'kpi', libraryComponentIds: LIB_KPI_IDS },
  'vencimentos':            { type: 'vencimentos',            title: 'Vencimentos de Contrato',    kind: 'table', libraryComponentIds: LIB_TABLE_IDS },
};

// ============ FÉRIAS ============
export const FERIAS_DEFAULTS: RhWidget[] = [
  { id: 'kpis-ferias',     type: 'kpis-ferias',     title: 'Indicadores de Férias',            position: 0, layout: { x: 0, y: 0,  w: 12, h: 4 } },
  { id: 'pivot-ferias',    type: 'pivot-ferias',    title: 'Limites de Férias',                position: 1, layout: { x: 0, y: 4,  w: 12, h: 8 } },
  { id: 'prox90-ferias',   type: 'prox90-ferias',   title: 'Programação — Próximos 90 Dias',   position: 2, layout: { x: 0, y: 12, w: 6,  h: 10 } },
  { id: 'sem-prog-ferias', type: 'sem-prog-ferias', title: '1º Vencimento sem Programação',    position: 3, layout: { x: 6, y: 12, w: 6, h: 10 } },
];

export const FERIAS_CATALOG: Record<string, RhWidgetDef> = {
  'kpis-ferias':      { type: 'kpis-ferias',      title: 'Indicadores de Férias',          kind: 'compound' },
  'pivot-ferias':     { type: 'pivot-ferias',     title: 'Limites de Férias',              kind: 'table', libraryComponentIds: LIB_TABLE_IDS },
  'prox90-ferias':    { type: 'prox90-ferias',    title: 'Programação — Próximos 90 Dias', kind: 'table', libraryComponentIds: LIB_TABLE_IDS },
  'sem-prog-ferias':  { type: 'sem-prog-ferias',  title: 'Sem Programação',                kind: 'table', libraryComponentIds: LIB_TABLE_IDS },
};

// ============ TURNOVER ============
export const TURNOVER_DEFAULTS: RhWidget[] = [
  { id: 'kpis-turnover',    type: 'kpis-turnover',    title: 'Indicadores de Turnover',           position: 0, layout: { x: 0, y: 0,  w: 12, h: 4 } },
  { id: 'serie-turnover',   type: 'serie-turnover',   title: 'Admissões vs. Demissões por Mês',   position: 1, layout: { x: 0, y: 4, w: 12, h: 8 } },
  { id: 'motivos-turnover', type: 'motivos-turnover', title: 'Motivos de Desligamento',           position: 2, layout: { x: 0, y: 12, w: 6, h: 10 } },
  { id: 'empresa-turnover', type: 'empresa-turnover', title: 'Turnover por Empresa',              position: 3, layout: { x: 6, y: 12, w: 6, h: 10 } },
];

export const TURNOVER_CATALOG: Record<string, RhWidgetDef> = {
  'kpis-turnover':    { type: 'kpis-turnover',    title: 'Indicadores de Turnover',         kind: 'compound' },
  'serie-turnover':   { type: 'serie-turnover',   title: 'Admissões vs. Demissões por Mês', kind: 'chart', libraryComponentIds: LIB_CHART_IDS },
  'motivos-turnover': { type: 'motivos-turnover', title: 'Motivos de Desligamento',         kind: 'table', libraryComponentIds: LIB_TABLE_IDS },
  'empresa-turnover': { type: 'empresa-turnover', title: 'Turnover por Empresa',            kind: 'table', libraryComponentIds: LIB_TABLE_IDS },
};

// ============ ABSENTEÍSMO ============
export const ABSENTEISMO_DEFAULTS: RhWidget[] = [
  { id: 'kpis-abs',      type: 'kpis-abs',      title: 'Indicadores de Absenteísmo', position: 0, layout: { x: 0, y: 0,  w: 12, h: 4 } },
  { id: 'serie-abs',     type: 'serie-abs',     title: 'Evolução Mensal',            position: 1, layout: { x: 0, y: 4,  w: 6,  h: 8 } },
  { id: 'categoria-abs', type: 'categoria-abs', title: 'Por Categoria',              position: 2, layout: { x: 6, y: 4,  w: 6,  h: 8 } },
  { id: 'empresa-abs',   type: 'empresa-abs',   title: 'Por Empresa',                position: 3, layout: { x: 0, y: 12, w: 6,  h: 10 } },
  { id: 'motivo-abs',    type: 'motivo-abs',    title: 'Principais Motivos',         position: 4, layout: { x: 6, y: 12, w: 6,  h: 10 } },
];

export const ABSENTEISMO_CATALOG: Record<string, RhWidgetDef> = {
  'kpis-abs':      { type: 'kpis-abs',      title: 'Indicadores de Absenteísmo', kind: 'compound' },
  'serie-abs':     { type: 'serie-abs',     title: 'Evolução Mensal',            kind: 'chart', libraryComponentIds: LIB_CHART_IDS },
  'categoria-abs': { type: 'categoria-abs', title: 'Por Categoria',              kind: 'chart', libraryComponentIds: LIB_CHART_IDS },
  'empresa-abs':   { type: 'empresa-abs',   title: 'Por Empresa',                kind: 'table', libraryComponentIds: LIB_TABLE_IDS },
  'motivo-abs':    { type: 'motivo-abs',    title: 'Principais Motivos',         kind: 'table', libraryComponentIds: LIB_TABLE_IDS },
};
