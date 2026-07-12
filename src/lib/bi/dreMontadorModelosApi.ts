import { api, getApiUrl } from '@/lib/api';
import { describeDreError } from './dreErrors';

export interface MontadorModelo {
  id: string;
  nome: string;
  descricao?: string | null;
  padrao?: boolean;
  ativo?: boolean;
}

export type MontadorTipoLinha = 'CONTA' | 'CALCULO' | 'TOTAL';

export interface MontadorLinha {
  id: string;
  modelo_id: string;
  codigo_linha: string;
  descricao: string;
  tipo_linha: MontadorTipoLinha;
  ordem: number;
  formula?: string | null;
  ativo: boolean;
}

export interface ModeloPayload {
  nome: string;
  descricao?: string | null;
  padrao?: boolean;
  ativo?: boolean;
}

export interface LinhaPayload {
  modelo_id: string;
  codigo_linha: string;
  descricao: string;
  tipo_linha: MontadorTipoLinha;
  ordem: number;
  formula?: string | null;
  ativo?: boolean;
}

function authHeaders(): Record<string, string> {
  const token = api.getToken();
  const h: Record<string, string> = {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
  };
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

async function call<T>(method: string, path: string, body?: any): Promise<T> {
  const url = `${getApiUrl()}${path}`;
  let resp: Response;
  try {
    resp = await fetch(url, {
      method,
      headers: authHeaders(),
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (netErr: any) {
    const info = describeDreError(netErr);
    const e: any = new Error(info.message);
    e.dreKind = info.kind;
    throw e;
  }
  if (!resp.ok) {
    const txt = await resp.text().catch(() => '');
    let payload: any = null;
    try { payload = JSON.parse(txt); } catch { /* ignore */ }
    const info = describeDreError({ statusCode: resp.status, response: { status: resp.status, data: payload }, message: txt.slice(0, 300) });
    const e: any = new Error(info.message);
    e.dreKind = info.kind;
    e.statusCode = resp.status;
    throw e;
  }
  if (resp.status === 204) return undefined as any;
  return resp.json().catch(() => ({} as any));
}

export async function listarModelosFastApi(): Promise<MontadorModelo[]> {
  const data = await call<any>('GET', '/api/contabil/modelos');
  const arr = Array.isArray(data) ? data : Array.isArray(data?.itens) ? data.itens : Array.isArray(data?.dados) ? data.dados : [];
  return arr as MontadorModelo[];
}

export async function criarModelo(payload: ModeloPayload): Promise<MontadorModelo> {
  return call<MontadorModelo>('POST', '/api/contabil/modelos', payload);
}

export async function atualizarModelo(id: string, payload: Partial<ModeloPayload>): Promise<MontadorModelo> {
  return call<MontadorModelo>('PATCH', `/api/contabil/modelos/${id}`, payload);
}

export async function listarLinhasFastApi(modeloId: string): Promise<MontadorLinha[]> {
  const data = await call<any>('GET', `/api/contabil/linhas?modelo_id=${encodeURIComponent(modeloId)}`);
  const arr = Array.isArray(data) ? data : Array.isArray(data?.itens) ? data.itens : Array.isArray(data?.dados) ? data.dados : [];
  return arr as MontadorLinha[];
}

export async function criarLinha(payload: LinhaPayload): Promise<MontadorLinha> {
  return call<MontadorLinha>('POST', '/api/contabil/linhas', payload);
}

export async function atualizarLinha(id: string, payload: Partial<LinhaPayload>): Promise<MontadorLinha> {
  return call<MontadorLinha>('PATCH', `/api/contabil/linhas/${id}`, payload);
}

export async function desativarLinha(id: string): Promise<void> {
  await call<void>('DELETE', `/api/contabil/linhas/${id}`);
}
