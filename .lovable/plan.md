## Tornar todas as colunas agrupáveis por padrão em `DataTable`

**Problema**: as colunas numéricas (Faturamento, Líquido, Impostos, Devolução) não aparecem no dropdown "Adicionar" da barra "Agrupar por", porque a auto-detecção atual marca colunas numéricas como não agrupáveis.

**Mudança única em `src/components/erp/DataTable.tsx`**:

No `useMemo` que calcula `groupableCols` (~linha 200), trocar:

```ts
const canGroup = col.groupable ?? !autoNumeric;
```

por:

```ts
const canGroup = col.groupable ?? true;
```

**Efeitos**:
- Todas as colunas passam a aparecer no menu "Adicionar / Adicionar nível", inclusive Faturamento, Líquido, Impostos, Devolução.
- Quem quiser bloquear uma coluna específica continua usando `groupable: false` na definição da coluna.
- Soma nas colunas numéricas, tooltip, busca, ordenação, sticky e drill permanecem inalterados — `numericKeys` (usado para agregação) continua sendo derivado de `autoNumeric`, independente de `canGroup`.

Nenhum outro arquivo é tocado.
