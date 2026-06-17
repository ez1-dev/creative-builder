import { supabase } from '@/integrations/supabase/client';
import { api, getApiUrl } from '@/lib/api';
import type {
  DreModelo, DreLinhaConfig, DreLinhaRegra, DreAuditoriaAcao,
  DreTipoRegra, ContaErp, SimulacaoLinha,
} from './dreConfigTypes';

const TBL_MODELOS = 'bi_dre_modelos' as any;
const TBL_ESTRUTURA = 'bi_dre_estrutura_v2' as any;
const TBL_REGRA = 'bi_dre_linha_regra' as any;
const TBL_AUDIT = 'bi_dre_auditoria' as any;

function authHeaders(): Record<string, string> {
  const token = api.getToken();
  const h: Record<string, string> = {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
  };
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

export async function registrarAuditoria(params: {
  entidade: string;
  entidade_id?: string;
  acao: DreAuditoriaAcao;
  payload_antes?: any;
  payload_depois?: any;
}) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    await (supabase as any).from(TBL_AUDIT).insert({
      entidade: params.entidade,
      entidade_id: params.entidade_id ?? null,
      acao: params.acao,
      payload_antes: params.payload_antes ?? null,
      payload_depois: params.payload_depois ?? null,
      usuario_id: user?.id ?? null,
    });
  } catch (e) {
    console.warn('[DRE CONFIG] auditoria falhou', e);
  }
}

// ---------- Modelos ----------
export async function listarModelos(): Promise<DreModelo[]> {
  const { data, error } = await (supabase as any)
    .from(TBL_MODELOS).select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as DreModelo[];
}

export async function obterModeloRascunho(): Promise<DreModelo | null> {
  const { data, error } = await (supabase as any)
    .from(TBL_MODELOS).select('*').eq('status', 'rascunho')
    .order('created_at', { ascending: false }).limit(1).maybeSingle();
  if (error) throw error;
  return (data as DreModelo) ?? null;
}

export async function criarModeloRascunho(nome: string, descricao?: string): Promise<DreModelo> {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await (supabase as any)
    .from(TBL_MODELOS)
    .insert({ nome, descricao: descricao ?? null, status: 'rascunho', versao: 1, created_by: user?.id ?? null })
    .select('*').single();
  if (error) throw error;
  await registrarAuditoria({ entidade: 'modelo', entidade_id: data.id, acao: 'CRIAR', payload_depois: data });
  return data as DreModelo;
}

export async function publicarModelo(modeloId: string): Promise<DreModelo> {
  const { data: { user } } = await supabase.auth.getUser();
  const { data: atual } = await (supabase as any).from(TBL_MODELOS).select('*').eq('id', modeloId).single();
  const { data, error } = await (supabase as any).from(TBL_MODELOS)
    .update({
      status: 'publicado',
      publicado_em: new Date().toISOString(),
      publicado_por: user?.id ?? null,
      versao: (atual?.versao ?? 1) + 0,
    })
    .eq('id', modeloId).select('*').single();
  if (error) throw error;
  await registrarAuditoria({ entidade: 'modelo', entidade_id: modeloId, acao: 'PUBLICAR', payload_antes: atual, payload_depois: data });
  return data as DreModelo;
}

// ---------- Estrutura ----------
export async function listarLinhas(modeloId: string): Promise<DreLinhaConfig[]> {
  const { data, error } = await (supabase as any).from(TBL_ESTRUTURA)
    .select('*').eq('modelo_id', modeloId).order('ordem', { ascending: true });
  if (error) throw error;
  return (data ?? []) as DreLinhaConfig[];
}

export async function upsertLinha(linha: Partial<DreLinhaConfig> & { modelo_id: string; codigo_linha: string; descricao: string }): Promise<DreLinhaConfig> {
  const isUpdate = !!linha.id;
  let antes: any = null;
  if (isUpdate) {
    const { data } = await (supabase as any).from(TBL_ESTRUTURA).select('*').eq('id', linha.id).single();
    antes = data;
  }
  const { data, error } = await (supabase as any).from(TBL_ESTRUTURA)
    .upsert(linha as any).select('*').single();
  if (error) throw error;
  await registrarAuditoria({
    entidade: 'linha', entidade_id: data.id, acao: isUpdate ? 'EDITAR' : 'CRIAR',
    payload_antes: antes, payload_depois: data,
  });
  return data as DreLinhaConfig;
}

export async function inativarLinha(id: string): Promise<void> {
  const { data: antes } = await (supabase as any).from(TBL_ESTRUTURA).select('*').eq('id', id).single();
  const { error } = await (supabase as any).from(TBL_ESTRUTURA).update({ ativo: false }).eq('id', id);
  if (error) throw error;
  await registrarAuditoria({ entidade: 'linha', entidade_id: id, acao: 'INATIVAR', payload_antes: antes });
}

export async function duplicarLinha(id: string): Promise<DreLinhaConfig> {
  const { data: orig, error: e1 } = await (supabase as any).from(TBL_ESTRUTURA).select('*').eq('id', id).single();
  if (e1) throw e1;
  const copia: any = { ...orig };
  delete copia.id; delete copia.created_at; delete copia.updated_at;
  copia.codigo_linha = `${orig.codigo_linha}_COPIA`;
  copia.descricao = `${orig.descricao} (cópia)`;
  copia.ordem = (orig.ordem ?? 0) + 1;
  const { data, error } = await (supabase as any).from(TBL_ESTRUTURA).insert(copia).select('*').single();
  if (error) throw error;
  await registrarAuditoria({ entidade: 'linha', entidade_id: data.id, acao: 'DUPLICAR', payload_antes: orig, payload_depois: data });
  return data as DreLinhaConfig;
}

