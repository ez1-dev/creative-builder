## Objetivo

Adicionar navegação multi-nível na `DrillSheet` (e no `KpiDrillSheet` de Produção): cada novo drill empilha um nível, exibindo um breadcrumb clicável no topo e um botão "Voltar". Ao fechar a sheet, o snapshot dos filtros originais da página é restaurado automaticamente.

## Componentes alterados

### 1. `src/components/bi/drill/DrillSheet.tsx`
- Transformar `DrillSheetState` numa **pilha de níveis** (`levels: DrillLevel[]`) em vez de um único contexto.
  ```ts
  interface DrillLevel<TCtx> {
    title: string;
    subtitle?: string;
    chips: DrillSheetFilterChip[];
    ctx: TCtx;
  }
  ```
- `useDrillSheet` expõe:
  - `openWith(level)` — abre com o primeiro nível e captura snapshot dos filtros base via callback opcional `onClose`.
  - `push(level)` — empilha novo nível (drill dentro de drill).
  - `pop()` — remove o último (botão Voltar); se ficar vazio, fecha e dispara restauração.
  - `goTo(index)` — corta a pilha até o nível clicado no breadcrumb.
  - `close()` — limpa pilha + chama `onRestore` (snapshot de filtros).
  - `current` — nível ativo.
- `DrillSheet` recebe `levels` + `onBack` + `onCrumbClick`. No header renderiza:
  - Breadcrumb horizontal scrollável (`overflow-x-auto`) com os títulos de cada nível, separados por `ChevronRight`, último não clicável.
  - Botão "Voltar" com ícone `ArrowLeft` (só aparece se `levels.length > 1`).
  - Chips do nível ativo abaixo.
- Restauração de filtros: hook aceita `restoreFilters?: () => void`. Em `close()` e quando `onOpenChange(false)` é disparado pelo overlay, chama esse callback.

### 2. `src/components/producao/drill/KpiDrillSheet.tsx`
- Refatorar `useKpiDrill` para usar a mesma pilha (`levels: KpiDrillLevel<T>[]`) com `open`, `push`, `pop`, `goTo`, `setOpen`, `current`.
- Aceitar `restoreFilters?: () => void` no construtor do hook.
- `KpiDrillSheet` passa `levels` para `DrillSheet`, mostra o `DataTable` do nível ativo. Linhas podem ter `onRowClick` que chama `push()` com nova consulta.

### 3. Páginas de Produção (7 já migradas)
- `ProducaoDashboardPage`, `LeadTimeProducaoPage`, `ProduzidoPeriodoPage`, `ExpedidoObraPage`, `SaldoPatioPage`, `NaoCarregadosPage`, `RelatorioSemanalObraPage`, `CargaDashboardPage`.
- Em cada uma:
  1. Capturar snapshot dos filtros atuais antes de abrir a sheet (`const snapshot = useRef(filtros)` atualizado no `openWith`).
  2. Passar `restoreFilters={() => setFiltros(snapshot.current)}` ao hook.
  3. Onde fizer sentido (ex.: clicar numa linha de obra dentro do drill abre drill de OPs), usar `drill.push(...)`.
- Sem mudanças de endpoint nem de business logic.

## Comportamento UX

```text
┌─────────────────────────────────────────┐
│ ← Voltar    Dashboard › Obra 123 › OP 9 │ ← breadcrumb clicável
│ Detalhe da OP 9                         │
│ [chip: período] [chip: centro]          │
├─────────────────────────────────────────┤
│ <DataTable do nível ativo>              │
└─────────────────────────────────────────┘
```

- Clicar num crumb anterior → `goTo(index)` corta a pilha.
- Clicar "Voltar" → `pop()`.
- Fechar sheet (X, ESC, clique fora) → limpa pilha + restaura filtros snapshot.
- Mobile: breadcrumb com scroll horizontal, botão Voltar fica como ícone só.

## Fora de escopo

- Onda B (Comercial/Financeiro) e demais dashboards — manter sinalizado para próxima leva.
- Persistência da pilha na URL (não pedido).
- Alterações em endpoints ou regras de negócio.

## Critérios de aceite

- Drill dentro de drill funcional em pelo menos 1 página (ex.: `ProducaoDashboardPage`: KPI → Obras → OPs).
- Breadcrumb mostra todos os níveis, último em destaque (não clicável).
- Botão Voltar remove último nível; sumir quando só há 1 nível.
- Fechar sheet restaura filtros da página ao estado anterior à abertura.
- Build TypeScript verde, sem cor hardcoded, responsivo em 375/768/1280.