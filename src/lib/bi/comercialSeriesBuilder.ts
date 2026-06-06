/**
 * Builders das séries dinâmicas do BI Comercial.
 *
 * Catálogo gerado em pageRegistry: `mensal__<metric>`, `anual__<metric>`,
 * `por_<dim>__<metric>` (ver COMERCIAL_DIMENSOES / COMERCIAL_METRICAS).
 *
 * Métricas e dimensões aqui devem espelhar o catálogo. Quando o dado
 * agregado não existe ainda no backend, devolvemos array vazio — o
 * componente da Biblioteca BI desenha o estado vazio sem quebrar.
 */
import type {
  ComercialMensalRow,
  ComercialEstadoRow,
  ComercialRevendaRow,
  ComercialObrasRow,
  ComercialMixRow,
} from './comercialApi';
import type { DrillResponse, DrillType } from './comercialDrillApi';

export type ComercialMetric =
  | 'faturamento' | 'liquido' | 'impostos' | 'devolucao'
  | 'nvendas' | 'nclientes' | 'quantidade'
  | 'ticket' | 'preco_medio';

export interface SeriePoint { label: string; valor: number }

const n = (v: any): number => {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
};

// ---------- Métricas a partir de ComercialMensalRow ----------

function metricFromMensal(row: ComercialMensalRow, metric: ComercialMetric): number {
  const fat = n(row.faturamento);
  const liq = n(row.fat_liquido);
  const imp = n(row.impostos);
  const dev = n(row.devolucao);
  const nv  = n(row.numero_vendas);
  const nc  = n(row.numero_clientes);
  const qtd = n(row.quantidade);
  switch (metric) {
    case 'faturamento': return fat;
    case 'liquido':     return liq;
    case 'impostos':    return imp;
    case 'devolucao':   return dev;
    case 'nvendas':     return nv;
    case 'nclientes':   return nc;
    case 'quantidade':  return qtd;
    case 'ticket':      return n(row.ticket_medio) || (nv > 0 ? fat / nv : 0);
    case 'preco_medio': return n(row.preco_medio)  || (qtd > 0 ? fat / qtd : 0);
  }
}

export function buildMensalSerie(rows: ComercialMensalRow[], metric: ComercialMetric): SeriePoint[] {
  return rows.map((r) => ({ label: r.anomes_emissao, valor: metricFromMensal(r, metric) }));
}

export function buildAnualSerie(rows: ComercialMensalRow[], metric: ComercialMetric): SeriePoint[] {
  const acc: Record<string, { fat: number; liq: number; imp: number; dev: number; nv: number; nc: number; qtd: number }> = {};
  rows.forEach((r) => {
    const ano = (r.anomes_emissao || '').slice(0, 4) || '—';
    const cur = acc[ano] ?? { fat: 0, liq: 0, imp: 0, dev: 0, nv: 0, nc: 0, qtd: 0 };
    cur.fat += n(r.faturamento);
    cur.liq += n(r.fat_liquido);
    cur.imp += n(r.impostos);
    cur.dev += n(r.devolucao);
    cur.nv  += n(r.numero_vendas);
    cur.nc  += n(r.numero_clientes);
    cur.qtd += n(r.quantidade);
    acc[ano] = cur;
  });
  const anos = Object.keys(acc).sort();
  return anos.map((ano) => {
    const c = acc[ano];
    let v = 0;
    switch (metric) {
      case 'faturamento': v = c.fat; break;
      case 'liquido':     v = c.liq; break;
      case 'impostos':    v = c.imp; break;
      case 'devolucao':   v = c.dev; break;
      case 'nvendas':     v = c.nv;  break;
      case 'nclientes':   v = c.nc;  break;
      case 'quantidade':  v = c.qtd; break;
      case 'ticket':      v = c.nv > 0  ? c.fat / c.nv  : 0; break;
      case 'preco_medio': v = c.qtd > 0 ? c.fat / c.qtd : 0; break;
    }
    return { label: ano, valor: v };
  });
}

