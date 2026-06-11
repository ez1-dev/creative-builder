import { api } from '@/lib/api';
import type { OpImpressao } from './opImpressao';

export interface ImpressaoOpLoteParams {
  cod_emp: string | number;
  cod_ori?: string;
  num_ped?: string;
  rel_prd?: string;
  sit_orp?: string;
  cod_cre?: string;
  cod_etg?: string;
  cod_pro?: string;
  listar_componentes?: 'S' | 'N';
  listar_desenho?: 'S' | 'N';
  incluir_desenhos?: 'S' | 'N';
  quebrar_por_operacao?: 'S' | 'N';
}


export interface ImpressaoOpLoteResponse {
  quantidade_ops: number;
  ordens: OpImpressao[];
}

export async function fetchImpressaoLote(params: ImpressaoOpLoteParams): Promise<ImpressaoOpLoteResponse> {
  const q: Record<string, any> = {
    cod_emp: Number(params.cod_emp),
    listar_componentes: params.listar_componentes || 'S',
    listar_desenho: params.listar_desenho || 'N',
    quebrar_por_operacao: params.quebrar_por_operacao === 'S' ? 'S' : 'N',
  };
  if (params.cod_ori && String(params.cod_ori) !== '100') q.cod_ori = params.cod_ori;
  if (params.num_ped) q.num_ped = params.num_ped;
  if (params.rel_prd) q.rel_prd = params.rel_prd;
  if (params.sit_orp && String(params.sit_orp).toUpperCase() !== 'C') q.sit_orp = params.sit_orp;
  if (params.cod_cre) q.cod_cre = params.cod_cre;
  if (params.cod_etg) q.cod_etg = params.cod_etg;
  if (params.cod_pro) q.cod_pro = params.cod_pro;
  if (params.incluir_desenhos === 'S') {
    q.incluir_desenhos = 'S';
  }




  const res = await api.get<ImpressaoOpLoteResponse>('/api/producao/ordem-producao/impressao/lote', q);
  return {
    quantidade_ops: res?.quantidade_ops ?? (res?.ordens?.length ?? 0),
    ordens: Array.isArray(res?.ordens) ? res.ordens : [],
  };
}
