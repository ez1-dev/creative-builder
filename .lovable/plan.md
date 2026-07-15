## Objetivo
Remover, na página **DRE Studio › Visualização** (`src/pages/contabilidade/dre-studio/DreStudioVisualizacaoPage.tsx`), os dois textos exibidos no cabeçalho de meta do relatório:

- `Referência Senior: Sim/Não`
- `Origem ref.: NAO_ENCONTRADA`

## Alteração
No bloco entre as linhas ~1705–1728, remover:

1. O `<span>` do badge "Referência Senior: Sim/Não".
2. O `<span>` "Origem ref.: …".

Manter o restante do bloco (ex.: "Qtd. referências aplicadas"), pois o usuário só pediu remoção dessas duas mensagens.

## Fora de escopo
- Não alterar a lógica de cálculo/validação de referência.
- Não mexer em `ValidacaoCCCC106`, `FonteSaldoBadge`, avisos de "Referência Senior não aplicada" nem no card de configuração.
