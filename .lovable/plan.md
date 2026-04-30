## Objetivo

No gráfico de pizza **"Por Motivo de Viagem"**, agrupar todas as fatias com participação **menor que 5% do total** numa única fatia chamada **"Outros"**, com drill-down ao clicar — abrindo um painel lateral que lista os motivos agrupados com seu valor e percentual.

## Comportamento

- Fatias ≥ 5% → renderizadas individualmente como hoje.
- Fatias < 5% → somadas e exibidas como uma fatia única "Outros" (com cor neutra/cinza).
- Se houver apenas 1 motivo abaixo de 5%, mantém ele individual (não vira "Outros" só com 1 item, pra evitar renomear sem motivo).
- Clicar em "Outros" → abre um `Sheet` lateral mostrando a lista detalhada (motivo, valor, % do total geral) ordenada por valor desc.
- Clicar em qualquer item dessa lista → aplica `selectedMotivo` naquele motivo específico (cross-filter normal) e fecha o sheet.
- Clicar em fatias normais continua filtrando por motivo, como já funciona.
- Quando "Outros" está como `selectedMotivo` virtual: tratamos como "todos os motivos pertencentes a Outros" — porém, para evitar complexidade, **não** suportamos selecionar "Outros" como filtro; o clique apenas abre o drill. Selecionar um item dentro do drill aplica o filtro normal.

## Mudanças em `src/components/passagens/PassagensDashboard.tsx`

1. Adicionar estado `outrosMotivoOpen` e constante `OUTROS_LABEL = 'Outros'`.
2. Reestruturar `porMotivo` (`useMemo`) para retornar `{ porMotivo, porMotivoOutros }`:
   - `porMotivo` = lista exibida no gráfico (com fatia "Outros" agregada).
   - `porMotivoOutros` = array dos motivos originais que entraram em "Outros" (para o drill).
   - Limiar: 5% do total.
3. No `<Pie>` do gráfico:
   - No `onClick`, se `d.name === OUTROS_LABEL` → `setOutrosMotivoOpen(true)`. Caso contrário, manter o `setSelectedMotivo` atual.
   - No `<Cell>` correspondente a "Outros", usar uma cor neutra (`hsl(var(--muted-foreground))` ou cinza fixo da paleta) para destacar visualmente que é uma agregação.
4. Adicionar um `<Sheet>` ao final do componente (irmão do `groupSheetOpen`) com:
   - Título "Detalhamento — Outros motivos"
   - Subtexto: "Motivos com participação menor que 5% do total"
   - Tabela: Motivo | Valor | % do total geral (do `porMotivo` somado).
   - Cada linha clicável → `setSelectedMotivo(item.name)` + `setOutrosMotivoOpen(false)`.

## Detalhes UX

- Mostrar contador "(N motivos)" ao lado do título do sheet.
- Manter consistência com o `Sheet` já usado em `groupSheetOpen`.
- Exportar CSV/XLSX desse drill é opcional — fica de fora desta entrega para manter escopo.

## Arquivo

- `src/components/passagens/PassagensDashboard.tsx` (única mudança).
