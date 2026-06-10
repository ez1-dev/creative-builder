## Problema
No bloco "Rankings por Dimensão" do Relatório Executivo, o gráfico e a tabela do "Top Revendas" (e potencialmente "Top Estados" / "Top Obras") mostram "—" no rótulo porque `RankingTopN` lê apenas uma chave fixa (`labelKey="revenda"`), mas o endpoint `/api/bi/comercial/revenda` da FastAPI pode devolver o nome em campos diferentes (`nm_revenda`, `ds_revenda`, `nm_fantasia`, `cd_rev_pedido`). Como `r.revenda` vem nulo, o `?? '—'` é acionado.

O projeto já tem o helper `pickDimensionLabel(row, dim)` em `src/lib/bi/dimensionLabels.ts` que percorre uma lista de chaves de código/nome por dimensão (`revenda`, `estado`, `obra`, etc.) e devolve o melhor rótulo legível.

## Solução (apenas frontend)
Arquivo único: `src/components/bi/relatorio-executivo/RelatorioBlocos.tsx`.

1. Importar `pickDimensionLabel` e o tipo `LabelDimension` de `@/lib/bi/dimensionLabels`.
2. Trocar a assinatura de `RankingTopN` para receber `dim: LabelDimension` em vez de `labelKey: string`.
3. No `.map(...)` interno, montar o label com `pickDimensionLabel(r, dim) || '—'` (mantendo o fallback caso a linha esteja vazia).
4. Atualizar as 3 chamadas em `RankingsBloco`:
   - `Top Revendas` → `dim="revenda"`
   - `Top Estados` → `dim="estado"`
   - `Top Obras/Projetos` → `dim="obra"`
5. Manter `valueKey` como está (o campo de valor segue sendo `faturamento`).

## Fora de escopo
- Não alterar API/backend nem o hook.
- Não mexer no bloco Pareto (já usa seu próprio `agregarPorChave`; pode ser revisado depois se o usuário pedir).
- Não tocar nos demais blocos.

## Critérios de aceite
- Coluna "Revendas" da tabela e eixo Y do gráfico mostram nomes legíveis (ex.: "GENIUS" ou "0001 - Genius Distribuição") em vez de "—".
- Top Estados mostra a UF formatada (já tratado pelo helper).
- Top Obras mostra o nome do projeto quando disponível.
- Não gera React error #310. Usa apenas tokens semânticos.