export async function reordenarLinhas(updates: Array<{ id: string; ordem: number }>): Promise<void> {
  await Promise.all(updates.map(u =>
    (supabase as any).from(TBL_ESTRUTURA).update({ ordem: u.ordem }).eq('id', u.id)
  ));
  await registrarAuditoria({ entidade: 'linha', acao: 'REORDENAR', payload_depois: updates });
}

// ---------- Regras ----------
export async function listarRegras(modeloId: string, codigoLinha: string): Promise<DreLinhaRegra[]> {
  const { data, error } = await (supabase as any).from(TBL_REGRA)
    .select('*').eq('modelo_id', modeloId).eq('codigo_linha', codigoLinha)
    .order('prioridade', { ascending: true });
  if (error) throw error;
  return (data ?? []) as DreLinhaRegra[];
}

export async function upsertRegra(regra: Partial<DreLinhaRegra> & { modelo_id: string; codigo_linha: string; tipo_regra: DreTipoRegra }): Promise<DreLinhaRegra> {
  const isUpdate = !!regra.id;
  let antes: any = null;
  if (isUpdate) {
    const { data } = await (supabase as any).from(TBL_REGRA).select('*').eq('id', regra.id).single();
    antes = data;
  }
  const { data, error } = await (supabase as any).from(TBL_REGRA).upsert(regra as any).select('*').single();
  if (error) throw error;
  await registrarAuditoria({
    entidade: 'regra', entidade_id: data.id, acao: isUpdate ? 'EDITAR' : 'CRIAR',
    payload_antes: antes, payload_depois: data,
  });
  return data as DreLinhaRegra;
}

export async function excluirRegra(id: string): Promise<void> {
  const { data: antes } = await (supabase as any).from(TBL_REGRA).select('*').eq('id', id).single();
  const { error } = await (supabase as any).from(TBL_REGRA).delete().eq('id', id);
  if (error) throw error;
  await registrarAuditoria({ entidade: 'regra', entidade_id: id, acao: 'EXCLUIR', payload_antes: antes });
}

export async function vincularContasComoRegras(params: {
  modelo_id: string;
  codigo_linha: string;
  contas: ContaErp[];
  tipo: 'CONTA_CONTABIL' | 'MASCARA_CONTA';
}): Promise<number> {
  const rows = params.contas.map((c, idx) => ({
    modelo_id: params.modelo_id,
    codigo_linha: params.codigo_linha,
    tipo_regra: params.tipo,
    operador: params.tipo === 'MASCARA_CONTA' ? 'LIKE' : '=',
    valor: params.tipo === 'MASCARA_CONTA' ? c.mascara : c.cd_conta,
    cd_conta_contabil: params.tipo === 'CONTA_CONTABIL' ? c.cd_conta : null,
    cd_mascara: params.tipo === 'MASCARA_CONTA' ? c.mascara : null,
    sinal: 1,
    prioridade: 100 + idx,
    ativo: true,
  }));
  if (rows.length === 0) return 0;
  const { error } = await (supabase as any).from(TBL_REGRA).insert(rows);
  if (error) throw error;
  await registrarAuditoria({
    entidade: 'regra', acao: 'VINCULAR',
    payload_depois: { codigo_linha: params.codigo_linha, tipo: params.tipo, qtd: rows.length },
  });
  return rows.length;
}

// ---------- ERP (FastAPI) ----------
export async function buscarPlanoContas(busca: string, pagina = 1, tamanho = 50): Promise<{ itens: ContaErp[]; total: number }> {
  const url = new URL(`${getApiUrl()}/api/erp/plano-contas`);
  url.searchParams.set('busca', busca ?? '');
  url.searchParams.set('pagina', String(pagina));
  url.searchParams.set('tamanho', String(tamanho));
  console.log('[DRE CONFIG] buscarPlanoContas', url.toString());
  const resp = await fetch(url.toString(), { headers: authHeaders() });
  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`Plano de contas indisponível (HTTP ${resp.status}): ${txt.slice(0, 200)}`);
  }
  const data = await resp.json();
  const itens = Array.isArray(data?.itens) ? data.itens : Array.isArray(data?.dados) ? data.dados : Array.isArray(data) ? data : [];
  return { itens: itens as ContaErp[], total: Number(data?.total ?? itens.length) };
}

export async function simularModelo(params: {
  modelo_id: string;
  ano: number;
  mes_ini: number;
  mes_fim: number;
  unidade?: string | null;
}): Promise<SimulacaoLinha[]> {
  console.log('[DRE CONFIG] simularModelo', params);
  const resp = await fetch(`${getApiUrl()}/api/bi/contabilidade/dre/simular`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(params),
  });
  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`Simulação indisponível (HTTP ${resp.status}): ${txt.slice(0, 300)}`);
  }
  const data = await resp.json();
  const arr = Array.isArray(data?.linhas) ? data.linhas : Array.isArray(data) ? data : [];
  return arr as SimulacaoLinha[];
}
