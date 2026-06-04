/**
 * Catálogo de métricas disponíveis para combinar como séries em gráficos
 * do BI Comercial.
 *
 * Cada métrica aponta para um campo das linhas mensais (rows) ou é derivada
 * (calculada por uma função compute). Métricas custom (usuário) são
 * resolvidas em tempo de render pelo formulaEvaluator.
 */
import { compileFormula } from './formulaEvaluator';

export type MetricFormat = 'currency' | 'number' | 'percent';
export type MetricAxis = 'primary' | 'secondary';

export interface MetricDef {
  key: string;
  label: string;
  format: MetricFormat;
  axis: MetricAxis;
  defaultColor: string; // hsl var token reference
  /** Campo da row mensal a usar (quando direto). */
  field?: string;
  /** Computa o valor a partir da row. */
  compute?: (row: any) => number;
}

const n = (v: any) => { const x = Number(v); return Number.isFinite(x) ? x : 0; };

export const COMERCIAL_METRICS: Record<string, MetricDef> = {
  faturamento:     { key:'faturamento',     label:'Faturamento',    format:'currency', axis:'primary',   defaultColor:'hsl(var(--primary))',           field:'faturamento' },
  fat_liquido:     { key:'fat_liquido',     label:'Líquido',        format:'currency', axis:'primary',   defaultColor:'hsl(var(--chart-2, var(--primary)))', field:'fat_liquido' },
  impostos:        { key:'impostos',        label:'Impostos',       format:'currency', axis:'primary',   defaultColor:'hsl(var(--warning))',           field:'impostos' },
  devolucao:       { key:'devolucao',       label:'Devolução',      format:'currency', axis:'primary',   defaultColor:'hsl(var(--destructive))',       field:'devolucao' },
  meta:            { key:'meta',            label:'Meta',           format:'currency', axis:'primary',   defaultColor:'hsl(var(--muted-foreground))',  field:'meta' },
  numero_vendas:   { key:'numero_vendas',   label:'Nº Vendas',      format:'number',   axis:'secondary', defaultColor:'hsl(var(--info, var(--primary)))', field:'numero_vendas' },
  numero_clientes: { key:'numero_clientes', label:'Nº Clientes',    format:'number',   axis:'secondary', defaultColor:'hsl(var(--success))',           field:'numero_clientes' },
  quantidade:      { key:'quantidade',      label:'Quantidade',     format:'number',   axis:'secondary', defaultColor:'hsl(var(--accent))',            field:'quantidade' },
  ticket_medio:    { key:'ticket_medio',    label:'Ticket Médio',   format:'currency', axis:'secondary', defaultColor:'hsl(var(--primary))',           field:'ticket_medio' },
  preco_medio:     { key:'preco_medio',     label:'Preço Médio',    format:'currency', axis:'secondary', defaultColor:'hsl(var(--accent))',            field:'preco_medio' },
  // Derivadas built-in
  pct_devolucao:   { key:'pct_devolucao',   label:'% Devolução',    format:'percent',  axis:'secondary', defaultColor:'hsl(var(--destructive))',
    compute:(r)=>{ const f=n(r.faturamento); return f===0?0:(n(r.devolucao)/f)*100; } },
  pct_imposto:     { key:'pct_imposto',     label:'% Imposto',      format:'percent',  axis:'secondary', defaultColor:'hsl(var(--warning))',
    compute:(r)=>{ const f=n(r.faturamento); return f===0?0:(n(r.impostos)/f)*100; } },
  diferenca_meta:  { key:'diferenca_meta',  label:'Diferença vs Meta', format:'currency', axis:'primary', defaultColor:'hsl(var(--info, var(--primary)))',
    compute:(r)=> n(r.faturamento) - n(r.meta) },
};

export type MetricRef = {
  key: string;             // chave do catálogo ou id de métrica custom
  label?: string;
  color?: string;
  chartType?: 'bar' | 'line' | 'area';
  axis?: MetricAxis;
};

export interface CustomMetric {
  id: string;
  label: string;
  formula: string;
  format: MetricFormat;
}

export interface ResolvedMetric {
  ref: MetricRef;
  label: string;
  format: MetricFormat;
  axis: MetricAxis;
  color: string;
  chartType: 'bar' | 'line' | 'area';
  /** Calcula valor para uma row. */
  compute: (row: any) => number;
}

const COLOR_CYCLE = [
  'hsl(var(--primary))',
  'hsl(var(--warning))',
  'hsl(var(--destructive))',
  'hsl(var(--success))',
  'hsl(var(--accent))',
  'hsl(var(--muted-foreground))',
];

export function resolveMetric(
  ref: MetricRef,
  index: number,
  customs: CustomMetric[] = [],
): ResolvedMetric | null {
  const builtin = COMERCIAL_METRICS[ref.key];
  if (builtin) {
    const compute = builtin.compute ?? ((r: any) => n(r?.[builtin.field!]));
    return {
      ref,
      label: ref.label || builtin.label,
      format: builtin.format,
      axis: ref.axis ?? builtin.axis,
      color: ref.color || builtin.defaultColor || COLOR_CYCLE[index % COLOR_CYCLE.length],
      chartType: ref.chartType ?? 'bar',
      compute,
    };
  }
  const cm = customs.find((c) => c.id === ref.key);
  if (cm) {
    let evalFn: (vars: Record<string, number>) => number;
    try {
      evalFn = compileFormula(cm.formula).eval;
    } catch {
      evalFn = () => 0;
    }
    return {
      ref,
      label: ref.label || cm.label,
      format: cm.format,
      axis: ref.axis ?? (cm.format === 'percent' || cm.format === 'number' ? 'secondary' : 'primary'),
      color: ref.color || COLOR_CYCLE[index % COLOR_CYCLE.length],
      chartType: ref.chartType ?? 'line',
      compute: (row) => evalFn(row ?? {}),
    };
  }
  return null;
}

export function metricIdentifiers(): string[] {
  // Identificadores aceitáveis em fórmulas custom: campos de row + métricas derivadas
  return [
    'faturamento','fat_liquido','impostos','devolucao','meta',
    'numero_vendas','numero_clientes','quantidade','ticket_medio','preco_medio',
  ];
}

export function formatMetricValue(v: number, fmt: MetricFormat): string {
  if (!Number.isFinite(v)) v = 0;
  if (fmt === 'currency') return new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL', maximumFractionDigits: 0 }).format(v);
  if (fmt === 'percent') return `${v.toFixed(1)}%`;
  return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(v);
}
