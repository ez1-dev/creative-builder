// Tipos do módulo Requisição de Materiais.
// Fonte oficial: ERP Senior via FastAPI :8070. Não recalcular disponibilidades aqui.

export type StatusRequisicao =
  | 'RASCUNHO'
  | 'AGUARDANDO_APROVACAO'
  | 'APROVADA'
  | 'REJEITADA'
  | 'DEVOLVIDA_AJUSTE'
  | 'AGUARDANDO_ALMOXARIFADO'
  | 'EM_SEPARACAO'
  | 'SEPARADA'
  | 'PARCIALMENTE_ATENDIDA'
  | 'AGUARDANDO_SALDO'
  | 'AGUARDANDO_COMPRA'
  | 'ATENDIDA'
  | 'CANCELADA'
  | 'ESTORNADA'
  | 'NAO_ENVIADA'
  | 'PENDENTE_INTEGRACAO'
  | 'PROCESSANDO'
  | 'INTEGRADA'
  | 'ERRO_INTEGRACAO';

/** Status dos serviços SID retornado por GET /api/requisicoes/sid/ping. */
export interface SidServicoStatus {
  url: string;
  operacao: string;
  wsdl_ok: boolean;
  erro?: string | null;
}

export interface SidStatusResponse {
  sid_habilitado: boolean;
  ger_sid: SidServicoStatus;
  cha_separacao: SidServicoStatus;
  proximo_passo?: string;
}

/** Resposta do POST /api/requisicoes/sid/requisitar. */
export interface SidRequisitarResponse {
  numeme: number | null;
  seqeme?: number | null;
  resultado?: string | null;
  acao?: string | null;
  aviso_parse?: string | null;
}

/** Resposta do POST /api/requisicoes/sid/baixar-componentes. */
export interface SidBaixaComponenteResponse {
  resultado?: string | null;
  acao?: string | null;
  aviso_parse?: string | null;
}

/** Item de entrada do POST /api/requisicoes/sid/requisitar-lote. */
export interface SidRequisitarLoteItemInput {
  codpro: string;
  codder?: string | null;
  qtdeme: number;
  codtns: string;
  coddep: number | string;
  ccures?: string | null;
  obseme?: string | null;
}

/** Item de resposta do POST /api/requisicoes/sid/requisitar-lote. */
export interface SidRequisitarLoteItemResult {
  indice: number;
  codpro: string;
  ok: boolean;
  numeme?: number | null;
  seqeme?: number | null;
  erro?: string | null;
}

/** Resposta do POST /api/requisicoes/sid/requisitar-lote. */
export interface SidRequisitarLoteResponse {
  numeme: number | null;
  numemes: number[];
  documento_unico: boolean;
  total_solicitados: number;
  criados: number;
  falhas: number;
  itens: SidRequisitarLoteItemResult[];
}





export type TipoRequisicao =
  | 'OP'
  | 'CONSUMO'
  | 'TRANSFERENCIA'
  | 'DEVOLUCAO'
  | 'EMERGENCIAL';

export type PrioridadeRequisicao = 'BAIXA' | 'NORMAL' | 'ALTA' | 'URGENTE';

export interface RequisicaoListItem {
  id: string;
  numero: string;
  tipo: TipoRequisicao;
  solicitante: string | null;
  setor: string | null;
  op: string | null;
  qtd_itens: number;
  prioridade: PrioridadeRequisicao;
  data_necessaria: string | null;
  situacao: StatusRequisicao;
  percentual_atendido: number;
  atualizado_em: string | null;
}

export interface RequisicaoFiltros {
  numero?: string;
  tipo?: TipoRequisicao;
  situacao?: StatusRequisicao;
  codemp?: number;
  codfil?: number;
  setor?: string;
  solicitante?: string;
  aprovador?: string;
  op?: string;
  produto?: string;
  familia?: string;
  projeto?: string;
  centro_custo?: string;
  deposito?: number;
  prioridade?: PrioridadeRequisicao;
  data_solicitacao_ini?: string;
  data_solicitacao_fim?: string;
  data_necessaria_ini?: string;
  data_necessaria_fim?: string;
  falta_estoque?: boolean;
  erro_integracao?: boolean;
}

export interface RequisicaoKpis {
  aguardando_aprovacao: number;
  aprovadas: number;
  aguardando_separacao: number;
  em_separacao: number;
  parcialmente_atendidas: number;
  aguardando_saldo: number;
  atrasadas: number;
  atendidas_periodo: number;
  emergenciais: number;
  erro_integracao: number;
}

