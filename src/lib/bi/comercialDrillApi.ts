import { api } from '@/lib/api';
import { compactDrillContext } from './comercialDrillContract';

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
  qtd_linhas_apos_origem?: number;
  qtd_linhas_apos_nf?: number;
  qtd_linhas_apos_categoria?: number;
  qtd_linhas_apos_obra?: number;
  qtd_linhas_apos_tns?: number;
  qtd_linhas_apos_tp_movimento?: number;
  qtd_linhas_apos_derivacao?: number;
  filtro_que_zerou?: string;
  filtros_aplicados?: Record<string, any>;
  /** Payload contexto efetivamente enviado ao backend (preenchido no client). */
  payload_enviado?: Record<string, any>;
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


/** Remove campos nulos/vazios/sentinela do contexto antes de enviar à FastAPI. */
function cleanContexto(ctx: DrillContexto): DrillContexto {
  return compactDrillContext(ctx);
}

export async function fetchComercialDrill(req: DrillRequest): Promise<DrillResponse> {
  const contextoLimpo = cleanContexto(req.contexto || {});
  const body = {
    drill_type: req.drill_type,
    anomes_ini: req.anomes_ini,
    anomes_fim: req.anomes_fim,
    unidade_negocio: req.unidade_negocio,
    contexto: contextoLimpo,
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
  const diagBackend = ((r as any).diagnostico ?? {}) as DrillDiagnostico;
  // Anexa o payload efetivamente enviado ao diagnóstico para a UI exibir.
  const diagnostico: DrillDiagnostico = {
    ...diagBackend,
    payload_enviado: {
      drill_type: body.drill_type,
      anomes_ini: body.anomes_ini,
      anomes_fim: body.anomes_fim,
      unidade_negocio: body.unidade_negocio,
      contexto: contextoLimpo,
    },
  };
  return {
    titulo: r.titulo ?? '',
    drill_type: (r.drill_type ?? req.drill_type) as DrillType,
    breadcrumb: Array.isArray(r.breadcrumb) ? r.breadcrumb : [],
    columns: Array.isArray(r.columns) ? r.columns : [],
    rows: Array.isArray(r.rows) ? r.rows : [],
    total: typeof r.total === 'number' ? r.total : (Array.isArray(r.rows) ? r.rows.length : 0),
    page: typeof r.page === 'number' ? r.page : (req.page ?? 1),
    diagnostico,
    page_size: typeof r.page_size === 'number' ? r.page_size : (req.page_size ?? 100),
  };
}

function isNumericString(value: string): boolean {
  return /^-?\d+(\.\d+)?$/.test(value.trim());
}

function fmtCsvValue(v: any, format?: DrillColumn['format']): string {
  if (v == null) return '';

  if (typeof v === 'number') {
    return Number.isFinite(v) ? String(v).replace('.', ',') : '';
  }

  if (format === 'currency' || format === 'number') {
    const num = Number(v);
    if (Number.isFinite(num)) return String(v).replace('.', ',');
  }

  const s = String(v);

  if (isNumericString(s)) {
    return s.replace('.', ',');
  }

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

export async function downloadDrillXlsx(resp: DrillResponse, filename?: string) {
  const XLSX = await import('xlsx');
  const cols = resp.columns ?? [];
  const header = cols.map((c) => c.label);
  const data = (resp.rows ?? []).map((row) =>
    cols.map((c) => {
      const v = row[c.key];
      if (v == null) return '';
      if (typeof v === 'number') return Number.isFinite(v) ? v : '';
      if (c.format === 'currency' || c.format === 'number') {
        const n = Number(v);
        if (Number.isFinite(n)) return n;
      }
      if (typeof v === 'string' && isNumericString(v)) {
        const n = Number(v);
        if (Number.isFinite(n)) return n;
      }
      return String(v);
    }),
  );
  const ws = XLSX.utils.aoa_to_sheet([header, ...data]);
  const ref = ws['!ref'];
  if (ref) {
    const range = XLSX.utils.decode_range(ref);
    cols.forEach((c, ci) => {
      const isCurrency = c.format === 'currency';
      const isNumber = c.format === 'number';
      if (!isCurrency && !isNumber) return;
      for (let r = 1; r <= range.e.r; r++) {
        const addr = XLSX.utils.encode_cell({ r, c: ci });
        const cell = (ws as any)[addr];
        if (cell && typeof cell.v === 'number') {
          cell.t = 'n';
          cell.z = isCurrency ? 'R$ #,##0.00' : '#,##0.00';
        }
      }
    });
  }
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Drill');
  XLSX.writeFile(wb, filename || `drill-${resp.drill_type.toLowerCase()}.xlsx`);
}
