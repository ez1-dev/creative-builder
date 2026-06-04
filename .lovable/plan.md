# Tornar todo o BI Comercial editável (KPIs, grids, listas, gráficos)

Hoje só os 5 blocos de gráfico são "slots" trocáveis (via `BiSlot` + `bi_user_slot_overrides`). Você quer ir muito além: editar os KPIs do topo, transformar gráficos em grids/tabelas, customizar as listas de drill-down, **e** poder **adicionar e remover blocos**.

Isso é exatamente o que `/passagens-aereas` já faz com `dashboards` + `dashboard_widgets` + `PassagensLayoutGrid` + `AddChartDialog` + `ConfigureChartDialog`. A proposta é portar esse padrão para o BI Comercial, reaproveitando ao máximo a infra existente.

## O que muda na tela

- **Cada bloco vira um widget** com posição/tamanho próprios em um grid (react-grid-layout):
  - KPIs individuais (Faturamento, Líquido, Impostos, Devolução, Nº Vendas, Nº Clientes, Nº Estados, Ticket Médio, Preço Médio, Quantidade) — cada um é um widget separado, não mais um `KpiGrid` fixo.
  - Os 5 blocos atuais de gráfico continuam, mas movem/redimensionam livremente.
  - "Tabela mensal", "Tabela de revendas", "Tabela de obras" passam a ser widgets opcionais (toda série tem variante `table`).
- **Modo edição** (toggle no header): arrastar, redimensionar, ocultar, configurar e excluir blocos.
- **Botão "Adicionar bloco"**: abre dialog com KPIs disponíveis + componentes da Biblioteca BI compatíveis (catalogados por `dataKind`).
- **Botão "Configurar" por bloco** (⚙): alterna variante built-in OU substitui pelo componente da Biblioteca BI, igual ao `BiSlot` atual, mas agora também para KPIs.
- **Botão "Restaurar layout padrão"** continua, agora afetando layout + overrides.

## Listas de drill-down (modais)

Cada escopo de drill (`todas`, `impostos`, `devolucao`, `vendas`, `clientes`, `estados`) ganha um **preset de colunas editável**:
- Selecionar quais colunas exibir, ordem e largura.
- Salvar por usuário em nova tabela `bi_user_drill_presets` (page_key + escopo).
- Botão "Restaurar colunas padrão" dentro do `DrillSheet`.

(Listas continuam sendo `DataTableBI`; não viram drag-drop, só colunas customizáveis.)

## Persistência

Reaproveitar a infra de `/passagens-aereas`:

- Nova entrada `module = 'bi-comercial'` em `dashboards` (default global) + por usuário (`owner_id`).
- `dashboard_widgets` armazena os blocos com `type`, `position`, `layout (x,y,w,h)`, `config (jsonb)`.
  - `config` carrega `componentId`, `mapping`, `options`, `customTitle`, `hidden`, `kpiKey` (qual KPI o widget mostra), `variant` (built-in).
- A tabela `bi_user_slot_overrides` (criada na rodada anterior) **é descontinuada** — substituída pelo novo modelo, mais flexível.
- Drill presets em nova tabela `bi_user_drill_presets (user_id, page_key, escopo, columns jsonb)`.

## Catálogo de blocos disponíveis

`src/lib/bi/comercialWidgetCatalog.ts` declara, por `type`:
- KPIs: `kpi-faturamento`, `kpi-liquido`, `kpi-impostos`, `kpi-devolucao`, `kpi-vendas`, `kpi-clientes`, `kpi-estados`, `kpi-ticket`, `kpi-preco-medio`, `kpi-quantidade` — cada um aceita variantes `number`, `variation`, `sparkline`, `target`.
- Séries: `serie-mensal`, `mix`, `estados`, `revendas`, `obras` — aceitam qualquer `componentId` compatível do `componentRegistry` (já existente da Biblioteca BI).
- Tabelas: `table-mensal`, `table-detalhes` (drill embutido como tabela na página).

## Detalhes técnicos

