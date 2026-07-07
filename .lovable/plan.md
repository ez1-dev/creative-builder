O front já está correto e alinhado com o pedido. Nenhuma alteração adicional é necessária — a correção no `ValueOrMissing` (para diferenciar `null`/`undefined` de `0`) já foi aplicada na iteração anterior.

## Estado atual (já implementado)

**`src/pages/rh/ResumoFolhaPage.tsx`**
- `FILIAL_COLS[0] = { key: "salario_base", label: "Salário Base", format: "currency" }` — primeira coluna após "Cód. Filial" e "Filial".
- Lê exclusivamente `filiais[].salario_base` (sem aliases, sem `vl_salario_base`, sem `calc_vl_sal_bruto`, sem `salario_bruto`).
- Sem cálculo/soma no front. Sem consulta ao backend analítico.

**`src/components/rh/KpiOrMissing.tsx` → `ValueOrMissing`**
```tsx
if (missing) return <badge>Campo pendente na API</badge>;
if (format === "horas") return <>{fmtHoras(value)}</>;
if (value === null || value === undefined) return <>-</>;
return <>{formatCurrency(Number(value))}</>;
```
Comportamento:
- Chave `salario_base` ausente no payload → "Campo pendente na API" (indica payload antigo — resolver reiniciando API 8070).
- `salario_base = 0` → `R$ 0,00`.
- `salario_base = null`/`undefined` → `-`.
- `salario_base = 1076641.56` → `R$ 1.076.641,56`.

## Ação recomendada

Nenhuma mudança de código. Passos operacionais:

1. Reiniciar a API `8070`.
2. Recarregar `/rh/resumo-folha?anomes_ini=202606&anomes_fim=202606`.
3. Validar Jun/2026:
   - KPI `salario_base` = `R$ 1.711.444,89`.
   - Matriz `R$ 1.076.641,56` · 663 Via Maris `R$ 166.935,93` · 669 TESC `R$ 105.257,97` · 664 Bunge `R$ 78.035,35`.
   - Soma da coluna = `R$ 1.711.444,89`.

Se após o restart a coluna ainda exibir "Campo pendente na API", o payload continua antigo — problema de backend/cache, não do front.

## Fora de escopo (confirmado)

Nenhuma alteração em Salário Base (regra), Benefícios, Hora Extra, Custo Férias, Provisões, Custo Total, Rescisões, FGTS, INSS. Sem novos aliases. Sem `_missing_kpis` extra.
