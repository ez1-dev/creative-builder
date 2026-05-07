# Biblioteca BI — Guia de Uso

Este guia mostra como aplicar os componentes de `@/components/bi` nas páginas do ERP, mantendo consistência visual e reduzindo código boilerplate.

## Por que usar a Biblioteca?

| Antes (componentes ad-hoc) | Depois (Biblioteca BI) |
|---|---|
| Cada página implementa loading/error/empty diferente | `ChartCardShell` herda automaticamente |
| Cores hardcoded (`text-blue-500`) | Tokens semânticos + `BI_PALETTE` consistente |
| `KPICard` legacy duplicado por página | `KpiCard` + `KpiGrid` unificado |
| Filtros visuais inconsistentes | `FilterBar` / `DashboardFilters` padronizados |
| Tabelas sem paginação padrão | `DataTableBI` com paginação integrada |

## Padrão de Página Dashboard

Toda página de dashboard deve seguir esta estrutura:

```tsx
import {
  DashboardPage, DashboardHeader,
  KpiGrid, KpiCard,
  ChartGrid, BarChartCard, DonutChartCard, RankingChartCard,
  FilterBar, SelectFilter, SearchFilter,
  DataTableBI, StatusBadge,
} from '@/components/bi';

export default function MinhaPagina() {
  // ... lógica de fetch, filtros, paginação (mantenha como está)

  return (
    <DashboardPage>
      <DashboardHeader title="Minha Página" description="..." actions={<ExportButton />} />

      <FilterBar>
        <SelectFilter label="Tipo" value={tipo} onChange={setTipo} options={...} />
        <SearchFilter value={busca} onChange={setBusca} />
      </FilterBar>

      {/* KPIs SEMPRE do dashboard global, NÃO da página atual da tabela */}
      <KpiGrid cols={4}>
        <KpiCard title="Total" value={dashboard?.kpis.total} format="currency" loading={loading} />
        <KpiCard title="Recebido" value={dashboard?.kpis.recebido} format="currency" variant="success" />
        <KpiCard title="Pendente" value={dashboard?.kpis.pendente} format="currency" variant="warning" />
        <KpiCard title="% Recebido" value={dashboard?.kpis.percentual} format="percent" />
      </KpiGrid>

      <ChartGrid>
        <BarChartCard title="Mensal" data={dashboard?.mensal ?? []} loading={loading} />
        <DonutChartCard title="Categorias" data={dashboard?.categorias ?? []} loading={loading} />
        <RankingChartCard title="Top 10" data={dashboard?.top ?? []} topN={10} />
      </ChartGrid>

      {/* Tabela usa endpoint paginado separado */}
      <DataTableBI
        columns={cols}
        data={dadosPaginados}
        pagination={{ pagina, totalPaginas, totalRegistros, onPageChange: setPagina }}
        loading={loadingTabela}
      />
    </DashboardPage>
  );
}
```

## Regras-Chave

### 1. KPIs vs Tabela — endpoints diferentes
- **KPIs** sempre vêm do endpoint `*-dashboard` (sem paginação, dados agregados de toda a busca)
- **Tabela** sempre vem do endpoint `*-list` (paginado)
- NUNCA calcule KPIs com `dados.reduce()` da página atual da tabela

### 2. Estados sempre presentes
Todo `*ChartCard` e `KpiCard` aceita `loading`, `error`, `isEmpty` automaticamente via `ChartCardShell`. Use:

```tsx
<BarChartCard title="..." data={data} loading={status === 'loading'} error={errorMsg} />
```

### 3. Cores e variantes
Use `variant` semântica nos KPIs:
- `info` (azul) — métrica neutra principal
- `success` (verde) — valores positivos (recebido, faturado)
- `warning` (amarelo) — atenção (pendente, em aberto)
- `danger` (vermelho) — atrasos, problemas

Para gráficos, use `BI_PALETTE` (já é default). Nunca use cores hardcoded.

### 4. Status em tabelas → `StatusBadge`
```tsx
{ key: 'status', header: 'Status', render: (_v, r) => <StatusBadge status={r.status as BiStatus} /> }
```

Variantes prontas: `recebido`, `pendente`, `parcial`, `cancelado`, `atraso`, `sem-nf`, `com-nf`, `sem-oc`, `com-oc`, `positivo`, `negativo`, `neutro`.

## Hook `useDashboardData`

Encapsula o padrão "fetch dashboard + fetch tabela paginada":

```tsx
import { useDashboardData } from '@/hooks/useDashboardData';

const {
  dashboard, loading, error,
  dados, pagina, setPagina, totalPaginas, totalRegistros, loadingDados,
  search, refresh,
} = useDashboardData({
  dashboardEndpoint: '/api/painel-compras-dashboard',
  listEndpoint: '/api/painel-compras-list',
  filtros: { dataInicio, dataFim, tipo },
  pageSize: 50,
});
```

Reduz ~60 linhas de boilerplate por página.

## Template Pronto

Copie de `src/components/bi/templates/PaginaDashboardTemplate.tsx` como ponto de partida.

Para um exemplo completo composto, veja `ComprasDashboardTemplate.tsx` (renderizado em `/biblioteca-bi`).

## Quando usar cada componente

| Quero mostrar... | Use |
|---|---|
| Métrica única destacada | `KpiCard` |
| KPI com tendência (mini-gráfico) | `KpiSparklineCard` |
| KPI com meta a atingir | `KpiTargetCard` |
| Comparação atual vs anterior | `KpiComparisonCard` |
| Série temporal | `LineChartCard` ou `AreaChartCard` |
| Comparação por categoria | `BarChartCard` |
| Composição (% do todo) | `DonutChartCard` ou `PieChartCard` |
| Top N | `RankingChartCard` |
| Empilhado (recebido x pendente) | `StackedBarChartCard` |
| Barras + linha (compras x recebido) | `ComboChartCard` |
| Hierarquia por área | `TreemapChartCard` |
| Distribuição geográfica BR | `BrazilMapCard` |
| Funil (cotação→pedido→recebido) | `FunnelChartCard` |
| Variação de saldo | `WaterfallChartCard` |
| Avaliação multi-dimensão | `RadarChartCard` |
| Heatmap dia × hora | `HeatmapChartCard` |
| Atividade diária (estilo GitHub) | `CalendarHeatmapCard` |
| Hierarquia colapsável | `DrillDownTable` ou `TreeView` |
| Tabela com paginação | `DataTableBI` |
| Histórico cronológico | `Timeline` |

## Assistente IA

Não tem certeza de quais componentes usar? Acesse `/biblioteca-bi` e use o **Assistente de Composição** no topo da página: descreva o módulo e a IA recomenda componentes + entrega um esqueleto JSX pronto.

## Páginas migradas (referência de antes/depois)

- `src/pages/producao/ProducaoDashboardPage.tsx` — migração piloto (Fase 1)
- (próximas migrações serão listadas aqui)

## Princípios da migração

1. **Nunca toque** na lógica de fetch / cálculo de KPIs já existente
2. **Nunca** edite `src/integrations/supabase/{client,types}.ts` ou `.env`
3. Use **apenas tokens semânticos** — `hsl(var(--primary))`, nunca `#3b82f6`
4. Preserve comportamentos: export, contexto IA, drill-down, paginação
5. KPIs do dashboard, dados da tabela paginada — separados sempre
