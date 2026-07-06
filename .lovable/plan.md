## Objetivo

Tornar o módulo RH (index + 8 páginas) totalmente responsivo — de smartphone (≥360 px) a desktop wide — sem alterar dados, contratos de API ou lógica de negócio. Apenas layout e presentation.

## Diagnóstico atual

- `RhPageHeader`: `flex items-center justify-between` sem wrap → título e botões de ação (Atualizar, Exportar, PDF, Sync, toolbar de layout) estouram a viewport no mobile.
- `RhFiltrosBar`: campos com largura fixa (`w-52`, `w-32`) — no mobile ficam apertados, mas `flex-wrap` já existe. Precisa larguras fluidas.
- Páginas RH: envolvidas em `container mx-auto py-6` com KPI grids hardcoded (`grid-cols-2 md:grid-cols-3 xl:grid-cols-6`, `md:grid-cols-5`, `md:grid-cols-6`) — em telas pequenas cabe, mas o padding e espaçamento não escalam. Filtros internos usam `md:grid-cols-3/6` sem fallback ergonômico.
- `RhDashboardGrid` → `PassagensLayoutGrid` usa `ResponsiveGridLayout` com `cols={12}` fixo e `breakpoints` ausentes. Em telas <768 px cada widget ocupa fração ilegível.
- Tabelas grandes (Vencimentos, Detalhe Folha, Turnover, Absenteísmo) já têm `overflow-auto`, mas o wrapper `Card` não deixa scroll horizontal aparecer sem margem negativa.
- Modais de drill (`QuadroDrillModal`, `TurnoverDrillModal`, etc.) usam larguras fixas — cortam no mobile.

## Implementação

### 1. Tokens responsivos compartilhados
Reaproveitar `src/components/bi/utils/responsive.ts` (já existente) e criar helper análogo `src/components/rh/rhResponsive.ts` com classes padrão:
- `pagePad`: `p-3 md:p-6 space-y-3 md:space-y-4`
- `kpiGrid6`: `grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 md:gap-3`
- `kpiGrid5`: `grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 md:gap-3`
- `filterGrid`: `grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 items-end`
- `tableWrap`: `overflow-x-auto -mx-3 px-3 md:mx-0 md:px-0`

### 2. `RhPageHeader`
- Trocar por `flex flex-col gap-3 md:flex-row md:items-center md:justify-between`.
- Ações: wrapper `flex flex-wrap items-center gap-2` (evita overflow horizontal).
- Título: `text-xl md:text-2xl`.

### 3. `RhFiltrosBar`
- `CardContent`: `pt-4 grid grid-cols-1 sm:grid-cols-2 md:flex md:flex-wrap items-end gap-3`.
- Selects/inputs: `w-full md:w-52` (`md:w-32` para codemp).
- Slot `extras` idem — instruir consumidores a usar `w-full md:w-auto` nos filtros extras.

### 4. Páginas RH — trocar wrappers
Nas 8 páginas (`RhIndexPage`, `ResumoFolhaPage`, `QuadroColaboradoresPage`, `ContratoExperienciaPage`, `ProgramacaoFeriasPage`, `TurnoverPage`, `AbsenteismoPage`, `FormulariosPage`, `RelatorioGerencialPage`):
- `container mx-auto py-6` → `container mx-auto px-3 md:px-6 py-4 md:py-6 space-y-3 md:space-y-4`.
- KPI grids hardcoded → usar helpers do passo 1.
- Filtros locais (`grid-cols-1 md:grid-cols-6` etc.) → usar `filterGrid`.
- Tabelas: envolver com `tableWrap`.
- Cards de "Detalhe/Sumário": trocar `grid grid-cols-1 lg:grid-cols-2 gap-3` por `grid grid-cols-1 xl:grid-cols-2 gap-3` (empilha em tablet).

### 5. Grid drag-and-drop mobile (`PassagensLayoutGrid`)
No `ResponsiveGrid`:
- Adicionar `breakpoints={{ lg: 1024, md: 768, sm: 480, xs: 0 }}`.
- Adicionar `cols={{ lg: 12, md: 12, sm: 6, xs: 2 }}`.
- Passar `layouts` derivado do `layout` atual (idêntico em lg/md; em sm/xs cada widget vira full-width empilhado).
- Em `xs`/`sm` forçar `isDraggable={false} isResizable={false}` (evita gestos conflitantes com scroll no toque). Manter edição só em md+.
- Ajustar `rowHeight`/`margin` para valores menores em mobile.

### 6. Modais RH (drill/config)
`QuadroDrillModal`, `TurnoverDrillModal`, `TurnoverEmpresaDrillModal`, `AbsenteismoDrillModal`, `ProgramacaoFeriasDrillModal`, `ConfigureRhWidgetDialog`, `AddRhBiWidgetDialog`, `FormularioDialog`, `SincronizarRhDialog`, `AiInsightsPanel`:
- `DialogContent`: `max-w-[95vw] md:max-w-3xl` (ou tamanho atual como upper bound).
- Body: `max-h-[80vh] overflow-y-auto`.
- Grids internos usando padrões dos passos 1/4.

### 7. Toolbars RH (`RhLayoutToolbar`, `BotaoRelatorioModuloPdf`)
- Botões com labels longos → `<span className="hidden sm:inline">Texto</span>` para colapsar em ícone-only no mobile.
- Toolbar wrapper: `flex flex-wrap gap-2`.

### 8. Validação
- Executar `bun run build` (harness já faz).
- Rodar Playwright headless em `/rh`, `/rh/resumo-folha`, `/rh/quadro-colaboradores`, `/rh/contratos-experiencia`, `/rh/programacao-ferias`, `/rh/turnover`, `/rh/absenteismo` nos viewports 375×812 (iPhone), 768×1024 (tablet) e 1440×900 (desktop). Screenshots comparativos.
- Checar console/network sem novos erros.

## Arquivos a editar

- **Criar**: `src/components/rh/rhResponsive.ts`
- **Editar**: `src/components/rh/RhPageHeader.tsx`, `RhFiltrosBar.tsx`, `RhLayoutToolbar.tsx`, `BotaoRelatorioModuloPdf.tsx`, `AiInsightsPanel.tsx`, `ConfigureRhWidgetDialog.tsx`, `AddRhBiWidgetDialog.tsx`, `FormularioDialog.tsx`, `SincronizarRhDialog.tsx`, `QuadroDrillModal.tsx`, `TurnoverDrillModal.tsx`, `TurnoverEmpresaDrillModal.tsx`, `AbsenteismoDrillModal.tsx`, `ProgramacaoFeriasDrillModal.tsx`
- **Editar (páginas)**: `src/pages/rh/RhIndexPage.tsx`, `ResumoFolhaPage.tsx`, `QuadroColaboradoresPage.tsx`, `ContratoExperienciaPage.tsx`, `ProgramacaoFeriasPage.tsx`, `TurnoverPage.tsx`, `AbsenteismoPage.tsx`, `FormulariosPage.tsx`, `RelatorioGerencialPage.tsx`
- **Editar (grid base)**: `src/components/passagens/PassagensLayoutGrid.tsx` (adicionar breakpoints/layouts sem quebrar consumidores existentes)

## Fora de escopo

- Nenhuma alteração em `api.ts`, `seriesBuilders.ts`, `widgetCatalogs.ts`, hooks de dados ou lógica de negócio.
- Não altera contrato `series` nem PageDataContext.
- Não muda cores/tokens semânticos.
