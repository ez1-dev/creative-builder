import { api } from "@/lib/api";

export type TipLog = "I" | "A" | "E";

export interface MonitorErpFiltros {
  dias?: number;
  tela?: string;
  tabela?: string;
  usuario_filtro?: string;
  tiplog?: TipLog | "";
}

export interface MonitorErpResumo {
  total_gravacoes?: number;
  telas_usadas?: number;
  telas_sem_uso?: number;
  usuarios_ativos?: number;
  inclusoes?: number;
  alteracoes?: number;
  exclusoes?: number;
  fonte?: string;
  [k: string]: any;
}

export interface MonitorErpRankingTela {
  tela?: string | null;
  tabela?: string | null;
  gravacoes?: number;
  usuarios?: number;
  inclusoes?: number;
  alteracoes?: number;
  exclusoes?: number;
  ultimo_dia?: string | null;
  [k: string]: any;
}

export interface MonitorErpUsuario {
  usuario?: string | null;
  gravacoes?: number;
  telas?: number;
  inclusoes?: number;
  alteracoes?: number;
  exclusoes?: number;
  ultimo_dia?: string | null;
  [k: string]: any;
}

export interface MonitorErpEvento {
  data_hora?: string | null;
  dia?: string | null;
  usuario?: string | null;
  tela?: string | null;
  tabela?: string | null;
  tiplog?: TipLog | string | null;
  acao?: string | null;
  chave?: string | null;
  [k: string]: any;
}

export interface MonitorErpPorDia {
  dia?: string | null;
  gravacoes?: number;
  usuarios?: number;
  telas?: number;
  [k: string]: any;
}

export interface MonitorErpSemUso {
  tela?: string | null;
  tabela?: string | null;
  ultimo_dia?: string | null;
  dias_sem_uso?: number;
  total_historico?: number;
  [k: string]: any;
}

function buildParams(f: MonitorErpFiltros, extra?: Record<string, any>) {
  const out: Record<string, any> = {};
  if (f.dias !== undefined && f.dias !== null) out.dias = f.dias;
  if (f.tela && f.tela.trim()) out.tela = f.tela.trim();
  if (f.tabela && f.tabela.trim()) out.tabela = f.tabela.trim();
  if (f.usuario_filtro && f.usuario_filtro.trim()) out.usuario_filtro = f.usuario_filtro.trim();
  if (f.tiplog && f.tiplog.trim && f.tiplog.trim()) out.tiplog = f.tiplog;
  if (extra) {
    for (const [k, v] of Object.entries(extra)) {
      if (v !== undefined && v !== null && v !== "") out[k] = v;
    }
  }
  return out;
}

function unwrap<T>(raw: any, keys: string[]): T[] {
  if (Array.isArray(raw)) return raw as T[];
  if (raw && typeof raw === "object") {
    for (const k of keys) {
      if (Array.isArray(raw[k])) return raw[k] as T[];
    }
  }
  return [];
}

export async function getResumo(f: MonitorErpFiltros): Promise<MonitorErpResumo> {
  const raw = await api.get<any>("/api/monitor-erp-nativo/resumo", buildParams(f));
  return (raw?.resumo ?? raw ?? {}) as MonitorErpResumo;
}

export async function getRanking(f: MonitorErpFiltros, limit = 100): Promise<MonitorErpRankingTela[]> {
  const raw = await api.get<any>("/api/monitor-erp-nativo/ranking", buildParams(f, { limit }));
  return unwrap<MonitorErpRankingTela>(raw, ["ranking", "itens", "data", "rows"]);
}

export async function getPorDia(f: MonitorErpFiltros): Promise<MonitorErpPorDia[]> {
  const raw = await api.get<any>("/api/monitor-erp-nativo/por-dia", buildParams(f));
  return unwrap<MonitorErpPorDia>(raw, ["serie", "por_dia", "itens", "data", "rows"]);
}

export async function getUsuarios(f: MonitorErpFiltros, limit = 200): Promise<MonitorErpUsuario[]> {
  const raw = await api.get<any>("/api/monitor-erp-nativo/usuarios", buildParams(f, { limit }));
  return unwrap<MonitorErpUsuario>(raw, ["usuarios", "itens", "data", "rows"]);
}

export async function buscarEventos(f: MonitorErpFiltros, limit = 200): Promise<MonitorErpEvento[]> {
  const raw = await api.get<any>("/api/monitor-erp-nativo/buscar", buildParams(f, { limit }));
  return unwrap<MonitorErpEvento>(raw, ["eventos", "itens", "data", "rows"]);
}

export async function getSemUso(dias: number): Promise<MonitorErpSemUso[]> {
  const raw = await api.get<any>("/api/monitor-erp-nativo/sem-uso", { dias });
  return unwrap<MonitorErpSemUso>(raw, ["telas", "itens", "data", "rows"]);
}

export function mapTiplog(t?: string | null): {
  label: string;
  variant: "default" | "secondary" | "destructive" | "outline";
} {
  const v = (t ?? "").toString().toUpperCase();
  if (v === "I") return { label: "Inclusão", variant: "default" };
  if (v === "A") return { label: "Alteração", variant: "secondary" };
  if (v === "E") return { label: "Exclusão", variant: "destructive" };
  return { label: v || "-", variant: "outline" };
}
