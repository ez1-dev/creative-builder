# Aplicar Biblioteca BI nas páginas existentes

## Objetivo
Migrar páginas-chave do ERP para usar os componentes padronizados da `@/components/bi`, eliminando duplicação visual, ganhando consistência (cores, estados de loading/erro/vazio, drill-down, filtros) e facilitando manutenção. Criar também um **guia de uso** (referência rápida) e padrão de migração reutilizável.

---

## Fase 1 — Páginas piloto (alto impacto, dashboards puros)

Migrar 3 páginas representativas que já são dashboards e são as mais visíveis:

### 1.1 `/painel-compras` (`PainelComprasPage.tsx`)
- KPIs gerenciais → `KpiGrid` + `KpiCard` (variants info/success/warning/danger) + `KpiSparklineCard` para os 4 principais
- Cards de "maior fornecedor", "maior atraso" → `KpiStatusCard`
- Gráfico Top fornecedores → `RankingChartCard`
- Top famílias / origens → `HorizontalBarChartCard`
- Distribuição por tipo de item → `DonutChartCard`
- Drill-down atual → `DrillDownTable` da lib
- Tabela paginada → `DataTableBI`
- Filtros → `FilterBar` + `DateRangeFilter` + `MultiSelectFilter` + `SearchFilter`
- Estados → `LoadingState`, `ErrorState`, `NoDataState` em todos os cards (via `ChartCardShell`)
- **NÃO mexer** na lógica de fetch / kpis recém-corrigida — só na camada visual

### 1.2 `/notas-recebimento`
- Mesma abordagem: KPIs (`KpiCard` + `KpiSparklineCard`), gráficos (Combo, Donut, Ranking), `DataTableBI`
- Adicionar `BrazilMapCard` se houver dado de UF do fornecedor (verificar)
- Status NFs → `StatusBadge` (`recebido`, `pendente`, `cancelado`, `com-oc`, `sem-oc`)

### 1.3 `/producao/dashboard` (`ProducaoDashboardPage.tsx`)
- Cargas por período → `BarChartCard` ou `ComboChartCard`
- Status dos projetos → `DonutChartCard` ou `StackedBarChartCard`
- Top saldo pátio → `RankingChartCard`
- KPIs → `KpiGrid`
- Adicionar `KpiTargetCard` para meta semanal (já existe meta no módulo)

---

## Fase 2 — Páginas tabulares (DataTableBI + filtros padrão)

Migrações menores, mais mecânicas — substituem `DataTable` legacy por `DataTableBI`:

- `/contas-pagar` — KPIs no topo (`KpiGrid`), `FilterBar`, `DataTableBI`, `StatusBadge` para situação
- `/contas-receber` — idem
- `/estoque` — `KpiCard` (saldo total / valor total / SKUs ativos), `DataTableBI`, `KpiTargetCard` para "% cobertura min/max"
- `/compras-produto` — `RankingChartCard` top produtos + `DataTableBI`

---

## Fase 3 — Guia + padronização

### 3.1 Documentação
Criar `docs/biblioteca-bi-guia-uso.md` com:
- Visão geral dos componentes
- Padrão de página dashboard (template em código)
- Exemplos de "antes/depois" das migrações da Fase 1
- Quando usar cada componente
- Como conectar dados de endpoint paginado (KPIs do dashboard, dados da tabela)

### 3.2 Hook utilitário
Criar `src/hooks/useDashboardData.ts` — hook genérico que encapsula o padrão repetido em todas as páginas:
- Recebe URL do endpoint dashboard + URL do endpoint list paginado
- Retorna `{ kpis, charts, dadosPaginados, loading, error, refresh, filtros }`
- Já conhece o padrão "kpis sempre globais, dados sempre paginados"
- Reduz boilerplate em ~50% nas próximas migrações

### 3.3 Template de página
Criar `src/components/bi/templates/PaginaDashboardTemplate.tsx` — esqueleto comentado de uma página padrão que dev pode copiar como ponto de partida.

---

## Fase 4 — Backlog (ficam catalogadas, não implementadas agora)

Páginas que farão sentido migrar depois (Fase 5+, a combinar):
- `/passagens-aereas` — já tem dashboard próprio bem desenhado, migração de baixa prioridade
- `/faturamento-genius` — tem auditoria complexa, requer análise dedicada
- `/engenharia-producao`
- `/sugestao-min-max`
- `/demonstrativo-compras-recebimentos`

---

## Ordem de execução desta entrega

1. Criar `docs/biblioteca-bi-guia-uso.md` com padrão de uso
2. Criar `useDashboardData` hook
3. Criar `PaginaDashboardTemplate.tsx` na lib
4. Migrar `PainelComprasPage` (mantendo lógica intacta, só camada visual)
5. Migrar `NotasRecebimentoPage`
6. Migrar `ProducaoDashboardPage`
7. Em cada migração: rodar visualmente no preview e ajustar

## Princípios da migração
- **Não tocar** em lógica de fetch, filtros aplicados ao backend, ou cálculos de KPIs corrigidos recentemente
- **Não tocar** em arquivos auto-gerados (`supabase/client.ts`, `types.ts`, `.env`)
- Preservar comportamentos existentes (export, IA chat context, drill, paginação)
- Usar **apenas tokens semânticos** do design system — sem cores hardcoded
- Cada PR de migração mantém testes existentes passando

## Fora do escopo
- Refatorar lógica de negócio
- Mudar contratos de endpoint
- Mexer em telas de configuração / admin
- Migrar todas as páginas do ERP de uma vez (seria entrega muito grande)
