## Objetivo

Melhorar a UX de redimensionamento dos blocos no modo "Editar layout" do dashboard de Passagens Aéreas:

1. Garantir que `localLayout` permanece consistente durante drag/resize por arrasto, para que os botões `+`/`−` clicados imediatamente após um arrasto partam do tamanho real (e não de um estado defasado).
2. Adicionar atalhos de teclado quando um bloco estiver focado (Tab para focar, setas para redimensionar).

## Onde

`src/components/passagens/PassagensLayoutGrid.tsx`

## Mudanças

### 1. Sincronização durante arrasto

Hoje `onLayoutChange` do `react-grid-layout` dispara em cada frame de arrasto e já atualizamos `localLayout`. O risco é o `useEffect` que reseta `localLayout` quando `orderedWidgets` muda — adicionar guarda: só sincroniza do props quando o conjunto de `type`s mudou (entrou/saiu widget) ou quando o `localLayout` ainda está vazio. Caso contrário, mantém os valores ajustados em memória até o próximo carregamento real do hook.

Adicionar também handlers `onResizeStop` e `onDragStop` que forçam o emit final (idempotente, mas garante persistência mesmo se o último delta foi filtrado pelo dedupe via `lastEmitted`).

### 2. Atalhos de teclado

Tornar cada wrapper de bloco focável (`tabIndex={0}` quando `editing`) e adicionar `onKeyDown`:

- `ArrowRight` → largura +1
- `ArrowLeft`  → largura −1
- `ArrowDown`  → altura +1
- `ArrowUp`    → altura −1
- `Shift + setas` → passo de 2 (acelerador)

Cada handler chama o mesmo `stepResize(type, dW, dH)` já existente e faz `e.preventDefault()` para não rolar a página. Ignora teclas se o foco estiver em `input/textarea/select/button` dentro do bloco (verifica `e.target` vs `e.currentTarget`).

Adicionar dica visual: quando `editing` e o bloco está focado (`focus-visible:ring-primary`), mostrar um pequeno chip "Setas para redimensionar · Shift = passo 2" no rodapé do bloco. Reaproveitar tokens existentes (sem cores hardcoded).

### 3. Acessibilidade

- `role="group"` + `aria-label={`Bloco ${w.title}. Use setas para redimensionar.`}` no wrapper.
- Botões `+`/`−` já têm `title`; adicionar `aria-label` equivalente.

## Sem mudanças em

- Banco, hook `usePassagensLayout`, layout default ou outras telas. Apenas o componente de grid.

## Resultado

- Após arrastar/redimensionar um bloco, clicar em `+`/`−` continua a partir do tamanho real.
- Com o bloco focado (Tab), as setas redimensionam; Shift acelera. A persistência usa o mesmo caminho (`onLayoutChange` → `saveLayout`).
