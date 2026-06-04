## Enriquecer `/bi/comercial` com a Biblioteca BI

Objetivo: aproveitar mais componentes de `@/components/bi` na tela do BI Comercial e habilitar o "Aplicar componente" (widgets do usuário), sem alterar a camada de dados (continua consumindo os 6 endpoints FastAPI já integrados).

### 1. Novos componentes da biblioteca na página

Adicionar/substituir, mantendo a estética azul corporativa e tokens semânticos:

- **Filtros**
  - Trocar o bloco manual de filtros pelo `FilterBar` + `SelectFilter` (Unidade) e `DateRangeFilter` adaptado para AnoMês (mantém os inputs `anomes_ini`/`anomes_fim` se o range não couber). Botão "Aplicar" continua disparando `setFiltros`.
  - Manter o chip da unidade ativa.

- **KPIs**
  - Manter `KpiGrid` + `KpiCard` para os 13 indicadores principais.
  - Substituir o card "% Atingimento" por `KpiTargetCard` (valor = faturamento, meta = `kpis.meta`) — mostra barra de progresso e atingimento.
  - Substituir "Diferença" por `KpiVariationCard` (atual = faturamento, anterior = meta) — mostra variação absoluta e %.
  - Adicionar `KpiSparklineCard` para "Faturamento mensal" usando a série `mensal[].faturamento`, ao lado dos KPIs principais.

- **Gráficos**
  - Manter `ComboChartCard` (mensal x meta) e `DonutChartCard` (mix).
  - Trocar `FunnelChartCard` de "Top estados" por `HorizontalBarChartCard` (mais legível para ranking de UFs) e manter `BrazilMapCard` ao lado.
  - Adicionar `RankingChartCard` no bloco GENIUS (Top revendas) ao invés de `BarChartCard` simples.
  - Manter `TreemapChartCard` no bloco ESTRUTURAL (obras).

- **Tabelas**
  - Tabela mensal: manter `DataTableBI`.
  - Revendas: trocar a `DataTableBI` por `RankingTable` (com posição, valor, % do total).
  - Obras: trocar por `RankingTable` também.

- **Layout**
  - Envolver a página no `DashboardLayout` da biblioteca (padroniza espaçamentos/seções com a `/biblioteca-bi`).

Nenhuma cor hardcoded: tudo via tokens (`--primary`, `--warning`, `--muted-foreground`) já usados no `UNIDADE_STYLE`.

### 2. Habilitar "Aplicar componente" (widgets do usuário)

Seguindo o padrão usado em outras páginas BI:

- Importar `ApplyComponentButton`, `UserWidgetsSlot` e `BiAutoSlots` de `@/components/bi`.
- Definir um `pageId` estável: `"bi-comercial"`.
- Colocar `ApplyComponentButton` no header da página (ao lado de "Atualizar"), permitindo ao usuário escolher um componente do catálogo da Biblioteca BI e aplicá-lo na própria tela.
- Inserir `UserWidgetsSlot` nos pontos âncora da página (topo, após KPIs, após gráficos, rodapé) com `slotId`s distintos (`top`, `pos-kpis`, `pos-graficos`, `bottom`), para que os widgets aplicados pelo usuário renderizem nos locais certos.
- Disponibilizar o contexto de dados via `PageDataContext` (`@/lib/bi/PageDataContext`) expondo `{ kpis, mensal, mix, estados, revendas, obras, filtros }`, para os widgets aplicados poderem consumir os mesmos dados já carregados (sem refazer requests).
- Registrar a página em `src/lib/bi/pageRegistry.ts` com `id: 'bi-comercial'`, título e descrição — assim ela aparece como destino válido no fluxo de aplicação do `/biblioteca-bi`.

### Fora de escopo

- Não alterar `comercialApi.ts`, endpoints FastAPI, view `v_bi_faturamento_comercial`, rota, sidebar ou `screenCatalog`.
- Não mexer em outras páginas BI.
- Não migrar para `PaginaDashboardTemplate`/`useDashboardData` (item 3 da pergunta anterior fica de fora).

### Arquivos afetados

- Editado: `src/pages/bi/ComercialPage.tsx` (substituições de componentes, layout, slots de widgets, contexto de dados).
- Editado: `src/lib/bi/pageRegistry.ts` (registrar `bi-comercial`).
- Nenhum arquivo novo previsto; se o `PageDataProvider` exigir tipagem específica, criar `src/pages/bi/comercialPageContext.ts` apenas com os tipos.

### Critério de aceite

- Tela `/bi/comercial` mantém os mesmos números (GENIUS Jan–Jun/2026: Faturamento ≈ 1.816.792,46 etc.).
- KPIs de meta/variação e sparkline aparecem corretamente.
- Ranking de revendas/obras usa `RankingTable`.
- Botão "Aplicar componente" funciona: ao escolher um componente da biblioteca, ele é renderizado no slot escolhido e persiste para o usuário (via `useUserWidgets`, igual às demais páginas).