**Arquivos novos**
- `src/lib/bi/comercialWidgetCatalog.ts` — catálogo unificado (KPIs + séries + tabelas) com `dataKind`, variantes built-in e ids compatíveis da Biblioteca BI.
- `src/hooks/useComercialLayout.ts` — copia/adapta `usePassagensLayout` para `module = 'bi-comercial'`, expõe `widgets`, `saveLayout`, `resetLayout`, `deleteWidget`, `addWidget`, `isAdmin`.
- `src/hooks/useDrillPresets.ts` — CRUD do `bi_user_drill_presets`.
- `src/components/bi/runtime/ComercialLayoutGrid.tsx` — wrapper react-grid-layout (adaptado de `PassagensLayoutGrid`) que recebe `widgets` e um `renderWidget(type, config)`.
- `src/components/bi/runtime/AddBiWidgetDialog.tsx` — lista o catálogo + Biblioteca BI compatível, com preview e mapping form.
- `src/components/bi/runtime/ConfigureBiWidgetDialog.tsx` — edita variante/componentId/mapping/customTitle de um widget existente.
- `src/components/bi/drill/DrillColumnsEditor.tsx` — popover para escolher colunas/ordem do `DrillSheet` atual.

**Arquivos editados**
- `src/pages/bi/ComercialPage.tsx` — substitui `<DashboardSection>` estáticas por `<ComercialLayoutGrid widgets={widgets} renderWidget={renderWidget} editMode={editMode} />`; mantém `PageDataProvider`, filtros, chips, drill, handlers de click.
- `src/components/bi/drill/DrillSheet.tsx` — recebe `columns` + `onColumnsChange` opcional e renderiza o editor.
- `src/lib/bi/comercialSlots.ts` — **deprecado**, removido após migração (catálogo unificado o substitui).
- `src/components/bi/runtime/BiSlot.tsx` e `ReplaceSlotDialog.tsx` — **removidos** (substituídos pelos dialogs novos).

**Migrações Supabase**
1. Garantir que `dashboards`/`dashboard_widgets` aceitem `module = 'bi-comercial'` (já são genéricos, só usar). Criar RPC `upsert_bi_comercial_dashboard_default` que semeia o layout-padrão com KPIs + 5 séries + tabela mensal.
2. Criar `bi_user_drill_presets`:
   ```
   id, user_id, page_key, escopo, columns jsonb, created_at, updated_at
   unique(user_id, page_key, escopo)
   ```
   RLS: usuário lê/escreve só os seus.
3. Dropar `bi_user_slot_overrides` (substituída).

## Escopo

- ✅ KPIs, gráficos, grids e listas de drill editáveis em `/bi/comercial`.
- ✅ Adicionar/remover/redimensionar blocos.
- ✅ Persistência por usuário no Lovable Cloud.
- ✅ Restaurar layout padrão (global) e restaurar colunas padrão (drill).
- ❌ Não toca em outras páginas BI (Compras, etc.) — fica padrão para reuso depois.
- ❌ Não muda endpoints do FastAPI nem `pageRegistry`.
- ❌ Não permite criar KPIs com fórmulas novas (só escolher entre os já calculados pela API).

## Diagrama

```text
ComercialPage
├── PageHeader (+ toggle Editar + Restaurar layout + Adicionar bloco)
├── FilterBar
├── DrillChips
├── PageDataProvider
│   └── ComercialLayoutGrid (react-grid-layout, editMode)
│        ├── Widget kpi-faturamento  → KpiCard / KpiVariationCard / KpiSparklineCard
│        ├── Widget kpi-vendas       → idem
│        ├── ... outros KPIs ...
│        ├── Widget serie-mensal     → built-in ComboChart OU Library BI component
│        ├── Widget mix              → idem
│        ├── Widget estados          → BrazilMap + variantes
│        ├── Widget revendas         → ranking/treemap/tabela
│        ├── Widget obras            → idem
│        └── Widget table-mensal     → DataTableBI
└── DrillSheet (colunas editáveis + persistidas em bi_user_drill_presets)
```

## Riscos / pontos de atenção

- `react-grid-layout` já está instalado (usado em Passagens), sem nova dependência.
- KPI fica num grid livre — pode ficar "soltinho" em telas pequenas; ajustaremos `cols` por breakpoint igual Passagens.
- Drop da tabela `bi_user_slot_overrides` perde overrides que você já tenha salvo na rodada anterior (eles serão recriados no novo modelo na primeira vez que você editar).
- Tela fica significativamente maior em código; o trabalho é uma migração arquitetural, não um ajuste pontual.
