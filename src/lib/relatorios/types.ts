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
  | 'tabela_grafico';

export type TipoFonte = 'sql' | 'api_rest';

export interface Relatorio {
  id: string;
  codigo: string;
  nome: string;
  descricao: string | null;
  modulo: string | null;
  categoria: string | null;
  fonte_dados: string | null;
  sql_query: string;
  status: RelatorioStatus;
  permite_excel: boolean;
  permite_pdf: boolean;
  permite_csv: boolean;
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
  config: Record<string, unknown>;
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
