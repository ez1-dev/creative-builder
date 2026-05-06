## Objetivo

Adicionar a coluna **"Qtd. ordem"** na grid de **Compras / Custos do Produto**, exibindo o campo `qtd_pedida_ultima_oc_aberta` retornado pela API.

## Alteração

Em `src/pages/ComprasProdutoPage.tsx`, no array `columns`, inserir uma nova coluna logo após `quantidade_ultima_oc_aberta` ("Qtd. Última OC"):

```ts
{ key: 'qtd_pedida_ultima_oc_aberta', header: 'Qtd. ordem', align: 'right', render: (v) => formatNumber(v, 2) },
```

Ordem final do bloco de OC ficará:

```
Última OC | Preço Unit. OC | Qtd. Última OC | Qtd. ordem | OC Aberta? | Qtd. OCs
```

## Observação

A grid é renderizada via componente React `DataTable` (não HTML puro), portanto **não há `colspan` para ajustar** — o componente calcula automaticamente a largura/colunas a partir do array `columns`. As instruções de `colspan="27" → "28"` da mensagem original não se aplicam a este projeto.

A coluna usa `formatNumber(v, 2)` para manter o mesmo padrão visual das demais colunas numéricas (ex.: "Qtd. Última Compra", "Qtd. Última OC"). Se o valor vier `null`/`undefined`, será exibido `-`.

## Arquivos afetados

- `src/pages/ComprasProdutoPage.tsx` (1 linha adicionada)
