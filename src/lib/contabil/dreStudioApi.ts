// Cliente do módulo DRE Studio.
// Todas as chamadas passam pelo ApiClient central (Authorization + ngrok header + base URL).
// Rotas exclusivas: /api/contabil/*  (NÃO confundir com /api/contabilidade/*).

import { api } from '@/lib/api';
import { describeDreStudioError } from './dreStudioErrors';
import { isValidUuid } from './anomes';
import type {
  DreHealth, DreModelo, DreLinha, DreContaVinculada,
  DrePlanoConta, DreCentroCusto, DreModeloDetalhe,
  DreOrcamentoItem, DreResultadoResponse, TipoModelo,
} from './dreStudioTypes';

const BASE = '/api/contabil';

function wrap<T>(p: Promise<T>): Promise<T> {
  return p.catch((err) => {
    const info = describeDreStudioError(err);
    const e: any = new Error(info.message);
    e.dreKind = info.kind;
    e.statusCode = err?.statusCode ?? err?.status;
    e.original = err;
    throw e;
  });
}

function requireUuid(id: string, label = 'id'): void {
  if (!isValidUuid(id)) throw new Error(`${label} inválido (UUID esperado).`);
}

// ---------------- Health ----------------
export async function fetchDreHealth(): Promise<DreHealth> {
  return wrap(api.get<DreHealth>(`${BASE}/health`));
}

// ---------------- Estrutura padrão ----------------
export async function fetchEstruturaPadrao(tipo: TipoModelo): Promise<any> {
  return wrap(api.get<any>(`${BASE}/estrutura-padrao`, { tipo_modelo: tipo }));
}

// ---------------- Modelos ----------------
export async function listarModelos(codemp?: number): Promise<DreModelo[]> {
  const data = await wrap(api.get<any>(`${BASE}/modelos`, codemp ? { codemp } : undefined));
  const arr = Array.isArray(data?.itens) ? data.itens : Array.isArray(data?.dados) ? data.dados : Array.isArray(data) ? data : [];
  return arr as DreModelo[];
}

export async function obterModelo(id: string): Promise<DreModeloDetalhe> {
  requireUuid(id, 'modelo_id');
  const data = await wrap(api.get<any>(`${BASE}/modelos/${id}`));
  const modelo: DreModelo = data?.modelo ?? data;
  const linhas: DreLinha[] = Array.isArray(data?.linhas) ? data.linhas : [];
  const contas: DreContaVinculada[] | undefined = Array.isArray(data?.contas) ? data.contas : undefined;
  return { modelo, linhas, contas };
}

export async function criarModelo(payload: {
  codemp: number;
  nome: string;
  tipo_modelo: TipoModelo;
  descricao?: string | null;
  ativo?: boolean;
}): Promise<DreModelo> {
  return wrap(api.post<DreModelo>(`${BASE}/modelos`, {
    codemp: payload.codemp,
    nome: payload.nome,
    tipo_modelo: payload.tipo_modelo,
    descricao: payload.descricao ?? null,
    ativo: payload.ativo ?? true,
  }));
}

export async function atualizarModelo(id: string, patch: Partial<DreModelo>): Promise<DreModelo> {
  requireUuid(id, 'modelo_id');
  return wrap(api.put<DreModelo>(`${BASE}/modelos/${id}`, patch));
}

export async function excluirModelo(id: string): Promise<void> {
  requireUuid(id, 'modelo_id');
  await wrap(api.delete<void>(`${BASE}/modelos/${id}`));
}

// ---------------- Linhas ----------------
export async function criarLinha(modeloId: string, linha: Omit<DreLinha, 'id' | 'modelo_id'>): Promise<DreLinha> {
  requireUuid(modeloId, 'modelo_id');
  return wrap(api.post<DreLinha>(`${BASE}/modelos/${modeloId}/linhas`, linha));
}

export async function atualizarLinha(
  modeloId: string, linhaId: string, patch: Partial<DreLinha>,
): Promise<DreLinha> {
  requireUuid(modeloId, 'modelo_id'); requireUuid(linhaId, 'linha_id');
  return wrap(api.put<DreLinha>(`${BASE}/modelos/${modeloId}/linhas/${linhaId}`, patch));
}

