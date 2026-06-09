## Ocultar coluna "Revenda" conforme Unidade

Na grid **Detalhamento por Nota Fiscal** (`src/pages/bi/ComercialPage.tsx`):

- `GENIUS` → mostrar coluna Revenda (comportamento atual).
- `ESTRUTURAL ZORTEA` → ocultar coluna Revenda.
- `CONSOLIDADO` → mostrar coluna Revenda.

### Mudança técnica

Transformar `colsDetalhes` (linhas ~491–511) em um `useMemo` dependente de `unidade`, filtrando a entrada `cd_rev_pedido` quando `unidade === 'ESTRUTURAL ZORTEA'`:

```ts
const colsDetalhes = useMemo<Column<ComercialDetalheRow>[]>(() => {
  const cols = [ /* mesma lista atual */ ];
  return unidade === 'ESTRUTURAL ZORTEA'
    ? cols.filter(c => c.key !== 'cd_rev_pedido')
    : cols;
}, [unidade]);
```

### Fora de escopo

- Backend (`/api/bi/comercial/detalhes`) — continua retornando `cd_rev_pedido`.
- Outras grids/gráficos de revenda (já têm `enabled: unidade==='GENIUS'||unidade==='CONSOLIDADO'`).
- Agrupamento e drill por revenda — inalterados.
