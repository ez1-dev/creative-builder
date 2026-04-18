
Add supplier code column next to supplier name in NotasRecebimentoPage results grid.

### Change in `src/pages/NotasRecebimentoPage.tsx`

Add a new column `codigo_fornecedor` immediately before the existing `nome_fornecedor` column in the `columns` array:

```typescript
{ key: "codigo_fornecedor", header: "Cód. Fornecedor" },
{ key: "nome_fornecedor", header: "Fornecedor" },
```

The field `codigo_fornecedor` is already returned by the API (it's used in KPI calculations: `new Set(dados.map((d) => d.codigo_fornecedor))`), so no backend changes are needed.

### Result
The grid will display the supplier code right before the supplier name, making it easier to identify and reference suppliers.
