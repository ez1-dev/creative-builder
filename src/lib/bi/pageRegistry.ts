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
  /** Página opera com filtro `unidade_negocio` (GENIUS / ESTRUTURAL ZORTEA / CONSOLIDADO). */
  supportsUnidadeNegocio?: boolean;
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
      { key: 'tables', label: 'Tabelas auxiliares',accepts: ['table'],                cols: 2 },
    ],
    schema: {
      kpis: [
        { key: 'total_produzido', label: 'Total Produzido', format: 'number' },
        { key: 'total_expedido',  label: 'Total Expedido',  format: 'number' },
        { key: 'em_estoque',      label: 'Em Estoque',      format: 'number' },
        { key: 'meta_semanal',    label: 'Meta Semanal',    format: 'number' },
      ],
      series: [
        { key: 'cargas_por_mes',         label: 'Cargas por Mês' },
        { key: 'top_projetos_patio',     label: 'Top Projetos (Pátio)' },
        { key: 'top_projetos_produzido', label: 'Top Projetos (Produzido)' },
      ],
      rows: { key: 'dados', label: 'Top Projetos', fields: ['numero_projeto', 'numero_desenho', 'cliente', 'kg_patio', 'kg_produzido', 'status_patio'] },
    },
  },
  {
    key: 'faturamento-genius',
    label: 'Faturamento Genius',
    route: '/faturamento-genius',
    supportsUnidadeNegocio: true,
    sections: [
      { key: 'kpis',   label: 'Linha de KPIs',     accepts: ['kpi'],                  cols: 4 },
      { key: 'charts', label: 'Linha de gráficos', accepts: ['chart', 'map', 'tree'], cols: 3 },
    ],
    schema: {
      kpis: [
        { key: 'valor_total',         label: 'Faturamento',    format: 'currency' },
        { key: 'fat_liquido',         label: 'Fat. Líquido',   format: 'currency' },
        { key: 'valor_devolucao',     label: 'Devolução',      format: 'currency' },
        { key: 'valor_impostos',      label: 'Impostos',       format: 'currency' },
        { key: 'valor_custo',         label: 'Custo',          format: 'currency' },
        { key: 'valor_comissao',      label: 'Comissão',       format: 'currency' },
        { key: 'margem_bruta',        label: 'Margem Bruta',   format: 'currency' },
        { key: 'margem_percentual',   label: 'Margem %',       format: 'percent'  },
        { key: 'quantidade_notas',    label: 'Qtde Notas',     format: 'number'   },
        { key: 'quantidade_pedidos',  label: 'Qtde Pedidos',   format: 'number'   },
        { key: 'quantidade_clientes', label: 'Qtde Clientes',  format: 'number'   },
        { key: 'quantidade_produtos', label: 'Qtde Produtos',  format: 'number'   },
      ],
      series: [
        { key: 'por_revenda', label: 'Por Revenda' },
        { key: 'por_anomes',  label: 'Por Mês' },
        { key: 'por_origem',  label: 'Por Origem' },
      ],
    },
  },
  {
    key: 'estoque-min-max',
    label: 'Estoque Min/Max',
    route: '/estoque-min-max',
    sections: [
      { key: 'kpis',   label: 'Linha de KPIs',      accepts: ['kpi'],   cols: 4 },
      { key: 'tables', label: 'Tabelas auxiliares', accepts: ['table'], cols: 2 },
    ],
    schema: {
      kpis: [
        { key: 'abaixo_minimo',         label: 'Abaixo do Mínimo', format: 'number' },
        { key: 'acima_maximo',          label: 'Acima do Máximo',  format: 'number' },
        { key: 'sem_politica',          label: 'Sem Política',     format: 'number' },
        { key: 'ok',                    label: 'Itens OK',         format: 'number' },
        { key: 'sugestao_minimo_total', label: 'Sugestão Mínimo',  format: 'number' },
        { key: 'sugestao_maximo_total', label: 'Sugestão Máximo',  format: 'number' },
      ],
      rows: { key: 'dados', label: 'Itens de estoque', fields: ['codigo', 'descricao', 'saldo_atual', 'estoque_minimo', 'estoque_maximo', 'status'] },
    },
  },
  {
    key: 'contas-pagar',
    label: 'Contas a Pagar',
    route: '/contas-pagar',
    sections: [
      { key: 'kpis',   label: 'Linha de KPIs',      accepts: ['kpi'],   cols: 4 },
      { key: 'tables', label: 'Tabelas auxiliares', accepts: ['table'], cols: 2 },
    ],
    schema: {
      kpis: [
        { key: 'total_titulos',        label: 'Total Títulos',     format: 'number'   },
        { key: 'total_fornecedores',   label: 'Fornecedores',      format: 'number'   },
        { key: 'valor_original_total', label: 'Valor Original',    format: 'currency' },
        { key: 'valor_aberto_total',   label: 'Valor Aberto',      format: 'currency' },
        { key: 'valor_pago_total',     label: 'Valor Pago',        format: 'currency' },
        { key: 'titulos_vencidos',     label: 'Títulos Vencidos',  format: 'number'   },
        { key: 'valor_vencido_total',  label: 'Valor Vencido',     format: 'currency' },
        { key: 'valor_a_vencer_7d',    label: 'A Vencer 7 dias',   format: 'currency' },
        { key: 'valor_a_vencer_30d',   label: 'A Vencer 30 dias',  format: 'currency' },
        { key: 'ticket_medio',         label: 'Ticket Médio',      format: 'currency' },
        { key: 'maior_atraso_dias',    label: 'Maior Atraso',      format: 'number'   },
      ],
      rows: { key: 'dados', label: 'Títulos', fields: ['nome_fornecedor', 'numero_titulo', 'data_vencimento', 'valor_aberto', 'status_titulo'] },
    },
  },
  {
    key: 'auditoria-apontamento-genius',
    label: 'Auditoria de Apontamentos',
    route: '/auditoria-apontamento-genius',
    sections: [
      { key: 'kpis',   label: 'Linha de KPIs',      accepts: ['kpi'],   cols: 4 },
      { key: 'tables', label: 'Tabelas auxiliares', accepts: ['table'], cols: 2 },
    ],
    schema: {
      kpis: [
        { key: 'total_apontamentos', label: 'Total Apontamentos', format: 'number' },
        { key: 'total_horas',        label: 'Total Horas',        format: 'number' },
        { key: 'inconsistencias',    label: 'Inconsistências',    format: 'number' },
        { key: 'sem_inicio',         label: 'Sem Início',         format: 'number' },
        { key: 'sem_fim',            label: 'Sem Fim',            format: 'number' },
        { key: 'acima_8h',           label: 'Acima de 8h',        format: 'number' },
        { key: 'operadores',         label: 'Operadores',         format: 'number' },
        { key: 'ops_distintas',      label: 'OPs Distintas',      format: 'number' },
      ],
      rows: { key: 'dados', label: 'Apontamentos', fields: ['numero_op', 'nome_operador', 'data_movimento', 'horas_realizadas', 'status_movimento'] },
    },
  },
  {
    key: 'passagens-aereas',
    label: 'Passagens Aéreas',
    route: '/passagens-aereas',
    sections: [
      { key: 'kpis',   label: 'Linha de KPIs',     accepts: ['kpi'],                  cols: 4 },
      { key: 'charts', label: 'Linha de gráficos', accepts: ['chart', 'map', 'tree'], cols: 3 },
      { key: 'tables', label: 'Tabelas auxiliares',accepts: ['table'],                cols: 2 },
    ],
    schema: {
      kpis: [
        { key: 'total_geral',          label: 'Total Geral',     format: 'currency' },
        { key: 'total_registros',      label: 'Qtd Registros',   format: 'number'   },
        { key: 'ticket_medio',         label: 'Ticket Médio',    format: 'currency' },
        { key: 'colaboradores_unicos', label: 'Colaboradores',   format: 'number'   },
      ],
      series: [
        { key: 'evolucao_mensal',     label: 'Evolução Mensal (R$)' },
        { key: 'por_motivo',          label: 'Por Motivo de Viagem (R$)' },
        { key: 'top_centros_custo',   label: 'Top Centros de Custo (R$)' },
        { key: 'top_cidades_qtd',     label: 'Top Cidades de Destino (qtd)' },
        { key: 'top_cidades_valor',   label: 'Top Cidades de Destino (R$)' },
        { key: 'top_uf_qtd',          label: 'Top Estados/UF (qtd)' },
        { key: 'top_uf_valor',        label: 'Top Estados/UF (R$)' },
        { key: 'por_tipo_despesa',    label: 'Por Tipo de Despesa (R$)' },
        { key: 'por_cia_aerea',       label: 'Por Cia Aérea (R$)' },
        { key: 'top_colaboradores',   label: 'Top Colaboradores (R$)' },
      ],
      rows: { key: 'dados', label: 'Passagens', fields: ['colaborador', 'centro_custo', 'destino', 'uf_destino', 'motivo_viagem', 'tipo_despesa', 'valor', 'data_registro'] },
    },
  },
  {
    key: 'bi-comercial',
    label: 'BI Comercial',
    route: '/bi/comercial',
    supportsUnidadeNegocio: true,
    sections: [
      { key: 'kpis',   label: 'Linha de KPIs',     accepts: ['kpi'],                  cols: 4 },
      { key: 'charts', label: 'Linha de gráficos', accepts: ['chart', 'map', 'tree'], cols: 3 },
      { key: 'tables', label: 'Tabelas auxiliares',accepts: ['table'],                cols: 2 },
    ],
    schema: {
      kpis: [
        { key: 'faturamento',     label: 'Faturamento',         format: 'currency' },
        { key: 'meta',            label: 'Meta',                format: 'currency' },
        { key: 'diferenca',       label: 'Diferença',           format: 'currency' },
        { key: 'pct_atingimento', label: '% Atingimento',       format: 'percent'  },
        { key: 'fat_liquido',     label: 'Faturamento Líquido', format: 'currency' },
        { key: 'impostos',        label: 'Impostos',            format: 'currency' },
        { key: 'devolucao',       label: 'Devolução',           format: 'currency' },
        { key: 'numero_vendas',   label: 'Nº Vendas',           format: 'number'   },
        { key: 'numero_clientes', label: 'Nº Clientes',         format: 'number'   },
        { key: 'numero_estados',  label: 'Nº Estados',          format: 'number'   },
        { key: 'quantidade',      label: 'Quantidade',          format: 'number'   },
        { key: 'ticket_medio',    label: 'Ticket Médio',        format: 'currency' },
        { key: 'preco_medio',     label: 'Preço Médio',         format: 'currency' },
      ],
      series: [
        { key: 'mensal',   label: 'Faturamento mensal' },
        { key: 'mix',      label: 'Mix por categoria' },
        { key: 'estados',  label: 'Faturamento por estado' },
        { key: 'revendas', label: 'Top revendas (GENIUS)' },
        { key: 'obras',    label: 'Top obras (ESTRUTURAL)' },
      ],
      rows: { key: 'dados', label: 'Mensal', fields: ['anomes_emissao', 'faturamento', 'fat_liquido', 'impostos', 'devolucao', 'numero_vendas', 'quantidade'] },
    },
  },
  {
    key: 'frota',
    label: 'Manutenção de Frota',
    route: '/frota',
    sections: [
      { key: 'kpis',   label: 'Linha de KPIs',     accepts: ['kpi'],                  cols: 4 },
      { key: 'charts', label: 'Linha de gráficos', accepts: ['chart', 'map', 'tree'], cols: 3 },
      { key: 'tables', label: 'Tabelas auxiliares',accepts: ['table'],                cols: 2 },
    ],
    schema: {
      kpis: [
        { key: 'total_gasto',         label: 'Total Gasto',        format: 'currency' },
        { key: 'total_manutencoes',   label: 'Qtd Manutenções',    format: 'number'   },
        { key: 'ticket_medio',        label: 'Ticket Médio',       format: 'currency' },
        { key: 'veiculos_atendidos',  label: 'Veículos Atendidos', format: 'number'   },
      ],
      series: [
        { key: 'evolucao_mensal',     label: 'Evolução Mensal (R$)' },
        { key: 'por_segmento',        label: 'Por Segmento (R$)' },
        { key: 'top_veiculos',        label: 'Top Veículos (R$)' },
        { key: 'top_fornecedores',    label: 'Top Fornecedores (R$)' },
        { key: 'top_centros_custo',   label: 'Top Centros de Custo (R$)' },
        { key: 'top_motoristas',      label: 'Top Motoristas (R$)' },
      ],
      rows: { key: 'dados', label: 'Manutenções', fields: ['data', 'placa', 'veiculo_descricao', 'fornecedor', 'descricao', 'valor', 'motorista', 'centro_custo', 'segmento'] },
    },
  },
];

