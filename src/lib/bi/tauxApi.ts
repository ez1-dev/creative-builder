import { api } from '@/lib/api';

export const TAUX_LIST = [
  'TAUX_AGRUPAMENTO',
  'TAUX_CLIENTE',
  'TAUX_EMPRESA',
  'TAUX_FAMILIA_PRODUTO',
  'TAUX_FILIAL',
  'TAUX_FORNECEDOR',
  'TAUX_ORIGEM',
  'TAUX_PRODUTO',
  'TAUX_PRODUTO_DERIVACAO',
  'TAUX_REPRESENTANTE',
  'TAUX_CENTRO_CUSTOS_3',
  'TAUX_PLANO_CONTAS',
  'TAUX_CENTRO_CUSTOS',
  'TAUX_ORIGEM_LCTO',
  'TAUX_USUARIO',
] as const;

export type TauxNome = (typeof TAUX_LIST)[number] | string;

export type TauxStatusValue =
  | 'CONCLUIDO' | 'OK' | 'ERRO' | 'INICIADO' | 'EXECUTANDO' | 'IGNORADA' | string;

export interface TauxStatus {
  taux: string;
  tabela: string;
  total_registros: number | null;
  ultima_sincronizacao: string | null;
  status: TauxStatusValue;
  erro?: string | null;
}

export interface TauxDataResponse {
  data: Record<string, unknown>[];
  total?: number;
  columns?: string[];
}

function pickList(resp: any): any[] | null {
  if (Array.isArray(resp)) return resp;
  if (resp && Array.isArray(resp.data)) return resp.data;
  if (resp && Array.isArray(resp.items)) return resp.items;
  return null;
}

export async function getTauxStatus(): Promise<TauxStatus[]> {
  const resp = await api.get<any>('/api/bi/taux/status');
  return (pickList(resp) ?? []) as TauxStatus[];
}

export async function syncTaux(tabelas?: string[]): Promise<any> {
  return api.post('/api/bi/taux/sync', {
    tabelas: tabelas ?? [],
    acionado_por: 'MANUAL',
  });
}

export async function getTauxData(
  nome: string,
  params: { q?: string; limit?: number; offset?: number } = {},
): Promise<TauxDataResponse> {
  const resp = await api.get<any>(`/api/bi/taux/${encodeURIComponent(nome)}`, {
    q: params.q ?? '',
    limit: params.limit,
    offset: params.offset,
  });
  const list = pickList(resp);
  if (list) {
    return { data: list, total: resp?.total, columns: resp?.columns };
  }
  return { data: [] };
}
