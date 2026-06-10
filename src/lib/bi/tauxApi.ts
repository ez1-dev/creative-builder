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
  'TAUX_LOCAL_SN',
  'TAUX_ORIGEM_LCTO',
  'TAUX_USUARIO',
  'TAUX_PROD',
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

export interface TauxLogEntry {
  nome_tabela: string;
  tabela_supabase: string | null;
  status: string;
  qtd_linhas: number | null;
  erro: string | null;
  acionado_por: string | null;
  iniciado_em: string | null;
  finalizado_em: string | null;
}

function pickList(resp: any): any[] | null {
  if (Array.isArray(resp)) return resp;
  if (resp && Array.isArray(resp.dados)) return resp.dados;
  if (resp && Array.isArray(resp.data)) return resp.data;
  if (resp && Array.isArray(resp.items)) return resp.items;
  return null;
}

function normalizeStatus(r: any): TauxStatus {
  return {
    taux: r.taux ?? r.nome_tabela ?? r.nome ?? '',
    tabela: r.tabela ?? r.tabela_supabase ?? '',
    total_registros: r.total_registros ?? r.qtd_linhas ?? null,
    ultima_sincronizacao: r.ultima_sincronizacao ?? r.finalizado_em ?? null,
    status: r.status ?? '',
    erro: r.erro ?? null,
  };
}

export async function getTauxStatus(): Promise<TauxStatus[]> {
  const resp = await api.get<any>('/api/bi/taux/status');
  const list = pickList(resp) ?? [];
  return list.map(normalizeStatus);
}

export async function syncTaux(tabelas?: string[]): Promise<any> {
  const body: Record<string, unknown> = {
    acionado_por: 'MANUAL',
    limpar_antes: false,
  };
  if (tabelas && tabelas.length > 0) body.tabelas = tabelas;
  return api.post('/api/bi/taux/sync', body);
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

export async function getTauxLog(limit = 100): Promise<TauxLogEntry[]> {
  const resp = await api.get<any>('/api/bi/taux/log', { limit });
  const list = pickList(resp) ?? [];
  return list.map((r: any) => ({
    nome_tabela: r.nome_tabela ?? r.taux ?? '',
    tabela_supabase: r.tabela_supabase ?? r.tabela ?? null,
    status: r.status ?? '',
    qtd_linhas: r.qtd_linhas ?? r.total_registros ?? null,
    erro: r.erro ?? null,
    acionado_por: r.acionado_por ?? null,
    iniciado_em: r.iniciado_em ?? null,
    finalizado_em: r.finalizado_em ?? null,
  }));
}
