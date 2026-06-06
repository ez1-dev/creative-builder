## Objetivo

Padronizar globalmente no BI Comercial (1) a forma de exibir o **nome (label)** em todo componente visual e (2) o **drill** (clique → POST `/api/bi/comercial/drill`) em KPIs, cards, gráficos, tabelas, rankings e listas — incluindo os widgets gerados pela Biblioteca BI / IA. Resolver causa raiz, não tela por tela.

---

## 1. Camada global de label — `pickComercialLabel`

Arquivo: `src/lib/bi/comercialSeriesBuilder.ts`

- Adicionar helper exportado:
  ```ts
  export const COMERCIAL_LABEL_FALLBACK_KEYS = [
    'display_label','label',
    'cliente_label','revenda_label','produto_label','estado_label','obra_label','nf_label',
    'nome','name','descricao',
    'nm_revenda','ds_revenda','nm_cliente','ds_cliente','nm_fantasia',
    'nm_estado','sg_uf','uf',
    'ds_produto','descricao_produto',
    'cd_rev_pedido','cd_cliente','cd_produto','cd_estado','cd_nf','cd_prj',
  ];
  export const pickComercialLabel = (row, extra=[]) =>
    pickLabel(row, [...extra, ...COMERCIAL_LABEL_FALLBACK_KEYS], '(sem nome)');
  ```
- Atualizar `REVENDA_LABEL_KEYS` para incluir `label`, `ds_revenda` e `revenda_label` no topo, e `LABEL_CANDIDATES` (CLIENTE/PRODUTO/ESTADO/NF) para incluir `label` e `display_label` no topo. Assim toda série derivada do drill (`por_revenda__*`, `por_cliente__*`, etc.) já vem com nome.
- Não usar mais `'(sem nome)'` como filtro técnico em lugar nenhum.

## 2. Camada global de drill — `comercialDrillContract.ts` (novo)

Arquivo novo: `src/lib/bi/comercialDrillContract.ts`

- `DRILL_KEY_FROM_TYPE: Record<DrillType, keyof DrillContexto>` mapeando a coluna técnica esperada por tipo:
  - MENSAL→`anomes_emissao`, ESTADO→`cd_estado`, CLIENTE→`cd_cliente`, REVENDA→`cd_rev_pedido`, PRODUTO→`cd_produto`, NOTA_FISCAL→`cd_nf`, OBRAS→`cd_prj`.
- `extractDrillCtx(row, drillType)`: se `row.filtros_drill` existir, devolve-o tal qual (depois de limpar vazios); senão monta `{ [DRILL_KEY_FROM_TYPE[drillType]]: row[<código técnico>] ?? row.label }` ignorando `'(sem nome)'`.
- `KPI_DRILL_MAP`: faturamento/fat_liquido/devolucao/numero_vendas→`NOTA_FISCAL`; impostos→`DETALHES_IMPOSTOS`; numero_clientes→`CLIENTE`; numero_estados→`ESTADO`; quantidade→`PRODUTO`. (devolução: adicionar `categoria_custom: 'devolucao'` se backend já suporta, senão só NOTA_FISCAL).
- `DRILL_LABELS` (já existe em `comercialFilters.ts`) — incluir `OBRAS: 'Obras'` no menu Trocar drill.

## 3. ComercialPage.tsx — usar contratos globais

- `revendaRank`, `estadosSerie`, `mapaData`, `donutMix`, `obrasRank` passam a propagar a chave técnica:
  ```ts
  revendaRank = revendaRows.map(r => ({
    label: pickComercialLabel(r),
    cd_rev_pedido: r.cd_rev_pedido ?? null,
    valor: n(r.faturamento),
  }));
  ```
  análogo para cliente (`cd_cliente`), estado (`cd_estado`/`sg_uf`), produto (`cd_produto`), obra (`cd_prj`).
- Reescrever todos os `onClickXxx` para usar `extractDrillCtx(row, tipo)` + `buildCtxFromFilters()` (preservar contexto acumulado). Nunca passar `(sem nome)` como filtro.
- `renderKpi`: substituir mapeamento ad-hoc por `KPI_DRILL_MAP[kpiKey]`; sempre passa `Clickable` com `title="Clique para detalhar"`. Impostos → DETALHES_IMPOSTOS já com `buildCtxFromFilters()`.
- `resumo-faturamento` e `gauge-atingimento`: abrem `NOTA_FISCAL` em vez de `ACUMULADO`.

