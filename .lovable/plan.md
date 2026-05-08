## Objetivo

No modo "Editar layout" do dashboard de Passagens Aéreas, adicionar botões **+** / **−** sobrepostos a cada bloco para aumentar/diminuir rapidamente o tamanho, sem precisar arrastar a alça de resize do canto.

Hoje só existe a alça de resize padrão do `react-grid-layout` (canto inferior direito), que é pouco descoberta e difícil em telas menores.

## Onde

`src/components/passagens/PassagensLayoutGrid.tsx`

## Como

1. Estender `Props` com um callback `onResizeStep?: (type: string, deltaW: number, deltaH: number) => void` (opcional). Quando ausente, calcula novo layout localmente e emite via `onLayoutChange` já existente.

2. Para cada bloco, quando `editing === true`, renderizar uma barra flutuante no canto superior direito (absolute, `data-no-drag`, `z-10`) com 4 botões pequenos (icon-only, `variant="secondary"`, `size="icon"`):
   - **Largura −** (`Minus`) — `w = max(minW, w - 1)`
   - **Largura +** (`Plus`) — `w = min(12, w + 1)`
   - **Altura −** — `h = max(minH, h - 1)`
   - **Altura +** — `h = h + 1`
   
   Tooltip explicando "Diminuir/Aumentar largura/altura".

3. Ao clicar, montar o novo `layoutItems` em estado local e disparar o mesmo `handleLayoutChange` que já é usado no drag/resize, garantindo persistência via `onLayoutChange` (que o `PassagensDashboard` já liga ao `saveLayout`).

4. Usar `e.stopPropagation()` no clique e `data-no-drag` no container para não conflitar com o drag.

5. Sem mudanças no banco, hook `usePassagensLayout`, ou layout default — apenas UI dentro do grid quando `editing`.

## Resultado

Em modo edição, cada widget mostra 4 botões discretos (`−` / `+` largura, `−` / `+` altura) no topo. Um clique já redimensiona em uma "unidade" da grade (1 coluna ou 1 linha = 60px), com persistência automática igual ao resize por arrasto.
