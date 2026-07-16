Plano para corrigir o scroll horizontal flutuante:

1. Tornar a barra realmente fixa dentro do drawer
- Alterar `FloatingHScrollbar` para renderizar como uma faixa `position: sticky`/base fixa do painel, com largura 100%, acima do rodapé azul.
- Garantir `z-index`, fundo e borda visíveis para não parecer parte da tabela.

2. Sincronizar dimensões de forma mais robusta
- Medir `scrollWidth`, `clientWidth` e `scrollLeft` do container alvo após abrir o drawer, após renderizar a tabela e em mudanças de tamanho/conteúdo.
- Sincronizar também quando o usuário rolar a tabela nativa ou a barra flutuante.

3. Impedir que o layout esconda a barra
- No `DrillDrawer`, manter a área central com rolagem vertical apenas e deixar a barra fora dessa área rolável.
- Ajustar o espaçamento inferior da área da tabela para que a última linha não fique encoberta pela barra/rodapé.

4. Aplicar o mesmo padrão no painel genérico de drill
- Revisar `DrillResultadoPanel` para usar a mesma estrutura: área vertical separada, tabela com scroll horizontal próprio e barra flutuante fora do scroll vertical.

5. Validar visualmente
- Conferir no preview que, ao abrir “Lançamentos”, a barra horizontal aparece sempre visível no rodapé do drawer, mesmo no meio da lista, e move as colunas para acessar os resultados à direita.