/**
 * VisualConfig — configuração de aparência/leitura aplicada aos gráficos
 * da Biblioteca BI. Persistido em `options.visual` (bi_user_widgets)
 * ou `config.visual` (dashboard_widgets). Totalmente opcional: ausente
 * = renderização padrão (compatibilidade com componentes legados).
 */

export type DataLabelFormat = 'int' | 'decimal' | 'currency' | 'percent' | 'compact';
export type LegendPosition = 'top' | 'bottom' | 'left' | 'right';
export type DataLabelPosition = 'top' | 'bottom' | 'inside' | 'outside' | 'left' | 'right' | 'center';
export type TitleAlign = 'left' | 'center' | 'right';
export type ResultDescriptionPosition = 'above' | 'below' | 'beforeLegend' | 'afterChart';
export type CardDensity = 'compacta' | 'normal' | 'detalhada';

export type FontFamilyKey =
  | 'default'
  | 'serif'
  | 'mono'
  | 'inter'
  | 'roboto'
  | 'poppins'
  | 'nunito'
  | 'montserrat'
  | 'source-sans-3'
  | 'roboto-mono'
  | 'ibm-plex-serif';

export const FONT_FAMILY_OPTIONS: { value: FontFamilyKey; label: string }[] = [
  { value: 'default',        label: 'Padrão (do app)' },
  { value: 'serif',          label: 'Serif' },
  { value: 'mono',           label: 'Monospace' },
  { value: 'inter',          label: 'Inter' },
  { value: 'roboto',         label: 'Roboto' },
  { value: 'poppins',        label: 'Poppins' },
  { value: 'nunito',         label: 'Nunito' },
  { value: 'montserrat',     label: 'Montserrat' },
  { value: 'source-sans-3',  label: 'Source Sans 3' },
  { value: 'roboto-mono',    label: 'Roboto Mono' },
  { value: 'ibm-plex-serif', label: 'IBM Plex Serif' },
];

const FONT_FAMILY_STACKS: Record<FontFamilyKey, string | undefined> = {
  'default':        undefined,
  'serif':          'Georgia, "Times New Roman", serif',
  'mono':           'ui-monospace, Menlo, Consolas, "Liberation Mono", monospace',
  'inter':          '"Inter", system-ui, sans-serif',
  'roboto':         '"Roboto", system-ui, sans-serif',
  'poppins':        '"Poppins", system-ui, sans-serif',
  'nunito':         '"Nunito", system-ui, sans-serif',
  'montserrat':     '"Montserrat", system-ui, sans-serif',
  'source-sans-3':  '"Source Sans 3", system-ui, sans-serif',
  'roboto-mono':    '"Roboto Mono", ui-monospace, monospace',
  'ibm-plex-serif': '"IBM Plex Serif", Georgia, serif',
};

/** Retorna CSS font-family ou undefined para herdar do app. */
export function fontFamilyCss(key?: FontFamilyKey | null): string | undefined {
  if (!key || key === 'default') return undefined;
  return FONT_FAMILY_STACKS[key];
}

export interface VisualConfig {
  title: {
    visible: boolean;
    text: string;
    align: TitleAlign;
    fontSize: number;
  };
  subtitle: {
    visible: boolean;
    text: string;
    fontSize: number;
  };
  legend: {
    visible: boolean;
    position: LegendPosition;
    fontSize: number;
    /** Renomeia séries por chave (dataKey → label exibido). */
    seriesLabels: Record<string, string>;
  };
  dataLabels: {
    visible: boolean;
    position: DataLabelPosition;
    fontSize: number;
    format: DataLabelFormat;
    decimals: number;
    prefix: string;
    suffix: string;
  };
  resultDescription: {
    visible: boolean;
    text: string;
    position: ResultDescriptionPosition;
    fontSize: number;
  };
  axis: {
    xVisible: boolean;
    yVisible: boolean;
    xLabel: string;
    yLabel: string;
    fontSize: number;
  };
  grid: { visible: boolean };
  tooltip: { visible: boolean };
  card: {
    showHeader: boolean;
    showBorder: boolean;
    density: CardDensity;
  };
}

export const DEFAULT_VISUAL_CONFIG: VisualConfig = {
  title:     { visible: true,  text: '',           align: 'left',  fontSize: 14 },
  subtitle:  { visible: true,  text: '',           fontSize: 11 },
  legend:    { visible: true,  position: 'bottom', fontSize: 11, seriesLabels: {} },
  dataLabels:{ visible: false, position: 'top',    fontSize: 11, format: 'compact', decimals: 0, prefix: '', suffix: '' },
  resultDescription: { visible: false, text: '', position: 'below', fontSize: 12 },
  axis:      { xVisible: true, yVisible: true, xLabel: '', yLabel: '', fontSize: 10 },
  grid:      { visible: true },
  tooltip:   { visible: true },
  card:      { showHeader: true, showBorder: true, density: 'normal' },
};

