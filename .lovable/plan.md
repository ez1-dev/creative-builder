## Objetivo

No modo "Editar dashboard", permitir reordenar blocos arrastando-os livremente para cima/baixo, em vez de depender do menu "Mover para cima/baixo".

## Mudanças

### 1. `src/components/bi/builder/BlockedLayoutGrid.tsx`
- Envolver a lista de `<section>` em `@dnd-kit/sortable` (já presente em outros pontos do projeto; senão usar HTML5 drag nativo para evitar nova dep).
- Cada bloco vira um item sortable, com:
  - Handle de arraste visível no header do bloco (apenas em `editing`), usando o ícone `GripVertical` já exibido no `BlockHeader`.
  - Cursor `grab/grabbing`, ring/sombra ao arrastar, placeholder com borda primária (mesmo padrão visual do grid de widgets).
- Ao soltar (`onDragEnd`):
  - Calcular nova ordem local (atualização otimista da lista `ordered`).
  - Chamar `onBlockReorder` para CADA bloco cuja `ordem` mudou, em paralelo (ou um único reorder do bloco movido com a nova `ordem` calculada a partir dos vizinhos — preferir setar ordem = índice * 10 para todos afetados).
- Manter os itens "Mover para cima/baixo" no dropdown como fallback de acessibilidade.

### 2. `src/components/bi/builder/BlockHeader.tsx`
- Expor uma `prop` `dragHandleProps?: HTMLAttributes` aplicada ao container do `GripVertical` (quando `editing`), para o dnd-kit anexar listeners.
- Tornar o ícone `GripVertical` maior/mais óbvio (cursor `grab`, padding clicável, tooltip "Arraste para reordenar bloco").

### 3. `src/index.css`
- Estilos para `.block-sortable-dragging` (sombra forte, opacity 0.95, z-index alto) e `.block-sortable-over` (linha guia ou ring primário).

### 4. Hook `useDashboardBlocks` (opcional)
- Adicionar helper `reorderBlocks(ids: string[])` que faz um único round-trip atualizando todas as `ordem` de uma vez, evitando N chamadas RPC ao arrastar. Se não quisermos backend novo, manter N chamadas via `update_dashboard_block`.

## Detalhes técnicos

- Biblioteca: usar **`@dnd-kit/core` + `@dnd-kit/sortable`** se já estiver no `package.json` (verificar antes); caso contrário, implementar drag nativo HTML5 (`draggable`, `onDragStart/Over/Drop`) para não adicionar dependência. Drag nativo é suficiente porque os blocos são apenas linhas verticais — não há grid 2D entre blocos.
- A reordenação é apenas vertical (lista). O `react-grid-layout` continua sendo usado **dentro** de cada bloco para widgets — sem mudança.
- Persistência: continua usando `update_dashboard_block(_ordem)` já existente. Sem migração de banco.

## Fora de escopo

- Arrastar widgets entre blocos (continua via menu "Mover para…").
- Reordenar blocos no modo de visualização (apenas em `editing`).
- Mudanças no backend / RPCs.
