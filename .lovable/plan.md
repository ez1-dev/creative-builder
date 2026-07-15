## Barra de rolagem horizontal flutuante no Drill

**Problema:** A tabela do razão no `DrillDrawer` tem overflow horizontal (`overflow-x-auto` na linha 351), mas a barra de rolagem só aparece no rodapé do container. Com muitos lançamentos, o usuário precisa rolar verticalmente até o fim para poder rolar horizontalmente.

**Solução:** Adicionar uma barra de rolagem horizontal "flutuante" que fica sempre visível na base do viewport enquanto a tabela estiver visível, espelhando o scroll do container real.

### Alterações — apenas `src/components/dre-studio/DrillDrawer.tsx`

1. Criar um pequeno componente interno `FloatingHScrollbar` que:
   - Recebe uma `ref` do container rolável real (o `<div className="overflow-x-auto ...">` da linha 351).
   - Renderiza um `<div>` fixo (position sticky no bottom do painel) com altura ~14px e um filho com a mesma `scrollWidth` do container real.
   - Sincroniza `scrollLeft` nos dois sentidos (proxy → real e real → proxy) via listeners `onScroll`.
   - Usa `ResizeObserver` para atualizar a largura quando o conteúdo/tabela mudar.
   - Só aparece quando `scrollWidth > clientWidth` (não há necessidade de barra se a tabela couber).

2. Envolver o container da tabela num wrapper `relative`, prender uma `ref` no `<div className="overflow-x-auto ...">` e renderizar `<FloatingHScrollbar targetRef={ref} />` logo acima do rodapé fixo (linha 458), como `sticky bottom-[48px]` para não sobrepor a barra azul de totais.

3. Nada é alterado no visual da tabela, colunas, dados, cálculos, filtros, queries ou backend.

### Fora de escopo

- Outras tabelas do sistema (só a do Drill do DRE Studio, conforme pedido).
- Layout do rodapé de totais, colunas, ordenação.
- Backend, cache, tipos.

Ao final, testo com Playwright abrindo o drill de uma linha com muitos lançamentos para confirmar que a barra flutuante aparece e sincroniza com a rolagem real.