export async function excluirLinha(modeloId: string, linhaId: string): Promise<void> {
  requireUuid(modeloId, 'modelo_id'); requireUuid(linhaId, 'linha_id');
  await wrap(api.delete<void>(`${BASE}/modelos/${modeloId}/linhas/${linhaId}`));
}

// ---------------- Contas vinculadas ----------------
export async function listarContasLinha(modeloId: string, linhaId: string): Promise<DreContaVinculada[]> {
  requireUuid(modeloId, 'modelo_id'); requireUuid(linhaId, 'linha_id');
  const data = await wrap(api.get<any>(`${BASE}/modelos/${modeloId}/linhas/${linhaId}/contas`));
  return Array.isArray(data?.dados) ? data.dados : Array.isArray(data) ? data : [];
}

export async function vincularConta(
  modeloId: string,
  linhaId: string,
  payload: {
    codemp: number;
    ctared: number;
    clacta: string;
    descta: string;
    nivcta: number;
    anasin: 'A' | 'S';
    incluir_subcontas: boolean;
    sinal: 1 | -1;
  },
): Promise<DreContaVinculada> {
  requireUuid(modeloId, 'modelo_id'); requireUuid(linhaId, 'linha_id');
  return wrap(api.post<DreContaVinculada>(`${BASE}/modelos/${modeloId}/linhas/${linhaId}/contas`, payload));
}

export async function desvincularConta(modeloId: string, linhaId: string, vinculoId: string): Promise<void> {
  requireUuid(modeloId, 'modelo_id'); requireUuid(linhaId, 'linha_id'); requireUuid(vinculoId, 'vinculo_id');
  await wrap(api.delete<void>(`${BASE}/modelos/${modeloId}/linhas/${linhaId}/contas/${vinculoId}`));
}

// ---------------- Plano de contas + Centros de custo ----------------
export async function buscarPlanoContas(params: {
  codemp: number;
  tipo?: TipoModelo;
  somente_ativas?: boolean;
  somente_analiticas?: boolean;
  busca?: string;
}): Promise<DrePlanoConta[]> {
  const data = await wrap(api.get<any>(`${BASE}/plano-contas`, params));
  return Array.isArray(data?.dados) ? data.dados : Array.isArray(data) ? data : [];
}

export async function listarCentrosCusto(codemp: number): Promise<DreCentroCusto[]> {
  const data = await wrap(api.get<any>(`${BASE}/centros-custo`, { codemp }));
  return Array.isArray(data?.dados) ? data.dados : Array.isArray(data) ? data : [];
}

// ---------------- Orçamento ----------------
export async function listarOrcamento(params: {
  modelo_id: string;
  codemp?: number;
  codfil?: number;
  anomes_ini?: number;
  anomes_fim?: number;
}): Promise<DreOrcamentoItem[]> {
  requireUuid(params.modelo_id, 'modelo_id');
  const data = await wrap(api.get<any>(`${BASE}/orcamento`, params as any));
  return Array.isArray(data?.dados) ? data.dados : Array.isArray(data) ? data : [];
}

export async function gravarOrcamento(payload: DreOrcamentoItem): Promise<DreOrcamentoItem> {
  requireUuid(payload.modelo_id, 'modelo_id');
  requireUuid(payload.linha_id, 'linha_id');
  return wrap(api.post<DreOrcamentoItem>(`${BASE}/orcamento`, payload));
}

// ---------------- Resultado (cache) ----------------
export async function obterResultadoCache(params: {
  modelo_id: string;
  codemp: number;
  codfil?: number;
  anomes_ini: number;
  anomes_fim: number;
  codccu?: string | null;
}): Promise<DreResultadoResponse> {
  requireUuid(params.modelo_id, 'modelo_id');
  const { modelo_id, ...q } = params;
  const data = await wrap(api.get<any>(`${BASE}/modelos/${modelo_id}/resultado-cache`, q as any));
  return {
    modelo_id,
    colunas: Array.isArray(data?.colunas) ? data.colunas : [],
    periodos: Array.isArray(data?.periodos) ? data.periodos : undefined,
    linhas: Array.isArray(data?.linhas) ? data.linhas : [],
    fonte: data?.fonte ?? null,
    origem: data?.origem ?? null,
    atualizado_em: data?.atualizado_em ?? null,
  };
}
