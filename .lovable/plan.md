## Objetivo

Adicionar uma linha fixa de **Subtotal** no final da tabela "Registros" da página `/passagens-aereas`, refletindo exatamente os filtros, busca e cross-filters atuais. Funciona tanto no modo plano (uma linha por registro) quanto no modo agrupado por colaborador. Também aparece como barra resumo no modo mobile (cards).

## Mudanças em `src/components/passagens/PassagensDashboard.tsx`

### 1. Import `TableFooter`
Adicionar `TableFooter` ao import de `@/components/ui/table` (linhas 9-11).

### 2. Calcular subtotal das linhas exibidas
Após o `useMemo` de `displayRows` (linha 214), adicionar:
```ts
const subtotalDisplay = useMemo(
  () => displayRows.reduce((s, r) => s + Number(r.valor || 0), 0),
  [displayRows],
);
```

### 3. Rodapé da tabela desktop
Dentro do `<Table>` da seção Registros (entre `</TableBody>` e `</Table>`, ~linha 956), inserir:
```tsx
{displayRows.length > 0 && (
  <TableFooter>
    <TableRow className="bg-muted/60 font-semibold">
      <TableCell colSpan={baseCols - 1}>
        Subtotal · {displayRows.length} {displayRows.length === 1 ? 'registro' : 'registros'}
      </TableCell>
      <TableCell className="text-right">{formatCurrency(subtotalDisplay)}</TableCell>
      {hasActions && <TableCell />}
    </TableRow>
  </TableFooter>
)}
```

`baseCols` e `hasActions` já existem no escopo (linhas 875-877). O subtotal soma `displayRows`, então no modo agrupado representa a soma de todos os grupos visíveis (cada grupo continua mostrando seu próprio total na linha-cabeçalho do grupo).

### 4. Barra de subtotal no modo mobile (cards)
Logo após o `<div className="space-y-2">` que renderiza os `PassagemMobileCard` (~linha 863), adicionar antes do fechamento da div:
```tsx
{displayRows.length > 0 && (
  <div className="flex items-center justify-between rounded-md border bg-muted/60 px-3 py-2 text-sm font-semibold">
    <span>Subtotal · {displayRows.length} {displayRows.length === 1 ? 'registro' : 'registros'}</span>
    <span>{formatCurrency(subtotalDisplay)}</span>
  </div>
)}
```

## Comportamento

- O subtotal reflete **exatamente o que está visível**: respeita filtros do dashboard, cross-filters (mês, motivo, CC, destino, UF), busca textual e ordenação.
- Modo agrupado: linhas-cabeçalho de cada colaborador mantêm seu total individual; o rodapé soma todos os grupos visíveis.
- Quando não há registros, o rodapé/barra não é renderizado.
- Sem alterações nos exports (CSV/XLSX) — escopo apenas visual, conforme conversado.

## Arquivo afetado

- `src/components/passagens/PassagensDashboard.tsx` (única mudança)
