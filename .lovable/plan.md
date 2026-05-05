## Objetivo

Na tela **Compras / Custos do Produto** (`/compras-produto`) a grid já mostra "Última OC", "Preço Unit. OC" e "Qtd. OCs" (contagem de OCs abertas), mas **não exibe a quantidade da última OC aberta**. Vamos adicionar essa coluna.

## Alteração

Em `src/pages/ComprasProdutoPage.tsx`, no array `columns`, inserir uma nova coluna logo após `preco_ultima_oc_aberta`:

```ts
{ key: 'quantidade_ultima_oc_aberta', header: 'Qtd. Última OC', align: 'right', render: (v) => formatNumber(v, 2) },
```

Ordem final do bloco de OC ficará:

```
Última OC | Preço Unit. OC | Qtd. Última OC | OC Aberta? | Qtd. OCs
```

## Observação sobre o backend

O endpoint `/api/compras-produto` precisa retornar o campo `quantidade_ultima_oc_aberta` no JSON de cada produto. Se o backend ainda não envia esse campo, a coluna ficará com `-` até o backend ser ajustado — sem quebrar nada. Caso o nome real do campo no backend seja outro (ex.: `qtde_ultima_oc`, `quantidade_oc_ultima`), basta trocar a `key` da coluna; o resto fica igual.

## Arquivos afetados

- `src/pages/ComprasProdutoPage.tsx` (1 linha adicionada)
