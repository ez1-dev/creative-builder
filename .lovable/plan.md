

# Adicionar coluna "Valor Desconto" na grid do Painel de Compras

## Mudança

**Arquivo:** `src/pages/PainelComprasPage.tsx`

Adicionar uma nova coluna `valor_desconto_total` no array `columns`, posicionada após `percentual_desconto` (% Desc.) e antes de `valor_liquido`:

```typescript
{ key: 'valor_desconto_total', header: 'Vlr. Desconto', align: 'right', render: (v) => formatCurrency(v) },
```

O campo `valor_desconto_total` já é retornado pela API (usado nos KPIs do resumo). Nenhuma alteração de backend necessária.

