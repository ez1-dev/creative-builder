# Dashboard Geral — expansão multi-módulo

Transformar `/dashboard-geral` numa central executiva com **aba "Visão geral" + 1 aba por módulo**, mantendo o seletor de período atual (Mês/Anterior/YTD/12m) e reutilizando os hooks/APIs de cada página.

## Layout

```text
[Header: título + tabs período + Atualizar]
[Tabs de módulo]
 ├─ Visão geral   (KPIs headline + 1 gráfico por módulo, insights IA)
 ├─ Comercial
 ├─ Compras
 ├─ Financeiro
 ├─ Contabilidade
 ├─ RH
 ├─ Produção
 ├─ Estoque
 └─ Manutenção
```

Cada aba é lazy (só busca dados quando ativada). Cards de KPI clicáveis levam à página completa do módulo (ex.: `/bi/comercial`, `/painel-compras`, `/contabilidade/dre-studio/...`).

## Conteúdo por aba

**Visão geral** (o que já existe hoje, enxugado):
- KPIs headline: Faturamento, Δ Faturamento, Meta %, Compras, Pendente OC, Headcount, Turnover, Resultado DRE, Ativo Total.
- 1 gráfico "signature" por módulo (linha faturamento, barras compras, linha headcount, DRE waterfall mini).
- Painel de Insights IA (já existe).

**Comercial** — hook: `useDashboardGeral` já traz `faturamento`; adicionar reuso de `/api/faturamento-genius-dashboard`:
- KPIs: Faturamento, Meta %, Ticket médio, Qtd notas, Desconto %, Δ vs mês anterior.
- Gráficos: linha Faturamento vs Meta 12m, top revendas, top produtos, mix por UF.

**Compras** — `/api/painel-compras-dashboard`:
- KPIs: Valor comprado, Pendente OC, Total OCs, Fornecedores, Lead time médio.
- Gráficos: barras compras 12m, donut por tipo de despesa, top fornecedores, situação das OCs.

**Financeiro** — `fetchDreRealizadoResumo` (bi/dreConfiguravelApi) + endpoints contas a pagar/receber já usados nas páginas:
- KPIs: Receita, Custos, Despesas, Resultado DRE, Margem %, A receber, A pagar, Inadimplência.
- Gráficos: linha Receita vs Resultado 12m, barras contas a pagar por vencimento, top devedores.

**Contabilidade** — reuso `dreMatrizApi` + `contabilApi` (Balanço):
- KPIs: Ativo, Passivo, PL, Resultado do exercício.
- Mini-tabela DRE (nível 1) + Mini-tabela Balanço (grandes grupos) — clique abre página completa.

**RH** — hooks já usados no `useDashboardGeral`:
- KPIs: Headcount ativo, Admissões, Demissões, Turnover, Absenteísmo, Custo folha.
- Gráficos: linha headcount, barras turnover mensal, motivos de absenteísmo, distribuição por setor.

**Produção** — `cargaApi` + endpoints ProducaoDashboardPage:
- KPIs: OPs abertas, OPs atrasadas, Carga (h) semana atual, Lead time médio, % OPs no prazo.
- Gráficos: barras carga por centro/recurso, linha produção 12m.

**Estoque** — endpoints usados em EstoquePage/EstoqueMinMaxPage:
- KPIs: Valor estocado, Itens abaixo do mínimo, Itens acima do máximo, Giro médio.
- Tabela top rupturas + gráfico valor por depósito.

**Manutenção/Frota** — endpoints usados em ManutencaoFrotaPage/MaquinasPage:
- KPIs: OS abertas, OS atrasadas, MTBF, Custo manutenção período.
- Gráficos: OS por status, custo por veículo/máquina.

## Arquitetura

- **Hook orquestrador por aba**: cada módulo ganha um hook próprio (`useDashboardGeralComercial`, `useDashboardGeralCompras`, `useDashboardGeralFinanceiro`, `useDashboardGeralContabilidade`, `useDashboardGeralProducao`, `useDashboardGeralEstoque`, `useDashboardGeralManutencao`). O `useDashboardGeral` atual vira o hook da aba "Visão geral" + RH.
- Cada hook usa `useQueries` com `enabled: aba === 'x'` para lazy-fetch, `retry: 0`, `staleTime: 5min`.
- Reaproveita adaptadores em `src/lib/dashboardGeral/aggregator.ts` (`num`, `delta`, `labelAnomes`).
- Componentes reaproveitam biblioteca BI (`KpiCard`, `LineChartCard`, `BarChartCard`, `HorizontalBarChartCard`, `DonutChartCard`).

## Arquivos

Criar:
- `src/hooks/dashboardGeral/useComercial.ts`
- `src/hooks/dashboardGeral/useCompras.ts`
- `src/hooks/dashboardGeral/useFinanceiro.ts`
- `src/hooks/dashboardGeral/useContabilidade.ts`
- `src/hooks/dashboardGeral/useProducao.ts`
- `src/hooks/dashboardGeral/useEstoque.ts`
- `src/hooks/dashboardGeral/useManutencao.ts`
- `src/pages/dashboard-geral/tabs/` (`VisaoGeralTab.tsx`, `ComercialTab.tsx`, `ComprasTab.tsx`, `FinanceiroTab.tsx`, `ContabilidadeTab.tsx`, `RhTab.tsx`, `ProducaoTab.tsx`, `EstoqueTab.tsx`, `ManutencaoTab.tsx`)

Editar:
- `src/pages/DashboardGeralPage.tsx` — introduz `Tabs` de módulo, mantém seletor de período no header. Cada `TabsContent` monta o componente correspondente (lazy via `React.lazy` + `Suspense` com skeletons).
- `src/hooks/useDashboardGeral.ts` — refatorar para expor só o mínimo da visão geral (mantém compatibilidade com insights IA).

## Fora do escopo

- Sem novo endpoint agregador no FastAPI (usa hooks/APIs já existentes por página).
- Sem novos filtros globais além do período atual.
- Sem alterações em cálculos de negócio de cada módulo — só orquestração/apresentação.
