// Mocks do módulo Requisição de Materiais.
// SOMENTE usados quando VITE_USE_REQUISICOES_MOCK === 'true'.
// NUNCA usados como fallback silencioso quando a API está offline.

import type {
  ApiListResponse,
  ConfigRequisicoes,
  FilaAlmoxItem,
  HistoricoEvento,
  OpConsultaResponse,
  Requisicao,
  RequisicaoKpis,
  RequisicaoListItem,
} from '@/types/requisicoes';

const now = () => new Date().toISOString();

const REQ_LIST: RequisicaoListItem[] = [
  {
    id: 'REQ-000001',
    numero: '000001',
    tipo: 'OP',
    solicitante: 'MARCOS.PCP',
    setor: 'PCP',
    op: '100/65958',
    qtd_itens: 4,
    prioridade: 'NORMAL',
    data_necessaria: new Date(Date.now() + 86_400_000).toISOString(),
    situacao: 'AGUARDANDO_ALMOXARIFADO',
    percentual_atendido: 0,
    atualizado_em: now(),
  },
  {
    id: 'REQ-000002',
    numero: '000002',
    tipo: 'CONSUMO',
    solicitante: 'JOAO.MANUT',
    setor: 'Manutenção',
    op: null,
    qtd_itens: 2,
    prioridade: 'ALTA',
    data_necessaria: new Date(Date.now() + 3_600_000).toISOString(),
    situacao: 'AGUARDANDO_APROVACAO',
    percentual_atendido: 0,
    atualizado_em: now(),
  },
];

export const requisicoesMock = {
  async listar(_filtros?: unknown): Promise<ApiListResponse<RequisicaoListItem>> {
    return { items: REQ_LIST, total: REQ_LIST.length };
  },
  async kpis(): Promise<RequisicaoKpis> {
    return {
      aguardando_aprovacao: 1,
      aprovadas: 0,
      aguardando_separacao: 1,
      em_separacao: 0,
      parcialmente_atendidas: 0,
      aguardando_saldo: 0,
      atrasadas: 0,
      atendidas_periodo: 0,
      emergenciais: 0,
      erro_integracao: 0,
    };
  },
  async detalhe(id: string): Promise<Requisicao> {
    return {
      id, numero: id.replace('REQ-', ''), tipo: 'OP', situacao: 'RASCUNHO',
      codemp: 1, codfil: 1, setor: 'PCP', solicitante: 'MOCK', aprovador: null,
      prioridade: 'NORMAL', data_solicitacao: now(), data_necessaria: null,
      itens: [], percentual_atendido: 0, criado_em: now(), atualizado_em: now(),
    };
  },
  async historico(_id: string): Promise<HistoricoEvento[]> { return []; },
  async criar(payload: Partial<Requisicao>): Promise<Requisicao> {
    return { ...(await this.detalhe('REQ-000099')), ...payload } as Requisicao;
  },
  async atualizar(id: string, payload: Partial<Requisicao>): Promise<Requisicao> {
    return { ...(await this.detalhe(id)), ...payload } as Requisicao;
  },
  async consultarOp(codori: string, numorp: string): Promise<OpConsultaResponse> {
    return {
      codemp: 1, codfil: 1, codori, numorp,
      produto_final: 'PROD-DEMO', descricao: 'Produto demonstração', codder: null,
      projeto: null, situacao: 'L', quantidade_prevista: 10, quantidade_produzida: 0,
      pode_requisitar: true, componentes: [
        {
          seqcmp: 1, codetg: 10, codcmp: 'CHA022', codder: null,
          descricao: 'Chapa 022', unidade: 'KG',
          deposito: 1, quantidade_prevista: 117.2,
          quantidade_utilizada: 0, quantidade_requisitada: 0, quantidade_transferida: 0,
          quantidade_disponivel: 117.2, saldo_fisico: 500, saldo_reservado: 0, saldo_disponivel: 500,
        },
      ],
    };
  },
  async filaAlmox(): Promise<FilaAlmoxItem[]> { return []; },
  async agrupadas(): Promise<unknown[]> { return []; },
  async configuracoes(): Promise<ConfigRequisicoes> {
    return {
      tipos_habilitados: ['OP', 'CONSUMO', 'TRANSFERENCIA', 'DEVOLUCAO', 'EMERGENCIAL'],
      depositos_permitidos: [1, 10, 11, 12, 21, 23, 66],
      exige_aprovacao: true, limite_aprovacao_automatica: null,
      tolerancia_op_pct: 5, sla_horas: 24,
    };
  },
};