// ---------- Por estado / revenda / obra (queries existentes) ----------

/** Tenta vários aliases de campo e devolve o primeiro com conteúdo. */
export function pickLabel(row: Record<string, any>, candidates: string[], fallback = '(sem nome)'): string {
  for (const k of candidates) {
    const v = row?.[k];
    if (v != null) {
      const s = String(v).trim();
      if (s.length > 0 && s !== '-' && s.toLowerCase() !== 'null' && s.toLowerCase() !== 'undefined') {
        return s;
      }
    }
  }
  return fallback;
}

const ESTADO_LABEL_KEYS  = ['display_label', 'label', 'estado_label', 'nm_estado', 'estado', 'sg_uf', 'uf', 'n', 'cd_estado'];
const REVENDA_LABEL_KEYS = ['display_label', 'label', 'revenda_label', 'nm_revenda', 'ds_revenda', 'revenda', 'nm_fantasia', 'cd_rev_pedido'];
const OBRA_LABEL_KEYS    = ['display_label', 'label', 'obra_label', 'projeto', 'ds_abr_prj', 'nm_projeto', 'cd_prj'];

export function buildEstadoSerie(rows: ComercialEstadoRow[], metric: ComercialMetric): SeriePoint[] {
  return rows.map((r) => {
    let v = 0;
    switch (metric) {
      case 'faturamento': v = n(r.faturamento); break;
      case 'nvendas':     v = n(r.numero_vendas); break;
      case 'nclientes':   v = n(r.numero_clientes); break;
      // Métricas não disponíveis no endpoint atual — backend precisa estender.
      default: v = 0;
    }
    return { label: pickLabel(r as any, ESTADO_LABEL_KEYS), valor: v };
  }).sort((a, b) => b.valor - a.valor);
}

export function buildRevendaSerie(rows: ComercialRevendaRow[], metric: ComercialMetric): SeriePoint[] {
  return rows.map((r) => {
    let v = 0;
    switch (metric) {
      case 'faturamento': v = n(r.faturamento); break;
      case 'liquido':     v = n(r.fat_liquido); break;
      case 'nvendas':     v = n(r.numero_vendas); break;
      case 'nclientes':   v = n(r.numero_clientes); break;
      default: v = 0;
    }
    return { label: pickLabel(r as any, REVENDA_LABEL_KEYS), valor: v };
  }).sort((a, b) => b.valor - a.valor);
}

export function buildObrasSerie(rows: ComercialObrasRow[], metric: ComercialMetric): SeriePoint[] {
  return rows.map((r) => {
    let v = 0;
    switch (metric) {
      case 'faturamento': v = n(r.faturamento); break;
      case 'liquido':     v = n(r.fat_liquido); break;
      case 'nvendas':     v = n(r.numero_vendas); break;
      case 'nclientes':   v = n(r.numero_clientes); break;
      default: v = 0;
    }
    return { label: pickLabel(r as any, OBRA_LABEL_KEYS), valor: v };
  }).sort((a, b) => b.valor - a.valor);
}

export function buildMixSerie(rows: ComercialMixRow[], metric: ComercialMetric): SeriePoint[] {
  return rows.map((r) => {
    const v = metric === 'faturamento' ? n(r.faturamento) : n((r as any)[metric]);
    return { label: pickLabel(r as any, ['categoria', 'label', 'nome']), valor: v };
  }).sort((a, b) => b.valor - a.valor);
}

// ---------- Por dimensão via Drill API (cliente / produto / NF / det. impostos) ----------

