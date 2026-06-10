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

export async function getTauxStatus(): Promise<TauxStatus[]> {
  const resp = await apiClient.request<any>('/api/bi/taux/status');
  if (Array.isArray(resp)) return resp as TauxStatus[];
  if (resp && Array.isArray(resp.data)) return resp.data as TauxStatus[];
  if (resp && Array.isArray(resp.items)) return resp.items as TauxStatus[];
  return [];
}

export async function syncTaux(tabelas?: string[]): Promise<any> {
  return apiClient.request('/api/bi/taux/sync', {
    method: 'POST',
    body: JSON.stringify({
      tabelas: tabelas ?? [],
      acionado_por: 'MANUAL',
    }),
  });
}

export async function getTauxData(
  nome: string,
  params: { q?: string; limit?: number; offset?: number } = {},
): Promise<TauxDataResponse> {
  const qs = new URLSearchParams();
  if (params.q) qs.set('q', params.q);
  if (params.limit != null) qs.set('limit', String(params.limit));
  if (params.offset != null) qs.set('offset', String(params.offset));
  const suffix = qs.toString() ? `?${qs.toString()}` : '';
  const resp = await apiClient.request<any>(`/api/bi/taux/${encodeURIComponent(nome)}${suffix}`);
  if (Array.isArray(resp)) return { data: resp };
  if (resp && Array.isArray(resp.data)) {
    return { data: resp.data, total: resp.total, columns: resp.columns };
  }
  if (resp && Array.isArray(resp.items)) {
    return { data: resp.items, total: resp.total, columns: resp.columns };
  }
  return { data: [] };
}
