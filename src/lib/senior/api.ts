import { api } from '@/lib/api';
import type {
  RegraLSP, RegraFiltros, Identificador, IdentificadorFiltros,
  AuditoriaEntry, DashboardResumo, AlterarSituacaoPayload, AlterarRegraPayload,
  StatusRegra,
} from './types';

const BASE = '/api/senior';

export const seniorApi = {
  // Dashboard
  resumo: () => api.get<DashboardResumo>(`${BASE}/resumo`).catch(() => null),

  // Regras LSP
  listarRegras: (f?: RegraFiltros) => api.get<RegraLSP[]>(`${BASE}/regras`, f),
  obterRegra: (id: number | string) => api.get<RegraLSP>(`${BASE}/regras/${id}`),
  criarRegra: (body: Partial<RegraLSP>) => api.post<RegraLSP>(`${BASE}/regras`, body),
  atualizarRegra: (id: number | string, body: Partial<RegraLSP>) =>
    (api as any).request
      ? (api as any).request(`${BASE}/regras/${id}`, { method: 'PUT', body: JSON.stringify(body) })
      : api.post<RegraLSP>(`${BASE}/regras/${id}`, body),
  alterarStatusRegra: (id: number | string, novo_status: StatusRegra, motivo: string) =>
    api.post<RegraLSP>(`${BASE}/regras/${id}/status`, { novo_status, motivo }),
  exportarRegraTxtUrl: (id: number | string) => api.getExportUrl(`${BASE}/regras/${id}/export`),

  // Identificadores
  listarIdentificadores: (f?: IdentificadorFiltros) =>
    api.get<Identificador[]>(`${BASE}/identificadores`, f),
  alterarSituacao: (p: AlterarSituacaoPayload) =>
    api.post(`${BASE}/identificadores/alterar-situacao`, p),
  alterarRegraVinculada: (p: AlterarRegraPayload) =>
    api.post(`${BASE}/identificadores/alterar-regra`, p),
  gerarSnapshot: () => api.post(`${BASE}/identificadores/snapshot`),

  // Auditoria
  listarAuditoria: (f?: { de?: string; ate?: string; acao?: string; usuario?: string }) =>
    api.get<AuditoriaEntry[]>(`${BASE}/auditoria`, f),
};
