/**
 * Registry de componentes BI que podem ser aplicados em páginas.
 *
 * Cada entrada descreve:
 *  - id estável (persistido em bi_user_widgets.component_id)
 *  - kind (controla em quais seções pode ser aplicado)
 *  - inputs: campos esperados (mapping → PageDataContext)
 *  - render(props, mapping, ctx): produz o ReactNode final
 *  - autoMap(pageSchema): heurística para preencher mapping inicial
 */
import { ReactNode } from 'react';
import {
  KpiCard, KpiSparklineCard, KpiTargetCard,
  KpiComparisonCard, KpiVariationCard, KpiStatusCard,
  BarChartCard, HorizontalBarChartCard, LineChartCard, AreaChartCard,
  DonutChartCard, PieChartCard, RankingChartCard, FunnelChartCard,
  TreemapChartCard, RadarChartCard, SparklineCard,
  StackedBarChartCard, ComboChartCard, GaugeChartCard, ProgressChartCard,
  ScatterChartCard, HeatmapChartCard, WaterfallChartCard, CalendarHeatmapCard,
  BrazilMapCard,
  
  TreeView,
  Timeline,
  DataTableBI, ChartCardShell,
  RankingTable, SummaryTable, ComparisonTable, DrillDownTable,
  StatusBadge,
  type Column,
  type BiStatus,
} from '@/components/bi';
import type { PageDataSchema } from './pageRegistry';
import type { WidgetKind } from './pageRegistry';
import * as LucideIcons from 'lucide-react';
import {
  type WidgetOptions, applyTopNSort, toKpiFormat, computeComparacao,
  resolveMeta, colorCss,
} from './widgetOptions';
import { formatCurrency, formatNumber, formatPercent } from '@/components/bi/utils/formatters';

/**
 * Deriva o formatador adequado a partir do sufixo da chave de série.
 * Convenção (Frota/Máquinas/etc): `<dim>__<metric>` ou `mensal__<metric>`.
 * Mapeia métricas conhecidas para currency/percent/number.
 */
function formatterForSeriesKey(key?: string): (v: number) => string {
  if (!key) return formatCurrency;
  const m = /__([a-z0-9_]+)$/i.exec(key);
  const metric = m?.[1] ?? '';
  switch (metric) {
    case 'pct':
    case 'percent':
    case 'pct_total':
      return (v) => formatPercent(v, 2);
    case 'qtd':
    case 'quantidade':
    case 'count':
    case 'nvendas':
    case 'nclientes':
      return (v) => formatNumber(v, 0);
    case 'km_sum':
    case 'km_avg':
    case 'km':
      return (v) => `${formatNumber(v, 0)} km`;
    case 'valor':
    case 'ticket':
    case 'rs_km':
    case 'preco':
    case 'preco_medio':
    case 'faturamento':
    case 'liquido':
    case 'impostos':
    case 'devolucao':
      return formatCurrency;
    default:
      return formatCurrency;
  }
}

/** Resolve um ícone lucide pelo nome; retorna null se inválido. */
function resolveIcon(name?: string) {
  if (!name) return null;
  const Cmp = (LucideIcons as any)[name];
  return typeof Cmp === 'function' ? Cmp : null;
}

/** Cor para charts: aceita token semântico ou string CSS direta. */
function chartColor(opts?: WidgetOptions): string | undefined {
  const c = opts?.color as any;
  if (!c) return undefined;
  if (typeof c === 'string' && (c.startsWith('hsl') || c.startsWith('#') || c.startsWith('rgb'))) return c;
  return colorCss(c);
}

export interface MappingField {
  key: string;
  label: string;
  /** De onde vêm as opções no contexto: kpis | series | rows */
  source: 'kpis' | 'series' | 'rows';
  required?: boolean;
}

export interface BiComponentDef {
  id: string;
  kind: WidgetKind;
  label: string;
  description?: string;
  defaultSpan: 1 | 2 | 3 | 4;
  inputs: MappingField[];
  autoMap: (schema: PageDataSchema) => Record<string, string>;
  render: (args: {
    title?: string;
    mapping: Record<string, string>;
    ctx: {
      kpis: Record<string, any>;
      series: Record<string, any>;
      rows: any[];
      /** Callback opcional disparado ao clicar em um item de chart. seriesKey identifica a série mapeada. */
      onItemClick?: (seriesKey: string, datum: { name: string; value: number; label?: string; valor?: number }) => void;
    };
    options: Record<string, any>;
  }) => ReactNode;
}

