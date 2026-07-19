// Cliente HTTP único do módulo Requisição de Materiais.
// Toda gravação passa por aqui e depois pela FastAPI :8070.
// Nunca chamar SOAP/SID direto do navegador.

import { getApiUrl } from '@/lib/api';
import type {
  ApiListResponse,
  ComponenteOP,
  ConfigRequisicoes,
  FilaAlmoxItem,
  HistoricoEvento,
  OpConsultaResponse,
  Requisicao,
  RequisicaoFiltros,
  RequisicaoKpis,
  RequisicaoListItem,
  SidStatusResponse,
} from '@/types/requisicoes';
import { requisicoesMock } from '@/mocks/requisicoes';

const USE_MOCK =
  ((import.meta as any).env?.VITE_USE_REQUISICOES_MOCK ?? 'false') === 'true';

/** Erro que sinaliza que a integração SID de escrita ainda não está habilitada no backend. */
export class IntegracaoDesabilitadaError extends Error {
  status = 503;
  detail?: string;
  constructor(detail?: string) {
    super('Integração de escrita com o ERP ainda não está habilitada.');
    this.name = 'IntegracaoDesabilitadaError';
    this.detail = detail;
  }
}

/** Endpoint de cadastro ainda não publicado pela API. */
export class EndpointIndisponivelError extends Error {
  constructor(readonly recurso: string, message?: string) {
    super(message ?? `Este cadastro ainda não está disponível no backend.`);
    this.name = 'EndpointIndisponivelError';
  }
}

export class ApiOfflineError extends Error {
  constructor() {
    super('Não foi possível contatar o servidor. Verifique sua conexão.');
    this.name = 'ApiOfflineError';
  }
}

export class RequisicaoApiError extends Error {
  status: number;
  detail?: string;
  constructor(status: number, message: string, detail?: string) {
    super(message);
    this.name = 'RequisicaoApiError';
    this.status = status;
    this.detail = detail;
  }
}

function buildHeaders(extra?: Record<string, string>): Record<string, string> {
  const h: Record<string, string> = {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
    ...(extra ?? {}),
  };
  const tok = localStorage.getItem('erp_token');
  if (tok) h['Authorization'] = `Bearer ${tok}`;
  return h;
}

