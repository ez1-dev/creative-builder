## Objetivo

Padronizar a exibição de percentual em **1 casa decimal** no gráfico "Por Motivo de Viagem" e no painel de drill-down "Outros", trocando o atual formato de 2 casas (`20,85%`) para 1 casa (`20,8%`).

## Mudanças em `src/components/passagens/PassagensDashboard.tsx`

### 1. Label das fatias do gráfico (linha 702)
```ts
// Antes
const pct = ((e.percent ?? 0) * 100).toFixed(2).replace('.', ',');
// Depois
const pct = ((e.percent ?? 0) * 100).toFixed(1).replace('.', ',');
```
Resultado: `TRANSFERENCIA DE OBRA R$108 Mil (20,8%)`

### 2. Coluna "% do total" no drill "Outros" (linha 1070)
```ts
// Antes
{pct.toFixed(2).replace('.', ',')}%
// Depois
{pct.toFixed(1).replace('.', ',')}%
```

## Não muda
- Lógica de agrupamento (limiar de 5%) permanece igual.
- Demais formatações de percentual em outros gráficos/cards permanecem como estão.

## Arquivo afetado
- `src/components/passagens/PassagensDashboard.tsx`
