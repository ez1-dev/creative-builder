import { api } from "@/lib/api";
import type {
  MenuItemRh,
  ResumoFolhaItem,
  QuadroColaboradorItem,
  ContratoExperienciaItem,
  ProgramacaoFeriasItem,
  FormularioRh,
  NovoFormularioPayload,
} from "./types";

// Aceita lista direta ou objeto com "dados"/"items"/"data"
function unwrap<T>(resp: any): T[] {
  if (Array.isArray(resp)) return resp as T[];
  if (Array.isArray(resp?.dados)) return resp.dados as T[];
  if (Array.isArray(resp?.items)) return resp.items as T[];
  if (Array.isArray(resp?.data)) return resp.data as T[];
  if (Array.isArray(resp?.resultados)) return resp.resultados as T[];
  return [];
}

function cleanParams<T extends Record<string, any>>(p?: T): Record<string, any> | undefined {
  if (!p) return undefined;
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(p)) {
    if (v === undefined || v === null || v === "" || v === "__all__") continue;
    out[k] = v;
  }
  return Object.keys(out).length ? out : undefined;
}

export async function fetchMenuRh(): Promise<MenuItemRh[]> {
  const resp = await api.get<any>("/api/rh/menu");
  return unwrap<MenuItemRh>(resp);
}

export interface ResumoFolhaParams {
  anomes_ini: string;
  anomes_fim: string;
  filial?: string;
  matricula?: string;
}
export async function fetchResumoFolha(p: ResumoFolhaParams): Promise<ResumoFolhaItem[]> {
  const resp = await api.get<any>("/api/rh/resumo-folha", cleanParams(p));
  return unwrap<ResumoFolhaItem>(resp);
}

export interface QuadroColaboradoresParams {
  filial?: string;
  situacao?: string;
  centro_custo?: string;
  cargo?: string;
  colaborador?: string;
}
export async function fetchQuadroColaboradores(p?: QuadroColaboradoresParams): Promise<QuadroColaboradorItem[]> {
  const resp = await api.get<any>("/api/rh/quadro-colaboradores", cleanParams(p));
  return unwrap<QuadroColaboradorItem>(resp);
}

export interface ContratoExperienciaParams {
  status?: string;
  filial?: string;
  colaborador?: string;
}
export async function fetchContratoExperiencia(p?: ContratoExperienciaParams): Promise<ContratoExperienciaItem[]> {
  const resp = await api.get<any>("/api/rh/contrato-experiencia", cleanParams(p));
  return unwrap<ContratoExperienciaItem>(resp);
}

export interface ProgramacaoFeriasParams {
  status?: string;
  filial?: string;
  centro_custo?: string;
  colaborador?: string;
}
export async function fetchProgramacaoFerias(p?: ProgramacaoFeriasParams): Promise<ProgramacaoFeriasItem[]> {
  const resp = await api.get<any>("/api/rh/programacao-ferias", cleanParams(p));
  return unwrap<ProgramacaoFeriasItem>(resp);
}

export async function fetchFormularios(): Promise<FormularioRh[]> {
  const resp = await api.get<any>("/api/rh/formularios");
  return unwrap<FormularioRh>(resp);
}

export async function criarFormulario(payload: NovoFormularioPayload): Promise<FormularioRh> {
  return api.post<FormularioRh>("/api/rh/formularios", payload as any);
}

export async function atualizarStatusFormulario(id: number | string, cd_status: string): Promise<FormularioRh> {
  // Tenta PUT primeiro (api.put existe); backend pode aceitar PATCH equivalente.
  try {
    return await api.put<FormularioRh>(`/api/rh/formularios/${id}`, { cd_status });
  } catch (e) {
    // Fallback: POST no mesmo recurso com id + status (idempotente)
    return api.post<FormularioRh>(`/api/rh/formularios/${id}`, { cd_status });
  }
}

export interface SincronizarRhParams {
  anomes_ini: string;
  anomes_fim: string;
  codemp?: number;
}
export async function sincronizarRh(p: SincronizarRhParams): Promise<any> {
  const qs = new URLSearchParams({
    anomes_ini: p.anomes_ini,
    anomes_fim: p.anomes_fim,
    codemp: String(p.codemp ?? 1),
  }).toString();
  return api.post<any>(`/api/rh/sync?${qs}`);
}
