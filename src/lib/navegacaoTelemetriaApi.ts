import { api } from '@/lib/api';

export type TelemetriaOrigem = 'web' | 'nativo';

export const TELEMETRIA_BASE: Record<TelemetriaOrigem, string> = {
  web: '/api/navegacao/telemetria',
  nativo: '/api/telemetria-nativa',
};

export interface TelemetriaFiltros {
  dias: number;
  modulo?: string;
  usuario_filtro?: string;
}

export interface TelemetriaResumo {
  total_acessos: number | null;
  telas_usadas: number | null;
  telas_catalogo?: number | null;
  telas_sem_uso: number | null;
  usuarios_ativos: number | null;
  ultimo_acesso: string | null;
  fonte?: string | null;
}

export interface TelemetriaRankingRow {
  cod_tela: string | null;
  sig_processo?: string | null;
  nome_tela: string | null;
  modulo: string | null;
  acessos: number | null;
  usuarios: number | null;
  primeiro_acesso: string | null;
  ultimo_acesso: string | null;
  fonte?: string | null;
  /** Login do usuário (identidade principal na telemetria nativa). */
  nomusu?: string | null;
  /** Código do usuário (opcional — pode vir nulo em eventos antigos). */
  codusu?: number | string | null;
}

export interface TelemetriaPorDiaRow {
  dia: string;
  acessos: number | null;
  usuarios: number | null;
  telas: number | null;
}

export interface TelemetriaNaoUtilizadaRow {
  cod_tela: string | null;
  sig_processo?: string | null;
  nome_tela: string | null;
  modulo: string | null;
  ultimo_acesso: string | null;
  dias_sem_uso: number | null;
  total_historico: number | null;
}

export interface HistoricoTelaRow {
  data_hora: string | null;
  usuario?: string | null;
  nomusu?: string | null;
  acao: string | null;
  modulo: string | null;
  sistema?: string | null;
  observacao?: string | null;
}

const asArray = <T,>(payload: any, ...keys: string[]): T[] => {
  if (Array.isArray(payload)) return payload as T[];
  if (!payload) return [];
  for (const k of keys) if (Array.isArray(payload[k])) return payload[k] as T[];
  return [];
};

function withFiltros(f: TelemetriaFiltros, extra: Record<string, any> = {}) {
  return {
    dias: f.dias,
    modulo: f.modulo || undefined,
    usuario_filtro: f.usuario_filtro || undefined,
    ...extra,
  };
}

export async function fetchTelemetriaResumo(origem: TelemetriaOrigem, f: TelemetriaFiltros): Promise<TelemetriaResumo> {
  return api.get<TelemetriaResumo>(`${TELEMETRIA_BASE[origem]}/resumo`, withFiltros(f));
}

export async function fetchTelemetriaRanking(origem: TelemetriaOrigem, f: TelemetriaFiltros, limit = 100): Promise<TelemetriaRankingRow[]> {
  const r = await api.get<any>(`${TELEMETRIA_BASE[origem]}/ranking`, withFiltros(f, { limit }));
  return asArray<TelemetriaRankingRow>(r, 'ranking', 'dados');
}

export async function fetchTelemetriaPorDia(origem: TelemetriaOrigem, f: TelemetriaFiltros): Promise<TelemetriaPorDiaRow[]> {
  const r = await api.get<any>(`${TELEMETRIA_BASE[origem]}/por-dia`, withFiltros(f));
  return asArray<TelemetriaPorDiaRow>(r, 'por_dia', 'dados');
}

export async function fetchTelemetriaNaoUtilizadas(origem: TelemetriaOrigem, f: TelemetriaFiltros): Promise<TelemetriaNaoUtilizadaRow[]> {
  const r = await api.get<any>(`${TELEMETRIA_BASE[origem]}/nao-utilizadas`, withFiltros(f));
  return asArray<TelemetriaNaoUtilizadaRow>(r, 'telas', 'dados');
}

export async function fetchHistoricoTela(params: {
  origem: TelemetriaOrigem;
  cod_tela: string;
  dias: number;
}): Promise<HistoricoTelaRow[]> {
  if (params.origem === 'web') {
    const r = await api.get<any>('/api/navegacao/historico', {
      cod_tela: params.cod_tela,
      incluir_heartbeat: false,
      tamanho_pagina: 200,
    });
    return asArray<HistoricoTelaRow>(r, 'dados', 'historico');
  }
  const r = await api.get<any>('/api/telemetria-nativa/eventos', {
    cod_tela: params.cod_tela,
    dias: params.dias,
    limit: 200,
  });
  return asArray<HistoricoTelaRow>(r, 'dados', 'eventos');
}
