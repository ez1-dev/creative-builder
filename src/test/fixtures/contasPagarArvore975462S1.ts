import type { LinhaArvoreFinanceira } from '@/lib/treeFinanceiro';

/**
 * Fixtures que reproduzem o contrato do endpoint
 * GET /api/contas-pagar-arvore?numero_titulo=975462S-1
 *
 * - `respostaSemRateios`: estado atual observado em produção (regressão de
 *   backend documentada em docs/backend-contas-centro-custo-projeto.md).
 * - `respostaComRateios`: estado esperado pós-correção do backend (linhas
 *   E075RAT anexadas como filhos do título, possui_filhos=true).
 */

export const ID_TITULO_975462S1 = '1-1-01-975462S-1';

const baseTitulo: LinhaArvoreFinanceira = {
  tipo_linha: 'TITULO',
  id_linha: ID_TITULO_975462S1,
  codigo_pai: null,
  nivel: 0,
  numero_titulo: '975462S-1',
  codigo_fornecedor: 6533,
  nome_fornecedor: 'UNIMED DE SANTOS',
  descricao_resumida: '975462S-1 — UNIMED DE SANTOS',
  codigo_centro_custo: '',
  descricao_centro_custo: '',
  numero_projeto: 0 as any,
  valor_original: 118078.49,
  valor_aberto: 118078.49,
  status_titulo: 'A_VENCER',
  data_vencimento: '2026-05-10',
};

export const respostaSemRateios = {
  total_registros: 1,
  modo_exibicao: 'ARVORE',
  dados: [{ ...baseTitulo, possui_filhos: false }] as LinhaArvoreFinanceira[],
};

export const respostaComRateios = {
  total_registros: 3,
  modo_exibicao: 'ARVORE',
  dados: [
    { ...baseTitulo, possui_filhos: true },
    {
      tipo_linha: 'RATEIO',
      id_linha: `${ID_TITULO_975462S1}-RAT-1`,
      codigo_pai: ID_TITULO_975462S1,
      nivel: 1,
      descricao_resumida: 'Rateio 1',
      codigo_centro_custo: '1.01.001',
      descricao_centro_custo: 'ADMINISTRATIVO',
      numero_projeto: null,
      percentual_rateio: 60,
      valor_rateado: 70847.09,
      origem_rateio: 'E075RAT',
    },
    {
      tipo_linha: 'RATEIO',
      id_linha: `${ID_TITULO_975462S1}-RAT-2`,
      codigo_pai: ID_TITULO_975462S1,
      nivel: 1,
      descricao_resumida: 'Rateio 2',
      codigo_centro_custo: '2.02.010',
      descricao_centro_custo: 'PRODUCAO',
      numero_projeto: null,
      percentual_rateio: 40,
      valor_rateado: 47231.40,
      origem_rateio: 'E075RAT',
    },
  ] as LinhaArvoreFinanceira[],
};
