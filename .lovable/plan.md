## Objetivo
Mostrar um **total** no rodapé do `RankingChartCard` (ex.: "Top Destinos por Valor"), refletindo a soma dos itens **atualmente visíveis** na lista (respeitando o estado de "Ver mais / Ver menos" implementado anteriormente).

## Comportamento
- Abaixo dos itens (e antes/junto do botão "Ver mais"), exibir uma linha:
  - Esquerda: rótulo `"Total ({n} de {total})"` mostrando quantos itens estão visíveis em relação ao total disponível.
  - Direita: soma de `valor` dos itens visíveis, formatada com `valueFormatter` (default `formatCurrency`).
- O total é **dinâmico**: ao clicar em "Ver mais" o número de itens e o valor somado crescem; ao clicar em "Ver menos" voltam ao `topN`.
- Visual sutil: separador acima (border-top), texto pequeno, peso semibold no valor; usar tokens `text-muted-foreground` / `text-foreground`. Sem cores hardcoded.
- Se a lista estiver vazia, o total não aparece (já tratado por `isEmpty`).
- Nova prop opcional `showTotal?: boolean` (default `true`) caso algum lugar queira esconder.

## Arquivo
- `src/components/bi/charts/RankingChartCard.tsx` — adicionar:
  - cálculo `visibleSum = visible.reduce((s, d) => s + d.valor, 0)`
  - bloco JSX no rodapé com o total + contagem.

## Validação
- `/passagens-aereas` → "Top Destinos por Valor": com 10 itens, total bate com a soma de PA+PR+...+PI; ao clicar "Ver mais", total cresce.
- Outros rankings da Biblioteca BI ganham o total automaticamente.

## Fora do escopo
- Não tocar em outros componentes (bar/pie/etc.).
- Não persistir estado.