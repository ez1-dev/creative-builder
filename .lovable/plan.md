# BI Components Library — biblioteca interna de dashboards

Padronizar todas as telas analíticas do ERP em torno de uma única lib visual e funcional, com catálogo navegável e migração inicial de Painel de Compras + Notas Fiscais de Recebimento.

## Estratégia

Entrega em **3 fases** dentro deste turno:

1. **Fase 1 – Núcleo da lib** (pasta `src/components/bi/`): formatadores, estados, KPIs, charts, tabelas, filtros, drill, layout. Componentes puros, sem dependência de página específica, todos com `loading` / `error` / `empty` padronizados.
2. **Fase 2 – Catálogo `/bi-components-demo`**: rota nova protegida, com seções demonstrando cada componente usando dados de exemplo controlados (mock só nessa rota).
3. **Fase 3 – Adoção incremental** em `PainelComprasPage` e `NotasRecebimentoPage`: substituir gradualmente os blocos visuais hoje hardcoded pelos novos componentes da lib, **sem alterar APIs nem filtros existentes** (continua chamando `/api/painel-compras-dashboard`, `/api/notas-recebimento-dashboard`, etc.).

## Fase 1 — Estrutura de arquivos

```text
src/components/bi/
  index.ts                              ← barrel (re-export tudo)
  utils/
    formatters.ts                       ← formatCurrency, formatNumber, formatPercent,
                                          formatDateBR, abbreviateNumber, percentVariation,
                                          statusColor, statusLabel
    chartHelpers.ts                     ← paletas, gradientes, tickFormatter, sortBy, topN
    dashboardHelpers.ts                 ← buildKpiList, mapBucket, drillNavigator
  states/
    LoadingState.tsx                    ← skeleton + spinner contextual
    EmptyState.tsx                      ← ícone + título + descrição + CTA opcional
    ErrorState.tsx                      ← mensagem + retry
    NoDataState.tsx                     ← variação de Empty para gráficos
  kpis/
    KpiCard.tsx                         ← title/value/icon/format/variant/trend/onClick/loading/tooltip
    KpiGrid.tsx                         ← grid responsivo (auto-fit) que aceita KpiCard[]
    KpiComparisonCard.tsx               ← valor atual vs período anterior
    KpiVariationCard.tsx                ← destaque de variação % com ícone up/down
    KpiStatusCard.tsx                   ← KPI + badge de status
  charts/
    ChartCardShell.tsx                  ← wrapper comum (header, toolbar, expand, export PNG, loading, empty, error)
    BarChartCard.tsx
    HorizontalBarChartCard.tsx
    LineChartCard.tsx
    AreaChartCard.tsx
    PieChartCard.tsx
    DonutChartCard.tsx
    StackedBarChartCard.tsx
    ComboChartCard.tsx                  ← barras + linha
    RankingChartCard.tsx                ← barras horizontais com posição/medalha
    GaugeChartCard.tsx                  ← RadialBar (recharts)
    ProgressChartCard.tsx               ← barra de progresso meta
  tables/
    DataTableBI.tsx                     ← wrapper sobre DataTable atual + busca, ordenação, paginação client/server, badges, formatos, ações por linha, export
    DrillDownTable.tsx                  ← agrupamento hierárquico expansível, suporta níveis dinâmicos
    RankingTable.tsx                    ← top-N com posição, valor, % e barra inline
    SummaryTable.tsx                    ← totais e subtotais
    ComparisonTable.tsx                 ← período A vs B + variação
  filters/
    DashboardFilters.tsx                ← container recolhível com Aplicar/Limpar/Atualizar
    FilterBar.tsx                       ← linha horizontal compacta (filtros principais)
    AdvancedFiltersPanel.tsx            ← grupo expansível
    FilterChips.tsx                     ← chips dos filtros ativos com remover individual
    DateRangeFilter.tsx
    SelectFilter.tsx                    ← reusa shadcn Select
    MultiSelectFilter.tsx               ← reusa Combobox/Popover
    SearchFilter.tsx                    ← input com debounce
  drill/
    DrillBreadcrumb.tsx                 ← níveis clicáveis + voltar + limpar
    DrillLevelSelector.tsx              ← chips para escolher próximo nível
    DrillTable.tsx                      ← tabela conectada ao breadcrumb (estado controlado)
  layout/
    DashboardPage.tsx                   ← <main> com padding e gaps padrão + slots
    DashboardHeader.tsx                 ← título, subtítulo, descrição, ações (export/refresh)
    DashboardSection.tsx                ← seção com título + ícone + opcional toolbar
    DashboardGrid.tsx                   ← grid responsivo configurável (cols={1..6})
    ChartGrid.tsx                       ← preset 2/3 colunas para gráficos
    DashboardTabs.tsx                   ← wrapper sobre Tabs com persistência opcional
    DashboardToolbar.tsx                ← barra de ações (refresh, export, fullscreen)
  badges/
    StatusBadge.tsx                     ← variantes: recebido, pendente, parcial, cancelado, atraso, semNF, comNF, semOC, comOC, positivo, negativo, neutro
```

