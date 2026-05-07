## Objetivo

Permitir aplicar **todos** os componentes visíveis no catálogo `/biblioteca-bi`. Hoje só ~12 itens têm botão "Aplicar" porque o `COMPONENT_REGISTRY` cobre apenas parte dos componentes da biblioteca.

## Mudanças

### 1. `src/lib/bi/componentRegistry.tsx` — ampliar registry

Adicionar entradas para todos os componentes faltantes, cada um com `id`, `kind`, `inputs`, `autoMap` e `render`:

**KPIs faltantes (`kind: 'kpi'`):**
- `kpi-comparison` → KpiComparisonCard (input: `current` + `previous` em kpis)
- `kpi-variation` → KpiVariationCard (input: variação numérica)
- `kpi-status` → KpiStatusCard (input: kpi + status fixo via options)

**Charts faltantes (`kind: 'chart'`):**
- `stacked-bar-chart` → StackedBarChartCard (série multi-key)
- `combo-chart` → ComboChartCard (barra + linha)
- `gauge-chart` → GaugeChartCard (kpi único, 0–100)
- `progress-chart` → ProgressChartCard (lista de metas)
- `scatter-chart` → ScatterChartCard (série x/y)
- `heatmap-chart` → HeatmapChartCard
- `waterfall-chart` → WaterfallChartCard
- `calendar-heatmap` → CalendarHeatmapCard (série diária)

**Mapas (`kind: 'map'`):**
- `brazil-map` → BrazilMapCard (série uf/valor)

**Hierarquia (`kind: 'tree'`):**
- `tree-view` → TreeView (rows hierárquicas)
- `timeline` → Timeline (rows com timestamp/title)

**Tabelas (`kind: 'table'`):**
- `ranking-table` → RankingTable
- `summary-table` → SummaryTable
- `comparison-table` → ComparisonTable
- `drill-down-table` → DrillDownTable

**Badges (`kind: 'kpi'` reaproveitando):**
- `status-badge` → StatusBadge (status fixo via options)

Cada entrada usa `SERIES_LIKE` (ou variação) para normalizar dados. Quando o componente exigir formato muito específico (heatmap row/col, scatter x/y, calendar date/value), o `render` faz a transformação inline a partir de `ctx.series[mapping.series]` ou `ctx.rows`.

### 2. `src/pages/BiComponentsDemoPage.tsx` — vincular DemoBlocks

Adicionar `applyId="..."` em cada `<DemoBlock>` (ou `<WithApply componentId="...">` para os que ficam dentro de `<ChartGrid>`) para os componentes acima. Lista de blocos a marcar:

- KPIs: `KpiComparisonCard / KpiVariationCard / KpiStatusCard` (separar em 3 DemoBlocks com 3 applyIds, ou usar 1 applyId representativo). Solução escolhida: separar em sub-blocos.
- Charts: StackedBar, Combo, Gauge, Progress, Scatter, Waterfall, Heatmap, CalendarHeatmap, Sparkline.
- Maps: BrazilMapCard.
- Tree: TreeView, Timeline.
- Tables: RankingTable, SummaryTable, ComparisonTable, DrillDownTable.
- Badges: StatusBadge.

### 3. Blocos que **continuam sem botão** (intencional)

Componentes de composição/UI puros — não fazem sentido como widget isolado em uma página:

- `DashboardTabs`, `DashboardGrid` (containers)
- Toda a seção "Filtros" (DashboardFilters, FilterBar, FilterChips, AdvancedFiltersPanel, DateRangeFilter, SelectFilter, MultiSelectFilter, SearchFilter)
- Toda a seção "Drill-down" (DrillBreadcrumb, DrillLevelSelector — fazem parte do estado da página)
- Toda a seção "Estados" (LoadingState, EmptyState, ErrorState, NoDataState)
- "Formatadores" (helpers utilitários)

Esses ganharão um pequeno selo `<span>` cinza com texto "uso direto via import" ao lado do nome, deixando claro ao usuário que não há botão "Aplicar" porque não é um widget.

## Resultado

Todos os cards visuais do catálogo (KPIs, Gráficos, Mapas, Hierarquia, Tabelas, Badges) terão botão **Aplicar** funcional. Os cards utilitários (Filtros/Drill/Estados/Formatadores) continuam sem botão, mas com um selo explicando o motivo.