function isObj(v: any): v is Record<string, any> {
  return v && typeof v === 'object' && !Array.isArray(v);
}

/** Faz merge profundo de partial sobre DEFAULT, sempre retornando objeto seguro. */
export function mergeVisualConfig(partial?: Partial<VisualConfig> | null | undefined): VisualConfig {
  const out: any = {};
  for (const key of Object.keys(DEFAULT_VISUAL_CONFIG) as Array<keyof VisualConfig>) {
    const def = (DEFAULT_VISUAL_CONFIG as any)[key];
    const p = (partial as any)?.[key];
    if (isObj(def)) {
      out[key] = { ...def, ...(isObj(p) ? p : {}) };
    } else {
      out[key] = p ?? def;
    }
  }
  // legend.seriesLabels: garantir objeto
  if (!isObj(out.legend.seriesLabels)) out.legend.seriesLabels = {};
  return out as VisualConfig;
}

/** Verdadeiro se o partial muda algo em relação ao default (útil para "Restaurar padrão"). */
export function isVisualConfigDirty(cfg: VisualConfig): boolean {
  return JSON.stringify(cfg) !== JSON.stringify(DEFAULT_VISUAL_CONFIG);
}

const NUM_FMT = (n: number, decimals: number) =>
  n.toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

/** Formata um valor numérico conforme dataLabels (format/decimals/prefix/suffix). */
export function formatDataLabel(value: number | string | null | undefined, cfg: VisualConfig['dataLabels']): string {
  if (value === null || value === undefined || value === '') return '';
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return String(value);
  let body: string;
  switch (cfg.format) {
    case 'int':
      body = NUM_FMT(Math.round(n), 0);
      break;
    case 'decimal':
      body = NUM_FMT(n, cfg.decimals);
      break;
    case 'currency':
      body = n.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: cfg.decimals,
        maximumFractionDigits: cfg.decimals,
      });
      break;
    case 'percent':
      body = `${NUM_FMT(n, cfg.decimals)}%`;
      break;
    case 'compact':
    default: {
      const abs = Math.abs(n);
      const sign = n < 0 ? '-' : '';
      if (abs >= 1_000_000_000) body = `${sign}${NUM_FMT(abs / 1_000_000_000, 1)} bi`;
      else if (abs >= 1_000_000) body = `${sign}${NUM_FMT(abs / 1_000_000, 1)} mi`;
      else if (abs >= 1_000) body = `${sign}${NUM_FMT(abs / 1_000, 1)} mil`;
      else body = `${sign}${NUM_FMT(abs, cfg.decimals)}`;
      break;
    }
  }
  return `${cfg.prefix ?? ''}${body}${cfg.suffix ?? ''}`;
}

export interface DescriptionVars {
  total?: number | string;
  periodo?: string;
  maior_valor?: number | string;
  menor_valor?: number | string;
  quantidade_registros?: number | string;
  [k: string]: any;
}

/** Substitui {var} no texto pelos valores. Variáveis ausentes ficam como '-'. */
export function interpolateDescription(text: string, vars: DescriptionVars): string {
  if (!text) return '';
  return text.replace(/\{(\w+)\}/g, (_, key) => {
    const v = vars?.[key];
    if (v === undefined || v === null) return '-';
    return String(v);
  });
}

/** Mapeia legend.position para props do Recharts <Legend>. */
export function legendPositionProps(position: LegendPosition): {
  layout: 'horizontal' | 'vertical';
  verticalAlign: 'top' | 'middle' | 'bottom';
  align: 'left' | 'center' | 'right';
} {
  switch (position) {
    case 'top':    return { layout: 'horizontal', verticalAlign: 'top',    align: 'center' };
    case 'left':   return { layout: 'vertical',   verticalAlign: 'middle', align: 'left'   };
    case 'right':  return { layout: 'vertical',   verticalAlign: 'middle', align: 'right'  };
    case 'bottom':
    default:       return { layout: 'horizontal', verticalAlign: 'bottom', align: 'center' };
  }
}

/** Padding/altura segundo densidade do card. */
export function densitySpacing(density: CardDensity): { paddingClass: string; heightDelta: number } {
  switch (density) {
    case 'compacta':  return { paddingClass: 'p-2',  heightDelta: -40 };
    case 'detalhada': return { paddingClass: 'p-6',  heightDelta: 40  };
    case 'normal':
    default:          return { paddingClass: 'p-4',  heightDelta: 0   };
  }
}
