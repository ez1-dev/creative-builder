# Barra horizontal flutuante — Drawer "Lançamentos"

## Diagnóstico

O `DrillDrawer.tsx` (drawer "Lançamentos", exibido no print) já monta o `FloatingHScrollbar`, mas ele não aparece de forma útil porque:

1. O container que rola horizontalmente (`razaoScrollRef`, `overflow-x-auto`) fica dentro de `flex-1 overflow-auto`. Como o pai já permite rolagem, em muitas larguras o filho não fica "scrollável" — `scrollWidth === clientWidth` — e o proxy retorna `null`.
2. Quando fica scrollável, a barra nativa aparece no rodapé da tabela (só visível depois de rolar verticalmente até o fim), e o proxy só é medido no mount — sem re-medir quando o Sheet abre ou o layout muda de `expandido`.
3. O proxy não tem faixa visual clara (só um traço fino), passa despercebido.

## Correção (somente frontend/apresentação)

### 1. `DrillDrawer.tsx`
- Trocar o container do Razão para **rolar horizontalmente no próprio nível do painel**:
  - `flex-1 overflow-y-auto` (só vertical) no wrapper externo.
  - `razaoScrollRef` continua com `overflow-x-auto` — agora ele é o único responsável por rolar em X, garantindo `scrollWidth > clientWidth` sempre que a tabela for mais larga que o painel.
- Mover o `<FloatingHScrollbar targetRef={razaoScrollRef} />` para **fora** do `flex-1`, imediatamente acima do rodapé (posição atual mantida), envolvido por `<div className="shrink-0 sticky bottom-0 z-20">` para reforçar que fica ancorado ao pé do painel.

### 2. `FloatingHScrollbar.tsx`
- Reagir também à abertura do drawer / troca de dados: adicionar `IntersectionObserver` + `requestAnimationFrame` para re-medir quando o elemento alvo se torna visível ou muda de tamanho.
- Aumentar a altura para `h-4` e trocar o fundo por `bg-muted` com borda superior mais visível (`border-t-2 border-primary/30`) — assim o usuário identifica a faixa flutuante.
- Manter a lógica de sincronização bidirecional (`syncingRef`).

### 3. Escopo
- Apenas `src/components/dre-studio/DrillDrawer.tsx` e `src/components/dre-studio/FloatingHScrollbar.tsx`.
- Sem mudanças em API, hooks ou dados.
- `DrillResultadoPanel` já recebeu o mesmo componente na rodada anterior e se beneficia automaticamente da melhora de re-medição.

## Resultado esperado
No drawer "Lançamentos" (e em qualquer painel que use `FloatingHScrollbar`), a barra horizontal fica sempre visível na base do painel, com faixa destacada, permitindo arrastar para o lado sem precisar rolar até o fim das linhas.
