# Phase 2 — BI Components Demo Catalog

Build a navigable internal catalog at `/bi-components-demo` to showcase every component in `src/components/bi/` with controlled mock data.

## Scope

- New protected route `/bi-components-demo` accessible to authenticated users.
- Single page with a left in-page sidebar (sticky) listing component categories; right pane renders live demos.
- All data is mock/static, no API calls. Inputs (e.g. filter selects) update local state only.

## Files to create

1. `src/pages/BiComponentsDemoPage.tsx` — main demo page.
2. `src/pages/bi-demo/mockData.ts` — centralized mock datasets (KPIs, time series, rankings, drill rows, filter options).
3. `src/pages/bi-demo/sections/` — one file per category, each exports a `<section id="...">`:
   - `KpisSection.tsx` — KpiCard variants, KpiGrid, KpiComparisonCard, KpiVariationCard, KpiStatusCard.
   - `ChartsSection.tsx` — Bar, HorizontalBar, Line, Area, Pie, Donut, StackedBar, Combo, Ranking, Gauge, Progress.
   - `TablesSection.tsx` — DataTableBI, DrillDownTable, RankingTable, SummaryTable, ComparisonTable.
   - `FiltersSection.tsx` — DashboardFilters, FilterBar, AdvancedFiltersPanel, FilterChips, DateRange, Select, MultiSelect, Search.
   - `DrillSection.tsx` — DrillBreadcrumb + DrillLevelSelector with sample state.
   - `StatesSection.tsx` — Loading, Empty, Error, NoData side by side.
   - `BadgesSection.tsx` — StatusBadge variants.
   - `LayoutSection.tsx` — DashboardLayout/DashboardTabs mini-example.
4. `src/pages/bi-demo/CatalogSidebar.tsx` — sticky nav with anchor links + active-section highlight (IntersectionObserver).

## Files to edit

- `src/App.tsx` — import `BiComponentsDemoPage` and add inside `<AppLayout>`:
  ```tsx
  <Route path="/bi-components-demo" element={<ProtectedRoute path="/bi-components-demo"><BiComponentsDemoPage /></ProtectedRoute>} />
  ```

## Page layout

```text
+-----------------------------------------------------------+
| DashboardHeader: "Catálogo de Componentes BI"             |
+----------+------------------------------------------------+
| Sidebar  | KPIs        (anchor #kpis)                     |
| (sticky) | Gráficos    (anchor #charts)                   |
| anchors  | Tabelas     (anchor #tables)                   |
|          | Filtros     (anchor #filters)                  |
|          | Drill-down  (anchor #drill)                    |
|          | Estados     (anchor #states)                   |
|          | Badges      (anchor #badges)                   |
|          | Layout      (anchor #layout)                   |
+----------+------------------------------------------------+
```

Each section renders a heading + short description + a grid of demo cards. Each demo card wraps the component with a small label showing the component name.

## Constraints

- No new API contracts, no network calls.
- Use only the existing design tokens (no hardcoded hex/text-white).
- Reuse existing shadcn primitives for the sidebar shell.
- Page is responsive: sidebar collapses to a top-bar of pills below `lg`.

No memory updates required.