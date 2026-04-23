

## Remover aviso "Detalhamento da página atual" da Auditoria Apontamento Genius

### Diagnóstico
Na tela `/auditoria-apontamento-genius`, abaixo dos KPIs/sumário, aparece um aviso informando que os valores cobrem apenas N de M registros e sugerindo percorrer as páginas. O usuário quer remover essa mensagem.

### Mudança (arquivo único: `src/pages/AuditoriaApontamentoGeniusPage.tsx`)

1. Localizar o bloco JSX que renderiza o texto "Detalhamento da página atual" / "Os valores cobrem apenas X de Y registros. Para análise completa, percorra as páginas."
2. Remover por completo o elemento (e o container/wrapper se ele só servia para esse aviso) sem alterar layout dos KPIs nem da tabela.
3. Remover variáveis/constantes auxiliares que existiam só para montar a string (se houver), para não deixar código morto.

### Fora de escopo
- Mudar lógica de paginação ou de cálculo dos KPIs.
- Alterar outras telas que tenham aviso similar.

### Resultado
O aviso deixa de aparecer na tela. KPIs, sumário da OP, drill-down e tabela continuam funcionando normalmente.