/** Seções padrão usadas por páginas genéricas (sem schema rico). */
const GENERIC_SECTIONS: PageSection[] = [
  { key: 'kpis',   label: 'Linha de KPIs',      accepts: ['kpi'],                                  cols: 4 },
  { key: 'charts', label: 'Linha de gráficos',  accepts: ['chart', 'map', 'tree'],                 cols: 3 },
  { key: 'tables', label: 'Tabelas auxiliares', accepts: ['table'],                                cols: 2 },
];

/** Páginas adicionais — aceitam qualquer componente, mapeamento livre. */
const GENERIC_PAGES: BiPageDef[] = [
  { key: 'estoque',                           label: 'Estoque',                              route: '/estoque' },
  { key: 'conciliacao-edocs',                 label: 'Conciliação EDocs',                    route: '/conciliacao-edocs' },
  { key: 'bom',                               label: 'BOM',                                  route: '/bom' },
  { key: 'onde-usa',                          label: 'Onde Usa',                             route: '/onde-usa' },
  { key: 'engenharia-producao',               label: 'Engenharia x Produção',                route: '/engenharia-producao' },
  { key: 'sugestao-min-max',                  label: 'Sugestão Min/Max',                     route: '/sugestao-min-max' },
  { key: 'auditoria-tributaria',              label: 'Auditoria Tributária',                 route: '/auditoria-tributaria' },
  { key: 'contas-receber',                    label: 'Contas a Receber',                     route: '/contas-receber' },
  { key: 'compras-produto',                   label: 'Compras por Produto',                  route: '/compras-produto' },
  { key: 'numero-serie',                      label: 'Número de Série',                      route: '/numero-serie' },
  { key: 'demonstrativo-compras-recebimentos',label: 'Demonstrativo Compras/Recebimentos',   route: '/demonstrativo-compras-recebimentos' },
  { key: 'monitor-usuarios-senior',           label: 'Monitor Usuários Senior',              route: '/monitor-usuarios-senior' },
  { key: 'gestao-sgu-usuarios',               label: 'Gestão SGU — Usuários',                route: '/gestao-sgu-usuarios' },
  
  { key: 'producao-expedido-obra',            label: 'Produção — Expedido por Obra',         route: '/producao/expedido-obra' },
  { key: 'producao-lead-time',                label: 'Produção — Lead Time',                 route: '/producao/lead-time' },
  { key: 'producao-nao-carregados',           label: 'Produção — Não Carregados',            route: '/producao/nao-carregados' },
  { key: 'producao-produzido-periodo',        label: 'Produção — Produzido no Período',      route: '/producao/produzido-periodo' },
  { key: 'producao-relatorio-semanal-obra',   label: 'Produção — Relatório Semanal por Obra',route: '/producao/relatorio-semanal-obra' },
  { key: 'producao-saldo-patio',              label: 'Produção — Saldo de Pátio',            route: '/producao/saldo-patio' },
].map((p) => ({ ...p, sections: GENERIC_SECTIONS, schema: {} }));

PAGE_REGISTRY.push(...GENERIC_PAGES);

export function getPage(key: string): BiPageDef | undefined {
  return PAGE_REGISTRY.find((p) => p.key === key);
}

export function getSectionsForKind(page: BiPageDef, kind: WidgetKind): PageSection[] {
  return page.sections.filter((s) => s.accepts.includes(kind));
}
