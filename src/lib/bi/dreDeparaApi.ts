import { supabase } from '@/integrations/supabase/client';
import { CENTRO_CUSTOS_TODAS } from './dreDepara';

export interface DreDeParaRegra {
  id: string;
  cd_conta_contabil: string;
  cd_centro_custos: string;
  cd_mascara_dre: string;
  descricao: string | null;
  ativo: boolean;
  criado_por: string | null;
  created_at: string;
  updated_at: string;
}

export interface DreDeParaInput {
  cd_conta_contabil: string;
  cd_centro_custos: string;
  cd_mascara_dre: string;
  descricao?: string | null;
  ativo?: boolean;
}

export interface DreDeParaFiltros {
  conta?: string;
  centro?: string;
  mascara?: string;
  somenteAtivos?: boolean;
}

function normalize(v: string): string {
  return v.trim().toUpperCase();
}

export async function listarRegras(filtros: DreDeParaFiltros = {}): Promise<DreDeParaRegra[]> {
  let q = supabase.from('bi_dre_depara_conta_ccu').select('*');
  if (filtros.conta) q = q.ilike('cd_conta_contabil', `%${filtros.conta.trim()}%`);
  if (filtros.centro) q = q.ilike('cd_centro_custos', `%${filtros.centro.trim()}%`);
  if (filtros.mascara) q = q.eq('cd_mascara_dre', filtros.mascara);
  if (filtros.somenteAtivos) q = q.eq('ativo', true);
  const { data, error } = await q.order('cd_conta_contabil', { ascending: true });
  if (error) throw error;
  // Específicas antes de TODAS
  return (data ?? []).sort((a, b) => {
    const aGeral = a.cd_centro_custos === CENTRO_CUSTOS_TODAS ? 1 : 0;
    const bGeral = b.cd_centro_custos === CENTRO_CUSTOS_TODAS ? 1 : 0;
    if (aGeral !== bGeral) return aGeral - bGeral;
    return a.cd_conta_contabil.localeCompare(b.cd_conta_contabil);
  }) as DreDeParaRegra[];
}

export async function criarRegra(input: DreDeParaInput): Promise<DreDeParaRegra> {
  const { data: userResp } = await supabase.auth.getUser();
  const uid = userResp.user?.id ?? null;
  const payload = {
    cd_conta_contabil: normalize(input.cd_conta_contabil),
    cd_centro_custos: normalize(input.cd_centro_custos),
    cd_mascara_dre: input.cd_mascara_dre,
    descricao: input.descricao ?? null,
    ativo: input.ativo ?? true,
    criado_por: uid,
  };
  const { data, error } = await supabase
    .from('bi_dre_depara_conta_ccu')
    .insert([payload])
    .select()
    .single();
  if (error) throw error;
  return data as DreDeParaRegra;
}

export async function atualizarRegra(
  id: string,
  patch: Partial<DreDeParaInput>,
): Promise<DreDeParaRegra> {
  const update: Partial<DreDeParaInput> = { ...patch };
  if (patch.cd_conta_contabil) update.cd_conta_contabil = normalize(patch.cd_conta_contabil);
  if (patch.cd_centro_custos) update.cd_centro_custos = normalize(patch.cd_centro_custos);
  const { data, error } = await supabase
    .from('bi_dre_depara_conta_ccu')
    .update(update)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as DreDeParaRegra;
}

export async function alternarAtivo(id: string, ativo: boolean): Promise<void> {
  const { error } = await supabase
    .from('bi_dre_depara_conta_ccu')
    .update({ ativo })
    .eq('id', id);
  if (error) throw error;
}

export async function excluirRegra(id: string): Promise<void> {
  const { error } = await supabase.from('bi_dre_depara_conta_ccu').delete().eq('id', id);
  if (error) throw error;
}
