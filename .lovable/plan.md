

# Corrigir chave da coluna "Última OC"

## Problema

A coluna "Última OC" está mapeada com a chave `numero_ultima_oc`, mas a API retorna o campo como `numero_oc_ultima`. Por isso a coluna aparece vazia (exibindo "-").

## Correção

- **Arquivo**: `src/pages/ComprasProdutoPage.tsx`
- Alterar `{ key: 'numero_ultima_oc', header: 'Última OC' }` para `{ key: 'numero_oc_ultima', header: 'Última OC' }`

Nota: os produtos listados na primeira página são do tipo "Produzido" e possuem `numero_oc_ultima: 0`. Para ver valores reais, será necessário buscar produtos comprados (com OC). O campo passará a exibir o número correto assim que a chave for corrigida.

