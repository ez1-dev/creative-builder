/**
 * Contrato e helpers de `options` para widgets aplicados via Biblioteca BI.
 * Persistido em `bi_user_widgets.options` (jsonb).
 *
 * Mantém compatibilidade com widgets antigos: todos os campos são opcionais
 * e os helpers retornam defaults equivalentes ao comportamento anterior.
 */
import { abbreviateNumber, formatCurrency, formatNumber, formatPercent } from '@/components/bi/utils/formatters';

export type WidgetColor = 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'muted';
export type WidgetVariant = 'solid' | 'outline' | 'ghost' | 'gradient';
export type WidgetDensity = 'compact' | 'default' | 'comfortable';
export type WidgetHeight = 'sm' | 'md' | 'lg' | 'xl';
export type WidgetValueFormat = 'auto' | 'currency' | 'number' | 'percent' | 'compact';
export type WidgetSort = 'asc' | 'desc';
export type WidgetComparacao = 'nenhuma' | 'periodo_anterior' | 'mesmo_periodo_ano_anterior';

export interface WidgetPeriodoOverride {
  tipo: 'ultimos_n_meses' | 'mes_atual' | 'ano_atual' | 'custom';
  n?: number;
  ini?: string; // anomes YYYYMM
  fim?: string; // anomes YYYYMM
}

export interface WidgetMeta {
  tipo: 'valor' | 'kpi';
  valor?: number;
  kpiKey?: string;
}

export interface WidgetOptions {
  // Aparência
  color?: WidgetColor;
  variant?: WidgetVariant;
  icon?: string; // nome lucide-react
  valueFormat?: WidgetValueFormat;
  density?: WidgetDensity;
  height?: WidgetHeight;

  // Layout do card
  hideTitle?: boolean;
  subtitle?: string;
  footerNote?: string;

  // Dados
  unidade_negocio?: string;
  periodo_override?: WidgetPeriodoOverride;
  comparacao?: WidgetComparacao;
  meta?: WidgetMeta;
  topN?: number;
  sort?: WidgetSort;

  // legados / IA
  visual?: any;
  target?: number;
  format?: WidgetValueFormat;
  max?: number;
  status?: string;
  filtros?: Record<string, any>;

  // Mapa de calor (BrazilHeatMap): stops persistidos (paleta padrão do widget)
  colorStops?: string[];
}

// ----- Color tokens -----

const COLOR_VAR: Record<WidgetColor, string> = {
  primary:  '--primary',
  success:  '--success',
  warning:  '--warning',
  danger:   '--destructive',
  info:     '--info',
  muted:    '--muted-foreground',
};

export function colorCss(color?: WidgetColor): string {
  const v = COLOR_VAR[color ?? 'primary'] ?? '--primary';
  return `hsl(var(${v}))`;
}

export function colorAccentClass(color?: WidgetColor): string {
  // classe usada como border accent / barra lateral
  switch (color) {
    case 'success': return 'border-l-[hsl(var(--success))]';
    case 'warning': return 'border-l-[hsl(var(--warning))]';
    case 'danger':  return 'border-l-[hsl(var(--destructive))]';
    case 'info':    return 'border-l-[hsl(var(--info,215_70%_45%))]';
    case 'muted':   return 'border-l-[hsl(var(--muted-foreground))]';
    case 'primary': return 'border-l-[hsl(var(--primary))]';
    default:        return '';
  }
}

export function variantWrapperClass(variant?: WidgetVariant, color?: WidgetColor): string {
  if (!variant || variant === 'solid' || variant === 'outline') return '';
  if (variant === 'ghost') return 'bg-muted/20';
  if (variant === 'gradient') {
    const c = colorCss(color ?? 'primary');
    return '';
    // gradient applied via style attr no WidgetShell quando necessário
    void c;
  }
  return '';
}

// ----- Density / height -----

const DENSITY_MIN_H: Record<WidgetDensity, string> = {
  compact:     '',
  default:     '',
  comfortable: '',
};

export function densityClass(density?: WidgetDensity): string {
  return DENSITY_MIN_H[density ?? 'default'];
}

const HEIGHT_MIN: Record<WidgetHeight, string> = {
  sm: 'min-h-[120px]',
  md: 'min-h-[200px]',
  lg: 'min-h-[300px]',
  xl: 'min-h-[420px]',
};

export function heightClass(height?: WidgetHeight): string {
  return HEIGHT_MIN[height ?? 'md'];
}

// ----- Formatadores -----

