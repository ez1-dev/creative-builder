export type DreModeloStatus = 'rascunho' | 'publicado' | 'arquivado';
export type DreTipoLinha = 'TITULO' | 'ANALITICA' | 'AGRUPADORA' | 'TOTAL' | 'CALCULO';

export const TIPOS_LINHA: DreTipoLinha[] = ['TITULO', 'ANALITICA', 'AGRUPADORA', 'TOTAL', 'CALCULO'];

export type DreTipoRegra =
  | 'CONTA_CONTABIL'
  | 'MASCARA_CONTA'
  | 'CENTRO_CUSTOS'
  | 'CENTRO_CUSTOS_3'
  | 'ORIGEM'
  | 'TRANSACAO'
  | 'HISTORICO'
  | 'COMBINACAO'
  | 'EXCECAO_LANCAMENTO';

export const TIPOS_REGRA: DreTipoRegra[] = [
  'CONTA_CONTABIL', 'MASCARA_CONTA', 'CENTRO_CUSTOS', 'CENTRO_CUSTOS_3',
  'ORIGEM', 'TRANSACAO', 'HISTORICO', 'COMBINACAO', 'EXCECAO_LANCAMENTO',
];

export type DreOperador = '=' | 'LIKE' | 'IN' | '<>';
export const OPERADORES: DreOperador[] = ['=', 'LIKE', 'IN', '<>'];

export type DreAuditoriaAcao =
  | 'CRIAR' | 'EDITAR' | 'INATIVAR' | 'DUPLICAR'
  | 'PUBLICAR' | 'REORDENAR' | 'VINCULAR' | 'EXCLUIR';

export interface DreModelo {
  id: string;
  nome: string;
  descricao: string | null;
  status: DreModeloStatus;
  versao: number;
  publicado_em: string | null;
  publicado_por: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface DreLinhaConfig {
  id: string;
  modelo_id: string;
  ordem: number;
  codigo_linha: string;
  descricao: string;
  nivel: number;
  linha_pai_codigo: string | null;
  tipo_linha: DreTipoLinha;
  formula: string | null;
  ativo: boolean;
  flag_soma: boolean;
  flag_inverte_sinal: boolean;
  flag_exibe_dre: boolean;
  flag_permite_drill: boolean;
  flag_negrito: boolean;
  flag_totalizadora: boolean;
  created_at: string;
  updated_at: string;
}

export interface DreLinhaRegra {
  id: string;
  modelo_id: string;
  codigo_linha: string;
  tipo_regra: DreTipoRegra;
  operador: DreOperador;
  valor: string | null;
  cd_empresa: string | null;
  cd_filial: string | null;
  cd_conta_contabil: string | null;
  cd_mascara: string | null;
  cd_centro_custos: string | null;
  cd_centro_custos_3: string | null;
  cd_origem_lcto: string | null;
  cd_tns: string | null;
  ds_historico: string | null;
  sinal: number;
  prioridade: number;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface ContaErp {
  cd_conta: string;
  cd_reduzido?: string | null;
  mascara: string;
  ds_conta: string;
  analitica?: boolean;
  nivel?: number;
}

export interface SimulacaoLinha {
  codigo_linha: string;
  descricao: string;
  nivel: number;
  tipo_linha: DreTipoLinha;
  realizado: number;
  orcado: number;
  diferenca: number;
  pct: number | null;
  qtd_lancamentos: number;
}

/** Valida codigo_linha técnico: UPPER_SNAKE, sem espaços. */
export function validarCodigoLinha(codigo: string): { ok: boolean; motivo?: string } {
  if (!codigo || !codigo.trim()) return { ok: false, motivo: 'Código da linha é obrigatório' };
  const c = codigo.trim();
  if (/\s/.test(c)) return { ok: false, motivo: 'Código não pode conter espaços' };
  if (!/^[A-Z0-9_]+$/.test(c)) return { ok: false, motivo: 'Use apenas letras maiúsculas, números e _ (ex.: RECEITA_BRUTA)' };
  return { ok: true };
}