/** Helper interno: monta o handler de clique a partir do ctx, normalizando datum para { name, value, ...original }. */
function makeClickHandler(
  ctx: { onItemClick?: (seriesKey: string, datum: any) => void },
  seriesKey: string,
) {
  if (!ctx.onItemClick || !seriesKey) return undefined;
  return (d: any) => {
    const name = d?.name ?? d?.label ?? '';
    const value = Number(d?.value ?? d?.valor ?? 0);
    // Mantém TODOS os campos originais (cd_*, filtros_drill, etc.) para que o
    // contrato de drill global possa extrair o filtro técnico correto.
    ctx.onItemClick!(seriesKey, { ...(d ?? {}), name: String(name), value, label: d?.label, valor: d?.valor });
  };
}

const SERIES_LIKE = (s: any): { label: string; valor: number; [k: string]: any }[] => {
  if (!Array.isArray(s)) return [];
  return s
    .map((p) => {
      if (p == null || typeof p !== 'object') return { label: String(p ?? ''), valor: 0 };
      let label: any = p.label ?? p.name ?? p.x ?? p.categoria ?? p.category;
      let valor: any = p.valor ?? p.value ?? p.y ?? p.total;
      if (label == null || valor == null) {
        for (const [k, v] of Object.entries(p)) {
          if (label == null && typeof v === 'string') label = v;
          else if (valor == null && typeof v === 'number') valor = v;
          if (label != null && valor != null) break;
          void k;
        }
      }
      // Preserva campos originais (cd_*, filtros_drill, etc.) para drill global.
      return { ...p, label: String(label ?? ''), valor: Number(valor ?? 0) };
    })
    .filter((p) => {
      const t = p.label.trim().toLowerCase();
      const invalid = t === '' || t === '-' || t === 'null' || t === 'undefined' || t === '(sem nome)';
      return !invalid && Number.isFinite(p.valor);
    });
};

