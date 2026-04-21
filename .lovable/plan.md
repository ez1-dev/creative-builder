
## Adicionar quantidade da última compra em Compras / Custos do Produto

Adicionar uma nova coluna **"Qtd. Última Compra"** na tabela da tela `/compras-produto`, posicionada logo após **"Preço NF"** (preço da última nota fiscal de compra).

### Alteração

**Arquivo:** `src/pages/ComprasProdutoPage.tsx`

Inserir na lista `columns`, entre `preco_nf_ultima_compra` e `data_entrada_nf_ultima_compra`:

```ts
{ key: 'quantidade_nf_ultima_compra', header: 'Qtd. Última Compra', align: 'right', render: (v) => formatNumber(v, 2) },
```

### Dependência do backend

O endpoint `/api/compras-produto` precisa retornar o campo `quantidade_nf_ultima_compra` (quantidade do item na última NF de entrada — tabela `E440NFC`/itens). Se o backend ainda não expõe esse campo, a coluna aparecerá como `-` até o ajuste no FastAPI.

Caso o backend já retorne com outro nome (ex.: `qtd_nf_ultima_compra`, `quantidade_ultima_compra`), basta ajustar o `key`. Posso confirmar o nome exato após a primeira busca, se preferir.

### Sem alterações em
Filtros, KPIs, exportação, autenticação ou outros módulos.