## 4. Drill em widgets da Biblioteca BI / IA

Arquivo: `src/lib/bi/componentRegistry.tsx` + `src/components/bi/runtime/ComercialDashboardGrid.tsx`

- Estender `ComponentRenderCtx` com `onDrill?: (drillType, ctx) => void` e `drillType?` por componente. O renderer da página injeta `onDrill = openDrill` e usa `extractDrillCtx`.
- Em cada renderer de gráfico/tabela/ranking do registry, passar `onItemClick={(d) => ctx.onDrill?.(resolveDrillType(d, fallback), extractDrillCtx(d, fallback))}`. Resolução de fallback vem das `options.drillType` configuradas no widget; se ausente, deduz pela dimensão da série (mapa `dim→DrillType` que já existe em `dimToDrillType`).
- `ConfigureBiWidgetDialog.tsx`: adicionar select "Drill ao clicar" com os 9 valores oficiais + "(auto pela dimensão)". Persistir em `options.drillType`.

## 5. Componentes visuais base — aceitar `onItemClick` uniforme

Verificação/ajuste mínimo em `src/components/bi/charts/*` e `tables/*`:

- `KpiCard` já aceita `onClick`. Garantir que `KpiSparklineCard`, `KpiTargetCard`, `KpiVariationCard`, `KpiTriStackCard`, `GaugeAchievementCard` também aceitem e propaguem `onClick` + `title`/`tooltip`. (envoltório `<Clickable>` continua válido).
- `BarChartCard`, `HorizontalBarChartCard`, `LineChartCard`, `AreaChartCard`, `DonutChartCard`, `PieChartCard`, `ComboChartCard`, `TreemapChartCard`, `BrazilMapCard`, `RankingChartCard`, `RankingTable`, `DataTableBI`, `MultiSeriesChartCard`: todos já têm `onItemClick`/`onRowClick`. Onde o ponto da série não expõe os campos técnicos (ex.: Recharts Line/Area), adicionar `onClick` no `Line`/`Area` que devolve o `payload` completo (não só `label`).
- Em `RankingTable` adicionar coluna/botão "Detalhar" quando `onItemClick` estiver definido (acessibilidade + clique linha).

## 6. Preservação de contexto acumulado

`useComercialDrillStack.pushDrill` já preserva contexto via `mergeCtx({ keepAll: true })`. Garantir que **toda** chamada externa de drill use `openDrill`/`pushDrill` com `extractDrillCtx(row, type)` (que retorna apenas as chaves novas), e nunca substitua o contexto. Adicionar testes leves em `comercialDrillCatalog` se já houver suíte.

## 7. CSV de drill

`downloadDrillCsv` em `comercialDrillApi.ts`: ao serializar, se existir coluna técnica + label correspondente (`cd_cliente`/`cliente_label`), exportar ambas (label primeiro, código entre parênteses no header). Sem mudanças no backend.

---

## Critérios de aceite

- Ranking de revendas exibe `PAULO CESAR`, `TRADICAO MAQUINAS`, `AGROTEC NUNES`, `ARESI`, `CLIENTE FINAL`, `OUTROS` — nunca `(sem nome)` se houver label ou código.
- Clique em qualquer KPI (inclusive Impostos), card, barra, linha, fatia, treemap, mapa, linha de tabela ou item de ranking abre o drawer de drill com o `drill_type` correto.
- `cd_rev_pedido`, `cd_cliente`, `cd_estado`, `cd_produto`, `cd_nf`, `cd_prj` são enviados como código técnico, nunca como `(sem nome)` ou label visual.
- Contexto acumulado é preservado entre níveis em todos os caminhos.
- Menu "Trocar drill" inclui ACUMULADO, MENSAL, ESTADO, CLIENTE, REVENDA, PRODUTO, NOTA_FISCAL, DETALHES_IMPOSTOS, OBRAS com rótulos amigáveis.
- Vale para GENIUS, ESTRUTURAL ZORTEA e CONSOLIDADO.
- Widgets da Biblioteca BI / IA respeitam o mesmo contrato via `options.drillType` + `onDrill`.

## Fora de escopo

- Backend FastAPI (RPC, payload, suporte a `somente_devolucao`/`categoria_custom`).
- Páginas BI que não sejam `/bi/comercial`.
- Mudanças visuais (cores, layout, animações), além do botão "Detalhar" no `RankingTable`.
- Configurador visual (já unificado em iteração anterior).
