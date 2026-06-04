import { api } from '@/lib/api';

export type UnidadeNegocio = 'GENIUS' | 'ESTRUTURAL ZORTEA' | 'CONSOLIDADO';

export interface ComercialParams {
  anomes_ini: string;
  anomes_fim: string;
  unidade_negocio: UnidadeNegocio;
}

export interface ComercialKpis {
  faturamento: number | null;
  meta: number | null;
  diferenca: number | null;
  pct_atingimento: number | null;
  fat_liquido: number | null;
  impostos: number | null;
  devolucao: number | null;
  numero_vendas: number | null;
  numero_clientes: number | null;
  numero_estados: number | null;
  quantidade: number | null;
  ticket_medio: number | null;
  preco_medio: number | null;
}

export interface ComercialMensalRow {
  anomes_emissao: string;
  faturamento: number | null;
  fat_liquido: number | null;
  impostos: number | null;
  devolucao: number | null;
  numero_vendas: number | null;
  numero_clientes: number | null;
  quantidade: number | null;
  ticket_medio: number | null;
  preco_medio: number | null;
  meta?: number | null;
}

export interface ComercialMixRow {
  categoria: string;
  faturamento: number | null;
  [k: string]: any;
}

export interface ComercialEstadoRow {
  cd_estado: string;
  faturamento: number | null;
  numero_vendas: number | null;
  numero_clientes: number | null;
}

export interface ComercialRevendaRow {
  revenda: string;
  faturamento: number | null;
  fat_liquido: number | null;
  numero_vendas: number | null;
  numero_clientes: number | null;
}

export interface ComercialObrasRow {
  cd_prj: string;
  projeto: string | null;
  faturamento: number | null;
  fat_liquido: number | null;
  numero_vendas: number | null;
  numero_clientes: number | null;
}

/**
 * Normaliza retornos da FastAPI/RPC que podem vir como:
 *  - array direto:                       [ ...rows ]
 *  - objeto com chave:                   { bi_comercial_xxx: ... }
 *  - array com 1 objeto contendo chave:  [ { bi_comercial_xxx: ... } ]
 */
export function unwrapRpcResponse<T = any>(data: any, key: string): T {
  if (data === null || data === undefined) return null as unknown as T;
  if (Array.isArray(data)) {
    if (data.length === 1 && data[0] && typeof data[0] === 'object' && key in data[0]) {
      return (data[0] as any)[key] as T;
    }
    return data as unknown as T;
  }
  if (typeof data === 'object' && key in (data as any)) {
    return (data as any)[key] as T;
  }
  return data as T;
}

export async function fetchComercialKpis(p: ComercialParams): Promise<ComercialKpis> {
  const data = await api.get<any>('/api/bi/comercial/kpis', p);
  const out = unwrapRpcResponse<ComercialKpis>(data, 'bi_comercial_kpis');
  return (Array.isArray(out) ? out[0] : out) ?? ({} as ComercialKpis);
}

export async function fetchComercialMensal(p: ComercialParams): Promise<ComercialMensalRow[]> {
  const data = await api.get<any>('/api/bi/comercial/mensal', p);
  const out = unwrapRpcResponse<ComercialMensalRow[]>(data, 'bi_comercial_mensal');
  return Array.isArray(out) ? out : [];
}

export async function fetchComercialMix(p: ComercialParams): Promise<ComercialMixRow[]> {
  const data = await api.get<any>('/api/bi/comercial/mix', p);
  const out = unwrapRpcResponse<ComercialMixRow[]>(data, 'bi_comercial_mix');
  return Array.isArray(out) ? out : [];
}

export async function fetchComercialEstado(p: ComercialParams): Promise<ComercialEstadoRow[]> {
  const data = await api.get<any>('/api/bi/comercial/estado', p);
  const out = unwrapRpcResponse<ComercialEstadoRow[]>(data, 'bi_comercial_estado');
  return Array.isArray(out) ? out : [];
}

export async function fetchComercialRevenda(p: ComercialParams): Promise<ComercialRevendaRow[]> {
  const data = await api.get<any>('/api/bi/comercial/revenda', p);
  const out = unwrapRpcResponse<ComercialRevendaRow[]>(data, 'bi_comercial_revenda');
  return Array.isArray(out) ? out : [];
}

export async function fetchComercialObras(p: ComercialParams): Promise<ComercialObrasRow[]> {
  const data = await api.get<any>('/api/bi/comercial/obras', p);
  const out = unwrapRpcResponse<ComercialObrasRow[]>(data, 'bi_comercial_obras');
  return Array.isArray(out) ? out : [];
}
