// Cliente do novo endpoint agregado de drill da DRE (backend contábil unificado).
// GET /api/contabil/drill-dre?modelo_id=&linha_id=&agrupar_por=...
// O backend resolve todas as contas vinculadas à linha e descendentes.
// O frontend NUNCA envia lista de contas nem infere drillabilidade.

import { contabilApi } from './contabilApi';

export const DRILL_DIMENSOES = [
  'centro_custo',
  'conta_contabil',
  'historico',
  'lancamento',
  'unidade_negocio',
] as const;

export type DrillDimensao = typeof DRILL_DIMENSOES[number];

/** Aliases aceitos vindos do backend na lista `drills` da matriz. */
export function normalizarDrillDimensao(value: string): DrillDimensao | null {
  const v = String(value || '').trim().toLowerCase();
  if (!v) return null;
  if (v === 'conta') return 'conta_contabil';
  if (v === 'ccu' || v === 'centro_de_custo' || v === 'centro') return 'centro_custo';
  if (v === 'unidade' || v === 'un') return 'unidade_negocio';
  if (v === 'hist') return 'historico';
  if (v === 'lct' || v === 'lancto') return 'lancamento';
  if ((DRILL_DIMENSOES as readonly string[]).includes(v)) return v as DrillDimensao;
  return null;
}

export const DRILL_LABELS: Record<DrillDimensao, string> = {
  centro_custo: 'Centro de Custos',
  conta_contabil: 'Conta Contábil',
  historico: 'Histórico',
  lancamento: 'Lançamento',
  unidade_negocio: 'Unidade de Negócio',
};

export interface DrillDreParams {
  modelo_id: string;
  linha_id: string;
  agrupar_por: DrillDimensao;
  /** Valor bruto do backend (`item.agrupar_por`), quando diferente da dimensão normalizada. */
  agrupar_por_raw?: string | null;
  /** Endpoint retornado pelo item do menu. Default: /api/contabil/drill-dre. */
  endpoint?: string | null;
  /** Ação do item (reabrir/consulta). Encaminhado ao backend quando presente. */
  acao?: string | null;
  codemp?: number | null;
  codfil?: number | null;
  anomes_ini: number | string;
  anomes_fim: number | string;
  unidade?: string | null;
  centro_custo?: string | null;
  modo_balanco?: string | null;
  consolidado?: boolean | null;
  page?: number;
  page_size?: number;
}


export interface DrillDreColumn {
  key: string;
  label: string;
  format?: 'currency' | 'number' | 'percent' | 'date' | 'text';
  align?: 'left' | 'right' | 'center';
}

export interface DrillDreResponse {
  modelo_id?: string;
  linha_id?: string;
  agrupar_por: DrillDimensao;
  columns: DrillDreColumn[];
  rows: Array<Record<string, any>>;
  total?: number | null;
  total_linha?: number | null;
  page?: number;
  page_size?: number;
  has_more?: boolean;
}

const HEURISTIC_CURRENCY = /(valor|debito|credito|saldo|total|movim)/i;
const HEURISTIC_DATE = /(data|dt_)/i;
const HEURISTIC_PERCENT = /(perc|percent|pct|%)/i;

function inferirFormato(key: string, sample: any): DrillDreColumn['format'] {
  if (HEURISTIC_DATE.test(key)) return 'date';
  if (HEURISTIC_PERCENT.test(key)) return 'percent';
  if (HEURISTIC_CURRENCY.test(key)) return 'currency';
  if (typeof sample === 'number') return 'number';
  return 'text';
}

function inferirColunas(rows: Array<Record<string, any>>): DrillDreColumn[] {
  if (!rows.length) return [];
  const first = rows[0];
  return Object.keys(first).map((k) => ({
    key: k,
    label: k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    format: inferirFormato(k, first[k]),
  }));
}

export async function fetchDrillDre(params: DrillDreParams): Promise<DrillDreResponse> {
  const query: Record<string, any> = {
    modelo_id: params.modelo_id,
    // Prioriza o valor bruto do backend (ex.: "conta"); se ausente, usa o normalizado.
    agrupar_por: params.agrupar_por_raw ?? params.agrupar_por,
    anomes_ini: params.anomes_ini,
    anomes_fim: params.anomes_fim,
  };
  query.linha_id = params.linha_id;
  if (params.codemp != null) query.codemp = params.codemp;
  if (params.codfil != null) query.codfil = params.codfil;
  if (params.unidade) query.unidade = params.unidade;
  if (params.centro_custo) query.centro_custo = params.centro_custo;
  if (params.modo_balanco) query.modo_balanco = params.modo_balanco;
  if (params.consolidado) query.consolidado = true;
  if (params.acao) query.acao = params.acao;
  if (params.page != null) query.page = params.page;
  if (params.page_size != null) query.page_size = params.page_size;

  const endpoint = params.endpoint || '/api/contabil/drill-dre';
  const data = await contabilApi.get<any>(endpoint, query);
  const rows = Array.isArray(data?.rows) ? data.rows
    : Array.isArray(data?.dados) ? data.dados
    : Array.isArray(data) ? data : [];
  const columns: DrillDreColumn[] = Array.isArray(data?.columns) && data.columns.length
    ? data.columns
    : inferirColunas(rows);

  return {
    modelo_id: data?.modelo_id ?? params.modelo_id,
    linha_id: data?.linha_id ?? params.linha_id,
    agrupar_por: (data?.agrupar_por as DrillDimensao) ?? params.agrupar_por,
    columns,
    rows,
    total: data?.total ?? data?.total_drill ?? null,
    total_linha: data?.total_linha ?? null,
    page: data?.page,
    page_size: data?.page_size,
    has_more: data?.has_more ?? false,
  };
}

