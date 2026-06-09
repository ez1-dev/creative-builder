## Corrigir duplicidade do código na coluna Obra

Em `src/pages/bi/ComercialPage.tsx`, coluna `cd_prj` do `colsDetalhes` (linha ~504):

Substituir:
```ts
render:(_v,r)=> r.ds_abr_prj ? `${r.cd_prj ?? ''} — ${r.ds_abr_prj}` : (r.cd_prj ?? '')
```

Por:
```ts
render:(_v,r)=> {
  const cd = String(r.cd_prj ?? '').trim();
  const ds = String(r.ds_abr_prj ?? '').trim();
  if (!ds) return cd;
  if (cd && ds.startsWith(cd)) return ds;
  return cd ? `${cd} — ${ds}` : ds;
}
```

### Fora de escopo
Backend, API, drill, demais colunas — inalterados.
