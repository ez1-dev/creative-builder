import { supabase } from '@/integrations/supabase/client';

export interface ComercialRow {
  id: string;
  id_nf: string | null;
  cd_cliente: string | null;
  cd_estado: string | null;
  cd_prj: string | null;
  ds_abr_prj: string | null;
  cd_fpj: string | null;
  ds_abr_fpj: string | null;
  cd_grupo_cliente: string | null;
  anomes_emissao: string | null;
  mes_emissao: string | null;
  ano_emissao: string | null;
  unidade_negocio: 'GENIUS' | 'ESTRUTURAL ZORTEA' | string;
  qtd_produtos: number;
  vl_bruto: number;
  vl_devolucao: number;
  impostos: number;
  vl_liquido: number;
}

export interface ComercialFiltros {
  anomes_ini?: string;
  anomes_fim?: string;
}

const PAGE = 1000;

export async function fetchComercial(f: ComercialFiltros): Promise<ComercialRow[]> {
  const all: ComercialRow[] = [];
  let from = 0;
  // Paginação manual para superar limite de 1000 do PostgREST.
  // eslint-disable-next-line no-constant-condition
  while (true) {
    let q = supabase
      .from('v_bi_faturamento_comercial')
      .select(
        'id,id_nf,cd_cliente,cd_estado,cd_prj,ds_abr_prj,cd_fpj,ds_abr_fpj,cd_grupo_cliente,anomes_emissao,mes_emissao,ano_emissao,unidade_negocio,qtd_produtos,vl_bruto,vl_devolucao,impostos,vl_liquido',
      )
      .order('anomes_emissao', { ascending: true })
      .range(from, from + PAGE - 1);
    if (f.anomes_ini) q = q.gte('anomes_emissao', f.anomes_ini);
    if (f.anomes_fim) q = q.lte('anomes_emissao', f.anomes_fim);
    const { data, error } = await q;
    if (error) throw error;
    const rows = (data ?? []) as ComercialRow[];
    all.push(...rows);
    if (rows.length < PAGE) break;
    from += PAGE;
    if (from > 200_000) break; // proteção
  }
  return all;
}
