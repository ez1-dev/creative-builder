# Totalizadores na linha do grupo (Detalhamento por Nota Fiscal)

## Problema

Hoje, ao agrupar a grid por uma coluna (ex.: Origem → MÁQUINAS / PEÇAS), a linha de grupo mostra apenas:

```
> Origem: PEÇAS  [786]
```

Os valores agregados (Vl. Bruto, Impostos, Vl. Líquido, Devolução, Qtd. Produtos) já são calculados pelo `DataTable`, mas ficam renderizados nas células das colunas numéricas — que estão fora da área visível (precisa rolar bastante para a direita). Resultado prático: o usuário percebe a linha como "vazia".

## Objetivo

Quando um agrupador estiver ativo, mostrar um **resumo inline** dos principais totalizadores ao lado do rótulo do grupo, visível sem precisar rolar a tabela, mantendo também os totais nas colunas numéricas correspondentes (como hoje) e o rodapé "Total (N)".

Exemplo desejado:

```
> Origem: PEÇAS  [786]   Vl. Bruto: R$ 1.234.567,89 · Líquido: R$ 1.100.000,00 · Qtd: 9.876
> Origem: MÁQUINAS [8]   Vl. Bruto: R$    98.765,43 · Líquido: R$    90.000,00 · Qtd:   120
```

## Mudanças

### 1. `src/components/erp/DataTable.tsx`

- Estender a interface `Column<T>` com um flag opcional:
  - `summaryInGroupHeader?: boolean` — quando `true`, a coluna entra no resumo inline da linha do grupo.
- Na função `renderGroupNode`, na célula do rótulo (primeira coluna, onde já vai o chevron + "Origem: PEÇAS"):
  - Calcular a lista de colunas marcadas com `summaryInGroupHeader` que também sejam numéricas (`numericKeys`).
  - Renderizar, ao lado do `<Badge>` de contagem, uma sequência de chips/textos no formato `Header: valor` separados por `·`, usando `renderAggregate(col, node.totals[col.key])` para formatar (assim respeita `aggregateFormatter` / `render`).
  - Estilo discreto (`text-[11px] text-muted-foreground`), com `flex-wrap` para não quebrar layout em telas estreitas.
- Manter a renderização atual dos totais nas células das colunas numéricas (sem alteração) e o `<tfoot>` "Total (N)".
- Se nenhuma coluna for marcada com `summaryInGroupHeader`, o comportamento atual fica idêntico (sem regressão para outras telas que usam `DataTable`).

### 2. `src/pages/bi/ComercialPage.tsx` (widget "Detalhamento por Nota Fiscal")

- No array `colsDetalhes`, marcar as colunas-chave com `summaryInGroupHeader: true`:
  - `vl_bruto` (Vl. Bruto)
  - `vl_liquido` (Vl. Líquido)
  - `qtd_produtos` (Qtd. Produtos)
- (Opcional, se ficar curto) também marcar `vl_impostos` e `vl_devolucao`. Padrão sugerido: apenas as 3 acima para não poluir a linha.

## Critérios de aceite

- Com o agrupador "Origem" ativo, cada linha de grupo mostra contagem + Vl. Bruto, Vl. Líquido e Qtd. Produtos formatados, visíveis sem rolar horizontalmente.
- Os totais nas colunas numéricas (à direita) continuam aparecendo ao rolar.
- O rodapé "Total (N) + somas" continua funcionando.
- Telas que usam `DataTable` sem marcar `summaryInGroupHeader` permanecem inalteradas.

## Fora de escopo

- Não alterar API/backend, paginação `fetchComercialDetalhes`, drill `NOTA_FISCAL`, ou demais widgets do dashboard Comercial.
