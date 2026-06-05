# Plano: Refactor "componentes filhos obrigatórios de bloco"

## Status (5 jun 2026)

### Fase 1 — Fundação compartilhada ✅
- Tabela `dashboard_blocks` + `dashboard_widgets.block_id NOT NULL`.
- RPCs: `ensure_default_block`, `create_dashboard_block`, `update_dashboard_block`, `delete_dashboard_block`, `move_widget_to_block`, `can_edit_dashboard`.
- RPCs públicas: `get_*_blocks_via_token` e `get_*_layout_via_token` retornam `block_id`.
- Hook compartilhado: `src/hooks/useDashboardBlocks.ts`.
- Componentes compartilhados:
  - `src/components/bi/builder/BlockHeader.tsx`
  - `src/components/bi/builder/BlockedLayoutGrid.tsx`
- `PassagensLayoutGrid` ganhou props `moveTargets`/`onMoveToBlock` (menu "Mover para…" no toolbar do widget).

### Fase 2 — Passagens (referência) ✅
- `usePassagensLayout` retorna `blocks` + helpers (createBlock, renameBlock, reorderBlock, deleteBlock, moveWidgetToBlock) e inclui `blockId` em cada widget.
- `PassagensDashboard` migrado para `BlockedLayoutGrid`:
  - "+ Adicionar componente" por bloco (define `activeBlockId`).
  - Cancelar/Reset/Save limpam `pendingNewBlockIds`.
  - `saveLayout` propaga `blockId` para widgets novos.
  - "Novo gráfico" do header global usa o primeiro bloco como padrão.

### Fase 3 — Frota / Máquinas / BI Comercial (próximo turno)
- `useFrotaLayout`, `useMaquinasLayout`, `useComercialLayout`: compor `useDashboardBlocks` e expor `blockId` no widget + helpers.
- `FrotaDashboard`, `MaquinasDashboard`, `ComercialDashboardGrid`: trocar grid único por `BlockedLayoutGrid` seguindo o mesmo padrão do `PassagensDashboard` (estados `activeBlockId`, `pendingNewBlockIds`).
- TreeView (`src/components/bi/tree/TreeView.tsx`): adicionar nível Bloco — Dashboard → Bloco → Componente. Selecionar bloco no tree foca o respectivo `<section>` no canvas.

### Critérios de aceite (cobertos parcialmente)
- (a) Salvar sem bloco impossível → banco. ✅
- (b) Não arrastar fora de bloco → cada bloco é um grid isolado. ✅ Passagens; pendente nos 3 outros.
- (c) Mover entre blocos → menu "Mover para…". ✅ Passagens; pendente.
- (d) Vários blocos no dashboard → `createBlock` no rodapé. ✅ Passagens; pendente.
- (e) Editar bloco e componente separadamente → header de bloco vs toolbar de widget. ✅ Passagens; pendente.
- (f) Dashboards antigos migrados → "Bloco Principal" criado em todas as RPCs. ✅
