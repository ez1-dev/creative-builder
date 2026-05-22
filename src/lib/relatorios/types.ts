export type RelatorioStatus = 'rascunho' | 'publicado' | 'inativo';
export type ParametroTipo =
  | 'texto'
  | 'numero'
  | 'data'
  | 'periodo'
  | 'lista'
  | 'lista_sql'
  | 'multi'
  | 'booleano'
  | 'empresa'
  | 'filial'
  | 'produto'
  | 'cliente'
  | 'fornecedor'
  | 'op';
export type ColunaAlinhamento = 'esquerda' | 'centro' | 'direita';
export type ColunaTipo = 'texto' | 'numero' | 'moeda' | 'data' | 'data_hora' | 'percentual' | 'booleano';
export type LayoutTipo =
  | 'tabela_simples'
  | 'tabela_agrupada'
  | 'cards'
  | 'grafico'
  | 'tabela_grafico'
  | 'mestre_detalhe'
  | 'dashboard'
  | 'relatorio_operacional';

export type TipoFonte = 'sql' | 'api_rest';

export type RegraCondicional = {
  campo?: string;
  operador: '=' | '!=' | '>' | '>=' | '<' | '<=' | 'contem' | 'vazio' | 'preenchido';
  valor?: string | number | null;
  estilo:
    | 'badge_success' | 'badge_warning' | 'badge_destructive' | 'badge_info'
    | 'bg_success' | 'bg_warning' | 'bg_destructive' | 'texto_negrito';
  rotulo?: string | null;
};

export type OrdenacaoPadrao = { campo: string; direcao: 'asc' | 'desc' };

export type Destaque = {
  campo: string;
  operador: '=' | '!=' | '>' | '>=' | '<' | '<=';
  valor: string | number;
  cor: 'success' | 'warning' | 'destructive' | 'info' | 'muted';
};

export interface Relatorio {
  id: string;
  codigo: string;
  nome: string;
  descricao: string | null;
  modulo: string | null;
  categoria: string | null;
  icone: string | null;
  fonte_dados: string | null;
  sql_query: string;
  status: RelatorioStatus;
  permite_excel: boolean;
  permite_pdf: boolean;
  permite_csv: boolean;
  permite_impressao: boolean;
  versao_atual: number;
  tipo_fonte: TipoFonte;
  endpoint_url: string | null;
  url_destino: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface RelatorioParametro {
  id: string;
  relatorio_id: string;
  nome: string;
  label: string | null;
  tipo: ParametroTipo;
  obrigatorio: boolean;
  valor_padrao: string | null;
  ordem: number;
  sql_lista: string | null;
}

export interface RelatorioColuna {
  id: string;
  relatorio_id: string;
  campo: string;
  titulo: string | null;
  visivel: boolean;
  ordem: number;
  tipo: ColunaTipo | string | null;
  formato: string | null;
  alinhamento: ColunaAlinhamento;
  largura: number | null;
  totalizar: boolean;
  agrupar: boolean;
  visivel_excel: boolean;
  visivel_pdf: boolean;
  permite_ordenar: boolean;
  permite_filtrar: boolean;
  regra_condicional_json: RegraCondicional[];
}

export interface RelatorioLayout {
  relatorio_id: string;
  tipo: LayoutTipo;
  titulo: string | null;
  subtitulo: string | null;
  mostrar_filtros: boolean;
  mostrar_totais: boolean;
  mostrar_data_hora: boolean;
  mostrar_usuario: boolean;
  agrupar_por: string | null;
  congelar_colunas: number;
  paginacao: boolean;
  por_pagina: number;
  ordenacao_padrao: OrdenacaoPadrao[];
  destaques_json: Destaque[];
  config: Record<string, unknown>;
}

export interface RelatorioVersao {
  id: string;
  relatorio_id: string;
  versao: number;
  sql_base: string;
  parametros_json: unknown;
  colunas_json: unknown;
  layout_json: unknown;
  config_json: unknown;
  observacao: string | null;
  criado_por: string | null;
  criado_em: string;
}

export interface RelatorioPublicacao {
  id: string;
  relatorio_id: string;
  versao_id: string | null;
  modulo: string | null;
  menu_path: string | null;
  ativo: boolean;
  publicado_por: string | null;
  publicado_em: string;
}

export interface RelatorioPermissao {
  id: string;
  relatorio_id: string;
  profile_id: string;
  can_view: boolean;
  can_export: boolean;
  can_print: boolean;
  created_at: string;
}

export interface RelatorioExecucao {
  id: string;
  relatorio_id: string;
  executado_por: string | null;
  executado_em: string;
  parametros: Record<string, unknown>;
  qtd_linhas: number | null;
  tempo_ms: number | null;
  status: 'ok' | 'erro';
  erro: string | null;
  formato: 'grid' | 'excel' | 'csv' | 'pdf';
}

export interface PreviewResult {
  colunas: { nome: string; tipo: string }[];
  linhas: Record<string, unknown>[];
  tempo_ms: number;
  qtd_linhas: number;
  erro?: string;
}
