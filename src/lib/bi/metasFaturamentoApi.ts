import { supabase } from '@/integrations/supabase/client';
import type { UnidadeNegocio } from './comercialApi';

export interface MetaFaturamento {
  id: string;
  anomes_emissao: string;            // 'YYYYMM'
  unidade_negocio: 'GENIUS' | 'ESTRUTURAL ZORTEA';
  vl_meta: number;
  observacao: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export type MetaFaturamentoInput = Pick<
  MetaFaturamento,
  'anomes_emissao' | 'unidade_negocio' | 'vl_meta' | 'observacao' | 'ativo'
>;

export async function listMetas(
  anomesIni?: string,
  anomesFim?: string,
): Promise<MetaFaturamento[]> {
  let q = supabase
    .from('bi_meta_faturamento')
    .select('*')
    .order('anomes_emissao', { ascending: false })
    .order('unidade_negocio', { ascending: true });
  if (anomesIni) q = q.gte('anomes_emissao', anomesIni);
  if (anomesFim) q = q.lte('anomes_emissao', anomesFim);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as MetaFaturamento[];
}

export async function upsertMeta(input: MetaFaturamentoInput): Promise<void> {
  const { error } = await supabase
    .from('bi_meta_faturamento')
    .upsert(input, { onConflict: 'anomes_emissao,unidade_negocio' });
  if (error) throw error;
}

export async function toggleAtivo(id: string, ativo: boolean): Promise<void> {
  const { error } = await supabase
    .from('bi_meta_faturamento')
    .update({ ativo })
    .eq('id', id);
  if (error) throw error;
}

export async function deleteMeta(id: string): Promise<void> {
  const { error } = await supabase
    .from('bi_meta_faturamento')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

/**
 * Soma vl_meta (apenas ativos) para o intervalo + unidade.
 * Retorna null se não houver nenhuma meta cadastrada no período.
 */
export async function fetchMetaCloudTotal(params: {
  anomes_ini: string;
  anomes_fim: string;
  unidade_negocio: UnidadeNegocio;
}): Promise<number | null> {
  let q = supabase
    .from('bi_meta_faturamento')
    .select('vl_meta, unidade_negocio')
    .eq('ativo', true)
    .gte('anomes_emissao', params.anomes_ini)
    .lte('anomes_emissao', params.anomes_fim);

  if (params.unidade_negocio !== 'CONSOLIDADO') {
    q = q.eq('unidade_negocio', params.unidade_negocio);
  }

  const { data, error } = await q;
  if (error) throw error;
  if (!data || data.length === 0) return null;
  return data.reduce((acc, r) => acc + Number(r.vl_meta || 0), 0);
}
