import { api } from '@/lib/api';
import type {
  RegraLSP, RegraFiltros, Identificador, IdentificadorFiltros,
  AuditoriaEntry, DashboardResumo, AlterarSituacaoPayload, AlterarRegraPayload,
  StatusRegra, SnapshotEntry, ValidacaoRegra, RegraVersao,
} from './types';

const BASE = '/api/senior';

const safe = async <T,>(p: Promise<T>, fallback: T): Promise<T> => {
  try { return await p; } catch { return fallback; }
};

/** Aceita tanto T[] quanto { items|data|results|rows: T[] } e sempre devolve T[]. */
const unwrapList = <T,>(resp: any): T[] => {
  if (Array.isArray(resp)) return resp as T[];
  if (resp && typeof resp === 'object') {
    if (Array.isArray(resp.items)) return resp.items as T[];
    if (Array.isArray(resp.data)) return resp.data as T[];
    if (Array.isArray(resp.results)) return resp.results as T[];
    if (Array.isArray(resp.rows)) return resp.rows as T[];
  }
  return [];
};

const getList = async <T,>(url: string, params?: any): Promise<T[]> =>
  unwrapList<T>(await api.get<any>(url, params));

export const seniorApi = {
  // Dashboard
  resumo: () => safe(api.get<DashboardResumo>(`${BASE}/resumo`), null as unknown as DashboardResumo),

  // Regras LSP
  listarRegras: (f?: RegraFiltros) => getList<RegraLSP>(`${BASE}/regras`, f),
  obterRegra: (id: number | string) => api.get<RegraLSP>(`${BASE}/regras/${id}`),
  criarRegra: (body: Partial<RegraLSP>) => api.post<RegraLSP>(`${BASE}/regras`, body),
  atualizarRegra: (id: number | string, body: Partial<RegraLSP>) =>
    api.post<RegraLSP>(`${BASE}/regras/${id}`, body),
  alterarStatusRegra: (id: number | string, novo_status: StatusRegra, motivo: string) =>
    api.post<RegraLSP>(`${BASE}/regras/${id}/status`, { novo_status, motivo }),
  exportarRegraTxtUrl: (id: number | string) => api.getExportUrl(`${BASE}/regras/${id}/export`),
  validarRegra: (id: number | string) =>
    safe(api.post<ValidacaoRegra>(`${BASE}/regras/${id}/validar`), { avisos: [] }),
  listarVersoes: async (id: number | string) =>
    safe(getList<RegraVersao>(`${BASE}/regras/${id}/versoes`), [] as RegraVersao[]),

  // Identificadores
  listarIdentificadores: (f?: IdentificadorFiltros) =>
    getList<Identificador>(`${BASE}/identificadores`, f),
  alterarSituacao: (p: AlterarSituacaoPayload) =>
    api.post(`${BASE}/identificadores/alterar-situacao`, p),
  alterarRegraVinculada: (p: AlterarRegraPayload) =>
    api.post(`${BASE}/identificadores/alterar-regra`, p),
  gerarSnapshot: () => api.post<SnapshotEntry>(`${BASE}/identificadores/snapshot`),
  listarSnapshots: () =>
    safe(getList<SnapshotEntry>(`${BASE}/identificadores/snapshots`), [] as SnapshotEntry[]),
  downloadSnapshotUrl: (id: number | string) =>
    api.getExportUrl(`${BASE}/identificadores/snapshots/${id}`),

  // Auditoria
  listarAuditoria: (f?: { de?: string; ate?: string; acao?: string; usuario?: string; codemp?: number; modsis?: string; idereg?: string }) =>
    getList<AuditoriaEntry>(`${BASE}/auditoria`, f),
};
