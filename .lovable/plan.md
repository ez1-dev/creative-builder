

# Adicionar coluna "Última OC" na página Compras / Custos do Produto

## Mudança

Adicionar uma nova coluna no array `columns` em `src/pages/ComprasProdutoPage.tsx` para exibir o número da última ordem de compra do produto.

## Detalhes técnicos

- **Arquivo**: `src/pages/ComprasProdutoPage.tsx`
- Inserir a coluna `{ key: 'numero_ultima_oc', header: 'Última OC' }` no array `columns`, posicionada antes de `possui_oc_aberta` (linha 37), agrupando as informações de OC juntas.
- O campo `numero_ultima_oc` será lido diretamente do objeto retornado pela API (mesmo padrão das demais colunas).

