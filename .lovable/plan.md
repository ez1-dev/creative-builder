Formatar a coluna **Data** dos drills em pt-BR (dd/mm/yyyy).

### Alteração em `src/components/dre-studio/DrillDrawer.tsx`

1. Adicionar helper local:
```ts
function fmtDataBR(v: unknown): string {
  if (v == null || v === "") return "";
  const s = String(v);
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  const d = new Date(s);
  return isNaN(d.getTime()) ? s : d.toLocaleDateString("pt-BR");
}
```

2. Trocar `{r.data}` na célula da coluna Data por `{fmtDataBR(r.data)}`.

`DrillResultadoPanel.tsx` já usa `fmtData` no formato pt-BR — não precisa mudar.