function qs(params?: Record<string, unknown>): string {
  if (!params) return '';
  const parts: string[] = [];
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === '') continue;
    parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  }
  return parts.length ? `?${parts.join('&')}` : '';
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (res.status === 503) {
    let detail: string | undefined;
    try { detail = (await res.json())?.detail ?? (await res.text()); } catch { /* noop */ }
    throw new IntegracaoDesabilitadaError(detail);
  }
  if (!res.ok) {
    let detail: string | undefined;
    let msg = `Erro ${res.status}`;
    try {
      const body = await res.json();
      detail = body?.detail ?? body?.message;
      if (detail) msg = detail;
    } catch { /* noop */ }
    throw new RequisicaoApiError(res.status, msg, detail);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

async function apiGet<T>(path: string, params?: Record<string, any>): Promise<T> {
  try {
    const res = await fetch(`${getApiUrl()}${path}${qs(params)}`, {
      method: 'GET',
      headers: buildHeaders(),
    });
    return await handleResponse<T>(res);
  } catch (err) {
    if (err instanceof IntegracaoDesabilitadaError || err instanceof RequisicaoApiError) throw err;
    throw new ApiOfflineError();
  }
}

async function apiWrite<T>(
  method: 'POST' | 'PUT' | 'DELETE',
  path: string,
  body?: unknown,
  idempotencyKey?: string,
): Promise<T> {
  const headers = buildHeaders();
  if (idempotencyKey) headers['X-Idempotency-Key'] = idempotencyKey;
  try {
    const res = await fetch(`${getApiUrl()}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return await handleResponse<T>(res);
  } catch (err) {
    if (err instanceof IntegracaoDesabilitadaError || err instanceof RequisicaoApiError) throw err;
    throw new ApiOfflineError();
  }
}

function newIdempotencyKey(): string {
  const g: any = globalThis as any;
  if (g.crypto?.randomUUID) return g.crypto.randomUUID();
  return `idk-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/* ============================== API pública ============================== */

export const requisicoesApi = {
  isMock: () => USE_MOCK,
  newIdempotencyKey,

  // -------- Listagem / detalhe --------
  async listar(filtros?: RequisicaoFiltros & { page?: number; page_size?: number }): Promise<ApiListResponse<RequisicaoListItem>> {
    if (USE_MOCK) return requisicoesMock.listar(filtros);
    return apiGet('/api/requisicoes', filtros);
  },

  async kpis(filtros?: RequisicaoFiltros): Promise<RequisicaoKpis> {
    if (USE_MOCK) return requisicoesMock.kpis();
    return apiGet('/api/requisicoes/kpis', filtros);
  },

  async detalhe(id: string): Promise<Requisicao> {
    if (USE_MOCK) return requisicoesMock.detalhe(id);
    return apiGet(`/api/requisicoes/${encodeURIComponent(id)}`);
  },

  async historico(id: string): Promise<HistoricoEvento[]> {
    if (USE_MOCK) return requisicoesMock.historico(id);
    return apiGet(`/api/requisicoes/${encodeURIComponent(id)}/historico`);
  },

  // -------- Criação / edição --------
  criar(payload: Partial<Requisicao>): Promise<Requisicao> {
    if (USE_MOCK) return requisicoesMock.criar(payload);
    return apiWrite('POST', '/api/requisicoes', payload, newIdempotencyKey());
  },

  atualizar(id: string, payload: Partial<Requisicao>): Promise<Requisicao> {
    if (USE_MOCK) return requisicoesMock.atualizar(id, payload);
    return apiWrite('PUT', `/api/requisicoes/${encodeURIComponent(id)}`, payload, newIdempotencyKey());
  },

  // -------- Consulta de OP --------
  async consultarOp(codori: string, numorp: string): Promise<OpConsultaResponse> {
    if (USE_MOCK) return requisicoesMock.consultarOp(codori, numorp);
    const raw = await apiGet<any>(`/api/requisicoes/op/${encodeURIComponent(codori)}/${encodeURIComponent(numorp)}`);
    return normalizeOpConsulta(raw, codori, numorp);
  },

  // -------- Ações --------
  enviar(id: string, key?: string): Promise<Requisicao> {
    return apiWrite('POST', `/api/requisicoes/${encodeURIComponent(id)}/enviar`, undefined, key ?? newIdempotencyKey());
  },
  aprovar(id: string, payload?: unknown, key?: string): Promise<Requisicao> {
    return apiWrite('POST', `/api/requisicoes/${encodeURIComponent(id)}/aprovar`, payload, key ?? newIdempotencyKey());
  },
  rejeitar(id: string, payload: { justificativa: string }, key?: string): Promise<Requisicao> {
    return apiWrite('POST', `/api/requisicoes/${encodeURIComponent(id)}/rejeitar`, payload, key ?? newIdempotencyKey());
  },
  cancelar(id: string, payload: { justificativa: string }, key?: string): Promise<Requisicao> {
    return apiWrite('POST', `/api/requisicoes/${encodeURIComponent(id)}/cancelar`, payload, key ?? newIdempotencyKey());
  },
  estornar(id: string, key?: string): Promise<Requisicao> {
    return apiWrite('POST', `/api/requisicoes/${encodeURIComponent(id)}/estornar`, undefined, key ?? newIdempotencyKey());
  },

  // -------- Fila almoxarifado --------
  async filaAlmox(filtros?: Record<string, unknown>): Promise<FilaAlmoxItem[]> {
    if (USE_MOCK) return requisicoesMock.filaAlmox();
    return apiGet('/api/requisicoes/almoxarifado/fila', filtros);
  },
  iniciarSeparacao(id: string, seq: number, key?: string) {
    return apiWrite('POST', `/api/requisicoes/${id}/itens/${seq}/iniciar-separacao`, undefined, key ?? newIdempotencyKey());
  },
  reservar(id: string, seq: number, payload: unknown, key?: string) {
    return apiWrite('POST', `/api/requisicoes/${id}/itens/${seq}/reservar`, payload, key ?? newIdempotencyKey());
  },
  separar(id: string, seq: number, payload: unknown, key?: string) {
    return apiWrite('POST', `/api/requisicoes/${id}/itens/${seq}/separar`, payload, key ?? newIdempotencyKey());
  },
  atender(id: string, seq: number, payload: unknown, key?: string) {
    return apiWrite('POST', `/api/requisicoes/${id}/itens/${seq}/atender`, payload, key ?? newIdempotencyKey());
  },
  transferir(id: string, seq: number, payload: unknown, key?: string) {
    return apiWrite('POST', `/api/requisicoes/${id}/itens/${seq}/transferir`, payload, key ?? newIdempotencyKey());
  },
  baixarOp(id: string, seq: number, payload: unknown, key?: string) {
    return apiWrite('POST', `/api/requisicoes/${id}/itens/${seq}/baixar-op`, payload, key ?? newIdempotencyKey());
  },
  registrarFalta(id: string, seq: number, payload: unknown, key?: string) {
    return apiWrite('POST', `/api/requisicoes/${id}/itens/${seq}/registrar-falta`, payload, key ?? newIdempotencyKey());
  },
  enviarCompras(id: string, seq: number, payload: unknown, key?: string) {
    return apiWrite('POST', `/api/requisicoes/${id}/itens/${seq}/enviar-compras`, payload, key ?? newIdempotencyKey());
  },
  estornarItem(id: string, seq: number, key?: string) {
    return apiWrite('POST', `/api/requisicoes/${id}/itens/${seq}/estornar`, undefined, key ?? newIdempotencyKey());
  },

  // -------- Separação agrupada --------
  async agrupadas(filtros?: Record<string, unknown>): Promise<unknown[]> {
    if (USE_MOCK) return requisicoesMock.agrupadas();
    return apiGet('/api/requisicoes/agrupadas', filtros);
  },
  agrupadasSeparar(payload: unknown, key?: string) {
    return apiWrite('POST', '/api/requisicoes/agrupadas/separar', payload, key ?? newIdempotencyKey());
  },

  // -------- Configurações --------
  async configuracoes(): Promise<ConfigRequisicoes> {
    if (USE_MOCK) return requisicoesMock.configuracoes();
    return apiGet('/api/requisicoes/configuracoes');
  },
  atualizarConfiguracoes(payload: ConfigRequisicoes) {
    return apiWrite('PUT', '/api/requisicoes/configuracoes', payload, newIdempotencyKey());
  },

  // -------- Integração SID --------
  reprocessarIntegracao(id: string, key?: string) {
    return apiWrite('POST', `/api/requisicoes/integracoes/${encodeURIComponent(id)}/reprocessar`, undefined, key ?? newIdempotencyKey());
  },
  /** Diagnóstico da integração SID. Não grava nada no ERP. */
  pingSid(): Promise<SidStatusResponse> {
    return apiGet<SidStatusResponse>('/api/requisicoes/sid/ping');
  },
  sidRequisitar(payload: unknown, key?: string) {
    return apiWrite('POST', '/api/requisicoes/sid/requisitar', payload, key ?? newIdempotencyKey());
  },
  sidRateio(payload: unknown, key?: string) {
    return apiWrite('POST', '/api/requisicoes/sid/rateio', payload, key ?? newIdempotencyKey());
  },
  sidAtender(payload: unknown, key?: string) {
    return apiWrite('POST', '/api/requisicoes/sid/atender', payload, key ?? newIdempotencyKey());
  },
  sidMovimentar(payload: unknown, key?: string) {
    return apiWrite('POST', '/api/requisicoes/sid/movimentar', payload, key ?? newIdempotencyKey());
  },
  sidBaixarComponentes(payload: unknown, key?: string) {
    return apiWrite('POST', '/api/requisicoes/sid/baixar-componentes', payload, key ?? newIdempotencyKey());
  },
  sidReservarComponente(payload: unknown, key?: string) {
    return apiWrite('POST', '/api/requisicoes/sid/reservar-componente', payload, key ?? newIdempotencyKey());
  },
  sidExcluir(payload: unknown, key?: string) {
    return apiWrite('POST', '/api/requisicoes/sid/excluir', payload, key ?? newIdempotencyKey());
  },

  // -------- Lookups de cadastros (autocompletes) --------
  buscarProdutos: buscarProdutos,
  buscarCentrosCusto: buscarCentrosCusto,
  buscarProjetos: buscarProjetos,
  buscarComponentes: buscarComponentes,
};

/* ============================== Lookups ============================== */

export interface ProdutoLookup {
  codpro: string;
  despro: string;
  unimed?: string;
  codfam?: string;
  desfam?: string;
  codder?: string;
}

export interface CentroCustoLookup {
  codccu: string;
  desccu: string;
  abreviacao?: string | null;
}

export interface ProjetoLookup {
  numprj: number | string;
  desprj?: string;
  obra?: string;
  codfpj?: string;
  abreviacao?: string | null;
  situacao_desc?: string | null;
}

export interface ComponenteLookup {
  codigo: string;
  descricao: string;
  um: string;
}


function pick(obj: any, ...keys: string[]): any {
  for (const k of keys) {
    const v = obj?.[k];
    if (v !== undefined && v !== null && v !== '') return v;
  }
  return undefined;
}

function toNum(v: any): number {
  if (v === null || v === undefined || v === '') return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Normaliza a resposta de GET /api/requisicoes/op/{codori}/{numorp}.
 * O backend devolve os campos da OP dentro de `raw.op`; achatamos para o shape
 * consumido pelo front (OpConsultaResponse). Componentes e total_componentes
 * ficam no topo da resposta.
 */
function normalizeOpConsulta(raw: any, codori: string, numorp: string): OpConsultaResponse {
  const op: any = raw && typeof raw === 'object' && raw.op && typeof raw.op === 'object'
    ? raw.op
    : (raw && typeof raw === 'object' ? raw : {});
  const componentes: ComponenteOP[] = Array.isArray(raw?.componentes) ? raw.componentes : [];
  const prev = toNum(op.qtd_prevista ?? op.quantidade_prevista);
  const prod = toNum(op.qtd_produzida ?? op.quantidade_produzida);
  const saldoRaw = op.saldo;
  const derivacao = op.derivacao ?? op.codder ?? null;
  return {
    codemp: toNum(op.codemp),
    codfil: toNum(op.codfil),
    codori: String(op.codori ?? codori),
    numorp: String(op.numorp ?? numorp),
    produto_final: op.produto_final ?? null,
    descricao: op.descricao ?? null,
    codder: derivacao,
    derivacao,
    projeto: op.projeto_obra ?? op.projeto ?? null,
    projeto_obra: op.projeto_obra ?? null,
    situacao: String(op.sitorp ?? op.situacao ?? ''),
    situacao_desc: op.situacao_desc ?? null,
    quantidade_prevista: prev,
    quantidade_produzida: prod,
    saldo: saldoRaw === null || saldoRaw === undefined ? Math.max(0, prev - prod) : toNum(saldoRaw),
    centro_custo: op.centro_custo ?? null,
    codfam: op.codfam ?? null,
    numped: op.numped ?? null,
    pode_requisitar: op.pode_requisitar === true,
    motivo_bloqueio: op.motivo_bloqueio ?? null,
    componentes,
    total_componentes: typeof raw?.total_componentes === 'number' ? raw.total_componentes : componentes.length,
  };
}


async function buscarProdutos(params: {
  q?: string;
  codemp?: number;
  codori?: string;
  codfam?: string;
  incluir_derivacoes?: boolean;
  tamanho_pagina?: number;
}): Promise<ProdutoLookup[]> {
  const query: Record<string, unknown> = {
    somente_ativos: true,
    tamanho_pagina: params.tamanho_pagina ?? 50,
    pagina: 1,
  };
  if (params.codemp != null) query.codemp = params.codemp;
  if (params.codori) query.codori = params.codori;
  if (params.codfam) query.codfam = params.codfam;
  if (params.incluir_derivacoes) query.incluir_derivacoes = true;
  const q = (params.q ?? '').trim();
  if (q) {
    // Numérico/curto sem espaços → filtra por código; senão por descrição
    if (/^[A-Za-z0-9._-]+$/.test(q) && q.length <= 20) query.codpro = q;
    else query.despro = q;
  }
  try {
    const res = await apiGet<any>('/api/cadastros/produtos', query);
    const list: any[] = Array.isArray(res) ? res : res?.dados ?? res?.data ?? res?.itens ?? [];
    const out: ProdutoLookup[] = [];
    const seen = new Set<string>();
    for (const item of list) {
      const codpro = pick(item, 'codigo_produto', 'CodPro', 'codpro', 'codigo');
      if (!codpro) continue;
      const key = String(codpro);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({
        codpro: key,
        despro: String(pick(item, 'descricao_produto', 'DesPro', 'despro', 'descricao') ?? ''),
        unimed: pick(item, 'unidade_medida', 'UniMed', 'unimed', 'CodUni', 'coduni'),
        codfam: pick(item, 'codigo_familia', 'CodFam', 'codfam'),
        desfam: pick(item, 'descricao_familia', 'DesFam', 'desfam'),
        codder: pick(item, 'codigo_derivacao', 'CodDer', 'codder'),
      });
    }
    return out;
  } catch (err) {
    if (err instanceof RequisicaoApiError && err.status === 404) {
      throw new EndpointIndisponivelError('produtos');
    }
    throw err;
  }
}

async function buscarCentrosCusto(params: {
  q?: string;
  codemp?: number;
}): Promise<CentroCustoLookup[]> {
  const query: Record<string, unknown> = {};
  const q = (params.q ?? '').trim();
  if (q) query.q = q;
  if (params.codemp != null) query.codemp = params.codemp;
  try {
    const res = await apiGet<any>('/api/cadastros/centros-custo', query);
    const list: any[] = Array.isArray(res) ? res : res?.dados ?? res?.data ?? res?.itens ?? [];
    const out: CentroCustoLookup[] = [];
    const seen = new Set<string>();
    for (const item of list) {
      const codccu = pick(item, 'codigo', 'CodCcu', 'codccu');
      if (!codccu) continue;
      const key = String(codccu);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({
        codccu: key,
        desccu: String(pick(item, 'descricao', 'DesCcu', 'desccu') ?? ''),
      });
    }
    return out;
  } catch (err) {
    if (err instanceof RequisicaoApiError && err.status === 404) {
      throw new EndpointIndisponivelError('centros-custo');
    }
    throw err;
  }
}

async function buscarProjetos(params: { q?: string }): Promise<ProjetoLookup[]> {
  const query: Record<string, unknown> = {};
  const q = (params.q ?? '').trim();
  if (q) query.q = q;
  try {
    const res = await apiGet<any>('/api/cadastros/projetos', query);
    const list: any[] = Array.isArray(res) ? res : res?.dados ?? res?.data ?? res?.itens ?? [];
    const out: ProjetoLookup[] = [];
    const seen = new Set<string>();
    for (const item of list) {
      const numprj = pick(item, 'numprj', 'NumPrj', 'numero', 'codigo');
      if (numprj == null) continue;
      const key = String(numprj);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({
        numprj: numprj,
        desprj: pick(item, 'desprj', 'DesPrj', 'descricao'),
        obra: pick(item, 'obra', 'CodObr', 'codobr'),
        codfpj: pick(item, 'codfpj', 'CodFpj', 'fase'),
      });
    }
    return out;
  } catch (err) {
    if (err instanceof RequisicaoApiError && err.status === 404) {
      throw new EndpointIndisponivelError('projetos', 'A busca de projetos ainda não foi disponibilizada pela API.');
    }
    throw err;
  }
}

