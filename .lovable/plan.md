## Objetivo
No gráfico **Ranking** (`RankingChartCard`, usado por "Top Destinos por Valor" e demais rankings da Biblioteca BI), permitir que o usuário expanda a lista progressivamente em vez de ficar limitado ao `topN` fixo.

## Comportamento proposto
- Mostrar inicialmente `topN` itens (default `10`, mantido).
- Se houver mais itens disponíveis no `data`, exibir um botão discreto **"Ver mais (+N)"** ao final da lista.
  - Cada clique revela mais um lote (`step = topN`, ou `10` por padrão).
  - Quando todos os itens estiverem visíveis, alternar para **"Ver menos"** que volta ao `topN` inicial.
- Contagem mostrada no botão: `"Ver mais (+X de Y)"`, onde `X` é quantos virão e `Y` é o total restante. Ajuda a entender o tamanho da lista.
- Estado controlado internamente (`useState`), reseta quando `data` muda (via `useEffect` com dependência no length).
- Acessibilidade: `<button type="button">` com `aria-expanded` e foco visível usando tokens do design system.
- Performance: nada muda em relação ao cálculo `sorted`; apenas a fatia exibida cresce.

## Arquivos a alterar
- `src/components/bi/charts/RankingChartCard.tsx`
  - Nova prop opcional `expandable?: boolean` (default `true`) e `step?: number` (default = `topN`).
  - Adicionar estado `visibleCount`, lógica de expand/collapse, botão no rodapé do `<ol>`.
  - Manter API atual (`topN`, `onItemClick`, `valueFormatter`) intacta — sem breaking change.

## Validação
- `/passagens-aereas` → card "Top Destinos por Valor": clicar em "Ver mais" deve revelar mais destinos; clicar de novo até esgotar; "Ver menos" volta a 10.
- Cross-filter por clique no item continua funcionando (não acionar pelo botão).
- Demais rankings da Biblioteca BI (catálogo / `BiComponentsDemoPage`) ganham o mesmo comportamento automaticamente.
- Caso a altura do card fique apertada, o `ChartCardShell` já lida com scroll interno — confirmar visualmente.

## Fora do escopo
- Não mexer em outros tipos de gráfico (bar/pie/etc.).
- Não persistir o "expandido" entre sessões.