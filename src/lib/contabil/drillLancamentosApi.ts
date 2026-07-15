// Cliente do endpoint de lançamentos detalhados da DRE.
// GET /api/contabil/drill-lancamentos?modelo_id=&linha_id=&anomes_ini=&anomes_fim=&limite=
// O backend resolve todas as contas vinculadas à linha e descendentes.
// Frontend NUNCA envia clacta/ctared.

import { contabilApi } from './contabilApi';

export interface DrillLancamentoItem {
  // Identificação
  lancamento?: string | number | null;
  numero?: string | number | null;
  lote?: string | number | null;
  data?: string | null;
  // Empresa / filial
  codemp?: number | string | null;
  codfil?: number | string | null;
  // Lado do lançamento
  debcre?: 'D' | 'C' | string | null;
  debito?: number | null;
  credito?: number | null;
  // Contas
  conta_debito?: string | null;
  conta_credito?: string | null;
  ctared?: string | number | null;
  clacta?: string | null;
  conta_descricao?: string | null;
  // Centro de custo
  codccu?: string | null;
  desccu?: string | null;
  ccu?: string | null;
  // Documento / origem
  documento?: string | null;
  origem_codigo?: string | null;
  origem_descricao?: string | null;
  // Usuários
  usuario_origem?: string | null;
  usuario_lancamento?: string | null;
  // Valores
  valor?: number | null;
  valor_integral?: number | null;
  valor_rateado?: number | null;
  mov_debito?: number | null;
  mov_credito?: number | null;
  saldo_anterior?: number | null;
  saldo?: number | null;
  // Histórico
  historico?: string | null;
  observacao?: string | null;
  [k: string]: any;
}

export interface DrillLancamentosParams {
  modelo_id: string;
  linha_id: string;
  anomes_ini: number | string;
  anomes_fim: number | string;
  codemp?: number | null;
  codfil?: number | null;
  unidade?: string | null;
  centro_custo?: string | null;
  limite?: number;
}

export interface DrillLancamentosResponse {
  itens: DrillLancamentoItem[];
  truncado: boolean;
  qtd_total: number;
  total_valor?: number | null;
}

export async function fetchDrillLancamentos(
  params: DrillLancamentosParams,
): Promise<DrillLancamentosResponse> {
  const query: Record<string, any> = {
    modelo_id: params.modelo_id,
    linha_id: params.linha_id,
    anomes_ini: params.anomes_ini,
    anomes_fim: params.anomes_fim,
    limite: params.limite ?? 5000,
  };
  if (params.codemp != null) query.codemp = params.codemp;
  if (params.codfil != null) query.codfil = params.codfil;
  if (params.unidade) query.unidade = params.unidade;
  if (params.centro_custo) query.centro_custo = params.centro_custo;

  const data = await contabilApi.get<any>('/api/contabil/drill-lancamentos', query);
  const itens = Array.isArray(data?.itens)
    ? data.itens
    : Array.isArray(data?.rows)
      ? data.rows
      : Array.isArray(data?.dados)
        ? data.dados
        : Array.isArray(data)
          ? data
          : [];

  return {
    itens,
    truncado: Boolean(data?.truncado),
    qtd_total:
      typeof data?.qtd_total === 'number'
        ? data.qtd_total
        : typeof data?.total === 'number'
          ? data.total
          : itens.length,
    total_valor:
      typeof data?.total_valor === 'number' ? data.total_valor : null,
  };
}
