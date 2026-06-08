## Ajuste: Descrição do Produto no Drill Nota Fiscal

### Diagnóstico

- `fetchComercialDrill` (`src/lib/bi/comercialDrillApi.ts`) faz `rows: Array.isArray(r.rows) ? r.rows : []` — preserva **todos** os campos de cada linha, então `ds_produto` (e quaisquer aliases) não são descartados na normalização. Nada a mudar lá.
- `ComercialDrillDrawer.tsx` hoje renderiza `ds_produto` assim:
  ```ts
  if (c.key === 'ds_produto') return r.ds_produto ?? r.descricao_produto ?? r.nm_produto ?? '—';
  ```
  Fallback está parcial — falta `produto_descricao` e `descricao`.

### Mudança (1 arquivo, frontend puro)

**`src/components/bi/drill/ComercialDrillDrawer.tsx`** — ampliar o fallback da render de `ds_produto`:

```ts
if (c.key === 'ds_produto')
  return r.ds_produto
      ?? r.descricao_produto
      ?? r.produto_descricao
      ?? r.descricao
      ?? r.nm_produto
      ?? '—';
```

Coluna `cd_produto` permanece intocada (continua exibindo `r.produto_label ?? r.cd_produto ?? '—'`, atendendo o requisito de manter o código).

### Fora do escopo

- Backend FastAPI (LEFT JOIN com `bi_produto`/E075PRO já documentado em `docs/backend-bi-comercial-produto-nome.md`). Se a API continuar não devolvendo `ds_produto`, a coluna seguirá mostrando "—" — a correção definitiva é backend popular o campo.
- Sincronização de `bi_produto`, CSV (já usa `displayColumns`), `filtros_drill` (já só envia `cd_produto`).
