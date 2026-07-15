## Problema

O `DrillDrawer` está lendo `conta_debito` / `desc_debito` / `conta_credito` / `desc_credito`, mas o backend do endpoint `/api/contabil/drill-lancamentos` retorna os valores numéricos `debito` e `credito` (mesmo contrato usado pelo `DrillResultadoPanel` e pelo tipo `DrillLancamentoItem`). Por isso as colunas aparecem vazias.

## Alteração em `src/components/dre-studio/DrillDrawer.tsx`

Trocar as duas células:

```tsx
<TableCell className="text-xs">
  <div>{r.conta_debito}</div>
  <div className="text-slate-500">{r.desc_debito}</div>
</TableCell>
<TableCell className="text-xs">
  <div>{r.conta_credito}</div>
  <div className="text-slate-500">{r.desc_credito}</div>
</TableCell>
```

por células numéricas no padrão BRL, alinhadas à direita:

```tsx
<TableCell className="text-xs text-right tabular-nums">
  {r.debito != null ? fmtBRL(Number(r.debito)) : ""}
</TableCell>
<TableCell className="text-xs text-right tabular-nums">
  {r.credito != null ? fmtBRL(Number(r.credito)) : ""}
</TableCell>
```

E alinhar os cabeçalhos `Débito` e `Crédito` à direita (`className="text-right"`) para consistência com o padrão dos outros drills.

Nenhuma outra mudança — apenas essa correção visual/mapeamento de campos.
