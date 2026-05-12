import { api } from '@/lib/api';
import type {
  RegraLSP, RegraFiltros, Identificador, IdentificadorFiltros,
  AuditoriaEntry, DashboardResumo, AlterarSituacaoPayload, AlterarRegraPayload,
  StatusRegra, SnapshotEntry, ValidacaoRegra, RegraVersao,
} from './types';
import {
  mapRegra, mapIdentificador, mapAuditoria, mapVersao, mapSnapshot, toApiPaging,
} from './mappers';

const BASE = '/api/senior';

const safe = async <T,>(p: Promise<T>, fallback: T): Promise<T> => {
  try { return await p; } catch { return fallback; }
};

/** Aceita T[], { items|data|results|rows|dados: T[] } e sempre devolve T[]. */
const unwrapList = <T,>(resp: any): T[] => {
  if (Array.isArray(resp)) return resp as T[];
  if (resp && typeof resp === 'object') {
    if (Array.isArray(resp.dados)) return resp.dados as T[];
    if (Array.isArray(resp.items)) return resp.items as T[];
    if (Array.isArray(resp.data)) return resp.data as T[];
    if (Array.isArray(resp.results)) return resp.results as T[];
    if (Array.isArray(resp.rows)) return resp.rows as T[];
  }
  return [];
};

const getList = async <T,>(url: string, params?: any): Promise<T[]> =>
  unwrapList<T>(await api.get<any>(url, toApiPaging(params)));

export const seniorApi = {
  // Dashboard
  resumo: () => safe(api.get<DashboardResumo>(`${BASE}/resumo`), null as unknown as DashboardResumo),

  // Regras LSP
  listarRegras: async (f?: RegraFiltros) =>
    (await safe(getList<any>(`${BASE}/regras`, f), [] as any[])).map(mapRegra),
  obterRegra: async (id: number | string) => mapRegra(await api.get<any>(`${BASE}/regras/${id}`)),
  criarRegra: async (body: Partial<RegraLSP>) => mapRegra(await api.post<any>(`${BASE}/regras`, body)),
  atualizarRegra: async (id: number | string, body: Partial<RegraLSP>) =>
    mapRegra(await api.post<any>(`${BASE}/regras/${id}`, body)),
  alterarStatusRegra: async (id: number | string, novo_status: StatusRegra, motivo: string) =>
    mapRegra(await api.post<any>(`${BASE}/regras/${id}/status`, { novo_status, motivo })),
  exportarRegraTxtUrl: (id: number | string) => api.getExportUrl(`${BASE}/regras/${id}/export`),
  validarRegra: (id: number | string) =>
    safe(api.post<ValidacaoRegra>(`${BASE}/regras/${id}/validar`), { avisos: [] }),
  listarVersoes: async (id: number | string) =>
    (await safe(getList<any>(`${BASE}/regras/${id}/versoes`), [] as any[])).map(mapVersao),

  // Código LSP (E098REG / Portal)
  obterCodigoRegra: (params: { codreg: string | number; modsis: string; idereg: string; codtns?: string }) =>
    api.get<{
      fonte_disponivel: boolean;
      fonte_lsp?: string;
      origem_fonte?: string;
      codreg?: string | number;
      modsis?: string;
      idereg?: string;
      codtns?: string;
    }>(`${BASE}/regras/codigo`, params as any),
  importarFonteRegra: (payload: {
    codreg_erp: string | number;
    modsis: string;
    idereg: string;
    codtns: string;
    nome_regra: string;
    fonte_lsp: string;
    motivo: string;
  }) => api.post<any>(`${BASE}/regras/importar-fonte`, payload),

  // Identificadores
  listarIdentificadores: async (f?: IdentificadorFiltros) => {
    const PAGE_SIZE = 500;
    const MAX_PAGES = 20;
    const acc: any[] = [];
    let pagina = 1;
    while (pagina <= MAX_PAGES) {
      const resp: any = await safe(
        api.get<any>(`${BASE}/identificadores`, toApiPaging({ ...(f || {}), page: pagina, pageSize: PAGE_SIZE })),
        null,
      );
      if (resp == null) break;
      if (Array.isArray(resp)) { acc.push(...resp); break; }
      const dados = unwrapList<any>(resp);
      acc.push(...dados);
      const totalPaginas = Number(resp?.total_paginas ?? resp?.totalPaginas ?? 1);
      if (!Number.isFinite(totalPaginas) || pagina >= totalPaginas) break;
      pagina += 1;
    }
    return acc.map(mapIdentificador);
  },
  alterarSituacao: (p: AlterarSituacaoPayload) =>
    api.post(`${BASE}/identificadores/alterar-situacao`, p),
  alterarRegraVinculada: (p: AlterarRegraPayload) =>
    api.post(`${BASE}/identificadores/alterar-regra`, p),
  gerarSnapshot: async () => mapSnapshot(await api.post<any>(`${BASE}/identificadores/snapshot`)),
  listarSnapshots: async () =>
    (await safe(getList<any>(`${BASE}/identificadores/snapshots`), [] as any[])).map(mapSnapshot),
  downloadSnapshotUrl: (id: number | string) =>
    api.getExportUrl(`${BASE}/identificadores/snapshots/${id}`),

  // Auditoria
  listarAuditoria: async (f?: { de?: string; ate?: string; acao?: string; usuario?: string; codemp?: number; modsis?: string; idereg?: string }) =>
    (await safe(getList<any>(`${BASE}/auditoria`, f), [] as any[])).map(mapAuditoria),
};