/** Aliases de coluna numérica candidatos por métrica. */
const METRIC_COLUMN_CANDIDATES: Record<ComercialMetric, string[]> = {
  faturamento: ['vl_total', 'vl_bruto', 'faturamento', 'valor_total'],
  liquido:     ['vl_liquido', 'fat_liquido', 'liquido'],
  impostos:    ['vl_impostos', 'impostos', 'total_impostos'],
  devolucao:   ['vl_devolucao', 'devolucao'],
  nvendas:     ['numero_vendas', 'qtd_notas', 'qtd_vendas', 'total_notas'],
  nclientes:   ['numero_clientes', 'qtd_clientes', 'total_clientes'],
  quantidade:  ['qtd_produtos', 'quantidade', 'qtd'],
  ticket:      ['ticket_medio'],
  preco_medio: ['preco_medio'],
};

/** Aliases de coluna label candidatos por dimensão de drill. */
const LABEL_CANDIDATES: Record<string, string[]> = {
  ESTADO: ESTADO_LABEL_KEYS,
  REVENDA: REVENDA_LABEL_KEYS,
  CLIENTE: ['cliente_label', 'nm_cliente', 'nm_fantasia', 'cliente', 'cd_cliente'],
  PRODUTO: ['produto_label', 'ds_produto', 'descricao_produto', 'produto', 'cd_produto'],
  NOTA_FISCAL: ['nota_label', 'cd_nf', 'numero_nf', 'nr_nf', 'nf'],
  DETALHES_IMPOSTOS: ['imposto', 'tipo_imposto', 'descricao_imposto', 'nm_imposto', 'label'],
};

function pickFirst(row: Record<string, any>, keys: string[]): any {
  for (const k of keys) {
    if (row[k] != null && String(row[k]).length > 0) return row[k];
  }
  return null;
}

export function buildSerieFromDrill(
  resp: DrillResponse | undefined,
  drillType: DrillType,
  metric: ComercialMetric,
): SeriePoint[] {
  if (!resp || !Array.isArray(resp.rows)) return [];
  const labelKeys = LABEL_CANDIDATES[drillType] ?? ['label'];
  const metricKeys = METRIC_COLUMN_CANDIDATES[metric] ?? [];
  return resp.rows
    .map((r) => {
      const valorRaw = pickFirst(r, metricKeys);
      return {
        label: pickLabel(r, labelKeys),
        valor: n(valorRaw),
      };
    })
    .sort((a, b) => b.valor - a.valor);
}

// ---------- Parser de chave de série ----------

export type ParsedSeriesKey =
  | { kind: 'mensal';  metric: ComercialMetric }
  | { kind: 'anual';   metric: ComercialMetric }
  | { kind: 'por';     dim: string; metric: ComercialMetric }
  | { kind: 'legacy';  key: string };

const VALID_METRICS = new Set<ComercialMetric>([
  'faturamento','liquido','impostos','devolucao',
  'nvendas','nclientes','quantidade','ticket','preco_medio',
]);

export function parseSeriesKey(key: string): ParsedSeriesKey {
  if (key.startsWith('mensal__')) {
    const m = key.slice('mensal__'.length) as ComercialMetric;
    if (VALID_METRICS.has(m)) return { kind: 'mensal', metric: m };
  }
  if (key.startsWith('anual__')) {
    const m = key.slice('anual__'.length) as ComercialMetric;
    if (VALID_METRICS.has(m)) return { kind: 'anual', metric: m };
  }
  const por = /^por_(.+?)__(.+)$/.exec(key);
  if (por) {
    const dim = por[1];
    const metric = por[2] as ComercialMetric;
    if (VALID_METRICS.has(metric)) return { kind: 'por', dim, metric };
  }
  return { kind: 'legacy', key };
}

/** Mapeia dimensão (do catálogo) para drill_type. Null = derivada local. */
export function dimToDrillType(dim: string): DrillType | null {
  switch (dim) {
    case 'cliente':          return 'CLIENTE';
    case 'produto':          return 'PRODUTO';
    case 'nota_fiscal':      return 'NOTA_FISCAL';
    case 'detalhe_impostos': return 'DETALHES_IMPOSTOS';
    default: return null;
  }
}
