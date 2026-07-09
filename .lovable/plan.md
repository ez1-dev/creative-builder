## Dashboard Geral — Página Executiva Consolidada

### Situação atual
A rota `/` (item **Dashboard Geral** do menu) hoje só faz redirect para a primeira tela permitida do usuário (`PostLoginRedirect`). Não existe um painel executivo real — vamos criar um em **`/dashboard-geral`** e apontar o menu para lá, mantendo o redirect da raiz para retrocompatibilidade.

### Objetivo
Painel único, ao entrar no ERP, que consolida o "pulso da empresa" cruzando os módulos já existentes (Comercial, Compras, Financeiro, Produção e RH), com KPIs, tendências, breakdowns e insights de IA.

### Escopo do conteúdo

**1. Cabeçalho / filtros globais**
- Período (mês atual, mês anterior, YTD, últimos 12 meses, customizado).
- Filial (multi-seleção, mesmas opções já usadas em Comercial/Compras).
- Botão "Atualizar" (invalida caches) e link "Personalizar" (abre `AddRhBiWidgetDialog` reutilizado para dashboard-geral).

**2. Faixa de KPIs consolidados (12 cards, 4 colunas × 3 linhas)**

```text
[ Faturamento mês ]  [ Δ vs mês anterior ]  [ Meta atingida % ]  [ Ticket médio ]
[ Compras mês ]      [ Recebimentos mês ]   [ Contas a pagar ]   [ Contas a receber ]
[ OPs em aberto ]    [ Carga prevista (h) ] [ Headcount ativo ]  [ Turnover 12m % ]
```
Cada card usa o `KpiCard` da Biblioteca BI, com tendência (sparkline) dos últimos 6 meses.

**3. Gráficos de tendência (grid 2 col)**
- **Faturamento vs Meta (últimos 12 meses)** — linha dupla (bi_faturamento + bi_meta_faturamento).
- **Compras vs Recebimentos (12 meses)** — barras agrupadas.
- **Produção — carga prevista por semana (próximas 8)** — barras (bi_ops_fila).
- **Headcount evolução (12 meses)** — linha (endpoint rh/quadro-colaboradores histórico).

**4. Breakdown por dimensão (grid 3 col)**
- **Faturamento por revenda** (Top 8, barras horizontais).
- **Compras por classificação** (donut).
- **Absenteísmo por setor** (barras horizontais).

**5. Alertas & Insights (IA)**
Painel lateral (ou faixa inferior) com:
- Chamada à edge function `rh-ai-insights` (já existe) + nova função `dashboard-geral-insights` que resume KPIs de todos os módulos.
- Bullets priorizados (crítico/atenção/ok) com link direto para o módulo detalhado.
- Modelo: `google/gemini-2.5-flash` via Lovable AI Gateway (rápido e barato para resumo diário).

### Arquitetura técnica

**Novos arquivos**
- `src/pages/DashboardGeralPage.tsx` — página principal, usa `PageDataProvider` + `UserWidgetsSlot`.
- `src/hooks/useDashboardGeral.ts` — orquestra chamadas paralelas aos dashboards já existentes (faturamento-genius, painel-compras, notas-recebimento, rh-resumo-folha, rh-quadro-colaboradores, rh-turnover, rh-absenteismo, contas-pagar/receber, carga) e monta objeto consolidado `{ kpis, series, breakdowns }`.
- `src/lib/dashboardGeral/aggregator.ts` — normalização e cálculo de deltas/tendências.
- `src/lib/dashboardGeral/widgetCatalog.ts` — catálogo de widgets fixos + libraryComponentIds para permitir personalização.
- `supabase/functions/dashboard-geral-insights/index.ts` — edge function que recebe os KPIs consolidados e devolve insights priorizados.

**Alterações**
- `src/App.tsx` — adiciona `<Route path="/dashboard-geral" element={<ProtectedRoute path="/dashboard-geral"><DashboardGeralPage /></ProtectedRoute>} />`.
- `src/components/AppSidebar.tsx` — item "Dashboard Geral" passa a apontar para `/dashboard-geral` (mantém "/" como fallback de redirect).
- `src/lib/screenCatalog.ts` — registra a nova tela (para permissões).
- `PostLoginRedirect` — se o usuário tem acesso a `/dashboard-geral`, prioriza essa rota como destino padrão.

**Padrões reutilizados**
- Design system existente (tokens semânticos, sem cores hardcoded).
- Biblioteca BI (`@/components/bi`), `useDashboardData`, `ChartCard`, `KpiCard`.
- `PageDataProvider` para permitir que o usuário adicione widgets extras da Biblioteca BI ao Dashboard Geral (persistidos em `bi_user_widgets` com `pageKey='dashboard-geral'`).

**Cache**
- Cada bloco reaproveita seu próprio cache do TanStack Query já existente (chamadas paralelas, sem duplicação).
- Camada `dashboard_cache` do Cloud usada apenas pelo bloco de IA (chave `dashboard-geral:insights:{yyyymm}`, expira em 6h).

### Validação
1. `tsgo` limpo.
2. Playwright: login com usuário admin, navegar `/dashboard-geral`, screenshot da página completa, conferir que os 12 KPIs renderizam com valores (não zeros/skeletons), tendências aparecem, insights de IA chegam.
3. Verificar que usuário sem permissão em nenhum módulo cai no `NoAccessScreen` (não trava carregando).

### Entrega em etapas
1. Estrutura da página + rota + KPIs consolidados (sem IA).
2. Gráficos de tendência + breakdowns.
3. Edge function de insights + painel de alertas.
4. Personalização via Biblioteca BI + polimento visual.
