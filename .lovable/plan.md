

# Adicionar coluna de Desconto na Lista Detalhada do Painel de Compras

## Mudança em `src/pages/PainelComprasPage.tsx`

Adicionar uma nova coluna na definição de `columns` (após `preco_unitario`, antes de `valor_liquido`):

```ts
{ key: 'percentual_desconto', header: '% Desc.', align: 'right', render: (v) => v ? `${formatNumber(v, 2)}%` : '-' },
```

A API já retorna o campo de desconto nos dados — basta exibi-lo na tabela. Se o campo retornado pela API tiver nome diferente (ex: `desconto`, `valor_desconto`), ajustaremos o `key` conforme necessário.

