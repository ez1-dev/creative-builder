

# Adicionar colunas `custo_calculado` e `data_custo_calculado`

## Mudança

### `src/pages/ComprasProdutoPage.tsx`

Adicionar duas colunas ao array `columns`, após `data_preco_medio` (linha 29):

```ts
{ key: 'custo_calculado', header: 'Custo Calculado', align: 'right', render: (v) => formatCurrency(v) },
{ key: 'data_custo_calculado', header: 'Data Custo Calc.', render: (v) => formatDate(v) },
```

## Arquivo afetado
- `src/pages/ComprasProdutoPage.tsx`

