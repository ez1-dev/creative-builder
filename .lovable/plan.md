## Objetivo
Deixar apenas uma barra de rolagem horizontal na visualização DRE/Balanço — a flutuante (que contém os controles/totais).

## Causa
- O contêiner da matriz em `DreStudioVisualizacaoPage.tsx` (linha 2401) já esconde a barra nativa horizontal e usa `FloatingHScrollbar` (linha 2953) como única barra.
- Porém `src/components/dre-studio/DreResultTable.tsx` (linha 173) envolve a tabela em `overflow-x-auto`, gerando uma **segunda** barra horizontal logo acima da flutuante.

## Alteração
Arquivo: `src/components/dre-studio/DreResultTable.tsx` — linha 173

- Trocar `overflow-x-auto max-h-[65vh] overflow-y-auto` por `overflow-x-visible max-h-[65vh] overflow-y-auto`.
- Assim, apenas o contêiner-pai (`matrizScrollRef`) controla o scroll horizontal, com a `FloatingHScrollbar` como única barra visível.

## Escopo
- Apenas presentation (uma linha de className).
- Não altera lógica, dados ou o Balanço em si (que também consome esse componente e se beneficia do mesmo comportamento — a página do Balanço já usa a flutuante).

## Validação
- Abrir `/contabilidade/dre-studio/.../visualizacao`, confirmar que só a barra flutuante aparece na parte inferior.
- Verificar Balanço também para garantir que continua com scroll horizontal funcional via barra flutuante.