export function formatValue(value: number | null | undefined, fmt?: WidgetValueFormat, currencyOnCompact = true): string {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '-';
  const n = Number(value);
  switch (fmt) {
    case 'currency': return formatCurrency(n);
    case 'percent':  return formatPercent(n, 1);
    case 'number':   return formatNumber(n);
    case 'compact':  return abbreviateNumber(n, currencyOnCompact);
    case 'auto':
    default:
      if (Math.abs(n) >= 10000) return abbreviateNumber(n, currencyOnCompact);
      return formatNumber(n);
  }
}

/** Mapeia para o tipo `KpiFormat` usado por KpiCard.formatByKind. */
export function toKpiFormat(fmt?: WidgetValueFormat): 'currency' | 'percent' | 'number' | 'raw' {
  switch (fmt) {
    case 'currency': return 'currency';
    case 'percent':  return 'percent';
    case 'number':   return 'number';
    case 'compact':  return 'number';
    case 'auto':     return 'number';
    default:         return 'raw';
  }
}

// ----- Top N / sort -----

export function applyTopNSort<T extends { valor: number; value?: number; label?: string }>(
  arr: T[] | undefined | null,
  topN?: number,
  sort?: WidgetSort,
): T[] {
  const safe = Array.isArray(arr) ? [...arr] : [];
  if (sort) {
    safe.sort((a, b) => {
      const va = Number((a as any).valor ?? (a as any).value ?? 0);
      const vb = Number((b as any).valor ?? (b as any).value ?? 0);
      return sort === 'asc' ? va - vb : vb - va;
    });
  }
  if (topN && topN > 0) return safe.slice(0, topN);
  return safe;
}

// ----- Comparação -----

export function computeComparacao(
  serieAtual: { label: string; valor: number }[] | undefined,
  mode?: WidgetComparacao,
): { atual: number; anterior: number; deltaPct: number } | null {
  if (!mode || mode === 'nenhuma' || !Array.isArray(serieAtual) || serieAtual.length === 0) return null;
  const total = serieAtual.reduce((s, p) => s + Number(p.valor ?? 0), 0);
  const n = serieAtual.length;
  if (n < 2) return null;
  if (mode === 'periodo_anterior') {
    const half = Math.floor(n / 2);
    const anterior = serieAtual.slice(0, half).reduce((s, p) => s + Number(p.valor ?? 0), 0);
    const atual = serieAtual.slice(half).reduce((s, p) => s + Number(p.valor ?? 0), 0);
    return { atual, anterior, deltaPct: anterior ? ((atual - anterior) / anterior) * 100 : 0 };
  }
  if (mode === 'mesmo_periodo_ano_anterior') {
    // heurística: compara último período com primeiro período (proxy ano anterior)
    const atual = Number(serieAtual[n - 1].valor ?? 0);
    const anterior = Number(serieAtual[0].valor ?? 0);
    return { atual, anterior, deltaPct: anterior ? ((atual - anterior) / anterior) * 100 : 0 };
  }
  void total;
  return null;
}

// ----- Período sobreposto -> filtros -----

function pad2(n: number): string { return n < 10 ? `0${n}` : String(n); }

export function periodoOverrideToFiltros(o?: WidgetPeriodoOverride): { anomes_ini?: string; anomes_fim?: string } {
  if (!o) return {};
  const now = new Date();
  const ymNow = `${now.getFullYear()}${pad2(now.getMonth() + 1)}`;
  if (o.tipo === 'mes_atual') return { anomes_ini: ymNow, anomes_fim: ymNow };
  if (o.tipo === 'ano_atual') return { anomes_ini: `${now.getFullYear()}01`, anomes_fim: `${now.getFullYear()}12` };
  if (o.tipo === 'ultimos_n_meses') {
    const n = Math.max(1, Number(o.n ?? 3));
    const start = new Date(now.getFullYear(), now.getMonth() - (n - 1), 1);
    return {
      anomes_ini: `${start.getFullYear()}${pad2(start.getMonth() + 1)}`,
      anomes_fim: ymNow,
    };
  }
  if (o.tipo === 'custom') return { anomes_ini: o.ini, anomes_fim: o.fim };
  return {};
}

// ----- Meta -----

export function resolveMeta(meta: WidgetMeta | undefined, kpis: Record<string, any>): number | null {
  if (!meta) return null;
  if (meta.tipo === 'valor' && Number.isFinite(Number(meta.valor))) return Number(meta.valor);
  if (meta.tipo === 'kpi' && meta.kpiKey) {
    const v = kpis?.[meta.kpiKey];
    return Number.isFinite(Number(v)) ? Number(v) : null;
  }
  return null;
}
