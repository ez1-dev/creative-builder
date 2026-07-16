## Corrigir warning "div cannot appear as a descendant of p" no DrillDrawer

**Arquivo:** `src/components/dre-studio/DrillDrawer.tsx` (linhas 412–423)

**Problema:** `SheetDescription` renderiza como `<p>`, mas contém `<div>` filhos → HTML inválido.

**Solução:** Usar `asChild` para trocar o elemento raiz de `<p>` para `<div>`, preservando conteúdo, classes e acessibilidade (o Radix continua vinculando ao `aria-describedby` do Sheet).

```tsx
<SheetDescription asChild>
  <div className="text-primary-foreground/80 space-y-0.5">
    {ctaredNum != null && (
      <div>
        Conta <strong>{ctaredNum}</strong>
        {contaDescricao ? <> — {contaDescricao}</> : null}
      </div>
    )}
    {clacta && <div className="text-xs">Classificação: {clacta}</div>}
    <div className="text-xs">
      Período: {fmtPeriodoBR(dataIniISO, dataFimISO)}
    </div>
  </div>
</SheetDescription>
```

**Escopo:** apenas esse bloco. `SheetTitle`, lógica de drill, exportação Excel e resumo permanecem intactos.

**Validação:** warning some do console; cabeçalho continua idêntico visualmente.
