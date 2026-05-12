export type StatusRegra =
  | 'rascunho'
  | 'em_revisao'
  | 'aprovada'
  | 'rejeitada'
  | 'exportada'
  | 'compilada_homologacao'
  | 'testada_homologacao'
  | 'publicada_producao'
  | 'ativa'
  | 'inativa'
  | 'arquivada'
  // valores vindos diretamente do ERP (E098REG.SITREG)
  | 'ATIVA'
  | 'INATIVA'
  | 'TESTE_X'
  | 'OUTRA';

export type SituacaoIdentificador = 'A' | 'I' | 'X';
export type AmbienteRegra = 'producao' | 'homologacao' | 'desenvolvimento' | 'ERP' | string;
export type OrigemRegra = 'E098REG' | 'PORTAL' | string;

export interface RegraLSP {
  id: number | string;
  id_regra?: number | string | null;
  codemp?: number | null;
  origem?: OrigemRegra | null;
  nome_regra: string;
  codreg_erp?: number | null;
  modsis?: string | null;
  idereg?: string | null;
  codtns?: string | null;
  descricao?: string | null;
  ambiente?: AmbienteRegra | null;
  ticket?: string | null;
  motivo?: string | null;
  observacao?: string | null;
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

export interface RegraVersao {
  id: number | string;
  versao: number;
  status_regra: StatusRegra;
  criado_em: string;
  criado_por?: string | null;
  motivo?: string | null;
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
  codemp?: number | null;
  modsis?: string | null;
  idereg?: string | null;
  regra_anterior?: number | null;
  regra_nova?: number | null;
  situacao_anterior?: SituacaoIdentificador | null;
  situacao_nova?: SituacaoIdentificador | null;
  resultado?: 'sucesso' | 'erro' | string;
  detalhes?: Record<string, any>;
  motivo?: string | null;
}

export interface DashboardResumo {
  total_regras: number;
  rascunho: number;
  em_revisao: number;
  aprovadas: number;
  exportadas?: number;
  identificadores_ativos: number;
  identificadores_inativos: number;
  identificadores_teste: number;
  alteradas_hoje?: number;
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

export interface SnapshotEntry {
  id: number | string;
  data: string;
  usuario?: string | null;
  qtde_registros: number;
  arquivo?: string | null;
}

export interface ValidacaoRegra {
  avisos: { nivel: 'info' | 'warning' | 'error'; mensagem: string }[];
}
