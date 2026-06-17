import { getApiUrl } from '@/lib/api';

export const DRE_DRILL_TYPES = {
  CENTRO_CUSTOS: 'CENTRO_CUSTOS',
  CONTA_CONTABIL: 'CONTA_CONTABIL',
  HISTORICO: 'HISTORICO',
  LANCAMENTO: 'LANCAMENTO',
  ORIGEM: 'ORIGEM',
  TRANSACAO: 'TRANSACAO',
  UNIDADE: 'UNIDADE',
  REABRIR: 'REABRIR',
} as const;

export type DreDrillTipo = keyof typeof DRE_DRILL_TYPES;

const DRE_DRILL_ALLOWED = Object.keys(DRE_DRILL_TYPES) as DreDrillTipo[];

export function normalizeDreDrillType(value?: string | null): DreDrillTipo {
  const normalized = String(value || 'CONTA_CONTABIL').trim().toUpperCase();
  return (DRE_DRILL_ALLOWED as string[]).includes(normalized)
    ? (normalized as DreDrillTipo)
    : 'CONTA_CONTABIL';
}

export const DRE_DRILL_LABELS: Record<DreDrillTipo, string> = {
  REABRIR: 'Reabrir',
  CENTRO_CUSTOS: 'Centro de Custos',
  CONTA_CONTABIL: 'Conta Contábil',
  ORIGEM: 'Origem do Lançamento',
  TRANSACAO: 'Transação',
  HISTORICO: 'Histórico',
  LANCAMENTO: 'Lançamento',
  UNIDADE: 'Unidade de Negócio',
};

export interface DreDrillParams {
  ano: number;
  mes_ini: string;
  mes_fim: string;
  codigo_linha: string;
  tipo_drill: DreDrillTipo;
  unidade?: string;
  anomes_referente?: string | null;
}

export interface DreDrillColumn {
  key: string;
  label: string;
  format?: 'currency' | 'number' | 'text';
}

export interface DreDrillRow {
  chave?: string;
  descricao?: string;
  vl_realizado?: number;
  // Campos extras presentes em LANCAMENTO
  nr_lancamento?: string;
  nr_lote?: string;
  nr_documento?: string;
  cd_conta?: string;
  cd_cencus?: string;
  cd_origem?: string;
  cd_transacao?: string;
  ds_historico?: string;
  anomes_referente?: number | string;
  [k: string]: any;
}

export interface DreDrillResponse {
  tipo_drill: DreDrillTipo;
  codigo_linha: string;
  periodo: {
    ano: number;
    mes_ini: string;
    mes_fim: string;
    anomes_referente: string | null;
  };
  unidade: string | null;
  columns: DreDrillColumn[];
  rows: DreDrillRow[];
  total?: number;
}

export async function fetchDreDrill(params: DreDrillParams): Promise<DreDrillResponse> {
  const base = getApiUrl();
  const unidade =
    params.unidade && params.unidade.toUpperCase() !== 'TODOS' ? params.unidade : '';
  const qs = new URLSearchParams({
    ano: String(params.ano),
    mes_ini: params.mes_ini,
    mes_fim: params.mes_fim,
    codigo_linha: params.codigo_linha,
    tipo_drill: params.tipo_drill,
    anomes_referente: params.anomes_referente ? String(params.anomes_referente) : '',
    unidade,
  });
  const url = `${base}/api/bi/contabilidade/dre-drill?${qs.toString()}`;
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('erp_token') : null;
  const resp = await fetch(url, {
    method: 'GET',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'ngrok-skip-browser-warning': 'true',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!resp.ok) {
    let detail = `HTTP ${resp.status}`;
    try {
      const j = await resp.json();
      if (j?.detail) detail = j.detail;
    } catch {
      /* ignore */
    }
    throw new Error(detail);
  }
  const raw = await resp.json().catch(() => ({}));
  const r = (raw && typeof raw === 'object' ? raw : {}) as Partial<DreDrillResponse>;
  return {
    tipo_drill: (r.tipo_drill ?? params.tipo_drill) as DreDrillTipo,
    codigo_linha: r.codigo_linha ?? params.codigo_linha,
    periodo: r.periodo ?? {
      ano: params.ano,
      mes_ini: params.mes_ini,
      mes_fim: params.mes_fim,
      anomes_referente: params.anomes_referente ?? null,
    },
    unidade: r.unidade ?? null,
    columns: Array.isArray(r.columns) ? r.columns : [],
    rows: Array.isArray(r.rows) ? r.rows : [],
    total: typeof r.total === 'number' ? r.total : 0,
  };
}
