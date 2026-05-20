import { api } from '@/lib/api';
import type { OpImpressao } from './opImpressao';

export interface ImpressaoOpLoteParams {
  cod_emp: string | number;
  cod_ori?: string;
  num_ped?: string;
  rel_prd?: string;
  sit_orp?: string;
  listar_componentes?: 'S' | 'N';
  listar_desenho?: 'S' | 'N';
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
  };
  if (params.cod_ori && String(params.cod_ori) !== '100') q.cod_ori = params.cod_ori;
  if (params.num_ped) q.num_ped = params.num_ped;
  if (params.rel_prd) q.rel_prd = params.rel_prd;
  if (params.sit_orp && String(params.sit_orp).toUpperCase() !== 'C') q.sit_orp = params.sit_orp;

  const res = await api.get<ImpressaoOpLoteResponse>('/api/producao/ordem-producao/impressao/lote', q);
  return {
    quantidade_ops: res?.quantidade_ops ?? (res?.ordens?.length ?? 0),
    ordens: Array.isArray(res?.ordens) ? res.ordens : [],
  };
}
