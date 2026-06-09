Em `src/pages/bi/ComercialPage.tsx`, bloco `gauge-atingimento`, calcular o atingimento sobre o **bruto** (mesma base da Diferença) em vez do líquido, mantendo a meta retornada pela API:

```ts
const bruto = Number(k?.faturamento ?? 0);
const meta  = Number(k?.meta ?? k?.vl_meta ?? 0);
const atingimento = meta > 0 ? (bruto / meta) * 100 : 0;
```

Card "Resumo Faturamento" não muda.