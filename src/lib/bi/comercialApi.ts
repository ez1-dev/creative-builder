import { api } from '@/lib/api';
import type { BiComercialFilters } from './comercialFilters';

export type UnidadeNegocio = 'GENIUS' | 'ESTRUTURAL ZORTEA' | 'CONSOLIDADO';

/** Aceita os filtros completos (base + drill). Campos vazios são removidos. */
export type ComercialParams = BiComercialFilters;

export type ComercialDetalheEscopo =
  | 'todas' | 'impostos' | 'devolucao' | 'vendas' | 'clientes' | 'estados';

function buildQuery(p: ComercialParams, extras?: Record<string, string | undefined>) {
  const out: Record<string, string> = {};
  Object.entries({ ...p, ...(extras || {}) }).forEach(([k, v]) => {
    if (v != null && String(v).length > 0) out[k] = String(v);
  });
  return out;
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
  // Fallbacks opcionais que a API pode devolver (mapeados no card Resumo Faturamento)
  faturamento_liquido?: number | null;
  vl_realizado?: number | null;
  realizado?: number | null;
  vl_meta?: number | null;
  total_meta?: number | null;
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
  const data = await api.get<any>('/api/bi/comercial/kpis', buildQuery(p));
  const out = unwrapRpcResponse<ComercialKpis>(data, 'bi_comercial_kpis');
  return (Array.isArray(out) ? out[0] : out) ?? ({} as ComercialKpis);
}

export async function fetchComercialMensal(p: ComercialParams): Promise<ComercialMensalRow[]> {
  const data = await api.get<any>('/api/bi/comercial/mensal', buildQuery(p));
  const out = unwrapRpcResponse<ComercialMensalRow[]>(data, 'bi_comercial_mensal');
  return Array.isArray(out) ? out : [];
}

export async function fetchComercialMix(p: ComercialParams): Promise<ComercialMixRow[]> {
  const data = await api.get<any>('/api/bi/comercial/mix', buildQuery(p));
  const out = unwrapRpcResponse<ComercialMixRow[]>(data, 'bi_comercial_mix');
  return Array.isArray(out) ? out : [];
}

export async function fetchComercialEstado(p: ComercialParams): Promise<ComercialEstadoRow[]> {
  const data = await api.get<any>('/api/bi/comercial/estado', buildQuery(p));
  const out = unwrapRpcResponse<ComercialEstadoRow[]>(data, 'bi_comercial_estado');
  return Array.isArray(out) ? out : [];
}

export async function fetchComercialRevenda(p: ComercialParams): Promise<ComercialRevendaRow[]> {
  const data = await api.get<any>('/api/bi/comercial/revenda', buildQuery(p));
  const out = unwrapRpcResponse<ComercialRevendaRow[]>(data, 'bi_comercial_revenda');
  return Array.isArray(out) ? out : [];
}

export async function fetchComercialObras(p: ComercialParams): Promise<ComercialObrasRow[]> {
  const data = await api.get<any>('/api/bi/comercial/obras', buildQuery(p));
  const out = unwrapRpcResponse<ComercialObrasRow[]>(data, 'bi_comercial_obras');
  return Array.isArray(out) ? out : [];
}

export interface ComercialDetalheRow {
  anomes_emissao?: string | null;
  unidade_negocio?: string | null;
  cd_tp_movimento?: string | null;
  cd_origem?: string | null;
  cd_empresa?: string | null;
  cd_filial?: string | null;
  cd_nf?: string | null;
  cd_serie?: string | null;
  dt_emissao?: string | null;
  cd_estado?: string | null;
  cd_cliente?: string | null;
  cd_prj?: string | null;
  ds_abr_prj?: string | null;
  cd_rev_pedido?: string | null;
  cd_tns?: string | null;
  vl_bruto?: number | null;
  vl_impostos?: number | null;
  vl_liquido?: number | null;
  vl_devolucao?: number | null;
  qtd_produtos?: number | null;
}

export async function fetchComercialDetalhes(
  p: ComercialParams,
  opts?: { escopo?: ComercialDetalheEscopo; limit?: number },
): Promise<ComercialDetalheRow[]> {
  const data = await api.get<any>(
    '/api/bi/comercial/detalhes',
    buildQuery(p, {
      escopo: opts?.escopo ?? 'todas',
      limit: opts?.limit ? String(opts.limit) : undefined,
    }),
  );
  const out = unwrapRpcResponse<ComercialDetalheRow[]>(data, 'bi_comercial_detalhes');
  return Array.isArray(out) ? out : [];
}

