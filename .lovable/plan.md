## Refatoração: componentes filhos obrigatórios de bloco

### Estado atual (já entregue)
- Tabela `dashboard_blocks` criada e `dashboard_widgets.block_id` NOT NULL no banco.
- Migração automática colocou todos os widgets antigos no "Bloco Principal".
- RPCs `upsert_*_dashboard_default` garantem bloco e atribuem `block_id`.
- RPCs públicas `get_*_blocks_via_token` + `get_*_layout_via_token` retornam `block_id`.
- Hooks de layout chamam `ensureDefaultBlockId` ao inserir widgets novos.

### Fase 1 — Fundação compartilhada (esta entrega)

**Novos arquivos:**
- `src/hooks/useDashboardBlocks.ts` — carrega blocos por `dashboardId` (ou via `shareToken` + RPC pública), expõe `createBlock`, `renameBlock`, `deleteBlock`, `reorderBlocks`, `moveWidgetToBlock`, `updateBlockLayout`.
- `src/components/bi/builder/BlockedLayoutGrid.tsx` — renderiza **N grids isolados** (1 por bloco). Cada grid tem cabeçalho com: drag handle do bloco, título editável inline, contador de componentes, botão `+ Adicionar componente` (chama `onAddComponent(blockId)`), menu `…` (renomear, excluir, mover ↑ ↓). Sem drag cross-bloco — usa menu "Mover para…" no toolbar do widget.
- `src/components/bi/builder/MoveWidgetToBlockMenu.tsx` — dropdown listando outros blocos do dashboard.
- `src/components/bi/builder/BlockHeader.tsx` — header reutilizável (título inline, ações).

**Modificações em `useDashboardBlocks`:** novos RPCs `create_dashboard_block`, `update_dashboard_block`, `delete_dashboard_block`, `move_widget_to_block` (a criar — todas SECURITY DEFINER respeitando `can_edit_*` por módulo da dashboard).

### Fase 2 — Passagens (referência)

- `usePassagensLayout` passa a expor `widgets` (com `blockId`), `blocks` (via `useDashboardBlocks`), e helpers de bloco.
- `PassagensDashboard` substitui o `PassagensLayoutGrid` único por `BlockedLayoutGrid`. `pendingNewWidgets` ganha campo `blockId`. `AddChartDialog` recebe `activeBlockId` (clicado no `+` do bloco) e usa-o ao gravar.
- IA `bi-ia-chart`: o widget gerado herda o bloco onde o sugestor IA estiver renderizado.
- TreeView ganha nível Bloco (Dashboard → Bloco → Componente).

### Fase 3 — Frota, Máquinas, BI Comercial

- Mesma substituição cirúrgica em `FrotaDashboard`, `MaquinasDashboard`, `ComercialDashboardGrid` → trocar grid único por `BlockedLayoutGrid` e ligar helpers do hook.
- Hooks `useFrotaLayout`, `useMaquinasLayout`, `useComercialLayout` ganham `blocks` e propagam `blockId`.

### Migração de dados
- Já feita pela migração anterior: todos os widgets sem `block_id` foram atribuídos ao "Bloco Principal" do dashboard.

### Critérios de aceite cobertos
- (a) Salvar sem bloco impossível → `block_id` NOT NULL no banco.
- (b) Não arrastar fora de bloco → cada bloco é um `ResponsiveGrid` isolado.
- (c) Mover entre blocos → menu "Mover para…" no widget.
- (d) Vários blocos por dashboard → `createBlock` no header do dashboard.
- (e) Editar bloco vs componente → header do bloco com ações próprias, toolbar do widget separado.
- (f) Dashboards antigos migrados → "Bloco Principal" criado em todas as RPCs.

### Por que faseado e não tudo num único turno
Cada uma das 4 páginas (`PassagensDashboard`, `FrotaDashboard`, `MaquinasDashboard`, `ComercialDashboardGrid`) tem entre 800–2000 linhas com lógica de cross-filter, paginação e estados pendentes. Reescrever as 4 em paralelo no mesmo turno aumenta drasticamente o risco de regressão em filtros, estados de edição e link compartilhado. Implementar Passagens primeiro nos permite validar a UX (cabeçalho, mover entre blocos, IA dentro do bloco ativo) antes de replicar. Próximos turnos aplicam o mesmo padrão sem inventar nada novo.

### O que muda nesta resposta agora
1. Migração com RPCs `create_dashboard_block`, `update_dashboard_block`, `delete_dashboard_block`, `move_widget_to_block`.
2. `useDashboardBlocks.ts`, `BlockedLayoutGrid.tsx`, `BlockHeader.tsx`, `MoveWidgetToBlockMenu.tsx`.
3. `usePassagensLayout` retornando `blocks` + helpers + `blockId` em cada widget.
4. `PassagensDashboard` migrado para `BlockedLayoutGrid` e add-componente por bloco.
5. Atualização da memória `dashboard-builder` documentando a camada de blocos.

Frota / Máquinas / Comercial entram nos próximos turnos com os mesmos componentes.