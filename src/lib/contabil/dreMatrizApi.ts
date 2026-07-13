// Client da matriz DRE (payload materializado pelo backend contábil unificado).
// Contrato: linhas[].valores["AAAAMM"].{realizado, orcado}. Frontend NÃO recalcula.

import { contabilApi } from './contabilApi';

export type Anomes = string; // "AAAAMM" ou "TOTAL_ANO"

export interface DreValorCelula {
  realizado: number | null;
  orcado: number | null;
  completo?: boolean;
  suspeito?: boolean;
  motivo_suspeita?: string | null;
}

export interface DreLinhaApi {
  descricao: string;
  codigo_linha?: string | null;
  tipo_linha?: string | null;
  ordem?: number | null;
  nivel?: number | null;
  negrito?: boolean;
  valores: Record<Anomes, DreValorCelula>;
}

export interface DreMatrizMeta {
  fonte_saldo: string | null;
  fonte_temporaria?: boolean;
  periodo: string | null;
  ultima_sincronizacao: string | null;
  ultima_materializacao: string | null;
  status: string | null;              // 'atualizado' | 'desatualizado' | 'nao_materializado' | ...
  sync_status?: string | null;         // 'ok' | 'erro' | 'em_andamento'
  status_fechamento?: string | null;
  status_conciliacao?: 'pendente' | 'conciliada' | 'divergente' | string | null;
  modelo_id: string | null;
  modelo_nome: string | null;
  meses_incompletos?: string[];
  conciliacao_divergente?: boolean;
}

export interface DreMatrizResponse {
  linhas: DreLinhaApi[];
  meta: DreMatrizMeta;
}

/** Fonte de saldo oficial usada durante a validação DRE × BI. */
export const FONTE_VALIDACAO_DRE = 'E640RAT';

export interface DreMatrizParams {
  ano: number;
  mes_ini: string;  // "01".."12"
  mes_fim: string;
  unidade?: string;
  modelo_id?: string | null;
}

function toNum(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  const s = String(v).trim().replace(/\./g, '').replace(',', '.');
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function normalizarCelula(raw: any): DreValorCelula {
  if (raw == null) return { realizado: null, orcado: null };
  if (typeof raw === 'number' || typeof raw === 'string') {
    return { realizado: toNum(raw), orcado: null };
  }
  return {
    realizado: toNum(raw.realizado ?? raw.valor ?? raw.real),
    orcado: toNum(raw.orcado ?? raw.orc ?? raw.budget),
    completo: raw.completo,
    suspeito: raw.suspeito,
    motivo_suspeita: raw.motivo_suspeita ?? raw.motivo ?? null,
  };
}

function normalizarLinha(raw: any): DreLinhaApi {
  const valores: Record<string, DreValorCelula> = {};
  const src = raw?.valores ?? {};
  for (const k of Object.keys(src)) {
    valores[String(k)] = normalizarCelula(src[k]);
  }
  return {
    descricao: String(raw?.descricao ?? raw?.mascara ?? '—'),
    codigo_linha: raw?.codigo_linha ?? raw?.codigo ?? null,
    tipo_linha: raw?.tipo_linha ?? raw?.tipo ?? null,
    ordem: raw?.ordem ?? null,
    nivel: raw?.nivel ?? null,
    negrito: !!(raw?.negrito ?? raw?.flag_negrito),
    valores,
  };
}

function normalizarMeta(raw: any): DreMatrizMeta {
  const m = raw ?? {};
  return {
    fonte_saldo: m.fonte_saldo ?? m.fonte ?? null,
    fonte_temporaria: !!m.fonte_temporaria,
    periodo: m.periodo ?? null,
    ultima_sincronizacao: m.ultima_sincronizacao ?? m.sincronizacao ?? null,
    ultima_materializacao: m.ultima_materializacao ?? m.materializacao ?? m.ultimo_calculo ?? null,
    status: m.status ?? null,
    sync_status: m.sync_status ?? null,
    status_fechamento: m.status_fechamento ?? null,
    modelo_id: m.modelo_id ?? null,
    modelo_nome: m.modelo_nome ?? m.modelo ?? null,
    meses_incompletos: Array.isArray(m.meses_incompletos) ? m.meses_incompletos.map(String) : [],
    conciliacao_divergente: !!m.conciliacao_divergente,
  };
}

export async function fetchDreMatriz(params: DreMatrizParams): Promise<DreMatrizResponse> {
  const anomes_ini = `${params.ano}${params.mes_ini}`;
  const anomes_fim = `${params.ano}${params.mes_fim}`;
  const query: Record<string, any> = {
    anomes_ini,
    anomes_fim,
    ano: params.ano,
    mes_ini: params.mes_ini,
    mes_fim: params.mes_fim,
  };
  if (params.unidade && params.unidade !== 'TODOS') query.unidade = params.unidade;
  if (params.modelo_id) query.modelo_id = params.modelo_id;

  const data = await contabilApi.get<any>('/api/contabil/dre/matriz', query);
  const linhas = Array.isArray(data?.linhas) ? data.linhas
    : Array.isArray(data?.data) ? data.data
    : Array.isArray(data) ? data : [];
  return {
    linhas: linhas.map(normalizarLinha),
    meta: normalizarMeta(data?.meta ?? data?.metadata ?? {}),
  };
}

export async function postDreSincronizarErp(params: { ano: number; mes_ini: string; mes_fim: string }): Promise<any> {
  return contabilApi.post('/api/contabil/dre/sincronizar', params);
}

export async function postDreRecalcular(params: { ano: number; mes_ini: string; mes_fim: string; modelo_id?: string | null }): Promise<any> {
  return contabilApi.post('/api/contabil/dre/recalcular', params);
}

export function buildAnomesRange(ano: number, mesIni: string, mesFim: string): string[] {
  const out: string[] = [];
  const ini = parseInt(mesIni, 10);
  const fim = parseInt(mesFim, 10);
  for (let m = ini; m <= fim; m++) {
    out.push(`${ano}${String(m).padStart(2, '0')}`);
  }
  return out;
}
