import { api } from '@/lib/api';

export interface TelemetriaFiltros {
  dias: number;
  modulo?: string;
  usuario_filtro?: string;
}

export interface TelemetriaResumo {
  total_acessos: number | null;
  telas_usadas: number | null;
  telas_sem_uso: number | null;
  usuarios_ativos: number | null;
  ultimo_acesso: string | null;
}

export interface TelemetriaRankingRow {
  cod_tela: string | null;
  nome_tela: string | null;
  modulo: string | null;
  acessos: number | null;
  usuarios: number | null;
  primeiro_acesso: string | null;
  ultimo_acesso: string | null;
}

export interface TelemetriaPorDiaRow {
  dia: string;
  acessos: number | null;
  usuarios: number | null;
  telas: number | null;
}

export interface TelemetriaNaoUtilizadaRow {
  cod_tela: string | null;
  nome_tela: string | null;
  modulo: string | null;
  ultimo_acesso: string | null;
  dias_sem_uso: number | null;
  total_historico: number | null;
}

export interface HistoricoTelaRow {
  data_hora: string | null;
  usuario: string | null;
  acao: string | null;
  modulo: string | null;
  sistema: string | null;
}

const asArray = <T,>(payload: any, key: string): T[] => {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && Array.isArray(payload[key])) return payload[key] as T[];
  return [];
};

export async function fetchTelemetriaResumo(f: TelemetriaFiltros): Promise<TelemetriaResumo> {
  return api.get<TelemetriaResumo>('/api/navegacao/telemetria/resumo', {
    dias: f.dias, modulo: f.modulo, usuario_filtro: f.usuario_filtro,
  });
}

export async function fetchTelemetriaRanking(f: TelemetriaFiltros, limit = 100): Promise<TelemetriaRankingRow[]> {
  const r = await api.get<any>('/api/navegacao/telemetria/ranking', {
    dias: f.dias, limit, modulo: f.modulo, usuario_filtro: f.usuario_filtro,
  });
  return asArray<TelemetriaRankingRow>(r, 'ranking');
}

export async function fetchTelemetriaPorDia(f: TelemetriaFiltros): Promise<TelemetriaPorDiaRow[]> {
  const r = await api.get<any>('/api/navegacao/telemetria/por-dia', {
    dias: f.dias, modulo: f.modulo, usuario_filtro: f.usuario_filtro,
  });
  return asArray<TelemetriaPorDiaRow>(r, 'por_dia');
}

export async function fetchTelemetriaNaoUtilizadas(f: TelemetriaFiltros): Promise<TelemetriaNaoUtilizadaRow[]> {
  const r = await api.get<any>('/api/navegacao/telemetria/nao-utilizadas', {
    dias: f.dias, modulo: f.modulo, usuario_filtro: f.usuario_filtro,
  });
  return asArray<TelemetriaNaoUtilizadaRow>(r, 'telas');
}

export async function fetchHistoricoTela(params: {
  cod_tela: string; data_ini: string; data_fim: string;
}): Promise<HistoricoTelaRow[]> {
  const r = await api.get<any>('/api/navegacao/historico', {
    cod_tela: params.cod_tela,
    data_ini: params.data_ini,
    data_fim: params.data_fim,
    incluir_heartbeat: false,
  });
  return asArray<HistoricoTelaRow>(r, 'historico');
}