export const COMPONENT_REGISTRY: BiComponentDef[] = [
  // ===== KPIs =====
  {
    id: 'kpi-card',
    kind: 'kpi',
    label: 'KPI Card',
    description: 'Indicador único com valor, ícone e variação.',
    defaultSpan: 1,
    inputs: [{ key: 'value', label: 'Valor', source: 'kpis', required: true }],
    autoMap: (s) => ({ value: s.kpis?.[0]?.key ?? '' }),
    render: ({ title, mapping, ctx, options }) => {
      const def = mapping.value;
      const v = ctx.kpis?.[def];
      const opts = (options ?? {}) as WidgetOptions;
      const Icon = resolveIcon(opts.icon);
      const variant = (opts.color === 'success' || opts.color === 'warning' || opts.color === 'danger' || opts.color === 'info') ? opts.color : undefined;
      const cmp = computeComparacao(undefined, opts.comparacao);
      return (
        <KpiCard
          title={title || def}
          value={v ?? 0}
          format={toKpiFormat(opts.valueFormat ?? opts.format ?? 'currency')}
          icon={Icon ? <Icon className="h-4 w-4" /> : undefined}
          variant={variant as any}
          subtitle={opts.subtitle}
          trend={cmp ? { value: cmp.deltaPct, label: opts.comparacao === 'mesmo_periodo_ano_anterior' ? 'vs ano ant.' : 'vs anterior' } : undefined}
        />
      );
    },
  },
  {
    id: 'kpi-sparkline',
    kind: 'kpi',
    label: 'KPI + Sparkline',
    description: 'Indicador com micro-gráfico de tendência.',
    defaultSpan: 1,
    inputs: [
      { key: 'value', label: 'Valor', source: 'kpis', required: true },
      { key: 'series', label: 'Série tendência', source: 'series', required: true },
    ],
    autoMap: (s) => ({ value: s.kpis?.[0]?.key ?? '', series: s.series?.[0]?.key ?? '' }),
    render: ({ title, mapping, ctx, options }) => {
      const v = ctx.kpis?.[mapping.value] ?? 0;
      const arr = SERIES_LIKE(ctx.series?.[mapping.series]).map((p) => p.valor);
      const opts = (options ?? {}) as WidgetOptions;
      const fmt = (opts.valueFormat ?? opts.format ?? 'currency');
      const kpiFmt = (fmt === 'compact' || fmt === 'auto' ? 'number' : fmt) as 'currency' | 'number' | 'percent';
      return <KpiSparklineCard title={title || mapping.value} value={v} format={kpiFmt} series={arr} />;
    },
  },
  {
    id: 'kpi-target',
    kind: 'kpi',
    label: 'KPI vs Meta',
    description: 'Barra de progresso contra meta.',
    defaultSpan: 1,
    inputs: [{ key: 'value', label: 'Valor', source: 'kpis', required: true }],
    autoMap: (s) => ({ value: s.kpis?.[0]?.key ?? '' }),
    render: ({ title, mapping, ctx, options }) => {
      const opts = (options ?? {}) as WidgetOptions;
      const valor = Number(ctx.kpis?.[mapping.value] ?? 0);
      const metaResolved = resolveMeta(opts.meta, ctx.kpis ?? {});
      const target = metaResolved ?? Number(opts.target ?? 100);
      const fmt = opts.valueFormat ?? opts.format ?? 'number';
      return (
        <KpiTargetCard
          title={title || mapping.value}
          value={valor}
          target={target}
          format={(fmt === 'compact' || fmt === 'auto' ? 'number' : fmt) as any}
        />
      );
    },
  },

  // ===== Charts =====
  {
    id: 'bar-chart',
    kind: 'chart',
    label: 'Gráfico de Barras',
    defaultSpan: 2,
    inputs: [{ key: 'series', label: 'Série', source: 'series', required: true }],
    autoMap: (s) => ({ series: s.series?.[0]?.key ?? '' }),
    render: ({ title, mapping, ctx, options }) => {
      const opts = (options ?? {}) as WidgetOptions;
      const data = applyTopNSort(SERIES_LIKE(ctx.series?.[mapping.series]), opts.topN, opts.sort);
      const color = chartColor(opts);
      const valueFormatter = formatterForSeriesKey(mapping.series);
      return (
        <BarChartCard
          title={title || mapping.series}
          data={data}
          onItemClick={makeClickHandler(ctx, mapping.series)}
          visualConfig={opts.visual}
          valueFormatter={valueFormatter}
          {...(color ? { color } : {})}
        />
      );
    },
  },
  {
    id: 'horizontal-bar-chart',
    kind: 'chart',
    label: 'Barras Horizontais',
    defaultSpan: 2,
    inputs: [{ key: 'series', label: 'Série', source: 'series', required: true }],
    autoMap: (s) => ({ series: s.series?.[0]?.key ?? '' }),
    render: ({ title, mapping, ctx, options }) => {
      const opts = (options ?? {}) as WidgetOptions;
      const data = applyTopNSort(SERIES_LIKE(ctx.series?.[mapping.series]), opts.topN, opts.sort);
      const color = chartColor(opts);
      const valueFormatter = formatterForSeriesKey(mapping.series);
      return (
        <HorizontalBarChartCard
          title={title || mapping.series}
          data={data}
          onItemClick={makeClickHandler(ctx, mapping.series)}
          visualConfig={opts.visual}
          valueFormatter={valueFormatter}
          {...(color ? { color } : {})}
        />
      );
    },
  },
  {
    id: 'line-chart',
    kind: 'chart',
    label: 'Gráfico de Linha',
    defaultSpan: 2,
    inputs: [{ key: 'series', label: 'Série', source: 'series', required: true }],
    autoMap: (s) => ({ series: s.series?.[0]?.key ?? '' }),
    render: ({ title, mapping, ctx, options }) => {
      const opts = (options ?? {}) as WidgetOptions;
      const data = applyTopNSort(SERIES_LIKE(ctx.series?.[mapping.series]), opts.topN, opts.sort);
      const color = chartColor(opts);
      const valueFormatter = formatterForSeriesKey(mapping.series);
      return (
        <LineChartCard
          title={title || mapping.series}
          data={data}
          visualConfig={opts.visual}
          valueFormatter={valueFormatter}
          {...(color ? { color } : {})}
        />
      );
    },
  },
  {
    id: 'area-chart',
    kind: 'chart',
    label: 'Gráfico de Área',
    defaultSpan: 2,
    inputs: [{ key: 'series', label: 'Série', source: 'series', required: true }],
    autoMap: (s) => ({ series: s.series?.[0]?.key ?? '' }),
    render: ({ title, mapping, ctx, options }) => {
      const opts = (options ?? {}) as WidgetOptions;
      const data = applyTopNSort(SERIES_LIKE(ctx.series?.[mapping.series]), opts.topN, opts.sort);
      const color = chartColor(opts);
      const valueFormatter = formatterForSeriesKey(mapping.series);
      return (
        <AreaChartCard
          title={title || mapping.series}
          data={data}
          visualConfig={opts.visual}
          valueFormatter={valueFormatter}
          {...(color ? { color } : {})}
        />
      );
    },
  },
  {
    id: 'donut-chart',
    kind: 'chart',
    label: 'Gráfico de Rosca',
    defaultSpan: 1,
    inputs: [{ key: 'series', label: 'Série', source: 'series', required: true }],
    autoMap: (s) => ({ series: s.series?.[0]?.key ?? '' }),
    render: ({ title, mapping, ctx, options }) => {
      const opts = (options ?? {}) as WidgetOptions;
      const data = applyTopNSort(SERIES_LIKE(ctx.series?.[mapping.series]), opts.topN, opts.sort);
      const valueFormatter = formatterForSeriesKey(mapping.series);
      return (
        <DonutChartCard
          title={title || mapping.series}
          data={data}
          onItemClick={makeClickHandler(ctx, mapping.series)}
          visualConfig={opts.visual}
          valueFormatter={valueFormatter}
        />
      );
    },
  },
  {
    id: 'pie-chart',
    kind: 'chart',
    label: 'Gráfico de Pizza',
    defaultSpan: 1,
    inputs: [{ key: 'series', label: 'Série', source: 'series', required: true }],
    autoMap: (s) => ({ series: s.series?.[0]?.key ?? '' }),
    render: ({ title, mapping, ctx, options }) => {
      const opts = (options ?? {}) as WidgetOptions;
      const data = applyTopNSort(SERIES_LIKE(ctx.series?.[mapping.series]), opts.topN, opts.sort);
      const valueFormatter = formatterForSeriesKey(mapping.series);
      return (
        <PieChartCard
          title={title || mapping.series}
          data={data}
          onItemClick={makeClickHandler(ctx, mapping.series)}
          visualConfig={opts.visual}
          valueFormatter={valueFormatter}
        />
      );
    },
  },
  {
    id: 'ranking-chart',
    kind: 'chart',
    label: 'Ranking',
    defaultSpan: 2,
    inputs: [{ key: 'series', label: 'Série', source: 'series', required: true }],
    autoMap: (s) => ({ series: s.series?.[0]?.key ?? '' }),
    render: ({ title, mapping, ctx, options }) => {
      const opts = (options ?? {}) as WidgetOptions;
      const data = applyTopNSort(SERIES_LIKE(ctx.series?.[mapping.series]), undefined, opts.sort);
      const valueFormatter = formatterForSeriesKey(mapping.series);
      return (
        <RankingChartCard
          title={title || mapping.series}
          data={data}
          topN={Number(opts.topN ?? 10)}
          onItemClick={makeClickHandler(ctx, mapping.series)}
          valueFormatter={valueFormatter}
        />
      );
    },
  },
  {
    id: 'funnel-chart',
    kind: 'chart',
    label: 'Funil',
    defaultSpan: 1,
    inputs: [{ key: 'series', label: 'Série', source: 'series', required: true }],
    autoMap: (s) => ({ series: s.series?.[0]?.key ?? '' }),
    render: ({ title, mapping, ctx, options }) => {
      const opts = (options ?? {}) as WidgetOptions;
      const arr = applyTopNSort(SERIES_LIKE(ctx.series?.[mapping.series]), opts.topN, opts.sort);
      return (
        <FunnelChartCard
          title={title || mapping.series}
          data={arr.map((p) => ({ name: p.label, value: p.valor }))}
        />
      );
  },
  {
    id: 'brazil-map',
    kind: 'chart',
    label: 'Mapa do Brasil',
    defaultSpan: 2,
    inputs: [{ key: 'series', label: 'Série (por UF)', source: 'series', required: true }],
    autoMap: (s) => {
      const pref = s.series?.find((x) => /estado|uf/i.test(x.key))?.key;
      return { series: pref ?? s.series?.[0]?.key ?? '' };
    },
    render: ({ title, mapping, ctx, options }) => {
      const opts = (options ?? {}) as WidgetOptions;
      const arr = SERIES_LIKE(ctx.series?.[mapping.series]);
      const data = arr
        .map((p: any) => {
          const raw = String(p.uf ?? p.label ?? '').trim().toUpperCase();
          const m = raw.match(/[A-Z]{2}/);
          const uf = m ? m[0] : '';
          return uf ? { uf, valor: Number(p.valor ?? 0), label: p.label } : null;
        })
        .filter(Boolean) as { uf: string; valor: number; label?: string }[];
      return (
        <BrazilMapCard
          title={title || mapping.series}
          data={data}
          colorVar={opts.color ? undefined : '--primary'}
          valueFormatter={formatterForSeriesKey(mapping.series)}
          onItemClick={(d) => makeClickHandler(ctx, mapping.series)?.({ label: d.uf, valor: d.valor })}
        />
      );
    },
  },
  },
  {
    id: 'treemap-chart',
    kind: 'chart',
    label: 'Treemap',
    defaultSpan: 2,
    inputs: [{ key: 'series', label: 'Série', source: 'series', required: true }],
    autoMap: (s) => ({ series: s.series?.[0]?.key ?? '' }),
    render: ({ title, mapping, ctx, options }) => {
      const opts = (options ?? {}) as WidgetOptions;
      const arr = applyTopNSort(SERIES_LIKE(ctx.series?.[mapping.series]), opts.topN, opts.sort);
      return (
        <TreemapChartCard
          title={title || mapping.series}
          data={arr.map((p) => ({ name: p.label, value: p.valor }))}
        />
      );
    },
  },
  {
    id: 'radar-chart',
    kind: 'chart',
    label: 'Radar',
    defaultSpan: 1,
    inputs: [{ key: 'series', label: 'Série', source: 'series', required: true }],
    autoMap: (s) => ({ series: s.series?.[0]?.key ?? '' }),
    render: ({ title, mapping, ctx }) => {
      const arr = SERIES_LIKE(ctx.series?.[mapping.series]);
      return (
        <RadarChartCard
          title={title || mapping.series}
          data={arr.map((p) => ({ axis: p.label, valor: p.valor }))}
          series={[{ dataKey: 'valor', label: title || mapping.series }]}
        />
      );
    },
  },
  {
    id: 'sparkline',
    kind: 'chart',
    label: 'Sparkline',
    defaultSpan: 1,
    inputs: [{ key: 'series', label: 'Série', source: 'series', required: true }],
    autoMap: (s) => ({ series: s.series?.[0]?.key ?? '' }),
    render: ({ title, mapping, ctx }) => (
      <ChartCardShell title={title || mapping.series} height={120}>
        <SparklineCard data={SERIES_LIKE(ctx.series?.[mapping.series]).map((p) => p.valor)} height={100} />
      </ChartCardShell>
    ),
  },

  // ===== Table =====
  {
    id: 'data-table',
    kind: 'table',
    label: 'Tabela de Dados',
    defaultSpan: 4,
    inputs: [{ key: 'rows', label: 'Origem de linhas', source: 'rows', required: true }],
    autoMap: (s) => ({ rows: s.rows?.key ?? 'dados' }),
    render: ({ title, ctx }) => {
      const rows = ctx.rows ?? [];
      const sample = rows[0] ?? {};
      const cols: Column<any>[] = Object.keys(sample).slice(0, 6).map((k) => ({
        key: k, header: k, sortable: true,
      }));
      return (
        <ChartCardShell title={title || 'Tabela'}>
          <DataTableBI data={rows.slice(0, 10)} columns={cols} />
        </ChartCardShell>
      );
    },
  },

  // ===== KPIs adicionais =====
  {
    id: 'kpi-comparison',
    kind: 'kpi',
    label: 'KPI Comparação',
    description: 'Atual vs anterior, com variação automática.',
    defaultSpan: 1,
    inputs: [
      { key: 'current', label: 'Valor atual', source: 'kpis', required: true },
      { key: 'previous', label: 'Valor anterior', source: 'kpis', required: true },
    ],
    autoMap: (s) => ({ current: s.kpis?.[0]?.key ?? '', previous: s.kpis?.[1]?.key ?? s.kpis?.[0]?.key ?? '' }),
    render: ({ title, mapping, ctx }) => (
      <KpiComparisonCard
        title={title || mapping.current}
        current={Number(ctx.kpis?.[mapping.current] ?? 0)}
        previous={Number(ctx.kpis?.[mapping.previous] ?? 0)}
      />
    ),
  },
  {
    id: 'kpi-variation',
    kind: 'kpi',
    label: 'KPI Variação',
    description: 'Mostra apenas a variação percentual.',
    defaultSpan: 1,
    inputs: [{ key: 'value', label: 'Variação (%)', source: 'kpis', required: true }],
    autoMap: (s) => ({ value: s.kpis?.[0]?.key ?? '' }),
    render: ({ title, mapping, ctx }) => (
      <KpiVariationCard title={title || mapping.value} variation={Number(ctx.kpis?.[mapping.value] ?? 0)} />
    ),
  },
  {
    id: 'kpi-status',
    kind: 'kpi',
    label: 'KPI com Status',
    description: 'KPI com badge de status.',
    defaultSpan: 1,
    inputs: [{ key: 'value', label: 'Valor', source: 'kpis', required: true }],
    autoMap: (s) => ({ value: s.kpis?.[0]?.key ?? '' }),
    render: ({ title, mapping, ctx, options }) => (
      <KpiStatusCard
        title={title || mapping.value}
        value={Number(ctx.kpis?.[mapping.value] ?? 0)}
        format={(options?.format as any) ?? 'number'}
        status={(options?.status as BiStatus) ?? 'neutro'}
      />
    ),
  },

  // ===== Charts adicionais =====
  {
    id: 'stacked-bar-chart',
    kind: 'chart',
    label: 'Barras Empilhadas',
    defaultSpan: 2,
    inputs: [{ key: 'series', label: 'Série (multi-key)', source: 'series', required: true }],
    autoMap: (s) => ({ series: s.series?.[0]?.key ?? '' }),
    render: ({ title, mapping, ctx, options }) => {
      const raw = ctx.series?.[mapping.series];
      const arr = Array.isArray(raw) ? raw : [];
      // descobre keys numéricas (exceto label)
      const sample = arr[0] ?? {};
      const keys = Object.keys(sample).filter((k) => typeof (sample as any)[k] === 'number').slice(0, 4);
      const series = keys.map((k) => ({ dataKey: k, label: k }));
      return <StackedBarChartCard title={title || mapping.series} data={arr} series={series.length ? series : [{ dataKey: 'valor', label: 'valor' }]} visualConfig={options?.visual} />;
    },
  },
  {
    id: 'combo-chart',
    kind: 'chart',
    label: 'Combo (Barra + Linha)',
    defaultSpan: 2,
    inputs: [{ key: 'series', label: 'Série', source: 'series', required: true }],
    autoMap: (s) => ({ series: s.series?.[0]?.key ?? '' }),
    render: ({ title, mapping, ctx, options }) => {
      const raw = ctx.series?.[mapping.series];
      const arr = Array.isArray(raw) ? raw : [];
      const sample = arr[0] ?? {};
      const numKeys = Object.keys(sample).filter((k) => typeof (sample as any)[k] === 'number');
      const barKey = numKeys[0] ?? 'valor';
      const lineKey = numKeys[1] ?? numKeys[0] ?? 'valor';
      return (
        <ComboChartCard
          title={title || mapping.series}
          data={arr}
          barKey={barKey}
          barLabel={barKey}
          lineKey={lineKey}
          lineLabel={lineKey}
          visualConfig={options?.visual}
        />
      );
    },
  },
  {
    id: 'gauge-chart',
    kind: 'chart',
    label: 'Velocímetro (Gauge)',
    defaultSpan: 1,
    inputs: [{ key: 'value', label: 'Valor (0–100)', source: 'kpis', required: true }],
    autoMap: (s) => ({ value: s.kpis?.[0]?.key ?? '' }),
    render: ({ title, mapping, ctx, options }) => (
      <GaugeChartCard
        title={title || mapping.value}
        value={Number(ctx.kpis?.[mapping.value] ?? 0)}
        max={Number(options?.max ?? 100)}
      />
    ),
  },
  {
    id: 'progress-chart',
    kind: 'chart',
    label: 'Barras de Progresso',
    description: 'Lista de itens com valor x meta.',
    defaultSpan: 2,
    inputs: [{ key: 'series', label: 'Série (label/valor)', source: 'series', required: true }],
    autoMap: (s) => ({ series: s.series?.[0]?.key ?? '' }),
    render: ({ title, mapping, ctx, options }) => {
      const arr = SERIES_LIKE(ctx.series?.[mapping.series]);
      const target = Number(options?.target ?? Math.max(...arr.map((p) => p.valor), 1));
      return (
        <ProgressChartCard
          title={title || mapping.series}
          items={arr.map((p) => ({ label: p.label, value: p.valor, target, format: 'number' }))}
        />
      );
    },
  },
  {
    id: 'scatter-chart',
    kind: 'chart',
    label: 'Dispersão (Scatter)',
    defaultSpan: 2,
    inputs: [{ key: 'series', label: 'Série (x/y)', source: 'series', required: true }],
    autoMap: (s) => ({ series: s.series?.[0]?.key ?? '' }),
    render: ({ title, mapping, ctx }) => {
      const raw = ctx.series?.[mapping.series];
      const arr = Array.isArray(raw) ? raw : [];
      const data = arr
        .map((p: any) => ({ x: Number(p.x ?? p.label ?? 0), y: Number(p.y ?? p.valor ?? 0), z: Number(p.z ?? 100) }))
        .filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y));
      return <ScatterChartCard title={title || mapping.series} data={data} />;
    },
  },
  {
    id: 'heatmap-chart',
    kind: 'chart',
    label: 'Heatmap (linha × coluna)',
    defaultSpan: 2,
    inputs: [{ key: 'series', label: 'Série (row/col/value)', source: 'series', required: true }],
    autoMap: (s) => ({ series: s.series?.[0]?.key ?? '' }),
    render: ({ title, mapping, ctx }) => {
      const raw = ctx.series?.[mapping.series];
      const arr = Array.isArray(raw) ? raw : [];
      const data = arr.map((p: any) => ({
        row: String(p.row ?? p.label ?? ''),
        col: String(p.col ?? p.x ?? ''),
        value: Number(p.value ?? p.valor ?? 0),
      }));
      return <HeatmapChartCard title={title || mapping.series} data={data} />;
    },
  },
  {
    id: 'waterfall-chart',
    kind: 'chart',
    label: 'Waterfall (variação)',
    defaultSpan: 2,
    inputs: [{ key: 'series', label: 'Série', source: 'series', required: true }],
    autoMap: (s) => ({ series: s.series?.[0]?.key ?? '' }),
    render: ({ title, mapping, ctx }) => {
      const arr = SERIES_LIKE(ctx.series?.[mapping.series]);
      return (
        <WaterfallChartCard
          title={title || mapping.series}
          data={arr.map((p, i) => ({ label: p.label, value: p.valor, isTotal: i === 0 || i === arr.length - 1 }))}
        />
      );
    },
  },
  {
    id: 'calendar-heatmap',
    kind: 'chart',
    label: 'Heatmap calendário',
    defaultSpan: 2,
    inputs: [{ key: 'series', label: 'Série diária (date/value)', source: 'series', required: true }],
    autoMap: (s) => ({ series: s.series?.[0]?.key ?? '' }),
    render: ({ title, mapping, ctx }) => {
      const raw = ctx.series?.[mapping.series];
      const arr = Array.isArray(raw) ? raw : [];
      const data = arr
        .map((p: any) => ({ date: String(p.date ?? p.label ?? ''), value: Number(p.value ?? p.valor ?? 0) }))
        .filter((p) => p.date);
      return <CalendarHeatmapCard title={title || mapping.series} data={data} />;
    },
  },


  // ===== Hierarquia =====
  {
    id: 'tree-view',
    kind: 'tree',
    label: 'Árvore (TreeView)',
    description: 'Hierarquia colapsável a partir das linhas.',
    defaultSpan: 2,
    inputs: [{ key: 'rows', label: 'Origem de linhas', source: 'rows', required: true }],
    autoMap: (s) => ({ rows: s.rows?.key ?? 'dados' }),
    render: ({ title, ctx }) => {
      const rows = ctx.rows ?? [];
      const sample: any = rows[0] ?? {};
      const labelKey = Object.keys(sample).find((k) => typeof sample[k] === 'string') ?? 'label';
      const valueKey = Object.keys(sample).find((k) => typeof sample[k] === 'number');
      const nodes = rows.slice(0, 30).map((r: any, i: number) => ({
        id: String(r.id ?? i),
        label: String(r[labelKey] ?? `Item ${i + 1}`),
        value: valueKey ? r[valueKey] : undefined,
      }));
      return (
        <ChartCardShell title={title || 'Hierarquia'}>
          <TreeView nodes={nodes} />
        </ChartCardShell>
      );
    },
  },
  {
    id: 'timeline',
    kind: 'tree',
    label: 'Timeline (eventos)',
    defaultSpan: 2,
    inputs: [{ key: 'rows', label: 'Origem de linhas', source: 'rows', required: true }],
    autoMap: (s) => ({ rows: s.rows?.key ?? 'dados' }),
    render: ({ title, ctx }) => {
      const rows = ctx.rows ?? [];
      const sample: any = rows[0] ?? {};
      const titleKey = Object.keys(sample).find((k) => typeof sample[k] === 'string') ?? 'titulo';
      const tsKey = Object.keys(sample).find((k) => /data|date|timestamp/i.test(k)) ?? titleKey;
      const events = rows.slice(0, 20).map((r: any, i: number) => ({
        id: String(r.id ?? i),
        title: String(r[titleKey] ?? `Evento ${i + 1}`),
        timestamp: String(r[tsKey] ?? ''),
      }));
      return (
        <ChartCardShell title={title || 'Linha do tempo'}>
          <Timeline events={events} />
        </ChartCardShell>
      );
    },
  },

  // ===== Tabelas adicionais =====
  {
    id: 'ranking-table',
    kind: 'table',
    label: 'Tabela Ranking',
    defaultSpan: 2,
    inputs: [{ key: 'series', label: 'Série (label/valor)', source: 'series', required: true }],
    autoMap: (s) => ({ series: s.series?.[0]?.key ?? '' }),
    render: ({ title, mapping, ctx }) => (
      <ChartCardShell title={title || mapping.series}>
        <RankingTable data={SERIES_LIKE(ctx.series?.[mapping.series]).slice(0, 10)} />
      </ChartCardShell>
    ),
  },
  {
    id: 'summary-table',
    kind: 'table',
    label: 'Tabela Resumo',
    defaultSpan: 2,
    inputs: [{ key: 'series', label: 'Série (label/valor)', source: 'series', required: true }],
    autoMap: (s) => ({ series: s.series?.[0]?.key ?? '' }),
    render: ({ title, mapping, ctx }) => {
      const arr = SERIES_LIKE(ctx.series?.[mapping.series]);
      const total = arr.reduce((s, p) => s + p.valor, 0);
      return (
        <ChartCardShell title={title || mapping.series}>
          <SummaryTable
            rows={arr.map((p) => ({ label: p.label, value: p.valor, format: 'currency' }))}
            total={{ label: 'Total', value: total, format: 'currency', bold: true }}
          />
        </ChartCardShell>
      );
    },
  },
  {
    id: 'comparison-table',
    kind: 'table',
    label: 'Tabela Comparação',
    defaultSpan: 2,
    inputs: [
      { key: 'current', label: 'Série atual', source: 'series', required: true },
      { key: 'previous', label: 'Série anterior', source: 'series', required: true },
    ],
    autoMap: (s) => ({ current: s.series?.[0]?.key ?? '', previous: s.series?.[1]?.key ?? s.series?.[0]?.key ?? '' }),
    render: ({ title, mapping, ctx }) => {
      const cur = SERIES_LIKE(ctx.series?.[mapping.current]);
      const prev = SERIES_LIKE(ctx.series?.[mapping.previous]);
      const prevByLabel = new Map(prev.map((p) => [p.label, p.valor]));
      return (
        <ChartCardShell title={title || 'Comparação'}>
          <ComparisonTable
            rows={cur.map((p) => ({ label: p.label, current: p.valor, previous: prevByLabel.get(p.label) ?? 0, format: 'currency' }))}
          />
        </ChartCardShell>
      );
    },
  },
  {
    id: 'drill-down-table',
    kind: 'table',
    label: 'Tabela Drill-down',
    description: 'Hierarquia colapsável a partir das linhas.',
    defaultSpan: 4,
    inputs: [{ key: 'rows', label: 'Origem de linhas', source: 'rows', required: true }],
    autoMap: (s) => ({ rows: s.rows?.key ?? 'dados' }),
    render: ({ title, ctx }) => {
      const rows = ctx.rows ?? [];
      const sample: any = rows[0] ?? {};
      const stringKeys = Object.keys(sample).filter((k) => typeof sample[k] === 'string').slice(0, 3);
      const levels = stringKeys.map((k) => ({ key: k, label: k }));
      return (
        <ChartCardShell title={title || 'Drill-down'}>
          {levels.length ? (
            <DrillDownTable data={rows} levels={levels as any} />
          ) : (
            <div className="text-xs text-muted-foreground p-2">Sem colunas categóricas suficientes para drill.</div>
          )}
        </ChartCardShell>
      );
    },
  },

  // ===== Badges =====
  {
    id: 'status-badge',
    kind: 'kpi',
    label: 'Status Badge',
    description: 'Badge de status para destacar uma métrica.',
    defaultSpan: 1,
    inputs: [],
    autoMap: () => ({}),
    render: ({ title, options }) => (
      <div className="rounded-md border bg-card p-3 flex items-center gap-2">
        <span className="text-xs text-muted-foreground">{title || 'Status'}:</span>
        <StatusBadge status={(options?.status as BiStatus) ?? 'neutro'} />
      </div>
    ),
  },
];

export function getComponent(id: string): BiComponentDef | undefined {
  return COMPONENT_REGISTRY.find((c) => c.id === id);
}
