## Plano

Criar uma nova página de dashboard visual em **`/producao/carga/dashboard`** alimentada pela API real (`GET /api/producao/carga/centros`). A página convive com `/producao/carga` (que segue com as abas operacionais).

### O que a API real fornece (já validado)

`GET /api/producao/carga/centros` retorna:
- `resumo`: `qtd_ops`, `qtd_recursos`, `qtd_unidades`, `qtd_linhas_operacao`, `qtd_prevista`, `carga_prevista_min`, `carga_prevista_horas`, `linhas_sem_mapeamento_supabase`
- `dados[]`: linha por `codcre`+`codopr` com `unidade_negocio`, `tipo_recurso`, `codccu`, `descre`, `desopr`, `qtd_ops`, `qtd_prevista`, `carga_prevista_min`, `carga_prevista_horas`

Não vem: capacidade disponível, ocupação %, variação vs mês anterior, situação da OP, distribuição por dia da semana, lista de obras.

### O que será construído com dados reais

1. **KPIs (cards do topo)** — usando `resumo`:
   - OPs (`qtd_ops`)
   - Recursos (`qtd_recursos`)
   - Linhas de operação (`qtd_linhas_operacao`)
   - Carga prevista min / horas
   - Sem mapeamento (`linhas_sem_mapeamento_supabase`) com destaque âmbar quando > 0

2. **Top recursos por carga (h)** — bar chart horizontal a partir de `dados[]` agregado por `codcre` (top 10).

3. **Carga × Qtd OPs por recurso** — bar chart agrupado (carga em minutos vs qtd_ops).

4. **Distribuição por Unidade de Negócio** — donut a partir de `dados[]` agregado por `unidade_negocio` (somando `carga_prevista_min`).

5. **Distribuição por Tipo de Recurso** — donut por `tipo_recurso` (PRODUCAO/TERCEIROS/etc.).

6. **Tabela Centros Mais Demandados** — top recursos com colunas Unidade, Tipo, CCusto, Recurso, Descrição, Qtd OPs, Carga (min), Carga (h). Linha de Total Geral.

7. **Painel de Insights (lateral direita, fixo)** — gerado automaticamente a partir dos dados:
   - Recurso com maior carga
   - Unidade que concentra a maior carga
   - Aviso quando `linhas_sem_mapeamento_supabase > 0`
   - Lista de recursos com `qtd_ops > média + desvio`

### O que ficará marcado como placeholder

Para não inventar números, esses blocos do mockup ficam com badge "dados de exemplo" e nota explicativa visível:

- **Capacidade Disponível / Ocupação Média / Centros Críticos / Obras em Produção** — cards com placeholder e badge "—" (sem inventar).
- **Mapa de Gargalos (Seg-Sáb)** — heatmap renderizado com mock, com banner "Aguardando endpoint /api/producao/carga/ocupacao-semanal".
- **Donut Fila de OPs por Situação** — mock com banner pedindo endpoint.
- **Variações "vs mês anterior"** nos KPIs — só mostradas se a API retornar comparativo (omitidas por enquanto).

### Filtros

A barra de filtros reusa o `CargaFiltersBar` existente (Período, Unidade, Tipo, Centro, Operação, Origem, Considera carga) — já cobre o que o mockup pede (e mais). O filtro alimenta `useCargaCentros`, então KPIs e gráficos atualizam juntos.

### Arquivos

1. **`src/pages/producao/CargaDashboardPage.tsx`** (novo) — layout do dashboard usando `useCargaCentros`.
2. **`src/components/producao/carga-dashboard/`** (nova pasta):
   - `KpiCard.tsx` — card KPI grande com ícone + valor + (opcional) variação.
   - `TopRecursosChart.tsx` — bar horizontal (Recharts) colorido por faixa de carga.
   - `CargaPorUnidadeDonut.tsx` — donut por unidade.
   - `CargaPorTipoDonut.tsx` — donut por tipo de recurso.
   - `CargaQtdOpsChart.tsx` — comparativo barras agrupadas.
   - `CentrosDemandadosTable.tsx` — tabela top centros.
   - `InsightsPanel.tsx` — insights derivados.
   - `HeatmapMock.tsx` — heatmap visual mockado com banner.
   - `FilaSituacaoMock.tsx` — donut mockado com banner.
3. **`src/App.tsx`** — registrar rota `/producao/carga/dashboard` (lazy import).
4. **`src/components/AppSidebar.tsx`** — adicionar item "Carga (Dashboard)" abaixo de "Carga de Produção".
5. **`src/lib/screenCatalog.ts`** — registrar a tela para permissões.
6. **`docs/backend-carga-dashboard.md`** (novo) — pedido ao backend dos campos faltantes (capacidade, ocupação, comparativo mês anterior, ocupação por dia da semana, situação OP, lista de obras).

### Design / UX

- Tokens semânticos do design system (`bg-card`, `text-primary`, `border`, `bg-muted`). Sem cores hardcoded.
- Grid responsivo: KPIs 2-cols mobile / 6-cols desktop. Gráficos 1-col mobile / 2-cols tablet / 3+1 layout desktop (com Insights coluna lateral em xl+).
- Cards com `rounded-2xl`, `shadow-sm`, `border`.
- Faixas de carga (não ocupação, porque não temos capacidade): destaque visual por quartil da própria amostra, com legenda.

### Fora de escopo

- Não alterar `/producao/carga` (operacional segue intacto).
- Não criar sidebar interna (segue a `AppSidebar` global).
- Não criar tabela no Cloud nem ETL — todos os dados vêm direto da API FastAPI já em uso pelo módulo.
- Não tocar nas tabelas `bi_*`.
- Não inventar números reais que a API não fornece.
