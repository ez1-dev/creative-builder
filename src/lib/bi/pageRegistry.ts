/**
 * Registry de páginas alvo da Biblioteca BI.
 * Cada página declara as seções (slots) que aceitam widgets injetados
 * pelo usuário e o "schema" dos dados que ela publica via PageDataContext.
 *
 * Os campos listados em `schema` aparecem nos combos de mapeamento
 * do `<ApplyComponentDialog />`.
 */
export type WidgetKind = 'kpi' | 'chart' | 'map' | 'tree' | 'table';

export interface PageSection {
  key: string;
  label: string;
  /** Tipos de componente aceitos nesta seção */
  accepts: WidgetKind[];
  /** Quantidade de colunas do grid responsivo (default 4 / xl) */
  cols?: 1 | 2 | 3 | 4 | 6;
}

export interface PageDataSchema {
  /** Campos numéricos de KPI (lidos de `kpis` no PageDataContext) */
  kpis?: { key: string; label: string; format?: 'currency' | 'number' | 'percent' }[];
  /** Séries para gráficos (lidos de `series`) — cada série é um array {label, valor} */
  series?: { key: string; label: string }[];
  /** Linhas tabulares (lidos de `rows`) */
  rows?: { key: string; label: string; fields: string[] };
}

export interface BiPageDef {
  key: string;
  label: string;
  route: string;
  sections: PageSection[];
  schema: PageDataSchema;
}

export const PAGE_REGISTRY: BiPageDef[] = [
  {
    key: 'painel-compras',
    label: 'Painel de Compras',
    route: '/painel-compras',
    sections: [
      { key: 'kpis',   label: 'Linha de KPIs',       accepts: ['kpi'],                         cols: 4 },
      { key: 'charts', label: 'Linha de gráficos',   accepts: ['chart', 'map', 'tree'],        cols: 3 },
      { key: 'tables', label: 'Tabelas auxiliares',  accepts: ['table'],                       cols: 2 },
    ],
    schema: {
      kpis: [
        { key: 'total_compras',   label: 'Total Compras',   format: 'currency' },
        { key: 'total_recebido',  label: 'Total Recebido',  format: 'currency' },
        { key: 'ticket_medio',    label: 'Ticket Médio',    format: 'currency' },
        { key: 'qtde_notas',      label: 'Qtde Notas',      format: 'number' },
      ],
      series: [
        { key: 'compras_por_mes',  label: 'Compras por Mês' },
        { key: 'top_fornecedores', label: 'Top Fornecedores' },
        { key: 'tipos_despesa',    label: 'Tipos de Despesa' },
      ],
      rows: { key: 'dados', label: 'Linhas da tabela', fields: ['fornecedor', 'tipo', 'centro', 'valor_liquido', 'status'] },
    },
  },
  {
    key: 'notas-recebimento',
    label: 'NF Recebimento',
    route: '/notas-recebimento',
    sections: [
      { key: 'kpis',   label: 'Linha de KPIs',      accepts: ['kpi'],                  cols: 4 },
      { key: 'charts', label: 'Linha de gráficos',  accepts: ['chart', 'map', 'tree'], cols: 3 },
      { key: 'tables', label: 'Tabelas auxiliares', accepts: ['table'],                cols: 2 },
    ],
    schema: {
      kpis: [
        { key: 'total_recebido',  label: 'Total Recebido',  format: 'currency' },
        { key: 'qtde_notas',      label: 'Qtde Notas',      format: 'number' },
        { key: 'pendentes',       label: 'Pendentes',       format: 'currency' },
        { key: 'media_recebida',  label: 'Média Recebida',  format: 'currency' },
      ],
      series: [
        { key: 'recebido_por_mes', label: 'Recebido por Mês' },
        { key: 'top_fornecedores', label: 'Top Fornecedores' },
        { key: 'recebido_por_uf',  label: 'Recebido por UF' },
      ],
      rows: { key: 'dados', label: 'Notas', fields: ['fornecedor', 'numero', 'data', 'valor', 'status'] },
    },
  },
  {
    key: 'producao-dashboard',
    label: 'Produção — Dashboard',
    route: '/producao/dashboard',
    sections: [
      { key: 'kpis',   label: 'Linha de KPIs',     accepts: ['kpi'],                  cols: 4 },
      { key: 'charts', label: 'Linha de gráficos', accepts: ['chart', 'map', 'tree'], cols: 3 },
    ],
    schema: {
      kpis: [
        { key: 'total_produzido', label: 'Total Produzido', format: 'number' },
        { key: 'total_expedido',  label: 'Total Expedido',  format: 'number' },
        { key: 'em_estoque',      label: 'Em Estoque',      format: 'number' },
        { key: 'meta_semanal',    label: 'Meta Semanal',    format: 'number' },
      ],
      series: [
        { key: 'producao_por_dia', label: 'Produção por Dia' },
        { key: 'top_produtos',     label: 'Top Produtos' },
      ],
    },
  },
];

export function getPage(key: string): BiPageDef | undefined {
  return PAGE_REGISTRY.find((p) => p.key === key);
}

export function getSectionsForKind(page: BiPageDef, kind: WidgetKind): PageSection[] {
  return page.sections.filter((s) => s.accepts.includes(kind));
}
