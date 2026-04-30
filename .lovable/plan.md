## Objetivo

Tornar o rodapé de **Subtotal** da tabela "Registros" flutuante (sticky), de modo que fique sempre visível na parte inferior da viewport enquanto o usuário rola a página — sem precisar chegar ao fim da lista para ver o valor.

## Mudanças em `src/components/passagens/PassagensDashboard.tsx`

### 1. Sticky no `<TableFooter>` da tabela desktop (linhas 968-978)

Substituir o `<TableFooter>` atual por uma versão com `position: sticky` ancorada no `bottom: 0` da viewport, com fundo opaco e leve sombra superior para destacar do conteúdo que rola atrás:

```tsx
<TableFooter className="sticky bottom-0 z-10 bg-muted/95 backdrop-blur supports-[backdrop-filter]:bg-muted/80 shadow-[0_-1px_0_0_hsl(var(--border))]">
  <TableRow className="font-semibold hover:bg-transparent">
    <TableCell colSpan={baseCols - 1}>
      Subtotal · {displayRows.length} {displayRows.length === 1 ? 'registro' : 'registros'}
    </TableCell>
    <TableCell className="text-right">{formatCurrency(subtotalDisplay)}</TableCell>
    {hasActions && <TableCell />}
  </TableRow>
</TableFooter>
```

Notas técnicas:
- Como `<table>` em shadcn já usa `display: table` padrão, `sticky bottom-0` aplicado no `<tfoot>` funciona dentro do scroll da página (ancestral mais próximo com overflow é a viewport — exatamente o que queremos).
- Usa `bg-muted/95` + `backdrop-blur` para garantir legibilidade sobre as linhas que passam por trás.
- `shadow-[0_-1px_0_0_hsl(var(--border))]` adiciona uma borda superior sutil usando token semântico (sem cores hardcoded).

### 2. Sticky na barra resumo do modo mobile (cards) — linhas ~877-882

Adicionar `sticky bottom-0 z-10` à barra que aparece abaixo dos `PassagemMobileCard`, com mesmo tratamento de fundo/blur:

```tsx
{displayRows.length > 0 && (
  <div className="sticky bottom-0 z-10 flex items-center justify-between rounded-md border bg-muted/95 backdrop-blur supports-[backdrop-filter]:bg-muted/80 px-3 py-2 text-sm font-semibold shadow-[0_-1px_0_0_hsl(var(--border))]">
    <span>Subtotal · {displayRows.length} {displayRows.length === 1 ? 'registro' : 'registros'}</span>
    <span>{formatCurrency(subtotalDisplay)}</span>
  </div>
)}
```

## Comportamento

- Enquanto o card "Registros" estiver na tela, o subtotal fica **fixo no rodapé da viewport**.
- Quando o usuário rola além do card (acima ou abaixo), o subtotal volta ao fluxo normal — `sticky` se desprende automaticamente fora dos limites do `<table>` / container do mobile.
- O valor continua refletindo `displayRows` (filtros + busca + cross-filters).
- Sem cores hardcoded — todos os fundos via tokens (`bg-muted`, `hsl(var(--border))`).

## Arquivo afetado

- `src/components/passagens/PassagensDashboard.tsx` (única mudança)
