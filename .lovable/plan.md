## Problema

`DreDrillDrawer.tsx` faz `data.rows.length` e `data.columns.length` direto. Quando o endpoint `/api/bi/contabilidade/dre-drill` retorna `null`, erro, ou um objeto sem `rows`/`columns`, quebra com `Cannot read properties of undefined (reading 'length')`.

## Correções (escopo mínimo, só frontend)

### 1. `src/lib/bi/dreDrillApi.ts` — normalizar resposta

No final de `fetchDreDrill`, em vez de `return (await resp.json()) as DreDrillResponse`, fazer parsing tolerante:

```ts
const raw = await resp.json().catch(() => ({}));
const r = (raw && typeof raw === 'object' ? raw : {}) as Partial<DreDrillResponse>;
return {
  tipo_drill: r.tipo_drill ?? params.tipo_drill,
  codigo_linha: r.codigo_linha ?? params.codigo_linha,
  periodo: r.periodo ?? {
    ano: params.ano, mes_ini: params.mes_ini, mes_fim: params.mes_fim,
    anomes_referente: params.anomes_referente ?? null,
  },
  unidade: r.unidade ?? null,
  columns: Array.isArray(r.columns) ? r.columns : [],
  rows: Array.isArray(r.rows) ? r.rows : [],
  total: typeof r.total === 'number' ? r.total : 0,
};
```

Assim o resto do código sempre recebe arrays.

### 2. `src/components/bi/contabilidade/DreDrillDrawer.tsx` — render defensivo

- Linhas 247 e 252: trocar `data && data.rows.length === 0` / `> 0` por variáveis locais derivadas com fallback seguro:
  ```ts
  const rows = Array.isArray(data?.rows) ? data!.rows : [];
  const columns = Array.isArray(data?.columns) ? data!.columns : [];
  const hasRows = rows.length > 0;
  ```
- Usar `rows`/`columns` em todos os pontos do JSX (map de header, body, tfoot `colSpan={Math.max(1, columns.length - 1)}`).
- Em cada célula, manter `v ?? '-'` (já existe) e `Number(v ?? 0)` para currency.
- Garantir que `totalRodape` continue calculado a partir de `rows`.

### 3. Verificar `useDreDrill.ts`

Já usa `stack.length` mas `stack` é sempre inicializado como `[]` — sem alteração.

## Fora de escopo

- Não mexer em DrePage / DreExcecoesPage / DreAprovacoesPage (essas usam `linhas` que já é array local).
- Não alterar backend, contratos, ou outros módulos de drill.
