## Problema

No drill de Lançamentos (Razão) o cabeçalho é fixo (sticky top), mas a barra de rolagem **horizontal** flutuante (`FloatingHScrollbar`) hoje é renderizada **dentro** do container vertical rolável (`.flex-1 overflow-auto`), logo após a tabela.

Resultado: com muitas linhas, ela só aparece quando o usuário rola verticalmente até o fim da tabela — na prática ela "fica sempre no final" e o usuário não consegue rolar horizontalmente sem antes descer todo o conteúdo.

## Objetivo

Deixar a barra de rolagem horizontal **sempre visível** enquanto o painel de Lançamentos estiver aberto, independentemente da posição do scroll vertical — ficando ancorada logo acima do rodapé de totais.

## Alteração (frontend apenas)

Arquivo único: `src/components/dre-studio/DrillDrawer.tsx`

1. **Mover `<FloatingHScrollbar targetRef={razaoScrollRef} />`** para fora do container `.flex-1 overflow-auto` (hoje na linha 520, dentro do bloco da tabela).
2. Renderizá-lo como **irmão** desse container, logo antes do "Rodapé fixo com totais" (bloco atual das linhas 526–541). Assim ele fica no layout flex do `SheetContent`, colado acima do rodapé azul, sempre visível.
3. Ajustar o componente `FloatingHScrollbar` (linhas 96–106):
   - Remover `sticky bottom-0` (não é mais necessário — o pai deixa de ser rolável).
   - Manter a mesma detecção de `scrollWidth > clientWidth` para só aparecer quando a tabela realmente exceder a largura.
   - Manter o espelhamento de `scrollLeft` já existente (funciona igual, o `targetRef` continua sendo o div horizontalmente rolável da tabela).
4. Sem mudanças em endpoints, hooks, tipos ou lógica de negócio.

## Verificação

- Abrir `/contabilidade/dre-studio/{id}/visualizacao`, clicar em uma linha drillável → drill Conta Contábil → abrir Razão com muitos lançamentos.
- Confirmar (via Playwright + screenshot) que a barra horizontal aparece imediatamente acima do rodapé de totais, mesmo com o scroll vertical no topo, e que arrastá-la move a tabela lateralmente.

## Não faz parte deste plano

- Nenhuma mudança no drill de "Lista de drills" (DrillsMenu), no drawer de detalhe do lançamento, ou nos parâmetros da chamada `resultado-cache`/`drill-lancamentos`.
