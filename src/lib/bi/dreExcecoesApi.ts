import { supabase } from '@/integrations/supabase/client';

export interface DreExcecaoInput {
  nr_lancamento: string;
  nr_lote?: string | null;
  nr_documento?: string | null;
  cd_conta?: string | null;
  cd_cencus?: string | null;
  cd_origem?: string | null;
  cd_transacao?: string | null;
  ds_historico?: string | null;
  anomes_referente?: number | null;
  vl_realizado?: number | null;
  codigo_linha_origem: string;
  codigo_linha_destino: string;
  motivo: string;
}

export interface DreExcecao extends DreExcecaoInput {
  id: string;
  ativo: boolean;
  criado_por: string | null;
  criado_em: string;
  atualizado_em: string;
}

export async function listarExcecoes(filtros: {
  ativo?: boolean;
  codigo_linha_origem?: string;
  codigo_linha_destino?: string;
  anomes_ini?: number;
  anomes_fim?: number;
} = {}): Promise<DreExcecao[]> {
  let q = supabase.from('bi_dre_excecoes').select('*').order('criado_em', { ascending: false });
  if (filtros.ativo !== undefined) q = q.eq('ativo', filtros.ativo);
  if (filtros.codigo_linha_origem) q = q.eq('codigo_linha_origem', filtros.codigo_linha_origem);
  if (filtros.codigo_linha_destino) q = q.eq('codigo_linha_destino', filtros.codigo_linha_destino);
  if (filtros.anomes_ini) q = q.gte('anomes_referente', filtros.anomes_ini);
  if (filtros.anomes_fim) q = q.lte('anomes_referente', filtros.anomes_fim);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as DreExcecao[];
}

export async function criarExcecao(payload: DreExcecaoInput): Promise<DreExcecao> {
  const { data: userResp } = await supabase.auth.getUser();
  const uid = userResp.user?.id ?? null;
  const { data, error } = await supabase
    .from('bi_dre_excecoes')
    .insert([{ ...payload, criado_por: uid }])
    .select()
    .single();
  if (error) throw error;
  return data as DreExcecao;
}

export async function atualizarExcecao(
  id: string,
  patch: Partial<DreExcecaoInput> & { ativo?: boolean },
): Promise<DreExcecao> {
  const { data, error } = await supabase
    .from('bi_dre_excecoes')
    .update(patch)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as DreExcecao;
}

export async function excluirExcecao(id: string): Promise<void> {
  const { error } = await supabase.from('bi_dre_excecoes').delete().eq('id', id);
  if (error) throw error;
}