## Contratos chave

```ts
// formatters
formatCurrency(1250000) // "R$ 1.250.000,00"
formatPercent(0.1535)   // "15,35%"
formatNumber(10500)     // "10.500"
formatDateBR("2026-05-07") // "07/05/2026"
abbreviateNumber(1250000)  // "R$ 1,25 mi"

// KpiCard
type KpiFormat = "currency" | "number" | "percent" | "quantity" | "raw";
interface KpiCardProps {
  title: string;
  value: number | string;
  format?: KpiFormat;
  subtitle?: string;
  icon?: ReactNode;
  variant?: "default" | "info" | "success" | "warning" | "danger";
  trend?: { value: number; label?: string }; // delta % vs período anterior
  status?: "ok" | "alert" | "neutral";
  loading?: boolean;
  tooltip?: string;
  onClick?: () => void;
}

// Charts genéricos
interface ChartCardProps<T> {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  data: T[];
  loading?: boolean;
  error?: string | null;
  emptyMessage?: string;
  height?: number;
  onItemClick?: (item: T) => void;
  valueFormatter?: (v: number) => string;
  expandable?: boolean;
  exportable?: boolean;
}

// Drill
interface DrillLevel { key: string; label: string }
interface DrillState {
  levels: DrillLevel[];
  path: Array<{ levelKey: string; value: string; label: string }>;
}
```

## Fase 2 — Catálogo `/bi-components-demo`

- Nova rota em `src/App.tsx` protegida pelo mesmo `ProtectedRoute` das demais.
- Página `src/pages/BiComponentsDemoPage.tsx` com `<DashboardTabs>`:
  - **KPIs**: grid demonstrando todas as variantes (default/info/success/warning/danger), com/sem trend, com/sem status, loading, click handler.
  - **Gráficos**: cada `*ChartCard` com dataset de exemplo (mock local, comentado como demo-only), incluindo estados loading/empty/error.
  - **Tabelas**: `DataTableBI`, `RankingTable`, `SummaryTable`, `ComparisonTable`, `DrillDownTable`.
  - **Filtros**: `DashboardFilters` + `FilterChips` + `DateRangeFilter` + `MultiSelectFilter` interativos.
  - **Drill-down**: navegação Projeto Macro → Projeto → Centro de Custo → Mês → Fornecedor com mock.
  - **Dashboard completo**: composição de tudo em uma página exemplo (Painel Demo).
- Adicionar item no `AppSidebar` em uma seção "Desenvolvimento" / "Componentes" (visível só para admins) — ou apenas link direto sem item de menu, decidido durante a implementação.

## Fase 3 — Migração inicial

### `src/pages/PainelComprasPage.tsx`
Sem mexer em filtros, busca, exportação ou nas chamadas a `/api/painel-compras` e `/api/painel-compras-dashboard`:
- Substituir o bloco de KPIs gerenciais por `<KpiGrid>` + `<KpiCard>` (mapeando `kpisGerencial`).
- Trocar `<ChartCard>` local pelos `BarChartCard` / `DonutChartCard` / `RankingChartCard` da lib.
- Trocar drill atual pelo `<DrillBreadcrumb>` + `<DrillDownTable>`.
- Banner de amostragem migra para `<EmptyState variant="warning">` ou um `Alert` da lib.

### `src/pages/NotasRecebimentoPage.tsx`
Mesma adaptação, mantendo intactos: filtros, paginação da Lista Detalhada, exportação, chamadas a `/api/notas-recebimento` e `/api/notas-recebimento-dashboard`.

## Restrições reforçadas

- Zero mock fora de `/bi-components-demo`.
- Zero remoção de filtro/feature existente.
- Zero alteração no contrato de API ou em `src/integrations/supabase/{client,types}.ts`.
- Cores via tokens semânticos (`hsl(var(--primary))` etc.), nunca hardcoded.
- Componentes recebem dados por props — nenhum chama `api` diretamente.
- Lib é client-only e tree-shakeable via barrel `index.ts`.

## Critério de aceite

- `/bi-components-demo` renderiza todos os componentes em todos os estados (loading/empty/error/normal).
- Painel de Compras e Notas Fiscais de Recebimento continuam funcionando com os mesmos filtros e dados, agora visualmente uniformes.
- Cada novo componente da lib é importável via `import { KpiCard, BarChartCard, ... } from "@/components/bi"`.

## Escopo deixado para próximas iterações (não nesta entrega)

- `HeatmapChartCard` e `FunnelChartCard` (recharts não suporta nativamente — exigem nova dependência; será proposto separadamente).
- Migração de Estoque, Financeiro, Produção, Projetos, Custos, Vendas (próximos PRs, depois que Compras + Recebimentos estiverem validados).
- Storybook formal — por enquanto a página `/bi-components-demo` cumpre o papel de catálogo.
