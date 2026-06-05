import { api } from '@/lib/api';

export type DrillType =
  | 'ACUMULADO'
  | 'MENSAL'
  | 'ESTADO'
  | 'CLIENTE'
  | 'REVENDA'
  | 'PRODUTO'
  | 'NOTA_FISCAL'
  | 'DETALHES_IMPOSTOS';

export interface DrillContexto {
  anomes_emissao?: string | null;
  cd_origem?: string | null;
  cd_estado?: string | null;
  cd_cliente?: string | null;
  cd_rev_pedido?: string | null;
  cd_prj?: string | null;
  cd_tns?: string | null;
  cd_tp_movimento?: string | null;
  cd_nf?: string | null;
  cd_produto?: string | null;
  cd_derivacao?: string | null;
  categoria_custom?: string | null;
}


export interface DrillRequest {
  drill_type: DrillType;
  anomes_ini: string;
  anomes_fim: string;
  unidade_negocio: 'GENIUS' | 'ESTRUTURAL ZORTEA' | 'CONSOLIDADO';
  contexto: DrillContexto;
  page?: number;
  page_size?: number;
}

export interface DrillColumn {
  key: string;
  label: string;
  align?: 'left' | 'right' | 'center';
  format?: 'currency' | 'number' | 'date' | 'text';
}

export interface DrillBreadcrumbItem {
  label: string;
  filtro: Record<string, any>;
}

export interface DrillDiagnostico {
  qtd_linhas_base?: number;
  qtd_linhas_apos_unidade?: number;
  qtd_linhas_apos_mes?: number;
  qtd_linhas_apos_cliente?: number;
  qtd_linhas_apos_uf?: number;
  qtd_linhas_apos_revenda?: number;
  qtd_linhas_apos_produto?: number;
  filtros_aplicados?: Record<string, any>;
}

export interface DrillRow extends Record<string, any> {
  filtros_drill?: Partial<DrillContexto>;
  nm_cliente?: string;
  nm_fantasia?: string;
  cliente_label?: string;
}

export interface DrillResponse {
  titulo: string;
  drill_type: DrillType;
  breadcrumb: DrillBreadcrumbItem[];
  columns: DrillColumn[];
  rows: DrillRow[];
  total: number;
  diagnostico?: DrillDiagnostico;
  page: number;
  page_size: number;
}

/** Remove campos nulos/vazios do contexto antes de enviar à FastAPI. */
function cleanContexto(ctx: DrillContexto): DrillContexto {
  const out: DrillContexto = {};
  (Object.keys(ctx) as (keyof DrillContexto)[]).forEach((k) => {
    const v = ctx[k];
    if (v != null && String(v).length > 0) (out as any)[k] = String(v);
  });
  return out;
}

export async function fetchComercialDrill(req: DrillRequest): Promise<DrillResponse> {
  const body = {
    drill_type: req.drill_type,
    anomes_ini: req.anomes_ini,
    anomes_fim: req.anomes_fim,
    unidade_negocio: req.unidade_negocio,
    contexto: cleanContexto(req.contexto || {}),
    page: req.page ?? 1,
    page_size: req.page_size ?? 100,
  };
  const data = await api.post<any>('/api/bi/comercial/drill', body);
  // Tolera envelope { bi_comercial_drill: ... }
  const unwrapped =
    data && typeof data === 'object' && 'bi_comercial_drill' in data
      ? (data as any).bi_comercial_drill
      : data;
  const r = (unwrapped ?? {}) as Partial<DrillResponse>;
  return {
    titulo: r.titulo ?? '',
    drill_type: (r.drill_type ?? req.drill_type) as DrillType,
    breadcrumb: Array.isArray(r.breadcrumb) ? r.breadcrumb : [],
    columns: Array.isArray(r.columns) ? r.columns : [],
    rows: Array.isArray(r.rows) ? r.rows : [],
    total: typeof r.total === 'number' ? r.total : (Array.isArray(r.rows) ? r.rows.length : 0),
    page: typeof r.page === 'number' ? r.page : (req.page ?? 1),
    diagnostico: (r as any).diagnostico ?? undefined,
    page_size: typeof r.page_size === 'number' ? r.page_size : (req.page_size ?? 100),
  };
}

function fmtCsvValue(v: any, format?: DrillColumn['format']): string {
  if (v == null) return '';
  if (format === 'currency' || format === 'number') {
    const num = Number(v);
    if (Number.isFinite(num)) return String(num).replace('.', ',');
    return String(v);
  }
  const s = String(v);
  if (s.includes('"') || s.includes(';') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function downloadDrillCsv(resp: DrillResponse, filename?: string) {
  const cols = resp.columns ?? [];
  const header = cols.map((c) => c.label).join(';');
  const lines = (resp.rows ?? []).map((row) =>
    cols.map((c) => fmtCsvValue(row[c.key], c.format)).join(';'),
  );
  const csv = '\uFEFF' + [header, ...lines].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || `drill-${resp.drill_type.toLowerCase()}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
