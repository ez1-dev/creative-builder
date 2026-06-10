## Diagnóstico

No `src/pages/bi/ComercialPage.tsx`, bloco `resumo-faturamento` (linhas 777-814), o card mostra **Fat. Bruto / Fat. Líquido / Meta / Diferença**, mas a linha 787 calcula:

```ts
const diferenca = bruto - meta;
```

Ou seja, a Diferença usa o **Faturamento Bruto** em vez do Líquido (Realizado). Por isso `2.116.157 − 8.328.422` aparece como `-6.482.267` (que é `bruto − meta`, não `liquido − meta`).

## Mudança

Trocar o cálculo para usar o mesmo valor do Realizado (Fat. Líquido), priorizando o campo `diferenca` retornado pela API:

```ts
const fatLiquido = Number(
  k?.faturamento_liquido ?? k?.fat_liquido ?? k?.realizado ?? 0
);
const meta = Number(k?.meta ?? k?.vl_meta ?? 0);
const diferenca =
  k?.diferenca !== undefined && k?.diferenca !== null
    ? Number(k.diferenca)
    : fatLiquido - meta;
```

Proibido neste card: `k.diferenca_bruto`, `k.faturamento`, `k.faturamento_bruto`, `k.fat_bruto`, `k.valor`, `k.total` para compor a Diferença. O `bruto` segue sendo exibido apenas como item informativo "Fat. Bruto".

## Arquivo

- `src/pages/bi/ComercialPage.tsx` — linha 787 (substituir cálculo de `diferenca`).

## Fora de escopo

- Backend `/api/bi/comercial/kpis`.
- Demais cards/widgets (gauge, KPIs individuais).

## Critério de aceite

- Com Realizado = `2.116.157` e Meta = `8.328.422`, Diferença = `-6.212.265`.
- Se a API devolver `kpis.diferenca`, esse valor é usado diretamente.
