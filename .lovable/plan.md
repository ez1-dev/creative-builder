## Problema

Sublinhas raiz da DRE aparecem em ordem lexicográfica (`1, 10, 2, 3, ...`) em vez de numérica (`1, 2, 3, ..., 9, 10`). O `sortSiblings` atual usa `ordem` como chave primária e cai para `localeCompare` sem `numeric: true`, então quando `ordem` é igual/zero para todas as raízes numéricas, `"10" < "2"`.

## Alteração — só em `DreStudioVisualizacaoPage.tsx`, função `sortSiblings` (~linhas 590-606)

Quando **ambos** os irmãos têm `codigo` puramente numérico (regex `^\d+(?:\.\d+)*$`), ordenar por `codigo` com `localeCompare(..., { numeric: true })` como chave primária — igual ao ramo já existente para virtuais do Balanço. Para o restante (mistura com códigos não-numéricos, `VINCULAR.*` etc.), manter o comportamento atual: `ordem` → `codigo`.

Resultado: linhas raiz da DRE saem na ordem `1, 2, 3, 4, 5, 6, 7, 8, 9, 10`. Sublinhas `7.1/7.2`, `8.1/8.2`, `9.1` continuam corretas (já eram numéricas puras).

## Fora de escopo

Backend, `ordem` gravada, `LinhaDialog`, cálculos, Balanço, drill, exports.