export interface ComponenteOP {
  seqcmp: number;
  codetg: string | number;
  codcmp: string;         // código do COMPONENTE (não usar CODPRO)
  componente?: string | null;   // código limpo (novo payload)
  codder: string | null;
  derivacao?: string | null;    // alias limpo de codder
  descricao: string | null;
  unidade: string | null;
  deposito: number | null;      // vem null quando precisa_deposito=true
  precisa_deposito?: boolean;
  transacao?: number | null;
  quantidade_prevista: number;
  quantidade_utilizada: number;
  quantidade_requisitada: number;
  quantidade_transferida: number;
  quantidade_disponivel: number;   // vem calculada da API — não recalcular
  qtd_disponivel_requisitar?: number;
  saldo_fisico: number | null;
  saldo_reservado: number | null;
  saldo_disponivel: number | null;
}

export interface OpConsultaResponse {
  codemp: number;
  codfil: number;
  codori: string;
  numorp: string;
  produto_final: string | null;
  descricao: string | null;
  codder: string | null;
  projeto: string | null;
  situacao: string;               // SITORP
  situacao_desc?: string | null;  // Descrição por extenso (Liberada/Aberta/Finalizada/…)
  quantidade_prevista: number;
  quantidade_produzida: number;
  saldo?: number | null;
  centro_custo?: string | null;
  codfam?: string | null;
  numped?: number | string | null;
  projeto_obra?: string | null;
  derivacao?: string | null;
  pode_requisitar: boolean;
  motivo_bloqueio?: string | null;
  componentes: ComponenteOP[];
  total_componentes?: number;
}

export type TipoAtendimentoOP = 'TRANSFERIR' | 'BAIXAR_DIRETO';

export interface ItemRequisicao {
  seq: number;
  codemp?: number;
  codfil?: number;
  codori?: string;
  numorp?: string;
  codetg?: string | number;
  seqcmp?: number;
  codcmp: string;
  codder?: string | null;
  descricao?: string | null;
  unidade?: string | null;
  quantidade: number;
  qtd_aprovada?: number;
  qtd_separada?: number;
  qtd_atendida?: number;
  qtd_pendente?: number;
  deposito_origem?: number | null;
  deposito_destino?: number | null;
  lote?: string | null;
  serie?: string | null;
  centro_custo?: string | null;
  projeto?: string | null;
  fase?: string | null;
  observacao?: string | null;
  situacao: StatusRequisicao;
  tipo_atendimento_op?: TipoAtendimentoOP;
  justificativa_excesso?: string | null;
}

export interface Requisicao {
  id: string;
  numero: string;
  tipo: TipoRequisicao;
  situacao: StatusRequisicao;
  codemp: number;
  codfil: number;
  setor: string | null;
  solicitante: string | null;
  aprovador: string | null;
  prioridade: PrioridadeRequisicao;
  data_solicitacao: string | null;
  data_necessaria: string | null;
  centro_custo?: string | null;
  projeto?: string | null;
  fase?: string | null;
  justificativa?: string | null;
  observacoes?: string | null;
  anexos?: string[];
  itens: ItemRequisicao[];
  percentual_atendido: number;
  criado_em: string;
  atualizado_em: string;
}

export interface FilaAlmoxItem {
  requisicao_id: string;
  requisicao_numero: string;
  item_seq: number;
  tipo: TipoRequisicao;
  codcmp: string;
  descricao: string | null;
  op: string | null;
  centro_custo: string | null;
  qtd_solicitada: number;
  qtd_aprovada: number;
  qtd_separada: number;
  qtd_atendida: number;
  qtd_pendente: number;
  saldo_fisico: number | null;
  saldo_reservado: number | null;
  saldo_disponivel: number | null;
  deposito_origem: number | null;
  deposito_destino: number | null;
  lote: string | null;
  endereco: string | null;
  prioridade: PrioridadeRequisicao;
  prazo: string | null;
  separacao_por?: string | null;      // lock: usuário que assumiu
  separacao_desde?: string | null;
}

export interface HistoricoEvento {
  id: string;
  data: string;
  usuario: string | null;
  acao: string;
  status_anterior: StatusRequisicao | null;
  status_novo: StatusRequisicao | null;
  quantidade?: number | null;
  observacao?: string | null;
  movimento_senior?: string | null;
  mensagem_integracao?: string | null;
}

export interface ConfigRequisicoes {
  tipos_habilitados: TipoRequisicao[];
  depositos_permitidos: number[];
  exige_aprovacao: boolean;
  limite_aprovacao_automatica: number | null;
  tolerancia_op_pct: number;
  sla_horas: number | null;
  familias_bloqueadas?: string[];
  observacoes?: string;
}

export interface ApiListResponse<T> {
  items: T[];
  total: number;
  page?: number;
  page_size?: number;
}
