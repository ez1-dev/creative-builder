export type TipoModelo = "DRE" | "BALANCO";

export type ModoBalanco =
  | "MENSAL_E650SAL"
  | "CCCC106_E640LCT_ACUMULADO"
  | "CONCILIACAO_SENIOR_MENSAL";

export type TipoLinha = "GRUPO" | "ANALITICA" | "SUBTOTAL" | "TOTAL" | "FORMULA";

export type NaturezaLinha =
  | "RECEITA"
  | "DEDUCAO"
  | "CUSTO"
  | "DESPESA"
  | "RESULTADO"
  | "ATIVO"
  | "PASSIVO"
  | "PATRIMONIO"
  | "VINCULAR"
  | "OUTROS";

export type Operador = "SOMA" | "SUBTRAI";

export interface PlanoContaItem {
  codemp: number;
  ctared: number;
  clacta: string;
  descta: string;
  nivcta: number;
  anasin: "A" | "S";
  sitcta: string;
  forrat?: string;
  mskgcc?: string;
  eh_analitica: 0 | 1;
  grupo_contabil?: string;
}

export interface PlanoContasResponse {
  codemp: number;
  tipo: TipoModelo;
  total: number;
  dados: PlanoContaItem[];
}

export interface CentroCusto {
  codemp: number;
  codccu: string;
  desccu: string;
  sitccu?: string;
}

export interface Modelo {
  id: string;
  codemp: number;
  nome: string;
  tipo_modelo: TipoModelo;
  descricao?: string | null;
  ativo: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface LinhaModelo {
  id: string;
  modelo_id: string;
  linha_pai_id: string | null;
  ordem: number;
  codigo: string;
  descricao: string;
  tipo_linha: TipoLinha;
  natureza: NaturezaLinha;
  operador: Operador;
  sinal: 1 | -1;
  exibir: boolean;
  negrito: boolean;
  formula?: string | null;
}

export interface ContaVinculada {
  id: string;
  linha_id: string;
  codemp: number;
  ctared: number;
  clacta: string;
  descta: string;
  nivcta: number;
  anasin: "A" | "S";
  incluir_subcontas: boolean;
  sinal: 1 | -1;
}

export interface ModeloDetalhe {
  modelo: Modelo;
  linhas: LinhaModelo[];
  contas: ContaVinculada[];
}

export interface RealizadoItem {
  anomes: number;
  ctared: number;
  codccu?: string;
  valor: number;
}

export interface DrillLancamento {
  data: string;
  lote?: string | number;
  numero?: string | number;
  conta_debito?: string;
  desc_debito?: string;
  conta_credito?: string;
  desc_credito?: string;
  codccu?: string;
  desccu?: string;
  historico?: string;
  valor: number;
}

export interface ComparativoCelula {
  realizado: number;
  orcado: number;
  variacao: number;
  variacao_pct: number;
}

export interface ComparativoLinha {
  linha_id: string;
  codigo: string;
  descricao: string;
  tipo_linha: TipoLinha;
  natureza: NaturezaLinha;
  negrito: boolean;
  exibir: boolean;
  linha_pai_id: string | null;
  meses: Record<string, ComparativoCelula>; // key = anomes
  total: ComparativoCelula;
}

export interface ComparativoResponse {
  modelo_id: string;
  anomes_ini: number;
  anomes_fim: number;
  meses: number[];
  linhas: ComparativoLinha[];
}

// ---- Novo formato V2 ----
export interface ComparativoLinhaV2 {
  linha_id: string;
  codigo: string;
  descricao: string;
  tipo_linha: TipoLinha;
  natureza: NaturezaLinha;
  negrito: boolean;
  exibir: boolean;
  linha_pai_id: string | null;
  ordem?: number;
  realizado: Record<string, number | null>;
  orcado: Record<string, number | null>;
  variacao: Record<string, number | null>;
  variacao_percentual: Record<string, number | null>;
  origem_valor?: string | null;
  // ---- Campos opcionais usados pelas linhas virtuais do Balanço (expandir_resultado_exercicio) ----
  tipo_registro?:
    | "GRUPO"
    | "SUBTOTAL"
    | "TOTAL"
    | "CONTA_CONTABIL"
    | "AJUSTE"
    | string;
  origem_linha?: string | null;
  nivel_visual?: number | null;
  codigo_exibicao?: string | null;
  conta_reduzida?: number | string | null;
  conta_contabil?: string | null;
  descricao_conta?: string | null;
  valor_acumulado_linha?: number | null;
  codigo_pai?: string | null;
  linha_virtual?: boolean | null;
  descricao_linha?: string | null;

}

// ---- Resultado pronto / materialização assíncrona ----
export type ResultadoProntoStatus =
  | "CONCLUIDO"
  | "SEM_CACHE"
  | "EM_PROCESSAMENTO"
  | string;

export interface ResultadoProntoResponse {
  status: ResultadoProntoStatus;
  atualizado_em?: string | null;
  ultima_atualizacao?: string | null;
  origem?: "SUPABASE_CACHE" | "SENIOR_ERP" | string | null;
  fonte?: string | null;
  fonte_saldo?: string | null;
  fonte_oficial?: boolean | null;
  modo_balanco?: string | null;
  aplicar_referencia_senior?: boolean | null;
  referencia_senior_aplicada?: boolean | null;
  referencia_senior_origem?: string | null;
  qtd_referencias_aplicadas?: number | null;
  job_id?: string | null;
  payload?: ComparativoResponseV2 | null;
}

export interface JobStatusResponse {
  job_id: string;
  status:
    | "PENDENTE"
    | "PROCESSANDO"
    | "EM_PROCESSAMENTO"
    | "CONCLUIDO"
    | "ERRO"
    | string;
  processados: number;
  total: number;
  percentual?: number | null;
  etapa?: string | null;
  mensagem?: string | null;
  erro?: string | null;
}




export interface ComparativoResponseV2 {
  modelo_id: string;
  colunas: string[];
  /** Períodos efetivamente retornados pelo backend (sem TOTAL_ANO). Fonte oficial das colunas. */
  periodos?: string[];
  linhas: ComparativoLinhaV2[];
  metodo_calculo_linhas?: Record<string, string>;
  fonte?: string | null;
  fonte_saldo?: string | null;
  origem?: string | null;
  aplicar_referencia_senior?: boolean | null;
  referencia_senior_aplicada?: boolean | null;
  referencia_senior_origem?:
    | "PROPRIA"
    | "FALLBACK_MODELO_OFICIAL"
    | "NAO_ENCONTRADA"
    | string
    | null;
  qtd_referencias_aplicadas?: number | null;
}




export interface OrcamentoItem {
  id?: string;
  modelo_id: string;
  linha_id: string;
  codemp: number;
  codfil: number;
  codccu?: string | null;
  ctared?: number | null;
  anomes: number;
  valor_orcado: number;
}

// ---- Controle de cache contábil ----
export type StatusPeriodo = "PROCESSADO" | "ERRO" | "SEM_CACHE" | string;

export interface PeriodoStatus {
  anomes: number;
  status: StatusPeriodo;
  fechamento_ok?: boolean | null;
  ultima_execucao?: string | null;
  mensagem?: string | null;
  execucao_id?: string | null;
  total_geral?: number | null;
}

export interface ExecucaoCache {
  execucao_id?: string;
  data_hora?: string;
  modelo_id?: string;
  anomes_ini?: number;
  anomes_fim?: number;
  status?: string;
  registros_lidos?: number;
  registros_gravados?: number;
  tempo_ms?: number;
  erro?: string | null;
  raw?: unknown;
}

