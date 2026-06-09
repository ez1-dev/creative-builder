## Objetivo
Tornar o arraste dos blocos no modo "Editar dashboard" mais fácil e intuitivo. Hoje o handle é um chip pequeno no canto superior esquerdo (~150px); fora dele, o cursor não vira "grab" e o bloco não se move, o que é o pincipal motivo da reclamação.

## Mudanças

### 1. `src/components/passagens/PassagensLayoutGrid.tsx`
Transformar **toda a barra superior do bloco** (em modo edição) em área arrastável, mantendo os botões de ação (resize, configurar, mover, ocultar, excluir) clicáveis.

- Adicionar uma faixa `drag-handle` que ocupa toda a largura do topo do bloco (altura ~36–40px), atrás dos botões de ação. Continuará usando `cursor: grab` / `grabbing`.
- O chip "GripVertical + título" passa a viver dentro dessa faixa (lado esquerdo), e o cluster de botões de ação fica à direita com `data-no-drag` (já existe `draggableCancel` cobrindo `button` e `[data-no-drag]`).
- Aumentar levemente o `pt-10` → `pt-11` para acomodar o handle mais alto sem cortar conteúdo do gráfico.
- Reduzir o `ring-2` para `ring-1` + borda tracejada sutil no `:hover` do bloco em edição, deixando claro que o bloco inteiro está em modo edição mas o "alvo de arraste" é a faixa do topo.
- Manter teclado/acessibilidade (setas para resize) intactos.
- Pequena melhoria: na faixa, mostrar um padrão de pontos (dots) ou ícone `GripHorizontal` centralizado para reforçar a affordance de arraste em telas largas.

### 2. `src/index.css` (bloco "React Grid Layout - drag/resize feedback")
- Reforçar feedback visual:
  - `.layout.is-editing .react-grid-item:hover .drag-handle` → fundo `hsl(var(--accent))` + leve outline.
  - `.layout.is-editing .react-grid-item.react-draggable-dragging` → manter sombra, adicionar `transform: scale(1.01)` e `opacity: 0.95` para sensação de "pegou".
  - `.react-grid-placeholder` → manter, só ajustar para borda 2px sólida `hsl(var(--primary)/0.5)` quando arrastando, ajudando a ver o destino.
  - Forçar `cursor: grab` em toda a faixa `.drag-handle` (full width) e `grabbing` durante o gesto.

## Fora de escopo
- Não mudar a lógica de salvamento (`onLayoutChange`, `handleStop`, debounce).
- Não alterar `usePassagensLayout`, dialogs, ou páginas que consomem o grid.
- Não mexer em resize, atalhos de teclado, ou no comportamento mobile (`isCompact`).

## Resultado esperado
No modo edição, o usuário pode clicar e arrastar em **qualquer ponto da faixa superior** do bloco (não só no chip pequeno), com cursor `grab`/`grabbing` claro, sombra ao pegar e placeholder destacado no destino — tornando o "mover bloco" muito mais natural.
