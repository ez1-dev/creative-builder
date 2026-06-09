## Mudança

No card "Resumo Faturamento" (`src/pages/bi/ComercialPage.tsx`, bloco `resumo-faturamento`), trocar o cálculo de `diferenca` para usar o **bruto** em vez do líquido:

```ts
const diferenca = bruto - meta;
```

Gauge `% Atingimento` permanece como está (líquido / meta) — não foi pedido para mudar.

## Fora de escopo
- Backend, sincronização de meta, demais cards.
