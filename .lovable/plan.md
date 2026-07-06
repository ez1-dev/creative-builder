# RH-01 · Confirmar coluna "Salário Base" por filial

O front já está correto — o grid lê `filiais[].salario_base` diretamente, sem aliases, sem cálculo, sem Supabase. Apenas um pequeno ajuste é necessário para diferenciar `null`/`undefined` (mostrar `-`) de `0` (mostrar `R$ 0,00`).

## Estado atual (confirmado)

`src/pages/rh/ResumoFolhaPage.tsx`:
- `FILIAL_COLS[0] = { key: "salario_base", label: "Salário Base", format: "currency" }` — primeira coluna após "Cód. Filial" e "Filial".
- Renderização: `<ValueOrMissing value={(f as any)["salario_base"]} missing={!("salario_base" in f)} field="salario_base" format="currency" />`.
  - Se a chave `salario_base` não vier no payload → "Campo pendente na API" (comportamento correto — indica payload antigo, resolvido reiniciando a API 8070).
  - Se vier `0` → `R$ 0,00` (já funciona).
  - Se vier `null`/`undefined` (chave presente mas sem valor) → hoje mostra `R$ 0,00` ❌ — precisa mostrar `-`.

Nenhum alias (`vl_salario_base`, `salario_bruto`, etc.) é usado. Nenhuma soma/agregação no front.

## Único ajuste

**`src/components/rh/KpiOrMissing.tsx`** — no `ValueOrMissing`, quando `!missing` e `value == null` (null ou undefined), renderizar `"-"` em vez de formatar `0`. Zero continua sendo formatado como `R$ 0,00`.

```tsx
if (format === "horas") return <>{fmtHoras(value as any)}</>;
if (value === null || value === undefined) return <>-</>;
return <>{formatCurrency(Number(value))}</>;
```

Efeito colateral: qualquer célula usando `ValueOrMissing` (todas as colunas da grid de filiais) passa a mostrar `-` quando o valor vier explicitamente `null`/`undefined`. Comportamento correto e mais informativo.

## Fora de escopo

- Não alterar regra de Salário Base / Salário Bruto.
- Não mexer em Benefícios, Hora Extra, Custo Férias, Provisões, Custo Total, Rescisões, FGTS, INSS.
- Não criar aliases nem `_missing_kpis` extra.
- Não alterar o KPI global `kpis.salario_base` (já OK).
- Se a coluna continuar exibindo "Campo pendente na API" após o deploy, é payload antigo — reiniciar API `8070` e recarregar.

## Validação (Jun/2026)

Após reiniciar a API e recarregar `/rh/resumo-folha` com filtro `202606..202606`:
- KPI "Salário Base" ≈ `R$ 1.711.444,89`.
- Grid Filiais:
  - Matriz → `R$ 1.076.641,56`
  - 663 Via Maris → `R$ 166.935,93`
  - 669 TESC → `R$ 105.257,97`
  - 664 Bunge → `R$ 78.035,35`
  - Soma da coluna = `R$ 1.711.444,89`.
- Filiais com `salario_base = 0` → `R$ 0,00`.
- Filiais com `salario_base = null` → `-`.
