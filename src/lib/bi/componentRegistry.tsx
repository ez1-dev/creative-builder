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
  BarChartCard, HorizontalBarChartCard, LineChartCard, AreaChartCard,
  DonutChartCard, PieChartCard, RankingChartCard, FunnelChartCard,
  TreemapChartCard, RadarChartCard, SparklineCard,
  DataTableBI,
  type Column,
} from '@/components/bi';
import type { PageDataSchema } from './pageRegistry';
import type { WidgetKind } from './pageRegistry';

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
    ctx: { kpis: Record<string, any>; series: Record<string, any>; rows: any[] };
    options: Record<string, any>;
  }) => ReactNode;
}

const SERIES_LIKE = (s: any): { label: string; valor: number }[] => {
  if (!Array.isArray(s)) return [];
  return s
    .map((p) => ({ label: String(p?.label ?? p?.name ?? p?.x ?? ''), valor: Number(p?.valor ?? p?.value ?? p?.y ?? 0) }))
    .filter((p) => p.label);
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
    render: ({ title, mapping, ctx }) => {
      const def = mapping.value;
      const v = ctx.kpis?.[def];
      return <KpiCard title={title || def} value={v ?? 0} format="currency" />;
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
    render: ({ title, mapping, ctx }) => {
      const v = ctx.kpis?.[mapping.value] ?? 0;
      const arr = SERIES_LIKE(ctx.series?.[mapping.series]).map((p) => p.valor);
      return <KpiSparklineCard title={title || mapping.value} value={v} format="currency" series={arr} />;
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
    render: ({ title, mapping, ctx, options }) => (
      <KpiTargetCard
        title={title || mapping.value}
        value={Number(ctx.kpis?.[mapping.value] ?? 0)}
        target={Number(options?.target ?? 100)}
        format={(options?.format as any) ?? 'number'}
      />
    ),
  },

  // ===== Charts =====
  {
    id: 'bar-chart',
    kind: 'chart',
    label: 'Gráfico de Barras',
    defaultSpan: 2,
    inputs: [{ key: 'series', label: 'Série', source: 'series', required: true }],
    autoMap: (s) => ({ series: s.series?.[0]?.key ?? '' }),
    render: ({ title, mapping, ctx }) => (
      <BarChartCard title={title || mapping.series} data={SERIES_LIKE(ctx.series?.[mapping.series])} />
    ),
  },
  {
    id: 'horizontal-bar-chart',
    kind: 'chart',
    label: 'Barras Horizontais',
    defaultSpan: 2,
    inputs: [{ key: 'series', label: 'Série', source: 'series', required: true }],
    autoMap: (s) => ({ series: s.series?.[0]?.key ?? '' }),
    render: ({ title, mapping, ctx }) => (
      <HorizontalBarChartCard title={title || mapping.series} data={SERIES_LIKE(ctx.series?.[mapping.series])} />
    ),
  },
  {
    id: 'line-chart',
    kind: 'chart',
    label: 'Gráfico de Linha',
    defaultSpan: 2,
    inputs: [{ key: 'series', label: 'Série', source: 'series', required: true }],
    autoMap: (s) => ({ series: s.series?.[0]?.key ?? '' }),
    render: ({ title, mapping, ctx }) => (
      <LineChartCard title={title || mapping.series} data={SERIES_LIKE(ctx.series?.[mapping.series])} />
    ),
  },
  {
    id: 'area-chart',
    kind: 'chart',
    label: 'Gráfico de Área',
    defaultSpan: 2,
    inputs: [{ key: 'series', label: 'Série', source: 'series', required: true }],
    autoMap: (s) => ({ series: s.series?.[0]?.key ?? '' }),
    render: ({ title, mapping, ctx }) => (
      <AreaChartCard title={title || mapping.series} data={SERIES_LIKE(ctx.series?.[mapping.series])} />
    ),
  },
  {
    id: 'donut-chart',
    kind: 'chart',
    label: 'Gráfico de Rosca',
    defaultSpan: 1,
    inputs: [{ key: 'series', label: 'Série', source: 'series', required: true }],
    autoMap: (s) => ({ series: s.series?.[0]?.key ?? '' }),
    render: ({ title, mapping, ctx }) => (
      <DonutChartCard title={title || mapping.series} data={SERIES_LIKE(ctx.series?.[mapping.series])} />
    ),
  },
  {
    id: 'pie-chart',
    kind: 'chart',
    label: 'Gráfico de Pizza',
    defaultSpan: 1,
    inputs: [{ key: 'series', label: 'Série', source: 'series', required: true }],
    autoMap: (s) => ({ series: s.series?.[0]?.key ?? '' }),
    render: ({ title, mapping, ctx }) => (
      <PieChartCard title={title || mapping.series} data={SERIES_LIKE(ctx.series?.[mapping.series])} />
    ),
  },
  {
    id: 'ranking-chart',
    kind: 'chart',
    label: 'Ranking',
    defaultSpan: 2,
    inputs: [{ key: 'series', label: 'Série', source: 'series', required: true }],
    autoMap: (s) => ({ series: s.series?.[0]?.key ?? '' }),
    render: ({ title, mapping, ctx, options }) => (
      <RankingChartCard
        title={title || mapping.series}
        data={SERIES_LIKE(ctx.series?.[mapping.series])}
        topN={Number(options?.topN ?? 10)}
      />
    ),
  },
  {
    id: 'funnel-chart',
    kind: 'chart',
    label: 'Funil',
    defaultSpan: 1,
    inputs: [{ key: 'series', label: 'Série', source: 'series', required: true }],
    autoMap: (s) => ({ series: s.series?.[0]?.key ?? '' }),
    render: ({ title, mapping, ctx }) => (
      <FunnelChartCard title={title || mapping.series} data={SERIES_LIKE(ctx.series?.[mapping.series])} />
    ),
  },
  {
    id: 'treemap-chart',
    kind: 'chart',
    label: 'Treemap',
    defaultSpan: 2,
    inputs: [{ key: 'series', label: 'Série', source: 'series', required: true }],
    autoMap: (s) => ({ series: s.series?.[0]?.key ?? '' }),
    render: ({ title, mapping, ctx }) => (
      <TreemapChartCard title={title || mapping.series} data={SERIES_LIKE(ctx.series?.[mapping.series])} />
    ),
  },
  {
    id: 'radar-chart',
    kind: 'chart',
    label: 'Radar',
    defaultSpan: 1,
    inputs: [{ key: 'series', label: 'Série', source: 'series', required: true }],
    autoMap: (s) => ({ series: s.series?.[0]?.key ?? '' }),
    render: ({ title, mapping, ctx }) => (
      <RadarChartCard title={title || mapping.series} data={SERIES_LIKE(ctx.series?.[mapping.series])} />
    ),
  },
  {
    id: 'sparkline',
    kind: 'chart',
    label: 'Sparkline',
    defaultSpan: 1,
    inputs: [{ key: 'series', label: 'Série', source: 'series', required: true }],
    autoMap: (s) => ({ series: s.series?.[0]?.key ?? '' }),
    render: ({ title, mapping, ctx }) => (
      <SparklineCard title={title || mapping.series} series={SERIES_LIKE(ctx.series?.[mapping.series]).map((p) => p.valor)} />
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
      return <DataTableBI title={title || 'Tabela'} data={rows} columns={cols} pageSize={10} />;
    },
  },
];

export function getComponent(id: string): BiComponentDef | undefined {
  return COMPONENT_REGISTRY.find((c) => c.id === id);
}
