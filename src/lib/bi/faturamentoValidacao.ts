import { api } from '@/lib/api';

export interface FaturamentoValidacaoFiltros {
  anomes_ini?: string;
  anomes_fim?: string;
  cd_tp_movimento?: string;
  cd_origem?: string;
  cd_empresa?: string;
  cd_filial?: string;
  cd_tns?: string;
  cd_centro_custos_3?: string;
  cd_nf?: string;
  fonte_acao?: string;
}


export interface ResumoResponse {
  qtd_linhas: number;
  vl_bruto: number;
  vl_total: number;
  vl_devolucao: number;
  vl_icms: number;
  vl_pis: number;
  vl_cofins: number;
}

export interface PorMovimentoRow {
  anomes_emissao: string | null;
  fonte_acao: string | null;
  cd_tp_movimento: string | null;
  cd_origem: string | null;
  qtd_linhas: number;
  vl_bruto: number;
  vl_total: number;
  vl_devolucao: number;
  vl_icms: number;
  vl_pis: number;
  vl_cofins: number;
}


export interface PorTnsRow {
  cd_tns: string | null;
  cd_natureza: string | null;
  qtd_linhas: number;
  vl_total: number;
  vl_devolucao: number;
}

export interface DetalheRow {
  cd_tp_movimento: string | null;
  cd_origem: string | null;
  cd_empresa: string | null;
  cd_filial: string | null;
  cd_nf: string | null;
  cd_serie: string | null;
  dt_emissao: string | null;
  anomes_emissao: string | null;
  cd_tns: string | null;
  cd_cliente: string | null;
  cd_centro_custos_3: string | null;
  vl_bruto: number;
  vl_total: number;
  vl_devolucao: number;
  created_at: string | null;
}

export interface DetalhesResponse {
  rows: DetalheRow[];
  page: number;
  page_size: number;
  total: number;
}

const toParams = (f: FaturamentoValidacaoFiltros) => ({
  anomes_ini: f.anomes_ini || undefined,
  anomes_fim: f.anomes_fim || undefined,
  cd_tp_movimento: f.cd_tp_movimento || undefined,
  cd_origem: f.cd_origem || undefined,
  cd_empresa: f.cd_empresa || undefined,
  cd_filial: f.cd_filial || undefined,
  cd_tns: f.cd_tns || undefined,
  cd_centro_custos_3: f.cd_centro_custos_3 || undefined,
  cd_nf: f.cd_nf || undefined,
});

export const getResumo = (f: FaturamentoValidacaoFiltros) =>
  api.get<ResumoResponse>('/api/bi/faturamento/resumo', toParams(f));

export const getPorMovimento = (f: FaturamentoValidacaoFiltros) =>
  api.get<PorMovimentoRow[]>('/api/bi/faturamento/por-movimento', toParams(f));

export const getPorTns = (f: FaturamentoValidacaoFiltros) =>
  api.get<PorTnsRow[]>('/api/bi/faturamento/por-tns', toParams(f));

export const getDetalhes = (
  f: FaturamentoValidacaoFiltros,
  page: number,
  page_size: number,
) =>
  api.get<DetalhesResponse>('/api/bi/faturamento/detalhes', {
    ...toParams(f),
    page,
    page_size,
  });
