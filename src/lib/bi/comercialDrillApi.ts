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

function toNumberOrNull(v: any): number | null {
  if (v == null || v === '') return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v === 'string' && isNumericString(v)) {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function toNumberSafe(value: any): number {
  if (value == null || value === '') return 0;
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const s = String(value).trim();
  if (!s) return 0;
  const hasComma = s.includes(',');
  const normalized = hasComma ? s.replace(/\./g, '').replace(',', '.') : s;
  const n = Number(normalized);
  return Number.isFinite(n) ? n : 0;
}

function getNotaKey(row: any): string {
  const emp = String(row?.cd_empresa ?? '').trim();
  const fil = String(row?.cd_filial ?? '').trim();
  const nf = String(row?.cd_nf ?? row?.nf ?? '').trim();
  const serie = String(row?.cd_serie ?? row?.serie ?? '').trim();
  if (emp || fil) return `${emp}|${fil}|${nf}|${serie}`;
  return `${nf}|${serie}`;
}

function getValorTotalLinha(row: any): number {
  return toNumberSafe(
    row?.vl_total ?? row?.vl_tot_fat ?? row?.vl_bruto ?? row?.valor_total ?? row?.vl_contabil ?? 0,
  );
}

function getValorLiquidoLinha(row: any): number {
  return toNumberSafe(
    row?.vl_liquido ??
      row?.vl_tot_liq ??
      row?.valor_liquido ??
      row?.liquido ??
      row?.vl_total_liquido ??
      0,
  );
}

const NOTA_TOTAL_KEYS = ['vl_total_nota', 'total_nota', 'vl_nf', 'valor_total_nota'] as const;
const NOTA_LIQUIDO_KEYS = ['vl_liquido_nota', 'total_liquido_nota', 'valor_liquido_nota'] as const;

/**
 * Enriquece colunas/linhas com Total da Nota e Total Líquido da Nota,
 * agrupados por NF (cd_empresa|cd_filial|cd_nf|cd_serie). Valores são
 * repetidos em todas as linhas da mesma NF.
 *
 * Só aplica em drills que tenham indício de NF por linha. Caso contrário,
 * retorna inalterado para não poluir drills agregadas.
 */
export function enrichRowsWithNotaTotals(resp: Pick<DrillResponse, 'columns' | 'rows'>): {
  columns: DrillColumn[];
  rows: DrillRow[];
} {
  const cols = [...(resp.columns ?? [])];
  const rows = [...(resp.rows ?? [])];

  if (!rows.length) return { columns: cols, rows };

  const hasNfCol = cols.some((c) => c.key === 'cd_nf' || c.key === 'nf');
  const hasNfInRow = rows.some(
    (r) => (r && r.cd_nf != null && r.cd_nf !== '') || (r && (r as any).nf != null && (r as any).nf !== ''),
  );
  if (!hasNfCol && !hasNfInRow) return { columns: cols, rows };

  const alreadyHasTotalNota = cols.some((c) => c.key === 'total_nota');
  const alreadyHasLiquidoNota = cols.some((c) => c.key === 'total_liquido_nota');

  const backendTotalKey = NOTA_TOTAL_KEYS.find((k) => rows.some((r) => r?.[k] != null && r?.[k] !== ''));
  const backendLiquidoKey = NOTA_LIQUIDO_KEYS.find((k) => rows.some((r) => r?.[k] != null && r?.[k] !== ''));

  let totalsMap: Map<string, { totalNota: number; totalLiquidoNota: number }> | null = null;
  if (!backendTotalKey || !backendLiquidoKey) {
    totalsMap = new Map();
    for (const r of rows) {
      const key = getNotaKey(r);
      if (!key.replace(/\|/g, '').trim()) continue;
      const cur = totalsMap.get(key) ?? { totalNota: 0, totalLiquidoNota: 0 };
      cur.totalNota += getValorTotalLinha(r);
      cur.totalLiquidoNota += getValorLiquidoLinha(r);
      totalsMap.set(key, cur);
    }
  }

  const enrichedRows: DrillRow[] = rows.map((r) => {
    const key = getNotaKey(r);
    const agg = totalsMap?.get(key);
    const totalNota = backendTotalKey
      ? toNumberSafe(r?.[backendTotalKey])
      : agg?.totalNota ?? 0;
    const totalLiquidoNota = backendLiquidoKey
      ? toNumberSafe(r?.[backendLiquidoKey])
      : agg?.totalLiquidoNota ?? 0;
    return { ...r, total_nota: totalNota, total_liquido_nota: totalLiquidoNota };
  });

  const newCols: DrillColumn[] = [...cols];
  if (!alreadyHasTotalNota) {
    newCols.push({ key: 'total_nota', label: 'Total da Nota', align: 'right', format: 'currency' });
  }
  if (!alreadyHasLiquidoNota) {
    newCols.push({
      key: 'total_liquido_nota',
      label: 'Total Líquido da Nota',
      align: 'right',
      format: 'currency',
    });
  }

  return { columns: newCols, rows: enrichedRows };
}

/** Chaves que NÃO devem ser somadas no rodapé TOTAL (evita duplicar valores por NF). */
const SKIP_TOTAL_SUM_KEYS = new Set(['total_nota', 'total_liquido_nota']);

/**
 * Enriquece a resposta de drill para exportação:
 *  - insere coluna "Valor Líquido" (calculada) logo após valor_total quando aplicável;
 *  - adiciona colunas Total da Nota / Total Líquido da Nota agrupadas por NF;
 *  - acrescenta linha "TOTAL" somando colunas numéricas/monetárias (exceto totais por NF).
 */
function withLiquidoAndTotals(resp: DrillResponse): { columns: DrillColumn[]; rows: DrillRow[] } {
  const cols = [...(resp.columns ?? [])];
  const rows = [...(resp.rows ?? [])];

  const hasKey = (k: string) => cols.some((c) => c.key === k);
  const hasValorTotal = hasKey('valor_total');
  const hasAnyReductor =
    hasKey('valor_devolucao') || hasKey('valor_impostos') || hasKey('valor_desconto');
  const hasLiquidoBackend = hasKey('valor_liquido') || hasKey('fat_liquido');

  let workingRows: DrillRow[] = rows;
  let workingCols: DrillColumn[] = cols;

  // 1) Coluna Valor Líquido (se possível e não vier do backend)
  if (hasValorTotal && hasAnyReductor && !hasLiquidoBackend) {
    workingRows = rows.map((r) => {
      const vt = Number(r.valor_total) || 0;
      const vd = Number(r.valor_devolucao) || 0;
      const vi = Number(r.valor_impostos) || 0;
      const vds = Number(r.valor_desconto) || 0;
      const liquido = vt - vd - Math.abs(vi) - vds;
      return { ...r, valor_liquido: liquido };
    });
    const idx = cols.findIndex((c) => c.key === 'valor_total');
    const liquidoCol: DrillColumn = {
      key: 'valor_liquido',
      label: 'Valor Líquido',
      align: 'right',
      format: 'currency',
    };
    workingCols = [...cols.slice(0, idx + 1), liquidoCol, ...cols.slice(idx + 1)];
  }

  // 2) Total da Nota / Total Líquido da Nota
  const enriched = enrichRowsWithNotaTotals({ columns: workingCols, rows: workingRows });
  workingCols = enriched.columns;
  workingRows = enriched.rows;

  // 3) Linha TOTAL
  const totalRow: DrillRow = {};
  let labelPlaced = false;
  workingCols.forEach((c) => {
    if ((c.format === 'currency' || c.format === 'number') && !SKIP_TOTAL_SUM_KEYS.has(c.key)) {
      let sum = 0;
      let any = false;
      for (const r of workingRows) {
        const n = toNumberOrNull(r[c.key]);
        if (n !== null) {
          sum += n;
          any = true;
        }
      }
      totalRow[c.key] = any ? sum : '';
    } else if (SKIP_TOTAL_SUM_KEYS.has(c.key)) {
      totalRow[c.key] = '';
    } else if (!labelPlaced) {
      totalRow[c.key] = 'TOTAL';
      labelPlaced = true;
    } else {
      totalRow[c.key] = '';
    }
  });
  if (!labelPlaced && workingCols.length > 0) {
    totalRow[workingCols[0].key] = 'TOTAL';
  }
  workingRows = [...workingRows, totalRow];

  return { columns: workingCols, rows: workingRows };
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
  const { columns: cols, rows } = withLiquidoAndTotals(resp);
  const header = cols.map((c) => c.label).join(';');
  const lines = rows.map((row) =>
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
  const { columns: cols, rows } = withLiquidoAndTotals(resp);
  const header = cols.map((c) => c.label);
  const data = rows.map((row) =>
    cols.map((c) => {
      const v = row[c.key];
      if (v == null || v === '') return '';
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
