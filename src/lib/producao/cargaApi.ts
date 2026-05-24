import { api } from '../api';

export type UnidadeNegocio = 'GENIUS' | 'ESTRUTURAL' | 'APOIO' | 'NAO_CLASSIFICADO';
export type TipoRecurso = 'PRODUCAO' | 'TERCEIROS' | 'LOGISTICA' | 'MANUTENCAO';
export type OrigemMapeamento = 'SUPABASE' | 'REGRA_API';

export interface CargaFiltros {
  codemp?: number;
  data_ini?: string;
  data_fim?: string;
  situacoes?: string;
  unidade_negocio?: string;
  tipo_recurso?: string;
  codori?: string;
  codcre?: string;
  codopr?: string;
  codpro?: string;
  considera_carga?: boolean;
}

export interface CargaResumo {
  qtd_ops: number;
  qtd_recursos: number;
  qtd_linhas_operacao: number;
  carga_prevista_min: number;
  carga_prevista_horas: number;
  linhas_sem_mapeamento_supabase: number;
}

export interface CargaCentroRow {
  unidade_negocio: string;
  tipo_recurso: string;
  codccu: string;
  codcre: string;
  descre: string;
  codopr: string;
  descricao_operacao: string;
  qtd_ops: number;
  qtd_prevista: number;
  carga_prevista_min: number;
  carga_prevista_horas: number;
}

export interface CargaCentrosResponse {
  resumo: CargaResumo;
  centros: CargaCentroRow[];
}

export interface CargaDetalheRow {
  unidade_negocio: string;
  tipo_recurso: string;
  codccu: string;
  codcre: string;
  descre: string;
  codori: string;
  numop: string | number;
  codpro: string;
  descricao_produto: string;
  sitop: string;
  data_geracao_op: string | null;
  estagio: string;
  sequencia_roteiro: number | string;
  codopr: string;
  descricao_operacao: string;
  quantidade_prevista: number;
  tempo_unitario_min: number;
  tempo_fixo_min: number;
  tempo_total_previsto_original: number;
  tempo_previsto_min: number;
  tempo_previsto_horas: number;
  origem_mapeamento: OrigemMapeamento | string;
}

export interface CargaDetalheResponse {
  pagina: number;
  tamanho_pagina: number;
  total_registros: number;
  total_paginas: number;
  dados: CargaDetalheRow[];
  resumo?: CargaResumo;
}

export interface OpcoesCarga {
  situacoes?: { value: string; label: string }[];
  unidades_negocio?: string[];
  tipos_recurso?: string[];
  centros_recurso?: { codcre: string; descre: string }[];
  operacoes?: { codopr: string; descricao: string }[];
  origens?: { codori: string; descricao: string }[];
  [key: string]: any;
}

export interface ParametroRecurso {
  id: number;
  codemp: number;
  codcre: string;
  descre: string | null;
  unidade_negocio: string;
  tipo_recurso: string | null;
  codccu_sugerido: string | null;
  considera_carga: boolean;
  ativo: boolean;
  obs: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ParametroRecursoPayload {
  codemp: number;
  codcre: string;
  descre?: string | null;
  unidade_negocio: string;
  tipo_recurso?: string | null;
  codccu_sugerido?: string | null;
  considera_carga: boolean;
  ativo: boolean;
  obs?: string | null;
}

const toParams = (f: CargaFiltros): Record<string, any> => {
  const out: Record<string, any> = { ...f };
  if (typeof f.considera_carga === 'boolean') out.considera_carga = f.considera_carga ? 'true' : 'false';
  return out;
};

export const cargaApi = {
  centros: (f: CargaFiltros) =>
    api.get<CargaCentrosResponse>('/api/producao/carga/centros', toParams(f)),

  detalhe: (f: CargaFiltros & { pagina?: number; tamanho_pagina?: number }) =>
    api.get<CargaDetalheResponse>('/api/producao/carga/detalhe', toParams(f)),

  opcoes: (codemp?: number) =>
    api.get<OpcoesCarga>('/api/producao/carga/opcoes', codemp ? { codemp } : undefined),

  urlExportarCentros: (f: CargaFiltros) =>
    api.getExportUrl('/api/export/producao-carga-centros', toParams(f)),
};
