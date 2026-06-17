import { getApiUrl } from '@/lib/api';
import { supabase } from '@/integrations/supabase/client';

export type DreClassificacaoEscopo =
  | 'LANCAMENTO'
  | 'DOCUMENTO'
  | 'COMBINACAO'
  | 'REGRA_DEFINITIVA';

export type DreClassificacaoStatus =
  | 'ATIVO'
  | 'PENDENTE_APROVACAO'
  | 'APROVADO'
  | 'REJEITADO'
  | 'INATIVO';

export const DRE_LINHAS_DESTINO = [
  'NAO_CLASSIFICADO',
  'RECEITA_BRUTA',
  'DEDUCOES_VENDAS',
  'CUSTO_PRODUCAO_VENDA',
  'CUSTO_MEX',
  'DESPESAS_COMERCIAIS',
  'DESPESAS_ADMINISTRATIVAS',
  'RECEITAS_FINANCEIRAS',
  'DESPESAS_FINANCEIRAS',
  'RECEITAS_NAO_OPERACIONAIS',
  'DESPESAS_NAO_OPERACIONAIS',
  'FAZENDA',
  'DEPRECIACAO',
] as const;

export const DRE_CLASSIFICACAO_ESCOPOS: Array<{
  value: DreClassificacaoEscopo;
  label: string;
  descricao: string;
}> = [
  { value: 'LANCAMENTO', label: 'Apenas este lançamento', descricao: 'Reclassifica somente o lançamento atual. Escopo mínimo.' },
  { value: 'DOCUMENTO', label: 'Todo o documento', descricao: 'Reclassifica todos os lançamentos do mesmo documento.' },
  { value: 'COMBINACAO', label: 'Combinação TNS+Conta+Centro+Origem', descricao: 'Reclassifica lançamentos com a mesma combinação de chaves.' },
  { value: 'REGRA_DEFINITIVA', label: 'Regra definitiva (requer aprovação)', descricao: 'Cria uma regra ampla que será aplicada a todos os lançamentos futuros que casarem com a combinação. Vai para fila de aprovação.' },
];

export interface DreClassificarLancamentoBase {
  anomes_referente?: number | null;
  nr_lancamento?: string | null;
  nr_lote?: string | null;
  nr_documento?: string | null;
  cd_mascara?: string | null;
  cd_conta_contabil?: string | null;
  cd_centro_custos?: string | null;
  cd_centro_custos_3?: string | null;
  cd_origem_lcto?: string | null;
  cd_tns?: string | null;
  ds_historico?: string | null;
  vl_realizado?: number | null;
  codigo_linha_origem: string;
  codigo_linha_destino: string;
}

export interface DreClassificarPayload extends DreClassificarLancamentoBase {
  escopo: DreClassificacaoEscopo;
  motivo: string;
}

export interface DreClassificarSimulacao {
  linha_origem: { codigo: string; antes: number; depois: number };
  linha_destino: { codigo: string; antes: number; depois: number };
  qtd_lancamentos_afetados: number;
}

function buildHeaders(): HeadersInit {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('erp_token') : null;
  return {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const url = `${getApiUrl()}${path}`;
  const resp = await fetch(url, {
    method: 'POST',
    credentials: 'include',
    headers: buildHeaders(),
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    let detail = `HTTP ${resp.status}`;
    try {
      const j = await resp.json();
      if (j?.detail) detail = j.detail;
    } catch { /* ignore */ }
    throw new Error(detail);
  }
  return (await resp.json()) as T;
}

export function simularClassificacao(payload: DreClassificarPayload & {
  ano: number; mes_ini: string; mes_fim: string; unidade?: string;
}): Promise<DreClassificarSimulacao> {
  return postJson<DreClassificarSimulacao>(
    '/api/bi/contabilidade/dre-classificar-simular',
    payload,
  );
}

export async function classificarLancamento(payload: DreClassificarPayload): Promise<{ id?: string; status: DreClassificacaoStatus }> {
  // Tenta usar o backend FastAPI; se falhar (404/timeout), grava direto no Cloud
  // como fallback para que a feature não fique bloqueada por deploy.
  try {
    return await postJson<{ id?: string; status: DreClassificacaoStatus }>(
      '/api/bi/contabilidade/dre-classificar-lancamento',
      payload,
    );
  } catch (e: any) {
    const msg = String(e?.message ?? e);
    if (!/HTTP 404|HTTP 502|Failed to fetch|NetworkError/i.test(msg)) {
      throw e;
    }
    return await classificarLancamentoLocal(payload);
  }
}

/** Fallback direto na tabela Cloud quando o endpoint FastAPI ainda não existe. */
async function classificarLancamentoLocal(payload: DreClassificarPayload) {
  const { data: userResp } = await supabase.auth.getUser();
  const uid = userResp.user?.id ?? null;
  const status: DreClassificacaoStatus =
    payload.escopo === 'REGRA_DEFINITIVA' ? 'PENDENTE_APROVACAO' : 'ATIVO';
  const { data, error } = await supabase
    .from('bi_dre_classificacoes')
    .insert([{
      escopo: payload.escopo,
      status,
      nr_lancamento: payload.nr_lancamento ?? null,
      nr_lote: payload.nr_lote ?? null,
      nr_documento: payload.nr_documento ?? null,
      cd_mascara: payload.cd_mascara ?? null,
      cd_conta_contabil: payload.cd_conta_contabil ?? null,
      cd_centro_custos: payload.cd_centro_custos ?? null,
      cd_centro_custos_3: payload.cd_centro_custos_3 ?? null,
      cd_origem_lcto: payload.cd_origem_lcto ?? null,
      cd_tns: payload.cd_tns ?? null,
      ds_historico: payload.ds_historico ?? null,
      anomes_referente: payload.anomes_referente ?? null,
      vl_realizado: payload.vl_realizado ?? null,
      codigo_linha_origem: payload.codigo_linha_origem,
      codigo_linha_destino: payload.codigo_linha_destino,
      motivo: payload.motivo,
      criado_por: uid,
    }])
    .select('id, status')
    .single();
  if (error) throw new Error(error.message);
  return { id: data.id, status: data.status as DreClassificacaoStatus };
}

export interface DreClassificacao extends DreClassificarLancamentoBase {
  id: string;
  escopo: DreClassificacaoEscopo;
  status: DreClassificacaoStatus;
  motivo: string;
  anomes_referente: number | null;
  vl_realizado: number | null;
  criado_por: string | null;
  aprovado_por: string | null;
  aprovado_em: string | null;
  created_at: string;
  updated_at: string;
}

export async function listarClassificacoes(filtros: {
  status?: DreClassificacaoStatus;
  escopo?: DreClassificacaoEscopo;
} = {}): Promise<DreClassificacao[]> {
  let q = supabase.from('bi_dre_classificacoes').select('*').order('created_at', { ascending: false });
  if (filtros.status) q = q.eq('status', filtros.status);
  if (filtros.escopo) q = q.eq('escopo', filtros.escopo);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []) as DreClassificacao[];
}

export async function atualizarStatusClassificacao(
  id: string,
  status: DreClassificacaoStatus,
): Promise<void> {
  const { data: userResp } = await supabase.auth.getUser();
  const uid = userResp.user?.id ?? null;
  const patch: Record<string, any> = { status };
  if (status === 'APROVADO' || status === 'REJEITADO') {
    patch.aprovado_por = uid;
    patch.aprovado_em = new Date().toISOString();
  }
  const { error } = await supabase
    .from('bi_dre_classificacoes')
    .update(patch)
    .eq('id', id);
  if (error) throw new Error(error.message);
}
