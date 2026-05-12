export type StatusRegra = 'rascunho' | 'em_revisao' | 'aprovada' | 'rejeitada' | 'arquivada';
export type SituacaoIdentificador = 'A' | 'I' | 'X';
export type AmbienteRegra = 'producao' | 'homologacao' | 'desenvolvimento';

export interface RegraLSP {
  id: number | string;
  nome_regra: string;
  codreg_erp?: number | null;
  modsis?: string | null;
  idereg?: string | null;
  codtns?: string | null;
  descricao?: string | null;
  ambiente?: AmbienteRegra | null;
  ticket?: string | null;
  motivo?: string | null;
  fonte_lsp?: string | null;
  status_regra: StatusRegra;
  criado_por?: string | null;
  criado_em?: string | null;
  atualizado_em?: string | null;
}

export interface RegraFiltros {
  texto?: string;
  status_regra?: StatusRegra | '';
  idereg?: string;
}

export interface Identificador {
  codemp: number;
  modsis: string;
  idereg: string;
  codtns?: string | null;
  descricao?: string | null;
  codreg?: number | null;
  situacao: SituacaoIdentificador;
  observacao?: string | null;
  atualizado_em?: string | null;
}

export interface IdentificadorFiltros {
  codemp?: number | '';
  modsis?: string;
  idereg?: string;
  situacao?: SituacaoIdentificador | '';
  codreg?: number | '';
  texto?: string;
}

export interface AuditoriaEntry {
  id: number | string;
  data: string;
  usuario: string;
  acao: string;
  alvo?: string;
  detalhes?: Record<string, any>;
  motivo?: string | null;
}

export interface DashboardResumo {
  total_regras: number;
  rascunho: number;
  em_revisao: number;
  aprovadas: number;
  identificadores_ativos: number;
  identificadores_inativos: number;
  identificadores_teste: number;
  ultimas_alteracoes: AuditoriaEntry[];
}

export interface AlterarSituacaoPayload {
  codemp: number;
  modsis: string;
  idereg: string;
  codtns: string;
  nova_situacao: SituacaoIdentificador;
  motivo: string;
  confirmar: true;
}

export interface AlterarRegraPayload {
  codemp: number;
  modsis: string;
  idereg: string;
  codtns: string;
  novo_codreg: number;
  motivo: string;
  confirmar: true;
}
